<?php
/**
 * LearnPiano GitHub Loader / Updater
 *
 * Pulls the latest `main` branch snapshot from:
 *   https://github.com/efrgdgr0024345/learnpaino
 *
 * No GitHub token is required while the repository is public.
 * Requires PHP 8.1+, ZipArchive, and outbound HTTPS access.
 */

declare(strict_types=1);

@set_time_limit(120);
header('Content-Type: text/html; charset=UTF-8');
header('X-Content-Type-Options: nosniff');

const GH_OWNER = 'efrgdgr0024345';
const GH_REPO = 'learnpaino';
const GH_BRANCH = 'main';
const STATE_FILE = '.loader-state.json';
const LOCAL_CONFIG = '.loader-local.php';

$root = __DIR__;
$log = [];

function out(string $message, string $type = 'info'): void {
    global $log;
    $log[] = ['time' => date('H:i:s'), 'type' => $type, 'message' => $message];
}

function h(string $value): string {
    return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function httpGet(string $url, ?string $dest = null): string|bool {
    $headers = [
        'User-Agent: LearnPiano-Loader/1.0',
        'Accept: application/vnd.github+json',
        'Cache-Control: no-cache',
    ];

    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        if ($ch === false) {
            throw new RuntimeException('Could not initialise cURL.');
        }
        curl_setopt_array($ch, [
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_CONNECTTIMEOUT => 15,
            CURLOPT_TIMEOUT => 90,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_SSL_VERIFYHOST => 2,
        ]);

        $fp = null;
        if ($dest !== null) {
            $fp = fopen($dest, 'wb');
            if (!$fp) {
                curl_close($ch);
                throw new RuntimeException('Could not create temporary download file.');
            }
            curl_setopt($ch, CURLOPT_FILE, $fp);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, false);
        } else {
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        }

        $result = curl_exec($ch);
        $status = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
        $error = curl_error($ch);
        curl_close($ch);
        if (is_resource($fp)) fclose($fp);

        if ($result === false || $status < 200 || $status >= 300) {
            throw new RuntimeException("GitHub request failed (HTTP {$status})" . ($error ? ": {$error}" : '.'));
        }
        return $dest !== null ? true : (string)$result;
    }

    if (!ini_get('allow_url_fopen')) {
        throw new RuntimeException('Neither cURL nor allow_url_fopen is available for HTTPS downloads.');
    }

    $context = stream_context_create([
        'http' => [
            'method' => 'GET',
            'timeout' => 90,
            'header' => implode("\r\n", $headers),
            'ignore_errors' => false,
        ],
        'ssl' => [
            'verify_peer' => true,
            'verify_peer_name' => true,
        ],
    ]);

    if ($dest !== null) {
        $in = @fopen($url, 'rb', false, $context);
        if (!$in) throw new RuntimeException('Could not open GitHub download stream.');
        $out = @fopen($dest, 'wb');
        if (!$out) { fclose($in); throw new RuntimeException('Could not create temporary download file.'); }
        stream_copy_to_stream($in, $out);
        fclose($in);
        fclose($out);
        return true;
    }

    $data = @file_get_contents($url, false, $context);
    if ($data === false) throw new RuntimeException('Could not download from GitHub.');
    return $data;
}

function remoteCommit(): array {
    $url = 'https://api.github.com/repos/' . GH_OWNER . '/' . GH_REPO . '/commits/' . rawurlencode(GH_BRANCH) . '?_=' . time();
    $json = httpGet($url);
    $data = json_decode((string)$json, true, 512, JSON_THROW_ON_ERROR);
    if (empty($data['sha'])) throw new RuntimeException('GitHub did not return the current commit SHA.');
    return [
        'sha' => (string)$data['sha'],
        'message' => (string)($data['commit']['message'] ?? ''),
        'date' => (string)($data['commit']['committer']['date'] ?? ''),
    ];
}

function readState(string $root): array {
    $file = $root . DIRECTORY_SEPARATOR . STATE_FILE;
    if (!is_file($file)) return [];
    $data = json_decode((string)@file_get_contents($file), true);
    return is_array($data) ? $data : [];
}

