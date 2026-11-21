<?php
declare(strict_types=1);

$command = escapeshellarg(PHP_BINARY) . ' ' . escapeshellarg(__DIR__ . '/request-limit-worker.php');
$output = [];
$status = 0;
exec($command, $output, $status);
$body = implode("\n", $output);
if (!str_contains($body, 'request_too_large')) {
    fwrite(STDERR, "FAIL — oversized declared request was not rejected: {$body}\n");
    exit(1);
}
echo "OK — application request-size limit rejects oversized bodies\n";