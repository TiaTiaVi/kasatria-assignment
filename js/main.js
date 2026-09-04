import * as THREE from 'three';
import TWEEN from 'three/addons/libs/tween.module.js';
import { TrackballControls } from 'three/addons/controls/TrackballControls.js';
import { CSS3DRenderer } from 'three/addons/renderers/CSS3DRenderer.js';

import { getData } from './data.js';
import { buildTile } from './tileFactory.js';
import { buildTableTargets, buildSphereTargets, buildDoubleHelixTargets, buildGridTargets } from './layouts.js';

let camera, scene, renderer, controls;
const objects = [];
let targets = { table: [], sphere: [], helix: [], grid: [] };

// TEMPORARY: for now we start the app directly, skipping login,
// so we can test the visualization on its own first.
// The next step will wire this up behind the real Google Sign-In flow.
startApp();

async function startApp() {

	document.getElementById( 'login-screen' ).classList.add( 'hidden' );
	document.getElementById( 'app' ).classList.remove( 'hidden' );

	const people = await getData();
	init( people );
	animate();

}

function init( people ) {

	camera = new THREE.PerspectiveCamera( 40, window.innerWidth / window.innerHeight, 1, 10000 );
	camera.position.z = 3000;

	scene = new THREE.Scene();

	// Build one tile per person, starting at a random scattered position.
	people.forEach( ( person, i ) => {

		const objectCSS = buildTile( person, i );
		objectCSS.position.x = Math.random() * 4000 - 2000;
		objectCSS.position.y = Math.random() * 4000 - 2000;
		objectCSS.position.z = Math.random() * 4000 - 2000;
		scene.add( objectCSS );

		objects.push( objectCSS );

	} );

	// Precompute the target positions for all four layouts.
	const count = people.length;
	targets = {
		table: buildTableTargets( count ),
		sphere: buildSphereTargets( count ),
		helix: buildDoubleHelixTargets( count ),
		grid: buildGridTargets( count )
	};

	renderer = new CSS3DRenderer();
	renderer.setSize( window.innerWidth, window.innerHeight );
	document.getElementById( 'container' ).appendChild( renderer.domElement );

	controls = new TrackballControls( camera, renderer.domElement );
	controls.minDistance = 500;
	controls.maxDistance = 8000;
	controls.addEventListener( 'change', render );

	document.getElementById( 'table' ).addEventListener( 'click', () => transform( targets.table, 2000 ) );
	document.getElementById( 'sphere' ).addEventListener( 'click', () => transform( targets.sphere, 2000 ) );
	document.getElementById( 'helix' ).addEventListener( 'click', () => transform( targets.helix, 2000 ) );
	document.getElementById( 'grid' ).addEventListener( 'click', () => transform( targets.grid, 2000 ) );

	transform( targets.table, 2000 );

	window.addEventListener( 'resize', onWindowResize );

}

function transform( layoutTargets, duration ) {

	TWEEN.removeAll();

	for ( let i = 0; i < objects.length; i ++ ) {

		const object = objects[ i ];
		const target = layoutTargets[ i ];

		new TWEEN.Tween( object.position )
			.to( { x: target.position.x, y: target.position.y, z: target.position.z }, Math.random() * duration + duration )
			.easing( TWEEN.Easing.Exponential.InOut )
			.start();

		new TWEEN.Tween( object.rotation )
			.to( { x: target.rotation.x, y: target.rotation.y, z: target.rotation.z }, Math.random() * duration + duration )
			.easing( TWEEN.Easing.Exponential.InOut )
			.start();

	}

	new TWEEN.Tween( {} )
		.to( {}, duration * 2 )
		.onUpdate( render )
		.start();

}

function onWindowResize() {

	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize( window.innerWidth, window.innerHeight );
	render();

}

function animate() {

	requestAnimationFrame( animate );
	TWEEN.update();
	controls.update();

}

function render() {

	renderer.render( scene, camera );

}
