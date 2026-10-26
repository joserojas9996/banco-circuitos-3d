'use strict';
/* ===== Piezas del kit (lista del usuario) y geometría de la rejilla ===== */
const COLS=10, ROWS=7;
const rotc=(dx,dy,r)=>{switch(r&3){case 0:return[dx,dy];case 1:return[-dy,dx];case 2:return[-dx,-dy];default:return[dy,-dx];}};
const DEFS={}, KIT=[];
const def=(id,o)=>{o.id=id;DEFS[id]=o;KIT.push(id);};
const VT=0.02585, GMIN=1e-9, RW=0.02;
const ledP=(Vf)=>{const nvt=2*VT,Is=0.01/Math.exp(Vf/nvt);return{nvt:nvt,Is:Is,vcrit:nvt*Math.log(nvt/(Math.SQRT2*Is))};};
const BLUE='#3b6db3';
[[1,3],[2,6],[3,3],[4,1],[5,1],[6,1]].forEach(a=>{
  const n=a[0];
  def('blk'+n,{kind:'wire',code:String(n),L:n,W:1,term:n===1?[[0,0],[0,0]]:[[0,0],[n-1,0]],
    name:'Bloque #'+n,sub:n===1?'1 broche':n+' broches',qty:a[1],color:BLUE});
});
def('wc',{kind:'whistle',code:'WC',label:'WC SILBADOR',L:3,W:1,term:[[0,0],[2,0]],R:150,name:'Chip silbador',sub:'silba al energizarse',qty:1,color:'#d4453d'});
def('s1',{kind:'switch',code:'S1',label:'S1 DESLIZANTE',L:3,W:1,term:[[0,0],[2,0]],name:'Interruptor',sub:'deslizante',qty:1,color:'#43a05a'});
def('s2',{kind:'button',code:'S2',label:'S2 CONTACTO',L:3,W:1,term:[[0,0],[2,0]],name:'Interruptor de contacto',sub:'pulsador',qty:1,color:'#43a05a'});
def('rp',{kind:'photo',code:'RP',label:'RP FOTO',L:3,W:1,term:[[0,0],[2,0]],name:'Fotorresistencia',sub:'resistencia según luz',qty:1,color:'#cdb9bb'});
def('d1',Object.assign({kind:'led',code:'D1',label:'D1 LED',L:3,W:1,term:[[0,0],[2,0]],name:'LED rojo',sub:'ánodo (+) a la izquierda',qty:1,color:'#e0444a',lens:'#ff2d3d'},ledP(1.9)));
def('l1',{kind:'lamp',code:'L1',label:'L1 LÁMPARA',L:3,W:1,term:[[0,0],[2,0]],R:16,name:'Lámpara',sub:'2,5 V · 0,2 A',qty:1,color:'#c9c9cc'});
def('b1',{kind:'battery',code:'B1',label:'B1 · 3 V',L:3,W:2,term:[[0,0],[2,0]],E:3,r:0.5,name:'Porta pilas',sub:'2 × AA 1,5 V',qty:1,color:'#d9a38c'});
def('sp',{kind:'speaker',code:'SP',label:'SP BOCINA',L:3,W:1,term:[[0,0],[2,0]],R:8,name:'Bocina',sub:'8 Ω',qty:1,color:'#d4453d'});
def('u1',{kind:'ic',snd:'music',code:'U1',label:'U1 MÚSICA',L:3,W:2,term:[[0,0],[2,1],[2,0],[1,1],[0,1]],name:'Circuito de música',sub:'+ abajo izq. · − abajo der./arriba izq. · salida arriba centro/der.',qty:1,color:'#3f84d4'});
def('u2',{kind:'ic',snd:'alarm',code:'U2',label:'U2 ALARMA',L:3,W:2,term:[[0,0],[2,1],[2,0],[1,1],[0,1]],name:'Circuito de alarma',sub:'+ abajo izq. · − abajo der./arriba izq. · salida arriba centro/der.',qty:1,color:'#d9443c'});
def('u3',{kind:'ic',snd:'space',code:'U3',label:'U3 GUERRA ESPACIAL',L:3,W:2,term:[[0,0],[2,1],[2,0],[1,1],[0,1]],name:'Circuito guerra espacial',sub:'+ abajo izq. · − abajo der./arriba izq. · salida arriba centro/der.',qty:1,color:'#43a85a'});
def('m1',{kind:'motor',code:'M1',label:'M1 MOTOR',L:3,W:1,term:[[0,0],[2,0]],R:15,name:'Motor y ventilador',sub:'3 V',qty:1,color:'#dcc3c3'});
def('r1',{kind:'resistor',code:'R1',label:'R1 100 Ω',L:3,W:1,term:[[0,0],[2,0]],R:100,bands:['#6d3b1e','#111111','#6d3b1e'],name:'Resistencia',sub:'100 Ω',qty:1,color:'#e8cf45'});
def('jb',{kind:'jumper',code:'—',L:1,W:1,term:[[0,0],[0,0]],name:'Puente de cable negro',sub:'une dos broches',qty:1,color:'#1d2024',maxLen:9});
def('jr',{kind:'jumper',code:'—',L:1,W:1,term:[[0,0],[0,0]],name:'Puente de cable rojo',sub:'une dos broches',qty:1,color:'#c8322d',maxLen:9});

function geo(d,x,y,r,x2,y2){
  if(d.kind==='jumper'){const a=[x,y],b=[x2,y2];return{cells:[a,b],terms:[a,b]};}
  const cells=[],terms=[];
  for(let dx=0;dx<d.L;dx++)for(let dy=0;dy<d.W;dy++){const v=rotc(dx,dy,r);cells.push([x+v[0],y+v[1]]);}
  for(const t of d.term){const v=rotc(t[0],t[1],r);terms.push([x+v[0],y+v[1]]);}
  return{cells:cells,terms:terms};
}
const key=(c)=>c[1]*COLS+c[0];
// Coordenadas: X numerado 1–10; Y con letras de arriba a abajo (A, B, C, D, F, G, H).
const ROW_LABELS='ABCDFGH';
const cellName=(c,r)=>String(c+1)+ROW_LABELS[ROWS-1-r];

/* ===== Simulador DC / transitorio (nodos = broches de la base) ===== */
// SIM-START
function pnjlim(vn,vo,vt,vc){
  if(vn>vc&&Math.abs(vn-vo)>2*vt){
    if(vo>0){const a=(vn-vo)/vt;vn=a>0?vo+vt*(2+Math.log(a-2)):vo-vt*(2+Math.log(2-a));}
    else vn=vt*Math.log(vn/vt);
  }
  return vn;
}
function gauss(A,z,n){
  for(let i=0;i<n;i++){
    let p=i,mx=Math.abs(A[i*n+i]);
    for(let r=i+1;r<n;r++){const v=Math.abs(A[r*n+i]);if(v>mx){mx=v;p=r;}}
    if(mx<1e-18)continue;
    if(p!==i){for(let c=i;c<n;c++){const t=A[i*n+c];A[i*n+c]=A[p*n+c];A[p*n+c]=t;}const t=z[i];z[i]=z[p];z[p]=t;}
    const d=A[i*n+i];
    for(let r=i+1;r<n;r++){const f=A[r*n+i]/d;if(f===0)continue;for(let c=i;c<n;c++)A[r*n+c]-=f*A[i*n+c];z[r]-=f*z[i];}
  }
  const x=new Float64Array(n);
  for(let i=n-1;i>=0;i--){let s=z[i];for(let c=i+1;c<n;c++)s-=A[i*n+c]*x[c];const d=A[i*n+i];x[i]=Math.abs(d)<1e-18?0:s/d;}
  return x;
}
const ROUT=30, RIC=1200;
const photoR=(light)=>300*(1+60*Math.pow(1-Math.max(0,Math.min(1,light)),2));
// parts: {def,a,b,c,on,pressed,vc,vd,light,drive,vs,hidden}. a/b/c = nodos (índice de broche).
function simulate(parts,dt,commit){
  const act=parts.filter(p=>!p.hidden);
  for(const p of act){p.V=0;p.I=0;p.P=0;p.Io=0;}
  const volt=new Map();
  const bat=act.find(p=>p.def.kind==='battery');
  if(!bat)return{volt:volt,maxBat:0,ok:false};
  const gnd=bat.a,ids=new Map();let n=0;
  const idx=(nd)=>{if(nd===gnd)return -1;let k=ids.get(nd);if(k===undefined){k=n++;ids.set(nd,k);}return k;};
  const els=[];
  for(const p of act){
    els.push({p:p,role:'main',ia:idx(p.a),ib:idx(p.b),g:0,ieq:0});
    if(p.def.kind==='ic'){
      els.push({p:p,role:'outH',ia:idx(p.a),ib:idx(p.c),g:0,ieq:0});
      els.push({p:p,role:'outL',ia:idx(p.c),ib:idx(p.b),g:0,ieq:0});
      // Contactos adicionales del módulo de cinco broches: uno replica salida y otro negativo.
      // Conservamos los tres terminales originales para no alterar los ejemplos ya existentes.
      els.push({p:p,role:'icLink',ia:idx(p.tk[3]),ib:idx(p.c),g:0,ieq:0});
      els.push({p:p,role:'icLink',ia:idx(p.tk[4]),ib:idx(p.b),g:0,ieq:0});
    }
  }
  const hasLed=els.some(e=>e.p.def.kind==='led');
  let V=new Float64Array(n);
  const A=new Float64Array(n*n),z=new Float64Array(n);
  for(let it=0;it<(hasLed?80:1);it++){
    A.fill(0);z.fill(0);
    for(let i=0;i<n;i++)A[i*n+i]+=GMIN;
    for(const e of els){
      const p=e.p,d=p.def;let g=0,ieq=0;
      if(e.role==='icLink')g=1/RW;
       else if(e.role==='outH')g=p.drive?1/ROUT:1e-9;
      else if(e.role==='outL')g=p.drive?1e-9:1/ROUT;
      else switch(d.kind){
        case 'wire':case 'jumper':g=1/RW;break;
        case 'switch':g=p.on?1/RW:1e-9;break;
        case 'button':g=p.pressed?1/RW:1e-9;break;
        case 'battery':g=1/d.r;ieq=d.E/d.r;break;
        case 'led':{const ex=Math.exp(p.vd/d.nvt);g=d.Is/d.nvt*ex+1e-12;ieq=d.Is*(ex-1)-g*p.vd;break;}
        case 'ic':g=1/RIC;break;
        case 'photo':g=1/photoR(p.light);break;
        default:g=1/d.R;
      }
      e.g=g;e.ieq=ieq;
      if(e.ia>=0)A[e.ia*n+e.ia]+=g;
      if(e.ib>=0)A[e.ib*n+e.ib]+=g;
      if(e.ia>=0&&e.ib>=0){A[e.ia*n+e.ib]-=g;A[e.ib*n+e.ia]-=g;}
      if(e.ia>=0)z[e.ia]-=ieq;
      if(e.ib>=0)z[e.ib]+=ieq;
    }
    V=gauss(A,z,n);
    if(!hasLed)break;
    let conv=true;
    for(const e of els)if(e.p.def.kind==='led'){
      const vn=(e.ia>=0?V[e.ia]:0)-(e.ib>=0?V[e.ib]:0);
      const lim=pnjlim(vn,e.p.vd,e.p.def.nvt,e.p.def.vcrit);
      if(Math.abs(lim-e.p.vd)>1e-6)conv=false;
      e.p.vd=lim;
    }
    if(conv)break;
  }
  let maxBat=0;
  for(const e of els){
    const p=e.p,va=e.ia>=0?V[e.ia]:0,vb=e.ib>=0?V[e.ib]:0,vv=va-vb,ii=e.g*vv+e.ieq;
    if(e.role==='icLink')continue;
     if(e.role==='outH'){p.Io=ii;continue;}
    if(e.role==='outL')continue;
    p.V=vv;p.I=ii;p.P=vv*ii;
    if(p.def.kind==='ic')p.vs=Math.max(0,vv); // tensión de alimentación (+ respecto a −)
    if(p.def.kind==='battery')maxBat=Math.max(maxBat,Math.abs(p.I));
  }
  volt.set(gnd,0);
  ids.forEach((k,nd)=>volt.set(nd,V[k]));
  return{volt:volt,maxBat:maxBat,ok:true};
}
// SIM-END

