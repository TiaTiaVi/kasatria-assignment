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

function buildDoubleHelixTargets( count ) {

	const scale = computeScaleFactor( count );

	// A DOUBLE helix: two intertwined strands, like DNA.
	// Even-index tiles go on strand A, odd-index tiles go on strand B.
	// Strand B is offset by 180 degrees (Math.PI) from strand A at the same "rung" height,
	// which is what makes them visually wind around each other instead of stacking as one strand.
	const vector = new THREE.Vector3();
	const targets = [];

	const rungs = Math.max( 1, Math.ceil( count / 2 ) );

	// The coil is defined by a fixed TOTAL number of turns over the whole
	// shape (not a fixed per-rung angle) - this is what keeps it looking
	// like a proper, evenly-wound spiral no matter how many people are in
	// the data, instead of a fixed angle-per-rung silently over- or
	// under-winding the coil as the count changes.
	//
	// IMPORTANT: this previously used a fixed 18px vertical step per rung,
	// which packed each 360-degree loop only ~250px apart - less than the
	// tile's own height (180px). Seen from a fixed angle, that made
	// consecutive coils visually collide into solid vertical bars instead
	// of a readable spiral (the "looks like pillars, not a helix" bug).
	// 26px per rung instead gives each full turn roughly 3 tile-heights of
	// clearance, so the coils stay visually separated.
	// Widened significantly (radius 820 -> 1300) and shortened a bit
	// (26px/rung -> 20px/rung) so the coil reads as a broad, screen-filling
	// spiral rather than a tall narrow tube - arc-length between rungs
	// actually gets even MORE generous at this wider radius (about 368
	// units vs the previous 232), so spacing stays safely clear of the
	// original overlapping-pillars bug despite the shorter height.
	const TOTAL_TURNS = 4.5;
	const ANGLE_STEP = ( TOTAL_TURNS * Math.PI * 2 ) / rungs;   // how much each rung rotates around the helix axis
	const Y_STEP = 20 * scale;                                  // vertical distance between rungs
	const RADIUS = 1300 * scale;

	for ( let i = 0; i < count; i ++ ) {

		const rung = Math.floor( i / 2 );          // which "rung" of the ladder this tile belongs to
		const strand = i % 2;                      // 0 = strand A, 1 = strand B

		const theta = rung * ANGLE_STEP + ( strand === 1 ? Math.PI : 0 );
		const y = - ( rung * Y_STEP ) + 450;

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

export { buildTableTargets, buildSphereTargets, buildDoubleHelixTargets, buildGridTargets, GRID_WIDTH, GRID_HEIGHT, computeScaleFactor };
