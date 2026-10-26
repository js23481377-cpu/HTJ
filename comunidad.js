document.addEventListener('DOMContentLoaded', async () => {
  const profile = await window.authReady;
  if (!profile) return;
  if (window.lucide) lucide.createIcons();
  const name = document.getElementById('sidebarUserName');
  const avatar = document.getElementById('sidebarAvatar');
  if (name) name.textContent = profile.username;
  if (avatar) avatar.textContent = profile.username.charAt(0).toUpperCase();
  const button = document.getElementById('btnJoinRanking');
  const label = document.getElementById('btnJoinText');
  const status = document.getElementById('rankingStatusMsg');
  const tbody = document.getElementById('leaderboardBody');
  let participating = false;
  function message(text) { status.style.display = 'block'; status.textContent = text; }
  function setLabel() { label.textContent = participating ? 'Salir del ranking' : 'Participar en Ranking'; }
  async function load() {
    const {data, error} = await db.rpc('htj_leaderboard');
    if (error) throw error;
    tbody.replaceChildren();
    if (!data?.length) {
      const row = tbody.insertRow(); const cell = row.insertCell();
      cell.colSpan = 6; cell.textContent = 'Todavía no hay participantes.'; return;
    }
    data.forEach((item, index) => {
      const row = tbody.insertRow();
      if (item.is_me) row.style.background = 'rgba(34,197,94,0.05)';
      const percent = Number(item.profit_percent);
      const values = [index + 1, item.username, percent.toFixed(2) + '%',
        Number(item.win_rate).toFixed(0) + '%', item.total_trades, item.profit_factor];
      values.forEach(value => { const cell = row.insertCell(); cell.textContent = String(value); cell.style.padding = '10px'; });
    });
  }
  button.disabled = true;
  try {
    const {data, error} = await db.from('profiles').select('show_in_ranking').eq('id', profile.id).single();
    if (error) throw error;
    participating = data.show_in_ranking;
    setLabel(); await load(); button.disabled = false;
  } catch { message('El ranking necesita la configuración adicional de seguridad. Tus operaciones privadas permanecen protegidas.'); }
  button.addEventListener('click', async () => {
    button.disabled = true;
    try {
      const {data, error} = await db.from('profiles').update({show_in_ranking: !participating})
        .eq('id', profile.id).select('show_in_ranking').single();
      if (error) throw error;
      participating = data.show_in_ranking; setLabel(); await load();
      message(participating ? 'Participación activada.' : 'Ya no apareces en el ranking.');
    } catch { message('No se pudo completar la solicitud. Comprueba tu acceso y conexión.'); }
    finally { button.disabled = false; }
  });
});
