<?php
declare(strict_types=1);
$_SERVER['CONTENT_LENGTH'] = 100;
require_once __DIR__ . '/../api/lib/bootstrap.php';
brig_read_json_input(10);