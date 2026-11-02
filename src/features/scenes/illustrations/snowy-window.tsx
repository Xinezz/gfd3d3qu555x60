import { Particles } from '../Particles';
import { Pines, Ridge, Stars, WindowFrame } from './primitives';
import './snowy-window.css';

export function SnowyWindow() {
  return (
    <>
      <div className="scene__sky" style={{ background: 'linear-gradient(#0d1626, #1f2f47 60%, #3c4f68)' }} />
      <Stars seed={71} count={50} maxY={0.35} />
      <Ridge seed={72} fill="#5d7088" top={210} rough={60} style={{ height: '55%' }} />
      <Pines seed={73} fill="#1b2738" count={26} minH={90} maxH={170} style={{ height: '42%' }} />
      <Ridge seed={74} fill="#c9d5e3" top={330} rough={30} style={{ height: '26%' }} />
      <Particles kind="snow" />
      <div className="scene__warm-sill" />
      <WindowFrame frost />
    </>
  );
}
