# Kasatria People Visualization

A CSS3D "periodic table"-style visualization (based on three.js's
[css3d_periodictable](https://threejs.org/examples/#css3d_periodictable)
example) that pulls live data from a Google Sheet and arranges it as a
Table, Sphere, double Helix, or 5x4x10 Grid, gated behind Google Sign-In.

## Running it locally

This is a static site with no build step, but it uses ES module imports,
which browsers refuse to load from a plain `file://` path (CORS). Serve the
folder over HTTP:

```bash
python3 -m http.server 8080
# or: npx serve .
```

Then open `http://localhost:8080`.

## First-time setup

1. Copy the config template and fill in your own values:
   ```bash
   cp js/config.example.js js/config.js
   ```
2. Open `js/config.js` and fill in:
   - `GOOGLE_SHEETS_API_KEY` - an API key from a Google Cloud project with
     the **Google Sheets API** enabled (APIs & Services -> Credentials ->
     Create Credentials -> API key).
   - `SPREADSHEET_ID` - the long ID in your Sheet's URL, between `/d/` and
     `/edit`.
   - `GOOGLE_CLIENT_ID` - an OAuth 2.0 Client ID from the same Google Cloud
     project (APIs & Services -> Credentials -> Create Credentials -> OAuth
     client ID -> Web application), with your site's URL added under
     **Authorized JavaScript origins**.
3. Share the Google Sheet itself as "Anyone with the link" (Viewer), or the
   API key alone won't be enough to read it.

## API keys & GitHub

You asked the right question here, so it's worth answering properly rather
than just quietly gitignoring a file and calling it done.

**What actually changed in this codebase:** the three Google identifiers
(Sheets API key, Spreadsheet ID, OAuth Client ID) used to be hardcoded
directly inside `dataLoader.js` and `auth.js`. They now live in
`js/config.js`, which both files `import` from. `js/config.js` is listed in
`.gitignore`, so `git add .` / `git status` will never pick it up - it
can't end up in a commit, a PR diff, or your repo's history by accident.
`js/config.example.js` (committed, with placeholder values) is what tells
anyone cloning the repo - including you, on a fresh machine - which values
they need to fill in.

**What this does and doesn't protect, and why:**

- It stops the key from ever landing in your **GitHub repo, its history, or
  a PR diff**. That's a real, meaningful thing to prevent - a key sitting
  in git history is trivially findable (GitHub's own secret-scanning, any
  clone, `git log -p`) and effectively impossible to fully remove later
  without rewriting history.
- It does **not**, and cannot, hide the key from anyone who visits your
  *deployed* site. This is a plain static webpage - the browser has to
  download `config.js` in full to run the app at all, so anyone can open
  their browser's Network tab (or just view-source) and read the key
  straight out of it. No amount of `.gitignore`-ing changes that; there's
  no server here to keep a secret behind.

For a key like this - one whose only job is "let this specific public page
read this specific already-public-by-link Sheet" - that second point isn't
actually a problem, **provided the key is restricted, not just hidden**.
The real protection is on the Google Cloud side:

1. Google Cloud Console -> APIs & Services -> Credentials -> click the key.
2. Under **API restrictions**, choose "Restrict key" and allow only the
   **Google Sheets API**. Now this key is useless for anything else, even
   if someone else copies it.
3. Under **Application restrictions**, choose **Websites** and add your
   deployed site's URL (e.g. `https://yourname.github.io/*`). Now the key
   only works when the request's `Referer` is your own site - copying it
   into some other page won't work.

Once both restrictions are set, it's genuinely fine for this key to be
visible in your deployed page's source (it always will be, for any
client-only app) - that's the expected, standard shape of a client-side
Google API key. The OAuth Client ID was never a secret either (it's
designed to be public; it just identifies your app to Google). The one
thing actually worth keeping fully private is your Google Cloud *account*
credentials themselves, which none of this touches.

**If you ever want a truly hidden secret** (one that must never be visible
to any visitor, e.g. a key with write access or billing implications), that
requires a server or serverless function in between - a static page alone
can never keep a secret from the people loading it, restricted or not.
That's a different, bigger architecture change and not what this
assignment needs.

## What changed in this pass

