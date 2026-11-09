<?php
declare(strict_types=1);
require_once __DIR__ . '/lib/bootstrap.php';

brig_apply_headers();
brig_require_method('POST');

$body = brig_read_json_input();
$observations = $body['observations'] ?? null;

// The deterministic analysis runs in the browser for responsiveness and privacy.
// This endpoint returns the shared methodology metadata and validates that a
// payload was supplied, so it can evolve into a server-side engine without
// changing the client contract.
$metricCount = is_array($observations) ? count($observations) : 0;

brig_respond([
    'ok' => true,
    'mode' => 'client_side_deterministic',
    'methodology_version' => '1.0.0',
    'metric_library_version' => '1.0.0',
    'received_metrics' => $metricCount,
    'note' => 'Deterministic analysis is performed in the browser. This endpoint anchors shared methodology and is reserved for future server-side analysis.',
]);
