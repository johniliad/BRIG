<?php
declare(strict_types=1);
require_once __DIR__ . '/../lib/bootstrap.php';
require_once __DIR__ . '/../lib/providers.php';

brig_apply_headers();
brig_require_method('GET');

// Public-safe provider metadata only. Never exposes API keys or secret endpoints.
brig_respond([
    'ok' => true,
    'providers' => brig_providers_public(),
    'diagnostics' => brig_ai_diagnostics(),
]);
