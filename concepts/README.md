# Website Redesign Concepts

Two alternative homepage directions for Ella Lee Homes. Both are **sleek, modern,
animation-forward, and high-luxury**, and both open with an **audience gate** —
a first screen where visitors choose between the *Homeowner* and *Investor*
journeys (interaction model referenced from horizonte-village.com). The chosen
audience personalizes hero copy, the nav badge, and CTAs; the badge in the nav
lets visitors switch at any time.

Each concept is a single self-contained HTML file (no build step, no JS
libraries — all motion is hand-rolled vanilla JS). Open directly in a browser:

```
concepts/index.html                → side-by-side chooser
concepts/concept-1-atelier.html    → Concept 1
concepts/concept-2-nocturne.html   → Concept 2
```

Both concepts run on a shared motion architecture designed so the page
**never stops moving**:

- **Liquid smooth scrolling** — wheel input is lerped (Lenis-style), so every
  scroll glides; touch and keyboard stay native.
- **Scroll-scrubbed scenes** — pinned sections whose animation progress is tied
  directly to scroll position (not one-shot reveals), so the visitor "plays"
  the page like a film timeline.
- **Velocity-reactive elements** — marquees speed up and skew with scroll speed.
- **Continuous ambience** — ken-burns imagery, drifting ghost numerals, film
  grain (Nocturne), spinning monogram seal (Atelier), custom cursors.

## Concept 1 — “Atelier” (light · quiet luxury · editorial)

Reference direction: merise.ae — warm ivory, gallery-like restraint.

- **Gate:** split-screen photo panels (ken-burns) that expand on hover; masked
  headline entrance; spinning-text monogram seal.
- **Type:** Cormorant Garamond display + Inter UI.
- **Scroll story:** scrubbed hero (headline lines split apart, image settles) →
  outlined-serif velocity ribbon → **image-expand scene** (frame grows to
  fullscreen) → word-by-word manifesto → **pinned horizontal portfolio** with
  ghost numerals and inner parallax → **image river** (opposing columns, page
  morphs to dark) → scroll-scrubbed counters → investor band → **stacking
  process cards** (each chapter slides over the last) → char-wave CTA with
  magnetic button. Background color morphs light↔dark as zones pass.

## Concept 2 — “Nocturne” (dark · cinematic · motion-maximal)

Reference direction: nueve.gr / farmminerals promo — film-like, kinetic.

- **Gate:** typographic “doors” (*I’m building a home / I’m here to invest*);
  hovering a door repaints the full-screen scene; mouse-parallax background;
  camera-push exit.
- **Type:** Bodoni Moda didone display + Inter UI; champagne on near-black;
  animated film grain overlay.
- **Scroll story:** preloader → scrubbed hero with **mouse-depth parallax**
  (media, halo and type move on separate planes; lines split as you scroll) →
  outlined didone velocity marquee → word-lit philosophy → **zoom tunnel**
  (“Come closer.” — a small frame scales through the viewport into a full
  scene) → pinned horizontal portfolio with counter-drifting giant numerals →
  scrubbed counters → expanding dual-path panels → two opposing testimonial
  marquees → CTA with cursor-tracking spotlight and char-cascade headline.

## Notes

- Photography is hot-linked from the production WordPress media library
  (ellaleehomes.com), same as the current site templates.
- Both pages are responsive (gate stacks vertically on mobile) and respect
  `prefers-reduced-motion`.
- All stats/copy are placeholders where the source site had none — easy to swap.
