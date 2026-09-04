const PREVIEW_HOST = 'bbinge-fc.pages.dev';
const CANONICAL_ORIGIN = 'https://bbingefc.com';
const PASSTHROUGH_PATHS = ['/api/', '/auth', '/callback', '/deploy.json'];

function shouldRedirect(request) {
  const url = new URL(request.url);
  if (url.hostname !== PREVIEW_HOST) return false;
  if (!['GET', 'HEAD'].includes(request.method)) return false;
  if (PASSTHROUGH_PATHS.some((path) => url.pathname === path || url.pathname.startsWith(path))) return false;
  if (/\/[^/]+\.[a-z0-9]{1,8}$/i.test(url.pathname)) return false;
  return true;
}

export async function onRequest(context) {
  if (!shouldRedirect(context.request)) return context.next();

  const source = new URL(context.request.url);
  const destination = new URL(`${source.pathname}${source.search}`, CANONICAL_ORIGIN);
  return Response.redirect(destination.toString(), 301);
}

export { shouldRedirect };
