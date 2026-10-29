import type { APIRoute } from 'astro';
import {
  COOKIE_NAME,
  SESSION_DAYS,
  clearFailures,
  createSessionToken,
  getBlockStatus,
  passwordMatches,
  recordFailure,
} from '../../../lib/auth';

export const prerender = false;

const back = (code: string) => new Response(null, { status: 303, headers: { Location: `/storeroom?e=${code}` } });

export const POST: APIRoute = async ({ request, cookies, clientAddress }) => {
  let ip = request.headers.get('cf-connecting-ip') ?? '';
  if (!ip) {
    try {
      ip = clientAddress;
    } catch {
      ip = 'local';
    }
  }

  try {
    if ((await getBlockStatus(ip)).blocked) return back('blocked');

    const form = await request.formData();
    const password = String(form.get('password') ?? '');

    if (!(await passwordMatches(password))) {
      const status = await recordFailure(ip);
      return back(status.blocked ? 'blocked' : 'wrong');
    }

    await clearFailures(ip);
    cookies.set(COOKIE_NAME, await createSessionToken(), {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: '/',
      maxAge: SESSION_DAYS * 24 * 60 * 60,
    });
    return new Response(null, { status: 303, headers: { Location: '/storeroom' } });
  } catch (error) {
    console.error('Login failed', error);
    return back('error');
  }
};
