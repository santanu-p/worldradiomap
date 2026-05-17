const LIVE_CACHE_BUSTER_PARAM = 'wra_live';

export function isSupportedStreamUrl(rawUrl) {
  try {
    const url = new URL(String(rawUrl || ''));
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function buildFreshStreamUrl(rawUrl, now = Date.now()) {
  if (!isSupportedStreamUrl(rawUrl)) return null;

  const url = new URL(String(rawUrl));
  url.searchParams.set(LIVE_CACHE_BUSTER_PARAM, String(now));
  return url.href;
}

export function resetAudioElement(audio) {
  if (!audio) return;

  audio.preload = 'none';
  if (typeof audio.pause === 'function') {
    audio.pause();
  }
  if (typeof audio.removeAttribute === 'function') {
    audio.removeAttribute('src');
  }
  audio.src = '';
  if (typeof audio.load === 'function') {
    audio.load();
  }
}
