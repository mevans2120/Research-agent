import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      typography: {
        DEFAULT: {
          css: {
            maxWidth: 'none',
            color: 'var(--color-text)',
            h1: {
              color: 'var(--heading-color)',
            },
            h2: {
              color: 'var(--heading-color)',
            },
            h3: {
              color: 'var(--heading-color)',
            },
            h4: {
              color: 'var(--heading-color)',
            },
            h5: {
              color: 'var(--heading-color)',
            },
            h6: {
              color: 'var(--heading-color)',
            },
            a: {
              color: 'var(--color-accent)',
              textDecoration: 'none',
              '&:hover': {
                textDecoration: 'underline',
              },
            },
            code: {
              backgroundColor: 'var(--code-background)',
              padding: '0.25rem 0.5rem',
              borderRadius: '0.25rem',
              fontWeight: '500',
            },
            'code::before': {
              content: '""',
            },
            'code::after': {
              content: '""',
            },
            pre: {
              backgroundColor: 'var(--code-background)',
              border: '1px solid var(--color-border)',
            },
            blockquote: {
              borderLeftColor: 'var(--blockquote-border)',
              backgroundColor: 'var(--color-background-secondary)',
            },
            table: {
              borderCollapse: 'collapse',
            },
            'th, td': {
              border: '1px solid var(--color-border)',
              padding: '0.75rem',
            },
            th: {
              backgroundColor: 'var(--table-header-bg)',
              fontWeight: '600',
            },
          },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}

export default config