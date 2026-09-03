import { beforeEach, describe, expect, it } from 'vitest';
import {
  MAX_RECORDS,
  accuracy,
  addRecord,
  confidenceAccuracy,
  loadRecords,
  normalizeRecords,
  removeRecord,
  saveRecords,
  takeRecord,
  toDeltas,
  type StudyRecord,
} from '../lib/records';
import { makeEmptyProgress, recordAnswer, type Progress } from '../lib/storage';

beforeEach(() => {
  localStorage.clear();
});

/** 指定の回数だけ解いた進捗を作る。 */
function progressOf(sure: [number, number], guess: [number, number]): Progress {
  let p = makeEmptyProgress();
  for (let i = 0; i < sure[0]; i++) p = recordAnswer(p, `s${i}`, i < sure[1], 'sure');
  for (let i = 0; i < guess[0]; i++) p = recordAnswer(p, `g${i}`, i < guess[1], 'guess');
  return p;
}

const at = (iso: string, p: Progress, review: number) => takeRecord(p, review, new Date(iso));

describe('takeRecord', () => {
  it('その時点の累計をそのまま写し取る', () => {
    const r = at('2026-09-03T00:00:00Z', progressOf([4, 3], [2, 0]), 5);
    expect(r.answered).toBe(6);
    expect(r.correct).toBe(3);
    expect(r.reviewCount).toBe(5);
    expect(r.takenAt).toBe('2026-09-03T00:00:00.000Z');
  });
});

describe('toDeltas', () => {
  it('前の記録との差を取る', () => {
    const records = [
      at('2026-09-10T00:00:00Z', progressOf([10, 8], [5, 1]), 40),
      at('2026-09-03T00:00:00Z', progressOf([4, 3], [2, 0]), 50),
    ];
    const [latest, oldest] = toDeltas(records);

    // 15 問 - 6 問 = 9 問、正解 9 - 3 = 6
    expect(latest.answered).toBe(9);
    expect(latest.correct).toBe(6);
    expect(latest.byConfidence.sure).toEqual({ answered: 6, correct: 5 });
    expect(latest.reviewCount).toBe(40);
    expect(latest.reviewChange).toBe(10);

    // いちばん古い 1 件は、そこまでのぶんがそのまま伸びになる
    expect(oldest.answered).toBe(6);
    expect(oldest.correct).toBe(3);
    expect(oldest.reviewChange).toBe(0);
  });

  it('記録が 1 件ならその内容がそのまま出る', () => {
    const [only] = toDeltas([at('2026-09-03T00:00:00Z', progressOf([4, 3], [2, 0]), 5)]);
    expect(only.answered).toBe(6);
    expect(only.correct).toBe(3);
  });

  it('累計をリセットして巻き戻っていたら、差ではなくその記録自体を出す', () => {
    const records = [
      at('2026-09-10T00:00:00Z', progressOf([3, 2], [0, 0]), 2),
      at('2026-09-03T00:00:00Z', progressOf([10, 8], [5, 1]), 40),
    ];
    const [latest] = toDeltas(records);
    expect(latest.answered).toBe(3);
    expect(latest.correct).toBe(2);
    expect(latest.reviewChange).toBe(0);
  });

  it('要復習が増えていれば reviewChange は負になる', () => {
    const records = [
      at('2026-09-10T00:00:00Z', progressOf([10, 8], [5, 1]), 60),
      at('2026-09-03T00:00:00Z', progressOf([4, 3], [2, 0]), 50),
    ];
    expect(toDeltas(records)[0].reviewChange).toBe(-10);
  });

  it('記録がなければ空', () => {
    expect(toDeltas([])).toEqual([]);
  });
});

