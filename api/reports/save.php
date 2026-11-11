<?php
declare(strict_types=1);
require_once __DIR__ . '/../lib/bootstrap.php';
require_once __DIR__ . '/../lib/data.php';
require_once __DIR__ . '/../lib/ratelimit.php';

brig_apply_headers();
brig_require_method('POST');

$pdo = brig_db();
if ($pdo === null) {
    brig_error('Report persistence is not configured on this deployment.', 503, 'persistence_disabled');
}

// Anti-abuse: limit how many reports a single IP can persist per hour.
if (!brig_counter_hit('save:' . brig_client_ip(), 30, 3600)) {
    brig_error('Save limit reached for this hour. Please try again later.', 429, 'save_rate_limited');
}

$body = brig_read_json_input();
$model = $body['model'] ?? null;
if (!is_array($model) || !isset($model['narrative']) || !isset($model['facts'])) {
    brig_error('A valid report model (with narrative and facts) is required.', 400, 'invalid_model');
}
$facts = $model['facts'];
if (!isset($facts['approved_numbers'])) {
    brig_error('The report model facts are incomplete.', 400, 'invalid_facts');
}
$narrative = $model['narrative'];

$meta = is_array($body['meta'] ?? null) ? $body['meta'] : [];
$retentionDays = min(max((int) ($meta['retentionDays'] ?? 30), 1), 90);
$id = bin2hex(random_bytes(16));
$token = bin2hex(random_bytes(24));
$tokenHash = hash('sha256', $token);
$expires = gmdate('Y-m-d H:i:s', time() + $retentionDays * 86400);

try {
    $stmt = $pdo->prepare(
        'INSERT INTO saved_reports (id, organisation_label, reporting_period, audience, executive_status, confidence, report_facts_json, narrative_json, report_model_json, access_token_hash, expires_at)
         VALUES (:id, :org, :period, :audience, :status, :confidence, :facts, :narrative, :model, :token_hash, :expires)'
    );
    $stmt->execute([
        ':id' => $id,
        ':org' => isset($model['profile']['organisationLabel']) ? (string) $model['profile']['organisationLabel'] : null,
        ':period' => isset($model['profile']['reportingPeriod']) ? (string) $model['profile']['reportingPeriod'] : null,
        ':audience' => isset($model['profile']['audience']) ? (string) $model['profile']['audience'] : null,
        ':status' => (string) ($facts['executive_status'] ?? ''),
        ':confidence' => (string) ($facts['confidence'] ?? ''),
        ':facts' => json_encode($facts, JSON_UNESCAPED_SLASHES),
        ':narrative' => json_encode($narrative, JSON_UNESCAPED_SLASHES),
        ':model' => json_encode($model, JSON_UNESCAPED_SLASHES),
        ':token_hash' => $tokenHash,
        ':expires' => $expires,
    ]);
} catch (Throwable $e) {
    error_log('[BRIG] save failed: ' . $e->getMessage());
    brig_error('Could not save the report.', 500, 'save_failed');
}

brig_respond([
    'ok' => true,
    'id' => $id,
    'token' => $token,
    'expires_at' => $expires,
    'note' => 'Store the id and token securely. Anyone with both can retrieve this report until it expires. The token is shown once and cannot be recovered.',
]);

