<?php
declare(strict_types=1);

/**
 * Operator utility: clear the file-based rate-limit counters used by the public
 * AI usage governor (R13). Run from the command line on the host:
 *
 *     php api/tools/reset_ratelimit.php
 *
 * Use this to clear a "Session AI regeneration limit reached" / hourly block
 * immediately, e.g. after testing. CLI-only: over HTTP it returns 403 and does
 * nothing.
 */

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit("This utility is CLI-only.\n");
}

require_once __DIR__ . '/../lib/ratelimit.php';

$dir = brig_storage_dir();
$files = glob($dir . '/*.json') ?: [];
$cleared = 0;
foreach ($files as $file) {
    if (@unlink($file)) {
        $cleared++;
    }
}
fwrite(STDOUT, "Cleared {$cleared} rate-limit counter file(s) from {$dir}\n");
