# LearnPiano — calibrated falling-note piano trainer

A browser piano lesson with movable and resizable keyboard alignment, falling notes, sampled audio, a microphone note listener, and Practice/Performance playback.

## Song menu and tempo

The page now opens with an **11-piece Song menu**: the existing full Moonlight Sonata movement plus ten additional public-domain piano works/arrangements. Changing the song stops playback, loads the selected MusicXML, resets the lesson, and preserves the chosen playback mode.

The visible playback choices are:

- **Exact notes · steady pulse** — follows every pitch and duration in the selected MusicXML with a steady practice pulse.
- **Soulful · performance interpretation** — uses the same score while adding the existing illustrative phrasing, dynamics, timing shape, balance and pedal behaviour.

Moonlight remains the default at **quarter note = 52 BPM**, an adjustable practice suggestion rather than a numerical metronome marking claimed to be Beethoven's. Each menu entry also has a gentle suggested starting tempo that remains adjustable.

### Score-source honesty

Moonlight is a full score. The four Joplin entries are full arrangements in the pinned source library. Several other famous classical menu entries are **reduced public-domain teaching arrangements** from the source library rather than the complete original piano texture. The UI labels these as “Melody arrangement”, and exact mode means exact to that loaded arrangement — it does not pretend that a reduced arrangement is the composer's complete original score.

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

**Important limitations:** the listener now combines dominant-pitch detection with score-aware spectral checks for several expected chord tones. This improves chord feedback but is still approximate and can miss chord tones or rapid repeated notes. It is an approximate practice cue, *not* a trustworthy formal grading system. It does not reliably judge velocity, pedal or expression. Demo audio leaking into the microphone can cause false correct marks: use headphones or turn demo sound off. Microphone processing stays in the browser; only optional diagnostic events are sent to the server, not microphone recordings.

## Diagnostics

Use the **Diagnostics** button or read `piano_debug.log` for the relevant session. Include the device, tempo, mode, score note count and a short example of an incorrect colour when reporting problems.

## Deploy via the existing GitHub loader

Open the hosted `loader.php` in your browser, press **Load latest from GitHub**, then reopen `index.php`. There is no need to delete or manually upload project files. The loader installs these matched files among the other tracked project assets:

- `index.php` — SHA-256-validating runtime bootstrap.
- `index.payload.b64.gz` — original full piano trainer, including calibrated UI, falling notes and microphone capture.
- `expression-engine.b64.gz` — both-part MusicXML parser and exact/soulful playback engine.
- `song-library.js` — verified song selector and pinned public-domain MusicXML sources.
- `listener-feedback.js` — timing-aware microphone verdicts, score-aware chord checks and key colouring; injected into the existing application closure, not loaded as a separate webpage.
- `audio-isolation.js` — acoustic echo-cancellation microphone setup and fullscreen keyboard calibration.

The wrapper verifies each file before running the assembled application. If a file is missing, corrupt or incompatible, it displays an error pointing back to the loader. Protect the public-facing loader with access control or remove it when not deploying. PHP 8.1+, ZipArchive, HTTPS and a writable project folder are required.

## Next improvements

Polyphonic chord detection and repeated-note onset detection; better mic/audio-loopback isolation and end-to-end latency calibration; velocity-layer samples and authentic resonance; learner-selected phrase curves and a separate, carefully validated musical-expression assessment; MIDI import and persistent calibration/practice history.
