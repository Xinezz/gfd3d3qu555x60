import { Particles } from '../Particles';
import { Skyline, WindowFrame } from './primitives';
import './rainy-window.css';

export function RainyWindow() {
  return (
    <>
      <div className="scene__sky" style={{ background: 'linear-gradient(#0b1220, #18233a 55%, #2a2f3f)' }} />
      <Skyline seed={3} fill="#0d1422" lit="#e8b36a" density={0.12} minH={60} maxH={210} className="scene__blur" />
      <Particles kind="rain" />
      <div className="scene__fog" />
      <Particles kind="glass" />
      <WindowFrame />
    </>
  );
}
