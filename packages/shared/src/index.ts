export const palette = {
  cream: "#F5E9D5", toasted: "#D59A55", crust: "#774D35", sage: "#A4B99A", coral: "#E37B64",
} as const;

export const categories = [
  { id: "event", label: "Events", icon: "◷", color: "#774D35", ttlMinutes: 180 },
  { id: "freebie", label: "Freebies", icon: "✦", color: "#D59A55", ttlMinutes: 60 },
  { id: "crowd", label: "Crowds & Lines", icon: "≋", color: "#637856", ttlMinutes: 30 },
  { id: "construction", label: "Construction", icon: "▤", color: "#8B704F", ttlMinutes: 1440 },
  { id: "hazard", label: "Hazards", icon: "!", color: "#BD5943", ttlMinutes: 120 },
  { id: "sighting", label: "Sightings", icon: "◎", color: "#76628A", ttlMinutes: 30 },
] as const;
export type CrumbCategory = typeof categories[number]["id"];
export const UF_VIEW = { longitude: -82.347, latitude: 29.6465, zoom: 14 };
export const FULL_LOAF_CONFIRMATIONS = 3;

export function normalizeUfEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@ufl\.edu$/.test(email) ? email : null;
}
export function canAct(profile: { banned: boolean; suspended_until: string | null } | null, now = Date.now()) {
  if (!profile) return false;
  return !profile.banned && (!profile.suspended_until || Date.parse(profile.suspended_until) <= now);
}
