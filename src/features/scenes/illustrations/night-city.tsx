import { Skyline, Stars } from './primitives';

export function NightCity() {
  return (
    <>
      <div className="scene__sky" style={{ background: 'linear-gradient(#0a0a1c, #1b1638 50%, #3d2546 78%, #5a3340)' }} />
      <Stars seed={7} count={70} maxY={0.4} />
      <div className="scene__haze" style={{ background: 'radial-gradient(ellipse at 50% 100%, rgba(255,150,110,.28), transparent 60%)' }} />
      <Skyline seed={21} fill="#1d1a33" lit="#6f6596" density={0.08} minH={120} maxH={300} style={{ height: '62%' }} />
      <Skyline seed={22} fill="#141226" lit="#d7b37a" density={0.1} minH={80} maxH={240} style={{ height: '50%' }} />
      <Skyline seed={23} fill="#0a0914" lit="#f0c27c" density={0.13} minH={40} maxH={160} style={{ height: '34%' }} />
    </>
  );
}
