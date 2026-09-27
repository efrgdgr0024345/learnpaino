# Two-hand library and local score import — v2

This release continues the optional-coach build without changing the private API
configuration. The player, calibration, Exact/Soulful modes and coach remain.
No API key or paid request is needed to browse or import sheet-music files.

## First five two-hand source scores

The library now bundles Moonlight Sonata I, Minuet in G BWV Anh.114, Gymnopedie
No.1, the full-length source edition of Fur Elise, and Nocturne Op.9 No.2.
Each has pitched notation assigned to both hands from two staves or two parts.
This is not an assertion that every note has been certified by a pianist.

The files preserve the extracted MusicXML bytes, including source credits. Each
source is pinned to a repository commit and checked against its original SHA-256
before extraction. The browser checks the bundled XML against the catalogue
hash before import. The scores are served from the piano website's own `scores/`
folder; raw GitHub access is not needed to select these five songs.

A Bach candidate was not promoted because its completeness needs further review.
The seven other old menu entries remain explicitly grouped as legacy melody
demos. They are excluded from the Library browser unless Show old melody demos
is selected. Their old external sources remain until they are replaced.

## What the levels mean

Provisional LearnPiano scale, NOT AMEB/ABRSM/Henle grades:

| Piece | Suggested overall level /10 | Technical | Reading | Musical |
|---|---:|---:|---:|---:|
| Minuet in G | 3 | 3 | 3 | 4 |
| Gymnopedie No.1 | 4 | 4 | 3 | 6 |
| Moonlight I | 5 | 4 | 5 | 7 |
| Fur Elise (whole source edition) | 6 | 6 | 5 | 6 |
| Nocturne Op.9 No.2 | 8 | 7 | 7 | 8 |

These are initial editorial suggestions to review with a teacher, not measured
claims about the user's skill. The familiar opening can be substantially easier
than the whole piece. Every entry includes skill tags and a suggested exercise.
That exercise is available as the coach's lesson focus; the existing API gateway
still marks scores and microphone evidence as unverified. No fake expression
or emotion grade has been added.

## Exact and Soulful

Exact keeps the same pitches/durations and a steady quarter-note pulse. Soulful
uses a small deterministic phrase curve, written dynamic values, heuristic
melody/accompaniment balance and score pedal directions. The five entries have
separate bounded profile settings. Added bar-pedal sustain is explicitly labelled
and only enabled for selected pieces. This remains an illustrative synthesised
interpretation, not a human recording, velocity-layer piano or authoritative
historic performance. Audio, visual timing, seeking and grading use the same
beat-to-seconds mapping. Neither mode changes the keyboard geometry.

## Import MusicXML and compressed MXL

Import sheet music now accepts `.xml`, `.musicxml` and `.mxl`. MXL is unpacked
inside the browser: the first rootfile named by `META-INF/container.xml` is used,
not whichever XML happens to appear first in the ZIP. Stored and deflated ZIP
entries are supported using the browser's native DecompressionStream. Unsupported
browsers can still load uncompressed MusicXML.

Before replacing the active piece, an import preview reports the playable events,
measure count, hand mapping and interpretation warnings. The user explicitly
selects Load this score for practice. The prior piece is preserved on failure.
No score file is uploaded or published by importing. Existing diagnostics may
include score metadata, and Ask coach sends the selected excerpt only when
requested, as described in AI_COACH.md.

Limits: 8 MB file, 5 MB expanded XML, 512 ZIP entries, 50,000 notes, bounded repeat
expansion. Encrypted, split, ZIP64, duplicate and unsafe paths are rejected. Only
the container and root XML are expanded; CRC/lengths are checked. Custom XML
entities/internal subsets are rejected; embedded resources are not fetched.
PDF/photo optical recognition, score engraving and persistent admin publishing
are NOT added in this release.

## Parser checks and known limitations

Standard forward/backward repeats and numbered endings are expanded. Printed bar
labels survive repeats, while the coach uses distinct playback measure indices.
Complex D.C./D.S./coda navigation is warned about and left in written order; it
must not be treated as a complete performance. Grace-note/ornament behaviour and
cross-staff/hand changes still need musical review. Merely finding two staves
never certifies a complete original score. Imported single-hand pieces remain
usable but are not silently given an invented left hand.

## Source/reuse record

Four new sources: https://github.com/musetrainer/library at
`9128876f6164d96997c877a2be843349a32bdabb`. The upstream collection declares its
files public domain. The Minuet explicitly includes `Public Domain (PianoXML
typeset)`. Other selected files retain their MuseScore source links; their blank
rights fields are not independently interpreted as a legal licence. This is
source-declared provenance, not legal certification. Review editions before
commercial reuse.

Moonlight retains the existing pinned research-corpus source at
`fosfrancesco/piano_corpora_dcml`, commit
`aa732b635bc75c6583d86c6ac488e77b08b1b37e`. Check applicable research-corpus
non-commercial/share-alike terms before commercial reuse.

`scores/source-manifest.json` records source URLs, commit, original file hash,
container root, XML hash and structural counts. `tools/build_library.py` reproduces
bundled XML without changing a note. It fails if source bytes differ.

## Deployment and next work

Use the existing loader.php → Load latest from GitHub. No manual deletions, hash
changes or API-key changes. Private coach settings are outside this project.

Five two-hand source entries are a starter library, not the planned 100-song
collection. Next: pianist/edition reviews, easier levels, score preview engraving,
more complete sources, stronger polyphonic input and approved performances.
