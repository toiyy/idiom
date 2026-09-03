import { beforeEach, describe, expect, it } from 'vitest';
import {
  MAX_SNAPSHOTS,
  accuracy,
  addSnapshot,
  confidenceAccuracy,
  loadSnapshots,
  normalizeSnapshots,
  removeSnapshot,
  saveSnapshots,
  takeSnapshot,
} from '../lib/snapshots';
import { makeEmptyProgress, recordAnswer } from '../lib/storage';

beforeEach(() => {
  localStorage.clear();
});

const progress = (() => {
  let p = makeEmptyProgress();
  p = recordAnswer(p, 'q1', true, 'sure');
  p = recordAnswer(p, 'q2', false, 'guess');
  p = recordAnswer(p, 'q3', true, 'unsure');
  return p;
})();

const at = (iso: string) => takeSnapshot(progress, 2, new Date(iso));

describe('takeSnapshot', () => {
  it('いまの進捗をそのまま写し取る', () => {
    const s = at('2026-09-03T00:00:00Z');
    expect(s.answered).toBe(3);
    expect(s.correct).toBe(2);
    expect(s.reviewCount).toBe(2);
    expect(s.byConfidence).toEqual(progress.byConfidence);
    expect(s.takenAt).toBe('2026-09-03T00:00:00.000Z');
  });
});

describe('addSnapshot / removeSnapshot', () => {
  it('新しい順に並ぶ', () => {
    let list = addSnapshot([], at('2026-09-03T00:00:00Z'));
    list = addSnapshot(list, at('2026-09-10T00:00:00Z'));
    list = addSnapshot(list, at('2026-08-27T00:00:00Z'));
    expect(list.map((s) => s.takenAt.slice(0, 10))).toEqual([
      '2026-09-10',
      '2026-09-03',
      '2026-08-27',
    ]);
  });

  it('上限を超えたら古いものから捨てる', () => {
    const base = Date.UTC(2026, 0, 1);
    let list: ReturnType<typeof at>[] = [];
    for (let i = 0; i < MAX_SNAPSHOTS + 3; i++) {
      list = addSnapshot(list, takeSnapshot(progress, 2, new Date(base + i * 60_000)));
    }
    expect(list).toHaveLength(MAX_SNAPSHOTS);
    // 古い 3 件が落ち、4 件目が最古になる
    expect(list[list.length - 1].takenAt).toBe(new Date(base + 3 * 60_000).toISOString());
  });

  it('日付を指定して 1 件消せる', () => {
    const keep = at('2026-09-10T00:00:00Z');
    const drop = at('2026-09-03T00:00:00Z');
    expect(removeSnapshot([keep, drop], drop.takenAt)).toEqual([keep]);
  });

  it('元の配列を書き換えない', () => {
    const list = [at('2026-09-03T00:00:00Z')];
    addSnapshot(list, at('2026-09-10T00:00:00Z'));
    removeSnapshot(list, list[0].takenAt);
    expect(list).toHaveLength(1);
  });
});

describe('normalizeSnapshots', () => {
  it('壊れた要素を捨てて残りを読む', () => {
    const good = at('2026-09-03T00:00:00Z');
    const parsed = normalizeSnapshots([
      good,
      null,
      42,
      { takenAt: '' },
      { takenAt: '2026-01-01', answered: -1, correct: 0 },
      // 正解数が回答数を超えるのは成績として成立しない
      { takenAt: '2026-01-01', answered: 2, correct: 5 },
    ]);
    expect(parsed).toEqual([good]);
  });

  it('自信度の内訳が欠けていても既定値で埋める', () => {
    const parsed = normalizeSnapshots([{ takenAt: '2026-09-03', answered: 3, correct: 2 }]);
    expect(parsed[0].byConfidence).toEqual(makeEmptyProgress().byConfidence);
    expect(parsed[0].reviewCount).toBe(0);
  });

  it('配列でなければ空にする', () => {
    for (const bad of [null, undefined, 'x', 42, {}]) {
      expect(normalizeSnapshots(bad)).toEqual([]);
    }
  });
});

describe('保存と読み込み', () => {
  it('往復する', () => {
    const list = [at('2026-09-10T00:00:00Z'), at('2026-09-03T00:00:00Z')];
    saveSnapshots(list);
    expect(loadSnapshots()).toEqual(list);
  });

  it('未保存なら空', () => {
    expect(loadSnapshots()).toEqual([]);
  });

  it('壊れた JSON でも落ちない', () => {
    localStorage.setItem('idiom.snapshots.v1', '{壊れている');
    expect(loadSnapshots()).toEqual([]);
  });

  it('進捗をリセットしても記録は別キーなので残る', () => {
    saveSnapshots([at('2026-09-03T00:00:00Z')]);
    localStorage.removeItem('idiom.progress.v2');
    expect(loadSnapshots()).toHaveLength(1);
  });
});

describe('正答率', () => {
  it('回答が 0 件なら 0', () => {
    expect(accuracy(0, 0)).toBe(0);
  });

  it('自信度ごとに求められる', () => {
    const s = at('2026-09-03T00:00:00Z');
    expect(confidenceAccuracy(s, 'sure')).toBe(1);
    expect(confidenceAccuracy(s, 'guess')).toBe(0);
    expect(confidenceAccuracy(s, 'unsure')).toBe(1);
  });
});
