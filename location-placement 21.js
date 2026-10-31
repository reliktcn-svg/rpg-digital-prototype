/* v0.6.39 — сбалансированное размещение постоянных локаций.
 * Чистый планировщик: не меняет существующие сохранения и не зависит от DOM.
 */
(function (root) {
  'use strict';

  function shuffled(input, random) {
    const result = [...input];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  function divideIntoZones(hexIds, map, count) {
    if (count <= 1) return [hexIds];
    const mid = Math.floor(count / 2);
    const xs = hexIds.map(id => map.hexes[id].x), ys = hexIds.map(id => map.hexes[id].y);
    const axis = Math.max(...xs) - Math.min(...xs) >= Math.max(...ys) - Math.min(...ys) ? 'x' : 'y';
    const sorted = [...hexIds].sort((a, b) => map.hexes[a][axis] - map.hexes[b][axis]);
    const cut = Math.round(sorted.length * mid / count);
    return [...divideIntoZones(sorted.slice(0, cut), map, mid),
      ...divideIntoZones(sorted.slice(cut), map, count - mid)];
  }

  // Глубина гекса — расстояние до внешнего края ВСЕЙ карты.
  // Граница между королевством и проклятыми землями не считается внешним краем.
  function getMapEdgeDepth(map) {
    const depth = {}, queue = [];
    for (const [id, hex] of Object.entries(map.hexes)) {
      if ((hex.neighbors || []).length < 6) { depth[id] = 0; queue.push(id); }
    }
    for (let i = 0; i < queue.length; i++) {
      const id = queue[i];
      for (const n of map.hexes[id].neighbors || []) {
        if (depth[n] === undefined) { depth[n] = depth[id] + 1; queue.push(n); }
      }
    }
    return depth;
  }

  function plan({map, counts, existing = {}, eligible, distance, random = Math.random, attempts = 14}) {
    if (!map?.hexes || !counts || typeof distance !== 'function') throw new Error('Некорректная карта для размещения локаций');
    const depths = getMapEdgeDepth(map);
    const regions = Object.keys(counts);
    const byRegion = {};
    for (const region of regions) {
      const allHexes = Object.keys(map.hexes).filter(id => map.hexes[id].region === region);
      const zoneCount = Math.max(...Object.values(counts[region]));
      const zones = divideIntoZones(allHexes, map, zoneCount);
      const zoneOf = new Map();
      zones.forEach((ids, zi) => ids.forEach(id => zoneOf.set(id, zi)));
      byRegion[region] = { allHexes, zones, zoneOf };
    }
    const original = {...existing};
    const originalIds = new Set(Object.keys(original));
    let best = null;
    const regionDistance = (a, b) => distance(a, b);

    function placementScore(candidate, name, placed, zone, region) {
      const all = Object.entries(placed);
      const here = map.hexes[candidate];
      const edge = depths[candidate] ?? 0;
      // Край допустим только как крайний выход — он крайне нежелателен.
      let result = edge === 0 ? -190 : edge === 1 ? -37 : edge === 2 ? 5 : 15;
      let nearest = 99, nearestSame = 99, nearestWithinZone = 99;
      const zoneOf = byRegion[region].zoneOf;
      for (const [otherId, loc] of all) {
        if (otherId === candidate) return -Infinity;
        const d = regionDistance(candidate, otherId);
        if (loc.name === name && d <= 1) return -Infinity; // одинаковые виды НЕ соприкасаются
        nearest = Math.min(nearest, d);
        if (loc.name === name) nearestSame = Math.min(nearestSame, d);
        if (zoneOf.get(otherId) === zone) nearestWithinZone = Math.min(nearestWithinZone, d);
      }
      if (nearest !== 99) {
        const distanceReward = {1:-85,2:-14,3:7,4:17,5:20,6:19,7:16,8:12};
        result += distanceReward[nearest] ?? 10;
      }
      if (nearestWithinZone !== 99) {
        result += nearestWithinZone === 1 ? -42 : nearestWithinZone === 2 ? -6 : nearestWithinZone === 3 ? 10 : nearestWithinZone <= 5 ? 15 : 7;
      }
      if (nearestSame !== 99) {
        result += nearestSame === 2 ? -55 : nearestSame === 3 ? -22 : nearestSame === 4 ? -5 : nearestSame >= 5 ? 8 : 0;
      }
      // Небольшой разброс внутри зоны: случайность сохраняется, но не создаёт кучные группы.
      const ids = byRegion[region].zones[zone];
      const cx = ids.reduce((sum, id) => sum + map.hexes[id].x, 0) / ids.length;
      const cy = ids.reduce((sum, id) => sum + map.hexes[id].y, 0) / ids.length;
      result -= Math.hypot(here.x - cx, here.y - cy) / 145;
      result += random() * 14;
      return result;
    }

    function chooseCandidate(name, placed, zone, region) {
      const ids = byRegion[region].zones[zone];
      const candidates = ids.filter(id => !placed[id] && (eligible ? eligible(id, region) : true));
      if (!candidates.length) return null;
      const ranked = candidates.map(id => ({id, score: placementScore(id, name, placed, zone, region)}))
        .filter(x => Number.isFinite(x.score)).sort((a,b) => b.score-a.score);
      if (!ranked.length) return null;
      // Не всегда выбираем один лучший гекс — каждый запуск партии остаётся непредсказуемым.
      const pool = ranked.slice(0, Math.min(5, ranked.length));
      return pool[Math.floor(Math.pow(random(), 2) * pool.length)].id;
    }

    function rateLayout(placed) {
      let penalty = 0;
      for (const region of regions) {
        const {allHexes, zones} = byRegion[region];
        const locations = Object.keys(placed).filter(id => map.hexes[id]?.region === region);
        for (const hex of allHexes) {
          const near = Math.min(...locations.map(loc => regionDistance(hex,loc)));
          penalty += near * near; // равномерное покрытие, без огромных пустых областей
        }
        for (const id of locations) {
          const edge = depths[id] ?? 0;
          penalty += edge === 0 ? 130 : edge === 1 ? 25 : 0;
          const nearest = Math.min(...locations.filter(other => other !== id).map(other => regionDistance(id, other)));
          if (nearest === 1) penalty += 60;
        }
        for (const zone of zones) {
          const occupied = zone.filter(id => placed[id]).length;
          penalty += Math.abs(occupied - Object.keys(counts[region]).length) * 100;
        }
      }
      return penalty;
    }

    for (let attempt = 0; attempt < Math.max(1,attempts); attempt++) {
      const placed = {...original};
      let valid = true;
      for (const region of regions) {
        const {zones,zoneOf} = byRegion[region];
        const names = Object.keys(counts[region]);
        const order = ['Древний портал', ...shuffled(names.filter(n=>n !== 'Древний портал'),random)];
        for (const name of order) {
          const total = counts[region][name];
          const existingOfType = Object.entries(placed).filter(([id,loc])=>map.hexes[id]?.region===region && loc.name===name);
          let remaining = Math.max(0,total-existingOfType.length);
          const priorities = shuffled(zones.map((_,zi)=>zi),random).sort((a,b)=>{
            const ca=existingOfType.filter(([id])=>zoneOf.get(id)===a).length;
            const cb=existingOfType.filter(([id])=>zoneOf.get(id)===b).length;
            return ca-cb;
          });
          for (const zone of priorities) {
            if (!remaining) break;
            const id = chooseCandidate(name,placed,zone,region);
            if (!id) continue;
            placed[id] = {name,cardId:null,generated:true};
            remaining--;
          }
          if (remaining) { valid = false; break; }
        }
        if (!valid) break;
      }
      if (valid) {
        const rating = rateLayout(placed);
        if (!best || rating < best.rating) best = {rating, placed};
      }
    }
    if (!best) return {ok:false,placements:{},zones:byRegion,reason:'Недостаточно допустимых гексов'};
    const placements = {};
    for (const [hex,loc] of Object.entries(best.placed)) if (!originalIds.has(hex)) placements[hex] = loc;
    return {ok:true,placements,zones:byRegion,quality:best.rating};
  }

  root.RPG_LOCATION_PLACEMENT = {plan, divideIntoZones, getMapEdgeDepth};
})(typeof window !== 'undefined' ? window : globalThis);
