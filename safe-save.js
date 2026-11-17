/* Shared predicate: manual and automatic saves have exactly the same boundary. */
(function(root){
 'use strict';
 function allowed(s,c={}){
  const p=s?.players?.find(p=>p.id===s.order?.[s.currentIndex||0])||s?.players?.[0];
  return !!(s?.started&&s.mode==='solo'&&!c.network&&p&&!p.inDungeon&&!p.pendingItems?.length&&
   !s.rolled&&!s.movePending&&!s.moveTransit&&!s.pendingMoveAction&&!s.chosenMovePlan&&
   !s.combat&&!s.exploration&&!s.tradeDeal&&!s.tradeOpportunity&&!s.tributeConsentPending&&
   !s.dungeonEntryNotice&&!s.portalPending&&!s.foreignTerritoryPending&&!s.locationActivationHex&&
   !s.territoryBuiltNotice&&!s.gameOver&&!c.sideInteraction&&!c.rollOpen&&!c.modalOpen&&!c.rollQueued);
 }
 const api={allowed};if(typeof module==='object'&&module.exports)module.exports=api;else root.RPGSafeSave=api;
})(typeof window==='undefined'?globalThis:window);
