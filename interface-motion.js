/* Presentation only. Logical close and game callbacks remain synchronous. */
(() => {
  'use strict';
  const duration = 1000, easing = 'cubic-bezier(0.76, 0, 0.24, 1)';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const active = new Map(), ghosts = new Set();
  let storyKey = null, enteringStory = false, parked = null;
  let battleKey = null, endingBattleKey = null;
  let storyExit = Promise.resolve(), battleExit = Promise.resolve(), outcomeExit = Promise.resolve();
  const visibility = new Map();
  let victoryHold = null;

  function stop(element) {
    const running = active.get(element);
    if (running) { running.cancel(); active.delete(element); }
  }
  function move(element, from, to, done) {
    stop(element);
    if (reduced.matches || typeof element.animate !== 'function') { done?.(); return; }
    const animation = element.animate([{ transform: from }, { transform: to }], { duration, easing });
    active.set(element, animation);
    animation.finished.then(() => {
      if (active.get(element) !== animation) return;
      active.delete(element); done?.();
    }).catch(() => {});
  }

  // Preserve the outgoing pixels, not the live controls. The real panel closes
  // immediately, so networking, turn logic and callbacks keep their old timing.
  function snapshot(element, kind) {
    if (!element || !element.isConnected || element.closest('[hidden]')) return null;
    const rect = element.getBoundingClientRect();
    if (!rect.width || !rect.height || (reduced.matches && !kind.endsWith('-hold'))) return null;
    const clone = element.cloneNode(true);
    const originals = [element, ...element.querySelectorAll('*')];
    const copies = [clone, ...clone.querySelectorAll('*')];
    for (let i = 0; i < copies.length; i++) {
      const source = originals[i], copy = copies[i], style = getComputedStyle(source);
      // Inline resolved styles retain ID-scoped mobile layouts without duplicate IDs.
      for (const property of style) copy.style.setProperty(property, style.getPropertyValue(property), 'important');
      copy.removeAttribute('id'); copy.removeAttribute('autofocus');
      for (const attr of [...copy.attributes]) if (attr.name.startsWith('on')) copy.removeAttribute(attr.name);
      if ('value' in source && 'value' in copy) copy.value = source.value;
      if ('checked' in source && 'checked' in copy) copy.checked = source.checked;
      copy.style.setProperty('animation', 'none', 'important');
      copy.style.setProperty('transition', 'none', 'important');
    }
    clone.classList.add('ui-motion-ghost'); clone.dataset.uiMotionKind = kind;
    clone.inert = true; clone.setAttribute('aria-hidden', 'true');
    const set = (key, value) => clone.style.setProperty(key, value, 'important');
    set('position', 'fixed'); set('inset', 'auto'); set('left', rect.left + 'px'); set('top', rect.top + 'px');
    set('width', rect.width + 'px'); set('height', rect.height + 'px'); set('max-width', 'none'); set('max-height', 'none');
    set('min-height', '0'); set('margin', '0'); set('transform', 'none'); set('pointer-events', 'none');
    set('z-index', String(kind === 'sheet' ? 24501 : kind === 'outcome' ? 23001 : kind === 'outcome-hold' ? 22999 : 22001));
    document.body.append(clone);
    copies.forEach((copy, i) => { copy.scrollTop = originals[i].scrollTop; copy.scrollLeft = originals[i].scrollLeft; });
    ghosts.add(clone);
    return { clone, rect };
  }
  function removeGhost(clone) { stop(clone); ghosts.delete(clone); clone.remove(); }
  function clearGhosts(kind) { for (const clone of [...ghosts]) if (!kind || clone.dataset.uiMotionKind === kind) removeGhost(clone); }
  function leave(element, kind) {
    clearGhosts(kind);
    const shot = snapshot(element, kind);
    stop(element);
    if (!shot) return;
    // WAAPI must own transform while the copied static styles own layout.
    shot.clone.style.removeProperty('transform');
    const to = kind === 'sheet' ? `translateX(${innerWidth - shot.rect.left + 24}px)` : `translateY(${-shot.rect.bottom - 24}px)`;
    move(shot.clone, 'translate(0, 0)', to, () => removeGhost(shot.clone));
  }
  function enter(element, kind) {
    if (!element) return;
    if (kind === 'sheet') clearGhosts(kind);
    stop(element);
    if (reduced.matches) return;
    const rect = element.getBoundingClientRect(), base = getComputedStyle(element).transform;
    const rest = base === 'none' ? '' : ' ' + base;
    const from = kind === 'sheet' ? `translateX(${innerWidth - rect.left + 24}px)` : `translateY(${innerHeight - rect.top + 24}px)`;
    move(element, from + rest, base === 'none' ? 'translate(0, 0)' : base);
  }
  function travelCopy(shot, kind) {
    if (!shot) return Promise.resolve();
    shot.clone.dataset.uiMotionKind = kind;
    shot.clone.style.removeProperty('transform');
    return new Promise(resolve => {
      move(shot.clone, 'translate(0,0)', `translateY(${-shot.rect.bottom - 24}px)`, () => { removeGhost(shot.clone); resolve(); });
    });
  }
  function releaseStory() {
    if (!parked) return storyExit;
    const shot = parked; parked = null;
    storyExit = travelCopy(shot, 'story');
    return storyExit;
  }
  function parkStory(content) {
    const current = content.querySelector('.story-card-shell');
    if (!current || content.closest('[hidden]')) return;
    if (parked) { removeGhost(parked.clone); parked = null; }
    const shot = snapshot(current.closest('.modal-card'), 'story-hold');
    stop(current.closest('.modal-card'));
    if (!shot) return;
    parked = { ...shot, key: storyKey, hold: false };
    const saved = parked;
    queueMicrotask(() => {
      if (parked !== saved) return;
      const roll = document.getElementById('rollOverlay');
      if (roll && !roll.hidden && !roll.classList.contains('battle-results-popup')) saved.hold = true;
      if (!saved.hold) releaseStory();
    });
  }
  function finishVisibility(element) {
    const token = visibility.get(element);
    if (!token) return;
    token.cancelled = true; visibility.delete(element);
    element.style.opacity = token.opacity; element.inert = token.inert;
  }
  function showAfter(element, gate, fade) {
    finishVisibility(element); stop(element);
    const token = { cancelled: false, opacity: element.style.opacity, inert: element.inert };
    visibility.set(element, token); element.style.opacity = '0'; element.inert = true;
    Promise.resolve(gate).then(async () => {
      if (token.cancelled || !element.isConnected || element.closest('[hidden]')) return;
      element.style.opacity = token.opacity;
      if (!reduced.matches) {
        if (fade) {
          const animation = element.animate([{ opacity: 0 }, { opacity: 1 }], { duration, easing, fill: 'both' });
          active.set(element, animation);
          try { await animation.finished; } catch {}
          if (active.get(element) === animation) { active.delete(element); animation.cancel(); }
        } else {
          enter(element, 'outcome');
          const animation = active.get(element);
          if (animation) { try { await animation.finished; } catch {} }
        }
      }
      if (visibility.get(element) === token) { element.inert = token.inert; element.style.opacity = token.opacity; visibility.delete(element); }
    });
  }
  function fadeBattle(content) {
    const current = content?.querySelector('.combat-shell');
    if (!current || content.closest('[hidden]')) return battleExit;
    const element = current.closest('.modal-card');
    const key = element.dataset.uiBattleKey || battleKey;
    if (endingBattleKey === key && key !== null) return battleExit;
    endingBattleKey = key;
    const shot = snapshot(element, 'battle');
    finishVisibility(element); stop(element);
    element.style.opacity = '0'; element.inert = true;
    if (!shot) { battleExit = Promise.resolve(); return battleExit; }
    shot.clone.style.removeProperty('opacity');
    battleExit = new Promise(resolve => {
      const animation = shot.clone.animate([{ opacity: 1 }, { opacity: 0 }], { duration, easing });
      active.set(shot.clone, animation);
      animation.finished.then(() => { removeGhost(shot.clone); resolve(); }).catch(resolve);
    });
    return battleExit;
  }
  function safe(fn) { return (...args) => { try { return fn(...args); } catch (error) { console.warn('UI motion:', error); } }; }
  window.RPGUIMotion = {
    openSheet: safe((sheet, wasHidden) => { if (wasHidden) enter(sheet, 'sheet'); }),
    closeSheet: safe(sheet => leave(sheet, 'sheet')),
    beforeCard: safe((content, card) => {
      const current = content.querySelector('.story-card-shell');
      const nextKey = String(card?.id) + ':' + String(card?.category);
      const restored = parked?.key === nextKey;
      enteringStory = !restored && (!current || content.closest('[hidden]') || nextKey !== storyKey);
      if (restored) { removeGhost(parked.clone); parked = null; }
      else if (parked) releaseStory();
      if (current && !content.closest('[hidden]') && nextKey !== storyKey) { parkStory(content); releaseStory(); }
      storyKey = nextKey;
    }),
    afterCard: safe(content => {
      const element = content.closest('.modal-card');
      finishVisibility(element); element.style.opacity = ''; element.inert = false;
      const story = content.querySelector('.story-card-shell');
      if (story && enteringStory) enter(story.closest('.modal-card'), 'story');
      if (!story) { storyKey = null; releaseStory(); }
      enteringStory = false;
    }),
    closeCard: safe(content => {
      const story = content.querySelector('.story-card-shell');
      if (story) parkStory(content);
      else if (content.querySelector('.combat-shell')) { fadeBattle(content); battleKey = null; }
      else if (content.querySelector('.battle-fate')) {
        const element = content.closest('.modal-card'); finishVisibility(element);
        outcomeExit = travelCopy(snapshot(element, 'outcome'), 'outcome'); stop(element);
      }
    }),
    modalCleared: safe(content => {
      const element = content.closest('.modal-card');
      finishVisibility(element); stop(element); element.style.opacity = ''; element.inert = false;
    }),
    beforeCombat: safe((content, key) => {
      if (battleKey === key) return;
      if (content.querySelector('.story-card-shell') && !content.closest('[hidden]')) parkStory(content);
      releaseStory();
    }),
    afterCombat: safe((content, key) => {
      const element = content.closest('.modal-card');
      element.dataset.uiBattleKey = key;
      if (endingBattleKey === key) { element.style.opacity = '0'; element.inert = true; return; }
      if (battleKey === key) return;
      battleKey = key; endingBattleKey = null;
      finishVisibility(element); element.style.opacity = ''; element.inert = false;
      showAfter(element, Promise.all([releaseStory(), outcomeExit]), true);
    }),
    beforeDefeat: safe(content => {
      if (victoryHold) { outcomeExit = travelCopy(victoryHold, 'outcome'); victoryHold = null; }
      fadeBattle(content); releaseStory();
    }),
    afterDefeat: safe(content => {
      const element = content.closest('.modal-card');
      // The same container may have held the now-hidden combat view.
      finishVisibility(element); element.style.opacity = ''; element.inert = false;
      showAfter(element, Promise.all([battleExit, releaseStory(), outcomeExit]), false);
    }),
    rollShown: safe((overlay, title) => {
      if (title === 'Результаты боя' && victoryHold) {
        removeGhost(victoryHold.clone); victoryHold = null;
        const element = overlay.querySelector('.roll-popup-card');
        finishVisibility(element); stop(element); element.style.opacity = ''; element.inert = false;
        return;
      }
      if (title === 'Результаты боя') {
        fadeBattle(document.getElementById('modalContent'));
        showAfter(overlay.querySelector('.roll-popup-card'), Promise.all([battleExit, releaseStory()]), false);
      } else if (parked) parked.hold = true;
    }),
    rollClosing: safe((overlay, options = {}) => {
      if (!overlay.classList.contains('battle-results-popup')) return;
      const element = overlay.querySelector('.roll-popup-card'); finishVisibility(element);
      if (options.keepResult) {
        if (victoryHold) removeGhost(victoryHold.clone);
        victoryHold = snapshot(element, 'outcome-hold'); stop(element); return;
      }
      outcomeExit = travelCopy(snapshot(element, 'outcome'), 'outcome'); stop(element);
    }),
    rollSettled: safe(() => {
      const roll = document.getElementById('rollOverlay');
      if (roll?.hidden) {
        releaseStory();
        if (victoryHold) { outcomeExit = travelCopy(victoryHold, 'outcome'); victoryHold = null; }
      }
    }),
    hideBattle: safe(content => { fadeBattle(content); battleKey = null; endingBattleKey = null; }),
    clear: safe(() => {
      if (parked) { removeGhost(parked.clone); parked = null; }
      if (victoryHold) { removeGhost(victoryHold.clone); victoryHold = null; }
      clearGhosts(); for (const element of [...visibility.keys()]) finishVisibility(element);
      for (const element of [...active.keys()]) stop(element);
      storyExit = battleExit = outcomeExit = Promise.resolve();
    })
  };
  const modalContent = document.getElementById('modalContent');
  if (modalContent) new MutationObserver(() => {
    const element = modalContent.closest('.modal-card');
    if (!modalContent.querySelector('.combat-shell') && !visibility.has(element) && element.style.opacity === '0') {
      element.style.opacity = ''; element.inert = false;
    }
  }).observe(modalContent, { childList: true });
  window.addEventListener('resize', () => window.RPGUIMotion.clear(), { passive: true });
  window.addEventListener('pagehide', () => window.RPGUIMotion.clear());
  document.addEventListener('visibilitychange', () => { if (document.hidden) window.RPGUIMotion.clear(); });
})();