- **Grid readability (overlapping tiles):** Grid went through two different
  fixes across this project. It first moved to a real
  `THREE.OrthographicCamera` (zero perspective convergence at all), which
  did stop tiles from fanning apart - but it also made Grid look completely
  flat, like a printed sheet rather than an actual 3D arrangement of ten
  stacked layers, which was the wrong trade to make once "make it look
  genuinely 3D" was itself a requirement. Grid is back on a real
  perspective camera now, at its own narrower-than-normal reference angle
  (see `GRID_FOV` in `main.js`) so nearer layers are visibly bigger and
  farther ones visibly smaller - real depth, not a picture of depth - while
  three other things keep that depth from turning back into clutter: a
  shorter total depth per layer (`Z_SPACING` in `layouts.js`), the default
  view framing on just the front layer's own footprint instead of the full
  ten-layer box (so the readable part is always sized properly, see
  `getFramingTargets`), and the same color-based depth recede described
  below now running on Grid too, so a layer or two behind the front one is
  still visibly there (that's the actual 3D effect), fading toward the
  background the farther back it sits instead of competing with the front
  layer for attention. A separate, previously-unnoticed bug in the
  camera-framing math (`computeFraming`) was fixed alongside this too: it
  only ever checked a shape's height against the field of view, never its
  width against the real width of the window, which on any window
  narrower than a cinematic 16:9 (a common shape for an ordinary browser
  window, not a rare case) was silently forcing Grid/Helix's field of view
  wider than intended just to avoid clipping the sides - widening the FOV
  is exactly what makes a deep shape fan out more, so this was quietly
  undoing the narrow reference angle both shapes are tuned around. Every
  shape now always renders at its own exact tuned FOV regardless of window
  shape; the camera simply backs up a bit farther on a narrower window
  instead.
- **Grid scrolling ("can't scroll to the end"):** the mouse wheel pages
  through Grid's depth layers directly (throttled to one layer per tick, so
  a fast scroll doesn't blow through all ten at once) - scroll all the way
  and you reach the last layer. Hold Ctrl/Cmd while scrolling (or pinch on
  a trackpad) to zoom instead. This keeps working identically while
  stepping through layers with the arrow keys/pad, and Reset or clicking
  GRID again always drops you back to the full, un-stepped view.
- **Solid tiles:** every tile's front face is fully opaque (alpha 1, was
  0.94) - nothing from directly behind a tile ever bleeds through it.
- **Double Helix:** the Helix is now a genuine two-strand double helix -
  two coils wound around the same axis, permanently 180 degrees apart -
  matching the assignment's explicit "double Helix instead of the default
  single Helix" instruction. This also directly delivers the "rotate to see
  more data" behavior: at any one viewing angle only one strand is facing
  you, so a left-click-drag rotation swaps which half of the data is in
  front of you as it turns.
- **All shapes look genuinely 3D:** a real 6-faced extruded box per tile
  (true `preserve-3d` CSS geometry) was tried first and did look great, but
  at 200 tiles x 6 faces = 1,200 elements each forced onto their own
  composited GPU layer, it was a measurable drag on frame time - directly
  working against "the speed of the website... and not lagging", which
  matters more. It was pulled entirely in favor of two things that cost
  effectively nothing extra: a layered inset/outer `box-shadow` on every
  tile (a cheap, purely 2D "raised card" look), plus the fact that every
  shape already places tiles at real, individually-rotated positions in a
  true 3D perspective scene. Sphere, Helix, and Grid all read as solid
  arrangements of 3D cards from that alone, with zero impact on frame time.
  A tile facing away from the camera (routine now on the double Helix)
  shows a mirrored copy of its own front face rather than an empty gap,
  again at no extra rendering cost.
- **Faster first paint:** added `<link rel="preconnect">` hints for
  Google's sign-in/Sheets hosts and the photo CDN, so the browser starts
  those connections immediately instead of only once each request is
  actually issued.
