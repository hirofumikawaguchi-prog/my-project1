const matter = require('gray-matter');

// 6.2章: minutes.md の必須フロントマター項目
const REQUIRED_FRONTMATTER_FIELDS = ['meetingId', 'title', 'date'];

// YAMLは "date: 2026-08-06" のようなクオートなしの日付をDate型として解釈するため、
// YYYY-MM-DD文字列に正規化する（要件6.2の日付はYYYY-MM-DD前提）。
function normalizeDateLikeFields(frontmatter) {
  const normalized = { ...frontmatter };
  if (normalized.date instanceof Date) {
    normalized.date = normalized.date.toISOString().slice(0, 10);
  }
  return normalized;
}

function parseMinutes(raw) {
  const parsed = matter(raw);
  return {
    frontmatter: normalizeDateLikeFields(parsed.data || {}),
    body: parsed.content.replace(/^\n+/, ''),
  };
}

function validateFrontmatter(frontmatter) {
  const missing = REQUIRED_FRONTMATTER_FIELDS.filter((field) => !frontmatter[field]);
  if (missing.length > 0) {
    throw new Error(`フロントマターの必須項目が不足しています: ${missing.join(', ')}`);
  }
}

function stringifyMinutes(frontmatter, body) {
  return matter.stringify(`${body.trim()}\n`, frontmatter);
}

module.exports = {
  parseMinutes,
  validateFrontmatter,
  stringifyMinutes,
  REQUIRED_FRONTMATTER_FIELDS,
};
