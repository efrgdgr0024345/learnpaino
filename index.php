<?php
declare(strict_types=1);

/**
 * LearnPiano bootstrap: GitHub loader installs matched runtime components.
 */
const LEARNPIANO_PAYLOAD_SHA256 = '55eed3fad2c62996330e75e80e737387044dead9479a982d8001c872eb7d8ed4';
const LEARNPIANO_EXPRESSION_SHA256 = 'a1a77920d6b63b732bc94598404226d4d819570664283a6142b4d56ad0180f94';
const LEARNPIANO_FEEDBACK_SHA256 = '8d1830a21dc3b30b7eedf084f96b7cd1f08327dbaa8fdb69f0784e6631ed7533';
const LEARNPIANO_ISOLATION_SHA256 = 'ae6409c392eac9b92add44faceaf517a87ea6721869b8b15ff7a388e4390d050';

$root = __DIR__;
$payloadFile = $root . '/index.payload.b64.gz';
$expressionFile = $root . '/expression-engine.b64.gz';
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
$feedback = pianoReadVerified($feedbackFile, LEARNPIANO_FEEDBACK_SHA256, 'Listener feedback');
$isolation = pianoReadVerified($isolationFile, LEARNPIANO_ISOLATION_SHA256, 'Audio isolation/fullscreen calibration');

$anchor = 'fit();loadDemo();d(';
if (substr_count($source, $anchor) !== 1) pianoBootFail('The trainer boot anchor has changed; extensions were not injected.');
$source = str_replace($anchor, $expression . "\n" . $feedback . "\n" . $isolation . "\n" . $anchor, $source);
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
