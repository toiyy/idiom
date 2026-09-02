import { beforeEach, describe, expect, it } from 'vitest';
import { exportBackup, parseBackup } from '../lib/backup';
import { makeEmptyProgress, recordAnswer, saveProgress } from '../lib/storage';
import { setNote, type Notes } from '../lib/notes';

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

const notes: Notes = setNote(setNote({}, 'q2', '後ろが不完全なので主格'), 'q3', 'be worth + -ing');

describe('exportBackup / parseBackup', () => {
  it('書き出して取り込むと元に戻る', () => {
    expect(parseBackup(exportBackup({ progress, notes }))).toEqual({ progress, notes });
  });

  it('書き出した JSON に目印が入っている', () => {
    const payload = JSON.parse(exportBackup({ progress, notes }));
    expect(payload.app).toBe('idiom');
    expect(payload.kind).toBe('backup');
    expect(payload.version).toBe(3);
    expect(typeof payload.exportedAt).toBe('string');
  });

  it('メモが空でも往復できる', () => {
    expect(parseBackup(exportBackup({ progress, notes: {} }))).toEqual({ progress, notes: {} });
  });

  it('localStorage の進捗の生の値をそのまま貼っても取り込める', () => {
    saveProgress(progress);
    const raw = localStorage.getItem('idiom.progress.v2') ?? '';
    expect(parseBackup(raw)).toEqual({ progress, notes: {} });
  });

  it('メモを持たない古い書き出しはメモなしとして取り込む', () => {
    const old = JSON.stringify({ app: 'idiom', kind: 'progress', version: 2, progress });
    expect(parseBackup(old)).toEqual({ progress, notes: {} });
  });

  it('自信度の内訳が欠けていても既定値で埋めて取り込む', () => {
    const parsed = parseBackup('{"answered":3,"correct":2,"wrongIds":["q1"]}');
    expect(parsed?.progress.answered).toBe(3);
    expect(parsed?.progress.byConfidence).toEqual(makeEmptyProgress().byConfidence);
  });

  it('壊れたメモは捨てて残りを取り込む', () => {
    const parsed = parseBackup(
      JSON.stringify({ progress, notes: { q1: 'ok', q2: 42, q3: '  ', q4: null } }),
    );
    expect(parsed?.notes).toEqual({ q1: 'ok' });
  });

  it('壊れた入力や無関係な JSON は null', () => {
    for (const bad of [
      '',
      'not json',
      'null',
      '[]',
      '123',
      '"文字列"',
      '{}',
      '{"foo":"bar"}',
      '{"answered":3,"correct":2}',
      '{"answered":"3","correct":2,"wrongIds":[]}',
      '{"answered":-1,"correct":0,"wrongIds":[]}',
      // 正解数が回答数を超えるのは進捗として成立しない
      '{"answered":2,"correct":5,"wrongIds":[]}',
    ]) {
      expect(parseBackup(bad), `受理してはいけない: ${bad}`).toBeNull();
    }
  });

  it('wrongIds の文字列でない要素は落とす', () => {
    const parsed = parseBackup('{"answered":1,"correct":0,"wrongIds":["q1",42,null]}');
    expect(parsed?.progress.wrongIds).toEqual(['q1']);
  });
});
