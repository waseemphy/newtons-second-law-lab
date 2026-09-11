'use strict';

const $ = id => document.getElementById(id);
const G = 9.81;
const COLORS = { cyan:'#62d9f5', gold:'#f9c369', purple:'#be9afa', red:'#ff7d87', text:'#a9bad0', axis:'#71849d', grid:'#293d54' };
let running = false;
let elapsed = 0;
let velocity = 0;
let position = 0;
let last = performance.now();
let systemMode = 'pulley';

function inputs(){
  return {theta:+$('angle').value, m1:+$('mass1').value, m2:+$('mass2').value, mu:+$('friction').value, mode:systemMode};
}

function solve(){
  const p = inputs();
  const rad = p.theta*Math.PI/180;
  const normal = p.m1*G*Math.cos(rad);
  const downSlope = p.m1*G*Math.sin(rad);
  const hanging = p.mode==='pulley'?p.m2*G:0;
  const imbalance = p.mode==='pulley'?hanging-downSlope:-downSlope;
  const frictionLimit = p.mu*normal;
  let a=0, direction=0, friction=Math.abs(imbalance);
  if(Math.abs(imbalance)>frictionLimit+1e-9){
    direction=Math.sign(imbalance);
    friction=frictionLimit;
    a=(imbalance-direction*friction)/(p.mode==='pulley'?p.m1+p.m2:p.m1);
  }
  const tension=p.mode==='pulley'?(direction===0?hanging:p.m2*(G-a)):0;
  const net=(p.mode==='pulley'?p.m1+p.m2:p.m1)*a;
  return {...p,rad,normal,downSlope,hanging,imbalance,frictionLimit,friction,a,direction,tension,net};
}

function canvas(id){
  const el=$(id),box=el.getBoundingClientRect(),d=window.devicePixelRatio||1;
  const W=Math.max(1,box.width),H=Math.max(1,box.height);
  if(el.width!==Math.round(W*d)||el.height!==Math.round(H*d)){el.width=Math.round(W*d);el.height=Math.round(H*d)}
  const c=el.getContext('2d');c.setTransform(d,0,0,d,0,0);c.clearRect(0,0,W,H);c.font='13px Arial';c.lineWidth=1;
  return {c,W,H};
}
function line(c,x1,y1,x2,y2,color,width=1,dash=[]){c.strokeStyle=color;c.lineWidth=width;c.setLineDash(dash);c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.stroke();c.setLineDash([])}
function text(c,s,x,y,color=COLORS.text,align='left'){c.fillStyle=color;c.textAlign=align;c.fillText(s,x,y)}
function arrow(c,x,y,dx,dy,color,label,offset=13){
  const len=Math.hypot(dx,dy);if(len<3)return;line(c,x,y,x+dx,y+dy,color,3);
  const ux=dx/len,uy=dy/len,px=-uy,py=ux;
  line(c,x+dx,y+dy,x+dx-ux*9+px*5,y+dy-uy*9+py*5,color,2);
  line(c,x+dx,y+dy,x+dx-ux*9-px*5,y+dy-uy*9-py*5,color,2);
  text(c,label,x+dx*.55+px*offset,y+dy*.55+py*offset,color,'center');
}
function roundedRect(c,x,y,w,h,r,fill,stroke){c.beginPath();c.roundRect(x,y,w,h,r);c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=2;c.stroke()}}