/* ===== Modelos 3D: utilidades, broches y puentes ===== */
// Cada módulo descansa sobre los broches de la base; el siguiente nivel se apoya en los broches del módulo de abajo.
const PLATE=0.08, SNAP=0.06, LAYER=PLATE+SNAP, BASE_Y=0.07, PZ=-0.06, CAPH=0.12;
const mat=(color,o)=>new THREE.MeshStandardMaterial(Object.assign({color:color,roughness:.55,metalness:.05},o||{}));
const cyl=(rt,rb,h,m,seg)=>new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,seg||24),m);
const bx=(w,h,d,m)=>new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);
const METAL=()=>mat('#c8ced4',{metalness:.85,roughness:.28});
function rrShape(w,h,r){
  const s=new THREE.Shape(),x=-w/2,y=-h/2;
  s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);
  s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  s.lineTo(x+r,y+h);s.quadraticCurveTo(x,y+h,x,y+h-r);
  s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);
  return s;
}
// Placa con borde biselado. Base en y=0, cara superior en y=H.
function plateGeo(w,h,r,H){
  const bt=Math.min(.022,H/3);
  const g=new THREE.ExtrudeGeometry(rrShape(w-2*bt,h-2*bt,Math.max(.02,r-bt)),
    {depth:H-2*bt,bevelEnabled:true,bevelThickness:bt,bevelSize:bt,bevelSegments:2,curveSegments:8});
  g.translate(0,0,bt);g.rotateX(-Math.PI/2);return g;
}
function pill(ctx,x,y,w,h,r){
  ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);
  ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();
}
const texCache={};
function labelTex(text){
  if(texCache[text])return texCache[text];
  const c=document.createElement('canvas');c.width=384;c.height=64;const x=c.getContext('2d');
  x.fillStyle='rgba(255,255,255,.92)';pill(x,2,10,380,44,20);x.fill();
  let fs=32;x.font='700 '+fs+'px "Barlow Semi Condensed",sans-serif';
  while(fs>14&&x.measureText(text).width>350){fs-=2;x.font='700 '+fs+'px "Barlow Semi Condensed",sans-serif';}
  x.fillStyle='#1b2220';x.textAlign='center';x.textBaseline='middle';x.fillText(text,192,33);
  const t=new THREE.CanvasTexture(c);t.anisotropy=4;texCache[text]=t;return t;
}
function signTex(ch){
  const k='sign'+ch;if(texCache[k])return texCache[k];
  const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d');
  x.fillStyle='#ffffff';x.font='700 54px sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillText(ch,32,34);
  const t=new THREE.CanvasTexture(c);texCache[k]=t;return t;
}
function flatPlane(w,h,tex,x,y,z){
  const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:tex,transparent:true}));
  m.rotation.x=-Math.PI/2;m.position.set(x,y,z);return m;
}
let glowTex=null;
function getGlowTex(){
  if(!glowTex){
    const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d');
    const g=x.createRadialGradient(64,64,0,64,64,64);
    g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.25,'rgba(255,255,255,.55)');g.addColorStop(1,'rgba(255,255,255,0)');
    x.fillStyle=g;x.fillRect(0,0,128,128);glowTex=new THREE.CanvasTexture(c);
  }
  return glowTex;
}
function glow(color,size){
  const s=new THREE.Sprite(new THREE.SpriteMaterial({map:getGlowTex(),color:color,transparent:true,opacity:0,depthWrite:false,depthTest:false}));
  s.scale.set(size,size,1);s.renderOrder=15;return s;
}
function pool(color,size,x,y,z){
  const m=new THREE.Mesh(new THREE.PlaneGeometry(size,size),new THREE.MeshBasicMaterial({map:getGlowTex(),color:color,transparent:true,opacity:0,depthWrite:false}));
  m.rotation.x=-Math.PI/2;m.position.set(x,y,z);m.userData.noPick=true;return m;
}
// Broche macho de presión sobre la placa (sobre él se apoya el siguiente módulo)
function snapButton(x,y,z){
  const g=new THREE.Group();
  const b=cyl(.13,.15,SNAP,METAL(),24);b.position.y=SNAP/2;g.add(b);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(.078,.014,8,24),mat('#59616a',{metalness:.7,roughness:.4}));
  ring.rotation.x=Math.PI/2;ring.position.y=SNAP+.001;g.add(ring);
  g.position.set(x,y,z);return g;
}

/* ===== Puente de cable flexible entre dos broches ===== */
function jumperGeometry(d,A,B,layer,ghost,selected){
  const g=new THREE.Group(),y0=BASE_Y+layer*LAYER;
  const pa=cellPos(A[0],A[1]),pb=cellPos(B[0],B[1]);
  const mk=(c,o)=>{const m=mat(c,o);if(ghost){m.transparent=true;m.opacity=.6;m.depthWrite=false;}return m;};
  const cm=mk(d.color,{roughness:.3,metalness:.1});
  [pa,pb].forEach(p=>{
    const cap=cyl(.21,.23,CAPH,cm,28);cap.position.set(p.x,y0+CAPH/2,p.z);cap.castShadow=!ghost;g.add(cap);
    const ring=new THREE.Mesh(new THREE.TorusGeometry(.12,.022,8,24),mk('#d6dbe0',{metalness:.85,roughness:.3}));
    ring.rotation.x=Math.PI/2;ring.position.set(p.x,y0+CAPH+.002,p.z);g.add(ring);
    const dome=cyl(.09,.1,.03,mk('#c8ced4',{metalness:.85,roughness:.3}),20);dome.position.set(p.x,y0+CAPH+.012,p.z);g.add(dome);
    if(selected){
      const s=new THREE.Mesh(new THREE.TorusGeometry(.33,.025,8,32),new THREE.MeshBasicMaterial({color:getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()||'#1f5eff',depthTest:false}));
      s.rotation.x=Math.PI/2;s.position.set(p.x,y0+.1,p.z);s.renderOrder=12;g.add(s);
    }
  });
  const dist=Math.hypot(pa.x-pb.x,pa.z-pb.z),h=Math.min(1.7,.3+.14*dist);
  const s=new THREE.Vector3(pa.x,y0+CAPH,pa.z),e=new THREE.Vector3(pb.x,y0+CAPH,pb.z);
  const c=s.clone().lerp(e,.5);c.y+=2*h;
  const curve=new THREE.QuadraticBezierCurve3(s,c,e);
  if(dist>.01){const tube=new THREE.Mesh(new THREE.TubeGeometry(curve,32,.05,10,false),cm);tube.castShadow=!ghost;g.add(tube);}
  return{group:g,curve:curve};
}

