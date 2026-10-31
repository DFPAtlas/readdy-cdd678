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
      'Forge is an AI website builder. You describe the site, a Master Agent plans it, specialist agents build the pages, content and forms, and you refine everything in a live preview before publishing or exporting.',
  },
  {
    question: 'How is Forge different from other AI website builders?',
    answer:
      'Two things. You can see the work: the plan, the tasks and every change are shown as they happen, not hidden behind one prompt box. And you keep the result: export your site as standard files and host it anywhere, with no lock-in.',
  },
  {
    question: 'Who is Forge for?',
    answer:
      'Founders, freelancers, agencies and developers who want a professional website fast, without giving up control of how it is built or where it lives.',
  },
  {
    question: 'Which AI models does Forge use?',
    answer:
      'Forge works across several AI providers, including OpenAI, Anthropic and Google, and routes each task to a suitable model automatically. If a provider has an outage, Forge falls back to another.',
  },
  {
    question: 'Do I own the code I create?',
    answer:
      'Yes. Export your project as a standard static website (HTML, CSS and assets) that runs without Forge, and host it wherever you like.',
  },
  {
    question: 'Does Forge host my finished website?',
    answer:
      'It can. Publish to preview, staging and production environments with your own custom domain, or export the source and use your own host.',
  },
  {
    question: 'Can I start from a template?',
    answer:
      'Yes. Pick a starter from the template library or start blank. Either way, everything stays fully editable.',
  },
  {
    question: 'Can I import an existing website?',
    answer:
      'Not yet. Forge currently builds projects created in its own workspace.',
  },
  {
    question: 'How much does Forge cost?',
    answer:
      'There is a Free plan to try Forge, with paid plans for publishing live sites and more AI capacity. See the pricing page for every plan and allowance.',
    link: { label: 'View pricing', href: '/pricing' },
  },
  {
    question: 'Where can I learn more?',
    answer:
      'The Forge Help Centre covers the workspace, building with AI, publishing and exporting in detail.',
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