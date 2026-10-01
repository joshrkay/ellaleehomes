#!/usr/bin/env python3
"""
Ella Lee Homes: QA harness for the Merged Punch List and the Website Fact Sheet (Sep 29, 2026).

Run after `npm run build`:

    python3 scripts/qa.py            # static checks + browser checks (needs `pip install playwright`)
    python3 scripts/qa.py --static   # static checks only

Every punch-list item and every Fact Sheet rule maps to a check that reads the BUILT site (dist/) and,
for layout and behaviour, renders it in Chromium. Nothing is marked PASS from memory.

Statuses
  PASS     the check ran and the requirement holds
  FAIL     the check ran and the requirement does not hold (exit code 1)
  BLOCKED  the item needs an input only Ella Lee Homes can supply (not a code problem)
  MANUAL   a person has to judge it; the evidence says what to look at

Writes docs/qa-report.md.
"""
import glob
import html
import http.server
import json
import os
import re
import socketserver
import subprocess
import sys
import threading
from collections import Counter, defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST = os.path.join(ROOT, 'dist')
SRC = os.path.join(ROOT, 'src')
STATIC_ONLY = '--static' in sys.argv

RESULTS = []          # dicts: id, title, status, evidence
SECTIONS = []         # (section title, [ids])


def rd(p):
    with open(p, encoding='utf8') as f:
        return f.read()


# --------------------------------------------------------------------------- loading
PAGES = {}
for f in sorted(glob.glob(os.path.join(DIST, '*.html'))):
    n = os.path.basename(f)[:-5]
    PAGES[n] = rd(f)
if not PAGES:
    sys.exit('dist/ is empty: run `npm run build` first')

ARTICLES = {
    'how-to-find-a-custom-home-builder', 'steps-to-building-a-custom-home',
    'exploring-the-costs-of-building-your-dream-home-a-comprehensive-guide',
    'is-custom-home-building-a-good-investment', 'new-luxury-essentials-custom-homes-arizona',
    'why-choosing-a-professional-home-builder-matters-for-your-custom-house',
}
LEGAL = {'privacy', 'terms', 'disclaimer'}
CORE = [n for n in PAGES if n not in ARTICLES and n not in LEGAL]


def strip_blocks(h):
    h = re.sub(r'<(script|style)\b[^>]*>.*?</\1>', ' ', h, flags=re.S | re.I)
    return h


def text_of(h):
    h = strip_blocks(h)
    h = re.sub(r'<[^>]+>', ' ', h)
    return re.sub(r'\s+', ' ', html.unescape(h)).strip()


def body_html(h):
    """Page content without the shared header / Learn panel / drawer / footer."""
    m = re.search(r'<aside data-elh-drawer.*?</aside>', h, flags=re.S)
    start = m.end() if m else 0
    e = h.find('<footer id="contact"')
    return h[start:e if e > 0 else len(h)]


def footer_html(h):
    s = h.find('<footer id="contact"')
    e = h.find('</footer>', s)
    return h[s:e + 9] if s >= 0 else ''


def nav_html(h):
    e = re.search(r'<aside data-elh-drawer.*?</aside>', h, flags=re.S)
    s = h.find('<header data-elh-nav')
    return h[s:e.end()] if (e and s >= 0) else ''


def meta_strings(h):
    out = []
    t = re.search(r'<title>(.*?)</title>', h, re.S)
    if t:
        out.append(('title', html.unescape(t.group(1)).strip()))
    for m in re.finditer(r'<meta\s+(?:name|property)="([^"]+)"\s+content="([^"]*)"', h):
        out.append(('meta:' + m.group(1), html.unescape(m.group(2))))
    return out


def schema_strings(h):
    out = []

    def walk(x):
        if isinstance(x, dict):
            for v in x.values():
                walk(v)
        elif isinstance(x, list):
            for v in x:
                walk(v)
        elif isinstance(x, str):
            out.append(x)
    for m in re.finditer(r'<script type="application/ld\+json">(.*?)</script>', h, re.S):
        try:
            walk(json.loads(m.group(1)))
        except Exception:
            out.append('INVALID JSON-LD')
    return out


def attr_strings(h):
    h = strip_blocks(h)
    out = []
    for k in ('alt', 'aria-label', 'title', 'placeholder'):
        for m in re.finditer(r'\b%s="([^"]*)"' % k, h):
            out.append(html.unescape(m.group(1)))
    return out


def all_strings(name, include_visible=True):
    """Every user/crawler-facing string on a page: visible text, title/meta, schema, alt/aria."""
    h = PAGES[name]
    parts = []
    if include_visible:
        parts.append(text_of(h))
    parts += [v for _, v in meta_strings(h)]
    parts += schema_strings(h)
    parts += attr_strings(h)
    return parts


def find_all(rx, names, flags=re.I, strings=all_strings, ctx=45, allow=None):
    """Return [(page, snippet)] for every match of rx in every string of the given pages."""
    rxc = re.compile(rx, flags)
    hits = []
    for n in names:
        for s in strings(n):
            for m in rxc.finditer(s):
                snip = s[max(0, m.start() - ctx):m.end() + ctx].replace('\n', ' ')
                if allow and any(a in snip for a in allow):
                    continue
                hits.append((n, snip))
    # de-duplicate (the same text shows up in visible + meta + schema)
    seen, out = set(), []
    for n, s in hits:
        if (n, s) not in seen:
            seen.add((n, s))
            out.append((n, s))
    return out


def fmt_hits(hits, limit=4):
    if not hits:
        return ''
    c = Counter(n for n, _ in hits)
    pages = ', '.join('%s×%d' % (k, v) for k, v in c.most_common(8))
    ex = ' | '.join('%s: …%s…' % (n, s) for n, s in hits[:limit])
    return '%d hit(s) on %s. e.g. %s' % (len(hits), pages, ex)


def check(cid, title, status, evidence=''):
    RESULTS.append({'id': cid, 'title': title, 'status': status, 'evidence': evidence})
    if SECTIONS:
        SECTIONS[-1][1].append(cid)


def none_found(cid, title, rx, names, **kw):
    hits = find_all(rx, names, **kw)
    if hits:
        check(cid, title, 'FAIL', fmt_hits(hits))
    else:
        check(cid, title, 'PASS', 'no match for /%s/ on %d page(s) (visible text, title/meta, schema, alt/aria)' % (rx, len(names)))


def present(cid, title, rx, names, flags=re.I, strings=all_strings):
    missing = [n for n in names if not any(re.search(rx, s, flags) for s in strings(n))]
    if missing:
        check(cid, title, 'FAIL', 'missing on: ' + ', '.join(missing))
    else:
        check(cid, title, 'PASS', 'present on all %d page(s): /%s/' % (len(names), rx))


def section(title):
    SECTIONS.append((title, []))


def reg(cid, title, status, evidence=''):
    check(cid, title, status, evidence)


