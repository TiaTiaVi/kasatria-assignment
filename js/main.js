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

import { getData } from './dataLoader.js?v=4';
import { buildTile, formatCurrency, getNetWorthColor } from './tileFactory.js?v=24';
import { buildTableTargets, buildSphereTargets, buildHelixTargets, buildGridTargets, GRID_WIDTH, GRID_HEIGHT, computeScaleFactor } from './layouts.js?v=24';
import { initGoogleSignIn, isSessionExpired, signOut } from './auth.js?v=3';

let camera, scene, renderer, controls;
const objects = [];
let targets = { table: [], sphere: [], helix: [], grid: [] };
let peopleData = [];
let currentProfileIndex = -1;
let activeLayoutKey = 'table';
let currentGridLayer = null;   // null = showing the full Grid, 1..totalGridLayers = stepping mode
let totalGridLayers = 1;       // recalculated from the real data count, never hardcoded
let lastRefreshTime = null;
const zoomRaycaster = new THREE.Raycaster();

// The vertical field-of-view we design around at a "normal" aspect ratio.
// On resize, we adjust the camera's actual FOV so the same horizontal extent
// of content always stays visible - this is what stops tiles being cut off
// or overlapping the bottom menu on narrower/smaller windows.
const BASE_FOV = 40;
const BASE_ASPECT = 16 / 9;

// Grid gets its own, much narrower field of view - a "telephoto" lens
// instead of the normal wide-ish one every other shape uses. Grid is the one
// shape with real depth relative to its own footprint (5x4 wide but 10
// layers deep) - viewed with an ordinary, wider-FOV perspective camera, the
// SAME (x, y) grid position at increasing depth still projects to a
// noticeably different screen position as it recedes (basic perspective:
// nearer things spread out more, farther things converge toward the middle
// of frame) - with ten layers doing that at once, every column fans out into
// a radiating starburst instead of reading as ten sheets stacked directly
// behind one another. A narrow FOV, paired with a correspondingly much
// greater camera distance to keep the shape the same apparent size, is the
// standard fix for exactly this (the same "long lens flattens depth" effect
// a photographer relies on) - the narrower the angle a scene is viewed
// through, the closer it gets to a true orthographic projection, where the
// same (x, y) position looks identical on screen no matter how far back it
// sits. This is what actually makes each Grid layer read as one flat, solid
// sheet, tightly stacked behind the one in front - not just a background
// color change.
const GRID_FOV = 10;

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

	let people;

	try {

		people = await getData();
		lastRefreshTime = new Date();

	} catch ( err ) {

		console.error( 'Failed to load data from Google Sheets:', err );

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

}

