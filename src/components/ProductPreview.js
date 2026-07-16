import React from 'react';
import PreviewImage from './PreviewImage';
import PublishingThumbnailPreview from './PublishingThumbnailPreview';
import { PREVIEW_SCENES } from '../data/previewImages';

export default function ProductPreview() {
  return (
    <section className="py-16 lg:py-20 px-5 sm:px-8 lg:px-12 bg-surface border-y border-border" aria-label="Product preview">
      <div className="max-w-4xl xl:max-w-5xl">
        <h2 className="text-2xl sm:text-[1.75rem] font-semibold text-text-primary tracking-tight">Inside the studio</h2>
        <p className="text-text-secondary mt-3 max-w-lg leading-relaxed">
          A preview of the workspace layout. Open the studio to work with your own project.
        </p>

        <div className="card mt-10 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border bg-surface-muted/40 flex items-center gap-2">
            <span className="text-xs text-text-secondary font-medium">Studio — sample project</span>
          </div>

          <div className="p-4 sm:p-5 grid lg:grid-cols-[1.4fr,1fr] gap-4 bg-bg">
            <div className="space-y-3">
              <div className="rounded-lg border border-border bg-surface p-3.5">
                <p className="text-[11px] font-medium text-text-secondary uppercase tracking-wide">1 · Idea</p>
                <p className="text-sm text-text-primary mt-2 leading-snug">A quiet morning inside a Tokyo coffee shop — warm light, minimal dialogue, observational pacing.</p>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                {PREVIEW_SCENES.map((scene) => (
                  <div key={scene.n} className="rounded-lg border border-border bg-surface p-3">
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <span className="text-xs font-medium text-text-primary">Scene {scene.n}</span>
                      <span className="text-[10px] text-text-secondary">Draft</span>
                    </div>
                    <p className="text-xs text-text-secondary leading-snug mb-2">{scene.desc}</p>
                    <div className="h-28 sm:h-32 rounded-md border border-border/80 overflow-hidden">
                      <PreviewImage
                        src={scene.src}
                        alt={scene.alt}
                        className="w-full h-full object-cover"
                        label={`Scene ${scene.n}`}
                      />
                    </div>
                    <div className="mt-2 h-1 rounded-full bg-border">
                      <div className="h-full w-2/3 rounded-full bg-primary/60" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div className="rounded-lg border border-border bg-surface p-3.5">
                <p className="text-[11px] font-medium text-text-secondary uppercase tracking-wide">Translation</p>
                <div className="flex gap-1.5 flex-wrap mt-2">
                  {['EN', 'ES', 'FR', 'JA'].map((l) => (
                    <span key={l} className={`text-xs px-2 py-0.5 rounded-md border ${l === 'ES' ? 'border-primary/40 bg-surface-soft text-primary' : 'border-border text-text-secondary'}`}>{l}</span>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-border bg-surface p-3.5">
                <p className="text-[11px] font-medium text-text-secondary uppercase tracking-wide">Publishing</p>
                <p className="text-sm font-medium text-text-primary mt-2 leading-snug">Morning Ritual: A Tokyo Coffee Shop</p>
                <p className="text-xs text-text-secondary mt-1 line-clamp-2">A short observational piece about routine, light, and the first hour of a neighborhood café.</p>
                <PublishingThumbnailPreview />
              </div>

              <div className="rounded-lg border border-border bg-surface-soft p-3.5">
                <p className="text-[11px] font-medium text-text-secondary uppercase tracking-wide">Assistant</p>
                <div className="mt-2 space-y-2">
                  <div className="text-xs p-2 rounded-md bg-surface border border-border text-text-secondary">Tighten the narration for scene 2.</div>
                  <div className="text-xs p-2 rounded-md bg-surface border border-border text-text-primary">Updated scene 2 in your editor.</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
