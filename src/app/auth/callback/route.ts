import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const sanitizedNext = next.startsWith('/') ? next : `/${next}`;
      return NextResponse.redirect(`${origin}${sanitizedNext}`);
    }
  }

  // Return to login with error parameter if session exchange failed
  return NextResponse.redirect(`${origin}/login?error=oauth_exchange_failed`);
}