/* ===== Módulos del kit ===== */
const SIGNS={battery:['−','+'],led:['+','−'],ic:['+','−','»'],motor:['−','+']};
function zigzagTex(){
  if(texCache.zig)return texCache.zig;
  const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d');
  x.fillStyle='#b99b6a';x.beginPath();x.arc(64,64,62,0,Math.PI*2);x.fill();
  x.strokeStyle='#2b2118';x.lineWidth=7;x.lineJoin='round';x.beginPath();
  for(let i=0;i<7;i++){const yy=24+i*13;x.moveTo(i%2?96:32,yy);x.lineTo(i%2?32:96,yy);if(i<6)x.lineTo(i%2?32:96,yy+13);}
  x.stroke();const t=new THREE.CanvasTexture(c);texCache.zig=t;return t;
}
function buildPart(d){
  const group=new THREE.Group(),body=new THREE.Group();group.add(body);
  const L=d.L,W=d.W,isBlock=d.kind==='wire';let anim=null;
  const cx=(L-1)/2,top=PLATE;
  let plateGeom;
  if(isBlock&&L===1)plateGeom=plateGeo(.8,.8,.3,PLATE);
  else plateGeom=plateGeo(L-.12,isBlock?.52:(W===1?.74:W-.28),.18,PLATE);
  const plate=new THREE.Mesh(plateGeom,mat(d.color,{roughness:.5}));
  plate.position.set(cx,0,(W-1)/2);body.add(plate);
  const seen={};
  d.term.forEach((t,i)=>{
    const k=t[0]+','+t[1];
    if(!seen[k]){seen[k]=1;body.add(snapButton(t[0],top,t[1]));}
    const sg=SIGNS[d.kind];
    if(sg&&sg[i]){const z=d.kind==='battery'?1.08:(W===2?.3:.27);body.add(flatPlane(.26,.26,signTex(sg[i]),t[0],top+.004,t[1]+z));}
  });
  if(d.label){
    const bat=d.kind==='battery',ic=d.kind==='ic';
    body.add(flatPlane(bat?1.1:(ic?1.4:Math.min(1.45,L-.5)),bat?.27:.23,labelTex(d.label),cx,top+.004,bat?1.08:(ic?-.22:.27)));
  }
  switch(d.kind){
    case 'battery':{
      const sleeve=mat('#20262d',{roughness:.45,metalness:.25}),band=mat('#f08a24',{roughness:.5}),nick=METAL();
      [[.58,.95],[1.55,.95]].forEach(a=>{
        const c=cyl(.26,.26,a[1],sleeve,32);c.rotation.z=Math.PI/2;c.position.set(a[0],top+.27,.5);body.add(c);
        const b=cyl(.262,.262,.1,band,32);b.rotation.z=Math.PI/2;b.position.set(a[0]-.2,top+.27,.5);body.add(b);
        const cp=cyl(.26,.26,.03,nick,32);cp.rotation.z=Math.PI/2;cp.position.set(a[0]-a[1]/2-.015,top+.27,.5);body.add(cp);
        const cn=cyl(.26,.26,.03,nick,32);cn.rotation.z=Math.PI/2;cn.position.set(a[0]+a[1]/2+.015,top+.27,.5);body.add(cn);
        const nub=cyl(.1,.1,.05,nick,16);nub.rotation.z=Math.PI/2;nub.position.set(a[0]+a[1]/2+.05,top+.27,.5);body.add(nub);
      });
      body.add(bx(.04,.18,.5,mat('#6b7480')).translateX(1.06).translateY(top+.2).translateZ(.5));
      break;}
    case 'switch':{
      const hs=bx(1.3,.16,.46,mat('#1c2128',{roughness:.45}));hs.position.set(cx,top+.08,PZ);body.add(hs);
      const slot=bx(1.0,.02,.14,mat('#05070a'));slot.position.set(cx,top+.165,PZ);body.add(slot);
      const knob=bx(.34,.2,.26,mat('#eceeee',{roughness:.35}));knob.position.set(.65,top+.26,PZ);body.add(knob);
      anim=(p,dt)=>{const tx=p.on?1.35:.65;knob.position.x+=(tx-knob.position.x)*Math.min(1,dt*18+.0001);};
      break;}
    case 'button':{
      const ring=cyl(.33,.35,.1,mat('#20252b',{roughness:.45}),32);ring.position.set(cx,top+.05,PZ);body.add(ring);
      const cap=cyl(.24,.26,.16,mat('#d9453c',{roughness:.3}),32);cap.position.set(cx,top+.18,PZ);body.add(cap);
      const dome=new THREE.Mesh(new THREE.SphereGeometry(.24,24,8,0,Math.PI*2,0,Math.PI/3),mat('#e65a50',{roughness:.25}));dome.position.y=.08;cap.add(dome);
      anim=(p,dt)=>{const ty=p.pressed?top+.12:top+.18;cap.position.y+=(ty-cap.position.y)*Math.min(1,dt*25+.0001);};
      break;}
    case 'photo':{
      const disc=cyl(.31,.31,.05,mat('#c9c4b8',{roughness:.5}),32);disc.position.set(cx,top+.025,PZ);body.add(disc);
      const tr=new THREE.Mesh(new THREE.CircleGeometry(.27,32),new THREE.MeshBasicMaterial({map:zigzagTex()}));
      tr.rotation.x=-Math.PI/2;tr.position.set(cx,top+.052,PZ);body.add(tr);
      [[0,cx-.3],[cx+.3,2]].forEach(a=>{const w=cyl(.02,.02,Math.abs(a[1]-a[0]),METAL(),8);w.rotation.z=Math.PI/2;w.position.set((a[0]+a[1])/2,top+.03,PZ);body.add(w);});
      break;}
    case 'lamp':{
      const base=cyl(.22,.25,.2,METAL(),24);base.position.set(cx,top+.1,PZ);body.add(base);
      for(let i=0;i<3;i++){const g=cyl(.255,.255,.018,mat('#9aa2aa',{metalness:.8}),24);g.position.set(cx,top+.05+i*.06,PZ);body.add(g);}
      const gm=new THREE.MeshStandardMaterial({color:'#ffffff',transparent:true,opacity:.3,roughness:.05,metalness:.1,emissive:new THREE.Color('#ffa726'),emissiveIntensity:0,depthWrite:false});
      const glass=new THREE.Mesh(new THREE.SphereGeometry(.34,32,22),gm);glass.position.set(cx,top+.5,PZ);body.add(glass);
      const neck=cyl(.14,.2,.16,gm,20);neck.position.set(cx,top+.26,PZ);body.add(neck);
      const fm=new THREE.MeshStandardMaterial({color:'#6b6354',emissive:new THREE.Color('#ffb020'),emissiveIntensity:0,roughness:.5,metalness:.5});
      [-.07,.07].forEach(x=>{const s=cyl(.01,.01,.22,METAL(),6);s.position.set(cx+x,top+.4,PZ);body.add(s);});
      const fil=new THREE.Mesh(new THREE.TorusGeometry(.07,.016,8,20,Math.PI),fm);fil.position.set(cx,top+.5,PZ);body.add(fil);
      const gl=glow('#ffd45e',2.6);gl.position.set(cx,top+.5,PZ);body.add(gl);
      const pl=pool('#ffcf5a',2.8,cx,top+.01,PZ);body.add(pl);
      anim=(p,dt)=>{const t=Math.min(1,Math.max(0,p.P/0.64));p.lit+=(t-p.lit)*Math.min(1,dt*12+.001);
        gm.opacity=.3+p.lit*.2;gm.emissiveIntensity=p.lit*1.1;fm.emissiveIntensity=p.lit*3;gl.material.opacity=p.lit*.85;pl.material.opacity=p.lit*.7;};
      break;}
    case 'led':{
      const fl=cyl(.3,.3,.04,mat('#d7d9d6',{roughness:.4}),28);fl.position.set(cx,top+.14,PZ);body.add(fl);
      const flat=bx(.08,.05,.62,mat(d.color,{roughness:.5}));flat.position.set(cx+.31,top+.14,PZ);body.add(flat);
      const dark=new THREE.Color(d.lens).multiplyScalar(.28),bright=new THREE.Color(d.lens).lerp(new THREE.Color('#ffffff'),.4);
      const dm=new THREE.MeshStandardMaterial({color:dark.clone(),transparent:true,opacity:.78,roughness:.15,emissive:new THREE.Color(d.lens),emissiveIntensity:0});
      const stem=cyl(.24,.24,.22,dm,28);stem.position.set(cx,top+.27,PZ);body.add(stem);
      const dome=new THREE.Mesh(new THREE.SphereGeometry(.24,28,14,0,Math.PI*2,0,Math.PI/2),dm);dome.position.set(cx,top+.38,PZ);body.add(dome);
      const die=bx(.1,.12,.1,mat('#2a2a2a'));die.position.set(cx,top+.22,PZ);body.add(die);
      [[0,cx-.2],[cx+.2,2]].forEach(a=>{
        const w=cyl(.022,.022,Math.abs(a[1]-a[0]),METAL(),8);w.rotation.z=Math.PI/2;w.position.set((a[0]+a[1])/2,top+.12,PZ);body.add(w);
      });
      const gl=glow(d.lens,3.2);gl.position.set(cx,top+.4,PZ);body.add(gl);
      const gl2=glow('#ffffff',1.0);gl2.position.set(cx,top+.4,PZ);body.add(gl2);
      const pl=pool(d.lens,3.0,cx,top+.012,PZ);body.add(pl);
      anim=(p,dt)=>{
        let t=p.I>2e-5?Math.min(1,.25+.75*Math.pow(Math.max(0,p.I)/0.006,.5)):0;
        p.lit+=(t-p.lit)*Math.min(1,dt*16+.001);
        dm.color.copy(dark).lerp(bright,Math.min(1,p.lit*1.4));dm.opacity=.78+.22*p.lit;dm.emissiveIntensity=p.lit*2.6;
        gl.material.opacity=p.lit*.9;gl2.material.opacity=Math.max(0,p.lit-.35)*1.1;pl.material.opacity=p.lit*.75;};
      break;}
    case 'motor':{
      const can=cyl(.33,.33,.34,mat('#8b929b',{metalness:.7,roughness:.35}),32);can.position.set(cx,top+.17,PZ);body.add(can);
      const rib=cyl(.335,.335,.03,mat('#5d646c',{metalness:.7}),32);rib.position.set(cx,top+.1,PZ);body.add(rib);
      const cp=cyl(.22,.26,.05,mat('#2b3036'),28);cp.position.set(cx,top+.365,PZ);body.add(cp);
      const fan=new THREE.Group();fan.position.set(cx,top+.48,PZ);body.add(fan);
      const sh=cyl(.035,.035,.2,METAL(),10);sh.position.y=-.08;fan.add(sh);
      const bm=mat('#d9453c',{roughness:.4});
      for(let i=0;i<3;i++){const b=new THREE.Mesh(new THREE.CylinderGeometry(.09,.09,.016,16),bm);b.scale.set(2.2,1,.8);b.position.set(.3*Math.cos(i*2.094),0,.3*Math.sin(i*2.094));b.rotation.y=-i*2.094;b.rotation.z=.12;fan.add(b);}
      fan.add(cyl(.08,.08,.06,mat('#20252b'),16));
      anim=(p,dt)=>{const tg=Math.max(-30,Math.min(30,p.I*150));p.w+=(tg-p.w)*Math.min(1,dt*6+.001);p.phi+=p.w*dt;fan.rotation.y=p.phi;};
      break;}
    case 'speaker':{
      const h=cyl(.32,.34,.14,mat('#23272c',{roughness:.5}),36);h.position.set(cx,top+.07,PZ);body.add(h);
      const lip=new THREE.Mesh(new THREE.TorusGeometry(.31,.016,8,36),mat('#3a4048'));lip.rotation.x=Math.PI/2;lip.position.set(cx,top+.14,PZ);body.add(lip);
      const cone=cyl(.12,.27,.07,mat('#3d434b',{roughness:.7}),32);cone.position.set(cx,top+.11,PZ);body.add(cone);
      const capm=new THREE.Mesh(new THREE.SphereGeometry(.1,16,8,0,Math.PI*2,0,Math.PI/2),mat('#2a2e34'));capm.position.set(cx,top+.14,PZ);body.add(capm);
      anim=(p,dt,t)=>{p.aud+=((p.snd?1:0)-p.aud)*Math.min(1,dt*10+.001);const s=1+.12*p.aud*Math.sin(t*70);cone.scale.set(1,s,1);capm.position.y=top+.14+(s-1)*.07;};
      break;}
    case 'whistle':{
      const disc=cyl(.29,.3,.05,mat('#d9b24a',{metalness:.6,roughness:.35}),32);disc.position.set(cx,top+.025,PZ);body.add(disc);
      const rim=new THREE.Mesh(new THREE.TorusGeometry(.3,.025,8,32),mat('#3b3f45'));rim.rotation.x=Math.PI/2;rim.position.set(cx,top+.05,PZ);body.add(rim);
      const hole=cyl(.06,.06,.012,mat('#050607'),14);hole.position.set(cx,top+.052,PZ);body.add(hole);
      const rings=[];
      for(let i=0;i<3;i++){
        const m=new THREE.MeshBasicMaterial({color:'#ffd27a',transparent:true,opacity:0,depthWrite:false});
        const r=new THREE.Mesh(new THREE.TorusGeometry(.5,.016,6,44),m);r.rotation.x=Math.PI/2;r.position.set(cx,top+.3,PZ);body.add(r);rings.push(r);
      }
      anim=(p,dt,t)=>{p.aud+=((p.snd?1:0)-p.aud)*Math.min(1,dt*10+.001);rings.forEach((r,i)=>{
        const ph=(t*1.6+i/3)%1;r.scale.setScalar(.5+ph*1.1);r.material.opacity=p.aud*(1-ph)*.7;});};
      break;}
    case 'ic':{
      const pk=bx(1.5,.14,.6,mat('#17191c',{roughness:.45}));pk.position.set(cx,top+.07,.5);body.add(pk);
      const dot=cyl(.04,.04,.01,mat('#3a3d42'),10);dot.position.set(cx-.62,top+.145,.3);body.add(dot);
      for(let i=0;i<8;i++){
        [.17,.83].forEach(z=>{const pn=bx(.07,.03,.1,METAL());pn.position.set(cx-.62+i*.177,top+.03,z);body.add(pn);});
      }
      const dm=new THREE.MeshStandardMaterial({color:'#3b3f45',emissive:new THREE.Color('#44ff99'),emissiveIntensity:0});
      const pwr=cyl(.04,.04,.012,dm,12);pwr.position.set(cx+.62,top+.146,.3);body.add(pwr);
      anim=(p)=>{dm.emissiveIntensity=(p.vs>1.8)?(.6+.6*Math.sin(performance.now()/180)):0;};
      break;}
    case 'resistor':{
      const bd=cyl(.13,.13,.92,mat('#d8bd96',{roughness:.7}),24);bd.rotation.z=Math.PI/2;bd.position.set(cx,top+.18,PZ);body.add(bd);
      [-.3,-.12,.06].forEach((dx,i)=>{const b=cyl(.133,.133,.07,mat(d.bands[i]),24);b.rotation.z=Math.PI/2;b.position.set(cx+dx,top+.18,PZ);body.add(b);});
      const g=cyl(.133,.133,.05,mat('#c9a227',{metalness:.6}),24);g.rotation.z=Math.PI/2;g.position.set(cx+.33,top+.18,PZ);body.add(g);
      [[0,.54],[2,1.46]].forEach(l=>{
        const h=cyl(.022,.022,Math.abs(l[1]-l[0]),METAL(),8);h.rotation.z=Math.PI/2;h.position.set((l[0]+l[1])/2,top+.18,PZ);body.add(h);
      });
      break;}
    default:break;
  }
  body.traverse(o=>{if(o.isMesh&&!(o.material&&o.material.transparent)){o.castShadow=true;o.receiveShadow=true;}});
  return{group:group,body:body,anim:anim,pins:[]};
}
function makeGhost(d){
  const g=buildPart(d).group;
  g.traverse(o=>{
    if(o.isSprite||(o.material&&o.material.map===glowTex&&glowTex)){o.visible=false;return;}
    if(o.material){
      o.material=o.material.clone();o.material.transparent=true;o.material.depthWrite=false;
      o.material.opacity=(o.material.opacity===undefined?1:o.material.opacity)*.6;
    }
  });
  return g;
}
function tintGhost(g,ok){
  g.traverse(o=>{if(o.material&&o.material.emissive&&!o.isSprite){
    o.material.emissive.setHex(ok?0x0a3a5a:0x9a1212);o.material.emissiveIntensity=.55;}});
}

