/**
 * Cloudflare Pages Function — Proxy /api/* vers le Backend Quarkus UniformApp
 */
export async function onRequest(context) {
  const { request, env } = context;
  const incomingUrl = new URL(request.url);
  const backendOrigin =
    env.BACKEND_ORIGIN || 'https://constitution-chicago-underlying-prostate.trycloudflare.com';

  const targetUrl = new URL(incomingUrl.pathname + incomingUrl.search, backendOrigin);

  const headers = new Headers(request.headers);
  headers.delete('host');

  const init = {
    method: request.method,
    headers,
    redirect: 'manual',
  };

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = request.body;
  }

  return fetch(targetUrl.toString(), init);
}
