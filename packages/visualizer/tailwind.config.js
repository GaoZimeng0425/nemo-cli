/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Scope colors for dependency nodes
        scope: {
          app: '#3B82F6', // Blue
          workspace: '#10B981', // Green
          external: '#6B7280', // Gray
          internal: '#F59E0B', // Amber
          other: '#8B5CF6', // Purple
        },
        // SCC cycle highlighting
        scc: {
          highlight: '#EF4444', // Red
        },
      },
      animation: {
        'pulse-slow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
}
