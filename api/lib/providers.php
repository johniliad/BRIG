<?php
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

/**
 * Provider-neutral adapters (R6). Each adapter accepts a system + user prompt
 * and returns a normalized result. Provider-specific payloads and error
 * handling live only here. Limits and privacy metadata are configuration data
 * (R7), never hard-coded assumptions.
 */

/** Public-safe provider metadata for GET /api/llm/providers.php. */
function brig_providers_public(): array
{
    $providers = brig_config()['providers'];
    $out = [];
    foreach ($providers as $key => $p) {
        // A provider is usable when an API key is present (key presence is the switch).
        $hasKey = (string) ($p['api_key'] ?? '') !== '';
        $out[] = [
            'provider_key' => $key,
            'provider_name' => brig_provider_name($key),
            'model_label' => (string) ($p['model'] ?? ''),
            'privacy_class' => (string) ($p['privacy_class'] ?? 'unknown'),
            'privacy_summary' => (string) ($p['privacy_summary'] ?? ''),
            'policy_url' => (string) ($p['policy_url'] ?? ''),
            'has_key' => $hasKey,
            'enabled' => $hasKey,
            'active_for_public_demo' => $hasKey,
        ];
    }
    return $out;
}

/** Safe, non-secret summary of the AI backend for diagnostics. */
function brig_ai_diagnostics(): array
{
    return [
        'config_loaded' => brig_resolve_config_path() !== null,
        'curl' => function_exists('curl_init'),
        'allow_url_fopen' => (bool) ini_get('allow_url_fopen'),
    ];
}

function brig_provider_name(string $key): string
{
    $names = ['gemini' => 'Google Gemini', 'groq' => 'Groq', 'cohere' => 'Cohere', 'openrouter' => 'OpenRouter'];
    return $names[$key] ?? $key;
}

function brig_extract_error_detail($bodyText): ?string
{
    if (!is_string($bodyText) || $bodyText === '') {
        return null;
    }
    $j = json_decode($bodyText, true);
    if (is_array($j)) {
        $msg = $j['error']['message'] ?? ($j['error'] ?? ($j['message'] ?? null));
        if (is_string($msg) && $msg !== '') {
            return substr(preg_replace('/\s+/', ' ', $msg), 0, 300);
        }
    }
    $plain = preg_replace('/\s+/', ' ', strip_tags($bodyText));
    return ($plain !== '' && $plain !== null) ? substr($plain, 0, 300) : null;
}

function brig_http_json(string $url, array $headers, ?array $body, int $timeout): array
{
    $payload = $body !== null ? json_encode($body) : null;

    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        $opts = [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CONNECTTIMEOUT => 10,
            CURLOPT_TIMEOUT => $timeout,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_HEADER => true,
        ];
        if ($body !== null) {
            $opts[CURLOPT_POST] = true;
            $opts[CURLOPT_POSTFIELDS] = $payload;
        }
        curl_setopt_array($ch, $opts);
        $raw = curl_exec($ch);
        if ($raw === false) {
            $err = curl_error($ch);
            curl_close($ch);
            return ['status' => 0, 'retry_after' => null, 'body' => null, 'error' => $err, 'detail' => $err];
        }
        $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $headerSize = (int) curl_getinfo($ch, CURLINFO_HEADER_SIZE);
        curl_close($ch);
        $headerText = substr((string) $raw, 0, $headerSize);
        $bodyText = substr((string) $raw, $headerSize);
        $retryAfter = null;
        if (preg_match('/^Retry-After:\s*(\d+)/mi', $headerText, $m)) {
            $retryAfter = (int) $m[1];
        }
        $decoded = json_decode($bodyText, true);
        return [
            'status' => $status,
            'retry_after' => $retryAfter,
            'body' => is_array($decoded) ? $decoded : null,
            'error' => null,
            'detail' => $status >= 400 ? brig_extract_error_detail($bodyText) : null,
        ];
    }

    // Fallback for hosts without cURL: HTTP streams.
    $contextOpts = [
        'http' => [
            'method' => $body !== null ? 'POST' : 'GET',
            'timeout' => $timeout,
            'ignore_errors' => true,
            'header' => implode("\r\n", $headers),
        ],
        'ssl' => ['verify_peer' => true, 'verify_peer_name' => true],
    ];
    if ($payload !== null) {
        $contextOpts['http']['content'] = $payload;
    }
    $bodyText = @file_get_contents($url, false, stream_context_create($contextOpts));
    $status = 0;
    $retryAfter = null;
    if (function_exists('http_get_last_response_headers')) {
        $respHeaders = http_get_last_response_headers();
    } else {
        // PHP < 8.5 fallback (the predefined variable is deprecated in 8.5+).
        $respHeaders = $http_response_header ?? null;
    }
    if (is_array($respHeaders)) {
        foreach ($respHeaders as $h) {
            if (preg_match('#^HTTP/\S+\s+(\d{3})#', $h, $m)) {
                $status = (int) $m[1];
            }
            if (preg_match('/^Retry-After:\s*(\d+)/i', $h, $m)) {
                $retryAfter = (int) $m[1];
            }
        }
    }
    $decoded = is_string($bodyText) ? json_decode($bodyText, true) : null;
    return [
        'status' => $status,
        'retry_after' => $retryAfter,
        'body' => is_array($decoded) ? $decoded : null,
        'error' => $bodyText === false ? 'HTTP request failed' : null,
        'detail' => $status >= 400 ? brig_extract_error_detail((string) $bodyText) : null,
    ];
}

