import { defineMiddleware } from 'astro:middleware';
import { COOKIE_NAME, verifySessionToken } from './lib/auth';

const LOGIN_API = '/api/storeroom/login';

// Guards every /storeroom page and /api/storeroom/* route on the server.
export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;
  const isApi = pathname.startsWith('/api/storeroom/');
  const isPage = pathname === '/storeroom' || pathname.startsWith('/storeroom/');

  if (!isApi && !isPage) return next();

  const authed = await verifySessionToken(context.cookies.get(COOKIE_NAME)?.value);
  context.locals.isAuthed = authed;

  if (!authed && isApi && pathname !== LOGIN_API) {
    return new Response(JSON.stringify({ error: 'Please log in again.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' },
    });
  }
  // /storeroom itself shows the login form; every other page needs a session.
  if (!authed && isPage && pathname !== '/storeroom') {
    return context.redirect('/storeroom');
  }

  const response = await next();
  response.headers.set('Cache-Control', 'no-store');
  response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  return response;
});