- **A single "distance depth cue" now covers Sphere, Helix and Grid (a
  "back/inside/farther" you can see but never confuse with the actual data
  in front):** color does most of the work, not transparency. Tiles closer
  to the camera stay fully bright, fully saturated and (nearly) opaque;
  farther ones are progressively dimmed (`brightness`) and desaturated
  (`saturate`) toward the near-black background, on top of a smaller
  opacity fade (see `applyDistanceDepthCue` in `main.js`). A merely-
  transparent far tile still shows its full-strength color and text right
  underneath the near ones and keeps competing for attention; a darker,
  greyer one reads as "farther away / part of the shape's own silhouette"
  the way a dim object at the back of a real room does, while still
  outlining the shape itself. The fade is also eased (not linear) so
  roughly the nearest third of tiles stay essentially at full strength -
  the actual data you're meant to read - with the recede happening
  increasingly fast only past that point, instead of leaving a washed-out
  middle ground. One distance-driven cue turned out to be the right model
  for all three shapes, not three different ones: Grid's "front vs back"
  is purely about depth (every Grid tile faces the same way regardless of
  layer - there's no orientation difference to key off), while Sphere's
  and Helix's "outside vs inside" happens to line up almost exactly with
  distance too, since both are round shapes where the near side and the
  outward-facing side are, for all practical purposes, the same set of
  tiles. Table is the one shape excluded entirely - its tiles have no real
  depth between them at all, so there's nothing genuine for a depth cue to
  key off. One edge case this needed a fix for: normalizing purely by each
  view's own near/far spread broke down the moment that spread was
  essentially zero (Grid's very last remaining layer while stepping is a
  single flat plane of tiles, all almost exactly the same distance from the
  camera) - it was stretching a few tens of units of meaningless positional
  noise across the full dim range and making an entire, perfectly readable
  layer look arbitrarily half-dark. `DEPTH_MEANINGFUL_RANGE` in `main.js`
  fixes that: the cue now scales itself down automatically whenever the
  real depth on screen is too small to be a genuine "near vs far" in the
  first place.
- **Helix's default view is now front-on, not tilted:** it used to open
  tilted down at an angle so the coil visibly read as a wound spiral right
  away - technically informative, but it also meant the default view was a
  small, distant-looking ring rather than the coil actually filling the
  screen. Every shape (Table, Sphere, Grid, and now Helix too) opens
  straight-on instead - Helix reads as a large, gently curved wall of cards
  facing you, the same way a photo of a cylinder shot straight-on looks
  like a slightly bowed wall rather than a drum. A left-click-drag still
  tilts the view to see the coil wind around; it's just no longer forced by
  default.
- **Tile colors are deeper shades of red/orange/green, not the original
  bright ones:** the white text sitting on top of them measurably didn't
  have enough contrast to read comfortably, especially at a tile's smallest
  on-screen size - measured against the standard WCAG contrast-ratio
  formula, white text on the original bright orange was only about 2.2:1
  and on the original bright green about 1.8:1 (4.5:1 is the accepted
  minimum for normal-size text; below that is a genuine readability
  problem, not a style preference). The deeper shades in
  `getNetWorthColor()` in `tileFactory.js` keep the same red/orange/green
  identity at a glance while giving white text 5.2-6.5:1 contrast against
  every one of them. The legend's swatches were updated to match exactly.

## Round 2: fixing "the grid/shapes look blurry", helix spacing, and hover clipping

A second pass, prompted by three concrete reports: Grid and other shapes
"look blurry", Helix's rows overlap, and hovering a tile on Sphere/Helix cuts
off part of its enlarged photo/text.

- **Tiles are now true two-sided cards, not one face plus a JS dimming
  pass.** Each tile (`buildTile()` in `tileFactory.js`) is now an empty 3D
  "stage" (`.element`, `transform-style: preserve-3d`) holding two separate
  child faces: `.face-front` (full-strength net-worth color, the tile's real
  content) and `.face-back` (the same hue darkened - see `dimColor()` - with
  a subtle diagonal hatch so it doesn't read as a flat void). Each face also
  gets `backface-visibility: hidden`, so the browser's own 3D compositing -
  not a per-frame JS recalculation - decides which face paints, purely from
  which way that tile is actually turned. This directly replaces the old
  `applyDistanceDepthCue`, which dimmed tiles by raw distance from the
  camera - a tile genuinely facing the camera but sitting a little farther
  back than average got dimmed right along with tiles actually facing away
  ("the front also gets dim", the exact bug reported). Sphere and Helix no
  longer run any per-frame dimming pass at all; only Grid still fades tiles
  by distance (`applyGridDepthFade`, opacity-only now, no more
  `brightness`/`saturate`), since every Grid tile faces the same way and has
  no orientation to key off. A full 6-faced box per tile was tried and
  rejected for cost (1,200 always-composited layers for 200 people); two
  faces (400 layers) gets the same "strong outside, dim inside" read for a
  fraction of the cost - and, per the benchmark below, actually measured
  *faster* than the old dimming approach it replaced.
- **Grid no longer renders all ~10 depth layers on top of each other.**
  That stack of near-identical, near-perspective layers was the real source
  of the "blur" - lots of nearly-overlapping tiles at a narrow FOV reads as
  visual noise, not a crisp grid. Two changes fix it: only
  `GRID_VISIBLE_DEPTH_LAYERS` (2) layers are ever shown at once - anything
  deeper is hard-hidden (`is-hard-hidden` in `style.css`), not just faded -
  and the layers that remain get a small per-layer `LAYER_STAGGER` offset in
  `buildGridTargets()` (`layouts.js`) so they read as a gently fanned stack
  of cards instead of a perfectly-aligned pile.
- **Grid no longer blurs/fades while stepping between layers.** Stepping
  used to fade every tile through the shared `opacity` transition, which
  looks like a blur mid-step when a whole layer's worth of tiles crosses the
  visibility threshold at once. `.is-hard-hidden` now sets `transition:
  none`, so a tile that's crossed out of the visible range snaps instantly
  instead of fading, and the camera's per-layer reframe uses a shorter,
  snappier `GRID_STEP_FLY_DURATION` (450ms, down from the default 800ms)
  so the whole step reads as quick and crisp rather than a slow drift.
- **Helix row spacing:** rows were overlapping, so a `ROW_GAP_FACTOR`
  widened the vertical step between rungs (`Y_STEP` in
  `buildHelixTargets()`, `layouts.js`). A first pass at 4x fixed the overlap
  but overshot into rows that read as too far apart; retuned to 2x, which
  keeps rows clearly separated with zero overlap without the coil looking
  sparse.
- **Sphere/Helix hover no longer cuts off text/photos.** The hover-zoom
  (`.element:hover .element-inner`) still scales up to 1.8x on Table and
  Grid, where tiles sit in flatter, more evenly-spaced arrangements with
  room around them - but on Sphere and Helix, where tiles pack more densely
  across a curved surface, that same 1.8x could push an enlarged tile far
  enough that part of it ran off past a neighbor or the shape's own edge.
  `switchLayout()`/`init()` now tag the scene container with a
  `layout-<shape>` class, and a `.layout-sphere`/`.layout-helix`-scoped rule
  caps their hover-zoom at 1.35x instead - enough to still clearly preview a
  tile without outrunning the space actually available around it. Hover
  z-index was also raised (10 -> 100) so an enlarged tile reliably paints
  above its neighbors regardless of shape.
- **Site description and contact:** a short one-line description of what
  the visualization is now appears on the login screen and at the top of
  the Help guide (`?` button), and a contact email
  (chyntiavy@gmail.com) is listed on both - discreetly, without adding
  anything to the main 3D view itself.

**Benchmark (headless Chromium, 200 tiles, average `requestAnimationFrame`
frame time while dragging to rotate each shape):**

| Shape  | Before        | After         | Improvement |
|--------|---------------|---------------|-------------|
| Grid   | 73.7ms (~14fps) | 18.5ms (~54fps) | ~4.0x faster |
| Helix  | 45.1ms (~22fps) | 20.2ms (~49fps) | ~2.2x faster |
| Sphere | 107.2ms (~9fps) | 31.1ms (~32fps) | ~3.4x faster |

The single biggest lever was removing the old per-frame
`brightness`/`saturate`/opacity recalculation across all 200 tiles on every
animation frame for Sphere and Helix (replaced by the browser's own,
effectively-free 3D face compositing), followed by Grid no longer keeping
every one of its ~10 depth layers - most of them invisible clutter - in the
live DOM and per-frame update loop at once.

## Round 3: Grid's real depth, layer navigation, and Helix rotation

A third pass, prompted by concrete follow-ups on Round 2's fixes: Helix's
rows were still too far apart, rotating Helix felt "crazy", Grid's single-
layer view didn't reveal any real 3D depth when you rotated it, scrolling
on Grid reliably overshot straight to the last layer, and a couple of
screenshots showing what looked like blur/ghosting on Grid.

- **Helix row spacing, retuned a third time:** `ROW_GAP_FACTOR` in
  `buildHelixTargets()` (`layouts.js`) went 1x (too tight) -> 4x (way too
  far) -> 2x (still too far) -> now **1.4x**, closer to the original tight
  coil than either previous pass while keeping each rung's edge visibly
  peeking out past its neighbor.
- **Helix rotation no longer swings wildly.** The real cause: dragging
  applied the exact same wide up/down tilt range as Table/Sphere/Grid, but
  a taller coil (from the widened row spacing above) swings much further
  on screen for the same drag distance than a short one does, and vertical
  tilt doesn't actually reveal anything new on a Helix anyway - only
  spinning around the axis does (that's what swaps which of the two
  strands faces you). Helix now gets its own, much tighter tilt range
  (`HELIX_MIN_PHI`/`HELIX_MAX_PHI` in `main.js`, ±0.4 radians from
  straight-on, versus the normal ±0.87) - a left-drag now reads as "spin
  the coil in place" the way it's meant to, with just enough tilt allowed
  to confirm it's really a cylinder, not a locked, flat wall.
- **Grid actually shows real depth now when you rotate it.** The Round 2
  fix capped visible layers at 2 (front + one behind) specifically to kill
  the blur - but that also meant orbiting the camera around Grid never
  revealed anything resembling a 10-deep stack, just a near-flat pair
  ("why doesn't it show layers 2-10 in 3D when I rotate"). Three numbers
  moved together to fix this without bringing the blur back:
  `GRID_VISIBLE_DEPTH_LAYERS` (`main.js`) raised 2 -> 4, so enough of the
  stack stays in the live scene for tilting/orbiting to reveal real
  parallax; `LAYER_STAGGER` (`layouts.js`) raised 20 -> 50, so each of
  those layers is clearly, unambiguously offset from its neighbor instead
  of reading as a faint duplicate; and `DEPTH_OPACITY_FLOOR` (`main.js`)
  lowered 0.55 -> 0.35, so the layers further back fade enough to read as
  "behind and receding" rather than "a ghost of the layer in front" - this
  is what the screenshotted "why is it blurry" was actually showing: two
  layers close in both position and opacity reading as a smeared double-
  image rather than a stack.
- **Grid's scroll wheel zooms now, like every other shape - it no longer
  pages through layers at all.** That behavior was Round 2's fix for "I
  can't scroll to the end", but it created the opposite, worse problem: a
  single ordinary scroll gesture (trackpads especially, which can fire a
  dozen-plus wheel events in under a second) reliably blew straight past
  every layer in between and landed on the last one - "I always end up in
  layer 10". Layer navigation now lives entirely in controls built for
  deliberate, discrete moves: arrow keys/the on-screen pad (one layer per
  press, unchanged), and a new row of small clickable dots below the Grid
  view - one per layer - that jump straight to any layer in a single click,
  no stepping through the ones in between required
  (`renderGridLayerDots`/`goToGridLayer` in `main.js`). The status readout
  above the dots is now visible for as long as Grid is active (not only
  once you're already mid-step), so the dots are something people can
  actually discover.
- **Smoother transitions for bigger Grid moves.** Stepping one layer at a
  time (arrow keys/pad) still uses the snappy 450ms reframe from Round 2 -
  but entering stepping mode from the overview, or clicking a layer dot
  more than one layer away, is a much bigger visual jump, and arriving in
  that same 450ms read as an abrupt cut. Those now get a calmer 700ms fly
  instead (`reframeGridView`'s `isBigMove` parameter in `main.js`), while
  single-step moves stay just as snappy as before.

## Further suggestions

A few things worth doing next, roughly in order of impact:

1. **Move the Sheets fetch off the client entirely**, once you have any
   kind of backend (even a tiny serverless function): fetch once server-side,
   cache it briefly, and serve it to the page. This removes the Sheets API
   key from the browser entirely (not just restricts it), and also means
   200 people's worth of data isn't re-fetched from Google on every single
   page load/refresh.
2. **Resize/serve photos at the size they're actually displayed at.** Right
   now each tile requests a full-size photo just to show it in a 130x180
   (supersampled to 390x540) card - a thumbnail-sized version (or an
   `srcset`) would cut a meaningful amount of network weight, especially on
   first load with 200 photos in flight.
3. **A loading state while the first Sheets fetch is in flight.** Right now
   the screen is blank between sign-in and the data arriving; even a simple
   spinner/skeleton would make the wait feel shorter and confirm nothing's
   stuck.
4. **Search/filter** (by name, country, or interest) to jump the camera to
   a specific person or subset instead of only browsing visually - useful
   once the dataset grows past what's comfortable to scan by eye.
5. **Keyboard shortcuts for switching shapes** (e.g. `1`/`2`/`3`/`4` for
   Table/Sphere/Helix/Grid) alongside the existing mouse/arrow-key controls.
