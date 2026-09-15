# LearnPiano

A browser-based piano learning project with an 88-key on-screen keyboard, falling lesson notes, synthesized demo playback, and a **live microphone listener** that identifies a real piano note and highlights the matching key.

## What is new

The live listener uses the Web Audio API and a lightweight YIN-style pitch detector running entirely in the browser.

- **Orange key** = the lesson/demo expects this note.
- **Blue key** = this is the note currently heard through the microphone.
- **Green key** = the real note matches the lesson note.
- Shows detected note name, MIDI number, frequency, tuning offset in cents, and detector confidence.
- Sensitivity and confidence controls help with different microphones/rooms.
- A4 reference tuning can be adjusted from 430–450 Hz.
- Diagnostic log records microphone startup/errors and demo state.
- No microphone recording is uploaded by the app; analysis happens locally in the browser.

## Run it

The application is a single `index.php` file.

1. Upload the repository contents to a PHP-enabled web folder.
2. Open the site over **HTTPS**. Modern browsers require HTTPS for microphone access (except localhost).
3. Press **Listen** and allow microphone permission.
4. Play one note on a real piano.
5. The detected key will light blue on the 88-key keyboard.
6. Press **Play demo** to compare live playing against the orange target notes. A correct match becomes green.

For local development:

```bash
php -S 127.0.0.1:8000
```

Then open `http://127.0.0.1:8000`.

## How note detection works

1. Browser microphone audio is captured with `getUserMedia()`.
2. `AnalyserNode` provides a short waveform window.
3. The waveform is downsampled to reduce CPU use on phones.
4. A YIN-style periodicity detector estimates the fundamental frequency.
5. Frequency is converted to the nearest MIDI note using the selected A4 reference.
6. Several consecutive estimates are combined before a key is considered stable.
7. The stable MIDI note is mapped directly onto the on-screen 88-key keyboard.

## Important limitation

The current listener is **monophonic**. It is designed to recognise one dominant piano note at a time. Real piano tones contain strong harmonics and room reflections, so occasional octave/harmonic mistakes are possible, especially during the first attack of a note or with sustain pedal held down.

The next major step would be **polyphonic/chord transcription** using a frequency-domain or machine-learning note-onset model.

## Browser support

Best results are expected in current Chrome, Edge, Safari and mobile browsers with Web Audio + `getUserMedia()` support.

## Project structure

```text
index.php                 Main application
README.md                 Setup and project overview
docs/LIVE_NOTE_LISTENER.md Technical explanation and roadmap
```

## Roadmap

- Improve bass-note stability and octave-error correction.
- Add note-onset detection so repeated notes are recognised cleanly.
- Add polyphonic/chord recognition.
- Score timing and pitch accuracy against lesson notes.
- Import MusicXML/MIDI for full pieces.
- Add calibration profiles for acoustic piano, digital piano, phone and laptop microphones.
- Persist practice statistics locally.
- Add server-side optional diagnostic-log export without recording microphone audio.
