import { useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import { Minus, Plus } from 'lucide-react';

/** Small store helper shared by the UI-level stores below. */
function createStore<T>(initial: T) {
  let value = initial;
  const ls = new Set<() => void>();
  return {
    get: () => value,
    set: (v: T) => {
      value = v;
      ls.forEach((l) => l());
    },
    use: () => useSyncExternalStore((l) => (ls.add(l), () => void ls.delete(l)), () => value),
  };
}

/* ---------- Toasts ---------- */
const toastStore = createStore<{ id: number; text: string }[]>([]);
let toastId = 0;
export function toast(text: string, ms = 3200) {
  const id = ++toastId;
  toastStore.set([...toastStore.get(), { id, text }]);
  setTimeout(() => toastStore.set(toastStore.get().filter((t) => t.id !== id)), ms);
}
export function Toasts() {
  const list = toastStore.use();
  return (
    <div className="toasts" role="status" aria-live="polite">
      {list.map((t) => (
        <div key={t.id} className="toast">
          {t.text}
        </div>
      ))}
    </div>
  );
}

/* ---------- Confirm dialog (promise-based, styled replacement for window.confirm) ---------- */
interface ConfirmReq {
  title: string;
  body?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  resolve: (ok: boolean) => void;
}
const confirmStore = createStore<ConfirmReq | null>(null);
export function confirmDialog(opts: Omit<ConfirmReq, 'resolve'>): Promise<boolean> {
  return new Promise((resolve) => confirmStore.set({ ...opts, resolve }));
}
export function ConfirmHost() {
  const req = confirmStore.use();
  useEffect(() => {
    if (!req) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        close(false);
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  });
  if (!req) return null;
  const close = (ok: boolean) => {
    confirmStore.set(null);
    req.resolve(ok);
  };
  return (
    <div className="overlay" onClick={() => close(false)}>
      <div className="modal" role="alertdialog" aria-modal aria-labelledby="confirm-title" onClick={(e) => e.stopPropagation()}>
        <h2 id="confirm-title">{req.title}</h2>
        {req.body && <div className="muted" style={{ marginTop: 10 }}>{req.body}</div>}
        <div className="modal__actions">
          <button className="btn btn--ghost" onClick={() => close(false)}>
            {req.cancelLabel ?? 'Cancel'}
          </button>
          <button className={`btn ${req.danger ? 'btn--danger' : 'btn--primary'}`} autoFocus onClick={() => close(true)}>
            {req.confirmLabel ?? 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Lights-off flag (read by the shell and the room) ---------- */
export const lightsOffStore = createStore(false);

/* ---------- Controls ---------- */
export function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <label className="toggle">
      <span className="toggle__text">
        <span>{label}</span>
        {hint && <span className="small faint">{hint}</span>}
      </span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="toggle__track" aria-hidden />
    </label>
  );
}

export function Slider({ value, onChange, label, icon }: { value: number; onChange: (v: number) => void; label: string; icon?: ReactNode }) {
  return (
    <div className="slider">
      {icon}
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={value}
        aria-label={label}
        style={{ ['--fill' as string]: `${value * 100}%` }}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

export function Segmented<T extends string>({ value, options, onChange, label }: { value: T | null; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={value === o.value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Stepper({ value, onChange, min, max, unit, label, disabled }: { value: number; onChange: (v: number) => void; min: number; max: number; unit: string; label: string; disabled?: boolean }) {
  const set = (v: number) => onChange(Math.min(max, Math.max(min, v)));
  return (
    <div className="stepper" role="group" aria-label={label}>
      <button className="btn btn--sm" disabled={disabled || value <= min} onClick={() => set(value - 5)} aria-label={`${label} minus 5`}>
        −5
      </button>
      <button className="icon-btn" disabled={disabled || value <= min} onClick={() => set(value - 1)} aria-label={`${label} minus 1`}>
        <Minus size={16} />
      </button>
      <span className="stepper__value">
        {value}
        <small>{unit}</small>
      </span>
      <button className="icon-btn" disabled={disabled || value >= max} onClick={() => set(value + 1)} aria-label={`${label} plus 1`}>
        <Plus size={16} />
      </button>
      <button className="btn btn--sm" disabled={disabled || value >= max} onClick={() => set(value + 5)} aria-label={`${label} plus 5`}>
        +5
      </button>
    </div>
  );
}

/** Re-renders every `ms` while active. Display only: timing logic never depends on it. */
export function useNow(active: boolean, ms = 250) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    setNow(Date.now());
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [active, ms]);
  return now;
}
