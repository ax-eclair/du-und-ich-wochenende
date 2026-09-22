// Update this wording when the date is decided.
const invitation = { date: 'Dieses Wochenende.' };
const yes = document.querySelector('#yes');
const no = document.querySelector('#no');
const note = document.querySelector('#note');
const particles = document.querySelector('#particles');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const touchOnly = window.matchMedia('(hover: none) and (pointer: coarse)');
document.querySelector('#description').firstChild.textContent = invitation.date;
let accepted = false;
let escapes = 0;
let heartInterval;
let mobileEscapeTimer;
let glideFrame = 0;
let position = null;
let destination = null;
let previousTime = 0;
const glideSpeed = 350; // Pixels per second: fast, but still visibly gliding.
let lastRetarget = -Infinity;
let lastDirection = null;
const teasing = ['Das Nein hat eigene Pläne.', 'Mal links. Mal rechts. Vielleicht doch Ja?', 'Vielleicht ist es schon auf dem Weg zur Bar.'];

function heart(x, y, burst = false) {
  if (reducedMotion.matches || particles.childElementCount > 85) return;
  const el = document.createElement('span');
  el.className = 'particle';
  el.textContent = burst && Math.random() > .65 ? '♪' : '♡';
  const angle = Math.random() * Math.PI * 2;
  const distance = 60 + Math.random() * (burst ? 350 : 90);
  const duration = 1700 + Math.random() * 1500;
  Object.assign(el.style, {left:`${x}px`,top:`${y}px`,color:['#efca86','#c2b3ea','#eee1c7'][Math.floor(Math.random()*3)],fontSize:`${13+Math.random()*(burst?22:10)}px`});
  el.style.setProperty('--dx',`${burst?Math.cos(angle)*distance:(Math.random()-.5)*115}px`);
  el.style.setProperty('--dy',`${burst?Math.sin(angle)*distance-100:-distance}px`);
  el.style.setProperty('--rotation',`${(Math.random()-.5)*65}deg`);
  el.style.setProperty('--duration',`${duration}ms`);
  particles.append(el);
  setTimeout(()=>el.remove(),duration+100);
}
function sprinkle(){const r=yes.getBoundingClientRect();for(let i=0;i<2;i++)heart(r.left+Math.random()*r.width,r.top+10);}
function stopHearts(){clearInterval(heartInterval);heartInterval=undefined;}
function startHearts(){if(accepted||heartInterval)return;sprinkle();heartInterval=setInterval(sprinkle,300);}
yes.addEventListener('pointerenter',startHearts);
yes.addEventListener('pointerleave',stopHearts);
yes.addEventListener('focus',startHearts);
yes.addEventListener('blur',stopHearts);
document.addEventListener('visibilitychange',()=>{if(document.hidden)stopHearts();});

