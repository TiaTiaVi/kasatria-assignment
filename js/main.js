import * as THREE from 'three';
import TWEEN from 'three/addons/libs/tween.module.js';
import { TrackballControls } from 'three/addons/controls/TrackballControls.js';
import { CSS3DRenderer } from 'three/addons/renderers/CSS3DRenderer.js';

// Two completely separate animation "groups" - one exclusively for moving
// tiles between layouts, one exclusively for camera movement (reset/zoom).
// This is what stops the two from ever cancelling each other out again:
// clearing one group can never touch the other, no matter what order
// functions get called in.
const tileTweens = new TWEEN.Group();
const cameraTweens = new TWEEN.Group();

import { getData } from './dataLoader.js?v=5';
import { buildTile, formatCurrency, getNetWorthColor } from './tileFactory.js?v=29';
import { buildTableTargets, buildSphereTargets, buildHelixTargets, buildGridTargets, GRID_WIDTH, GRID_HEIGHT, computeScaleFactor } from './layouts.js?v=31';
import { initGoogleSignIn, isSessionExpired, signOut } from './auth.js?v=4';

let camera, scene, renderer, controls;
let cameraGroupElement; // see the comment where this is captured, in init()
const objects = [];
let targets = { table: [], sphere: [], helix: [], grid: [] };
let peopleData = [];
let currentProfileIndex = -1;
let activeLayoutKey = 'table';
let currentGridLayer = null;   // null = showing the full Grid, 1..totalGridLayers = stepping mode
let totalGridLayers = 1;       // recalculated from the real data count, never hardcoded
// Whether Grid's opt-in "step through one layer at a time" mode is active
// (toggled by the #grid-layer-toggle button - see toggleGridLayerMode).
// OFF is now Grid's real default: a plain, freely-orbitable 3D shape with
// every layer visible at once, behaving exactly like Sphere/Helix (see
// applyGridLayerVisibility/getFramingTargets/handleDirectionalInput below).
// Turning this ON is what narrows Grid down to viewing exactly one layer at
// a time, previous/next-navigable.
let gridLayerModeActive = false;
let lastRefreshTime = null;
const zoomRaycaster = new THREE.Raycaster();

// The vertical field-of-view we design around at a "normal" aspect ratio.
// On resize, we adjust the camera's actual FOV so the same horizontal extent
// of content always stays visible - this is what stops tiles being cut off
// or overlapping the bottom menu on narrower/smaller windows.
const BASE_FOV = 40;
const BASE_ASPECT = 16 / 9;

// Grid briefly rendered through a true THREE.OrthographicCamera (zero
// perspective convergence at all) to fix an earlier "tiles overlapping,
// hard to read" complaint - it did fix that, but it also made Grid look
// completely flat, like a printed sheet rather than an actual 3D
// arrangement of ten stacked layers (the exact "why doesn't Grid look 3D
// like [the three.js periodic table example]" follow-up this caused).
// Grid is back to the same real PerspectiveCamera every other shape uses -
// nearer layers now genuinely appear bigger and farther ones smaller, and
// orbiting around it (left-drag) shows real parallax between layers, which
// is what actually reads as "3D" rather than a picture of a shape. This FOV
// is still narrower than Table/Sphere's normal 40 degrees, though, as a
// middle ground: at Grid's proportions (5x4 wide but multiple layers deep)
// a normal wide FOV makes every column visibly fan sideways the farther
// back it sits (ordinary perspective convergence) - readable depth without
// that fan comes from a combination of this narrower angle, the shorter
// total depth per layer (see Z_SPACING in layouts.js), the per-layer
// stagger (see TOTAL_FAN_SPAN/buildGridTargets in layouts.js), and the
// per-tile opacity depth recede (see applyGridDepthFade below) that fades
// farther layers toward the background instead of letting them compete
// visually with the front one.
const GRID_FOV = 12;

// Helix needs the same narrower-than-normal FOV treatment as Grid above,
// for the same underlying reason (ordinary perspective exaggerating a
// shape's own depth), even though Helix's default view is now straight-on
// rather than tilted (see getDefaultPhi below): the coil is still a real
// cylinder, so its near side (closest to the camera) is genuinely closer
// than its far side even head-on, and a normal, wider FOV makes that near
// side visibly bulge/bow outward compared to the edges curving away - a
// narrower FOV at a proportionally greater distance keeps that curve
// reading as a gentle, even wall of cards rather than a fisheye bulge. It
// also still matters if you drag-tilt the view yourself: at a normal FOV,
// tilting down at the coil makes its near edge project noticeably wider on
// screen than its far edge even though the radius never changes (the
// "bucket/lampshade" look) - the narrower FOV avoids that too.
const HELIX_FOV = 15;

// Grid redone (again) as a real, whole 3D shape by default - see
// gridLayerModeActive above. There is no longer any "how many layers are
// visible right now" tuning constant here at all: with the layer-stepping
// cap gone, Grid's default view is simply every tile at once, exactly the
// way Sphere/Helix already work, and only the opt-in Layer mode narrows
// that down (to exactly one layer - see applyGridLayerVisibility). The
// per-layer stagger (TOTAL_FAN_SPAN in layouts.js) and the opacity
// depth-fade below (DEPTH_OPACITY_FLOOR) are what keep a full, many-layer
// stack reading as a legible fanned deck instead of clutter.

// How long Grid's camera reframe takes when stepping to a different layer
// (see reframeGridView/flyCameraTo below) - deliberately shorter than the
// default 800ms camera-fly duration used for Reset/Fit/switching shapes.
// Stepping through layers is a quick, repeated, deliberate "next card"
// action (arrow keys, scroll wheel, the nav-pad) - a snappier reframe
// keeps pace with that, and finishing sooner also means less time spent
// with the outgoing and incoming layers' opacity fades and the camera pan
// all overlapping on screen at once, which is a real part of what made
// changing layers look busy/blurry rather than crisp.
const GRID_STEP_FLY_DURATION = 450;

// How far the camera is allowed to tilt up/down (the polar angle from
// straight overhead), kept inside the 0-to-PI range with a small safety
// margin at each pole (looking EXACTLY straight up/down loses any sense of
// "which way is around" - not broken, just disorienting to rotate from).
//
// This used to be clamped much tighter (1.0 to PI-1.0, roughly a 33-degree
// tilt at most). Two separate things were actually going on at steep
// angles, and only one of them is really about the angle itself:
// (1) the Helix's camera could ALSO get closer than the coil's own radius
// at the same time (see getHelixMinCameraDistance) - fixed separately now,
// that combination (steep angle + inside the tube) was a big part of the
// old "narrow funnel, most of the shape missing" look; and
// (2) very close to the poles (looking almost exactly straight up or down),
// the camera's forward direction and its fixed world "up" vector become
// nearly parallel - a textbook orbit-camera singularity ("gimbal lock")
// where the controls' own internal right/up vectors collapse toward zero
// length and the view can genuinely break (confirmed by testing: rotating
// all the way to near-vertical and then zooming could blank the scene
// entirely). That part is a real numerical limit of this control scheme,
// not just a matter of taste - so the margin here stays generous enough to
// stay well clear of it, even though the fix in (1) alone would have
// allowed going much closer to the pole.
const MIN_PHI = 0.7;
const MAX_PHI = Math.PI - 0.7;

// Helix's own left-click-drag still ignores phi entirely (see the
// "activeLayoutKey !== 'helix'" check in setupManualRotate's pointermove
// handler) - a narrow-but-nonzero clamp was tried there first, and dragging
// the Helix still read as "rotating crazily" even with only a small
// remaining tilt range, because that tilt combined with theta spinning
// freely at the same time from one diagonal drag. Locking phi outright for
// THAT one gesture is what actually makes a drag read as "turn the coil in
// place", full stop.
//
// The arrow-key/nav-pad up/down step is a different, single-axis-at-a-time
// gesture (no diagonal combination possible), so it doesn't have that
// problem - Helix's pad uses this same clamp range as every other shape
// (see handleDirectionalInput's helix branch), tilting the viewing angle up
// and down same as Sphere/Grid, purely by orbiting the camera around the
// coil's own fixed center.
//
// Single shared place both the drag-rotate handler and the arrow-key/pad
// step use to decide how far up/down every shape is allowed to tilt - so
// the two can never disagree with each other.
function getPhiClampRange( layoutKey ) {

	return { min: MIN_PHI, max: MAX_PHI };

}

// The person must sign in with Google before the visualization appears -
// this is the actual login gate required by the assignment (Image A).
// startApp() only runs once Google confirms who they are.
initGoogleSignIn( ( googleProfile ) => {

	console.log( 'Login successful, starting app for:', googleProfile.name );
	startApp( googleProfile );

} );

async function startApp( googleProfile ) {

	document.getElementById( 'login-screen' ).classList.add( 'hidden' );
	document.getElementById( 'app' ).classList.remove( 'hidden' );

	// Sign-in succeeding doesn't mean there's anything to look at yet - the
	// Google Sheets fetch this kicks off next is a real network round trip
	// (typically a second or two, longer on a slow connection), and until
	// it resolves the only thing on screen was the empty toolbar/nav over a
	// plain black container - which reads as "did this break?" rather than
	// "still working on it". This overlay (hidden again in the finally
	// block below, once there's an actual shape to show or a real error
	// message replacing it) is what fills that gap honestly.
	document.getElementById( 'loading-overlay' ).classList.remove( 'fade-out' );

	let people;

	try {

		people = await getData();
		lastRefreshTime = new Date();

	} catch ( err ) {

		console.error( 'Failed to load data from Google Sheets:', err );

		// The error message below replaces #container's own content directly,
		// so the loading spinner needs to come down first - otherwise it'd
		// sit stuck on screen, spinning forever, on top of a "Try Again"
		// button that already works fine underneath it.
		document.getElementById( 'loading-overlay' ).classList.add( 'fade-out' );

		// A 403 is a real, permanent permissions problem (the Sheet's
		// sharing or the API key itself) - worth telling the person to go
		// check that. Anything else (503, 429, a dropped connection, etc.)
		// already survived several automatic retries in dataLoader.js and
		// is most likely just a transient hiccup on Google's side, so the
		// advice - and the fix - is simply to try again, not to go second-
		// guess sharing settings that are probably already correct.
		const isPermissionError = /\b403\b/.test( err.message );
		const guidance = isPermissionError
			? `Check that the Sheet's sharing is set to "Anyone with the link" and the API key is valid.`
			: `This is usually a brief, temporary hiccup on Google's side (not a problem with your sharing settings or API key) - it typically resolves itself within a few seconds.`;

		document.getElementById( 'container' ).innerHTML =
			`<div style="color:#fff;text-align:center;padding-top:100px;font-family:sans-serif">` +
			`Could not load data from Google Sheets.<br><br>` +
			`<span style="color:#ff9500;font-size:13px">${ err.message }</span><br><br>` +
			`${ guidance }<br><br>` +
			`<button id="data-load-retry" style="background:transparent;border:1px solid rgba(127,255,255,0.6);color:rgba(200,255,255,0.9);padding:8px 20px;border-radius:4px;font-size:13px;cursor:pointer">Try Again</button>` +
			`</div>`;

		document.getElementById( 'data-load-retry' ).addEventListener( 'click', () => startApp( googleProfile ) );
		return;

	}

	// Sort by net worth (highest first) so tiles of similar color end up next to
	// each other in every layout - this makes the red/orange/green pattern much
	// easier to actually read, instead of colors being scattered randomly.
	people = [ ...people ].sort( ( a, b ) => b.netWorth - a.netWorth );
	peopleData = people;

	init( people );
	animate();

	document.getElementById( 'loading-overlay' ).classList.add( 'fade-out' );

}

