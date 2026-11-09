<?php
return [
    'ai' => ['token_store_path' => __DIR__ . '/ai-token-store-test7'],
    'governor' => [
        'per_ip_per_minute' => 100,
        'per_ip_reports_per_hour' => 100,
        'per_session_ai_regenerations' => 20,
        'global_daily_requests' => 1000,
        'max_input_tokens' => 60000,
        'max_output_tokens' => 2000,
    ],
    'providers' => [
        'openrouter' => ['api_key' => 'sk-or-fake', 'model' => 'openai/gpt-4o-mini', 'endpoint' => 'http://127.0.0.1:8089'],
    ],
];
