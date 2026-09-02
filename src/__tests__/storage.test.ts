import { beforeEach, describe, expect, it } from 'vitest';
import {
  isMastered,
  MAX_WRONG_IDS,
  loadProgress,
  makeEmptyProgress,
  recordAnswer,
  resetProgress,
  saveProgress,
} from '../lib/storage';
import { questions } from '../data/questions';

beforeEach(() => {
  localStorage.clear();
});

describe('loadProgress / saveProgress', () => {
  it('未保存なら空の進捗を返す', () => {
    expect(loadProgress()).toEqual(makeEmptyProgress());
  });

  it('保存した内容を読み戻せる', () => {
    const p = recordAnswer(makeEmptyProgress(), 'q1', true, 'sure');
    saveProgress(p);
    expect(loadProgress()).toEqual(p);
  });

  it('壊れた JSON なら空の進捗にフォールバックする', () => {
    localStorage.setItem('idiom.progress.v2', '{not json');
    expect(loadProgress()).toEqual(makeEmptyProgress());
  });

  it('byConfidence が欠けていても既定値で埋める', () => {
    localStorage.setItem(
      'idiom.progress.v2',
      JSON.stringify({ answered: 3, correct: 2, wrongIds: ['a'] }),
    );
    const p = loadProgress();
    expect(p.answered).toBe(3);
    expect(p.byConfidence).toEqual(makeEmptyProgress().byConfidence);
  });

  it('v1 のデータがあれば累計と復習リストを引き継ぐ', () => {
    localStorage.setItem(
      'idiom.progress.v1',
      JSON.stringify({
        answered: 10,
        correct: 7,
        wrongIds: ['q1', 'q2'],
        updatedAt: '2026-01-01T00:00:00.000Z',
      }),
    );
    const p = loadProgress();
    expect(p.answered).toBe(10);
    expect(p.correct).toBe(7);
    expect(p.wrongIds).toEqual(['q1', 'q2']);
    // 自信度の内訳は v1 には存在しないので空のまま
    expect(p.byConfidence.sure.answered).toBe(0);
  });

  it('v2 があれば v1 は見に行かない', () => {
    localStorage.setItem('idiom.progress.v1', JSON.stringify({ answered: 99, correct: 99 }));
    saveProgress(recordAnswer(makeEmptyProgress(), 'q1', true, 'sure'));
    expect(loadProgress().answered).toBe(1);
  });
});

describe('isMastered', () => {
  it('自信ありで正解したときだけ習得済み', () => {
    expect(isMastered(true, 'sure')).toBe(true);
    expect(isMastered(true, 'unsure')).toBe(false);
    expect(isMastered(true, 'guess')).toBe(false);
    expect(isMastered(false, 'sure')).toBe(false);
  });
});

describe('recordAnswer', () => {
  it('自信ありで正解すると復習対象にならない', () => {
    const next = recordAnswer(makeEmptyProgress(), 'q1', true, 'sure');
    expect(next.answered).toBe(1);
    expect(next.correct).toBe(1);
    expect(next.wrongIds).toEqual([]);
  });

  it('勘で正解した問題は復習対象に入る', () => {
    const next = recordAnswer(makeEmptyProgress(), 'q1', true, 'guess');
    expect(next.correct).toBe(1);
    expect(next.wrongIds).toEqual(['q1']);
  });

  it('迷って正解した問題も復習対象に入る', () => {
    expect(recordAnswer(makeEmptyProgress(), 'q1', true, 'unsure').wrongIds).toEqual(['q1']);
  });

  it('誤答は自信度によらず復習対象に入る', () => {
    expect(recordAnswer(makeEmptyProgress(), 'q1', false, 'sure').wrongIds).toEqual(['q1']);
    expect(recordAnswer(makeEmptyProgress(), 'q2', false, 'guess').wrongIds).toEqual(['q2']);
  });

  it('あとで自信ありで正解すると復習対象から外れる', () => {
    const a = recordAnswer(makeEmptyProgress(), 'q1', true, 'guess');
    const b = recordAnswer(a, 'q1', true, 'sure');
    expect(b.wrongIds).toEqual([]);
  });

  it('同じ問題を二度外しても重複しない', () => {
    const a = recordAnswer(makeEmptyProgress(), 'q1', false, 'guess');
    const b = recordAnswer(a, 'q1', false, 'unsure');
    expect(b.wrongIds).toEqual(['q1']);
  });

  it('自信度ごとの回答数・正解数を集計する', () => {
    let p = makeEmptyProgress();
    p = recordAnswer(p, 'q1', true, 'sure');
    p = recordAnswer(p, 'q2', true, 'guess');
    p = recordAnswer(p, 'q3', false, 'guess');
    expect(p.byConfidence.sure).toEqual({ answered: 1, correct: 1 });
    expect(p.byConfidence.guess).toEqual({ answered: 2, correct: 1 });
    expect(p.byConfidence.unsure).toEqual({ answered: 0, correct: 0 });
  });
});

describe('resetProgress', () => {
  it('v1 / v2 とも消す', () => {
    localStorage.setItem('idiom.progress.v1', JSON.stringify({ answered: 5, correct: 5 }));
    saveProgress(recordAnswer(makeEmptyProgress(), 'q1', true, 'sure'));
    resetProgress();
    expect(loadProgress()).toEqual(makeEmptyProgress());
  });
});

describe('復習リストの上限', () => {
  it('問題バンクの総数を上回っている', () => {
    // 上限が総数を下回ると、古く間違えた問題が復習モードに出てこなくなる
    expect(MAX_WRONG_IDS).toBeGreaterThan(questions.length);
  });

  it('全問を未習得にしても 1 問も落ちない', () => {
    let p = makeEmptyProgress();
    for (const q of questions) p = recordAnswer(p, q.id, false, 'guess');
    expect(p.wrongIds).toHaveLength(questions.length);
    for (const q of questions) expect(p.wrongIds, `${q.id} が欠けている`).toContain(q.id);
  });

  it('上限を超えたぶんは古いものから捨てる', () => {
    let p = makeEmptyProgress();
    for (let i = 0; i < MAX_WRONG_IDS + 5; i++) p = recordAnswer(p, `q${i}`, false, 'guess');
    expect(p.wrongIds).toHaveLength(MAX_WRONG_IDS);
    // 直近が先頭、いちばん古い q0 は落ちている
    expect(p.wrongIds[0]).toBe(`q${MAX_WRONG_IDS + 4}`);
    expect(p.wrongIds).not.toContain('q0');
  });
});
