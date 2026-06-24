export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = "ApiError";
  }
}

export async function requestJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  const payload = await response.json().catch(() => ({})) as Record<string, unknown>;

  if (!response.ok) {
    const message =
      typeof payload.error === "string" ? payload.error : "Request failed";
    throw new ApiError(message, response.status);
  }

  return payload as T;
}
