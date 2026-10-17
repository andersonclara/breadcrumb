export function normalizeUfEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@ufl\.edu$/.test(email) ? email : null;
}

export function canAct(profile: { banned: boolean; suspended_until: string | null } | null, now = Date.now()) {
  if (!profile) return false;
  return !profile.banned && (!profile.suspended_until || Date.parse(profile.suspended_until) <= now);
}
