<?php
declare(strict_types=1);
require_once __DIR__ . '/../lib/bootstrap.php';

brig_apply_headers();
brig_require_method('POST');

// Challenge the Story is deterministic and computed in the browser. This endpoint
// is reserved for future server-side counter-analysis and returns a safe note.
brig_respond([
    'ok' => true,
    'mode' => 'deterministic',
    'note' => 'Challenge the Story is computed deterministically in the client from the report model; no external AI is required.',
]);
