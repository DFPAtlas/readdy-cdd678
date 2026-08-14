/** @type {import('tailwindcss').Config} */
export default {
    content: [
      "./index.html",
      "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
      extend: {
        colors: {
          'forge': {
            'bg': 'hsl(var(--app-bg) / <alpha-value>)',
            'sidebar': 'hsl(var(--sidebar-bg) / <alpha-value>)',
            'panel': 'hsl(var(--panel-bg) / <alpha-value>)',
            'panel-elevated': 'hsl(var(--panel-elevated) / <alpha-value>)',
            'hover': 'hsl(var(--surface-hover) / <alpha-value>)',
            'active': 'hsl(var(--surface-active) / <alpha-value>)',
            'border-subtle': 'hsl(var(--border-subtle) / <alpha-value>)',
            'border': 'hsl(var(--border-default) / <alpha-value>)',
            'amber': 'hsl(var(--brand-amber) / <alpha-value>)',
            'amber-dim': 'hsl(var(--brand-amber-dim) / <alpha-value>)',
            'accent': 'hsl(var(--cool-accent) / <alpha-value>)',
            'accent-dim': 'hsl(var(--cool-accent-dim) / <alpha-value>)',
            'success': 'hsl(var(--success) / <alpha-value>)',
            'warning': 'hsl(var(--warning) / <alpha-value>)',
            'error': 'hsl(var(--error) / <alpha-value>)',
            'agent': 'hsl(var(--agent-active) / <alpha-value>)',
            'text-primary': 'hsl(var(--text-primary) / <alpha-value>)',
            'text-secondary': 'hsl(var(--text-secondary) / <alpha-value>)',
            'text-muted': 'hsl(var(--text-muted) / <alpha-value>)',
            'text-inverse': 'hsl(var(--text-inverse) / <alpha-value>)',
          },
        },
        fontFamily: {
          sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
          mono: ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
        },
        borderRadius: {
          'sm': '4px',
          'md': '6px',
          'lg': '8px',
          'xl': '12px',
        },
        spacing: {
          'topbar': '48px',
          'statusbar': '26px',
          'sidebar-expanded': '220px',
          'sidebar-collapsed': '56px',
        },
      },
    },
    plugins: [],
  }