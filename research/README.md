# Breadcrumb external-source research

Research only. No application integration, schema changes, deployment, jobs, or authenticated social collection. See [FINDINGS.md](FINDINGS.md) for conclusions, [RESULTS.md](RESULTS.md) for timestamped evidence, [access/README.md](access/README.md) for credentialed API tests, and [yikyak/README.md](yikyak/README.md) for the preserved original experiment.

**Morning second pass:** [phase2/REPORT.md](phase2/REPORT.md) measures actual question coverage, deeper pagination, current venue/seasonal cards and public closure geometry. [phase2/README.md](phase2/README.md) has independent retest commands; [phase2/OPPORTUNITIES.md](phase2/OPPORTUNITIES.md) connects the evidence to further research ideas. Original first-pass evidence is preserved.

**Nightlife/flyer pass:** [nightlife/REPORT.md](nightlife/REPORT.md) adds bar offers, dated promoter/venue activities, brewery feeds and actual local OCR on three real publisher-linked flyers. [nightlife/README.md](nightlife/README.md) has commands; images/full OCR are not committed, and no Instagram media was fetched.

The existing application uses Next.js, React, Supabase, Mapbox, and Gemini. Research scripts run independently on Node 24. The local `node_modules/next/dist/docs/` directory is absent; no Next.js code is being written or changed.

Research dependencies are isolated here. Never install them into the application package:

```powershell
npm.cmd ci --prefix research --ignore-scripts
node research/test.mjs  # lists experiments
node research/test.mjs gatorconnect-rss uf-calendar-page
node research/verify.mjs  # offline syntax, retention and missing-access checks
```

Only read-only public retrieval is authorized. Stop at 401, 403, 429, robots exclusions, or terms restrictions; do not rotate identities, retry through alternate hosts, or defeat challenges. Public accessibility is not a redistribution license. Keep raw responses in memory only. Checked-in reports must contain metadata and minimal non-personal factual examples, not full descriptions, images, social posts, contact details, or tokens.

Commands run from the repository root. Public tests print HTTP/format, counts, missing fields, and two small real record samples. `--save` replaces only minimal public metadata under `samples/`; `node research/report.mjs` regenerates RESULTS.md. `all` continues after a failure and exits nonzero if any request/parser fails; the museum iCal robots stop is expected. No automatic retries or pagination. Use individual experiment IDs for independent retesting.

Optional local credentials: copy `.env.example` to an ignored `research/.env.local` and run `node --env-file=research/.env.local research/access/test.mjs ticketmaster`. Do not put SMS codes in env files. Missing credentials/authorization exit before sending API requests. Authenticated scripts never write samples.

`discover.mjs` checks homepage/policy metadata only; `inspect.mjs` prints bounded public markup for manual parser investigation; `shape.mjs` prints JSON/XML field names/types without people/contact values. These tools do not turn discovery into a confirmed working integration.
