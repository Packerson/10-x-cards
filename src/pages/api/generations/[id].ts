import type { APIRoute } from "astro";

import { deleteGenerationById, getGenerationById } from "../../../lib/services/generations.service";
import { generationIdParamSchema } from "../../../lib/validators/generations";

export const prerender = false;

export const GET: APIRoute = async ({ params, locals }) => {
  const validation = generationIdParamSchema.safeParse({ id: params.id });

  if (!validation.success) {
    return new Response(JSON.stringify({ error: "validation_error", details: validation.error.format() }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { supabase, userId } = locals;

  const { data, error } = await getGenerationById({ supabase, userId }, validation.data.id);

  if (error) {
    if (error.code === "not_found") {
      return new Response(JSON.stringify({ error: "not_found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "server_error", details: error.details }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

export const DELETE: APIRoute = async ({ params, locals }) => {
  const validation = generationIdParamSchema.safeParse({ id: params.id });

  if (!validation.success) {
    return new Response(JSON.stringify({ error: "validation_error", details: validation.error.format() }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { supabase, userId } = locals;
  const { error } = await deleteGenerationById({ supabase, userId }, validation.data.id);

  if (error) {
    if (error.code === "not_found") {
      return new Response(JSON.stringify({ error: "not_found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "server_error", details: error.details }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(null, { status: 204 });
};
