(function(){
  const goose = document.getElementById('goose');
  const bubble = document.getElementById('bubble');
  const mud = document.getElementById('mud');

  let mouse = { x: window.innerWidth/2, y: window.innerHeight/2 };
  let pos = { x: window.innerWidth*0.5, y: window.innerHeight*0.5 };
  let facingRight = true;
  let busy = false;
  let hovering = false;
  let paused = false;

  // Falas/notas vêm do frases.json e ajustes do config.json (via processo
  // principal). Até carregarem, ficam esses padrões mínimos.
  let honks = ["HONK.", "só passeando pela sua tela"];
  let notes = ["lembrete: você está sendo observado(a) 🪿"];
  let cfg = {
    silenciarSons: false, podeAtacarMouse: true, atacarSozinho: true,
    tempoMinPasseioS: 4, tempoMaxPasseioS: 10,
    pegadas: true, memes: true, roubarMouse: true,
    chanceHonk: 0.40, chanceNota: 0.18, chanceMeme: 0.15, chanceRoubo: 0.20, chanceCacaSozinho: 0.35,
    cores: { corpo:"#ffffff", bico:"#ffa500", contorno:"#161616", pernas:"#2f7ec7" }
  };

  function clampX(x){ return Math.max(-10, Math.min(window.innerWidth - 80, x)); }
  function clampY(y){ return Math.max(0, Math.min(window.innerHeight - 84, y)); }

  function placeGoose(x, y, duration){
    goose.style.transition = `left ${duration}s linear, top ${duration}s linear`;
    goose.style.left = x + 'px';
    goose.style.top = y + 'px';
  }

  // --- cores customizadas (config.cores) ---
  function applyColors(c){
    const set = (sel, col) => document.querySelectorAll(sel).forEach(g => g.setAttribute('fill', col));
    if(!c) return;
    if(c.contorno) set('.c-outline', c.contorno);
    if(c.corpo)    set('.c-body', c.corpo);
    if(c.bico)     set('.c-beak', c.bico);
    if(c.pernas)   set('.leg', c.pernas);
  }

  // --- sons sintetizados (WebAudio, sem arquivos externos) ---
  let actx = null;
  function ac(){ return actx || (actx = new (window.AudioContext || window.webkitAudioContext)()); }
  function tone(type, f0, f1, dur, gain){
    if(cfg.silenciarSons) return;
    try{
      const a = ac(), o = a.createOscillator(), g = a.createGain();
      o.type = type; o.frequency.setValueAtTime(f0, a.currentTime);
      o.frequency.exponentialRampToValueAtTime(Math.max(1,f1), a.currentTime + dur);
      g.gain.setValueAtTime(gain, a.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + dur);
      o.connect(g); g.connect(a.destination);
      o.start(); o.stop(a.currentTime + dur);
    }catch(e){ /* áudio pode falhar sem gesto do usuário */ }
  }
  const honkSound = () => { tone('sawtooth', 250, 150, 0.18, 0.25); setTimeout(()=>tone('sawtooth',230,120,0.15,0.2),120); };
  const biteSound = () => tone('square', 400, 90, 0.10, 0.22);
  const mudSound  = () => tone('sine', 120, 60, 0.07, 0.12);

  // --- pegadas de lama ---
  let mudSide = false;
  function dropFootprint(){
    if(!cfg.pegadas || !mud) return;
    const r = goose.getBoundingClientRect();
    mudSide = !mudSide;
    const fx = r.left + r.width*0.5 + (mudSide ? 6 : -6) + (Math.random()*4-2);
    const fy = r.top + r.height*0.94 + (Math.random()*4-2);
    const fp = document.createElement('div');
    fp.className = 'footprint';
    fp.style.left = fx + 'px';
    fp.style.top = fy + 'px';
    fp.style.setProperty('--r', (facingRight ? 8 : -8) + (Math.random()*10-5) + 'deg');
    mud.appendChild(fp);
    mudSound();
    setTimeout(()=> fp.remove(), 6000);
  }

  // balão sempre grudado na posição real renderizada do ganso.
  let followRAF = null;
  function updateBubblePos(){
    const gRect = goose.getBoundingClientRect();
    bubble.style.left = (gRect.left + gRect.width * (facingRight ? 0.72 : 0.28)) + 'px';
    bubble.style.top  = (gRect.top + gRect.height * 0.14) + 'px';
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
    if(paused) return;
    goose.classList.add('honking');
    honkSound();
    say(honks[Math.floor(Math.random()*honks.length)], 1700);
    setTimeout(()=> goose.classList.remove('honking'), 460);
  }

  function bite(){
    goose.classList.add('honking');
    biteSound();
    say("🦴 bicada!", 700);
    setTimeout(()=> goose.classList.remove('honking'), 380);
  }

  function writeNote(){
    const text = notes[Math.floor(Math.random()*notes.length)];
    say("deixa eu escrever uma coisa…", 1200);
    setTimeout(()=> window.goose.spawnNote(text), 900);
  }

  function bringMeme(){
    if(!cfg.memes) return;
    say("olha isso aqui 🖼️", 1000);
    setTimeout(()=> window.goose.spawnMeme(), 700);
  }

  function walkTo(x, y, speed, cb){
    x = clampX(x); y = clampY(y);
    const dist = Math.hypot(x - pos.x, y - pos.y);
    const duration = Math.max(0.35, dist / speed);

    facingRight = x >= pos.x;
    goose.classList.toggle('flip', !facingRight);
    goose.classList.remove('still');

    placeGoose(x, y, duration);

    // deixa pegadas ao longo do caminho
    let steps = null;
    if(cfg.pegadas && dist > 12){
      steps = setInterval(dropFootprint, 180);
    }

    setTimeout(()=>{
      if(steps) clearInterval(steps);
      pos.x = x; pos.y = y;
      goose.classList.add('still');
      if(cb) cb();
    }, duration*1000);
  }

  function distToMouse(){
    return Math.hypot(mouse.x - (pos.x+40), mouse.y - (pos.y+42));
  }

  let chaseRoundsLeft = 0;

  function tick(){
    if(busy || paused) return;
    busy = true;

    let tx, ty;
    if(chaseRoundsLeft > 0){
      chaseRoundsLeft--;
      tx = mouse.x - 40 + (Math.random()*16-8);
      ty = mouse.y - 42 + (Math.random()*16-8);
    } else {
      // caça se o cursor estiver perto OU, no modo autônomo, por conta
      // própria de vez em quando (mesmo com o mouse parado) — o ganso
      // decide sozinho fazer bagunça.
      const isClose = distToMouse() < 420;
      const startChase = (isClose && Math.random() < 0.3)
        || (cfg.atacarSozinho && Math.random() < cfg.chanceCacaSozinho);
      if(startChase){
        chaseRoundsLeft = 4 + Math.floor(Math.random()*3); // 4-6 rodadas
        say("caçando o cursor! 🏃", 900);
        tx = mouse.x - 40; ty = mouse.y - 42;
        // chance de tentar ROUBAR o cursor (só age se robotjs + config ligados)
        if(cfg.roubarMouse && Math.random() < cfg.chanceRoubo){
          window.goose.stealMouse();
        }
      } else {
        tx = Math.random() * window.innerWidth;
        ty = Math.random() * window.innerHeight;
      }
    }

    const wasLastChaseRound = chaseRoundsLeft === 0;
    const speed = chaseRoundsLeft > 0 || wasLastChaseRound ? 300 : 110;
    walkTo(tx, ty, speed, ()=>{
      if(wasLastChaseRound && cfg.podeAtacarMouse && distToMouse() < 90){
        bite();
      } else if(chaseRoundsLeft === 0){
        const r = Math.random();
        if(r < cfg.chanceNota){
          writeNote();
        } else if(r < cfg.chanceNota + cfg.chanceMeme){
          bringMeme();
        } else if(r < cfg.chanceNota + cfg.chanceMeme + cfg.chanceHonk){
          honk();
        }
      }
      const pause = chaseRoundsLeft > 0
        ? 60
        : (cfg.tempoMinPasseioS + Math.random()*(cfg.tempoMaxPasseioS-cfg.tempoMinPasseioS)) * 1000;
      setTimeout(()=>{ busy = false; if(!paused) tick(); }, pause);
    });
  }

  window.addEventListener('mousemove', (e)=>{
    mouse.x = e.clientX; mouse.y = e.clientY;
    const r = goose.getBoundingClientRect();
    const over = mouse.x >= r.left && mouse.x <= r.right && mouse.y >= r.top && mouse.y <= r.bottom;
    if(over !== hovering){
      hovering = over;
      window.goose.setHover(hovering);
    }
  });

  goose.addEventListener('click', ()=> honk());

  // pausa/retoma pela bandeja do sistema
  window.goose.onPauseChange((isPaused)=>{
    paused = isPaused;
    if(paused){
      goose.classList.add('still');
      bubble.classList.remove('show');
      stopFollowing();
    } else if(!busy){
      tick();
    }
  });

  placeGoose(pos.x, pos.y, 0);
  goose.classList.add('still');

  // carrega config + frases e só então começa a passear
  Promise.allSettled([ window.goose.getConfig(), window.goose.getPhrases() ]).then(([c, p])=>{
    if(c.status === 'fulfilled' && c.value){ cfg = { ...cfg, ...c.value, cores: { ...cfg.cores, ...(c.value.cores||{}) } }; }
    applyColors(cfg.cores);
    const ph = p.status === 'fulfilled' ? p.value : null;
    if(ph && Array.isArray(ph.honks) && ph.honks.length) honks = ph.honks;
    if(ph && Array.isArray(ph.notes) && ph.notes.length) notes = ph.notes;
    setTimeout(tick, 1000);
  });
})();