function init( people ) {

	// Far plane raised well past the old 10000: Grid's narrower FOV (see
	// GRID_FOV above) needs the camera to sit much farther back to keep the
	// shape the same apparent size - easily beyond the old far plane, which
	// would have silently clipped the whole shape out of view.
	camera = new THREE.PerspectiveCamera( BASE_FOV, window.innerWidth / window.innerHeight, 1, 100000 );
	camera.position.z = 3400;

	fitCameraToWindow();

	scene = new THREE.Scene();

	// Build one tile per person, starting at a random scattered position.
	people.forEach( ( person, i ) => {

		const objectCSS = buildTile( person, i, showProfile );
		objectCSS.position.x = Math.random() * 4000 - 2000;
		objectCSS.position.y = Math.random() * 4000 - 2000;
		objectCSS.position.z = Math.random() * 4000 - 2000;
		scene.add( objectCSS );

		// Which Grid depth-layer this tile belongs to - used for the arrow-key
		// layer stepping. Doesn't affect any other layout.
		objectCSS.element._gridLayer = Math.floor( i / ( GRID_WIDTH * GRID_HEIGHT ) ) + 1;

		objects.push( objectCSS );

	} );

	rebuildTargets( people.length );

	renderer = new CSS3DRenderer();
	renderer.setSize( window.innerWidth, window.innerHeight );
	document.getElementById( 'container' ).appendChild( renderer.domElement );

	// CSS3DRenderer privately builds two wrapper divs around every tile it
	// manages - renderer.domElement (just appended above), and one level
	// inside that, a second div it writes the live camera transform onto
	// every single frame (see three.js's own CSS3DRenderer.js - this inner
	// element isn't exposed as a public property, so this reaches in by
	// fixed DOM position, which is safe here only because that nesting is
	// built once in the renderer's constructor and never rebuilt for its
	// whole lifetime). Every one of the 200 tiles sits directly inside THIS
	// element, not inside renderer.domElement itself.
	//
	// This is the actual, real fix for "sharp while rotating, soft again
	// the moment it's still": Chrome (and other browsers) rasterize a 3D-
	// transformed layer at full quality once it's confident the layer is
	// actively being composited on the GPU, and can fall back to a lower-
	// fidelity path for a layer it doesn't consider worth keeping promoted.
	// The earlier attempt at this fix (a per-frame settle-detector forcing
	// a sub-pixel nudge-and-revert through the camera) tried to trigger
	// that promotion indirectly and didn't hold up under real use. This is
	// the direct version: hint the browser to keep exactly ONE element -
	// this shared group all 200 tiles live inside - GPU-composited. That's
	// deliberately NOT the same thing the comment above .element in
	// style.css describes trying and reverting: that was `will-change:
	// transform` on all 400 individual tile/face elements (400 separate
	// compositor layers, held open for the whole session, which is the
	// specific overload MDN's own guidance warns against). One layer for
	// the whole group, instead of 400 for its individual members, is a
	// completely different order of cost - this is the standard, textbook
	// way to use will-change on a group of many moving children.
	cameraGroupElement = renderer.domElement.firstElementChild && renderer.domElement.firstElementChild.firstElementChild;
	if ( cameraGroupElement ) cameraGroupElement.style.willChange = 'transform';

	controls = new TrackballControls( camera, renderer.domElement );
	controls.noZoom = true;    // we handle zoom ourselves (see onWheelZoom) - one
	                           // consistent, simple, centered zoom for every shape
	controls.noPan = true;     // we handle pan ourselves too (see setupManualPan) -
	                           // mixing our own right-click pan with the library's
	                           // built-in pan was causing it to get stuck in "pan mode"
	// Left-drag rotate is ALSO handled ourselves now (see setupManualRotate) -
	// the library's own rotate relies on pointer capture plus listeners that
	// only live on the renderer's own DOM node. Our on-screen buttons
	// (menu/nav-pad/toolbar) are separate sibling elements layered on top of
	// that node, and releasing the mouse over one of them could leave the
	// library's internal drag state stuck "on" - which is exactly what
	// caused the camera to keep spinning on its own after you'd already let
	// go of the mouse. Our own version uses a single window-wide "mouse up
	// anywhere ends the drag" rule (the same reliable pattern the right-click
	// pan below already used, which is why panning never had this problem).
	controls.noRotate = true;
	controls.staticMoving = true; // rotation stops the instant you release the mouse -
	                               // no drifting/momentum

	// Stop the browser's right-click menu from popping up, since right-click
	// is used for panning instead.
	renderer.domElement.addEventListener( 'contextmenu', ( e ) => e.preventDefault() );

	renderer.domElement.addEventListener( 'wheel', onWheelZoom, { passive: false } );
	setupManualRotate();
	setupManualPan();

	// Click detection for tiles: we deliberately do NOT rely on a listener
	// attached to each tile directly. Three.js's camera-drag controls capture
	// pointer events at the container level while dragging, which silently
	// prevents individual tiles from ever receiving their own pointer events.
	// Instead, we track down/up positions on the container itself, and if the
	// mouse barely moved (a click, not a drag), we ask the browser directly
	// "what's actually at these exact screen coordinates" - this sidesteps
	// the capture issue entirely.
	let pointerDownPos = null;

	renderer.domElement.addEventListener( 'pointerdown', ( e ) => {

		pointerDownPos = { x: e.clientX, y: e.clientY };

	} );

	renderer.domElement.addEventListener( 'pointerup', ( e ) => {

		if ( ! pointerDownPos ) return;

		const movedX = Math.abs( e.clientX - pointerDownPos.x );
		const movedY = Math.abs( e.clientY - pointerDownPos.y );
		pointerDownPos = null;

		if ( movedX > 5 || movedY > 5 ) return; // was a drag/rotate, not a click

		const el = document.elementFromPoint( e.clientX, e.clientY );
		const tileEl = el ? el.closest( '.element' ) : null;

		if ( tileEl && tileEl._person ) {

			console.log( 'Tile clicked:', tileEl._person.name );
			showProfile( tileEl._person );

		}

	} );

	document.getElementById( 'table' ).addEventListener( 'click', () => switchLayout( 'table' ) );
	document.getElementById( 'sphere' ).addEventListener( 'click', () => switchLayout( 'sphere' ) );
	document.getElementById( 'helix' ).addEventListener( 'click', () => switchLayout( 'helix' ) );
	document.getElementById( 'grid' ).addEventListener( 'click', () => switchLayout( 'grid' ) );

	document.getElementById( 'reset-view-icon' ).addEventListener( 'click', resetCamera );
	document.getElementById( 'fit-view-icon' ).addEventListener( 'click', fitToPanel );
	document.getElementById( 'grid-layer-toggle' ).addEventListener( 'click', toggleGridLayerMode );
	document.getElementById( 'refresh-data' ).addEventListener( 'click', refreshData );
	document.getElementById( 'sign-out' ).addEventListener( 'click', signOut );

	// Arrow-pad icons call the exact same function as the keyboard arrow keys -
	// one shared code path, so the two can never behave differently.
	document.getElementById( 'rotate-left' ).addEventListener( 'click', () => handleDirectionalInput( 'left' ) );
	document.getElementById( 'rotate-right' ).addEventListener( 'click', () => handleDirectionalInput( 'right' ) );
	document.getElementById( 'rotate-up' ).addEventListener( 'click', () => handleDirectionalInput( 'up' ) );
	document.getElementById( 'rotate-down' ).addEventListener( 'click', () => handleDirectionalInput( 'down' ) );
	document.getElementById( 'zoom-in' ).addEventListener( 'click', () => zoomCameraStep( 0.85 ) );
	document.getElementById( 'zoom-out' ).addEventListener( 'click', () => zoomCameraStep( 1.15 ) );

	document.getElementById( 'insights-toggle' ).addEventListener( 'click', toggleInsights );
	document.getElementById( 'insights-close' ).addEventListener( 'click', () => {

		document.getElementById( 'insights-panel' ).classList.add( 'hidden' );

	} );

	document.getElementById( 'help-button' ).addEventListener( 'click', () => {

		document.getElementById( 'help-overlay' ).classList.remove( 'hidden' );

	} );
	document.getElementById( 'help-close' ).addEventListener( 'click', () => {

		document.getElementById( 'help-overlay' ).classList.add( 'hidden' );

	} );
	document.getElementById( 'help-overlay' ).addEventListener( 'click', ( e ) => {

		if ( e.target.id === 'help-overlay' ) document.getElementById( 'help-overlay' ).classList.add( 'hidden' );

	} );

	document.getElementById( 'profile-close' ).addEventListener( 'click', hideProfile );
	document.getElementById( 'profile-prev' ).addEventListener( 'click', () => stepProfile( -1 ) );
	document.getElementById( 'profile-next' ).addEventListener( 'click', () => stepProfile( 1 ) );
	document.getElementById( 'profile-modal' ).addEventListener( 'click', ( e ) => {

		if ( e.target.id === 'profile-modal' ) hideProfile();

	} );

	window.addEventListener( 'keydown', onKeyDown );

	// Matches the `layout-<name>` class switchLayout() applies on every
	// later switch (see there for why - it's what scopes Sphere/Helix's
	// smaller hover-zoom in style.css) - Table is the default first view,
	// and it never goes through switchLayout() to get here.
	document.getElementById( 'container' ).classList.add( 'layout-table' );

	transform( targets.table, 2000 );
	resetCamera();

	window.addEventListener( 'resize', onWindowResize );

}

// Recomputes all four layouts' target positions and the Grid's total layer
// count from the current people count - called on first load and again
// every time Refresh Data brings in a different number of rows.
function rebuildTargets( count ) {

	targets = {
		table: buildTableTargets( count ),
		sphere: buildSphereTargets( count ),
		helix: buildHelixTargets( count ),
		grid: buildGridTargets( count )
	};

	totalGridLayers = Math.ceil( count / ( GRID_WIDTH * GRID_HEIGHT ) );
	renderGridLayerDots();

	// If we were mid-way through stepping Grid layers and the data shrank so
	// that layer no longer exists, fall back to showing the whole Grid
	// instead of pointing at now-empty space.
	if ( currentGridLayer !== null && currentGridLayer > totalGridLayers ) {

		currentGridLayer = null;
		gridLayerModeActive = false;

	}

}

