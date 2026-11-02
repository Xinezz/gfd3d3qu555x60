import { Particles } from '../Particles';
import { Pines, Ridge, Stars } from './primitives';
import './aurora.css';

export function Aurora() {
  return (
    <>
      <div className="scene__sky" style={{ background: 'linear-gradient(#03080f, #071722 45%, #0d2430 70%, #132c3a)' }} />
      <Stars seed={101} count={120} maxY={0.6} />
      <div className="scene__aurora">
        <i style={{ ['--c' as string]: '#3fe0a0', animationDelay: '0s' }} />
        <i style={{ ['--c' as string]: '#38c7c9', animationDelay: '-6s' }} />
        <i style={{ ['--c' as string]: '#8c6cf0', animationDelay: '-12s' }} />
      </div>
      <Ridge seed={102} fill="#c3d3e4" top={300} rough={40} style={{ height: '30%' }} />
      <Pines seed={103} fill="#06121a" count={30} minH={80} maxH={200} style={{ height: '40%' }} />
      <Particles kind="snow" density={0.3} />
    </>
  );
}
