import type { APIRoute } from "astro";

import { deleteCard, getCardById, getCardForUpdate, updateCard } from "../../../lib/services/cards.service";
import { cardIdParamSchema, updateCardSchema } from "../../../lib/validators/cards";

export const prerender = false;

export const GET: APIRoute = async ({ params, locals }) => {
  const validation = cardIdParamSchema.safeParse({ id: params.id });

  if (!validation.success) {
    return new Response(JSON.stringify({ error: "validation_error", details: validation.error.format() }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { supabase, userId } = locals;

  const { data, error } = await getCardById({ supabase, userId }, validation.data.id);

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

export const PATCH: APIRoute = async ({ params, request, locals }) => {
  const idValidation = cardIdParamSchema.safeParse({ id: params.id });

  if (!idValidation.success) {
    return new Response(JSON.stringify({ error: "validation_error", details: idValidation.error.format() }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { supabase, userId } = locals;

  let jsonBody: unknown;
  try {
    jsonBody = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "validation_error", details: "invalid_json" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const bodyValidation = updateCardSchema.safeParse(jsonBody);
  if (!bodyValidation.success) {
    return new Response(JSON.stringify({ error: "validation_error", details: bodyValidation.error.format() }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const cardId = idValidation.data.id;
  const patchInput = bodyValidation.data;

  // 1) Pobierz meta karty (source) do logiki zmiany source.
  const meta = await getCardForUpdate({ supabase, userId }, cardId);
  if (meta.error) {
    if (meta.error.code === "not_found") {
      return new Response(JSON.stringify({ error: "not_found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "server_error", details: meta.error.details }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!meta.data) {
    return new Response(JSON.stringify({ error: "server_error", details: "unexpected_empty_result" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const current = meta.data;

  // 2) Patch do DB (w tym logika zmiany source ai_created -> ai_edited przy edycji front/back).
  const dbPatch: Record<string, unknown> = { ...patchInput };
  const changesContent = patchInput.front !== undefined || patchInput.back !== undefined;
  if (changesContent && current.source === "ai_created") {
    dbPatch.source = "ai_edited";
  }

  // 3) Update + response.
  const updated = await updateCard({ supabase, userId }, cardId, dbPatch);
  if (updated.error) {
    if (updated.error.code === "not_found") {
      return new Response(JSON.stringify({ error: "not_found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (updated.error.code === "unique_violation") {
      return new Response(JSON.stringify({ error: "duplicate_front" }), {
        status: 409,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (updated.error.code === "invalid_input") {
      return new Response(JSON.stringify({ error: "validation_error", details: updated.error.details }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "server_error", details: updated.error.details }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify(updated.data), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

export const DELETE: APIRoute = async ({ params, locals }) => {
  const validation = cardIdParamSchema.safeParse({ id: params.id });

  if (!validation.success) {
    return new Response(JSON.stringify({ error: "validation_error", details: validation.error.format() }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { supabase, userId } = locals;

  const { data, error } = await deleteCard({ supabase, userId }, validation.data.id);

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
