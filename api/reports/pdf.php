<?php
declare(strict_types=1);
require_once __DIR__ . '/../lib/bootstrap.php';
require_once __DIR__ . '/../lib/pdf_template.php';
require_once __DIR__ . '/../lib/pdf_filepdf.php';

/**
 * POST /api/reports/pdf.php  { model: <report model> }
 * Renders the one-page Board report to PDF using File_PDF when available.
 *
 * If File_PDF is not available (class not on the include path / not configured),
 * it returns the same report as a print-ready HTML document with a banner, so
 * the feature degrades gracefully. No browser automation is used.
 */
brig_require_method('POST');

$body = brig_read_json_input();
$model = $body['model'] ?? null;
if (!is_array($model) || !isset($model['narrative'])) {
    brig_error('A valid report model is required.', 400, 'invalid_model');
}

$safe = preg_replace('/[^a-z0-9]+/', '-', strtolower((string) ($model['profile']['organisationLabel'] ?? 'board'))) ?: 'board';
$period = preg_replace('/[^a-z0-9]+/', '-', strtolower((string) ($model['profile']['reportingPeriod'] ?? '')));
$filename = trim('ciso-board-report-' . $safe . '-' . $period, '-') . '.pdf';

$pdfBytes = brig_render_report_pdf_filepdf($model);
if (is_string($pdfBytes) && strlen($pdfBytes) > 4) {
    header('Content-Type: application/pdf');
    header('Content-Disposition: inline; filename="' . $filename . '"');
    header('Cache-Control: no-store');
    echo $pdfBytes;
    exit;
}

// Fallback: printable HTML (browser Print -> Save as PDF).
$html = brig_render_report_html($model);
$banner = '<div style="background:#fdf3e2;border:1px solid #efd9ad;color:#a86a12;'
    . 'font-family:Arial,sans-serif;font-size:11px;padding:6px 10px;margin:0 0 8px">'
    . 'File_PDF is not available on the server; showing the print-ready report. Use your browser Print &rarr; Save as PDF, '
    . 'or install the File_PDF class (or set pdf.file_pdf_path) to enable server-side PDF.</div>';
$htmlWithBanner = str_replace('<body>', '<body>' . $banner, $html);

header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: no-store');
echo $htmlWithBanner;
