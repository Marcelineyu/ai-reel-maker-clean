import React from 'react';
import PreviewImage from './PreviewImage';
import { PREVIEW_SCENES } from '../data/previewImages';

const checklist = [
  { label: 'Concept added', done: true },
  { label: '4 scenes outlined', done: true },
  { label: 'Scene visuals', done: true },
  { label: 'Voiceover tracks', done: true },
  { label: 'Publishing draft', done: false },
];

export default function HeroPreview() {
  return (
    <div className="w-full max-w-md mx-auto lg:mx-0" aria-hidden>
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-surface-muted/50">
          <div>
            <p className="text-xs font-medium text-text-secondary">Project</p>
            <p className="text-sm font-medium text-text-primary mt-0.5">Tokyo coffee shop — draft</p>
          </div>
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-surface-soft text-text-secondary border border-border">In progress</span>
        </div>

        <div className="p-4 space-y-3">
          <div className="rounded-lg border border-border bg-surface p-3">
            <p className="text-[11px] font-medium text-text-secondary uppercase tracking-wide">Idea</p>
            <p className="text-sm text-text-primary mt-1 leading-snug">A quiet morning inside a Tokyo coffee shop, soft light, slow pacing.</p>
          </div>

          <div className="space-y-1.5">
            {checklist.map((item) => (
              <div key={item.label} className="flex items-center gap-2.5 py-1.5">
                <span className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${item.done ? 'bg-primary border-primary' : 'border-border bg-surface'}`}>
                  {item.done && (
                    <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </span>
                <span className={`text-sm ${item.done ? 'text-text-primary' : 'text-text-secondary'}`}>{item.label}</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-4 gap-2 pt-1">
            {PREVIEW_SCENES.map((scene) => (
              <div key={scene.n} className="aspect-[3/4] rounded-md border border-border overflow-hidden relative">
                <PreviewImage
                  src={scene.src}
                  alt={scene.alt}
                  className="w-full h-full object-cover"
                  label={`Scene ${scene.n}`}
                />
                <span className="absolute bottom-0 inset-x-0 px-1 py-1 text-[9px] text-white font-medium bg-gradient-to-t from-black/50 to-transparent">
                  Scene {scene.n}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
