import { describe, it, expect } from "vitest";
import {
  campus,
  crumbRecord,
  discoveryKey,
  isCurrentRecord,
  resolveDiscoveryLocation,
  type DiscoveryRecord,
  type WorldCrumb,
} from "@breadcrumb/shared";
const record = (patch: Partial<DiscoveryRecord> = {}): DiscoveryRecord => ({
  kind: "event",
  id: "same-id",
  title: "Study night",
  description: null,
  category: "event",
  venue: null,
  latitude: null,
  longitude: null,
  startsAt: "2026-10-18T22:00:00Z",
  endsAt: null,
  eventDate: null,
  allDay: false,
  createdAt: null,
  expiresAt: null,
  state: null,
  confirmCount: 0,
  disputeCount: 0,
  source: "Organizer",
  sourceUrl: "https://example.test/event",
  lastSyncedAt: null,
  priceText: null,
  priceType: "unknown",
  distanceMeters: null,
  ...patch,
});
describe("mobile discovery identity and truthfulness", () => {
  it("keeps an event and a Crumb with the same id distinct", () => {
    expect(discoveryKey(record())).not.toBe(
      discoveryKey(record({ kind: "crumb" })),
    );
  });
  it("does not advertise stale or expired reports as active", () => {
    const now = Date.parse("2026-10-17T18:00Z");
    const r = record({
      kind: "crumb",
      state: "crumb",
      expiresAt: "2026-10-17T19:00Z",
    });
    expect(isCurrentRecord(r, now)).toBe(true);
    for (const state of ["stale", "burnt"] as const)
      expect(isCurrentRecord({ ...r, state }, now)).toBe(false);
    expect(isCurrentRecord({ ...r, expiresAt: "2026-10-17T17:00Z" }, now)).toBe(
      false,
    );
  });
  it("treats date-only events by campus date, rather than a fabricated midnight start", () => {
    expect(
      isCurrentRecord(
        record({ allDay: true, eventDate: "2026-10-17" }),
        Date.parse("2026-10-18T01:00Z"),
      ),
    ).toBe(true);
    expect(
      isCurrentRecord(
        record({ allDay: true, eventDate: "2026-10-16" }),
        Date.parse("2026-10-18T01:00Z"),
      ),
    ).toBe(false);
  });
  it("anchors an explicit official building/floor and leaves vague or off-campus venues unpinned", () => {
    const r = resolveDiscoveryLocation(
      record({ venue: "Marston Science Library 2nd Floor" }),
    );
    expect(r.latitude).toBeTypeOf("number");
    expect(r.longitude).toBeTypeOf("number");
    expect(r.venue).toBe("Marston Science Library 2nd Floor");
    for (const venue of [
      "near Marston",
      "Atlanta, Ga.",
      "Library",
      "Bo Diddley Plaza",
    ])
      expect(resolveDiscoveryLocation(record({ venue })).latitude).toBeNull();
    expect(
      campus.buildings.some(
        (b) => b.name === "Marston Science Library" && b.buildingNumber,
      ),
    ).toBe(true);
  });
  it("preserves supplied coordinates and never converts unknown prices into free", () => {
    expect(
      resolveDiscoveryLocation(
        record({
          venue: "Marston Science Library",
          latitude: 30,
          longitude: -80,
        }),
      ),
    ).toMatchObject({ latitude: 30, longitude: -80, priceType: "unknown" });
  });
  it("preserves community confidence rather than assigning an organizer badge", () => {
    const r = crumbRecord({
      id: "crumb",
      latitude: 29.648,
      longitude: -82.344,
      title: "Pizza",
      description: "Outside",
      category: "freebie",
      state: "crumb",
      confirm_count: 0,
      dispute_count: 0,
      created_at: "2026-10-17T18:00Z",
      expires_at: "2026-10-17T19:00Z",
      related_posts: 0,
      my_vote: null,
      is_author: false,
    } as WorldCrumb);
    expect(r).toMatchObject({
      kind: "crumb",
      confirmCount: 0,
      priceText: "Reported free",
      source: "Campus report",
    });
  });
});