/* ===== Escena, base y modelo ===== */
const $=(id)=>document.getElementById(id);
const stage=$('stage');
let renderer;
try{
  renderer=new THREE.WebGLRenderer({antialias:true});
}catch(err){
  const m=document.createElement('p');m.style.cssText='padding:24px;max-width:48ch';
  m.textContent='No se pudo iniciar WebGL en este navegador. Activa la aceleración por hardware e inténtalo de nuevo.';
  stage.appendChild(m);throw err;
}
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
const dom=renderer.domElement;dom.className='gl';stage.insertBefore(dom,stage.firstChild);
const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(40,1,.1,100);
scene.add(new THREE.HemisphereLight(0xffffff,0x8a97a3,.8));
const sun=new THREE.DirectionalLight(0xffffff,.75);sun.position.set(5,11,7);sun.castShadow=true;
sun.shadow.mapSize.set(2048,2048);sun.shadow.bias=-.0006;
Object.assign(sun.shadow.camera,{left:-9,right:9,top:9,bottom:-9,near:1,far:30});scene.add(sun);
const catcher=new THREE.Mesh(new THREE.PlaneGeometry(60,60),new THREE.ShadowMaterial({opacity:.22}));
catcher.rotation.x=-Math.PI/2;catcher.position.y=-.41;catcher.receiveShadow=true;scene.add(catcher);
const baseMesh=new THREE.Mesh(plateGeo(COLS+1.4,ROWS+1.4,.35,.4),mat('#2b323a',{roughness:.65}));
baseMesh.position.y=-.4;baseMesh.receiveShadow=true;baseMesh.castShadow=true;scene.add(baseMesh);
// Números en X (1–10) y letras en Y (A, B, C, D, F, G, H) en los cuatro bordes.
function edgeLabel(t,x,z){
  const c=document.createElement('canvas');c.width=c.height=64;const g=c.getContext('2d');
  g.fillStyle='#98a4ae';g.font='600 40px sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText(t,32,34);
  const tx=new THREE.CanvasTexture(c);scene.add(flatPlane(.5,.5,tx,x,.004,z));
}
for(let c=0;c<COLS;c++){const t=String(c+1);edgeLabel(t,c+.5-COLS/2,ROWS/2+.42);edgeLabel(t,c+.5-COLS/2,-ROWS/2-.42);}
for(let r=0;r<ROWS;r++){const t=ROW_LABELS[ROWS-1-r];edgeLabel(t,-COLS/2-.42,r+.5-ROWS/2);edgeLabel(t,COLS/2+.42,r+.5-ROWS/2);}
const dummy=new THREE.Object3D();
const studs=new THREE.InstancedMesh(new THREE.CylinderGeometry(.13,.15,BASE_Y,20),mat('#ffffff',{roughness:.35,metalness:.6}),COLS*ROWS);
studs.receiveShadow=true;scene.add(studs);
const STUD0=new THREE.Color('#b4bec7'),VLO=new THREE.Color('#2d6cdf'),VHI=new THREE.Color('#ff9f1c'),tmpC=new THREE.Color();
function setStud(i,s,col){
  dummy.position.set(i%COLS+.5-COLS/2,BASE_Y/2,((i/COLS)|0)+.5-ROWS/2);dummy.rotation.set(0,0,0);dummy.scale.set(s,1,s);
  dummy.updateMatrix();studs.setMatrixAt(i,dummy.matrix);studs.setColorAt(i,col);
}
for(let i=0;i<COLS*ROWS;i++)setStud(i,1,STUD0);
function readTheme(){
  const cs=getComputedStyle(document.documentElement);
  scene.background=new THREE.Color((cs.getPropertyValue('--scene')||'#dfe4e1').trim());
  drawIcons();
}
const cellPos=(c,r)=>new THREE.Vector3(c+.5-COLS/2,0,r+.5-ROWS/2);

