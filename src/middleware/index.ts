import { defineMiddleware } from "astro:middleware";

import { createSupabaseServerInstance } from "../db/supabase.client.ts";

const AUTH_LOGOUT_PATH = "/auth/logout";
const AUTH_NO_REDIRECT_PATHS = new Set<string>(["/auth/logout", "/auth/reset-password"]);

export const onRequest = defineMiddleware(async ({ cookies, request, url, locals, redirect }, next) => {
  const supabase = createSupabaseServerInstance({
    cookies,
    headers: request.headers,
    requestUrl: request.url,
  });

  locals.supabase = supabase;

  if (url.pathname === AUTH_LOGOUT_PATH) {
    locals.isAuthenticated = false;
    return next();
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const displayName = typeof user.user_metadata?.display_name === "string" ? user.user_metadata.display_name : null;
    locals.user = {
      id: user.id,
      email: user.email ?? null,
      display_name: displayName,
    };
    locals.userId = user.id;
    locals.isAuthenticated = true;
  } else {
    locals.userId = undefined;
    locals.isAuthenticated = false;
  }

  if (locals.isAuthenticated && url.pathname.startsWith("/auth/") && !AUTH_NO_REDIRECT_PATHS.has(url.pathname)) {
    return redirect("/");
  }

  return next();
});
