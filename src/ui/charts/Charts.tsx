import { useRef, useState, type ReactNode } from 'react';
import { HEAT_LEVELS, type HeatCell } from '../../domain/reports';
import { formatDuration, HOUR, MINUTE } from '../../domain/time';
import './charts.css';

/**
 * Hand-built charts in the LOCK IN palette. Conventions: thin columns (≤24px) with a 4px rounded
 * cap on a single baseline, recessive gridlines, values in text colours (never the series colour),
 * selective direct labels (peak + current), a hover/focus tooltip on every mark, and a hidden
 * table so every value is reachable without the tooltip.
 */

interface Tip {
  x: number;
  y: number;
  value: string;
  label: string;
}

function useTooltip() {
  const box = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<Tip | null>(null);
  const show = (el: Element, value: string, label: string) => {
    const host = box.current?.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    if (!host) return;
    setTip({ x: r.left - host.left + r.width / 2, y: r.top - host.top, value, label });
  };
  const node = tip && (
    <div className="chart-tip" style={{ left: tip.x, top: tip.y }} role="presentation">
      <strong>{tip.value}</strong>
      <span>{tip.label}</span>
    </div>
  );
  return { box, show, hide: () => setTip(null), node };
}

/** Clean axis steps for durations. */
const STEPS = [15, 30, 60, 120, 180, 300, 600, 1200, 3000, 6000].map((m) => m * MINUTE);
function niceScale(max: number) {
  const step = STEPS.find((s) => max / s <= 4) ?? Math.ceil(max / 4 / (100 * HOUR)) * 100 * HOUR;
  const top = Math.max(step, Math.ceil(max / step) * step);
  return { top, ticks: Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step) };
}
const tickLabel = (ms: number) => (ms === 0 ? '0' : ms < HOUR ? `${ms / MINUTE}m` : `${+(ms / HOUR).toFixed(1)}h`);

export interface ColumnDatum {
  key: string;
  /** Axis label; empty string to skip (thinning). */
  axis: string;
  /** Full label for the tooltip and table. */
  label: string;
  ms: number;
  current?: boolean;
}

