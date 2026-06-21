import { defineMiddleware } from 'astro:middleware';

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  if (pathname.startsWith('/admin')) {
    const role = context.cookies.get('user_role')?.value;
    const token = context.cookies.get('directus_token')?.value;
    if (!token || role !== 'admin') {
      return context.redirect('/connexion?redirect=/admin');
    }
  }

  if (pathname.startsWith('/patient')) {
    const token = context.cookies.get('directus_token')?.value;
    if (!token) {
      return context.redirect('/connexion?redirect=/patient');
    }
  }

  return next();
});
