e B-SAFE — Electronic Bullying Safety and Awareness System
Leonor M. Bautista National High School  ·  Primary users: Grade 7 students

A responsive, interactive, video-centered bullying-awareness website built with
HTML5, CSS3, vanilla JavaScript, and JSON content files. No database, no backend,
no frameworks, no build tools.

NEW IN VERSION 1.1 (system improvement pass)
- Dark mode: header toggle, remembers your choice (localStorage "ebsafe_theme"), follows the
  system preference on first visit. Print stylesheet included for handbook pages, pledge,
  topic pages, and the certificate.
- Learning extras: kindness pledge (with printable card), myth vs. fact cards, learning tip of
  the day, FAQ accordion, lesson category filters, lesson bookmarks, "Continue learning",
  reading-progress bar, back-to-top button, and a Certificate of Completion (unlocks after
  watching every lesson and scoring at least 70% on the quiz; the printed name is never stored).
- Video lessons now carry related lessons, a transcript panel (honest empty state until the
  school adds one) and optional caption-track support via "captionsPath" in lessons.json.
- Lesson previews and lesson page: lesson cards show a real video preview frame when a
  "poster" image is set in lessons.json (see section 4), and every play control opens a
  separate lesson page (video.html?lesson=...) in the same tab instead of revealing a
  player inside the current page. The lesson page keeps the video, transcript, lesson
  details, related lessons, and "Back to lessons" together.
- Accessibility: modal focus trap + focus restore, aria-live announcements for search/filter/
  bookmark/pledge changes, aria-current navigation, visible focus styles everywhere.
- Fixed: the featured card's "Take a quick quiz" button had no handler; two invalid closing
  section tags; the featured-video sun element had no styles; the un-loaded "Inter" font in
  the font stack; dead CSS rule.
- Cache busting: styles.css and app.js are referenced with ?v= in index.html and
  video.html (currently styles.css?v=43 and app.js?v=42). Bump the number of a file
  whenever you deploy an edited CSS/JS file so browsers fetch the new version.

NEW IN VERSION 1.8 (handbook reading pass)
- Every chapter page now says when its printed list continues from the previous chapter
  ('The printed list continues from the previous chapter, so this page starts at 4.') —
  derived from the block's "start" value, so no transcription is invented.
- The transcription/summary note under each chapter became a quiet footnote with an info
  icon instead of an amber alert box, and stays in the reading column.
- Chapter navigation is a real <nav aria-label="Handbook chapters">; moving to another
  chapter resets the scroll, moves focus to the chapter title (tabindex=-1) so screen
  readers announce the new page, and keeps a chapter counter between the arrows.
- Reading rhythm: page padding 28/32, paragraphs 16 apart, list line-height 1.75 with
  8 between items, hanging numbers, headings rendered in the source case with a hairline
  rule (no uppercase tracking), columns panel on the raised surface.
- Added an empty state for a chapter with no blocks, and a thin quiet scrollbar inside
  the reading dialog (light and dark).
- app.js: openPolicy() (continuation note, empty state, nav element, focus) and
  styles.css section 15.25.

NEW IN VERSION 1.7 (sliding navigation pill)
- The main navigation has one sliding indicator: a single .nav-pill element inside
  <nav id="mainNav"> that moves to the active link as the section spy updates it, follows
  the pointer while it is over a link (on devices with hover), moves to the focused link for
  keyboard users, and returns to the active link when the pointer leaves.
- It measures the real link boxes, so it also works in the stacked mobile drawer, and it
  re-measures on resize, on drawer open/close and whenever the nav's own box changes
  (ResizeObserver), so it can never drift out of place.
- Motion is transform + width on an out-of-flow element, 220ms with the site's easing, and
  the transition is dropped for prefers-reduced-motion users. The indicator is aria-hidden;
  the link text and the section still carry the meaning for screen readers.
- app.js: initNavPill() plus updateNavPill() (also called by the mobile drawer).

NEW IN VERSION 1.6 (unslop polish pass)
- Quiet chrome, content carries the craft. Same product, sections, brand green and type
  family; what changed is how deliberate every value is. Direction: calm, plain-spoken,
  quietly official; the world is the printed handbook and the campus (paper + ink, one
  accent); the five bullying topics are the only place several colours live; the signature
  is the short green rule before every section label.
