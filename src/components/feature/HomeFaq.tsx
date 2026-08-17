import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Minus, Plus } from 'lucide-react';

/* ------------------------------------------------------------------ */
/* Content config                                                      */
/* ------------------------------------------------------------------ */

type FaqItem = {
  question: string;
  answer: string;
  link?: { label: string; href: string };
};

const FAQ_ITEMS: FaqItem[] = [
  {
    question: 'What is Forge?',
    answer:
      'Forge is an AI-assisted development workspace designed to help plan, build, refine, preview, version and export website and application projects from one organised environment.',
  },
  {
    question: 'Is Forge just another AI website generator?',
    answer:
      'No. Forge is being designed around a visible development workflow rather than a single prompt-and-result experience. Projects can include structured pages, components, files, tasks, versions and AI-assisted development tools.',
  },
  {
    question: 'Who is Forge for?',
    answer:
      'Forge is aimed at developers, founders, agencies and technical builders who want AI assistance while keeping more visibility and control over how their projects are structured and developed.',
  },
  {
    question: 'Does Forge use AI?',
    answer:
      'Yes. Forge includes AI-assisted workflows and is designed to support configurable AI providers. Available providers and models depend on the Forge configuration and plan.',
  },
  {
    question: 'What does local-first mean?',
    answer:
      'Forge is designed so development workflows can make greater use of locally controlled tooling and configurable AI infrastructure instead of requiring every part of the workflow to depend on one remote service.',
  },
  {
    question: 'Do I own the code I create?',
    answer:
      'Forge is designed around source-code ownership and exportable project structures so the finished project is not intended to remain trapped inside a proprietary visual editor.',
  },
  {
    question: 'Does Forge host my finished website?',
    answer:
      'Forge includes a publishing workflow for deploying projects to preview, staging and production environments, with support for custom domains. Projects can also be exported as source code for deployment with your chosen hosting provider.',
  },
  {
    question: 'Can I use templates?',
    answer:
      'Forge includes a templates area and is designed to support structured starting points. Availability may vary as the template library grows, and users should still be able to develop projects beyond their original starting point.',
  },
  {
    question: 'Can Forge work with an existing project?',
    answer:
      'Forge currently focuses on projects created and managed through its own workspace. Additional import workflows can be added as the platform develops.',
  },
  {
    question: 'Will Forge replace developers?',
    answer:
      'Forge is designed to assist developers, not remove them from the process. AI can help with planning, implementation and repetitive work, while the user remains responsible for direction, review and final decisions.',
  },
  {
    question: 'How much does Forge cost?',
    answer:
      'Forge offers different plans based on usage and included capabilities. See the pricing page for the full breakdown of every plan and allowance.',
    link: { label: 'View pricing', href: '/pricing' },
  },
  {
    question: 'Where can I learn more?',
    answer:
      'The Forge Help Centre and documentation cover the workspace, development workflow, AI-assisted building and publishing in more detail.',
    link: { label: 'Open documentation', href: '/help' },
  },
];

/* ------------------------------------------------------------------ */
/* JSON-LD (FAQPage) — injected to match the visible questions          */
/* ------------------------------------------------------------------ */

function useFaqSchema() {
  useEffect(() => {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.setAttribute('data-forge-faq', 'true');
    script.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: FAQ_ITEMS.map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: item.answer,
        },
      })),
    });
    document.head.appendChild(script);
    return () => {
      const existing = document.querySelector('script[data-forge-faq="true"]');
      if (existing) existing.remove();
    };
  }, []);
}

/* ------------------------------------------------------------------ */
/* Section                                                             */
/* ------------------------------------------------------------------ */

export function HomeFaq() {
  useFaqSchema();
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (index: number) => {
    setOpenIndex((current) => (current === index ? null : index));
  };

  return (
    <section id="faq" className="relative py-20 md:py-28 bg-forge-bg scroll-mt-16">
      <div className="max-w-6xl mx-auto px-5 md:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.6fr] gap-10 lg:gap-16">
          {/* Left — sticky heading area */}
          <div className="lg:sticky lg:top-24 self-start">
            <span className="inline-block text-xs font-semibold uppercase tracking-[0.2em] text-forge-amber mb-4">
              Questions Before You Build
            </span>
            <h2 className="text-2xl md:text-4xl font-bold text-forge-text-primary tracking-tight">
              Forge FAQ
            </h2>
            <p className="mt-4 text-forge-text-secondary text-sm md:text-base leading-relaxed max-w-sm">
              The important things to know before starting your first Forge project.
            </p>
          </div>

          {/* Right — accordion */}
          <div className="divide-y divide-forge-border-subtle border-y border-forge-border-subtle">
            {FAQ_ITEMS.map((item, index) => {
              const isOpen = openIndex === index;
              const panelId = `faq-panel-${index}`;
              const buttonId = `faq-button-${index}`;
              return (
                <div key={item.question} className="py-1">
                  <h3>
                    <button
                      type="button"
                      id={buttonId}
                      aria-expanded={isOpen}
                      aria-controls={panelId}
                      onClick={() => toggle(index)}
                      className="w-full flex items-center justify-between gap-4 py-4 text-left cursor-pointer group"
                    >
                      <span className="text-sm md:text-base font-semibold text-forge-text-primary group-hover:text-white transition-colors">
                        {item.question}
                      </span>
                      <span
                        className={`flex items-center justify-center w-6 h-6 shrink-0 rounded-md border transition-colors ${
                          isOpen
                            ? 'border-forge-amber/40 bg-forge-amber/10 text-forge-amber'
                            : 'border-forge-border-subtle text-forge-text-muted group-hover:border-forge-amber/30 group-hover:text-forge-amber'
                        }`}
                        aria-hidden="true"
                      >
                        {isOpen ? <Minus className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                      </span>
                    </button>
                  </h3>
                  <div
                    id={panelId}
                    role="region"
                    aria-labelledby={buttonId}
                    className={`grid transition-[grid-template-rows] duration-300 ease-out ${
                      isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                    }`}
                  >
                    <div className="overflow-hidden">
                      <div className="pb-5 pr-8">
                        <p className="text-sm text-forge-text-secondary leading-relaxed">
                          {item.answer}
                        </p>
                        {item.link && (
                          <Link
                            to={item.link.href}
                            className="inline-flex items-center gap-1.5 mt-3 text-sm font-medium text-forge-amber hover:text-forge-amber-dim transition-colors cursor-pointer"
                          >
                            {item.link.label}
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* CTA under FAQ */}
        <div className="mt-12 text-center">
          <p className="text-sm text-forge-text-secondary">
            Still have questions?{' '}
            <Link
              to="/help"
              className="text-forge-amber font-medium hover:text-forge-amber-dim transition-colors cursor-pointer"
            >
              Visit the Forge Help Centre
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}