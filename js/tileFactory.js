import { CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';

// Turns a net worth number into a color, per the assignment:
// Red < $100K, Orange > $100K, Green > $200K
function getNetWorthColor( netWorth ) {

	if ( netWorth > 200000 ) return { name: 'green', rgb: '76, 217, 100' };
	if ( netWorth > 100000 ) return { name: 'orange', rgb: '255, 149, 0' };
	return { name: 'red', rgb: '255, 59, 48' };

}

function formatCurrency( netWorth ) {

	return '$' + netWorth.toLocaleString( 'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 } );

}

// Builds one tile (a CSS3DObject) for a single person, given their data and index.
// onClick (optional) is called with the person's data whenever their tile is clicked -
// this is what powers the "click a tile to see the full profile" popup.
function buildTile( person, index, onClick ) {

	const color = getNetWorthColor( person.netWorth );

	const element = document.createElement( 'div' );
	element.className = 'element';
	element.style.borderColor = `rgba(${ color.rgb }, 0.9)`;

	// SOLID tile background (per the assignment's own reference image): a
	// mostly-opaque net-worth-colored panel over a dark backing, rather than
	// the old 18%-alpha wash. Two consequences of that old near-transparent
	// background: (1) tiles barely read as "colored" at all - the red/orange/
	// green signal was much fainter than intended, and (2) in Grid especially,
	// with real depth (10 layers), seeing mostly-see-through tiles let
	// several layers' worth of card outlines blend together into a smeared,
	// hard-to-read mess - "solid" here also directly fixes that, since an
	// opaque front tile now fully hides whatever sits behind it, the same way
	// a real printed card would.
	element.style.backgroundColor = `rgba(${ color.rgb }, 0.94)`;

	if ( onClick ) {

		element.style.cursor = 'pointer';
		element.style.pointerEvents = 'auto';
		// Store the person's data directly on this DOM node - main.js reads this
		// back to figure out who was clicked, using a more reliable detection
		// method than a plain listener on the tile itself (see main.js for why).
		element._person = person;

	}

	// SUPERSAMPLING for sharper tiles: we build all the visual content at
	// DOUBLE size (260x360 instead of 130x180), then scale the whole thing
	// down by half with CSS. The browser renders text/images at that larger
	// size first (more actual pixel detail), then shrinks it - the result
	// looks noticeably crisper than rendering directly at the small size,
	// the same principle behind why "Retina" images look sharper.
	const supersample = document.createElement( 'div' );
	supersample.className = 'supersample';
	element.appendChild( supersample );

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
