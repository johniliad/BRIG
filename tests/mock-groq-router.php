<?php
// Mock Groq-compatible endpoint for testing provider selection.
header('Content-Type: application/json');
$inner = json_encode([
    'executive_headline' => 'Mock Groq headline',
    'executive_summary' => 'Mock Groq summary with no numbers.',
    'key_risks' => [],
    'key_achievements' => [],
    'strategic_priorities' => [],
    'board_actions' => [],
]);
echo json_encode(['choices' => [['message' => ['content' => $inner]]]]);
