const SUPABASE_URL = 'TU_SUPABASE_URL_AQUI';
const SUPABASE_KEY = 'TU_SUPABASE_ANON_KEY_AQUI';

const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

document.addEventListener('DOMContentLoaded', () => {
  lucide.createIcons();

  const accessModal = document.getElementById('accessModal');
  const openAccessModalBtn = document.getElementById('openAccessModalBtn');
  const closeAccessModalBtn = document.getElementById('closeAccessModalBtn');

  const tabRequest = document.getElementById('tabRequest');
  const tabActivate = document.getElementById('tabActivate');
  const formRequest = document.getElementById('formRequest');
  const formValidate = document.getElementById('formValidate');
  const statusMsg = document.getElementById('statusMsg');

  if (openAccessModalBtn) openAccessModalBtn.addEventListener('click', () => accessModal.classList.add('active'));
  if (closeAccessModalBtn) closeAccessModalBtn.addEventListener('click', () => accessModal.classList.remove('active'));

  tabRequest.addEventListener('click', () => {
    tabRequest.classList.add('active');
    tabActivate.classList.remove('active');
    formRequest.style.display = 'flex';
    formValidate.style.display = 'none';
    statusMsg.textContent = '';
  });

  tabActivate.addEventListener('click', () => {
    tabActivate.classList.add('active');
    tabRequest.classList.remove('active');
    formValidate.style.display = 'flex';
    formRequest.style.display = 'none';
    statusMsg.textContent = '';
  });

  // 1. SOLICITAR CÓDIGO
  formRequest.addEventListener('submit', async (e) => {
    e.preventDefault();
    statusMsg.style.color = '#a1a1aa';
    statusMsg.textContent = 'Procesando...';

    const email = document.getElementById('reqEmail').value.trim();
    const username = document.getElementById('reqUsername').value.trim();
    const generatedCode = 'LT-' + Math.floor(1000 + Math.random() * 9000);

    const { error } = await db.from('profiles').insert([
      { email, username, access_code: generatedCode, is_approved: false }
    ]);

    if (error) {
      statusMsg.style.color = '#ef4444';
      statusMsg.textContent = 'Error: ' + error.message;
    } else {
      statusMsg.style.color = '#22c55e';
      statusMsg.textContent = `¡Solicitud registrada! Tu código asignado es: ${generatedCode}`;
    }
  });

  // 2. VALIDAR CÓDIGO
  formValidate.addEventListener('submit', async (e) => {
    e.preventDefault();
    statusMsg.style.color = '#a1a1aa';
    statusMsg.textContent = 'Validando...';

    const email = document.getElementById('valEmail').value.trim();
    const code = document.getElementById('valCode').value.trim();

    const { data, error } = await db
      .from('profiles')
      .select('*')
      .eq('email', email)
      .eq('access_code', code)
      .single();

    if (error || !data) {
      statusMsg.style.color = '#ef4444';
      statusMsg.textContent = 'Código o correo incorrectos.';
    } else {
      await db.from('profiles').update({ is_approved: true }).eq('id', data.id);
      localStorage.setItem('life_trading_user', JSON.stringify(data));
      
      statusMsg.style.color = '#22c55e';
      statusMsg.textContent = '¡Acceso activado con éxito!';
      setTimeout(() => {
        accessModal.classList.remove('active');
        loadLeaderboard();
      }, 1200);
    }
  });

  // CARGAR LEADERBOARD REAL DESDE SUPABASE
  async function loadLeaderboard() {
    const tbody = document.getElementById('leaderboardBody');
    if (!tbody) return;

    const { data: profiles, error } = await db
      .from('profiles')
      .select('*')
      .eq('is_approved', true)
      .order('win_rate', { ascending: false });

    if (error || !profiles || profiles.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="padding: 16px; text-align: center; color: var(--text-muted);">Sin traders verificados aún.</td></tr>`;
      return;
    }

    tbody.innerHTML = '';
    profiles.forEach((p, index) => {
      const medals = ['🥇', '🥈', '🥉'];
      const rankBadge = index < 3 ? `#${index + 1} ${medals[index]}` : `#${index + 1}`;
      
      const tr = document.createElement('tr');
      tr.style.cssText = "border-bottom: 1px solid rgba(255,255,255,0.03); height: 50px;";
      tr.innerHTML = `
        <td style="padding: 8px; font-weight: 800; color: ${index === 0 ? '#eab308' : 'var(--text-main)'};">${rankBadge}</td>
        <td style="padding: 8px; font-weight: 700;">${p.username}</td>
        <td style="padding: 8px; font-weight: 700; color: #22c55e;">${p.win_rate || 0}%</td>
        <td style="padding: 8px;">${p.total_trades || 0} ops</td>
        <td style="padding: 8px;">${p.profit_factor || 0}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  loadLeaderboard();
});
