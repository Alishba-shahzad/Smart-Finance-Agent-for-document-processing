import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const { pathname } = request.nextUrl;
  const isProtectedRoute =
    pathname.startsWith('/chat') || pathname.startsWith('/dashboard');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  let user: any = null;

  const isConfigured = Boolean(
    supabaseUrl &&
      supabaseAnonKey &&
      !supabaseUrl.includes('placeholder')
  );

  if (isConfigured) {
    try {
      const supabase = createServerClient(supabaseUrl!, supabaseAnonKey!, {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
            supabaseResponse = NextResponse.next({
              request,
            });
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            );
          },
        },
      });

      // getUser() validates token against Supabase Auth server
      const {
        data: { user: sbUser },
        error,
      } = await supabase.auth.getUser();

      if (!error && sbUser) {
        user = sbUser;
      }
    } catch (e) {
      console.warn('Middleware Supabase validation warning:', e);
    }
  } else {
    // Check for dev session cookie when in local development
    const devToken =
      request.cookies.get('sb-auth-token')?.value ||
      request.cookies.get('finagent_session')?.value;
    if (devToken) {
      user = {
        id: 'dev-user',
        email: devToken.includes('@') ? devToken : 'analyst@finagent.ai',
        user_metadata: {
          role: devToken.toLowerCase().includes('admin') ? 'Admin' : 'Staff',
        },
      };
    }
  }

  // 1. Actively block unauthenticated access to /chat and /dashboard
  if (isProtectedRoute && !user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/login';
    redirectUrl.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Extract role strictly from user metadata (or session cookie fallback)
  const userRole = (
    (user?.user_metadata?.role as string) ||
    request.cookies.get('sb-auth-token')?.value ||
    'Staff'
  ).toLowerCase();

  // 2. Strict Real-World RBAC: If logged-in 'Staff' user attempts to access /dashboard, redirect to /chat immediately
  if (pathname.startsWith('/dashboard') && user && userRole === 'staff') {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/chat';
    return NextResponse.redirect(redirectUrl);
  }

  // 3. If authenticated user visits /login, redirect to their assigned workspace
  if (pathname === '/login' && user) {
    const destination = userRole === 'admin' ? '/dashboard' : '/chat';
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = destination;
    return NextResponse.redirect(redirectUrl);
  }

  return supabaseResponse;
}

