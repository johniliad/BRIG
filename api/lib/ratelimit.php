<?php
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

/**
 * File-based, windowed rate limiting for the PUBLIC AI proxy (R13 / spec §24.12,
 * §33.17, §110.1). Uses the system temp directory (outside the web root) so no
 * counters are web-accessible. This is intentionally simple and dependency-free
 * for cPanel hosting. For multi-server setups use a shared store (e.g. MySQL).
 */

function brig_storage_dir(): string
{
    $dir = sys_get_temp_dir() . '/brig-ratelimit';
    if (!is_dir($dir)) {
        @mkdir($dir, 0700, true);
    }
    return $dir;
}

/**
 * Record a hit against a windowed counter. Returns true if the request is
 * allowed (and records the hit), false if the limit would be exceeded.
 */
function brig_counter_hit(string $bucket, int $limit, int $windowSeconds): bool
{
    if ($limit <= 0 || $windowSeconds <= 0) {
        return false;
    }
    $now = brig_now();
    $file = brig_storage_dir() . '/' . hash('sha256', $bucket) . '.json';
    $fh = @fopen($file, 'c+b');
    if ($fh === false || !@flock($fh, LOCK_EX)) {
        if (is_resource($fh)) {
            @fclose($fh);
        }
        error_log('[BRIG] rate-limit counter unavailable for bucket hash ' . basename($file));
        return false; // fail closed: an unavailable governor must not allow abuse
    }

    $allowed = false;
    try {
        rewind($fh);
        $raw = stream_get_contents($fh);
        $data = is_string($raw) && $raw !== '' ? json_decode($raw, true) : null;
        $state = is_array($data) && isset($data['start'], $data['count'])
            ? ['start' => (int) $data['start'], 'count' => (int) $data['count']]
            : ['start' => $now, 'count' => 0];
        if ($now - $state['start'] >= $windowSeconds || $state['start'] > $now) {
            $state = ['start' => $now, 'count' => 0];
        }
        if ($state['count'] < $limit) {
            $state['count']++;
            $encoded = json_encode($state, JSON_UNESCAPED_SLASHES);
            if (is_string($encoded)) {
                rewind($fh);
                $written = @fwrite($fh, $encoded);
                if (@ftruncate($fh, strlen($encoded)) && $written === strlen($encoded) && @fflush($fh)) {
                    $allowed = true;
                }
            }
        }
    } finally {
        @flock($fh, LOCK_UN);
        @fclose($fh);
    }
    if (!$allowed) {
        return false;
    }
    return true;
}

/**
 * Enforce the public AI usage governor. Exits with HTTP 429 if any limit is hit.
 */
function brig_enforce_governor(string $sessionKey, int $inputTokens): void
{
    $g = brig_config()['governor'];
    $ip = brig_client_ip();
    $session = preg_replace('/[^a-zA-Z0-9_\-]/', '', $sessionKey) ?: 'anon';

    // Per-IP per-minute.
    if (!brig_counter_hit("ipmin:$ip", (int) $g['per_ip_per_minute'], 60)) {
        header('Retry-After: 60');
        brig_error('Rate limit exceeded. Please wait a minute and try again. Your deterministic report remains available.', 429, 'rate_limited_ip');
    }
    // Per-IP reports per hour.
    if (!brig_counter_hit("iphour:$ip", (int) $g['per_ip_reports_per_hour'], 3600)) {
        header('Retry-After: 3600');
        brig_error('Hourly limit exceeded. Your deterministic report remains available.', 429, 'rate_limited_hour');
    }
    // Per-session AI regenerations (long window).
    if (!brig_counter_hit("session:$session", (int) $g['per_session_ai_regenerations'], 3600)) {
        brig_error('Session AI regeneration limit reached. Your deterministic report remains available.', 429, 'rate_limited_session');
    }
    // Global daily request budget.
    if (!brig_counter_hit('global:day', (int) $g['global_daily_requests'], 86400)) {
        brig_error('The public AI budget for today has been reached. Your deterministic report remains available.', 429, 'global_budget');
    }
    // Input token budget (approximate: ~4 chars per token).
    $maxInput = (int) $g['max_input_tokens'];
    if ($maxInput > 0 && $inputTokens > $maxInput) {
        brig_error('The request exceeds the maximum permitted size.', 413, 'input_too_large');
    }
}