function drawSystem(s){
  const {c,W,H}=canvas('systemCanvas');
  const baseY=H-42,left=42,availableHeight=H-115;
  const rampW=Math.max(145,Math.min(W*.58,455,availableHeight/Math.tan(s.rad)));
  const height=rampW*Math.tan(s.rad),topX=left+rampW,topY=baseY-height;
  c.fillStyle='#172a3d';c.beginPath();c.moveTo(left,baseY);c.lineTo(topX,topY);c.lineTo(topX,baseY);c.closePath();c.fill();
  line(c,left,baseY,topX,topY,'#8296b3',4);line(c,left,baseY,topX,baseY,'#526780',2);
  const pulleyR=22,pulleyX=Math.min(W-78,topX+25),pulleyY=Math.max(52,topY-9);
  if(s.mode==='pulley'){
    c.strokeStyle=COLORS.gold;c.lineWidth=4;c.beginPath();c.arc(pulleyX,pulleyY,pulleyR,0,2*Math.PI);c.stroke();
    c.fillStyle='#465c75';c.beginPath();c.arc(pulleyX,pulleyY,5,0,2*Math.PI);c.fill();
  }
  const maxTravel=Math.min(62,rampW*.22),travel=Math.max(-maxTravel,Math.min(maxTravel,position*35));
  const ux=Math.cos(s.rad),uy=-Math.sin(s.rad),nx=-Math.sin(s.rad),ny=-Math.cos(s.rad);
  const surfaceX=left+rampW*.48+travel*ux,surfaceY=baseY-rampW*.48*Math.sin(s.rad)+travel*uy;
  const m1x=surfaceX+nx*27,m1y=surfaceY+ny*27;
  const m2x=pulleyX+pulleyR,m2y=Math.min(H-62,pulleyY+95+travel);
  if(s.mode==='pulley'){
    line(c,m1x+30*ux,m1y+30*uy,pulleyX-pulleyR*.55,pulleyY-pulleyR*.75,'#cbd6e5',2);
    c.strokeStyle='#cbd6e5';c.lineWidth=2;c.beginPath();c.arc(pulleyX,pulleyY,pulleyR,-2.2,0);c.stroke();
    line(c,pulleyX+pulleyR,pulleyY,m2x,m2y-25,'#cbd6e5',2);
  }
  c.save();c.translate(m1x,m1y);c.rotate(-s.rad);roundedRect(c,-29,-24,58,48,8,COLORS.cyan,'#d9f6fc');text(c,'m₁',0,5,'#071824','center');c.restore();
  if(s.mode==='pulley'){roundedRect(c,m2x-27,m2y-25,54,50,8,COLORS.gold,'#fff0c8');text(c,'m₂',m2x,m2y+5,'#1a1407','center')}
  text(c,s.theta.toFixed(0)+'°',left+64,baseY-12,COLORS.cyan,'center');
  if(s.direction!==0){
    const label=s.mode==='single'?'m₁ accelerates down the incline':s.direction>0?'m₂ down, m₁ up':'m₁ down slope, m₂ up';
    text(c,label,W-18,24,COLORS.gold,'right');
  }else text(c,'static equilibrium',W-18,24,COLORS.text,'right');
  if($('vectors').checked){
    if(s.mode==='pulley')arrow(c,m1x,m1y,58*ux,58*uy,COLORS.gold,'T');
    arrow(c,m1x,m1y,0,70,COLORS.red,'m₁g');
    arrow(c,m1x,m1y,55*nx,55*ny,COLORS.purple,'N');
    const fSign=s.direction!==0?-s.direction:-Math.sign(s.imbalance);
    arrow(c,m1x,m1y,fSign*50*ux,fSign*50*uy,'#8de19b','f');
    if(s.mode==='pulley'){
      arrow(c,m2x,m2y,0,-55,COLORS.gold,'T',17);
      arrow(c,m2x,m2y,0,68,COLORS.red,'m₂g',17);
    }
  }
}

function drawFbd1(s){
  const {c,W,H}=canvas('fbd1'),x=W/2,y=H/2+10,scale=2.2;
  roundedRect(c,x-25,y-20,50,40,7,COLORS.cyan,'#d9f6fc');text(c,'m₁',x,y+5,'#071824','center');
  const ux=Math.cos(s.rad),uy=-Math.sin(s.rad),nx=-Math.sin(s.rad),ny=-Math.cos(s.rad);
  if(s.mode==='pulley')arrow(c,x,y,Math.min(95,s.tension*scale)*ux,Math.min(95,s.tension*scale)*uy,COLORS.gold,'T');
  arrow(c,x,y,0,Math.min(105,s.m1*G*scale),COLORS.red,'m₁g');
  arrow(c,x,y,Math.min(90,s.normal*scale)*nx,Math.min(90,s.normal*scale)*ny,COLORS.purple,'N');
  const fSign=s.direction!==0?-s.direction:-Math.sign(s.imbalance);
  arrow(c,x,y,fSign*Math.min(75,s.friction*scale)*ux,fSign*Math.min(75,s.friction*scale)*uy,'#8de19b','f');
  line(c,35,H-36,W-35,H-36,'#526780');text(c,'Forces are shown from the centre of mass',W/2,H-12,COLORS.text,'center');
}
function drawFbd2(s){
  const {c,W,H}=canvas('fbd2'),x=W/2,y=H/2;
  roundedRect(c,x-25,y-22,50,44,7,COLORS.gold,'#fff0c8');text(c,'m₂',x,y+5,'#1a1407','center');
  arrow(c,x,y,0,-Math.min(100,s.tension*2.2),COLORS.gold,'T',18);
  arrow(c,x,y,0,Math.min(110,s.hanging*2.2),COLORS.red,'m₂g',18);
  text(c,s.direction>0?'resultant downward':s.direction<0?'resultant upward':'forces balanced',W/2,H-22,s.direction===0?COLORS.text:COLORS.cyan,'center');
}

