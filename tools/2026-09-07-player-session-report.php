<?php
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require_once dirname(__DIR__) . '/server/PlayerDataConfig.php';
$options = getopt('', ['config:']);
try {
    $config = UnderstarData\configuration($options['config'] ?? null); $sessions = []; $mismatches = 0;
    foreach (glob($config['primary'] . '/logs/*/*.json') ?: [] as $path) {
        if (is_link($path)) continue;
        $record = json_decode((string)file_get_contents($path), true, 128, JSON_THROW_ON_ERROR);
        $data = $record['data']; $id = $data['session'];
        $relative = substr($path, strlen($config['primary']) + 1); $mirror = $config['mirror'] . '/' . $relative;
        if (!is_file($mirror) || !hash_equals(hash_file('sha256', $path), hash_file('sha256', $mirror))) $mismatches++;
        $session = $sessions[$id] ?? ['session' => $id, 'player' => $data['player'], 'ipGroup' => $record['ipGroup'],
            'build' => $data['build'], 'eventCount' => 0, 'dropped' => 0, 'totalsMs' => [], 'counts' => [], 'lastElapsedMs' => 0];
        foreach ($data['events'] as $event) {
            $session['eventCount']++; $type = $event['type'];
            $session['counts'][$type] = ($session['counts'][$type] ?? 0) + 1;
            $session['lastElapsedMs'] = max($session['lastElapsedMs'], $event['elapsedMs']);
            foreach ($event['detail']['totals'] ?? [] as $key => $value)
                $session['totalsMs'][$key] = max($session['totalsMs'][$key] ?? 0, $value);
        }
        $session['dropped'] = max($session['dropped'], $data['dropped'] ?? 0); $sessions[$id] = $session;
    }
    echo json_encode(['copyMismatches' => $mismatches, 'sessions' => array_values($sessions)],
        JSON_PRETTY_PRINT | JSON_THROW_ON_ERROR) . "\n";
    if ($mismatches) exit(2);
} catch (Throwable $error) { fwrite(STDERR, $error->getMessage() . "\n"); exit(1); }
