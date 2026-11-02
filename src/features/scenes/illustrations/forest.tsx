import { Particles } from '../Particles';
import { Moon, Pines } from './primitives';

export function Forest() {
  return (
    <>
      <div className="scene__sky" style={{ background: 'linear-gradient(#0b1a1c, #17302c 55%, #2c4436)' }} />
      <Moon x="72%" y="16%" size={70} color="#e8eccf" />
      <Pines seed={31} fill="#1d3a33" count={34} minH={160} maxH={260} style={{ height: '72%' }} />
      <div className="scene__mist" />
      <Pines seed={32} fill="#122822" count={22} minH={200} maxH={330} style={{ height: '80%' }} />
      <Pines seed={33} fill="#08130f" count={11} minH={300} maxH={400} style={{ height: '95%' }} />
      <Particles kind="fireflies" />
    </>
  );
}