- Spacing on a 4px grid, one card padding (20) and one grid gap (16), sections 80/56.
- Colour: paper + ink neutral ramp, three text roles, hairline borders, neutral shadows.
  Every hue gradient, coloured shadow, radial glow, glass highlight and tinted icon tile
  is gone. Accent green now marks the primary action, the selection and links only.
- Type: weights 400/500 (600 nowhere), sizes from one scale, no uppercase tracked labels,
  no letter-spacing under 16px, tabular figures, sentence case everywhere.
- Icons: Lucide at 16-18px, stroke 1.5, in the text-role colour; no emoji left in the UI;
  the navigational icons were dropped because the labels carry the meaning.
- Copy: the hero subhead now says what the site is for and for whom, the 'Student-friendly
  / Mobile-ready / School-focused' trust row was removed, and every shouty label is
  sentence case. Lesson, handbook, quiz, survey and SOP text are untouched.
- Details: radius by size (controls 10, cards 14, panels 16), counts and statuses are quiet
  text or small tags with a hairline, photo tags carry a scrim so they stay readable.
- Visuals: the CSS-art illustration in the featured card is gone; the featured slot now
  features a lesson that actually plays and shows its own poster frame. No decorative
  filler anywhere.
- Motion: the scroll-driven card entrances and the IntersectionObserver fallback were
  removed, hover lifts are gone (hover is a colour or surface change), one easing curve,
  150ms feedback / 200-300ms entrances. The accordion height animation stays because it
  explains a state change.