function saveState(string $root, array $state): void {
    $json = json_encode($state, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    if ($json === false || file_put_contents($root . DIRECTORY_SEPARATOR . STATE_FILE, $json, LOCK_EX) === false) {
        throw new RuntimeException('Could not write deployment state file.');
    }
}

function deleteTree(string $path): void {
    if (!file_exists($path)) return;
    if (is_link($path) || is_file($path)) { @unlink($path); return; }
    $items = scandir($path);
    if ($items !== false) {
        foreach ($items as $item) {
            if ($item === '.' || $item === '..') continue;
            deleteTree($path . DIRECTORY_SEPARATOR . $item);
        }
    }
    @rmdir($path);
}

function ensureDir(string $dir): void {
    if (is_dir($dir)) return;
    if (!mkdir($dir, 0755, true) && !is_dir($dir)) {
        throw new RuntimeException("Could not create directory: {$dir}");
    }
}

function safeRelative(string $path): string {
    $path = str_replace('\\', '/', $path);
    $parts = [];
    foreach (explode('/', $path) as $part) {
        if ($part === '' || $part === '.') continue;
        if ($part === '..') throw new RuntimeException('Unsafe archive path detected.');
        $parts[] = $part;
    }
    return implode('/', $parts);
}

function shouldPreserve(string $relative): bool {
    $relative = ltrim(str_replace('\\', '/', $relative), '/');
    return $relative === STATE_FILE
        || $relative === LOCAL_CONFIG
        || str_starts_with($relative, '.git/')
        || str_starts_with($relative, '_deploy_backups/')
        || str_starts_with($relative, '_loader_tmp/');
}

function deployLatest(string $root, array $remote): array {
    if (!class_exists('ZipArchive')) {
        throw new RuntimeException('PHP ZipArchive is not enabled. Enable the PHP zip extension in cPanel first.');
    }

    $tmpBase = $root . DIRECTORY_SEPARATOR . '_loader_tmp';
    ensureDir($tmpBase);
    $runDir = $tmpBase . DIRECTORY_SEPARATOR . 'run-' . bin2hex(random_bytes(5));
    ensureDir($runDir);
    $zipFile = $runDir . DIRECTORY_SEPARATOR . 'repo.zip';
    $extractDir = $runDir . DIRECTORY_SEPARATOR . 'extract';
    ensureDir($extractDir);

    try {
        $zipUrl = 'https://codeload.github.com/' . GH_OWNER . '/' . GH_REPO . '/zip/refs/heads/' . rawurlencode(GH_BRANCH) . '?_=' . time();
        out('Downloading the newest GitHub main-branch snapshot…');
        httpGet($zipUrl, $zipFile);
        $bytes = filesize($zipFile) ?: 0;
        out('Downloaded ' . number_format($bytes) . ' bytes.');

        $zip = new ZipArchive();
        $open = $zip->open($zipFile);
        if ($open !== true) throw new RuntimeException('Could not open downloaded repository ZIP.');

        for ($i = 0; $i < $zip->numFiles; $i++) {
            $name = $zip->getNameIndex($i);
            if ($name === false) continue;
            safeRelative($name);
        }
        if (!$zip->extractTo($extractDir)) {
            $zip->close();
            throw new RuntimeException('Could not extract repository ZIP.');
        }
        $zip->close();

        $top = array_values(array_filter(scandir($extractDir) ?: [], fn($x) => $x !== '.' && $x !== '..'));
        if (count($top) !== 1 || !is_dir($extractDir . DIRECTORY_SEPARATOR . $top[0])) {
            throw new RuntimeException('Unexpected GitHub archive layout.');
        }
        $sourceRoot = $extractDir . DIRECTORY_SEPARATOR . $top[0];

        $files = 0;
        $dirs = 0;
        $bytesCopied = 0;
        $iterator = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($sourceRoot, FilesystemIterator::SKIP_DOTS),
            RecursiveIteratorIterator::SELF_FIRST
        );

        foreach ($iterator as $item) {
            $source = $item->getPathname();
            $relative = substr($source, strlen($sourceRoot) + 1);
            $relative = safeRelative($relative);
            if ($relative === '' || shouldPreserve($relative)) continue;
            $target = $root . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $relative);

            if ($item->isDir()) {
                ensureDir($target);
                $dirs++;
                continue;
            }

            ensureDir(dirname($target));
            $tmpTarget = $target . '.loader-new-' . bin2hex(random_bytes(3));
            if (!copy($source, $tmpTarget)) {
                @unlink($tmpTarget);
                throw new RuntimeException("Could not copy {$relative}");
            }
            @chmod($tmpTarget, 0644);
            if (is_file($target) && !@unlink($target)) {
                @unlink($tmpTarget);
                throw new RuntimeException("Could not replace existing file {$relative}");
            }
            if (!@rename($tmpTarget, $target)) {
                @unlink($tmpTarget);
                throw new RuntimeException("Could not activate new file {$relative}");
            }
            $files++;
            $bytesCopied += $item->getSize();
            out('Updated: ' . $relative, 'file');
        }

        saveState($root, [
            'repository' => GH_OWNER . '/' . GH_REPO,
            'branch' => GH_BRANCH,
            'sha' => $remote['sha'],
            'short_sha' => substr($remote['sha'], 0, 12),
            'commit_message' => $remote['message'],
            'commit_date' => $remote['date'],
            'deployed_at' => date(DATE_ATOM),
            'files_copied' => $files,
            'directories_seen' => $dirs,
        ]);

        return ['files' => $files, 'dirs' => $dirs, 'bytes' => $bytesCopied];
    } finally {
        deleteTree($runDir);
    }
}

