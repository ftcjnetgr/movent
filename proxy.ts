import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  SESSION_ACTIVITY_COOKIE,
  SESSION_ACTIVITY_MAX_AGE_MS,
  SESSION_ACTIVITY_MAX_AGE_SECONDS,
} from "@/lib/auth/session-activity";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
          Object.entries(headers).forEach(([key, value]) => {
            response.headers.set(key, value);
          });
        },
      },
    },
  );

  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;
  const isPublicAuthPath =
    request.nextUrl.pathname.startsWith("/login") ||
    request.nextUrl.pathname.startsWith("/auth");

  const activityAt = Number(
    request.cookies.get(SESSION_ACTIVITY_COOKIE)?.value ?? "",
  );
  const activityExpired =
    !Number.isFinite(activityAt) ||
    Date.now() - activityAt >= SESSION_ACTIVITY_MAX_AGE_MS;

  if (!user || (!isPublicAuthPath && activityExpired)) {
    response.cookies.set(SESSION_ACTIVITY_COOKIE, "", {
      httpOnly: true,
      maxAge: 0,
      path: "/",
    });

    if (!isPublicAuthPath) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.search = "";
      return NextResponse.redirect(url);
    }
  } else if (user && !isPublicAuthPath) {
    response.cookies.set(SESSION_ACTIVITY_COOKIE, String(Date.now()), {
      httpOnly: true,
      maxAge: SESSION_ACTIVITY_MAX_AGE_SECONDS,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
