import type { APIRoute } from "astro";

import { createSupabaseServerInstance } from "../../../db/supabase.client.ts";
import { loginWithPassword } from "../../../lib/services/auth.service.ts";
import { authLoginSchema } from "../../../lib/validators/auth.ts";

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "validation_error", details: "invalid_json" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const validation = authLoginSchema.safeParse(payload);
  if (!validation.success) {
    return new Response(JSON.stringify({ error: "validation_error", details: validation.error.flatten() }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = createSupabaseServerInstance({
    cookies,
    headers: request.headers,
    requestUrl: request.url,
  });

  const { data, error } = await loginWithPassword({ supabase }, validation.data);

  if (error) {
    switch (error.code) {
      case "invalid_credentials":
        return new Response(JSON.stringify({ error: "invalid_credentials" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      default:
        return new Response(JSON.stringify({ error: "server_error", details: error.details }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
    }
  }

  return new Response(JSON.stringify({ user: data }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
