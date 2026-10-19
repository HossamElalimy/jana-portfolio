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

### Adding a painting from a phone photo

Keep the raw photo in `source-photos/`, then straighten it to the canvas (perspective-corrected, cropped
inside the edge, gently levelled) by giving the canvas corners in the photo — top-left, top-right,
bottom-right, bottom-left:

```bash
node scripts/straighten-painting.mjs source-photos/photo.jpeg src/assets/jana-painting-05.jpg "8,91 1184,43 1181,1284 1,1215"
```

## Search (Google Search Console)

- Ownership is verified with `public/googlebdb60c101da1d1b9.html` — **don't delete it**.
- In Search Console → **Sitemaps**, submit `https://paintingsbyjana.vercel.app/sitemap.xml`
  (it lists the page plus Jana's portrait, studio photo and original paintings for Google Images).
- Use **URL inspection → Request indexing** on the home page after each significant update.
- Name variants (Arabic, transliterations, common misspellings) live in `seo.nameVariants` in
  `src/lib/content.ts`; they feed the JSON-LD `alternateName` list and the keywords tag.
- If you move to a custom domain, set `NEXT_PUBLIC_SITE_URL` in Vercel and add the new domain as a
  property in Search Console.
