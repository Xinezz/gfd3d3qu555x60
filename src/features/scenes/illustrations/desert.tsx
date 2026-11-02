import { useMemo, type CSSProperties } from 'react';
import { H, Layer, Moon, Stars, W } from './primitives';

/** Smooth rolling dunes (Ridge is too jagged for sand). */
function Dunes({ fill, top, amp, period, offset = 0, style }: { fill: string; top: number; amp: number; period: number; offset?: number; style?: CSSProperties }) {
  const d = useMemo(() => {
    const pts: string[] = [];
    for (let x = 0; x <= W; x += 20) pts.push(`${x},${(top + amp * Math.sin(((x + offset) / period) * Math.PI * 2) + amp * 0.4 * Math.sin(((x + offset) / (period * 0.37)) * Math.PI * 2)).toFixed(1)}`);
    return `M0,${H} L${pts.join(' L')} L${W},${H} Z`;
  }, [top, amp, period, offset]);
  return (
    <Layer style={style}>
      <path d={d} fill={fill} />
    </Layer>
  );
}

export function Desert() {
  return (
    <>
      <div className="scene__sky" style={{ background: 'linear-gradient(#07071a, #16143a 50%, #3a2b4e 72%, #6a4a5a)' }} />
      <Stars seed={111} count={170} maxY={0.65} />
      <Moon x="70%" y="12%" size={84} color="#f4e9d2" />
      <Dunes fill="#3d2f48" top={250} amp={40} period={700} style={{ height: '45%' }} />
      <Dunes fill="#2a2036" top={300} amp={30} period={520} offset={160} style={{ height: '36%' }} />
      <Dunes fill="#181322" top={340} amp={24} period={900} offset={420} style={{ height: '26%' }} />
    </>
  );
}
