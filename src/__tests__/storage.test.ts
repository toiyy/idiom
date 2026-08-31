import { beforeEach, describe, expect, it } from 'vitest';
import {
  emptyProgress,
  loadProgress,
  recordAnswer,
  resetProgress,
  saveProgress,
} from '../lib/storage';

beforeEach(() => {
  localStorage.clear();
});

describe('loadProgress / saveProgress', () => {
  it('未保存なら空の進捗を返す', () => {
    expect(loadProgress()).toEqual(emptyProgress);
  });

  it('保存した内容を読み戻せる', () => {
    const p = { answered: 3, correct: 2, wrongIds: ['a'], updatedAt: new Date().toISOString() };
    saveProgress(p);
    expect(loadProgress()).toEqual(p);
  });

  it('壊れた JSON なら空の進捗にフォールバックする', () => {
    localStorage.setItem('idiom.progress.v1', '{not json');
    expect(loadProgress()).toEqual(emptyProgress);
  });
});

describe('recordAnswer', () => {
  it('正解で correct/answered が増える', () => {
    const next = recordAnswer(emptyProgress, 'q1', true);
    expect(next.answered).toBe(1);
    expect(next.correct).toBe(1);
    expect(next.wrongIds).toEqual([]);
  });

  it('不正解で wrongIds の先頭に積まれる', () => {
    const next = recordAnswer(emptyProgress, 'q1', false);
    expect(next.correct).toBe(0);
    expect(next.wrongIds).toEqual(['q1']);
  });

  it('後で正解すると wrongIds から除かれる', () => {
    const a = recordAnswer(emptyProgress, 'q1', false);
    const b = recordAnswer(a, 'q1', true);
    expect(b.wrongIds).toEqual([]);
  });

  it('同じ問題を二度間違えても重複しない', () => {
    const a = recordAnswer(emptyProgress, 'q1', false);
    const b = recordAnswer(a, 'q1', false);
    expect(b.wrongIds).toEqual(['q1']);
  });
});

describe('resetProgress', () => {
  it('保存済みデータを消す', () => {
    saveProgress({ answered: 5, correct: 5, wrongIds: [], updatedAt: new Date().toISOString() });
    resetProgress();
    expect(loadProgress()).toEqual(emptyProgress);
  });
});
