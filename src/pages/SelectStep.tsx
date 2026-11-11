import { useMemo, useState } from 'react';
import { useBrig } from '../state/BrigContext';
import { CATEGORIES, boardEssentials } from '../data/library';
import type { Directionality } from '../types';
import { Button, SectionCard } from '../ui/components';

const DIR_LABEL: Record<Directionality, string> = {
  higher_is_better: 'Higher is better',
  lower_is_better: 'Lower is better',
  target_range: 'Target range',
  target_value: 'Target value',
  context_dependent: 'Context-dependent',
  not_directional: 'Not directional',
};

export function SelectStep() {
  const { state, dispatch, library, selectedCount } = useBrig();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('all');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return library.filter((m) => {
      if (category !== 'all' && m.category !== category) return false;
      if (!q) return true;
      return (
        m.name.toLowerCase().includes(q) ||
        m.metric_key.toLowerCase().includes(q) ||
        m.definition.toLowerCase().includes(q) ||
        m.story_tags.some((t) => t.includes(q))
      );
    });
  }, [library, search, category]);

  const grouped = useMemo(() => {
    return CATEGORIES.map((cat) => ({
      cat,
      metrics: filtered.filter((m) => m.category === cat.key),
    })).filter((g) => g.metrics.length > 0);
  }, [filtered]);

  const applyEssentials = () => dispatch({ type: 'SET_SELECTED', keys: boardEssentials().map((m) => m.metric_key) });
  const clearAll = () => dispatch({ type: 'SET_SELECTED', keys: [] });

  return (
    <div className="page">
      <SectionCard
        title="Select metrics"
        subtitle="Choose only the metrics for which you have numbers. Use search and category filters, or start from the editable Board Essentials preset."
      >
        <div className="select-toolbar">
          <input
            className="input search-input"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search 120 metrics by name, definition or tag…"
            aria-label="Search metrics"
          />
          <select className="input" value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Filter by category">
            <option value="all">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c.key} value={c.key}>{c.letter}. {c.label}</option>
            ))}
          </select>
          <div className="select-actions">
            <Button variant="secondary" onClick={applyEssentials}>Apply Board Essentials</Button>
            <Button variant="ghost" onClick={clearAll} disabled={selectedCount === 0}>Clear</Button>
          </div>
        </div>

        <p className="selected-count" aria-live="polite">
          <strong>{selectedCount}</strong> metric{selectedCount === 1 ? '' : 's'} selected
        </p>

        <div className="metric-groups">
          {grouped.map(({ cat, metrics }) => (
            <section key={cat.key} className="metric-group">
              <h3 className="metric-group-title">
                <span className="cat-letter">{cat.letter}</span> {cat.label}
                <span className="cat-count">{metrics.length}</span>
              </h3>
              <ul className="metric-list">
                {metrics.map((m) => {
                  const selected = state.selectedKeys.includes(m.metric_key);
                  return (
                    <li key={m.metric_key} className={`metric-item ${selected ? 'is-selected' : ''}`}>
                      <label className="metric-check">
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => dispatch({ type: 'TOGGLE_METRIC', key: m.metric_key })}
                        />
                        <span className="metric-name">
                          {m.name}
                          {m.board_essential && <span className="badge badge-essential" title="Recommended for a Board report">Board essential</span>}
                        </span>
                      </label>
                      <div className="metric-meta">
                        <span className="badge badge-unit">{m.unit}</span>
                        <span className={`badge badge-dir dir-${m.directionality}`}>{DIR_LABEL[m.directionality]}</span>
                      </div>
                      <details className="metric-def">
                        <summary>Definition &amp; context</summary>
                        <p>{m.definition}</p>
                        <p className="muted">{m.executive_meaning}</p>
                        {m.caveats.length > 0 && (
                          <p className="caveat">
                            <strong>Caveats:</strong> {m.caveats.join(' ')}
                          </p>
                        )}
                      </details>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
          {grouped.length === 0 && <p className="empty-note">No metrics match your search.</p>}
        </div>

        <div className="form-actions">
          <Button variant="ghost" onClick={() => dispatch({ type: 'SET_STEP', step: 'profile' })}>← Back</Button>
          <Button onClick={() => dispatch({ type: 'SET_STEP', step: 'entry' })} disabled={selectedCount === 0}>
            Enter data for {selectedCount} metric{selectedCount === 1 ? '' : 's'} →
          </Button>
        </div>
      </SectionCard>
    </div>
  );
}
