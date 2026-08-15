import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight, Bot, Check, ChevronRight, Code2, Columns3, ExternalLink,
  Grip, Menu, MessageSquare, Monitor, MousePointer2, PanelLeft, Play,
  Rocket, ShieldCheck, Sparkles, Tablet, X,
} from 'lucide-react';
import './help-page.css';

const journeySteps = ['Describe', 'Plan', 'Build', 'Edit', 'Test', 'Publish'];

function ForgeWordmark() {
  return <span className="forge-help-wordmark" aria-label="Forge"><span aria-hidden="true" /><b>Forge</b></span>;
}

function WorkspacePreview({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`forge-workspace-preview${compact ? ' is-compact' : ''}`} aria-label="Forge workspace preview">
      <div className="forge-preview-topbar">
        <ForgeWordmark /><Menu size={13} />
        <div className="forge-preview-devices"><Monitor size={13} /><Tablet size={12} /><span>1280 px</span></div>
        <button type="button">Preview</button><button type="button" className="is-publish"><Play size={9} /> Publish</button>
      </div>
      <div className="forge-preview-body">
        <aside className="forge-elements-rail">
          <strong>Elements</strong>
          {['Section', 'Heading', 'Text', 'Image', 'Button', 'Container', 'Grid', 'Divider', 'Spacer'].map((item) => <span key={item}><Grip size={10} />{item}</span>)}
        </aside>
        <div className="forge-preview-canvas">
          <div className="forge-canvas-label">Sandbox</div>
          <div className="forge-demo-site">
            <div className="forge-demo-nav"><b>Devon <em>Smith</em></b><span>Home　 About　 Projects　 Contact</span></div>
            <div className="forge-demo-grid">
              <div><small>SOFTWARE DEVELOPER</small><h3>Building digital<br />experiences that<br />make an <em>impact.</em></h3><p>I design and build modern web applications with an exceptional user experience.</p><button type="button">View My Work</button></div>
              <pre>{`const developer = {\n  name: 'Devon Smith',\n  skills: ['React', 'TypeScript'],\n  passion: 'Building for the web'\n};`}</pre>
            </div>
          </div>
        </div>
        <aside className="forge-director-rail">
          <div className="forge-director-status"><b>Forge Director</b><span>● Online</span></div>
          <p><b>You</b><br />Create a modern portfolio homepage with a dark theme and orange accents.</p>
          <p><b>Forge Director</b><br />I’ll prepare the plan and assign the right agents.</p>
          <div className="forge-mini-plan"><b>Plan</b><span>✓ Create hero section</span><span>✓ Add about section</span><span className="active">→ Add projects grid</span><span>4. Add contact section</span></div>
          <label>Ask anything about your project… <ChevronRight size={12} /></label>
        </aside>
      </div>
    </div>
  );
}

