# Live Note Listener — Technical Notes

## Goal

Listen to a real piano through the device microphone, estimate the dominant fundamental pitch, convert it to a piano/MIDI note, and light the corresponding on-screen key in a colour that is distinct from the lesson target.

## Signal path

```text
Real piano
   ↓
Device microphone
   ↓
getUserMedia()
   ↓
Web Audio MediaStreamSource
   ↓
AnalyserNode waveform buffer
   ↓
Downsample by 4
   ↓
YIN-style periodicity detection
   ↓
Estimated frequency (Hz)
   ↓
Nearest MIDI note + cents offset
   ↓
Short temporal stabiliser
   ↓
Blue live-input key on the 88-key keyboard
```

## Frequency to MIDI

With A4 reference `A` (normally 440 Hz):

```text
midi_float = 69 + 12 * log2(frequency / A)
midi_note  = round(midi_float)
```

The tuning offset is shown in cents relative to the nearest equal-tempered note:

```text
cents = 1200 * log2(measured_frequency / nearest_note_frequency)
```

## Why use a YIN-style detector?

A piano note is not a clean sine wave. It has a fundamental plus many harmonics. Looking only for the loudest frequency bin can therefore identify a harmonic instead of the played note. YIN estimates waveform periodicity and is a useful lightweight starting point for monophonic pitch detection in a browser.

The implementation uses a large input window and then downsamples it. This is intentional: low piano notes have long periods. A0 at 27.5 Hz takes about 36 ms for one cycle, so a detector needs a meaningfully longer window than it needs for middle or upper piano notes.

## Stabilisation

One pitch estimate is not trusted immediately. The app keeps several recent note estimates and requires a repeated/mode result before moving the live highlight. This reduces flicker caused by:

- the noisy attack of a struck piano note;
- room reflections;
- strong harmonics;
- background noise;
- microphone automatic processing.

Where supported, microphone constraints request echo cancellation, noise suppression and automatic gain control to be disabled so the detector receives a less altered signal. Browsers/devices may still choose their own processing.

## Colours

- Orange — target/lesson note.
- Blue — microphone-detected real note.
- Green — target and microphone note are the same.

These states are represented by independent CSS classes so future scoring can use the same state model.

## Privacy

The current implementation does not POST, stream or save microphone audio. `getUserMedia()` feeds the Web Audio graph in the current browser tab and analysis is performed in JavaScript.

This claim applies to the code in this repository. If analytics, logging services or remote audio features are added later, the privacy statement must be reviewed.

## Known failure modes

### Octave error

A piano's second harmonic can be strong enough that a detector temporarily reports a note one octave above the played fundamental.

Possible improvements:

- harmonic-consistency checks;
- subharmonic candidate scoring;
- note-onset-aware analysis;
- instrument-specific priors.

### Very low notes

Low notes require longer observation windows and can therefore have higher latency. They are also more affected by room response and microphone low-frequency roll-off.

### Chords

The current pitch detector assumes one dominant fundamental. If C-E-G is played together, there is no guarantee that it will report C, E or G consistently.

Polyphonic recognition should be treated as a separate feature rather than forcing this monophonic detector to guess.

## Proposed next version: polyphonic piano transcription

A stronger listener could operate on a spectrogram and estimate multiple simultaneous note activations plus note onsets/offsets.

Possible architecture:

```text
Microphone
  ↓
STFT / mel or constant-Q spectrogram
  ↓
Piano note activation model
  ↓
88 simultaneous note probabilities
  ↓
Onset + sustain tracking
  ↓
Keyboard highlights + timing score
```

For a browser-first application, options include:

1. A hand-built harmonic template / non-negative matrix approach.
2. A small TensorFlow.js / ONNX Runtime Web piano transcription model.
3. Optional server inference for devices too slow for local polyphonic analysis.

The project should keep monophonic mode available because it is cheap, private, and useful for beginner single-note practice.

## Testing checklist

Test at minimum:

- iPhone Safari;
- Android Chrome;
- Windows Chrome/Edge;
- laptop built-in microphone;
- phone microphone;
- acoustic piano;
- digital piano speakers;
- A0, C2, middle C, A4, C6, C8;
- repeated notes;
- pedal on/off;
- quiet and noisy rooms.

For each test record:

- true played note;
- detected note;
- confidence;
- latency to stable detection;
- octave-error count;
- false-positive count during silence.
