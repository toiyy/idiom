/**
 * 学習中セッションの保存・復元。
 *
 * 進捗（累計・復習リスト）とは別のキーに持つ。タブを閉じたりアプリを離れたりしても
 * 解きかけの問題から再開できるようにするためのもので、セッションが終われば消える。
 */
import type { Question } from '../types/question';
import type { QuizMode } from './quiz';
import type { Confidence } from './storage';
import type { Answer, Answers } from './answers';

const SESSION_KEY = 'idiom.session.v1';

export interface SavedSession {
  mode: QuizMode;
  /** 出題順。問題そのものではなく id で持ち、復元時にプールから引き直す。 */
  orderIds: string[];
  cursor: number;
  /** 出題順と同じ長さの回答一覧。前に戻ったときの再表示に使う。 */
  answers: Answers;
  /**
   * 保存時にクイズ画面にいたか。
   * true なら次回起動時にそのまま再開し、false（中断ボタンでホームに戻った）なら
   * ホームに「続きから」を出すだけにする。
   */
  onQuiz: boolean;
  updatedAt: string;
}

/** 復元後のセッション。orderIds を実際の問題に解決したもの。 */
export interface RestoredSession extends Omit<SavedSession, 'orderIds'> {
  order: Question[];
}

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

function isConfidence(v: unknown): v is Confidence {
  return v === 'sure' || v === 'unsure' || v === 'guess';
}

function toSelectedIndex(v: unknown): number | null {
  return typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= 3 ? v : null;
}

/** 保存済みの 1 件を Answer に正規化する。壊れていれば null（未回答扱い）。 */
function toAnswer(raw: unknown): Answer | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const selectedIndex = toSelectedIndex((raw as { selectedIndex?: unknown }).selectedIndex);
  if (selectedIndex === null) return null;
  const confidence = (raw as { confidence?: unknown }).confidence;
  // 選択肢を選んでいないのに自信度だけ残っている状態は作らない
  return { selectedIndex, confidence: isConfidence(confidence) ? confidence : null };
}

/**
 * 回答一覧を復元する。
 * 1 問ぶんしか持っていなかった旧形式は、いま解いている位置の 1 件として引き継ぐ。
 */
function toAnswers(parsed: Partial<SavedSession>, size: number, cursor: number): Answers {
  const answers: (Answer | null)[] = Array.from({ length: size }, () => null);
  if (Array.isArray(parsed.answers)) {
    for (let i = 0; i < size; i++) answers[i] = toAnswer(parsed.answers[i]);
    return answers;
  }
  const legacy = parsed as { selectedIndex?: unknown; confidence?: unknown };
  answers[cursor] = toAnswer(legacy);
  return answers;
}

function isMode(v: unknown): v is QuizMode {
  if (typeof v !== 'object' || v === null) return false;
  const m = v as { kind?: unknown; category?: unknown; subcategory?: unknown };
  switch (m.kind) {
    case 'all':
    case 'review':
      return true;
    case 'category':
      return typeof m.category === 'string';
    case 'subcategory':
      return typeof m.category === 'string' && typeof m.subcategory === 'string';
    default:
      return false;
  }
}

export function saveSession(session: Omit<SavedSession, 'updatedAt'>): void {
  const store = safeGetStorage();
  if (!store) return;
  try {
    store.setItem(SESSION_KEY, JSON.stringify({ ...session, updatedAt: new Date().toISOString() }));
  } catch {
    // 保存できなくても学習は続けられるので無視
  }
}

export function clearSession(): void {
  const store = safeGetStorage();
  if (!store) return;
  try {
    store.removeItem(SESSION_KEY);
  } catch {
    // 無視
  }
}

/**
 * 保存済みセッションを復元する。復元できない場合は null。
 *
 * 問題データを編集して id が消えていると出題内容がずれるので、
 * 1 つでも見つからない id があればセッションごと破棄する（進捗には影響しない）。
 */
export function loadSession(pool: readonly Question[]): RestoredSession | null {
  const store = safeGetStorage();
  if (!store) return null;

  let raw: string | null;
  try {
    raw = store.getItem(SESSION_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;

  let parsed: Partial<SavedSession>;
  try {
    parsed = JSON.parse(raw) as Partial<SavedSession>;
  } catch {
    clearSession();
    return null;
  }

  if (!isMode(parsed.mode) || !Array.isArray(parsed.orderIds) || parsed.orderIds.length === 0) {
    clearSession();
    return null;
  }

  const byId = new Map(pool.map((q) => [q.id, q]));
  const order: Question[] = [];
  for (const id of parsed.orderIds) {
    const q = typeof id === 'string' ? byId.get(id) : undefined;
    if (!q) {
      clearSession();
      return null;
    }
    order.push(q);
  }

  const cursor = typeof parsed.cursor === 'number' ? parsed.cursor : 0;
  if (!Number.isInteger(cursor) || cursor < 0 || cursor >= order.length) {
    clearSession();
    return null;
  }

  return {
    mode: parsed.mode,
    order,
    cursor,
    answers: toAnswers(parsed, order.length, cursor),
    onQuiz: parsed.onQuiz === true,
    updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : new Date(0).toISOString(),
  };
}