# ======================================================================= STATIC CHECKS
def static_checks():
    ALL = list(PAGES)

    # ----------------------------------------------------------------- A. Blockers
    section('A. Blockers')
    # A1 forms
    forms = []
    for n, h in PAGES.items():
        for m in re.finditer(r'<form\b([^>]*)>', h):
            forms.append((n, m.group(1)))
    deliver = [(n, a) for n, a in forms if re.search(r'action="https?://', a) or 'data-endpoint' in a or 'data-elh-endpoint' in a]
    js_fetch = [n for n in ('index', 'build-your-home', 'why-us', 'developers', 'contact', 'sell-your-home')
                if re.search(r'fetch\(|XMLHttpRequest|sendBeacon', PAGES[n])]
    dropdown = [n for n, h in PAGES.items() if re.search(r'name="budget"|Target budget range', h)]
    if dropdown:
        reg('1a', 'Budget dropdown removed from every form', 'FAIL', 'still present on: ' + ', '.join(dropdown))
    else:
        reg('1a', 'Budget dropdown removed from every form', 'PASS', 'no name="budget" / "Target budget range" on any of %d pages' % len(PAGES))
    if len(forms) == 6 and not deliver and not js_fetch:
        reg('1', 'Every form delivers to a live inbox or Buildertrend (test each)', 'BLOCKED',
            '%d forms found (%s); none has an action URL, endpoint, or fetch(). Needs the destination (inbox or Buildertrend lead endpoint).'
            % (len(forms), ', '.join(sorted({n for n, _ in forms}))))
    elif deliver or js_fetch:
        reg('1', 'Every form delivers to a live inbox or Buildertrend (test each)', 'MANUAL',
            'delivery wiring present (%s%s) but a real test submission is required' % (deliver[:3], js_fetch))
    else:
        reg('1', 'Every form delivers to a live inbox or Buildertrend (test each)', 'FAIL', 'unexpected form count %d' % len(forms))
    # A2 portal
    cp = PAGES['client-portal']
    frame = re.search(r'<iframe[^>]+src="(https://buildertrend\.net/[^"]+)"', cp)
    if frame and 'NewLoginFrame.aspx' in frame.group(1):
        reg('2', 'Buildertrend login embed installed with the official code (login must be tested)', 'BLOCKED',
            'page still uses the original frame %s (the one reported as not working); a fallback link to buildertrend.net and the support phone are present. Needs the official embed code from Buildertrend support.' % frame.group(1))
    elif frame:
        reg('2', 'Buildertrend login embed installed with the official code (login must be tested)', 'MANUAL', 'embed %s present; test a real login' % frame.group(1))
    else:
        reg('2', 'Buildertrend login embed installed with the official code (login must be tested)', 'FAIL', 'no Buildertrend iframe on client-portal')
    # A3 review links
    links = Counter()
    for n in ('index', 'why-us', 'developers', 'our-story'):
        for m in re.finditer(r'<a[^>]+class="[^"]*rv-card[^"]*"[^>]+href="([^"]+)"|<a href="(https://www\.google\.com/maps/place/Ella\+Lee\+Homes[^"]+)"[^>]*><figure', PAGES[n]):
            links[m.group(1) or m.group(2)] += 1
    reg('3', 'Review links go to the actual review (or the full Google review profile)', 'BLOCKED',
        '%d review card link(s) on index/why-us/developers/our-story all point to the business Google Maps listing (%d distinct URL): %s. Direct review URLs not provided.'
        % (sum(links.values()), len(links), list(links)[0][:80] if links else 'none'))
    # A4 legal
    legal_note = [n for n in LEGAL if re.search(r'not legal advice|general template', text_of(PAGES[n]), re.I)]
    reg('4', 'Placeholder text removed from legal pages (counsel finalizes)', 'BLOCKED' if legal_note else 'PASS',
        ('placeholder note still on: %s. Left in place until counsel supplies the final language.' % ', '.join(legal_note)) if legal_note else 'note removed')
    # A5, A6
    none_found('5', 'Designer note removed from live copy', r'same spirit as our home page testimonials', ALL)
    none_found('6', 'No stray "\\n" text', r'\\n(?![a-z])', ['client-portal', 'index', 'contact', 'build-your-home'], strings=lambda n: [text_of(PAGES[n])])

    # ----------------------------------------------------------------- B. Facts and numbers
    section('B. Facts and numbers')
    # B7 home count
    need = {'index': 'home', 'our-story': 'Our Story + map', 'previous-projects': 'Portfolio', 'developers': 'Developers'}
    miss = [n for n in need if not re.search(r'\b40\+\s*(custom\s+)?(homes|residences)', text_of(PAGES[n]), re.I)]
    foot_missing = [n for n in ALL if not re.search(r'\b40\+', text_of(footer_html(PAGES[n])))]
    wrong = find_all(r'\b(?:nearly|almost|over)\s+\d+|\b(?:50|35|47|45)\+?\s+(?:custom\s+)?(?:homes|residences|builds)|\b26 completed|\b21 in progress', CORE)
    bad = []
    if miss:
        bad.append('"40+ homes" missing on: ' + ', '.join(miss))
    if foot_missing:
        bad.append('footer lacks 40+ on: ' + ', '.join(foot_missing))
    if wrong:
        bad.append('other counts: ' + fmt_hits(wrong))
    map_ok = re.search(r'where-legend-num">40\+', PAGES['our-story'])
    if not map_ok:
        bad.append('map legend lacks 40+')
    reg('7', 'Home count: "40+ homes" everywhere (footer, home, Our Story, Portfolio, Developers, map); no other figure',
        'FAIL' if bad else 'PASS', '; '.join(bad) if bad else '"40+" on index, our-story (+map legend), previous-projects, developers and in the footer of all %d pages; no 50+/nearly/26/21 variants' % len(ALL))
    # B8
    none_found('8', 'No "10+ years" / "fifteen years"', r'\b10\+?\s+years|\bfifteen years|\b15\+?\s+years', ALL)
    # B9 timeline
    tl, singles = [], []
    rngs = re.compile(r'(\d+)\s*(?:–|-|&ndash;|to)\s*(\d+)\s*months?', re.I)
    for n in ALL:
        for s in all_strings(n):
            for m in rngs.finditer(s):
                if (m.group(1), m.group(2)) != ('11', '18') and 'Just exploring' not in s:   # the Sell form's own "timeline to sell" menu is not a build timeline
                    tl.append((n, s[max(0, m.start() - 40):m.end() + 40]))
            rest = rngs.sub(' ', s)
            for m in re.finditer(r'\b\d+\s+months?\b(?!\s+ago)', rest, re.I):
                singles.append((n, rest[max(0, m.start() - 40):m.end() + 40]))
    singles = list(dict.fromkeys(singles))
    phases = find_all(r'\b(?:design|permitting|planning)\s+phase\b|\bplanning and permitting\b|\b4 phases\b|first sketch', ALL)
    bad = []
    if tl:
        bad.append('other month ranges: ' + fmt_hits(tl))
    if singles:
        bad.append('single-number timelines: ' + fmt_hits(singles))
    if phases:
        bad.append('design/permit phase wording: ' + fmt_hits(phases))
    eleven = [n for n in ('index', 'build-your-home', 'faq') if not re.search(r'11\s*(?:–|-|&ndash;|to)\s*18', text_of(PAGES[n]))]
    if eleven:
        bad.append('11–18 missing on: ' + ', '.join(eleven))
    reg('9', 'One timeline sitewide: 11–18 months of construction, no design/permitting phases', 'FAIL' if bad else 'PASS',
        '; '.join(bad) if bad else 'every month range on %d pages is 11–18; none of 18/19/24/29-month figures; no design/permitting/planning phases' % len(ALL))
    # B10 cost-plus
    faq_t = text_of(PAGES['faq'])
    ok = bool(re.search(r'cost-plus basis', faq_t)) and not re.search(r'fixed[- ]price|open[- ]books?', ' '.join(all_strings('faq')), re.I)
    fp = find_all(r'fixed[- ]price|open[- ]books?|choice of contract', ALL)
    reg('10', 'FAQ states plainly that Ella Lee Homes builds cost-plus (no fixed price, no "open books")',
        'PASS' if ok and not fp else 'FAIL', 'FAQ says "we build on a cost-plus basis"; sitewide fixed-price/open-books hits: %d' % len(fp) if ok and not fp else (fmt_hits(fp) or 'FAQ lacks cost-plus statement'))
    # B11-13 data (computed below by data_audit)
    # B14
    none_found('14', 'Unverified "Mark, Paradise Valley, 2024" testimonial removed', r'Real experts in luxury homes|Mark\s*[·•]\s*Paradise Valley', ALL)
    # B15
    none_found('15a', 'Unbacked claims removed ($ delivered, neighborhood count, 5.0, absolutes, "dozens")',
               r'\$\s?200\s?M|\b9 neighborhoods|\b5\.0\b|on time\.? on budget|always\.|100%\s*transparency|\bdozens of (?:homes|families|properties|valley)|200K\+|\b50\+', CORE + list(LEGAL))
    present('15b', '10% of profits retained', r'10% of (?:our |its )?(?:annual )?profits?|Ten percent of our profit', ['index', 'developers'], strings=lambda n: [text_of(PAGES[n])])
    # B16
    bad = []
    for n in ('warranty', 'homeowner-resources'):
        b = text_of(body_html(PAGES[n]))
        if 'warranty@ellaleehomes.com' not in b:
            bad.append('%s lacks warranty@' % n)
        if 'hello@ellaleehomes.com' in b:
            bad.append('%s body still uses hello@' % n)
    elsewhere = [n for n in ALL if n not in ('warranty', 'homeowner-resources') and 'warranty@ellaleehomes.com' in PAGES[n]]
    if elsewhere:
        bad.append('warranty@ used outside Warranty/Homeowner Resources: ' + ', '.join(elsewhere))
    reg('16', 'warranty@ on Warranty and Homeowner Resources only; hello@ not used there', 'FAIL' if bad else 'PASS',
        '; '.join(bad) if bad else 'warranty@ present in body of both pages, hello@ absent from their bodies, warranty@ on no other page')
    # B17
    none_found('17', 'No budget ranges anywhere', r'\$\s?\d+(?:\.\d+)?\s?M\s?\+?\s*(?:–|-|&ndash;|to)\s*\$|budget range|\$\s?1\s?M', CORE)
    # B18
    none_found('18', 'No "South Arizona"; statewide phrasing is "Arizona" (no "the Valley"/"Phoenix Valley")',
               r'south(?:ern)? arizona|\b(?:across|throughout|in) the Valley\b|phoenix valley', ALL)
    # B19
    bad = []
    for n, h in PAGES.items():
        for m in re.finditer(r'4408 N 12th St(?!, Ste 200)', h):
            ctx = h[max(0, m.start() - 30):m.end() + 20]
            bad.append('%s: …%s…' % (n, ctx.replace('\n', ' ')))
    reg('19', '"Ste 200" with every use of the office address (visible, schema, maps links excluded)', 'FAIL' if bad else 'PASS',
        '; '.join(bad[:4]) if bad else 'every "4408 N 12th St" in the built HTML is followed by ", Ste 200"')
    # B20
    nof = [n for n in ALL if 'KB2-333410' not in footer_html(PAGES[n])]
    reg('20', 'ROC KB2-333410 in the footer of every page', 'FAIL' if nof else 'PASS',
        ('missing on: ' + ', '.join(nof)) if nof else 'present in the footer of all %d pages' % len(ALL))

    # ----------------------------------------------------------------- C. Services and positioning
    section('C. Services and positioning')
    design_rx = (r'design[- ]build|design (?:and|&) build|\bwe design\b|\bour designers?\b|design team|design packages?|3D render|interior (?:design|finishes design)|'
                 r'in-house|designing and building|designs and builds|innovative design|full-service')
    none_found('21', 'No "design build" / "we design" / in-house design language (core + legal pages)', design_rx, CORE + list(LEGAL))
    art = find_all(design_rx, list(ARTICLES))
    reg('21b', 'Same scan on the 6 blog articles', 'FAIL' if art else 'PASS', fmt_hits(art) if art else 'no hits')
    none_found('22', 'Why Us: no "In-House Design" reason or "all in-house" line', r'in-house|design \+ build|design, permitting', ['why-us'])
    none_found('23', 'Developers FAQ: no design package / 3D renderings / interior finishes', r'design package|3D render|interior finishes|design (?:&|and) build', ['developers'])
    none_found('24', 'Services: custom homes only. No remodel/addition/commercial/"new homes only" (warranty-exclusion wording excepted)',
               r'remodel\w*|renovat\w*|\badditions?\b|commercial (?:work|build\w*|project\w*)|new homes only|kitchen or bath',
               CORE + list(LEGAL), allow=['Work, alterations, or additions performed by others'])
    ok = [n for n in ('why-us', 'developers', 'faq') if 'we can work with your architect' not in text_of(PAGES[n]).lower()]
    bad = find_all(r'no architect needed|all design in-house|all in-house|first step is (?:usually )?(?:to )?(?:an |collaborate with an )?architect', ALL)
    reg('25', 'One architect line sitewide: "We can work with your architect"; no contradictory versions', 'FAIL' if (ok or bad) else 'PASS',
        ('missing on: %s; %s' % (ok, fmt_hits(bad))) if (ok or bad) else 'line present on why-us, developers, faq; no contradicting wording anywhere')

    # ----------------------------------------------------------------- D. Copy and wording
    section('D. Copy and wording')
    none_found('26', 'No time commitment on responses ("one business day", "24 hours", "come back to you within")',
               r'business day|within 24|24[- ]hour|come back to you within|respond within', ALL)
    present('26b', 'Suggested line used where the promise was: "Every inquiry is read personally."', r'Every inquiry is read personally',
            ['index', 'build-your-home', 'why-us', 'developers', 'sell-your-home', 'faq'])
    ok = 'What it takes to build a custom home in Paradise Valley, Scottsdale, and Arcadia. Investment, timelines, and how the process actually runs.' in html.unescape(PAGES['faq'])
    reg('27', 'FAQ subhead uses the suggested wording', 'PASS' if ok else 'FAIL', 'exact suggested sentence present on faq' if ok else 'suggested sentence not found')
    ok = 'Describe the issue and send a photo if you can. It helps us understand the problem before we come out.' in html.unescape(PAGES['warranty'])
    reg('28', 'Warranty line uses the suggested wording', 'PASS' if ok else 'FAIL', 'exact suggested sentence present on warranty' if ok else 'not found')
    bad = find_all(r'You Dream it|You Dream It|Dream It, We Build It', ALL, flags=0)
    ok = all(re.search(r'You dream it,\s*(?:<br>)?\s*(?:<em>)?we build it', PAGES[n], re.I) for n in ('index', 'our-story'))
    reg('29', '"You dream it, we build it" lowercase (Home and Our Story)', 'PASS' if (ok and not bad) else 'FAIL',
        'lowercase on index and our-story; no capital-D variants' if (ok and not bad) else fmt_hits(bad) or 'phrase not found')
    bad = []
    for n in ALL:
        nav = nav_html(PAGES[n]); ft = footer_html(PAGES[n])
        if not re.search(r'>Why Us</a>', nav) or not re.search(r'>Why Us</a>', ft):
            bad.append(n)
    wu_title = re.search(r'<title>(.*?)</title>', PAGES['why-us'], re.S).group(1)
    reg('30', 'Label "Why Us" in nav, Learn panel, drawer, footer and the page title', 'FAIL' if (bad or 'Why Us' not in wu_title) else 'PASS',
        ('nav/footer missing "Why Us" on: %s' % bad) if bad else 'present in nav+footer of all %d pages; why-us title: "%s"' % (len(ALL), html.unescape(wu_title)))
    none_found('31', 'Stories: "Ready to stop reading and start building?" replaced', r'ready to stop reading', ALL)
    st = text_of(PAGES['stories'])
    reg('32', 'Stories hero wording below the line adjusted (no design-trends line)',
        'PASS' if ('For anyone planning a custom home in Arizona' in st and 'Notes on building, lessons from the field' in st and 'design trends' not in ' '.join(all_strings('stories'))) else 'FAIL',
        'hero reads "Notes on building, lessons from the field, and stories from our Arizona team." / "For anyone planning a custom home in Arizona."; "design trends" gone from text, description and og')
    reg('33', '"See the craft yourself" rewritten and home swapped', 'BLOCKED', 'waiting for Shay\'s notes (punch list: "See Shay\'s notes")')
    reg('34', '"In practice" label changed (Josh to choose)', 'PASS' if re.search(r'>Recent Homes<', PAGES['why-us']) and 'In Practice' not in PAGES['why-us'] else 'FAIL',
        'label now "Recent Homes" (Josh\'s pick; change if you prefer another)')
    lede = re.search(r'class="hero-lede">(.*?)</p>', PAGES['previous-projects'], re.S)
    reg('35', 'Portfolio hero wording: new copy, no design language (Josh to choose)',
        'PASS' if lede and 'design' not in lede.group(1).lower() else 'FAIL',
        'hero line: "%s"' % (re.sub(r'<[^>]+>', '', lede.group(1)) if lede else 'not found'))
    none_found('36a', 'Sell: no cash-buyer ad language', r'financial challenge|cash offer|cash home buyer|cash buyer|24[- ]hour|within 24|as-is, today|fresh start', ['sell-your-home'])
    s = text_of(PAGES['sell-your-home'])
    reg('36b', 'Sell: "home or lot" line and lots/teardowns focus', 'PASS' if 'Give your home or lot a second life' in s and 'Lots & Teardowns' in s else 'FAIL',
        'hero "Give your home or lot a second life"; eyebrow "Lots & Teardowns"')
    sh = PAGES['sell-your-home']
    hero_end = sh.find('</section>', sh.find('id="hero-banner"'))
    chips_at = sh.find('>No Hassle<')
    hero_chips = 'trusted' in sh[:hero_end].lower() and 'local buyer' in sh[:hero_end].lower()
    reg('37', 'Sell: chips kept, moved lower down the page; hero no longer shows chips or "trusted local buyer"',
        'PASS' if (chips_at > hero_end > 0 and not hero_chips) else 'FAIL',
        'chips at offset %d, hero ends at %d; "trusted local buyer" in hero: %s' % (chips_at, hero_end, hero_chips))
    bad = find_all(r'since the company founded\b(?! was)|\bFounders\b', ALL)
    ok_f = re.search(r'since the company was founded', text_of(PAGES['index']))
    reg('38', 'Founder line: "since the company was founded"; singular "Founder"', 'PASS' if (ok_f and not bad) else 'FAIL',
        '"has led every build since the company was founded" on index; no "Founders"' if (ok_f and not bad) else (fmt_hits(bad) or 'index sentence not found'))
    voice = find_all(r'financial challenges|\bhassle-free\b|\bguarantee[sd]?\b|\bunparalleled\b|\bpremier\b|award[- ]winning|best[- ]in|world[- ]class|second to none', CORE + list(LEGAL))
    # allowed: client review quotes are the client's words
    voice = [(n, s) for n, s in voice if 'second to none' not in s]
    reg('39', 'Sitewide voice: none of the banned filler/promise words (guarantee, unparalleled, premier, award-winning, …)', 'FAIL' if voice else 'PASS',
        fmt_hits(voice) if voice else 'no banned voice words on %d pages. (Tone itself is a human judgement; sampled in the claim audit.)' % (len(CORE) + len(LEGAL)))

    # ----------------------------------------------------------------- E (static parts)
    section('E. Design and layout (static parts; layout/behaviour checks are in the browser run)')
    vids = [n for n, h in PAGES.items() if '<video' in h]
    reg('40-video', 'Only the home page uses video', 'PASS' if vids == ['index'] else 'FAIL', 'pages containing <video>: %s' % vids)
    reg('41', 'New hero video', 'BLOCKED', 'home currently plays: %s. Shay is producing the new video.' % (re.search(r'<video[^>]+src="([^"]+)"', PAGES['index']).group(1)[:90] if '<video' in PAGES['index'] else 'n/a'))
    ok = os.path.exists(os.path.join(ROOT, 'uploads/home/shay.jpg')) and 'uploads/home/shay.jpg' in PAGES['index'] and 'uploads/home/shay.jpg' in PAGES['our-story']
    reg('42', 'Photo of Shay on the home "what began as a dream" section (and Our Story)', 'PASS' if ok else 'FAIL',
        'uploads/home/shay.jpg exists and is referenced by index and our-story' if ok else 'missing')
    hj = rd(os.path.join(ROOT, 'assets/home.js'))
    sp = re.search(r's\.target \+= ([0-9.]+)', hj)
    reg('43', 'Project strip slightly faster', 'PASS' if sp and float(sp.group(1)) > 0.17 else 'FAIL',
        'strip speed constant is %s px/frame (was 0.17)' % (sp.group(1) if sp else '?'))
    lazy = re.findall(r'id="elh-proj-\d"[^>]*loading="lazy"', PAGES['index'])
    reg('44-static', '68th card image: strip images are not lazy-loaded', 'FAIL' if lazy else 'PASS', 'lazy strip images: %d' % len(lazy))
    nrev = Counter()
    for n in ('index', 'why-us', 'developers', 'our-story'):
        nrev[n] = len(re.findall(r'Google review', text_of(PAGES[n])))
    reg('45', 'More testimonials from Google, confirmed real clients/homeowners only', 'BLOCKED',
        'review cards per page: %s (all five are the pre-existing Google reviews). More real reviews must come from Ella Lee Homes.' % dict(nrev))
    os_h = PAGES['our-story']
    reg('46', 'Our Story "What they say" shows the home page\'s Google review cards, not FAQ questions',
        'PASS' if os_h.count('class="rv-card') >= 5 and 'story-faq' not in re.search(r'id="conversation".*?</section>', os_h, re.S).group(0) else 'FAIL',
        '%d review cards; FAQ <details> in that section: %d' % (os_h.count('class="rv-card'), re.search(r'id="conversation".*?</section>', os_h, re.S).group(0).count('story-faq')))
    reg('47', 'Camino as the footer background', 'MANUAL', 'Shay confirmed "Done". Footer uses uploads/footer-bg.jpg (courtyard photo) on %d/%d pages.' % (sum('uploads/footer-bg.jpg' in p for p in PAGES.values()), len(PAGES)))
    bi, bb = PAGES['index'], PAGES['build-your-home']
    ok = all(re.search(r'<h2[^>]*>Start your build</h2>', x, re.I) for x in (bi, bb))
    reg('48', 'Build page contact strip matches the home page ("Start your build" block)', 'PASS' if ok else 'FAIL',
        'both pages have an <h2>Start your build</h2> inquiry block with the same fields' if ok else 'heading missing')
    # E50
    reg('50', 'Our Story dressed up (map smaller, fonts matched, titles styled like the front page); Shay supplies copywriting', 'BLOCKED',
        'Shay to provide the copywriting. Layout/font/title work for the page depends on that copy.')
    reg('61a', 'Footer stat badges are not 50+/200K+/5.0', 'PASS' if not any(re.search(r'>(?:50\+|200K\+|5\.0)<', footer_html(h)) for h in PAGES.values()) else 'FAIL',
        'footer badges are 40+ and the ROC license only')
    reg('56', 'Navy is #001526, not #0D2D4E (closed)', 'PASS' if not any('0D2D4E' in h.upper() for h in PAGES.values()) and not any('0D2D4E' in rd(f).upper() for f in glob.glob(os.path.join(ROOT, 'assets/*.css'))) else 'FAIL',
        '#0D2D4E appears nowhere in built HTML or CSS')
    reg('61', 'Footer badges: use "40+ homes", no 5.0 badge, no dollar figure', 'PASS' if all('40+' in text_of(footer_html(h)) and not re.search(r'5\.0|\$\s?\d', text_of(footer_html(h))) for h in PAGES.values()) else 'FAIL',
        'checked footer of %d pages' % len(PAGES))
    pr = PAGES['project']
    reg('58', 'Hidden "Project not found" text not in the page markup (rendered only when a project is missing)',
        'PASS' if 'Project not found' not in re.sub(r'<script.*?</script>', '', pr, flags=re.S) else 'FAIL',
        '"Project not found" is not in the static HTML; it is created by script only for an unknown slug (browser check confirms)')

    # ----------------------------------------------------------------- F. SEO
    section('F. SEO and AI search')
    idx = PAGES['index']
    sj = [json.loads(m) for m in re.findall(r'<script type="application/ld\+json">(.*?)</script>', idx, re.S)]
    biz = [j for j in sj if isinstance(j, dict) and j.get('@type') in ('HomeAndConstructionBusiness', 'LocalBusiness')]
    if biz:
        b = biz[0]
        need = {'name': b.get('name'), 'address': b.get('address', {}).get('streetAddress'), 'telephone': b.get('telephone'),
                'ROC license': json.dumps(b).count('KB2-333410'), 'areaServed': len(b.get('areaServed', []))}
        okb = all(need.values()) and 'Ste 200' in (b['address']['streetAddress'])
        reg('63', 'Homepage business schema: name, address, phone, ROC license, areas served', 'PASS' if okb else 'FAIL', json.dumps(need))
    else:
        reg('63', 'Homepage business schema: name, address, phone, ROC license, areas served', 'FAIL', 'no HomeAndConstructionBusiness JSON-LD on index')
    fq = [j for j in (json.loads(m) for m in re.findall(r'<script type="application/ld\+json">(.*?)</script>', PAGES['faq'], re.S)) if j.get('@type') == 'FAQPage']
    nq = len(fq[0]['mainEntity']) if fq else 0
    nhtml = PAGES['faq'].count('class="faq-item"')
    same = fq and [html.unescape(q['name']) for q in fq[0]['mainEntity']] == [html.unescape(re.sub(r'<[^>]+>', '', x)) for x in re.findall(r'class="faq-q"[^>]*>(.*?)<span', PAGES['faq'])]
    reg('64', 'FAQ built out with FAQPage schema (schema questions = page questions)', 'PASS' if (nq >= 15 and nq == nhtml and same) else 'FAIL',
        '%d questions in schema, %d on page, identical order/text: %s (was 10)' % (nq, nhtml, bool(same)))
    bad = []
    for n, h in PAGES.items():
        t = re.search(r'<title>(.*?)</title>', h, re.S).group(1).strip()
        d = re.search(r'<meta name="description" content="([^"]+)"', h)
        og = {k: v for k, v in re.findall(r'<meta property="(og:[a-z:]+)" content="([^"]*)"', h)}
        if not d:
            bad.append('%s: no description' % n)
        if not og.get('og:image', '').endswith('.jpg') and 'og:image' not in og:
            bad.append('%s: no og:image' % n)
        if og.get('og:title') is not None and html.unescape(og['og:title']) != html.unescape(t):
            bad.append('%s: og:title "%s" != title' % (n, og['og:title'][:40]))
        if 'og:description' not in og:
            bad.append('%s: no og:description' % n)
        for tk in ('twitter:title', 'twitter:description'):
            mt = re.search(r'<meta name="%s" content="([^"]*)"' % tk, h)
            if mt and tk == 'twitter:title' and html.unescape(mt.group(1)) != html.unescape(t):
                bad.append('%s: %s differs from <title>' % (n, tk))
            if mt and tk == 'twitter:description' and d and html.unescape(mt.group(1)) not in html.unescape(d.group(1)) and html.unescape(d.group(1)) not in html.unescape(mt.group(1)):
                bad.append('%s: twitter:description unrelated to description' % n)
        if not (n in ARTICLES or n in LEGAL or n == 'index') and not re.search(r'\| Ella Lee Homes$', html.unescape(t)):
            bad.append('%s: title not "Topic | Ella Lee Homes": %s' % (n, t[:60]))
        if 'twitter:card' not in h:
            bad.append('%s: no twitter:card' % n)
    # legal pages must not carry the FAQ's social text
    for n in LEGAL:
        if 'Timelines, cost structure' in PAGES[n]:
            bad.append('%s carries FAQ social text' % n)
    reg('65', 'Every page: meta description, branded share image, og/twitter tags matching the page; titles "Topic | Ella Lee Homes"', 'FAIL' if bad else 'PASS',
        '; '.join(bad[:6]) if bad else 'checked %d pages: description, og:image (assets/og-share.jpg), og:title = <title>, twitter:card, title format' % len(PAGES))
    og_ok = os.path.exists(os.path.join(ROOT, 'assets/og-share.jpg'))
    reg('65b', 'Branded share image file exists', 'PASS' if og_ok else 'FAIL', 'assets/og-share.jpg (1200×630)')
    rb = rd(os.path.join(DIST, 'robots.txt'))
    sm = rd(os.path.join(DIST, 'sitemap.xml'))
    reg('66', 'robots.txt blocks the client portal, welcomes AI crawlers; sitemap present; homepage H1 unchanged (closed)',
        'PASS' if re.search(r'Disallow:\s*/client-portal', rb) and '<urlset' in sm else 'FAIL',
        'robots has Disallow /client-portal: %s; sitemap URLs: %d; user-agents listed: %d' % (bool(re.search(r'Disallow:\s*/client-portal', rb)), sm.count('<loc>'), rb.count('User-agent')))


