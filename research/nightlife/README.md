# Nightlife and flyer experiments

Independent research only. [REPORT.md](REPORT.md) explains conclusions and acquisition options; [EVIDENCE.md](EVIDENCE.md) records exact endpoints, HTTP status, UTC times, field counts and actual examples. No app/backend, social login, AI API call, scheduled job, attendee data or outbound messages.

## Public venue tests

Run from the repository root using the existing isolated research dependencies:

```powershell
node research/nightlife/discover.mjs --compact             # 13 fixed venue/promoter pages
node research/nightlife/test.mjs glory-gainesville --compact
node research/nightlife/test.mjs magnitude-events-food magnitude-pride-detail magnitude-festival-detail --compact
node research/nightlife/test.mjs looseys-trivia looseys-karaoke --compact
node research/nightlife/test.mjs salty-weekly --compact
node research/nightlife/test.mjs swamp-head-json swamp-head-ical --compact
node research/nightlife/test.mjs bull-calendar-lead cypress-calendar-lead --compact
```

No IDs selects all sources. Omit `--compact` for full request metadata/missing fields. Add `--save` to merge only minimal factual evidence in `evidence/`. Records overlap across methods; script completion does not mean every request succeeded. Stops honor robots, denied/rate-limited responses and crawl delay (Loosey's advertises ten seconds). No automatic retries or alternate-host bypasses. Swamp Head REST returns only page 1; metadata advertises another page. Calendar embed discovery is not successful event retrieval.

`inspect.mjs` accepts fixed IDs in its `pages` map and prints bounded markup terminal-only for selector investigation. No raw HTML file is written.

## Actual flyer OCR

This Windows environment already has English Windows.Media.Ocr and Python OpenCV 4.13.0. No package, language model, binary or app dependency was installed. OCR is local; no flyer is uploaded to another service. Elsewhere, Windows OCR/en-US support and Python/OpenCV must be available, or the runner reports an error. A missing optional OpenCV installation leaves original-image OCR possible; it does not silently substitute fabricated results.

```powershell
powershell.exe -NoProfile -File research/nightlife/ocr.ps1 -Capabilities
node research/nightlife/flyers.mjs --save --cleanup
```

The runner retrieves three fixed **publisher-website-linked** real flyers, respects policy for each image host, compares original/contrast/threshold variants, and saves only hashes, metadata, counts and bounded date/time/price/age candidates. Two additional crops are **manually chosen for the known Pride poster layout**, not automatic detection. A reported token can be incorrect; e.g. the retained `16-10 PM` candidate is an observed OCR mistake.

Original images and preprocessing outputs are temporarily stored in ignored `research/nightlife/private/flyers/`. `--cleanup` removes only that fixed workspace after the run. They are not copied into Git. Full OCR stays in process memory; the PowerShell child returns it to the Node parent, which discards it after bounded fact extraction. Do not redirect child output into tracked files. No complete transcription/image is in the evidence.

During this agent execution, automatic approval review rejected both a recursive shell cleanup and a narrower named-file cleanup with “blocked by policy.” The ignored image workspace therefore remains locally. The runner's optional `--cleanup` mode was not executed/verified; no alternate deletion mechanism was used after those rejections.

For manual local review without redownloading:

```powershell
node research/nightlife/flyers.mjs --prepare    # ignored images + local manifest only; no OCR yet
node research/nightlife/flyers.mjs --local --save --cleanup
```

`--local` requires that manifest/images from `--prepare` still exist. Do not treat the flyers' source-page dates as dates extracted from pixels. All three images lack a printed year, and the karaoke image lacks any printed calendar date. [manual-review.json](evidence/manual-review.json) explicitly separates visual inspection from automated extraction and source-page evidence. It is a small selected comparison, not a general OCR accuracy benchmark. Actual images may change on retest; compare hashes before reusing old manual annotations.

## Instagram and organizers

**No Instagram posts or Stories were fetched in these experiments.** Existing [Instagram credential test](../access/README.md) targets an organizer-authorized professional account. Images on publisher websites, original files supplied by organizers, and appropriately authorized account media are separate acquisition methods. A pasted public Instagram link alone does not guarantee access to the image or permission to collect it.

See [REPORT.md](REPORT.md) for a realistic comparison, including Meta's documented professional-account API options and the unverified Business Discovery lead. We did not add an unofficial scraper, oEmbed thumbnail collector, browser login, private-channel reader, contact harvesting or paid vision call. No new credentials are needed for the working public website/OCR tests.

## Offline checks

```powershell
node research/nightlife/report.mjs          # regenerate evidence document, no network
node research/nightlife/verify.mjs          # parsing boundaries, retention, OCR provenance, PS/Python syntax
node research/phase2/verify.mjs             # shared HTTP/date-policy regressions
node research/verify.mjs                    # all research JS syntax, original guards and doc links
```

Successful retrieval is not blanket image/content redistribution or Gemini-use clearance. For eventual publishing, resolve source-specific rights/attribution and preserve eligibility, date precision, cancellation and offer conditions. This folder is experimental evidence, not an ingestion service or application seed dataset.
