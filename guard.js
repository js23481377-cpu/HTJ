// =========================================================
// GUARDIÁN DE SEGURIDAD & CONTROL DE SESIÓN - LIFE TRADING
// =========================================================

(function initGuard() {
  // 1. Verificar si el usuario está autenticado localmente
  const currentUser = localStorage.getItem('life_trading_user');
  
  // Si no hay sesión, redirigir inmediatamente al login
  if (!currentUser) {
    window.location.replace('login.html');
    return;
  }

  // 2. Esperar a que el DOM esté listo
  document.addEventListener('DOMContentLoaded', async () => {
    let userData = null;

    try {
      userData = JSON.parse(currentUser);

      // Renderizar usuario en la barra lateral
      const userNameEl = document.querySelector('.user-profile .user-name');
      const avatarEl = document.querySelector('.user-profile .avatar');
      
      if (userNameEl && userData.username) {
        userNameEl.textContent = userData.username.toUpperCase();
      }
      
      if (avatarEl && userData.username) {
        avatarEl.textContent = userData.username.charAt(0).toUpperCase();
      }
    } catch (e) {
      console.error('Error al leer datos del usuario:', e);
    }

    // 3. VALIDACIÓN BLINDADA CON SUPABASE EN TIEMPO REAL
    if (typeof supabase !== 'undefined' && userData) {
      try {
        const SUPABASE_URL = 'https://mhvvpuvkyjrjvmhowwme.supabase.co';
        const SUPABASE_KEY = 'sb_publishable_LCK17AcmINHv8d_X14yuxg_LyeQj172';
        
        // Creamos instancia local para asegurar que funciona sin depender del HTML
        const localDb = (typeof window.db !== 'undefined') ? window.db : supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        
        const query = userData.id 
          ? localDb.from('profiles').select('id, is_approved').eq('id', userData.id).single()
          : localDb.from('profiles').select('id, is_approved').eq('email', userData.email).single();

        const { data: profile, error } = await query;

        // Si hay error (fila eliminada) o no está aprobado -> ¡AFUERA!
        if (error || !profile || profile.is_approved === false) {
          console.warn('Bloqueo: Perfil no encontrado o desaprobado en la nube.');
          localStorage.removeItem('life_trading_user');
          window.location.replace('login.html');
          return;
        }
      } catch (err) {
        console.error('Error del Guardián:', err);
      }
    }

    // 4. Listener para el botón de cerrar sesión
    const logoutBtns = document.querySelectorAll('.btn-logout');
    logoutBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        if (confirm('¿Deseas cerrar sesión en tu Journal?')) {
          localStorage.removeItem('life_trading_user');
          window.location.replace('login.html');
        }
      });
    });
  });
})();
