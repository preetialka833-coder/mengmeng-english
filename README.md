# Learning garden

A static English and mathematics practice site. Existing page URLs and browser-local progress keys remain in use; there is no account, analytics, or server-side learner record.

## Check a change

- Node.js 22 or newer: `npm test` runs syntax, question-bank, scheduling and synthetic progress regressions without installing packages.
- For isolated Chromium UI checks: `npm install`, `npx playwright install chromium`, then `npm run test:browser`.
- Browser tests start a local static server and create fresh browser contexts containing synthetic fixtures only. They never read or modify production progress.
- The GitHub Actions workflow uses read-only repository permissions. It runs tests and saves temporary screenshots/reports; it does not deploy the site.

## Progress and review

English retains `mengmeng_v4_unit1`. Existing fields are retained and the new calendar-day schedule/session fields are additive. A day's base queue is fixed when first opened: up to eight oldest due reviews, then up to four new items if the review backlog is at most eight. A failed item is corrected, optionally retested after about ten minutes (up to two short retests per item per day), and reviewed the next day. Immediate corrections and same-day retests are not delayed independent recall. The intervals are a practical practice plan, not a universal memory rule.

Math retains both existing unit-stat keys and the shared XP, coins and ownership data. Hint-assisted and corrected answers earn completion rewards but do not count as independent mastery. A separate session record preserves the current question, responses, hint use and prior errors after a refresh.

## Trial and recovery

Use the same device/browser that already holds the progress. The repaired English page verifies an immutable local copy of the original raw progress before migration; if that backup fails, the original is not overwritten. The parent page can export the original backup code, even when the previous page could not start. Keep that code separately. Check both subjects, answer one item, return home and reload. Check that the same unfinished session resumes and that rewards remain. Verify audio, touch input, text sizing and orientation on the actual learning device; desktop Chromium results cannot establish device or speech compatibility.

To roll back code, revert the repair commit (or restore the pre-repair page files) while keeping the same Pages URL. Do not clear browser data or delete localStorage keys. New progress fields are additive, but older code will not understand the new saved daily/session plans. If progress restoration is necessary, use the saved pre-trial English code deliberately; never import a synthetic test fixture into a real learner's browser.

## English audio compatibility

Version `2026.10.08-r2` plays 49 same-origin MP3 clips before relying on device speech. The clips use an offline synthetic US-English voice; see `audio/english/README.md` for provenance and verification limits. Local device English voices remain an explicit fallback. Playback status and retry controls make failures visible. No audio data or learner records are sent to an external TTS service. Actual listening and learning-device acceptance still require a brief trial.

## Isolated upgrade candidate: 2026.10.19-review1

English masked stages still require the complete word, phrase or sentence; the instruction now says so beside the answer. Related items explain sb/sth locally without changing accepted answers or recordings.

Before every active English progress write, the page compares the exact stored string with its last successfully read/written value. Changed, removed or unreadable storage freezes old inputs, navigation and timers and offers a full reload. The parent-page import uses the same guard. No other page in this repository writes the English key. This detects observed stale-page writes; localStorage read/compare/write is not atomic, so simultaneous writers can still race. Do not use multiple active English editors as a supported concurrent workflow. A synthetic reentrant-write test deliberately demonstrates that remaining window; near-simultaneous browser checks do not prove it absent.

Math adds recallFirstDay, recallDueDay, recallVerifiedDay and recallBlockedDay without converting older counters. Same-day successes earn existing rewards but do not verify delayed recall. A later independent success on or after its due calendar day verifies that same question; the next check is scheduled three days later as a practical trial rule. Hints, errors and knowledge-card use block new evidence for that question that day, including another group/entry. Previous valid verified-day evidence is kept and labeled historical. This cannot establish knowledge-point transfer or current school achievement. New groups select up to eight oldest due questions in the chosen scope before weighted remaining questions; unfinished groups stay fixed on reload and show remaining due work.

