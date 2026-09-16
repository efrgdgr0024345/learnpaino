<?php
/**
 * LearnPiano GitHub Loader / Updater
 * Pulls the latest main branch from efrgdgr0024345/learnpaino.
 * PHP 8.1+, ZipArchive, outbound HTTPS required.
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

function ensureDir(string $dir): void {
    if (is_dir($dir)) return;
    if (!mkdir($dir, 0755, true) && !is_dir($dir)) {
        throw new RuntimeException("Could not create directory: {$dir}");
    }
}

function deleteTree(string $path): void {
    if (!file_exists($path)) return;
    if (is_file($path) || is_link($path)) { @unlink($path); return; }
    foreach (scandir($path) ?: [] as $item) {
        if ($item === '.' || $item === '..') continue;
        deleteTree($path . DIRECTORY_SEPARATOR . $item);
    }
    @rmdir($path);
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
        || $relative === '.htaccess'
        || $relative === '.user.ini'
        || $relative === 'php.ini'
        || $relative === 'error_log'
        || $relative === 'piano_debug.log'
        || $relative === 'piano_debug.previous.log'
        || $relative === 'demo.musicxml'
        || str_starts_with($relative, '.git/')
        || str_starts_with($relative, '.well-known/')
        || str_starts_with($relative, '_deploy_backups/')
        || str_starts_with($relative, '_loader_tmp/');
}

function httpGetMemory(string $url, string $accept = '*/*'): string {
    $headers = [
        'User-Agent: LearnPiano-Loader/1.2',
        'Accept: ' . $accept,
        'Cache-Control: no-cache',
        'Pragma: no-cache',
    ];

    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        if ($ch === false) throw new RuntimeException('Could not initialise cURL.');
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_MAXREDIRS => 8,
            CURLOPT_CONNECTTIMEOUT => 15,
            CURLOPT_TIMEOUT => 90,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_SSL_VERIFYHOST => 2,
            CURLOPT_ENCODING => '',
            CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
        ]);
        $body = curl_exec($ch);
        $status = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
        $type = (string)curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
        $error = curl_error($ch);
        curl_close($ch);

        if ($body === false) {
            throw new RuntimeException('GitHub download failed' . ($error ? ': ' . $error : '.'));
        }
        if ($status < 200 || $status >= 300) {
            throw new RuntimeException("GitHub request failed (HTTP {$status}).");
        }
        if ($body === '') {
            throw new RuntimeException("GitHub returned an empty response (HTTP {$status}" . ($type ? ", {$type}" : '') . ').');
        }
        out('GitHub response: HTTP ' . $status . ', ' . number_format(strlen($body)) . ' bytes' . ($type ? ', ' . $type : '') . '.');
        return $body;
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
            'follow_location' => 1,
            'max_redirects' => 8,
        ],
        'ssl' => [
            'verify_peer' => true,
            'verify_peer_name' => true,
        ],
    ]);
    $body = @file_get_contents($url, false, $context);
    if ($body === false || $body === '') {
        throw new RuntimeException('Could not download data from GitHub.');
    }
    out('GitHub response: ' . number_format(strlen($body)) . ' bytes.');
    return $body;
}

