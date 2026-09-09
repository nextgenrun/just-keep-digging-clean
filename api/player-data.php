<?php
declare(strict_types=1);
require_once dirname(__DIR__) . '/server/PlayerDataConfig.php';
require_once dirname(__DIR__) . '/server/PlayerDataValidation.php';
require_once dirname(__DIR__) . '/server/DualCopyPlayerDataStore.php';
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, private');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: no-referrer');
ini_set('display_errors', '0');
try {
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') throw new UnderstarData\DataError('post_required', 405);
    $config = UnderstarData\configuration();
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if (!in_array($origin, $config['origins'], true)
        || !in_array($_SERVER['HTTP_SEC_FETCH_SITE'] ?? 'same-origin', ['same-origin', 'none'], true))
        throw new UnderstarData\DataError('origin_rejected', 403);
    if (strtolower(explode(';', $_SERVER['CONTENT_TYPE'] ?? '')[0]) !== 'application/json')
        throw new UnderstarData\DataError('json_required', 415);
    $length = (int)($_SERVER['CONTENT_LENGTH'] ?? 0);
    if ($length > $config['maxSaveBytes']) throw new UnderstarData\DataError('body_too_large', 413);
    $raw = file_get_contents('php://input', false, null, 0, $config['maxSaveBytes'] + 1);
    if ($raw === false || strlen($raw) === 0 || strlen($raw) > $config['maxSaveBytes'] || ($length > 0 && strlen($raw) !== $length))
        throw new UnderstarData\DataError('incomplete_body', 400);
    $length = strlen($raw);
    $body = json_decode($raw, true, 128, JSON_THROW_ON_ERROR);
    if (!is_array($body)) throw new UnderstarData\DataError('invalid_body', 400);
    if (($body['kind'] ?? '') === 'backup_list') $result = UnderstarData\listBackups($config, $body);
    elseif (($body['kind'] ?? '') === 'backup_read') $result = UnderstarData\readBackup($config, $body);
    else {
        if (($body['kind'] ?? '') === 'events' && $length > $config['maxEventBytes'])
            throw new UnderstarData\DataError('body_too_large', 413);
        $result = UnderstarData\storeTwice($config, UnderstarData\validate($body, $config), hash('sha256', $raw), UnderstarData\ipGroup($config));
    }
    echo json_encode($result, JSON_THROW_ON_ERROR);
} catch (UnderstarData\DataError $error) {
    http_response_code($error->status);
    echo json_encode(['ok' => false, 'error' => $error->getMessage()]);
} catch (JsonException $error) {
    http_response_code(400); echo '{"ok":false,"error":"invalid_json"}';
} catch (Throwable $error) {
    http_response_code(503); echo '{"ok":false,"error":"storage_unavailable"}';
}
