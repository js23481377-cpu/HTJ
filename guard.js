// =========================================================
// GUARDIÁN ESTRICTO (NIVEL COMERCIAL) - LIFE TRADING
// =========================================================

// 1. CANDADO VISUAL: Ocultar toda la página inmediatamente (Evita pantallazos de caché)
document.documentElement.style.visibility = 'hidden';

// 2. BLOQUEO ANTI-CURIOSOS (Desactiva Click Derecho y Teclas de Desarrollo)
document.addEventListener('contextmenu', event => event.preventDefault());
document.addEventListener('keydown', (event) => {
  if (event.key === 'F12') event.preventDefault();
  if (event.ctrlKey && event.shiftKey && (event.key === 'I' || event.key === 'i' || event.key === 'J' || event.key === 'j' || event.key === 'C' || event.key === 'c')) {
    event.preventDefault();
  }
  if (event.ctrlKey && (event.key === 'U' || event.key === 'u')) event.preventDefault();
});

(function initGuard() {
  const LOGIN_PAGE = 'login.html'; // Asegúrate de que tu página de login se llame así

  // Función de expulsión militar
  function enforceKick() {
    localStorage.removeItem('life_trading_user');
    // location.replace elimina el historial actual, rompiendo el botón "Atrás"
    window.location.replace(LOGIN_PAGE);
  }

  // 3. VERIFICACIÓN LOCAL INMEDIATA
  const currentUser = localStorage.getItem('life_trading_user');
  if (!currentUser) {
    enforceKick();
    return;
  }

  // Si pasa la revisión local, hacemos visible la página
  document.documentElement.style.visibility = 'visible';

  // 4. CAZADOR DEL BOTÓN "ATRÁS" (BFCache)
  window.addEventListener('pageshow', (event) => {
    // Si la página se cargó desde la memoria caché del navegador o no hay sesión
    if (event.persisted || !localStorage.getItem('life_trading_user')) {
      if (!localStorage.getItem('life_trading_user')) {
        enforceKick();
      }
    }
  });

  // 5. VERIFICACIÓN EN LA NUBE (Al cargar el DOM)
  document.addEventListener('DOMContentLoaded', async () => {
    let userData = null;

    try {
      userData = JSON.parse(currentUser);
      
      // Personalizar Sidebar
      const userNameEl = document.querySelector('.user-profile .user-name');
      const avatarEl = document.querySelector('.user-profile .avatar');
      if (userNameEl && userData.username) userNameEl.textContent = userData.username.toUpperCase();
      if (avatarEl && userData.username) avatarEl.textContent = userData.username.charAt(0).toUpperCase();
    } catch (e) {
      enforceKick();
      return;
    }

    // VALIDACIÓN ESTRICTA CON SUPABASE
    if (typeof supabase !== 'undefined' && userData) {
      try {
        const SUPABASE_URL = 'https://mhvvpuvkyjrjvmhowwme.supabase.co';
        const SUPABASE_KEY = 'sb_publishable_LCK17AcmINHv8d_X14yuxg_LyeQj172';
        
        const localDb = (typeof window.db !== 'undefined') ? window.db : supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        
        const query = userData.id 
          ? localDb.from('profiles').select('id, is_approved').eq('id', userData.id).single()
          : localDb.from('profiles').select('id, is_approved').eq('email', userData.email).single();

        const { data: profile, error } = await query;

        // SI NO ESTÁ EN LA BASE DE DATOS O NO ESTÁ APROBADO -> AFUERA
        if (error || !profile || profile.is_approved === false) {
          console.warn('Bloqueo de seguridad: Usuario inválido en la nube.');
          enforceKick();
          return;
        }
      } catch (err) {
        console.error('Error del Guardián:', err);
      }
    }

    // 6. BOTÓN DE CERRAR SESIÓN SEGURO
    const logoutBtns = document.querySelectorAll('.btn-logout');
    logoutBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        if (confirm('¿Deseas cerrar sesión de forma segura?')) {
          enforceKick();
        }
      });
    });
  });
})();
