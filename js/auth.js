import {initializeApp} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import {getAuth,setPersistence,browserSessionPersistence,signInWithEmailAndPassword,signInAnonymously,
  onAuthStateChanged,signOut,deleteUser} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import {getFirestore,doc,getDoc,setDoc,deleteDoc,collection,getDocs,serverTimestamp}
  from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import {firebaseConfig} from './firebase-config.js';

const PIN_MS=5*60*1000, SESSION_MS=60*60*1000;
const ALPHABET='ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // sin I, L, O, 0, 1 para evitar confusiones
const $=(id)=>document.getElementById(id);
const els={auth:$('auth'),app:$('app'),msg:$('authMsg')};

/* ===== Utilidades ===== */
const fmtPin=(c)=>c.slice(0,4)+'-'+c.slice(4);
const normPin=(s)=>s.toUpperCase().replace(/[^A-Z0-9]/g,'');
const fmtTime=(ms)=>{const s=Math.max(0,Math.ceil(ms/1000));return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0');};
function randomPin(){
  let out='';const lim=256-(256%ALPHABET.length),buf=new Uint8Array(32);
  while(out.length<8){crypto.getRandomValues(buf);for(const b of buf){if(b<lim&&out.length<8)out+=ALPHABET[b%ALPHABET.length];}}
  return out;
}
function setMsg(node,text,kind){
  node.textContent=text||'';node.hidden=!text;node.dataset.kind=kind||'error';
}
function setBusy(btn,busy,label){btn.disabled=busy;if(label)btn.textContent=label;}
const tsMillis=(t)=>t&&typeof t.toMillis==='function'?t.toMillis():null;

/* ===== Configuración ===== */
const configured=firebaseConfig&&firebaseConfig.apiKey&&!/^TU_/.test(firebaseConfig.apiKey);
if(!configured){
  els.auth.hidden=false;
  setMsg(els.msg,'Falta configurar Firebase. Abre js/firebase-config.js y sigue los pasos del README.','error');
  $('btnAdmin').disabled=true;$('btnPin').disabled=true;
  throw new Error('Firebase sin configurar');
}
const app=initializeApp(firebaseConfig);
const auth=getAuth(app);
const db=getFirestore(app);

/* ===== Pestañas ===== */
function pickTab(which){
  const admin=which==='admin';
  $('tabAdmin').setAttribute('aria-selected',String(admin));$('tabPin').setAttribute('aria-selected',String(!admin));
  $('formAdmin').hidden=!admin;$('formPin').hidden=admin;setMsg(els.msg,'');
  (admin?$('email'):$('pin')).focus();
}
$('tabAdmin').addEventListener('click',()=>pickTab('admin'));
$('tabPin').addEventListener('click',()=>pickTab('pin'));

/* ===== Estado de sesión ===== */
let busy=false,entered=false,session=null,simLoaded=false,tick=0,reloadTimer=0;
function showLogin(){
  els.app.hidden=true;els.auth.hidden=false;$('sessBar').hidden=true;
}
function loadSimulator(){
  if(simLoaded)return Promise.resolve();simLoaded=true;
  const load=(src)=>new Promise((ok,fail)=>{const s=document.createElement('script');s.src=src;s.onload=ok;s.onerror=()=>fail(new Error('No se pudo cargar '+src));document.body.appendChild(s);});
  return load('js/three.min.js').then(()=>load('js/simulador.js'));
}
async function enter(role,endMs,user){
  if(entered)return;entered=true;
  session={role:role,end:endMs,user:user};
  els.auth.hidden=true;els.app.hidden=false;
  $('sessBar').hidden=false;$('bPin').hidden=role!=='admin';
  $('sessRole').textContent=role==='admin'?'Administrador':'Invitado';
  // Solo los invitados caducan a los 60 minutos.
  clearTimeout(reloadTimer);
  if(role==='guest')reloadTimer=setTimeout(()=>location.reload(),Math.max(0,endMs-Date.now())+500);
  clearInterval(tick);
  const upd=()=>{
    const el=$('sessLeft');
    if(role==='admin'){el.textContent='Sesión de administrador';el.classList.remove('warn');return;}
    const left=endMs-Date.now();
    el.textContent='Sesión '+fmtTime(left);el.classList.toggle('warn',left<5*60*1000);
    if(left<=0){clearInterval(tick);location.reload();}
  };
  upd();tick=setInterval(upd,1000);
  try{await loadSimulator();}catch(e){alert(e.message);}
}
async function resolveSession(user){
  if(!user){showLogin();return;}
  try{
    if(user.isAnonymous){
      const snap=await getDoc(doc(db,'sessions',user.uid));
      const created=snap.exists()?tsMillis(snap.data().createdAt):null;
      if(!created||Date.now()>=created+SESSION_MS)throw new Error('sin-sesion');
      await enter('guest',created+SESSION_MS,user);
    }else{
      const adm=await getDoc(doc(db,'admins',user.uid));
      if(!adm.exists())throw new Error('sin-sesion');
      await enter('admin',Infinity,user);
    }
  }catch(_){
    sessionStorage.removeItem('loginAt');
    try{if(user.isAnonymous)await deleteUser(user);else await signOut(auth);}catch(__){try{await signOut(auth);}catch(___){}}
    showLogin();
  }
}
onAuthStateChanged(auth,(user)=>{if(busy)return;resolveSession(user);});

/* ===== Entrar como administrador ===== */
const AUTH_ERR={
  'auth/invalid-credential':'Correo o contraseña incorrectos.',
  'auth/wrong-password':'Correo o contraseña incorrectos.',
  'auth/user-not-found':'Correo o contraseña incorrectos.',
  'auth/invalid-email':'Escribe un correo válido.',
  'auth/too-many-requests':'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.',
  'auth/network-request-failed':'Sin conexión. Revisa tu internet.',
  'auth/operation-not-allowed':'Este método de acceso no está activado en Firebase.'
};
$('formAdmin').addEventListener('submit',async(e)=>{
  e.preventDefault();setMsg(els.msg,'');
  const email=$('email').value.trim(),pass=$('password').value;
  if(!email||!pass){setMsg(els.msg,'Escribe el correo y la contraseña.');return;}
  busy=true;setBusy($('btnAdmin'),true,'Entrando…');
  try{
    await setPersistence(auth,browserSessionPersistence);
    const cred=await signInWithEmailAndPassword(auth,email,pass);
   const adm = await getDoc(doc(db, 'admins', cred.user.uid));
  console.log('UID autenticado:', cred.user.uid);
  console.log('Administrador encontrado:', adm.exists());
    if(!adm||!adm.exists()){await signOut(auth);setMsg(els.msg,'Esta cuenta no tiene permisos de administrador.');return;}
    $('password').value='';busy=false;await resolveSession(cred.user);

  }catch(err){
    console.error('Error de autenticación o Firestore:', err);

    setMsg(
      els.msg,
      AUTH_ERR[err?.code] ||
      `Error de Firebase: ${err?.code || err?.message || 'desconocido'}`
    );
  }finally{
    busy=false;
    setBusy($('btnAdmin'),false,'Entrar');
  }
});

/* ===== Entrar con PIN ===== */
$('pin').addEventListener('input',(e)=>{const n=normPin(e.target.value).slice(0,8);e.target.value=n.length>4?fmtPin(n):n;});
$('formPin').addEventListener('submit',async(e)=>{
  e.preventDefault();setMsg(els.msg,'');
  const code=normPin($('pin').value);
  if(code.length!==8){setMsg(els.msg,'El PIN tiene 8 caracteres.');return;}
  busy=true;setBusy($('btnPin'),true,'Comprobando…');
  let user=null;
  try{
    await setPersistence(auth,browserSessionPersistence);
    user=(await signInAnonymously(auth)).user;
    // El PIN NO se consume: muchos invitados pueden crear sesiones independientes.
    // Las reglas verifican en el servidor que el PIN exista y siga vigente.
    await setDoc(doc(db,'sessions',user.uid),{pin:code,createdAt:serverTimestamp()});
    $('pin').value='';busy=false;await resolveSession(user);
  }catch(err){
    if(user){try{await deleteUser(user);}catch(_){try{await signOut(auth);}catch(__){}}}
    const offline=err&&(err.code==='unavailable'||err.code==='auth/network-request-failed');
    setMsg(els.msg,offline?'Sin conexión. Revisa tu internet.':
      err&&err.code==='auth/operation-not-allowed'?'El acceso anónimo no está activado en Firebase.':
      'PIN incorrecto o vencido. Comprueba el código e inténtalo de nuevo.');
  }finally{busy=false;setBusy($('btnPin'),false,'Entrar con PIN');}
});

/* ===== Cerrar sesión ===== */
$('bLogout').addEventListener('click',async()=>{
  try{
    const u=auth.currentUser;
    if(u&&u.isAnonymous){try{await deleteDoc(doc(db,'sessions',u.uid));}catch(_){}await deleteUser(u);}
    else await signOut(auth);
  }catch(_){try{await signOut(auth);}catch(__){}}
  sessionStorage.removeItem('loginAt');location.reload();
});

/* ===== Panel del administrador ===== */
const panel=$('pinPanel');let pins=[],pinTick=0,freshCode=null;
function renderPins(){
  const now=Date.now(),list=$('pinList');list.textContent='';
  pins=pins.filter(p=>p.end>now);
  if(!pins.length){const li=document.createElement('li');li.className='empty';li.textContent='No hay PIN activos.';list.appendChild(li);}
  for(const p of pins){
    const li=document.createElement('li');
    const code=document.createElement('span');code.className='mono';code.textContent=fmtPin(p.code);
    const left=document.createElement('span');left.className='left';left.textContent=fmtTime(p.end-now);
    const rv=document.createElement('button');rv.type='button';rv.className='btn small';rv.textContent='Revocar';
    rv.addEventListener('click',async()=>{try{await deleteDoc(doc(db,'pins',p.code));}catch(_){setMsg($('pinMsg'),'No se pudo revocar.');}pins=pins.filter(x=>x!==p);renderPins();});
    li.append(code,left,rv);list.appendChild(li);
  }
  const fresh=pins.find(p=>p.code===freshCode);
  $('pinFresh').hidden=!fresh;
  if(fresh){$('pinCode').textContent=fmtPin(fresh.code);$('pinLeft').textContent='Vence en '+fmtTime(fresh.end-now);}
  else freshCode=null;
}
async function loadPins(){
  const snap=await getDocs(collection(db,'pins')),now=Date.now(),out=[];
  for(const d of snap.docs){
    const c=tsMillis(d.data().createdAt);
    if(c&&c+PIN_MS>now)out.push({code:d.id,end:c+PIN_MS});
    else deleteDoc(d.ref).catch(()=>{}); // limpia los vencidos
  }
  pins=out;renderPins();
}
async function openPanel(){
  panel.hidden=false;setMsg($('pinMsg'),'');
  try{await loadPins();}catch(_){setMsg($('pinMsg'),'No se pudo leer la lista de PIN.');}
  clearInterval(pinTick);pinTick=setInterval(renderPins,1000);
}
function closePanel(){panel.hidden=true;clearInterval(pinTick);}
$('bPin').addEventListener('click',openPanel);
$('pinClose').addEventListener('click',closePanel);
panel.addEventListener('click',(e)=>{if(e.target===panel)closePanel();});
document.addEventListener('keydown',(e)=>{if(e.key==='Escape'&&!panel.hidden)closePanel();});
$('pinGen').addEventListener('click',async()=>{
  setMsg($('pinMsg'),'');setBusy($('pinGen'),true,'Generando…');
  try{
    const code=randomPin(),ref=doc(db,'pins',code);
    await setDoc(ref,{createdAt:serverTimestamp(),createdBy:auth.currentUser.uid});
    const c=tsMillis((await getDoc(ref)).data().createdAt)||Date.now();
    freshCode=code;pins.unshift({code:code,end:c+PIN_MS});renderPins();
  }catch(_){setMsg($('pinMsg'),'No se pudo generar el PIN. Comprueba que tu cuenta sea administradora y que las reglas estén publicadas.');}
  finally{setBusy($('pinGen'),false,'Generar PIN nuevo');}
});
$('pinCopy').addEventListener('click',async()=>{
  const fresh=pins.find(p=>p.code===freshCode);if(!fresh)return;
  const btn=$('pinCopy');
  try{await navigator.clipboard.writeText(fmtPin(fresh.code));btn.textContent='Copiado';}
  catch(_){const r=document.createRange();r.selectNodeContents($('pinCode'));const s=getSelection();s.removeAllRanges();s.addRange(r);btn.textContent='Selecciona y copia';}
  setTimeout(()=>{btn.textContent='Copiar';},1800);
});

// Si el dispositivo estuvo suspendido, volver a validar al reanudar la pestaña.
document.addEventListener('visibilitychange',()=>{
  if(!document.hidden && session && session.role==='guest' && Date.now()>=session.end)location.reload();
});
