/** Compare the browser Origin to the public Host, not Next's internal bind URL. */
export function isSameOriginRequest(request: Request): boolean {
  if (request.headers.get("sec-fetch-site") === "cross-site") return false;
  const origin = request.headers.get("origin");
  // Non-browser callers still require the route's BYOK credentials.
  if (!origin) return true;
  try {
    const internalURL = new URL(request.url);
    const host = request.headers.get("host") ?? internalURL.host;
    // Do not accept URL parts or a forwarded-host supplied by the caller.
    if (/[\s,/\\?#@]/.test(host)) return false;
    const publicURL = new URL(`${internalURL.protocol}//${host}`);
    const browserURL = new URL(origin);
    return (
      ["http:", "https:"].includes(browserURL.protocol) &&
      browserURL.origin === origin &&
      browserURL.origin === publicURL.origin
    );
  } catch {
    return false;
  }
}
