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
function buildTile( person, index ) {

	const color = getNetWorthColor( person.netWorth );

	const element = document.createElement( 'div' );
	element.className = 'element';
	element.style.borderColor = `rgba(${ color.rgb }, 0.9)`;
	element.style.boxShadow = `0px 0px 14px rgba(${ color.rgb }, 0.55)`;
	element.style.backgroundColor = `rgba(${ color.rgb }, 0.18)`;

	const number = document.createElement( 'div' );
	number.className = 'number';
	number.textContent = index + 1;
	element.appendChild( number );

	const photo = document.createElement( 'img' );
	photo.className = 'photo';
	photo.src = person.photo;
	photo.loading = 'lazy';
	photo.referrerPolicy = 'no-referrer';
	element.appendChild( photo );

	const name = document.createElement( 'div' );
	name.className = 'name';
	name.textContent = person.name;
	element.appendChild( name );

	const details = document.createElement( 'div' );
	details.className = 'details';
	details.innerHTML = `${ person.age } &middot; ${ person.country }<br>${ person.interest }<br>${ formatCurrency( person.netWorth ) }`;
	element.appendChild( details );

	return new CSS3DObject( element );

}

export { buildTile, getNetWorthColor, formatCurrency };
