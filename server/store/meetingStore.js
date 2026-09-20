const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');

const { parseMinutes, validateFrontmatter, stringifyMinutes } = require('../utils/markdown');
const { parseTasksFile, mergeTasks, serializeTasksFile, VALID_STATUSES } = require('../utils/taskFile');
const { NotFoundError, ValidationError } = require('../utils/errors');

const MINUTES_FILE = 'minutes.md';
const TASKS_FILE = 'tasks.json';

class MeetingStore {
  constructor(config) {
    this.config = config;
    this.meetingsPath = config.meetingsPath;
    this.meetings = new Map(); // meetingId -> meeting
    this.warnings = []; // [{ dir, message }]
    this.watcher = null;
  }

  // --- 取り込み（自動フォルダスキャン） -------------------------------

  listMeetingDirs() {
    if (!fs.existsSync(this.meetingsPath)) return [];
    return fs
      .readdirSync(this.meetingsPath, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
  }

  scanAll() {
    this.meetings.clear();
    this.warnings = [];
    for (const dirName of this.listMeetingDirs()) {
      this.scanOne(dirName);
    }
  }

  // 1会議フォルダのみ再取り込み（初回スキャン・監視イベント共通で使用）
  scanOne(dirName) {
    const dirPath = path.join(this.meetingsPath, dirName);
    this.warnings = this.warnings.filter((w) => w.dir !== dirName);

    const removeMeetingByDir = () => {
      for (const [id, meeting] of this.meetings) {
        if (meeting.dirName === dirName) this.meetings.delete(id);
      }
    };

    if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) {
      removeMeetingByDir();
      return;
    }

    const minutesPath = path.join(dirPath, MINUTES_FILE);
    const tasksPath = path.join(dirPath, TASKS_FILE);

    if (!fs.existsSync(minutesPath)) {
      removeMeetingByDir();
      this.warnings.push({ dir: dirName, message: 'minutes.md が見つかりません' });
      return;
    }

    let frontmatter;
    let body;
    try {
      const raw = fs.readFileSync(minutesPath, 'utf-8');
      const parsed = parseMinutes(raw);
      validateFrontmatter(parsed.frontmatter);
      frontmatter = parsed.frontmatter;
      body = parsed.body;
    } catch (err) {
      removeMeetingByDir();
      this.warnings.push({ dir: dirName, message: `minutes.md の読み込みに失敗しました: ${err.message}` });
      return;
    }

    const meetingId = String(frontmatter.meetingId || dirName);
    const existing = this.meetings.get(meetingId);
    const tasks = this.loadTasks(dirName, tasksPath, meetingId, existing);

    this.meetings.set(meetingId, {
      meetingId,
      dirName,
      title: frontmatter.title,
      date: frontmatter.date,
      startTime: frontmatter.startTime || '',
      endTime: frontmatter.endTime || '',
      attendees: Array.isArray(frontmatter.attendees) ? frontmatter.attendees : [],
      organizer: frontmatter.organizer || '',
      source: frontmatter.source || '',
      updatedAt: frontmatter.updatedAt || '',
      updatedBy: frontmatter.updatedBy || '',
      frontmatter,
      body,
      tasks,
    });
  }

  loadTasks(dirName, tasksPath, meetingId, existingMeeting) {
    if (!fs.existsSync(tasksPath)) {
      return existingMeeting ? existingMeeting.tasks : [];
    }

    let raw;
    try {
      raw = fs.readFileSync(tasksPath, 'utf-8');
    } catch (err) {
      this.warnings.push({ dir: dirName, message: `tasks.json の読み込みに失敗しました: ${err.message}` });
      return existingMeeting ? existingMeeting.tasks : [];
    }

    let incomingTasks;
    let taskWarnings;
    try {
      const parsed = parseTasksFile(raw);
      incomingTasks = parsed.tasks;
      taskWarnings = parsed.warnings;
    } catch (err) {
      this.warnings.push({ dir: dirName, message: `tasks.json の読み込みに失敗しました: ${err.message}` });
      return existingMeeting ? existingMeeting.tasks : [];
    }

    taskWarnings.forEach((message) => this.warnings.push({ dir: dirName, message }));

    // 6.4章: 既存タスクのstatus等を優先しつつマージし、差分があればファイルへ書き戻す
    const merged = mergeTasks(existingMeeting ? existingMeeting.tasks : [], incomingTasks);
    if (JSON.stringify(merged) !== JSON.stringify(incomingTasks)) {
      try {
        fs.writeFileSync(tasksPath, serializeTasksFile(meetingId, merged), 'utf-8');
      } catch (err) {
        this.warnings.push({ dir: dirName, message: `tasks.json への書き戻しに失敗しました: ${err.message}` });
      }
    }

    return merged;
  }

