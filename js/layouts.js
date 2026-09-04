import * as THREE from 'three';

// Each function below takes the total number of tiles (200) and returns
// an array of THREE.Object3D "target" positions - one per tile, in order.
// The main app just moves each tile to targets[i] when a layout is selected.

function buildTableTargets( count ) {

	// Fixed layout: 20 columns x 10 rows, filled left-to-right, top-to-bottom.
	const COLS = 20;
	const COL_SPACING = 140;
	const ROW_SPACING = 180;

	const targets = [];

	for ( let i = 0; i < count; i ++ ) {

		const col = i % COLS;
		const row = Math.floor( i / COLS );

		const object = new THREE.Object3D();
		object.position.x = ( col * COL_SPACING ) - ( ( COLS - 1 ) * COL_SPACING ) / 2;
		object.position.y = - ( row * ROW_SPACING ) + ( ( Math.ceil( count / COLS ) - 1 ) * ROW_SPACING ) / 2;
		object.position.z = 0;

		targets.push( object );

	}

	return targets;

}

function buildSphereTargets( count ) {

	// Distributes tiles evenly across a sphere surface, each tile facing outward.
	// This is the same distribution math as the original demo - it works for any count.
	const vector = new THREE.Vector3();
	const targets = [];

	for ( let i = 0; i < count; i ++ ) {

		const phi = Math.acos( - 1 + ( 2 * i ) / count );
		const theta = Math.sqrt( count * Math.PI ) * phi;

		const object = new THREE.Object3D();
		object.position.setFromSphericalCoords( 800, phi, theta );

		vector.copy( object.position ).multiplyScalar( 2 );
		object.lookAt( vector );

		targets.push( object );

	}

	return targets;

}

function buildDoubleHelixTargets( count ) {

	// A DOUBLE helix: two intertwined strands, like DNA.
	// Even-index tiles go on strand A, odd-index tiles go on strand B.
	// Strand B is offset by 180 degrees (Math.PI) from strand A at the same "rung" height,
	// which is what makes them visually wind around each other instead of stacking as one strand.
	const vector = new THREE.Vector3();
	const targets = [];

	const ANGLE_STEP = 0.35;   // how much each rung rotates around the helix axis
	const Y_STEP = 16;         // vertical distance between rungs
	const RADIUS = 900;

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

		targets.push( object );

	}

	return targets;

}

function buildGridTargets( count ) {

	// Fixed 3D grid: 5 wide x 4 tall x 10 deep = 200 tiles exactly.
	const WIDTH = 5;
	const HEIGHT = 4;

	const X_SPACING = 400;
	const Y_SPACING = 400;
	const Z_SPACING = 600;

	const targets = [];

	for ( let i = 0; i < count; i ++ ) {

		const x = i % WIDTH;
		const y = Math.floor( i / WIDTH ) % HEIGHT;
		const z = Math.floor( i / ( WIDTH * HEIGHT ) );

		const object = new THREE.Object3D();
		object.position.x = ( x * X_SPACING ) - ( ( WIDTH - 1 ) * X_SPACING ) / 2;
		object.position.y = - ( y * Y_SPACING ) + ( ( HEIGHT - 1 ) * Y_SPACING ) / 2;
		object.position.z = ( z * Z_SPACING ) - ( ( Math.ceil( count / ( WIDTH * HEIGHT ) ) - 1 ) * Z_SPACING ) / 2;

		targets.push( object );

	}

	return targets;

}

export { buildTableTargets, buildSphereTargets, buildDoubleHelixTargets, buildGridTargets };
