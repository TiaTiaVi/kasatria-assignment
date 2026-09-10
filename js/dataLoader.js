// Fetches the 200-person dataset live from the actual Google Sheet, instead
// of using a hardcoded copy. This is what Instruction #3 in the assignment
// requires: "retrieve the data from your Google Sheet."

// The API key and Sheet ID live in config.js, which is NOT committed to
// GitHub (see js/config.example.js and README.md's "API keys & GitHub"
// section) - this file only ever imports them, it never states them
// directly, so there's nothing here for a `git push` to leak.
import { GOOGLE_SHEETS_API_KEY, SPREADSHEET_ID } from './config.js';

// Google's own docs are upfront that the Sheets API can return a transient
// 503 ("The service is currently unavailable") or 429 (rate limited) even
// when everything on our end - sharing, the API key, the request itself -
// is completely fine, and they recommend simply retrying with backoff.
// Sharing/permission problems come back as 403, a different, PERMANENT
// error we should NOT retry (retrying it just wastes time before showing
// the exact same failure).
const RETRYABLE_STATUS_CODES = new Set( [ 503, 429 ] );
const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 600; // 600ms, then 1200ms, then 2400ms

function wait( ms ) {

	return new Promise( resolve => setTimeout( resolve, ms ) );

}

// Wraps fetch() so a transient Google-side hiccup gets a couple of quick,
// automatic retries before we ever bother the person with an error screen -
// exactly what Google's own troubleshooting guide recommends for 503s.
async function fetchWithRetry( url ) {

	let lastError;

	for ( let attempt = 0; attempt <= MAX_RETRIES; attempt ++ ) {

		let response;

		try {

			response = await fetch( url );

		} catch ( networkErr ) {

			// A dropped connection is just as transient as a 503 - worth
			// retrying the same way.
			lastError = networkErr;
			if ( attempt < MAX_RETRIES ) { await wait( RETRY_BASE_DELAY_MS * Math.pow( 2, attempt ) ); continue; }
			throw networkErr;

		}

		if ( response.ok ) return response;

		if ( RETRYABLE_STATUS_CODES.has( response.status ) && attempt < MAX_RETRIES ) {

			console.warn( `Google Sheets returned ${ response.status } (attempt ${ attempt + 1 }/${ MAX_RETRIES + 1 }) - retrying...` );
			await wait( RETRY_BASE_DELAY_MS * Math.pow( 2, attempt ) );
			continue;

		}

		// Either not a retryable status (e.g. 403 permissions, 400 bad
		// request) or we've used up our retries - surface it now.
		return response;

	}

	throw lastError;

}

// Finds the actual name of the FIRST tab in the spreadsheet, instead of
// assuming it's called "Sheet1". This means renaming the tab later won't
// break anything - we always ask Google what the tab is actually called.
async function getFirstSheetName() {

	const metaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${ SPREADSHEET_ID }?fields=sheets.properties.title&key=${ GOOGLE_SHEETS_API_KEY }`;
	const response = await fetchWithRetry( metaUrl );

	if ( ! response.ok ) {

		const errorBody = await response.text();
		throw new Error( `Could not read spreadsheet info (${ response.status }): ${ errorBody }` );

	}

	const data = await response.json();
	const firstSheet = data.sheets && data.sheets[ 0 ];

	if ( ! firstSheet ) throw new Error( 'The spreadsheet has no sheets/tabs at all.' );

	return firstSheet.properties.title;

}

async function getData() {

	const sheetName = await getFirstSheetName();

	// We ask for the whole used range of columns A-F (Name, Photo, Age,
	// Country, Interest, Net Worth) rather than guessing a fixed row count -
	// this way it still works even if rows are added or removed later.
	// NOTE: all people must live in this one tab - a second tab won't be
	// automatically picked up, since a table/grid layout for 200 people
	// assumes one unified list.
	const range = `${ sheetName }!A:F`;
	const url = `https://sheets.googleapis.com/v4/spreadsheets/${ SPREADSHEET_ID }/values/${ range }?key=${ GOOGLE_SHEETS_API_KEY }`;

	const response = await fetchWithRetry( url );

	if ( ! response.ok ) {

		const errorBody = await response.text();
		throw new Error( `Google Sheets request failed (${ response.status }): ${ errorBody }` );

	}

	const data = await response.json();
	const rows = data.values;

	if ( ! rows || rows.length < 2 ) {

		throw new Error( 'Google Sheet returned no data rows.' );

	}

	// First row is the header - find each column by name (trimmed and
	// lowercased) rather than assuming a fixed position, since the sheet's
	// header cells might have stray spaces (the original CSV did).
	const header = rows[ 0 ].map( h => h.trim().toLowerCase() );
	const colIndex = {
		name: header.indexOf( 'name' ),
		photo: header.indexOf( 'photo' ),
		age: header.indexOf( 'age' ),
		country: header.indexOf( 'country' ),
		interest: header.indexOf( 'interest' ),
		netWorth: header.indexOf( 'net worth' )
	};

	for ( const [ key, index ] of Object.entries( colIndex ) ) {

		if ( index === - 1 ) throw new Error( `Could not find a "${ key }" column in the sheet header.` );

	}

	const people = rows.slice( 1 )
		.filter( row => row.length > 0 && row[ colIndex.name ] ) // skip any blank rows
		.map( row => ( {
			name: ( row[ colIndex.name ] || '' ).trim(),
			photo: ( row[ colIndex.photo ] || '' ).trim(),
			age: ( row[ colIndex.age ] || '' ).trim(),
			country: ( row[ colIndex.country ] || '' ).trim(),
			interest: ( row[ colIndex.interest ] || '' ).trim(),
			netWorth: parseFloat( ( row[ colIndex.netWorth ] || '0' ).replace( /[^0-9.-]/g, '' ) ) || 0
		} ) );

	console.log( `Loaded ${ people.length } people live from Google Sheets (tab: "${ sheetName }").` );
	return people;

}

export { getData };
