/* Credentials stay on this device. Rendering never exposes secrets. */
(()=>{'use strict';
 const KEY='hod-party-library-v1';let cache=null;
 function all(){if(cache)return cache;try{const value=JSON.parse(localStorage.getItem(KEY)||'[]');cache=Array.isArray(value)?value.filter(x=>x&&typeof x.code==='string'&&x.playerId&&x.playerSecret):[]}catch{cache=[]}return cache;}
 function save(){localStorage.setItem(KEY,JSON.stringify(all()));}
 function put(record){const rows=all(),at=rows.findIndex(x=>x.code===record.code&&x.playerId===record.playerId);const next={...(at<0?{}:rows[at]),...record};if(at<0)rows.push(next);else rows[at]=next;save();return next;}
 function get(code,pid){return all().find(x=>x.code===code&&(!pid||x.playerId===pid))||null;}
 window.RPGPartyLibrary={all:()=>all().map(x=>({...x})),get,put,migrate(session,recovery){if(session?.code&&session.playerId&&session.playerSecret&&!get(session.code,session.playerId))put({...session,recoveryKey:session.recoveryKey||(recovery?.code===session.code?recovery.recoveryKey:null)});}};
})();
