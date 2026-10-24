document.addEventListener('DOMContentLoaded', () => {
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }

  // --- 1. LÓGICA DEL MODAL DE ACCESO / CÓDIGO ---
  const accessModal = document.getElementById('accessModal');
  const openAccessModalBtn = document.getElementById('openAccessModalBtn');
  const closeAccessModalBtn = document.getElementById('closeAccessModalBtn');
  const tabRequest = document.getElementById('tabRequest');
  const tabActivate = document.getElementById('tabActivate');
  const formRequest = document.getElementById('formRequest');
  const formValidate = document.getElementById('formValidate');
  const statusMsg = document.getElementById('statusMsg');

  if (openAccessModalBtn) {
    openAccessModalBtn.addEventListener('click', () => {
      if (accessModal) accessModal.classList.add('active');
    });
  }

  if (closeAccessModalBtn) {
    closeAccessModalBtn.addEventListener('click', () => {
      if (accessModal) accessModal.classList.remove('active');
    });
  }

  if (accessModal) {
    accessModal.addEventListener('click', (e) => {
      if (e.target === accessModal) accessModal.classList.remove('active');
    });
  }

  // Pestañas del modal
  if (tabRequest && tabActivate) {
    tabRequest.addEventListener('click', () => {
      tabRequest.classList.add('active');
      tabActivate.classList.remove('active');
      formRequest.style.display = 'block';
      formValidate.style.display = 'none';
    });

    tabActivate.addEventListener('click', () => {
      tabActivate.classList.add('active');
      tabRequest.classList.remove('active');
      formValidate.style.display = 'block';
      formRequest.style.display = 'none';
    });
  }

  // Manejo de Solicitud de Código
  if (formRequest) {
    formRequest.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('reqEmail').value.trim();
      const username = document.getElementById('reqUsername').value.trim();
      statusMsg.textContent = "Procesando solicitud...";
      statusMsg.style.color = "var(--text-muted)";

      try {
        const accessCode = 'LT-' + Math.floor(1000 + Math.random() * 9000);

        if (typeof db !== 'undefined') {
          const { error } = await db.from('profiles').upsert([
            { email, username, access_code: accessCode, is_approved: false }
          ], { onConflict: 'email' });

          if (error) throw error;
        }

        statusMsg.textContent = "¡Solicitud guardada! Revisa tu correo de notificaciones.";
        statusMsg.style.color = "var(--accent-green)";
      } catch (err) {
        console.error(err);
        statusMsg.textContent = "Error al procesar la solicitud.";
        statusMsg.style.color = "var(--accent-red)";
      }
    });
  }

  // Manejo de Validación de Código
  if (formValidate) {
    formValidate.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('valEmail').value.trim();
      const code = document.getElementById('valCode').value.trim();
      statusMsg.textContent = "Validando código...";

      try {
        if (typeof db !== 'undefined') {
          const { data, error } = await db
            .from('profiles')
            .select('*')
            .eq('email', email)
            .eq('access_code', code)
            .single();

          if (error || !data) {
            statusMsg.textContent = "Código o correo inválido.";
            statusMsg.style.color = "var(--accent-red)";
            return;
          }

          await db.from('profiles').update({ is_approved: true }).eq('id', data.id);

          localStorage.setItem('life_trading_user', JSON.stringify(data));
          statusMsg.textContent = "¡Acceso concedido! Redirigiendo...";
          statusMsg.style.color = "var(--accent-green)";

          setTimeout(() => {
            window.location.href = 'index.html';
          }, 1200);
        }
      } catch (err) {
        console.error(err);
        statusMsg.textContent = "Error en la validación.";
        statusMsg.style.color = "var(--accent-red)";
      }
    });
  }

  // --- 2. CARGAR RANKING GLOBAL DE LA COMUNIDAD ---
  async function loadLeaderboard() {
    const tbody = document.getElementById('leaderboardBody');
    if (!tbody || typeof db === 'undefined') return;

    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 20px; color: var(--text-muted);">Cargando ranking de traders...</td></tr>`;

    try {
      // Obtener perfiles aprobados
      const { data: profiles, error: profError } = await db
        .from('profiles')
        .select('id, username')
        .eq('is_approved', true);

      // Obtener todos los trades
      const { data: trades, error: tradeError } = await db
        .from('trades')
        .select('*');

      if (profError || tradeError) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 20px; color: var(--accent-red);">Error al conectar con la base de datos.</td></tr>`;
        return;
      }

      if (!profiles || profiles.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 20px; color: var(--text-muted);">No hay traders aprobados en el ranking todavía.</td></tr>`;
        return;
      }

      // Calcular métricas por cada trader
      const leaderboard = profiles.map(user => {
        const userTrades = trades.filter(t => t.user_id === user.id && t.result !== 'NOOP');
        const totalOps = userTrades.length;
        
        const winningTrades = userTrades.filter(t => t.result === 'TP' || t.pnl > 0);
        const losingTrades = userTrades.filter(t => t.result === 'SL' || t.pnl < 0);

        const winRate = totalOps > 0 ? Math.round((winningTrades.length / totalOps) * 100) : 0;
        
        const grossProfit = winningTrades.reduce((acc, t) => acc + (parseFloat(t.pnl) || 0), 0);
        const grossLoss = Math.abs(losingTrades.reduce((acc, t) => acc + (parseFloat(t.pnl) || 0), 0));
        
        const profitFactor = grossLoss === 0 ? (grossProfit > 0 ? 'MAX' : '0.00') : (grossProfit / grossLoss).toFixed(2);
        const totalPnl = userTrades.reduce((acc, t) => acc + (parseFloat(t.pnl) || 0), 0);

        return {
          username: user.username || 'Trader',
          totalOps,
          winRate,
          profitFactor,
          totalPnl
        };
      });

      // Ordenar por ganancia total (PnL) de mayor a menor
      leaderboard.sort((a, b) => b.totalPnl - a.totalPnl);

      // Pintar filas en la tabla
      tbody.innerHTML = '';
      leaderboard.forEach((trader, index) => {
        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid var(--card-border)';
        tr.style.height = '45px';

        let positionDisplay = `#${index + 1}`;
        if (index === 0) positionDisplay = '🥇 1';
        else if (index === 1) positionDisplay = '🥈 2';
        else if (index === 2) positionDisplay = '🥉 3';

        tr.innerHTML = `
          <td style="padding: 8px; font-weight: 700;">${positionDisplay}</td>
          <td style="padding: 8px; font-weight: 600; color: var(--text-main);">${trader.username}</td>
          <td style="padding: 8px;">${trader.winRate}%</td>
          <td style="padding: 8px;">${trader.totalOps}</td>
          <td style="padding: 8px; font-weight: 700; color: var(--accent-green);">${trader.profitFactor}</td>
        `;
        tbody.appendChild(tr);
      });

    } catch (err) {
      console.error("Error al procesar el ranking:", err);
      tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 20px; color: var(--accent-red);">Error al procesar el ranking.</td></tr>`;
    }
  }

  loadLeaderboard();
});
