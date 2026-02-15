// Async wrappers for chrome.storage.local
// Eliminates callback nesting throughout the codebase

async function getStorage(keys) {
  return new Promise(r => chrome.storage.local.get(keys, r));
}

async function setStorage(obj) {
  return new Promise(r => chrome.storage.local.set(obj, r));
}
