# Pixel campus world

Breadcrumb now has a shared 8-bit campus map and player sprites on web, iPhone, and Android. The map uses actual UF roads and building footprints from a cached OpenStreetMap snapshot, rasterized into a 320 by 320 grid. It is a campus discovery map rather than a turn-by-turn navigation system. No fake people or events are displayed.

## Connect the feature

1. In the existing Supabase project's SQL Editor, run `supabase/migrations/20261017000200_pixel_world.sql` **once**, after the original migration. Do not rerun the original migration. The new migration preserves existing users and crumbs.
2. If pg_cron is enabled, run `supabase/jobs.sql` after both migrations. This schedules expiry, reminders, and cleanup of expired avatar-location rows. Queries hide expired markers even without cron.
3. Restart the web server with `npm run dev:web`. Start mobile separately with `npm run dev:mobile`.
4. Mobile needs `EXPO_PUBLIC_API_URL` pointing to the running Next.js server for posting, avatar saving, friends, and sharing. In local development, a configured `localhost` hostname is replaced with the Metro server's LAN hostname automatically. Keep the port correct; use an explicit LAN URL if Metro uses a tunnel. For release, use your deployed HTTPS API origin.
5. Configure SMTP and the updated magic-link/code email templates before testing with real UF inboxes. This remains deferred until the domain is ready.

The campus map and outfit preview render without accounts. Saved outfits, live reports, friend requests, and shared locations require the new migration and a confirmed UF account. Until then, the interface displays a migration/setup message instead of substituting demo data.

## Avatars and friends

After signing in, the player creator opens with skin tones, hairstyles, hair colors, top styles, top colors, bottoms, and accessories. Outfits are persisted on the user's profile and can be changed later. Web and mobile use the same sprite geometry and outfit options. The API and database validate every field.

Friendship uses eight-character friend codes. A request does not grant location access; the recipient must accept it. Either person can remove the friendship. All reads enforce the accepted relationship on the server and through location-table RLS. Other users cannot read private profiles or locations simply by knowing their IDs.

## Foreground location sharing

Sharing is off by default each time the app opens. A signed-in user with a saved avatar chooses **Share with friends**, then grants foreground location permission. Positions are rounded on the client and again in the database to approximately 100-meter cells. The exact GPS position stays on the device for its own marker; no exact GPS coordinate is sent to the presence endpoint.

There is one replaceable position row per sharing account, with a 90-second expiry. Heartbeats occur every 20 seconds while sharing; actual movement also updates it. Only accepted friends can read it. The map polls for updates every five seconds and hides expired positions even if a later network request fails. Changed positions animate as walking avatars; the browser also interpolates their displayed movement.

Stopping sharing deletes the position. Backgrounding the native app or hiding the browser tab stops the watcher and attempts to delete it. If a device goes offline abruptly, the marker disappears within 90 seconds. Bans and suspensions remove the restricted account's presence. No background location tracking or historical-trail table is implemented. Optional cron physically cleans up expired rows; presence queries always exclude them.

## Breadcrumbs and loaves

Tap a point on the map, choose a category, write a title and optional description, and post. Nearby reports in the same category with overlapping topic words are suggested before posting. The user can confirm a suggestion or add a related update to it.

An exact normalized topic match within 100 meters automatically joins the active breadcrumb rather than creating a duplicate pin. Topic normalization ignores punctuation, word order, and common location filler words; it preserves numbers. Fuzzy/semantic matches are suggestions requiring the user's choice. The code does not silently merge merely similar claims or rely on AI guesses.

A related update contributes a confirmation using the same unique `(crumb_id, user_id)` vote key as the confirmation button. Three distinct people **other than the original author** must corroborate a crumb to make a Full Loaf, preserving the existing three-confirmation rule. A person who posts an update and confirms still counts once. Related posts also remain attached for the count. Banned accounts' votes stop contributing. Existing dispute, report, strike, staleness, and expiry rules remain in effect.

The map renders a small crumb, a rising slice, or a full loaf from the persisted state. A Full Loaf is community corroborated, never verified true. Reporting hides the crumb from the reporter's world query immediately. Club-event imports and chat are not implemented by this change.

## Server boundaries

Reads use the auth-scoped `pixel_world` RPC. Mutations go through `/api/world`, with request validation, same-origin checks for browser requests, confirmed-UF identity checks, and account restrictions. Mobile supplies a bearer token; web supplies its session cookie. The route calls the auth-scoped `pixel_action` RPC, which independently checks the caller, permissions, category, map bounds, limits, and avatar values. It never accepts a caller-supplied author ID. No service-role key is needed for these operations.

