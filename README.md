# LearnPiano — calibrated falling-note piano trainer

A browser piano lesson with movable and resizable keyboard alignment, falling notes, sampled audio, a microphone note listener, and Practice/Performance playback.

## Default lesson and tempo

Beethoven, Piano Sonata No. 14, Op. 27 No. 2 — first movement, *Adagio sostenuto* (Moonlight Sonata). The full MusicXML is fetched and cached as `moonlight_sonata_mvt1.musicxml`; the pinned source is documented in `moonlight-source.txt`. An old server-only `demo.musicxml` does not override it.

Default tempo is **quarter note = 52 BPM**, an adjustable practice suggestion, not an exact numerical metronome indication supplied by Beethoven. MusicXML tempo markings are used when available. The source is in 2/2, and the tempo control uses quarter-note units.

## Existing features preserved

- Falling notes land on matching onscreen keys; the MusicXML parser reads all parts, including Moonlight's two piano parts.
- Drag and resize the trainer from every edge/corner to line up with a real keyboard. Full size preserves its calibrated geometry, with a mobile landscape fallback.
- 61-key, 88-key and score-range layouts; timeline, lead-time and tempo controls; local MusicXML import.
- Sampled piano audio with oscillator fallback and a playable onscreen keyboard.
- **Practice:** even notated rhythm and steady pulse.
- **Performance:** an illustrative phrase-shaped tempo, note velocity, approximate melody/accompaniment balance and basic pedalling. It is not a pianist's recording or the one correct interpretation. True multi-velocity sample layers and reliable expression assessment remain future work.

## Listen: green / red / blue note feedback

Press **Listen** to grant microphone access, then **Play** to advance the score. The learner should play on the real keyboard as the notes reach the hit line.

- **Green:** a distinct, stable note detected at the correct pitch within the timing window.
- **Red:** a distinct, stable detected pitch that does not correspond to an expected note near the playhead.
- **Blue:** an expected note whose timing window passed without a matching detected note. Missed keys remain blue until corrected or results are reset.

A summary beside Listen shows **correct / wrong / missed** counts. The app tolerates microphone-detection latency, can update a recently missed note to correct when detected late, and does not count misses while Listen is off or playback is paused. **Restart or seeking clears the grading results.** Starting Listen partway through a score only grades notes from that point onwards. Green/red highlights last briefly after key release and remain visible while the same sound is detected.

**Important limitations:** detection currently identifies one dominant pitch, not independent notes in a chord. It can incorrectly mark chord tones or fast repeated notes as missed. It is an approximate practice cue, *not* a trustworthy formal grading system. It does not reliably judge velocity, pedal or expression. Demo audio leaking into the microphone can cause false correct marks: use headphones or turn demo sound off. Microphone processing stays in the browser; only optional diagnostic events are sent to the server, not microphone recordings.

## Diagnostics

Use the **Diagnostics** button or read `piano_debug.log` for the relevant session. Include the device, tempo, mode, score note count and a short example of an incorrect colour when reporting problems.

## Deploy via the existing GitHub loader

Open the hosted `loader.php` in your browser, press **Load latest from GitHub**, then reopen `index.php`. There is no need to delete or manually upload project files. The loader installs these matched files among the other tracked project assets:

- `index.php` — SHA-256-validating runtime bootstrap.
- `index.payload.b64.gz` — original full piano trainer, including calibrated UI, falling notes and microphone capture.
- `expression-engine.b64.gz` — both-part MusicXML parser and Practice/Performance controls.
- `listener-feedback.js` — timing-aware microphone verdicts and key colouring; injected into the existing application closure, not loaded as a separate webpage.

The wrapper verifies each file before running the assembled application. If a file is missing, corrupt or incompatible, it displays an error pointing back to the loader. Protect the public-facing loader with access control or remove it when not deploying. PHP 8.1+, ZipArchive, HTTPS and a writable project folder are required.

## Next improvements

Polyphonic chord detection and repeated-note onset detection; better mic/audio-loopback isolation and end-to-end latency calibration; velocity-layer samples and authentic resonance; learner-selected phrase curves and a separate, carefully validated musical-expression assessment; MIDI import and persistent calibration/practice history.
