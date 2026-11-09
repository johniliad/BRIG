<?php
// Temporary test config: a provider with a key but enabled=false (proves key-based
// enabling), plus an unreachable endpoint to exercise provider error detail.
return [
    'ai' => ['token_store_path' => __DIR__ . '/ai-token-store-test2'],
    'providers' => [
        'gemini' => [
            'api_key' => 'test-fake-key',
            'enabled' => false,
            'model' => 'gemini-1.5-flash',
            'endpoint' => 'http://127.0.0.1:9/nope',
        ],
    ],
];