Rate limits are database-backed: five posts per 10 minutes, 30 votes per 10 minutes, 20 reports or friend requests per 10 minutes, 30 outfit changes per 10 minutes, and 30 position updates per minute. Related-post grouping is serialized in the database to prevent simultaneous matching posts creating duplicate roots. Limits and writes are transactional.

## Map source and licenses

The expanded cached sources are downloadable at `/uf-campus-osm.json` and `/uf-campus-extra-osm.json`. The derived grid lives in `packages/shared/src/campus-map.json`. Both map datasets are available under [OpenStreetMap's ODbL 1.0](https://www.openstreetmap.org/copyright); retain attribution in both clients and source availability when distributing the derived map. The source snapshot includes its timestamp. Regenerate with `node scripts/build-campus-map.mjs`; remove the source file first only when intentionally refreshing it. Normal app visits never call Overpass.

The Press Start 2P font's SIL Open Font License is in `public/fonts/OFL.txt`. Avatar and bread sprites are generated from repository-owned code. `node scripts/render-pixel-qa.mjs` creates a temporary map/sprite preview for inspection.

## Verification and limits

Embedded PostgreSQL tests cover friend approval, stranger isolation, revocation, location expiry, coarse positions, avatar validation, related-post grouping, unique corroboration, and posting limits, alongside the prior moderation tests. PostGIS types/functions are substituted in the embedded tests, so apply and verify the actual migration on hosted Supabase before relying on it.

The 8-bit source graphics were rendered and visually inspected. Browser automation and real-device interaction tests were unavailable in this session. Validate touch panning, marker selection, permission denial, backgrounding, offline expiry, and two accepted friends on real phones after SMTP is ready. The broad repository lint command currently also finds unrelated warnings in `research/lib/parse.mjs` and `research/phase2/coverage.mjs`; focused app lint is separate from those research utilities.

## Campus scale, raised buildings, and avatars
The cached expanded Gainesville map includes 3,648 OSM footprints and 5,553 public walkways, covering central campus, UF Health, and veterinary areas. These counts reflect the snapshot, not an audited UF building inventory. Buildings retain real footprints; heights use OSM height or storeys where available and a two-storey fallback otherwise. Raised walls use 0.6 of vertical height for the oblique view. Multipolygon courtyards remain open. Landmark roofs, stone accents, and badges highlight Century Tower, Norman Hall, Reitz, Marston, Library West, and the stadium.

Ground scale uses metres. Avatar sprites have a 1.7 m reference height, enlarged to at least 44 screen pixels so they remain readable. Their feet stay anchored to mapped ground positions. The default camera follows local demo characters along a public walkway at 1.2 m/s. Zoom controls and pinch gestures change the view; landmark-jump buttons were removed to keep the map clear. Foreground GPS is adjusted to a public path only within 12 m. Friend positions remain approximate (100 m rounding) and are not claimed to identify a particular path. Buildings and characters draw in depth order. These changes do not enable background tracking.

Apply migration 20261017000300_expanded_campus.sql after the pixel-world migration to allow reads, posts, and presence in the expanded bounds. The new map and preview work before applying it, but the hosted database otherwise retains the old area limits.

Avatar setup appears during first-time account onboarding. Completed accounts return to the campus after sign-in. Avatar editing lives on /profile on web and mobile; the front page has no customization controls. Its primary action is Drop a Crumb.

Location names are hidden below zoom 8 on both maps. Mobile supports one-finger pan and two-finger pinch with the midpoint anchored to the map; pinch zoom is clamped to 1?128. Pinch and drag gestures suppress tap-to-post. Pinch camera math is covered by unit tests; physical-device gesture QA remains necessary.

## Architectural artwork and social spaces
Eight original pixel illustrations replace the generic roofs at The Swamp, Century Tower, O?Dome, Reitz, Marston, Library West, Plaza of the Americas, and Malachowsky. Their bases stay geographically anchored; the facade drawings deliberately show an oblique view rather than trace a roof. Preview all eight at /landmark-preview.png. Generate it with node scripts/render-landmark-qa.mjs. Reference pages: https://www.eng.ufl.edu/about/new-buildings/malachowsky-hall-for-data-science-information-technology/ , https://www.oconnellcenter.ufl.edu/img_3287_website/ , https://marston.uflib.ufl.edu/ .

The toast-shaped action tears off a piece; the next map tap drops it and opens the composer. No post is written until the composer is submitted. Desktop supports trackpad pinch (Ctrl-wheel), Safari gesture events, and two touch pointers. Real hardware gesture checks remain pending.
