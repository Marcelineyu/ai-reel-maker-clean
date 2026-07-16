import React from 'react';
import PreviewImage from './PreviewImage';
import { PREVIEW_PUBLISHING } from '../data/previewImages';

export default function PublishingThumbnailPreview() {
  const { main, strip } = PREVIEW_PUBLISHING;

  return (
    <div className="mt-3 aspect-video rounded-lg border border-border overflow-hidden shadow-sm bg-surface-muted">
      <div className="grid h-full grid-cols-[1fr,min(28%,96px)]">
        <div className="relative min-h-0 min-w-0">
          <PreviewImage
            src={main.src}
            alt="Publishing thumbnail featuring the Tokyo coffee shop exterior"
            className="w-full h-full object-cover"
            label="Thumbnail"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent pointer-events-none" aria-hidden />
          <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 pointer-events-none">
            <p className="text-sm font-medium text-white leading-tight">Morning Ritual</p>
            <p className="text-xs text-white/85 mt-0.5">A Tokyo Coffee Shop</p>
          </div>
        </div>

        <div className="grid grid-rows-3 border-l border-white/30 min-h-0">
          {strip.map((scene) => (
            <div key={scene.n} className="relative min-h-0 border-b border-white/20 last:border-b-0">
              <PreviewImage
                src={scene.src}
                alt={`Publishing preview panel for scene ${scene.n}`}
                className="w-full h-full object-cover"
                label={`Scene ${scene.n}`}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
