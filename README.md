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
