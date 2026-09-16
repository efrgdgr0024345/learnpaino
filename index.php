<?php
declare(strict_types=1);

/**
 * LearnPiano bootstrap. GitHub's loader installs the three matched files:
 * index.php, index.payload.b64.gz and expression-engine.b64.gz.
 * The existing trainer is never replaced by a stripped-down interface.
 */
const LEARNPIANO_PAYLOAD_SHA256 = '55eed3fad2c62996330e75e80e737387044dead9479a982d8001c872eb7d8ed4';
const LEARNPIANO_EXPRESSION_SHA256 = 'a1a77920d6b63b732bc94598404226d4d819570664283a6142b4d56ad0180f94';

$root = __DIR__;
$payloadFile = $root . '/index.payload.b64.gz';
$expressionFile = $root . '/expression-engine.b64.gz';
$runtimeFile = $root . '/.learnpiano-runtime.php';

function pianoBootFail(string $message): never {
    http_response_code(500);
    header('Content-Type: text/plain; charset=utf-8');
    header('Cache-Control: no-store');
    exit('LearnPiano startup error: ' . $message . "\nOpen loader.php and select Load latest from GitHub.\n");
}

function pianoDecodeVerified(string $path, string $expectedHash, string $label): string {
    if (!is_file($path) || !is_readable($path)) {
        pianoBootFail($label . ' file is missing or unreadable.');
    }
    $encoded = file_get_contents($path);
    if (!is_string($encoded) || $encoded === '') {
        pianoBootFail($label . ' is empty.');
    }
    $encoded = preg_replace('/\s+/', '', $encoded);
    $compressed = is_string($encoded) ? base64_decode($encoded, true) : false;
    $decoded = is_string($compressed) ? @gzdecode($compressed) : false;
    if (!is_string($decoded) || !hash_equals($expectedHash, hash('sha256', $decoded))) {
        pianoBootFail($label . ' failed its SHA-256 integrity check.');
    }
    return $decoded;
}

$source = pianoDecodeVerified($payloadFile, LEARNPIANO_PAYLOAD_SHA256, 'Trainer payload');
$expression = pianoDecodeVerified($expressionFile, LEARNPIANO_EXPRESSION_SHA256, 'Expression engine');

// Inject inside the existing application closure. It reuses the current controls,
// audio graph, falling notes, microphone listener and calibration rather than
// launching a second app or running a separate unconnected browser script.
$anchor = 'fit();loadDemo();d(';
if (substr_count($source, $anchor) !== 1) {
    pianoBootFail('The trainer boot anchor has changed; the expression engine was not injected.');
}
$source = str_replace($anchor, $expression . "\n" . $anchor, $source);
$runtimeHash = hash('sha256', $source);
$needsWrite = !is_file($runtimeFile) || @hash_file('sha256', $runtimeFile) !== $runtimeHash;
if ($needsWrite) {
    $temporary = $runtimeFile . '.new-' . bin2hex(random_bytes(6));
    if (@file_put_contents($temporary, $source, LOCK_EX) !== strlen($source)) {
        @unlink($temporary);
        pianoBootFail('Could not write the expression-enabled runtime. Check folder permissions.');
    }
    @chmod($temporary, 0644);
    // Linux rename is atomic and replaces the previous runtime without leaving
    // a gap where concurrent requests could find the application missing.
    if (!@rename($temporary, $runtimeFile)) {
        @unlink($temporary);
        pianoBootFail('Could not activate the expression-enabled runtime.');
    }
}

require $runtimeFile;
