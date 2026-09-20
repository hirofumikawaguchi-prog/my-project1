import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';

// 7.3章: 議事録の軽微編集（その場編集・プレビュー・保存）
export default function MarkdownEditor({ value, onSave, saving }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [preview, setPreview] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const startEdit = () => {
    setDraft(value);
    setPreview(false);
    setSaveError(null);
    setEditing(true);
  };

  const cancel = () => {
    setEditing(false);
    setDraft(value);
  };

  const handleSave = async () => {
    try {
      await onSave(draft);
      setEditing(false);
    } catch (err) {
      setSaveError(err.message);
    }
  };

  if (!editing) {
    return (
      <div className="markdown-viewer">
        <div className="markdown-toolbar">
          <button type="button" onClick={startEdit}>
            編集する
          </button>
        </div>
        <div className="markdown-body">
          <ReactMarkdown>{value || '(本文なし)'}</ReactMarkdown>
        </div>
      </div>
    );
  }

  return (
    <div className="markdown-editor">
      <div className="markdown-toolbar">
        <button type="button" onClick={() => setPreview((p) => !p)}>
          {preview ? '編集に戻る' : 'プレビュー'}
        </button>
        <button type="button" onClick={handleSave} disabled={saving}>
          {saving ? '保存中...' : '保存'}
        </button>
        <button type="button" onClick={cancel} disabled={saving}>
          キャンセル
        </button>
      </div>
      {saveError && <div className="error-text">{saveError}</div>}
      {preview ? (
        <div className="markdown-body markdown-preview">
          <ReactMarkdown>{draft}</ReactMarkdown>
        </div>
      ) : (
        <textarea
          className="markdown-textarea"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={20}
        />
      )}
    </div>
  );
}
