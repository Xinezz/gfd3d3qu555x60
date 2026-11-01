import { useState } from 'react';
import { Cloud, CloudOff, LogOut, RefreshCw } from 'lucide-react';
import { relativeDay, formatTimeOfDay } from '../../domain/time';
import { useNow, toast } from '../../ui';
import { cancelCode, sendCode, signOut, syncNow, useSync, verifyCode } from '../../sync/syncStore';

function ago(t: number, now: number) {
  const s = Math.round((now - t) / 1000);
  if (s < 10) return 'just now';
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  return `${relativeDay(t)} at ${formatTimeOfDay(t)}`;
}

/** Sign in once per device to keep all your devices in sync. */
export function AccountSection() {
  const s = useSync();
  const now = useNow(!!s.userId, 15_000);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      toast((e as Error).message, 5000);
    } finally {
      setBusy(false);
    }
  };

  if (!s.configured)
    return (
      <section className="card">
        <h2>Account &amp; sync</h2>
        <p className="muted small">
          Cloud sync isn't set up in this copy of LOCK IN, so your data stays in this browser only. Use Export / Import backup below to move it between devices. (Setup steps are
          in the project README under "Account sync".)
        </p>
      </section>
    );

  if (!s.ready)
    return (
      <section className="card">
        <h2>Account &amp; sync</h2>
        <p className="faint small">Checking your account…</p>
      </section>
    );

  if (s.userId)
    return (
      <section className="card">
        <h2>Account &amp; sync</h2>
        <div className="sync-status">
          {s.status === 'offline' || s.status === 'error' ? <CloudOff size={20} /> : <Cloud size={20} />}
          <div>
            <strong>{s.email}</strong>
            <span className={`small ${s.status === 'error' ? 'warn' : 'faint'}`}>
              {s.status === 'syncing'
                ? 'Syncing…'
                : s.status === 'offline'
                  ? 'Offline. Changes are kept here and sync when you reconnect.'
                  : s.status === 'error'
                    ? `Sync problem: ${s.error}`
                    : s.lastSyncedAt
                      ? `Synced ${ago(s.lastSyncedAt, now)}`
                      : 'Waiting to sync'}
            </span>
          </div>
        </div>
        <p className="muted small">Sessions, reflections, notes, subjects, presets, achievements and preferences sync to every device signed in with this email. A timer that's running stays on the device it started on.</p>
        <div className="settings__actions">
          <button className="btn" onClick={() => void syncNow()} disabled={s.status === 'syncing'}>
            <RefreshCw size={16} /> Sync now
          </button>
          <button className="btn btn--ghost" onClick={() => void run(signOut)}>
            <LogOut size={16} /> Sign out
          </button>
        </div>
        <p className="faint small">Signing out stops syncing; everything already on this device stays here.</p>
      </section>
    );

  return (
    <section className="card">
      <h2>Account &amp; sync</h2>
      <p className="muted small">
        Sign in with your email to sync your study data across devices. No password: we email you a 6-digit code (or a sign-in link). Signing in uploads what's on this device to
        your account.
      </p>
      {s.codeSentTo ? (
        <form
          className="stack-s"
          onSubmit={(e) => {
            e.preventDefault();
            void run(() => verifyCode(s.codeSentTo!, code));
          }}
        >
          <label className="field">
            <span>Enter the code sent to {s.codeSentTo}</span>
            <input className="input sync-code" inputMode="numeric" autoComplete="one-time-code" maxLength={10} value={code} onChange={(e) => setCode(e.target.value)} autoFocus />
          </label>
          <div className="settings__actions">
            <button className="btn btn--primary" disabled={busy || code.trim().length < 6}>
              Sign in
            </button>
            <button type="button" className="btn btn--ghost" onClick={cancelCode}>
              Use a different email
            </button>
          </div>
        </form>
      ) : (
        <form
          className="row"
          onSubmit={(e) => {
            e.preventDefault();
            void run(() => sendCode(email.trim()));
          }}
        >
          <input className="input" type="email" required placeholder="you@example.com" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <button className="btn btn--primary" disabled={busy || !email.includes('@')}>
            Email me a code
          </button>
        </form>
      )}
    </section>
  );
}
