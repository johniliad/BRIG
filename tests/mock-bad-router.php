<?php
// Mock provider that always returns a schema-valid reply containing an invented
// number (98765) — used to prove validation rejects it, the repair retry fires,
// and the reason is surfaced. Counts how many times it was called.
$f = __DIR__ . '/.mock-bad-count';
$n = is_file($f) ? (int) file_get_contents($f) : 0;
file_put_contents($f, (string) ($n + 1));
$inner = json_encode([
    'executive_headline' => 'Headline 98765',
    'executive_summary' => 'Summary 98765',
    'key_risks' => [],
    'key_achievements' => [],
    'strategic_priorities' => [],
    'board_actions' => [],
]);
header('Content-Type: application/json');
echo json_encode(['choices' => [['message' => ['content' => $inner]]]]);