  // --- 監視 -----------------------------------------------------------

  startWatching() {
    if (!fs.existsSync(this.meetingsPath)) {
      fs.mkdirSync(this.meetingsPath, { recursive: true });
    }

    this.watcher = chokidar.watch(this.meetingsPath, {
      ignoreInitial: true,
      depth: 2,
      awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 50 },
    });

    const handleFileEvent = (filePath) => {
      const rel = path.relative(this.meetingsPath, filePath);
      const dirName = rel.split(path.sep)[0];
      if (!dirName || dirName === rel) return; // ルート直下のファイルは対象外
      this.scanOne(dirName);
    };

    this.watcher.on('add', handleFileEvent);
    this.watcher.on('change', handleFileEvent);
    this.watcher.on('unlink', handleFileEvent);
    this.watcher.on('unlinkDir', (dirPath) => {
      const rel = path.relative(this.meetingsPath, dirPath);
      if (rel && !rel.includes(path.sep)) {
        for (const [id, meeting] of this.meetings) {
          if (meeting.dirName === rel) this.meetings.delete(id);
        }
      }
    });
    this.watcher.on('error', (err) => {
      console.error('meetingsフォルダの監視でエラーが発生しました:', err);
    });
  }

  stopWatching() {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
  }

  // --- 参照 -------------------------------------------------------------

  getAllMeetings() {
    return Array.from(this.meetings.values());
  }

  getMeeting(meetingId) {
    return this.meetings.get(meetingId);
  }

  getWarnings() {
    return this.warnings;
  }

  getAllTasks() {
    const result = [];
    for (const meeting of this.meetings.values()) {
      for (const task of meeting.tasks) {
        result.push({ ...task, meetingId: meeting.meetingId, meetingTitle: meeting.title });
      }
    }
    return result;
  }

  // --- 更新（議事録の軽微編集 / タスクステータス更新） -------------------

  updateMinutesBody(meetingId, newBody, user) {
    const meeting = this.meetings.get(meetingId);
    if (!meeting) throw new NotFoundError('会議が見つかりません');

    const now = new Date().toISOString();
    const newFrontmatter = { ...meeting.frontmatter, updatedAt: now, updatedBy: user };
    const minutesPath = path.join(this.meetingsPath, meeting.dirName, MINUTES_FILE);
    fs.writeFileSync(minutesPath, stringifyMinutes(newFrontmatter, newBody), 'utf-8');

    meeting.frontmatter = newFrontmatter;
    meeting.body = newBody;
    meeting.updatedAt = now;
    meeting.updatedBy = user;
    return meeting;
  }

  updateTaskStatus(meetingId, taskId, status, user) {
    const meeting = this.meetings.get(meetingId);
    if (!meeting) throw new NotFoundError('会議が見つかりません');

    const task = meeting.tasks.find((t) => t.id === taskId);
    if (!task) throw new NotFoundError('タスクが見つかりません');

    if (!VALID_STATUSES.includes(status)) {
      throw new ValidationError(`status は ${VALID_STATUSES.join(' / ')} のいずれかで指定してください`);
    }

    task.status = status;
    task.updatedAt = new Date().toISOString();
    task.updatedBy = user;

    const tasksPath = path.join(this.meetingsPath, meeting.dirName, TASKS_FILE);
    fs.writeFileSync(tasksPath, serializeTasksFile(meetingId, meeting.tasks), 'utf-8');
    return task;
  }
}

module.exports = { MeetingStore };
