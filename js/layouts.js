import * as THREE from 'three';

// The dataset this whole layout was originally designed around (the
// assignment's 200 people). Used below to figure out how much bigger or
// smaller everything should scale if the real count ever differs from this.
const REFERENCE_COUNT = 200;

// Works out one shared scale factor from the current people count.
// - More people than 200 -> factor shrinks tiles/spacing (fits more in).
// - Fewer people than 200 -> factor grows tiles/spacing (fills the space).
// Clamped so it never becomes absurdly large or small.
function computeScaleFactor( count ) {

	return THREE.MathUtils.clamp( Math.sqrt( REFERENCE_COUNT / count ), 0.5, 1.5 );

}

// Each function below takes the total number of tiles and returns an array
// of THREE.Object3D "target" positions - one per tile, in order. Each
// target also carries object.userData.scale, which main.js applies to the
// tile's own visual size - this is what keeps the overall shape's footprint
// consistent even as the people count changes.

function buildTableTargets( count ) {

	const scale = computeScaleFactor( count );

	// Fixed layout: 20 columns wide (per the assignment spec), rows grow
	// automatically to fit however many people there actually are.
	const COLS = 20;
	const COL_SPACING = 140 * scale;
	const ROW_SPACING = 180 * scale;

	const targets = [];

	for ( let i = 0; i < count; i ++ ) {

		const col = i % COLS;
		const row = Math.floor( i / COLS );

		const object = new THREE.Object3D();
		object.position.x = ( col * COL_SPACING ) - ( ( COLS - 1 ) * COL_SPACING ) / 2;
		object.position.y = - ( row * ROW_SPACING ) + ( ( Math.ceil( count / COLS ) - 1 ) * ROW_SPACING ) / 2;
		object.position.z = 0;
		object.userData.scale = scale;

		targets.push( object );

	}

	return targets;

}

function buildSphereTargets( count ) {

	const scale = computeScaleFactor( count );
	const RADIUS = 800 * scale;

	// Distributes tiles evenly across a sphere surface, each tile facing outward.
	// This is the same distribution math as the original demo - it works for any count.
	const vector = new THREE.Vector3();
	const targets = [];

	for ( let i = 0; i < count; i ++ ) {

		const phi = Math.acos( - 1 + ( 2 * i ) / count );
		const theta = Math.sqrt( count * Math.PI ) * phi;

		const object = new THREE.Object3D();
		object.position.setFromSphericalCoords( RADIUS, phi, theta );

		vector.copy( object.position ).multiplyScalar( 2 );
		object.lookAt( vector );
		object.userData.scale = scale;

		targets.push( object );

	}

	return targets;

}

