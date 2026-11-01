import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, Trash2 } from 'lucide-react';
import type { Session, Subject } from '../../domain/types';
import { bySubject, dailySeries, filterSessions, heatmap, monthlySeries, summary, weeklySeries, type Bucket, type ReportFilter } from '../../domain/reports';
import { addDays, dayKey, formatDate, formatDuration, formatHours, formatTimeOfDay, MINUTE, relativeDay } from '../../domain/time';
import { useAllSubjects, useSessions, useSubjects } from '../../data/hooks';
import { sessionsRepo } from '../../data/repo';
import { useSettings } from '../../data/settings';
import { confirmDialog, Segmented, toast } from '../../ui';
import { ColumnChart, Heatmap, SubjectBars, type ColumnDatum } from '../../ui/charts/Charts';
import './reports.css';

type Period = '7' | '30' | '90' | 'all' | 'custom';
type Trend = 'daily' | 'weekly' | 'monthly';

const PERIODS: { value: Period; label: string }[] = [
  { value: '7', label: '7 days' },
  { value: '30', label: '30 days' },
  { value: '90', label: '90 days' },
  { value: 'all', label: 'All time' },
  { value: 'custom', label: 'Custom' },
];

const OUTCOME = { yes: 'Completed', partly: 'Partly done', no: 'Not yet' } as const;

