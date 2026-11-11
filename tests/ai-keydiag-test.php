<?php
// Test config: exercises key normalization + key-shape diagnostics.
return [
    'ai' => ['token_store_path' => __DIR__ . '/ai-token-store-test6'],
    'providers' => [
        // Wrapped in spaces + quotes on purpose → should normalise to a valid AIza key.
        'gemini' => ['api_key' => '  "AIzaTestKey"  ', 'model' => 'gemini-2.0-flash'],
        // Wrong-provider style key (xAI Grok, not Groq) → shape should be false.
        'groq' => ['api_key' => 'grok_wrongprefix', 'model' => 'llama-3.1-8b-instant'],
        'openrouter' => ['api_key' => 'sk-or-v1-test', 'model' => 'openai/gpt-4o-mini'],
    ],
];
