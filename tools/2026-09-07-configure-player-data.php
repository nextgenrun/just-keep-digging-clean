<?php
declare(strict_types=1);
// Local/remote CLI preparation only. This tool contains no network or SSH action.
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require_once dirname(__DIR__) . '/server/PlayerDataConfig.php';
require_once dirname(__DIR__) . '/server/DualCopyPlayerDataStore.php';
$options = getopt('', ['config:', 'primary:', 'mirror:', 'public-root:', 'origin:', 'local-test']);
try {
    foreach (['config', 'primary', 'mirror', 'public-root', 'origin'] as $name)
        if (empty($options[$name])) throw new RuntimeException('Required: --' . $name);
    $public = realpath($options['public-root']);
    if (!$public || !is_dir($public)) throw new RuntimeException('Public root must already exist');
    $origin = $options['origin'];
    $test = isset($options['local-test']);
    if (!preg_match($test ? '~^http://127[.]0[.]0[.]1:[0-9]+$~D' : '~^https://(?:www[.])?nextgen[.]run$~D', $origin))
        throw new RuntimeException('Use the explicit NextGen origin or a local-test origin');
    foreach (['primary', 'mirror', 'config'] as $name) {
        $value = str_replace('\\', '/', $options[$name]);
        if (!preg_match('~^(?:[A-Za-z]:/|/)~', $value) || str_contains($value, '/../'))
            throw new RuntimeException('Storage paths must be absolute and contain no parent traversal');
        if (UnderstarData\inside($value, $public)) throw new RuntimeException('Storage and config must stay outside the public root');
    }
    if (is_file($options['config'])) throw new RuntimeException('Configuration already exists; it will not be replaced');
    UnderstarData\ensureDirectory($options['primary']); UnderstarData\ensureDirectory($options['mirror']);
    UnderstarData\ensureDirectory(dirname($options['config']));
    $primary = realpath($options['primary']); $mirror = realpath($options['mirror']);
    if (UnderstarData\inside($primary, $mirror) || UnderstarData\inside($mirror, $primary)
        || UnderstarData\inside($primary, $public) || UnderstarData\inside($mirror, $public)
        || UnderstarData\inside(realpath(dirname($options['config'])), $public))
        throw new RuntimeException('Stores must be distinct and private');
    $config = ['primary' => $primary, 'mirror' => $mirror, 'origins' => [$origin],
        'secret' => bin2hex(random_bytes(32))];
    $bytes = "<?php\nreturn " . var_export($config, true) . ";\n";
    foreach ([$primary, $mirror] as $store) {
        if (file_exists($store . '/.config-backup.php')) throw new RuntimeException('Private config backup already exists; recover it instead of regenerating a secret');
    }
    UnderstarData\atomicWrite($primary . '/.config-backup.php', $bytes);
    UnderstarData\atomicWrite($mirror . '/.config-backup.php', $bytes);
    UnderstarData\atomicWrite($options['config'], $bytes);
    echo "Created private configuration and two stores. No secret was printed.\n";
} catch (Throwable $error) { fwrite(STDERR, $error->getMessage() . "\n"); exit(1); }
