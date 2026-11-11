<?php
declare(strict_types=1);
require_once __DIR__ . '/../lib/bootstrap.php';
require_once __DIR__ . '/../lib/ratelimit.php';
require_once __DIR__ . '/../lib/ai_access.php';

/**
 * POST /api/ai/unlock.php  { token }
 * Redeems a one-time (256-bit) AI access token and returns a short AI session.
 * The token is consumed on first use.
 */
brig_apply_headers();
brig_require_method('POST');

$cfg = brig_config()['ai'] ?? [];
$perMinute = (int) ($cfg['redeem_per_minute'] ?? 20);
if (!brig_counter_hit('ai-unlock:' . brig_client_ip(), $perMinute, 60)) {
    header('Retry-After: 60');
    brig_error('Too many unlock attempts. Please wait a minute and try again.', 429, 'rate_limited');
}

$body = brig_read_json_input();
$token = isset($body['token']) ? (string) $body['token'] : '';
if ($token === '') {
    brig_error('An access token is required.', 400, 'missing_token');
}

$result = brig_ai_redeem($token); // consumes the token or exits with an error

brig_respond([
    'ok' => true,
    'session' => $result['session'],
    'expires_at' => $result['expires_at'],
]);