function drawPosition(){no.style.left=`${position.x}px`;no.style.top=`${position.y}px`;}
function glide(time){
  if(accepted||!destination){glideFrame=0;return;}
  const dt=previousTime?Math.min((time-previousTime)/1000,.05):0;
  previousTime=time;
  const dx=destination.x-position.x,dy=destination.y-position.y;
  const distance=Math.hypot(dx,dy);
  if(distance<.4){destination=null;glideFrame=0;previousTime=0;return;}
  const step=Math.min(distance,glideSpeed*dt,Math.max(24,distance*14)*dt);
  position.x+=dx/distance*step;position.y+=dy/distance*step;
  drawPosition();
  glideFrame=requestAnimationFrame(glide);
}
function runAway(event){
  if(event?.cancelable)event.preventDefault();
  if(accepted)return;
  const now=performance.now();
  if(now-lastRetarget<240)return;
  note.textContent=teasing[Math.min(escapes++,teasing.length-1)];
  if(reducedMotion.matches)return;
  const r=no.getBoundingClientRect(),yr=yes.getBoundingClientRect();
  // Switch to fixed positioning at exactly the current on-screen coordinates.
  // Subsequent positions are all animated, including the very first escape.
  if(!position){position={x:r.left,y:r.top};drawPosition();no.classList.add('escaped');}
  const pointerX=event?.clientX??r.left+r.width/2;
  const pointerY=event?.clientY??r.top+r.height/2;
  const padding=18,maxX=Math.max(padding,innerWidth-r.width-padding),maxY=Math.max(padding,innerHeight-r.height-padding);
  const base=Math.atan2(r.top+r.height/2-pointerY,r.left+r.width/2-pointerX);
  const candidates=[];
  const escapeLength=130+Math.random()*90;
  for(let i=0;i<16;i++){
    const angle=base+i*Math.PI/8;
    const x=Math.max(padding,Math.min(maxX,position.x+Math.cos(angle)*escapeLength));
    const y=Math.max(padding,Math.min(maxY,position.y+Math.sin(angle)*escapeLength));
    const travel=Math.hypot(x-position.x,y-position.y);
    if(travel<65)continue;
    // Keep the entire travel path clear of the Ja button.
    let blocked=false;
    for(let step=1;step<=12;step++){
      const sx=position.x+(x-position.x)*step/12,sy=position.y+(y-position.y)*step/12;
      if(sx<yr.right+12&&sx+r.width>yr.left-12&&sy<yr.bottom+12&&sy+r.height>yr.top-12){blocked=true;break;}
    }
    if(blocked)continue;
    const distance=Math.hypot(x+r.width/2-pointerX,y+r.height/2-pointerY);
    const ux=(x-position.x)/travel,uy=(y-position.y)/travel;
    const currentDistance=Math.hypot(r.left+r.width/2-pointerX,r.top+r.height/2-pointerY);
    if(distance<currentDistance+25)continue;
    // Mix safe escape directions, favoring a turn over repeating the same line.
    const turn=lastDirection?1-(ux*lastDirection.x+uy*lastDirection.y):0;
    const score=distance*.3+Math.random()*100+turn*65;
    candidates.push({x,y,ux,uy,score});
  }
  const best=candidates.sort((a,b)=>b.score-a.score)[0];
  if(best){
    destination={x:best.x,y:best.y};
    lastDirection={x:best.ux,y:best.uy};
    lastRetarget=now;
    // Retarget the running animation from its current position, without jumping.
    if(!glideFrame){previousTime=0;glideFrame=requestAnimationFrame(glide);}
  }
}
no.addEventListener('pointerenter',runAway);
no.addEventListener('pointerdown',runAway);
no.addEventListener('click',runAway);
no.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' ')runAway(event);});
// Phones have no hover: let Nein wander on its own while the invitation is visible.
function canAutoEscape(){return touchOnly.matches&&!reducedMotion.matches&&!document.hidden&&!accepted;}
function autoEscape(){
  if(!canAutoEscape())return;
  const r=no.getBoundingClientRect();
  if(!destination&&r.top>=18&&r.bottom<=innerHeight-18)runAway();
  mobileEscapeTimer=setTimeout(autoEscape,1400);
}
function syncAutoEscape(){
  clearTimeout(mobileEscapeTimer);
  if(document.hidden||reducedMotion.matches){
    cancelAnimationFrame(glideFrame);glideFrame=0;destination=null;previousTime=0;
  }
  if(canAutoEscape())mobileEscapeTimer=setTimeout(autoEscape,900);
}
touchOnly.addEventListener('change',syncAutoEscape);
reducedMotion.addEventListener('change',syncAutoEscape);
document.addEventListener('visibilitychange',syncAutoEscape);
syncAutoEscape();
// React to the approaching pointer, including while already moving.
window.addEventListener('pointermove',event=>{
  if(event.pointerType!=='mouse'||accepted)return;
  const r=no.getBoundingClientRect();
  const dx=Math.max(r.left-event.clientX,0,event.clientX-r.right);
  const dy=Math.max(r.top-event.clientY,0,event.clientY-r.bottom);
  if(Math.hypot(dx,dy)<180)runAway(event);
});
window.addEventListener('resize',()=>{
  cancelAnimationFrame(glideFrame);glideFrame=0;destination=null;position=null;previousTime=0;
  lastRetarget=-Infinity;lastDirection=null;
  no.classList.remove('escaped');no.style.removeProperty('left');no.style.removeProperty('top');
  syncAutoEscape();
});

