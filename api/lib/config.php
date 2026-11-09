<?php
declare(strict_types=1);

/**
 * Configuration loader for the BRIG PHP API.
 *
 * SECURITY (R8/spec §30, §60): provider API keys and DB credentials must live
 * server-side, ideally OUTSIDE the public document root. This loader looks for a
 * private config file first, then falls back to environment variables and safe
 * defaults (no secrets). Never commit real keys to this repository.
 *
 * Private config file lookup order (first existing file wins):
 *   1. Env var BRIG_CONFIG_PATH (absolute path)
 *   2. ~/brig_private-config/brig.php          (recommended: home dir, outside web root)
 *   3. <projectRoot>/private-config/brig.php
 *   4. <documentRoot>/../brig_private-config/brig.php  (typical cPanel layout)
 */

function brig_default_config(): array
{
    return [
        'app' => [
            'env' => 'production',
            // Additional allowed origins for the public API (same-origin is always allowed).
            'allowed_origins' => [],
        ],
        'db' => [
            'dsn' => null,   // e.g. 'mysql:host=localhost;dbname=brig;charset=utf8mb4'
            'user' => null,
            'pass' => null,
        ],
        'governor' => [
            'per_ip_per_minute' => 6,
            'per_ip_reports_per_hour' => 20,
            'per_session_ai_regenerations' => 20,
            'global_daily_requests' => 300,
            'max_input_tokens' => 6000,
            'max_output_tokens' => 1200,
        ],
        'pdf' => [
            // Absolute path to the File_PDF class file (e.g. PEAR File/PDF.php), if
            // it is not already on the include path. Leave null to auto-detect.
            'file_pdf_path' => null,
        ],
        'ai' => [
            // One-time AI access tokens gate the LLM proxy. After a token is redeemed
            // once, the browser is granted a short AI session.
            'session_ttl_hours' => 3,
            'redeem_per_minute' => 20,
            // Where consumed-token markers and sessions are stored (must be private,
            // outside the web root). Leave null to auto-detect (~/brig-ai-tokens,
            // then api/storage, then the system temp dir).
            'token_store_path' => null,
        ],
        'providers' => [
            'gemini' => [
                'enabled' => true,
                'api_key' => getenv('BRIG_GEMINI_KEY') ?: '',
                'model' => 'gemini-1.5-flash',
                'endpoint' => 'https://generativelanguage.googleapis.com/v1beta',
                'privacy_class' => 'third_party_training_use_possible',
                'privacy_summary' => 'Free-tier content may be used to improve Google products. Use synthetic or non-confidential data.',
                'policy_url' => 'https://ai.google.dev/gemini-api/docs/pricing',
                'timeout' => 60,
                'max_retries' => 2,
                'minute_limit' => 10,
                'daily_limit' => 200,
            ],
            'groq' => [
                'enabled' => true,
                'api_key' => getenv('BRIG_GROQ_KEY') ?: '',
                'model' => 'llama-3.1-8b-instant',
                'endpoint' => 'https://api.groq.com/openai/v1',
                'privacy_class' => 'third_party_no_training_claim',
                'privacy_summary' => 'Inference data is not retained by default (limited retention for reliability/abuse). Verify current terms.',
                'policy_url' => 'https://console.groq.com/docs/your-data',
                'timeout' => 60,
                'max_retries' => 2,
                'minute_limit' => 20,
                'daily_limit' => 500,
            ],
            'cohere' => [
                'enabled' => true,
                'api_key' => getenv('BRIG_COHERE_KEY') ?: '',
                'model' => 'command-r',
                'endpoint' => 'https://api.cohere.com/v2',
                'privacy_class' => 'third_party_no_training_claim',
                'privacy_summary' => 'Trial keys have usage limitations. Verify current data-use terms.',
                'policy_url' => 'https://docs.cohere.com/v1/docs/rate-limits',
                'timeout' => 60,
                'max_retries' => 2,
                'minute_limit' => 10,
                'daily_limit' => 100,
            ],
            'openrouter' => [
                'enabled' => true,
                'api_key' => getenv('BRIG_OPENROUTER_KEY') ?: '',
                'model' => 'openai/gpt-4o-mini',
                'endpoint' => 'https://openrouter.ai/api/v1',
                'privacy_class' => 'third_party_routing_possible',
                'privacy_summary' => 'OpenRouter routes each request to the selected downstream model provider; data handling depends on that provider. Verify current terms.',
                'policy_url' => 'https://openrouter.ai/privacy',
                'timeout' => 60,
                'max_retries' => 2,
                'minute_limit' => 20,
                'daily_limit' => 200,
            ],
        ],
    ];
}

