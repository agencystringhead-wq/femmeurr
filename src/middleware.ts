import { defineMiddleware } from 'astro:middleware';
import { COOKIE_NAME, verifySessionToken } from './lib/auth';

const LOGIN_API = '/api/storeroom/login';
const CANONICAL_HOST = 'femmeurr.com';

export const withNoindex = (response: Response) => {
  response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  return response;
};

// Guards every /storeroom page and /api/storeroom/* route on the server.
export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname, hostname } = context.url;

  // www.femmeurr.com -> femmeurr.com (permanent), keeping path and query.
  if (hostname === `www.${CANONICAL_HOST}`) {
    return Response.redirect(`https://${CANONICAL_HOST}${pathname}${context.url.search}`, 301);
  }

  // Any other host (e.g. the *.workers.dev URL) must not be indexed; only the canonical domain should be.
  const notCanonical = hostname !== CANONICAL_HOST && hostname !== 'localhost' && hostname !== '127.0.0.1';
  const isApi = pathname.startsWith('/api/storeroom/');
  const isPage = pathname === '/storeroom' || pathname.startsWith('/storeroom/');

  if (!isApi && !isPage) {
    const response = await next();
    return notCanonical ? withNoindex(response) : response;
  }

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
