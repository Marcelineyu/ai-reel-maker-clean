import React, { useState } from 'react';
import LandingSidebar from './LandingSidebar';
import HeroPreview from './HeroPreview';
import FeatureGrid from './FeatureGrid';
import HowItWorks from './HowItWorks';
import ProductPreview from './ProductPreview';
import UseCases from './UseCases';
import Footer from './Footer';
import ContactModal from './ContactModal';
import { navigateTo } from '../utils/navigation';

export default function LandingPage({ onOpenStudio }) {
  const [contactOpen, setContactOpen] = useState(false);

  const openStudio = () => {
    onOpenStudio?.();
    navigateTo('studio');
  };

  const scrollToFeatures = () => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });

  return (
    <div className="min-h-screen bg-bg">
      <LandingSidebar onOpenStudio={onOpenStudio} onOpenContact={() => setContactOpen(true)} />

      <div className="lg:ml-[260px] min-w-0">
        <section id="overview" className="scroll-mt-14 lg:scroll-mt-0">
          <div className="max-w-4xl xl:max-w-5xl px-5 sm:px-8 lg:px-12 py-14 lg:py-20">
            <div className="grid lg:grid-cols-[1fr,1.05fr] gap-12 lg:gap-16 items-center">
              <div>
                <p className="text-xs font-medium tracking-wide text-text-secondary uppercase">Video workflow</p>
                <h1 className="text-3xl sm:text-4xl font-semibold text-text-primary leading-[1.15] mt-3 tracking-tight">
                  From a rough idea to a ready-to-build reel.
                </h1>
                <p className="text-text-secondary mt-5 text-[17px] leading-relaxed max-w-lg">
                  Start with a simple prompt, then build out scenes, imagery, voiceover, translations, and publishing assets in one streamlined workspace.
                </p>
                <div className="flex flex-wrap gap-3 mt-8">
                  <button type="button" onClick={openStudio} className="btn-primary">Open Studio</button>
                  <button type="button" onClick={scrollToFeatures} className="btn-secondary">See what&apos;s included</button>
                </div>
              </div>
              <HeroPreview />
            </div>
          </div>
        </section>

        <FeatureGrid />
        <HowItWorks onOpenStudio={onOpenStudio} />
        <ProductPreview />
        <UseCases />

        <section className="py-16 lg:py-20 px-5 sm:px-8 lg:px-12 bg-surface-soft border-y border-border">
          <div className="max-w-2xl">
            <h2 className="text-2xl sm:text-[1.75rem] font-semibold text-text-primary tracking-tight">
              Ready when you are.
            </h2>
            <p className="text-text-secondary mt-3 leading-relaxed">
              Open the studio to shape your concept into scenes, visuals, narration, and publishing materials.
            </p>
            <button type="button" onClick={openStudio} className="btn-primary mt-7">Open Studio</button>
          </div>
        </section>

        <Footer onOpenStudio={onOpenStudio} onOpenContact={() => setContactOpen(true)} />
      </div>

      <ContactModal open={contactOpen} onClose={() => setContactOpen(false)} />
    </div>
  );
}
