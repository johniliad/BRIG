<?php
declare(strict_types=1);

$bucket = 'atomic-test-' . bin2hex(random_bytes(8));
$limit = 10;
$processes = [];
for ($i = 0; $i < 40; $i++) {
    $command = escapeshellarg(PHP_BINARY) . ' ' . escapeshellarg(__DIR__ . '/rate-counter-worker.php') . ' ' . escapeshellarg($bucket) . ' ' . $limit;
    $pipes = [];
    $proc = proc_open($command, [['pipe', 'r'], ['pipe', 'w'], ['pipe', 'w']], $pipes);
    if (!is_resource($proc)) throw new RuntimeException('Could not start worker.');
    fclose($pipes[0]);
    $processes[] = [$proc, $pipes];
}
$allowed = 0;
foreach ($processes as [$proc, $pipes]) {
    $allowed += (int) trim((string) stream_get_contents($pipes[1]));
    fclose($pipes[1]);
    fclose($pipes[2]);
    proc_close($proc);
}
if ($allowed !== $limit) {
    fwrite(STDERR, "FAIL — expected {$limit} allowed concurrent requests, got {$allowed}\n");
    exit(1);
}
echo "OK — atomic counter admitted exactly {$allowed} concurrent requests\n";