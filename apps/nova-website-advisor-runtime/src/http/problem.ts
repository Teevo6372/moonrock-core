import type { Context } from "hono";

export interface ProblemDetail {
  type: string;
  title: string;
  status: number;
  detail: string;
  code: string;
  correlationId: string;
  errors?: Array<{ path: string; message: string }>;
}

export function problem(
  context: Context,
  input: Omit<ProblemDetail, "correlationId">,
): Response {
  const body: ProblemDetail = {
    ...input,
    correlationId: context.get("correlationId") as string,
  };
  return new Response(JSON.stringify(body), {
    status: input.status,
    headers: {
      "content-type": "application/problem+json",
      "x-correlation-id": body.correlationId,
    },
  });
}
