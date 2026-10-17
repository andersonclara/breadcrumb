import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ cookie: vi.fn(), bearer: vi.fn(), user: vi.fn(), profile: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("../src/lib/supabase/server", () => ({ createClient: mocks.cookie }));
vi.mock("@supabase/supabase-js", () => ({ createClient: mocks.bearer }));
vi.mock("../src/lib/env", () => ({ getSupabaseConfig: () => ({ url: "https://example.supabase.co", key: "public-test-key" }) }));
import { assertCanAct } from "../src/lib/guard";

beforeEach(() => {
  vi.resetAllMocks();
  const client = { auth: { getUser: mocks.user }, from: () => ({ select: () => ({ eq: () => ({ single: mocks.profile }) }) }) };
  mocks.cookie.mockResolvedValue(client);
  mocks.bearer.mockReturnValue(client);
  mocks.user.mockResolvedValue({ data: { user: { id: "test-user", email: "student@ufl.edu", email_confirmed_at: "2026-10-16" } }, error: null });
  mocks.profile.mockResolvedValue({ data: { banned: false, suspended_until: null }, error: null });
});

describe("web and mobile write authentication", () => {
  it("keeps cookie-based web authentication", async () => {
    await assertCanAct();
    expect(mocks.cookie).toHaveBeenCalledOnce();
    expect(mocks.bearer).not.toHaveBeenCalled();
  });
  it("verifies a mobile bearer token with Supabase and scopes profile reads to it", async () => {
    await assertCanAct(new Request("https://example.test/api/crumbs", { headers: { Authorization: "Bearer test-token" } }));
    expect(mocks.user).toHaveBeenCalledWith("test-token");
    expect(mocks.cookie).not.toHaveBeenCalled();
    expect(mocks.bearer).toHaveBeenCalledWith("https://example.supabase.co", "public-test-key", expect.objectContaining({
      global: { headers: { Authorization: "Bearer test-token" } },
    }));
  });
  it("rejects a malformed header instead of falling back to a cookie", async () => {
    await expect(assertCanAct(new Request("https://example.test", { headers: { Authorization: "Basic abc" } }))).rejects.toMatchObject({ status: 401 });
    expect(mocks.cookie).not.toHaveBeenCalled();
  });
  it("rejects expired or forged tokens", async () => {
    mocks.user.mockResolvedValue({ data: { user: null }, error: new Error("invalid token") });
    await expect(assertCanAct(new Request("https://example.test", { headers: { Authorization: "Bearer expired" } }))).rejects.toMatchObject({ status: 401 });
  });
  it.each([
    { id: "test-user", email: "student@gmail.com", email_confirmed_at: "2026-10-16" },
    { id: "test-user", email: "student@ufl.edu", email_confirmed_at: null },
  ])("requires a confirmed UF identity", async user => {
    mocks.user.mockResolvedValue({ data: { user }, error: null });
    await expect(assertCanAct()).rejects.toMatchObject({ status: 401 });
  });
  it("fails closed if the profile cannot be read", async () => {
    mocks.profile.mockResolvedValue({ data: null, error: new Error("unavailable") });
    await expect(assertCanAct()).rejects.toMatchObject({ status: 403 });
  });
});
