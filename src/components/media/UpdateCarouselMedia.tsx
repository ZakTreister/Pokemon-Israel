import { Newspaper } from 'lucide-react';
import type { Update } from '../../types/update';

/** One media preview per news card; prefer playable clips when present. */
export default function UpdateCarouselMedia({ update }: { update: Update }) {
  const playable = update.mediaItems?.find(
    (item) =>
      (item.kind === 'video' && Boolean(item.url)) ||
      (item.kind === 'youtube' && /^[a-zA-Z0-9_-]{11}$/.test(item.youtubeId || '')),
  );
  const image = update.mediaItems?.find(
    (item) => item.kind === 'image' && Boolean(item.url),
  )?.url || update.image;

  if (playable?.kind === 'video') {
    return (
      <video
        className="w-full h-40 object-contain bg-black"
        src={playable.url}
        controls
        playsInline
        preload="none"
        poster={image || undefined}
        aria-label={`סרטון: ${update.title}`}
      />
    );
  }

  if (playable?.kind === 'youtube') {
    return (
      <iframe
        title={`סרטון: ${update.title}`}
        className="w-full h-40 bg-black"
        src={`https://www.youtube-nocookie.com/embed/${playable.youtubeId}`}
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
        allow="encrypted-media; picture-in-picture"
        allowFullScreen
      />
    );
  }

  if (image) {
    return <img src={image} alt="" loading="lazy" className="w-full h-40 object-cover" />;
  }

  return (
    <div className="h-40 bg-navy-700 flex items-center justify-center text-gold">
      <Newspaper size={46} aria-hidden="true" />
    </div>
  );
}
