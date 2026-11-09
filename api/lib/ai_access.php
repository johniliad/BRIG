<?php
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

/**
 * One-time AI access tokens gate the optional LLM ("Executive Writing Layer").
 *
 * Model:
 *  - A fixed set of 400 single-use tokens (256-bit, 64 hex chars) is issued to
 *    the operator. Only their SHA-256 hashes are stored (ai-tokens-allowed.php).
 *  - A user redeems one token once (POST /api/ai/unlock.php). The server records
 *    the token hash as "used" (atomic) and issues a short-lived AI session.
 *  - /api/llm/generate.php requires a valid, unexpired AI session.
 *
 * Runtime state (used markers + sessions) is stored in a private directory
 * outside the web root. No raw metric data or plaintext tokens are stored.
 */

/** @return array<int,string> SHA-256 hashes of the allowed one-time tokens. */
function brig_ai_allowed_hashes(): array
{
    static $set = null;
    if ($set !== null) {
        return $set;
    }
    $file = __DIR__ . '/ai-tokens-allowed.php';
    $loaded = is_file($file) ? include $file : [];
    $set = is_array($loaded) ? $loaded : [];
    return $set;
}

function brig_ai_store_dir(): string
{
    static $dir = null;
    if ($dir !== null) {
        return $dir;
    }
    $cfg = brig_config()['ai'] ?? [];
    $base = $cfg['token_store_path'] ?? null;
    if (!is_string($base) || $base === '') {
        $home = function_exists('brig_home_dir') ? brig_home_dir() : (getenv('HOME') ?: null);
        if ($home && is_dir($home)) {
            $base = rtrim($home, '/\\') . '/brig-ai-tokens';
        } else {
            $base = dirname(__DIR__) . '/storage/ai-tokens';
        }
    }
    foreach ([$base, $base . '/used', $base . '/sessions'] as $d) {
        if (!is_dir($d)) {
            @mkdir($d, 0700, true);
        }
    }
    $dir = $base;
    return $dir;
}

function brig_ai_normalize_token(string $token): ?string
{
    $t = strtolower(trim($token));
    return preg_match('/^[0-9a-f]{64}$/', $t) ? $t : null;
}

/**
 * Redeem a one-time token. Marks it used (atomic) and returns a new AI session.
 *
 * @return array{session:string,expires_at:string,expires_ts:int}
 */
function brig_ai_redeem(string $token): array
{
    $t = brig_ai_normalize_token($token);
    if ($t === null) {
        brig_error('Invalid AI access token format. A token is 64 hexadecimal characters (256 bits).', 400, 'invalid_token');
    }
    $hash = hash('sha256', $t);
    if (!in_array($hash, brig_ai_allowed_hashes(), true)) {
        brig_error('This AI access token is not valid.', 403, 'token_invalid');
    }

    $dir = brig_ai_store_dir();
    $marker = $dir . '/used/' . $hash;
    $fh = @fopen($marker, 'x'); // atomic exclusive create → enforces single use
    if ($fh === false) {
        brig_error('This AI access token has already been used. Please use another one.', 409, 'token_used');
    }
    @fwrite($fh, (string) time());
    @fclose($fh);

    $ttl = (int) (brig_config()['ai']['session_ttl_hours'] ?? 3);
    if ($ttl < 1) {
        $ttl = 1;
    }
    $session = bin2hex(random_bytes(32)); // 256-bit session id
    $expires = time() + $ttl * 3600;
    @file_put_contents(
        $dir . '/sessions/' . hash('sha256', $session) . '.json',
        json_encode(['expires' => $expires, 'created' => time()]),
        LOCK_EX
    );

    return ['session' => $session, 'expires_at' => gmdate('c', $expires), 'expires_ts' => $expires];
}

function brig_ai_session_valid(?string $session): bool
{
    if (!is_string($session)) {
        return false;
    }
    $s = strtolower(trim($session));
    if (!preg_match('/^[0-9a-f]{64}$/', $s)) {
        return false;
    }
    $file = brig_ai_store_dir() . '/sessions/' . hash('sha256', $s) . '.json';
    if (!is_file($file)) {
        return false;
    }
    $data = json_decode((string) @file_get_contents($file), true);
    if (!is_array($data) || empty($data['expires'])) {
        return false;
    }
    return (int) $data['expires'] > time();
}

/** Abort the request unless a valid AI session is presented. */
function brig_ai_require_session(?string $session): void
{
    if (!brig_ai_session_valid($session)) {
        brig_respond([
            'ok' => false,
            'error' => 'AI access requires a valid one-time access token. Unlock AI first.',
            'code' => 'ai_locked',
        ], 403);
    }
}
