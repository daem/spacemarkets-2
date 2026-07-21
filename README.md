# Space Markets

Next.js port of the SpaceMarkets home page. The page started as a 1:1
conversion of `SpaceMarkets Home (1).html` (the original bundled export, kept
in the repo root as a historical reference) and has since evolved past it —
copy, sections, and layout now follow ongoing stakeholder feedback, so the
export no longer matches the live page.

## Run

```bash
npm install
npm run dev     # http://localhost:3000
npm run build && npm start
```

## Layout

- `app/layout.tsx` — root layout (font preconnects, global CSS).
- `app/globals.css` — self-hosted font faces (Inter, Space Grotesk, JetBrains
  Mono — the exact Google Fonts subsets the original shipped), base styles, and
  the hover/focus classes that reproduce the original `style-hover` /
  `style-focus` attributes (declarations are `!important` so they override
  inline styles, as in the original).
- `app/page.tsx` → `components/SpaceMarketsHome.tsx` — the whole page: the
  original page logic (state, market jitter, SMI sectors, FAQ accordion,
  contact modal) ported verbatim as a React class component, with the original
  template translated to JSX.
  - `videoUrl` prop (default `""`): URL of the promo film — set to
    `/video.mp4` (see `public/video.mp4`) in `app/page.tsx`; clicking the
    poster plays it.
  - `liveFlicker` prop (default `true`): subtle probability jitter on the
    market cards (disabled under `prefers-reduced-motion`).
- Responsive: the page is desktop-first (inline styles); mobile/small-tablet
  adjustments live in the `@media (max-width: 900px)` block at the bottom of
  `app/globals.css` as class-scoped `!important` overrides.
- Scroll-reveal: content blocks marked `data-reveal` fade/slide in as they
  enter the viewport (IntersectionObserver set up in `componentDidMount`,
  reveal CSS at the bottom of `app/globals.css`). Disabled under
  `prefers-reduced-motion`; without JS the page renders fully visible.
- `components/sm-globe.js` — the original `<sm-globe>` WebGL night-Earth
  custom element, unchanged except that it loads Three.js from npm
  (`three@0.160.0`, the same r160 the original bundled) and the texture from
  `/earth-night.jpg`. `components/Globe.tsx` registers it client-side.
- `public/` — images and fonts extracted from the original bundle.