/* ===== Piezas colocadas ===== */
const parts=[];let uid=0,dirty=true,selected=null,selBox=null,hovered=null;
const ripples=[];
const countOf=(id)=>parts.filter(p=>p.def.id===id).length;
const remaining=(id)=>DEFS[id].qty-countOf(id);
function rebuildJumper(p){
  while(p.group.children.length){const c=p.group.children[0];p.group.remove(c);}
  const j=jumperGeometry(p.def,[p.x,p.y],[p.x2,p.y2],p.layer,false,selected===p);
  p.group.add(j.group);p.curve=j.curve;
}
function relayout(){
  const sorted=parts.slice().sort((a,b)=>a.id-b.id);
  sorted.forEach(p=>{
    p.g=geo(p.def,p.x,p.y,p.r,p.x2,p.y2);p.tk=p.g.terms.map(key);
    p.a=p.tk[0];p.b=p.tk[1];p.c=p.tk[2];
  });
  sorted.forEach((p,i)=>{
    // Capa: el primer nivel libre entre las piezas que comparten broche (se apoyan unas sobre otras)
    const used={};
    for(let j=0;j<i;j++){const q=sorted[j];if(q.tk.some(k=>p.tk.indexOf(k)>=0))used[q.layer]=true;}
    let l=0;while(used[l])l++;p.layer=l;
    const y0=BASE_Y+l*LAYER;p.baseY=y0;
    if(p.def.kind==='jumper'){
      rebuildJumper(p);p.group.position.set(0,p.drop||0,0);p.group.rotation.y=0;
      p.tw=p.g.terms.map(t=>{const v=cellPos(t[0],t[1]);v.y=y0+CAPH+.05;return v;});
    }else{
      p.group.position.copy(cellPos(p.x,p.y));p.group.position.y=y0+(p.drop||0);p.group.rotation.y=-p.r*Math.PI/2;
      p.tw=p.g.terms.map(t=>{const v=cellPos(t[0],t[1]);v.y=y0+PLATE+SNAP+.06;return v;});
    }
  });
  dirty=true;
  if(typeof syncRail==='function')syncRail();
}
function canPlace(d,x,y,r,ign,x2,y2){
  if(d.kind==='jumper'){
    if(x2===undefined||(x===x2&&y===y2))return false;
    if(Math.hypot(x-x2,y-y2)>d.maxLen)return false;
  }
  const g=geo(d,x,y,r,x2,y2);
  for(const c of g.cells)if(c[0]<0||c[0]>=COLS||c[1]<0||c[1]>=ROWS)return false;
  const mine=new Set(g.terms.map(key));
  for(const q of parts){
    if(q.id===ign)continue;
    const qg=geo(q.def,q.x,q.y,q.r,q.x2,q.y2),qt=new Set(qg.terms.map(key)),qc=new Set(qg.cells.map(key));
    for(const c of g.cells){const k=key(c);if(qc.has(k)&&!(mine.has(k)&&qt.has(k)))return false;}
  }
  for(const k of mine){let n=1;for(const q of parts){if(q.id!==ign&&q.tk&&q.tk.indexOf(k)>=0)n++;}if(n>3)return false;}
  return true;
}
function addPart(id,x,y,r,on,x2,y2,instant){
  const d=DEFS[id];let b={group:new THREE.Group(),body:null,anim:null,pins:[]};
  if(d.kind!=='jumper')b=buildPart(d);
  const p={id:++uid,def:d,x:x,y:y,r:r||0,x2:x2,y2:y2,on:!!on,pressed:false,vc:0,vd:.6,lit:0,aud:0,snd:false,light:.8,drive:0,vs:0,
    w:0,phi:0,flow:0,layer:0,anim:b.anim,group:b.group,body:b.body,V:0,I:0,P:0,Io:0,drop:instant?0:.4,landed:!!instant};
  b.group.userData.part=p;scene.add(b.group);parts.push(p);relayout();return p;
}
function spawnRipples(p){
  (p.tw||[]).forEach((v,i)=>{
    if(i&&p.tw[i-1].equals(v))return;
    const m=new THREE.Mesh(new THREE.TorusGeometry(.15,.025,8,32),new THREE.MeshBasicMaterial({color:'#ffd166',transparent:true,opacity:.9,depthTest:false}));
    m.rotation.x=Math.PI/2;m.position.copy(v);m.renderOrder=14;scene.add(m);ripples.push({m:m,t:0});
  });
}
function removePart(p){
  if(selected===p)select(null);
  if(hovered===p)hovered=null;
  scene.remove(p.group);parts.splice(parts.indexOf(p),1);relayout();
}
function clearAll(){parts.slice().forEach(removePart);}
function select(p){
  const prev=selected;
  if(selBox&&selBox.parent)selBox.parent.remove(selBox);selBox=null;selected=p;
  if(prev&&prev.def.kind==='jumper'&&parts.indexOf(prev)>=0)rebuildJumper(prev);
  if(p&&p.def.kind==='jumper')rebuildJumper(p);
  else if(p){
    selBox=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(p.def.L-.04,.95,p.def.W-.04)),
      new THREE.LineBasicMaterial({color:getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()||'#1f5eff',depthTest:false}));
    selBox.renderOrder=12;selBox.position.set((p.def.L-1)/2,.4,(p.def.W-1)/2);p.body.add(selBox);
  }
}

/* ===== Ejemplos con las piezas del kit ===== */
// [id, x, y, giro, cerrado?, x2, y2]
const EXAMPLES=[
  {name:'Lámpara con interruptor',parts:[['b1',3,5,0],['blk4',5,5,3],['l1',5,2,2],['s1',3,2,1,true],['blk2',3,4,1]]},
  {name:'LED con interruptor de contacto (mantén pulsado)',parts:[['b1',3,5,0],['s2',5,5,3],['blk2',5,3,3],['d1',5,2,2],['r1',3,2,1],['blk2',3,4,1]]},
  {name:'Motor con interruptor',parts:[['b1',3,5,0],['blk4',5,5,3],['m1',5,2,2],['s1',3,2,1,true],['blk2',3,4,1]]},
  {name:'LED y fotorresistencia (regula la luz)',parts:[['b1',3,5,0],['blk4',5,5,3],['rp',5,2,2],['d1',3,2,1],['blk2',3,4,1]]},
  {name:'Música con puente de cable',parts:[['b1',6,5,0],['blk3',8,5,3],['s1',8,3,2,true],['u1',6,3,2],['sp',4,3,2],['blk3',2,3,1],['blk5',2,5,0],['jr',4,2,0,false,6,5]]},
  {name:'Chip silbador',parts:[['b1',3,5,0],['blk4',5,5,3],['wc',5,2,2],['s1',3,2,1,true],['blk2',3,4,1]]}
];
function loadExample(i){clearAll();EXAMPLES[i].parts.forEach(a=>addPart(a[0],a[1],a[2],a[3],a[4],a[5],a[6],true));}
EXAMPLES.forEach((e,i)=>{const o=document.createElement('option');o.value=i;o.textContent=e.name;$('examples').appendChild(o);});

/* ===== Cámara ===== */
const target=new THREE.Vector3(0,0,0);let theta=0,phi=.85,radius=15;
function updateCamera(){
  const sp=Math.sin(phi);
  camera.position.set(target.x+radius*sp*Math.sin(theta),target.y+radius*Math.cos(phi),target.z+radius*sp*Math.cos(theta));
  camera.lookAt(target);
}
let fitAuto=true;
const fitRadius=()=>Math.min(36,13*Math.max(1,1.45/(camera.aspect||1.5)));
function resetCamera(){fitAuto=true;target.set(0,0,0);theta=0;phi=.85;radius=fitRadius();updateCamera();}
function resize(){
  const w=stage.clientWidth||300,h=stage.clientHeight||300;
  if(w<2||h<2)return;
  renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();
  if(fitAuto){radius=fitRadius();updateCamera();}
}
new ResizeObserver(resize).observe(stage);
window.addEventListener('resize',resize);
window.addEventListener('orientationchange',()=>{setTimeout(resize,150);setTimeout(resize,500);});

