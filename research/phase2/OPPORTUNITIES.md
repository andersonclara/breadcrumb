# Opportunities supported by the experiments

These are proposed experiments and product directions, **not implemented backend features**. Counts refer to the October 17 snapshot in [REPORT.md](REPORT.md); coverage will change.

## Make uncertainty useful

The novel opportunity is combining what publishers plan with what students can confirm. Show the difference between **scheduled**, **reported happening**, and **recently corroborated**. A calendar can establish a 6PM start. A Crumb could report that a line formed at 6:10. A later report could establish that food ran out. Without that last report, Breadcrumb should not promise stock. Source age, observation time and event time are three different clocks.

Small next experiment: manually inspect ten published food/giveaway candidates and five example user-authored test observations (clearly synthetic, not presented as live data). Define when an observation should expire and what a contradiction means. Score whether the evidence supports the exact answer sentence. This would test answer quality without building ingestion.

## A campus opportunity radar

The feeds already expose workshops, club meetings, gaming, robotics, cultural activities and explicit free admission. A recommendation could connect a student's interests, published admission and a nearby place: “Gaming GBM Tuesday at Reitz; here is the organizer and original listing.” The 118 coordinate-based candidates show spatial feasibility, but unlocated events remain unknown and 1km straight-line is not a walking route.

Small next experiment: compare ten recommendations against their original detail pages, checking actual public eligibility, registration, start/end precision and distance labels. Record precision/recall on a manually labeled set rather than treating all keyword matches as correct. Do not infer private identity traits or student affiliations from anonymous activity.

## Community coverage rather than bigger piles of events

Gaming and robotics had useful candidates while the strict Women in STEM weekend test had zero. That suggests a coverage map by community and date, not simply a larger total record count. Organizer labels can be useful: GatorConnect supplies 333 host labels, UF Calendar has groups/tags, Libraries has audience metadata. Ambiguous acronyms need context; “SWE” alone is insufficient.

Small next experiment: ask organizers, when the team chooses to contact them, for public calendar/export links or five approved event facts. WiCSE's official calendar is a concrete lead. Add other underserved groups deliberately—arts collectives, international communities, service clubs, tabletop groups—then measure which previously unanswered questions gain evidence. No outreach was sent during this work.

## Expiring food and merchant offers

There were six explicit free/provided-food candidates but 95 other food mentions. A separate merchant/organizer fact format could include offer, venue, valid dates/hours, eligibility, quantity limits, source and last confirmation. A weekly happy-hour page is a recurring claim; a merchant-confirmed special for a particular night is stronger. “Free admission” and vendor booth fees belong to different concepts.

Small next experiment: gather a few organizer-approved offers or event submissions and evaluate whether students can answer “available now?” accurately from the supplied fields. An authorized flyer/photo could be tested with OCR later, keeping a link to the original and a human correction step for dates/prices. Arbitrary Instagram harvesting is unnecessary for testing this concept.

## Disruptions that change a recommendation

Public UF closure layers provide polygon/detour geometry, while TAPS provides disruption notices. This could eventually make nearby-event suggestions more useful when a normal path or parking area changes. The experiment also showed why copying every polygon is wrong: archived/saved records and missing dates are common.

Small next experiment: get UF's definitions for active/published/archived and inspect five known current notices against the map. Only then assess path impact. ADA flags alone do not establish an accessible route. Weather is another potential context layer, but this run stopped at the NWS API robots policy and has no forecast proof.

## Provenance as part of the Loaf System

Thirty title/day groups crossed sources. A calendar listing copied into an aggregator is often one originating claim, not two independent confirmations. Store that conceptual distinction in the design: published provenance can explain why an event was suggested; independent observations can support its current state. No storage/schema change is proposed here.

Small next experiment: hand-review the two retained cross-source examples plus several additional publisher-approved pairs. Label same event, separate session or uncertain; compare time zones, rooms and source URLs. A rule that groups by exact title/start/place missed many plausible aliases, so it should not become the production deduper unchanged.

## A credible hackathon demonstration

The current evidence can support a clear story: discover a real published event, explain its community/price/location with a source link, and show how a fresh student observation would change the answer. Use actual sourced facts for scheduled events and clearly labeled test observations for simulated live states. Do not present old archives, synthetic reports or expired deals as current activity.

Before backend work, the most valuable final research check is a small answer-evidence evaluation across three questions: “gaming soon,” “free food now,” and “near Reitz tonight.” It should explicitly allow “we have no current confirmation.” That tests what makes Breadcrumb trustworthy and distinctive without waiting for every conceivable data source.
