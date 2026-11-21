<?php
declare(strict_types=1);

/**
 * Shared bootstrap for all BRIG API endpoints.
 * - JSON-only responses with a consistent envelope
 * - Full security-header set (mirrored by the web root .htaccess)
 * - No debug stack traces in production
 */

require_once __DIR__ . '/config.php';

// Never expose PHP notices/warnings in responses.
ini_set('display_errors', '0');
error_reporting(E_ALL);

// Secure-cookie defaults (guideline: "Secure cookies if cookies are ever
// introduced"). The app currently sets no cookies; these apply to any PHP
// session cookie if one is ever started, on top of the Set-Cookie hardening
// in the web root .htaccess.
ini_set('session.cookie_httponly', '1');
ini_set('session.cookie_secure', '1');
ini_set('session.cookie_samesite', 'Strict');
ini_set('session.use_strict_mode', '1');

/**
 * Security headers shared by every API response.
 *
 * The web root .htaccess sets the same headers with `Header always set`
 * (covering static files and error documents too); sending them here as well
 * keeps the API hardened on hosts without mod_headers. The
 * Content-Security-Policy is deliberately NOT sent from PHP: the single
 * site-wide policy lives in the .htaccess template, where the build injects
 * the sha256 style hashes — one source of truth, no drift.
 */
function brig_send_security_headers(): void
{
    header('X-Content-Type-Options: nosniff');
    header('Referrer-Policy: no-referrer');
    header('X-Frame-Options: DENY');
    header('Strict-Transport-Security: max-age=31536000; includeSubDomains');
    header('Cross-Origin-Opener-Policy: same-origin');
    header('Cross-Origin-Resource-Policy: same-origin');
    header('Permissions-Policy: camera=(), microphone=(), geolocation=(), usb=(), payment=(), interest-cohort=()');
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
}

function brig_apply_headers(): void
{
    // Static headers FIRST: they must be on the wire even when the config
    // load below throws (the exception handler then reports the problem on a
    // fully hardened response instead of a bare one).
    brig_send_security_headers();

    // Same-origin is always allowed; add any configured origins for
    // flexibility. A wildcard is never honoured — echoing arbitrary origins
    // back is the CORS pattern ZAP reports as "Cross-Domain Misconfiguration",
    // so only exact, explicitly configured origin strings may be reflected.
    try {
        $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
        $configured = brig_config()['app']['allowed_origins'] ?? [];
        $allowed = [];
        if (is_array($configured)) {
            foreach ($configured as $o) {
                if (is_string($o) && $o !== '*' && $o !== '') {
                    $allowed[] = $o;
                }
            }
        }
        if ($origin !== '' && in_array($origin, $allowed, true)) {
            header('Access-Control-Allow-Origin: ' . $origin);
            header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
            header('Access-Control-Allow-Headers: Content-Type, Accept, X-BRIG-AI-Session');
            header('Vary: Origin');
        }
    } catch (\Throwable $e) {
        error_log('[BRIG] CORS origin list unavailable: ' . $e->getMessage());
    }
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
}

function brig_request_limit(string $name, int $fallback): int
{
    try {
        $configured = brig_config()['app']['request_limits'][$name] ?? $fallback;
        $limit = (int) $configured;
        return $limit > 0 ? $limit : $fallback;
    } catch (\Throwable $e) {
        return $fallback;
    }
}

function brig_require_json_content_type(): void
{
    // CLI tests do not have HTTP headers. Real HTTP JSON endpoints always require
    // application/json, including chunked requests with no Content-Length.
    $contentType = trim((string) ($_SERVER['CONTENT_TYPE'] ?? ''));
    if (PHP_SAPI !== 'cli' && !preg_match('#^application/json(?:\s*;|$)#i', $contentType)) {
        brig_error('Content-Type must be application/json.', 415, 'unsupported_media_type');
    }
}

/** @return array<string,mixed> */
function brig_read_json_input(int $maxBytes = 1048576): array
{
    if ($maxBytes < 1) {
        throw new \InvalidArgumentException('JSON body limit must be positive.');
    }
    brig_require_json_content_type();
    $declared = (int) ($_SERVER['CONTENT_LENGTH'] ?? 0);
    if ($declared > $maxBytes) {
        brig_error('The request body exceeds the maximum permitted size.', 413, 'request_too_large');
    }
    $stream = @fopen('php://input', 'rb');
    if ($stream === false) {
        brig_error('The request body could not be read.', 400, 'body_unreadable');
    }
    $raw = stream_get_contents($stream, $maxBytes + 1);
    fclose($stream);
    if (!is_string($raw)) {
        brig_error('The request body could not be read.', 400, 'body_unreadable');
    }
    if (strlen($raw) > $maxBytes) {
        brig_error('The request body exceeds the maximum permitted size.', 413, 'request_too_large');
    }
    if ($raw === '') {
        return [];
    }
    $data = json_decode($raw, true);
    if (!is_array($data)) {
        brig_error('Malformed JSON in request body.', 400, 'bad_json');
    }
    return $data;
}

/** @param mixed $data */
function brig_respond($data, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

function brig_error(string $message, int $status = 400, string $code = 'error'): void
{
    http_response_code($status);
    echo json_encode(['ok' => false, 'error' => $message, 'code' => $code], JSON_UNESCAPED_SLASHES);
    exit;
}

function brig_require_method(string $method): void
{
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== $method) {
        brig_error('Method not allowed.', 405, 'method_not_allowed');
    }
}

function brig_client_ip(): string
{
    $ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    return preg_replace('/[^0-9a-fA-F:\.]/', '', $ip) ?: '0.0.0.0';
}

function brig_now(): int
{
    return (int) floor(microtime(true));
}

// Convert uncaught errors/exceptions into a safe JSON envelope.
set_exception_handler(function ($e) {
    error_log('[BRIG] ' . get_class($e) . ': ' . $e->getMessage() . ' in ' . $e->getFile() . ':' . $e->getLine());
    if ($e instanceof BrigConfigException) {
        brig_error($e->getMessage(), 500, 'config_error');
    }
    brig_error('An unexpected server error occurred.', 500, 'server_error');
});
