import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { sourceLabel } from '../lib/source';
import App from '../App';

describe('sourceLabel', () => {
  it('種別とレベルを組み立てる', () => {
    expect(sourceLabel({ tags: ['実践', 'ターゲット800点レベル'] })).toBe('実践 800');
    expect(sourceLabel({ tags: ['例題', 'ターゲット600点レベル'] })).toBe('例題 600');
  });

  it('レベルが範囲ならそのまま出す', () => {
    expect(sourceLabel({ tags: ['実践', 'ターゲット900～990点レベル'] })).toBe('実践 900～990');
  });

  it('種別とレベルが揃わなければ undefined', () => {
    expect(sourceLabel({ tags: ['不定詞', '動名詞'] })).toBeUndefined();
    expect(sourceLabel({ tags: undefined })).toBeUndefined();
    expect(sourceLabel({ tags: ['実践'] })).toBeUndefined();
    expect(sourceLabel({ tags: ['ターゲット800点レベル'] })).toBeUndefined();
  });
});

describe('回答後の元問題表示', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('ロジカル英文法だけ種別とレベルが出る', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /^ロジカル英文法.*すべて/ }));

    // 解く前は伏せておく
    expect(document.querySelector('.card__meta')?.textContent ?? '').not.toMatch(/例題|実践/);

    await user.click(document.querySelectorAll<HTMLButtonElement>('.choice')[0]);
    await user.click(screen.getByRole('button', { name: /自信あり/ }));

    expect(document.querySelector('.card__meta')?.textContent ?? '').toMatch(/(例題|実践) \d{3}/);
  });
});
