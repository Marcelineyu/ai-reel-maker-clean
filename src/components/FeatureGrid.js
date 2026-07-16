import React from 'react';

function Icon({ children }) {
  return (
    <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-surface-soft text-primary border border-border/80" aria-hidden>
      {children}
    </span>
  );
}

const features = [
  {
    title: 'Scene structure',
    body: 'Build a structured set of scenes from a short concept.',
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 6h16M4 10h16M4 14h10M4 18h6" />
      </svg>
    ),
  },
  {
    title: 'Visual direction',
    body: 'Generate visuals that match the tone of your idea, with optional reference images.',
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    title: 'Voiceover',
    body: 'Create narration for each scene with your preferred voice provider.',
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
      </svg>
    ),
  },
  {
    title: 'Translation',
    body: 'Create voiceover and multilingual versions for broader reach.',
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
      </svg>
    ),
  },
  {
    title: 'Publishing prep',
    body: 'Prepare titles, descriptions, and thumbnails for publishing.',
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M7 4h10a2 2 0 012 2v12a2 2 0 01-2 2H7a2 2 0 01-2-2V6a2 2 0 012-2zM9 8h6M9 12h6M9 16h4" />
      </svg>
    ),
  },
  {
    title: 'Creative assistant',
    body: 'Review scenes, refine narration, and update content through conversation.',
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
  },
];

export default function FeatureGrid() {
  return (
    <section id="features" className="scroll-mt-14 lg:scroll-mt-0 py-16 lg:py-20 px-5 sm:px-8 lg:px-12 bg-surface border-t border-border">
      <div className="max-w-4xl xl:max-w-5xl">
        <h2 className="text-2xl sm:text-[1.75rem] font-semibold text-text-primary tracking-tight max-w-xl">
          Everything you need to develop a reel
        </h2>
        <p className="text-text-secondary mt-3 max-w-lg leading-relaxed">
          A focused set of tools for structuring stories, producing assets, and getting closer to publish-ready output.
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-10">
          {features.map((f) => (
            <article key={f.title} className="card card-hover p-5">
              <Icon>{f.icon}</Icon>
              <h3 className="font-medium text-text-primary mt-4">{f.title}</h3>
              <p className="text-sm text-text-secondary mt-2 leading-relaxed">{f.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
