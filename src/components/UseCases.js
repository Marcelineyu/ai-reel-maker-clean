import React from 'react';

const cases = [
  { title: 'Short-form social', tag: 'Social', desc: 'Structure quick, visual stories built for vertical formats and fast viewing.' },
  { title: 'YouTube storytelling', tag: 'YouTube', desc: 'Develop scene-by-scene narratives with titles, descriptions, and thumbnails in mind.' },
  { title: 'Product concepts', tag: 'Product', desc: 'Turn early ideas into visual storyboards with consistent reference direction.' },
  { title: 'Educational explainers', tag: 'Education', desc: 'Break down topics into clear scenes with narration and language options.' },
];

export default function UseCases() {
  return (
    <section id="use-cases" className="scroll-mt-14 lg:scroll-mt-0 py-16 lg:py-20 px-5 sm:px-8 lg:px-12 bg-bg">
      <div className="max-w-4xl xl:max-w-5xl">
        <h2 className="text-2xl sm:text-[1.75rem] font-semibold text-text-primary tracking-tight">Built for different formats</h2>
        <p className="text-text-secondary mt-3 max-w-lg leading-relaxed">Whether you are prototyping an idea or preparing something to share, the workflow stays the same.</p>

        <div className="grid sm:grid-cols-2 gap-4 mt-10">
          {cases.map((c) => (
            <article key={c.title} className="card card-hover p-5">
              <span className="text-[11px] font-medium uppercase tracking-wide text-primary">{c.tag}</span>
              <h3 className="font-medium text-text-primary mt-2">{c.title}</h3>
              <p className="text-sm text-text-secondary mt-2 leading-relaxed">{c.desc}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
