import { useMemo } from 'react';
import { Moon, Stars, W } from './primitives';
import './ocean.css';

function Waves({ color, amp, period, y, duration, opacity = 1, reverse }: { color: string; amp: number; period: number; y: number; duration: number; opacity?: number; reverse?: boolean }) {
  const d = useMemo(() => {
    const pts: string[] = [];
    for (let x = 0; x <= W * 2; x += 10) pts.push(`${x},${(20 + amp * Math.sin((2 * Math.PI * x) / period)).toFixed(1)}`);
    return `M0,100 L${pts.join(' L')} L${W * 2},100 Z`;
  }, [amp, period]);
  return (
    <div className="scene__waves" style={{ bottom: `${y}%`, opacity }}>
      <svg viewBox={`0 0 ${W * 2} 100`} preserveAspectRatio="none" style={{ animationDuration: `${duration}s`, animationDirection: reverse ? 'reverse' : 'normal' }} aria-hidden>
        <path d={d} fill={color} />
      </svg>
    </div>
  );
}

export function Ocean() {
  return (
    <>
      <div className="scene__sky" style={{ background: 'linear-gradient(#060d1c, #10213b 50%, #1d3550 58%, #0b1a2c 58.2%, #07111d)' }} />
      <Stars seed={41} count={110} maxY={0.5} />
      <Moon x="62%" y="14%" size={90} />
      <div className="scene__reflection" />
      <Waves color="#0f2238" amp={6} period={300} y={22} duration={38} opacity={0.9} />
      <Waves color="#0b1b2e" amp={9} period={400} y={11} duration={30} reverse />
      <Waves color="#08131f" amp={12} period={600} y={0} duration={24} />
    </>
  );
}
