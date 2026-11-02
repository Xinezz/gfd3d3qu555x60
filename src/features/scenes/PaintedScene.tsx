import { Board } from './Board';
import { thumbFile, type Environment, type ImageFormat, type PaintedArt } from './catalog';

const MIME: Record<ImageFormat, string> = { avif: 'image/avif', webp: 'image/webp', jpg: 'image/jpeg', png: 'image/png' };
// The artboard covers the room, so the plate is drawn at least as wide as the screen, and wider on tall screens.
const PLATE_SIZES = 'max(100vw, 177.78vh)';

const url = (file: string) => `${import.meta.env.BASE_URL}${file}`;
const srcSet = (art: PaintedArt, format: ImageFormat) => art.widths.map((w) => `${url(`${art.dir}/plate-${w}.${format}`)} ${w}w`).join(', ');

export const thumbUrl = (art: PaintedArt) => url(thumbFile(art));

/**
 * A hand-painted environment: the plate at the size the screen needs (the browser picks from the
 * exported widths and best supported format) on the shared artboard, with its lights, effects and
 * hotspots. Only the active environment's plate is ever requested.
 */
export function PaintedScene({ env, art, onReady, onError }: { env: Environment; art: PaintedArt; onReady?: () => void; onError?: () => void }) {
  const fallback = art.formats[art.formats.length - 1];
  return (
    <div className="painted" style={{ background: env.sky[1] }}>
      <Board envId={env.id} layout={art}>
        <picture>
          {art.formats.slice(0, -1).map((f) => (
            <source key={f} type={MIME[f]} srcSet={srcSet(art, f)} sizes={PLATE_SIZES} />
          ))}
          <img
            className="painted__plate"
            srcSet={srcSet(art, fallback)}
            sizes={PLATE_SIZES}
            src={url(`${art.dir}/plate-${art.widths[0]}.${fallback}`)}
            alt=""
            decoding="async"
            onLoad={onReady}
            onError={onError}
          />
        </picture>
      </Board>
    </div>
  );
}