export function ReportsPage() {
  const { sessions, loading } = useSessions();
  const subjects = useSubjects();
  const allSubjects = useAllSubjects();
  const settings = useSettings();
  const [period, setPeriod] = useState<Period>('30');
  const [from, setFrom] = useState(dayKey(addDays(Date.now(), -29)));
  const [to, setTo] = useState(dayKey(Date.now()));
  const [subjectId, setSubjectId] = useState('');
  const [trend, setTrend] = useState<Trend>('daily');

  const subjectById = useMemo(() => new Map(allSubjects.map((s) => [s.id, s])), [allSubjects]);

  const filter: ReportFilter = useMemo(() => {
    const now = Date.now();
    const range =
      period === 'all' ? {} : period === 'custom' ? { from: from || undefined, to: to || undefined } : { from: dayKey(addDays(now, -Number(period) + 1)), to: dayKey(now) };
    return { ...range, subjectId: subjectId || undefined };
  }, [period, from, to, subjectId]);

  const filtered = useMemo(() => filterSessions(sessions, filter), [sessions, filter]);
  const bySubjectOnly = useMemo(() => filterSessions(sessions, { subjectId: filter.subjectId }), [sessions, filter.subjectId]);
  const firstEver = useMemo(() => sessions.reduce((min, s) => (s.dayKey < min ? s.dayKey : min), '9999'), [sessions]);
  const stats = useMemo(
    () => summary(filtered, Date.now(), { from: filter.from && filter.from > firstEver ? filter.from : firstEver, to: filter.to }),
    [filtered, filter.from, filter.to, firstEver],
  );
  const slices = useMemo(() => bySubject(filtered), [filtered]);

  const trendData: ColumnDatum[] = useMemo(() => {
    const now = Date.now();
    const toDatum = (b: Bucket, axis: string, label: string): ColumnDatum => ({ key: b.key, axis, label, ms: b.ms, current: b.current });
    if (trend === 'daily')
      return dailySeries(bySubjectOnly, 30, now).map((b, i, all) =>
        toDatum(b, i % 5 === 4 || i === all.length - 1 ? formatDate(b.start) : '', formatDate(b.start, { weekday: 'short', day: 'numeric', month: 'short' })),
      );
    if (trend === 'weekly')
      return weeklySeries(bySubjectOnly, 12, now).map((b, i) => toDatum(b, i % 2 ? '' : formatDate(b.start), `Week of ${formatDate(b.start)}`));
    return monthlySeries(bySubjectOnly, 12, now).map((b) =>
      toDatum(b, new Date(b.start).toLocaleDateString(undefined, { month: 'short' }), new Date(b.start).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })),
    );
  }, [bySubjectOnly, trend]);

  const trendTotal = trendData.reduce((a, d) => a + d.ms, 0);
  const subjectName = subjectId === 'none' ? 'No subject' : subjectById.get(subjectId)?.name;

  if (!loading && sessions.length === 0)
    return (
      <div className="page reports">
        <header>
          <p className="eyebrow">Your study habits</p>
          <h1>Focus Reports</h1>
        </header>
        <section className="card reports__empty">
          <h2>Nothing to report yet</h2>
          <p className="muted">Complete your first focus session and your statistics, charts and history will appear here, built entirely from your own sessions.</p>
          <Link to="/room" className="btn btn--primary">
            Enter the Lock-In Room
          </Link>
        </section>
      </div>
    );

  return (
    <div className={`page reports ${loading ? 'is-loading' : ''}`}>
      <header>
        <p className="eyebrow">Your study habits</p>
        <h1>Focus Reports</h1>
      </header>

      <div className="filters" role="group" aria-label="Filters">
        <Segmented label="Period" value={period} options={PERIODS} onChange={setPeriod} />
        {period === 'custom' && (
          <div className="filters__dates">
            <input type="date" className="input" aria-label="From" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} />
            <span className="faint">to</span>
            <input type="date" className="input" aria-label="To" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
          </div>
        )}
        <select className="select filters__subject" aria-label="Subject" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
          <option value="">All subjects</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
          <option value="none">No subject</option>
        </select>
      </div>

      <section className="tiles" aria-label="Statistics">
        <Tile label="Total focus" value={`${formatHours(stats.totalMs)}h`} sub={formatDuration(stats.totalMs)} />
        <Tile label="Sessions" value={String(stats.count)} sub={`${stats.activeDays} active ${stats.activeDays === 1 ? 'day' : 'days'}`} />
        <Tile label="Average session" value={formatDuration(stats.avgMs)} />
        <Tile label="Longest session" value={stats.longest ? formatDuration(stats.longest.focusMs) : '–'} sub={stats.longest ? relativeDay(stats.longest.startedAt) : undefined} />
        <Tile label="Daily average" value={formatDuration(stats.dailyAvgMs)} sub={stats.activeDays ? `${formatDuration(stats.activeDayAvgMs)} on study days` : undefined} />
      </section>

      <div className="reports__grid">
        <section className="card reports__trend">
          <div className="card__head">
            <div>
              <h2>Study time</h2>
              <p className="faint small">
                {trend === 'daily' ? 'Last 30 days' : trend === 'weekly' ? 'Last 12 weeks' : 'Last 12 months'}
                {subjectName ? ` · ${subjectName}` : ''} · {formatDuration(trendTotal)}
              </p>
            </div>
            <Segmented
              label="Chart range"
              value={trend}
              onChange={setTrend}
              options={[
                { value: 'daily', label: 'Daily' },
                { value: 'weekly', label: 'Weekly' },
                { value: 'monthly', label: 'Monthly' },
              ]}
            />
          </div>
          <ColumnChart data={trendData} title="Study time" goalMs={trend === 'daily' ? settings.dailyGoalMin * MINUTE : undefined} />
          {trend === 'daily' && <p className="faint small reports__legend"><i className="reports__goal-key" /> Daily goal ({formatDuration(settings.dailyGoalMin * MINUTE)})</p>}
        </section>

        <section className="card reports__subjects">
          <div className="card__head">
            <h2>By subject</h2>
            <span className="faint small">{PERIODS.find((p) => p.value === period)?.label}</span>
          </div>
          {slices.length ? (
            <SubjectBars
              data={slices.map((s) => {
                const subj = s.subjectId ? subjectById.get(s.subjectId) : undefined;
                return { key: s.subjectId ?? 'none', name: subj?.name ?? 'No subject', color: subj?.color ?? 'var(--text-3)', ms: s.ms, share: s.share, count: s.count };
              })}
            />
          ) : (
            <p className="empty">No sessions in this period.</p>
          )}
        </section>
      </div>

      <section className="card">
        <FitHeatmap sessions={bySubjectOnly} subjectName={subjectName} />
      </section>

      <History sessions={filtered} subjectById={subjectById} />
    </div>
  );
}

