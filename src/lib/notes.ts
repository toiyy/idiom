/**
 * 問題ごとのメモ。localStorage に問題 id をキーにして持つ。
 * 進捗（idiom.progress.v2）とは別キーにして、リセットしてもメモは消えないようにする。
 */

const NOTES_KEY = 'idiom.notes.v1';

/** 問題 id → メモ本文。空文字のメモは持たない（消したときはキーごと削る）。 */
export type Notes = Record<string, string>;

function safeGetStorage(): Storage | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const probe = '__idiom_probe__';
    localStorage.setItem(probe, '1');
    localStorage.removeItem(probe);
    return localStorage;
  } catch {
    return null;
  }
}

/** 読み込んだ値を Notes に正規化する。文字列でない値と空メモは捨てる。 */
export function normalizeNotes(raw: unknown): Notes {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return {};
  const out: Notes = {};
  for (const [id, text] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof text !== 'string') continue;
    const trimmed = text.trim();
    if (trimmed !== '') out[id] = trimmed;
  }
  return out;
}

export function loadNotes(): Notes {
  const store = safeGetStorage();
  if (!store) return {};
  try {
    const raw = store.getItem(NOTES_KEY);
    if (!raw) return {};
    return normalizeNotes(JSON.parse(raw));
  } catch {
    return {};
  }
}

export function saveNotes(notes: Notes): void {
  const store = safeGetStorage();
  if (!store) return;
  try {
    store.setItem(NOTES_KEY, JSON.stringify(notes));
  } catch {
    // 保存できなくても学習は継続できるので無視
  }
}

/** メモを差し替えた新しい Notes を返す。空にした場合はキーごと消す。 */
export function setNote(prev: Notes, questionId: string, text: string): Notes {
  const next = { ...prev };
  const trimmed = text.trim();
  if (trimmed === '') delete next[questionId];
  else next[questionId] = trimmed;
  return next;
}

export function countNotes(notes: Notes): number {
  return Object.keys(notes).length;
}
