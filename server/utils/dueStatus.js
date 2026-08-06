// 7.4章: 期限が近い（既定3日以内）・超過したタスクのハイライト用ステータス計算
function computeDueStatus(dueDate, status, dueSoonDays, referenceDate = new Date()) {
  if (status === 'done') return 'done';
  if (!dueDate) return 'normal';

  const today = new Date(referenceDate);
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  if (Number.isNaN(due.getTime())) return 'normal';

  const diffDays = Math.floor((due - today) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return 'overdue';
  if (diffDays <= dueSoonDays) return 'due_soon';
  return 'normal';
}

module.exports = { computeDueStatus };
