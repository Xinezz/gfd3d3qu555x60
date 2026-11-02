import { Particles } from '../Particles';
import { Layer, Moon, Ridge } from './primitives';
import './japanese-garden.css';

export function JapaneseGarden() {
  return (
    <>
      <div className="scene__sky" style={{ background: 'linear-gradient(#1b1630, #4a3050 45%, #b0706a 70%, #2a2238 70.2%, #1a1528)' }} />
      <Moon x="20%" y="12%" size={110} color="#f6e2cf" />
      <Ridge seed={81} fill="#5d3f5c" top={170} rough={90} style={{ height: '48%', bottom: '30%' }} />
      <Ridge seed={82} fill="#3a2a45" top={250} rough={60} style={{ height: '40%', bottom: '30%' }} />
      <Layer style={{ bottom: '30%', height: '36%' }}>
        <g fill="#24182a">
          <rect x={840} y={150} width={14} height={250} />
          <rect x={986} y={150} width={14} height={250} />
          <rect x={815} y={182} width={210} height={12} />
          <path d="M790,128 Q920,150 1050,128 L1046,146 Q920,166 794,146 Z" />
        </g>
      </Layer>
      <div className="scene__pond" />
      <svg className="scene__stone-lantern" viewBox="0 0 60 130" aria-hidden>
        <g fill="#221a28">
          <path d="M4,22 L30,4 L56,22 L50,26 L10,26 Z" />
          <rect x={14} y={26} width={32} height={30} />
          <rect x={8} y={56} width={44} height={8} rx={2} />
          <rect x={22} y={64} width={16} height={50} />
          <rect x={12} y={114} width={36} height={12} rx={2} />
        </g>
        <rect className="scene__lantern-light" x={22} y={32} width={16} height={18} rx={2} fill="#ffcf8a" />
      </svg>
      <svg className="scene__branch" viewBox="0 0 400 260" aria-hidden>
        <path d="M400,10 C320,40 260,30 200,80 C160,110 120,120 60,150" stroke="#1d1220" strokeWidth={9} fill="none" strokeLinecap="round" />
        <path d="M260,52 C240,90 230,120 200,150" stroke="#1d1220" strokeWidth={5} fill="none" strokeLinecap="round" />
        {[[70, 150], [110, 132], [150, 118], [205, 150], [225, 100], [270, 60], [320, 42], [190, 86], [130, 160], [360, 26]].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={16 + (i % 3) * 6} fill={i % 2 ? '#b8505a' : '#a33f4c'} opacity={0.85} />
        ))}
      </svg>
      <Particles kind="petals" />
    </>
  );
}
