<?php
declare(strict_types=1);

/** A minimal FPDF-compatible File_PDF stub for endpoint testing only. */
class File_PDF
{
    public float $x = 12.0;
    public float $y = 12.0;
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
    public function Cell($w, $h = 0, $txt = '', $border = 0, $ln = 0, $align = ''): void { if ($ln) { $this->y += (float) $h; } }
    public function MultiCell($w, $h, $txt, $border = 0, $align = ''): void { $this->y += (float) $h; }
    public function Ln($h = null): void { $this->y += $h === null ? 5 : (float) $h; }
    public function Rect($x, $y, $w, $h, $style = ''): void {}
    public function Line($x1, $y1, $x2, $y2): void {}
    public function Output($dest = '', $name = ''): string { return "%PDF-1.4\n% stub\n%%EOF"; }
}
