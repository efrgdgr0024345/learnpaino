<?php
declare(strict_types=1);

/**
 * LearnPiano bootstrap: GitHub loader installs matched runtime components.
 */
const LEARNPIANO_LIBRARY_ENGINE_SHA256 = '9c3ff78ad88b6cba4b7cd5cac748a9b982c5c6c19cb3e6f6b4828b42aa64072b';
const LEARNPIANO_PAYLOAD_SHA256 = 'd55a8a4d2dd32b5cf384e18e9a9061df264ae5c497628d87cd5041bc799eab89';
const LEARNPIANO_EXPRESSION_SHA256 = 'a1a77920d6b63b732bc94598404226d4d819570664283a6142b4d56ad0180f94';
const LEARNPIANO_SONG_LIBRARY_SHA256 = '22aa63aa7eff289732455de73405fa7f1a3ced483cdd6ddc1f90de2055dafeed';
const LEARNPIANO_FEEDBACK_SHA256 = '8d1830a21dc3b30b7eedf084f96b7cd1f08327dbaa8fdb69f0784e6631ed7533';
const LEARNPIANO_COACH_SHA256 = '5d25e9671e2bb747cc14053fd019b8fb2b04c0237dc449461f5c67beeb037fe5';
const LEARNPIANO_ISOLATION_SHA256 = 'ea3be0ce82094dc3398177326af51fc59d8af7ba73a4c443b51c7f08f79e0709';

$root = __DIR__;
$payloadFile = $root . '/index.payload.b64.gz';
$expressionFile = $root . '/expression-engine.b64.gz';
$songLibraryFile = $root . '/song-library.js';
$feedbackFile = $root . '/listener-feedback.js';
$isolationFile = $root . '/audio-isolation.js';
$runtimeFile = $root . '/.learnpiano-runtime.php';

function pianoBootFail(string $message): never {
    http_response_code(500);
    header('Content-Type: text/plain; charset=utf-8');
    header('Cache-Control: no-store');
    exit('LearnPiano startup error: ' . $message . "\nOpen loader.php and select Load latest from GitHub.\n");
}

function pianoDecodeVerified(string $path, string $expectedHash, string $label): string {
    if (!is_file($path) || !is_readable($path)) pianoBootFail($label . ' file is missing or unreadable.');
    $encoded = file_get_contents($path);
    if (!is_string($encoded) || $encoded === '') pianoBootFail($label . ' is empty.');
    $encoded = preg_replace('/\s+/', '', $encoded);
    $compressed = is_string($encoded) ? base64_decode($encoded, true) : false;
    $decoded = is_string($compressed) ? @gzdecode($compressed) : false;
    if (!is_string($decoded) || !hash_equals($expectedHash, hash('sha256', $decoded))) pianoBootFail($label . ' failed its SHA-256 integrity check.');
    return $decoded;
}
function pianoReadVerified(string $path, string $expectedHash, string $label): string {
    if (!is_file($path) || !is_readable($path)) pianoBootFail($label . ' file is missing or unreadable.');
    $text=file_get_contents($path);
    if (!is_string($text) || !hash_equals($expectedHash, hash('sha256',$text))) pianoBootFail($label . ' failed its SHA-256 integrity check.');
    return $text;
}

$source = pianoDecodeVerified($payloadFile, LEARNPIANO_PAYLOAD_SHA256, 'Trainer payload');
$expression = pianoDecodeVerified($expressionFile, LEARNPIANO_EXPRESSION_SHA256, 'Expression engine');
$songLibrary = pianoReadVerified($songLibraryFile, LEARNPIANO_SONG_LIBRARY_SHA256, 'Song library');
$feedback = pianoReadVerified($feedbackFile, LEARNPIANO_FEEDBACK_SHA256, 'Listener feedback');
$isolation = pianoReadVerified($isolationFile, LEARNPIANO_ISOLATION_SHA256, 'Audio isolation/fullscreen calibration');

$coach = pianoReadVerified($root . '/coach.js', LEARNPIANO_COACH_SHA256, 'Optional coach interface');

$libraryEngine = pianoReadVerified($root . '/library-engine.js', LEARNPIANO_LIBRARY_ENGINE_SHA256, 'Library import engine');
$anchor = 'fit();loadDemo();d('; 
if (substr_count($source, $anchor) !== 1) pianoBootFail('The trainer boot anchor has changed; extensions were not injected.');
$source = str_replace(
    $anchor,
    $expression . "\n" . $songLibrary . "\n" . $feedback . "\n" . $isolation . "\n" . $coach . "\n" . $libraryEngine . "\n" . $anchor,
    $source
);
$runtimeHash = hash('sha256', $source);
$needsWrite = !is_file($runtimeFile) || @hash_file('sha256', $runtimeFile) !== $runtimeHash;
if ($needsWrite) {
    $temporary = $runtimeFile . '.new-' . bin2hex(random_bytes(6));
    if (@file_put_contents($temporary, $source, LOCK_EX) !== strlen($source)) {
        @unlink($temporary);pianoBootFail('Could not write the assembled runtime. Check folder permissions.');
    }
    @chmod($temporary, 0644);
    if (!@rename($temporary, $runtimeFile)) {
        @unlink($temporary);pianoBootFail('Could not activate the assembled runtime.');
    }
}
require $runtimeFile;
