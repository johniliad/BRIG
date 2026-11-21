import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('API contracts', () => {
  it('retrieves saved reports by JSON POST rather than URL credentials', () => {
    const php = readFileSync('api/reports/get.php', 'utf8');
    const client = readFileSync('src/services/reports.ts', 'utf8');
    expect(php).toContain("brig_require_method('POST')");
    expect(php).not.toContain('$_GET');
    expect(client).toContain("method: 'POST'");
    expect(client).not.toContain('get.php?id=');
  });

  it('enforces named application request limits on JSON endpoints', () => {
    for (const file of ['api/analyse.php', 'api/ai/unlock.php', 'api/llm/generate.php', 'api/reports/save.php', 'api/reports/get.php', 'api/reports/pdf.php']) {
      expect(readFileSync(file, 'utf8'), file).toContain('brig_request_limit(');
    }
  });
});