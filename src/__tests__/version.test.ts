import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BUILD_ID, alreadyTried, findUpdate } from '../lib/version';

/** version.json を返す fetch の代役。 */
function respond(body: unknown, ok = true): typeof fetch {
  return vi.fn(async () => ({ ok, json: async () => body })) as unknown as typeof fetch;
}

beforeEach(() => {
  sessionStorage.clear();
});

describe('findUpdate', () => {
  it('公開中の版が同じなら null', async () => {
    expect(await findUpdate(respond({ buildId: BUILD_ID }), '/')).toBeNull();
  });

  it('公開中の版が違えばその ID を返す', async () => {
    expect(await findUpdate(respond({ buildId: 'newer' }), '/')).toBe('newer');
  });

  it('キャッシュを避けて取りに行く', async () => {
    const fetchImpl = respond({ buildId: BUILD_ID });
    await findUpdate(fetchImpl, '/base/');
    const [url, init] = (fetchImpl as unknown as { mock: { calls: [string, RequestInit][] } }).mock
      .calls[0];
    expect(url).toMatch(/^\/base\/version\.json\?t=\d+$/);
    expect(init.cache).toBe('no-store');
  });

  it('取得に失敗しても落ちない', async () => {
    expect(await findUpdate(respond({}, false), '/')).toBeNull();
    const throwing = vi.fn(async () => {
      throw new Error('offline');
    }) as unknown as typeof fetch;
    expect(await findUpdate(throwing, '/')).toBeNull();
  });

  it('中身が壊れていても落ちない', async () => {
    for (const body of [{}, { buildId: 42 }, { buildId: '' }, null]) {
      expect(await findUpdate(respond(body), '/')).toBeNull();
    }
  });
});

describe('読み込みループの防止', () => {
  it('一度試した版は記録から分かる', () => {
    expect(alreadyTried('newer')).toBe(false);
    sessionStorage.setItem('idiom.reloaded-for', 'newer');
    expect(alreadyTried('newer')).toBe(true);
    expect(alreadyTried('another')).toBe(false);
  });
});

describe('BUILD_ID', () => {
  it('ビルド時に埋め込まれている', () => {
    expect(typeof BUILD_ID).toBe('string');
    expect(BUILD_ID.length).toBeGreaterThan(0);
  });
});
