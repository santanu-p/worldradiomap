export function getInternalNavigationUrl(href, origin) {
  const value = String(href || '').trim();
  if (!value || value.startsWith('//')) return null;

  try {
    const url = new URL(value, origin);
    if (url.origin !== origin) return null;
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return url;
  } catch {
    return null;
  }
}
