document.addEventListener('DOMContentLoaded', () => {
  if (window.lucide) lucide.createIcons();
  const request = document.getElementById('formRequest');
  const login = document.getElementById('formValidate');
  const status = document.getElementById('authStatusMsg');
  const tell = text => { status.textContent = text; };
  function tab(register) {
    request.style.display = register ? 'flex' : 'none';
    login.style.display = register ? 'none' : 'flex';
    document.getElementById('tabRequest').classList.toggle('active', register);
    document.getElementById('tabValidate').classList.toggle('active', !register);
    tell('');
  }
  document.getElementById('tabRequest').onclick = () => tab(true);
  document.getElementById('tabValidate').onclick = () => tab(false);
  tab(false);
  request.addEventListener('submit', async event => {
    event.preventDefault();
    const button = request.querySelector('button[type=submit]');
    button.disabled = true;
    try {
      const {error} = await db.auth.signUp({
        email: document.getElementById('reqEmail').value.trim(),
        password: document.getElementById('reqPassword').value,
        options: {
          emailRedirectTo: 'https://hermatraders.vercel.app/login.html',
          data: {username: document.getElementById('reqUsername').value.trim()}
        }
      });
      if (error) throw error;
      request.reset();
      tell('Si el registro procede, recibirás un correo de confirmación. Después tu solicitud quedará pendiente de aprobación. No necesitas un código de acceso.');
    } catch { tell('No se pudo completar el registro. Revisa los datos o inténtalo más tarde.'); }
    finally { button.disabled = false; }
  });
  login.addEventListener('submit', async event => {
    event.preventDefault();
    const button = login.querySelector('button[type=submit]');
    button.disabled = true;
    try {
      const {error} = await db.auth.signInWithPassword({
        email: document.getElementById('valEmail').value.trim(),
        password: document.getElementById('valPassword').value
      });
      if (error) { tell('No se pudo iniciar sesión. Comprueba correo, contraseña y confirmación del correo.'); return; }
      const profile = await readProfile();
      document.getElementById('valPassword').value = '';
      if (!profile || profile.is_approved !== true) {
        const {data: access} = await db.rpc('htj_access_status');
        tell(access?.status === 'rejected' ? 'Tu solicitud no fue aprobada. Contacta al administrador.' : access?.status === 'revoked' ? 'Tu acceso fue retirado. Contacta al administrador.' : 'Tu solicitud está pendiente. Podrás entrar cuando el administrador la apruebe.');
        await db.auth.signOut({scope: 'local'});
        return;
      }
      window.location.replace(new URLSearchParams(location.search).get('next') === 'admin' ? 'admin.html' : 'index.html');
    } catch { tell('No se pudo comprobar el acceso. Inténtalo de nuevo.'); }
    finally { button.disabled = false; }
  });
});

// Respaldo explícito de datos locales antiguos, sin eliminarlos ni reasignarlos.
document.addEventListener('DOMContentLoaded', () => {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'auth-tab';
  button.style.marginTop = '18px';
  button.textContent = 'Descargar copia de mis datos locales';
  button.addEventListener('click', () => {
    const entries = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith('life_trading_')) entries[key] = localStorage.getItem(key);
    }
    const blob = new Blob([JSON.stringify(entries, null, 2)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = 'HTJ-datos-locales.json'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  document.querySelector('.auth-card').appendChild(button);
});
