import pptxgen from 'pptxgenjs';
import type { AiMeta, AnalysisResult, ChartSpec } from '../types';
import { BRAND_NAME } from '../data/demo';

/**
 * PPTX export. Mirrors the on-screen / PDF Board report: title, executive
 * position, KPI tiles, key signals, every chart (up to 3, with previous/target
 * series), positive developments, areas of concern, tensions, priorities,
 * board actions, and an appendix with methodology + AI disclosure.
 */
export interface PptxKpi {
  name: string;
  current: string;
  delta: string;
}

type TextRun = { text: string; options: Record<string, unknown> };

const NAVY = '102A3A';
const BRIDGE = '075E65';
const GREY = '526675';
const LIGHT = 'F3F7F8';
const BORDER = 'BFE0DD';
const POS = '1B7A3D';
const CON = 'A32D2D';

function chartTypeFor(t: ChartSpec['type']): string {
  if (t === 'line' || t === 'area' || t === 'sparkline') return 'line';
  if (t === 'donut') return 'doughnut';
  if (t === 'radar') return 'radar';
  return 'bar';
}

function buildChartData(spec: ChartSpec): Array<{ name: string; labels: string[]; values: number[] }> {
  const labels = spec.data.map((d) => d.label);
  const hasPrev = spec.data.some((d) => d.previous !== undefined);
  const hasTarget = spec.data.some((d) => d.target !== undefined);
  if ((spec.type === 'before_after' || spec.type === 'grouped_bar' || spec.type === 'stacked_bar') && hasPrev) {
    return [
      { name: 'Previous', labels, values: spec.data.map((d) => d.previous ?? 0) },
      { name: 'Current', labels, values: spec.data.map((d) => d.value) },
    ];
  }
  if (spec.type === 'target_bar' && hasTarget) {
    return [
      { name: 'Actual', labels, values: spec.data.map((d) => d.value) },
      { name: 'Target', labels, values: spec.data.map((d) => d.target ?? 0) },
    ];
  }
  return [{ name: spec.title, labels, values: spec.data.map((d) => d.value) }];
}