function init( people ) {

	// Far plane raised well past the old 10000: Grid's narrow "telephoto" FOV
	// (see GRID_FOV above) needs the camera to sit much farther back to keep
	// the shape the same apparent size - easily beyond the old far plane,
	// which would have silently clipped the whole shape out of view.
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

	// If we were mid-way through stepping Grid layers and the data shrank so
	// that layer no longer exists, fall back to showing the whole Grid
	// instead of pointing at now-empty space.
	if ( currentGridLayer !== null && currentGridLayer > totalGridLayers ) {

		currentGridLayer = null;

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

		currentGridLayer = null; // always start a fresh Grid view at "show everything"
		applyGridLayerVisibility();
		updateGridLayerStatusText();

	} else {

		// CRITICAL: leaving Grid must fully restore every tile's visibility.
		// Without this, any tiles hidden while stepping through Grid's layers
		// stayed invisible forever afterward, even on completely different
		// shapes - that's what caused tiles to "go missing" on Table/Sphere/Helix.
		currentGridLayer = null;

		if ( layoutKey === 'helix' ) {

			// Helix manages its own opacity/blur continuously via the
			// distance depth cue (see maybeUpdateDepthCue) - just make sure
			// nothing is left invisible from a previous Grid stepping session.
			objects.forEach( ( obj ) => { obj.element.style.pointerEvents = 'auto'; } );
			applyDistanceDepthCue( objects );

		} else {

			// Table/Sphere don't use any depth cue at all - reset every
			// tile back to fully solid and sharp. Without this explicit
			// reset, a tile could be left permanently dimmed/blurred here
			// from whatever Grid or Helix's depth cue last set it to,
			// since nothing on these two shapes would ever clear it again.
			objects.forEach( ( obj ) => {

				obj.element.style.opacity = '1';
				obj.element.style.filter = '';
				obj.element.style.pointerEvents = 'auto';

			} );

		}

		hideGridLayerStatus();

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
		spherical.phi = THREE.MathUtils.clamp( spherical.phi - dy * ROTATE_SPEED, MIN_PHI, MAX_PHI );

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

		// Left/right spin around the axis to see the far side of the coil.
		// Up/down climb the coil's height, since that's where "the next
		// data" actually lives for a helix - not around its circumference.
		if ( direction === 'left' ) rotateCameraStep( 'theta', - 1 );
		else if ( direction === 'right' ) rotateCameraStep( 'theta', 1 );
		else if ( direction === 'up' ) climbHelix( 1 );
		else if ( direction === 'down' ) climbHelix( - 1 );

	} else if ( activeLayoutKey === 'grid' ) {

		// All four arrows step through depth layers - Up/Right go forward,
		// Down/Left go backward.
		// Left/Up = previous layer, Right/Down = next layer.
		if ( direction === 'right' || direction === 'down' ) stepGridLayer( 1 );
		else stepGridLayer( - 1 );

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

// Moves the camera up/down along the helix's height - "climbing the coil"
// to reveal sections higher or lower than what's currently in view.
function climbHelix( sign ) {

	const CLIMB_STEP = 80;
	camera.position.y += sign * CLIMB_STEP;
	controls.target.y += sign * CLIMB_STEP;
	controls.update();
	render();

}

// Steps the Grid view forward (+1) or backward (-1) through its depth
// layers. Layers already passed get hidden ("thrown away" like a turned
// page); the current layer and everything still ahead stays fully visible -
// the "sliding book" effect.
function stepGridLayer( delta ) {

	let newLayer;

	if ( currentGridLayer === null ) {

		newLayer = delta > 0 ? 1 : totalGridLayers;

	} else {

		newLayer = currentGridLayer + delta;

	}

	newLayer = THREE.MathUtils.clamp( newLayer, 1, totalGridLayers );
	currentGridLayer = newLayer;

	applyGridLayerVisibility();
	updateGridLayerStatusText();
	reframeGridView();

}

function applyGridLayerVisibility() {

	// Every layer that isn't "turned past" yet shows at FULL opacity - a
	// genuinely solid sheet, not a partial one. This used to fade each
	// still-ahead layer by distance (nearest layer fully opaque, farthest
	// down to 35%), which was a reasonable depth cue in principle, but at
	// this shape's proportions (a footprint much narrower than its full
	// 10-layer depth) it had a real side effect: a partially-transparent
	// layer lets whatever is directly behind it - the next layer's tiles,
	// offset only slightly by perspective - visibly bleed through, and with
	// ten layers all doing that at once the result reads as a smeared,
	// radiating "starburst" instead of a clean stack of cards. Tiles already
	// carry a solid (94%-opaque) background of their own now (see
	// tileFactory.js) specifically so the FRONT layer's cards fully hide
	// whatever sits behind them on their own, the way a real printed card
	// would - no extra fading needed, and no extra bleed-through caused.
	// Only the page-turn effect (below) still uses opacity, because that one
	// is meant to be a hard hide, not a soft depth cue.
	objects.forEach( ( obj ) => {

		const tileLayer = obj.element._gridLayer;
		const isTurnedPast = ( currentGridLayer !== null && tileLayer < currentGridLayer );

		if ( isTurnedPast ) {

			// Already "turned past" while stepping - fully hidden, the
			// page-turn effect.
			obj.element.style.opacity = '0';
			obj.element.style.pointerEvents = 'none';

		} else {

			obj.element.style.opacity = '1';
			obj.element.style.pointerEvents = 'auto';

		}

	} );

}

// Distance-from-camera "depth of field" for Helix: tiles closer to the
// camera stay crisp and fully opaque, farther ones fade. Opacity alone
// carries the whole effect - no blur. Blur was pulled entirely: it's a
// meaningfully heavier operation for a browser's GPU compositor than
// opacity (which is compositor-only and effectively free to update often),
// and a clean, uniformly "solid" tile is also just what was actually
// asked for over a soft haze.
const DEPTH_OPACITY_FLOOR = 0.35;

function applyDistanceDepthCue( objectList ) {

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

	objectList.forEach( ( obj, i ) => {

		const t = ( distances[ i ] - minDist ) / range; // 0 = nearest, 1 = farthest
		const opacity = 1 - t * ( 1 - DEPTH_OPACITY_FLOOR );

		obj.element.style.opacity = opacity.toFixed( 2 );

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

	// Grid no longer needs any per-frame work here at all: its layer
	// visibility is now a plain "turned past = hidden, everything else =
	// fully solid" state (see applyGridLayerVisibility) that only ever
	// changes when you actually step to a different layer or switch shapes -
	// never as a function of camera distance/angle. Continuously
	// recomputing and rewriting the same opacity on 200 elements every ~90ms
	// while just sitting there looking at Grid was pure wasted work (and,
	// with real photo-heavy tiles, exactly the kind of steady background
	// cost that makes the whole page feel less responsive than it should).
	// Helix is the one shape that still genuinely needs this: its
	// depth-of-field fade is deliberately continuous, since the camera can
	// orbit freely around it at any moment.
	if ( activeLayoutKey !== 'helix' ) return;
	if ( timestamp - lastDepthCueUpdate < DEPTH_CUE_THROTTLE_MS ) return;

	// Skip the recompute entirely while the camera hasn't actually moved -
	// by far the most common state (sitting there looking, not actively
	// dragging). Without this check, re-running the exact same distance
	// math and writing the exact same opacity/blur strings every ~90ms
	// still restarts each tile's CSS transition over and over, purely from
	// the values being reassigned rather than genuinely changing - real,
	// measurable idle overhead (traced to a 130ms+ frame spike on Grid)
	// for a view that was never supposed to be doing any per-frame work at all.
	if ( lastDepthCueCameraPos && camera.position.distanceTo( lastDepthCueCameraPos ) < DEPTH_CUE_CAMERA_MOVE_EPSILON ) {

		lastDepthCueUpdate = timestamp;
		return;

	}

	lastDepthCueUpdate = timestamp;
	lastDepthCueCameraPos = camera.position.clone();

	applyDistanceDepthCue( objects );

}

function updateGridLayerStatusText() {

	const statusEl = document.getElementById( 'grid-layer-status' );

	if ( currentGridLayer === null ) {

		statusEl.classList.add( 'hidden' );

	} else {

		statusEl.classList.remove( 'hidden' );
		statusEl.textContent = `Viewing Layer ${ currentGridLayer } of ${ totalGridLayers } - use arrow keys to move, click GRID to see all`;

	}

}

function hideGridLayerStatus() {

	document.getElementById( 'grid-layer-status' ).classList.add( 'hidden' );

}

// Re-frames the camera on whatever's currently visible in Grid: either the
// front layer (while showing everything), or (while stepping) the current
// layer plus every layer still ahead of it, matching the "sliding book" visual.
function reframeGridView() {

	const subset = getFramingTargets( 'grid' );
	const { center, distance } = computeFraming( subset.length ? subset : targets.grid, getFramingPadding( 'grid' ), GRID_FOV );

	flyCameraTo( center, distance );

}

// Picks which target positions the camera should actually size/center
// itself around for a given shape. For the default view, that's simply
// every tile, for every shape including Grid.
//
// An earlier version of this framed Grid's default view on the FRONT LAYER
// ALONE, to keep it from looking small - but that was the wrong fix. Grid
// has real gaps between tiles (unlike Sphere/Helix, which are closed
// surfaces with nothing to see past), and getting the camera close enough
// to size the front layer nicely meant those gaps let you see straight
// through into the layers receding behind - a distracting "tunnel vision"
// starburst, not a clean grid. No amount of retuning spacing/padding fixes
// that; it's a direct consequence of framing on a sparse subset up close.
// Framing on the WHOLE shape instead - the same thing every other shape
// already does - keeps Grid's default view a safe, undistorted view of the
// full 5x4x10 arrangement. A closer, front-emphasized view is exactly what
// the FIT button is for.
//
// Stepping through Grid's layers (currentGridLayer !== null) is the one
// place a subset still makes sense: at that point, everything BEFORE the
// current layer is already hidden, so there's no additional visible
// content left behind the framed subset for gaps to reveal - nothing to
// tunnel into.
function getFramingTargets( layoutKey ) {

	if ( layoutKey === 'grid' && currentGridLayer !== null ) {

		const perLayer = GRID_WIDTH * GRID_HEIGHT;
		return targets.grid.slice( ( currentGridLayer - 1 ) * perLayer );

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
	if ( axis === 'phi' ) spherical.phi = THREE.MathUtils.clamp( spherical.phi + sign * ROTATE_STEP, MIN_PHI, MAX_PHI );

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

function onWheelZoom( event ) {

	event.preventDefault();

	const { min, max } = getZoomLimits();

	// Grid gets simple, centered zoom - it's the one shape deep enough that
	// cursor-following zoom noticeably dragged the pivot point away from
	// its real center. Table/Sphere/Helix keep the cursor-following zoom
	// below, since that felt right and you asked us not to remove it.
	if ( activeLayoutKey === 'grid' ) {

		const distance = camera.position.distanceTo( controls.target );
		const zoomFactor = event.deltaY > 0 ? 1.08 : 0.92;
		const newDistance = THREE.MathUtils.clamp( distance * zoomFactor, min, max );

		const dir = new THREE.Vector3().subVectors( camera.position, controls.target ).normalize();
		camera.position.copy( controls.target ).addScaledVector( dir, newDistance );

		controls.update();
		render();
		return;

	}

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

// How much breathing room to leave around the framed shape. Grid's
// layer-stepping view gets a bit extra: even though nothing hidden is left
// behind the visible subset to "tunnel" into (see getFramingTargets above),
// a couple of exposed layers up close can still feel cramped, so a little
// more room keeps that view comfortable without any downside.
function getFramingPadding( layoutKey, tight = false ) {

	if ( layoutKey === 'grid' && currentGridLayer !== null ) return tight ? 1.2 : 1.35;
	// A little extra room (1.15 -> 1.25) on the normal Reset framing: the
	// legend and menu bar overlay the bottom of the window on top of the
	// 3D view, but aren't accounted for in the camera math itself (which
	// only knows about the full window height). Without this margin, a
	// shape sized to exactly fill the vertical field of view can end up
	// with its lowest tiles sitting right behind that overlay instead of
	// just above it. FIT deliberately keeps its own tighter padding - it's
	// the explicit "make it as big as possible" action, so some overlap
	// there is an accepted trade-off the person asked for.
	return tight ? 1.02 : 1.25;

}

// Works out where the "middle" of a layout actually is, and how far back the
// camera needs to sit to see all of it - used by resetCamera()/reframeGridView()
// so every shape (or Grid subset) gets centered correctly.
function computeFraming( layoutTargets, padding = 1.15, fovDeg = BASE_FOV ) {

	const box = new THREE.Box3();
	layoutTargets.forEach( t => box.expandByPoint( t.position ) );

	const center = box.getCenter( new THREE.Vector3() );
	const size = box.getSize( new THREE.Vector3() );

	// Only width/height need to "fit" inside the field of view this way -
	// depth doesn't, since it runs toward/away from the camera rather than
	// sideways across the screen.
	const widthHeight = Math.max( size.x, size.y, 500 );

	const halfFovRad = ( fovDeg * Math.PI / 180 ) / 2;
	const fitDistance = ( widthHeight / 2 / Math.tan( halfFovRad ) ) * padding;

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

	return { center, distance };

}

// "Fit to Panel" mode: uses much tighter padding than the normal Reset View,
// so the shape fills as much of the available space as possible without
// touching the edges or the on-screen buttons - a manual, predictable
// alternative to guessing at automatic window-size scaling (which we tried
// and removed, since it wasn't actually making shapes look bigger as intended).
function fitToPanel() {

	if ( activeLayoutKey === 'grid' && currentGridLayer !== null ) {

		currentGridLayer = null;
		applyGridLayerVisibility();
		updateGridLayerStatusText();

	}

	const currentTargets = getFramingTargets( activeLayoutKey );
	const { center, distance } = computeFraming( currentTargets, getFramingPadding( activeLayoutKey, true ), getFramingFov( activeLayoutKey ) ); // minimal padding

	flyCameraTo( center, distance, getDefaultPhi( activeLayoutKey ) );

}

// Which field of view a shape's own framing math should assume - Grid uses
// its own much narrower "telephoto" FOV (see GRID_FOV above), everything
// else uses the normal one. Kept as one shared function so every framing
// call site (Reset, Fit, Grid's own layer reframe, and the zoom limits) is
// guaranteed to agree with whatever the camera's ACTUAL fov gets set to in
// fitCameraToWindow() below - a mismatch between the two would throw off
// every distance calculation for whichever shape it happened on.
function getFramingFov( layoutKey ) {

	return layoutKey === 'grid' ? GRID_FOV : BASE_FOV;

}

// Default camera ELEVATION (the spherical "phi" angle, measured from
// straight overhead) that Reset/Fit start each shape at. Every shape except
// Helix starts dead-on at the equator (phi = 90 degrees, i.e. Math.PI / 2) -
// a plain, flat, straight-on view, exactly as before.
//
// Helix is the one shape that actually needs a tilt by default: a spiral
// viewed exactly at the equator reads as a flat wall of vertical columns -
// you can't tell it's wound in a circle at all unless you rotate it
// yourself first. Tilting the DEFAULT view down slightly (still safely
// inside MIN_PHI/MAX_PHI, nowhere near the "steep angle turns it into a
// confusing funnel" zone those constants already guard against) is what
// actually lets the coil read as a circular, spiraling shape right away -
// "seeing the whole circle" without needing to already know to go drag the
// view first.
const HELIX_DEFAULT_PHI = 1.05; // ~60 degrees from straight overhead

function getDefaultPhi( layoutKey ) {

	return layoutKey === 'helix' ? HELIX_DEFAULT_PHI : Math.PI / 2;

}

// Shared camera-fly-to helper, used by both resetCamera() and reframeGridView()
// so there's exactly one place implementing this animation. `phi` is the
// spherical elevation angle to fly to (see getDefaultPhi above) - default
// keeps the original plain, straight-on framing for shapes that don't need
// a tilt.
function flyCameraTo( center, distance, phi = Math.PI / 2 ) {

	// Camera dragging can also tilt/roll the camera's "up" orientation over
	// time - resetting it here stops the view from staying skewed.
	camera.up.set( 0, 1, 0 );

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
		.to( { x: endPos.x, y: endPos.y, z: endPos.z }, 800 )
		.easing( TWEEN.Easing.Exponential.InOut )
		.start();

	new TWEEN.Tween( controls.target, cameraTweens )
		.to( { x: center.x, y: center.y, z: center.z }, 800 )
		.easing( TWEEN.Easing.Exponential.InOut )
		.onUpdate( () => controls.update() )
		.start();

}

// Puts the camera back to a clean, centered view of whichever shape is
// currently active. On Grid, this also always resets layer-stepping back
// to "show everything" - Reset View is one of the two ways to exit
// layer-stepping mode (clicking GRID again is the other).
function resetCamera() {

	if ( activeLayoutKey === 'grid' && currentGridLayer !== null ) {

		currentGridLayer = null;
		applyGridLayerVisibility();
		updateGridLayerStatusText();

	}

	const currentTargets = getFramingTargets( activeLayoutKey );
	const { center, distance } = computeFraming( currentTargets, getFramingPadding( activeLayoutKey ), getFramingFov( activeLayoutKey ) );

	flyCameraTo( center, distance, getDefaultPhi( activeLayoutKey ) );

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
			updateGridLayerStatusText();

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

// Keeps the same horizontal extent of content visible no matter the window's
// width/height - this is the fix for tiles being cut off or overlapping the
// bottom menu on narrower/smaller windows. Also re-applied every time the
// active shape changes (see switchLayout), not just on resize - Grid needs
// its own much narrower reference FOV (GRID_FOV) applied here for the
// "telephoto" effect described on that constant to actually take effect on
// the real camera, not just in the distance math that frames it.
function fitCameraToWindow() {

	const aspect = window.innerWidth / window.innerHeight;
	camera.aspect = aspect;

	const referenceFov = getFramingFov( activeLayoutKey );

	if ( aspect < BASE_ASPECT ) {

		// Window is narrower than our reference shape - widen the vertical FOV
		// so the same horizontal width of tiles still fits on screen.
		const baseHorizontalFOV = 2 * Math.atan( Math.tan( ( referenceFov * Math.PI / 180 ) / 2 ) * BASE_ASPECT );
		const verticalFOV = 2 * Math.atan( Math.tan( baseHorizontalFOV / 2 ) / aspect );
		camera.fov = verticalFOV * 180 / Math.PI;

	} else {

		camera.fov = referenceFov;

	}

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

}