// Switches to a different layout shape - one single place that handles
// resetting Grid's layer-stepping state, so leaving Grid always cleanly
// shows every tile again.
function switchLayout( layoutKey ) {

	// Re-clicking the layout that's ALREADY active - the normal way to exit
	// Grid's layer-stepping and see everything again - doesn't need to move
	// a single tile: they're already sitting at exactly these positions,
	// only their opacity changed while stepping. Re-running the full
	// 2-second, 200-tile position/rotation tween anyway was pure wasted
	// work stacked right on top of the opacity-restore transition and the
	// camera reframe, all firing at once - a real, avoidable source of the
	// stutter right after clicking GRID again to leave stepping mode.
	const isReselectingSameLayout = ( layoutKey === activeLayoutKey );

	activeLayoutKey = layoutKey;

	// A `layout-<name>` class on the container so CSS can tell which shape
	// is active (see the Sphere/Helix hover-zoom override in style.css -
	// those two curved, densely-packed shapes need a smaller hover-zoom
	// amount than Table/Grid's generously-spaced flat layouts, or the
	// enlarged tile routinely pushes part of itself past the window edge
	// or under a neighboring tile). One class replaced each switch, so
	// there's never more than one active at a time.
	const container = document.getElementById( 'container' );
	container.classList.remove( 'layout-table', 'layout-sphere', 'layout-helix', 'layout-grid' );
	container.classList.add( `layout-${ layoutKey }` );

	// Grid's camera uses its own, much narrower field of view (see GRID_FOV) -
	// re-applying it here, right when the active shape actually changes, is
	// what makes that "telephoto" effect real on the camera itself, not just
	// in the distance math used to frame it. Every other shape shares the
	// normal FOV, so leaving Grid puts it back.
	fitCameraToWindow();

	// Force the depth cue (if the new shape uses one) to recompute at least
	// once against this shape's actual camera position, rather than
	// possibly comparing against a leftover position from whatever shape
	// was active before.
	lastDepthCueCameraPos = null;

	if ( layoutKey === 'grid' ) {

		// Always start a fresh Grid view in its real default: the whole 3D
		// shape, every layer at once, Layer mode off - never mid-step from
		// whatever was left over from a previous visit.
		currentGridLayer = null;
		gridLayerModeActive = false;
		applyGridLayerVisibility();
		updateGridLayerUI();

	} else {

		// CRITICAL: leaving Grid must fully restore every tile's visibility.
		// Without this, any tiles hidden while stepping through Grid's layers
		// stayed invisible forever afterward, even on completely different
		// shapes - that's what caused tiles to "go missing" on Table/Sphere/Helix.
		currentGridLayer = null;
		gridLayerModeActive = false;

		// Table, Sphere, and Helix all reset to fully solid/sharp/clickable
		// here now. Sphere and Helix used to need their own special-case
		// branch that ran a continuous JS "depth cue" (dimming tiles by raw
		// distance from the camera) to fake a near/far distinction - that's
		// gone now (see maybeUpdateDepthCue and tileFactory.js's buildTile):
		// every tile is a genuine two-sided card, and the browser's own
		// `backface-visibility: hidden` (see .face in style.css) shows the
		// strong-colored front or the dimmed back automatically, purely from
		// each tile's real 3D orientation - no per-frame recompute needed,
		// and no risk of a tile that's genuinely facing the camera getting
		// dimmed just for sitting a little farther back than average (the
		// old cue's actual bug). So the reset here is simple and uniform:
		// clear whatever opacity/hard-hidden state Grid's own layer-stepping
		// may have left behind, and make sure every tile can be clicked again.
		objects.forEach( ( obj ) => {

			obj.element.style.opacity = '1';
			obj.element.style.pointerEvents = 'auto';
			obj.element.style.filter = 'none';
			obj.element.classList.remove( 'is-hard-hidden' );

		} );

		// updateGridLayerUI checks activeLayoutKey itself (already pointed at
		// the new, non-Grid shape at this point) and hides the toggle
		// button/status/dots and clears the up-down/left-right icon styling
		// on its own - one function, whether entering or leaving Grid.
		updateGridLayerUI();

	}

	if ( ! isReselectingSameLayout ) transform( targets[ layoutKey ], 2000 );
	resetCamera();

}

// Handles left-click-drag rotate ourselves (see the long comment where this
// is called, in init(), for why). The rule is simple and hard to get stuck:
// left button down on the 3D view starts rotating, and releasing the mouse
// button ANYWHERE on the page - even outside the 3D view entirely - ends it.
// That "anywhere" part, via listeners on window rather than just the
// renderer's own element, is what makes it reliable.
function setupManualRotate() {

	let isRotating = false;
	let lastX = 0, lastY = 0;

	// Cheap, direct spherical rotate around the current camera target -
	// the exact same math the arrow-key/nav-pad rotate already uses (see
	// rotateCameraStep), just driven continuously by drag distance instead
	// of a fixed step. No quaternion/damping math, so it costs very little
	// per pointer move - part of what keeps the drag itself feeling smooth.
	const ROTATE_SPEED = 0.005;

	renderer.domElement.addEventListener( 'pointerdown', ( e ) => {

		if ( e.button !== 0 ) return; // only the left mouse button rotates
		isRotating = true;
		lastX = e.clientX;
		lastY = e.clientY;
		setDraggingState( true );

	} );

	window.addEventListener( 'pointermove', ( e ) => {

		if ( ! isRotating ) return;

		const dx = e.clientX - lastX;
		const dy = e.clientY - lastY;
		lastX = e.clientX;
		lastY = e.clientY;

		const offset = new THREE.Vector3().subVectors( camera.position, controls.target );
		const spherical = new THREE.Spherical().setFromVector3( offset );

		spherical.theta -= dx * ROTATE_SPEED;

		// Helix deliberately ignores vertical drag entirely (no phi change
		// at all), instead of clamping it to a narrow range the way it used
		// to. Reported behavior: even a small remaining tilt range,
		// combined with theta spinning freely, still read as "rotating
		// crazily" rather than a controlled turn - a diagonal drag tilted
		// AND spun the coil at once, and the double-helix's whole reason
		// for turning is horizontal in the first place (spin around the
		// axis to swap which strand faces you - see buildHelixTargets in
		// layouts.js). Locking phi outright makes a Helix drag behave
		// exactly like "turn a barrel in place": purely a spin, always
		// framed the same way, that only ever changes WHICH data is
		// currently facing you, never how the coil itself looks tilted on
		// screen. Vertical mouse movement is simply inert here - tilting the
		// viewing angle up/down is still available via the up/down arrow
		// keys or nav-pad (a single-axis step, not a drag - see the phi
		// comment above getPhiClampRange), just not tied to this drag
		// gesture.
		if ( activeLayoutKey !== 'helix' ) {

			const phiRange = getPhiClampRange( activeLayoutKey );
			spherical.phi = THREE.MathUtils.clamp( spherical.phi - dy * ROTATE_SPEED, phiRange.min, phiRange.max );

		}

		offset.setFromSpherical( spherical );
		camera.position.copy( controls.target ).add( offset );
		controls.update();

		// No render() here on purpose - the animate() loop already renders
		// every frame, so this just updates the camera's numbers and lets
		// the next frame pick it up. Rendering directly from every single
		// pointermove (which can fire far more often than the screen can
		// actually redraw) was doing repeated wasted work and was a real
		// part of the drag feeling laggy.

	} );

	// Deliberately on window, and deliberately for pointerup/pointercancel/
	// blur all at once: releasing the mouse over one of the on-screen
	// buttons, dragging off the browser window, or alt-tabbing away mid-drag
	// must all still end the rotate - this is the actual fix for "keeps
	// rotating even after I've let go of the mouse".
	const stopRotating = () => { isRotating = false; setDraggingState( false ); };

	window.addEventListener( 'pointerup', stopRotating );
	window.addEventListener( 'pointercancel', stopRotating );
	window.addEventListener( 'blur', stopRotating );

}

// While actively dragging (rotate or pan), briefly turn off tiles' hover
// zoom/pointer handling. With ~200 tiles on screen, the cursor sweeping
// across them during a drag was constantly triggering hover style
// recalculation that had nothing to do with the drag itself - a second,
// separate cause of the dragging feeling laggy, fixed here by simply not
// doing that work while a drag is in progress.
function setDraggingState( isDragging ) {

	document.getElementById( 'container' ).classList.toggle( 'is-dragging', isDragging );

}

// Handles right-click-drag panning ourselves, entirely separately from the
// library's rotate handling - this keeps the two from ever interfering with
// each other, which is what was causing rotate to get "stuck" in pan mode.
function setupManualPan() {

	let isPanning = false;
	let lastX = 0, lastY = 0;

	renderer.domElement.addEventListener( 'pointerdown', ( e ) => {

		if ( e.button !== 2 ) return; // only the right mouse button pans
		isPanning = true;
		lastX = e.clientX;
		lastY = e.clientY;
		setDraggingState( true );

	} );

	window.addEventListener( 'pointermove', ( e ) => {

		if ( ! isPanning ) return;

		const dx = e.clientX - lastX;
		const dy = e.clientY - lastY;
		lastX = e.clientX;
		lastY = e.clientY;

		// Scale the pan speed by current distance from the target, so it feels
		// consistent whether you're zoomed in close or far out.
		const distance = camera.position.distanceTo( controls.target );
		const panScale = distance * 0.0015;

		camera.updateMatrix();
		const right = new THREE.Vector3().setFromMatrixColumn( camera.matrix, 0 );
		const up = new THREE.Vector3().setFromMatrixColumn( camera.matrix, 1 );

		const offset = right.multiplyScalar( - dx * panScale ).add( up.multiplyScalar( dy * panScale ) );

		camera.position.add( offset );
		controls.target.add( offset );
		controls.update();
		// No render() here either, for the same reason as rotate above -
		// the animate() loop's own steady per-frame render covers it.

	} );

	const stopPanning = () => { isPanning = false; setDraggingState( false ); };

	window.addEventListener( 'pointerup', stopPanning );
	window.addEventListener( 'pointercancel', stopPanning );
	window.addEventListener( 'blur', stopPanning );

}

// ==================================================================
// SHARED DIRECTIONAL INPUT - the single function both the keyboard
// arrow keys and the on-screen arrow-pad icons call. Behavior changes
// depending on the active shape, but keyboard and on-screen icons
// always do the IDENTICAL thing, since they share this exact code.
// ==================================================================
function handleDirectionalInput( direction ) {

	if ( activeLayoutKey === 'table' ) {

		panCameraStep( direction );

	} else if ( activeLayoutKey === 'sphere' ) {

		if ( direction === 'left' ) rotateCameraStep( 'theta', - 1 );
		else if ( direction === 'right' ) rotateCameraStep( 'theta', 1 );
		else if ( direction === 'up' ) rotateCameraStep( 'phi', - 1 );
		else if ( direction === 'down' ) rotateCameraStep( 'phi', 1 );

	} else if ( activeLayoutKey === 'helix' ) {

		// All four directions orbit the camera around the coil's own fixed
		// center - left/right spin around the vertical axis to bring the far
		// strand into view, up/down tilt the viewing angle up/down, the same
		// way Sphere and Grid's pad already work. Nothing here ever moves
		// controls.target, so the coil itself never drifts on screen - only
		// the angle it's viewed from changes. (This used to call climbHelix(),
		// which panned the target itself up/down - a real, if small, drift
		// each press. Panning is now exclusively a right-click-drag gesture -
		// see setupManualPan - so rotating never moves the shape.)
		if ( direction === 'left' ) rotateCameraStep( 'theta', - 1 );
		else if ( direction === 'right' ) rotateCameraStep( 'theta', 1 );
		else if ( direction === 'up' ) rotateCameraStep( 'phi', - 1 );
		else if ( direction === 'down' ) rotateCameraStep( 'phi', 1 );

	} else if ( activeLayoutKey === 'grid' ) {

		if ( gridLayerModeActive ) {

			// Layer mode: only left/right mean anything now (previous/next
			// layer - see the "is-layer-nav" highlight on those two icons
			// in updateGridLayerUI). Up/down are intentionally inert here
			// (see the "is-inactive" dimming on those two icons instead) -
			// there's nothing for them to do while only a single layer is
			// on screen at a time.
			if ( direction === 'left' ) stepGridLayer( - 1 );
			else if ( direction === 'right' ) stepGridLayer( 1 );

		} else {

			// Default Grid behaves exactly like Sphere now: a plain,
			// freely-orbitable 3D shape, every layer visible at once - so
			// the pad/keyboard just orbits the camera around it the same
			// way Sphere's does.
			if ( direction === 'left' ) rotateCameraStep( 'theta', - 1 );
			else if ( direction === 'right' ) rotateCameraStep( 'theta', 1 );
			else if ( direction === 'up' ) rotateCameraStep( 'phi', - 1 );
			else if ( direction === 'down' ) rotateCameraStep( 'phi', 1 );

		}

	}

}

