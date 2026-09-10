import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { campusFromHost, CAMPUS_HEADER } from "@/lib/site/host";

/**
 * Two jobs, in this order.
 *
 * 1. Work out which campus site this hostname is, and tell the app. Every
 *    request gets this, because `/events` needs to know whether it is serving
 *    AAC or Nsukka before it queries anything.
 *
 * 2. Refresh the Supabase session cookie and keep signed-out visitors out of
 *    /dashboard. Only the dashboard and login pay for this — a session lookup
 *    on every image request would be a round trip for nothing.
 *
 * The dashboard is deliberately excluded from campus resolution. Somebody
 * signed in at unn.aaci.ngo/dashboard is the same person with the same reach
 * as at aaci.ngo/dashboard; what they may touch is decided by their role and
 * enforced by RLS, never by the address bar.
 *
 * The redirect below is not a security boundary — the dashboard layout checks
 * again server-side and RLS enforces the rest. It exists so people get a login
 * screen instead of an empty page.
 */

/**
 * The campus label is trusted downstream, so it must not be forgeable. A
 * request arriving with its own x-aac-campus header would otherwise let anyone
 * read any campus's draft-free content under AAC's own address — harmless
 * today, but exactly the kind of thing that stops being harmless later.
 */
function withCampus(request: NextRequest, campus: string | null) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete(CAMPUS_HEADER);
  if (campus) requestHeaders.set(CAMPUS_HEADER, campus);
  return requestHeaders;
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isPrivate = path.startsWith("/dashboard") || path === "/login";

  const campus = isPrivate ? null : campusFromHost(request.headers.get("host"));
  const requestHeaders = withCampus(request, campus);

  if (!isPrivate) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  let response = NextResponse.next({ request: { headers: requestHeaders } });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list: { name: string; value: string; options: CookieOptions }[]) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request: { headers: withCampus(request, null) } });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();

  if (!user && path.startsWith("/dashboard")) {
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.searchParams.set("next", path);
    return NextResponse.redirect(login);
  }

  if (user && path === "/login") {
    const dash = request.nextUrl.clone();
    dash.pathname = "/dashboard";
    dash.search = "";
    return NextResponse.redirect(dash);
  }

  return response;
}

export const config = {
  /* Everything except Next's own asset routes and files with an extension.
     Campus resolution has to reach every page, and skipping assets keeps the
     cost off the requests that do not need it. */
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.[\\w]+$).*)"],
};
