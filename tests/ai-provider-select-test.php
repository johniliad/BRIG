<?php
// Temporary test config: Gemini at a dead port (first), Groq at the mock (second).
return [
    'ai' => ['token_store_path' => __DIR__ . '/ai-token-store-test3'],
    'providers' => [
        'gemini' => ['api_key' => 'g-fake', 'model' => 'gemini-1.5-flash', 'endpoint' => 'http://127.0.0.1:9/nope'],
        'groq' => ['api_key' => 'q-fake', 'model' => 'llama-3.1-8b-instant', 'endpoint' => 'http://127.0.0.1:8089'],
    ],
];
