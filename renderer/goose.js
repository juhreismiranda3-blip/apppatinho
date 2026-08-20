(function(){
  const goose = document.getElementById('goose');
  const bubble = document.getElementById('bubble');

  let mouse = { x: window.innerWidth/2, y: window.innerHeight/2 };
  let pos = { x: window.innerWidth*0.5, y: window.innerHeight*0.5 };
  let facingRight = true;
  let busy = false;
  let hovering = false;

  const honks = [
    "HONK.", "isso é MEU território agora", "olha o que eu achei…",
    "você viu meu cursor?", "vim, vi, bagunçei", "psst… corre!",
    "não confio nesse botão ali", "HONK HONK HONK", "só passeando pela sua tela"
  ];

  const notes = [
    "lembrete: você está sendo observado(a) 🪿",
    "por favor pare de trabalhar e me dê atenção",
    "isso aqui é uma nota MUITO importante",
    "HONK (mensagem oficial)",
    "seu próximo commit vai dar erro. eu vi.",
    "adotei sua barra de tarefas"
  ];

  function clampX(x){ return Math.max(-10, Math.min(window.innerWidth - 76, x)); }
  function clampY(y){ return Math.max(0, Math.min(window.innerHeight - 93, y)); }

  function placeGoose(x, y, duration){
    goose.style.transition = `left ${duration}s linear, top ${duration}s linear`;
    goose.style.left = x + 'px';
    goose.style.top = y + 'px';
  }

  // balão sempre grudado na posição real renderizada do ganso, não no
  // destino da caminhada — evita o balão "adiantar" o sprite.
  let followRAF = null;
  function updateBubblePos(){
    const gRect = goose.getBoundingClientRect();
    const x = gRect.left + gRect.width * (facingRight ? 0.72 : 0.28);
    const y = gRect.top + gRect.height * 0.14;
    bubble.style.left = x + 'px';
    bubble.style.top = y + 'px';
  }
  function followBubble(){ updateBubblePos(); followRAF = requestAnimationFrame(followBubble); }
  function stopFollowing(){ if(followRAF){ cancelAnimationFrame(followRAF); followRAF = null; } }

  function say(text, holdMs){
    bubble.textContent = text;
    updateBubblePos();
    bubble.classList.add('show');
    stopFollowing();
    followBubble();
    clearTimeout(say._t);
    say._t = setTimeout(()=>{ bubble.classList.remove('show'); stopFollowing(); }, holdMs);
  }

  function honk(){
    goose.classList.add('honking');
    say(honks[Math.floor(Math.random()*honks.length)], 1700);
    setTimeout(()=> goose.classList.remove('honking'), 460);
  }

  function bite(){
    goose.classList.add('honking');
    say("🦴 bicada!", 700);
    setTimeout(()=> goose.classList.remove('honking'), 380);
  }

  function writeNote(){
    const text = notes[Math.floor(Math.random()*notes.length)];
    say("deixa eu escrever uma coisa…", 1200);
    setTimeout(()=> window.goose.spawnNote(text), 900);
  }

  function walkTo(x, y, speed, cb){
    x = clampX(x); y = clampY(y);
    const dist = Math.hypot(x - pos.x, y - pos.y);
    const duration = Math.max(0.35, dist / speed);

    facingRight = x >= pos.x;
    goose.classList.toggle('flip', !facingRight);
    goose.classList.remove('still');

    placeGoose(x, y, duration);

    setTimeout(()=>{
      pos.x = x; pos.y = y;
      goose.classList.add('still');
      if(cb) cb();
    }, duration*1000);
  }

  function distToMouse(){
    return Math.hypot(mouse.x - (pos.x+38), mouse.y - (pos.y+46));
  }

  // "modo caça": ao entrar nesse modo, cada rodada mira a posição AO
  // VIVO do cursor (não um ponto fixo tirado uma vez), então ele
  // realmente acompanha o mouse enquanto durar.
  let chaseRoundsLeft = 0;

  // valores tirados do config.ini do app original (Desktop Goose v0.31):
  // ele passa bem mais tempo parado/plano entre uma ação e outra.
  const WANDER_MIN_S = 8;   // original real: 20
  const WANDER_MAX_S = 18;  // original real: 40

  function tick(){
    if(busy) return;
    busy = true;

    let tx, ty;
    if(chaseRoundsLeft > 0){
      chaseRoundsLeft--;
      tx = mouse.x - 38 + (Math.random()*16-8);
      ty = mouse.y - 46 + (Math.random()*16-8);
    } else {
      const isClose = distToMouse() < 420;
      const startChase = isClose && Math.random() < 0.3;
      if(startChase){
        chaseRoundsLeft = 4 + Math.floor(Math.random()*3); // 4-6 rodadas seguidas
        say("caçando o cursor! 🏃", 900);
        tx = mouse.x - 38; ty = mouse.y - 46;
      } else {
        tx = Math.random() * window.innerWidth;
        ty = Math.random() * window.innerHeight;
      }
    }

    const wasLastChaseRound = chaseRoundsLeft === 0;
    const speed = chaseRoundsLeft > 0 || wasLastChaseRound ? 300 : 110;
    walkTo(tx, ty, speed, ()=>{
      if(wasLastChaseRound && distToMouse() < 90){
        // "Task_CanAttackMouse" do original: termina a caçada com uma bicada
        bite();
      } else if(chaseRoundsLeft === 0){
        const r = Math.random();
        if(r < 0.12){
          writeNote();
        } else if(r < 0.42){
          honk();
        }
      }
      const pause = chaseRoundsLeft > 0
        ? 60
        : (WANDER_MIN_S + Math.random()*(WANDER_MAX_S-WANDER_MIN_S)) * 1000;
      setTimeout(()=>{ busy = false; tick(); }, pause);
    });
  }

  // eventos de mouse continuam chegando ao renderer mesmo em modo
  // "click-through" (forward: true no main), então dá pra fazer o
  // hit-test aqui e avisar o processo principal quando capturar o clique.
  window.addEventListener('mousemove', (e)=>{
    mouse.x = e.clientX; mouse.y = e.clientY;

    const r = goose.getBoundingClientRect();
    const over = mouse.x >= r.left && mouse.x <= r.right && mouse.y >= r.top && mouse.y <= r.bottom;
    if(over !== hovering){
      hovering = over;
      window.goose.setHover(hovering);
    }
  });

  goose.addEventListener('click', ()=>{
    honk();
  });

  placeGoose(pos.x, pos.y, 0);
  goose.classList.add('still');
  setTimeout(tick, 1000);
})();