function onKeyDown( event ) {

	const directionByKey = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' };
	const direction = directionByKey[ event.key ];
	if ( ! direction ) return;

	event.preventDefault();
	handleDirectionalInput( direction );

}

function panCameraStep( direction ) {

	const PAN_STEP = 150;

	switch ( direction ) {

		case 'left': camera.position.x -= PAN_STEP; controls.target.x -= PAN_STEP; break;
		case 'right': camera.position.x += PAN_STEP; controls.target.x += PAN_STEP; break;
		case 'up': camera.position.y += PAN_STEP; controls.target.y += PAN_STEP; break;
		case 'down': camera.position.y -= PAN_STEP; controls.target.y -= PAN_STEP; break;

	}

	controls.update();
	render();

}


// Steps Layer mode forward (+1) or backward (-1) by exactly one layer.
// Only meaningful once Layer mode is active (see toggleGridLayerMode) -
// calling this also turns Layer mode on if it somehow wasn't already,
// since "step to a specific layer" only makes sense while only one layer
// is meant to be on screen at a time.
function stepGridLayer( delta ) {

	const wasOverview = currentGridLayer === null;
	let newLayer;

	if ( wasOverview ) {

		newLayer = delta > 0 ? 1 : totalGridLayers;

	} else {

		newLayer = currentGridLayer + delta;

	}

	newLayer = THREE.MathUtils.clamp( newLayer, 1, totalGridLayers );
	goToGridLayer( newLayer, wasOverview );

}

// Jumps straight to a specific Grid layer, from anywhere - the overview, a
// different layer entirely, doesn't matter. Both stepGridLayer (arrow keys/
// pad, always a distance of exactly one layer) and clicking a layer dot
// (see renderGridLayerDots - can be any distance at all) funnel through
// here, so there's exactly one place that actually changes which layer is
// current - and the one place that turns Layer mode on, since "go to a
// specific layer" always implies it.
function goToGridLayer( layerNumber, isEnteringStepMode = false ) {

	const previousLayer = currentGridLayer;
	currentGridLayer = THREE.MathUtils.clamp( layerNumber, 1, totalGridLayers );
	gridLayerModeActive = true;

	const enteringStepMode = isEnteringStepMode || previousLayer === null;
	const jumpDistance = previousLayer === null ? Infinity : Math.abs( currentGridLayer - previousLayer );

	applyGridLayerVisibility();
	updateGridLayerUI();
	// A jump of more than one layer (entering stepping mode from the
	// overview, or clicking a dot several layers away) is a bigger visual
	// change than a single "next card" step, so it gets the calmer, longer
	// camera fly (see reframeGridView) instead of the snappy per-step one -
	// a multi-layer jump arriving in 450ms read as an abrupt cut rather
	// than a deliberate move.
	reframeGridView( enteringStepMode || jumpDistance > 1 );

}

// Turns Grid's opt-in "step through one layer at a time" mode on or off -
// wired to the #grid-layer-toggle button (see updateGridLayerUI for its
// styling, and index.html for its markup - it only ever appears while Grid
// is the active shape). OFF (Grid's real default) is every layer visible
// at once, freely orbitable, exactly like Sphere. ON narrows that down to
// exactly one layer on screen, previous/next-navigable - see
// applyGridLayerVisibility.
function toggleGridLayerMode() {

	gridLayerModeActive = ! gridLayerModeActive;

	if ( gridLayerModeActive ) {

		goToGridLayer( currentGridLayer || 1, true );

	} else {

		currentGridLayer = null;
		applyGridLayerVisibility();
		updateGridLayerUI();
		reframeGridView( true );

	}

}

function applyGridLayerVisibility() {

	// Grid is back to a genuine binary now, not a tunable "how many layers
	// deep" cap: either every tile is visible (Layer mode off - the real
	// default, see gridLayerModeActive), or exactly ONE layer is (Layer
	// mode on - currentGridLayer says which). `is-hard-hidden` (see
	// style.css) turns off the usual opacity transition specifically for
	// tiles hidden by Layer mode, so switching layers is a real instant
	// snap, not a 0.35s fade - a big part of what made changing Grid layers
	// look mushy/blurry rather than crisp back when this was tried with a
	// soft fade instead. Whatever IS visible still gets a light,
	// opacity-only recede by distance (see applyGridDepthFade below) - just
	// enough to read as "farther back" across however many layers are
	// showing, without touching color/brightness, since a Grid tile's own
	// color is exactly what net worth reads through (dimming it further
	// from here would visually compete with a tile's own coloring - see
	// tileFactory.js). That part DOES fade smoothly (the normal
	// transition, not is-hard-hidden) - it's a soft depth cue, not a
	// navigation snap.
	const visible = [];

	objects.forEach( ( obj ) => {

		const tileLayer = obj.element._gridLayer;
		const isHiddenByLayerMode = currentGridLayer !== null && tileLayer !== currentGridLayer;

		if ( isHiddenByLayerMode ) {

			obj.element.classList.add( 'is-hard-hidden' );
			obj.element.style.opacity = '0';
			obj.element.style.pointerEvents = 'none';

		} else {

			obj.element.classList.remove( 'is-hard-hidden' );
			obj.element.style.pointerEvents = 'auto';
			visible.push( obj );

		}

	} );

	applyGridDepthFade( visible );

}

// Grid-only, opacity-only "depth of field": the nearest visible layer stays
// fully opaque, and each layer behind it fades a bit more, purely in
// opacity - never brightness or saturation, since a Grid tile's color is
// exactly the net-worth color it's meant to be read at, at every depth
// (unlike Sphere/Helix, no tile here is ever facing away from the camera -
// Grid never rotates its tiles - so there's no "back face" concept in play,
// just plain layers receding). Combined with the small per-layer stagger in
// layouts.js (buildGridTargets), this is what keeps Grid's real default -
// EVERY layer visible at once, a genuine full-depth 3D stack, not just a
// couple of front layers - reading as a legible fanned deck rather than
// clutter.
//
// Sphere and Helix no longer call this at all - their strong/dim read now
// comes from each tile's real two-sided geometry (see tileFactory.js /
// the .face rules in style.css), decided by the browser every frame for
// free, not recomputed here.
// Lowered again (0.55 -> 0.35 -> 0.22): Grid's default view can now show a
// real dataset's full 8-10 layers at once (not capped at a handful like
// before), so the back of that stack needs to fade further toward the
// background to stay readable as "the same shape's own depth" rather than
// competing with the front layer for attention.
const DEPTH_OPACITY_FLOOR = 0.22;
const DEPTH_EASING_POWER = 1.6;

// Opacity alone turned out not to be enough on its own: a tile fading to,
// say, 70% still has every one of its edges and its full name/details text
// rendered exactly as crisply as the front layer, just a bit lighter - and
// with up to 8-10 full layers of that all visible through the gaps between
// the front layer's own tiles at once, the result reads as a tangle of
// overlapping sharp text fragments, not "background." That's what was
// actually behind Grid's default view looking "blurry"/messy at a glance -
// not literal blur, but a genuine legibility problem from too much sharp,
// readable-looking detail competing for attention at once. Adding a real
// optical blur here - same 0-at-front eased depth term the opacity fade
// already computes, just fed into `filter: blur()` too - fixes that at the
// source: the front layer (t=0) stays perfectly crisp, and everything
// behind it now genuinely reads as a soft, receding background instead of
// a wall of half-legible overlapping names, the same way a real camera's
// depth of field does it.
const DEPTH_BLUR_MAX_PX = 3.5;

// How much real depth (in scene units) has to actually be present before
// the recede kicks in at full strength. Normalizing purely by the visible
// set's OWN min/max distance (see `range` below) works well for a shape
// with genuine depth (Sphere, Helix, Grid's default multi-layer view), but
// breaks down the moment the visible set is essentially flat - Grid's very
// last layer while stepping, for instance, is a single plane of tiles that
// are all almost exactly the same distance from the camera, so the only
// "range" left is a few tens of units of positional noise (corner tiles
// sitting a little farther from the camera than center ones, geometry that
// has nothing to do with depth). Stretching THAT tiny noise across the
// full 0-1 dim range made an entire single, perfectly readable layer look
// arbitrarily half-dimmed. Comparing the real range against this reference
// (comfortably smaller than one Grid layer-to-layer step, comfortably
// bigger than that per-tile positional noise) and scaling the whole effect
// down when there's nothing meaningful to show is what keeps a genuinely
// flat view (or near-flat, like Grid's last remaining layer) fully bright
// instead of arbitrarily dimmed.
const DEPTH_MEANINGFUL_RANGE = 180;

function applyGridDepthFade( objectList ) {

	if ( objectList.length === 0 ) return;

	let minDist = Infinity, maxDist = -Infinity;
	const distances = objectList.map( ( obj ) => {

		const d = camera.position.distanceTo( obj.position );
		if ( d < minDist ) minDist = d;
		if ( d > maxDist ) maxDist = d;
		return d;

	} );

	// Normalized against whatever the actual near/far spread is right now
	// (not a fixed guessed distance) - this is what keeps the effect
	// looking right at any zoom level, instead of needing to be re-tuned
	// per shape or per camera distance.
	const range = Math.max( 1, maxDist - minDist );
	const cueStrength = Math.min( 1, range / DEPTH_MEANINGFUL_RANGE );

	objectList.forEach( ( obj, i ) => {

		const linearT = ( distances[ i ] - minDist ) / range; // 0 = nearest, 1 = farthest
		const t = Math.pow( linearT, DEPTH_EASING_POWER ) * cueStrength; // eased - see comment above

		const opacity = 1 - t * ( 1 - DEPTH_OPACITY_FLOOR );

		obj.element.style.opacity = opacity.toFixed( 2 );
		obj.element.style.filter = t > 0.01 ? `blur(${ ( t * DEPTH_BLUR_MAX_PX ).toFixed( 2 ) }px)` : 'none';

	} );

}

