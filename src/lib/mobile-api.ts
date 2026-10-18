// Expo's browser preview has a separate development origin. Native requests do
// not send Origin. Production keeps the existing same-origin browser boundary.
export function developmentMobileOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (process.env.NODE_ENV !== "development" || !origin) return null;
  try {
    const url = new URL(origin);
    return url.protocol === "http:" &&
      ["localhost", "127.0.0.1"].includes(url.hostname) &&
      /^808[1-9]$/.test(url.port)
      ? origin
      : null;
  } catch {
    return null;
  }
}
export function allowedApiOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return (
    !origin ||
    origin === new URL(request.url).origin ||
    !!developmentMobileOrigin(request)
  );
}
export function mobileApi(handler: (request: Request) => Promise<Response>) {
  return async (request: Request) => {
    const response = await handler(request),
      origin = developmentMobileOrigin(request);
    if (origin) {
      response.headers.set("Access-Control-Allow-Origin", origin);
      response.headers.set("Vary", "Origin");
    }
    return response;
  };
}
export async function mobileOptions(request: Request) {
  const origin = developmentMobileOrigin(request);
  if (!origin) return new Response(null, { status: 403 });
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      Vary: "Origin",
    },
  });
}
