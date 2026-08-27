import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session — important for Server Components
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Define public routes that don't require auth
  const publicRoutes = ['/', '/login', '/register'];
  const isPublicRoute = publicRoutes.includes(request.nextUrl.pathname);

  // If no user and trying to access protected route, redirect to login
  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirectTo', request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  // If user exists, check role-based access
  if (user && !isPublicRoute) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile) {
      const pathname = request.nextUrl.pathname;
      const role = profile.role;

      // Role-based route protection
      const roleRouteMap: Record<string, string> = {
        citizen: '/citizen',
        officer: '/officer',
        department_admin: '/department',
        super_admin: '/admin',
      };

      const allowedPrefix = roleRouteMap[role];
      const isAccessingRoleRoute = Object.values(roleRouteMap).some(
        (prefix) => pathname.startsWith(prefix)
      );

      // If accessing a role-specific route that doesn't match their role
      if (isAccessingRoleRoute && allowedPrefix && !pathname.startsWith(allowedPrefix)) {
        // Super admins can access any route
        if (role !== 'super_admin') {
          const url = request.nextUrl.clone();
          url.pathname = `${allowedPrefix}/dashboard`;
          return NextResponse.redirect(url);
        }
      }
    }
  }

  // If authenticated user visits login/register, redirect to their dashboard
  if (user && (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/register')) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile) {
      const roleRouteMap: Record<string, string> = {
        citizen: '/citizen/dashboard',
        officer: '/officer/dashboard',
        department_admin: '/department/dashboard',
        super_admin: '/admin/dashboard',
      };

      const url = request.nextUrl.clone();
      url.pathname = roleRouteMap[profile.role] || '/citizen/dashboard';
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
