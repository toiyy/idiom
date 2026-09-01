import { beforeEach, describe, expect, it } from 'vitest';
import { clearSession, loadSession, saveSession } from '../lib/session';
import type { Question } from '../types/question';

function makeQuestion(id: string): Question {
  return {
    id,
    part: 5,
    category: 'テスト',
    sentence: 'This is ___ test.',
    choices: ['a', 'b', 'c', 'd'],
    answerIndex: 0,
    explanation: 'dummy',
    translation: 'これはテストです。',
    choiceNotes: { b: 'dummy', c: 'dummy', d: 'dummy' },
  };
}

const pool = [makeQuestion('q1'), makeQuestion('q2'), makeQuestion('q3')];

const base = {
  mode: { kind: 'category', category: 'テスト' } as const,
  orderIds: ['q2', 'q3', 'q1'],
  cursor: 1,
  selectedIndex: 2,
  confidence: 'unsure' as const,
  sessionCorrect: 1,
  onQuiz: true,
};

beforeEach(() => {
  localStorage.clear();
});

describe('saveSession / loadSession', () => {
  it('未保存なら null', () => {
    expect(loadSession(pool)).toBeNull();
  });

  it('保存した状態を復元できる', () => {
    saveSession(base);
    const s = loadSession(pool);
    expect(s?.mode).toEqual(base.mode);
    expect(s?.order.map((q) => q.id)).toEqual(['q2', 'q3', 'q1']);
    expect(s?.cursor).toBe(1);
    expect(s?.selectedIndex).toBe(2);
    expect(s?.confidence).toBe('unsure');
    expect(s?.sessionCorrect).toBe(1);
    expect(s?.onQuiz).toBe(true);
  });

  it('出題順を id で持つので、復元後もプールの問題を指す', () => {
    saveSession(base);
    expect(loadSession(pool)?.order[0]).toBe(pool[1]);
  });

  it('壊れた JSON なら null を返して掃除する', () => {
    localStorage.setItem('idiom.session.v1', '{not json');
    expect(loadSession(pool)).toBeNull();
    expect(localStorage.getItem('idiom.session.v1')).toBeNull();
  });
});

describe('復元できない保存内容は破棄する', () => {
  it('プールにない id が混ざっていたら破棄する', () => {
    saveSession({ ...base, orderIds: ['q1', 'deleted-id'] });
    expect(loadSession(pool)).toBeNull();
    expect(localStorage.getItem('idiom.session.v1')).toBeNull();
  });

  it('cursor が範囲外なら破棄する', () => {
    saveSession({ ...base, cursor: 99 });
    expect(loadSession(pool)).toBeNull();
  });

  it('出題順が空なら破棄する', () => {
    saveSession({ ...base, orderIds: [] });
    expect(loadSession(pool)).toBeNull();
  });

  it('モードの形が壊れていたら破棄する', () => {
    localStorage.setItem(
      'idiom.session.v1',
      JSON.stringify({ ...base, mode: { kind: 'unknown' } }),
    );
    expect(loadSession(pool)).toBeNull();
  });

  it('category モードにカテゴリ名がなければ破棄する', () => {
    localStorage.setItem(
      'idiom.session.v1',
      JSON.stringify({ ...base, mode: { kind: 'category' } }),
    );
    expect(loadSession(pool)).toBeNull();
  });
});

describe('中途半端な状態は正規化する', () => {
  it('選択肢を選んでいないのに自信度が残っていたら捨てる', () => {
    saveSession({ ...base, selectedIndex: null, confidence: 'sure' });
    const s = loadSession(pool);
    expect(s?.selectedIndex).toBeNull();
    expect(s?.confidence).toBeNull();
  });

  it('自信度の値が不正なら null にする', () => {
    localStorage.setItem('idiom.session.v1', JSON.stringify({ ...base, confidence: 'maybe' }));
    expect(loadSession(pool)?.confidence).toBeNull();
  });

  it('selectedIndex が範囲外なら null にする', () => {
    localStorage.setItem('idiom.session.v1', JSON.stringify({ ...base, selectedIndex: 7 }));
    expect(loadSession(pool)?.selectedIndex).toBeNull();
  });
});

describe('clearSession', () => {
  it('保存済みセッションを消す', () => {
    saveSession(base);
    clearSession();
    expect(loadSession(pool)).toBeNull();
  });
});
