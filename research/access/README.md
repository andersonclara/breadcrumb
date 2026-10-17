# Tests that need credentials or explicit authorization

From the repository root: `node research/access/test.mjs SOURCE`. Missing access prints `NEEDS ACCESS`, `httpStatus: null`, and `requestSent: false`, then exits 2. These are single-page GET tests with no token acquisition, account creation, retries, raw dumps, or file writes. Set secrets only locally; never paste credentials into chat or commit them. A permission flag records your confirmation of real authorization; setting a flag does not grant permission.

| SOURCE | Credentials / permission | How to obtain permitted access |
|---|---|---|
| `ticketmaster` | `TICKETMASTER_API_KEY` | Register an application at [Ticketmaster](https://developer.ticketmaster.com/products-and-docs/apis/discovery/v2/) and obtain its consumer key. Test searches within 15 miles of Gainesville, Florida, not Gainesville, Georgia. Review [API terms](https://developer.ticketmaster.com/support/terms-of-use/), including content removal and retention. |
| `eventbrite` | `EVENTBRITE_TOKEN`, `EVENTBRITE_ORGANIZATION_ID`, `EVENTBRITE_ORGANIZER_AUTHORIZED=1` | Organizer-authorized OAuth/private token via [developer portal](https://www.eventbrite.com/platform/api-keys/). Only the authorized organization's live events; not a general city event search. Confirm organizer rights to event descriptions/images and onward display. |
| `reddit` | `REDDIT_ACCESS_TOKEN`, `REDDIT_USER_AGENT`, `REDDIT_APPROVED=1`; optional `REDDIT_SUBREDDIT=ufl` or `GNV` | Obtain explicit Reddit approval for Breadcrumb's external discovery/AI use, then an OAuth token with appropriate read access. Do not use password grant or create alternative accounts. Current [Responsible Builder Policy](https://support.reddithelp.com/hc/en-us/articles/42728983564564-Responsible-Builder-Policy) requires prior approval; moderator approval alone is insufficient. No anonymous `.json`/RSS harvesting fallback. |
| `discord` | `DISCORD_BOT_TOKEN`, `DISCORD_CHANNEL_ID`, `DISCORD_CHANNEL_AUTHORIZED=1` | A server administrator must install an official bot and authorize a specific public announcement channel and onward publication. Bot needs View Channel and Read Message History; message content may require Message Content intent and approval depending on app size/use. No user tokens or self-bots. [Message API](https://docs.discord.com/developers/resources/message#get-channel-messages). Incoming webhooks send messages; they do not provide a readable announcement feed. |
| `instagram` | `INSTAGRAM_ACCESS_TOKEN`, `INSTAGRAM_USER_ID`, `INSTAGRAM_API_VERSION`, `INSTAGRAM_ORGANIZER_AUTHORIZED=1` | An organizer's professional account must authorize the app through [Instagram API with Instagram Login](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/), with required basic media access and review. Set the version actually enabled for the app, rather than assuming a current version. This tests that organizer's media, not arbitrary public accounts, Stories, DMs, or a geographic event search. Confirm [Meta platform terms](https://developers.facebook.com/terms/). |

Examples after access has actually been granted (tokens supplied privately in the local process environment):

```powershell
node research/access/test.mjs ticketmaster
node research/access/test.mjs eventbrite
node research/access/test.mjs reddit
$env:REDDIT_SUBREDDIT = 'GNV'
node research/access/test.mjs reddit
node research/access/test.mjs discord
node research/access/test.mjs instagram
```

Do not run authenticated tests with shell tracing or terminal transcription. HTTP metadata sanitizes key/token query parameters; authenticated error bodies are never printed. Graph/Discord/Reddit tests print aggregate field presence only, not posts or people. Ticketmaster/Eventbrite print two small public event fact samples, not descriptions or organizer contact details. None of these credentialed endpoints has been confirmed working by this investigation.