function brig_home_dir(): ?string
{
    $home = getenv('HOME');
    if ($home && is_dir($home)) {
        return rtrim($home, '/\\');
    }
    if (!empty($_SERVER['HOME']) && is_dir($_SERVER['HOME'])) {
        return rtrim($_SERVER['HOME'], '/\\');
    }
    if (function_exists('posix_getpwuid') && function_exists('posix_getuid')) {
        $info = posix_getpwuid(posix_getuid());
        if (!empty($info['dir']) && is_dir($info['dir'])) {
            return rtrim($info['dir'], '/\\');
        }
    }
    // cPanel: DOCUMENT_ROOT is usually /home/USER/public_html, so its parent is the home dir.
    $docroot = $_SERVER['DOCUMENT_ROOT'] ?? '';
    if ($docroot !== '') {
        $parent = dirname(rtrim($docroot, '/\\'));
        if (is_dir($parent)) {
            return $parent;
        }
    }
    return null;
}

/** @return array<int,string> */
function brig_config_candidates(): array
{
    $candidates = [];
    $env = getenv('BRIG_CONFIG_PATH');
    if ($env) {
        $candidates[] = $env;
    }
    $home = brig_home_dir();
    if ($home) {
        $candidates[] = $home . '/brig_private-config/brig.php';
    }
    $candidates[] = dirname(__DIR__, 2) . '/private-config/brig.php';
    $docroot = $_SERVER['DOCUMENT_ROOT'] ?? '';
    if ($docroot !== '') {
        $candidates[] = dirname(rtrim($docroot, '/\\')) . '/brig_private-config/brig.php';
    }
    return $candidates;
}

function brig_resolve_config_path(): ?string
{
    foreach (brig_config_candidates() as $path) {
        if ($path && is_file($path)) {
            return $path;
        }
    }
    return null;
}

/** Raised when the private config file exists but cannot be loaded safely. */
class BrigConfigException extends \RuntimeException
{
}

/** @return array<string,mixed> */
function brig_config(): array
{
    static $config = null;
    if ($config !== null) {
        return $config;
    }
    $config = brig_default_config();
    $path = brig_resolve_config_path();
    if ($path !== null) {
        try {
            $override = require $path;
        } catch (\Throwable $e) {
            error_log('[BRIG] config load failed: ' . get_class($e) . ': ' . $e->getMessage() . ' in ' . $path);
            throw new BrigConfigException(
                'Configuration error: the private config file could not be loaded (' . $e->getMessage()
                . '). Check it for PHP syntax errors.'
            );
        }
        if (!is_array($override)) {
            error_log('[BRIG] config did not return an array: ' . $path);
            throw new BrigConfigException('Configuration error: the private config file must return an array.');
        }
        $config = array_replace_recursive($config, $override);
    }

    // Normalise provider credentials: trim stray whitespace/newlines and any
    // wrapping quotes accidentally pasted into the config (a common cause of
    // "401 Invalid API Key" even when the key itself is correct).
    if (isset($config['providers']) && is_array($config['providers'])) {
        foreach ($config['providers'] as $k => $p) {
            if (!is_array($p)) {
                continue;
            }
            foreach (['api_key', 'model', 'endpoint'] as $field) {
                if (isset($p[$field]) && is_string($p[$field])) {
                    $config['providers'][$k][$field] = trim(trim($p[$field]), "\"'");
                }
            }
        }
    }

    return $config;
}

/**
 * Which config file was actually loaded. Useful for support: it is easy to edit
 * the wrong file when several copies exist.
 */
function brig_config_source(): ?string
{
    $env = getenv('BRIG_CONFIG_PATH');
    if ($env && is_file($env)) {
        return 'env';
    }
    $home = brig_home_dir();
    if ($home && is_file($home . '/brig_private-config/brig.php')) {
        return 'home';
    }
    if (is_file(dirname(__DIR__, 2) . '/private-config/brig.php')) {
        return 'project';
    }
    $docroot = $_SERVER['DOCUMENT_ROOT'] ?? '';
    if ($docroot !== '' && is_file(dirname(rtrim($docroot, '/\\')) . '/brig_private-config/brig.php')) {
        return 'docroot';
    }
    return null;
}
