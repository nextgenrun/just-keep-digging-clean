<?php
declare(strict_types=1);
namespace UnderstarData;
final class DataError extends \RuntimeException {
    public int $status;
    public function __construct(string $message, int $status = 503) { parent::__construct($message); $this->status = $status; }
}
function inside(string $path, string $root): bool {
    $path = str_replace('\\', '/', $path); $root = rtrim(str_replace('\\', '/', $root), '/');
    if (PHP_OS_FAMILY === 'Windows') { $path = strtolower($path); $root = strtolower($root); }
    return $path === $root || str_starts_with($path, $root . '/');
}
function configuration(?string $explicit = null): array {
    $documentRoot = $_SERVER['DOCUMENT_ROOT'] ?? '';
    $public = $documentRoot !== '' ? (realpath($documentRoot) ?: null) : null;
    $path = $explicit ?: getenv('UNDERSTAR_PLAYER_DATA_CONFIG');
    if (!$path && $public) $path = dirname($public) . '/private/understar-player-data/config.php';
    $resolved = $path ? realpath($path) : false;
    if (!$resolved || ($public && inside($resolved, $public))) throw new DataError('unconfigured');
    $private = require $resolved;
    if (!is_array($private)) throw new DataError('invalid_configuration');
    $config = array_replace(require dirname(__DIR__) . '/values/playerDataServer.php', $private);
    if (!isset($config['secret'], $config['origins'], $config['primary'], $config['mirror'])
        || !is_string($config['secret']) || strlen($config['secret']) < 64
        || !is_array($config['origins']) || !$config['origins']) throw new DataError('invalid_configuration');
    foreach (['primary', 'mirror'] as $name) {
        $root = realpath($config[$name]);
        if (!$root || !is_dir($root) || !is_writable($root) || ($public && inside($root, $public)))
            throw new DataError('private_storage_required');
        $config[$name] = $root;
    }
    if (inside($config['primary'], $config['mirror']) || inside($config['mirror'], $config['primary']))
        throw new DataError('distinct_stores_required');
    return $config;
}
function uuid(mixed $value): string {
    if (!is_string($value) || !preg_match('/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/D', $value))
        throw new DataError('invalid_identifier', 400);
    return $value;
}
function owner(array $body, array $config): string {
    if (!is_string($body['ownerToken'] ?? null) || !preg_match('/^[a-f0-9]{64}$/D', $body['ownerToken']))
        throw new DataError('owner_required', 401);
    return hash_hmac('sha256', 'owner:' . $body['ownerToken'], $config['secret']);
}
function ipGroup(array $config): string {
    // Forwarded headers are deliberately ignored. Configure the web server's
    // trusted proxy handling before using REMOTE_ADDR behind a CDN.
    $address = $_SERVER['REMOTE_ADDR'] ?? '';
    if (!filter_var($address, FILTER_VALIDATE_IP)) throw new DataError('invalid_peer', 400);
    return hash_hmac('sha256', gmdate('Y-m') . ':' . $address, $config['secret']);
}
