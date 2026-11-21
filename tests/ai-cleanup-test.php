<?php
declare(strict_types=1);

$root = sys_get_temp_dir() . '/brig-ai-cleanup-' . bin2hex(random_bytes(6));
$config = $root . '/config.php';
@mkdir($root, 0700, true);
file_put_contents($config, '<?php return ' . var_export(['ai' => ['token_store_path' => $root, 'cleanup_scan_limit' => 100]], true) . ';');
putenv('BRIG_CONFIG_PATH=' . $config);
require_once __DIR__ . '/../api/lib/ai_access.php';
$dir = brig_ai_store_dir();
$active = brig_ai_allowed_hashes()[0];
$retired = str_repeat('a', 64);
file_put_contents($dir . '/sessions/expired.json', json_encode(['expires' => time() - 60]));
file_put_contents($dir . '/sessions/live.json', json_encode(['expires' => time() + 3600]));
file_put_contents($dir . '/used/' . $active, '1');
file_put_contents($dir . '/used/' . $retired, '1');
$result = brig_ai_cleanup(0);
$ok = !is_file($dir . '/sessions/expired.json') && is_file($dir . '/sessions/live.json')
    && is_file($dir . '/used/' . $active) && !is_file($dir . '/used/' . $retired);
if (!$ok || $result['sessions'] !== 1 || $result['used'] !== 1) {
    fwrite(STDERR, 'FAIL — cleanup result ' . json_encode($result) . "\n");
    exit(1);
}
echo "OK — cleanup removes expired sessions and retired markers without re-enabling active tokens\n";