/* ===== Paleta: piezas en el orden de la lista del kit ===== */
let limitOn=true;
const iconRefs=[];
function drawTile(x,d,w,h){
  const col=d.color;
  if(d.kind==='jumper'){
    x.strokeStyle=col;x.fillStyle=col;x.lineWidth=3;x.lineCap='round';
    x.beginPath();x.moveTo(8,h/2);x.bezierCurveTo(14,2,w-14,2,w-8,h/2);x.stroke();
    [8,w-8].forEach(cx=>{x.beginPath();x.arc(cx,h/2,6,0,Math.PI*2);x.fill();x.strokeStyle='#d6dbe0';x.lineWidth=1.5;x.beginPath();x.arc(cx,h/2,3,0,Math.PI*2);x.stroke();x.strokeStyle=col;x.lineWidth=3;});
    return;
  }
  x.fillStyle=col;pill(x,1,2,w-2,h-4,6);x.fill();
  x.fillStyle='rgba(255,255,255,.55)';
  [[7,h/2],[w-7,h/2]].forEach(c=>{x.beginPath();x.arc(c[0],c[1],2.6,0,Math.PI*2);x.fill();});
  const dark=['#cdb9bb','#c9c9cc','#d9a38c','#dcc3c3','#e8cf45'].indexOf(col)>=0;
  x.fillStyle=dark?'#2a2a2a':'#ffffff';x.font='700 12px "Barlow Semi Condensed",sans-serif';x.textAlign='center';x.textBaseline='middle';
  x.fillText(d.code,w/2,h/2+1);
}
function drawIcons(){
  iconRefs.forEach(r=>{const x=r.cv.getContext('2d');x.setTransform(2,0,0,2,0,0);x.clearRect(0,0,44,28);drawTile(x,DEFS[r.id],44,28);});
}
const rail=$('rail'),railBtns={};
{
  const sec=document.createElement('div');sec.className='group';
  const h=document.createElement('h2');h.textContent='Piezas del kit';sec.appendChild(h);
  const list=document.createElement('div');list.className='parts';
  KIT.forEach(id=>{
    const d=DEFS[id],b=document.createElement('button');b.type='button';b.className='part';b.setAttribute('aria-pressed','false');
    b.title=d.name+' · '+d.sub;
    const cv=document.createElement('canvas');cv.width=88;cv.height=56;iconRefs.push({cv:cv,id:id});
    const t=document.createElement('span'),n=document.createElement('b'),s=document.createElement('small'),q=document.createElement('em');
    n.textContent=d.name;s.textContent=d.sub;q.className='qty';t.append(n,s);b.append(cv,t,q);
    b.addEventListener('click',()=>startPlacing(id));
    railBtns[id]={btn:b,q:q};list.appendChild(b);
  });
  sec.appendChild(list);rail.appendChild(sec);
}
function syncRail(){
  for(const id in railBtns){
    const r=railBtns[id],left=remaining(id),dis=limitOn&&left<=0&&!(placing&&placing.id===id);
    r.q.textContent=limitOn?('×'+Math.max(0,left)):'∞';
    r.btn.disabled=dis;r.btn.setAttribute('aria-pressed',String(!!placing&&placing.id===id));
  }
}

/* ===== Interacción ===== */
const ray=new THREE.Raycaster(),ndc=new THREE.Vector2(),gplane=new THREE.Plane(new THREE.Vector3(0,1,0),-BASE_Y);
let lastCell=null,placing=null,ghost=null,ghostOk=false,ghostSpot=null,ghostKey='',drag=null,down=null,nav=null,hoverReq=null,hintTimer=0;
const pointers=new Map();let pinch=null;
function setNdc(e){const r=dom.getBoundingClientRect();ndc.set(((e.clientX-r.left)/r.width)*2-1,-((e.clientY-r.top)/r.height)*2+1);ray.setFromCamera(ndc,camera);}
function groundCell(e){
  setNdc(e);const pt=new THREE.Vector3();if(!ray.ray.intersectPlane(gplane,pt))return null;
  const c=[Math.floor(pt.x+COLS/2),Math.floor(pt.z+ROWS/2)];
  if(c[0]<0||c[0]>=COLS||c[1]<0||c[1]>=ROWS){showCell(null);return c;}
  showCell(c);return c;
}
function showCell(c){$('cellTxt').textContent=c?cellName(c[0],c[1]):'—';}
function pickPart(e){
  setNdc(e);
  const hits=ray.intersectObjects(parts.filter(p=>!p.hidden).map(p=>p.group),true);
  for(const h of hits){
    if(h.object.isSprite||h.object.userData.noPick||(h.object.material&&h.object.material.depthTest===false))continue;
    let o=h.object;while(o&&!o.userData.part)o=o.parent;
    if(o)return{part:o.userData.part,point:h.point};
  }
  return null;
}
function setHint(msg){
  clearTimeout(hintTimer);
  let t,rot=false;
  if(msg){t=msg;hintTimer=setTimeout(()=>setHint(),3200);}
  else if(placing&&DEFS[placing.id].kind==='jumper'){t=placing.first?'Clic en el segundo broche · Esc cancela':'Clic en el primer broche del puente';}
  else if(placing){t='Clic para colocar · R o botón para girar · Esc para terminar';rot=true;}
  else if(drag){t=drag.part.def.kind==='jumper'?'Suelta el extremo sobre un broche libre':'Suelta sobre un lugar libre · R para girar';rot=drag.part.def.kind!=='jumper';}
  else if(selected){t=selected.def.kind==='jumper'?'Arrastra un extremo para moverlo · Supr elimina':'Arrastra para mover · R gira · Supr elimina';rot=selected.def.kind!=='jumper';}
  else t='Arrastra para girar la vista · rueda o pellizco para acercar · clic derecho o dos dedos para desplazar';
  $('hintText').textContent=t;$('bRotHint').hidden=!rot;
}
function disposeGhost(){if(ghost){scene.remove(ghost);ghost=null;}ghostKey='';ghostSpot=null;}
function cellFree(c,ign){
  if(c[0]<0||c[0]>=COLS||c[1]<0||c[1]>=ROWS)return false;
  const k=key(c);let n=1;
  for(const q of parts){
    if(q.id===ign)continue;
    const qg=geo(q.def,q.x,q.y,q.r,q.x2,q.y2);
    const isT=qg.terms.some(t=>key(t)===k),isC=qg.cells.some(t=>key(t)===k);
    if(isC&&!isT)return false;if(isT)n++;
  }
  return n<=3;
}
function startPlacing(id){
  if(placing&&placing.id===id){stopPlacing();return;}
  if(limitOn&&remaining(id)<=0){setHint('Ya usaste todas las piezas de este tipo');return;}
  disposeGhost();select(null);placing={id:id,r:0,first:null};
  if(DEFS[id].kind!=='jumper'){ghost=makeGhost(DEFS[id]);ghost.visible=false;scene.add(ghost);}
  syncRail();setHint();
}
function stopPlacing(){placing=null;disposeGhost();syncRail();setHint();}
function placeGhostAt(d,r,cell,grab){
  lastCell=cell;
  const a=grab||[Math.floor((d.L-1)/2),0],v=rotc(a[0],a[1],r),ox=cell[0]-v[0],oy=cell[1]-v[1];
  ghostOk=canPlace(d,ox,oy,r,drag?drag.part.id:-1);ghostSpot=[ox,oy];
  ghost.position.copy(cellPos(ox,oy));ghost.position.y=BASE_Y+.05;ghost.rotation.y=-r*Math.PI/2;
  ghost.visible=true;tintGhost(ghost,ghostOk);
}
// Fantasma del puente: del extremo fijo A al cursor B
function jumperGhostAt(d,A,B,ign){
  lastCell=B;
  const k=A.join(',')+'|'+B.join(',');
  if(k!==ghostKey){
    if(ghost)scene.remove(ghost);
    const same=A[0]===B[0]&&A[1]===B[1];
    ghost=jumperGeometry(d,A,B,0,true,false).group;ghost.visible=true;scene.add(ghost);ghostKey=k;
    ghostOk=same?cellFree(B,ign):canPlace(d,A[0],A[1],0,ign,B[0],B[1]);
    tintGhost(ghost,ghostOk);
  }
  ghostSpot=B;
}
function localOf(p,pt){
  const c=[Math.floor(pt.x+COLS/2),Math.floor(pt.z+ROWS/2)];
  const v=rotc(c[0]-p.x,c[1]-p.y,(4-p.r)&3);
  return[Math.max(0,Math.min(p.def.L-1,v[0])),Math.max(0,Math.min(p.def.W-1,v[1]))];
}
function beginDrag(){
  const p=down.part;if(p.def.kind==='button'&&p.pressed)p.pressed=false;
  drag={part:p,grab:down.grab,r:p.r};p.hidden=true;p.group.visible=false;dirty=true;dom.style.cursor='grabbing';
  if(p.def.kind==='jumper'){
    drag.end=down.end;drag.fixed=down.end===0?[p.x2,p.y2]:[p.x,p.y];
    jumperGhostAt(p.def,drag.fixed,down.end===0?[p.x,p.y]:[p.x2,p.y2],p.id);
  }else{ghost=makeGhost(p.def);scene.add(ghost);}
  setHint();
}
function endDrag(){
  const p=drag.part;
  if(p.def.kind==='jumper'){
    if(ghostOk&&ghostSpot){if(drag.end===0){p.x=ghostSpot[0];p.y=ghostSpot[1];}else{p.x2=ghostSpot[0];p.y2=ghostSpot[1];}}
  }else if(ghostOk&&ghostSpot){p.x=ghostSpot[0];p.y=ghostSpot[1];p.r=drag.r;}
  p.hidden=false;p.group.visible=true;disposeGhost();drag=null;p.drop=.2;p.landed=false;relayout();setHint();dom.style.cursor='default';
}
function cancelDrag(){if(!drag)return;const p=drag.part;p.hidden=false;p.group.visible=true;disposeGhost();drag=null;dirty=true;}
function rotateSelected(){
  if(!selected||selected.def.kind==='jumper')return;const p=selected,nr=(p.r+1)&3;
  if(canPlace(p.def,p.x,p.y,nr,p.id)){p.r=nr;relayout();}else setHint('No hay espacio para girar la pieza aquí');
}
function rotateAction(){
  if(placing){if(DEFS[placing.id].kind==='jumper')return;placing.r=(placing.r+1)&3;if(lastCell)placeGhostAt(DEFS[placing.id],placing.r,lastCell);}
  else if(drag){if(drag.part.def.kind==='jumper')return;drag.r=(drag.r+1)&3;if(lastCell)placeGhostAt(drag.part.def,drag.r,lastCell,drag.grab);}
  else rotateSelected();
}
function afterAdd(id){
  if(limitOn&&remaining(id)<=0)stopPlacing();else setHint();
}
function clickPlace(e){
  const c=groundCell(e);if(!c)return;
  const d=DEFS[placing.id];
  if(d.kind==='jumper'){
    if(!placing.first){
      if(cellFree(c)){placing.first=c;disposeGhost();setHint();}else setHint('Ese broche está ocupado o fuera de la base');
    }else{
      const A=placing.first;
      if(canPlace(d,A[0],A[1],0,-1,c[0],c[1])){addPart(placing.id,A[0],A[1],0,false,c[0],c[1]);placing.first=null;disposeGhost();afterAdd(d.id);}
      else setHint(A[0]===c[0]&&A[1]===c[1]?'Elige otro broche para el segundo extremo':'Ese puente no llega, o el broche está ocupado');
    }
    return;
  }
  placeGhostAt(d,placing.r,c);
  if(ghostOk){addPart(placing.id,ghostSpot[0],ghostSpot[1],placing.r);tintGhost(ghost,false);ghostOk=false;afterAdd(d.id);}
  else setHint('Ese lugar está ocupado o fuera de la base');
}
function nearestEnd(p,pt){
  const d0=Math.hypot(p.tw[0].x-pt.x,p.tw[0].z-pt.z),d1=Math.hypot(p.tw[1].x-pt.x,p.tw[1].z-pt.z);
  return d0<=d1?0:1;
}
dom.addEventListener('contextmenu',e=>e.preventDefault());
dom.addEventListener('pointerdown',e=>{
  try{dom.setPointerCapture(e.pointerId);}catch(_){}
  pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(pointers.size===2){
    const [a,b]=[...pointers.values()];pinch={d:Math.hypot(a.x-b.x,a.y-b.y),r:radius};nav=null;
    if(down&&!drag){if(down.part.def.kind==='button')down.part.pressed=false;down=null;dirty=true;}
    return;
  }
  if(e.button===2||e.button===1){
    if(placing&&e.button===2){if(placing.first){placing.first=null;disposeGhost();setHint();}else stopPlacing();return;}
    nav={type:'pan',x:e.clientX,y:e.clientY,moved:true};return;
  }
  if(placing){nav={type:'orbit',x:e.clientX,y:e.clientY,sx:e.clientX,sy:e.clientY,moved:false,place:true};return;}
  const hit=pickPart(e);
  if(hit){
    select(hit.part);setHint();
    down={part:hit.part,sx:e.clientX,sy:e.clientY,grab:hit.part.def.kind==='jumper'?null:localOf(hit.part,hit.point),
      end:hit.part.def.kind==='jumper'?nearestEnd(hit.part,hit.point):0,moved:false};
    if(hit.part.def.kind==='button'){hit.part.pressed=true;dirty=true;}
  }else{select(null);setHint();nav={type:'orbit',x:e.clientX,y:e.clientY,sx:e.clientX,sy:e.clientY,moved:false};}
});
dom.addEventListener('pointermove',e=>{
  const pt=pointers.get(e.pointerId);if(pt){pt.x=e.clientX;pt.y=e.clientY;}
  if(pointers.size===2&&pinch){
    const [a,b]=[...pointers.values()];const d=Math.hypot(a.x-b.x,a.y-b.y)||1;
    fitAuto=false;radius=Math.max(4,Math.min(36,pinch.r*pinch.d/d));updateCamera();return;
  }
  if(nav){
    if(nav.type==='orbit'&&!nav.moved&&Math.hypot(e.clientX-nav.sx,e.clientY-nav.sy)>5)nav.moved=true;
    const dx=e.clientX-nav.x,dy=e.clientY-nav.y;
    if(nav.moved){
      fitAuto=false;
      if(nav.type==='orbit'){theta-=dx*.006;phi=Math.max(.15,Math.min(1.5,phi-dy*.006));}
      else{
        const k=radius*.0017,rx=Math.cos(theta),rz=-Math.sin(theta),fx=-Math.sin(theta),fz=-Math.cos(theta);
        target.x=Math.max(-8,Math.min(8,target.x-rx*dx*k+fx*dy*k));target.z=Math.max(-8,Math.min(8,target.z-rz*dx*k+fz*dy*k));
      }
      updateCamera();
    }
    nav.x=e.clientX;nav.y=e.clientY;return;
  }
  if(down){
    if(!down.moved&&Math.hypot(e.clientX-down.sx,e.clientY-down.sy)>6){down.moved=true;beginDrag();}
    if(drag){
      const c=groundCell(e);
      if(c){if(drag.part.def.kind==='jumper')jumperGhostAt(drag.part.def,drag.fixed,c,drag.part.id);else placeGhostAt(drag.part.def,drag.r,c,drag.grab);}
    }
    return;
  }
  if(placing){
    const c=groundCell(e),d=DEFS[placing.id];
    if(c){
      if(d.kind==='jumper')jumperGhostAt(d,placing.first||c,c,-1);
      else placeGhostAt(d,placing.r,c);
    }
  }else{groundCell(e);hoverReq=e;}
});
function release(e,cancelled){
  pointers.delete(e.pointerId);if(pointers.size<2)pinch=null;
  if(nav){
    if(nav.place&&!nav.moved&&!cancelled)clickPlace(e);
    nav=null;
  }
  if(down){
    if(drag){if(cancelled)cancelDrag();else endDrag();}
    else{
      const k=down.part.def.kind;
      if(k==='switch'&&!cancelled){down.part.on=!down.part.on;dirty=true;}
      if(k==='button'){down.part.pressed=false;dirty=true;}
      if(k==='whistle'&&!cancelled){down.part.retrig=true;}
    }
    down=null;
  }
}
dom.addEventListener('pointerup',e=>release(e,false));
dom.addEventListener('pointercancel',e=>release(e,true));
dom.addEventListener('wheel',e=>{e.preventDefault();fitAuto=false;radius=Math.max(4,Math.min(36,radius*Math.exp(e.deltaY*.0012)));updateCamera();},{passive:false});
window.addEventListener('keydown',e=>{
  const tg=e.target&&e.target.tagName;if(tg==='SELECT'||tg==='INPUT')return;
  if(e.key==='r'||e.key==='R'){rotateAction();e.preventDefault();}
  else if((e.key==='Delete'||e.key==='Backspace')&&selected){removePart(selected);setHint();e.preventDefault();}
  else if(e.key==='Escape'){
    if(drag)cancelDrag();
    else if(placing&&placing.first){placing.first=null;disposeGhost();}
    else if(placing)stopPlacing();else select(null);
    setHint();
  }
});
$('bRotHint').addEventListener('click',rotateAction);
$('bRot').addEventListener('click',rotateSelected);
$('bDel').addEventListener('click',()=>{if(selected){removePart(selected);setHint();}});

