<?php
declare(strict_types=1);
namespace UnderstarData;
function ensureDirectory(string $directory): void {
    if (!is_dir($directory) && !@mkdir($directory, 0700, true) && !is_dir($directory)) throw new DataError('storage_unavailable');
}
function atomicWrite(string $path, string $bytes): void {
    ensureDirectory(dirname($path));
    $temporary = dirname($path) . '/.pending-' . bin2hex(random_bytes(16));
    $handle = @fopen($temporary, 'xb');
    if (!$handle) throw new DataError('storage_unavailable');
    try {
        @chmod($temporary, 0600); $offset = 0; $length = strlen($bytes);
        while ($offset < $length) {
            $written = fwrite($handle, substr($bytes, $offset));
            if (!$written) throw new DataError('incomplete_write');
            $offset += $written;
        }
        if (!fflush($handle) || (function_exists('fsync') && !fsync($handle))) throw new DataError('flush_failed');
        fclose($handle); $handle = null;
        if (!@rename($temporary, $path)) throw new DataError('publish_failed');
    } finally {
        if (is_resource($handle)) fclose($handle);
        if (is_file($temporary)) @unlink($temporary);
    }
}
function quota(array $config, string $ip, int $bytes): void {
    $path = $config['primary'] . '/.quota-' . gmdate('Y-m-d') . '.json';
    $data = is_file($path) ? json_decode((string)file_get_contents($path), true, 32, JSON_THROW_ON_ERROR) : [];
    $minute = (int)floor(time() / 60); $peer = $data['peers'][$ip] ?? ['minute' => $minute, 'count' => 0, 'bytes' => 0];
    if ($peer['minute'] !== $minute) { $peer['minute'] = $minute; $peer['count'] = 0; }
    if ($peer['count'] >= $config['requestsPerMinute'] || $peer['bytes'] + $bytes > $config['bytesPerIpDay']
        || ($data['bytes'] ?? 0) + $bytes > $config['bytesPerDay']) throw new DataError('rate_limited', 429);
    $peer['count']++; $peer['bytes'] += $bytes; $data['peers'][$ip] = $peer;
    $data['bytes'] = ($data['bytes'] ?? 0) + $bytes;
    atomicWrite($path, json_encode($data, JSON_THROW_ON_ERROR));
}
function storeTwice(array $config, array $validated, string $digest, string $ip): array {
    $relative = $validated['path'];
    if (!preg_match('~^(logs/[a-f0-9-]+|saves/[a-f0-9]{64}/[1-6])/[a-f0-9-]+[.]json$~D', $relative))
        throw new DataError('invalid_path', 400);
    $lock = @fopen($config['primary'] . '/.store.lock', 'c');
    if (!$lock || !flock($lock, LOCK_EX | LOCK_NB)) { if ($lock) fclose($lock); throw new DataError('busy'); }
    try {
        foreach (['primary', 'mirror'] as $name) {
            $free = disk_free_space($config[$name]);
            if ($free === false || $free < $config['minimumFreeBytes']) throw new DataError('storage_full');
        }
        $paths = [$config['primary'] . '/' . $relative, $config['mirror'] . '/' . $relative];
        $canonical = null;
        foreach ($paths as $path) if (is_file($path)) {
            $stored = file_get_contents($path);
            $record = json_decode($stored, true, 128, JSON_THROW_ON_ERROR);
            if (!hash_equals($digest, $record['requestSha256'] ?? '')) throw new DataError('id_conflict', 409);
            if ($canonical !== null && !hash_equals(hash('sha256', $canonical), hash('sha256', $stored)))
                throw new DataError('copy_mismatch');
            $canonical = $stored;
        }
        $canonical ??= json_encode(['schema' => $config['schema'], 'requestSha256' => $digest,
            'receivedAt' => gmdate('c'), 'ipGroup' => $ip, 'data' => $validated['data']],
            JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        quota($config, $ip, strlen($canonical));
        foreach ($paths as $path) {
            if (!is_file($path)) atomicWrite($path, $canonical);
            if (!hash_equals(hash('sha256', $canonical), hash_file('sha256', $path))) throw new DataError('verification_failed');
        }
        return ['ok' => true, 'copies' => 2, 'id' => $validated['data']['id'], 'sha256' => hash('sha256', $canonical)];
    } finally { flock($lock, LOCK_UN); fclose($lock); }
}
function listBackups(array $config, array $body): array {
    $owner = owner($body, $config); $items = [];
    foreach (glob($config['primary'] . '/saves/' . $owner . '/*/*.json') ?: [] as $path) {
        $data = json_decode((string)file_get_contents($path), true, 128, JSON_THROW_ON_ERROR)['data'];
        $items[] = ['id' => $data['id'], 'slot' => $data['slot'], 'createdAt' => $data['createdAt'], 'sha256' => $data['portableSha256']];
    }
    usort($items, fn($a, $b) => $b['createdAt'] <=> $a['createdAt']);
    return ['ok' => true, 'backups' => $items];
}
function readBackup(array $config, array $body): array {
    $owner = owner($body, $config); $id = uuid($body['backupId'] ?? null); $slot = $body['slot'] ?? null;
    if (!is_int($slot) || $slot < 1 || $slot > $config['maxSlot']) throw new DataError('invalid_slot', 400);
    foreach (['primary', 'mirror'] as $name) {
        $path = $config[$name] . '/saves/' . $owner . '/' . $slot . '/' . $id . '.json';
        if (!is_file($path)) continue;
        $data = json_decode((string)file_get_contents($path), true, 128, JSON_THROW_ON_ERROR)['data'];
        if (!hash_equals($data['portableSha256'], hash('sha256', $data['portableJson']))) throw new DataError('invalid_backup');
        return ['ok' => true, 'portableJson' => $data['portableJson']];
    }
    throw new DataError('not_found', 404);
}
