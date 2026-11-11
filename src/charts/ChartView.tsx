import { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
  type ChartOptions,
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import type { ChartSpec } from '../types';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, ArcElement, Tooltip, Legend, Filler);

const NAVY = '#102a3a';
const BRIDGE = '#075e65';
const ACCENT = '#087e83';
const SLATE = '#9db6b8';

function buildData(spec: ChartSpec) {
  const labels = spec.data.map((d) => d.label);
  const hasPrevious = spec.data.some((d) => d.previous !== undefined);
  const hasTarget = spec.data.some((d) => d.target !== undefined);

  if (spec.type === 'before_after' && hasPrevious) {
    return {
      labels,
      datasets: [
        { label: 'Previous', data: spec.data.map((d) => d.previous ?? 0), backgroundColor: SLATE, borderColor: SLATE, borderWidth: 0 },
        { label: 'Current', data: spec.data.map((d) => d.value), backgroundColor: BRIDGE, borderColor: BRIDGE, borderWidth: 0 },
      ],
    };
  }
  if (spec.type === 'target_bar' && hasTarget) {
    return {
      labels,
      datasets: [
        { label: 'Actual', data: spec.data.map((d) => d.value), backgroundColor: BRIDGE },
        { label: 'Target', data: spec.data.map((d) => d.target ?? 0), backgroundColor: ACCENT },
      ],
    };
  }
  if ((spec.type === 'grouped_bar') && hasPrevious) {
    return {
      labels,
      datasets: [
        { label: 'Previous', data: spec.data.map((d) => d.previous ?? 0), backgroundColor: SLATE },
        { label: 'Current', data: spec.data.map((d) => d.value), backgroundColor: BRIDGE },
      ],
    };
  }
  // Single-series (bar / line / horizontal_bar / targets)
  const palette = spec.data.map((_, i) => (i % 2 === 0 ? BRIDGE : ACCENT));
  return {
    labels,
    datasets: [
      {
        label: spec.title,
        data: spec.data.map((d) => d.value),
        backgroundColor: spec.type === 'line' ? ACCENT : palette,
        borderColor: spec.type === 'line' ? ACCENT : NAVY,
        borderWidth: spec.type === 'line' ? 2 : 0,
        fill: false,
        tension: 0.25,
      },
    ],
  };
}

function optionsFor(spec: ChartSpec): ChartOptions {
  const horizontal = spec.type === 'horizontal_bar';
  return {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: horizontal ? 'y' : 'x',
    plugins: {
      legend: { display: spec.data.some((d) => d.previous !== undefined || d.target !== undefined), position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } },
      tooltip: { enabled: true },
    },
    scales: horizontal
      ? { x: { beginAtZero: true, grid: { color: '#eef2f7' } }, y: { grid: { display: false } } }
      : { y: { beginAtZero: spec.type !== 'line', grid: { color: '#eef2f7' } }, x: { grid: { display: false } } },
  };
}

export function ChartView({ spec }: { spec: ChartSpec }) {
  const data = useMemo(() => buildData(spec), [spec]);
  const options = useMemo(() => optionsFor(spec), [spec]);

  const isLine = spec.type === 'line' || spec.type === 'area';
  const isDonut = spec.type === 'donut';

  return (
    <figure className="chart-figure">
      <figcaption className="chart-caption">
        <span className="chart-title">{spec.title}</span>
        <span className="chart-subtitle">{spec.subtitle}</span>
      </figcaption>
      <div className="chart-canvas" role="img" aria-label={spec.accessibilityText}>
        {isLine ? (
          <Line data={data as never} options={options as never} aria-label={spec.accessibilityText} />
        ) : isDonut ? (
          <Doughnut data={data as never} options={{ responsive: true, maintainAspectRatio: false }} aria-label={spec.accessibilityText} />
        ) : (
          <Bar data={data as never} options={options as never} aria-label={spec.accessibilityText} />
        )}
      </div>
      <details className="chart-data-alt">
        <summary>Data table</summary>
        <table>
          <thead>
            <tr>
              <th scope="col">Item</th>
              <th scope="col">Value</th>
              {spec.data.some((d) => d.previous !== undefined) && <th scope="col">Previous</th>}
            </tr>
          </thead>
          <tbody>
            {spec.data.map((d, i) => (
              <tr key={i}>
                <td>{d.label}</td>
                <td>{Math.round(d.value * 100) / 100}</td>
                {spec.data.some((x) => x.previous !== undefined) && <td>{d.previous !== undefined ? Math.round(d.previous * 100) / 100 : '—'}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
