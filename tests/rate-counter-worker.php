<?php
declare(strict_types=1);
require_once __DIR__ . '/../api/lib/ratelimit.php';
echo brig_counter_hit((string) ($argv[1] ?? ''), (int) ($argv[2] ?? 1), 3600) ? '1' : '0';