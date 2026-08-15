/* ──────────────────────────────────────────────────────────────
   Generated website design system (theme) — isolated from Forge UI
   ────────────────────────────────────────────────────────────── */

export type ThemeMode = 'light' | 'dark' | 'system' | 'user';

export type ColorKey =
  | 'primary' | 'primaryHover' | 'primaryActive'
  | 'secondary' | 'accent'
  | 'background' | 'surface' | 'elevatedSurface'
  | 'heading' | 'body' | 'muted' | 'border'
  | 'success' | 'warning' | 'error' | 'info'
  | 'overlay' | 'focusRing';

export type ColorScale = Record<ColorKey, string>;

export const COLOR_KEYS: ColorKey[] = [
  'primary', 'primaryHover', 'primaryActive', 'secondary', 'accent',
  'background', 'surface', 'elevatedSurface', 'heading', 'body', 'muted', 'border',
  'success', 'warning', 'error', 'info', 'overlay', 'focusRing',
];

export const COLOR_LABELS: Record<ColorKey, string> = {
  primary: 'Primary', primaryHover: 'Primary hover', primaryActive: 'Primary active',
  secondary: 'Secondary', accent: 'Accent',
  background: 'Background', surface: 'Surface', elevatedSurface: 'Elevated surface',
  heading: 'Heading', body: 'Body text', muted: 'Muted text', border: 'Border',
  success: 'Success', warning: 'Warning', error: 'Error', info: 'Info',
  overlay: 'Overlay', focusRing: 'Focus ring',
};

/* ── Typography ── */

export type TypographyRoleKey =
  | 'display' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
  | 'bodyLarge' | 'body' | 'bodySmall' | 'caption' | 'label'
  | 'button' | 'quote' | 'code';

export type TypographyRole = {
  fontFamily: string;
  fontSize: string;
  fontWeight: number;
  lineHeight: number;
  letterSpacing: string;
  textTransform: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  textDecoration: 'none' | 'underline' | 'line-through';
};

export type TypographyScale = Record<TypographyRoleKey, TypographyRole>;

export const TYPOGRAPHY_ROLE_KEYS: TypographyRoleKey[] = [
  'display', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'bodyLarge', 'body', 'bodySmall', 'caption', 'label', 'button', 'quote', 'code',
];

export const TYPOGRAPHY_ROLE_LABELS: Record<TypographyRoleKey, string> = {
  display: 'Display', h1: 'Heading 1', h2: 'Heading 2', h3: 'Heading 3',
  h4: 'Heading 4', h5: 'Heading 5', h6: 'Heading 6',
  bodyLarge: 'Body large', body: 'Body', bodySmall: 'Body small',
  caption: 'Caption', label: 'Label', button: 'Button', quote: 'Quote', code: 'Code',
};

/* ── Font library ── */

export type FontEntry = {
  id: string;
  name: string;
  family: string;
  google?: string;
  weights: number[];
};

