document.addEventListener('DOMContentLoaded', async () => {
  const status = document.getElementById('adminStatus');
  const content = document.getElementById('adminContent');
  const refresh = document.getElementById('refreshRequests');
  const tbody = document.getElementById('requestsBody');
  const filter = document.getElementById('requestFilter');
  const search = document.getElementById('requestSearch');
  const mailStatus = document.getElementById('mailStatus');
  const labels = {pending:'Pendiente',approved:'Con acceso',rejected:'Rechazada',revoked:'Acceso retirado'};
  let requests = [], legacy = [], busy = false;
  const report = (text, error=false) => {status.textContent=text; status.classList.toggle('error',error);};
  async function rpc(name,args={}) {
    const {data,error} = await db.rpc(name,args);
    if (error) throw error;
    return data;
  }
  if (!await window.adminReady) {
    report('Esta sección está reservada a la cuenta administradora.',true);
    refresh.disabled=true; return;
  }
  content.hidden=false;
  const node = (tag,text,cls) => {
    const element=document.createElement(tag);
    if (text!==undefined) element.textContent=String(text);
    if(cls) element.className=cls;
    return element;
  };
  function render() {
    document.getElementById('pendingCount').textContent=requests.filter(r=>r.status==='pending').length;
    document.getElementById('approvedCount').textContent=requests.filter(r=>r.status==='approved').length;
    document.getElementById('deniedCount').textContent=requests.filter(r=>['revoked','rejected'].includes(r.status)).length;
    tbody.replaceChildren();
    const query=search.value.trim().toLocaleLowerCase();
    const visible=requests.filter(r => (filter.value==='all' || r.status===filter.value ||
      (filter.value==='denied' && ['revoked','rejected'].includes(r.status))) &&
      `${r.username} ${r.email}`.toLocaleLowerCase().includes(query));
    const empty=document.getElementById('requestEmpty');empty.hidden=visible.length>0;
    empty.textContent=query ? 'No se encontraron coincidencias.' : filter.value==='pending' ? 'No hay solicitudes pendientes. Las nuevas aparecerán cuando confirmen su correo.' : 'No hay cuentas en esta categoría.';
    for (const request of visible) {
      const row=node('tr'); const person=node('td',undefined,'admin-person');
      person.append(node('strong',request.username),node('span',request.email));row.append(person);
      const state=node('td');state.append(node('span',request.is_admin?'Administrador':labels[request.status],`status-badge status-${request.status}`));row.append(state);
      row.append(node('td',new Date(request.requested_at).toLocaleDateString('es-CO')));
      const actions=node('td');row.append(actions);tbody.append(row);
      if(request.is_admin) {actions.textContent='Cuenta protegida';continue;}
      let select=null;
      if(!request.profile_id && legacy.length) {
        const label=node('label',undefined,'admin-legacy');label.append(node('span','Perfil anterior (si corresponde)'));
        select=node('select');select.append(new Option('Crear perfil nuevo',''));
        for (const profile of legacy) select.append(new Option(`${profile.username} · ${profile.email}`,profile.id));
        label.append(select,node('small','Vincula solo si verificaste que pertenece a esta persona. Sus operaciones se conservarán.'));actions.append(label);
      }
      const group=node('div',undefined,'admin-actions');actions.append(group);
      function action(text,decision,cls) {
        const button=node('button',text,cls);button.type='button';button.disabled=busy;
        button.onclick=async()=>{
          if(busy)return;
          const legacyId=decision==='approved' ? (select?.value || null) : null;
          if(decision==='approved' && !request.profile_id && request.legacy_matches>0 && !legacyId) {
            report('Existe un perfil anterior con ese correo. Selecciónalo después de verificar su propietario.',true);return;
          }
          if(legacyId && !confirm(`¿Vincular las operaciones del perfil seleccionado a ${request.email} y aprobar su acceso?`))return;
          if(decision==='revoked' && !confirm(`¿Retirar el acceso a ${request.email}? Sus datos se conservarán.`))return;
          busy=true;render();
          try {
            await rpc('htj_admin_decide',{target_id:request.auth_user_id,decision,expected_version:request.version,legacy_profile_id:legacyId});
            await load();report(decision==='approved'?'Acceso aprobado. Ya puede iniciar sesión.':decision==='rejected'?'Solicitud rechazada. No se borraron datos.':'Acceso retirado. No se borraron datos.');
          } catch(error) {report(error.message || 'No se pudo guardar. Actualiza e inténtalo de nuevo.',true);}
          finally {busy=false;render();}
        };group.append(button);
      }
      if(request.status==='approved')action('Retirar acceso','revoked','revoke');
      else {action(request.status==='pending'?'Aprobar':'Permitir acceso','approved','approve');if(request.status==='pending')action('Rechazar','rejected','');}
    }
  }
  async function load() {
    refresh.disabled=true;
    try {const data=await rpc('htj_admin_list');requests=data.requests;legacy=data.legacy_profiles;render();}
    finally {refresh.disabled=false;}
  }
  refresh.onclick=async()=>{try{await load();report('Lista actualizada.');}catch{report('No se pudo actualizar la lista. Comprueba tu sesión.',true);}};
  filter.onchange=render;search.oninput=render;
  async function loadMail() {
    const data=await rpc('htj_mail_status');const cfg=data.settings;
    document.getElementById('mailBadge').textContent=cfg.enabled&&cfg.configured?'Conectado':'Pendiente de conexión';
    if(document.activeElement!==document.getElementById('mailSender'))document.getElementById('mailSender').value=cfg.sender;
    document.getElementById('testMail').disabled=!(cfg.enabled&&cfg.configured);
    const history=document.getElementById('mailHistory');history.replaceChildren();
    const names={pending:'Pendiente de conexión o envío',queued:'Enviando',accepted:'Aceptado por el proveedor (revisa tu bandeja)',failed:'No enviado',unknown:'Resultado sin confirmar',cancelled:'Solicitud ya atendida'};
    for(const message of data.messages) {
      const item=node('li',`${new Date(message.created_at).toLocaleString('es-CO')} — ${names[message.status]}`);
      if(message.error_message)item.append(node('p',message.error_message));
      if(['pending','failed','unknown'].includes(message.status)&&cfg.enabled) {
        const button=node('button','Reintentar');button.type='button';button.onclick=async()=>{
          button.disabled=true;try{await rpc('htj_retry_mail',{mail_id:message.id});await loadMail();}
          catch{mailStatus.textContent='No se pudo reintentar.';}finally{button.disabled=false;}
        };item.append(button);
      }history.append(item);
    }
  }
  document.getElementById('mailForm').onsubmit=async event=>{
    event.preventDefault();const button=event.target.querySelector('button');button.disabled=true;
    const input=document.getElementById('resendKey');
    try{await rpc('htj_configure_mail',{api_key:input.value.trim(),sender:document.getElementById('mailSender').value.trim()});
      mailStatus.textContent='Conexión guardada. Pulsa Enviar prueba y confirma la recepción.';await loadMail();}
    catch{mailStatus.textContent='No se pudo guardar. Comprueba la clave, el remitente y tu sesión.';}
    finally{input.value='';button.disabled=false;}
  };
  document.getElementById('testMail').onclick=async event=>{
    event.target.disabled=true;try{await rpc('htj_test_mail');mailStatus.textContent='Prueba solicitada. Espera unos segundos y pulsa Consultar envíos.';}
    catch(error){mailStatus.textContent=error.message || 'No se pudo solicitar la prueba.';}finally{await loadMail().catch(()=>{});}
  };
  document.getElementById('refreshMail').onclick=()=>loadMail().catch(()=>{mailStatus.textContent='No se pudo consultar el estado.';});
  document.getElementById('pauseMail').onclick=async()=>{try{await rpc('htj_pause_mail');await loadMail();mailStatus.textContent='Avisos pausados. Las solicitudes seguirán apareciendo en el panel.';}catch{mailStatus.textContent='No se pudieron pausar los avisos.';}};
  try{await load();report('Solo tú puedes administrar los accesos.');}catch{report('No se pudieron cargar las solicitudes. Comprueba tu sesión.',true);}
  await loadMail().catch(()=>{mailStatus.textContent='No se pudo consultar la configuración del correo.';});
});
