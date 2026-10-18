import { afterEach, describe, it, expect, vi } from "vitest";
import {
  allowedApiOrigin,
  developmentMobileOrigin,
  mobileApi,
  mobileOptions,
} from "../src/lib/mobile-api";
const request = (origin?: string) =>
  new Request("http://localhost:3000/api/ask", {
    headers: origin ? { Origin: origin } : {},
  });
afterEach(() => vi.unstubAllEnvs());
describe("Expo preview origin boundary", () => {
  it("allows native requests and same-origin browsers without opening arbitrary origins", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(allowedApiOrigin(request())).toBe(true);
    expect(allowedApiOrigin(request("http://localhost:3000"))).toBe(true);
    expect(allowedApiOrigin(request("https://evil.test"))).toBe(false);
    expect(allowedApiOrigin(request("http://localhost.evil.test:8081"))).toBe(
      false,
    );
  });
  it("permits only the known local Expo port range in development, without cookie credentials", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const req = request("http://localhost:8081");
    expect(developmentMobileOrigin(req)).toBe("http://localhost:8081");
    const response = await mobileApi(async () => Response.json({ ok: true }))(
      req,
    );
    expect(response.headers.get("access-control-allow-origin")).toBe(
      "http://localhost:8081",
    );
    expect(response.headers.has("access-control-allow-credentials")).toBe(
      false,
    );
    expect((await mobileOptions(req)).status).toBe(204);
    expect(
      developmentMobileOrigin(request("http://localhost:9000")),
    ).toBeNull();
  });
  it("keeps the production same-origin restriction and denies preflight exceptions", async () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(allowedApiOrigin(request("http://localhost:8081"))).toBe(false);
    expect((await mobileOptions(request("http://localhost:8081"))).status).toBe(
      403,
    );
  });
});
