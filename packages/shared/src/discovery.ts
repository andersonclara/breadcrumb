import { describePostLocation } from "./post-location";
import { campus, fromWorld, type WorldCrumb } from "./world";

export type DiscoveryRecord = {
  kind: "event" | "crumb";
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  venue: string | null;
  latitude: number | null;
  longitude: number | null;
  startsAt: string | null;
  endsAt: string | null;
  eventDate: string | null;
  allDay: boolean;
  createdAt: string | null;
  expiresAt: string | null;
  state: WorldCrumb["state"] | null;
  confirmCount: number;
  disputeCount: number;
  source: string;
  sourceUrl: string | null;
  lastSyncedAt: string | null;
  priceText: string | null;
  priceType: "free" | "unknown";
  distanceMeters: number | null;
};
export type DiscoveryPeriod = "now" | "today" | "tonight" | "next7days";
export type AskContext = {
  constraints: {
    kind: "all" | "events" | "crumbs";
    time: { period: string; date: string | null };
    nearPlace: string | null;
    useUserLocation: boolean;
    radiusMeters: number;
    freeOnly: boolean;
    categories: string[];
    terms: string[];
  };
  results: { kind: "event" | "crumb"; id: string }[];
  referencePlace: string | null;
};
export type AskResult = {
  status: "results" | "no_results" | "clarification" | "unsupported";
  answer: string;
  cards: DiscoveryRecord[];
  context: AskContext;
  suggestedFollowUps: string[];
  dataFreshnessNote: string;
  appliedConstraints: AskContext["constraints"];
};
export const discoveryKey = (r: Pick<DiscoveryRecord, "kind" | "id">) =>
  `${r.kind}:${r.id}`;
// Resolve only an explicit, unique official campus building name. Floor/room
// suffixes don't change the building anchor; vague/off-campus venues stay null.
export function resolveDiscoveryLocation(r: DiscoveryRecord): DiscoveryRecord {
  if (r.latitude !== null || r.longitude !== null || !r.venue) return r;
  const normalize = (s: string) =>
    s.toLowerCase().replace(/[.,]/g, "").replace(/\s+/g, " ").trim();
  const venue = normalize(r.venue).replace(
    /\s+(?:\d+(?:st|nd|rd|th)? floor|room [a-z0-9-]+|\([a-z]*\d[a-z0-9-]*\))$/,
    "",
  );
  const aliases: Record<string, string> = {
    "reitz union": "reitz student union",
  };
  const matches = campus.buildings.filter(
    (b) => b.buildingNumber && normalize(b.name) === (aliases[venue] ?? venue),
  );
  if (matches.length !== 1) return r;
  const b = matches[0];
  return { ...r, ...fromWorld(b.x, b.y - b.height / 2) };
}
export function crumbRecord(c: WorldCrumb): DiscoveryRecord {
  return {
    kind: "crumb",
    id: c.id,
    title: c.title,
    description: c.description,
    category: c.category,
    venue: describePostLocation(c),
    latitude: c.latitude,
    longitude: c.longitude,
    startsAt: null,
    endsAt: null,
    eventDate: null,
    allDay: false,
    createdAt: c.created_at,
    expiresAt: c.expires_at,
    state: c.state,
    confirmCount: c.confirm_count,
    disputeCount: c.dispute_count,
    source: "Campus report",
    sourceUrl: null,
    lastSyncedAt: null,
    priceText: c.category === "freebie" ? "Reported free" : null,
    priceType: c.category === "freebie" ? "free" : "unknown",
    distanceMeters: null,
  };
}
export function mappable(r: DiscoveryRecord) {
  return (
    r.latitude !== null &&
    r.longitude !== null &&
    Number.isFinite(r.latitude) &&
    Number.isFinite(r.longitude)
  );
}
export function isCurrentRecord(r: DiscoveryRecord, now = Date.now()) {
  if (r.kind === "crumb")
    return (
      !!r.expiresAt &&
      Date.parse(r.expiresAt) > now &&
      r.state !== "stale" &&
      r.state !== "burnt"
    );
  if (r.allDay) return !!r.eventDate && r.eventDate >= campusDay(now);
  return Date.parse(r.endsAt ?? r.startsAt ?? "") > now;
}
export function campusDay(now: number | Date = Date.now()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
export function discoveryTime(r: DiscoveryRecord, now = Date.now()) {
  if (r.kind === "crumb") {
    const minutes = Math.max(
      0,
      Math.floor((now - Date.parse(r.createdAt ?? "")) / 60000),
    );
    return Number.isFinite(minutes)
      ? minutes < 1
        ? "Just posted"
        : minutes < 60
          ? `Posted ${minutes} min ago`
          : `Posted ${Math.floor(minutes / 60)} hr ago`
      : "Campus report";
  }
  if (r.allDay && r.eventDate) {
    const date = new Date(`${r.eventDate}T12:00:00Z`);
    return Number.isFinite(date.getTime())
      ? new Intl.DateTimeFormat("en-US", {
          month: "short",
          day: "numeric",
          timeZone: "UTC",
        }).format(date) + " · Time not listed"
      : "Time not listed";
  }
  if (!r.startsAt || !Number.isFinite(Date.parse(r.startsAt)))
    return "Time not listed";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
  }).format(new Date(r.startsAt));
}
