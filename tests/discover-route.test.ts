import { beforeEach, describe, it, expect, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  client: vi.fn(),
  search: vi.fn(),
  config: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@supabase/supabase-js", () => ({ createClient: mocks.client }));
vi.mock("../src/lib/env", () => ({ getSupabaseConfig: mocks.config }));
vi.mock("../src/lib/ai/ask/search", () => ({
  createSearch: () => ({ search: mocks.search }),
}));
import { GET } from "../src/app/api/discover/route";
beforeEach(() => {
  vi.resetAllMocks();
  mocks.config.mockReturnValue({
    url: "https://example.supabase.co",
    key: "public-key",
  });
  mocks.search.mockResolvedValue([]);
});
describe("public discovery read route", () => {
  it("uses anonymous publication-scoped retrieval without a model or privileged client", async () => {
    const response = await GET(
      new Request("https://example.test/api/discover?period=now"),
    );
    expect(response.status).toBe(200);
    expect(mocks.client).toHaveBeenCalledWith(
      "https://example.supabase.co",
      "public-key",
      expect.anything(),
    );
    expect(mocks.search.mock.calls[0][0]).toMatchObject({
      kind: "all",
      time: { period: "now" },
    });
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
  it("requires kind/id together and rejects invalid time filters before reading", async () => {
    for (const q of ["?kind=event", "?id=bad", "?period=forever"])
      expect(
        (await GET(new Request("https://example.test/api/discover" + q)))
          .status,
      ).toBe(400);
    expect(mocks.client).not.toHaveBeenCalled();
  });
  it("revalidates exactly the requested record using the retrieval reference filter", async () => {
    const id = "00000000-0000-4000-8000-000000000001";
    expect(
      (
        await GET(
          new Request("https://example.test/api/discover?kind=event&id=" + id),
        )
      ).status,
    ).toBe(200);
    expect(mocks.search.mock.calls[0][3]).toMatchObject({
      results: [{ kind: "event", id }],
    });
  });
  it("never disguises storage failure as an empty result", async () => {
    mocks.search.mockRejectedValue(new Error("upstream-secret"));
    const response = await GET(
      new Request("https://example.test/api/discover"),
    );
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("upstream-secret");
  });
});
