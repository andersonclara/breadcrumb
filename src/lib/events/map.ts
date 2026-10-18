import type { SupabaseClient } from '@supabase/supabase-js';
import { campusDay, isCurrentRecord, resolveDiscoveryLocation, type DiscoveryRecord } from '@breadcrumb/shared';

// The map needs a wider set than Ask's 20-candidate ranking budget. Keep a
// separate small Instagram allocation so those reviewed posts aren't crowded out.
export async function readMapEvents(db: SupabaseClient, window: { start: string; end: string }, nowOnly: boolean, signal: AbortSignal) {
  const read = async (instagram: boolean) => {
    let query = db.from('club_events').select('id,source,title,description,venue_text,starts_at,ends_at,event_date,all_day,url,price_text,last_synced_at')
      .eq('ingestion_status', 'published').lt('starts_at', window.end)
      .or(`ends_at.gt.${window.start},starts_at.gte.${window.start}${nowOnly ? '' : `,event_date.eq.${campusDay()}`}`);
    if (instagram) query = query.eq('source', 'instagram');
    if (nowOnly) query = query.eq('all_day', false);
    const { data, error } = await query.order('starts_at').order('id').limit(instagram ? 20 : 180).abortSignal(signal);
    if (error) throw new Error('map_events_unavailable');
    return (data ?? []).map((e): DiscoveryRecord => resolveDiscoveryLocation({
      kind: 'event', id: e.id, title: e.title, description: e.description, venue: e.venue_text,
      category: null, latitude: null, longitude: null, startsAt: e.starts_at, endsAt: e.ends_at,
      eventDate: e.event_date, allDay: e.all_day, createdAt: null, expiresAt: null,
      state: null, confirmCount: 0, disputeCount: 0, source: e.source,
      sourceUrl: e.url, lastSyncedAt: e.last_synced_at, priceText: e.price_text,
      priceType: /^(free|free admission|free entry|no charge|0|\$0|0\.00|\$0\.00)$/i.test(e.price_text?.trim() ?? '') ? 'free' : 'unknown', distanceMeters: null,
    })).filter(r => isCurrentRecord(r) && safeSource(r.sourceUrl));
  };
  const [general, instagram] = await Promise.all([read(false), read(true)]);
  return [...new Map([...instagram, ...general].map(r => [r.id, r])).values()];
}
function safeSource(value: string | null) {
  try { const u = new URL(value ?? ''); return ['http:', 'https:'].includes(u.protocol) && !u.username && !u.password; }
  catch { return false; }
}
