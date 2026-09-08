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

	// A single continuous spiral - one tile per step, wound steadily
	// downward around one shared axis - matching the shape of three.js's
	// own official CSS3D periodic-table example's helix
	// (https://threejs.org/examples/#css3d_periodictable): fixed radius,
	// a constant angle step per tile, and each tile turned to face
	// STRAIGHT OUTWARD (via lookAt on a point twice as far out along its
	// own radius) rather than sideways along the direction of travel.
	// That's what makes the coil readable as a whole from one side-on
	// camera angle: every tile presents its full face to the viewer at
	// once, instead of being seen edge-on at the sides of the loop the way
	// a "wall of columns" would be.
	//
	// This replaces an earlier two-strand "double helix" (DNA-style) shape.
	// That version worked, but two strands sharing the same coil meant half
	// the tiles were always on the far side facing away, and it needed its
	// own bespoke tuning to avoid looking like solid vertical pillars.
	// Reusing the reference example's own proven numbers - radius 900,
	// 0.175 radians of turn per tile, 8 units of drop per tile - sidesteps
	// re-deriving that tuning from scratch: those exact constants are
	// already the ones that read cleanly as a wound spiral over there, and
	// they scale here the same way every other shape's spacing does (by
	// the same count-based `scale` factor), so the coil stays readable
	// whether the sheet has 50 people or 500.
	const vector = new THREE.Vector3();
	const targets = [];

	const RADIUS = 900 * scale;
	const ANGLE_STEP = 0.175;   // radians of turn per tile - identical to the reference example
	const Y_STEP = 8 * scale;   // vertical drop per tile

	// Centers the whole spiral vertically around y=0 regardless of how many
	// tiles are in it (the reference example never needs this - its
	// element count is fixed - but our data isn't).
	const Y_OFFSET = ( count - 1 ) * Y_STEP / 2;

	for ( let i = 0; i < count; i ++ ) {

		const theta = i * ANGLE_STEP + Math.PI;
		const y = - ( i * Y_STEP ) + Y_OFFSET;

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
	// Tightened from 600 -> 380 for the same reason - shorter total depth
	// means less of that receding "tunnel" for the gaps to reveal.
	const Z_SPACING = 380 * scale;

	const targets = [];
	const totalLayers = Math.ceil( count / ( GRID_WIDTH * GRID_HEIGHT ) );

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

		const object = new THREE.Object3D();
		object.position.x = ( x * X_SPACING ) - ( ( GRID_WIDTH - 1 ) * X_SPACING ) / 2;
		object.position.y = - ( y * Y_SPACING ) + ( ( GRID_HEIGHT - 1 ) * Y_SPACING ) / 2;
		object.position.z = ( depthIndex * Z_SPACING ) - ( ( totalLayers - 1 ) * Z_SPACING ) / 2;
		object.userData.scale = scale;

		targets.push( object );

	}

	return targets;

}

export { buildTableTargets, buildSphereTargets, buildHelixTargets, buildGridTargets, GRID_WIDTH, GRID_HEIGHT, computeScaleFactor };
