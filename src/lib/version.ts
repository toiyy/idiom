/**
 * 公開版の追従。
 *
 * GitHub Pages は index.html に max-age=600 を付けるため、ブラウザが古い
 * index.html を持っていると、そこに書かれた古い JS を読み続けてしまう。
 * 実行中の版と公開中の版を突き合わせ、食い違っていたら読み直す。
 */

/** いま動いているビルドの ID。 */
export const BUILD_ID: string = __BUILD_ID__;

/** 同じ版で二度読み直さないための記録。読み込みループを防ぐ。 */
const RELOAD_GUARD = 'idiom.reloaded-for';

function safeSession(): Storage | null {
  try {
    if (typeof sessionStorage === 'undefined') return null;
    return sessionStorage;
  } catch {
    return null;
  }
}

/**
 * 公開中の版を調べ、実行中と違えばその ID を返す。同じか、調べられなければ null。
 * CDN のキャッシュも避けたいので、毎回異なるクエリを付けて取りに行く。
 */
export async function findUpdate(
  fetchImpl: typeof fetch = fetch,
  baseUrl: string = import.meta.env.BASE_URL,
): Promise<string | null> {
  try {
    const res = await fetchImpl(`${baseUrl}version.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const body: unknown = await res.json();
    const latest = (body as { buildId?: unknown }).buildId;
    if (typeof latest !== 'string' || latest === '' || latest === BUILD_ID) return null;
    return latest;
  } catch {
    // 通信できないだけなら今の版のまま使い続ければよい
    return null;
  }
}

/** その版でもう読み直しを試したか。 */
export function alreadyTried(id: string): boolean {
  return safeSession()?.getItem(RELOAD_GUARD) === id;
}

function rememberTried(id: string): void {
  try {
    safeSession()?.setItem(RELOAD_GUARD, id);
  } catch {
    // 記録できなくても読み直し自体はできる
  }
}

/**
 * 新しい版があれば読み直す。
 * 同じ URL の再読み込みでは古い index.html が返ることがあるので、
 * 版の ID をクエリに載せて別 URL として取りに行く。
 */
export async function checkForUpdate(): Promise<void> {
  const latest = await findUpdate();
  if (latest === null || alreadyTried(latest)) return;
  rememberTried(latest);
  const url = new URL(location.href);
  url.searchParams.set('v', latest);
  location.replace(url.toString());
}
