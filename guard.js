document.documentElement.style.visibility = 'hidden';
function denyAccess() {
  document.documentElement.style.visibility = 'hidden';
  window.currentProfile = null;
  window.location.replace('login.html');
}
window.authReady = (async () => {
  try {
    const profile = await readProfile();
    if (!profile || profile.is_approved !== true) { denyAccess(); return null; }
    window.currentProfile = profile;
    // Cachés separados por perfil. Las claves antiguas se conservan sin asignarlas
    // automáticamente: no se conoce su propietario de forma confiable.
    window.userStorageKey = key => key + ':' + profile.id;
    document.documentElement.style.visibility = 'visible';
    return profile;
  } catch { denyAccess(); return null; }
})();
document.addEventListener('DOMContentLoaded', async () => {
  if (!await window.authReady) return;
  document.querySelectorAll('.btn-logout').forEach(button => {
    button.addEventListener('click', async event => {
      event.preventDefault();
      document.documentElement.style.visibility = 'hidden';
      await db.auth.signOut({scope: 'local'}).catch(() => {});
      denyAccess();
    });
  });
});
db.auth.onAuthStateChange(event => { if (event === 'SIGNED_OUT') denyAccess(); });
let checking = false;
async function recheck() {
  if (checking || document.hidden) return;
  checking = true;
  try {
    const profile = await readProfile();
    if (!profile || !window.currentProfile || profile.id !== window.currentProfile.id || profile.is_approved !== true) denyAccess();
  } catch { denyAccess(); }
  finally { checking = false; }
}
window.addEventListener('pageshow', event => { if (event.persisted) recheck(); });
window.addEventListener('focus', recheck);
setInterval(recheck, 60000);
