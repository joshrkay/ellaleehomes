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

## Concept 1 — “Atelier” (light · quiet luxury · editorial)

Reference direction: merise.ae — warm ivory, gallery-like restraint.

- **Gate:** split-screen photo panels that expand on hover; center monogram seal.
- **Type:** Cormorant Garamond display + Inter UI.
- **Motion:** curtain image reveals (clip-path), per-word manifesto reveal tied
  to scroll, parallax inside clipped frames, animated counters, magnetic CTA,
  custom exclusion-blend cursor, sweeping scroll-hint line.
- **Structure:** hero → manifesto → editorial portfolio rows → numbers → dark
  investor band → process grid → oversized “Let’s build yours.” CTA.

## Concept 2 — “Nocturne” (dark · cinematic · motion-maximal)

Reference direction: nueve.gr / farmminerals promo — film-like, kinetic.

- **Gate:** typographic “doors” (*I’m building a home / I’m here to invest*);
  hovering a door repaints the full-screen scene; camera-push exit.
- **Type:** Bodoni Moda didone display + Inter UI; champagne on near-black;
  animated film grain overlay.
- **Motion:** preloader with counter and line fill, masked line hero reveal,
  scroll-velocity marquee with skew, per-word philosophy reveal, **pinned
  horizontal portfolio** with progress HUD, counters, dual-path echo section,
  auto-scrolling testimonial marquee, hide-on-scroll nav, dual custom cursor.

## Notes

- Photography is hot-linked from the production WordPress media library
  (ellaleehomes.com), same as the current site templates.
- Both pages are responsive (gate stacks vertically on mobile) and respect
  `prefers-reduced-motion`.
- All stats/copy are placeholders where the source site had none — easy to swap.
