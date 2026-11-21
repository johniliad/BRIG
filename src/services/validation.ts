import type { MetricDefinition, MetricObservation } from '../types';

export interface ObservationIssue {
  metricKey: string;
  message: string;
}

export interface ObservationValidation {
  errors: string[];
  warnings: string[];
}

export interface CompletenessSummary {
  selected: number;
  analysed: number;
  notApplicable: number;
  unavailable: number;
  missingCurrent: number;
  missingComparison: number;
  lowQuality: number;
  withReferences: number;
  errors: ObservationIssue[];
  warnings: ObservationIssue[];
}

function hasTwoSidedTolerance(obs: MetricObservation): boolean {
  return obs.lowerThreshold !== null && obs.upperThreshold !== null;
}

export function validateObservation(def: MetricDefinition, obs: MetricObservation): ObservationValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (obs.dataStatus === 'not_set') {
    errors.push('Choose a data status.');
    return { errors, warnings };
  }
  if (obs.dataStatus === 'not_applicable') return { errors, warnings };
  if (obs.dataStatus !== 'available') {
    if (!obs.methodologyNote?.trim()) errors.push('Explain why the metric is unavailable or not measured.');
    return { errors, warnings };
  }
  if (obs.current === null) errors.push('Current value is required when data is available.');
  if (def.directionality === 'target_value' && obs.target === null) errors.push('Target value is required for this metric.');
  if ((def.directionality === 'target_value' || def.directionality === 'target_range') && !hasTwoSidedTolerance(obs)) {
    errors.push('Lower and upper acceptable limits are required for this directionality.');
  }
  if (obs.lowerThreshold !== null && obs.upperThreshold !== null && obs.lowerThreshold > obs.upperThreshold) {
    errors.push('Lower acceptable limit cannot exceed the upper limit.');
  }
  if (obs.current !== null && obs.previous === null && !obs.comparisonMissingReason.trim()) {
    errors.push('Choose or enter a reason why comparison data is unavailable.');
  }
  if (obs.dataQuality === 'low' && !obs.methodologyNote?.trim()) {
    errors.push('Low-quality data requires a methodology or quality explanation.');
  }
  if (obs.benchmark !== null && !obs.benchmarkSource?.trim()) {
    errors.push('A benchmark source is required when a benchmark value is provided.');
  }
  if (obs.current !== null && def.unit === 'percent' && (obs.current < 0 || obs.current > 100)) {
    warnings.push('Percentage values are normally between 0 and 100.');
  }
  if (obs.previous !== null && def.unit === 'percent' && (obs.previous < 0 || obs.previous > 100)) {
    warnings.push('Comparison percentage is normally between 0 and 100.');
  }
  if (obs.current !== null && obs.current < 0 && !['currency', 'score', 'index'].includes(def.unit)) {
    warnings.push('A negative value is unusual for this metric; confirm it is intentional.');
  }
  if (obs.current !== null && obs.previous === null) {
    warnings.push(obs.target !== null || obs.threshold !== null || hasTwoSidedTolerance(obs)
      ? 'Current position can be assessed, but no trend or trajectory will be inferred.'
      : 'This value will be descriptive only because no comparison, target or tolerance was supplied.');
  }
  if (def.directionality === 'context_dependent' && obs.current !== null && obs.previous !== null && obs.current !== obs.previous && !obs.note.trim()) {
    errors.push('Context is required when a context-dependent metric changes.');
  }
  return { errors, warnings };
}

export function completenessSummary(
  keys: string[], observations: Record<string, MetricObservation>, library: MetricDefinition[],
): CompletenessSummary {
  const byKey = new Map(library.map((metric) => [metric.metric_key, metric]));
  const result: CompletenessSummary = {
    selected: keys.length, analysed: 0, notApplicable: 0, unavailable: 0, missingCurrent: 0,
    missingComparison: 0, lowQuality: 0, withReferences: 0, errors: [], warnings: [],
  };
  for (const key of keys) {
    const obs = observations[key];
    const def = byKey.get(key);
    if (!obs || !def) continue;
    if (obs.dataStatus === 'not_applicable') result.notApplicable++;
    else if (obs.dataStatus !== 'available') result.unavailable++;
    if (obs.dataStatus === 'available') {
      if (obs.current === null) result.missingCurrent++;
      else result.analysed++;
      if (obs.previous === null) result.missingComparison++;
      if (obs.dataQuality === 'low') result.lowQuality++;
      if (obs.previous !== null || obs.target !== null || obs.threshold !== null || hasTwoSidedTolerance(obs)) result.withReferences++;
    }
    const validation = validateObservation(def, obs);
    validation.errors.forEach((message) => result.errors.push({ metricKey: key, message }));
    validation.warnings.forEach((message) => result.warnings.push({ metricKey: key, message }));
  }
  return result;
}