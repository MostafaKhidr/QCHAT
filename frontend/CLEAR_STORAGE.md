# How to Clear Storage for Testing

## Quick Console Commands

Open Chrome DevTools (F12) and run these commands in the Console tab:

### Clear Tutorial Completion
```javascript
localStorage.removeItem('mchat-tutorial-completed');
```

### Clear All Session Data
```javascript
localStorage.removeItem('mchat-session-storage');
```

### Clear Everything (Tutorial + Sessions)
```javascript
localStorage.removeItem('mchat-tutorial-completed');
localStorage.removeItem('mchat-session-storage');
localStorage.removeItem('mchat-tts-enabled'); // Optional: also clear TTS preference
```

### Clear All LocalStorage for This Site
```javascript
localStorage.clear();
```

### Clear Session Storage Too
```javascript
sessionStorage.clear();
```

## Method 2: Chrome DevTools UI

1. **Open DevTools**: Press `F12` or `Cmd+Option+I` (Mac) / `Ctrl+Shift+I` (Windows)
2. **Go to Application Tab** (or "Storage" in older Chrome)
3. **In the left sidebar:**
   - Expand **Local Storage**
   - Click on your site URL (e.g., `http://localhost:5173`)
4. **Delete specific keys:**
   - Right-click on `mchat-tutorial-completed` → Delete
   - Right-click on `mchat-session-storage` → Delete
5. **Or clear all:** Right-click on the site URL → Clear

## Method 3: Chrome Settings (Nuclear Option)

This clears ALL site data for your domain:

1. Click the **lock icon** or **info icon** in the address bar
2. Click **Site settings**
3. Click **Clear data** or **Reset permissions**
4. Check "Cookies and site data"
5. Click **Clear**

## Testing the Tutorial

After clearing storage, refresh the page and:
1. Create a new session
2. Navigate to the chat page
3. The tutorial should pop up automatically

## Verify Storage is Cleared

Run this in the console to check:
```javascript
console.log('Tutorial completed:', localStorage.getItem('mchat-tutorial-completed'));
console.log('Session storage:', localStorage.getItem('mchat-session-storage'));
```

Both should return `null` if cleared successfully.

## Debug: Check What's Actually Stored

If you can't find the data, run this comprehensive check:

```javascript
// Check all localStorage keys
console.log('All localStorage keys:', Object.keys(localStorage));

// Check specific keys
console.log('mchat-tutorial-completed:', localStorage.getItem('mchat-tutorial-completed'));
console.log('mchat-session-storage:', localStorage.getItem('mchat-session-storage'));
console.log('mchat-tts-enabled:', localStorage.getItem('mchat-tts-enabled'));
console.log('mchat-language:', localStorage.getItem('mchat-language'));

// Parse session storage if it exists
const sessionData = localStorage.getItem('mchat-session-storage');
if (sessionData) {
  try {
    const parsed = JSON.parse(sessionData);
    console.log('Parsed session data:', parsed);
    console.log('Session history:', parsed.state?.sessionHistory);
    console.log('Current session:', parsed.state?.currentSession);
  } catch (e) {
    console.error('Error parsing:', e);
  }
}
```

## Nuclear Option: Clear Everything

If sessions still persist, the data might be coming from the backend API. Try this:

```javascript
// Clear ALL localStorage
localStorage.clear();

// Clear ALL sessionStorage
sessionStorage.clear();

// Clear IndexedDB (if used)
indexedDB.databases().then(databases => {
  databases.forEach(db => {
    indexedDB.deleteDatabase(db.name);
  });
});

console.log('✅ Everything cleared! Refresh the page.');
```

## If Session Still Exists After Clearing

If the session still appears after clearing storage, it might be:
1. **Loaded from the backend API** - The session token in the URL might be fetching data from the server
2. **Cached in React state** - The app might have the session in memory
3. **Different domain/port** - Check if you're on a different localhost port

To fully reset:
1. Clear storage (as above)
2. **Close all tabs** with the app
3. **Clear browser cache** (Cmd+Shift+Delete / Ctrl+Shift+Delete)
4. **Restart the dev server**
5. Open a fresh tab and navigate to the homepage (not directly to a chat URL)