function buildHelixTargets( count ) {

	const scale = computeScaleFactor( count );

	// TRUE DOUBLE HELIX - per the assignment's explicit requirement ("it
	// should be a double Helix instead of the default single Helix"): two
	// separate strands wound around the same shared axis, permanently
	// offset 180 degrees from one another - the classic DNA-style look,
	// rather than one single coil.
	//
	// Every pair of consecutive people (by rank - the data is already
	// sorted by net worth before layout runs) becomes one "rung": one
	// person on strand A, the very next person directly opposite on strand
	// B, at essentially the same height. That keeps the existing "similar
	// net worth ends up near each other" effect (see main.js) working
	// exactly as before - it's just spread across both strands at each
	// height now, instead of one single column.
	//
	// This is also what actually makes rotating the camera around the coil
	// (see setupManualRotate in main.js) reveal new data as you drag: each
	// tile still faces straight outward (lookAt, unchanged from before) and
	// is still single-sided (backface-visibility on its front face - see
	// tileFactory.js), so at any one viewing angle only ONE tile per rung
	// is ever facing anywhere near the camera - the other is facing away,
	// hidden behind its own back panel. Turning the coil swaps which
	// strand is "facing you" at every height simultaneously, the same way
	// spinning a real double helix does - so a left-click-drag rotation
	// isn't just spinning the shape in place, it's actively swapping which
	// half of the data you're looking at.
	const vector = new THREE.Vector3();
	const targets = [];

	const RADIUS = 900 * scale;

	// One "rung" advances by exactly the SAME angle/height step the
	// original single-strand helix used per TILE (0.175 rad, 8 units) -
	// not double it. This was tried first and looked broken: doubling the
	// per-rung step (on the reasoning that "one rung now covers 2 people")
	// sounds right for preserving the coil's overall height/turn count, but
	// it's the wrong thing to hold constant - what actually has to stay the
	// same is the SPACING BETWEEN CONSECUTIVE TILES OF THE SAME STRAND
	// (that's what was already tuned to overlap edge-to-edge and read as
	// one continuous wound ribbon). Each strand only contains every OTHER
	// person, so keeping the per-rung step at the original per-tile value
	// means each strand's own tiles are still exactly as tightly packed as
	// the original single helix was - doubling it left roughly a whole
	// tile-width of empty gap between one strand's own consecutive tiles,
	// which is exactly what read as disconnected vertical pillars instead
	// of a solid coil surface.
	//
	// The unavoidable consequence: packing two full strands at the
	// original's proven tile-to-tile density means the whole coil ends up
	// roughly half as many total turns (and, at this same Y_STEP, half as
	// tall) as the old single-strand version for the same head count - it
	// reads as a shorter, denser double coil rather than a taller, thinner
	// single one. HELIX_FOV/HELIX_DEFAULT_PHI in main.js don't depend on
	// this shape's exact height, only its radius (unchanged) and general
	// proportions, so nothing else needs retuning for it.
	const ANGLE_STEP = 0.175;
	// ROW_GAP_FACTOR widens the vertical step between consecutive rungs
	// (rings) beyond the old fully-shingled 8-unit step, which packed each
	// rung so tightly (a tile is 180 units tall - a step of 8 meant each
	// rung buried ~95% of the tile above/below it) that individual rings
	// were impossible to tell apart - it read as one continuous smeared
	// band rather than a coil made of distinct cards. Tuned several times
	// now, narrowing in from both directions: 4x/2x/1.4x were each reported
	// as more gap than wanted; 1.15x pulled back to just enough lift for
	// each rung's own card edge to stay visibly distinct, but was then
	// asked for "just a little bit more" - not a big jump back up, just a
	// small nudge. 1.25 is that small nudge: still much closer to the tight
	// 1.15x than to any of 1.4x/2x/4x, with a little more breathing room
	// between rungs while staying nowhere near overlapping. ANGLE_STEP
	// deliberately stays the same: only the vertical density changes, not
	// how many rungs make up one revolution, so the coil doesn't turn into
	// a faceted, few-sided prism - it stays a smooth ~36-rung-per-turn
	// coil, just a bit taller than the fully-shingled baseline (this is
	// also why HELIX_FOV/RADIUS need no retuning - the coil's radius and
	// per-turn geometry are unchanged, only its total height grows). If
	// this still needs adjusting, this is the one number to change - the
	// whole coil's height scales with it, nothing else needs retuning
	// alongside it.
	const ROW_GAP_FACTOR = 1.25;
	const Y_STEP = 8 * ROW_GAP_FACTOR * scale;

	const totalRungs = Math.ceil( count / 2 );

	// Centers the whole spiral vertically around y=0 regardless of how many
	// tiles are in it.
	const Y_OFFSET = ( totalRungs - 1 ) * Y_STEP / 2;

	for ( let i = 0; i < count; i ++ ) {

		const rung = Math.floor( i / 2 );
		const strand = i % 2; // 0 = strand A, 1 = strand B (opposite side of the axis)

		const theta = rung * ANGLE_STEP + ( strand === 1 ? Math.PI : 0 ) + Math.PI;
		const y = - ( rung * Y_STEP ) + Y_OFFSET;

		const object = new THREE.Object3D();
		object.position.setFromCylindricalCoords( RADIUS, theta, y );

		vector.x = object.position.x * 2;
		vector.y = object.position.y;
		vector.z = object.position.z * 2;
		object.lookAt( vector );
		object.userData.scale = scale;

		targets.push( object );

	}

	return targets;

}

// Exported so other files (like the grid layer stepping in main.js) can
// compute which grid layer a tile belongs to, without duplicating these numbers.
const GRID_WIDTH = 5;
const GRID_HEIGHT = 4;