// Throttles the (slightly pricier) depth-cue recompute to a few times a
// second instead of every single animation frame, called from animate().
// Position/rotation updates stay untouched at full frame rate - only this
// soft, secondary visual effect is rate-limited.
let lastDepthCueUpdate = 0;
let lastDepthCueCameraPos = null;
const DEPTH_CUE_THROTTLE_MS = 90;
const DEPTH_CUE_CAMERA_MOVE_EPSILON = 0.5;

function maybeUpdateDepthCue( timestamp ) {

	// Grid is the ONLY shape that still needs a per-frame recompute here.
	// Table has no real front/back at all (every tile sits at roughly the
	// same depth), and Sphere/Helix no longer need one either - their
	// strong/dim read now comes from each tile's real two-sided geometry
	// (see tileFactory.js / the .face rules in style.css), which the
	// browser resolves itself every frame from each tile's actual 3D
	// orientation, at zero JS cost. Grid still needs this because it also
	// has to respect layer-stepping (hide whatever's been "turned past" or
	// is too deep to show - see applyGridLayerVisibility) on top of its own
	// opacity-only depth fade, and the camera can orbit freely around it at
	// any moment.
	if ( activeLayoutKey !== 'grid' ) return;
	if ( timestamp - lastDepthCueUpdate < DEPTH_CUE_THROTTLE_MS ) return;

	// Skip the recompute entirely while the camera hasn't actually moved -
	// by far the most common state (sitting there looking, not actively
	// dragging). Without this check, re-running the exact same distance
	// math and writing the exact same opacity strings every ~90ms still
	// restarts each tile's CSS transition over and over, purely from the
	// values being reassigned rather than genuinely changing - real,
	// measurable idle overhead (traced to a 130ms+ frame spike on Grid)
	// for a view that was never supposed to be doing any per-frame work at all.
	if ( lastDepthCueCameraPos && camera.position.distanceTo( lastDepthCueCameraPos ) < DEPTH_CUE_CAMERA_MOVE_EPSILON ) {

		lastDepthCueUpdate = timestamp;
		return;

	}

	lastDepthCueUpdate = timestamp;
	lastDepthCueCameraPos = camera.position.clone();

	applyGridLayerVisibility();

}

// Covers every piece of Grid's own UI: the #grid-layer-toggle button
// itself (only ever shown while Grid is the active shape - the "extra
// button" that appears specifically for Grid), the status line and layer
// dots (only shown once Layer mode is actually on), and the rotate-pad
// icons' styling (up/down dimmed "off", left/right highlighted to show
// they've taken on a different job - see the .is-inactive/.is-layer-nav
// rules in style.css). One function for all of it, called from every place
// any of this state can change, so none of these pieces can ever drift out
// of sync with each other.
function updateGridLayerUI() {

	const toggleBtn = document.getElementById( 'grid-layer-toggle' );
	const statusEl = document.getElementById( 'grid-layer-status' );
	const dotsEl = document.getElementById( 'grid-layer-dots' );
	const upBtn = document.getElementById( 'rotate-up' );
	const downBtn = document.getElementById( 'rotate-down' );
	const leftBtn = document.getElementById( 'rotate-left' );
	const rightBtn = document.getElementById( 'rotate-right' );

	if ( activeLayoutKey !== 'grid' ) {

		toggleBtn.classList.add( 'hidden' );
		statusEl.classList.add( 'hidden' );
		dotsEl.classList.add( 'hidden' );
		upBtn.classList.remove( 'is-inactive' );
		downBtn.classList.remove( 'is-inactive' );
		leftBtn.classList.remove( 'is-layer-nav' );
		rightBtn.classList.remove( 'is-layer-nav' );
		return;

	}

	// The toggle button itself is Grid-only chrome - visible any time Grid
	// is active, regardless of whether Layer mode is currently on.
	toggleBtn.classList.remove( 'hidden' );
	toggleBtn.classList.toggle( 'active', gridLayerModeActive );

	// Up/down have nothing to do while only one layer is ever on screen at
	// a time, so they're shown dimmed/"off" rather than just silently not
	// responding - left/right take on a different job (previous/next
	// layer instead of rotate), so they're highlighted instead, the same
	// visual language the rest of the toolbar already uses for "this
	// control means something different right now".
	upBtn.classList.toggle( 'is-inactive', gridLayerModeActive );
	downBtn.classList.toggle( 'is-inactive', gridLayerModeActive );
	leftBtn.classList.toggle( 'is-layer-nav', gridLayerModeActive );
	rightBtn.classList.toggle( 'is-layer-nav', gridLayerModeActive );

	if ( ! gridLayerModeActive ) {

		statusEl.classList.add( 'hidden' );
		dotsEl.classList.add( 'hidden' );
		return;

	}

	statusEl.classList.remove( 'hidden' );
	dotsEl.classList.remove( 'hidden' );
	statusEl.textContent = `Layer ${ currentGridLayer } of ${ totalGridLayers }`;

	Array.from( dotsEl.children ).forEach( ( dot, i ) => {

		dot.classList.toggle( 'active', currentGridLayer === i + 1 );

	} );

}

// Builds the row of small clickable dots - one per Grid layer - that let
// you jump straight to any layer instead of stepping through the ones in
// between one at a time. Rebuilt whenever the data's total layer count
// changes (first load, and again after Refresh Data if the row count
// changed) rather than once at startup, since totalGridLayers isn't known
// until the real data has loaded.
function renderGridLayerDots() {

	const dotsEl = document.getElementById( 'grid-layer-dots' );
	dotsEl.innerHTML = '';

	for ( let i = 1; i <= totalGridLayers; i ++ ) {

		const dot = document.createElement( 'button' );
		dot.className = 'grid-layer-dot';
		dot.type = 'button';
		dot.title = `Layer ${ i }`;
		dot.addEventListener( 'click', () => goToGridLayer( i ) );
		dotsEl.appendChild( dot );

	}

}

// Re-frames the camera on whatever's currently visible in Grid: the WHOLE
// stack (every layer) with Layer mode off, or just the one current layer
// with it on - see getFramingTargets.
//
// `isBigMove` picks which of two durations this reframe uses. A single
// "next card" step (arrow key/pad, one layer at a time, the common case)
// uses GRID_STEP_FLY_DURATION - short and snappy, so repeated stepping
// feels immediate rather than laggy. Anything that's a bigger visual jump -
// entering stepping mode from the overview, or clicking a layer dot
// several layers away from the current one - uses the slower, more normal
// duration instead: arriving at a big jump in the same short 450ms as a
// one-layer step read as an abrupt cut, not a deliberate move, since so
// much more of the view changes at once.
function reframeGridView( isBigMove = false ) {

	const subset = getFramingTargets( 'grid' );
	const { center, distance } = computeFraming( subset.length ? subset : targets.grid, getFramingPadding( 'grid' ), GRID_FOV );

	flyCameraTo( center, distance, Math.PI / 2, isBigMove ? 700 : GRID_STEP_FLY_DURATION );

}

// Picks which target positions the camera should actually size/center
// itself around for a given shape. For every shape except Grid, that's
// simply every tile - Grid needs its own logic because how much of it is
// actually ON SCREEN right now depends on whether Layer mode is active
// (see applyGridLayerVisibility/gridLayerModeActive):
// - Layer mode OFF (the real default): every layer is visible at once, a
//   genuine full-depth 3D shape - so frame on the WHOLE thing, exactly like
//   Sphere or Helix get framed on their own full set of targets.
// - Layer mode ON: only the current layer is visible - so frame on just
//   that one layer's own footprint, the same way Table gets framed on its
//   own flat content.
function getFramingTargets( layoutKey ) {

	if ( layoutKey === 'grid' ) {

		if ( currentGridLayer !== null ) {

			const perLayer = GRID_WIDTH * GRID_HEIGHT;
			return targets.grid.slice( ( currentGridLayer - 1 ) * perLayer, currentGridLayer * perLayer );

		}

		return targets.grid;

	}

	return targets[ layoutKey ] && targets[ layoutKey ].length ? targets[ layoutKey ] : targets.table;

}

// Shared rotate step - orbits the camera around whatever it's currently
// looking at. Used by handleDirectionalInput (Sphere/Helix) and available
// for anything else that needs a discrete rotate nudge.
function rotateCameraStep( axis, sign ) {

	const ROTATE_STEP = 0.15;
	const offset = new THREE.Vector3().subVectors( camera.position, controls.target );
	const spherical = new THREE.Spherical().setFromVector3( offset );

	if ( axis === 'theta' ) spherical.theta += sign * ROTATE_STEP;
	if ( axis === 'phi' ) {

		const phiRange = getPhiClampRange( activeLayoutKey );
		spherical.phi = THREE.MathUtils.clamp( spherical.phi + sign * ROTATE_STEP, phiRange.min, phiRange.max );

	}

	offset.setFromSpherical( spherical );
	camera.position.copy( controls.target ).add( offset );
	controls.update();
	render();

}

// Shared zoom step - percentage-based, so a button press feels the same
// regardless of current distance. Used by the +/- icons; the scroll wheel
// (onWheelZoom below) uses the same math directly.
function zoomCameraStep( factor ) {

	const { min, max } = getZoomLimits();
	const distance = camera.position.distanceTo( controls.target );
	const newDistance = THREE.MathUtils.clamp( distance * factor, min, max );
	const dir = new THREE.Vector3().subVectors( camera.position, controls.target ).normalize();

	camera.position.copy( controls.target ).addScaledVector( dir, newDistance );
	controls.update();
	render();

}

// Zoom limits calculated relative to the CURRENT shape's own ideal viewing
// distance, rather than one fixed number shared by all four shapes - this
// way, retuning any one shape's size later can't silently make its zoom
// range wrong, since the range always follows that shape's own math.
function getZoomLimits() {

	const currentTargets = getFramingTargets( activeLayoutKey );
	const { distance } = computeFraming( currentTargets, getFramingPadding( activeLayoutKey ), getFramingFov( activeLayoutKey ) );

	if ( activeLayoutKey === 'grid' ) {

		// Grid's depth layers sit fairly close together - the same 0.15x
		// floor the other shapes use let the camera zoom in far enough to
		// end up actually IN BETWEEN layers, looking back out through
		// several of them at once from the inside: a chaotic overlapping
		// jumble rather than a clean close-up. The floor here is based on
		// how close the FRONT layer alone can comfortably fill the screen
		// instead - zoomed in as far as makes sense, but never past it.
		const perLayer = GRID_WIDTH * GRID_HEIGHT;
		const frontLayerOnly = targets.grid.slice( 0, perLayer );
		const frontLayerFraming = computeFraming( frontLayerOnly, 1.05, GRID_FOV );

		return { min: frontLayerFraming.distance, max: distance * 4 };

	}

	if ( activeLayoutKey === 'helix' ) {

		// Without a floor of its own, the generic 0.15x-of-fit-distance limit
		// let the camera zoom in far enough to end up INSIDE the coil's own
		// radius, looking back out through it from within - a wide, warped
		// "fisheye funnel" that doesn't read as a spiral at all (it's
		// the exact shape someone gets stuck in if they scroll-zoom in too
		// far and can no longer tell what they're looking at). Tying the
		// floor to the coil's own actual radius instead means the camera can
		// get close, but never so close it passes through the tube wall.
		return { min: Math.max( distance * 0.15, getHelixMinCameraDistance() * 1.3 ), max: distance * 4 };

	}

	return { min: distance * 0.15, max: distance * 4 };

}