$state = readState($root);
$remote = null;
$error = null;
$result = null;
$action = $_POST['action'] ?? $_GET['action'] ?? '';

try {
    $remote = remoteCommit();
    out('GitHub main is at ' . substr($remote['sha'], 0, 12) . '.');
    if (!empty($state['sha'])) {
        out('This server last deployed ' . substr((string)$state['sha'], 0, 12) . '.');
    } else {
        out('No previous loader deployment state found.');
    }

    if ($action === 'update') {
        $result = deployLatest($root, $remote);
        $state = readState($root);
        out('Deployment complete: ' . $result['files'] . ' files updated.', 'ok');
    }
} catch (Throwable $e) {
    $error = $e->getMessage();
    out($error, 'error');
}

$upToDate = $remote && !empty($state['sha']) && hash_equals((string)$remote['sha'], (string)$state['sha']);
?><!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>LearnPiano GitHub Loader</title>
<style>
:root{color-scheme:dark;--bg:#071019;--panel:#0d1823;--line:#203447;--text:#eaf5ff;--muted:#91a7ba;--good:#57e389;--warn:#ffb347;--blue:#29d6ff;--bad:#ff6b6b}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:15px/1.5 system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif}.wrap{max-width:980px;margin:40px auto;padding:0 18px}.card{background:var(--panel);border:1px solid var(--line);border-radius:15px;padding:20px;margin:14px 0}h1{margin:.1em 0}.muted{color:var(--muted)}.status{font-size:1.2rem;font-weight:800}.good{color:var(--good)}.warn{color:var(--warn)}.bad{color:var(--bad)}code{background:#07131d;border:1px solid var(--line);padding:2px 6px;border-radius:5px}.row{display:flex;gap:12px;align-items:center;flex-wrap:wrap}.row>div{flex:1;min-width:240px}.btn{display:inline-block;border:0;border-radius:10px;padding:12px 17px;background:#0c6381;color:white;font-weight:800;cursor:pointer}.btn:hover{background:#0e789b}.log{background:#040a0f;border:1px solid var(--line);border-radius:10px;padding:12px;max-height:430px;overflow:auto;font:12px/1.55 ui-monospace,SFMono-Regular,Consolas,monospace}.line.file{color:#afd9ff}.line.ok{color:var(--good)}.line.error{color:var(--bad)}.sha{font-family:ui-monospace,monospace}.tiny{font-size:.86rem}.notice{border-left:4px solid var(--warn);padding-left:12px}</style>
</head>
<body><div class="wrap">
<h1>LearnPiano GitHub Loader</h1>
<p class="muted">Synchronises this server with the current <code><?=h(GH_BRANCH)?></code> branch of <code><?=h(GH_OWNER . '/' . GH_REPO)?></code>.</p>

<div class="card">
<?php if ($error): ?>
<div class="status bad">Loader error</div><p><?=h($error)?></p>
<?php elseif ($upToDate): ?>
<div class="status good">✓ Server is on the latest GitHub version</div>
<?php else: ?>
<div class="status warn">Update available / server version not yet recorded</div>
<?php endif; ?>
<div class="row">
<div><b>GitHub:</b><br><span class="sha"><?=h($remote ? substr($remote['sha'],0,12) : 'unknown')?></span><br><span class="tiny muted"><?=h($remote['message'] ?? '')?></span></div>
<div><b>Server:</b><br><span class="sha"><?=h(!empty($state['sha']) ? substr((string)$state['sha'],0,12) : 'not recorded')?></span><br><span class="tiny muted"><?=h($state['deployed_at'] ?? '')?></span></div>
</div>
</div>

<div class="card">
<h2>Load newest version</h2>
<p>This downloads a fresh snapshot directly from GitHub, creates any missing folders, and replaces matching files with the current repository versions.</p>
<form method="post"><input type="hidden" name="action" value="update"><button class="btn" type="submit">↻ Load latest from GitHub</button></form>
<p class="tiny muted">Existing server-only files are deliberately not deleted. <code><?=h(STATE_FILE)?></code>, <code><?=h(LOCAL_CONFIG)?></code>, Git metadata and loader temporary data are preserved.</p>
</div>

<div class="card">
<h2>Deployment log</h2><div class="log"><?php foreach ($log as $entry): ?><div class="line <?=h($entry['type'])?>">[<?=h($entry['time'])?>] <?=h($entry['message'])?></div><?php endforeach; ?></div>
</div>

<div class="card notice">
<b>Security note:</b> this repository is public, so the loader does not need or contain a GitHub token. Anyone who can reach this page could trigger a refresh of the same public code. For a production site, protect <code>loader.php</code> with cPanel directory protection, rename/remove it after deployment, or add your own authentication.
</div>
</div></body></html>
