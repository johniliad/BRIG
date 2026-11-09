<?php
declare(strict_types=1);
require_once __DIR__ . '/lib/bootstrap.php';
require_once __DIR__ . '/lib/data.php';

brig_apply_headers();
brig_require_method('GET');

$metrics = brig_metric_definitions();

$category = isset($_GET['category']) ? (string) $_GET['category'] : null;
$id = isset($_GET['id']) ? (string) $_GET['id'] : null;

if ($id !== null) {
    foreach ($metrics as $m) {
        if (($m['metric_key'] ?? '') === $id) {
            brig_respond(['ok' => true, 'metric' => $m]);
        }
    }
    brig_error('Metric not found.', 404, 'not_found');
}

if ($category !== null) {
    $metrics = array_values(array_filter($metrics, static fn($m) => ($m['category'] ?? '') === $category));
}

brig_respond(['ok' => true, 'count' => count($metrics), 'metrics' => $metrics]);
