import type { Directionality, MetricDefinition } from '../types';

export type MoveInterpretation = 'improving' | 'deteriorating' | 'stable' | 'mixed' | 'unknown';

/**
 * Evaluate whether a movement is an improvement or deterioration given the
 * metric's declared directionality (spec §11). The engine must never apply a
 * blanket "up = bad" / "down = good" rule.
 */
export function interpretMovement(
  metric: MetricDefinition,
  current: number | null,
  previous: number | null,
  target: number | null,
): MoveInterpretation {
  if (current === null || previous === null) return 'unknown';
  const delta = current - previous;
  if (Math.abs(delta) < 1e-9) return 'stable';

  const dir: Directionality = metric.directionality;

  switch (dir) {
    case 'higher_is_better':
      return delta > 0 ? 'improving' : 'deteriorating';
    case 'lower_is_better':
      return delta < 0 ? 'improving' : 'deteriorating';
    case 'target_value':
    case 'target_range': {
      const t = target ?? (metric.target_range ? (metric.target_range[0] + metric.target_range[1]) / 2 : null);
      if (t === null) return 'mixed';
      const before = Math.abs(previous - t);
      const after = Math.abs(current - t);
      if (Math.abs(after - before) < 1e-9) return 'stable';
      return after < before ? 'improving' : 'deteriorating';
    }
    case 'context_dependent':
    case 'not_directional':
    default:
      // Movement is real but its goodness depends on context the engine does
      // not assume. Report "mixed": direction is noted, judgement is withheld.
      return 'mixed';
  }
}

/** Breach test against a user-supplied threshold, respecting directionality. */
export function isThresholdBreached(
  metric: MetricDefinition,
  current: number | null,
  threshold: number | null,
): boolean {
  if (current === null || threshold === null) return false;
  if (metric.directionality === 'lower_is_better' || metric.directionality === 'target_value') {
    return current > threshold; // exceeding the acceptable limit
  }
  if (metric.directionality === 'higher_is_better') {
    return current < threshold; // falling below the acceptable floor
  }
  return false;
}

/** Signed distance to target (current - target); null when no target. */
export function targetGap(current: number | null, target: number | null): number | null {
  if (current === null || target === null) return null;
  return current - target;
}

export function directionWord(move: MoveInterpretation): string {
  switch (move) {
    case 'improving':
      return 'improving';
    case 'deteriorating':
      return 'deteriorating';
    case 'stable':
      return 'stable';
    case 'mixed':
      return 'mixed / context-dependent';
    default:
      return 'insufficient comparison data';
  }
}
