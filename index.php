<?php
declare(strict_types=1);

const LEARNPIANO_PAYLOAD_SHA256 = '55eed3fad2c62996330e75e80e737387044dead9479a982d8001c872eb7d8ed4';
$payloadFile = __DIR__ . '/index.payload.b64.gz';
$runtimeFile = __DIR__ . '/.learnpiano-runtime.php';

if (!is_file($payloadFile)) {
    http_response_code(500);
    exit('LearnPiano payload is missing. Run loader.php to restore the project.');
}
$encoded = preg_replace('/\s+/', '', (string)file_get_contents($payloadFile));
$compressed = base64_decode($encoded, true);
$source = $compressed === false ? false : gzdecode($compressed);
if (!is_string($source) || hash('sha256', $source) !== LEARNPIANO_PAYLOAD_SHA256) {
    http_response_code(500);
    exit('LearnPiano payload failed integrity validation. Run loader.php again.');
}

$needsWrite = !is_file($runtimeFile) || @hash_file('sha256', $runtimeFile) !== LEARNPIANO_PAYLOAD_SHA256;
if ($needsWrite) {
    $tmp = $runtimeFile . '.new-' . bin2hex(random_bytes(4));
    if (@file_put_contents($tmp, $source, LOCK_EX) !== strlen($source)) {
        @unlink($tmp);
        http_response_code(500);
        exit('LearnPiano could not create its runtime file. Check folder write permissions.');
    }
    @chmod($tmp, 0644);
    if (is_file($runtimeFile) && !@unlink($runtimeFile)) {
        @unlink($tmp);
        http_response_code(500);
        exit('LearnPiano could not replace its runtime file.');
    }
    if (!@rename($tmp, $runtimeFile)) {
        @unlink($tmp);
        http_response_code(500);
        exit('LearnPiano could not activate its runtime file.');
    }
}

require $runtimeFile;
