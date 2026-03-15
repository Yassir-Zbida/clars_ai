export { auth as middleware } from '@/auth-edge';

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|login).*)'],
};
