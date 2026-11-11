<?php
declare(strict_types=1);

/**
 * Shared bootstrap for all BRIG API endpoints.
 * - JSON-only responses with a consistent envelope
 * - Basic security headers
 * - No debug stack traces in production
 */

require_once __DIR__ . '/config.php';

// Never expose PHP notices/warnings in responses.
ini_set('display_errors', '0');
error_reporting(E_ALL);

function brig_apply_headers(): void
{
    header('X-Content-Type-Options: nosniff');
    header('Referrer-Policy: no-referrer');
    header('X-Frame-Options: DENY');
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');

    // Same-origin is always allowed; add any configured origins for flexibility.
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    $allowed = brig_config()['app']['allowed_origins'] ?? [];
    if ($origin !== '' && in_array($origin, $allowed, true)) {
        header('Access-Control-Allow-Origin: ' . $origin);
        header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Accept');
        header('Vary: Origin');
    }
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
}

/** @return array<string,mixed> */
function brig_read_json_input(): array
{
    $raw = file_get_contents('php://input') ?: '';
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
