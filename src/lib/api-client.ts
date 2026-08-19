export async function readApiResponse<T>(response: Response): Promise<{
  ok: boolean;
  status: number;
  data: T | null;
  error: string;
}> {
  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  const error =
    typeof body === "object" &&
    body !== null &&
    "error" in body &&
    typeof body.error === "string"
      ? body.error
      : response.ok
        ? ""
        : "Unable to complete the request. Please try again.";
  return {
    ok: response.ok,
    status: response.status,
    data: response.ok ? (body as T) : null,
    error,
  };
}

export function permissionMessage(status: number, fallback: string) {
  if (status === 401) return "Please log in to continue.";
  if (status === 403)
    return "You do not have permission to perform this action.";
  if (status === 404) return "The requested record was not found.";
  return fallback;
}
