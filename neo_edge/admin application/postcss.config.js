// No PostCSS plugins needed — src/index.css is pre-compiled Tailwind v4 output.
// This file exists to stop PostCSS from searching parent directories and
// picking up an unrelated config (e.g. one requiring tailwindcss).
export default {
  plugins: {},
};