// The coil's own radius, measured directly from its real target positions
// (rather than duplicating the RADIUS constant from layouts.js) - however
// the shape gets tuned later, the zoom floor above always follows it.
function getHelixMinCameraDistance() {

	let maxRadius = 0;

	targets.helix.forEach( ( t ) => {

		const radius = Math.hypot( t.position.x, t.position.z );
		if ( radius > maxRadius ) maxRadius = radius;

	} );

	return maxRadius;

}

// Plain mouse-wheel scrolling used to page Grid through its depth layers
// instead of zooming - meant to fix "I can't scroll to the end", but it
// caused a worse, opposite problem: a single normal scroll gesture
// (especially a trackpad, which can fire a dozen+ wheel events in well
// under a second) reliably overshot straight past every intermediate layer
// and landed on the very last one, every time - "I always scroll and end
// up in layer 10". Layer navigation now lives entirely in controls meant
// for discrete, deliberate steps (arrow keys/pad - one layer per press) and
// direct jumps (the layer dots below the Grid view - see
// renderGridLayerDots/goToGridLayer - click any dot to jump straight to
// that layer, no stepping through the ones in between required). The wheel
// goes back to doing exactly one thing on every shape, Grid included: zoom,
// centered on the cursor - simpler to predict, and it also means Grid no
// longer needs Ctrl/Cmd-to-zoom as a special case.
function onWheelZoom( event ) {

	event.preventDefault();

	const { min, max } = getZoomLimits();

	const rect = renderer.domElement.getBoundingClientRect();
	const ndcX = ( ( event.clientX - rect.left ) / rect.width ) * 2 - 1;
	const ndcY = - ( ( event.clientY - rect.top ) / rect.height ) * 2 + 1;

	zoomRaycaster.setFromCamera( { x: ndcX, y: ndcY }, camera );
	const dir = zoomRaycaster.ray.direction;

	const step = event.deltaY * 1.6;
	const newCamPos = camera.position.clone().addScaledVector( dir, - step );
	const newDistance = newCamPos.distanceTo( controls.target );

	if ( newDistance > min && newDistance < max ) {

		camera.position.copy( newCamPos );
		controls.target.addScaledVector( dir, - step );

	}

	controls.update();
	render();

}

// How much breathing room to leave around the framed shape, ON TOP OF the
// exact chrome-avoidance computeFraming already does via
// getSafeViewportRect below - this is just a small extra safety margin, not
// what actually keeps the shape off the toolbar/nav-pad/menu/legend (that's
// no longer padding-based guesswork at all - see computeFraming).
function getFramingPadding( layoutKey, tight = false ) {

	// Grid frames on the shape's own REAL geometry now (every tile's actual
	// final position, fan-out stagger included - see getFramingTargets),
	// not an approximated footprint, so it needs less of a hand-tuned
	// safety margin than it used to - just a little extra for ordinary
	// perspective convergence at the FOV's edges.
	if ( layoutKey === 'grid' ) return tight ? 1.03 : 1.08;
	return tight ? 1.02 : 1.05;

}

// Reads the ACTUAL on-screen position of every piece of persistent UI
// chrome - the top toolbar, the right-hand nav-pad, the bottom menu and
// legend, and (only while it's actually showing) Grid's own layer status/
// dots - and returns the rectangle of screen space left over once all of
// it is excluded. This is what computeFraming below fits shapes into,
// instead of the raw browser window: reading real, live
// getBoundingClientRect() geometry rather than hardcoded pixel guesses
// means this stays correct automatically if any of that chrome's own
// size ever changes (a longer status string, a narrower window wrapping
// the toolbar, etc.), instead of silently drifting out of sync with a
// hand-tuned constant the way the old padding-multiplier approach could.
function getSafeViewportRect() {

	let top = 0, bottom = window.innerHeight, left = 0, right = window.innerWidth;

	const toolbarRect = document.getElementById( 'top-toolbar' ).getBoundingClientRect();
	top = Math.max( top, toolbarRect.bottom );

	const navRect = document.getElementById( 'nav-pad' ).getBoundingClientRect();
	right = Math.min( right, navRect.left );

	const menuRect = document.getElementById( 'menu' ).getBoundingClientRect();
	bottom = Math.min( bottom, menuRect.top );

	const legendRect = document.getElementById( 'legend' ).getBoundingClientRect();
	bottom = Math.min( bottom, legendRect.top );

	// Grid's own status line/dots (see updateGridLayerUI) only exist in the
	// DOM while Layer mode is on - sitting just above the menu, they eat a
	// bit more of the bottom margin exactly while they're visible, so a fit
	// computed the moment Layer mode turns on (or off) always already
	// accounts for them correctly.
	const gridStatus = document.getElementById( 'grid-layer-status' );
	if ( ! gridStatus.classList.contains( 'hidden' ) ) bottom = Math.min( bottom, gridStatus.getBoundingClientRect().top );

	const gridDots = document.getElementById( 'grid-layer-dots' );
	if ( ! gridDots.classList.contains( 'hidden' ) ) bottom = Math.min( bottom, gridDots.getBoundingClientRect().top );

	// A small breathing gap on top of the exact pixel edges above - sitting
	// flush against the actual edge of a button still reads as "touching
	// it", not "clear of it".
	const GAP = 12;
	top += GAP;
	bottom -= GAP;
	right -= GAP;

	return {
		top, bottom, left, right,
		width: Math.max( 100, right - left ),
		height: Math.max( 100, bottom - top ),
		centerX: ( left + right ) / 2,
		centerY: ( top + bottom ) / 2
	};

}

// Works out where the camera actually needs to look, and how far back it
// needs to sit, to show a layout's real geometry sized to fill - and stay
// entirely clear of - the safe viewport rectangle above (not the raw
// browser window). Used by resetCamera()/fitToPanel()/reframeGridView() so
// every shape (or Grid subset) gets framed the same correct way.
// Reads a tile's real, currently-rendered width/height straight off one of
// its own DOM elements (CSS3DRenderer tiles are real <div>s - see
// tileFactory.js/style.css's .element - and 1 CSS px is 1 world unit before
// any object.scale is applied), instead of hardcoding a second copy of
// style.css's 130x180 here that could silently drift out of sync with it if
// the tile size is ever retuned in CSS alone. Falls back to that same
// 130x180 only for the rare moment a framing call happens before any tile
// exists in the DOM yet.
function getTileBaseSize() {

	const sample = document.querySelector( '#container .element' );
	if ( ! sample ) return { width: 130, height: 180 };
	return { width: sample.offsetWidth, height: sample.offsetHeight };

}

function computeFraming( layoutTargets, padding = 1.05, fovDeg = BASE_FOV ) {

	const box = new THREE.Box3();
	// Building the box from each tile's own CENTER point only - which is all
	// this used to do - quietly assumes every tile has zero size, so the box
	// stops exactly at the last tile's midpoint instead of its actual outer
	// edge. That's a small, easy-to-miss error for a shape with lots of
	// tiles spread across a big radius (Sphere, Helix - which is why
	// neither ever showed a visible overlap from it), but it's a BIG one for
	// Table and Grid: their outermost row of tiles sits only half a tile's
	// own width/height beyond its center, and that missing half-tile is
	// exactly what was still poking past the "safe" rectangle into the
	// toolbar/legend/menu even after framing was otherwise centered and
	// sized correctly - a table 10 rows tall was being measured as if it
	// were 9 rows tall, plus a sliver. Expanding the box by each tile's real
	// four corners (its actual live rendered size, read straight off a
	// tile's own DOM element rather than a hardcoded duplicate of the CSS,
	// so it can never quietly drift out of sync with it - see
	// getTileBaseSize - scaled by that tile's own userData.scale and rotated
	// by its own orientation, so this is equally correct for Sphere/Helix's
	// outward-facing tiles too) fixes that at the source, for every shape,
	// instead of papering over it with extra padding.
	const { width: tileWidth, height: tileHeight } = getTileBaseSize();
	const halfW = tileWidth / 2, halfH = tileHeight / 2;
	const localCorners = [
		new THREE.Vector3( - halfW, - halfH, 0 ),
		new THREE.Vector3( halfW, - halfH, 0 ),
		new THREE.Vector3( - halfW, halfH, 0 ),
		new THREE.Vector3( halfW, halfH, 0 )
	];
	const corner = new THREE.Vector3();
	layoutTargets.forEach( t => {

		const s = ( t.userData && t.userData.scale ) || 1;
		localCorners.forEach( ( lc ) => {

			corner.copy( lc ).multiplyScalar( s ).applyQuaternion( t.quaternion ).add( t.position );
			box.expandByPoint( corner );

		} );

	} );

	const shapeCenter = box.getCenter( new THREE.Vector3() );
	const size = box.getSize( new THREE.Vector3() );

	// Width and height need two SEPARATE checks, not one shared one - `fovDeg`
	// is always a VERTICAL field of view, and the actual HORIZONTAL field of
	// view it produces on screen depends on the camera's aspect ratio too
	// (horizontal = vertical stretched by aspect). Treating a single
	// `Math.max(size.x, size.y)` as if it only needs to fit inside the
	// vertical FOV (as this used to) silently assumed a specific aspect
	// ratio; on any window narrower/taller than that, a wide shape's sides
	// would clip past the edges of the screen, because nothing had actually
	// checked whether the WIDTH fit inside the real (aspect-adjusted)
	// horizontal FOV. Computing both required distances and taking whichever
	// is larger fixes that on any window shape - and it's what makes it
	// safe for every shape to always render at its own exactly-tuned
	// reference FOV (see GRID_FOV / HELIX_FOV / BASE_FOV and
	// fitCameraToWindow below), instead of the previous approach of
	// widening the FOV itself on narrower windows, which kept width from
	// clipping but did it by distorting Grid's/Helix's depth perspective
	// (more convergence/bulge) on exactly the window shapes most people
	// actually use.
	const halfFovRad = ( fovDeg * Math.PI / 180 ) / 2;
	const aspect = ( camera && camera.aspect ) || BASE_ASPECT;
	const halfHorizontalFovRad = Math.atan( Math.tan( halfFovRad ) * aspect );

	// The safe rectangle (see getSafeViewportRect) is almost always smaller
	// than the full window - the toolbar/nav-pad/menu/legend all eat into
	// it. A shape sized to exactly fill the FULL window's field of view
	// would then draw straight through all of that chrome. Instead, the
	// fit distance is scaled up (camera backs up further, shrinking the
	// shape on screen) by exactly the ratio of the full window to the safe
	// rectangle on each axis - which is precisely what's needed for the
	// shape to fill the SAFE rectangle instead of the window behind it.
	const safeRect = getSafeViewportRect();
	const safeHeightFraction = safeRect.height / window.innerHeight;
	const safeWidthFraction = safeRect.width / window.innerWidth;

	const heightFitDistance = ( Math.max( size.y, 500 ) / 2 / Math.tan( halfFovRad ) ) * padding / safeHeightFraction;
	const widthFitDistance = ( Math.max( size.x, 500 ) / 2 / Math.tan( halfHorizontalFovRad ) ) * padding / safeWidthFraction;
	const fitDistance = Math.max( heightFitDistance, widthFitDistance );

	// `distance` here is measured from the camera to the CENTER of the
	// shape, not to its nearest point - and for anything with real depth
	// (Grid especially, at 3400+ units front-to-back), that's a big
	// difference. This used to take Math.max(fitDistance, size.z/2 + 800),
	// which was a real bug: that second term guarantees the camera sits
	// only ~800 units from the FRONT layer specifically, no matter how
	// wide the shape is - for Grid's deep 10-layer stack, that 800 ended up
	// completely overriding fitDistance and parking the camera almost on
	// top of the front layer, blowing it up far past the edges of the
	// screen. Adding half the depth on top of fitDistance instead
	// guarantees the NEAREST point sits at exactly fitDistance - the
	// distance actually needed to frame it properly - and farther points
	// recede naturally beyond that, which is the effect a 3D grid should
	// have in the first place.
	const distance = fitDistance + size.z / 2;

	// The safe rectangle isn't centered in the window (the nav-pad only eats
	// space on the right, the bottom menu+legend are taller than the top
	// toolbar), so sizing the shape to fit it isn't enough on its own - a
	// camera that simply looks straight at the shape's own true center
	// always renders that point in the exact middle of the WINDOW, chrome
	// or no chrome, which visibly favors the side with less chrome.
	//
	// This used to be fixed by nudging `center` itself sideways by a few
	// pixels' worth of world units, so the shape would sit dead in the
	// middle of the safe rectangle instead. That looked right for the one
	// static frame right after Reset/FIT - but `center` here isn't just a
	// one-time framing number: flyCameraTo() hands it straight to
	// controls.target, and EVERY rotation from that point on (left-click-
	// drag, the up/left/down/right pad, arrow keys) orbits the camera
	// around exactly that point, forever, until the next Reset/FIT. A few
	// pixels' cosmetic offset off the shape's own true center doesn't
	// sound like much, but orbiting around a pivot that ISN'T the shape's
	// real center doesn't read as "the shape spinning in place" - it reads
	// as the whole shape swinging/arcing across the screen on every drag,
	// because that's genuinely what it's doing. This is what was actually
	// behind "the shape moves/pans when I try to rotate it" - not a bug in
	// the drag or pad handlers themselves (they already only ever orbit
	// around controls.target, never move it), but controls.target itself
	// not being the shape's true center to begin with.
	//
	// The actual fix: keep `center` as the shape's real, unmodified center
	// always (so rotation is correct at the source, for every shape, for
	// both drag and the pad/keys) and get the same visual re-centering a
	// completely different way - shifting what the CAMERA RENDERS, not
	// where it sits or what it's aimed at. `viewOffsetPx`, returned below,
	// is consumed by applyFraming() via THREE's own camera.setViewOffset -
	// an off-axis/lens-shift projection built for exactly this (shifting
	// the rendered frame on screen without moving the camera or changing
	// what it's centered on). Unlike moving the target, this never touches
	// controls.target, so it can never again become tomorrow's rotation
	// pivot.
	const desiredPxX = safeRect.centerX - window.innerWidth / 2;
	const desiredPxY = safeRect.centerY - window.innerHeight / 2;

	const center = shapeCenter.clone();

	return { center, distance, viewOffsetPx: { x: desiredPxX, y: desiredPxY } };

}

