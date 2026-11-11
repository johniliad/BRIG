<?php
declare(strict_types=1);
require_once __DIR__ . '/lib/bootstrap.php';
require_once __DIR__ . '/lib/data.php';

// NOTE: do not call brig_apply_headers() here — it reads config and would throw
// before we can report the problem. Set the safe headers manually instead.
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: no-referrer');
header('X-Frame-Options: DENY');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

$configLoaded = false;
$configError = null;
$cfg = null;
try {
    $cfg = brig_config();
    $configLoaded = true;
} catch (\Throwable $e) {
    // Includes BrigConfigException (syntax error / non-array config file).
    $configError = $e->getMessage();
}

$configPath = brig_resolve_config_path();
$db = null;
if ($configLoaded) {
    $db = brig_db();
}

$providersWithKeys = 0;
$providerDiagnostics = [];
$keyPrefixes = ['gemini' => 'AIza', 'groq' => 'gsk_', 'openrouter' => 'sk-or-'];
if ($configLoaded && is_array($cfg['providers'] ?? null)) {
    foreach ($cfg['providers'] as $key => $p) {
        $hasKey = (string) ($p['api_key'] ?? '') !== '';
        if ($hasKey) {
            $providersWithKeys++;
        }
        $shapeOk = null;
        if ($hasKey && isset($keyPrefixes[$key])) {
            $k = (string) $p['api_key'];
            $shapeOk = strncmp($k, $keyPrefixes[$key], strlen($keyPrefixes[$key])) === 0;
        }
        $providerDiagnostics[] = [
            'provider_key' => (string) $key,
            'has_key' => $hasKey,
            'key_shape_ok' => $shapeOk, // null = no strict prefix rule (e.g. cohere)
        ];
    }
}

brig_respond([
    'ok' => true,
    'application' => 'CISO Board Reporting Intelligence Generator',
    'time' => gmdate('c'),
    'php' => PHP_VERSION,
    // Diagnostics (no secrets): whether the private config loaded, and why not.
    'config_present' => $configPath !== null,
    'config_loaded' => $configLoaded,
    'config_source' => brig_config_source(),
    'config_error' => $configError,
    'db_configured' => $configLoaded && !empty($cfg['db']['dsn'] ?? null),
    'db_connected' => $db !== null,
    'providers_with_keys' => $providersWithKeys,
    'providers' => $providerDiagnostics,
    'metric_library_present' => is_file(brig_data_path('metric-library.json')),
]);

