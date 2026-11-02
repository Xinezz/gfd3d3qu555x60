import { Pines, Ridge } from './primitives';
import './mountain-lake.css';

export function MountainLake() {
  return (
    <>
      <div className="scene__sky" style={{ background: 'linear-gradient(#1b2140, #4c4468 38%, #c98a7e 56%, #e9b58a 60%, #2a2c44 60.2%, #1a1c2e)' }} />
      <div className="scene__haze" style={{ background: 'radial-gradient(ellipse 40% 18% at 58% 60%, rgb(255 210 160 / 0.45), transparent 70%)' }} />
      <Ridge seed={91} fill="#5a4a6a" top={170} rough={110} style={{ height: '46%', bottom: '40%' }} />
      <Ridge seed={92} fill="#3b3350" top={250} rough={70} style={{ height: '36%', bottom: '40%' }} />
      <Pines seed={93} fill="#1f1d2e" count={40} minH={40} maxH={90} style={{ height: '14%', bottom: '40%' }} />
      <div className="scene__lake" />
      <div className="scene__mist scene__mist--low" />
    </>
  );
}
