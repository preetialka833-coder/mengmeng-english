# English audio

These 49 MP3 clips are synthetic US-English speech generated offline with CMU
Flite's installed `slt` voice, through FFmpeg's `flite` filter. They are not human
recordings and are not labelled British English. Only the existing public lesson
text was used. No learner data, external TTS request, downloaded voice, or new
software installation was involved.

## Playback and content

The English page plays these same-origin recordings first, from an explicit
button click, with native audio controls and loading/playback/error status.
Device Web Speech is an optional fallback; it selects a local English voice and
reports a missing voice or timeout instead of silently waiting. No remote voice
is deliberately selected.

`manifest.json` records each exact answer/lesson string, the separate spoken
string, filename, duration, size, and SHA-256. `sb/sth` is spoken as “somebody or
something”; `sb` as “somebody”; `sth` as “something”. The spelling answers and all
progress keys are unchanged. Hyphens and contractions remain in the speech
input. The spelling placeholder convention still applies to typed answers.
The spoken alias “Dah Ming” approximates the name “Daming”, without changing the
displayed name or answer. Flite's local segment output was checked: the alias
uses `d aa m ih ng`, instead of the original `d ae m ih ng`. This is a phoneme-plan
check, not a claim that pronunciation has passed a listening review.

## Reproduction

From the repository root, with FFmpeg including Flite and libmp3lame already
installed, run:

    python3 scripts/generate-english-audio.py

Generation uses voice `slt`, tempo `0.88` without pitch change, loudness target
`-18 LUFS` with a `-2 dBTP` limit, an extra 80 ms leading / 180 ms trailing margin,
and MP3 mono 22,050 Hz at 48 kbit/s. Generation environment: FFmpeg 7.1.5 with
Flite 2.2. The script does not install anything or use the network.

## Provenance and license

See `FLITE-NOTICE.txt` for the retained Carnegie Mellon University attribution,
permissive notice and disclaimer from the installed Flite package. No Flite
engine or voice-model binary is redistributed here. Relevant upstream sources:

- https://github.com/festvox/flite/blob/master/README.md
- https://github.com/festvox/flite/blob/master/COPYING
- https://github.com/festvox/flite/blob/master/lang/cmu_us_slt/cmu_us_slt.c
- https://ffmpeg.org/ffmpeg-filters.html#flite

This project is not endorsed by Carnegie Mellon University or the voice authors.

## Verification limits

All clips have been checked for mapping, hashes, successful MP3 decoding,
non-silent signal and no full-scale sample clipping. Synthetic voices can have
unnatural stress or mispronounce names such as “Daming”. These checks are not a
perceptual pronunciation review. The available model runtime could not accept
audio input, so actual listening/acceptance on the learning device remains
necessary. Browser event tests establish media loading/playback behavior, not
that a person heard or understood the speaker output.