// "Fit to Panel" mode: uses much tighter padding than the normal Reset View,
// so the shape fills as much of the available space as possible without
// touching the edges or the on-screen buttons - a manual, predictable
// alternative to guessing at automatic window-size scaling (which we tried
// and removed, since it wasn't actually making shapes look bigger as intended).
function fitToPanel() {

	if ( activeLayoutKey === 'grid' && currentGridLayer !== null ) {

		currentGridLayer = null;
		gridLayerModeActive = false;
		applyGridLayerVisibility();
		updateGridLayerUI();

	}

	const currentTargets = getFramingTargets( activeLayoutKey );
	const { center, distance, viewOffsetPx } = computeFraming( currentTargets, getFramingPadding( activeLayoutKey, true ), getFramingFov( activeLayoutKey ) ); // minimal padding

	flyCameraTo( center, distance, getDefaultPhi( activeLayoutKey ), 800, viewOffsetPx );

}

// Which field of view a shape's own framing math should assume - Grid and
// Helix each use their own narrower "telephoto" FOV (see GRID_FOV and
// HELIX_FOV above), Table/Sphere use the normal one. Kept as one shared
// function so every framing call site (Reset, Fit, Grid's own layer
// reframe, and the zoom limits) is guaranteed to agree with whatever the
// camera's ACTUAL fov gets set to in fitCameraToWindow() below - a mismatch
// between the two would throw off every distance calculation for whichever
// shape it happened on.
function getFramingFov( layoutKey ) {

	if ( layoutKey === 'grid' ) return GRID_FOV;
	if ( layoutKey === 'helix' ) return HELIX_FOV;
	return BASE_FOV;

}

// Default camera ELEVATION (the spherical "phi" angle, measured from
// straight overhead) that Reset/Fit start each shape at.
//
// Helix used to start tilted down (phi ~60 degrees from overhead) so the
// coil read as a wound spiral right away instead of a flat wall of vertical
// columns - technically correct (you could see it really is a circle), but
// the actual preferred look turned out to be the opposite: a straight-on,
// dead-ahead "front view" of the coil - the near strand filling most of the
// screen like a gently curved wall of cards, the same way Sphere and Grid's
// default views are also plain and straight-on rather than tilted. Every
// shape now starts at the equator (phi = 90 degrees, i.e. Math.PI / 2) - a
// left-click-drag still tilts the view to see the coil wind around, exactly
// as before, it's just no longer forced on by default.
function getDefaultPhi( layoutKey ) {

	return Math.PI / 2;

}

// Shared camera-fly-to helper, used by resetCamera(), fitToPanel(), and
// reframeGridView() so there's exactly one place implementing this
// animation. `phi` is the spherical elevation angle to fly to (see
// getDefaultPhi above) - default keeps the original plain, straight-on
// framing for shapes that don't need a tilt. `duration` defaults to the
// original 800ms; reframeGridView passes GRID_STEP_FLY_DURATION (shorter)
// for a snappier per-layer step. `viewOffsetPx` is computeFraming()'s
// visual re-centering amount (see the comment there) - applied via
// camera.setViewOffset() (an off-axis/lens-shift projection: shifts what's
// rendered on screen without moving the camera or its target), not by
// moving center/controls.target, precisely so it can never become the
// rotation pivot. Passing null (Grid's per-layer reframe does this) leaves
// whatever offset is already set untouched, since that step re-frames the
// same still-centered shape, not a fresh Reset/FIT.
function flyCameraTo( center, distance, phi = Math.PI / 2, duration = 800, viewOffsetPx = null ) {

	// Camera dragging can also tilt/roll the camera's "up" orientation over
	// time - resetting it here stops the view from staying skewed.
	camera.up.set( 0, 1, 0 );

	if ( viewOffsetPx ) {

		// A pure shift, not a crop: the "full" frame and the "view" window
		// are the same size (window.innerWidth x window.innerHeight) - only
		// the window's position within that conceptual frame moves, which is
		// what makes this a plain sideways nudge of the rendered image
		// rather than a zoom or a crop. Sign is negative because shifting
		// the CONCEPTUAL frame left/up is what moves the rendered CONTENT
		// right/down on screen - confirmed empirically against
		// getSafeViewportRect's own sign convention (see computeFraming).
		camera.setViewOffset(
			window.innerWidth, window.innerHeight,
			- viewOffsetPx.x, - viewOffsetPx.y,
			window.innerWidth, window.innerHeight
		);

	}

	cameraTweens.removeAll();

	// A tilted (non-equatorial) view foreshortens the shape a bit compared to
	// the flat-on framing computeFraming() assumed, so back off slightly
	// extra to keep the top/bottom from creeping toward the edge of frame.
	const tiltPadding = phi === Math.PI / 2 ? 1 : 1.12;
	const offset = new THREE.Vector3().setFromSpherical( new THREE.Spherical( distance * tiltPadding, phi, 0 ) );
	const endPos = new THREE.Vector3().copy( center ).add( offset );

	// No onUpdate(render) here - animate() already renders exactly once per
	// frame regardless, so calling it again per-tween-per-frame was pure
	// duplicate work during every camera flight/reset animation.
	new TWEEN.Tween( camera.position, cameraTweens )
		.to( { x: endPos.x, y: endPos.y, z: endPos.z }, duration )
		.easing( TWEEN.Easing.Exponential.InOut )
		.start();

	new TWEEN.Tween( controls.target, cameraTweens )
		.to( { x: center.x, y: center.y, z: center.z }, duration )
		.easing( TWEEN.Easing.Exponential.InOut )
		.onUpdate( () => controls.update() )
		.start();

}

// Puts the camera back to a clean, centered view of whichever shape is
// currently active. On Grid, this also always resets Layer mode back off -
// Reset View is one of the two ways to exit Layer mode (turning the
// #grid-layer-toggle button back off is the other).
function resetCamera() {

	if ( activeLayoutKey === 'grid' && currentGridLayer !== null ) {

		currentGridLayer = null;
		gridLayerModeActive = false;
		applyGridLayerVisibility();
		updateGridLayerUI();

	}

	const currentTargets = getFramingTargets( activeLayoutKey );
	const { center, distance, viewOffsetPx } = computeFraming( currentTargets, getFramingPadding( activeLayoutKey ), getFramingFov( activeLayoutKey ) );

	flyCameraTo( center, distance, getDefaultPhi( activeLayoutKey ), 800, viewOffsetPx );

}

// Shows the full-size profile popup for one person, triggered by clicking their tile.
function showProfile( person ) {

	try {

		currentProfileIndex = peopleData.findIndex( p => p === person );
		const color = getNetWorthColor( person.netWorth );
		const rank = currentProfileIndex + 1;

		document.getElementById( 'profile-card' ).style.borderColor = `rgba(${ color.rgb }, 0.9)`;
		document.getElementById( 'profile-card' ).style.boxShadow = `0px 0px 24px rgba(${ color.rgb }, 0.5)`;
		document.getElementById( 'profile-photo' ).src = person.photo;
		document.getElementById( 'profile-name' ).textContent = person.name;
		document.getElementById( 'profile-details' ).innerHTML =
			`Age: ${ person.age }<br>Country: ${ person.country }<br>Interest: ${ person.interest }<br>` +
			`Net Worth: ${ formatCurrency( person.netWorth ) }<br>` +
			`<span class="rank">Ranked #${ rank } of ${ peopleData.length } by net worth</span>`;

		document.getElementById( 'profile-modal' ).classList.remove( 'hidden' );
		console.log( 'Profile popup opened for:', person.name );

	} catch ( err ) {

		console.error( 'showProfile failed:', err );

	}

}

// Moves to the previous (-1) or next (+1) person while the popup is open.
function stepProfile( direction ) {

	if ( currentProfileIndex < 0 ) return;

	const newIndex = ( currentProfileIndex + direction + peopleData.length ) % peopleData.length;
	showProfile( peopleData[ newIndex ] );

}

function hideProfile() {

	document.getElementById( 'profile-modal' ).classList.add( 'hidden' );

}

