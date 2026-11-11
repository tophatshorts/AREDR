// Load cloud services independently so an unavailable CDN never blocks guest play.
let servicePromise, accountListener, errorListener, unsubscribe;
function observe(s) {
  if (accountListener && !unsubscribe) unsubscribe = s.onAuthStateChanged(s.auth, accountListener, errorListener);
}
export function services() {
  return servicePromise ||= (async () => {
    const response = await fetch('/firebase-config.json');
    if (!response.ok) throw new Error('Firebase configuration could not be loaded. Guest play is available.');
    const config = await response.json();
    if (!config.apiKey || !config.projectId) throw new Error('Firebase is not configured yet. You can still play as a guest.');
    const [appSDK, authSDK, storeSDK] = await Promise.all([
      import('https://www.gstatic.com/firebasejs/13.2.0/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/13.2.0/firebase-auth.js'),
      import('https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js')
    ]);
    const app = appSDK.initializeApp(config);
    const auth = authSDK.getAuth(app);
    const db = storeSDK.getFirestore(app, config.firestoreDatabaseId || '(default)');
    const service = { auth, db, ...authSDK, ...storeSDK };
    observe(service);
    return service;
  })().catch(error => { servicePromise = null; throw error; });
}
export async function watchAccount(callback, onError) {
  accountListener = callback; errorListener = onError;
  try { observe(await services()); }
  catch (error) { onError(error); }
  return () => { unsubscribe?.(); unsubscribe = null; accountListener = null; };
}
export async function authenticate(mode, email, password, name) {
  const s = await services();
  if (mode === 'google') return s.signInWithPopup(s.auth, new s.GoogleAuthProvider());
  if (mode === 'reset') return s.sendPasswordResetEmail(s.auth, email);
  if (mode === 'signup') {
    const result = await s.createUserWithEmailAndPassword(s.auth, email, password);
    await s.updateProfile(result.user, { displayName: name.trim() });
    return result;
  }
  return s.signInWithEmailAndPassword(s.auth, email, password);
}
export async function logout() { const s = await services(); await s.signOut(s.auth); }
export async function loadProfile(uid) {
  const s = await services();
  const snapshot = await s.getDoc(s.doc(s.db, 'gdrngPlayers', uid));
  return snapshot.exists() ? snapshot.data() : null;
}
export async function saveProfile(user, state, best, daily, day) {
  const s = await services();
  // Capture the account with each write; never write an earlier player's state to a new account.
  if (s.auth.currentUser?.uid !== user.uid) throw new Error('Your session changed. Sign in again to save.');
  const save = JSON.stringify(state);
  if (new TextEncoder().encode(save).length > 900000) throw new Error('Collection is too large for cloud storage. Export a backup.');
  const username = (user.displayName || 'Dasher').slice(0, 24);
  await s.setDoc(s.doc(s.db, 'gdrngPlayers', user.uid), { save, updatedAt: Date.now(), username });
  const writes = [];
  const entry = (level) => ({ username, levelId: level.id, levelName: level.name, difficulty: level.difficulty, difficultyRank: rank(level), rolls: state.rolls, updatedAt: Date.now() });
  if (best) writes.push(s.setDoc(s.doc(s.db, 'gdrngLeaderboard', user.uid), entry(best)));
  if (daily) writes.push(s.setDoc(s.doc(s.db, 'gdrngDaily', day, 'entries', user.uid), entry(daily)));
  await Promise.all(writes);
}
const names = ['Auto','Easy','Normal','Hard','Harder','Insane','Easy Demon','Medium Demon','Hard Demon','Insane Demon','Extreme Demon'];
const rank = level => Math.max(0, names.indexOf(level.difficulty));
export async function leaderboard(dailyDate) {
  const s = await services();
  const ref = dailyDate ? s.collection(s.db, 'gdrngDaily', dailyDate, 'entries') : s.collection(s.db, 'gdrngLeaderboard');
  const snapshot = await s.getDocs(s.query(ref, s.orderBy('difficultyRank', 'desc'), s.orderBy('rolls', 'desc'), s.limit(100)));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a,b) => b.difficultyRank - a.difficultyRank || b.rolls - a.rolls);
}
export function accountError(error) {
  const messages = {
    'auth/invalid-credential': 'Email or password is incorrect.',
    'auth/email-already-in-use': 'An account already uses this email. Try signing in.',
    'auth/invalid-email': 'Enter a valid email address.',
    'auth/weak-password': 'Choose a stronger password with at least 8 characters.',
    'auth/popup-closed-by-user': 'Sign-in closed. Try again whenever you’re ready.',
    'auth/popup-blocked': 'Your browser blocked sign-in. Allow popups or use email.',
    'auth/unauthorized-domain': 'This domain needs to be enabled in Firebase Authentication.',
    'auth/operation-not-allowed': 'This sign-in method needs to be enabled in Firebase Authentication.',
    'auth/too-many-requests': 'Too many attempts. Please try again later.',
    'auth/network-request-failed': 'Could not reach sign-in. Check your connection and try again.',
    'permission-denied': 'Cloud storage is not enabled for Reborn yet. Your progress is saved on this device.',
    'unavailable': 'Cloud storage is offline. Your progress is saved on this device.'
  };
  return messages[error.code] || 'Could not connect to your account. Please try again. Guest play is available.';
}
