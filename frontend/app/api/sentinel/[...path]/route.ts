import { NextResponse, type NextRequest } from "next/server";

import { auth } from "@/auth";

/**
 * Server-side proxy to the FastAPI backend.
 *
 * The browser calls this route on its own origin; this route attaches the
 * shared secret and forwards. Two things follow from that:
 *
 *  1. SENTINEL_API_KEY never reaches the client. Anything in client JavaScript
 *     is readable by anyone with devtools, so a secret that guarded the API
 *     could not have lived in the browser bundle.
 *  2. The session check below is what finally makes logging in protect *data*
 *     rather than only the UI. Before this existed, the backend was reachable
 *     directly and the auth gate was cosmetic.
 *
 * Note this runs on the Node runtime, not Edge: `auth()` pulls in the
 * Credentials provider, which needs bcrypt.
 */

const BACKEND =
  process.env.SENTINEL_API_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:8000";

const API_KEY = process.env.SENTINEL_API_KEY ?? "";

/** Hop-by-hop and identity headers that must not be forwarded verbatim. */
const STRIPPED = new Set([
  "host",
  "connection",
  "content-length",
  "cookie", // the backend has no session concept; forwarding it leaks ours
  "x-sentinel-key", // never let a caller supply their own guard header
]);

async function forward(request: NextRequest, path: string[]): Promise<Response> {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ detail: "Not authenticated." }, { status: 401 });
  }

  // Callers pass backend-absolute paths (`/api/actions`), so the catch-all
  // already contains the leading "api" segment — prefixing it again here would
  // request /api/api/actions.
  const target = new URL(`/${path.join("/")}`, BACKEND);
  target.search = request.nextUrl.search;

  const headers = new Headers();
  request.headers.forEach((value, key) => {
    if (!STRIPPED.has(key.toLowerCase())) headers.set(key, value);
  });
  if (API_KEY) headers.set("X-Sentinel-Key", API_KEY);

  const hasBody = !["GET", "HEAD"].includes(request.method);

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method: request.method,
      headers,
      body: hasBody ? await request.text() : undefined,
      cache: "no-store",
      redirect: "manual",
    });
  } catch (error) {
    // A dead backend is the single most common local failure. Say so clearly
    // rather than surfacing an opaque runtime error to the client.
    return NextResponse.json(
      {
        detail:
          error instanceof Error
            ? `Cannot reach the Sentinel API at ${BACKEND} — ${error.message}`
            : `Cannot reach the Sentinel API at ${BACKEND}.`,
      },
      { status: 502 },
    );
  }

  // Stream the body straight through so response shapes stay byte-identical.
  const body = await upstream.arrayBuffer();
  const responseHeaders = new Headers();
  const contentType = upstream.headers.get("content-type");
  if (contentType) responseHeaders.set("content-type", contentType);

  return new NextResponse(body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}

type Ctx = { params: { path: string[] } };

export const GET = (req: NextRequest, { params }: Ctx) => forward(req, params.path);
export const POST = (req: NextRequest, { params }: Ctx) => forward(req, params.path);
export const PUT = (req: NextRequest, { params }: Ctx) => forward(req, params.path);
export const PATCH = (req: NextRequest, { params }: Ctx) => forward(req, params.path);
export const DELETE = (req: NextRequest, { params }: Ctx) => forward(req, params.path);
