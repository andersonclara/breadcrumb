# Friends and communities

The main map shows Campus and the communities you joined as separate tabs. Category is a dropdown filter. Manage membership and create communities from Profile. General featured communities are Campus, Girls Only, Sports, and Majors. The older Gaming and Study seeds remain unfeatured to preserve existing data. Custom communities have a name, description, chosen accent, and self-selected membership; their creator joins automatically. Girls Only is self-selected, with pink accents.

Friends are separate from communities. Exchange a friend code, accept the request, and optionally enable location sharing on the map. Community membership does not reveal another user's location.

## Hosted Supabase setup

Apply only migrations that have not already been applied, in order, after initial schema 001:

1. 20261017000200_pixel_world.sql: avatars, friendships, presence, guarded write/read RPCs.
2. 20261017000300_expanded_campus.sql: full campus bounds.
3. 20261017000400_communities.sql: community membership and community-scoped posts.
4. 20261017000500_custom_communities.sql: profile-managed featured communities and community creation.

These files are in supabase/migrations. Local database tests apply all five. The new SQL has not been applied to the hosted project from this coding session. UI previews work locally; creating accounts still depends on the deferred SMTP setup.

## Access and verification

Non-campus posts are readable only by members, both through pixel_world and direct browser RLS queries. Membership is checked for posting, voting, reporting, duplicate grouping, and subscriber notification delivery. Leaving removes that community's existing notifications. Joining never changes friendship or location permissions. Community creation requires a confirmed active UF account, accepts no caller-supplied creator ID, validates the accent, rejects duplicate names, and is limited to three per day.

Tests exercise nonmember/anonymous reads, direct RLS, membership revocation, forbidden confirmations, cross-community grouping, notification scope, and custom community creation.
