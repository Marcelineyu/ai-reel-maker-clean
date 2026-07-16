import React from 'react';

const PROMPT_EXAMPLES = [
  'A quiet morning inside a Tokyo coffee shop',
  'The future of urban farming',
  'A cinematic journey through Iceland',
  'How creative work is changing',
];

export default function MovieInput({ value, onChange, disabled, onExampleClick }) {
  const maxLen = 2000;
  const count = value.length;

  return (
    <div className="space-y-3">
      <label htmlFor="movie-idea" className="block text-sm font-medium text-text-primary">
        Concept
      </label>
      <p className="text-sm text-text-secondary leading-relaxed">
        Describe the story, setting, and tone. Specific details help shape stronger scenes.
      </p>
      <textarea
        id="movie-idea"
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, maxLen))}
        placeholder="e.g. A documentary-style piece about a neighborhood bakery at opening hour…"
        className="input-field min-h-[148px] resize-y text-[15px] leading-relaxed"
        disabled={disabled}
      />
      <div className="flex justify-end text-xs text-text-secondary">
        <span>{count} / {maxLen}</span>
      </div>
      <div>
        <p className="text-xs text-text-secondary mb-2">Example prompts</p>
        <div className="flex flex-wrap gap-2">
          {PROMPT_EXAMPLES.map((example) => (
            <button
              key={example}
              type="button"
              disabled={disabled}
              onClick={() => onExampleClick?.(example)}
              className="text-xs px-3 py-1.5 rounded-md border border-border bg-surface text-text-secondary hover:border-primary/30 hover:text-text-primary transition-colors disabled:opacity-50"
            >
              {example}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