/* ===== Partículas de corriente ===== */
const MAXP=2800;
const pMesh=new THREE.InstancedMesh(new THREE.SphereGeometry(.075,8,6),
  new THREE.MeshBasicMaterial({color:0xffb21f,transparent:true,opacity:.95,depthTest:false}),MAXP);
pMesh.renderOrder=20;pMesh.frustumCulled=false;pMesh.count=0;scene.add(pMesh);
let showFlow=true,showVolt=false,paused=false,soundOn=false,voltWasOn=false,overTime=0,lastSim=null;
function segsOf(p){
  const k=p.def.kind;
  if(k==='jumper')return p.curve?[{k:'m',curve:p.curve,I:p.I}]:[];
  if(k==='ic')return[{k:'s',A:p.tw[0],B:p.tw[1],I:p.I},{k:'o',A:p.tw[0],B:p.tw[2],I:p.Io}];
  return[{k:'m',A:p.tw[0],B:p.tw[1],I:p.I}];
}
function updateParticles(dt){
  let n=0;
  if(showFlow){
    for(const p of parts){
      if(p.hidden||!p.tw)continue;
      if(!p.fl)p.fl={};
      for(const s of segsOf(p)){
        const I=s.I||0,a=Math.abs(I);if(a<3e-6)continue;
        const len=s.curve?s.curve.getLength():s.A.distanceTo(s.B);if(len<.06)continue;
        const speed=Math.min(5.5,.35+1.25*Math.log10(1+a*1e4));
        p.fl[s.k]=((p.fl[s.k]||0)+(I>0?1:-1)*speed*dt/len)%1000;
        const cnt=Math.max(2,Math.round(len*2.2)),sc=.75+.6*Math.min(1,a/.25);
        for(let k=0;k<cnt&&n<MAXP;k++){
          let u=(p.fl[s.k]+k/cnt)%1;if(u<0)u+=1;
          if(s.curve)dummy.position.copy(s.curve.getPoint(u));else dummy.position.lerpVectors(s.A,s.B,u);
          dummy.rotation.set(0,0,0);dummy.scale.setScalar(sc);dummy.updateMatrix();pMesh.setMatrixAt(n++,dummy.matrix);
        }
      }
    }
  }
  pMesh.count=n;pMesh.instanceMatrix.needsUpdate=true;
}
function updateVoltOverlay(volt){
  if(!showVolt){
    if(voltWasOn){for(let i=0;i<COLS*ROWS;i++)setStud(i,1,STUD0);studs.instanceMatrix.needsUpdate=true;studs.instanceColor.needsUpdate=true;voltWasOn=false;}
    return;
  }
  for(let i=0;i<COLS*ROWS;i++){
    if(volt&&volt.has(i)){tmpC.copy(VLO).lerp(VHI,Math.max(0,Math.min(1,volt.get(i)/3)));setStud(i,1.4,tmpC);}
    else setStud(i,1,STUD0);
  }
  studs.instanceMatrix.needsUpdate=true;studs.instanceColor.needsUpdate=true;voltWasOn=true;
}