Rollback: restore the prior HTML files at the same URL and leave browser storage intact. Older code ignores the added recall fields. It also restores the previous interpretation of math streaks and lacks the stale-English-page guard; avoid concurrent old/new pages and fully reload before continuing. Preserve/export progress first as in Trial and recovery. Never clear localStorage or restore synthetic fixtures into a real learning browser.

## Unit expansion candidate: 2026.10.20-units-candidate5

This remains an isolated candidate, with no release authorization. Six-unit teacher material accounts for 279 entries: 277 active and 2 held (48/55/47/40/44/43 active by unit). Main-thread content reviewers actually examined all six photos. Their review found no new substantive transcription error; engineering relies on that review and does not claim to have personally viewed the photos. Daming remains obscured, part of phew's Chinese gloss remains uncertain, and the source meaning of must requires confirmation. Unit2 word|must and Unit1 sentence|I keep running for five months. remain in source data but are suspended from every exercise entry and old queue presentation. Answers, stable IDs, raw old queue entries, records, original snapshots and previously earned rewards remain preserved. Suspended entries do not mint completion credit. Unit1's original 49-entry graduation threshold remains; its held historical evidence is read without normalization. Other units graduate on active entries, so Unit2's 55-entry completion remains reachable.

Each English unit has its own page and mengmeng_v4_unitN storage key. New current and original-backup progress codes carry a unit-specific format/version/unit/raw envelope. A mismatched code is rejected before creating a backup or replacing progress. Unit1 still accepts historical untagged Unit1 codes; new units reject untagged codes because they have never been publicly released. The raw snapshot string remains exact, with unknown fields preserved. Tags prevent accidental cross-unit restores and are not authentication.

All 49 Unit1 MP3 files and original D entries remain unchanged, including the suspended sentence's original file. Only active entries are practiced. Units2–6 use explicit local English speech, with visible failure if unavailable; they never borrow Unit1 clips. No new MP3s, external speech service or installation is introduced. Optional quotes/ellipsis typography do not remove meaningful contractions, hyphens, slashes or word boundaries.

The eight-unit math directory preserves existing Unit1/2 banks, IDs, inline scripts and shared rewards/ownership. Units3/5/7/8 retain 44 original general warmups. Units4/6 add 6 and 8 original diagram exercises, based on the main thread's actual official-book scope verification (pages58–62 and79–84). They cover sightlines/observation positions/routes, specified cylinder/cone cuts, supported0/1layers and fixed-direction cube rolls. They are original companion exercises, not copied textbook questions, full syllabus coverage or proof of the school's current progress. Scope/source cards do not count as problem help. The third question disclosure clearly says “查看答案／解析”; using it still records assistance and preserves that fact after reload. No three-view inversion, dice opposite-face exercise or arbitrary cross-section taxonomy is added.

Use node tests/run-all.cjs for synthetic Node checks, plus Python3 tests/audit-original-math.py (44 arithmetic answers) and tests/audit-spatial-math.py (14 diagram-condition answers). Browser evidence uses actual Edge with synthetic contexts at390/768pixels, and retains the existing audio and progress regressions. This is not actual learning-device, listening or achievement acceptance. WORK independently reviewed actual packages, reproduced and closed the initial import/help/label issues, and independently rendered all14SVGs; corresponding held-item follow-up findings are fixed in candidate3 and submitted as a bounded closeout delta. Final WORK conclusion and release approval must be recorded separately. Nothing is pushed or deployed by these checks.

Candidate4 corrects two sightline statements, the equal-pole hint and the full-diameter axial cut projection. All14diagrams provide a wrapping16px condition caption and an explicit780px zoom view (17SVGunits render as25.5px). These five subsections have basic original exercises; the layer-plan tasks do not yet establish solid-building/plan translation or full spatial-construction coverage. IDs, answers and rewards remain unchanged.

Candidate5 keeps the corrected axial projection and moves its rectangular-section teaching conclusion into the explicitly labeled answer explanation; the visible question does not state the conclusion. Reading that explanation records assistance.
