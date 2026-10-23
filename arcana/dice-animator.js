/* Fantasy Dice Animation 1.0.0 — presentation only. MIT License. */
(function (global) {
  'use strict';
  const SIDES = Object.freeze([4, 6, 8, 10, 12, 20]);
  const STYLE = `
    :host{display:block;color:#f0e9d8;font:14px/1.5 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;min-width:0;color-scheme:dark}
    *{box-sizing:border-box}button{font:inherit}button:focus-visible{outline:2px solid #ead095;outline-offset:4px}
    .shell{border:1px solid #65583e;border-radius:16px;background:#13191c;overflow:hidden;box-shadow:0 18px 60px #0003}
    .bar{display:flex;gap:12px;align-items:center;justify-content:center;text-align:center;padding:12px 18px;border-bottom:1px solid #aa8b4730;flex-wrap:wrap}
    .title{font-size:16px;font-weight:750;letter-spacing:.02em;margin:0;overflow-wrap:anywhere}
    .state{font-size:10px;letter-spacing:.13em;text-transform:uppercase;color:#c9ae79}
    .stage{position:relative;isolation:isolate;overflow:hidden;background:radial-gradient(ellipse at 50% 34%,#303c3d70,transparent 65%),repeating-linear-gradient(20deg,#ffffff02 0 1px,transparent 1px 6px),#10191c}
    .stage:before{content:"";position:absolute;inset:18px;border:1px solid #bba56b16;border-radius:50%;pointer-events:none}
    canvas{position:absolute;inset:0;width:100%;height:100%;display:block}
    .captions{position:absolute;inset:0;pointer-events:none}.caption{position:absolute;text-align:center;transform:translateX(-50%);font-size:11px;letter-spacing:.14em;color:#c2bcae}
    .caption b{display:inline-block;min-width:30px;color:#ffe0a1;font-size:17px;letter-spacing:0;margin-left:6px;font-weight:600}.caption .pending{color:#8e9998;font-size:12px}
    .empty{position:absolute;inset:0;display:grid;place-content:center;text-align:center;color:#aeb7b4;padding:24px}.empty span{font:50px Georgia,serif;color:#bba56b;line-height:1.5}.empty p{margin:0}
    .foot{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:15px 22px;min-height:73px;border-top:1px solid #aa8b4730;flex-wrap:wrap}
    .result{margin:0;color:#cec7b7;font-size:13px;text-align:center;flex:1;min-width:120px;overflow-wrap:anywhere}.result strong{font-weight:650;color:#f6dfad}
    .result.attack-breakdown{font-size:14px;line-height:1.65;color:#e7e8e5}
    .attack-line{display:flex;justify-content:center;align-items:baseline;gap:5px 6px;flex-wrap:wrap}
    .result-line{display:flex;align-items:baseline;justify-content:center;flex-wrap:wrap;gap:5px 7px}
    .result-formula{font-size:14px;color:#e0e6e3;white-space:normal}
    .result-line .attack-total{font-size:22px;color:#ffdd87;font-weight:850}
    @media(max-width:420px){.result-formula{font-size:12px}.result-line .attack-total{font-size:19px}}
    .attack-prefix{font-size:12px;color:#c4cdd1;text-transform:uppercase;letter-spacing:.03em}
    .attack-mod{white-space:nowrap;color:#dde3e3}
    .attack-equal{color:#cdbb8a;font-weight:700}
    .attack-total{font-weight:850;font-size:22px;line-height:1;color:#ffdd87}
    .attack-defense{white-space:nowrap;color:#dbdfdf}
    .attack-status{font-weight:850;white-space:nowrap;letter-spacing:.06em}
    .attack-status.hit{color:#6add8c}.attack-status.miss{color:#ff7474}
    @media(max-width:420px){.result.attack-breakdown{font-size:12px}.attack-total{font-size:19px}}
    .controls{display:flex;align-items:center;gap:8px}button{border:1px solid #9c895b60;border-radius:6px;background:#b69b5410;color:#e5d7b5;padding:8px 12px;cursor:pointer;min-height:40px}button:hover{background:#b69b5428}button:disabled{opacity:.35;cursor:default}
    .sr{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}
    .fallback .caption b{font-size:32px}.fallback .caption{padding:16px;border:1px solid #8e794b;border-radius:12px;background:#1d2729}
    @media(max-width:420px){.bar,.foot{padding:14px}.foot{gap:12px}.controls{margin-left:auto}}
  `;
  function finite(value, min, max, name) {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max)
      throw new TypeError(name + ' must be a finite number from ' + min + ' to ' + max);
    return value;
  }
  function text(value, name, max) {
    if (typeof value !== 'string' || value.length > max) throw new TypeError(name + ' must be a string of at most ' + max + ' characters');
    return value;
  }
  function normalize(payload) {
    if (!payload || typeof payload !== 'object' || !Array.isArray(payload.dice) || payload.dice.length < 1 || payload.dice.length > 24)
      throw new TypeError('dice must contain from 1 to 24 explicit die results');
    const dice = Array.from(payload.dice, (die, index) => {
      if (!die || !SIDES.includes(die.sides) || !Number.isInteger(die.value) || die.value < 1 || die.value > die.sides)
        throw new TypeError('Invalid die at index ' + index + ': supported sides and an integer value from 1 to sides are required');
      return Object.freeze({ sides: die.sides, value: die.value });
    });
    const roll = { dice: Object.freeze(dice) };
    if (payload.id !== undefined) roll.id = text(payload.id, 'id', 128);
    if (payload.label !== undefined) roll.label = text(payload.label, 'label', 240);
    if (payload.total !== undefined) {
      if (typeof payload.total === 'number') {
        if (!Number.isFinite(payload.total)) throw new TypeError('total must be finite');
        roll.total = payload.total;
      } else roll.total = text(payload.total, 'total', 128);
    }
    // Optional structured visual comparison supplied by the game. Never changes the dice.
    if(payload.breakdown!==undefined){
      const b=payload.breakdown;
      if(b?.kind==='result'){
        if(!Number.isFinite(b.total)||typeof b.formula!=='string'||b.formula.length>128)
          throw new TypeError('Invalid result breakdown');
        roll.breakdown=Object.freeze({kind:'result',formula:b.formula,total:b.total});
      }else{
        if(!b || b.kind!=='attack' || !Array.isArray(b.modifiers) || b.modifiers.length>8 ||
          ![b.base,b.total,b.defense].every(Number.isFinite) || typeof b.outcome!=='boolean')
            throw new TypeError('Invalid attack breakdown');
        const modifiers=b.modifiers.map(m=>{
          if(!m||!Number.isFinite(m.value)||typeof m.label!=='string'||m.label.length>64)
            throw new TypeError('Invalid attack modifier');
          return Object.freeze({value:m.value,label:m.label});
        });
        roll.breakdown=Object.freeze({kind:'attack',base:b.base,modifiers:Object.freeze(modifiers),
          total:b.total,defense:b.defense,outcome:b.outcome});
      }
    }
    return Object.freeze(roll);
  }
  function create(options) {
    options = options || {};
    const container = options.container;
    if (!container || container.nodeType !== 1 || typeof container.appendChild !== 'function') throw new TypeError('container must be a DOM element');
    const duration = finite(options.duration === undefined ? 2400 : options.duration, 0, 10000, 'duration');
    const staggerMs = finite(options.staggerMs === undefined ? 500 : options.staggerMs, 0, 5000, 'staggerMs');
    let motionStyle=options.motion||'bounce';
    if(!['bounce','roll'].includes(motionStyle))throw new TypeError('Unknown dice motion');
    let skinId=options.skin||global.FantasyDiceSkins?.defaultId||'classic';
    if(global.FantasyDiceSkins)global.FantasyDiceSkins.get(skinId);
    let speed = finite(options.speed === undefined ? 1 : options.speed, 0.25, 4, 'speed');
    const reduced = options.reducedMotion === undefined ? 'auto' : options.reducedMotion;
    if (!['auto', 'always', 'never'].includes(reduced)) throw new TypeError('reducedMotion must be auto, always or never');
    const doc = container.ownerDocument, win = doc.defaultView;
    const node = (tag, cls, value) => {
      const e = doc.createElement(tag);
      if (cls) e.className = cls;
      if (value !== undefined) e.textContent = value;
      return e;
    };
    const host = node('div');
    host.setAttribute('data-fantasy-dice', '1.0.0');
    // Shadow DOM isolates the renderer from the host game's selectors and IDs.
    const root = host.attachShadow({ mode: 'open' });
    const style = node('style'); style.textContent = STYLE; root.appendChild(style);
    const shell = node('section', 'shell'); shell.setAttribute('aria-label', 'Визуализация готового броска');
    const bar = node('div', 'bar'), title = node('h3', 'title', 'Кубики готовы'), stateLabel = node('span', 'state', 'Ожидание');
    // Game UI 0.6.51: one title and one result, no duplicated 'РЕЗУЛЬТАТ' badge.
    stateLabel.style.display = 'none';
    bar.append(title, stateLabel);
    const stage = node('div', 'stage'), canvas = node('canvas'); canvas.setAttribute('aria-hidden', 'true');
    const captions = node('div', 'captions'); captions.setAttribute('aria-hidden', 'true');
    const empty = node('div', 'empty'); empty.append(node('span', '', '◇'), node('p', '', 'Передайте готовые результаты из движка'));
    stage.append(canvas, captions, empty);
    const foot = node('div', 'foot'), result = node('p', 'result', 'Значения определяет игровой движок.');
    const live = node('span', 'sr'); live.setAttribute('aria-live', 'polite'); live.setAttribute('aria-atomic', 'true');
    const controls = node('div', 'controls');
    const speedButton = node('button', '', '×' + speed); speedButton.type = 'button'; speedButton.setAttribute('aria-label', 'Скорость анимации');
    const skipButton = node('button', '', 'Пропустить'); skipButton.type = 'button'; skipButton.disabled = true;
    controls.append(speedButton, skipButton); foot.append(result);
    if (options.controls !== false) foot.append(controls);
    shell.append(bar, stage, foot, live); root.append(shell); container.append(host);
    let ctx;
    try { ctx = canvas.getContext('2d', { alpha: true }); } catch (_) { ctx = null; }
    let mode = ctx && global.FantasyDiceRenderer ? 'canvas' : 'text';
    if (mode === 'text') stage.classList.add('fallback');
    let status = 'idle', roll = null, active = null, frame = 0, width = 0, height = 0, positions = [], operation = 0, disposing = false;
    const motionQuery = win.matchMedia ? win.matchMedia('(prefers-reduced-motion: reduce)') : null;
    const checkAlive = () => { if (status === 'destroyed' || disposing) throw new Error('FantasyDice instance has been destroyed'); };
    const emit = (name, detail) => container.dispatchEvent(new win.CustomEvent(name, { detail }));
    function layout() {
      if (status === 'destroyed') return;
      width = Math.max(1, stage.getBoundingClientRect().width || container.clientWidth || 600);
      const n = roll ? roll.dice.length : 1;
      const preferred = n <= 2 ? n : n <= 6 ? 3 : n <= 12 ? 4 : 6;
      const cols = Math.max(1, Math.min(preferred, Math.floor(width / 140)));
      const rows = Math.ceil(n / cols), cellW = width / cols;
      const radius = Math.max(20, Math.min(width < 460 ? 64 : 78, (cellW - 20) * 0.23));
      const cellH = radius * 2 + (width < 460 ? 52 : 70);
      height = roll ? Math.max(width < 460 ? 205 : 210, rows * cellH + 20) : 240;
      stage.style.height = height + 'px';
      const dpr = Math.min(2, win.devicePixelRatio || 1);
      canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      positions = Array.from({ length: n }, (_, i) => {
        const row = Math.floor(i / cols), inRow = Math.min(cols, n - row * cols);
        return { x: (width - inRow * cellW) / 2 + (i % cols + .5) * cellW, y: row * cellH + radius + 28, size: radius, cellW };
      });
      // With one die the single value is printed in the formula below.
      // Multiple dice keep individual captions to explain e.g. 2D8.
      captions.style.display = n === 1 ? 'none' : '';
      captions.replaceChildren();
      if (roll) roll.dice.forEach((die, i) => {
        const p = positions[i], caption = node('div', 'caption');
        caption.style.left = p.x + 'px'; caption.style.top = (p.y + p.size + 14) + 'px'; caption.style.width = (p.cellW - 8) + 'px';
        caption.append(node('span', '', 'D' + die.sides), node('b', status === 'playing' ? 'pending' : '', status === 'playing' ? '···' : String(die.value)));
        captions.append(caption);
      });
      draw();
    }
    function draw() {
      if (!ctx || mode !== 'canvas') return;
      ctx.clearRect(0, 0, width, height);
      if (!roll) return;
      const t = active ? Math.min(1, active.elapsed / Math.max(1, active.totalDuration)) : 1;
      const items = roll.dice.map((die, i) => {
        const p = positions[i], local = active ? Math.max(0, Math.min(1, (active.elapsed - i * staggerMs) / Math.max(1, active.baseDuration))) : 1;
        const pose=global.FantasyDiceMotion.sample(local,p,i,motionStyle);
        return {sides:die.sides,value:die.value,index:i,...pose};
      });
      try { global.FantasyDiceRenderer.render(ctx, width, height, items, { time: t, skin:global.FantasyDiceSkins?.get(skinId), detail: items.length > 8 || width < 600 ? 'low' : 'high' }); }
      catch (_) {
        // A graphics failure can never replace, recalculate or drop an engine result.
        mode = 'text'; stage.classList.add('fallback'); canvas.style.display = 'none';
      }
    }
    function showResult() {
      if (!roll) return;
      const values = roll.dice.map(d => 'D' + d.sides + ': ' + d.value).join(' · ');
      result.replaceChildren();
      result.classList.toggle('attack-breakdown',!!roll.breakdown);
      if(roll.breakdown?.kind==='result'){
        const b=roll.breakdown,line=node('div','result-line');
        const preceding=String(b.formula||'').replace(/\s*=\s*-?\d+\s*$/, '').trim();
        if(preceding)line.append(node('span','result-formula',preceding),node('span','attack-equal','='));
        line.append(node('span','attack-total',String(b.total)));
        result.append(line);
      }else if(roll.breakdown?.kind==='attack'){
        const b=roll.breakdown,line=node('div','attack-line');
        line.append(node('span','attack-prefix','Атака'),node('span','',String(b.base)));
        for(const m of b.modifiers){
          if(m.value)line.append(node('span','attack-mod',(m.value>=0?'+':'−')+Math.abs(m.value)+' '+m.label));
        }
        line.append(node('span','attack-equal','='),node('span','attack-total',String(b.total)),
          node('span','attack-defense','против ЗЩ '+b.defense),
          node('span','attack-equal','—'),
          node('span','attack-status '+(b.outcome?'hit':'miss'),b.outcome?'ПОПАДАНИЕ':'ПРОМАХ'));
        result.append(line);
      }else if (roll.total !== undefined) {
        const raw=String(roll.total);const segments=raw.split(/(ПОПАДАНИЕ|ПРОМАХ|УСПЕХ|ПРОВАЛ)/g);for(const part of segments){const el=node('span', '', part);if(part==='ПОПАДАНИЕ'||part==='УСПЕХ')el.style.color='#72d993';if(part==='ПРОМАХ'||part==='ПРОВАЛ')el.style.color='#ff7878';result.append(el)}
      } else result.append(node('span', '', values));
      live.textContent = (roll.label ? roll.label + '. ' : '') + values + (roll.total !== undefined ? '. Результат: ' + roll.total : '');
    }
    function finish(reason) {
      if (!active) return;
      const finished = active; active = null;
      if (frame) win.cancelAnimationFrame(frame); frame = 0;
      status = 'settled'; stateLabel.textContent = mode === 'text' ? 'Готово · текст' : 'Результат'; skipButton.disabled = true;
      layout(); showResult();
      const outcome = Object.freeze({ status: reason, roll: finished.roll, mode });
      finished.resolve(outcome);
      emit('dice:finish', outcome);
    }
    function tick(now) {
      frame = 0;
      if (!active) return;
      active.elapsed += Math.max(0, now - active.last) * speed; active.last = now;
      if (active.elapsed >= active.totalDuration) { finish('completed'); return; }
      draw();
      if (mode === 'text') { finish('completed'); return; }
      frame = win.requestAnimationFrame(tick);
    }
    const api = {
      play(payload, playOptions) {
        checkAlive();
        // Validate everything before interrupting any currently visible roll.
        const next = normalize(payload);
        const ms = finite(!playOptions || playOptions.duration === undefined ? duration : playOptions.duration, 0, 10000, 'duration');
        const request = ++operation;
        if (active) finish('replaced');
        // A newer request inside a finish listener wins; every caller still settles.
        if (status === 'destroyed' || disposing) return Promise.resolve(Object.freeze({ status: 'destroyed', roll: next, mode }));
        if (request !== operation) return Promise.resolve(Object.freeze({ status: 'replaced', roll: next, mode }));
        roll = next; status = 'playing'; title.textContent = next.label || 'Готовый бросок'; stateLabel.textContent = 'Анимация';
        result.textContent = 'Идёт бросок…'; live.textContent = ''; empty.hidden = true; empty.style.display = 'none'; skipButton.disabled = false;
        let resolve;
        const promise = new Promise(r => { resolve = r; });
        const run = { roll: next, baseDuration: ms, totalDuration: ms + (next.dice.length - 1) * staggerMs, elapsed: 0, last: win.performance.now(), resolve };
        active = run; layout();
        emit('dice:start', Object.freeze({ roll: next }));
        // Event handlers are allowed to skip, replace or destroy this presentation.
        if (active !== run) return promise;
        if (ms === 0 || mode === 'text' || doc.hidden || reduced === 'always' || (reduced === 'auto' && motionQuery && motionQuery.matches)) finish('completed');
        else frame = win.requestAnimationFrame(tick);
        return promise;
      },
      setMotion(style){checkAlive();if(!['bounce','roll'].includes(style))throw new TypeError('Unknown dice motion');motionStyle=style;draw();return style;},
      setSkin(id){checkAlive();if(!global.FantasyDiceSkins)throw new Error('Dice skins module is missing');global.FantasyDiceSkins.get(id);skinId=id;draw();return skinId;},
      skip() { if (status !== 'destroyed') finish('skipped'); },
      setSpeed(value) {
        checkAlive(); finite(value, .25, 4, 'speed');
        if (active) { const now = win.performance.now(); active.elapsed += Math.max(0, now - active.last) * speed; active.last = now; }
        speed = value; speedButton.textContent = '×' + value; return speed;
      },
      clear() {
        checkAlive(); const request = ++operation; if (active) finish('skipped');
        if (status === 'destroyed' || request !== operation) return;
        roll = null; status = 'idle'; title.textContent = 'Кубики готовы'; stateLabel.textContent = 'Ожидание';
        empty.hidden = false; empty.style.display = ''; result.textContent = 'Значения определяет игровой движок.'; live.textContent = ''; layout();
      },
      getState() { return Object.freeze({ status, speed, skin:skinId, motion:motionStyle, roll, mode }); },
      destroy() {
        if (status === 'destroyed' || disposing) return;
        disposing = true; ++operation;
        if (active) finish('destroyed');
        status = 'destroyed'; roll = null;
        if (frame) win.cancelAnimationFrame(frame); frame = 0;
        if (observer) observer.disconnect();
        win.removeEventListener('resize', layout); doc.removeEventListener('visibilitychange', visibility);
        if (motionQuery) { if (motionQuery.removeEventListener) motionQuery.removeEventListener('change', motionChange); else if (motionQuery.removeListener) motionQuery.removeListener(motionChange); }
        speedButton.removeEventListener('click', speedClick); skipButton.removeEventListener('click', skipClick); host.remove();
      }
    };
    const speedClick = () => api.setSpeed(speed < 1 ? 1 : speed < 2 ? 2 : speed < 4 ? 4 : 1);
    const skipClick = () => api.skip();
    const visibility = () => { if (doc.hidden && active) finish('completed'); };
    const motionChange = () => { if (reduced === 'auto' && motionQuery.matches && active) finish('completed'); };
    speedButton.addEventListener('click', speedClick); skipButton.addEventListener('click', skipClick);
    doc.addEventListener('visibilitychange', visibility);
    if (motionQuery) { if (motionQuery.addEventListener) motionQuery.addEventListener('change', motionChange); else if (motionQuery.addListener) motionQuery.addListener(motionChange); }
    const observer = win.ResizeObserver ? new win.ResizeObserver(layout) : null;
    if (observer) observer.observe(container); else win.addEventListener('resize', layout);
    layout();
    return Object.freeze(api);
  }
  global.FantasyDice = Object.freeze({ version: '1.1.0', supportedSides: SIDES, create, validate: normalize });
})(typeof window !== 'undefined' ? window : globalThis);
