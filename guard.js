// =========================================================
// GUARDIÁN DE SEGURIDAD & CONTROL DE SESIÓN - LIFE TRADING
// =========================================================

(function initGuard() {
  // 1. Verificar si el usuario está autenticado
  const currentUser = localStorage.getItem('life_trading_user');
  
  // Si no hay sesión iniciada, redirigir inmediatamente al login
  if (!currentUser) {
    window.location.href = 'login.html';
    return;
  }

  // 2. Esperar a que el DOM esté listo para configurar el nombre de usuario y cerrar sesión
  document.addEventListener('DOMContentLoaded', () => {
    try {
      const userData = JSON.parse(currentUser);

      // Actualizar el nombre del usuario en el sidebar si existe el elemento
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

    // 3. Listener global para el botón de cerrar sesión (.btn-logout)
    const logoutBtn = document.querySelector('.btn-logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (confirm('¿Deseas cerrar sesión en tu Journal?')) {
          localStorage.removeItem('life_trading_user');
          window.location.href = 'login.html';
        }
      });
    }
  });
})();
