// Handles the "Sign in with Google" login gate (Image A in the assignment).
//
// How this works, in plain terms:
// 1. Google's own script (loaded in index.html) draws the actual Sign-In button.
// 2. When someone signs in successfully, Google calls our onGoogleSignIn()
//    function below, handing us a "credential" (a signed token proving who
//    they are).
// 3. We don't need to verify that token ourselves for this assignment (that
//    would require a backend server) - simply receiving it means Google
//    already confirmed their identity, so we treat that as "logged in" and
//    reveal the visualization.

// ==== IMPORTANT: replace this with your own OAuth Client ID from Google Cloud ====
// This value is safe to have public - it's not a secret (see the conversation
// history / README for why). It just tells Google which registered app this is.
const GOOGLE_CLIENT_ID = '273585124672-loolmavnq7jssoqoneu6q6c70mh41v7b.apps.googleusercontent.com';

let onLoginSuccess = null;

// How many times we'll check for the Google script before giving up and
// showing a real error - 50 tries at 100ms apart is 5 seconds, generous
// enough for even a slow connection.
const GOOGLE_SCRIPT_MAX_RETRIES = 50;
const GOOGLE_SCRIPT_RETRY_DELAY_MS = 100;

// Call this once, passing a function to run after a successful login.
function initGoogleSignIn( callback ) {

	onLoginSuccess = callback;
	waitForGoogleScript( 0 );

}

// google.accounts is provided by the <script src="https://accounts.google.com/gsi/client">
// tag in index.html, which is loaded with async/defer so it can finish
// AFTER our own module script runs - a race, not a guarantee. Landing here
// too early used to just give up silently, which is exactly what caused
// the sign-in button to never appear until the page was refreshed (and
// refreshing "won by luck" only because the script was then already cached).
// Polling briefly instead of failing on the very first check is what
// actually fixes that, without needing the person to do anything.
function waitForGoogleScript( attempt ) {

	if ( window.google && window.google.accounts ) {

		setUpGoogleSignIn();
		return;

	}

	if ( attempt >= GOOGLE_SCRIPT_MAX_RETRIES ) {

		console.error( 'Google Identity Services script did not load. Check your internet connection or ad-blocker.' );
		const note = document.getElementById( 'login-access-note' );
		if ( note ) {

			note.textContent = 'Could not load Google Sign-In. Please check your connection and reload the page.';
			note.style.color = '#c0392b';

		}

		return;

	}

	setTimeout( () => waitForGoogleScript( attempt + 1 ), GOOGLE_SCRIPT_RETRY_DELAY_MS );

}

function setUpGoogleSignIn() {

	google.accounts.id.initialize( {
		client_id: GOOGLE_CLIENT_ID,
		callback: handleCredentialResponse,
		auto_select: ! isSessionExpired(), // don't auto-resume a session that's too old
		cancel_on_tap_outside: false
	} );

	google.accounts.id.renderButton(
		document.getElementById( 'g_id_signin_container' ),
		{ theme: 'outline', size: 'large', shape: 'pill', text: 'signin_with' }
	);

	// If the browser still has a valid Google session, our own session hasn't
	// expired, and the person hasn't explicitly signed out, this silently
	// logs them back in without another click.
	if ( ! isSessionExpired() ) google.accounts.id.prompt();

}

function handleCredentialResponse( response ) {

	// response.credential is a JWT (a signed token) containing the person's
	// basic Google profile info (name, email, picture). We decode just enough
	// of it here to show a welcome message - we don't need a backend for that.
	try {

		const payload = JSON.parse( atob( response.credential.split( '.' )[ 1 ] ) );
		console.log( 'Signed in as:', payload.email );

		// Remember when they signed in, so we can force a fresh sign-in after
		// a set number of hours even if Google's own session is still valid -
		// a simple, self-managed session timeout.
		localStorage.setItem( 'kasatria_login_time', Date.now().toString() );

		if ( onLoginSuccess ) onLoginSuccess( payload );

	} catch ( err ) {

		console.error( 'Failed to read Google sign-in response:', err );

	}

}

const SESSION_MAX_HOURS = 8;

// Returns true if the person needs to sign in again - either they never
// signed in on this browser, or it's been too long since they last did.
function isSessionExpired() {

	const loginTime = localStorage.getItem( 'kasatria_login_time' );
	if ( ! loginTime ) return true;

	const hoursElapsed = ( Date.now() - parseInt( loginTime, 10 ) ) / ( 1000 * 60 * 60 );
	return hoursElapsed > SESSION_MAX_HOURS;

}

// Signs the person out: clears our own session record and tells Google not
// to auto-select this account next time, then shows the login screen again.
function signOut() {

	localStorage.removeItem( 'kasatria_login_time' );
	if ( window.google && google.accounts ) google.accounts.id.disableAutoSelect();

	document.getElementById( 'app' ).classList.add( 'hidden' );
	document.getElementById( 'login-screen' ).classList.remove( 'hidden' );

}

export { initGoogleSignIn, isSessionExpired, signOut };