export async function exportPptx(
  analysis: AnalysisResult,
  organisationLabel: string,
  ai?: AiMeta,
  kpis?: PptxKpi[],
): Promise<void> {
  const pptx = new pptxgen();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.author = 'BRIG';
  pptx.company = 'Iliadis Tools4U';
  pptx.title = `${BRAND_NAME} — Board Report`;

  let pageNo = 0;
  const addHeader = (slide: pptxgen.Slide, title: string) => {
    pageNo += 1;
    slide.addText(title, { x: 0.5, y: 0.35, w: 12.3, h: 0.7, fontSize: 22, bold: true, color: NAVY, fontFace: 'Calibri' });
    slide.addShape('line' as never, { x: 0.5, y: 1.05, w: 12.3, h: 0, line: { color: BRIDGE, width: 1.5 } } as never);
    slide.addText('CISO Board Reporting Intelligence Generator', { x: 0.5, y: 7.05, w: 8, h: 0.3, fontSize: 8, color: GREY });
    slide.addText(`Illustrative analysis — not an audit or certification · ${pageNo}`, {
      x: 7.0, y: 7.05, w: 5.8, h: 0.3, fontSize: 8, color: GREY, align: 'right',
    });
  };
  const bullets = (items: string[], fallback: string): TextRun[] =>
    items.length
      ? items.map((t) => ({ text: `• ${t}`, options: { fontSize: 12, color: GREY, breakLine: true, paraSpaceAfter: 6 } }))
      : [{ text: fallback, options: { fontSize: 12, color: GREY } }];

  const { profile, executivePosition, primaryStoryline, narrative, contradictions, charts, confidence } = analysis;

  // Slide 1 — title
  const s1 = pptx.addSlide();
  s1.background = { color: LIGHT };
  s1.addText(BRAND_NAME, { x: 0.6, y: 2.0, w: 12.1, h: 1.0, fontSize: 30, bold: true, color: NAVY });
  s1.addText(organisationLabel, { x: 0.6, y: 3.05, w: 12.1, h: 0.5, fontSize: 18, color: BRIDGE });
  s1.addText(`${profile.comparisonPeriod} → ${profile.reportingPeriod} · ${profile.audience.replace(/_/g, ' ')} · ${profile.industry}`, {
    x: 0.6, y: 3.6, w: 12.1, h: 0.4, fontSize: 13, color: GREY,
  });
  s1.addText('Application-derived analysis — not an audit or certification. If generated from demo data, all figures are fictional.', {
    x: 0.6, y: 6.8, w: 12.1, h: 0.4, fontSize: 9, color: GREY, italic: true,
  });

  // Slide 2 — executive position
  const s2 = pptx.addSlide();
  addHeader(s2, 'Executive cybersecurity position');
  s2.addText(`Status: ${executivePosition.status}`, { x: 0.5, y: 1.3, w: 12.3, h: 0.5, fontSize: 18, bold: true, color: BRIDGE });
  s2.addText(narrative.headline, { x: 0.5, y: 1.9, w: 12.3, h: 0.9, fontSize: 16, bold: true, color: NAVY });
  s2.addText(narrative.executiveMessage, { x: 0.5, y: 2.9, w: 12.3, h: 3.0, fontSize: 12, color: GREY, valign: 'top' });
  if (ai?.enabled) {
    s2.addText(
      `Executive wording enhanced by ${ai.provider ?? 'AI'}${ai.model ? ` · ${ai.model}` : ''}; figures and findings are deterministic.`,
      { x: 0.5, y: 5.95, w: 12.3, h: 0.4, fontSize: 9, color: GREY, italic: true },
    );
  }
  s2.addText(`Board Narrative Confidence: ${confidence.boardNarrativeConfidence}`, { x: 0.5, y: 6.5, w: 12.3, h: 0.4, fontSize: 11, color: BRIDGE });
  s2.addNotes('Open with the headline and overall position. Emphasise that the status is an application-derived summary based on the supplied metrics, not an objective cyber-risk rating.');

  // Slide 3 — key metrics (KPI tiles, as in the report)
  const sK = pptx.addSlide();
  addHeader(sK, 'Key metrics');
  const tiles = (kpis ?? []).slice(0, 4);
  if (tiles.length) {
    const tileW = 2.9;
    const gap = 0.2;
    const x0 = 0.5;
    const y0 = 1.6;
    tiles.forEach((k, i) => {
      const x = x0 + i * (tileW + gap);
      sK.addShape('roundRect' as never, { x, y: y0, w: tileW, h: 1.9, fill: { color: LIGHT }, line: { color: BORDER, width: 1 } } as never);
      sK.addText(k.name, { x: x + 0.15, y: y0 + 0.12, w: tileW - 0.3, h: 0.7, fontSize: 11, bold: true, color: NAVY, valign: 'top' });
      sK.addText(k.current, { x: x + 0.15, y: y0 + 0.8, w: tileW - 0.3, h: 0.6, fontSize: 20, bold: true, color: BRIDGE });
      sK.addText(k.delta, { x: x + 0.15, y: y0 + 1.45, w: tileW - 0.3, h: 0.35, fontSize: 10, color: GREY });
    });
  } else {
    sK.addText('No key metrics were selected.', { x: 0.5, y: 1.6, w: 12.3, h: 0.5, fontSize: 12, color: GREY });
  }

  // Slide 4 — key signals
  const s3 = pptx.addSlide();
  addHeader(s3, 'Key signals this period');
  const findingRows = analysis.findings.slice(0, 6).map((f) => ({
    text: `• ${f.kind === 'positive' ? '▲' : f.kind === 'concern' ? '▼' : '•'} ${f.headline}`,
    options: { fontSize: 12, color: f.kind === 'concern' ? CON : f.kind === 'positive' ? POS : GREY, breakLine: true, paraSpaceAfter: 6 },
  }));
  s3.addText(
    (findingRows.length ? findingRows : [{ text: 'No material changes detected on the selected metrics.', options: { fontSize: 12, color: GREY } }]) as never,
    { x: 0.5, y: 1.3, w: 12.3, h: 5.2, valign: 'top' },
  );

  // Charts — one slide per chart (up to 3), matching the report's graphics
  const chartSpecs = charts.slice(0, 3);
  if (chartSpecs.length === 0) {
    const sC = pptx.addSlide();
    addHeader(sC, 'Security performance and resilience');
    sC.addText('Insufficient comparative data for a chart.', { x: 0.5, y: 1.3, w: 12.3, h: 0.6, fontSize: 12, color: GREY });
  }
  chartSpecs.forEach((chart) => {
    const sC = pptx.addSlide();
    addHeader(sC, chart.title || 'Security performance and resilience');
    if (chart.subtitle) {
      sC.addText(chart.subtitle, { x: 0.5, y: 1.18, w: 12.3, h: 0.4, fontSize: 10, color: GREY, italic: true });
    }
    if (chart.data.length >= 2) {
      sC.addChart(chartTypeFor(chart.type) as never, buildChartData(chart) as never, {
        x: 0.5, y: 1.65, w: 12, h: 4.9, showValue: true, catAxisLabelFontSize: 10, valAxisLabelFontSize: 10, legendPos: 'b',
      } as never);
    } else {
      sC.addText('Insufficient comparative data for this chart.', { x: 0.5, y: 1.65, w: 12.3, h: 0.6, fontSize: 12, color: GREY });
    }
    if (chart.accessibilityText) sC.addNotes(chart.accessibilityText);
  });

  // Positive developments & areas of concern (the report's two columns)
  const sPC = pptx.addSlide();
  addHeader(sPC, 'Positive developments and areas of concern');
  sPC.addText('Positive developments', { x: 0.5, y: 1.25, w: 6, h: 0.4, fontSize: 13, bold: true, color: POS });
  sPC.addText(bullets(narrative.positiveDevelopments.slice(0, 5), 'None identified.') as never, { x: 0.5, y: 1.7, w: 6, h: 4.9, valign: 'top' });
  sPC.addText('Areas of concern', { x: 6.7, y: 1.25, w: 6.1, h: 0.4, fontSize: 13, bold: true, color: CON });
  sPC.addText(bullets(narrative.keyRisks.slice(0, 5), 'None identified.') as never, { x: 6.7, y: 1.7, w: 6.1, h: 4.9, valign: 'top' });

  // Tensions / contradictions (only if present)
  if (contradictions.length > 0) {
    const sT = pptx.addSlide();
    addHeader(sT, 'Tensions and contradictions');
    const tensionItems: TextRun[] = contradictions.slice(0, 6).map((c) => ({
      text: `• ${c.title}${c.explanation ? ` — ${c.explanation.slice(0, 180)}` : ''}`,
      options: { fontSize: 11, color: GREY, breakLine: true, paraSpaceAfter: 8 },
    }));
    sT.addText(tensionItems as never, { x: 0.5, y: 1.3, w: 12.3, h: 5.2, valign: 'top' });
  }

  // Strategic priorities & board actions
  const s6 = pptx.addSlide();
  addHeader(s6, 'Board priorities and decisions');
  const prioItems = narrative.priorities.slice(0, 5).map((p) => ({
    text: `• ${p}`,
    options: { fontSize: 12, color: NAVY, breakLine: true, paraSpaceAfter: 8 },
  }));
  s6.addText('Priorities', { x: 0.5, y: 1.25, w: 12.3, h: 0.4, fontSize: 13, bold: true, color: BRIDGE });
  s6.addText((prioItems.length ? prioItems : [{ text: '—', options: { fontSize: 12 } }]) as never, { x: 0.5, y: 1.7, w: 12.3, h: 2.6, valign: 'top' });
  const actionItems = narrative.boardActions.map((a) => ({
    text: a.rationale ? `• ${a.title} — ${a.rationale}` : `• ${a.title}`,
    options: { fontSize: 11, color: GREY, breakLine: true, paraSpaceAfter: 6 },
  }));
  s6.addText('Board actions', { x: 0.5, y: 4.4, w: 12.3, h: 0.4, fontSize: 13, bold: true, color: BRIDGE });
  s6.addText(actionItems as never, { x: 0.5, y: 4.85, w: 12.3, h: 1.9, valign: 'top' });
  s6.addNotes('Frame the asks as decisions for the Board: what to maintain, redirect, accelerate or review. Each action is derived deterministically from the evidence.');

  // Appendix — methodology & disclosures
  const s7 = pptx.addSlide();
  addHeader(s7, 'Appendix — methodology and disclosures');
  const aiDisclosure = ai?.enabled
    ? [
        {
          text: `Executive wording enhanced using an external generative AI service${ai.provider ? ` (${ai.provider}${ai.model ? ' · ' + ai.model : ''})` : ''}; underlying calculations and analytical findings are generated by the application.`,
          options: { fontSize: 9, color: GREY, italic: true, breakLine: true, paraSpaceAfter: 8 },
        },
      ]
    : [];
  s7.addText(
    [
      { text: `Principal storyline: ${primaryStoryline.title}`, options: { fontSize: 11, color: NAVY, breakLine: true, paraSpaceAfter: 4 } },
      { text: narrative.managementNote, options: { fontSize: 10, color: GREY, breakLine: true, paraSpaceAfter: 8 } },
      {
        text: `Methodology ${analysis.metadata.methodology_version} · Metric library ${analysis.metadata.metric_library_version} · Rules ${analysis.metadata.rule_version} · Generated ${new Date(analysis.metadata.generated_at).toLocaleString()}`,
        options: { fontSize: 10, color: GREY, breakLine: true, paraSpaceAfter: 8 },
      },
      ...aiDisclosure,
      {
        text: 'This application is independently developed. It is an analytical and executive communication aid, not a cybersecurity audit, certification, legal or regulatory advice, or a substitute for professional judgement. Results depend on the quality of user-supplied data. Inferred relationships are analytical signals, not proof of causality.',
        options: { fontSize: 9, color: GREY, italic: true },
      },
    ] as never,
    { x: 0.5, y: 1.3, w: 12.3, h: 5.2, valign: 'top' },
  );

  const safe = organisationLabel.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'board';
  await pptx.writeFile({ fileName: `ciso-board-report-${safe}-${profile.reportingPeriod.replace(/[^a-z0-9]+/gi, '-')}.pptx`.toLowerCase() });
}