- Credit: the pass follows the unslop method by Damir Sokolovsky (@heydamir), CC BY 4.0
  (https://x.com/heydamir).

NEW IN VERSION 1.5 (one consistent Lucide icon system)
- The whole website now uses Lucide icons only (https://lucide.dev, ISC licence). No more
  mixed emoji or glyph icons: navigation, quick links, topic cards, lesson cards, the video
  player controls, the awareness accordions, the SOP groups, handbook cards, badges, buttons
  and arrows all come from one icon family.
- Runtime format: one inline SVG sprite at the top of <body> in index.html and video.html
  (64 icons, ~20 KB, no network request, works offline like the rest of the site). app.js
  renders icons with iconHTML(name, class); the name is a Lucide icon name and an unknown
  name falls back to a neutral icon instead of breaking a card.
- Icon sources: assets/icons/<group>/<name>.svg holds the pinned Lucide 1.77.0 SVG files
  (navigation/, education/, actions/) together with assets/icons/LICENSE. To change an icon,
  replace the file, then copy its path data into the matching <symbol> in the sprite.
- Content can choose its own icons: topics.json (icon), lessons.json (thumbnail.symbol),
  handbook.json (icon), extras.json (awarenessExtra section + per-item icon),
  school-info.json (icon per SOP group) and survey-questions.json (badge icons) now store
  Lucide names.
- Size scale: 14-18px in text rows, 20-26px in card and tile icons, 54-60px for topic and
  lesson artwork; stroke width 2 (Lucide default); colour is always currentColor, so light
  and dark themes need no per-icon rules.
- Icons never replace labels: every icon is decorative (aria-hidden) while the text label or
  accessible name stays, so screen readers read words instead of symbols.
- assets/icons/ is the design source; the student package does not need it because the sprite
  ships inside the two HTML files.

NEW IN VERSION 1.4 (content additions + SOP replacement)
- Awareness section: two new accordion blocks rendered from data/extras.json →
  "awarenessExtra":
  * "Effects of Bullying on Students" (10 cards: low self-esteem, anxiety and fear,
    depression and sadness, poor academic performance, social isolation, loss of
    confidence, difficulty trusting others, absenteeism, emotional problems,
    difficulty building relationships).
  * "Consequences for Students Who Repeatedly Bully Other Students" (8 cards: school
    disciplinary actions, loss of respect, damaged relationships, negative
    reputation, difficulty making friends, academic consequences, lack of empathy,
    possible legal consequences).
  Both are searchable through the existing search box, are expandable with animated
  height, and stack on mobile. Edit the wording in data/extras.json (or ask the
  website maintainer to update it) — the counts and cards update by themselves.
- About the Study: the Statement of the Problem now carries the revised instrument
  wording from the uploaded SOP document — 23 indicators grouped A–E (A. Students'
  Awareness About Bullying 1.1–1.4; B. Information About Bullying Prevention
  2.1–2.5; C. Information About the Proper Reporting of Bullying Incidents 3.1–3.5;
  D. Convenient Access to Information 4.1–4.4; E. Grade 7 Students' Satisfaction
  with the System 5.1–5.5). The old five SOP questions were removed; the Research
  Background, Objective, Scope and Limitations, Significance, and Definition of
  Terms sections are unchanged. The lead line now says "areas of inquiry" instead of
  "questions" because the items are grouped areas, and a short verification note is
  shown under the list.
- The effect and consequence descriptions were written for the website and still need
  the school's review before publication, same as the handbook transcription note.
- Reminder: data/survey-questions.json still uses the earlier awareness-survey
  wording (forms, signs, effects, identification, prevention, reporting). Align it
  with the revised instrument wording if the school wants both to match.

NEW IN VERSION 1.3 (audit follow-up pass)
- Palette now matches the approved design tokens: Forest #073F2E, Green #087A50,
  Mint #DDF3E7, Canvas #F5F8F5, Surface #FFFFFF (styles.css section 14.1).
- Fixed the dark-theme hero heading: the dark rule used the `background` shorthand,
  which reset `background-clip` and drew a solid gradient bar instead of clipped text.
- Mobile navigation is a real drawer: dimmed backdrop, page scroll locked while open,
  closes on Escape or a backdrop tap, focus moves into the drawer and returns to the
  menu button, and it closes by itself if the window becomes desktop-wide.
- Floating back-to-top button respects safe-area insets and tucks away while the page
  is scrolling down, so it no longer sits on top of the last awareness cards.
- Section anchors: one header offset (--header-h) shared by every jump; the old extra
  per-section margin was removed, so headings never land under the sticky header.
- Watch & Learn honesty pass: lesson cards and the lesson page show a "Coming soon"
  state with no play button when a lesson has no working video, thumbs are 16:9,
  partly-watched lessons show an "In progress · n%" pill, and lesson filters have
  a proper empty state.
- Handbook reading mode: the modal widens for handbook pages, the text column is
  capped near 72 characters, and Previous/Next chapter buttons plus "Chapter n of 10"
  let readers move through the handbook without closing the dialog.
- The demo concern form now leads with a "Demo only — this form does not send
  anything" banner, and the Report section shows a matching "nothing is sent" chip.
  Replace the placeholder guidance contact and reporting steps in school-info.json
  with verified school details before any real deployment (see section 8).
- Scenario cards state the outcome ("Safe choice" / "Not the safest choice") with the
  explanation that already lives in quizzes.json, and search/filter empty states now
  explain what to do next.
- Touch targets on phones are at least 44px (buttons, chips, bookmark, modal close).

NEW IN VERSION 1.2 (interface refresh — "clean school" layer)
- All interface work lives in one clearly marked block at the END of styles.css
  ("UI refresh (phase 14)"), so it can be changed or removed without touching the
  earlier phases. It restyles the palette, type scale, header, hero, cards, forms,
  modal, footer, dark theme and the responsive breakpoints of both pages.
- Icons are now crisp inline SVG symbols (a small sprite at the top of <body> in
  index.html and video.html, used through <use href="#i-...">). The theme toggle
  shows a sun/moon SVG chosen by CSS from [data-theme]; app.js no longer swaps icon
  characters. Text glyphs in headings and buttons are unchanged.
- The theme toggle now has a reachable "follow my device" state: choosing the scheme
  the device already uses clears the stored value instead of pinning it, and the
  switch crossfades with the View Transition API where the browser supports it.
- Motion: cards fade/rise in as they scroll into view using CSS scroll-driven
  animations (animation-timeline: view()) where supported; browsers without them
  keep the IntersectionObserver reveal. Accordions (<details>) animate to their
  natural height via ::details-content + interpolate-size where supported. Every
  effect is skipped for prefers-reduced-motion users.

================================================================================
1. CONTENTS
================================================================================
- index.html        Page structure (content areas are filled from JSON at load)
- video.html        Separate lesson page (video.html?lesson=<id>) opened in the same tab
- styles.css        Colors, layout, responsive/mobile design, component styles
- app.js            JSON loader, renderers, quiz, survey, progress (no admin code:
                    the local teacher/maintainer workspace lives in ../admin-local/
                    and is never deployed)
- data/             Structured content and configuration (source of truth)
- assets/           Images: school logo, hero illustration, visual mockup
- docs/             User manual (DOCX + PDF) with 29 screenshots, plus the manual
                    generator scripts in docs/manual-source/
- README.txt        This file

data/ files
- ebsafe-content.json   Manifest: lists every content file the app loads
- settings.json         School/system names, logo path, hero image path, feature flags,
                        and the optional backend address (no admin credentials here)
- school-info.json      School details, verified contacts, reporting guide, and the
                        "About the Study" chapter (background, objective, all five SOP
                        questions with sub-items, scope, significance, terms)
- topics.json           The five bullying topics and their detail content
- lessons.json          Video lessons (category, description, video link, objectives)
- quizzes.json          Awareness quiz (multiple choice + true/false) and the activity
- announcements.json    School posts (published / pinned flags)
- handbook.json         Student handbook pages as structured blocks
- survey-questions.json Awareness survey items, website evaluation items, badge rules
- extras.json          Kindness pledge lines, myth vs. fact cards, learning tips, FAQ

================================================================================
2. HOW TO OPEN AND RUN
================================================================================
The site loads JSON content with fetch(), so it must be served over HTTP. Do not
open index.html directly from a file; the content will not load reliably.

Option 1 — Standalone Windows package (for students):
1. The package builder creates dist/e-bsafe-windows.zip (see section 10).
2. Download and extract the entire ZIP file; do not run the launcher from inside
   the ZIP preview.
3. Open the extracted "e-B-SAFE Portable" folder and double-click
   start-ebsafe.bat.
4. Keep the PowerShell server window open while using the site. Close that window
   (or press Ctrl+C in it) to stop the local server.

The package uses Windows PowerShell, which is included with Windows 10/11. It
includes everything needed to serve the website, including local lesson videos;
Python, Node.js, and internet access are not required to use the packaged lessons.
The launcher picks an available local port automatically. Browser prompts or
security software may ask to allow a local connection; the server listens only on
this computer (127.0.0.1), not on the school network.

Option 2 — Local development server (Python):
1. Install Python if it is not installed.
2. Open the project folder (the one above docs/) in File Explorer.
3. Double-click start-local.bat, or run in that folder:
   py -m http.server 8000 --bind 127.0.0.1
4. Visit http://localhost:8000/docs/ in your browser.

Option 3 — XAMPP:
1. Copy the docs/ folder to C:\xampp\htdocs\ebsafe_website\
2. Start Apache in XAMPP.
3. Visit http://localhost/ebsafe_website/

Option 4 — Any static host: upload the whole folder to a static web host
(GitHub Pages, Netlify, school server, etc.). There is no server-side code.

================================================================================
3. HOW THE JSON FILES WORK
================================================================================
- On load, app.js reads data/ebsafe-content.json (the manifest) to find every
  content file, then loads each file and validates its required fields.
- If a file is missing or invalid, the site shows a "Content notice" banner and
  keeps working with whatever loaded. Specific areas show a short error message.
- To change website content, edit the JSON files. No HTML or JavaScript changes
  are needed for normal content updates.
- Content rules:
  * Keep valid JSON (double quotes, no trailing commas, no comments).
  * Every item needs a unique id.
  * Do NOT put private student information, credentials, or real incident
    reports into these files. They are public website content.
  * To archive an announcement instead of deleting it: set "published": false.
  * To keep an announcement at the top of the list: set "pinned": true.
    (The announcements strip shows the pinned post first, then the newest.)
  * To hide a lesson without deleting it: set "published": false.
  * Handbook pages use structured blocks: heading, title, subtitle, label,
    labelParagraph, paragraph (optionally with "lines"), list (kind: ordered,
    alpha, plain, or values, optional "start" and nested "items"),
    fields, columns, and objectives. Each page also has status
    ("transcribed" from the printed handbook, or "summary").

================================================================================
4. HOW TO ADD VIDEOS AND IMAGES
================================================================================
Videos (lessons.json):
Current published video files in assets/videos/ (August 2026): physical-bullying.mp4
(Physical Bullying lesson), social-bullying.mp4 (Social / Relational lesson),
emotional-bullying.mp4 (Psychological / Emotional lesson). The other three lessons
are text lessons in the "Read & learn" shelf; their page shows a read panel and a
"Mark as read" button. One visible homepage video can preview silently at a time. Previews advance
in order and repeat. Open a lesson for the full player, sound, and learning progress.

- Set "videoUrl" to one of:
  * A YouTube link (https://www.youtube.com/watch?v=... or https://youtu.be/...)
  * A direct video file link or relative path, for example
    "assets/videos/verbal-bullying.mp4"
- Optional "poster": a preview image for the lesson card and for the player before
  playback, for example "assets/posters/social-bullying.jpg". The current poster
  frames (real frames taken from the three published videos) live in
  assets/posters/. Lessons without a poster show a neutral reading icon instead of
  invented artwork.
- Optional "durationSeconds": the real length in seconds (the three current videos
  are 24, 10, and 5). Cards and the hero use it; otherwise the display string in
  "duration" is shown.
- Optional "captionsPath": a WebVTT caption file. The player adds a CC control only
  when a caption track exists. No caption files are present yet, and the transcript
  panel shows an honest empty state until the school adds the text.
- Featured video: the student homepage hero uses the published lesson with
  "featured": true and a videoUrl. The website maintainer chooses it in the
  maintainer workspace; only one playable lesson can be featured. If none is marked,
  the newest playable video is used. Read lessons are never presented as a video.
- Lessons open on their own page: video.html?lesson=<id>, in the same browser tab.
  The video, its controls, the transcript, and the lesson details stay together on
  that page, with a "Back to lessons" link (and the normal browser Back button)
  returning to index.html#videos.
- Place local files in an assets/videos/ folder that you create.
- Do not embed large video files inside JSON (no Base64).
- To publish a video, place the real file in assets/videos/ (or host it at a
  supported URL) and set its path in lessons.json.
- If a lesson has no videoUrl, the lesson page shows the reading panel.

Images:
- Put image files in assets/ and reference them by path in JSON
  (for example "logoPath": "assets/school-logo.jpg").
- Use clear, school-approved images only.

================================================================================
5. SCHOOL WORKSPACE (SEPARATE FROM THIS PUBLIC SITE)
================================================================================
The published website is static. The school's local teacher workspace lives in
admin-local/ beside this folder and is never deployed or copied into docs/.

Teachers open the local workspace and see only:
- Dashboard
- Manage Lessons
- Announcements
- Survey Results

Lesson and announcement changes are saved in that browser on that computer. They
are not live on the student site until the website maintainer reviews and publishes
them. The workspace has no local login; "Sign out" only signs out of the optional
school survey service. That service uses the school's single admin account; no
separate teacher account is created.

The website maintainer uses the separate maintainer view (documented in the private
project README, not here) for JSON editing, validation, preview, backup, reports,
security, export, and publishing. Teachers never see those controls.

Technical notes:
- The public site reads only the packaged JSON in docs/data/ plus explicit
  ebsafe_draft_<name> preview keys. Teacher work is kept separately in
  ebsafe_teacher_work and never appears on the public site by itself.
- The local workspace must be opened through the school's local server, not as a
  file:// page.
- A static site cannot make teacher changes appear on other devices. The maintainer
  publishes them; no automatic sync is claimed.

================================================================================
6. PUBLIC SITE SECURITY CHECKS
================================================================================
There is no admin page inside the published website. The school's local teacher and
maintainer workspaces are separate, are never deployed, and have no login: the
computer account is the access control. Nothing in docs/ can reach them.

Do not add a password prompt to the public site: the files are public, so a browser
check would be theatre. If the school ever needs online administration, that belongs
in a separate service with server-side authentication and a protected data store.

Before every deploy, run both security gates from the project root:

  node .agents/skills/static-site-security/scripts/security-audit/audit.mjs
  node packaging/verify-public.mjs
  node api/tests/run.mjs          (only when the backend in api/ is in use)

The first scans code and content (admin isolation, secrets, credential and student
data keys, JSON shape, unsafe sinks, link rel, published file types). The second
re-checks the deploy surface. The rules behind them, and the review ledger of past
scans, are in .agents/skills/static-site-security/SKILL.md.

================================================================================
7. WHAT WORKS LOCALLY AND WHAT NEEDS A BACKEND
================================================================================
Works fully without any backend:
- All learning content loaded from JSON, topic details, video links, quizzes with
  feedback and scores, the bystander activity, handbook pages, the About the
  Study section, and the reporting guide.
- Local learning progress (videos watched, text lessons read, best quiz score,
  badges) stored in this browser only. Watched is recorded only after a video
  actually starts; completed is recorded when a video ends or a text lesson is
  marked read.
- Awareness survey and website evaluation with per-response JSON download.
- The separate local teacher workspace for lessons and announcements, plus survey
  summaries when the school results service is connected.

Requires a secure backend/service (NOT provided by this static site):
- Confidential reporting that is actually delivered to school staff, with
  authorized recipients and status tracking. The built-in "concern form" is a
  demonstration only — it does not send anything.
- Real user accounts, roles, and protected administration.
- Synchronizing progress or responses across devices or central storage.

Privacy and safety notes:
- Progress and response data stay in the student's browser until a response file
  is downloaded and handed in. Do not display or collect names.
- The awareness survey keeps personal-experience questions optional and includes
  a "Prefer not to answer" option. It never asks students to identify alleged
  victims or perpetrators.
- Website usability ratings are kept separate from bullying reports.
- Do not enter real student names or sensitive disclosures anywhere in this
  prototype (including the demo concern form).

================================================================================
8. BEFORE SCHOOL DEPLOYMENT (CHECKLIST)
================================================================================
- Confirm assets/school-logo.jpg and assets/hero-school.jpg are the approved files.
- school-info.json: fill in the official Guidance Office contact and verify the
  reporting steps with the school. The contact is intentionally a placeholder.
- Verify all handbook text and policies with the school (the transcribed pages
  come from the printed student handbook; the school should approve the wording).
- Verify survey/evaluation items and the consent process with the researchers and
  the school's student-protection requirements.
- Replace or approve all lesson videos, and choose the featured video in the
  maintainer workspace.
- Add captions (.vtt via "captionsPath") and transcript text where available. The
  player and transcript panel support them; accurate content is a school task, not
  something the site invents.
- Add secure server-side authentication and a database only if the school wants
  true multi-device administration. This prototype deliberately avoids pretending
  to provide those.
- If a real reporting workflow is wanted, build it as a separate secure service
  with authorized personnel; do not simulate it in this static site.

================================================================================
10. BUILD THE STANDALONE WINDOWS PACKAGE (MAINTAINERS)
================================================================================
Requirements on the build computer:
- Windows 10/11 with built-in Windows PowerShell 5.1
- Node.js 18 or newer (only needed by the package builder; it is NOT bundled)

To build:
1. Open PowerShell in the project folder.
2. Run (from the project folder): powershell -NoProfile -ExecutionPolicy Bypass -File .\packaging\build-windows.ps1
3. Share dist\e-bsafe-windows.zip with students. They extract it and double-click
   start-ebsafe.bat; they do not need Node.js or Python.

The builder stages only docs/ (runtime files, JSON data, school/lesson images,
lesson posters, local MP4 videos) plus the PowerShell server; admin-local/ and backups/
are never included. It excludes the manual, screenshots, mockup,
and build tools. Move the existing ZIP out of dist before building another copy.

================================================================================
11. TROUBLESHOOTING
================================================================================
- "Content notice" appears and some sections are empty: you opened index.html
  from a file, or a data file was moved/renamed/edited incorrectly. Run the site
  through a local server (see section 2) and ask the website maintainer to validate
  the edited content.
- A preview seems stuck: ask the website maintainer to clear the preview drafts in
  the maintainer workspace.
- A video does not play: confirm the videoUrl is a valid approved link or that
  the file really exists at the given assets/ path.