describe('addRecord / removeRecord', () => {
  const p = progressOf([1, 1], [0, 0]);

  it('新しい順に並ぶ', () => {
    let list = addRecord([], at('2026-09-03T00:00:00Z', p, 0));
    list = addRecord(list, at('2026-09-10T00:00:00Z', p, 0));
    list = addRecord(list, at('2026-08-27T00:00:00Z', p, 0));
    expect(list.map((r) => r.takenAt.slice(0, 10))).toEqual([
      '2026-09-10',
      '2026-09-03',
      '2026-08-27',
    ]);
  });

  it('上限を超えたら古いものから捨てる', () => {
    const base = Date.UTC(2026, 0, 1);
    let list: StudyRecord[] = [];
    for (let i = 0; i < MAX_RECORDS + 3; i++) {
      list = addRecord(list, takeRecord(p, 0, new Date(base + i * 60_000)));
    }
    expect(list).toHaveLength(MAX_RECORDS);
    expect(list[list.length - 1].takenAt).toBe(new Date(base + 3 * 60_000).toISOString());
  });

  it('日付を指定して 1 件消せる', () => {
    const keep = at('2026-09-10T00:00:00Z', p, 0);
    const drop = at('2026-09-03T00:00:00Z', p, 0);
    expect(removeRecord([keep, drop], drop.takenAt)).toEqual([keep]);
  });

  it('元の配列を書き換えない', () => {
    const list = [at('2026-09-03T00:00:00Z', p, 0)];
    addRecord(list, at('2026-09-10T00:00:00Z', p, 0));
    removeRecord(list, list[0].takenAt);
    expect(list).toHaveLength(1);
  });
});

describe('normalizeRecords', () => {
  it('壊れた要素を捨てて残りを読む', () => {
    const good = at('2026-09-03T00:00:00Z', progressOf([2, 1], [0, 0]), 1);
    expect(
      normalizeRecords([
        good,
        null,
        42,
        { takenAt: '' },
        { takenAt: '2026-01-01', answered: -1, correct: 0 },
        // 正解数が回答数を超えるのは成績として成立しない
        { takenAt: '2026-01-01', answered: 2, correct: 5 },
      ]),
    ).toEqual([good]);
  });

  it('自信度の内訳が欠けていても既定値で埋める', () => {
    const parsed = normalizeRecords([{ takenAt: '2026-09-03', answered: 3, correct: 2 }]);
    expect(parsed[0].byConfidence).toEqual(makeEmptyProgress().byConfidence);
    expect(parsed[0].reviewCount).toBe(0);
  });

  it('配列でなければ空にする', () => {
    for (const bad of [null, undefined, 'x', 42, {}]) {
      expect(normalizeRecords(bad)).toEqual([]);
    }
  });
});

describe('保存と読み込み', () => {
  const p = progressOf([2, 1], [0, 0]);

  it('往復する', () => {
    const list = [at('2026-09-10T00:00:00Z', p, 1), at('2026-09-03T00:00:00Z', p, 2)];
    saveRecords(list);
    expect(loadRecords()).toEqual(list);
  });

  it('未保存なら空', () => {
    expect(loadRecords()).toEqual([]);
  });

  it('壊れた JSON でも落ちない', () => {
    localStorage.setItem('idiom.records.v1', '{壊れている');
    expect(loadRecords()).toEqual([]);
  });

  it('進捗をリセットしても記録は別キーなので残る', () => {
    saveRecords([at('2026-09-03T00:00:00Z', p, 1)]);
    localStorage.removeItem('idiom.progress.v2');
    expect(loadRecords()).toHaveLength(1);
  });
});

describe('正答率', () => {
  it('回答が 0 件なら 0', () => {
    expect(accuracy(0, 0)).toBe(0);
  });

  it('自信度ごとに求められる', () => {
    const [d] = toDeltas([at('2026-09-03T00:00:00Z', progressOf([4, 3], [2, 0]), 0)]);
    expect(confidenceAccuracy(d, 'sure')).toBe(0.75);
    expect(confidenceAccuracy(d, 'guess')).toBe(0);
  });
});
