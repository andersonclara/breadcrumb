import { describe, expect, it } from "vitest";
import { breadPassLoginUrl, isAuth0Configured, isAuth0Route, safeNext } from "../src/lib/auth/breadpass";

describe("BreadPass helpers", () => {
  it("keeps post-login redirects on this site", () => {
    expect(safeNext("/communities")).toBe("/communities");
    for (const value of ["https://evil.test", "//evil.test", "/\\evil.test", "", null, undefined, 42]) expect(safeNext(value)).toBe("/");
  });
  it("sends the passwordless email connection through the Supabase bridge", () => {
    const url = new URL(breadPassLoginUrl("/friends"), "http://localhost:3000");
    expect(url.pathname).toBe("/auth/login");
    expect(url.searchParams.get("connection")).toBe("email");
    expect(url.searchParams.get("returnTo")).toBe("/breadpass?next=%2Ffriends");
    expect(url.searchParams.has("prompt")).toBe(false);
    expect(new URL(breadPassLoginUrl("//evil.test", { fresh: true }), "http://x").searchParams.get("prompt")).toBe("login");
  });
  it("leaves the Supabase email-link callback outside Auth0's routes", () => {
    expect(isAuth0Route("/auth/login")).toBe(true);
    expect(isAuth0Route("/auth/callback")).toBe(true);
    expect(isAuth0Route("/auth/confirm")).toBe(false);
    expect(isAuth0Route("/breadpass")).toBe(false);
  });
  it("needs every Auth0 setting before enabling BreadPass", () => {
    const env = { AUTH0_DOMAIN: "d", AUTH0_CLIENT_ID: "i", AUTH0_CLIENT_SECRET: "s", AUTH0_SECRET: "x".repeat(64), APP_BASE_URL: "http://localhost:3000" };
    expect(isAuth0Configured(env)).toBe(true);
    expect(isAuth0Configured({ ...env, AUTH0_SECRET: "" })).toBe(false);
  });
});
