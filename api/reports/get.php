<?php
declare(strict_types=1);
require_once __DIR__ . '/../lib/bootstrap.php';
require_once __DIR__ . '/../lib/data.php';

brig_apply_headers();
brig_require_method('GET');

$pdo = brig_db();
if ($pdo === null) {
    brig_error('Report persistence is not configured on this deployment.', 503, 'persistence_disabled');
}

$id = isset($_GET['id']) ? (string) $_GET['id'] : '';
$token = isset($_GET['token']) ? (string) $_GET['token'] : '';
if ($id === '' || $token === '') {
    brig_error('Report id and token are required.', 400, 'missing_credentials');
}

try {
    $stmt = $pdo->prepare(
        'SELECT report_facts_json, narrative_json, report_model_json, created_at, expires_at FROM saved_reports
         WHERE id = :id AND access_token_hash = :hash AND (expires_at IS NULL OR expires_at > UTC_TIMESTAMP())
         LIMIT 1'
    );
    $stmt->execute([':id' => $id, ':hash' => hash('sha256', $token)]);
    $row = $stmt->fetch();
} catch (Throwable $e) {
    error_log('[BRIG] get failed: ' . $e->getMessage());
    brig_error('Could not retrieve the report.', 500, 'get_failed');
}

if (!$row) {
    brig_error('Report not found or expired.', 404, 'not_found');
}

$model = $row['report_model_json'] ? json_decode((string) $row['report_model_json'], true) : null;

brig_respond([
    'ok' => true,
    'model' => $model,
    'facts' => json_decode((string) $row['report_facts_json'], true),
    'narrative' => $row['narrative_json'] ? json_decode((string) $row['narrative_json'], true) : null,
    'created_at' => $row['created_at'],
    'expires_at' => $row['expires_at'],
]);
