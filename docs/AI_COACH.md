# Optional AI piano coach — v1

The existing piano, score menu, Exact/Soulful modes, microphone feedback, resizing and fullscreen remain the main application. The optional coach is a server-side OpenAI connection. No key is embedded in JavaScript, localStorage, GitHub, public diagnostics or downloads. It is OFF until configured. Page load and opening the coach panel make no paid request.

## Activate on this cPanel host

1. Run the normal `loader.php` **Load latest from GitHub** update. Do not delete old project files.
2. In cPanel Terminal, run:

   ```bash
   cd /home/learning/easyai.com.au/piano && php tools/configure-coach.php
   ```

3. At the hidden prompts, paste a new dedicated OpenAI project API key, choose a coach password of at least 12 characters and repeat the password. **Do not paste a real key into ChatGPT or a GitHub file.** The script will not contact OpenAI. Input does not appear in the command history. It needs an interactive terminal with `stty`; if unavailable use the private file method below.
4. The secret file is saved as `/home/learning/.config/learnpiano/coach.php` (permissions 0600) and state goes in its private parent directory (0700). This path must remain outside every website document root on your account. Different hosting installations can set `LEARNPIANO_COACH_CONFIG` to an absolute private path.
5. Reopen the piano. **Ask coach → enter the coach password → Ask.** The API key is never entered into the browser coach panel. API access/billing must be enabled on your OpenAI project. A ChatGPT subscription does not configure this server key.

The hosting PHP build needs cURL, OpenSSL, sessions and Fileinfo. It should use HTTPS and writable private state storage. Do not trust arbitrary `X-Forwarded-Proto` headers; the endpoint requires HTTPS as reported by PHP or port 443. A reverse proxy must provide correct trusted HTTPS configuration. The test-only HTTP switch works only with a loopback client and is OFF by default.

### Private-file alternative / settings

Create the same private file outside every document root, set its permissions to 0600, and use:

```php
<?php
return [
    'enabled' => true,
    'api_key' => 'YOUR_KEY_ONLY_IN_THIS_PRIVATE_FILE',
    'password_hash' => 'A_PASSWORD_HASH_GENERATED_WITH_PHP_PASSWORD_HASH',
    'model' => 'gpt-4.1-mini-2025-04-14',
    'voice' => 'cedar',
    'daily_calls' => 60,
    'monthly_calls' => 600,
];
```

Use `password_hash($password, PASSWORD_DEFAULT)` to generate the password hash privately. An environment variable `LEARNPIANO_OPENAI_API_KEY` may override the file key. Do not place real credentials in this documentation. To disable AI, set `enabled` to false in the PRIVATE file. Loader updates never modify this file because it is outside the project.

## What works in this build

- Text questions: short score-aware explanations via Responses API with structured action proposals.
- **Record question**: tap to start and finish; auto-stop at 30 seconds. WebM or MP4 recording, depending on browser. Only that recording is uploaded for transcription; the transcript is shown for review before Ask.
- **Read aloud**: generates the most recent reply using `gpt-4o-mini-tts`, an AI voice instructed to use a clear British English accent. The last voice reply is cached in the authenticated PHP session. A device may require another interaction before audible playback; captions remain usable.
- **Apply suggested action**: validates range, tempo, hand availability and mode. No code execution, arbitrary URL loading, shell or repository access is exposed to the AI. Invalid or stale-score actions are rejected.
- Local passage controls (also usable without an API key): choose up to 8 bars, hear a notated hand/both hands, practise a passage and optionally repeat it. They use the existing Exact/Soulful engine, not AI-invented accompaniment.
- Five **practice templates**: listen first, right hand, left hand, join hands, expression comparison. These are not five newly certified complete song editions. The existing library still contains reduced arrangements. This build does not certify their notes, supply their missing left hands or expand to 100 songs.
- Optional feedback after a passage; OFF by default. Manual **Ask about last attempt** is available. Suggestions are NOT formal grading.
- Optional last 25 attempt summaries saved only in this browser; OFF by default. Clear history/progress removes the current PHP-session conversation and local coach progress. It does not delete the site's separate piano diagnostic log or your OpenAI provider records.