/** Shows as many weeks as fit the card (a year at most), most recent on the right. */
function FitHeatmap({ sessions, subjectName }: { sessions: Session[]; subjectName?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [weeks, setWeeks] = useState(26);
  const [cell, setCell] = useState(13);
  useEffect(() => {
    const el = ref.current!;
    const ro = new ResizeObserver(() => {
      const w = Math.min(52, Math.max(17, Math.floor((el.clientWidth - 28) / 16)));
      setWeeks(w);
      // Grow cells to fill the card once a full year fits (3px gaps between cells).
      setCell(Math.min(18, Math.max(13, Math.floor((el.clientWidth - 31) / w) - 3)));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  useEffect(() => {
    const scroller = ref.current?.querySelector('.heat__scroll');
    if (scroller) scroller.scrollLeft = scroller.scrollWidth;
  }, [weeks, sessions]);
  const grid = useMemo(() => heatmap(sessions, weeks), [sessions, weeks]);
  return (
    <div ref={ref} style={{ ['--heat-cell' as string]: `${cell}px` }}>
      <div className="card__head">
        <div>
          <h2>Consistency</h2>
          <p className="faint small">
            Last {weeks} weeks{subjectName ? ` · ${subjectName}` : ''}
          </p>
        </div>
      </div>
      <Heatmap grid={grid} />
    </div>
  );
}

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="tile">
      <span className="tile__label">{label}</span>
      <span className="tile__value num">{value}</span>
      {sub && <span className="tile__sub faint small">{sub}</span>}
    </div>
  );
}

const PAGE = 25;

function History({ sessions, subjectById }: { sessions: Session[]; subjectById: Map<string, Subject> }) {
  const [shown, setShown] = useState(PAGE);
  const [open, setOpen] = useState<string | null>(null);
  const sorted = useMemo(() => [...sessions].sort((a, b) => b.startedAt - a.startedAt), [sessions]);
  const visible = sorted.slice(0, shown);

  // Group the visible sessions by day.
  const groups: { day: string; t: number; items: Session[]; ms: number }[] = [];
  for (const s of visible) {
    const g = groups.at(-1);
    if (g && g.day === s.dayKey) {
      g.items.push(s);
      g.ms += s.focusMs;
    } else groups.push({ day: s.dayKey, t: s.startedAt, items: [s], ms: s.focusMs });
  }

  const remove = async (s: Session) => {
    const ok = await confirmDialog({
      title: 'Delete this session?',
      body: `${formatDuration(s.focusMs)} on ${relativeDay(s.startedAt)} and its reflection will be removed from your reports.`,
      confirmLabel: 'Delete session',
      danger: true,
    });
    if (!ok) return;
    await sessionsRepo.remove(s.id);
    toast('Session deleted');
  };

  return (
    <section className="card history">
      <div className="card__head">
        <h2>Session history</h2>
        <span className="faint small">
          {sorted.length} {sorted.length === 1 ? 'session' : 'sessions'}
        </span>
      </div>
      {!sorted.length && <p className="empty">No sessions match these filters.</p>}
      {groups.map((g) => (
        <div key={g.day} className="history__day">
          <div className="history__day-head">
            <span>{relativeDay(g.t)}</span>
            <span className="faint small num">{formatDuration(g.ms)}</span>
          </div>
          <ul className="history__list">
            {g.items.map((s) => {
              const subj = s.subjectId ? subjectById.get(s.subjectId) : undefined;
              const isOpen = open === s.id;
              return (
                <li key={s.id} className={`history__item ${isOpen ? 'is-open' : ''}`}>
                  <button className="history__row" onClick={() => setOpen(isOpen ? null : s.id)} aria-expanded={isOpen}>
                    <span className="history__time faint small num">
                      {formatTimeOfDay(s.startedAt)}–{formatTimeOfDay(s.endedAt)}
                    </span>
                    <span className="history__main">
                      <span className="history__subject">
                        <span className="dot" style={{ background: subj?.color ?? 'var(--text-3)' }} />
                        {subj?.name ?? 'No subject'}
                        {subj?.deletedAt ? <span className="faint small"> (deleted)</span> : null}
                      </span>
                      <span className="history__task faint small">{s.task || s.reflection?.accomplished || '—'}</span>
                    </span>
                    <span className="history__meta">
                      {s.status === 'ended_early' && <span className="chip">Ended early</span>}
                      <span className="num">{formatDuration(s.focusMs)}</span>
                      <ChevronDown size={16} className="history__chev" />
                    </span>
                  </button>
                  {isOpen && (
                    <div className="history__detail">
                      <dl>
                        <Detail label="Task" value={s.task} />
                        <Detail label="Accomplished" value={s.reflection?.accomplished} />
                        <Detail label="Intended task" value={s.reflection?.completedTask ? OUTCOME[s.reflection.completedTask] : undefined} />
                        <Detail label="Next time" value={s.reflection?.nextTime} />
                        <Detail label="Planned" value={`${formatDuration(s.plannedMs)} · paused ${formatDuration(s.pausedMs)}`} />
                        {s.distractions.length > 0 && <Detail label="Parked thoughts" value={s.distractions.map((d) => `${d.done ? '✓' : '•'} ${d.text}`).join('\n')} />}
                      </dl>
                      {!s.reflection && <p className="faint small">No reflection was written for this session.</p>}
                      <button className="btn btn--ghost btn--danger btn--sm" onClick={() => void remove(s)}>
                        <Trash2 size={14} /> Delete session
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
      {shown < sorted.length && (
        <button className="btn history__more" onClick={() => setShown(shown + PAGE)}>
          Show {Math.min(PAGE, sorted.length - shown)} more
        </button>
      )}
    </section>
  );
}

function Detail({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
