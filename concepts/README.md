# Website Redesign Concepts

Self-contained homepage prototypes for Ella Lee Homes (no build step, no JS
libraries — Google Fonts + the production WordPress media library only).
Open directly in a browser:

```
concepts/index.html                → chooser
concepts/concept-1-atelier.html    → Concept 1 · Atelier — THE DEFINITIVE DIRECTION
concepts/concept-2-nocturne.html   → Concept 2 · Nocturne — archived alternative
```

## Concept 1 — “Atelier” (v3, definitive)

Guiding light: the best luxury e-commerce — **RH** (serene oversized imagery,
thin type, whitespace, sticky product columns), **Zegna / Loro Piana**
(full-bleed brand video), **Apple** (one great pinned scroll-scrubbed story
chapter). Real brand tokens (`--paper #EAE5DC`, navy `#002855`, gold
`#C9A96E`, Inter + Cormorant Garamond) and **all copy verbatim from the
existing site** (`src/*.html`) — origin promise, "You Dream it, we build it,"
philosophy, real process phases with durations and deliverables, real
projects, real testimonials, real contact details, ROC KB2-333410.

Structure:

1. **Audience gate** — Homeowners / Investors split panels (choice
   personalizes hero copy and the nav badge; switchable anytime).
2. **Video hero** — the production site video, quiet scroll settle,
   "Ella Lee Homes / Built Right."
3. **01 The Promise** — the origin paragraph lighting word-by-word, over a
   faint blueprint grid; real stats (17 homes · est. 2012 · PV/Arcadia/
   Scottsdale).
4. **02 The Work** — featured residences in an RH product pattern: sticky
   spec card (Sold badge, hairline specs table, sales price) beside a
   scrolling image stack with quiet hover zoom.
5. **03 The Journey** — the building-phases chapter: a pinned, scroll-scrubbed
   scene where an architectural elevation **line-draws itself** (Design),
   dimension lines and a permit seal appear (Permitting), the drawing
   dissolves into a drone aerial (Construction), and the finished home fades
   in (Move In) — with each phase's real duration and deliverables on a side
   rail. *No real construction photography exists in the media library; the
   aerial/finished layers are `<img>` slots that swap for real progress photos
   with a one-line change.*
6. **04 Your Home** — "You Dream it, we build it." with the e-commerce room
   viewer (Kitchen / Bathroom / Outdoor / Elevations tabs, the same images the
   live site uses).
7. **Philosophy** — "We don't build houses. We build legacies." full-bleed.
8. **05 Client Stories** — the three real testimonials, quiet cards.
9. **Investors** — navy band, verifiable facts only, CTA pre-selects
   "Investor / development opportunity" in the contact form.
10. **Contact** — real form fields, underline inputs, real phone/email/studio.

Motion system: liquid lerp smooth-scrolling, one pinned chapter, word-lit
manifesto, subtle parallax, magnetic submit button, custom cursor. No
marquees, no skew, no gimmicks. Responsive; `prefers-reduced-motion` renders
a static journey list and native scrolling.

Architectural details woven through: numbered chapter eyebrows (01–05),
dimension-line section dividers, blueprint-grid watermarks.

## Concept 2 — “Nocturne” (archived)

Dark cinematic alternative kept for reference — typographic gate doors,
preloader, zoom-tunnel, pinned horizontal portfolio, velocity marquees.