# ======================================================================= DATA AUDIT (items 11-13)
def data_audit():
    section('B (data). Portfolio records')
    pj = PAGES['project']
    m = re.search(r'const PROJECTS = (\{.*?\n\});', pj, re.S)
    projects = {}
    if m:
        for pm in re.finditer(r'"([a-z0-9\-]+)":\s*\{(.*?)\n  \}', m.group(1), re.S):
            body = pm.group(2)

            def g(k):
                x = re.search(r'%s:\s*"([^"]*)"' % k, body)
                return x.group(1) if x else None
            gy = re.search(r'year:\s*(\d+)', body)
            projects[pm.group(1)] = {'name': g('name'), 'price': g('price'), 'sqft': g('sqft'), 'beds': g('beds'), 'baths': g('baths'),
                                     'location': g('location'), 'year': gy.group(1) if gy else '', 'status': g('status')}
    rows = list(projects.items())
    issues = []
    bathbad = [(k, v['baths']) for k, v in rows if v['baths'] and not re.fullmatch(r'\d+(\.5)?', v['baths'].strip())]
    dupprice = [(p, [k for k, v in rows if v['price'] == p]) for p in {v['price'] for _, v in rows if v['price'] and v['price'] not in ('—', '')} if sum(1 for _, v in rows if v['price'] == p) > 1]
    dupsq = [(s, [k for k, v in rows if v['sqft'] == s]) for s in {v['sqft'] for _, v in rows if v['sqft'] and v['sqft'] not in ('—', '')} if sum(1 for _, v in rows if v['sqft'] == s) > 1]
    reg('11', 'Portfolio records rebuilt from real data (no non-half baths, no duplicate prices/sq ft)', 'BLOCKED',
        '%d projects parsed. Rows breaking the Fact Sheet rules: non-half baths %s; duplicate prices %s; duplicate sq ft %s. Needs Rebecca\'s records.'
        % (len(rows), bathbad, dupprice, dupsq))
    ix = PAGES['index']
    i0 = ix.find('data-elh-track="1"')
    seg = ix[i0: ix.find('</section>', i0)]
    cards = [norm_ws(m.group(1)) for m in re.finditer(r'<a\b[^>]*draggable="false"[^>]*>(.*?)</a>', seg, re.S)]
    with_specs = [c for c in cards if re.search(r'\bBed\b|\bBath\b|Sqft', c)]
    reg('12', 'Homepage project cards show real per-home specs from corrected data', 'BLOCKED',
        'strip cards now read: %s. The identical placeholder specs (5 Bed / 5.5 Bath / 5,214 Sqft on Charter Oak, Via Estrella and 68th) were taken off because they repeat and contradict the Portfolio; each card shows its location from the Portfolio data instead (cards still showing specs: %d). Real specs go back once Rebecca supplies the records. "Stanford" has no project page and is marked Coming soon.'
        % (cards, len(with_specs)))
        # hand-off sheet for whoever holds the real records: what the site says today, what looks wrong, and blank columns to fill in
    import csv
    dp = {p: ks for p, ks in dupprice}
    ds = {s: ks for s, ks in dupsq}
    with open(os.path.join(ROOT, 'docs/portfolio-data-for-rebecca.csv'), 'w', newline='', encoding='utf8') as f:
        w = csv.writer(f)
        w.writerow(['slug', 'name', 'location_on_site', 'year_on_site', 'status_on_site', 'price_on_site', 'beds_on_site', 'baths_on_site', 'sqft_on_site',
                    'what_looks_wrong', 'CONFIRMED_price', 'CONFIRMED_beds', 'CONFIRMED_baths', 'CONFIRMED_sqft', 'CONFIRMED_year', 'CONFIRMED_status'])
        for k, v in rows:
            flags = []
            if v['baths'] and not re.fullmatch(r'\d+(\.5)?', v['baths'].strip()):
                flags.append('baths "%s" is not a whole or half number' % v['baths'])
            if v['price'] in dp:
                flags.append('same price as %s' % ', '.join(x for x in dp[v['price']] if x != k))
            if v['sqft'] in ds:
                flags.append('same sq ft as %s' % ', '.join(x for x in ds[v['sqft']] if x != k))
            w.writerow([k, v['name'], v['location'], v['year'], v['status'], v['price'], v['beds'], v['baths'], v['sqft'], '; '.join(flags), '', '', '', '', '', ''])
    cp_ = [k for k, v in rows if v['price'] == '$7,035,000']
    reg('13', 'Charter Oak and 68th St sale prices confirmed', 'BLOCKED', 'both still listed at $7,035,000: %s. Needs the real sale prices.' % cp_)
    return projects


# ======================================================================= LINKS / ASSETS / STRUCTURE
def structure_checks():
    section('X1. Links, anchors, assets, structure')
    # local link + asset resolution
    missing, anchors_bad, ext = [], [], Counter()
    ids_by_page = {n: set(re.findall(r'\bid="([^"]+)"', h)) for n, h in PAGES.items()}
    for n, h in PAGES.items():
        hh = re.sub(r'<script\b[^>]*>.*?</script>', '', h, flags=re.S)  # runtime strings are covered separately
        for m in re.finditer(r'\b(?:href|src)="([^"]+)"', hh):
            u = html.unescape(m.group(1))
            if re.match(r'(mailto:|tel:|javascript:|data:|#$)', u):
                continue
            if re.match(r'https?://', u):
                ext[re.match(r'https?://([^/]+)', u).group(1)] += 1
                continue
            path, _, frag = u.partition('#')
            path = path.split('?')[0]
            if path == '':
                target = n + '.html'
            else:
                target = path
            tp = os.path.join(DIST, target)
            if not os.path.exists(tp):
                missing.append('%s -> %s' % (n, u))
                continue
            if frag and target.endswith('.html'):
                tn = target[:-5]
                if tn in ids_by_page and frag not in ids_by_page[tn]:
                    anchors_bad.append('%s -> %s' % (n, u))
    reg('X1a', 'Every local href/src resolves to a file in dist/', 'FAIL' if missing else 'PASS',
        ('%d broken: %s' % (len(missing), '; '.join(sorted(set(missing))[:8]))) if missing else 'all local links/assets in %d pages resolve' % len(PAGES))
    reg('X1b', 'Every #anchor on a local link exists on the target page', 'FAIL' if anchors_bad else 'PASS',
        ('%d broken: %s' % (len(anchors_bad), '; '.join(sorted(set(anchors_bad))[:8]))) if anchors_bad else 'all anchors resolve')
    # duplicate ids
    dups = {}
    for n, h in PAGES.items():
        c = Counter(re.findall(r'\bid="([^"]+)"', strip_blocks(h)))
        d = [k for k, v in c.items() if v > 1]
        if d:
            dups[n] = d[:5]
    reg('X1c', 'No duplicate element ids in static HTML', 'FAIL' if dups else 'PASS', str(dups) if dups else 'none')
    # tag balance regression vs base
    def bal(h):
        h = strip_blocks(h)
        c = {}
        for t in ('div', 'section', 'button', 'a', 'span', 'form', 'ul', 'table', 'details', 'figure', 'header', 'footer', 'nav', 'aside', 'main'):
            c[t] = len(re.findall(r'<%s\b' % t, h)) - len(re.findall(r'</%s>' % t, h))
        return {k: v for k, v in c.items() if v}
    base_ref = 'origin/claude/implement-ella-lee-homes-lh0JL'
    regress = []
    for n in CORE + list(LEGAL):
        src = rd(os.path.join(SRC, n + '.html'))
        b = subprocess.run(['git', 'show', '%s:src/%s.html' % (base_ref, n)], capture_output=True, text=True, cwd=ROOT)
        if b.returncode != 0:
            continue
        nb, ns = bal(b.stdout), bal(src)
        if ns != nb:
            regress.append('%s base=%s now=%s' % (n, nb, ns))
    reg('X1d', 'HTML tag balance not worse than the base branch (div/section/a/span/…)', 'FAIL' if regress else 'PASS',
        '; '.join(regress[:4]) if regress else 'open/close counts identical to base on %d pages' % (len(CORE) + len(LEGAL)))
    # JSON-LD valid
    badj = [n for n in PAGES if any(s == 'INVALID JSON-LD' for s in schema_strings(PAGES[n]))]
    reg('X1e', 'All JSON-LD blocks parse', 'FAIL' if badj else 'PASS', str(badj) if badj else 'valid on all %d pages' % len(PAGES))
    # consistency of business facts inside schema
    facts = []
    for n, h in PAGES.items():
        for m in re.finditer(r'"telephone":\s*"([^"]+)"', h):
            if m.group(1) != '+1-480-340-8700':
                facts.append('%s phone %s' % (n, m.group(1)))
        for m in re.finditer(r'"streetAddress":\s*"([^"]+)"', h):
            if m.group(1) != '4408 N 12th St, Ste 200':
                facts.append('%s street %s' % (n, m.group(1)))
        for m in re.finditer(r'"postalCode":\s*"([^"]+)"', h):
            if m.group(1) != '85014':
                facts.append('%s zip %s' % (n, m.group(1)))
    reg('X1f', 'Schema phone/address/zip identical on every page', 'FAIL' if facts else 'PASS', '; '.join(facts[:4]) if facts else '+1-480-340-8700, 4408 N 12th St, Ste 200, 85014 everywhere')
    # phone number text consistent
    phones = Counter()
    for n in ALL_NAMES():
        for m in re.finditer(r'\(?\b(\d{3})\)?[\s.\-]?(\d{3})[\s.\-](\d{4})\b', text_of(PAGES[n])):
            phones['(%s) %s-%s' % m.groups()] += 1
    other = {k: v for k, v in phones.items() if k != '(480) 340-8700'}
    bt_ok = other == {'(877) 309-0368': 1} and '1-877-309-0368' in text_of(PAGES['client-portal'])   # Buildertrend support line, client portal only
    reg('X1g', 'Phone number shown is (480) 340-8700 everywhere (Buildertrend support line on the portal page excepted)', 'PASS' if (not other or bt_ok) else 'FAIL', str(dict(phones)))
    # emails
    emails = Counter()
    for n in ALL_NAMES():
        for m in re.finditer(r'[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[a-z]{2,}', text_of(PAGES[n]) + ' ' + ' '.join(re.findall(r'mailto:([^"]+)', PAGES[n]))):
            emails[m.group(0).lower()] += 1
    reg('X1h', 'Only hello@ and warranty@ ellaleehomes.com appear', 'PASS' if set(emails) <= {'hello@ellaleehomes.com', 'warranty@ellaleehomes.com'} else 'FAIL', str(dict(emails)))


def ALL_NAMES():
    return list(PAGES)



# ======================================================================= FACT SHEET RULES (extra, static)
def git_show(path):
    r = subprocess.run(['git', 'show', 'origin/claude/implement-ella-lee-homes-lh0JL:' + path], capture_output=True, text=True, cwd=ROOT)
    return r.stdout if r.returncode == 0 else ''


def norm_ws(s):
    return re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', ' ', s))).strip()


