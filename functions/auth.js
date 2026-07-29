function randomState() {
  return crypto.randomUUID();
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const redirectUri = `${url.origin}/callback`;
  const state = randomState();
  // flow=write는 /admin/write/ 에디터의 전체 페이지 리다이렉트 로그인이고,
  // 그 외(기본값)는 /admin(Sveltia CMS)의 팝업+postMessage 로그인이다. callback.js가 이 값으로 분기한다.
  const flow = url.searchParams.get('flow') === 'write' ? 'write' : 'cms';

  const authorizeUrl = new URL('https://github.com/login/oauth/authorize');
  authorizeUrl.searchParams.set('client_id', env.GITHUB_OAUTH_CLIENT_ID);
  authorizeUrl.searchParams.set('redirect_uri', redirectUri);
  authorizeUrl.searchParams.set('scope', 'repo,user');
  authorizeUrl.searchParams.set('state', state);

  const headers = new Headers({ Location: authorizeUrl.toString() });
  headers.append('Set-Cookie', `oauth_state=${state}; HttpOnly; Secure; SameSite=Lax; Max-Age=600; Path=/`);
  headers.append('Set-Cookie', `oauth_flow=${flow}; HttpOnly; Secure; SameSite=Lax; Max-Age=600; Path=/`);

  return new Response(null, { status: 302, headers });
}
