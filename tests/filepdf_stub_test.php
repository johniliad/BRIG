<?php
declare(strict_types=1);

/**
 * Development test: validates api/lib/pdf_filepdf.php against a minimal
 * FPDF-compatible stub (File_PDF is not installed in this environment).
 * Run: php tests/filepdf_stub_test.php
 */

class File_PDF
{
    public float $x = 12.0;
    public float $y = 12.0;
    public array $texts = [];

    public function __construct($o = 'P', $u = 'mm', $s = 'A4') {}
    public function SetMargins($l, $t, $r): void {}
    public function SetAutoPageBreak($b, $m): void {}
    public function AddPage($o = ''): void {}
    public function SetFont($f, $st = '', $sz = 0): void {}
    public function SetTextColor($r, $g = 0, $b = 0): void {}
    public function SetDrawColor($r, $g = 0, $b = 0): void {}
    public function SetFillColor($r, $g = 0, $b = 0): void {}
    public function SetLineWidth($w): void {}
    public function SetXY($x, $y): void { $this->x = (float) $x; $this->y = (float) $y; }
    public function SetX($x): void { $this->x = (float) $x; }
    public function GetY(): float { return $this->y; }
    public function Cell($w, $h = 0, $txt = '', $border = 0, $ln = 0, $align = ''): void
    {
        $this->texts[] = (string) $txt;
        if ($ln) { $this->y += (float) $h; }
    }
    public function MultiCell($w, $h, $txt, $border = 0, $align = ''): void
    {
        $this->texts[] = (string) $txt;
        $this->y += (float) $h;
    }
    public function Ln($h = null): void { $this->y += $h === null ? 5 : (float) $h; }
    public function Rect($x, $y, $w, $h, $style = ''): void {}
    public function Line($x1, $y1, $x2, $y2): void {}
    public function Output($dest = '', $name = ''): string
    {
        return "%PDF-1.4\n% File_PDF stub output\n%%EOF";
    }
}

require __DIR__ . '/../api/lib/pdf_filepdf.php';

$model = [
    'profile' => ['organisationLabel' => 'Demo Co', 'reportingPeriod' => 'Q3', 'comparisonPeriod' => 'Q2', 'audience' => 'general_board'],
    'executivePosition' => ['status' => 'Improving'],
    'confidence' => ['boardNarrativeConfidence' => 'High'],
    'narrative' => [
        'headline' => 'Threat activity increased, but response improved',
        'executiveMessage' => 'Context message with an arrow -> and an em dash - test.',
        'positiveDevelopments' => ['MTTD 11 -> 6', 'MFA up'],
        'keyRisks' => ['Supplier concentration high'],
        'priorities' => ['Close the resilience evidence gap'],
        'boardActions' => [['title' => 'Maintain course', 'rationale' => 'Evidence supports it']],
        'managementNote' => 'Confidence is high because two comparable periods were supplied.',
    ],
    'findings' => [['headline' => 'Critical vulnerabilities 70 -> 40', 'kind' => 'positive']],
    'charts' => [[
        'title' => 'Performance',
        'subtitle' => 'Current vs previous',
        'data' => [['label' => 'MTTD', 'value' => 6], ['label' => 'MTTR', 'value' => 8]],
    ]],
    'metadata' => ['methodology_version' => '1.0.0', 'metric_library_version' => '1.0.0', 'rule_version' => '1.0.0'],
];

$bytes = brig_render_report_pdf_filepdf($model);

if (!is_string($bytes) || strpos($bytes, '%PDF') !== 0) {
    fwrite(STDERR, "FAIL: File_PDF render did not return PDF bytes\n");
    exit(1);
}

echo 'OK — File_PDF renderer returned ' . strlen($bytes) . " bytes\n";