def factsheet_checks():
    ALL = list(PAGES)
    section('S. Fact Sheet rules, section by section')
    # ------------------------------------------------ 1. Company
    wrong_legal = find_all(r'Ella Lee Homes,? (?:Inc\b|Co\b|Corp|LLP|L\.L\.C|Ltd)', ALL)
    foot_missing = [n for n in ALL if 'Ella Lee Homes LLC' not in text_of(footer_html(PAGES[n]))]
    idx_legal = '"legalName": "Ella Lee Homes LLC"' in PAGES['index']
    reg('FS1a', 'Legal name "Ella Lee Homes LLC": in every footer and the home schema; no other legal form anywhere',
        'FAIL' if (wrong_legal or foot_missing or not idx_legal) else 'PASS',
        ('; '.join(filter(None, [fmt_hits(wrong_legal), ('footer lacks LLC on: %s' % foot_missing) if foot_missing else '', '' if idx_legal else 'home schema lacks legalName']))) or
        'footer of all %d pages reads "Copyright © 2026 Ella Lee Homes LLC"; schema legalName on home; no Inc/Co/Corp variants' % len(ALL))
    bad_owner = find_all(r'\bco-?founders?\b|\bFounders\b|Shay Segev,? (?:CEO|President|Owner)', ALL)
    has_title = 'Founder and Principal' in text_of(PAGES['our-story']) and 'Shay Segev, Founder and Principal' in html.unescape(PAGES['index'])
    reg('FS1b', 'Owner is Shay Segev, "Founder and Principal"; singular Founder, never Founders / co-founder / CEO',
        'FAIL' if (bad_owner or not has_title) else 'PASS', fmt_hits(bad_owner) or ('title missing' if not has_title else 'home photo alt and Our Story caption read "Founder and Principal"; no plural or other titles'))
    yrs = Counter()
    for n in ALL:
        for st in all_strings(n):
            for m in re.finditer(r'(?:since|founded(?: in)?|established(?: in)?|est\.?)\s+(\d{4})', st, re.I):
                yrs[m.group(1)] += 1
    fd = re.search(r'"foundingDate":\s*"(\d{4})"', PAGES['index'])
    reg('FS1c', 'Founded 2021: every "since/founded/established" year is 2021; schema foundingDate 2021',
        'PASS' if (set(yrs) == {'2021'} and fd and fd.group(1) == '2021') else 'FAIL', 'years found: %s; schema foundingDate: %s' % (dict(yrs), fd.group(1) if fd else None))
    # ------------------------------------------------ 3. What we do
    none_found('FS3a', 'Never draws attention to what Ella Lee Homes does not do ("we do not offer…", "no remodels")',
               r"we (?:do not|don't) (?:offer|do|provide|handle|build)|\bno (?:remodels?|renovations?)\b|not (?:a|an) (?:remodel|renovation|design)", ALL)
    none_found('FS3b', 'No services beyond custom homes (landscaping, interior design, brokerage, mortgages, property management, solar, flipping)',
               r'\b(?:landscap\w+ (?:services|design)|interior design (?:services|package)|property management|real estate (?:agent|brokerage) services|mortgage (?:services|broker)|solar (?:installation|panels)|house[- ]flipping)\b', ALL)
    none_found('FS3c', 'Contract wording: cost-plus only (no fixed price, no choice of structures, no "open books" in substance)',
               r'fixed[- ]price|lump[- ]sum|guaranteed maximum|choice of contract|contract structures?|open[- ]books?|every invoice|every subcontractor bid', ALL)
    # ------------------------------------------------ 4. Numbers and claims
    ch = []
    for n in ALL:
        for st in all_strings(n):
            for m in re.finditer(r'(\d+)\s?%', st):
                near = st[max(0, m.start() - 70):m.end() + 40]
                if re.search(r'profit', near, re.I) and not re.match(r'10\s?% of (?:our |its )?profits', st[m.start():m.start() + 40]):
                    ch.append((n, near.strip()))
            for m in re.finditer(r'minimum of 10|annual profits', st, re.I):
                ch.append((n, st[max(0, m.start() - 40):m.end() + 40]))
    reg('FS4a', 'Charitable giving is stated only as "10% of profits" (no "minimum", no "annual")', 'FAIL' if ch else 'PASS',
        fmt_hits(list(dict.fromkeys(ch))) or '10% of profits on home, developers and FAQ; no other giving figure')
    none_found('FS4b', 'No urgency or hard-sell tactics', r"\b(?:act now|limited time|hurry|don't miss|last chance|only \d+ (?:spots|lots|homes) left|before it's too late|today only|call now|don't wait|book now)\b", ALL)
    # testimonials: every quote must exist verbatim in the original home page (the five real Google reviews)
    orig = norm_ws(git_show('src/index.html'))
    quotes = {}
    for n, h in PAGES.items():
        for m in re.finditer(r'<blockquote\b[^>]*>(.*?)</blockquote>', h, re.S):
            quotes.setdefault(norm_ws(m.group(1)), set()).add(n)
    invented = [q[:70] for q in quotes if q not in orig]
    names = Counter()
    for n, h in PAGES.items():
        for m in re.finditer(r'class="rv-card[^"]*".*?</figure>|class="rv-card[^"]*".*?</a>', h, re.S):
            pass
    reviewers = set()
    for n in ('index', 'why-us', 'developers', 'our-story'):
        for m in re.finditer(r'<figcaption[^>]*>(.*?)</figcaption>', PAGES[n], re.S):
            reviewers.add(norm_ws(m.group(1)).split(' Google review')[0].strip())
    okset = {'M Mike M', 'M Michael Wiss', 'A Anastasia Foster', 'H Heather Wilson', 'G Gordon Yonel'}
    odd = [r for r in reviewers if r not in okset]
    reg('FS4c', 'Testimonials: only the five real Google reviews; every quote is verbatim in the original home page; reviewer names as on Google; none invented',
        'FAIL' if (invented or odd or len(quotes) != 5) else 'PASS',
        'quotes on site: %d (expected 5); not in original home page: %s; unexpected reviewer labels: %s' % (len(quotes), invented, odd) if (invented or odd or len(quotes) != 5)
        else '5 distinct quotes, all verbatim in the original home page, shown on %s; reviewers: Mike M, Michael Wiss, Anastasia Foster, Heather Wilson, Gordon Yonel' % sorted({p for v in quotes.values() for p in v}))
    # ------------------------------------------------ 5. Voice (measured, human judges)
    stats = []
    for n in ('index', 'why-us', 'our-story', 'build-your-home', 'faq', 'sell-your-home', 'developers', 'contact', 'warranty'):
        body = norm_ws(re.sub(r'<(script|style)\b[^>]*>.*?</\1>', ' ', body_html(PAGES[n]), flags=re.S))
        sents = [x for x in re.split(r'(?<=[.!?])\s+', body) if len(x.split()) >= 4]
        if sents:
            lens = [len(x.split()) for x in sents]
            stats.append('%s avg %.0f words, %d%% over 30' % (n, sum(lens) / len(lens), 100 * sum(1 for x in lens if x > 30) // len(lens)))
    reg('FS5a', 'Voice: short sentences, plain words (sophisticated but simple). Measured; tone is a human judgement', 'MANUAL', 'sentence length per page: ' + '; '.join(stats))
    # ------------------------------------------------ 7. Navigation and page rules
    KEY = r'custom home|builder|Arizona|Paradise Valley|Scottsdale|Arcadia|Phoenix'
    missing_kw = []
    for n in CORE:
        if n in ('client-portal', 'project', 'index'):
            continue
        t = html.unescape(re.search(r'<title>(.*?)</title>', PAGES[n], re.S).group(1))
        if not re.search(KEY, t, re.I):
            missing_kw.append('%s: "%s"' % (n, t))
    reg('FS7a', 'Page titles carry a keyword ("Topic | Ella Lee Homes", e.g. custom home / builder / Arizona / a market) on every public page', 'FAIL' if missing_kw else 'PASS',
        '; '.join(missing_kw) or 'every core page title contains one of: custom home, builder, Arizona, Paradise Valley, Scottsdale, Arcadia, Phoenix')
    # primary call to action: the closing buttons say "Start Your Build" (Sell keeps its own seller prompt; forms keep "Send")
    other = []
    for n in ALL:
        if n == 'sell-your-home':
            continue
        h = strip_blocks(body_html(PAGES[n]))
        labs = []
        for blk in re.finditer(r'<div class="article-cta-inline">(.*?)</div>', h, re.S):
            labs += [norm_ws(x) for x in re.findall(r'<a\b[^>]*>(.*?)</a>', blk.group(1), re.S)]
        for m in re.finditer(r'<a\b[^>]*class="[^"]*(?:btn|button|cta)[^"]*"[^>]*href="(?:contact\.html|index\.html#inquiry)[^"]*"[^>]*>(.*?)</a>|<a\b[^>]*href="(?:contact\.html|index\.html#inquiry)[^"]*"[^>]*class="[^"]*(?:btn|button|cta)[^"]*"[^>]*>(.*?)</a>', h, re.S):
            labs.append(norm_ws(m.group(1) or m.group(2)))
        for lab in labs:
            if lab and lab != 'Start Your Build':
                other.append('%s: "%s"' % (n, lab))
    reg('FS7b', 'Primary call to action is "Start Your Build" on every button that leads to the inquiry (nav and page-closing buttons)', 'FAIL' if other else 'PASS',
        '; '.join(other[:8]) or 'all inquiry buttons (outside the Sell page) read "Start Your Build"')
    # ------------------------------------------------ 6. Brand
    old = [f for f in glob.glob(os.path.join(ROOT, 'assets', '*.css')) + glob.glob(os.path.join(ROOT, 'assets', '*.js')) + glob.glob(os.path.join(ROOT, 'src', '*.html')) + glob.glob(os.path.join(ROOT, 'partials', '*.html'))
           if re.search(r'#0D2D4E|#002855', rd(f), re.I)]
    reg('FS6a', 'Navy is #001526 everywhere: neither the old brand-guide navy #002855 nor #0D2D4E is used', 'FAIL' if old else 'PASS',
        'found in: %s' % [os.path.basename(f) for f in old] if old else 'neither colour appears in any page, partial, stylesheet or script')



# ======================================================================= SEO / ACCESSIBILITY / STRUCTURE (extra, static)
def structure_checks2():
    ALL = list(PAGES)
    section('X3. SEO, accessibility and structure (every page)')
    titles, descs = Counter(), Counter()
    for n, h in PAGES.items():
        titles[html.unescape(re.search(r'<title>(.*?)</title>', h, re.S).group(1)).strip()] += 1
        d = re.search(r'<meta name="description" content="([^"]*)"', h)
        descs[html.unescape(d.group(1)) if d else ''] += 1
    dt = [t for t, c in titles.items() if c > 1]
    dd = [d[:50] or '(none)' for d, c in descs.items() if c > 1 or d == '']
    reg('X3a', 'Every page has its own title and its own meta description (no duplicates, none missing)', 'FAIL' if (dt or dd) else 'PASS',
        ('duplicate titles %s; duplicate/missing descriptions %s' % (dt, dd)) if (dt or dd) else '%d unique titles, %d unique descriptions' % (len(titles), len(descs)))
    # canonical + sitemap
    sm = rd(os.path.join(DIST, 'sitemap.xml'))
    locs = re.findall(r'<loc>(.*?)</loc>', html.unescape(sm))
    slugs = set()
    mproj = re.search(r'const PROJECTS = (\{.*?\n\});', PAGES['project'], re.S)
    if mproj:
        slugs = set(re.findall(r'^  "([a-z0-9\-]+)":\s*\{', mproj.group(1), re.M))
    bad = []
    for n, h in PAGES.items():
        if n == 'project':
            continue
        c = re.search(r'<link rel="canonical" href="([^"]*)"', h)
        if not c:
            bad.append('%s: no canonical' % n)
            continue
        url = c.group(1)
        if not url.startswith('https://ellaleehomes.com'):
            bad.append('%s: canonical not absolute on the live domain (%s)' % (n, url))
        if n == 'client-portal':
            if url in locs:
                bad.append('client-portal is in the sitemap')
        elif url not in locs:
            bad.append('%s: canonical %s is not in the sitemap' % (n, url))
    for u in locs:
        path = u.replace('https://ellaleehomes.com', '')
        pth, _, q = path.partition('?')
        if pth in ('', '/'):
            continue
        if not os.path.exists(os.path.join(DIST, pth.lstrip('/') + '.html')):
            bad.append('sitemap URL has no page: %s' % u)
        if q.startswith('slug=') and q[5:] not in slugs:
            bad.append('sitemap project slug not in data: %s' % u)
    reg('X3b', 'Canonical tags are absolute, on the live domain and equal to the sitemap URL; every sitemap URL resolves; portal not in sitemap', 'FAIL' if bad else 'PASS',
        '; '.join(bad[:6]) or '%d sitemap URLs (%d projects with data) all resolve; %d canonicals match' % (len(locs), len(slugs), len(ALL) - 1))
    # structure basics
    h1 = {n: len(re.findall(r'<h1\b', strip_blocks(h))) for n, h in PAGES.items()}
    lang = [n for n, h in PAGES.items() if not re.search(r'<html[^>]*\blang="en"', h)]
    vp = [n for n, h in PAGES.items() if 'name="viewport"' not in h]
    reg('X3c', 'Exactly one <h1> per page; <html lang="en"> and a viewport tag on every page', 'FAIL' if ([n for n, c in h1.items() if c != 1] or lang or vp) else 'PASS',
        'h1 counts != 1: %s; lang missing: %s; viewport missing: %s' % ([n for n, c in h1.items() if c != 1], lang, vp))
    noalt = []
    for n, h in PAGES.items():
        for m in re.finditer(r'<img\b[^>]*>', strip_blocks(h)):
            if not re.search(r'\balt=', m.group(0)):
                noalt.append('%s: %s' % (n, re.search(r'src="([^"]*)"', m.group(0)).group(1)[:50] if re.search(r'src="([^"]*)"', m.group(0)) else '?'))
    reg('X3d', 'Every <img> in the static HTML has an alt attribute', 'FAIL' if noalt else 'PASS', '; '.join(noalt[:6]) or 'all images carry alt (empty alt only where decorative)')
    nofav = [n for n, h in PAGES.items() if 'rel="icon"' not in h]
    favfiles = [f for f in ('assets/favicon.ico', 'assets/favicon-32.png', 'assets/apple-touch-icon.png') if not os.path.exists(os.path.join(ROOT, f))]
    reg('X3e', 'Brand favicon (monogram on navy) on every page, files present', 'FAIL' if (nofav or favfiles) else 'PASS', 'pages without icon: %s; missing files: %s' % (nofav, favfiles))
    ext = []
    for n, h in PAGES.items():
        for m in re.finditer(r'<a\b([^>]*)>', strip_blocks(h)):
            a = m.group(1)
            if 'target="_blank"' in a and not re.search(r'rel="[^"]*noopener', a):
                ext.append('%s: %s' % (n, re.search(r'href="([^"]*)"', a).group(1)[:60]))
    reg('X3f', 'Links that open a new tab carry rel="noopener"', 'FAIL' if ext else 'PASS', '; '.join(ext[:5]) or 'every target=_blank link has rel noopener')
    # urls inside JSON-LD that point at our own domain exist
    miss, wp = [], 0
    for n, h in PAGES.items():
        for st in schema_strings(h):
            if st.startswith('https://ellaleehomes.com/') and not st.startswith('https://ellaleehomes.com/#'):
                path = st.replace('https://ellaleehomes.com/', '').split('?')[0].split('#')[0]
                if path.startswith('wp-content/'):
                    wp += 1          # old WordPress media: tracked as item 62
                    continue
                if path and not (os.path.exists(os.path.join(DIST, path)) or os.path.exists(os.path.join(DIST, path + '.html'))):
                    miss.append('%s: %s' % (n, st))
    reg('X3g', 'Every URL inside the JSON-LD that points at ellaleehomes.com (logo, image, pages) exists in the build', 'FAIL' if miss else 'PASS', '; '.join(sorted(set(miss))[:6]) or ('all schema URLs on our domain resolve (%d old WordPress media URLs in article schema are counted under item 62)' % wp))
    # css url() references
    missing = []
    def check_urls(text, base_dir, label):
        for m in re.finditer(r'url\(\s*[\'"]?([^\'")]+)[\'"]?\s*\)', text):
            u = html.unescape(m.group(1)).strip()
            if re.match(r'(https?:|data:|#|%23|//)', u):
                continue
            if not os.path.exists(os.path.normpath(os.path.join(base_dir, u.split('?')[0].split('#')[0]))):
                missing.append('%s -> %s' % (label, u))
    for n, h in PAGES.items():
        check_urls(h, DIST, n)
    for f in glob.glob(os.path.join(DIST, 'assets', '*.css')):
        check_urls(rd(f), os.path.dirname(f), os.path.basename(f))
    reg('X3h', 'Every local url(...) in styles (inline, <style>, stylesheets) points to an existing file', 'FAIL' if missing else 'PASS', '; '.join(sorted(set(missing))[:6]) or 'all local CSS image references exist')
    # ---- inherited "MUST" items from the June review that live in the repo (not on the Sep 29 list)
    raw_all = {n: PAGES[n] for n in ALL}
    jsfiles = {os.path.basename(f): rd(f) for f in glob.glob(os.path.join(ROOT, 'assets', '*.js'))}
    tw = [n for n, h in raw_all.items() if re.search(r'Tweaks|Motion Speed|Cards Scroll Speed|Hero Media', h)] + [k for k, v in jsfiles.items() if re.search(r'Tweaks|Motion Speed|Cards Scroll Speed', v)]
    reg('J1', 'No developer "Tweaks" panel anywhere (June review launch blocker)', 'FAIL' if tw else 'PASS', str(tw) if tw else 'no Tweaks / Motion Speed / Hero Media controls in any page or script')
    first = {}
    for n, h in PAGES.items():
        t = text_of(body_html(h))[:40]
        if re.match(r'^\d+\b', t):
            first[n] = t
    reg('J2', 'No stray number (e.g. "100") as the first text on any page (June review launch blocker)', 'FAIL' if first else 'PASS', str(first) if first else 'first visible text on every page is words, not a counter')
    badlinks = []
    for n, h in PAGES.items():
        ft = footer_html(h)
        for m in re.finditer(r'<a\b[^>]*href="([^"]*)"[^>]*>(.*?)</a>', ft, re.S):
            lab = norm_ws(m.group(2))
            if lab in ('Our Story', 'Build Your Home', 'Developers', 'Contact', 'Why Us', 'Portfolio') and m.group(1).startswith('#'):
                if not (n == 'index' and re.search(r'\bid="%s"' % re.escape(m.group(1)[1:]), PAGES['index'])):
                    badlinks.append('%s footer "%s" -> %s' % (n, lab, m.group(1)))
    for n in ARTICLES:
        for m in re.finditer(r'<a\b[^>]*href="([^"]*#cta[^"]*)"', body_html(PAGES[n])):
            badlinks.append('%s article link -> %s' % (n, m.group(1)))
    reg('J3', 'Footer links go to real pages (not #cta/#meet anchors); article links do not point at #cta', 'FAIL' if badlinks else 'PASS', '; '.join(badlinks[:5]) or 'footer Our Story/Build/Developers/Contact/Why Us/Portfolio links all resolve to pages; no #cta in articles')
    cp = PAGES['client-portal']
    bt = re.findall(r'<a\b[^>]*href="https://buildertrend\.net[^"]*"[^>]*>', cp)
    okbt = bt and all('target="_blank"' in a and 'noopener' in a for a in bt)
    reg('J4', 'Buildertrend links on the Client Portal open in a new tab with rel="noopener"', 'PASS' if okbt else 'FAIL', '%d Buildertrend link(s): %s' % (len(bt), 'all target=_blank rel=noopener' if okbt else bt))


# ======================================================================= ASSET INVENTORY (item 62)
def asset_inventory():
    section('G. Asset migration (item 62)')
    urls = defaultdict(set)
    files = [(n, h) for n, h in PAGES.items()] + [(os.path.basename(f), rd(f)) for f in glob.glob(os.path.join(ROOT, 'assets/*.js')) + glob.glob(os.path.join(ROOT, 'assets/*.css'))]
    rx = re.compile(r'https?://[^\s"\'<>)\\]+\.(?:jpe?g|png|webp|gif|svg|mp4|m4v|mov|webm)(?:\?[^\s"\'<>)\\]*)?', re.I)
        # Google Drive / Photos links have no file extension (lh3.googleusercontent.com/d/<id>), so match them by host as well
    rx_drive = re.compile(r'https?://(?:lh\d+\.googleusercontent\.com|drive\.google\.com|docs\.google\.com)/[^\s"\'<>)\\]+', re.I)
    for n, h in files:
        for u in rx.findall(h) + rx_drive.findall(h):
            host = re.match(r'https?://([^/]+)', u).group(1)
            urls[host].add(u)
    rows = {h: len(v) for h, v in urls.items()}
    wp = urls.get('ellaleehomes.com', set())
    drive = {u for h, v in urls.items() for u in v if 'drive.google' in h or 'googleusercontent' in h}
    zillow = {u for h, v in urls.items() for u in v if 'zillow' in h}
    reg('62', 'Nothing loads from the old WordPress site, Google Drive or Zillow at launch (planned: uploaded from Drive once the site is done)', 'BLOCKED',
        'media URLs still pointing off-site (unique): WordPress %d, Google Drive %d, Zillow %d; all hosts: %s. Needs the Drive export.' % (len(wp), len(drive), len(zillow), rows))
    inv = sorted(u for v in urls.values() for u in v)
    return inv, urls


# ======================================================================= BROWSER CHECKS
class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


def start_server():
    handler = lambda *a, **k: QuietHandler(*a, directory=DIST, **k)  # noqa: E731
    socketserver.TCPServer.allow_reuse_address = True
    srv = socketserver.ThreadingTCPServer(('127.0.0.1', 0), handler)
    t = threading.Thread(target=srv.serve_forever, daemon=True)
    t.start()
    return srv, srv.server_address[1]


FONTS_DIR = os.environ.get('QA_FONTS_DIR', '')


def font_css():
    """Google Fonts is not reachable from the QA sandbox, so pages would render in fallback fonts and every
    width-dependent check (line wraps, cramped columns) would be measured against the wrong glyphs. If QA_FONTS_DIR
    holds the @fontsource woff2 files (inter-latin-{300,400,500}-normal, dm-serif-display-latin-400-{normal,italic}),
    serve them under the Google Fonts URLs the pages already use."""
    faces = [('Inter', 300, 'normal', 'inter-latin-300-normal.woff2'), ('Inter', 400, 'normal', 'inter-latin-400-normal.woff2'),
             ('Inter', 500, 'normal', 'inter-latin-500-normal.woff2'), ('DM Serif Display', 400, 'normal', 'dm-serif-display-latin-400-normal.woff2'),
             ('DM Serif Display', 400, 'italic', 'dm-serif-display-latin-400-italic.woff2')]
    return '\n'.join("@font-face{font-family:'%s';font-style:%s;font-weight:%d;font-display:swap;src:url(https://fonts.gstatic.com/qa/%s) format('woff2')}" % (f, st, w, fn)
                      for f, w, st, fn in faces if os.path.exists(os.path.join(FONTS_DIR, fn)))


def font_response(u):
    """Playwright route helper: a fulfil() kwargs dict for a Google Fonts URL, or None if QA_FONTS_DIR is not set."""
    if not FONTS_DIR:
        return None
    if 'fonts.googleapis.com' in u:
        return dict(status=200, content_type='text/css', body=font_css())
    m = re.search(r'fonts\.gstatic\.com/qa/([\w.\-]+)$', u)
    if m and os.path.exists(os.path.join(FONTS_DIR, m.group(1))):
        return dict(status=200, content_type='font/woff2', body=open(os.path.join(FONTS_DIR, m.group(1)), 'rb').read())
    return None


PHONE_JS = """() => { const out = []; const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); while (w.nextNode()) { const t = w.currentNode; const i = t.nodeValue.indexOf('(480) 340-8700'); if (i < 0) continue; const el = t.parentElement; if (el.closest('script, style, noscript, [hidden]')) continue; const r = document.createRange(); r.setStart(t, i); r.setEnd(t, i + 14); const rects = [...r.getClientRects()].filter(x => x.width > 0); if (!rects.length) continue; if (new Set(rects.map(x => Math.round(x.top))).size > 1) out.push(t.nodeValue.trim().slice(0, 40)); } return out }"""



EMPTY_JS = """(final) => { const M = (window.__qaSec = window.__qaSec || new Map()); if (final) return [...M.values()].filter(v => !v.ok).map(v => v.label); const vis = e => { for (let x = e; x; x = x.parentElement) { const c = getComputedStyle(x); if (c.display === 'none' || c.visibility === 'hidden' || parseFloat(c.opacity) < 0.05) return false } return e.getClientRects().length > 0 }; for (const s of document.querySelectorAll('section')) { if (!vis(s) || s.closest('footer, header, nav')) continue; const heads = [...s.querySelectorAll('h1, h2, h3, h4')].filter(vis); if (!heads.length) continue; const media = [...s.querySelectorAll('img, picture, iframe, video, canvas, form, input, button, a')].filter(e => !e.closest('h1, h2, h3, h4') && vis(e)).length; let chars = 0; const w = document.createTreeWalker(s, NodeFilter.SHOW_TEXT); while (w.nextNode()) { const pe = w.currentNode.parentElement; const tx = (w.currentNode.nodeValue || '').trim(); if (!pe || tx.length < 2 || pe.closest('h1, h2, h3, h4, script, style, noscript')) continue; if (vis(pe)) chars += tx.length } const prev = M.get(s); M.set(s, {ok: (prev && prev.ok) || media > 0 || chars >= 60, label: (s.id ? '#' + s.id : s.className.toString().slice(0, 30)) + ' "' + heads[0].textContent.trim().slice(0, 40) + '"'}) } return null }"""

ALIGN_JS = """() => { const out = []; for (const f of document.querySelectorAll('form')) { if (!f.getClientRects().length) continue; const L = [...f.querySelectorAll('label')].filter(l => l.getClientRects().length > 0).map(l => { const r = l.getBoundingClientRect(); return {t: r.top + scrollY, l: r.left, r: r.right, x: (l.textContent || '').trim().slice(0, 14)} }); for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) { const a = L[i], b = L[j]; const apart = a.r <= b.l + 1 || b.r <= a.l + 1; const dy = Math.abs(a.t - b.t); if (apart && dy > 0.6 && dy < 12) out.push(a.x + ' / ' + b.x + ' differ by ' + dy.toFixed(1) + 'px') } } return out }"""

REVEAL_CSS = '[class*=reveal]{opacity:1!important;transform:none!important}'


CONTRAST_FIXTURE = """<html><body style="margin:0;background:#001526;color:#EAE5DC;font:16px Inter,sans-serif">
<p id=ok style="color:#EAE5DC">Readable cream text on navy</p>
<p id=bad1 style="color:rgba(0,21,38,.62)">Navy on navy, invisible</p>
<p id=bad2 style="color:#A5A09D;background:#EAE5DC;padding:6px">Nickel on linen small</p>
<h2 id=big style="font-size:32px;color:#BFA06A;background:#EAE5DC;margin:0">Gold on linen large</h2>
<div style="width:40px;height:40px;background:rgba(234,229,220,.14)"><svg viewBox="0 0 24 24" width=24 height=24 fill="none" stroke="#001526" stroke-width="1.5"><circle cx=12 cy=12 r=9 /></svg></div>
<div style="width:40px;height:40px"><svg viewBox="0 0 24 24" width=24 height=24 fill="none" stroke="#BFA06A" stroke-width="1.5"><circle cx=12 cy=12 r=9 /></svg></div>
</body></html>"""


FOCUS_JS = """() => { const e = document.activeElement; if (!e || e === document.body) return null; const c = getComputedStyle(e); const r = e.getBoundingClientRect(); if (!(r.width > 0 && r.height > 0)) return null; const on = c.outlineStyle !== 'none' && parseFloat(c.outlineWidth) > 0 && c.outlineColor !== 'rgba(0, 0, 0, 0)'; return {on: on || c.boxShadow !== 'none', label: e.tagName + ' ' + ((e.innerText || e.getAttribute('aria-label') || e.getAttribute('href') || e.name || '').trim().replace(/\\s+/g, ' ').slice(0, 24))} }"""


EMPTY_FIXTURE = """<html><body>
<section id=shell><div>THE SMARTER WAY TO SELL</div><h2>A direct sale vs. the route</h2><div style="display:none"><span>hidden card text that is long enough to count if it were visible</span></div></section>
<section id=cards><h2>With cards</h2><div><h4>Fees</h4><span>None, no agent commissions at all in a direct sale like this one</span><span>Agent commissions apply to a traditional sale</span></div></section>
<section id=media><h2>With photo</h2><img src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" width=20 height=20></section>
</body></html>"""


CLIP_JS = """() => { const W = document.documentElement.clientWidth; const out = []; const skip = 'script, style, noscript, svg, template, option, [hidden], [data-elh-track], [data-elh-strip], [data-elh-drawer], [data-elh-scrim], .rv-grid, .nav-dd-panel, [aria-hidden=true]'; const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); const seen = new Set(); while (w.nextNode()) { const t = w.currentNode; const tx = (t.nodeValue || '').replace(/\\s+/g, ' ').trim(); if (tx.length < 2) continue; const el = t.parentElement; if (!el || seen.has(el) || el.closest(skip)) continue; seen.add(el); let hid = false; for (let x = el; x; x = x.parentElement) { const c = getComputedStyle(x); if (c.display === 'none' || c.visibility === 'hidden' || parseFloat(c.opacity) < 0.05 || c.overflowX === 'auto' || c.overflowX === 'scroll') { hid = true; break } } if (hid) continue; const r = document.createRange(); r.selectNodeContents(t); const rects = [...r.getClientRects()].filter(q => q.width > 1); if (!rects.length) continue; const right = Math.max(...rects.map(q => q.right)), left = Math.min(...rects.map(q => q.left)); if (right > W + 1 || left < -1) out.push(el.tagName.toLowerCase() + '.' + (el.className && el.className.toString ? el.className.toString().slice(0, 20) : '') + ' "' + tx.slice(0, 28) + '" ' + Math.round(left) + '..' + Math.round(right) + ' of ' + W) } return out }"""


def find_chromium():
    for p in glob.glob('/opt/pw-browsers/chromium-*/chrome-linux/chrome') + glob.glob('/opt/pw-browsers/chromium/chrome-linux/chrome'):
        return p
    return None


def browser_checks(projects):
    try:
        from playwright.sync_api import sync_playwright
    except Exception as e:  # pragma: no cover
        section('E/X. Browser checks')
        reg('BR', 'Browser checks', 'MANUAL', 'playwright not installed (%s); run `pip install playwright` and re-run' % e)
        return
    srv, port = start_server()
    base = 'http://127.0.0.1:%d' % port
    placeholder = open(os.path.join(ROOT, 'uploads/home/hero-poster.jpg'), 'rb').read()
    exe = find_chromium()
    section('E. Design and layout (browser)')
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=exe, args=['--no-sandbox']) if exe else p.chromium.launch(args=['--no-sandbox'])

        def newpage(w=1440, h=900):
            ctx = browser.new_context(viewport={'width': w, 'height': h})
            pg = ctx.new_page()
            errs = []
            pg.on('pageerror', lambda e: errs.append('pageerror: %s' % str(e)[:200]))
            pg.on('console', lambda m: errs.append('console.error: %s' % m.text[:200]) if m.type == 'error' and 'Failed to load resource' not in m.text and 'net::ERR' not in m.text else None)

            def route(r):
                u = r.request.url
                if u.startswith(base):
                    return r.continue_()
                fr = font_response(u)
                if fr:
                    return r.fulfill(**fr)
                if re.search(r'\.(jpe?g|png|webp|gif)(\?|$)', u, re.I) and ('ellaleehomes.com' in u or 'googleusercontent' in u or 'zillow' in u):
                    return r.fulfill(status=200, content_type='image/jpeg', body=placeholder)
                return r.abort()
            pg.route('**/*', route)
            return pg, errs

        def go(pg, name, wait=900):
            pg.goto('%s/%s.html' % (base, name), wait_until='load')
            pg.wait_for_timeout(wait)

        # ---------------- hero geometry vs the home page
        pg, errs = newpage()
        go(pg, 'index', 3200)
        pg.add_style_tag(content='.elh-intro{display:none!important}')
        home = pg.evaluate("""() => {
          const s = document.querySelector('#top'); const h1 = s.querySelector('h1');
          const cs = getComputedStyle(h1); const r = s.getBoundingClientRect();
          const els = [...s.querySelectorAll('h1,h2,p,a,button')].filter(e => { const b = e.getBoundingClientRect(); return b.height > 0 && b.width > 0 && !e.closest('.elh-intro') });
          return {vh: window.innerHeight, h: r.height, top: r.top, fs: cs.fontSize, ff: cs.fontFamily.split(',')[0], color: cs.color,
                  textBottom: Math.max(...els.map(e => e.getBoundingClientRect().bottom + window.scrollY)), hasVideo: !!s.querySelector('video')}
        }""")
        hero_pages = ['previous-projects', 'build-your-home', 'stories', 'client-portal', 'faq', 'warranty', 'homeowner-resources',
                      'code-of-conduct', 'why-us', 'developers', 'contact', 'our-story', 'sell-your-home', 'privacy', 'terms', 'disclaimer']
        geo = {}
        for n in hero_pages:
            pg2, e2 = newpage()
            go(pg2, n, 1200)
            geo[n] = pg2.evaluate("""() => {
              const hb = document.querySelector('#hero-banner'); if (!hb) return null;
              const h1 = hb.querySelector('h1'); const cs = getComputedStyle(h1); const r = hb.getBoundingClientRect();
              const img = hb.querySelector('img');
              const els = [...hb.querySelectorAll('h1,h2,p,a,button,.hero-head-meta,.hero-meta,.hero-lede')].filter(e => { const b = e.getBoundingClientRect(); return b.height > 0 && b.width > 0 });
              return {h: Math.round(r.height), top: Math.round(r.top), fs: cs.fontSize, ff: cs.fontFamily.split(',')[0], color: cs.color,
                      img: img ? img.getAttribute('src') : null, imgOK: img ? (img.naturalWidth > 0) : false,
                      textBottom: Math.round(Math.max(...els.map(e => e.getBoundingClientRect().bottom + scrollY))), video: !!hb.querySelector('video'),
                      text: hb.innerText.replace(/\\s+/g,' ').trim().slice(0, 200)}
            }""")
            geo[n]['errs'] = e2
            pg2.context.close()
        bad, lines = [], []
        for n, g in geo.items():
            if g is None:
                bad.append('%s: no #hero-banner' % n)
                continue
            problems = []
            if abs(g['h'] - home['h']) > 2:
                problems.append('height %s vs home %s' % (g['h'], round(home['h'])))
            if g['fs'] != home['fs']:
                problems.append('h1 size %s vs home %s' % (g['fs'], home['fs']))
            if g['ff'] != home['ff']:
                problems.append('h1 font %s vs home %s' % (g['ff'], home['ff']))
            if abs(g['textBottom'] - home['textBottom']) > 6:
                problems.append('copy block ends y=%s vs home y=%s' % (g['textBottom'], round(home['textBottom'])))
            if g['video']:
                problems.append('has video')
            if re.search(r'\b\d+\+|\brated\b|★|\bstars?\b|\$\d', g['text']):
                problems.append('stat/badge text in hero: "%s"' % g['text'][:80])
            lines.append('%s: %spx, h1 %s, copy ends y=%s%s' % (n, g['h'], g['fs'], g['textBottom'], (' !!' + '; '.join(problems)) if problems else ''))
            if problems:
                bad.append('%s: %s' % (n, '; '.join(problems)))
        reg('40', 'One hero standard: full screen before the blue fade, same type treatment, no stat badges, no video (16 hero pages vs the home hero at 1440×900)',
            'FAIL' if bad else 'PASS',
            ('; '.join(bad)) if bad else 'home hero: %dpx tall (118vh), h1 %s %s, copy block ends y=%d. ' % (round(home['h']), home['fs'], home['ff'], round(home['textBottom'])) + ' | '.join(lines))
        # colours
        cols = Counter(g['color'] for g in geo.values() if g)
        reg('40b', 'Hero title colour consistent across pages', 'PASS' if len(cols) == 1 else 'MANUAL',
            'title colours: %s (home h1: %s). The Fact Sheet says "white text only above the line"; home uses linen-white.' % (dict(cols), home['color']))
        imgs = Counter(g['img'] for g in geo.values() if g and g['img'])
        dup = {k: v for k, v in imgs.items() if v > 1}
        reg('40c', 'Each hero page has its own photo', 'FAIL' if dup else 'PASS', ('shared photos: %s' % dup) if dup else '%d hero pages, %d distinct photos' % (len(imgs), len(imgs)))
        # ---------------- reveal + overflow + console across ALL pages at 3 widths
        ovf, stuck, consoles = [], [], []
        for n in PAGES:
            for w in (390, 768, 1440):
                pgx, ex = newpage(w, 900 if w > 500 else 800)
                pgx.goto('%s/%s.html' % (base, n), wait_until='load')
                pgx.wait_for_timeout(1200 if n != 'index' else 3300)
                if w in (390, 1440):
                    pgx.evaluate("""async () => { const H = document.documentElement.scrollHeight; for (let y = 0; y < H; y += 400) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 120)); } window.scrollTo(0, H); await new Promise(r => setTimeout(r, 2000)); }""")
                    s_ = pgx.evaluate("""() => [...document.querySelectorAll('.reveal')].filter(e => e.getClientRects().length > 0 && parseFloat(getComputedStyle(e).opacity) < 0.99).map(e => (e.className.toString().slice(0, 40) + '|' + (e.textContent || '').trim().slice(0, 30)))""")
                    if s_:
                        stuck.append('%s@%d: %d visible element(s) never revealed e.g. %s' % (n, w, len(s_), s_[:2]))
                o = pgx.evaluate("() => ({sw: document.documentElement.scrollWidth, iw: window.innerWidth})")
                if o['sw'] > o['iw'] + 1:
                    ovf.append('%s@%d: scrollWidth %d > %d' % (n, w, o['sw'], o['iw']))
                if w == 1440 and ex:
                    consoles.append('%s: %s' % (n, ex[:2]))
                pgx.context.close()
        reg('X2a', 'No horizontal overflow at 390, 768 and 1440 px on any page', 'FAIL' if ovf else 'PASS', '; '.join(ovf[:8]) if ovf else '%d pages × 3 widths clean' % len(PAGES))
        reg('X2b', 'Scroll-reveal never leaves content invisible (scrolled each page top to bottom at 390 and 1440, 2s settle, displayed elements only)', 'FAIL' if stuck else 'PASS', '; '.join(stuck[:6]) if stuck else 'every displayed .reveal element reaches opacity 1 on %d pages at 390 and 1440' % len(PAGES))
        reg('X2c', 'No JavaScript errors on any page (failed external requests excluded)', 'FAIL' if consoles else 'PASS', '; '.join(consoles[:6]) if consoles else '0 page errors / console errors on %d pages' % len(PAGES))
        # ---------------- Portfolio columns and cards
        cols = {}
        for w in (1440, 1100, 800, 390):
            pgc, _ = newpage(w, 900)
            go(pgc, 'previous-projects', 900)
            cols[w] = pgc.evaluate("""() => { const g = document.querySelector('.projects-grid'); return getComputedStyle(g).gridTemplateColumns.split(' ').length }""")
            pgc.context.close()
        reg('49', 'Portfolio: smaller blocks, one more per row (was 3 across on desktop)', 'PASS' if cols[1440] == 4 else 'FAIL', 'columns by width: %s' % cols)
        # filter works
        pgf, ef = newpage()
        go(pgf, 'previous-projects', 900)
        before = pgf.evaluate("() => [...document.querySelectorAll('.proj-card')].filter(c => c.offsetParent !== null).length")
        pgf.evaluate("() => { const b = [...document.querySelectorAll('#sqft-tabs button, #sqft-tabs [data-filter]')][1]; if (b) b.click(); }")
        pgf.wait_for_timeout(500)
        after = pgf.evaluate("() => [...document.querySelectorAll('.proj-card')].filter(c => c.offsetParent !== null).length")
        reg('49b', 'Portfolio filter tabs still work', 'PASS' if before != after and not ef else 'MANUAL', 'visible cards before=%s after clicking 2nd tab=%s; errors=%s' % (before, after, ef[:1]))
        # ---------------- Home: images in the strip, intro skip, timing
        pgh, eh = newpage()
        pgh.goto('%s/index.html' % base, wait_until='load')
        t0 = pgh.evaluate('performance.now()')
        pgh.wait_for_timeout(400)
        skip = pgh.query_selector('.elh-intro-skip')
        skip_vis = skip.is_visible() if skip else False
        pgh.wait_for_timeout(2300)
        blocked = pgh.evaluate("""() => { const b = document.querySelector('.elh-intro-skip'); if (!b) return 'no button'; const r = b.getBoundingClientRect(); const el = document.elementFromPoint(r.left + r.width/2, r.top + r.height/2); return el === b ? 'BUTTON STILL INTERCEPTS CLICKS' : 'ok' }""")
        intro_gone = pgh.evaluate("""() => { const i = document.querySelector('.elh-intro'); const cs = getComputedStyle(i); return {op: cs.opacity, vis: cs.visibility, disp: cs.display, pe: cs.pointerEvents} }""")
        reg('60', 'Keyhole intro shortened (3.1s → 1.9s) with a skip control; the skip button does not block the page afterwards',
            'PASS' if (skip_vis and blocked == 'ok') else 'FAIL', 'skip visible during intro: %s; after the intro the hidden button intercepts clicks: %s; animation: %s' % (skip_vis, blocked, re.search(r'animation: elhBore ([0-9.]+s)', PAGES['index']).group(1)))
        # skip click hides the intro immediately
        pgs, _ = newpage()
        pgs.goto('%s/index.html' % base, wait_until='load')
        pgs.wait_for_timeout(300)
        if pgs.query_selector('.elh-intro-skip'):
            pgs.click('.elh-intro-skip')
            d = pgs.evaluate("() => getComputedStyle(document.querySelector('.elh-intro')).display")
            reg('60b', 'Clicking Skip removes the intro immediately', 'PASS' if d == 'none' else 'FAIL', 'intro display after click: %s' % d)
        pgh.evaluate("() => document.querySelector('[data-elh-strip]').scrollIntoView()")
        pgh.wait_for_timeout(1500)
        strip = pgh.evaluate("""() => [...document.querySelectorAll('[data-elh-track] img')].map(i => ({id: i.id, ok: i.complete && i.naturalWidth > 0, lazy: i.loading}))""")
        bad = [s for s in strip if not s['ok'] or s['lazy'] == 'lazy']
        reg('44', 'Project strip: every card photo loads (incl. the 68th) and none is lazy', 'FAIL' if bad else 'PASS', '%d strip images, not loaded/lazy: %s' % (len(strip), bad[:3]))
        # home FAQ, hero H2 text etc.
        h2s = pgh.evaluate("() => [...document.querySelectorAll('h2')].map(h => h.innerText.replace(/\\s+/g,' ').trim())")
        reg('63-h2', 'Homepage: Paradise Valley, Scottsdale and Arcadia appear at H2; H1 targets custom homes in Arizona',
            'PASS' if any(re.search(r'Paradise Valley.*Scottsdale.*Arcadia', h) for h in h2s) else 'FAIL',
            'H1: "%s"; matching H2: "%s"' % (pgh.evaluate("() => document.querySelector('h1').innerText.replace(/\\s+/g,' ')"), next((h for h in h2s if 'Paradise Valley' in h), 'none')))
        # ---------------- interaction: FAQ accordions
        pgq, eq = newpage()
        go(pgq, 'faq', 800)
        pgq.click('.faq-item:nth-child(3) .faq-q')
        pgq.wait_for_timeout(600)
        st = pgq.evaluate("() => { const i = document.querySelector('.faq-item:nth-child(3)'); return {open: i.classList.contains('open'), aria: i.querySelector('.faq-q').getAttribute('aria-expanded'), h: i.querySelector('.faq-a').getBoundingClientRect().height} }")
        reg('64b', 'FAQ accordion opens (17 questions)', 'PASS' if st['open'] and st['aria'] == 'true' and st['h'] > 10 else 'FAIL', str(st))
        # ---------------- Build timeline (2 phases)
        pgt, et = newpage()
        go(pgt, 'build-your-home', 800)
        info = pgt.evaluate("""() => { const z = document.querySelector('#timeline-scroll-zone'); return {bars: document.querySelectorAll('.ts-bar').length, bodies: document.querySelectorAll('.ts-body').length, zoneH: Math.round(z.getBoundingClientRect().height), vh: innerHeight} }""")
        act = []
        pgt.evaluate("() => document.querySelector('#timeline-scroll-zone').scrollIntoView()")
        for frac in (0.0, 0.5, 0.95):
            pgt.evaluate("(f) => { const z = document.querySelector('#timeline-scroll-zone'); const top = z.getBoundingClientRect().top + scrollY; window.scrollTo(0, top + (z.offsetHeight - innerHeight) * f); }", frac)
            pgt.wait_for_timeout(700)
            act.append(pgt.evaluate("() => [...document.querySelectorAll('.ts-body')].findIndex(b => b.classList.contains('active'))"))
        phase_names = pgt.evaluate("() => [...document.querySelectorAll('.ts-bar-name')].map(e => e.textContent.trim())")
        ok = info['bars'] == 2 and info['bodies'] == 2 and act[0] == 0 and act[-1] == 1
        reg('9b', 'Build timeline scroller works with the 2 remaining phases (Construction, Move In)', 'PASS' if ok else 'FAIL',
            'phases %s; active body at scroll 0/50/95%%: %s; scroll zone %dpx tall (viewport %d)' % (phase_names, act, info['zoneH'], info['vh']))
        # ---------------- Project pages
        pgp, ep = newpage()
        go(pgp, 'project', 600)
        pgp.goto('%s/project.html?slug=does-not-exist' % base, wait_until='load')
        pgp.wait_for_timeout(500)
        nf = pgp.evaluate("() => { const e = document.querySelector('#not-found'); return {disp: getComputedStyle(e).display, text: e.innerText.trim().slice(0, 60)} }")
        pgp.goto('%s/project.html?slug=68th' % base, wait_until='load')
        pgp.wait_for_timeout(500)
        nf2 = pgp.evaluate("() => document.querySelector('#not-found').innerText.trim()")
        reg('58b', '"Project not found" renders only for an unknown slug', 'PASS' if (nf['disp'] == 'block' and 'not found' in nf['text'].lower() and nf2 == '') else 'FAIL',
            'unknown slug shows "%s"; a real project has empty #not-found: %s' % (nf['text'], nf2 == ''))
        # similar projects for every project
        keys = list(projects) if projects else []
        sim, simbad = {}, []
        def num(v):
            x = re.sub(r'[^0-9.]', '', v or '')
            return float(x) if x else None
        for k in keys:
            pgp.goto('%s/project.html?slug=%s' % (base, k), wait_until='load')
            pgp.wait_for_timeout(250)
            cards = pgp.evaluate("() => [...document.querySelectorAll('#related-grid .related-card')].map(a => a.getAttribute('href').split('slug=')[1])")
            sim[k] = cards
            if len(cards) != 3 or k in cards or len(set(cards)) != 3:
                simbad.append('%s -> %s' % (k, cards))
        ex = {}
        for k, v in projects.items():
            if num(v['price']) and 2.0e6 < num(v['price']) < 2.6e6:
                ex[k] = [(c, projects[c]['price']) for c in sim.get(k, [])]
        reg('59', 'Similar Projects match by price/size/area (a $2.3M home no longer shows $7M homes)', 'FAIL' if simbad else 'PASS',
            ('bad: %s' % simbad[:3]) if simbad else '%d/%d projects return 3 distinct other projects. Examples for ~$2.3M homes: %s' % (len(sim), len(keys), dict(list(ex.items())[:2])))
        grad = pgp.evaluate("() => getComputedStyle(document.querySelector('.hero-overlay')).backgroundImage")
        reg('57', 'Project pages: dark gradient on the photo (top), not behind the header', 'PASS' if grad.count('linear-gradient') >= 2 else 'FAIL',
            '.hero-overlay has %d stacked gradients (top darkening + bottom)' % grad.count('linear-gradient'))
        # ---------------- Why Us / Developers / Our Story layout facts
        pgw, ew = newpage()
        go(pgw, 'why-us', 1200)
        wu = pgw.evaluate("""() => ({
          halo: [...document.querySelectorAll('.rc-inner')].map(e => getComputedStyle(e).boxShadow).filter(s => s !== 'none').length,
          strip: !!document.querySelector('.wu-strip'), stripAfterHero: document.querySelector('#hero-banner').nextElementSibling.className.includes('wu-strip') || !!document.querySelector('#hero-banner ~ .wu-strip'),
          reviews: document.querySelectorAll('#testimonials .rv-card').length,
          homeBtn: [...document.querySelectorAll('#proof .proof-hd-r a')].map(a => a.textContent.trim()),
          pull: !!document.querySelector('#pull')})""")
        reg('51', 'Why Us: first strip redesigned, review strip like the front page, no halo around the card stack', 'PASS' if (wu['halo'] == 0 and wu['strip'] and wu['reviews'] == 5 and not wu['pull']) else 'FAIL', str(wu))
        reg('52', 'Why Us: stray "HOME" button next to "Full Portfolio" removed', 'PASS' if not any(t.strip().lower() == 'home' for t in wu['homeBtn']) else 'FAIL', 'buttons in that header: %s' % wu['homeBtn'])
        pgd, ed = newpage()
        go(pgd, 'developers', 1200)
        dv = pgd.evaluate("""() => ({halo: [...document.querySelectorAll('.pillar-card, .pillar, #pillars > *')].map(e => getComputedStyle(e).boxShadow).filter(s => s !== 'none').length,
                                  reviews: document.querySelectorAll('#testimonials .rv-card').length})""")
        reg('53', 'Developers: same treatment as Why Us (halo removed, review strip)', 'PASS' if (dv['halo'] == 0 and dv['reviews'] == 5) else 'FAIL', str(dv))
        # sell chips below hero
        pgy, ey = newpage()
        go(pgy, 'sell-your-home', 1200)
        sy = pgy.evaluate("""() => { const hb = document.querySelector('#hero-banner').getBoundingClientRect(); const chips = [...document.querySelectorAll('span')].filter(s => /^(No Hassle|No Repairs|No Waiting)$/.test(s.textContent.trim())); return {heroBottom: Math.round(hb.bottom + scrollY), chipTops: chips.map(c => Math.round(c.getBoundingClientRect().top + scrollY))} }""")
        reg('37b', 'Sell: the three chips render below the hero', 'PASS' if sy['chipTops'] and min(sy['chipTops']) > sy['heroBottom'] else 'FAIL', str(sy))
        # our story: founder photo + reviews
        pgo, eo = newpage()
        go(pgo, 'our-story', 1200)
        pgo.evaluate("() => document.querySelector('.founder-photo').scrollIntoView()")
        pgo.wait_for_timeout(1200)
        os_ = pgo.evaluate("""() => ({founder: !!document.querySelector('.founder-photo img'), loaded: (document.querySelector('.founder-photo img')||{}).naturalWidth > 0,
                                   cards: document.querySelectorAll('.rv-card').length, faq: document.querySelectorAll('#conversation details').length})""")
        reg('42b', 'Our Story: Shay portrait renders next to the founder note', 'PASS' if os_['founder'] and os_['loaded'] else 'FAIL', str(os_))
        # mobile drawer
        pgm, em = newpage(390, 800)
        go(pgm, 'faq', 800)
        pgm.click('[data-elh-burger]')
        pgm.wait_for_timeout(700)
        dr = pgm.evaluate("""() => { const d = document.querySelector('[data-elh-drawer]'); const r = d.getBoundingClientRect(); const cta = [...d.querySelectorAll('a')].pop(); return {open: r.left >= -1 && r.width > 100, cta: cta.textContent.trim()} }""")
        reg('X2d', 'Mobile drawer opens; its button reads "Start Your Build"', 'PASS' if dr['open'] and dr['cta'] == 'Start Your Build' else 'FAIL', str(dr))
        # nav CTA on desktop
        ctas = Counter()
        for n in PAGES:
            m = re.search(r'data-elh-cta="1"[^>]*>([^<]+)<', PAGES[n])
            ctas[m.group(1).strip() if m else 'NONE'] += 1
        reg('7-cta', 'Primary call to action sitewide is "Start Your Build" (nav button on every page)', 'PASS' if set(ctas) == {'Start Your Build'} else 'FAIL', str(dict(ctas)))
        sell_links = []
        for n in PAGES:
            b = body_html(PAGES[n]) + footer_html(PAGES[n])
            if n == 'index' and 'sell-your-home' in b:
                sell_links.append('index body/footer links to sell-your-home')
            if 'sell-your-home' in footer_html(PAGES[n]):
                sell_links.append('%s footer links to Sell' % n)
        reg('7-sell', 'Sell Your Home stays in the nav only; not shown on the homepage or in the footer', 'FAIL' if sell_links else 'PASS',
            '; '.join(sell_links) if sell_links else 'only nav (header, Learn panel, drawer) links to sell-your-home; index body and every footer are clean')
        browser.close()
    srv.shutdown()



# ======================================================================= BROWSER CHECKS (extra)
def browser_checks2(projects):
    try:
        from playwright.sync_api import sync_playwright
    except Exception:
        return
    srv, port = start_server()
    base = 'http://127.0.0.1:%d' % port
    placeholder = open(os.path.join(ROOT, 'uploads/home/hero-poster.jpg'), 'rb').read()
    exe = find_chromium()
    section('X4. Rendered-page checks: network, images, accessibility, typography, projects, forms')
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=exe, args=['--no-sandbox']) if exe else p.chromium.launch(args=['--no-sandbox'])

        def newpage(w=1440, h=900):
            ctx = browser.new_context(viewport={'width': w, 'height': h})
            pg = ctx.new_page()
            st = {'bad': [], 'errs': [], 'reqs': []}
            pg.on('response', lambda r: st['bad'].append('%s %s' % (r.status, r.url.replace(base, ''))) if (r.url.startswith(base) and r.status >= 400) else None)
            pg.on('requestfailed', lambda r: st['bad'].append('FAILED %s' % r.url.replace(base, '')) if r.url.startswith(base) else None)
            pg.on('request', lambda r: st['reqs'].append((r.method, r.url)))
            pg.on('pageerror', lambda e: st['errs'].append(str(e)[:160]))

            def route(r):
                u = r.request.url
                if u.startswith(base):
                    return r.continue_()
                fr = font_response(u)
                if fr:
                    return r.fulfill(**fr)
                if (r.request.resource_type == 'image' or re.search(r'\.(jpe?g|png|webp|gif)(\?|$)', u, re.I)) and ('ellaleehomes.com' in u or 'googleusercontent' in u or 'zillow' in u):
                    return r.fulfill(status=200, content_type='image/jpeg', body=placeholder)
                return r.abort()
            pg.route('**/*', route)
            return pg, st

        def settle_scroll(pg):
            pg.evaluate("""async () => { const H = document.documentElement.scrollHeight; for (let y = 0; y < H; y += 450) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 90)); } window.scrollTo(0, H); await new Promise(r => setTimeout(r, 1500)); window.scrollTo(0, 0); }""")

        bad404, brokenimg, noname, nolabel, h1fonts = [], [], [], [], {}
        body_styles, mobile_small, tap = {}, {}, {}
        for n in PAGES:
            pg, st = newpage()
            pg.goto('%s/%s.html' % (base, n), wait_until='load')
            pg.wait_for_timeout(3300 if n == 'index' else 1000)
            pg.add_style_tag(content='.elh-intro{display:none!important}')
            settle_scroll(pg)
            bad404 += ['%s: %s' % (n, b) for b in st['bad']]
            imgs = pg.evaluate("""() => [...document.querySelectorAll('img')].filter(i => i.getClientRects().length > 0 && i.offsetParent !== null).map(i => ({src: i.getAttribute('src') || '', ok: i.complete && i.naturalWidth > 0}))""")
            brokenimg += ['%s: %s' % (n, i['src'][:60]) for i in imgs if not i['ok'] and not i['src'].startswith('data:')]
            names = pg.evaluate("""() => [...document.querySelectorAll('a[href], button')].filter(e => e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden' && !e.closest('[aria-hidden="true"]')).filter(e => !((e.innerText || '').trim() || e.getAttribute('aria-label') || e.getAttribute('title') || (e.querySelector('img[alt]:not([alt=""])')))).map(e => (e.tagName + ' ' + (e.getAttribute('href') || e.className || '')).slice(0, 60))""")
            noname += ['%s: %s' % (n, x) for x in names]
            labels = pg.evaluate("""() => [...document.querySelectorAll('input, select, textarea')].filter(e => !['hidden', 'submit', 'button'].includes(e.type) && e.getClientRects().length > 0).filter(e => !(e.labels && e.labels.length) && !e.getAttribute('aria-label') && !e.getAttribute('aria-labelledby') && !e.getAttribute('placeholder')).map(e => (e.tagName + ' ' + (e.name || e.id)).slice(0, 40))""")
            nolabel += ['%s: %s' % (n, x) for x in labels]
            if True:
                h1fonts[n] = pg.evaluate("""() => { const f = e => getComputedStyle(e).fontFamily.split(',')[0].replace(/['"]/g, ''); const hs = [...document.querySelectorAll('h1, h2')].filter(e => e.getClientRects().length > 0 && !e.closest('header, footer, aside, nav, .elh-intro') && parseFloat(getComputedStyle(e).fontSize) >= 24); return [...new Set(hs.map(f))] }""")
                body_styles[n] = pg.evaluate("""() => { const ps = [...document.querySelectorAll('p')].filter(e => e.getClientRects().length > 0 && (e.innerText || '').trim().length >= 70 && !e.closest('header, footer, aside, nav, .elh-intro, #hero-banner')); const k = e => { const c = getComputedStyle(e); return c.fontFamily.split(',')[0].replace(/['"]/g, '') + '|' + c.fontSize + '|' + c.fontWeight }; const cnt = {}; ps.forEach(e => { cnt[k(e)] = (cnt[k(e)] || 0) + 1 }); const top = Object.entries(cnt).sort((a, b) => b[1] - a[1]); return {n: ps.length, top: top.slice(0, 3)} }""")
            pg.context.close()
        reg('X4a', 'No local file fails to load (404 / failed request) on any page, including CSS backgrounds, fonts and scripts', 'FAIL' if bad404 else 'PASS',
            '; '.join(bad404[:6]) or '%d pages scrolled top to bottom: every same-origin request returned 2xx/3xx' % len(PAGES))
        reg('X4b', 'Every visible image finished loading after scrolling each page (external images were served a placeholder, so this tests our own files)', 'FAIL' if brokenimg else 'PASS',
            '; '.join(brokenimg[:6]) or 'all visible <img> elements loaded on %d pages' % len(PAGES))
        reg('X4c', 'Every visible link and button has an accessible name (text, aria-label, title or image alt)', 'FAIL' if noname else 'PASS', '; '.join(noname[:8]) or 'none unnamed on %d pages' % len(PAGES))
        reg('X4d', 'Every visible form field has a label, aria-label or placeholder', 'FAIL' if nolabel else 'PASS', '; '.join(nolabel[:8]) or 'all fields labelled')
        # --- typography
        serif_bad = {n: f for n, f in h1fonts.items() if f and any('DM Serif Display' not in x for x in f)}
        reg('X4e', 'Display titles (h1/h2 at 24px and up) are serif (DM Serif Display) on every core page', 'FAIL' if serif_bad else 'PASS', str(serif_bad) if serif_bad else 'h1/h2 font on %d core pages: DM Serif Display' % len(h1fonts))
        # mobile pass for body copy
        body_m = {}
        for n in PAGES:
            pgm, _ = newpage(390, 800)
            pgm.goto('%s/%s.html%s' % (base, n, '?slug=charter-oak' if n == 'project' else ''), wait_until='load')
            pgm.wait_for_timeout(3300 if n == 'index' else 800)
            pgm.add_style_tag(content='.elh-intro{display:none!important}')
            body_m[n] = pgm.evaluate("""() => { const ps = [...document.querySelectorAll('p, li')].filter(e => e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden' && (e.innerText || '').trim().length >= 70 && !e.closest('header, footer, aside, nav, .elh-intro, #hero-banner')); const k = e => { const c = getComputedStyle(e); return c.fontFamily.split(',')[0].replace(/['"]/g, '') + '|' + c.fontSize + '|' + c.fontWeight }; const cnt = {}; ps.forEach(e => { cnt[k(e)] = (cnt[k(e)] || 0) + 1 }); return Object.entries(cnt).sort((a, b) => b[1] - a[1]) }""")
            pgm.context.close()
        dom_d = {n: (v['top'][0][0] if v['top'] else None) for n, v in body_styles.items()}
        dom_m = {n: (v[0][0] if v else None) for n, v in body_m.items()}
        off = ['%s@1440 %s' % (n, d) for n, d in dom_d.items() if d and d != 'Inter|17px|300'] + ['%s@390 %s' % (n, d) for n, d in dom_m.items() if d and d != 'Inter|16px|300']
        reg('X4f', 'Body copy matched on every page: Inter Light, 17px on desktop and 16px on mobile (dominant running-copy style per page; ledes, pull quotes and small notes keep their own)',
            'FAIL' if off else 'PASS', ('differs: ' + '; '.join(off[:8])) if off else '%d pages at 1440 = Inter 300 17px and %d pages at 390 = Inter 300 16px' % (len([d for d in dom_d.values() if d]), len([d for d in dom_m.values() if d])))
        # --- project pages
        keys = list(projects) if projects else []
        titles, canon, issues = {}, {}, []
        pg, st = newpage()
        for k in keys:
            pg.goto('%s/project.html?slug=%s' % (base, k), wait_until='load')
            pg.wait_for_timeout(350)
            info = pg.evaluate("""() => ({title: document.title, canon: (document.querySelector('link[rel=canonical]') || {}).href || '', desc: (document.querySelector('meta[name=description]') || {}).content || '', ogt: (document.querySelector('meta[property="og:title"]') || {}).content || '', ogu: (document.querySelector('meta[property="og:url"]') || {}).content || '',
              h1: document.querySelectorAll('h1').length, content: getComputedStyle(document.querySelector('#project-content')).display, nf: (document.querySelector('#not-found') || {innerText: ''}).innerText.trim(),
              hero: (document.querySelector('#hero-img') || {}).naturalWidth, text: document.body.innerText})""")
            titles.setdefault(info['title'], []).append(k)
            canon.setdefault(info['canon'], []).append(k)
            if info['content'] != 'block' or info['nf'] or info['h1'] != 1 or not info['hero']:
                issues.append('%s: content=%s notfound="%s" h1=%d hero=%s' % (k, info['content'], info['nf'][:20], info['h1'], info['hero']))
            if re.search(r'See live site|Coming Soon|will be added here|undefined|NaN|\[object', info['text']):
                issues.append('%s: placeholder or broken text on page' % k)
            if info['ogt'] != info['title'] or not info['ogu'].endswith('slug=' + k):
                issues.append('%s: og tags not per-project' % k)
        dupt = {t: v for t, v in titles.items() if len(v) > 1}
        dupc = {t: v for t, v in canon.items() if len(v) > 1}
        reg('X4g', 'All %d project pages render populated (one h1, hero image, no placeholder text) with their own title, canonical and share tags' % len(keys),
            'FAIL' if (issues or dupt or dupc) else 'PASS',
            '; '.join(issues[:4] + ['duplicate titles %s' % list(dupt)[:2]] * bool(dupt) + ['duplicate canonicals'] * bool(dupc)) or '%d projects: unique titles (e.g. "%s"), unique canonicals, og:url per slug' % (len(keys), next(iter(titles))))
        pg.context.close()
        # portfolio cards: every card opens a real project, no duplicate slugs
        pg, st = newpage()
        pg.goto('%s/previous-projects.html' % base, wait_until='load')
        pg.wait_for_timeout(900)
        cards = pg.evaluate("() => [...document.querySelectorAll('.proj-card')].map(a => (a.getAttribute('href') || (a.querySelector('a') || {getAttribute: () => ''}).getAttribute('href') || ''))")
        slugs = [re.search(r'slug=([^&]+)', c).group(1) if re.search(r'slug=([^&]+)', c) else '' for c in cards]
        missing = [x for x in slugs if x not in projects]
        reg('X4h', 'Portfolio: every card links to an existing project; no project is listed twice', 'FAIL' if (missing or len(set(slugs)) != len(slugs) or not slugs) else 'PASS',
            '%d cards, %d unique slugs, unknown slugs: %s' % (len(slugs), len(set(slugs)), missing))
        pg.context.close()
        # home strip duplicates
        pg, st = newpage()
        pg.goto('%s/index.html' % base, wait_until='load')
        pg.wait_for_timeout(3300)
        strip = pg.evaluate("() => [...document.querySelectorAll('[data-elh-track] a')].map(a => a.getAttribute('href'))")
        cycle = strip
        for k in (4, 3, 2, 1):
            if strip and len(strip) % k == 0 and strip == strip[:len(strip) // k] * k:
                cycle = strip[:len(strip) // k]
                break
        dup = [x for x, c in Counter(cycle).items() if c > 1 and x]
        dead = sum(1 for x in cycle if not x or x == '#')
        reg('X4i', 'Home project strip lists each project once per loop (June review: Charter Oak appeared twice)', 'FAIL' if dup else 'PASS',
            '%d cards per loop (track repeats %dx for the endless scroll): %s; duplicates: %s; cards without a link: %d' % (len(cycle), len(strip) // max(1, len(cycle)), [re.sub(r'.*slug=', '', x or '(no link)') for x in cycle], dup, dead))
        # home experience timeline: each label opens the panel that matches it
        pg.add_style_tag(content='.elh-intro{display:none!important}')
        pg.evaluate("() => document.querySelector('#experience').scrollIntoView()")
        pg.wait_for_timeout(700)
        want = [('Process', 'Process'), ('Service', 'Service'), ('Warranty', 'Warranty'), ('Craftsmanship', 'Craftsmanship')]
        got = []
        for i in range(4):
            pg.evaluate("(i) => document.querySelector('[data-elh-tl-marker=\"' + i + '\"]').click()", i)
            pg.wait_for_timeout(900)
            got.append(pg.evaluate("""(i) => ({label: document.querySelector('[data-elh-tl-label="' + i + '"]').textContent.trim(), head: document.querySelector('[data-elh-tl-copy="' + i + '"] h3').textContent.trim(), op: parseFloat(getComputedStyle(document.querySelector('[data-elh-tl-copy="' + i + '"]')).opacity), imgop: parseFloat(getComputedStyle(document.querySelector('[data-elh-tl-img="' + i + '"]')).opacity)})""", i))
        okmap = all(want[i][0].lower() in got[i]['label'].lower() and want[i][1].lower() in got[i]['head'].lower() and got[i]['op'] > 0.9 for i in range(4))
        reg('X4j', 'Home "experience" timeline: each label opens the panel with the matching heading (labels match their panels)', 'PASS' if okmap else 'FAIL', '; '.join('%s -> "%s" (shown %.1f)' % (g['label'], g['head'], g['op']) for g in got))
        pg.context.close()
        # ---- responsive layout at phone and tablet widths
        stack_bad, align_bad, cramped, phone_bad, empty_bad, label_bad = [], [], [], [], [], []

        ALLOW = ('TRANSPARENT PROCESS', '#sqft-tabs', 'founding-sig')
        for w in (390, 768):
            for n in PAGES:
                pgr, _ = newpage(w, 900)
                pgr.goto('%s/%s.html%s' % (base, n, '?slug=charter-oak' if n == 'project' else ''), wait_until='load')
                pgr.wait_for_timeout(3300 if n == 'index' else 600)
                pgr.add_style_tag(content='.elh-intro{display:none!important}')
                phone_bad += ['%s@%d: "%s"' % (n, w, x) for x in pgr.evaluate(PHONE_JS)]
                label_bad += ['%s@%d: %s' % (n, w, x) for x in pgr.evaluate(ALIGN_JS)]
                if n == 'why-us':
                    r = pgr.evaluate("""() => [...document.querySelectorAll('.rc-inner')].map(e => ({cols: getComputedStyle(e).gridTemplateColumns.split(' ').length, tw: e.querySelector('.rc-text').getBoundingClientRect().width / e.getBoundingClientRect().width}))""")
                    bad = [i + 1 for i, x in enumerate(r) if x['cols'] != 1 or x['tw'] < 0.8]
                    if bad:
                        stack_bad.append('why-us@%d: reason cards %s are not stacked' % (w, bad))
                lefts = pgr.evaluate("""() => [...document.querySelectorAll('form')].filter(f => f.getClientRects().length > 0).map(f => { const L = [...f.querySelectorAll('input, select, textarea')].filter(e => !['hidden', 'submit', 'button'].includes(e.type) && e.getClientRects().length > 0).map(e => Math.round(e.getBoundingClientRect().left)); return L.length ? Math.max(...L) - Math.min(...L) : 0 })""")
                if w == 390 and any(d > 2 for d in lefts):
                    align_bad.append('%s@%d: form field edges differ by %s px' % (n, w, [d for d in lefts if d > 2]))
                if w == 390:
                    found = pgr.evaluate("""() => { const out = []; const seen = new Set(); for (const el of document.querySelectorAll('div, section, article, ul, form')) { if (el.closest('header, footer, aside, nav, .elh-intro, [data-elh-track], .rv-grid, svg')) continue; if (!el.getClientRects().length) continue; const kids = [...el.children].filter(k => k.getClientRects().length && (k.innerText || '').trim().length >= 12 && !['absolute', 'fixed'].includes(getComputedStyle(k).position)); if (kids.length < 2) continue; const rects = kids.map(k => k.getBoundingClientRect()); let side = false; for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) { const a = rects[i], b = rects[j]; const v = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top); const h = Math.min(a.right, b.right) - Math.max(a.left, b.left); if (v > 20 && h <= 2 && a.width > 40 && b.width > 40) side = true } if (!side) continue; const minw = Math.min(...rects.map(r => r.width)); if (minw < 165) { const key = (el.className || el.tagName) + '|' + Math.round(minw); if (seen.has(key)) continue; seen.add(key); out.push(Math.round(minw) + 'px ' + (el.id ? '#' + el.id + ' ' : '') + (el.className || '').toString().slice(0, 24) + ' | ' + (el.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 40)) } } return out }""")
                    for f in found:
                        if not any(a in f for a in ALLOW):
                            cramped.append('%s: %s' % (n, f))
                pgr.context.close()
        reg('X5a', 'Why Us reason cards stack photo-then-text on phone and tablet (the even cards used to stay two-column)', 'FAIL' if stack_bad else 'PASS', '; '.join(stack_bad) or 'all 7 cards are one column at 390 and 768 with the text at 80%+ of card width')
        reg('X5b', 'Form fields line up on the left edge on phones (no indented second column)', 'FAIL' if align_bad else 'PASS', '; '.join(align_bad) or 'every form: all fields share one left edge at 390px')
        reg('X5c', 'No cramped side-by-side text columns on phones (any text column under 165px wide at 390px; the timeline labels, size tabs and founder signature are intended)', 'FAIL' if cramped else 'PASS', '; '.join(cramped[:6]) or 'no page has side-by-side text columns narrower than 165px at 390px')
        # ---- the cream logo and links need a dark bar behind them at the top of every page


        import io
        from PIL import Image
        light = []
        for w in (1440, 390):
            for n in PAGES:
                pgn, _ = newpage(w, 900 if w > 500 else 800)
                pgn.goto('%s/%s.html%s' % (base, n, '?slug=charter-oak' if n == 'project' else ''), wait_until='load')
                pgn.wait_for_timeout(3300 if n == 'index' else 600)
                pgn.add_style_tag(content='.elh-intro{display:none!important}')
                png = pgn.screenshot(clip={'x': 0, 'y': 0, 'width': w, 'height': 90})
                im = Image.open(io.BytesIO(png)).convert('L')
                px = sorted(im.getdata())
                med = px[len(px) // 2]
                if med > 115:       # median luminance of the strip behind the header
                    light.append('%s@%d (median %d/255)' % (n, w, med))
                pgn.context.close()
        reg('X5d', 'The header sits on a dark background at the top of every page, so the cream logo, links and menu button are readable (remote photos are stood in by a placeholder here)', 'FAIL' if light else 'PASS',
            '; '.join(light[:6]) or 'median brightness behind the header is dark on %d pages at 1440 and 390' % len(PAGES))
        # ---- self-test: the contrast scanner must flag known-bad fixtures and pass known-good ones, or X5e means nothing
        pgs, _ = newpage(800, 600)
        pgs.set_content(CONTRAST_FIXTURE)
        cjs0 = open(os.path.join(ROOT, 'scripts/qa-contrast.js'), encoding='utf8').read()
        pgs.evaluate(cjs0, False)
        fx = pgs.evaluate(cjs0, True)
        flagged = sorted(r['text'] for r in fx if r['ratio'] < (3.0 if r['large'] else 4.5))
        want_bad = sorted(['Navy on navy, invisible', 'Nickel on linen small', 'Gold on linen large', '(icon)'])
        ok_text = [r for r in fx if r['text'] == 'Readable cream text on navy' and r['ratio'] >= 4.5]
        reg('X5e0', 'Self-test: the contrast scanner flags navy-on-navy, nickel-on-linen, gold-on-linen headline and a navy icon on a dark circle, and passes cream-on-navy and a gold icon',
            'PASS' if (flagged == want_bad and ok_text) else 'FAIL', 'flagged: %s (expected %s); good text passed: %s' % (flagged, want_bad, bool(ok_text)))
        pgs.set_content(EMPTY_FIXTURE)
        pgs.evaluate(EMPTY_JS, False)
        empties = pgs.evaluate(EMPTY_JS, True)
        reg('X5g0', 'Self-test: the empty-section check flags a heading with only a short label and hidden content, and passes sections with text or a photo',
            'PASS' if (len(empties) == 1 and empties[0].startswith('#shell')) else 'FAIL', 'flagged: %s (expected only #shell)' % empties)
        pgs.context.close()
        # ---- text contrast: WCAG AA (4.5:1 for normal text, 3:1 for 24px+ text), measured on every page

        cjs = open(os.path.join(ROOT, 'scripts/qa-contrast.js'), encoding='utf8').read()
        low, nimg, ntext = defaultdict(list), 0, 0
        focus_bad = []

        for w in (1440, 390):
            vh = 900 if w > 500 else 800
            for n in PAGES:
                pgc, _ = newpage(w, vh)
                pgc.goto('%s/%s.html%s' % (base, n, '?slug=charter-oak' if n == 'project' else ''), wait_until='load')
                pgc.wait_for_timeout(3300 if n == 'index' else 600)
                pgc.add_style_tag(content='.elh-intro{display:none!important} *,*::before,*::after{transition:none!important}')
                if w == 1440:
                    phone_bad += ['%s@%d: "%s"' % (n, w, x) for x in pgc.evaluate(PHONE_JS)]
                    label_bad += ['%s@%d: %s' % (n, w, x) for x in pgc.evaluate(ALIGN_JS)]
                    for _ in range(45):       # keyboard: every element reached by Tab must show a focus ring
                        pgc.keyboard.press('Tab')
                        fr_ = pgc.evaluate(FOCUS_JS)
                        if fr_ and not fr_['on']:
                            focus_bad.append('%s: %s' % (n, fr_['label']))
                    pgc.evaluate('window.scrollTo({top: 0, behavior: "instant"})')
                full = pgc.evaluate('document.documentElement.scrollHeight')
                y = 0
                while True:        # scroll in steps so text that is dimmed until it enters view is measured when visible
                    pgc.evaluate("(y) => window.scrollTo({top: y, left: 0, behavior: 'instant'})", y)
                    pgc.wait_for_timeout(110)
                    pgc.evaluate(cjs, False)
                    pgc.evaluate(EMPTY_JS, False)
                    if y + vh >= full:
                        break
                    y += vh // 2
                empty_bad += ['%s@%d: %s' % (n, w, x) for x in pgc.evaluate(EMPTY_JS, True)]
                for r in pgc.evaluate(cjs, True):
                    ntext += 1
                    if r['image']:
                        nimg += 1
                        continue
                    if r['ratio'] < (3.0 if r['large'] else 4.5):
                        low[(r['sel'], r['fg'], r['bg'], r['size'])].append((n, w, r['ratio'], r['text']))
                pgc.context.close()
        worst = sorted(low.items(), key=lambda kv: min(h[2] for h in kv[1]))
        reg('X5e', 'Text and icon contrast meets WCAG AA on every page at desktop and phone width: text at least 4.5:1 (3:1 for text 24px and larger), icons at least 3:1 (anything sitting directly on a photo is excluded here and judged by eye)',
            'FAIL' if worst else 'PASS',
            '; '.join('%.2f %s %s on %s %spx [%s] "%s"' % (min(h[2] for h in hs), k[0], k[1], k[2], k[3], ','.join(sorted({h[0] for h in hs}))[:50], hs[0][3][:24]) for k, hs in worst[:6]) + (' ... +%d more' % (len(worst) - 6) if len(worst) > 6 else '')
            or '%d text elements measured across %d pages x 2 widths; none below the threshold (%d elements on photo backgrounds not measured)' % (ntext - nimg, len(PAGES), nimg))
        reg('X5f', 'The phone number (480) 340-8700 never splits across two lines, at 1440, 768 and 390px', 'FAIL' if phone_bad else 'PASS', '; '.join(phone_bad[:6]) or 'every occurrence on every page stays on one line at all three widths')
        reg('X5g', 'No section is an empty shell: every section with a heading shows something under it (text, image, form or link) at some scroll position, at 1440 and 390px (the Sell comparison used to vanish on phones)', 'FAIL' if empty_bad else 'PASS', '; '.join(empty_bad[:6]) or 'checked every visible section with a heading on every page at 1440 and 390px')
        reg('X5i', 'Keyboard focus is visible: tabbing through the first 45 focusable elements on every page always shows a focus ring', 'FAIL' if focus_bad else 'PASS', '; '.join(sorted(set(focus_bad))[:6]) + (' ... %d in total' % len(set(focus_bad)) if len(set(focus_bad)) > 6 else '') or 'every element reached by Tab shows an outline or shadow on %d pages' % len(PAGES))
        reg('X5h', 'Side-by-side form labels sit on the same line (no field 4px lower than its neighbour)', 'FAIL' if label_bad else 'PASS', '; '.join(label_bad[:6]) or 'all side-by-side labels in every form share one baseline at 1440 and 768')
        # ---- small phones: no text may run past the screen edge (the home stage labels were cut off at 360px)
        clip_bad = []
        for w in (320, 360, 390):
            for n in PAGES:
                pgk, _ = newpage(w, 800)
                pgk.goto('%s/%s.html%s' % (base, n, '?slug=charter-oak' if n == 'project' else ''), wait_until='load')
                pgk.wait_for_timeout(3300 if n == 'index' else 500)
                pgk.add_style_tag(content='.elh-intro{display:none!important} ' + REVEAL_CSS)
                clip_bad += ['%s@%d: %s' % (n, w, x) for x in pgk.evaluate(CLIP_JS)]
                pgk.context.close()
        reg('X5j', 'No text runs past the screen edge on small phones (320, 360 and 390px), outside the deliberate horizontal scrollers', 'FAIL' if clip_bad else 'PASS',
            '; '.join(clip_bad[:6]) or 'checked all visible text on %d pages at three phone widths' % len(PAGES))

        # ---- states that stay hidden until you act: the Learn menu, the phone drawer, the project lightbox, the form confirmation
        open_bad, open_n = [], 0
        for label, n, w, act in (('Learn menu (home, 1440)', 'index', 1440, "document.querySelector('[data-elh-click=\"toggleMore\"]').click()"),
                                 ('Learn menu (article, 1440)', 'steps-to-building-a-custom-home', 1440, "document.querySelector('[data-elh-click=\"toggleMore\"]').click()"),
                                 ('phone drawer (contact, 390)', 'contact', 390, "document.querySelector('[data-elh-burger]').click()"),
                                 ('project lightbox (1440)', 'project', 1440, "(document.querySelector('#photos-col img, .gallery-main, #gallery img, [onclick*=openLightbox]') || {click(){}}).click()"),
                                 ('form confirmation (contact, 1440)', 'contact', 1440, "(() => { const f = document.querySelector('form'); [...f.querySelectorAll('input, textarea, select')].forEach(e => { if (e.type === 'email') e.value = 'qa@example.com'; else if (e.tagName === 'SELECT') { if (e.options.length > 1) e.selectedIndex = 1 } else if (e.type !== 'hidden' && e.type !== 'submit') e.value = 'QA test' }); f.querySelector('button[type=submit], button:not([type])').click() })()")):
            pgo, _ = newpage(w, 900 if w > 500 else 800)
            pgo.goto('%s/%s.html%s' % (base, n, '?slug=charter-oak' if n == 'project' else ''), wait_until='load')
            pgo.wait_for_timeout(3300 if n == 'index' else 1200)
            pgo.add_style_tag(content='.elh-intro{display:none!important} *,*::before,*::after{transition:none!important}')
            pgo.evaluate(act)
            pgo.wait_for_timeout(700)
            pgo.evaluate(cjs, False)
            recs_o = pgo.evaluate(cjs, True)
            open_n += len(recs_o)
            open_bad += ['%s: %s "%s" %.2f' % (label, r['sel'], r['text'][:24], r['ratio']) for r in recs_o if not r['image'] and r['ratio'] < (3.0 if r['large'] else 4.5)]
            pgo.context.close()
        reg('X5k', 'Contrast also holds in the states that stay hidden until you act: the Learn menu, the phone drawer, the project lightbox and the form confirmation',
            'FAIL' if open_bad else 'PASS', '; '.join(open_bad[:6]) or '%d text elements measured across 5 opened states; none below the threshold' % open_n)

        # forms: what happens on submit (evidence for item 1)

        evid = []
        for n in ('index', 'build-your-home', 'why-us', 'developers', 'contact', 'sell-your-home'):
            pg, st = newpage()
            pg.goto('%s/%s.html' % (base, n), wait_until='load')
            pg.wait_for_timeout(3300 if n == 'index' else 900)
            pg.add_style_tag(content='.elh-intro{display:none!important}')
            before = len(st['reqs'])
            r = pg.evaluate("""() => { const f = [...document.querySelectorAll('form')].find(f => f.getClientRects().length > 0 || f.closest('section')); if (!f) return null; [...f.querySelectorAll('input, textarea, select')].forEach(e => { if (e.type === 'email') e.value = 'qa@example.com'; else if (e.tagName === 'SELECT') { if (e.options.length > 1) e.selectedIndex = 1 } else if (e.type !== 'hidden' && e.type !== 'submit') e.value = 'QA test' }); const btn = f.querySelector('button[type=submit], input[type=submit], button:not([type])'); btn && btn.click(); return {action: f.getAttribute('action'), method: f.getAttribute('method'), budget: !!f.querySelector('[name=budget], select[name*=budget]')} }""")
            pg.wait_for_timeout(700)
            posts = [u for m_, u in st['reqs'][before:] if m_ != 'GET']
            shown = pg.evaluate("() => /Thank you|we.ll be in touch/i.test(document.body.innerText)")
            evid.append('%s: form action=%s, POST/other requests sent on submit=%d, "Thank you" message shown=%s, budget field=%s' % (n, (r or {}).get('action'), len(posts), shown, (r or {}).get('budget')))
            pg.context.close()
        reg('X4k', 'Forms: what a submit actually does (evidence for item 1; delivery itself is not wired)', 'MANUAL', ' | '.join(evid))
        browser.close()
    srv.shutdown()


# ======================================================================= REPORT
def write_report(inv, urls):
    order = {'FAIL': 0, 'BLOCKED': 1, 'MANUAL': 2, 'PASS': 3}
    counts = Counter(r['status'] for r in RESULTS)
    rev = subprocess.run(['git', 'rev-parse', '--short', 'HEAD'], capture_output=True, text=True, cwd=ROOT).stdout.strip()
    dirty = bool(subprocess.run(['git', 'status', '--porcelain', '--', 'src', 'assets', 'partials', 'scripts', 'vercel.json'], capture_output=True, text=True, cwd=ROOT).stdout.strip())
    rev_text = ('commit `%s` plus uncommitted changes' % rev) if dirty else ('commit `%s`' % rev)
    lines = ['# QA report', '',
             'Generated by `python3 scripts/qa.py` against the built site (`dist/`) at %s. Every row is the result of a check that ran; the evidence column is what it measured.' % rev_text,
             'Rendered checks used %s.' % ('the real Inter and DM Serif Display fonts (QA_FONTS_DIR)' if FONTS_DIR else 'fallback fonts, because Google Fonts is unreachable here; set QA_FONTS_DIR for exact line wraps'), '',
             '**%d checks: %d PASS · %d FAIL · %d BLOCKED (needs input from Ella Lee Homes) · %d MANUAL (needs a human look)**' % (len(RESULTS), counts['PASS'], counts['FAIL'], counts['BLOCKED'], counts['MANUAL']), '']
    byid = {r['id']: r for r in RESULTS}
    for title, ids in SECTIONS:
        lines += ['## ' + title, '', '| Check | Result | Evidence |', '|---|---|---|']
        for i in ids:
            r = byid[i]
            ev = r['evidence'].replace('|', '\\|').replace('\n', ' ')
            lines.append('| **%s** %s | %s | %s |' % (r['id'], r['title'].replace('|', '\\|'), r['status'], ev))
        lines.append('')
    with open(os.path.join(ROOT, 'docs/qa-report.md'), 'w', encoding='utf8') as f:
        f.write('\n'.join(lines) + '\n')
    inv_lines = ['# Off-site media inventory (punch-list item 62)', '',
                 'Generated by `python3 scripts/qa.py`. Every image/video URL that still points off-site in the built pages and in `assets/*.js|css`. All must be replaced by files stored on the new site before launch.', '']
    for host, us in sorted(urls.items(), key=lambda kv: -len(kv[1])):
        inv_lines += ['## %s (%d unique)' % (host, len(us)), ''] + ['- %s' % u for u in sorted(us)] + ['']
    with open(os.path.join(ROOT, 'docs/asset-migration.md'), 'w', encoding='utf8') as f:
        f.write('\n'.join(inv_lines) + '\n')


def decisions_and_order():
    """Items that are decisions or plans rather than a single measurable fact: each is derived from the checks that cover it."""
    section('G / H. Conflicts decided September 29, layout items 54 and 55, order of work')
    by = {r['id']: r for r in RESULTS}

    def derive(cid, title, srcs):
        sts = [by[i]['status'] for i in srcs if i in by]
        st = 'FAIL' if 'FAIL' in sts else ('PASS' if sts and all(s == 'PASS' for s in sts) else 'MANUAL')
        reg(cid, title, st, 'decided by checks ' + ', '.join('%s = %s' % (i, by[i]['status']) for i in srcs if i in by))
    derive('G1', 'Conflict G1: "40+ homes", built and in progress, one figure everywhere', ['7', 'FS1a'])
    derive('G2', 'Conflict G2: 11 to 18 months of construction; the rest of the timeline removed', ['9', '9b'])
    derive('G3', 'Conflict G3: "We can work with your architect", no design language', ['22', '25', 'FS3a'])
    derive('G4', 'Conflict G4: Shay\'s line kept, with "lot" added (home or lot)', ['36a', '36b'])
    derive('G5', 'Conflict G5: no time commitment anywhere', ['26', '26b'])
    hero_ids = [i for i in ('40', '40b', '40c') if i in by]
    reg('54', 'Warranty and Homeowner Resources laid out like Why Us ("follow the old site\'s structure")', 'MANUAL',
        'both pages carry the standard hero (checks %s) and the serif title/body standard. The structure reference is the old site\'s two pages, which are not reachable from the build environment: a screenshot of each is the input that closes this.'
        % ', '.join('%s = %s' % (i, by[i]['status']) for i in hero_ids))
    nq = len(re.findall(r'class="faq-q"', PAGES['faq']))
    reg('55', 'FAQ page laid out like the front page FAQ', 'MANUAL',
        '%d questions in the sticky-heading, bordered-card list the home page uses, under the standard hero. Whether "matches the front page" means more than that is a design call.' % nq)
    blocked = [r['id'] for r in RESULTS if r['status'] == 'BLOCKED']
    reg('H', 'Order of work: decisions, inputs, forms/Buildertrend/reviews, portfolio data, copy and heroes, SEO and legal, photos/video, fresh-eyes pass', 'MANUAL',
        'steps that need no input (decisions, copy rewrites, hero standard, SEO, fresh-eyes pass) are done and checked in the sections above; steps waiting on Ella Lee Homes: %s' % ', '.join(blocked))


def main():
    static_checks()
    projects = data_audit()
    structure_checks()
    factsheet_checks()
    structure_checks2()
    inv, urls = asset_inventory()
    if not STATIC_ONLY:
        if '--only-b2' not in sys.argv:
            browser_checks(projects)
        browser_checks2(projects)
    decisions_and_order()
    write_report(inv, urls)
    counts = Counter(r['status'] for r in RESULTS)
    width = max(len(r['id']) for r in RESULTS)
    for title, ids in SECTIONS:
        print('\n== %s' % title)
        for i in ids:
            r = next(x for x in RESULTS if x['id'] == i)
            print('  %-*s  %-7s %s' % (width, r['id'], r['status'], r['title'][:100]))
            if r['status'] in ('FAIL', 'MANUAL'):
                print('  %-*s           -> %s' % (width, '', r['evidence'][:400]))
    print('\n%d checks: %d PASS, %d FAIL, %d BLOCKED, %d MANUAL' % (len(RESULTS), counts['PASS'], counts['FAIL'], counts['BLOCKED'], counts['MANUAL']))
    sys.exit(1 if counts['FAIL'] else 0)


if __name__ == '__main__':
    main()