function buildGridTargets( count ) {

	const scale = computeScaleFactor( count );

	// Fixed footprint: 5 wide x 4 tall (per the assignment spec), depth
	// grows automatically to fit however many people there actually are.
	//
	// IMPORTANT: tightened from 400 -> 280. At 400, the gap between tiles
	// (270px, more than double the tile's own 130px width) combined with a
	// camera close enough to size the front layer properly let you see
	// straight through those gaps into the layers receding behind - a
	// "tunnel vision" starburst effect instead of a clean grid. Tighter
	// spacing keeps the front layer looking like a proper grid, not a
	// window frame you can see through.
	const X_SPACING = 280 * scale;
	const Y_SPACING = 280 * scale;
	// Tightened again, 380 -> 300: Grid went back to a real perspective
	// camera (see GRID_FOV / render() in main.js) instead of the flat
	// orthographic one, specifically so it reads as genuinely 3D (nearer
	// layers visibly bigger, farther ones visibly smaller/receding) instead
	// of looking like a flat printout - but perspective's natural side
	// effect is that the same (x, y) column drifts sideways a little more
	// with every layer of depth once the camera isn't dead-center on it
	// (basic perspective convergence). Less total depth means less of that
	// drift accumulates across all ten layers, keeping columns reading as a
	// straight, stackable line instead of visibly fanning apart - while the
	// per-tile distance-based color recede (see applyDistanceDepthCue /
	// applyGridLayerVisibility in main.js) handles the rest: whatever slight
	// drift is still there on the far layers matters much less once they're
	// already dimmed toward the background instead of competing for
	// attention.
	const Z_SPACING = 300 * scale;

	const targets = [];
	const totalLayers = Math.ceil( count / ( GRID_WIDTH * GRID_HEIGHT ) );

	// Each layer behind the front one nudges up-and-right by a bit, on top
	// of its normal x/y grid position - purely a "fanned deck of cards"
	// visual offset, the same trick a real stack of cards or photos uses so
	// you can tell there's more than one without them being perfectly,
	// confusingly aligned. Without this, every layer sits at EXACTLY the
	// same (x, y) as the layer in front of it, and at Grid's narrow,
	// telephoto FOV (see GRID_FOV in main.js) that near-perfect alignment
	// reads as a blurry smear rather than a clean stack once more than one
	// layer is visible at once.
	//
	// Grid went back to showing its FULL depth by default (every layer at
	// once, freely orbitable - the same "just look at the whole 3D shape"
	// model Sphere/Helix already use, rather than only ever showing a
	// couple of layers near the front) - see GRID_VISIBLE_DEPTH_LAYERS's
	// removal in main.js. A FIXED per-layer offset (the old approach) broke
	// under that: it was tuned for at most 3-4 visible layers, and applied
	// across a real dataset's full 8-10 layers it accumulates into a wide,
	// lopsided smear (the back layers drifting far off to one side) rather
	// than a neat fan. TOTAL_FAN_SPAN fixes that by working backwards
	// instead: decide how far the very LAST layer should drift from the
	// front one overall, then divide that evenly across however many
	// layers actually exist - so the fan always looks like the same size,
	// deliberate "fanned deck" regardless of whether the data has 2 layers
	// or 12.
	const TOTAL_FAN_SPAN = 220 * scale;
	const LAYER_STAGGER = totalLayers > 1 ? TOTAL_FAN_SPAN / ( totalLayers - 1 ) : 0;

	for ( let i = 0; i < count; i ++ ) {

		const x = i % GRID_WIDTH;
		const y = Math.floor( i / GRID_WIDTH ) % GRID_HEIGHT;
		const z = Math.floor( i / ( GRID_WIDTH * GRID_HEIGHT ) );

		// Layer 0 (the first/highest-net-worth people, since the data is
		// sorted before layout) goes at the FRONT - closest to the camera -
		// and each following layer steps further back. Flipping the sign
		// here (totalLayers-1-z instead of z) is what fixes the layers
		// being ordered back-to-front: without it, layer 0 ended up
		// farthest away and the last layer sat closest to the camera,
		// the reverse of what should be seen first.
		const depthIndex = ( totalLayers - 1 ) - z;

		// How many layers back FROM THE FRONT this tile sits (0 = front
		// layer) - used only for the fan-out stagger above. Kept separate
		// from depthIndex (which is measured from the BACK, for the z-position
		// math) so the stagger direction stays "front layer never moves,
		// each layer behind it drifts a little further" regardless of how
		// many total layers exist.
		const layersFromFront = z;

		const object = new THREE.Object3D();
		object.position.x = ( x * X_SPACING ) - ( ( GRID_WIDTH - 1 ) * X_SPACING ) / 2 + ( layersFromFront * LAYER_STAGGER );
		object.position.y = - ( y * Y_SPACING ) + ( ( GRID_HEIGHT - 1 ) * Y_SPACING ) / 2 + ( layersFromFront * LAYER_STAGGER );
		object.position.z = ( depthIndex * Z_SPACING ) - ( ( totalLayers - 1 ) * Z_SPACING ) / 2;
		object.userData.scale = scale;

		targets.push( object );

	}

	return targets;

}

export { buildTableTargets, buildSphereTargets, buildHelixTargets, buildGridTargets, GRID_WIDTH, GRID_HEIGHT, computeScaleFactor };
