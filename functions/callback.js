function getCookie(request, name) {
  const cookie = request.headers.get('Cookie') || '';
  const match = cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? match[1] : null;
}

function clearAuthCookies() {
  const headers = new Headers();
  headers.append('Set-Cookie', 'oauth_state=; HttpOnly; Secure; SameSite=Lax; Max-Age=0; Path=/');
  headers.append('Set-Cookie', 'oauth_flow=; HttpOnly; Secure; SameSite=Lax; Max-Age=0; Path=/');
  return headers;
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const cookieState = getCookie(request, 'oauth_state');
  const flow = getCookie(request, 'oauth_flow') === 'write' ? 'write' : 'cms';

  if (!code || !state || !cookieState || state !== cookieState) {
    return renderResult(flow, 'error', { message: 'invalid state or missing code' });
  }

  const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      client_id: env.GITHUB_OAUTH_CLIENT_ID,
      client_secret: env.GITHUB_OAUTH_CLIENT_SECRET,
      code,
    }),
  });

  const data = await tokenResponse.json();

  if (data.error || !data.access_token) {
    return renderResult(flow, 'error', { message: data.error_description || 'authentication failed' });
  }

  return renderResult(flow, 'success', { token: data.access_token, provider: 'github' });
}

// flow==='write': /admin/write/ 에디터용 — 팝업 없이 URL 해시로 토큰을 실어 원래 페이지로 되돌아간다.
// flow==='cms'(기본): 기존 /admin(Sveltia CMS) 팝업+postMessage 핸드셰이크를 그대로 유지한다.
function renderResult(flow, status, payload) {
  const headers = clearAuthCookies();

  if (flow === 'write') {
    const hash =
      status === 'success'
        ? `gh_token=${encodeURIComponent(payload.token)}`
        : `gh_auth_error=${encodeURIComponent(payload.message || 'authentication failed')}`;
    headers.set('Location', `/admin/write/#${hash}`);
    return new Response(null, { status: 302, headers });
  }

  const message = `authorization:github:${status}:${JSON.stringify(payload)}`;
  const html = `<!doctype html>
<html>
<body>
<script>
(function() {
  function receiveMessage(e) {
    window.opener.postMessage(${JSON.stringify(message)}, e.origin);
    window.removeEventListener('message', receiveMessage, false);
  }
  window.addEventListener('message', receiveMessage, false);
  window.opener.postMessage('authorizing:github', '*');
})();
</script>
</body>
</html>`;

  headers.set('Content-Type', 'text/html; charset=utf-8');
  return new Response(html, { headers });
}