/**
 * @return array{status:int,text:?string,retry_after:?int,error:?string}
 */
function brig_call_provider(string $key, string $systemPrompt, string $userPrompt): array
{
    $cfg = brig_config()['providers'][$key] ?? null;
    if ($cfg === null) {
        return ['status' => 400, 'text' => null, 'retry_after' => null, 'error' => 'Unknown provider'];
    }
    $apiKey = trim((string) ($cfg['api_key'] ?? ''));
    if ($apiKey === '') {
        return ['status' => 503, 'text' => null, 'retry_after' => null, 'error' => 'Provider not configured'];
    }
    // Server-log hint (never sent to the browser): common real-world cause of a
    // 401 is pasting another provider's key (e.g. xAI "grok_..." into "groq").
    $expectedPrefix = ['gemini' => 'AIza', 'groq' => 'gsk_', 'openrouter' => 'sk-or-'][$key] ?? null;
    if ($expectedPrefix !== null && strncmp($apiKey, $expectedPrefix, strlen($expectedPrefix)) !== 0) {
        error_log('[BRIG] provider "' . $key . '" api_key does not start with the expected prefix "' . $expectedPrefix
            . '". Check the key and confirm the loaded config is the file you edited (see /api/health.php config_source).');
    }
    $model = (string) $cfg['model'];
    $timeout = (int) ($cfg['timeout'] ?? 30);

    if ($key === 'gemini') {
        $url = rtrim((string) $cfg['endpoint'], '/') . '/models/' . rawurlencode($model) . ':generateContent?key=' . rawurlencode($apiKey);
        $body = [
            'systemInstruction' => ['parts' => [['text' => $systemPrompt]]],
            'contents' => [['role' => 'user', 'parts' => [['text' => $userPrompt]]]],
            'generationConfig' => ['responseMimeType' => 'application/json', 'temperature' => 0.2],
        ];
        $res = brig_http_json($url, ['Content-Type: application/json'], $body, $timeout);
        $text = $res['body']['candidates'][0]['content']['parts'][0]['text'] ?? null;
        return ['status' => $res['status'], 'text' => $text, 'retry_after' => $res['retry_after'], 'error' => $res['error'], 'detail' => $res['detail'] ?? null];
    }

    if ($key === 'groq') {
        $url = rtrim((string) $cfg['endpoint'], '/') . '/chat/completions';
        $body = [
            'model' => $model,
            'temperature' => 0.2,
            'response_format' => ['type' => 'json_object'],
            'messages' => [
                ['role' => 'system', 'content' => $systemPrompt],
                ['role' => 'user', 'content' => $userPrompt],
            ],
        ];
        $res = brig_http_json($url, ['Content-Type: application/json', 'Authorization: Bearer ' . $apiKey], $body, $timeout);
        $text = $res['body']['choices'][0]['message']['content'] ?? null;
        return ['status' => $res['status'], 'text' => $text, 'retry_after' => $res['retry_after'], 'error' => $res['error'], 'detail' => $res['detail'] ?? null];
    }

    if ($key === 'openrouter') {
        // OpenRouter is OpenAI-compatible and proxies to the model named in `model`.
        $url = rtrim((string) $cfg['endpoint'], '/') . '/chat/completions';
        $body = [
            'model' => $model,
            'temperature' => 0.2,
            'messages' => [
                ['role' => 'system', 'content' => $systemPrompt],
                ['role' => 'user', 'content' => $userPrompt],
            ],
        ];
        $headers = [
            'Content-Type: application/json',
            'Authorization: Bearer ' . $apiKey,
            'HTTP-Referer: https://iliadis.net',
            'X-Title: CISO Board Reporting Intelligence Generator',
        ];
        $res = brig_http_json($url, $headers, $body, $timeout);
        $text = $res['body']['choices'][0]['message']['content'] ?? null;
        return ['status' => $res['status'], 'text' => $text, 'retry_after' => $res['retry_after'], 'error' => $res['error'], 'detail' => $res['detail'] ?? null];
    }

    if ($key === 'cohere') {
        $url = rtrim((string) $cfg['endpoint'], '/') . '/chat';
        $body = [
            'model' => $model,
            'temperature' => 0.2,
            'response_format' => ['type' => 'json_object'],
            'messages' => [
                ['role' => 'system', 'content' => $systemPrompt],
                ['role' => 'user', 'content' => $userPrompt],
            ],
        ];
        $res = brig_http_json($url, ['Content-Type: application/json', 'Authorization: Bearer ' . $apiKey], $body, $timeout);
        $text = $res['body']['message']['content'][0]['text'] ?? null;
        return ['status' => $res['status'], 'text' => $text, 'retry_after' => $res['retry_after'], 'error' => $res['error'], 'detail' => $res['detail'] ?? null];
    }

    return ['status' => 400, 'text' => null, 'retry_after' => null, 'error' => 'Unsupported provider'];
}
