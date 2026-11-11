<?php
declare(strict_types=1);
require_once __DIR__ . '/lib/bootstrap.php';
require_once __DIR__ . '/lib/data.php';

brig_apply_headers();
brig_require_method('GET');

$data = brig_read_data('relationships.json');
if ($data === null) {
    brig_respond(['ok' => true, 'available' => false, 'relationship_rules' => [], 'note' => 'Relationship library not exported yet.']);
}
brig_respond([
    'ok' => true,
    'available' => true,
    'library_version' => $data['library_version'] ?? null,
    'count' => count($data['relationship_rules'] ?? []),
    'relationship_rules' => $data['relationship_rules'] ?? [],
]);
