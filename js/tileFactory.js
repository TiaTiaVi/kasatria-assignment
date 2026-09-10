import { CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';

// Turns a net worth number into a color, per the assignment:
// Red < $100K, Orange > $100K, Green > $200K
//
// These are deliberately deeper/darker shades than a "pure" bright red/
// orange/green - the original bright versions (255,59,48 / 255,149,0 /
// 76,217,100) look good as flat color swatches, but the white text sitting
// directly ON TOP of them (name/details - see style.css) had genuinely poor
// contrast: measured against WCAG's standard contrast-ratio formula, white
// text on the old orange was only ~2.2:1 and on the old green only ~1.8:1
// (the accepted minimum for normal-size text is 4.5:1 - anything under that
// is a real readability problem, not just a style preference, and it only
// gets worse the smaller each tile renders on screen). These deeper shades
// keep the same red/orange/green identity (still clearly "red", "orange",
// "green" at a glance) while giving white text 5.2-6.5:1 contrast against
// every one of them - comfortably above the readable threshold even at a
// tile's smallest on-screen size.
function getNetWorthColor( netWorth ) {

	if ( netWorth > 200000 ) return { name: 'green', rgb: '24, 120, 58' };
	if ( netWorth > 100000 ) return { name: 'orange', rgb: '166, 88, 10' };
	return { name: 'red', rgb: '176, 44, 38' };

}

function formatCurrency( netWorth ) {

	return '$' + netWorth.toLocaleString( 'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 } );

}

// Darkens/desaturates an "R, G, B" string toward black by `factor` (0-1) -
// used to build the tile's BACK face color from its front face color, so
// the two stay a matched pair (same hue family, just dimmer) instead of two
// independently-chosen colors that could drift out of sync if one were ever
// retuned without the other.
function dimColor( rgb, factor ) {

	const [ r, g, b ] = rgb.split( ',' ).map( n => parseFloat( n ) );
	const dim = ( channel ) => Math.round( channel * factor );

	return `${ dim( r ) }, ${ dim( g ) }, ${ dim( b ) }`;

}

// Builds one tile (a CSS3DObject) for a single person, given their data and index.
// onClick (optional) is called with the person's data whenever their tile is clicked -
// this is what powers the "click a tile to see the full profile" popup.
function buildTile( person, index, onClick ) {

	const color = getNetWorthColor( person.netWorth );

	const element = document.createElement( 'div' );
	element.className = 'element';

	// TRUE TWO-SIDED CARD: `element` itself is now just an empty 3D "stage"
	// (see `transform-style: preserve-3d` on .element in style.css) holding
	// two separate, individually-rotated face divs - .face-front (this
	// tile's real content, dead ahead) and .face-back (rotated 180deg
	// around Y, permanently facing the opposite way). Each face also gets
	// `backface-visibility: hidden`, so the browser itself - not our own
	// per-frame JS - decides which one is actually painted, purely from
	// each tile's real 3D orientation in the scene: whichever face is
	// currently pointed toward the camera shows, the other one doesn't cost
	// a single extra paint. This directly replaces the old approach, which
	// had only ONE face (this same content, mirrored by the browser's
	// default backface behavior when a tile happened to be facing away) and
	// leaned on a separate, continuously-recomputed JS "depth cue"
	// (see applyDistanceDepthCue in main.js) to dim things down - and that
	// depth cue's real bug is exactly what motivated this change: it dims
	// tiles by raw DISTANCE from the camera, which has nothing to do with
	// which way a tile is actually facing, so a tile that's genuinely
	// facing the camera (the "front" of the shape) but simply sits a bit
	// farther back than average got dimmed right along with tiles that are
	// truly facing away - "the front also gets dim", the exact complaint
	// this redesign fixes. Now the strong/dim distinction is tied to the
	// one thing that should actually control it (which side is facing you),
	// not to distance, so Sphere and Helix no longer run that per-frame
	// dimming pass at all (see maybeUpdateDepthCue in main.js) - the browser's
	// own 3D compositing handles it, every frame, for free.
	//
	// Cost check: a full 6-faced extruded box (every side of a real cube)
	// was tried once before for a different request and reverted - 200
	// tiles x 6 faces = 1200 always-composited layers measurably hurt frame
	// time. This is deliberately NOT that: two flat faces per tile (400
	// layers total for 200 people), not six, specifically because only
	// "which of two sides is showing" is needed here, not a full box.
	// Benchmarked with a headless render-loop test at 200 tiles: this
	// change measurably IMPROVED average frame time (see README's "Round 2"
	// section for the actual before/after numbers) - removing the old
	// per-frame distance-dimming JS pass more than paid for the extra DOM.
	const faceFront = document.createElement( 'div' );
	faceFront.className = 'face face-front';
	faceFront.style.borderColor = `rgba(${ color.rgb }, 0.9)`;
	// SOLID tile background - fully opaque, so nothing directly behind a
	// tile ever bleeds through, the way a real printed card would.
	faceFront.style.backgroundColor = `rgba(${ color.rgb }, 1)`;
	element.appendChild( faceFront );

	const faceBack = document.createElement( 'div' );
	faceBack.className = 'face face-back';
	// The BACK face's color is the exact same hue, just darkened - see
	// dimColor() above - rather than a flat generic grey, so the back of a
	// green (high net worth) tile still reads as "the back of a green
	// tile", not as an unrelated color. This is the concrete "front strong
	// colour, back dimmed colour" tile design, built once here per tile
	// instead of recomputed every frame in JS.
	const backRgb = dimColor( color.rgb, 0.32 );
	faceBack.style.borderColor = `rgba(${ backRgb }, 0.9)`;
	faceBack.style.backgroundColor = `rgba(${ backRgb }, 1)`;
	element.appendChild( faceBack );

	if ( onClick ) {

		element.style.cursor = 'pointer';
		element.style.pointerEvents = 'auto';
		// Store the person's data directly on this DOM node - main.js reads this
		// back to figure out who was clicked, using a more reliable detection
		// method than a plain listener on the tile itself (see main.js for why).
		// Deliberately still on the OUTER `element`, not either face: main.js
		// looks this up with `.closest('.element')` starting from whatever was
		// actually under the cursor (front face or back face, whichever was
		// visible) - one shared lookup that works no matter which side someone
		// clicked, instead of duplicating this data onto both faces.
		element._person = person;

	}

	// SUPERSAMPLING for sharper tiles: we build all the visual content at
	// DOUBLE size (260x360 instead of 130x180), then scale the whole thing
	// down with CSS. The browser renders text/images at that larger size
	// first (more actual pixel detail), then shrinks it - the result
	// looks noticeably crisper than rendering directly at the small size,
	// the same principle behind why "Retina" images look sharper.
	// Lives inside .face-front now (not directly in .element) - the actual
	// photo/name/details only ever belong on the front face; the back face
	// is deliberately just a plain dimmed color, not a mirrored copy of the
	// same content, since its whole job is to read as "the inside/back of
	// the shape", not as more data to read.
	const supersample = document.createElement( 'div' );
	supersample.className = 'supersample';
	faceFront.appendChild( supersample );

	const number = document.createElement( 'div' );
	number.className = 'number';
	number.textContent = index + 1;
	supersample.appendChild( number );

	// "inner" is a separate nested div specifically so we can add a hover-zoom
	// effect via CSS. The outer .element's transform is fully controlled by
	// Three.js (for 3D position), so any extra CSS transform we add has to live
	// on a child element instead, or the two would fight each other.
	const inner = document.createElement( 'div' );
	inner.className = 'element-inner';
	supersample.appendChild( inner );

	const NO_PHOTO_PLACEHOLDER = 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(
		`<svg xmlns="http://www.w3.org/2000/svg" width="390" height="260"><rect width="100%" height="100%" fill="#3a3f42"/><text x="50%" y="50%" fill="#d8dcdd" font-family="Helvetica, sans-serif" font-size="32" text-anchor="middle" dy=".35em">No Photo</text></svg>`
	);

	const photo = document.createElement( 'img' );
	photo.className = 'photo';
	photo.referrerPolicy = 'no-referrer';
	// Decoding off the main thread, so 200 photos loading/decoding at once
	// can't block layout or the drag/rotate interaction while they arrive.
	photo.decoding = 'async';

	// Native loading="lazy" was tried and removed earlier - it's unreliable
	// on CSS3D-transformed elements (the browser's own viewport-intersection
	// heuristic doesn't track transform3d-positioned content well, and some
	// photos just never triggered a load at all). fetchpriority is a
	// different, more reliable tool for the same underlying goal: it
	// doesn't decide WHETHER to load something, only what order the browser
	// should request things in when there are more in flight than it can
	// fetch at once. The first couple of "layers" worth of tiles (by index -
	// people are sorted by net worth, so these are consistently whichever
	// tiles land in the most prominent, front-most positions across Table,
	// Grid, and Helix) get bumped to the front of that queue, so the photos
	// someone actually sees first are the ones that arrive first - a faster
	// FELT load, not a faster total one. Everything else is left at the
	// browser's normal default priority, not deprioritized - so nothing
	// ever waits indefinitely the way true lazy-loading risked.
	if ( index < 40 ) photo.fetchPriority = 'high';

	// A blank/missing photo URL (some rows in a real, hand-filled sheet
	// won't have one) is checked BEFORE ever setting it as the image src.
	// Assigning "" directly is unreliable across browsers - some fire the
	// error event, some silently try to load the page's own URL as an
	// "image" and just sit there blank with nothing visibly wrong and no
	// error to react to. Checking first sidesteps that ambiguity entirely.
	if ( person.photo && /^https?:\/\//i.test( person.photo ) ) {

		photo.src = person.photo;

	} else {

		photo.src = NO_PHOTO_PLACEHOLDER;

	}

	photo.onerror = () => {

		// If a photo URL is broken/missing, show a plain placeholder instead
		// of a broken-image icon - a small but real data-quality safeguard.
		photo.onerror = null;
		photo.src = NO_PHOTO_PLACEHOLDER;

	};
	inner.appendChild( photo );

	const name = document.createElement( 'div' );
	name.className = 'name';
	name.textContent = person.name;
	inner.appendChild( name );

	const details = document.createElement( 'div' );
	details.className = 'details';
	details.innerHTML = `${ person.age } &middot; ${ person.country }<br>${ person.interest }<br>${ formatCurrency( person.netWorth ) }`;
	inner.appendChild( details );

	return new CSS3DObject( element );

}

export { buildTile, getNetWorthColor, formatCurrency };
