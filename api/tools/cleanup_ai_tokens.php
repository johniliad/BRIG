<?php
declare(strict_types=1);

/**
 * CLI-only maintenance utility. Removes every expired/malformed AI session and
 * used-token markers belonging to token batches no longer in the allow-list.
 * Active-batch used markers are retained so one-time tokens cannot be reused.
 *
 * Usage: php api/tools/cleanup_ai_tokens.php
 */
if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit("This utility is CLI-only.\n");
}

require_once __DIR__ . '/../lib/ai_access.php';

$result = brig_ai_cleanup(0);
$dir = brig_ai_store_dir();
fwrite(
    STDOUT,
    "AI token-store cleanup complete: {$result['sessions']} expired session(s), "
    . "{$result['used']} retired marker(s) removed from {$dir}\n"
);