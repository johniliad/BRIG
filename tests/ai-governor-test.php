<?php
// Test config: tiny per-session cap (2) to prove sessions are independent.
return [
    'ai' => ['token_store_path' => __DIR__ . '/ai-token-store-test4'],
    'governor' => [
        'per_ip_per_minute' => 100,
        'per_ip_reports_per_hour' => 100,
        'per_session_ai_regenerations' => 2,
        'global_daily_requests' => 1000,
        'max_input_tokens' => 60000,
        'max_output_tokens' => 2000,
    ],
    'providers' => [
        'gemini' => ['api_key' => 'g-fake', 'model' => 'gemini-1.5-flash', 'endpoint' => 'http://127.0.0.1:9/nope'],
        'groq' => ['api_key' => 'q-fake', 'model' => 'llama-3.1-8b-instant', 'endpoint' => 'http://127.0.0.1:8089'],
    ],
];