function directionText(s){
  if(s.mode==='single')return s.direction<0?'m₁ down the incline':'no motion';
  if(s.direction>0)return 'm₂ downward and m₁ up the incline';
  if(s.direction<0)return 'm₁ down the incline and m₂ upward';
  return 'no motion';
}
function render(){
  const s=solve();
  const pulley=s.mode==='pulley',moving=s.direction!==0;
  $('mass2Control').classList.toggle('hidden',!pulley);$('tensionResult').classList.toggle('hidden',!pulley);$('hangingForceGroup').classList.toggle('hidden',!pulley);$('fbd2Card').classList.toggle('hidden',!pulley);$('fbdGrid').classList.toggle('single',!pulley);document.querySelector('.result-grid').classList.toggle('single',!pulley);
  document.querySelectorAll('[data-mode]').forEach(button=>button.classList.toggle('active',button.dataset.mode===s.mode));
  $('angleOut').textContent=s.theta.toFixed(0)+'°';$('mass1Out').textContent=s.m1.toFixed(1)+' kg';$('mass2Out').textContent=s.m2.toFixed(1)+' kg';$('frictionOut').textContent=s.mu.toFixed(2);
  $('clock').textContent='t = '+elapsed.toFixed(2)+' s';$('accRead').textContent=Math.abs(s.a).toFixed(2)+' m s⁻²';$('tensionRead').textContent=pulley?s.tension.toFixed(2)+' N':'—';$('normalRead').textContent=s.normal.toFixed(2)+' N';$('frictionRead').textContent=s.friction.toFixed(2)+' N';
  $('stateBadge').textContent=moving?(pulley?(s.direction>0?'Hanging mass moves down':'Incline mass moves down'):'Block moves down the incline'):'System remains at rest';$('stateBadge').className='state-badge '+(moving?'moving':'');
  if(pulley)$('explain').textContent=moving?'The forces are unbalanced, so the connected masses accelerate together. Their accelerations have the same magnitude because the string is taut and inextensible.':'Static friction balances the difference between the hanging weight and the component of m₁’s weight down the slope, so the acceleration is zero.';
  else $('explain').textContent=moving?'The component m₁g sinθ is greater than friction. The resultant force is down the incline, so the block accelerates down the surface.':'Friction balances m₁g sinθ, so the block remains at rest on the incline.';
  $('eq1Label').textContent='For m₁:';$('eq2Label').textContent=pulley?'For m₂:':'Pulley and m₂:';
  if(!pulley){
    $('positiveDirection').textContent='down the incline';$('eq1').textContent=moving?'m₁g sinθ − f = m₁a':'m₁g sinθ − f = 0';$('eq2').textContent='Not present in this mode';$('eqTotal').textContent=moving?'m₁g sinθ − μm₁g cosθ = m₁a':'Resultant force = 0, so a = 0';$('equationNote').textContent='The normal force is N = m₁g cosθ. Friction acts up the incline because the block tends to slide down.';
  }else{
    $('positiveDirection').textContent=s.direction<0?'m₁ down the incline, m₂ upward':'m₂ downward, m₁ up the incline';
    if(s.direction<0){$('eq1').textContent='m₁g sinθ − T − f = m₁a';$('eq2').textContent='T − m₂g = m₂a';$('eqTotal').textContent='m₁g sinθ − m₂g − f = (m₁+m₂)a';}
    else if(s.direction>0){$('eq1').textContent='T − m₁g sinθ − f = m₁a';$('eq2').textContent='m₂g − T = m₂a';$('eqTotal').textContent='m₂g − m₁g sinθ − f = (m₁+m₂)a';}
    else{$('eq1').textContent=s.imbalance>=0?'T − m₁g sinθ − f = 0':'T + f − m₁g sinθ = 0';$('eq2').textContent='m₂g − T = 0';$('eqTotal').textContent='Resultant force = 0, so a = 0';}
    $('equationNote').textContent='Friction opposes the actual motion or tendency to move. Internal tension cancels when both masses are treated as one system.';
  }
  $('hangingWeight').textContent=s.hanging.toFixed(2)+' N';$('slopeWeight').textContent=s.downSlope.toFixed(2)+' N';$('frictionForce').textContent=s.friction.toFixed(2)+' N';$('netForce').textContent=Math.abs(s.net).toFixed(2)+' N → '+directionText(s);
  const maxF=Math.max(s.hanging,s.downSlope,s.friction,1);$('hangingBar').style.width=s.hanging/maxF*100+'%';$('slopeBar').style.width=s.downSlope/maxF*100+'%';$('frictionBar').style.width=s.friction/maxF*100+'%';
  drawSystem(s);drawFbd1(s);if(pulley)drawFbd2(s);
}