export function ColumnChart({ data, title, goalMs, height = 220 }: { data: ColumnDatum[]; title: string; goalMs?: number; height?: number }) {
  const { box, show, hide, node } = useTooltip();
  const max = Math.max(...data.map((d) => d.ms), goalMs ?? 0, 30 * MINUTE);
  const { top, ticks } = niceScale(max);
  const peak = data.reduce((best, d) => (d.ms > best.ms ? d : best), data[0]);
  const empty = data.every((d) => !d.ms);

  return (
    <div className="chart" ref={box}>
      <div className="col-chart" style={{ height }} role="img" aria-label={`${title}. ${empty ? 'No focus time in this range.' : `Peak ${formatDuration(peak.ms)} on ${peak.label}.`}`}>
        <div className="col-chart__grid" aria-hidden>
          {ticks.map((t) => (
            <div key={t} className="col-chart__tick" style={{ bottom: `${(t / top) * 100}%` }}>
              <span>{tickLabel(t)}</span>
            </div>
          ))}
          {goalMs ? <div className="col-chart__goal" style={{ bottom: `${(goalMs / top) * 100}%` }} title={`Daily goal ${formatDuration(goalMs)}`} /> : null}
        </div>
        <div className="col-chart__plot">
          {data.map((d) => {
            const labelled = d.ms > 0 && (d === peak || d.current);
            return (
              <div
                key={d.key}
                className={`col ${d.current ? 'is-current' : ''}`}
                tabIndex={0}
                onPointerEnter={(e) => show(e.currentTarget.querySelector('.col__bar') ?? e.currentTarget, formatDuration(d.ms), d.label)}
                onPointerLeave={hide}
                onFocus={(e) => show(e.currentTarget.querySelector('.col__bar') ?? e.currentTarget, formatDuration(d.ms), d.label)}
                onBlur={hide}
                aria-label={`${d.label}: ${formatDuration(d.ms)}`}
              >
                <div className="col__bar" style={{ height: `${(d.ms / top) * 100}%` }}>
                  {labelled && <span className="col__value">{formatDuration(d.ms)}</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="col-chart__axis" aria-hidden>
        {data.map((d) => (
          <span key={d.key} className={d.current ? 'is-current' : undefined}>
            {d.axis}
          </span>
        ))}
      </div>
      {node}
      <table className="sr-only">
        <caption>{title}</caption>
        <tbody>
          {data.map((d) => (
            <tr key={d.key}>
              <th>{d.label}</th>
              <td>{formatDuration(d.ms)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export interface BarDatum {
  key: string;
  name: string;
  color: string;
  ms: number;
  share: number;
  count: number;
}

/** Horizontal bars, always direct-labelled with name and value (identity never by colour alone). */
export function SubjectBars({ data }: { data: BarDatum[] }) {
  const max = Math.max(...data.map((d) => d.ms), 1);
  return (
    <ul className="hbars" aria-label="Focus time by subject">
      {data.map((d) => (
        <li key={d.key} className="hbar">
          <div className="hbar__label">
            <span className="dot" style={{ background: d.color }} aria-hidden />
            <span className="hbar__name">{d.name}</span>
            <span className="hbar__value num">
              {formatDuration(d.ms)} <span className="faint">· {Math.round(d.share * 100)}%</span>
            </span>
          </div>
          <div className="hbar__track" aria-hidden>
            <i style={{ width: `${(d.ms / max) * 100}%`, background: d.color }} />
          </div>
          <span className="sr-only">
            {d.name}: {formatDuration(d.ms)}, {Math.round(d.share * 100)} percent, {d.count} sessions
          </span>
        </li>
      ))}
    </ul>
  );
}

const DOW = ['Mon', '', 'Wed', '', 'Fri', '', ''];

export function Heatmap({ grid }: { grid: HeatCell[][] }) {
  const { box, show, hide, node } = useTooltip();
  // Month label above the first week that starts in a new month.
  const months = grid.map((week, i) => {
    const m = new Date(week[0].t).getMonth();
    return i === 0 || new Date(grid[i - 1][0].t).getMonth() !== m ? new Date(week[0].t).toLocaleDateString(undefined, { month: 'short' }) : '';
  });
  const fullDate = (t: number) => new Date(t).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  const active = grid.flat().filter((c) => c.ms > 0).length;

  return (
    <div className="chart heat" ref={box}>
      <div className="heat__scroll">
        <div className="heat__grid" style={{ gridTemplateColumns: `28px repeat(${grid.length}, var(--cell))` }} role="img" aria-label={`Study consistency: ${active} active days in the last ${grid.length} weeks`}>
          <span />
          {months.map((m, i) => (
            <span key={i} className="heat__month">
              {m}
            </span>
          ))}
          {DOW.map((d, row) => (
            <Row key={row} label={d} cells={grid.map((w) => w[row])} onShow={(el, c) => show(el, c.ms ? formatDuration(c.ms) : 'No focus', fullDate(c.t))} onHide={hide} />
          ))}
        </div>
      </div>
      <div className="heat__legend" aria-hidden>
        <span className="faint small">Less</span>
        {[0, ...HEAT_LEVELS.map((_, i) => i + 1)].map((l) => (
          <i key={l} className={`heat__cell lvl-${l}`} title={l ? HEAT_LEVELS[l - 1].label : 'no focus'} />
        ))}
        <span className="faint small">More</span>
        <span className="faint small heat__key">{HEAT_LEVELS.map((l) => l.label).join(' · ')}</span>
      </div>
      {node}
    </div>
  );
}

function Row({ label, cells, onShow, onHide }: { label: string; cells: HeatCell[]; onShow: (el: Element, c: HeatCell) => void; onHide: () => void }): ReactNode {
  return (
    <>
      <span className="heat__dow">{label}</span>
      {cells.map((c) =>
        c.future ? (
          <span key={c.key} />
        ) : (
          <i
            key={c.key}
            className={`heat__cell lvl-${c.level}`}
            tabIndex={-1}
            onPointerEnter={(e) => onShow(e.currentTarget, c)}
            onPointerLeave={onHide}
            aria-label={`${c.key}: ${c.ms ? formatDuration(c.ms) : 'no focus'}`}
          />
        ),
      )}
    </>
  );
}
