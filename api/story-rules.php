<?php
declare(strict_types=1);
require_once __DIR__ . '/lib/bootstrap.php';
require_once __DIR__ . '/lib/data.php';

brig_apply_headers();
brig_require_method('GET');

$data = brig_read_data('story-rules.json');
if ($data === null) {
    brig_respond(['ok' => true, 'available' => false, 'story_rules' => [], 'note' => 'Story-rule library not exported yet.']);
}
brig_respond([
    'ok' => true,
    'available' => true,
    'library_version' => $data['library_version'] ?? null,
    'count' => count($data['story_rules'] ?? []),
    'story_rules' => $data['story_rules'] ?? [],
]);
