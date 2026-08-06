// 6.3章: tasks.json の仕様（必須フィールド・ステータス値）
const REQUIRED_TASK_FIELDS = ['id', 'title', 'assignee', 'dueDate', 'status'];
const VALID_STATUSES = ['not_started', 'in_progress', 'done'];

function parseTasksFile(raw) {
  let data;
  try {
    data = JSON.parse(raw);
  } catch (err) {
    throw new Error('tasks.json のJSON形式が不正です');
  }
  if (!data || !Array.isArray(data.tasks)) {
    throw new Error('tasks.json に tasks 配列がありません');
  }

  const tasks = [];
  const warnings = [];

  for (const task of data.tasks) {
    const missing = REQUIRED_TASK_FIELDS.filter((field) => !task || !task[field]);
    if (missing.length > 0) {
      warnings.push(`タスク ${task?.id || '(id不明)'} の必須項目が不足しています: ${missing.join(', ')}`);
      continue;
    }
    if (!VALID_STATUSES.includes(task.status)) {
      warnings.push(`タスク ${task.id} の status が不正です: ${task.status}`);
      continue;
    }
    const now = new Date().toISOString();
    tasks.push({
      id: String(task.id),
      title: String(task.title),
      assignee: String(task.assignee),
      dueDate: String(task.dueDate),
      status: task.status,
      createdAt: task.createdAt || now,
      updatedAt: task.updatedAt || task.createdAt || now,
      updatedBy: task.updatedBy || '',
    });
  }

  return { tasks, warnings };
}

// 6.4章: 再生成時のマージルール。既存（アプリが把握している）タスクの
// status/updatedAt/updatedBy を優先し、新規タスクのみファイルの値を採用する。
function mergeTasks(existingTasks, incomingTasks) {
  const existingById = new Map(existingTasks.map((task) => [task.id, task]));
  return incomingTasks.map((incoming) => {
    const existing = existingById.get(incoming.id);
    if (!existing) return incoming;
    return {
      ...incoming,
      status: existing.status,
      updatedAt: existing.updatedAt,
      updatedBy: existing.updatedBy,
    };
  });
}

function serializeTasksFile(meetingId, tasks) {
  const payload = {
    meetingId,
    tasks: tasks.map(({ id, title, assignee, dueDate, status, createdAt, updatedAt, updatedBy }) => ({
      id,
      title,
      assignee,
      dueDate,
      status,
      createdAt,
      updatedAt,
      updatedBy,
    })),
  };
  return `${JSON.stringify(payload, null, 2)}\n`;
}

module.exports = {
  parseTasksFile,
  mergeTasks,
  serializeTasksFile,
  REQUIRED_TASK_FIELDS,
  VALID_STATUSES,
};