yes.addEventListener('click',()=>{
  if(accepted)return;
  accepted=true;stopHearts();cancelAnimationFrame(glideFrame);
  clearTimeout(mobileEscapeTimer);
  no.hidden=true;document.querySelector('.no-slot').hidden=true;
  document.body.classList.add('accepted','options-visible');
  document.querySelector('.question').hidden=true;
  document.querySelector('#date-options').hidden=false;
  document.querySelector('#options-title').focus({preventScroll:true});
  document.querySelector('#invitation').scrollIntoView({behavior:'instant',block:'start'});
  for(let i=0;i<42;i++)heart(innerWidth/2,innerHeight/2,true);
  setTimeout(()=>{for(let i=0;i<25;i++)heart(innerWidth/2,innerHeight*.6,true);},650);
});

// Configure the recipient in international format, digits only.
const whatsapp = { phone: '33781079979' };
function activityMessage(activity) {
  const intros = {
    squash: 'Hey! Ich hätte Lust auf Squash mit dir.',
    spree: 'Hey! Ich hätte Lust auf eine Radtour mit dir an der Spree.',
    climbing: 'Hey! Ich hätte Lust, mit dir bouldern zu gehen.'
  };
  return `${intros[activity]} Am liebsten am:\n\nSamstag / Sonntag`;
}
document.querySelectorAll('.choose-activity').forEach(link=>{
  const recipient=/^[1-9]\d{6,14}$/.test(whatsapp.phone)?whatsapp.phone:'';
  // Open the editable message directly, preserving its line breaks.
  link.href=`https://api.whatsapp.com/send?phone=${recipient}&text=${encodeURIComponent(activityMessage(link.dataset.activity))}`;
  link.removeAttribute('aria-disabled');
  link.closest('.card-actions').querySelector('.whatsapp-note').textContent=recipient
    ?'Öffnet unseren WhatsApp-Chat. Du sendest die Nachricht.'
    :'Wähle mich in WhatsApp aus und sende die Nachricht.';
});

// Keep the back stable while its independent buttons are being used.
document.querySelectorAll('.date-card').forEach(card=>{
  const toggle=card.querySelector('.date-toggle');
  const back=card.querySelector('.card-back');
  const choose=card.querySelector('.choose-activity');
  const returnButton=card.querySelector('.card-return');
  let pinned=false;
  let hoverSuppressed=false;
  function flip(open,moveFocus=false){
    card.classList.toggle('flipped',open);
    toggle.setAttribute('aria-expanded',String(open));
    toggle.setAttribute('aria-hidden',String(open));
    back.setAttribute('aria-hidden',String(!open));
    back.inert=!open;
    toggle.inert=open;
    if(moveFocus){
      if(open){
        pinned=true;
        (choose.hasAttribute('href')?choose:returnButton).focus({preventScroll:true});
      }else toggle.focus({preventScroll:true});
    }
  }
  card.addEventListener('pointerenter',event=>{
    if(event.pointerType==='mouse'&&!hoverSuppressed)flip(true,document.activeElement===toggle);
  });
  card.addEventListener('pointerleave',event=>{
    if(event.pointerType==='mouse'){
      hoverSuppressed=false;
      if(!pinned&&!back.contains(document.activeElement))flip(false);
    }
  });
  toggle.addEventListener('click',()=>{pinned=true;flip(true,true);});
  returnButton.addEventListener('click',()=>{pinned=false;hoverSuppressed=true;flip(false,true);});
  card.addEventListener('keydown',event=>{
    if(event.key==='Escape'){event.preventDefault();pinned=false;hoverSuppressed=true;flip(false,true);}
  });
});
