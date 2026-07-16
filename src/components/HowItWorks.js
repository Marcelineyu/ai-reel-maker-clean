import React from 'react';
import { navigateTo } from '../utils/navigation';

const steps = [
  { num: '1', title: 'Describe your idea', body: 'Write a concept and optionally add up to three reference images.' },
  { num: '2', title: 'Outline your scenes', body: 'Generate structured descriptions and narration for each scene.' },
  { num: '3', title: 'Build out the reel', body: 'Add visuals, audio, translations, and refinements as you go.' },
  { num: '4', title: 'Prepare to publish', body: 'Draft titles, descriptions, and thumbnails for your platform.' },
];

export default function HowItWorks({ onOpenStudio }) {
  const openStudio = () => {
    onOpenStudio?.();
    navigateTo('studio');
  };

  return (
    <section id="how-it-works" className="scroll-mt-14 lg:scroll-mt-0 py-16 lg:py-20 px-5 sm:px-8 lg:px-12 bg-bg">
      <div className="max-w-4xl xl:max-w-5xl">
        <h2 className="text-2xl sm:text-[1.75rem] font-semibold text-text-primary tracking-tight">How it works</h2>
        <p className="text-text-secondary mt-3 max-w-lg leading-relaxed">A straightforward path from concept to usable video materials.</p>

        <ol className="mt-10 space-y-0 lg:space-y-0 lg:grid lg:grid-cols-4 lg:gap-6">
          {steps.map((step, i) => (
            <li key={step.num} className="relative flex lg:flex-col gap-4 lg:gap-0 pb-8 lg:pb-0 last:pb-0">
              {i < steps.length - 1 && (
                <span className="hidden lg:block absolute top-5 left-[calc(100%-12px)] w-6 h-px bg-border" aria-hidden />
              )}
              <div className="flex lg:flex-col gap-4 lg:gap-3">
                <span className="flex items-center justify-center w-9 h-9 rounded-full bg-surface border border-border text-sm font-medium text-primary shrink-0">
                  {step.num}
                </span>
                <div>
                  <h3 className="font-medium text-text-primary">{step.title}</h3>
                  <p className="text-sm text-text-secondary mt-1.5 leading-relaxed">{step.body}</p>
                </div>
              </div>
            </li>
          ))}
        </ol>

        <button type="button" onClick={openStudio} className="btn-secondary mt-10">Open Studio</button>
      </div>
    </section>
  );
}
