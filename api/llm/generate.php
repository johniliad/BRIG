<?php
declare(strict_types=1);
require_once __DIR__ . '/../lib/bootstrap.php';
require_once __DIR__ . '/../lib/llm_service.php';
require_once __DIR__ . '/../lib/ai_access.php';

brig_apply_headers();
brig_require_method('POST');

$body = brig_read_json_input();

// Gate: AI generation requires a valid session obtained by redeeming a one-time token.
$aiSession = $_SERVER['HTTP_X_BRIG_AI_SESSION'] ?? (is_string($body['ai_session'] ?? null) ? $body['ai_session'] : '');
brig_ai_require_session(is_string($aiSession) ? $aiSession : null);

$providerRequested = isset($body['provider']) ? (string) $body['provider'] : '';
$providerKey = $providerRequested;
$facts = $body['facts'] ?? null;
if (!is_array($facts)) {
    brig_error('Missing ReportFacts payload.', 400, 'missing_facts');
}

// If no provider specified, choose the first enabled one server-side.
if ($providerKey === '') {
    foreach (brig_config()['providers'] as $key => $p) {
        if (($p['api_key'] ?? '') !== '') {
            $providerKey = $key;
            break;
        }
    }
}
if ($providerKey === '') {
    brig_respond([
        'ok' => false,
        'error' => 'AI enhancement is temporarily unavailable. Your deterministic Board report remains available.',
        'code' => 'no_provider',
    ], 503);
}

// Make the routing decision observable in DevTools → Network → Response Headers.
// (Empty "requested" means the client sent no provider and the server defaulted.)
header('X-BRIG-Provider-Requested: ' . ($providerRequested === '' ? '(none)' : $providerRequested));
header('X-BRIG-Provider-Used: ' . $providerKey);

$audience = isset($body['audience']) ? (string) $body['audience'] : 'general_board';
$style = isset($body['style']) ? (string) $body['style'] : 'strategic';
$language = isset($body['language']) ? (string) $body['language'] : 'en';
// Per-session regeneration limiting MUST key on the AI session (one per redeemed
// token). Keying on the client IP lumps every user behind a NAT/proxy into one
// bucket and exhausts the allowance quickly.
$sessionKey = is_string($aiSession) && $aiSession !== ''
    ? $aiSession
    : ($_SERVER['HTTP_X_BRIG_SESSION'] ?? ($body['session'] ?? brig_client_ip()));

brig_generate_language($providerKey, $facts, $audience, $style, $language, (string) $sessionKey);
