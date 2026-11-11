-- CISO Board Reporting Intelligence Generator (BRIG)
-- MySQL 8.x schema. Import via phpMyAdmin on cPanel.
SET NAMES utf8mb4;
SET time_zone = '+00:00';

CREATE TABLE IF NOT EXISTS metric_categories (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  category_key VARCHAR(64) NOT NULL UNIQUE,
  label VARCHAR(160) NOT NULL,
  letter CHAR(1) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS metric_definitions (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  metric_key VARCHAR(96) NOT NULL UNIQUE,
  name VARCHAR(200) NOT NULL,
  short_name VARCHAR(120) NULL,
  category_key VARCHAR(64) NOT NULL,
  definition TEXT NOT NULL,
  executive_meaning TEXT NOT NULL,
  board_question VARCHAR(400) NULL,
  unit VARCHAR(32) NOT NULL,
  data_type VARCHAR(32) NOT NULL,
  directionality VARCHAR(32) NOT NULL,
  board_relevance TINYINT NOT NULL DEFAULT 3,
  trend_relevance TINYINT NOT NULL DEFAULT 3,
  risk_relevance TINYINT NOT NULL DEFAULT 3,
  materiality_weight DECIMAL(5,4) NULL,
  regulatory_relevance TINYINT NULL,
  visualization_json JSON NULL,
  story_tags_json JSON NULL,
  related_metric_keys_json JSON NULL,
  caveats_json JSON NULL,
  version VARCHAR(16) NOT NULL DEFAULT '1.0.0',
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_category (category_key),
  INDEX idx_active (active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS metric_relationships (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  rule_key VARCHAR(96) NOT NULL UNIQUE,
  metric_a_key VARCHAR(96) NOT NULL,
  metric_b_key VARCHAR(96) NOT NULL,
  relationship_type VARCHAR(40) NOT NULL,
  pattern VARCHAR(40) NULL,
  strength DECIMAL(4,3) NOT NULL DEFAULT 0.500,
  interpretation TEXT NULL,
  confidence_level VARCHAR(16) NULL,
  version VARCHAR(16) NOT NULL DEFAULT '1.0.0',
  active TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS metric_story_rules (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  rule_key VARCHAR(96) NOT NULL UNIQUE,
  name VARCHAR(200) NOT NULL,
  priority INT NOT NULL DEFAULT 50,
  storyline_key VARCHAR(96) NOT NULL,
  storyline_title VARCHAR(240) NULL,
  severity VARCHAR(16) NOT NULL DEFAULT 'info',
  condition_json JSON NULL,
  message_templates_json JSON NULL,
  chart_recommendations_json JSON NULL,
  action_templates_json JSON NULL,
  counter_signals_json JSON NULL,
  version VARCHAR(16) NOT NULL DEFAULT '1.0.0',
  active TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS metric_thresholds (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  metric_key VARCHAR(96) NOT NULL,
  threshold_type VARCHAR(32) NOT NULL,
  value DECIMAL(18,4) NULL,
  context_note VARCHAR(400) NULL,
  version VARCHAR(16) NOT NULL DEFAULT '1.0.0',
  INDEX idx_metric (metric_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS metric_framework_mappings (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  metric_key VARCHAR(96) NOT NULL,
  framework VARCHAR(64) NOT NULL,
  reference VARCHAR(120) NOT NULL,
  mapping_note VARCHAR(400) NULL,
  version VARCHAR(16) NOT NULL DEFAULT '1.0.0',
  INDEX idx_metric (metric_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS methodology_versions (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  methodology_version VARCHAR(16) NOT NULL,
  metric_library_version VARCHAR(16) NOT NULL,
  rule_version VARCHAR(16) NOT NULL,
  materiality_weights_json JSON NULL,
  changelog TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS llm_provider_config (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  provider_key VARCHAR(40) NOT NULL UNIQUE,
  provider_name VARCHAR(80) NOT NULL,
  model_id VARCHAR(120) NOT NULL,
  endpoint VARCHAR(300) NOT NULL,
  enabled TINYINT(1) NOT NULL DEFAULT 0,
  active_for_public_demo TINYINT(1) NOT NULL DEFAULT 0,
  privacy_class VARCHAR(48) NOT NULL DEFAULT 'unknown',
  data_retention_summary VARCHAR(400) NULL,
  training_use_summary VARCHAR(400) NULL,
  provider_policy_url VARCHAR(300) NULL,
  current_limits_note VARCHAR(300) NULL,
  minute_request_limit INT NULL,
  daily_request_limit INT NULL,
  monthly_request_limit INT NULL,
  input_token_limit INT NULL,
  output_token_limit INT NULL,
  timeout_seconds INT NOT NULL DEFAULT 30,
  max_retries INT NOT NULL DEFAULT 2,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS application_settings (
  setting_key VARCHAR(80) NOT NULL PRIMARY KEY,
  setting_value VARCHAR(400) NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS saved_reports (
  id CHAR(36) PRIMARY KEY,
  organisation_label VARCHAR(200) NULL,
  reporting_period VARCHAR(80) NULL,
  audience VARCHAR(40) NULL,
  executive_status VARCHAR(40) NULL,
  confidence VARCHAR(40) NULL,
  report_facts_json JSON NOT NULL,
  narrative_json JSON NULL,
  report_model_json JSON NULL,
  access_token_hash CHAR(64) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NULL,
  INDEX idx_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS report_versions (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  saved_report_id CHAR(36) NOT NULL,
  version_number INT NOT NULL,
  methodology_version VARCHAR(16) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_report (saved_report_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

