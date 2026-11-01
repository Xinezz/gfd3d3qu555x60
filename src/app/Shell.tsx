import { useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { BarChart3, BookOpen, Home, Settings, Timer, Trophy } from 'lucide-react';
import { useRoom } from '../features/session/sessionStore';
import { remainingMs } from '../domain/timer';
import { formatClock } from '../domain/time';
import { NowPlaying } from '../features/audio/NowPlaying';
import { Completion } from '../features/room/Completion';
import { AchievementCenter } from '../features/achievements/Celebration';
import { ConfirmHost, lightsOffStore, Toasts, useNow } from '../ui';

const NAV = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/room', label: 'Lock-In Room', short: 'Room', icon: Timer },
  { to: '/reports', label: 'Focus Reports', short: 'Reports', icon: BarChart3 },
  { to: '/notes', label: 'Study Notes', short: 'Notes', icon: BookOpen },
  { to: '/achievements', label: 'Achievements', short: 'Awards', icon: Trophy },
  { to: '/settings', label: 'Settings', icon: Settings },
];

function useLiveTitle() {
  const { timer } = useRoom();
  const active = timer.status !== 'idle';
  // The tick only triggers re-renders; the time itself is always read fresh.
  const tick = useNow(timer.status === 'running', 1000);
  useEffect(() => {
    if (!active) {
      document.title = 'LOCK IN';
      return;
    }
    const phase = timer.phase === 'focus' ? 'Focus' : 'Break';
    document.title = `${timer.status === 'paused' ? '⏸ ' : ''}${formatClock(remainingMs(timer, Date.now()))} · ${phase} — LOCK IN`;
  }, [active, timer, tick]);
}

function LivePill() {
  const { timer } = useRoom();
  useNow(timer.status === 'running', 1000);
  const { pathname } = useLocation();
  if (timer.status === 'idle' || pathname === '/room') return null;
  return (
    <NavLink to="/room" className="live-pill">
      <span className={`live-pill__dot ${timer.status === 'paused' ? 'is-paused' : ''}`} />
      <span className="num">{formatClock(remainingMs(timer, Date.now()))}</span>
      <span className="faint">{timer.status === 'paused' ? 'paused' : timer.phase === 'focus' ? 'focusing' : 'on break'}</span>
    </NavLink>
  );
}

export function Shell() {
  useLiveTitle();
  // App-wide, so a session that ended while you were elsewhere (or away) still gets its reflection.
  const { reviewId } = useRoom();
  const lightsOff = lightsOffStore.use();
  return (
    <div className={`shell ${lightsOff ? 'is-lights-off' : ''}`}>
      <aside className="sidebar">
        <div className="brand">
          <span className="brand__mark" aria-hidden />
          LOCK IN
        </div>
        <nav aria-label="Main">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className="nav-link">
              <Icon size={18} strokeWidth={1.8} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar__foot">
          <LivePill />
        </div>
      </aside>
      <main className="main">
        <Outlet />
      </main>
      <nav className="tabbar" aria-label="Main">
        {NAV.map(({ to, label, short, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end}>
            <Icon size={20} strokeWidth={1.8} />
            {short ?? label}
          </NavLink>
        ))}
      </nav>
      <NowPlaying />
      {reviewId && <Completion sessionId={reviewId} />}
      <AchievementCenter />
      <Toasts />
      <ConfirmHost />
    </div>
  );
}
