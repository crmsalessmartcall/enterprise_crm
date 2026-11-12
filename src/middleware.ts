import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const protectedPrefixes = ['/super-admin', '/tenant', '/agent'];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    if (protectedPrefixes.some((prefix) => request.nextUrl.pathname.startsWith(prefix))) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return response;
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;
  if (protectedPrefixes.some((prefix) => path.startsWith(prefix)) && !user) {
    const target = new URL('/', request.url);
    target.searchParams.set('next', path);
    return NextResponse.redirect(target);
  }
  if (!user || !protectedPrefixes.some((prefix) => path.startsWith(prefix))) return response;

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  const role = profile?.role as string | undefined;
  const allowed = path.startsWith('/super-admin') ? role === 'super_admin'
    : path.startsWith('/tenant') ? ['tenant_admin', 'supervisor'].includes(role ?? '')
    : path.startsWith('/agent') ? role === 'agent' : false;
  if (!allowed) return NextResponse.redirect(new URL(role === 'super_admin' ? '/super-admin/dashboard' : role === 'agent' ? '/agent/dialer' : '/tenant/dashboard', request.url));
  return response;
}

export const config = { matcher: ['/super-admin/:path*', '/tenant/:path*', '/agent/:path*'] };