## Honest feedback and isolation

Our current microphone detection is approximate. The prompt labels it as unvalidated; the fixed UI warning explains that chord/miss counts may be recognition errors. The coach has no validated velocity, pedal, fingering, emotion or expression measurements. It is instructed not to turn counts into claims that the learner improved or played incorrectly, and not to claim it heard piano recordings. This is a guardrail, not proof that a language model can never make a mistake. Human review remains necessary.

The player pauses and the piano listener is switched off before question recording or generated speech; it stays off afterwards until the student presses Listen again. Demonstration also disables the listener so it is not credited as a correct attempt. Hand labels follow score staves/parts; hand-crossing and cross-staff writing need review. No missing accompaniment is synthesised from melody-only scores. For simultaneous chords the existing heuristic limitations remain.

Full-size mode hides the coach panel rather than changing keyboard calibration. Opening/closing the coach does not set trainer size or position.

## Limits, costs and security

- Coach password required for every paid endpoint. Secure/HttpOnly/SameSite session cookie, session rotation on login, a two-hour authentication lifetime and CSRF tokens.
- Global login throttling and file-locked paid-call reservations. Default six paid calls per minute, 60/day and 600/month per installation. Counters reset in UTC and count attempted upstream calls, including failures. New logins do not reset these limits.
- Request count and payload limits are enforced by our server. They are **not a guaranteed dollar ceiling**. Model prices can change; other applications using the same API key are not covered. Check the OpenAI project billing/usage controls too.
- Text input is bounded, model output capped at 700 tokens, uploaded recordings capped at 1 MB. The browser also caps recording at 30 seconds. The server validates the file type but does not independently measure compressed audio duration; authenticated upload abuse is bounded by size and request counts, not a certified duration cap.
- Transport fixed to `https://api.openai.com/v1/` approved endpoints, no redirects, TLS verification on. No proxy that accepts arbitrary URLs or arbitrary TTS text from the browser.
- The API key and password hash live outside the public folder. Paid requests are initiated only by Ask, recording/transcription, Read aloud or the explicitly enabled after-passage feedback option.
- Do not expose cPanel to untrusted devices. This feature cannot secure an already compromised browser, server or hosting account. Protect/remove the existing web deployment loader; the coach login does not protect that separate updater.

## Data sent and retained

Ask sends the learner's question, limited recent dialogue, current score identity, measure mapping, up to 180 note events from the selected excerpt, a practice goal and approximate detector counts. Transcribe sends the explicitly recorded question through PHP to OpenAI, not the ongoing piano stream. Speak sends only the most recent coach reply. There is no background transcription or cloud piano recording.

Responses requests use `store:false`. This is not a claim of zero provider retention. OpenAI endpoint/data controls still apply. On our server the current dialogue (up to six short messages), latest voice reply and CSRF/login state reside in a private PHP session; session files are subject to PHP garbage collection, and logout destroys the active session. Multipart question files use PHP's temporary upload mechanism and are not copied into the song library. Transport logs contain endpoint action, status, timestamp and byte count only; no key, question, transcript, raw audio or conversation. There is no persistent learner profile in the cloud in v1.

## Models and reference documentation (checked 2026-09-27)

- Responses / structured output: https://developers.openai.com/api/docs/guides/structured-outputs
- Configured text model: https://developers.openai.com/api/docs/models/gpt-4.1-mini
- Transcription: https://developers.openai.com/api/docs/guides/speech-to-text
- Speech generation/disclosure: https://developers.openai.com/api/docs/guides/text-to-speech
- Key safety: https://help.openai.com/en/articles/5112595-best-practices-for-api-key-safety
- Data controls: https://developers.openai.com/api/docs/guides/your-data

A later version can add curated full scores, reviewed lesson annotations, stronger measured performance feedback, better progress storage, a score-following accompanist and Realtime voice. None is silently claimed to be finished by adding an API key.
