import { NextResponse } from "next/server";

export function embedCorsHeaders(methods: string): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": methods,
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

export function embedCorsPreflight(methods: string): NextResponse {
  return new NextResponse(null, {
    status: 204,
    headers: embedCorsHeaders(methods),
  });
}

export function withEmbedCors(response: Response, methods: string): Response {
  const headers = embedCorsHeaders(methods);
  for (const [key, value] of Object.entries(headers)) {
    response.headers.set(key, value);
  }
  return response;
}
