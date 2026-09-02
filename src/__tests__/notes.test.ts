import { beforeEach, describe, expect, it } from 'vitest';
import { countNotes, loadNotes, normalizeNotes, saveNotes, setNote } from '../lib/notes';

beforeEach(() => {
  localStorage.clear();
});

describe('setNote', () => {
  it('メモを追加する', () => {
    expect(setNote({}, 'q1', 'おぼえる')).toEqual({ q1: 'おぼえる' });
  });

  it('前後の空白を落とす', () => {
    expect(setNote({}, 'q1', '  おぼえる  ')).toEqual({ q1: 'おぼえる' });
  });

  it('空にするとキーごと消す', () => {
    expect(setNote({ q1: 'x', q2: 'y' }, 'q1', '')).toEqual({ q2: 'y' });
    expect(setNote({ q1: 'x' }, 'q1', '   ')).toEqual({});
  });

  it('元の Notes を書き換えない', () => {
    const prev = { q1: 'x' };
    setNote(prev, 'q2', 'y');
    expect(prev).toEqual({ q1: 'x' });
  });
});

describe('normalizeNotes', () => {
  it('文字列でない値と空メモを捨てる', () => {
    expect(normalizeNotes({ q1: 'ok', q2: 42, q3: '  ', q4: null })).toEqual({ q1: 'ok' });
  });

  it('オブジェクト以外は空にする', () => {
    for (const bad of [null, undefined, 'x', 42, []]) {
      expect(normalizeNotes(bad)).toEqual({});
    }
  });
});

describe('保存と読み込み', () => {
  it('往復する', () => {
    const notes = setNote({}, 'q1', 'おぼえる');
    saveNotes(notes);
    expect(loadNotes()).toEqual(notes);
  });

  it('未保存なら空', () => {
    expect(loadNotes()).toEqual({});
  });

  it('壊れた JSON でも落ちない', () => {
    localStorage.setItem('idiom.notes.v1', '{壊れている');
    expect(loadNotes()).toEqual({});
  });

  it('進捗をリセットしてもメモは別キーなので残る', () => {
    saveNotes(setNote({}, 'q1', 'おぼえる'));
    localStorage.removeItem('idiom.progress.v2');
    expect(loadNotes()).toEqual({ q1: 'おぼえる' });
  });
});

describe('countNotes', () => {
  it('件数を返す', () => {
    expect(countNotes({})).toBe(0);
    expect(countNotes({ q1: 'a', q2: 'b' })).toBe(2);
  });
});
