<?php
declare(strict_types=1);
require_once dirname(__DIR__) . '/server/PlayerDataConfig.php';
require_once dirname(__DIR__) . '/server/PlayerDataValidation.php';
require_once dirname(__DIR__) . '/server/DualCopyPlayerDataStore.php';
function check(bool $ok, string $message): void { if (!$ok) throw new RuntimeException($message); }
$base = __DIR__ . '/artifacts/player-data-2026-09-07/contract-' . bin2hex(random_bytes(6));
UnderstarData\ensureDirectory($base . '/one'); UnderstarData\ensureDirectory($base . '/two');
$config = array_replace(require dirname(__DIR__) . '/values/playerDataServer.php',
    ['primary' => $base . '/one', 'mirror' => $base . '/two', 'secret' => str_repeat('a', 64)]);
$_SERVER['REMOTE_ADDR'] = '127.0.0.1';
$ip = UnderstarData\ipGroup($config);
$id = '12345678-1234-4234-9234-123456789abc'; $session = '22345678-1234-4234-9234-123456789abc';
$body = ['schema' => 1, 'kind' => 'events', 'id' => $id, 'session' => $session,
    'player' => '32345678-1234-4234-9234-123456789abc', 'createdAt' => round(microtime(true) * 1000),
    'build' => 'test', 'events' => [['seq' => 1, 'elapsedMs' => 0, 'type' => 'page_open',
        'scene' => 'page', 'phase' => 'loading', 'detail' => []]]];
$validated = UnderstarData\validate($body, $config); $digest = hash('sha256', json_encode($body));
$first = UnderstarData\storeTwice($config, $validated, $digest, $ip);
check($first['copies'] === 2, 'two copies required');
$a = $config['primary'] . '/' . $validated['path']; $b = $config['mirror'] . '/' . $validated['path'];
check(hash_file('sha256', $a) === hash_file('sha256', $b), 'copies differ');
check(!str_contains(file_get_contents($a), '127.0.0.1'), 'raw IP leaked');
$again = UnderstarData\storeTwice($config, $validated, $digest, $ip);
check($first === $again, 'retry changed stored bytes');
unlink($b); UnderstarData\storeTwice($config, $validated, $digest, $ip);
check(is_file($b) && hash_file('sha256', $a) === hash_file('sha256', $b), 'missing mirror not repaired');
try { UnderstarData\storeTwice($config, $validated, hash('sha256', 'different'), $ip); throw new RuntimeException('conflict accepted'); }
catch (UnderstarData\DataError $e) { check($e->status === 409, 'wrong conflict status'); }
$bad = $body; $bad['session'] = '../../escape';
try { UnderstarData\validate($bad, $config); throw new RuntimeException('traversal accepted'); }
catch (UnderstarData\DataError $e) { check($e->status === 400, 'wrong traversal status'); }
$bad = $body; $bad['events'][0]['detail'] = ['password' => 'secret'];
try { UnderstarData\validate($bad, $config); throw new RuntimeException('private field accepted'); }
catch (UnderstarData\DataError $e) { check($e->status === 400, 'wrong private field status'); }
$full = $config; $full['minimumFreeBytes'] = PHP_INT_MAX;
try { UnderstarData\storeTwice($full, $validated, $digest, $ip); throw new RuntimeException('full disk accepted'); }
catch (UnderstarData\DataError $e) { check($e->status === 503, 'wrong disk failure status'); }
$token = str_repeat('b', 64);
$save = ['schema' => 1, 'kind' => 'save', 'id' => '42345678-1234-4234-9234-123456789abc',
    'player' => $body['player'], 'createdAt' => $body['createdAt'], 'ownerToken' => $token, 'slot' => 1,
    'portableJson' => '{"format":"understar-save","formatVersion":1,"slotId":1,"payloadChecksum":"test","saveData":{"version":15,"world":{},"resources":{},"number":1e-7}}'];
$v = UnderstarData\validate($save, $config);
UnderstarData\storeTwice($config, $v, hash('sha256', json_encode($save)), $ip);
$restored = UnderstarData\readBackup($config, ['ownerToken' => $token, 'backupId' => $save['id'], 'slot' => 1]);
check($restored['portableJson'] === $save['portableJson'], 'save bytes changed');
check(!str_contains(file_get_contents($config['primary'] . '/' . $v['path']), $token), 'owner secret persisted in server record');
try {
    UnderstarData\readBackup($config, ['ownerToken' => str_repeat('c', 64), 'backupId' => $save['id'], 'slot' => 1]);
    throw new RuntimeException('another owner read save');
} catch (UnderstarData\DataError $e) { check($e->status === 404, 'wrong owner isolation status'); }
echo "PLAYER_DATA_SERVER_CONTRACT_OK\n";