export default function HelpPage() {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(2);
  const [tourOpen, setTourOpen] = useState(false);
  const progress = Math.round(((activeStep + 1) / journeySteps.length) * 100);

  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, []);
  useEffect(() => {
    if (!tourOpen) return undefined;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setTourOpen(false); };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [tourOpen]);

  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

  return (
    <div className="forge-help-page">
      <header className="forge-help-header">
        <button type="button" className="forge-help-logo-button" onClick={() => navigate('/')}><ForgeWordmark /></button>
        <nav aria-label="Help centre navigation">
          <button type="button" onClick={() => navigate('/dashboard')}>Workspace</button><button type="button" onClick={() => navigate('/projects')}>Projects</button><button type="button" onClick={() => navigate('/templates')}>Templates</button><button type="button" className="active" onClick={() => scrollTo('journey')}>How it works</button><button type="button" onClick={() => scrollTo('features')}>Pricing</button>
        </nav>
        <div className="forge-help-header-actions"><button type="button" onClick={() => scrollTo('features')}>Help</button><button type="button" onClick={() => navigate('/login')}>Sign in</button><button type="button" className="forge-help-primary" onClick={() => navigate('/projects/new')}>Start building</button></div>
      </header>

      <main>
        <section className="forge-help-hero">
          <div className="forge-help-intro">
            <p className="forge-help-breadcrumb">Help Centre <span>/</span> Getting Started</p>
            <h1>How to use Forge</h1><h2>Build your first website with confidence.</h2>
            <p className="forge-help-lede">Forge combines AI instructions with a visual drag-and-drop workspace, so you stay in control from the first prompt to publish.</p>
            <div className="forge-help-hero-actions"><button type="button" className="forge-help-primary" onClick={() => scrollTo('journey')}>Start interactive tour</button><button type="button" className="forge-help-secondary" onClick={() => setTourOpen(true)}><Play size={16} fill="currentColor" />Watch the 3-minute tour</button></div>
          </div>
          <WorkspacePreview />
        </section>

        <section className="forge-help-journey" id="journey">
          <h2>Your Forge journey</h2>
          <div className="forge-journey-track" style={{ '--journey-progress': `${progress}%` } as React.CSSProperties}>
            {journeySteps.map((step, index) => <button type="button" key={step} className={index === activeStep ? 'active' : index < activeStep ? 'complete' : ''} onClick={() => setActiveStep(index)}><span>{index + 1}</span><b>{step}</b></button>)}
          </div>
          <div className="forge-journey-cards">
            <article><MessageSquare /><span>1</span><div><h3>Describe what you need</h3><p>Tell Forge about your business, pages and features.</p></div></article>
            <article><MousePointer2 /><span>2</span><div><h3>Shape it your way</h3><p>Drag elements, edit content and ask AI for changes.</p></div></article>
            <article><ShieldCheck /><span>3</span><div><h3>Test and publish</h3><p>Review every device, fix issues and launch with confidence.</p></div></article>
          </div>
          <div className="forge-help-progress-row">
            <article><h3>Quick-start checklist</h3>{['Create a project', 'Choose a template or start blank', 'Build your first page', 'Preview and publish'].map((item) => <p key={item}><Check size={16} />{item}</p>)}</article>
            <article><h3>Continue where you left off</h3><p>{activeStep + 1} of 6 steps complete</p><div className="forge-progress-bar"><span style={{ width: `${progress}%` }} /></div><button type="button" className="forge-help-primary" onClick={() => setActiveStep((step) => Math.min(step + 1, 5))}>Resume tutorial</button></article>
          </div>
        </section>

        <section className="forge-help-features" id="features">
          <p className="forge-help-eyebrow">BUILD YOUR WAY</p><h2>Powerful tools. One simple workspace.</h2><p className="forge-help-section-copy">Use AI when you want speed, visual controls when you want precision, or combine both.</p>
          <div className="forge-feature-grid">
            <article><Bot /><h3>Forge Director</h3><p>Describe a change in plain English. Forge prepares the build plan, assigns the right agents and shows the work before it begins.</p><button type="button" onClick={() => scrollTo('director')}>Learn more <ArrowRight size={14} /></button></article>
            <article><MousePointer2 /><h3>Drag-and-drop editor</h3><p>Add, move and resize text, buttons, images, sections and reusable components directly on the canvas.</p><button type="button" onClick={() => scrollTo('testing')}>Learn more <ArrowRight size={14} /></button></article>
            <article><Sparkles /><h3>Prompt Builder</h3><p>Turn a rough idea into a structured build prompt with pages, features and clear design requirements.</p><button type="button" onClick={() => scrollTo('director')}>Learn more <ArrowRight size={14} /></button></article>
            <article><Columns3 /><h3>Elements library</h3><p>Choose ready-made sections, forms, navigation, dashboards and components, then customise every detail.</p><button type="button" onClick={() => scrollTo('testing')}>Learn more <ArrowRight size={14} /></button></article>
          </div>
        </section>

        <section className="forge-help-deep-dive" id="director">
          <div className="forge-director-demo">
            <div className="forge-demo-heading"><ForgeWordmark /><span>Director　● Online</span></div>
            <div className="forge-demo-message"><b>You</b><p>Create a pricing page with monthly and annual plans.</p></div><div className="forge-demo-message is-forge"><b>Forge Director</b><p>I’ve prepared a build plan with the right agents.</p></div>
            <div className="forge-build-plan"><b>Build plan</b><span>Planner <em>Ready</em></span><span>UI Builder <em>Ready</em></span><span>Content Writer <em>Ready</em></span><span>QA Engineer <em>Ready</em></span></div>
            <div className="forge-demo-actions"><button type="button">Edit plan</button><button type="button">Approve &amp; build</button></div>
          </div>
          <div><p className="forge-help-eyebrow">AI-ASSISTED BUILDING</p><h2>Ask Forge. Review the plan. Stay in control.</h2><p>Forge shows which agents will work, what they will change and the estimated credit cost before the build begins.</p><ul><li><Check />Approve the plan before building</li><li><Check />See live agent progress</li><li><Check />Review every file change</li><li><Check />Undo or restore a version</li></ul><button type="button" className="forge-help-secondary" onClick={() => navigate('/projects/new')}>Explore Forge Director <ExternalLink size={15} /></button></div>
        </section>

        <section className="forge-help-testing" id="testing">
          <div><p className="forge-help-eyebrow">QUALITY AND PUBLISHING</p><h2>Test every change before it goes live.</h2><p>Preview desktop, tablet and mobile layouts, run automated checks and publish only when your project is ready.</p><ul><li><Check />Responsive device previews</li><li><Check />Automated browser testing</li><li><Check />Build logs and issue repair</li><li><Check />Deploy, export or connect GitHub</li></ul></div>
          <div className="forge-device-demo"><div className="forge-device-tabs"><span className="active"><Monitor />Desktop</span><span><Tablet />Tablet</span><span><PanelLeft />Mobile</span></div><div className="forge-device-screen"><Code2 /><h3>Your website preview</h3><p>Responsive layout · All checks passed</p><button type="button"><Rocket />Ready to publish</button></div></div>
        </section>

        <section className="forge-help-cta"><Rocket /><h2>Ready to build something?</h2><p>Start with a template, upload an existing project or describe your idea to Forge.</p><div><button type="button" className="forge-help-primary" onClick={() => navigate('/projects/new')}>Start building</button><button type="button" className="forge-help-secondary" onClick={() => navigate('/templates')}>Browse templates</button></div></section>
      </main>

      {tourOpen && <div className="forge-tour-backdrop" role="presentation" onMouseDown={() => setTourOpen(false)}><div className="forge-tour-modal" role="dialog" aria-modal="true" aria-labelledby="forge-tour-title" onMouseDown={(event) => event.stopPropagation()}><button type="button" className="forge-tour-close" aria-label="Close tour" onClick={() => setTourOpen(false)}><X /></button><p className="forge-help-eyebrow">3-MINUTE TOUR</p><h2 id="forge-tour-title">Meet your Forge workspace</h2><p>Describe your idea, approve the build plan, shape the result visually and publish when every check passes.</p><WorkspacePreview compact /><button type="button" className="forge-help-primary" onClick={() => { setTourOpen(false); scrollTo('journey'); }}>Start the guided tour</button></div></div>}
    </div>
  );
}
