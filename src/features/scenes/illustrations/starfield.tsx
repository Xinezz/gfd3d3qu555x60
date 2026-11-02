import { Stars } from './primitives';
import './starfield.css';

export function Starfield() {
  return (
    <>
      <div className="scene__sky" style={{ background: 'radial-gradient(ellipse at 30% 40%, #120c2a, #04040c 70%)' }} />
      <div className="scene__nebula" />
      <div className="scene__drift">
        <Stars seed={121} count={160} maxY={1} />
      </div>
      <Stars seed={122} count={60} maxY={1} />
      <div className="scene__planet" />
    </>
  );
}