/* ===== Inspector ===== */
function si(v,u){
  const a=Math.abs(v);let s,pre='';
  if(a>=1)s=v;else if(a>=1e-3){s=v*1e3;pre='m';}else if(a>=1e-6){s=v*1e6;pre='µ';}else return'0 '+u;
  const t=Math.abs(s)>=100?s.toFixed(0):Math.abs(s)>=10?s.toFixed(1):s.toFixed(2);
  return t.replace('.',',')+' '+pre+u;
}
function stateText(p){
  switch(p.def.kind){
    case 'lamp':return p.lit>.05?'Encendida '+Math.round(p.lit*100)+' %':'Apagada';
    case 'led':if(p.lit>.05)return p.I>.04?'Sobrecorriente':'Encendido '+Math.round(p.lit*100)+' %';
      if(p.V<-.4)return'Polaridad invertida';return p.V>.9?'Poca corriente':'Apagado';
    case 'switch':return p.on?'Cerrado':'Abierto';
    case 'button':return p.pressed?'Pulsado':'Suelto';
    case 'motor':return Math.abs(p.w)>1?'Girando':'Detenido';
    case 'speaker':case 'whistle':return p.snd?'Sonando':'Silencio';
    case 'ic':return p.vs>1.8?'Funcionando':'Sin alimentación';
    case 'photo':return 'Luz '+Math.round(p.light*100)+' % · '+si(photoR(p.light),'Ω');
    case 'battery':return Math.abs(p.I)>.001?'Entregando':'Sin carga';
    case 'resistor':return p.def.sub;
    default:return'Conductor';
  }
}
let inspAcc=0;
function updateInspector(dt){
  inspAcc+=dt;if(inspAcc<.1)return;inspAcc=0;
  const p=hovered||selected,box=$('insp');
  if(!p){box.hidden=true;stage.classList.remove('has-insp');return;}
  box.hidden=false;stage.classList.add('has-insp');
  $('iName').textContent=(p.def.code&&p.def.code!=='—'&&p.def.kind!=='wire'?p.def.code+' · ':'')+p.def.name;
  $('iSub').textContent=p.def.kind==='wire'||p.def.kind==='jumper'?'':p.def.sub;
  $('iV').textContent=si(Math.abs(p.V),'V');$('iI').textContent=si(Math.abs(p.I),'A');
  $('iP').textContent=si(Math.abs(p.P),'W');$('iS').textContent=stateText(p);
  $('iBtns').hidden=(p!==selected);
  const lr=$('lightRow');lr.hidden=!(p===selected&&p.def.kind==='photo');
  if(!lr.hidden&&document.activeElement!==$('light'))$('light').value=String(Math.round(p.light*100));
  $('bRot').hidden=(p.def.kind==='jumper');
}
$('light').addEventListener('input',e=>{if(selected&&selected.def.kind==='photo'){selected.light=(+e.target.value)/100;dirty=true;}});

/* ===== Sonido: la bocina o el chip silbador suenan según el circuito que los excita ===== */
let actx=null,osc=null,gn=null;
function ensureAudio(){
  if(actx){if(actx.state==='suspended')actx.resume();return;}
  try{
    actx=new(window.AudioContext||window.webkitAudioContext)();osc=actx.createOscillator();osc.type='square';osc.frequency.value=440;
    gn=actx.createGain();gn.gain.value=0;osc.connect(gn);gn.connect(actx.destination);osc.start();
  }catch(_){actx=null;}
}
const NOTES=[262,262,392,392,440,440,392,0,349,349,330,330,294,294,262,0];
function tone(src,t){
  switch(src){
    case 'music':return{f:NOTES[Math.floor(t*4)%NOTES.length]||1,w:'triangle'};
    case 'alarm':return{f:650+550*(.5+.5*Math.sin(t*7.5)),w:'square'};
    case 'space':return{f:Math.max(120,2200-(t%.7)*3200),w:'sawtooth'};
    default:return{f:1100+1900*((t%1.6)/1.6),w:'sine'};
  }
}
function updateSound(now,tt){
  // nodos unidos por conductores
  const uf=new Map();const find=(x)=>{while(uf.has(x)&&uf.get(x)!==x)x=uf.get(x);return x;};
  for(const p of parts){
    if(p.hidden)continue;const k=p.def.kind;
    const cond=k==='wire'||k==='jumper'||(k==='switch'&&p.on)||(k==='button'&&p.pressed);
    if(cond){if(!uf.has(p.a))uf.set(p.a,p.a);if(!uf.has(p.b))uf.set(p.b,p.b);uf.set(find(p.a),find(p.b));}
  }
  const cls=(x)=>uf.has(x)?find(x):x;
  let src=null;
  for(const p of parts){
    if(p.def.kind!=='speaker'&&p.def.kind!=='whistle')continue;
    if(!p.hidden&&Math.abs(p.I)>.003)p.actT=now;
    let s=null;
    if(!p.hidden&&p.actT&&now-p.actT<250&&!paused){
      for(const ic of parts){
        if(ic.def.kind!=='ic'||ic.hidden||ic.vs<=1.8)continue;
        const co=cls(ic.c);if(co===cls(p.a)||co===cls(p.b)){s=ic.def.snd;break;}
      }
      if(!s&&p.def.kind==='whistle')s='whistle';
    }
    p.snd=!!s;if(s&&!src)src=s;
  }
  if(actx&&gn){
    const on=soundOn&&!!src;
    if(src){const t=tone(src,tt);osc.type=t.w;osc.frequency.setTargetAtTime(t.f,actx.currentTime,.01);}
    gn.gain.setTargetAtTime(on?.03:0,actx.currentTime,.03);
  }
}

/* ===== Barra de herramientas ===== */
$('examples').addEventListener('change',e=>{if(e.target.value!==''){stopPlacing();loadExample(+e.target.value);setHint();}e.target.value='';});
$('bPause').addEventListener('click',()=>{paused=!paused;$('bPause').textContent=paused?'Reanudar':'Pausar';dirty=true;});
$('bFlow').addEventListener('click',()=>{showFlow=!showFlow;$('bFlow').setAttribute('aria-pressed',String(showFlow));});
$('bVolt').addEventListener('click',()=>{showVolt=!showVolt;$('bVolt').setAttribute('aria-pressed',String(showVolt));$('chipLegend').hidden=!showVolt;});
$('bSound').addEventListener('click',()=>{soundOn=!soundOn;$('bSound').setAttribute('aria-pressed',String(soundOn));if(soundOn)ensureAudio();});
$('bLimit').addEventListener('click',()=>{limitOn=!limitOn;$('bLimit').setAttribute('aria-pressed',String(limitOn));syncRail();});
$('bView').addEventListener('click',resetCamera);
$('bClear').addEventListener('click',()=>{stopPlacing();clearAll();setHint();});

/* ===== Bucle principal ===== */
let last=performance.now(),tAcc=0,warnShown='';
function frame(now){
  const dt=Math.min(.05,(now-last)/1000);last=now;
  if(!paused)tAcc+=dt;
  for(const p of parts)if(p.def.kind==='ic'){
    const d=(!paused&&p.vs>1.8&&(Math.floor(tAcc*6)%2===0))?1:0;
    if(d!==p.drive){p.drive=d;dirty=true;}
  }
  if(!paused||dirty){
    lastSim=simulate(parts,paused?1e-3:Math.max(dt,1/240),!paused);dirty=false;
    if(!paused){if(lastSim.maxBat>1.5)overTime+=dt;else overTime=Math.max(0,overTime-dt*2);}
  }
  const adt=paused?0:dt;
  updateSound(now,tAcc);
  for(const p of parts){
    if(p.anim&&!p.hidden)p.anim(p,adt,tAcc);
    if(p.drop>0){
      p.drop=Math.max(0,p.drop-dt*(.7+p.drop*9));
      p.group.position.y=(p.def.kind==='jumper'?0:p.baseY)+p.drop;
      if(p.drop===0&&!p.landed){p.landed=true;spawnRipples(p);}
    }
  }
  for(let i=ripples.length-1;i>=0;i--){
    const r=ripples[i];r.t+=dt;const k=r.t/.55;
    if(k>=1){scene.remove(r.m);ripples.splice(i,1);continue;}
    r.m.scale.setScalar(1+k*1.5);r.m.material.opacity=.9*(1-k);
  }
  updateParticles(adt);
  updateVoltOverlay(lastSim&&lastSim.volt);
  if(hoverReq&&!nav&&!down&&!placing){const h=pickPart(hoverReq);hovered=h?h.part:null;hoverReq=null;
    dom.style.cursor=h?(h.part.def.kind==='switch'||h.part.def.kind==='button'||h.part.def.kind==='whistle'?'pointer':'grab'):'default';}
  if(placing)dom.style.cursor='crosshair';
  updateInspector(dt);
  const chip=$('chipSim');chip.classList.toggle('paused',paused);chip.lastChild.textContent=paused?'Pausado':'Simulando';
  let w='';
  if(overTime>.4)w='Cortocircuito: la batería entrega '+si(lastSim.maxBat,'A');
  else if(parts.some(p=>p.def.kind==='led'&&!p.hidden&&p.I>.04))w='LED con demasiada corriente: añade una resistencia';
  else if(!parts.some(p=>p.def.kind==='battery'&&!p.hidden)&&parts.length)w='Falta el porta pilas';
  if(w!==warnShown){warnShown=w;$('chipWarn').hidden=!w;$('warnText').textContent=w;}
  renderer.render(scene,camera);
  requestAnimationFrame(frame);
}

/* ===== Arranque ===== */
readTheme();
matchMedia('(prefers-color-scheme: dark)').addEventListener('change',readTheme);
new MutationObserver(readTheme).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
resize();resetCamera();loadExample(0);syncRail();setHint();
requestAnimationFrame(frame);

