# Jana — Artist & Graphic Designer

Portfolio site for Jana Ezzeldin, implemented from the Claude Design file `Jana.dc.html`.

- **Next.js 16** (App Router, fully static), **React 19**, TypeScript
- **GSAP + ScrollTrigger** for the scroll choreography, **Lenis** for smooth scrolling on desktop
- `next/image` for responsive AVIF/WebP images with blur placeholders
- English site; Arabic is used only in search metadata (title, description, keywords, JSON-LD names)

## Getting started

```bash
npm install
npm run dev        # http://localhost:3000
npm run build && npm start
```

Set the public origin before deploying (Vercel fills it in automatically from the production domain):

```bash
cp .env.example .env.local   # NEXT_PUBLIC_SITE_URL=https://your-domain
```

## Where things live

| Path | What |
| --- | --- |
| `src/components/JanaSite.tsx` | The page: markup, animations, lightbox, menu |
| `src/app/globals.css` | All styles (design tokens at the top) |
| `src/lib/content.ts` | Visible copy, and the SEO strings (incl. Arabic) |
| `src/lib/works.ts` | The artworks list: titles, labels, images, provenance |
| `src/components/JsonLd.tsx` | schema.org Person / WebSite / ProfilePage / VisualArtwork |
| `src/app/{sitemap,robots,manifest}.ts` | Generated `sitemap.xml`, `robots.txt`, web manifest |
| `src/app/{icon.svg,favicon.ico,apple-icon.png}` | Favicons (from `npm run icons`) |
| `public/og/og.jpg` | Social share card (from `npm run paint`) |

## Images

- `jana-painting-01.jpg`, `jana-painting-02.jpg` — Jana's originals. The copies exported from the design
  project were truncated, so their lower parts were restored from the same canvases in the studio photo.
  **Replace them with the original high-resolution photos when available** (same file names, any size).
- `preview-*.jpg`, `hero-court.jpg`, `design-04-blue-hour.jpg` — stand-ins and concept pieces painted with
  the design project's procedural brush engine (`scripts/paint/`). Re-render with `npm run paint`.
  They are labelled on the site as stand-ins / concepts, not Jana's work.

To add real work, drop the image into `src/assets/`, import it in `src/lib/works.ts`, and set `real: true`.