function transform( layoutTargets, duration ) {

	tileTweens.removeAll(); // only clears tile animations - camera animations are untouched

	for ( let i = 0; i < objects.length; i ++ ) {

		const object = objects[ i ];
		const target = layoutTargets[ i ];
		if ( ! target ) continue;

		// Apply the count-based scale immediately (not animated) - this is
		// what keeps the overall shape's footprint consistent as the people
		// count changes, by shrinking/growing each tile itself.
		object.scale.setScalar( target.userData.scale || 1 );

		// Every tile uses the exact same duration, so they all arrive together
		// at once - a staggered/random duration per tile looks more "organic"
		// but makes it easy to catch the layout mid-transition and mistake it
		// for a broken/incomplete shape.
		new TWEEN.Tween( object.position, tileTweens )
			.to( { x: target.position.x, y: target.position.y, z: target.position.z }, duration )
			.easing( TWEEN.Easing.Exponential.InOut )
			.start();

		new TWEEN.Tween( object.rotation, tileTweens )
			.to( { x: target.rotation.x, y: target.rotation.y, z: target.rotation.z }, duration )
			.easing( TWEEN.Easing.Exponential.InOut )
			.start();

	}

}

// Re-fetches the Google Sheet and rebuilds the visualization with whatever
// is currently in it - no page reload, no re-signing in needed. This is
// what makes "edit the Sheet, see it reflected here" actually convenient.
async function refreshData() {

	const btn = document.getElementById( 'refresh-data' );
	btn.disabled = true;
	btn.textContent = 'Refreshing...';

	try {

		let people = await getData();
		people = [ ...people ].sort( ( a, b ) => b.netWorth - a.netWorth );
		peopleData = people;
		lastRefreshTime = new Date();

		// Remove the old tiles entirely and rebuild fresh ones - simplest
		// correct way to handle the count changing (rows added/removed).
		objects.forEach( obj => scene.remove( obj ) );
		objects.length = 0;

		people.forEach( ( person, i ) => {

			const objectCSS = buildTile( person, i, showProfile );
			objectCSS.element._gridLayer = Math.floor( i / ( GRID_WIDTH * GRID_HEIGHT ) ) + 1;
			scene.add( objectCSS );
			objects.push( objectCSS );

		} );

		rebuildTargets( people.length );

		// Snap straight to the currently active layout's positions - no need
		// to replay the "fly in" animation on a simple data refresh.
		const activeTargets = targets[ activeLayoutKey ];
		objects.forEach( ( obj, i ) => {

			if ( ! activeTargets[ i ] ) return;
			obj.position.copy( activeTargets[ i ].position );
			obj.rotation.copy( activeTargets[ i ].rotation );
			obj.scale.setScalar( activeTargets[ i ].userData.scale || 1 );

		} );

		if ( activeLayoutKey === 'grid' ) {

			applyGridLayerVisibility();
			updateGridLayerUI();

		}

		resetCamera();
		render();

		btn.textContent = 'Refreshed!';
		setTimeout( () => { btn.textContent = 'Refresh'; btn.disabled = false; }, 1500 );

	} catch ( err ) {

		console.error( 'Refresh failed:', err );
		btn.textContent = 'Refresh failed';
		setTimeout( () => { btn.textContent = 'Refresh'; btn.disabled = false; }, 2000 );

	}

}

// Turns the raw dataset into a few quick, readable summary stats - this is
// the "what does this data actually tell us" layer the visualization alone
// doesn't provide.
function toggleInsights() {

	const panel = document.getElementById( 'insights-panel' );
	const willShow = panel.classList.contains( 'hidden' );

	if ( willShow ) {

		document.getElementById( 'insights-body' ).innerHTML = buildInsightsHTML( peopleData );

	}

	panel.classList.toggle( 'hidden' );

}

function buildInsightsHTML( people ) {

	if ( ! people.length ) return '<div>No data loaded.</div>';

	const total = people.length;
	const avgNetWorth = people.reduce( ( sum, p ) => sum + p.netWorth, 0 ) / total;

	const countBy = ( key ) => {

		const counts = {};
		people.forEach( p => { counts[ p[ key ] ] = ( counts[ p[ key ] ] || 0 ) + 1; } );
		return Object.entries( counts ).sort( ( a, b ) => b[ 1 ] - a[ 1 ] )[ 0 ];

	};

	const [ topCountry, countryCount ] = countBy( 'country' );
	const [ topInterest, interestCount ] = countBy( 'interest' );

	const green = people.filter( p => p.netWorth > 200000 ).length;
	const orange = people.filter( p => p.netWorth > 100000 && p.netWorth <= 200000 ).length;
	const red = people.filter( p => p.netWorth <= 100000 ).length;

	const row = ( label, value ) => `<div><span class="label">${ label }</span><span class="value">${ value }</span></div>`;

	const timestampText = lastRefreshTime
		? lastRefreshTime.toLocaleString( undefined, { dateStyle: 'medium', timeStyle: 'short' } )
		: 'Unknown';

	return (
		row( 'Total people', total ) +
		row( 'Average net worth', formatCurrency( avgNetWorth ) ) +
		row( 'Top country', `${ topCountry } (${ countryCount })` ) +
		row( 'Top interest', `${ topInterest } (${ interestCount })` ) +
		row( 'Above $200K', `${ green } people` ) +
		row( '$100K - $200K', `${ orange } people` ) +
		row( 'Below $100K', `${ red } people` ) +
		`<div class="timestamp-row"><span>Data last refreshed</span><span>${ timestampText }</span></div>`
	);

}

function onWindowResize() {

	renderer.setSize( window.innerWidth, window.innerHeight );
	fitCameraToWindow();
	render();

}

// Sets the camera's aspect and field of view for whichever shape is active.
//
// This used to also WIDEN the FOV itself on narrower-than-16:9 windows, to
// keep the same horizontal extent of content visible - but that was
// actually working around a real gap in computeFraming()'s own math (it
// only checked a shape's height against the vertical FOV, never its width
// against the actual aspect-adjusted horizontal FOV - see the comment
// there). Widening the FOV "fixed" the clipping, but as a side effect it
// also distorted Grid's/Helix's depth perspective (more column-fanning,
// more coil-bulging - see GRID_FOV / HELIX_FOV above) on exactly the
// window shapes most people actually use, since real browser windows are
// often closer to square than a cinematic 16:9. Now that computeFraming()
// checks width and height separately and backs the camera up (not the FOV)
// whenever a narrower window needs it, every shape can simply always use
// its own exactly-tuned reference FOV, on any window shape, with nothing
// ever clipping.
function fitCameraToWindow() {

	// Any view offset from computeFraming()/flyCameraTo() (see the comment
	// there) was calculated against the OLD window size - camera.view still
	// holds those old fullWidth/fullHeight numbers, and updateProjectionMatrix()
	// below would reapply them as-is, producing a shift calibrated to a
	// window size that no longer exists. Clearing it here rather than
	// carrying it forward stale means a resize temporarily loses the extra
	// re-centering-into-the-safe-rectangle polish until the next Reset/FIT
	// recomputes it fresh - a small cosmetic step back, not a wrong shift.
	camera.clearViewOffset();

	camera.aspect = window.innerWidth / window.innerHeight;
	camera.fov = getFramingFov( activeLayoutKey );
	camera.updateProjectionMatrix();

}

function animate( timestamp ) {

	requestAnimationFrame( animate );

	// Wrapped in a try/catch as a safety net: this loop runs 60 times a
	// second for as long as the tab is open, so if any single frame ever
	// throws for a reason we haven't anticipated, the OLD behavior was for
	// that exception to propagate up and silently stop this function's own
	// body partway through - which meant render() (the last line) would
	// never run again, freezing the visible scene at whatever partial,
	// possibly mid-transition state it was in at that exact moment,
	// without any error dialog or obvious sign of what happened. Catching
	// it here means a one-off problem shows up as a logged warning and a
	// skipped frame, not a permanently frozen, oddly-shaped scene that
	// looks like a rendering bug but is actually a stopped loop.
	try {

		tileTweens.update();
		cameraTweens.update();
		controls.update();

		// Throttled to a few times a second internally (see
		// DEPTH_CUE_THROTTLE_MS) - this call itself is cheap every frame,
		// it's just an early-return until enough time has passed.
		maybeUpdateDepthCue( timestamp || performance.now() );

		// Render exactly once per frame, unconditionally, rather than from
		// scattered calls after every individual input event. Pointer move
		// events can fire faster than the screen can actually redraw, so
		// rendering straight from each one did repeated wasted work - tying
		// it to the frame clock instead is what makes dragging feel smooth.
		render();

	} catch ( err ) {

		console.error( 'animate() frame skipped due to an error (this frame only, the loop keeps running):', err );

	}

}

function render() {

	renderer.render( scene, camera );
	snapTileTransformsToPixelGrid();

}

// CSS3DRenderer writes each tile's position as a `matrix3d(...)` string
// built straight from the camera's floating-point math, which almost never
// lands exactly on a whole device pixel - a tile sitting at, say,
// translateX(212.37px) forces the browser to blend/interpolate text and
// edges across the pixel boundary instead of drawing it against a clean
// pixel grid, which is what actually read as "blurry" while a shape sits
// still (this is the same reason a browser can render an image crisply at
// one zoom level and soft at another - fractional-pixel positioning, not
// an actual loss of resolution).
//
// Rounding just the on-screen (x, y) part of each tile's translation to
// the nearest whole pixel - elements 12 and 13 of the 16-value matrix3d
// list are that translation, in CSS's column-major order; the rotation/
// scale components before them and the depth (z) component right after
// are left exactly as CSS3DRenderer computed them, so this changes
// nothing about a tile's actual size, facing, or depth ordering.
//
// Measured, honest result: A/B testing this against real screenshots
// (Laplacian-variance sharpness, before/after, same camera state) showed
// no measurable improvement on its own - sub-pixel translation turned out
// not to be the dominant cause of "sharp while moving, soft once still".
// Left in anyway since it's free and correct on its own terms. See the
// cameraGroupElement / will-change comment in init() for the fix actually
// aimed at that behavior.
function snapTileTransformsToPixelGrid() {

	objects.forEach( ( obj ) => {

		const el = obj.element;
		const t = el.style.transform;

		if ( ! t ) return;

		// CSS3DObject's element carries a `translate(-50%, -50%) ` prefix
		// (its own local re-centering, so each tile's declared position is
		// its middle rather than its corner) BEFORE the matrix3d(...) this
		// function actually needs to touch - searching for "matrix3d(" by
		// name, not just "the first '('", is what a first version of this
		// got wrong (that version's own indexOf('(') found the ONE inside
		// "translate(" instead, so it was silently bailing out on every
		// single tile, every frame - the rounding it was meant to apply
		// never actually ran at all).
		const matrixStart = t.indexOf( 'matrix3d(' );
		if ( matrixStart === -1 ) return;

		const open = matrixStart + 'matrix3d('.length - 1;
		const parts = t.slice( open + 1, -1 ).split( ',' );

		if ( parts.length !== 16 ) return;

		parts[ 12 ] = Math.round( parseFloat( parts[ 12 ] ) );
		parts[ 13 ] = Math.round( parseFloat( parts[ 13 ] ) );

		el.style.transform = t.slice( 0, open + 1 ) + parts.join( ',' ) + ')';

	} );

}

