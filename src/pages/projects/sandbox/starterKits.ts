import { createBlankDocument, type CanvasElement, type SandboxDocument } from './sandboxPersistence';
import { buildManifest, type TemplateManifest, type TemplateType, type LicenceKey } from './sandboxTemplates';

/* ──────────────────────────────────────────────────────────────
   Forge starter kits — first-party, installable starter templates.

   These are authored by Forge (not community submissions), built
   from a real SandboxDocument blueprint with typed placeholders.
   They are not mock "ratings/installs" — install counts are zero
   until someone actually installs one.
   ────────────────────────────────────────────────────────────── */

let seed = 0;
function uid(prefix: string): string {
  seed += 1;
  return `${prefix}-starter-${seed}-${Date.now().toString(36)}`;
}

function heading(content: string, y = 90, width = 620, height = 64): CanvasElement {
  return { id: uid('heading'), type: 'Heading', name: 'Heading', content, x: 140, y, width, height, background: 'transparent', color: '#111820' };
}

function text(content: string, y = 170, width = 600, height = 80): CanvasElement {
  return { id: uid('text'), type: 'Text', name: 'Text', content, x: 150, y, width, height, background: 'transparent', color: '#424a52' };
}

function button(content: string, y = 280, x = 340, width = 200, height = 50): CanvasElement {
  return { id: uid('button'), type: 'Button', name: 'Button', content, x, y, width, height, background: '#f5a400', color: '#101820' };
}

function columns(y = 400, width = 640, height = 200): CanvasElement {
  return { id: uid('columns'), type: 'Columns', name: 'Feature columns', content: 'Three columns', x: 130, y, width, height, background: '#ffffff', color: '#59626b' };
}

function contactForm(y = 360, width = 520, height = 260): CanvasElement {
  return {
    id: uid('form'), type: 'Form', name: 'Contact form', content: 'Contact us', x: 190, y, width, height, background: '#ffffff', color: '#111820',
    form: {
      name: 'Contact us', description: 'We would love to hear from you.', successAction: 'message', successHeading: 'Thank you', successMessage: 'Your message has been received.', submitLabel: 'Send message', loadingText: 'Sending…', errorMessage: 'Something went wrong. Please try again.', redirectUrl: '', notifyRecipients: '{{contact_email}}', notifySubject: 'New enquiry', honeypot: true, minTime: true, turnstile: false, retentionDays: 365, privacyPolicyUrl: '', consentLabel: 'I agree to be contacted about this enquiry.', marketingConsentLabel: '', fields: [
        { id: uid('fld'), key: 'name', type: 'text', label: 'Name', placeholder: 'Your name', helpText: '', required: true, defaultValue: '', options: [], validation: { maxLength: 200 }, errorMessage: 'Please enter your name.', autocomplete: 'name', width: 'full' },
        { id: uid('fld'), key: 'email', type: 'email', label: 'Email', placeholder: 'you@example.com', helpText: '', required: true, defaultValue: '', options: [], validation: {}, errorMessage: 'Enter a valid email.', autocomplete: 'email', width: 'full' },
        { id: uid('fld'), key: 'message', type: 'textarea', label: 'Message', placeholder: 'How can we help?', helpText: '', required: true, defaultValue: '', options: [], validation: { maxLength: 2000 }, errorMessage: 'Please enter a message.', autocomplete: 'off', width: 'full' },
        { id: uid('fld'), key: 'submit', type: 'submit', label: 'Send message', placeholder: '', helpText: '', required: false, defaultValue: '', options: [], validation: {}, errorMessage: '', autocomplete: 'off', width: 'full' },
      ],
    },
  };
}

function baseDocument(projectName: string): SandboxDocument {
  const doc = createBlankDocument(projectName);
  // Replace the blank home page slug/name to be more neutral.
  doc.pages = doc.pages.map((page) => ({ ...page, name: 'Home', slug: '/' }));
  return doc;
}

function withElements(doc: SandboxDocument, elements: CanvasElement[]): SandboxDocument {
  return { ...doc, pages: doc.pages.map((page, index) => index === 0 ? { ...page, elements } : page) };
}

async function build(input: {
  id: string; type: TemplateType; name: string; description: string; licence: LicenceKey;
  document: SandboxDocument; features?: string[];
}): Promise<TemplateManifest> {
  return buildManifest({
    templateId: input.id,
    templateType: input.type,
    name: input.name,
    description: input.description,
    author: { name: 'Forge', url: 'https://forge.readdy.ai' },
    licence: input.licence,
    document: input.document,
    requiredFeatures: input.features,
  });
}

export async function getStarterKits(): Promise<TemplateManifest[]> {
  const landing = withElements(baseDocument('{{business_name}}'), [
    heading('{{tagline}}', 90, 620, 120),
    text('{{description}}', 220, 600, 90),
    button('{{primary_cta}}', 330, 330, 220, 54),
    columns(430, 640, 200),
  ]);

  const service = withElements(baseDocument('{{business_name}}'), [
    heading('{{tagline}}', 90, 620, 110),
    text('{{description}}', 210, 600, 90),
    columns(330, 640, 180),
    contactForm(560, 520, 260),
  ]);

  const portfolio = withElements(baseDocument('{{business_name}}'), [
    heading('{{tagline}}', 90, 620, 110),
    text('{{description}}', 210, 600, 90),
    button('View work', 320, 330, 200, 52),
    columns(420, 640, 220),
  ]);

  return [
    await build({
      id: 'forge-launch-landing',
      type: 'website',
      name: 'Launch Landing',
      description: 'A clean single-page landing kit with hero, feature columns and a clear call to action.',
      licence: 'forge-community',
      document: landing,
      features: ['multi_page'],
    }),
    await build({
      id: 'forge-local-service',
      type: 'website',
      name: 'Local Service',
      description: 'A service-business site with a hero, feature columns and a contact form.',
      licence: 'forge-community',
      document: service,
      features: ['forms'],
    }),
    await build({
      id: 'forge-portfolio',
      type: 'website',
      name: 'Creative Portfolio',
      description: 'A minimal portfolio layout with a headline, description and work gallery section.',
      licence: 'forge-community',
      document: portfolio,
    }),
    await build({
      id: 'forge-contact-page',
      type: 'page',
      name: 'Contact Page',
      description: 'A standalone contact page with a ready-to-connect form.',
      licence: 'forge-community',
      document: withElements(baseDocument('Contact'), [heading('Get in touch', 80, 560, 100), text('{{description}}', 190, 560, 80), contactForm(300, 520, 280)]),
      features: ['forms'],
    }),
  ];
}