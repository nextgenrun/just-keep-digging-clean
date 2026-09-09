<?php
declare(strict_types=1);
// Inspect or prune only collector-owned files; dry-run is the default.
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require_once dirname(__DIR__) . '/server/PlayerDataConfig.php';
$options = getopt('', ['config:', 'apply']);
try {
    $config = UnderstarData\configuration($options['config'] ?? null);
    $report = ['apply' => isset($options['apply']), 'copies' => [], 'expiredFiles' => 0];
    foreach (['primary', 'mirror'] as $name) {
        $root = $config[$name]; $groups = []; $count = 0; $bytes = 0; $candidates = [];
        foreach (['logs', 'saves'] as $kind) {
            $base = $root . '/' . $kind;
            if (!is_dir($base)) continue;
            $iterator = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($base, FilesystemIterator::SKIP_DOTS));
            foreach ($iterator as $file) {
                if (!$file->isFile() || $file->isLink() || $file->getExtension() !== 'json') continue;
                $path = $file->getRealPath();
                if (!$path || !UnderstarData\inside($path, $root)) throw new RuntimeException('Unsafe storage path');
                $count++; $bytes += $file->getSize();
                $retention = ($kind === 'logs' ? $config['eventRetentionDays'] : $config['saveRetentionDays']) * 86400;
                if (time() - $file->getMTime() > $retention) $candidates[$path] = true;
                if ($kind === 'saves') $groups[dirname($path)][] = ['path' => $path, 'time' => $file->getMTime()];
            }
        }
        foreach ($groups as $entries) {
            usort($entries, fn($a, $b) => $b['time'] <=> $a['time']);
            foreach (array_slice($entries, $config['saveVersionsPerSlot']) as $entry) $candidates[$entry['path']] = true;
        }
        foreach (glob($root . '/.quota-*.json') ?: [] as $path)
            if (!is_link($path) && time() - filemtime($path) > 2 * 86400) $candidates[$path] = true;
        foreach (array_keys($candidates) as $path) {
            if ($report['apply'] && !unlink($path)) throw new RuntimeException('Could not remove expired collector file');
            $report['expiredFiles']++;
        }
        $report['copies'][$name] = ['files' => $count, 'bytes' => $bytes];
    }
    echo json_encode($report, JSON_PRETTY_PRINT | JSON_THROW_ON_ERROR) . "\n";
} catch (Throwable $error) { fwrite(STDERR, $error->getMessage() . "\n"); exit(1); }
