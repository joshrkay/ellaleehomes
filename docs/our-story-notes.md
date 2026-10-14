# Ella Lee Homes — Our Story page: developer notes

Source: `Our Story.dc.html` (live), `Ella Lee Homes - Our Story.html` (standalone, offline).
URL: `/our-story` · Title: `Our Story | Custom Home Builder in Arizona | Ella Lee Homes`
Meta description: "Ella Lee Homes began with a promise to our daughter, Ella. Custom homes in Paradise Valley, Scottsdale, Arcadia, and Phoenix since 2021."

## Global
- Fonts: DM Serif Display (headings, large quotes), Inter 300/400/500 (body, labels).
- Colors: navy `#001526`, deep navy `#000D19`, cream `#EAE5DC`, sand `#E3DACA`, gold `#BFA06A`, dark gold (on cream) `#8A6E3C`, body on cream `#2B2B2B`.
- Breakpoint: phone = `max-width: 767px`.
- All scroll effects run from one passive `scroll` + `resize` listener. Each effect computes a progress `p` (0–1) from `getBoundingClientRect()` and writes `transform` / `clip-path` / `background-image` inline. Recommend wrapping in `requestAnimationFrame` and honoring `prefers-reduced-motion: reduce` (set all to end state).
- Easing used for reveals: `easeOutCubic = 1 - (1 - x)^3`.

## Section order
1. Hero · 2. It started with Ella · 3. A custom home builder in Arizona · 4. How We Work · 5. By the numbers · 6. Giving back · 7. Reviews · 8. A note from our founder · 9. Footer (Start your build)

## Animations

### 1. Header (all pages)
- Fixed, transparent over hero.
- Desktop: after 80px scroll → background `rgba(0,21,38,.94)` + `blur(10px)`, padding 20→13px, bottom hairline. Past hero: hides on scroll down (`translateY(-105%)`), shows on scroll up. Transition .45s `cubic-bezier(.4,0,.2,1)`.
- Phone: always visible, always transparent. Hamburger opens left drawer (`translateX(-100%)→0`, .45s) + scrim fade; locks body scroll; closes on scrim, × or any link.
- Desktop "More" dropdown toggles on click, closes on outside click.

### 2. Hero — slow pan (Ken Burns)
- Photo layer inset −6%, CSS keyframes `elhHeroPan` 34s ease-in-out infinite alternate: `scale(1.06) translate(-1.2%, .6%)` → `scale(1.15) translate(1.2%, -1.2%)`.
- Bottom 30% fades to `#001526` so it blends into the next section (no seam).

### 3. "It started with Ella" — line-by-line text highlight
- Paragraph is split by JS into visual lines (words measured by `offsetTop`; rebuilt on width change).
- Each line is `background-clip: text` with gradient: cream `#EAE5DC` → dim `rgba(234,229,220,.3)`, 16% soft edge, sweeping left→right.
- Overall progress: desktop `p = (0.95·vh − top) / (height + 0.03·vh)`; phone `p = (0.78·vh − top) / (height − 0.06·vh)`.
  → Desktop: starts as first line enters, fully lit when last line is on screen. Phone: starts a bit later.
- Line i local progress = `clamp(p·N − i, 0, 1)`; unlit lines are fully dim (no pre-lit edge).
- Photo: arch-top frame (`border-radius: 999px 999px 0 0`), 3:4, max 520px, with gold 1px arch outline offset 18px up-right. Static.

### 4. "A custom home builder in Arizona" — architectural photo build
- Not pinned; scrolls normally. Collage box: desktop `height: min(72vh, 760px)`; phone `aspect-ratio: 1/1.15`.
- Progress `P = clamp((0.98·vh − top) / (height + 0.25·vh))`.
- 4 photos, each on its own window of P, eased:
  - Photo 1 (tall, left) 0–.32: clip reveal bottom→top, rises 90px, drift `(0.5−P)·40px`.
  - Photo 2 (wide, top-right) .16–.48: clip reveal from right, slides in 120px, drift `(P−0.5)·60px`.
  - Photo 3 (small, mid-right) .32–.64: clip reveal top→bottom, drops in 70px, drift `(0.5−P)·70px`.
  - Photo 4 (detail, cream 9px border + shadow) .48–.80: clip reveal from left, slides 100px, drift `(0.5−P)·110px`.
  - Inner image of each: `scale(1.22 → 1.08)` while revealing + vertical parallax ±8–10%.
- Gold plan lines: vertical (scaleY 0→1, P .04–.40), horizontal (scaleX, .20–.56), secondary navy hairline (.50–.86).
- Paragraphs (desktop only): fade .15→1 opacity + rise 22px, staggered at P 0/.12/.24 (each over .26).

### 5. How We Work
- Desktop: left heading column is `position: sticky; top: 120px`. Phone: static. No other motion.

### 6. Giving back — two counter-scrolling photo columns
- Frame `height: min(80vh, 760px)`, overflow hidden, cream fade top/bottom 12%.
- 2 columns × 4 photos (4:5). `p = (vh − top)/(vh + height)`; `span = columnHeight − frameHeight`.
  - Left column: `translateY(−p·span)` (moves up).
  - Right column: `translateY(−(1−p)·span)` (moves down).

### 7. Founder note — layered photos with parallax
- Composition box `aspect-ratio: 1/1.08` (phone: 80% width, centered).
  - Back: finished home photo (78% × 82%), bleeds to the section's left edge, navy tint, caption "Charter Oak". Gold 1px outline offset (14px, −14px).
  - Front: portrait card (52% × 78%) bottom-right, deep shadow, gold 1px outline offset (14px, 14px).
- Scroll `d = 0.5 − p`, `p = (vh − top)/(vh + height)`:
  - Back box `translateY(−d·70px)`; its outline `translateY(−14 − d·30px)`; inner image `translateY(−d·14%) scale(1.08)`.
  - Portrait `translateY(d·150px)`; its outline `translateY(14 + d·100px)`.

### 8. Hover states
- Pill buttons: outline → fill (cream or gold), .3s.
- Social icons: cream → gold, .3s.

## Content / placeholders to replace before launch
- Founder photo is stock (credit: Tima Miroshnichenko on Pexels). Replace with Shay on a job site.
- "What we build" and Giving back images are stand-ins from the front page.
- 150,000+ sq ft is still marked CONFIRM in the copy doc. Front page footer shows 50+ / 200K+; this page uses 40+ / 150,000+ per the Fact Sheet. Align before launch.
- Reviews: em dashes removed per copy rules. Confirm wording matches the real Google reviews.
- "Start your build" buttons currently link to the front page inquiry form; point to Contact.