export const FONT_LIBRARY: FontEntry[] = [
  { id: 'system', name: 'System', family: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif", weights: [400, 500, 600, 700] },
  { id: 'inter', name: 'Inter', family: "'Inter', sans-serif", google: 'Inter', weights: [400, 500, 600, 700, 800] },
  { id: 'dm-sans', name: 'DM Sans', family: "'DM Sans', sans-serif", google: 'DM+Sans', weights: [400, 500, 700] },
  { id: 'space-grotesk', name: 'Space Grotesk', family: "'Space Grotesk', sans-serif", google: 'Space+Grotesk', weights: [400, 500, 600, 700] },
  { id: 'playfair', name: 'Playfair Display', family: "'Playfair Display', serif", google: 'Playfair+Display', weights: [400, 500, 600, 700] },
  { id: 'merriweather', name: 'Merriweather', family: "'Merriweather', serif", google: 'Merriweather', weights: [300, 400, 700] },
  { id: 'jetbrains-mono', name: 'JetBrains Mono', family: "'JetBrains Mono', monospace", google: 'JetBrains+Mono', weights: [400, 500] },
];

export function fontById(id: string): FontEntry {
  return FONT_LIBRARY.find((font) => font.id === id) ?? FONT_LIBRARY[0];
}

/* ── Spacing ── */

export type SpacingKey = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';

export type SpacingScale = { base: number; scale: Record<SpacingKey, number> };

export const SPACING_KEYS: SpacingKey[] = ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl'];

export const SPACING_LABELS: Record<SpacingKey, string> = {
  '2xs': '2XS', xs: 'XS', sm: 'SM', md: 'MD', lg: 'LG', xl: 'XL', '2xl': '2XL', '3xl': '3XL', '4xl': '4XL',
};

/* ── Radius / border / shadow ── */

export type RadiusScale = {
  none: string; small: string; medium: string; large: string; xlarge: string; pill: string; circle: string;
};

export type BorderTokens = {
  defaultWidth: number; strongWidth: number; defaultStyle: string; defaultColor: string; focusBorder: string;
};

export type ShadowScale = {
  none: string; small: string; medium: string; large: string; floating: string; modal: string;
};

export const RADIUS_KEYS = ['none', 'small', 'medium', 'large', 'xlarge', 'pill', 'circle'] as const;
export const SHADOW_KEYS = ['none', 'small', 'medium', 'large', 'floating', 'modal'] as const;

/* ── Buttons ── */

export type ButtonVariantKey = 'primary' | 'secondary' | 'outline' | 'ghost' | 'link' | 'destructive';
export type ButtonSizeKey = 'small' | 'medium' | 'large';

export type ButtonVariant = {
  background: string;
  textColor: string;
  borderColor: string;
  radius: string;
  paddingX: number;
  paddingY: number;
  iconGap: number;
  shadow: string;
};

export type ButtonSize = { paddingX: number; paddingY: number; fontSize: string; height: number };

export type ButtonTokens = {
  variants: Record<ButtonVariantKey, ButtonVariant>;
  sizes: Record<ButtonSizeKey, ButtonSize>;
};

export const BUTTON_VARIANT_KEYS: ButtonVariantKey[] = ['primary', 'secondary', 'outline', 'ghost', 'link', 'destructive'];
export const BUTTON_SIZE_KEYS: ButtonSizeKey[] = ['small', 'medium', 'large'];

/* ── Forms ── */

export type FormStyleTokens = {
  inputRadius: string;
  inputPaddingX: number;
  inputPaddingY: number;
  inputBackground: string;
  inputBorderColor: string;
  focusBorderColor: string;
  errorBorderColor: string;
  labelColor: string;
  helpColor: string;
};

/* ── Images ── */

export type ImageTokens = {
  radius: string;
  objectFit: 'cover' | 'contain' | 'fill';
  aspectRatio: string;
  shadow: string;
  captionStyle: string;
  videoRadius: string;
  lazyLoad: boolean;
  placeholderColor: string;
};

/* ── Motion ── */

export type MotionTokens = {
  instant: string;
  fast: string;
  normal: string;
  slow: string;
  entranceEasing: string;
  exitEasing: string;
  standardEasing: string;
  pageTransition: boolean;
  hoverTransition: boolean;
  buttonFeedback: boolean;
  menuMotion: boolean;
  modalMotion: boolean;
  scrollReveal: boolean;
  reducedMotion: boolean;
};

/* ── Layout / container ── */

export type ContainerTokens = {
  maxWidth: number;
  wideWidth: number;
  gutter: number;
  sectionVertical: number;
  gridColumns: number;
  gridGap: number;
  alignment: 'left' | 'center';
  fullWidth: boolean;
};

export type Breakpoints = { tablet: number; mobile: number };

/* ── Brand ── */

export type BrandSettings = {
  name: string;
  shortName: string;
  tagline: string;
  description: string;
  logoAssetId: string;
  alternateLogoAssetId: string;
  darkLogoAssetId: string;
  lightLogoAssetId: string;
  faviconAssetId: string;
  appIconAssetId: string;
  socialImageAssetId: string;
  logoWidth: number;
  logoClearSpace: number;
  logoAlignment: 'left' | 'center';
  textFallback: string;
  headerLogo: boolean;
  footerLogo: boolean;
};

/* ── Theme definition ── */

export type ThemeDefinition = {
  id: string;
  name: string;
  mode: ThemeMode;
  brand: BrandSettings;
  colors: { light: ColorScale; dark: ColorScale };
  headingFontId: string;
  bodyFontId: string;
  typography: TypographyScale;
  spacing: SpacingScale;
  container: ContainerTokens;
  breakpoints: Breakpoints;
  radius: RadiusScale;
  border: BorderTokens;
  shadow: ShadowScale;
  buttons: ButtonTokens;
  forms: FormStyleTokens;
  images: ImageTokens;
  motion: MotionTokens;
};

/* ── Defaults ── */

export function defaultColorScale(): ColorScale {
  return {
    primary: '#f5a400', primaryHover: '#ffbb2e', primaryActive: '#d98c00',
    secondary: '#101820', accent: '#e59100',
    background: '#ffffff', surface: '#f7f8fa', elevatedSurface: '#ffffff',
    heading: '#111820', body: '#424a52', muted: '#7d8790', border: '#e2e6ea',
    success: '#2e9e5b', warning: '#e6a700', error: '#c0392b', info: '#3b82c4',
    overlay: '#0b121a', focusRing: '#f5a400',
  };
}

export function defaultDarkColorScale(): ColorScale {
  return {
    primary: '#f5a400', primaryHover: '#ffc247', primaryActive: '#d98c00',
    secondary: '#e2e8f0', accent: '#ffc247',
    background: '#0b121a', surface: '#101820', elevatedSurface: '#161f28',
    heading: '#edf1f5', body: '#c4ccd4', muted: '#8f99a2', border: '#26313c',
    success: '#5bd08a', warning: '#f5c400', error: '#ff8a8a', info: '#8ab4f8',
    overlay: '#000000', focusRing: '#f5a400',
  };
}

function defaultTypography(): TypographyScale {
  const heading = "'Inter', sans-serif";
  const body = "'Inter', sans-serif";
  return {
    display: { fontFamily: heading, fontSize: 'clamp(44px, 6vw, 72px)', fontWeight: 800, lineHeight: 1.02, letterSpacing: '-0.02em', textTransform: 'none', textDecoration: 'none' },
    h1: { fontFamily: heading, fontSize: 'clamp(32px, 4vw, 48px)', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.02em', textTransform: 'none', textDecoration: 'none' },
    h2: { fontFamily: heading, fontSize: 'clamp(26px, 3vw, 36px)', fontWeight: 760, lineHeight: 1.15, letterSpacing: '-0.01em', textTransform: 'none', textDecoration: 'none' },
    h3: { fontFamily: heading, fontSize: 'clamp(21px, 2.4vw, 28px)', fontWeight: 700, lineHeight: 1.2, letterSpacing: '-0.01em', textTransform: 'none', textDecoration: 'none' },
    h4: { fontFamily: heading, fontSize: '20px', fontWeight: 700, lineHeight: 1.25, letterSpacing: '0', textTransform: 'none', textDecoration: 'none' },
    h5: { fontFamily: heading, fontSize: '17px', fontWeight: 650, lineHeight: 1.3, letterSpacing: '0', textTransform: 'none', textDecoration: 'none' },
    h6: { fontFamily: heading, fontSize: '15px', fontWeight: 650, lineHeight: 1.35, letterSpacing: '0', textTransform: 'none', textDecoration: 'none' },
    bodyLarge: { fontFamily: body, fontSize: '19px', fontWeight: 400, lineHeight: 1.6, letterSpacing: '0', textTransform: 'none', textDecoration: 'none' },
    body: { fontFamily: body, fontSize: '16px', fontWeight: 400, lineHeight: 1.6, letterSpacing: '0', textTransform: 'none', textDecoration: 'none' },
    bodySmall: { fontFamily: body, fontSize: '14px', fontWeight: 400, lineHeight: 1.55, letterSpacing: '0', textTransform: 'none', textDecoration: 'none' },
    caption: { fontFamily: body, fontSize: '12px', fontWeight: 400, lineHeight: 1.5, letterSpacing: '0', textTransform: 'none', textDecoration: 'none' },
    label: { fontFamily: body, fontSize: '12px', fontWeight: 600, lineHeight: 1.4, letterSpacing: '0.02em', textTransform: 'none', textDecoration: 'none' },
    button: { fontFamily: body, fontSize: '15px', fontWeight: 700, lineHeight: 1, letterSpacing: '0', textTransform: 'none', textDecoration: 'none' },
    quote: { fontFamily: "'Merriweather', serif", fontSize: '20px', fontWeight: 400, lineHeight: 1.6, letterSpacing: '0', textTransform: 'none', textDecoration: 'none' },
    code: { fontFamily: "'JetBrains Mono', monospace", fontSize: '14px', fontWeight: 400, lineHeight: 1.5, letterSpacing: '0', textTransform: 'none', textDecoration: 'none' },
  };
}

export function defaultTheme(): ThemeDefinition {
  return {
    id: 'forge-modern',
    name: 'Forge Modern',
    mode: 'light',
    brand: {
      name: 'FORGE', shortName: 'FORGE', tagline: 'Build smarter. Ship faster.', description: '',
      logoAssetId: '', alternateLogoAssetId: '', darkLogoAssetId: '', lightLogoAssetId: '',
      faviconAssetId: '', appIconAssetId: '', socialImageAssetId: '',
      logoWidth: 120, logoClearSpace: 16, logoAlignment: 'left', textFallback: 'FORGE',
      headerLogo: true, footerLogo: true,
    },
    colors: { light: defaultColorScale(), dark: defaultDarkColorScale() },
    headingFontId: 'inter', bodyFontId: 'inter',
    typography: defaultTypography(),
    spacing: { base: 4, scale: { '2xs': 4, xs: 8, sm: 12, md: 16, lg: 24, xl: 32, '2xl': 48, '3xl': 64, '4xl': 96 } },
    container: { maxWidth: 1140, wideWidth: 1400, gutter: 24, sectionVertical: 80, gridColumns: 12, gridGap: 24, alignment: 'center', fullWidth: false },
    breakpoints: { tablet: 768, mobile: 390 },
    radius: { none: '0px', small: '4px', medium: '8px', large: '12px', xlarge: '16px', pill: '999px', circle: '50%' },
    border: { defaultWidth: 1, strongWidth: 2, defaultStyle: 'solid', defaultColor: '#e2e6ea', focusBorder: '#f5a400' },
    shadow: { none: 'none', small: '0 1px 2px rgba(16,24,32,0.06)', medium: '0 4px 12px rgba(16,24,32,0.08)', large: '0 12px 32px rgba(16,24,32,0.12)', floating: '0 18px 48px rgba(16,24,32,0.18)', modal: '0 24px 64px rgba(16,24,32,0.24)' },
    buttons: {
      variants: {
        primary: { background: '#f5a400', textColor: '#101820', borderColor: 'transparent', radius: '6px', paddingX: 20, paddingY: 0, iconGap: 8, shadow: 'none' },
        secondary: { background: '#101820', textColor: '#ffffff', borderColor: 'transparent', radius: '6px', paddingX: 20, paddingY: 0, iconGap: 8, shadow: 'none' },
        outline: { background: 'transparent', textColor: '#101820', borderColor: '#c4ccd4', radius: '6px', paddingX: 20, paddingY: 0, iconGap: 8, shadow: 'none' },
        ghost: { background: 'transparent', textColor: '#101820', borderColor: 'transparent', radius: '6px', paddingX: 16, paddingY: 0, iconGap: 8, shadow: 'none' },
        link: { background: 'transparent', textColor: '#f5a400', borderColor: 'transparent', radius: '0px', paddingX: 4, paddingY: 0, iconGap: 6, shadow: 'none' },
        destructive: { background: '#c0392b', textColor: '#ffffff', borderColor: 'transparent', radius: '6px', paddingX: 20, paddingY: 0, iconGap: 8, shadow: 'none' },
      },
      sizes: {
        small: { paddingX: 14, paddingY: 0, fontSize: '13px', height: 32 },
        medium: { paddingX: 20, paddingY: 0, fontSize: '15px', height: 40 },
        large: { paddingX: 26, paddingY: 0, fontSize: '16px', height: 48 },
      },
    },
    forms: {
      inputRadius: '6px', inputPaddingX: 12, inputPaddingY: 9,
      inputBackground: '#ffffff', inputBorderColor: '#d5dae0', focusBorderColor: '#f5a400',
      errorBorderColor: '#c0392b', labelColor: '#424a52', helpColor: '#7d8790',
    },
    images: {
      radius: '8px', objectFit: 'cover', aspectRatio: '4 / 3', shadow: 'none',
      captionStyle: 'caption', videoRadius: '8px', lazyLoad: true, placeholderColor: '#eef0f2',
    },
    motion: {
      instant: '0ms', fast: '120ms', normal: '220ms', slow: '400ms',
      entranceEasing: 'cubic-bezier(0.16, 1, 0.3, 1)', exitEasing: 'cubic-bezier(0.4, 0, 1, 1)', standardEasing: 'cubic-bezier(0.4, 0, 0.2, 1)',
      pageTransition: false, hoverTransition: true, buttonFeedback: true, menuMotion: true, modalMotion: true, scrollReveal: false, reducedMotion: false,
    },
  };
}

/* ──────────────────────────────────────────────────────────────
   Colour math — real WCAG contrast, tonal scale, hex helpers
   ────────────────────────────────────────────────────────────── */

type Rgb = { r: number; g: number; b: number };

export function hexToRgb(hex: string): Rgb | null {
  const m = hex.trim().replace('#', '');
  if (!/^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$/.test(m)) return null;
  const full = m.length === 3 ? m.split('').map((c) => c + c).join('') : m;
  const num = parseInt(full, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

export function rgbToHex(r: number, g: number, b: number): string {
  const to = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`;
}

export function normalizeColor(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (/^#/.test(trimmed)) return hexToRgb(trimmed) ? trimmed.toLowerCase() : null;
  // rgb() / rgba()
  const rgbMatch = trimmed.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i);
  if (rgbMatch) {
    return rgbToHex(Number(rgbMatch[1]), Number(rgbMatch[2]), Number(rgbMatch[3]));
  }
  // hsl() / hsla()
  const hslMatch = trimmed.match(/^hsla?\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%/i);
  if (hslMatch) {
    const h = Number(hslMatch[1]) / 360;
    const s = Number(hslMatch[2]) / 100;
    const l = Number(hslMatch[3]) / 100;
    const { r, g, b } = hslToRgb(h, s, l);
    return rgbToHex(r * 255, g * 255, b * 255);
  }
  return null;
}

function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  if (s === 0) return { r: l, g: l, b: l };
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return { r: hue2rgb(p, q, h + 1 / 3), g: hue2rgb(p, q, h), b: hue2rgb(p, q, h - 1 / 3) };
}

export function hexToHsl(hex: string): { h: number; s: number; l: number } | null {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  const r = rgb.r / 255, g = rgb.g / 255, b = rgb.b / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h /= 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function luminance(rgb: Rgb): number {
  const channel = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b);
}

export function contrastRatio(fg: string, bg: string): number | null {
  const f = hexToRgb(fg);
  const b = hexToRgb(bg);
  if (!f || !b) return null;
  const l1 = luminance(f);
  const l2 = luminance(b);
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

export type ContrastResult = {
  ratio: number | null;
  normal: 'pass' | 'fail' | 'aaa' | 'unknown';
  large: 'pass' | 'fail' | 'aaa' | 'unknown';
  ui: 'pass' | 'fail' | 'unknown';
};

export function contrastCheck(fg: string, bg: string): ContrastResult {
  const ratio = contrastRatio(fg, bg);
  if (ratio === null) return { ratio: null, normal: 'unknown', large: 'unknown', ui: 'unknown' };
  const normal = ratio >= 7 ? 'aaa' : ratio >= 4.5 ? 'pass' : 'fail';
  const large = ratio >= 4.5 ? 'aaa' : ratio >= 3 ? 'pass' : 'fail';
  const ui = ratio >= 3 ? 'pass' : 'fail';
  return { ratio, normal, large, ui };
}

export function withOpacity(hex: string, opacity: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${Math.max(0, Math.min(1, opacity))})`;
}

/* Generate an accessible tonal scale (50..950) from a base colour. */
export function generateScale(hex: string): Record<number, string> {
  const hsl = hexToHsl(hex);
  if (!hsl) {
    const base = { 500: hex };
    for (let i = 50; i <= 950; i += 100) { if (i !== 500) base[i] = hex; }
    return base;
  }
  const scale: Record<number, string> = {};
  const lightnessFor = (step: number): number => {
    const steps: Record<number, number> = {
      50: 96, 100: 91, 200: 83, 300: 72, 400: 61, 500: 50, 600: 42, 700: 34, 800: 25, 900: 17, 950: 11,
    };
    return steps[step] ?? 50;
  };
  const saturationFor = (step: number): number => {
    if (step >= 900) return Math.max(20, hsl.s - 8);
    if (step <= 100) return Math.max(14, hsl.s - 26);
    return hsl.s;
  };
  for (let step = 50; step <= 950; step += 100) {
    const l = lightnessFor(step);
    const s = step === 500 ? hsl.s : saturationFor(step);
    const { r, g, b } = hslToRgb(hsl.h / 360, Math.min(100, Math.max(0, s)) / 100, l / 100);
    scale[step] = rgbToHex(r * 255, g * 255, b * 255);
  }
  return scale;
}

/* Suggest a higher-contrast colour (darken light, lighten dark) to meet a target. */
export function improveContrast(fg: string, bg: string, target = 4.5): string {
  const f = hexToRgb(fg);
  const b = hexToRgb(bg);
  if (!f || !b) return fg;
  const fL = luminance(f);
  const bL = luminance(b);
  // push foreground away from background luminance
  const direction = bL > 0.5 ? -1 : 1; // if bg light, darken fg; if bg dark, lighten fg
  let current = f;
  for (let i = 0; i < 24; i++) {
    const ratio = contrastRatio(rgbToHex(current.r, current.g, current.b), bg);
    if (ratio !== null && ratio >= target) break;
    current = {
      r: current.r + direction * 8,
      g: current.g + direction * 8,
      b: current.b + direction * 8,
    };
    if (current.r < 0 && current.g < 0 && current.b < 0) break;
    if (current.r > 255 && current.g > 255 && current.b > 255) break;
  }
  return rgbToHex(current.r, current.g, current.b);
}

/* ──────────────────────────────────────────────────────────────
   Theme change summary (single, readable history entry)
   ────────────────────────────────────────────────────────────── */

export function summarizeThemeChange(prev: ThemeDefinition, next: ThemeDefinition): string {
  const changed: string[] = [];
  if (JSON.stringify(prev.colors) !== JSON.stringify(next.colors)) changed.push('colours');
  if (JSON.stringify(prev.typography) !== JSON.stringify(next.typography) || prev.headingFontId !== next.headingFontId || prev.bodyFontId !== next.bodyFontId) changed.push('typography');
  if (JSON.stringify(prev.spacing) !== JSON.stringify(next.spacing)) changed.push('spacing');
  if (JSON.stringify(prev.radius) !== JSON.stringify(next.radius)) changed.push('radii');
  if (JSON.stringify(prev.shadow) !== JSON.stringify(next.shadow)) changed.push('shadows');
  if (JSON.stringify(prev.buttons) !== JSON.stringify(next.buttons)) changed.push('buttons');
  if (JSON.stringify(prev.forms) !== JSON.stringify(next.forms)) changed.push('form styles');
  if (JSON.stringify(prev.images) !== JSON.stringify(next.images)) changed.push('media styles');
  if (prev.mode !== next.mode) changed.push('theme mode');
  if (prev.name !== next.name) changed.push('theme name');
  if (prev.brand.name !== next.brand.name || prev.brand.logoAssetId !== next.brand.logoAssetId) changed.push('brand');
  if (!changed.length) return 'Updated the global theme';
  const list = changed.length > 2
    ? `${changed.slice(0, 2).join(', ')} and ${changed.length - 2} more`
    : changed.join(' and ');
  return `Updated global ${list}`;
}

/* ──────────────────────────────────────────────────────────────
   Theme presets
   ────────────────────────────────────────────────────────────── */

export type ThemePreset = {
  id: string;
  name: string;
  description: string;
  palette: Partial<ColorScale>;
  headingFontId?: string;
  bodyFontId?: string;
  radius?: Partial<RadiusScale>;
  spacingBase?: number;
};

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'forge-modern', name: 'Forge Modern', description: 'Amber accents on charcoal — the default Forge look.',
    palette: defaultColorScale(), headingFontId: 'inter', bodyFontId: 'inter',
  },
  {
    id: 'clean-business', name: 'Clean Business', description: 'Trustworthy blues with crisp neutrals and generous whitespace.',
    palette: {
      primary: '#1d6fd1', primaryHover: '#3b84dd', primaryActive: '#17589f',
      secondary: '#243447', accent: '#2e9e8f', background: '#ffffff', surface: '#f4f7fb',
      elevatedSurface: '#ffffff', heading: '#152334', body: '#3d4b5c', muted: '#7a8794',
      border: '#dde5ee', success: '#2e9e5b', warning: '#e6a700', error: '#c0392b',
      info: '#1d6fd1', overlay: '#0b121a', focusRing: '#1d6fd1',
    },
    headingFontId: 'dm-sans', bodyFontId: 'dm-sans',
  },
  {
    id: 'premium-dark', name: 'Premium Dark', description: 'High-contrast dark surfaces with a single warm accent.',
    palette: {
      primary: '#e8b34b', primaryHover: '#f2c86f', primaryActive: '#c99634',
      secondary: '#2b3947', accent: '#e8b34b', background: '#0c1117', surface: '#121820',
      elevatedSurface: '#1a222c', heading: '#f4f7fa', body: '#c4ccd4', muted: '#8f99a2',
      border: '#26313c', success: '#5bd08a', warning: '#f5c400', error: '#ff8a8a',
      info: '#8ab4f8', overlay: '#000000', focusRing: '#e8b34b',
    },
    headingFontId: 'space-grotesk', bodyFontId: 'inter', radius: { medium: '10px', large: '14px' },
  },
  {
    id: 'warm-editorial', name: 'Warm Editorial', description: 'Serif headings with warm cream backgrounds for long-form reading.',
    palette: {
      primary: '#b5651d', primaryHover: '#c9782e', primaryActive: '#965216',
      secondary: '#4a3b2f', accent: '#c76b2e', background: '#fbf7f0', surface: '#f3ece0',
      elevatedSurface: '#fffdf9', heading: '#2c2119', body: '#4a4038', muted: '#8a7e72',
      border: '#e5d9c8', success: '#3f7d4a', warning: '#c98a1b', error: '#b3402f',
      info: '#3f6f8a', overlay: '#2c2119', focusRing: '#b5651d',
    },
    headingFontId: 'playfair', bodyFontId: 'merriweather', radius: { medium: '6px' },
  },
  {
    id: 'bold-startup', name: 'Bold Startup', description: 'Saturated, energetic accents with tight type for momentum.',
    palette: {
      primary: '#7c3aed', primaryHover: '#8f5cf0', primaryActive: '#6527c9',
      secondary: '#111827', accent: '#f43f5e', background: '#ffffff', surface: '#f6f5ff',
      elevatedSurface: '#ffffff', heading: '#111827', body: '#4b5563', muted: '#8a8f98',
      border: '#e5e7eb', success: '#16a34a', warning: '#f59e0b', error: '#dc2626',
      info: '#3b82f6', overlay: '#111827', focusRing: '#7c3aed',
    },
    headingFontId: 'space-grotesk', bodyFontId: 'inter', radius: { medium: '10px', large: '14px', pill: '999px' },
  },
  {
    id: 'minimal-portfolio', name: 'Minimal Portfolio', description: 'Monochrome restraint with sharp type and hairline borders.',
    palette: {
      primary: '#111820', primaryHover: '#2a343d', primaryActive: '#000000',
      secondary: '#3d4a56', accent: '#111820', background: '#ffffff', surface: '#fafafa',
      elevatedSurface: '#ffffff', heading: '#0d0d0d', body: '#3a3a3a', muted: '#8a8a8a',
      border: '#e8e8e8', success: '#2e9e5b', warning: '#e6a700', error: '#c0392b',
      info: '#555555', overlay: '#0d0d0d', focusRing: '#111820',
    },
    headingFontId: 'space-grotesk', bodyFontId: 'inter', radius: { small: '2px', medium: '4px', large: '6px' }, spacingBase: 4,
  },
  {
    id: 'product-commerce', name: 'Product Commerce', description: 'Confident greens and soft shadows tuned for conversion.',
    palette: {
      primary: '#0e9f6e', primaryHover: '#17b980', primaryActive: '#0a8058',
      secondary: '#1f2937', accent: '#f59e0b', background: '#ffffff', surface: '#f6f9f8',
      elevatedSurface: '#ffffff', heading: '#111827', body: '#4b5563', muted: '#8a94a0',
      border: '#e5e7eb', success: '#0e9f6e', warning: '#f59e0b', error: '#dc2626',
      info: '#3b82f6', overlay: '#111827', focusRing: '#0e9f6e',
    },
    headingFontId: 'dm-sans', bodyFontId: 'inter', radius: { medium: '12px', large: '16px' },
  },
];

/* ──────────────────────────────────────────────────────────────
   CSS custom-property generation (light + dark semantic tokens)
   ────────────────────────────────────────────────────────────── */

function typographyRoleCss(role: TypographyRole): string {
  return [
    `font-family:${role.fontFamily}`,
    `font-size:${role.fontSize}`,
    `font-weight:${role.fontWeight}`,
    `line-height:${role.lineHeight}`,
    `letter-spacing:${role.letterSpacing}`,
    `text-transform:${role.textTransform}`,
    `text-decoration:${role.textDecoration}`,
  ].join(';');
}

function colorBlock(scale: ColorScale, indent: string): string {
  return Object.entries(scale)
    .map(([key, value]) => `${indent}--color-${key.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase())}:${value};`)
    .join('\n');
}

export function themeCssVariables(theme: ThemeDefinition): string {
  const c = theme.colors.light;
  const d = theme.colors.dark;
  const spacing = theme.spacing.scale;

  const common = [
    '--font-heading:' + fontById(theme.headingFontId).family,
    '--font-body:' + fontById(theme.bodyFontId).family,
    '--radius-none:' + theme.radius.none,
    '--radius-small:' + theme.radius.small,
    '--radius-medium:' + theme.radius.medium,
    '--radius-large:' + theme.radius.large,
    '--radius-xlarge:' + theme.radius.xlarge,
    '--radius-pill:' + theme.radius.pill,
    '--radius-circle:' + theme.radius.circle,
    '--border-width:' + theme.border.defaultWidth + 'px',
    '--border-strong:' + theme.border.strongWidth + 'px',
    '--shadow-small:' + theme.shadow.small,
    '--shadow-medium:' + theme.shadow.medium,
    '--shadow-large:' + theme.shadow.large,
    '--shadow-floating:' + theme.shadow.floating,
    '--shadow-modal:' + theme.shadow.modal,
    '--spacing-2xs:' + spacing['2xs'] + 'px',
    '--spacing-xs:' + spacing.xs + 'px',
    '--spacing-sm:' + spacing.sm + 'px',
    '--spacing-md:' + spacing.md + 'px',
    '--spacing-lg:' + spacing.lg + 'px',
    '--spacing-xl:' + spacing.xl + 'px',
    '--spacing-2xl:' + spacing['2xl'] + 'px',
    '--spacing-3xl:' + spacing['3xl'] + 'px',
    '--spacing-4xl:' + spacing['4xl'] + 'px',
    '--container-max:' + theme.container.maxWidth + 'px',
    '--container-wide:' + theme.container.wideWidth + 'px',
    '--motion-instant:' + theme.motion.instant,
    '--motion-fast:' + theme.motion.fast,
    '--motion-normal:' + theme.motion.normal,
    '--motion-slow:' + theme.motion.slow,
    '--ease-standard:' + theme.motion.standardEasing,
    '--ease-entrance:' + theme.motion.entranceEasing,
    '--ease-exit:' + theme.motion.exitEasing,
  ];

  const roles = Object.entries(theme.typography)
    .map(([key, role]) => `--type-${key.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase())}:${typographyRoleCss(role)};`)
    .join('\n');

  const buttonVars = BUTTON_VARIANT_KEYS.flatMap((key) => {
    const v = theme.buttons.variants[key];
    return [
      `--btn-${key}-bg:${v.background};`,
      `--btn-${key}-color:${v.textColor};`,
      `--btn-${key}-border:${v.borderColor};`,
      `--btn-${key}-radius:${v.radius};`,
      `--btn-${key}-px:${v.paddingX}px;`,
      `--btn-${key}-py:${v.paddingY}px;`,
      `--btn-${key}-gap:${v.iconGap}px;`,
    ];
  }).join('\n');

  const formVars = [
    `--input-radius:${theme.forms.inputRadius};`,
    `--input-px:${theme.forms.inputPaddingX}px;`,
    `--input-py:${theme.forms.inputPaddingY}px;`,
    `--input-bg:${theme.forms.inputBackground};`,
    `--input-border:${theme.forms.inputBorderColor};`,
    `--input-focus-border:${theme.forms.focusBorderColor};`,
    `--input-error-border:${theme.forms.errorBorderColor};`,
    `--input-label:${theme.forms.labelColor};`,
    `--input-help:${theme.forms.helpColor};`,
  ].join('\n');

  const light = [
    `:root, .forge-site[data-theme="light"] {`,
    colorBlock(c, '  '),
    '  --surface-border:' + c.border + ';',
    '}',
  ].join('\n');

  const dark = [
    `.forge-site[data-theme="dark"], .forge-site[data-theme="system"] {`,
    colorBlock(d, '  '),
    '  --surface-border:' + d.border + ';',
    '}',
  ].join('\n');

  const root = [
    ':root {',
    common.map((line) => '  ' + line + ';').join('\n'),
    '}',
  ].join('\n');

  return [root, roles, buttonVars, formVars, light, dark].filter(Boolean).join('\n');
}

/* Build the @import for Google Fonts actually used (no duplicate downloads). */
export function themeFontImports(theme: ThemeDefinition): string {
  const used = new Map<string, Set<number>>();
  const collect = (family: string, weights: number[]) => {
    const entry = FONT_LIBRARY.find((font) => font.family === family && font.google);
    if (!entry) return;
    weights.forEach((w) => used.get(entry.google!)?.add(w) ?? used.set(entry.google!, new Set([w])));
  };
  const heading = fontById(theme.headingFontId);
  const body = fontById(theme.bodyFontId);
  if (heading.google) collect(heading.family, [700, 800, 600]);
  if (body.google && body.google !== heading.google) collect(body.family, [400, 500, 600, 700]);
  return [...used.entries()]
    .map(([family, weights]) => `@import url('https://fonts.googleapis.com/css2?family=${family}:wght@${[...weights].sort((a, b) => a - b).join(';')}&display=swap');`)
    .join('\n');
}

/* ──────────────────────────────────────────────────────────────
   Design consistency scanner
   ────────────────────────────────────────────────────────────── */

export type DesignFindingSeverity = 'critical' | 'warning' | 'suggestion';

export type DesignFinding = {
  severity: DesignFindingSeverity;
  group: string;
  message: string;
  detail: string;
};

export function scanTheme(theme: ThemeDefinition): DesignFinding[] {
  const findings: DesignFinding[] = [];
  const c = theme.colors.light;

  const pairs: Array<[string, string, string]> = [
    [c.body, c.background, 'Body text on background'],
    [c.heading, c.background, 'Headings on background'],
    [c.muted, c.background, 'Muted text on background'],
    [c.body, c.surface, 'Body text on surface'],
    [c.primary, c.background, 'Primary on background'],
    [c.buttons.variants.primary.textColor, c.buttons.variants.primary.background, 'Button text on primary'],
    [c.buttons.variants.secondary.textColor, c.buttons.variants.secondary.background, 'Button text on secondary'],
    [c.buttons.variants.outline.textColor, c.background, 'Outline button text on background'],
    [c.forms.labelColor, c.background, 'Field labels on background'],
  ];

  pairs.forEach(([fg, bg, label]) => {
    const check = contrastCheck(fg, bg);
    if (check.ratio === null) return;
    if (check.normal === 'fail') {
      findings.push({ severity: 'critical', group: 'Contrast', message: `${label} fails WCAG AA (${check.ratio.toFixed(2)}:1).`, detail: 'Increase contrast between foreground and background.' });
    } else if (check.normal === 'pass' && check.ratio < 7) {
      findings.push({ severity: 'suggestion', group: 'Contrast', message: `${label} passes AA but not AAA (${check.ratio.toFixed(2)}:1).`, detail: 'Consider higher contrast for improved readability.' });
    }
  });

  // Excessive font families
  const families = new Set<string>();
  TYPOGRAPHY_ROLE_KEYS.forEach((key) => families.add(theme.typography[key].fontFamily));
  if (families.size > 3) {
    findings.push({ severity: 'warning', group: 'Typography', message: `${families.size} distinct font families are in use.`, detail: 'Limit to 1–2 families for a cohesive look.' });
  }

  // Excessive font weights
  const weights = new Set<number>();
  TYPOGRAPHY_ROLE_KEYS.forEach((key) => weights.add(theme.typography[key].fontWeight));
  if (weights.size > 5) {
    findings.push({ severity: 'warning', group: 'Typography', message: `${weights.size} distinct font weights are in use.`, detail: 'Fewer weights reduce download size and improve hierarchy.' });
  }

  // Missing focus states
  if (!theme.border.focusBorder) {
    findings.push({ severity: 'warning', group: 'Accessibility', message: 'No focus border is configured.', detail: 'Set a visible focus colour for keyboard navigation.' });
  }

  // Inconsistent radii across buttons
  const radii = new Set(BUTTON_VARIANT_KEYS.map((key) => theme.buttons.variants[key].radius));
  if (radii.size > 3) {
    findings.push({ severity: 'warning', group: 'Consistency', message: 'Button variants use many different radii.', detail: 'Keep a consistent radius for a unified feel.' });
  }

  // Mobile typography
  TYPOGRAPHY_ROLE_KEYS.forEach((key) => {
    const fs = theme.typography[key].fontSize;
    const px = parseInt(fs, 10);
    if (!Number.isNaN(px) && px < 12 && key !== 'caption') {
      findings.push({ severity: 'warning', group: 'Responsive', message: `${TYPOGRAPHY_ROLE_LABELS[key]} is ${px}px — too small on mobile.`, detail: 'Use at least 12px for readable body copy.' });
    }
  });

  return findings;
}

/* ──────────────────────────────────────────────────────────────
   Preset application (partial scopes)
   ────────────────────────────────────────────────────────────── */

export type PresetScope = 'all' | 'colors' | 'typography' | 'spacing';

export function applyPreset(theme: ThemeDefinition, preset: ThemePreset, scope: PresetScope): ThemeDefinition {
  const next: ThemeDefinition = { ...theme, id: preset.id, name: preset.name, colors: { ...theme.colors }, typography: { ...theme.typography }, spacing: { ...theme.spacing }, radius: { ...theme.radius } };

  if (scope === 'all' || scope === 'colors') {
    next.colors = {
      light: { ...theme.colors.light, ...preset.palette },
      dark: { ...theme.colors.dark, ...(preset.palette && { primary: preset.palette.primary, accent: preset.palette.accent }) },
    };
  }
  if (scope === 'all' || scope === 'typography') {
    const heading = preset.headingFontId ? fontById(preset.headingFontId).family : theme.typography.h1.fontFamily;
    const body = preset.bodyFontId ? fontById(preset.bodyFontId).family : theme.typography.body.fontFamily;
    next.headingFontId = preset.headingFontId ?? theme.headingFontId;
    next.bodyFontId = preset.bodyFontId ?? theme.bodyFontId;
    TYPOGRAPHY_ROLE_KEYS.forEach((key) => {
      const role = next.typography[key];
      const isHeading = ['display', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(key);
      next.typography[key] = { ...role, fontFamily: isHeading ? heading : body };
    });
  }
  if (scope === 'all' || scope === 'spacing') {
    if (preset.spacingBase) {
      const base = preset.spacingBase;
      next.spacing = { base, scale: { '2xs': base, xs: base * 2, sm: base * 3, md: base * 4, lg: base * 6, xl: base * 8, '2xl': base * 12, '3xl': base * 16, '4xl': base * 24 } };
    }
    if (preset.radius) next.radius = { ...theme.radius, ...preset.radius };
  }
  return next;
}