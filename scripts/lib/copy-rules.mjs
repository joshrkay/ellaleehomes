/**
 * The wording rules behind the copy guard, `scripts/check-copy.mjs`. They live here so that anything
 * that puts visible text on the site without passing through `src/` can be held to the same regexes:
 * `scripts/lib/reviews.mjs` does this for `data/reviews.json`.
 *
 * Add a rule in the same commit that removes the wording it bans: `npm run build` runs the guard on
 * Vercel too, so a rule that fails on existing copy blocks the deploy.
 *
 * Source of truth for the wording: docs/fact-sheet.md (the Fact Sheet as updated Oct 2, 2026).
 *
 * Two kinds of rule:
 *   RULES       matched against every raw source line of src/*.html and partials/*.
 *   TEXT_RULES  matched only against text a visitor or search engine can read: body
 *               text, attribute values, <title> and <meta>, JSON-LD, and inline-script
 *               data. HTML comments, <style> blocks and script comments are ignored
 *               (see scripts/lib/regions.mjs). A rule may be scoped to files:
 *               [regex, reason, { only: ['src/a.html'], except: ['src/b.html'] }].
 *               RULES accept the same optional scope as a third element.
 */
import path from 'path';

export const RULES = [
  [/design[- ]build|design (?:and|&amp;|&) build/i, 'We do not design: no "design build" language'],
  [/\bwe design\b|\bour designers\b|design team\b/i, 'We do not design: no "we design" language'],
  [/in-house/i, 'No "in-house" claims'],
  [/10\+ years|fifteen years/i, 'Founded 2021: use "since 2021" only'],
  [/nearly 50|\b50\+|\b200K\+|\$200M/i, 'Unverified stat: use the one home-count figure ("40+")'],
  [/one business day|within 24 hours|24-hour/i, 'No response-time promises'],
  [/south(?:ern)? arizona/i, 'Market wording: "Arizona" or "the Phoenix Valley"'],
  [/\bFounders\b/, 'Singular "Founder"'],
  [/on time,? on budget|on budget\. always|100% transparency/i, 'No absolute promises'],
  [/target budget range|\$\d+M\+?\s*(?:to|–|-|&ndash;|&mdash;)\s*\$\d+M/i, 'No budget ranges'],
  [/\b12 to 18|12\s*(?:–|-|&ndash;)\s*18 months|14(?:–|-|&ndash;)24/i, 'One timeline: construction 11–18 months'],
  [/4408 N 12th St(?!, Ste 200)(?!["'])/, 'Always include "Ste 200"'],
  [/first sketch|4 phases|four (?:clear )?phases/i, 'Construction only: no design/permitting phases'],
  [/\bdozens of\b.{0,40}(?:homes|families|properties)/i, 'Use the real number ("40+ homes"), not "dozens"'],
  [/designing and building|designs and builds/i, 'We do not design'],
  [/permitting/i, 'We do not do permitting'],
  [/\b(?:across|throughout|in) the Valley\b/i, 'Statewide phrasing is "Arizona"'],
  [/\bguarantees? (?:an?|that|every|your)\b/i, 'No absolute promises'],
  [/Arcadia,? (?:and |& |&amp; )?(?:Paradise|Scottsdale)|Scottsdale,? (?:and |& |&amp; )?Paradise Valley/, 'Markets in order: Paradise Valley, Scottsdale, Arcadia, Phoenix'],
  [/open[- ]books?/i, 'Cost-plus is stated plainly; never "open books"'],
  [/fixed[- ]price|choice of contract/i, 'Never imply fixed price or a choice of contract structures'],
  [/remodel|renovation|new homes only|commercial (?:work|building|projects)/i, 'Custom homes only; do not mention what we do not do'],
  [/design(?:ing)? phase|permitting phase|planning and permitting|planning phase/i, 'Timeline is construction only: no design or permitting phases'],
  [/>5\.0<|rated 5\.0|5\.0 (?:rating|across)/i, 'No 5.0 rating badge'],
  [/the phoenix valley|greater phoenix valley/i, 'Statewide phrasing is "Arizona"'],
  [/\bcash (?:home )?buyer|cash offer/i, 'Sell page: brand voice, not a cash-buyer ad'],
  // Added after the QA pass: wording that slipped past the first rules.
  [/sketch/i, 'Construction only: no "sketch" (design) language'],
  [/initial concept|from (?:the )?concept to|concept to completion/i, 'Construction only: we do not start at the concept (design) stage'],
  [/we (?:do not|don't) offer|do not offer (?:architectural|design)/i, 'Do not draw attention to what we do not do'],
  [/assist with land acquisition|help you evaluate and acquire land|identify the perfect location/i, 'Nothing about services beyond custom homes (no land-finding or acquisition help)'],
  [/multi[- ]?unit|multi[- ]?family|luxury enclaves/i, 'Custom homes only: no multi-unit or enclave work'],
  [/years of experience|decades of/i, 'Founded 2021: use "since 2021" only, no year counts'],
  [/more cost-effective than|at a lower price|measurable savings|maximize ROI|better margins|boost your bottom line/i, 'No outcome or comparison promises'],
  [/completely transparent|complete transparency|fully transparent|every invoice|every subcontractor bid/i, 'No "open books" in substance and no absolute transparency claims'],
  [/morning, noon, or night|at your convenience|any ?time, from anywhere|24\/7|around the clock/i, 'No time commitment anywhere'],
  [/minimum of 10%|annual profits/i, 'Charitable giving is "10% of profits"'],
  [/highest (?:safety|quality|standards)/i, 'No superlative promises'],
  [/\bunparalleled\b|\bpremier\b|award[- ]winning|world[- ]class/i, 'Marketing filler / invented distinction'],
  [/\b\d+ reviews? on Google/i, 'Review counts are not on the Fact Sheet'],
  [/selling my custom home/i, 'Sell framing is "home or lot"'],
  [/no surprises|surprise change orders|hidden surprises/i, 'No absolute promises'],
  [/never in the dark|never feel left in the dark|will always attract|\bunmatched\b/i, 'No absolute promises'],
  [/walk candidate lots|review a lot before you buy|if you are still looking/i, 'Nothing about services beyond custom homes (no lot-finding or lot-vetting service)'],
  [/award[- ]worthy|comprehensive warranty|full builder warranty|long-term peace of mind/i, 'Warranty is described as the Warranty page describes it; no invented distinctions'],
  // Notes from the client drafts must never ship.
  [/For Josh|For Shay|Claude is not a lawyer|written by Claude/i, 'Draft note leaked onto the site'],
  [/general template|not legal advice|reviewed by counsel/i, 'Placeholder legal note: the legal pages use the approved draft text'],
  // The client portal is a button to Buildertrend's own login page, never an embedded login (N6, N7).
  [/NewLoginFrame/, 'No embedded Buildertrend login: link to the login page instead'],
  [/938-4113/, 'That phone number is not ours: the site phone is (480) 340-8700'],
  // One contact form for the whole site: Buildertrend's, on the Contact page (N15). Every other
  // "Start your build" section is a button to that page.
  [/<form\b/i, 'No native forms: the one form is the Buildertrend form on the Contact page'],
  [/\bonsubmit=|data-elh-submit/, 'No form handlers: nothing on the site submits a form'],
  [/href="[^"]*#inquiry/, 'The #inquiry form is gone: "Start your build" links to contact.html'],
  [/<iframe\b/i, 'The only embed is the Buildertrend form on the Contact page', { except: ['src/contact.html'] }],
];

/** Rules that read only visible text (see the header). Each lands with the fix that clears it. */
export const TEXT_RULES = [
  [/\bStudio\b/, 'The office is the "Office", never the "Studio"'],
  [/energy[- ]efficien|smart[- ]home|home automation/i, 'Energy and smart-home claims: say once, in the approved sentence', { except: ['src/developers.html', 'src/project.html', 'data/projects.json'] }],
  [/Get Started/, 'The primary call to action is "Start your build"'],
  [/Start Your Build/, 'Write the call to action as "Start your build"'],
  [/Start the [Cc]onversation/, 'Only the Sell page says "Start the Conversation"', { except: ['src/sell-your-home.html'] }],
  [/\bdaily (?:photos|updates|progress|reports)\b/i, 'Client updates are "photos and weekly updates", never "daily"'],
  [/—|&mdash;|&#8212;|&#x2014;|\\u2014/i, 'No em dashes in site copy, titles or meta'],
  [/cutting[- ]edge|sustainable (?:practices|construction|solutions)|innovative,? sustainable|future[- ]proof/i, 'No "cutting-edge" or "sustainable practices"'],
  [/appraised at/i, 'Project values use the short label "Completed home value"'],
];

/**
 * Rules whose fixes are still being made: reported, never enforced. Run
 * `node scripts/check-copy.mjs --pending` for every hit. When a rule reaches zero hits,
 * move it up to TEXT_RULES in the same commit so it can never come back.
 */
export const PENDING_TEXT_RULES = [];

/** Scope check for a rule's optional third element; paths are compared with forward slashes. */
export function inScope(rel, scope = {}) {
  const p = rel.split(path.sep).join('/');
  if (scope.only && !scope.only.includes(p)) return false;
  if (scope.except && scope.except.includes(p)) return false;
  return true;
}
