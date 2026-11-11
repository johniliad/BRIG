<?php
/**
 * EXAMPLE private configuration for the BRIG API.
 *
 * DO NOT deploy this file as-is and DO NOT commit real secrets.
 * Copy it to your HOME directory (outside the public document root):
 *     ~/brig_private-config/brig.php
 * i.e. /home/USER/brig_private-config/brig.php on cPanel. It stores the MySQL
 * username/password and the API credentials for all AI LLM providers.
 * (Alternatively point the BRIG_CONFIG_PATH env var at any absolute path.)
 *
 * The loader (api/lib/config.php) merges this over the safe defaults.
 * Any provider you leave disabled or without an api_key stays unavailable, and
 * the app continues to work fully in deterministic mode.
 */
return [
    'app' => [
        'env' => 'production',
        // Extra origins allowed to call the API (same-origin is always allowed).
        'allowed_origins' => [],
    ],

    // MySQL persistence (for saved reports / DB-backed knowledge base).
    'db' => [
        'dsn' => 'mysql:host=localhost;dbname=iliadis_brig;charset=utf8mb4',
        'user' => 'iliadis_brig_user',
        'pass' => 'CHANGE_ME',
    ],

    // Public AI usage governor (per R13). Tighten for a public deployment.
    // per_session_ai_regenerations is keyed on the redeemed AI session (per token),
    // not the client IP, so it is safe to raise for testing/tuning.
    'governor' => [
        'per_ip_per_minute' => 6,
        'per_ip_reports_per_hour' => 20,
        'per_session_ai_regenerations' => 20,
        'global_daily_requests' => 300,
        'max_input_tokens' => 6000,
        'max_output_tokens' => 1200,
    ],

    // Server-side PDF uses the File_PDF class (NOT a Composer package). Point to
    // the class file, or leave null to auto-detect File/PDF.php on the include
    // path or api/vendor/File/PDF.php.
    'pdf' => [
        'file_pdf_path' => null, // e.g. '/home/USER/php/File/PDF.php'
    ],

    // Enable only the providers you are authorised to use. Keys are server-side.
    'providers' => [
        'gemini' => [
            'enabled' => true,
            'api_key' => '', // paste your Gemini key here
            'model' => 'gemini-1.5-flash',
            'privacy_class' => 'third_party_training_use_possible',
        ],
        'groq' => [
            'enabled' => true,
            'api_key' => '', // paste your Groq key here
            'model' => 'llama-3.1-8b-instant',
            'privacy_class' => 'third_party_no_training_claim',
        ],
        'cohere' => [
            'enabled' => true,
            'api_key' => '', // paste your Cohere key here
            'model' => 'command-r',
            'privacy_class' => 'third_party_no_training_claim',
        ],
        'openrouter' => [
            'enabled' => true,
            'api_key' => '', // paste your OpenRouter key here (sk-or-v1-...)
            'model' => 'openai/gpt-4o-mini', // any OpenRouter model id, e.g. meta-llama/llama-3.1-70b-instruct
            'privacy_class' => 'third_party_routing_possible',
        ],
    ],
];
