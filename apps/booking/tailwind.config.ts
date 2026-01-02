import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/app/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        zenthea: {
          teal: 'var(--zenthea-teal)',
          purple: 'var(--zenthea-purple)',
          coral: 'var(--zenthea-coral)',
          cream: 'var(--zenthea-cream)',
        },
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

export default config
