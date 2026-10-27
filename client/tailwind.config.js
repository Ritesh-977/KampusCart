/** @type {import('tailwindcss').Config} */

// Maps a CSS variable (defined in src/theme/theme.css) to a Tailwind colour,
// preserving the `<alpha-value>` slot so opacity modifiers like `bg-primary/10`
// keep working. Edit the VALUES in src/theme/theme.css, not here.
const token = (name) => `rgb(var(${name}) / <alpha-value>)`;

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Surfaces
        background: token('--background'),
        surface: {
          DEFAULT: token('--surface'),
          2: token('--surface-2'),
          muted: token('--surface-muted'),
          inverse: token('--surface-inverse'),
        },

        // Text
        foreground: token('--foreground'),
        muted: token('--muted'),
        subtle: token('--subtle'),
        'inverse-foreground': token('--inverse-foreground'),
        'inverse-muted': token('--inverse-muted'),

        // Borders
        border: {
          DEFAULT: token('--border'),
          strong: token('--border-strong'),
        },

        // Brand
        primary: {
          DEFAULT: token('--primary'),
          hover: token('--primary-hover'),
          foreground: token('--primary-foreground'),
          muted: token('--primary-muted'),
        },
        accent: {
          DEFAULT: token('--accent'),
          hover: token('--accent-hover'),
          foreground: token('--accent-foreground'),
          muted: token('--accent-muted'),
        },
        tertiary: {
          DEFAULT: token('--tertiary'),
          hover: token('--tertiary-hover'),
          foreground: token('--tertiary-foreground'),
          muted: token('--tertiary-muted'),
        },

        // Status
        success: {
          DEFAULT: token('--success'),
          foreground: token('--success-foreground'),
          muted: token('--success-muted'),
        },
        warning: {
          DEFAULT: token('--warning'),
          foreground: token('--warning-foreground'),
          muted: token('--warning-muted'),
        },
        danger: {
          DEFAULT: token('--danger'),
          foreground: token('--danger-foreground'),
          muted: token('--danger-muted'),
        },
        info: {
          DEFAULT: token('--info'),
          foreground: token('--info-foreground'),
          muted: token('--info-muted'),
        },

        // Misc
        ring: token('--ring'),
        logo: {
          from: token('--logo-from'),
          to: token('--logo-to'),
        },
        chat: token('--chat-canvas'),

        // Decorative / category accents
        'cat-browse': token('--cat-browse'),
        'cat-lost': token('--cat-lost'),
        'cat-events': token('--cat-events'),
        'cat-sports': token('--cat-sports'),
        'cat-study': token('--cat-study'),

        // Third-party brands
        whatsapp: {
          DEFAULT: token('--whatsapp'),
          hover: token('--whatsapp-hover'),
        },
      },
      backgroundImage: {
        // Reusable brand gradients built from the same tokens.
        'brand-gradient': 'linear-gradient(90deg, rgb(var(--accent)), rgb(var(--primary)))',
        'brand-gradient-br': 'linear-gradient(135deg, rgb(var(--accent)), rgb(var(--primary)))',
        'logo-gradient': 'linear-gradient(90deg, rgb(var(--logo-from)), rgb(var(--logo-to)))',
        'header-gradient': 'linear-gradient(90deg, rgb(var(--surface-inverse)), rgb(var(--surface-inverse)))',
      },
    },
  },
  plugins: [],
}