function pause(){running=false;$('play').textContent='Release'}
function reset(){pause();elapsed=0;velocity=0;position=0;render()}
$('play').onclick=()=>{const s=solve();if(s.direction===0){reset();return}running=!running;$('play').textContent=running?'Pause':'Release';last=performance.now()};
$('reset').onclick=reset;['angle','mass1','mass2','friction'].forEach(id=>$(id).oninput=reset);$('vectors').oninput=render;
document.querySelectorAll('[data-mode]').forEach(button=>button.onclick=()=>{systemMode=button.dataset.mode;reset()});
function frame(now){
  if(running){const dt=Math.min((now-last)/1000,.05),s=solve();velocity+=s.a*dt;position+=velocity*dt;elapsed+=dt;if(Math.abs(position)>1.85)pause();render()}last=now;requestAnimationFrame(frame);
}
window.addEventListener('resize',render);render();requestAnimationFrame(frame);

if(document.modelContext?.registerTool){try{Promise.resolve(document.modelContext.registerTool({name:'configure_incline_system',title:'Configure incline system',description:'Choose an incline-only or pulley system, set the masses, angle and friction, then update the Newton second law simulation.',inputSchema:{type:'object',properties:{mode:{type:'string',enum:['single','pulley']},angleDegrees:{type:'number',minimum:10,maximum:60},inclineMassKg:{type:'number',minimum:1,maximum:10},hangingMassKg:{type:'number',minimum:1,maximum:10},frictionCoefficient:{type:'number',minimum:0,maximum:.6}},required:['mode','angleDegrees','inclineMassKg','hangingMassKg','frictionCoefficient'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute(input){if(!input||Object.keys(input).some(k=>!['mode','angleDegrees','inclineMassKg','hangingMassKg','frictionCoefficient'].includes(k)))throw Error('Invalid parameters');if(!['single','pulley'].includes(input.mode))throw Error('Invalid mode');for(const [key,min,max] of [['angleDegrees',10,60],['inclineMassKg',1,10],['hangingMassKg',1,10],['frictionCoefficient',0,.6]])if(typeof input[key]!=='number'||!Number.isFinite(input[key])||input[key]<min||input[key]>max)throw Error(key+' is out of range');systemMode=input.mode;$('angle').value=input.angleDegrees;$('mass1').value=input.inclineMassKg;$('mass2').value=input.hangingMassKg;$('friction').value=input.frictionCoefficient;reset();const s=solve();return {mode:s.mode,accelerationMagnitude:Math.abs(s.a),direction:directionText(s),tension:s.tension,normalForce:s.normal,frictionForce:s.friction}}})).catch(()=>{});}catch{}}
