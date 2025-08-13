// components/WpImage.tsx
"use client";
import Image from "next/image";
import { useMemo, useState } from "react";

const IMG_EXT = /\.(png|jpe?g|webp|gif|avif)(\?.*)?$/i;
const FALLBACK_DATA_URI =
  "data:image/svg+xml;charset=utf-8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">
      <rect width="100%" height="100%" fill="#f3f4f6"/>
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
            font-family="system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial"
            font-size="28" fill="#9ca3af">Image unavailable</text>
    </svg>`
  );

function looksLikeImageUrl(u: string) {
  return IMG_EXT.test(u) || /\/wp-content\/uploads\//i.test(u);
}

type Props = Omit<React.ComponentProps<typeof Image>, "src"> & {
  src: string;
  alt: string;
};

export default function WpImage({ src, alt, ...rest }: Props) {
  const needsResolve = !looksLikeImageUrl(src);
  const primary = needsResolve
    ? `/api/resolve-image?url=${encodeURIComponent(src)}`
    : src;

  // Only two candidates: primary → data-URI (never 404s)
  const candidates = useMemo(() => [primary, FALLBACK_DATA_URI], [primary]);

  const [idx, setIdx] = useState(0);
  const [locked, setLocked] = useState(false); // once true, never swap to fallback

  return (
    <Image
      src={candidates[idx]}
      alt={alt}
      // Prevent Next/Image optimizer from re-fetching your API route (common cause of late failures)
      unoptimized={needsResolve}
      // strongly recommend you pass width, height, and sizes to avoid CLS
      // width={1200} height={800} sizes="(max-width: 768px) 100vw, 50vw"
      onLoadingComplete={() => {
        // Primary loaded successfully -> lock so future transient errors won't flip to fallback
        if (idx === 0) setLocked(true);
      }}
      onError={() => {
        // Only allow fallback if we haven't locked a successful primary yet
        if (!locked && idx < candidates.length - 1) {
          setIdx((prev) => prev + 1);
        }
      }}
      {...rest}
    />
  );
}
