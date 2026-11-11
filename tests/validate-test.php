<?php
declare(strict_types=1);
require __DIR__ . '/../api/lib/llm_service.php';

$facts = [
    'executive_status' => 'Watch',
    'confidence' => 'Medium',
    'headline' => 'Headline',
    'approved_numbers' => [['metric_key' => 'a', 'label' => 'Coverage', 'value' => '92%']],
    'approved_metric_keys' => ['a'],
    // A number that is NOT in approved_numbers but IS a deterministic fact:
    'observed_metrics' => [['metric_key' => 'a', 'name' => 'Coverage', 'current' => 41.7]],
];

function check(string $label, array $facts, string $out, bool $expectOk, ?string $expectReason = null): void
{
    $r = brig_validate_output($out, $facts);
    $ok = ($r['ok'] ?? false) === true;
    $reason = $r['reason'] ?? '';
    $pass = ($ok === $expectOk) && (!$expectReason || strpos($reason, $expectReason) !== false);
    echo ($pass ? 'PASS' : 'FAIL') . "  {$label}  -> ok=" . ($ok ? 'true' : 'false') . " reason={$reason}\n";
}

// A: valid — reuses an approved number (92%) and a deterministic fact number (41.7),
// and provides a list field as a bare string (leniency).
$jsonA = '{"executive_headline":"Coverage is 92%","executive_summary":"Current level 41.7 with 92% coverage.","key_risks":"single string risk","key_achievements":[],"strategic_priorities":[],"board_actions":[]}';
check('approved + fact number, string list', $facts, $jsonA, true);

// B: invented number must be rejected.
$jsonB = '{"executive_headline":"Coverage is 92%","executive_summary":"Now 98765 incidents.","key_risks":[],"key_achievements":[],"strategic_priorities":[],"board_actions":[]}';
check('invented number', $facts, $jsonB, false, 'unknown_number:98765');

// C: reformatted number ("1.2 million") must be rejected (not a fact token).
$jsonC = '{"executive_headline":"Coverage is 92%","executive_summary":"Budget of 1.2 million.","key_risks":[],"key_achievements":[],"strategic_priorities":[],"board_actions":[]}';
check('reformatted number', $facts, $jsonC, false, 'unknown_number:1.2');