function remoteCommit(): array {
    $url = 'https://api.github.com/repos/' . GH_OWNER . '/' . GH_REPO . '/commits/' . rawurlencode(GH_BRANCH) . '?_=' . time();
    $json = httpGetMemory($url, 'application/vnd.github+json');
    $data = json_decode($json, true, 512, JSON_THROW_ON_ERROR);
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

        // Important: download into memory first. Some shared-hosting cURL builds
        // report HTTP 200 but write zero bytes when CURLOPT_FILE is used.
        $zipBytes = httpGetMemory($zipUrl, 'application/zip, application/octet-stream, */*');
        $byteCount = strlen($zipBytes);
        if ($byteCount < 4 || substr($zipBytes, 0, 2) !== 'PK') {
            $prefix = strtoupper(bin2hex(substr($zipBytes, 0, 12)));
            throw new RuntimeException('GitHub response was not a ZIP archive. First bytes: ' . ($prefix ?: 'none'));
        }
        if (file_put_contents($zipFile, $zipBytes, LOCK_EX) !== $byteCount) {
            throw new RuntimeException('Could not save the downloaded repository ZIP to disk.');
        }
        unset($zipBytes);
        out('Saved repository ZIP: ' . number_format($byteCount) . ' bytes.');

        $zip = new ZipArchive();
        $open = $zip->open($zipFile, ZipArchive::RDONLY);
        if ($open !== true) {
            throw new RuntimeException('Could not open downloaded repository ZIP. ZipArchive error code: ' . (string)$open);
        }

        for ($i = 0; $i < $zip->numFiles; $i++) {
            $name = $zip->getNameIndex($i);
            if ($name !== false) safeRelative($name);
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

        // Build an exact manifest of the files/directories controlled by GitHub.
        // The manifest is stored in .loader-state.json so future deployments can
        // safely remove files that used to come from GitHub but were later deleted
        // from the repository, without deleting unrelated server-only files.
        $managedFiles = [];
        $managedDirs = [];
        $scan = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($sourceRoot, FilesystemIterator::SKIP_DOTS),
            RecursiveIteratorIterator::SELF_FIRST
        );
        foreach ($scan as $item) {
            $source = $item->getPathname();
            $relative = safeRelative(substr($source, strlen($sourceRoot) + 1));
            if ($relative === '' || shouldPreserve($relative)) continue;
            if ($item->isDir()) $managedDirs[$relative] = true;
            else $managedFiles[$relative] = true;
        }

        $previousState = readState($root);
        $oldManagedFiles = is_array($previousState['managed_files'] ?? null) ? $previousState['managed_files'] : [];
        $oldManagedDirs = is_array($previousState['managed_dirs'] ?? null) ? $previousState['managed_dirs'] : [];
        $removed = 0;

        // Remove only files that an earlier loader deployment recorded as
        // GitHub-managed and which no longer exist in the current repository.
        foreach ($oldManagedFiles as $relative) {
            $relative = safeRelative((string)$relative);
            if ($relative === '' || shouldPreserve($relative) || isset($managedFiles[$relative])) continue;
            $target = $root . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $relative);
            if (is_file($target) || is_link($target)) {
                if (!@unlink($target)) throw new RuntimeException("Could not remove obsolete file {$relative}");
                $removed++;
                out('Removed obsolete: ' . $relative, 'remove');
            }
        }

        // Remove old GitHub-managed directories only when they are now empty.
        // Any unrelated server-only content inside them therefore remains safe.
        usort($oldManagedDirs, fn($a, $b) => strlen((string)$b) <=> strlen((string)$a));
        foreach ($oldManagedDirs as $relative) {
            $relative = safeRelative((string)$relative);
            if ($relative === '' || shouldPreserve($relative) || isset($managedDirs[$relative])) continue;
            $target = $root . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $relative);
            if (is_dir($target)) @rmdir($target);
        }

        $files = 0;
        $dirs = 0;
        $bytesCopied = 0;
        $iterator = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($sourceRoot, FilesystemIterator::SKIP_DOTS),
            RecursiveIteratorIterator::SELF_FIRST
        );

        foreach ($iterator as $item) {
            $source = $item->getPathname();
            $relative = safeRelative(substr($source, strlen($sourceRoot) + 1));
            if ($relative === '' || shouldPreserve($relative)) continue;
            $target = $root . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $relative);

            if ($item->isDir()) {
                // GitHub changed this path from a file to a directory.
                if (is_file($target) || is_link($target)) {
                    if (!@unlink($target)) throw new RuntimeException("Could not replace file with directory {$relative}");
                    out('Removed obsolete file type: ' . $relative, 'remove');
                }
                ensureDir($target);
                $dirs++;
                continue;
            }

            ensureDir(dirname($target));
            // GitHub changed this path from a directory to a file. Only remove
            // the directory if it is empty; otherwise stop instead of destroying
            // unknown server-only content.
            if (is_dir($target)) {
                if (!@rmdir($target)) {
                    throw new RuntimeException("Cannot replace directory with file {$relative} because the server directory is not empty. Remove/move its server-only contents first.");
                }
                out('Removed obsolete directory type: ' . $relative, 'remove');
            }

            $tmpTarget = $target . '.loader-new-' . bin2hex(random_bytes(3));
            if (!copy($source, $tmpTarget)) {
                @unlink($tmpTarget);
                throw new RuntimeException("Could not copy {$relative}");
            }
            @chmod($tmpTarget, 0644);
            if ((is_file($target) || is_link($target)) && !@unlink($target)) {
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

        $managedFileList = array_keys($managedFiles);
        $managedDirList = array_keys($managedDirs);
        sort($managedFileList, SORT_STRING);
        sort($managedDirList, SORT_STRING);

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
            'files_removed' => $removed,
            'managed_files' => $managedFileList,
            'managed_dirs' => $managedDirList,
        ]);

        return ['files' => $files, 'dirs' => $dirs, 'bytes' => $bytesCopied, 'removed' => $removed];
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
        out('Deployment complete: ' . $result['files'] . ' files updated, ' . $result['removed'] . ' obsolete files removed.', 'ok');
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
:root{color-scheme:dark;--bg:#071019;--panel:#0d1823;--line:#203447;--text:#eaf5ff;--muted:#91a7ba;--good:#57e389;--warn:#ffb347;--bad:#ff6b6b}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:15px/1.5 system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif}.wrap{max-width:980px;margin:40px auto;padding:0 18px}.card{background:var(--panel);border:1px solid var(--line);border-radius:15px;padding:20px;margin:14px 0}h1{margin:.1em 0}.muted{color:var(--muted)}.status{font-size:1.2rem;font-weight:800}.good{color:var(--good)}.warn{color:var(--warn)}.bad{color:var(--bad)}code{background:#07131d;border:1px solid var(--line);padding:2px 6px;border-radius:5px}.row{display:flex;gap:12px;align-items:center;flex-wrap:wrap}.row>div{flex:1;min-width:240px}.btn{display:inline-block;border:0;border-radius:10px;padding:12px 17px;background:#0c6381;color:white;font-weight:800;cursor:pointer}.btn:hover{background:#0e789b}.log{background:#040a0f;border:1px solid var(--line);border-radius:10px;padding:12px;max-height:430px;overflow:auto;font:12px/1.55 ui-monospace,SFMono-Regular,Consolas,monospace}.line.file{color:#afd9ff}.line.remove{color:#ffc37c}.line.ok{color:var(--good)}.line.error{color:var(--bad)}.sha{font-family:ui-monospace,monospace}.tiny{font-size:.86rem}.notice{border-left:4px solid var(--warn);padding-left:12px}</style>
</head>
<body><div class="wrap">
<h1>LearnPiano GitHub Loader</h1>
<p class="muted">Synchronises this server with <code><?=h(GH_OWNER . '/' . GH_REPO)?></code> / <code><?=h(GH_BRANCH)?></code>.</p>
<div class="card">
<?php if ($error): ?><div class="status bad">Loader error</div><p><?=h($error)?></p>
<?php elseif ($upToDate): ?><div class="status good">✓ Server is on the latest GitHub version</div>
<?php else: ?><div class="status warn">Update available / server version not yet recorded</div><?php endif; ?>
<div class="row">
<div><b>GitHub:</b><br><span class="sha"><?=h($remote ? substr($remote['sha'],0,12) : 'unknown')?></span><br><span class="tiny muted"><?=h($remote['message'] ?? '')?></span></div>
<div><b>Server:</b><br><span class="sha"><?=h(!empty($state['sha']) ? substr((string)$state['sha'],0,12) : 'not recorded')?></span><br><span class="tiny muted"><?=h($state['deployed_at'] ?? '')?></span></div>
</div></div>
<div class="card"><h2>Load newest version</h2><p>Downloads the complete GitHub snapshot, creates/replaces project files, and removes files that a previous loader deployment installed but which have since been deleted from GitHub. Unmanaged server-only files and protected runtime/config files are kept.</p><form method="post"><input type="hidden" name="action" value="update"><button class="btn" type="submit">↻ Load latest from GitHub</button></form></div>
<div class="card"><h2>Deployment log</h2><div class="log"><?php foreach ($log as $entry): ?><div class="line <?=h($entry['type'])?>">[<?=h($entry['time'])?>] <?=h($entry['message'])?></div><?php endforeach; ?></div></div>
<div class="card notice"><b>Security note:</b> this repository is public, so this loader contains no GitHub token. Protect or remove <code>loader.php</code> when you no longer need web-triggered deployments.</div>
</div></body></html>
