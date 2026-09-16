# LearnPiano — calibrated falling-note piano trainer

A browser-based piano lesson prototype combining falling notes, a resizable keyboard that can be aligned with a real piano, sampled audio, and a local microphone note listener.

## Current default lesson: Beethoven's Moonlight Sonata

The default is **Piano Sonata No. 14, Op. 27 No. 2, movement I (Adagio sostenuto)**. Its full MusicXML is fetched and cached as `moonlight_sonata_mvt1.musicxml`, independently of any obsolete `demo.musicxml` on the server. The pinned score source and commit are documented in `moonlight-source.txt`.

**Tempo:** the starting position is **quarter note = 52 BPM**, a suggested practice value, **not a numerical tempo claimed to have been specified by Beethoven**. The control is adjustable. The source is in 2/2; the BPM label intentionally names quarter-note units. Where an imported MusicXML file supplies a numerical tempo, the parser reads it. Our expressive playback is an interpretation, not a recording of a pianist or a definitive reading of Beethoven's intentions.

## Core features

- Falling notes reach corresponding keys on an onscreen piano, with different colours for the two MusicXML parts.
- Drag the trainer to reposition it. Resize from all four edges and corners to line up with a physical keyboard.
- Full-size mode preserves the calibrated width, horizontal position and keyboard height rather than stretching keys.
- Small screens attempt landscape orientation, with a CSS fallback.
- 61-key, 88-key and score-range layouts; timeline, lead-time and tempo controls.
- Import `.musicxml` and `.xml` files.
- Sampled piano notes with an oscillator fallback if a sample is not yet available. The expressive engine adds velocity-aware volume and a modest attack-brightness filter; **true multisampled velocity layers are not yet implemented**.
- Tap an onscreen key to audition it.

## Practice versus Performance

The playback selector is next to the tempo control.

**Practice · exact pulse:** straight, notated note timing and even volume, intended for learning pitches and rhythmic structure. This is deliberately machine-steady.

**Performance · interpretation:** a clearly labelled *illustrative* interpretation that uses a continuous phrase-shaped tempo curve (not random timing jitter), parses written dynamics where encoded, separates a candidate melody from accompaniment using score voice information and limited heuristics, and models held notes through score pedal instructions or illustrative measure-by-measure changes. A realtime cue shows approximate instantaneous quarter-note BPM and the pedal convention. Students should hear differences and learn to make their own musical decisions, not imitate a generated performance uncritically.

The updated parser handles **all MusicXML piano parts**, including the two parts in the default Moonlight file. It handles chords, multiple voices, ties, dynamics and simple pedal directions. It is not a complete MusicXML notation engine: sophisticated rubato, all articulations, historic pedal technique and complete engraving are outside this prototype.

## Microphone listener

Tap **Listen** and play a single real note. The blue key indicates the detected pitch; a matching lesson note highlights green. The browser performs local monophonic pitch detection without uploading microphone recordings. Sensitivity, confidence and A4 tuning are adjustable. It cannot yet reliably analyse simultaneous chords, key velocity, pedal use or musical-expression quality. Therefore it does **not** award an expression grade.

## Diagnostics

Use **Diagnostics** to copy a report, or inspect the server's `piano_debug.log`. For feedback about a slow/missing note or mobile audio, record the displayed tempo, chosen mode, device and score note count in the report.

## Deploy using loader.php

1. Keep the repository as the source of truth for project code.
2. Open your deployed `loader.php` in the browser and select **Load latest from GitHub**.
3. The loader installs `index.php`, `index.payload.b64.gz`, `expression-engine.b64.gz` and other tracked project files. It also removes previously GitHub-managed files that have been deleted upstream while protecting server-only data.
4. Open `index.php`, confirm the default Moonlight score loads, select Practice or Performance, and test playback. **You do not need to delete old project files first.**

The small `index.php` verifies SHA-256 digests of the original trainer payload and expression engine, assembles them inside the same existing application closure, and writes `.learnpiano-runtime.php`. A missing or corrupt file causes a visible boot error directing you back to the loader rather than silently loading an older version. PHP 8.1+, ZipArchive, HTTPS and a writable project folder are required. Protect the web-facing loader with directory authentication or remove it when deployment is finished.

## Roadmap and limitations

- Add real multi-velocity piano sample layers and improved sympathetic resonance.
- Offer optional learner-controlled phrase curves and accurate score pedal maps, including modern versus historical pedal explanations.
- Improve microphone polyphony, repeated-note detection, timing alignment and onset detection before implementing separate accuracy/expression feedback.
- Restore complete Standard MIDI import and persist calibration and practice history.

This is educational software; a score is an important source of truth for pitches and durations, but an AI-generated performance is **one example of interpretation**, not an absolute musical standard.
