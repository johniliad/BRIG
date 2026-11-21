<?php
declare(strict_types=1);

require __DIR__ . '/../api/lib/llm_service.php';

$facts = [
    'executive_status' => 'Watch',
    'confidence' => 'Medium',
    'headline' => 'Prioritised executive storyline',
    'observed_metrics' => [],
    'trend_results' => [],
    'findings' => [],
    'contradictions' => [],
    'relationships' => [],
    'strategic_priorities' => ['Prioritise remediation and maintain assurance.'],
    'board_actions' => [['category' => 'monitor', 'title' => 'Monitor priority signals', 'rationale' => 'Retain oversight.']],
    'approved_numbers' => [],
    'approved_metric_keys' => [],
];

for ($i = 1; $i <= 44; $i++) {
    $key = 'metric_' . $i;
    $facts['observed_metrics'][] = ['metric_key' => $key, 'name' => 'Illustrative metric ' . $i, 'unit' => 'count', 'current' => $i * 10, 'previous' => $i * 9, 'target' => $i * 8];
    $facts['trend_results'][] = ['metric_key' => $key, 'direction' => 'up', 'band' => 'moderate', 'interpretation' => 'deteriorating', 'percentageDelta' => 11.1, 'percentagePointDelta' => null];
    $facts['approved_numbers'][] = ['metric_key' => $key, 'label' => 'Illustrative metric ' . $i, 'value' => (string) ($i * 10)];
    $facts['approved_metric_keys'][] = $key;
    if ($i <= 12) {
        $facts['findings'][] = ['metric_key' => $key, 'kind' => $i % 2 ? 'concern' : 'positive', 'headline' => 'Illustrative material finding for metric ' . $i . '.'];
    }
}
for ($i = 1; $i <= 15; $i++) {
    $facts['relationships'][] = ['rule_key' => 'relationship_' . $i, 'interpretation' => 'Illustrative supporting relationship ' . $i . '.'];
}
for ($i = 1; $i <= 8; $i++) {
    $facts['contradictions'][] = ['rule_key' => 'contradiction_' . $i, 'title' => 'Counter-signal ' . $i, 'explanation' => 'Illustrative balancing evidence.'];
}

[$system, $user, $minimal] = brig_build_prompts($facts, 'general_board', 'strategic', 'en');
$tokens = (int) ceil((strlen($system) + strlen($user)) / 4);
$keys = $minimal['approved_metric_keys'] ?? [];
$numbers = $minimal['approved_numbers'] ?? [];

if ($tokens > 6000) {
    fwrite(STDERR, "FAIL — compact AI prompt is {$tokens} approximate tokens\n");
    exit(1);
}
if (count($minimal['findings'] ?? []) !== 8 || count($keys) !== 8 || count($numbers) !== 8) {
    fwrite(STDERR, "FAIL — compact evidence did not retain exactly eight prioritized findings and referenced metrics\n");
    exit(1);
}
if (in_array('metric_44', $keys, true) || str_contains($user, 'Illustrative metric 44')) {
    fwrite(STDERR, "FAIL — unrelated metric evidence leaked into the provider prompt\n");
    exit(1);
}

echo "OK — compact AI prompt is {$tokens} approximate tokens with eight prioritized metrics\n";