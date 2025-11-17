// Copy and paste this entire script into Chrome DevTools Console
// This will clear all M-CHAT related storage and show you what was there

console.log('🔍 Checking storage...\n');

// Show what's currently stored
const keys = ['mchat-tutorial-completed', 'mchat-session-storage', 'mchat-tts-enabled', 'mchat-language'];
keys.forEach(key => {
  const value = localStorage.getItem(key);
  if (value) {
    console.log(`Found: ${key}`);
    if (key === 'mchat-session-storage') {
      try {
        const parsed = JSON.parse(value);
        console.log('  Session History:', parsed.state?.sessionHistory?.length || 0, 'sessions');
        console.log('  Current Session:', parsed.state?.currentSession?.child_name || 'None');
      } catch (e) {
        console.log('  Raw value:', value.substring(0, 100) + '...');
      }
    } else {
      console.log('  Value:', value);
    }
  }
});

console.log('\n🗑️  Clearing storage...\n');

// Clear all M-CHAT keys
localStorage.removeItem('mchat-tutorial-completed');
localStorage.removeItem('mchat-session-storage');
localStorage.removeItem('mchat-tts-enabled');
localStorage.removeItem('mchat-language');

// Also clear sessionStorage
sessionStorage.clear();

console.log('✅ All M-CHAT storage cleared!');
console.log('\n📋 Verification:');
keys.forEach(key => {
  const value = localStorage.getItem(key);
  console.log(`${key}: ${value ? '❌ Still exists!' : '✅ Cleared'}`);
});

console.log('\n🔄 Please refresh the page now!');

