<?php
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

/**
 * Optional PDO connection. The API works without a database (knowledge base is
 * read from the JSON files in /data); MySQL is used for optional persistence
 * and, if seeded, as the authoritative metric source.
 */
function brig_db(): ?PDO
{
    static $pdo = null;
    static $tried = false;
    if ($tried) {
        return $pdo;
    }
    $tried = true;
    $cfg = brig_config()['db'] ?? [];
    if (empty($cfg['dsn'])) {
        return null;
    }
    try {
        $pdo = new PDO($cfg['dsn'], $cfg['user'] ?? null, $cfg['pass'] ?? null, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);
    } catch (Throwable $e) {
        error_log('[BRIG] DB connection failed: ' . $e->getMessage());
        $pdo = null;
    }
    return $pdo;
}

function brig_data_path(string $file): string
{
    return dirname(__DIR__, 2) . '/data/' . $file;
}

/** @return array<string,mixed>|null */
function brig_read_data(string $file): ?array
{
    $path = brig_data_path($file);
    if (!is_file($path)) {
        return null;
    }
    $json = file_get_contents($path);
    $data = json_decode($json ?: '', true);
    return is_array($data) ? $data : null;
}

/** @return array<int,array<string,mixed>> */
function brig_metric_definitions(): array
{
    // Prefer the DB if it is seeded; otherwise fall back to the JSON copy.
    $pdo = brig_db();
    if ($pdo !== null) {
        try {
            $rows = $pdo->query('SELECT * FROM metric_definitions WHERE active = 1')->fetchAll();
            if ($rows) {
                return array_map('brig_row_to_metric', $rows);
            }
        } catch (Throwable $e) {
            error_log('[BRIG] metric_definitions query failed: ' . $e->getMessage());
        }
    }
    $data = brig_read_data('metric-library.json');
    return $data['metrics'] ?? [];
}

/** @param array<string,mixed> $row @return array<string,mixed> */
function brig_row_to_metric(array $row): array
{
    $dec = static function ($v) {
        $d = json_decode((string) $v, true);
        return is_array($d) ? $d : [];
    };
    return [
        'metric_key' => $row['metric_key'],
        'name' => $row['name'],
        'category' => $row['category_key'],
        'definition' => $row['definition'],
        'executive_meaning' => $row['executive_meaning'],
        'unit' => $row['unit'],
        'data_type' => $row['data_type'],
        'directionality' => $row['directionality'],
        'board_relevance' => (int) $row['board_relevance'],
        'trend_relevance' => (int) $row['trend_relevance'],
        'risk_relevance' => (int) $row['risk_relevance'],
        'recommended_visualizations' => $dec($row['visualization_json'] ?? '[]'),
        'story_tags' => $dec($row['story_tags_json'] ?? '[]'),
        'related_metrics' => $dec($row['related_metric_keys_json'] ?? '[]'),
        'caveats' => $dec($row['caveats_json'] ?? '[]'),
        'version' => $row['version'],
        'active' => (bool) $row['active'],
    ];
}
