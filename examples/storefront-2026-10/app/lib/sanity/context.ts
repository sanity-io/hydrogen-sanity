import type { CacheInstance } from "@shopify/hydrogen";
import { createSanityContext, type SanityContext } from "hydrogen-sanity";
import { isPreviewEnabled } from "hydrogen-sanity/preview";
import { PreviewSession } from "hydrogen-sanity/preview/session";

import type { Env } from "~/lib/env";

import { filter } from "./stega";

/**
 * Creates the request's Sanity context. Preview mode needs `SESSION_SECRET` and
 * `SANITY_PREVIEW_TOKEN`; without them, the storefront renders published content only.
 */
export async function createRequestSanityContext(
  request: Request,
  env: Env,
  cache: CacheInstance,
  waitUntil: ExecutionContext["waitUntil"],
): Promise<SanityContext> {
  const previewSession =
    env.SESSION_SECRET && env.SANITY_PREVIEW_TOKEN
      ? await PreviewSession.init(request, [env.SESSION_SECRET])
      : undefined;

  return createSanityContext({
    request,
    cache,
    waitUntil,
    client: {
      projectId: env.SANITY_PROJECT_ID,
      dataset: env.SANITY_DATASET,
      apiVersion: "2025-02-19",
      useCdn: false,
      stega: {
        enabled: previewSession ? isPreviewEnabled(env.SANITY_PROJECT_ID, previewSession) : false,
        filter,
        studioUrl: env.SANITY_STUDIO_ORIGIN,
      },
    },
    preview:
      previewSession && env.SANITY_PREVIEW_TOKEN
        ? { token: env.SANITY_PREVIEW_TOKEN, session: previewSession }
        : undefined,
  });
}
