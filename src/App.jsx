import { useState, useEffect, useCallback, useRef } from "react";

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBO-4Ft9xcEWOkhjpURfEC0cR2Dx52GyL0",
  authDomain: "favstictac-lovers.firebaseapp.com",
  projectId: "favstictac-lovers",
  storageBucket: "favstictac-lovers.firebasestorage.app",
  messagingSenderId: "508522451543",
  appId: "1:508522451543:web:2ce488ca2c29cde3384912",
};

let firebaseApp, auth, db, storage;
let firebaseReady = false;

async function initFirebase() {
  if (firebaseReady) return true;
  try {
    const { initializeApp, getApps } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js");
    const { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
            onAuthStateChanged, signOut, updateProfile, sendPasswordResetEmail,
            updateEmail, EmailAuthProvider, reauthenticateWithCredential } =
      await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js");
    const { getFirestore, doc, setDoc, getDoc, updateDoc, collection,
            query, orderBy, limit, getDocs, onSnapshot, serverTimestamp, addDoc, where } =
      await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
    const { getStorage, ref, uploadString, getDownloadURL } =
      await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js");

    firebaseApp = getApps().length ? getApps()[0] : initializeApp(FIREBASE_CONFIG);
    auth = getAuth(firebaseApp);
    db = getFirestore(firebaseApp);
    storage = getStorage(firebaseApp);

    window._fb = {
      auth, db, storage,
      createUserWithEmailAndPassword, signInWithEmailAndPassword,
      onAuthStateChanged, signOut, updateProfile, sendPasswordResetEmail,
      updateEmail, EmailAuthProvider, reauthenticateWithCredential,
      doc, setDoc, getDoc, updateDoc, collection,
      query, orderBy, limit, getDocs, onSnapshot, serverTimestamp, addDoc, where,
      ref, uploadString, getDownloadURL,
    };
    firebaseReady = true;
    return true;
  } catch (e) { console.error("Firebase init error:", e); return false; }
}

// ── GAME LOGIC ────────────────────────────────────────────────────────────────
const getWinCombos = (size) => { const combos=[]; for(let r=0;r<size;r++){const row=[];for(let c=0;c<size;c++)row.push(r*size+c);combos.push(row);} for(let c=0;c<size;c++){const col=[];for(let r=0;r<size;r++)col.push(r*size+c);combos.push(col);} const d1=[],d2=[]; for(let i=0;i<size;i++){d1.push(i*size+i);d2.push(i*size+(size-1-i));} combos.push(d1,d2); return combos; };
const calcWinnerForSize = (b, size=3) => { const combos=getWinCombos(size); for(const combo of combos){ const first=b[combo[0]]; if(first&&combo.every(i=>b[i]===first)) return {winner:first,line:combo}; } return null; };
const calcWinner = (b, size=3) => calcWinnerForSize(b, size);
const getWinCombos = (size) => { const combos=[]; for(let r=0;r<size;r++){const row=[];for(let c=0;c<size;c++)row.push(r*size+c);combos.push(row);} for(let c=0;c<size;c++){const col=[];for(let r=0;r<size;r++)col.push(r*size+c);combos.push(col);} const d1=[],d2=[]; for(let i=0;i<size;i++){d1.push(i*size+i);d2.push(i*size+(size-1-i));} combos.push(d1,d2); return combos; };
const calcWinnerForSize = (b, size=3) => { const combos=getWinCombos(size); for(const combo of combos){ const first=b[combo[0]]; if(first&&combo.every(i=>b[i]===first)) return {winner:first,line:combo}; } return null; };
const calcWinner = (b, size=3) => calcWinnerForSize(b, size);

// ── SMARTER AI — Cannot be beaten, handles speed exploitation ─────────────────
const minimax = (board, isMax, depth=0, alpha=-Infinity, beta=Infinity) => {
  const w = calcWinner(board);
  if(w) return w.winner==="O" ? (100-depth) : (depth-100);
  if(!board.includes(null)) return 0;
  const moves = board.map((v,i)=>v===null?i:-1).filter(i=>i>=0);
  if(isMax) {
    let best=-Infinity;
    for(const m of moves) {
      const nb=[...board]; nb[m]="O";
      best=Math.max(best, minimax(nb,false,depth+1,alpha,beta));
      alpha=Math.max(alpha,best);
      if(beta<=alpha) break; // Alpha-beta pruning
    }
    return best;
  } else {
    let best=Infinity;
    for(const m of moves) {
      const nb=[...board]; nb[m]="X";
      best=Math.min(best, minimax(nb,true,depth+1,alpha,beta));
      beta=Math.min(beta,best);
      if(beta<=alpha) break;
    }
    return best;
  }
};

// Smart AI that:
// 1. Wins immediately if possible
// 2. Blocks player from winning
// 3. Takes center if available
// 4. Takes corners strategically
// 5. Falls back to minimax for perfect play
const bestMove = (board) => {
  const empty = board.map((v,i)=>v===null?i:-1).filter(i=>i>=0);
  if(empty.length===0) return -1;

  // 1. Check if AI can win immediately
  for(const i of empty) {
    const nb=[...board]; nb[i]="O";
    if(calcWinner(nb)) return i;
  }

  // 2. Block player from winning immediately
  for(const i of empty) {
    const nb=[...board]; nb[i]="X";
    if(calcWinner(nb)) return i;
  }

  // 3. Take center if empty
  if(board[4]===null) return 4;

  // 4. Take corners strategically
  const corners = [0,2,6,8].filter(i=>board[i]===null);
  // If player is in corner, take opposite corner
  const opposites = {0:8,2:6,6:2,8:0};
  for(const c of [0,2,6,8]) {
    if(board[c]==="X" && board[opposites[c]]===null) return opposites[c];
  }
  if(corners.length>0) return corners[Math.floor(Math.random()*corners.length)];

  // 5. Take edges
  const edges = [1,3,5,7].filter(i=>board[i]===null);
  if(edges.length>0) return edges[0];

  // 6. Minimax for remaining moves
  let best=-Infinity, move=empty[0];
  for(const i of empty) {
    const nb=[...board]; nb[i]="O";
    const score=minimax(nb,false,0,-Infinity,Infinity);
    if(score>best){best=score;move=i;}
  }
  return move;
};

// ── ICONS ─────────────────────────────────────────────────────────────────────
const XIcon = () => <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round"><line x1="8" y1="8" x2="32" y2="32"/><line x1="32" y1="8" x2="8" y2="32"/></svg>;
const OIcon = () => <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="4"><circle cx="20" cy="20" r="12"/></svg>;
const EyeIcon = ({show}) => show ? <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> : <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>;

// ── CSS ───────────────────────────────────────────────────────────────────────
const getCSS = (theme) => `
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=Space+Mono:wght@400;700&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
body{background:${theme.colors.bg};color:#f0ede8;font-family:'Space Mono',monospace;min-height:100vh}
:root{
  --x:${theme.colors.x};
  --o:${theme.colors.o};
  --card:${theme.colors.card};
  --border:${theme.colors.border};
  --accent:${theme.colors.accent};
  --muted:${theme.colors.muted};
  --bg:${theme.colors.bg};
  --success:#2ed573;
  --error:#ff4757;
}
.app{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:16px;
  background:radial-gradient(ellipse at 15% 40%,#1a0828 0%,#08080f 55%),radial-gradient(ellipse at 85% 60%,#0a1a10 0%,transparent 50%)}
.logo{font-family:'Syne',sans-serif;font-weight:800;font-size:clamp(1.5rem,6vw,2.4rem);letter-spacing:-1px;line-height:1}
.logo .lf{color:var(--accent)}.logo .lx{color:var(--x)}.logo .lo{color:var(--o)}
.logo .lm{color:var(--muted);font-size:.55em;vertical-align:middle;margin:0 2px}
.logo .lovers{color:#f0ede8;font-size:.35em;font-weight:400;letter-spacing:3px;text-transform:uppercase;vertical-align:middle;margin-left:4px;opacity:.6}
.tagline{color:var(--muted);font-size:.65rem;margin-top:5px;letter-spacing:3px;text-transform:uppercase}
.card{background:var(--card);border:1px solid var(--border);border-radius:18px;padding:clamp(16px,4vw,28px);width:100%;max-width:420px}
.gap{display:flex;flex-direction:column;gap:10px}
.row{display:flex;gap:8px}
.field{display:flex;flex-direction:column;gap:5px}
.label{font-size:.65rem;color:var(--muted);text-transform:uppercase;letter-spacing:2px}
.input-wrap{position:relative;display:flex;align-items:center}
.input{width:100%;padding:11px 14px;background:#16161f;border:1px solid var(--border);border-radius:9px;color:#f0ede8;
  font-family:'Space Mono',monospace;font-size:.82rem;outline:none;transition:border .2s,box-shadow .2s}
.input:focus{border-color:var(--accent);box-shadow:0 0 0 3px rgba(255,215,0,.08)}
.eye-btn{position:absolute;right:10px;background:none;border:none;color:var(--muted);cursor:pointer;display:flex;padding:4px}
.btn{display:flex;align-items:center;justify-content:center;gap:7px;width:100%;padding:13px;border-radius:10px;
  border:none;font-family:'Space Mono',monospace;font-size:.8rem;font-weight:700;cursor:pointer;transition:all .18s;letter-spacing:1px;text-transform:uppercase}
.btn:disabled{opacity:.4;cursor:not-allowed}
.btn-primary{background:var(--accent);color:#08080f}.btn-primary:not(:disabled):hover{background:#ffe44d;transform:translateY(-1px)}
.btn-outline{background:transparent;color:#f0ede8;border:1px solid var(--border)}.btn-outline:not(:disabled):hover{border-color:var(--accent);color:var(--accent)}
.btn-x{background:rgba(255,71,87,.12);color:var(--x);border:1px solid rgba(255,71,87,.25)}.btn-x:not(:disabled):hover{background:rgba(255,71,87,.22)}
.btn-o{background:rgba(46,213,115,.12);color:var(--o);border:1px solid rgba(46,213,115,.25)}.btn-o:not(:disabled):hover{background:rgba(46,213,115,.22)}
.btn-sm{padding:8px 14px;font-size:.72rem;width:auto;border-radius:8px}
.btn-ghost{background:none;border:none;color:var(--muted);font-family:'Space Mono',monospace;font-size:.72rem;cursor:pointer;text-decoration:underline;padding:0}
.divider{display:flex;align-items:center;gap:10px;color:var(--muted);font-size:.65rem;margin:2px 0}
.divider::before,.divider::after{content:'';flex:1;height:1px;background:var(--border)}
.alert{padding:9px 12px;border-radius:8px;font-size:.72rem;line-height:1.5}
.alert-error{background:rgba(255,71,87,.1);border:1px solid rgba(255,71,87,.3);color:var(--error)}
.alert-success{background:rgba(46,213,115,.1);border:1px solid rgba(46,213,115,.3);color:var(--success)}
.alert-info{background:rgba(255,215,0,.07);border:1px solid rgba(255,215,0,.2);color:var(--accent)}
/* Avatar */
.avatar{width:38px;height:38px;border-radius:50%;display:flex;align-items:center;justify-content:center;
  font-family:'Syne',sans-serif;font-weight:800;font-size:.9rem;background:linear-gradient(135deg,#1a0828,#0a1a10);
  border:2px solid var(--border);flex-shrink:0;overflow:hidden}
.avatar img{width:100%;height:100%;object-fit:cover}
.avatar-lg{width:80px;height:80px;border-radius:50%;display:flex;align-items:center;justify-content:center;
  font-family:'Syne',sans-serif;font-weight:800;font-size:1.8rem;background:linear-gradient(135deg,#1a0828,#0a1a10);
  border:3px solid var(--accent);overflow:hidden;cursor:pointer;position:relative;margin:0 auto}
.avatar-lg img{width:100%;height:100%;object-fit:cover}
.avatar-edit{position:absolute;bottom:0;right:0;background:var(--accent);color:#08080f;border-radius:50%;
  width:24px;height:24px;display:flex;align-items:center;justify-content:center;font-size:.7rem}
.avatar-md{width:50px;height:50px;border-radius:50%;display:flex;align-items:center;justify-content:center;
  font-family:'Syne',sans-serif;font-weight:800;font-size:1.1rem;background:linear-gradient(135deg,#1a0828,#0a1a10);
  border:2px solid var(--border);flex-shrink:0;overflow:hidden}
.avatar-md img{width:100%;height:100%;object-fit:cover}
/* Topbar */
.topbar{display:flex;align-items:center;justify-content:space-between;padding:10px 14px;
  background:rgba(17,17,24,.95);border-bottom:1px solid var(--border);border-radius:14px 14px 0 0;margin-bottom:16px;
  position:sticky;top:0;z-index:10;backdrop-filter:blur(8px)}
.topbar-name{font-size:.75rem;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:110px}
.topbar-email{font-size:.6rem;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:110px}
/* Bottom nav */
.bottom-nav{display:flex;background:rgba(17,17,24,.98);border-top:1px solid var(--border);border-radius:0 0 14px 14px;margin-top:16px}
.nav-item{flex:1;padding:10px 4px;display:flex;flex-direction:column;align-items:center;gap:3px;
  background:none;border:none;color:var(--muted);font-family:'Space Mono',monospace;font-size:.52rem;
  cursor:pointer;transition:all .18s;text-transform:uppercase;letter-spacing:1px;position:relative}
.nav-item.active{color:var(--accent)}
.nav-badge{position:absolute;top:6px;right:calc(50% - 14px);background:var(--error);color:#fff;border-radius:50%;
  width:16px;height:16px;font-size:.55rem;display:flex;align-items:center;justify-content:center;font-weight:700}
/* Scoreboard */
.scoreboard{display:grid;grid-template-columns:1fr auto 1fr;gap:8px;align-items:center;margin-bottom:14px}
.score-box{background:#16161f;border-radius:10px;padding:10px 8px;text-align:center;border:1px solid var(--border);transition:all .2s}
.score-box.active{border-color:var(--accent);box-shadow:0 0 14px rgba(255,215,0,.12)}
.score-name{font-size:.6rem;color:var(--muted);text-transform:uppercase;letter-spacing:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.score-num{font-family:'Syne',sans-serif;font-weight:800;font-size:1.5rem;line-height:1}
.score-x{color:var(--x)}.score-o{color:var(--o)}
/* Board */
.board{display:grid;grid-template-columns:repeat(3,1fr);gap:9px;margin:16px 0}
.cell{aspect-ratio:1;background:#16161f;border-radius:12px;border:1px solid var(--border);
  display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all .18s}
.cell:hover:not(.filled){background:#1e1e2e;border-color:var(--muted)}
.cell.filled{cursor:default}
.cell.x-cell{border-color:rgba(255,71,87,.35);background:rgba(255,71,87,.07)}
.cell.o-cell{border-color:rgba(46,213,115,.35);background:rgba(46,213,115,.07)}
.cell.win-cell{animation:gpulse .7s ease infinite alternate}
.cell svg{width:44%;height:44%}
.cell.x-cell svg{color:var(--x)}.cell.o-cell svg{color:var(--o)}
.cell.anim svg{animation:pop .28s cubic-bezier(.36,.07,.19,.97)}
@keyframes pop{0%{transform:scale(0) rotate(-12deg)}70%{transform:scale(1.18)}100%{transform:scale(1)}}
@keyframes gpulse{from{box-shadow:0 0 0 0 rgba(255,215,0,.35)}to{box-shadow:0 0 0 7px rgba(255,215,0,0)}}
.status{text-align:center;padding:9px 12px;border-radius:8px;font-size:.77rem;background:#16161f;border:1px solid var(--border)}
.status.win-x{border-color:var(--x);color:var(--x);background:rgba(255,71,87,.08)}
.status.win-o{border-color:var(--o);color:var(--o);background:rgba(46,213,115,.08)}
.status.draw{border-color:var(--accent);color:var(--accent);background:rgba(255,215,0,.05)}
/* Private chat */
.chat-screen{display:flex;flex-direction:column;height:calc(100vh - 200px);min-height:400px}
.chat-messages{flex:1;overflow-y:auto;padding:8px;display:flex;flex-direction:column;gap:8px;scrollbar-width:thin}
.chat-msg{display:flex;gap:8px;align-items:flex-end}
.chat-msg.mine{flex-direction:row-reverse}
.chat-bubble{padding:9px 13px;border-radius:14px;font-size:.78rem;max-width:78%;line-height:1.5;word-break:break-word}
.chat-bubble.mine{background:var(--accent);color:#08080f;border-radius:14px 14px 2px 14px}
.chat-bubble.other{background:#1e1e2e;border:1px solid var(--border);border-radius:14px 14px 14px 2px}
.chat-time{font-size:.55rem;color:var(--muted);margin-top:2px;text-align:right}
.chat-input-row{display:flex;gap:8px;padding:10px 0 0;border-top:1px solid var(--border)}
/* Conversation list */
.convo-item{display:flex;gap:12px;align-items:center;padding:12px;border-radius:10px;background:#16161f;
  border:1px solid var(--border);cursor:pointer;transition:all .18s;margin-bottom:8px}
.convo-item:hover{border-color:var(--accent)}
.convo-info{flex:1;overflow:hidden}
.convo-name{font-weight:700;font-size:.82rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.convo-last{font-size:.68rem;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px}
.convo-badge{background:var(--error);color:#fff;border-radius:50%;width:18px;height:18px;font-size:.6rem;
  display:flex;align-items:center;justify-content:center;font-weight:700;flex-shrink:0}
/* Player search */
.player-item{display:flex;gap:12px;align-items:center;padding:12px;border-radius:10px;background:#16161f;
  border:1px solid var(--border);margin-bottom:8px;cursor:pointer;transition:all .18s}
.player-item:hover{border-color:var(--accent)}
/* Player profile view */
.profile-view{text-align:center;padding:20px 0 16px}
.profile-view-name{font-family:'Syne',sans-serif;font-weight:800;font-size:1.3rem;margin-top:10px}
.profile-view-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:14px 0}
.stat-box{background:#16161f;border-radius:8px;padding:10px 6px;text-align:center;border:1px solid var(--border)}
.stat-val{font-family:'Syne',sans-serif;font-weight:800;font-size:1.2rem}
.stat-lbl{font-size:.58rem;color:var(--muted);text-transform:uppercase;letter-spacing:1px}
/* Tabs */
.tabs{display:flex;gap:6px;background:#16161f;border-radius:10px;padding:4px;margin-bottom:14px}
.tab{flex:1;padding:7px 6px;border-radius:7px;border:none;font-family:'Space Mono',monospace;font-size:.65rem;
  cursor:pointer;transition:all .18s;background:none;color:var(--muted);text-transform:uppercase;letter-spacing:1px}
.tab.active{background:var(--card);color:#f0ede8;border:1px solid var(--border)}
/* Leaderboard */
.lb-row{display:grid;grid-template-columns:22px 32px 1fr repeat(3,38px);gap:6px;align-items:center;padding:8px 0;border-bottom:1px solid var(--border);font-size:.72rem}
.lb-header{color:var(--muted);font-size:.6rem;text-transform:uppercase;letter-spacing:1px}
.lb-rank{font-weight:700;font-family:'Syne',sans-serif}
.lb-rank.gold{color:#ffd700}.lb-rank.silver{color:#c0c0c0}.lb-rank.bronze{color:#cd7f32}
/* History */
.hist-item{padding:10px;border-radius:9px;background:#16161f;margin-bottom:7px;font-size:.72rem}
/* Room badge */
.room-badge{display:flex;align-items:center;gap:10px;background:#16161f;border:1px solid var(--border);border-radius:9px;padding:8px 12px;margin-bottom:10px;flex-wrap:wrap}
.room-code{color:var(--accent);font-weight:700;letter-spacing:3px;font-size:.9rem;font-family:'Syne',sans-serif}
/* Profile section */
.section{border-top:1px solid var(--border);padding-top:14px;margin-top:4px}
.section-title{font-size:.65rem;color:var(--muted);text-transform:uppercase;letter-spacing:2px;margin-bottom:10px}
/* Spinner */
.spinner{width:18px;height:18px;border:2px solid var(--border);border-top-color:var(--accent);border-radius:50%;animation:spin .7s linear infinite;display:inline-block;vertical-align:middle}
@keyframes spin{to{transform:rotate(360deg)}}
.waiting-code{font-family:'Syne',sans-serif;font-weight:800;font-size:2.2rem;color:var(--accent);letter-spacing:6px;margin:10px 0;text-align:center}
.log{max-height:90px;overflow-y:auto;scrollbar-width:thin}
.log-entry{display:flex;gap:7px;align-items:center;padding:3px 0;border-bottom:1px solid rgba(255,255,255,.04);font-size:.68rem}
.log-x{color:var(--x)}.log-o{color:var(--o)}
.game-chat{margin-top:12px;background:#16161f;border-radius:10px;border:1px solid var(--border);overflow:hidden}
.game-chat-header{padding:8px 12px;border-bottom:1px solid var(--border);font-size:.68rem;color:var(--muted);text-transform:uppercase;letter-spacing:2px;display:flex;justify-content:space-between;align-items:center}
.game-chat-msgs{height:120px;overflow-y:auto;padding:8px;display:flex;flex-direction:column;gap:6px;scrollbar-width:thin}
.game-chat-msg{font-size:.7rem;padding:4px 8px;border-radius:8px;max-width:90%}
.game-chat-msg.mine{background:rgba(255,215,0,.12);align-self:flex-end;text-align:right}
.game-chat-msg.other{background:rgba(46,213,115,.08);align-self:flex-start}
.game-chat-input{display:flex;gap:6px;padding:8px;border-top:1px solid var(--border);align-items:center}
/* Timer */
.timer-bar{height:6px;border-radius:3px;background:var(--border);overflow:hidden;margin-bottom:10px}
.timer-fill{height:100%;border-radius:3px;transition:width 1s linear,background .5s}
.timer-display{text-align:center;font-family:'Syne',sans-serif;font-weight:800;font-size:1.4rem;margin-bottom:6px}
/* Achievement popup */
.ach-popup{position:fixed;top:20px;left:50%;transform:translateX(-50%);z-index:1000;
  background:linear-gradient(135deg,#1a0828,#0a1a10);border:2px solid var(--accent);
  border-radius:14px;padding:12px 20px;max-width:300px;width:90%;text-align:center;
  animation:popIn .4s cubic-bezier(.36,.07,.19,.97);box-shadow:0 8px 32px rgba(255,215,0,.2)}
.ach-icon{font-size:2.5rem;animation:bounce 0.5s ease infinite alternate}
.ach-title{font-family:'Syne',sans-serif;font-weight:800;font-size:.95rem;color:var(--accent);margin-top:4px}
.ach-desc{font-size:.7rem;color:var(--muted);margin-top:2px}
/* Daily bonus */
.bonus-overlay{position:fixed;inset:0;background:rgba(8,8,15,.95);display:flex;align-items:center;justify-content:center;z-index:999;padding:20px}
.bonus-box{background:var(--card);border:2px solid var(--accent);border-radius:20px;padding:28px 24px;max-width:340px;width:100%;text-align:center;animation:welcomeIn .5s cubic-bezier(.36,.07,.19,.97)}
.bonus-coins{font-family:'Syne',sans-serif;font-weight:800;font-size:3rem;color:var(--accent);animation:bounce 1s ease infinite alternate}
/* Streak badge */
.streak-badge{display:inline-flex;align-items:center;gap:4px;background:rgba(255,71,87,.15);border:1px solid rgba(255,71,87,.3);border-radius:20px;padding:4px 10px;font-size:.7rem;color:var(--x);font-weight:700}
.streak-badge.hot{background:rgba(255,215,0,.15);border-color:rgba(255,215,0,.3);color:var(--accent)}
/* Coins display */
.coins-display{display:flex;align-items:center;gap:4px;background:rgba(255,215,0,.1);border:1px solid rgba(255,215,0,.2);border-radius:20px;padding:4px 10px;font-size:.7rem;color:var(--accent);font-weight:700}
/* Coin wallet */
.coin-tabs{display:flex;gap:6px;margin-bottom:16px}
.coin-tab{flex:1;padding:9px 6px;border-radius:9px;border:1px solid var(--border);background:#16161f;
  font-family:'Space Mono',monospace;font-size:.68rem;cursor:pointer;transition:all .18s;text-align:center;color:var(--muted);text-transform:uppercase;letter-spacing:1px}
.coin-tab.active{border-color:var(--accent);background:rgba(255,215,0,.08);color:var(--accent);font-weight:700}
.coin-hist-item{display:flex;justify-content:space-between;align-items:center;padding:10px 12px;
  border-radius:9px;background:#16161f;border:1px solid var(--border);margin-bottom:7px}
.coin-hist-amount{font-family:'Syne',sans-serif;font-weight:800;font-size:1rem}
.coin-hist-deposit{color:#2ed573}.coin-hist-withdraw{color:#ff4757}.coin-hist-win{color:var(--accent)}
/* Chat popup */
.chat-popup{position:fixed;top:20px;left:50%;transform:translateX(-50%);z-index:999;
  background:var(--card);border:2px solid var(--o);border-radius:14px;padding:12px 16px;
  max-width:300px;width:90%;animation:popIn .3s cubic-bezier(.36,.07,.19,.97);box-shadow:0 8px 32px rgba(0,0,0,.5)}
@keyframes popIn{0%{transform:translateX(-50%) translateY(-20px);opacity:0}100%{transform:translateX(-50%) translateY(0);opacity:1}}
.chat-popup-name{font-size:.65rem;color:var(--o);font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px}
.chat-popup-text{font-size:.8rem;color:#f0ede8;line-height:1.4}
/* Voice note */
.voice-btn{width:40px;height:40px;border-radius:50%;border:none;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all .18s;flex-shrink:0;font-size:1.1rem}
.voice-btn.idle{background:rgba(255,71,87,.15);color:var(--x)}
.voice-btn.recording{background:var(--x);color:#fff;animation:pulse-rec .6s ease infinite alternate}
@keyframes pulse-rec{from{box-shadow:0 0 0 0 rgba(255,71,87,.5)}to{box-shadow:0 0 0 8px rgba(255,71,87,0)}}
.voice-msg-btn{background:rgba(46,213,115,.15);border:1px solid rgba(46,213,115,.3);color:var(--o);border-radius:20px;padding:5px 12px;font-size:.72rem;cursor:pointer;display:flex;align-items:center;gap:6px}
.emoji-row{display:flex;gap:5px;padding:6px 0;flex-wrap:wrap}
.emoji-btn{background:#16161f;border:1px solid var(--border);border-radius:7px;padding:5px 7px;font-size:.95rem;cursor:pointer;transition:all .15s}
.emoji-btn:hover{background:#22223a;transform:scale(1.1)}
/* Welcome screen */
.welcome-overlay{position:fixed;inset:0;background:rgba(8,8,15,.97);display:flex;align-items:center;justify-content:center;z-index:1000;padding:20px}
.welcome-box{background:var(--card);border:2px solid var(--accent);border-radius:20px;padding:32px 24px;max-width:380px;width:100%;text-align:center;animation:welcomeIn .5s cubic-bezier(.36,.07,.19,.97)}
@keyframes welcomeIn{0%{transform:scale(.7) translateY(40px);opacity:0}100%{transform:scale(1) translateY(0);opacity:1}}
.welcome-emoji{font-size:3.5rem;margin-bottom:12px;animation:bounce 1s ease infinite alternate}
@keyframes bounce{from{transform:translateY(0)}to{transform:translateY(-8px)}}
.welcome-title{font-family:'Syne',sans-serif;font-weight:800;font-size:1.3rem;color:var(--accent);margin-bottom:12px;line-height:1.3}
.welcome-msg{font-size:.78rem;color:#f0ede8;line-height:1.7;margin-bottom:20px;opacity:.9}
.welcome-name{color:var(--accent);font-weight:700}
/* Symbol picker */
.symbol-pick{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:8px 0}
.symbol-btn{padding:14px;border-radius:10px;border:2px solid var(--border);background:#16161f;cursor:pointer;transition:all .18s;text-align:center;font-family:'Syne',sans-serif;font-weight:800;font-size:1.4rem}
.symbol-btn.active-x{border-color:var(--x);background:rgba(255,71,87,.12);color:var(--x)}
.symbol-btn.active-o{border-color:var(--o);background:rgba(46,213,115,.12);color:var(--o)}
.symbol-btn:not(.active-x):not(.active-o):hover{border-color:var(--muted)}
/* First player picker */
.first-pick{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:8px 0}
.first-btn{padding:12px 8px;border-radius:10px;border:2px solid var(--border);background:#16161f;cursor:pointer;transition:all .18s;text-align:center;font-size:.75rem;font-family:'Space Mono',monospace}
.first-btn.active{border-color:var(--accent);background:rgba(255,215,0,.08);color:var(--accent);font-weight:700}
/* Round indicator */
.round-indicator{text-align:center;font-size:.65rem;color:var(--muted);margin-bottom:8px;text-transform:uppercase;letter-spacing:2px}
@media(max-width:380px){.btn{font-size:.72rem;padding:11px}.score-num{font-size:1.2rem}}
`;

const Logo = ({small}) => (
  <div className="logo" style={small?{fontSize:"1.4rem"}:{}}>
    <span className="lf">Favs</span><span className="lx">Tic</span>
    <span className="lm">✕</span><span className="lo">Tac</span>
    <span className="lovers">Lovers</span>
  </div>
);

const AvatarComp = ({user, size="sm"}) => {
  const ini = (n) => n?.slice(0,2).toUpperCase()||"??";
  const style = size==="lg" ? "avatar-lg" : size==="md" ? "avatar-md" : "avatar";
  return (
    <div className={style}>
      {user?.photoURL ? <img src={user.photoURL} alt=""/> : ini(user?.username)}
      {size==="lg" && <div className="avatar-edit">✏️</div>}
    </div>
  );
};

// ── MAIN APP ──────────────────────────────────────────────────────────────────
export default function App() {
  const [fbReady, setFbReady] = useState(false);
  const [fbError, setFbError] = useState(false);
  const [authUser, setAuthUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authScreen, setAuthScreen] = useState("login");
  const [authForm, setAuthForm] = useState({email:"",username:"",password:"",confirm:""});
  const [authError, setAuthError] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotMsg, setForgotMsg] = useState("");
  const [forgotBusy, setForgotBusy] = useState(false);

  // Screens & game
  const [screen, setScreen] = useState("home");
  const [mode, setMode] = useState("local");
  const [boardSize, setBoardSize] = useState(3); // 3, 4, or 5
  const [players, setPlayers] = useState({X:"",O:""});
  const [board, setBoard] = useState(Array(9).fill(null));
  const [turn, setTurn] = useState("X");
  const [scores, setScores] = useState({X:0,O:0,draw:0});
  const [result, setResult] = useState(null);
  const [winLine, setWinLine] = useState(null);
  const [moveLog, setMoveLog] = useState([]);
  const [animCell, setAnimCell] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [myHistory, setMyHistory] = useState([]);
  const [onlineRoom, setOnlineRoom] = useState("");
  // In-app notifications
  const [notifications, setNotifications] = useState([]);
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [showNotifs, setShowNotifs] = useState(false);
  // Global announcements
  const [globalAnnouncements, setGlobalAnnouncements] = useState([]);
  const [dismissedAnnouncements, setDismissedAnnouncements] = useState([]);
  const [onlineRole, setOnlineRole] = useState(null);
  const [roomInput, setRoomInput] = useState("");
  const [waitingForOpponent, setWaitingForOpponent] = useState(false);
  const [roomError, setRoomError] = useState("");

  // Profile editing
  const [editUsername, setEditUsername] = useState("");
  const [editUsernameMsg, setEditUsernameMsg] = useState("");
  const [editUsernameBusy, setEditUsernameBusy] = useState(false);
  const [editEmail, setEditEmail] = useState("");
  const [editEmailPw, setEditEmailPw] = useState("");
  const [editEmailMsg, setEditEmailMsg] = useState("");
  const [editEmailBusy, setEditEmailBusy] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoMsg, setPhotoMsg] = useState("");
  const fileInputRef = useRef(null);

  // Private messaging
  const [msgTab, setMsgTab] = useState("inbox"); // inbox | search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchBusy, setSearchBusy] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [activeConvo, setActiveConvo] = useState(null);
  const [privMessages, setPrivMessages] = useState([]);
  const [privInput, setPrivInput] = useState("");
  const [privSending, setPrivSending] = useState(false);
  const [viewingProfile, setViewingProfile] = useState(null);
  const [totalUnread, setTotalUnread] = useState(0);
  const privEndRef = useRef(null);
  // Friend system
  const [friends, setFriends] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [friendSearch, setFriendSearch] = useState("");
  const [friendSearchResults, setFriendSearchResults] = useState([]);
  const [friendSearchBusy, setFriendSearchBusy] = useState(false);
  const [friendMsg, setFriendMsg] = useState("");
  const [totalFriendRequests, setTotalFriendRequests] = useState(0);
  const [onlineFriends, setOnlineFriends] = useState([]);
  const unsubFriendsRef = useRef(null);

  // Game chat
  const [gameChatMsgs, setGameChatMsgs] = useState([]);
  const [gameChatInput, setGameChatInput] = useState("");
  const [showGameChat, setShowGameChat] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [welcomeName, setWelcomeName] = useState("");
  // Feedback
  const [feedbackType, setFeedbackType] = useState("general");
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackBusy, setFeedbackBusy] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState("");
  // Game setup
  const [setupMode, setSetupMode] = useState("local");
  const [p1Name, setP1Name] = useState("");
  const [p2Name, setP2Name] = useState("");
  const [p1Symbol, setP1Symbol] = useState("X");
  const [firstPlayer, setFirstPlayer] = useState("p1");
  const [roundStarter, setRoundStarter] = useState("p1");
  // Timer mode
  const [timerMode, setTimerMode] = useState(false);
  const [timePerMove, setTimePerMove] = useState(15);
  const [timeLeft, setTimeLeft] = useState(15);
  const timerRef = useRef(null);
  // Streaks & achievements
  const [streak, setStreak] = useState(0);
  const [userStats, setUserStats] = useState({wins:0,draws:0,games:0,streak:0,bestStreak:0,achievements:[]});
  const [newAchievement, setNewAchievement] = useState(null);
  const [showAchievements, setShowAchievements] = useState(false);
  // Daily login bonus
  const [showLoginBonus, setShowLoginBonus] = useState(false);
  const [loginBonusCoins, setLoginBonusCoins] = useState(0);
  const [userCoins, setUserCoins] = useState(0);
  // Themes & symbols
  const [activeTheme, setActiveTheme] = useState("dark");
  const [ownedThemes, setOwnedThemes] = useState(["dark"]);
  const [activeSymbols, setActiveSymbols] = useState({X:"default", O:"default"});
  const [ownedSymbols, setOwnedSymbols] = useState(["default"]);
  // Chat popup & voice notes
  const [chatPopup, setChatPopup] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);
  const gameChatEndRef = useRef(null);

  const resultHandledRef = useRef(false);
  const unsubRoomRef = useRef(null);
  const unsubPrivRef = useRef(null);
  const unsubConvosRef = useRef(null);
  const unsubGameChatRef = useRef(null);

  const EMOJIS = ["😂","🔥","👏","😮","🤝","😤","🎮","💪","🏆","👑"];

  // ── INIT ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    initFirebase().then(ok => {
      if (ok) {
        setFbReady(true);
        const {onAuthStateChanged} = window._fb;
        onAuthStateChanged(window._fb.auth, async (user) => {
          if (user) {
            const profile = await getUserProfile(user.uid);
            setAuthUser({uid:user.uid, email:user.email, username:profile?.username||user.displayName||"Player", photoURL:profile?.photoURL||user.photoURL||null});
            loadLeaderboard(); loadMyHistory(user.uid);
          } else { setAuthUser(null); }
          setAuthLoading(false);
        });
      } else { setFbError(true); setAuthLoading(false); }
    });
  }, []);

  // Subscribe conversations when on messages screen
  useEffect(() => {
    if (!fbReady||!authUser||screen!=="messages") return;
    subscribeConversations();
    return () => unsubConvosRef.current?.();
  }, [fbReady, authUser, screen]);

  // Subscribe private messages when active conversation open
  useEffect(() => {
    if (!activeConvo||!authUser) return;
    const convoId = getConvoId(authUser.uid, activeConvo.uid);
    const {collection, query, orderBy, onSnapshot} = window._fb;
    unsubPrivRef.current?.();
    const q = query(collection(db,`conversations/${convoId}/messages`), orderBy("createdAt","asc"));
    unsubPrivRef.current = onSnapshot(q, snap => {
      setPrivMessages(snap.docs.map(d=>({id:d.id,...d.data()})));
      setTimeout(()=>privEndRef.current?.scrollIntoView({behavior:"smooth"}), 100);
    });
    // Mark as read
    markRead(convoId);
    return () => unsubPrivRef.current?.();
  }, [activeConvo]);

  // ── HELPERS ─────────────────────────────────────────────────────────────────
  const getConvoId = (uid1, uid2) => [uid1,uid2].sort().join("_");

  const getUserProfile = async (uid) => {
    const {doc, getDoc} = window._fb;
    try { const s=await getDoc(doc(db,"users",uid)); return s.exists()?s.data():null; } catch { return null; }
  };

  const loadLeaderboard = async () => {
    const {collection, query, orderBy, limit, getDocs} = window._fb;
    try {
      const q=query(collection(db,"leaderboard"),orderBy("wins","desc"),limit(20));
      const snap=await getDocs(q);
      setLeaderboard(snap.docs.map(d=>({id:d.id,...d.data()})));
    } catch {}
  };

  const loadMyHistory = async (uid) => {
    const {collection, query, orderBy, limit, getDocs} = window._fb;
    try {
      const q=query(collection(db,`users/${uid}/history`),orderBy("createdAt","desc"),limit(30));
      const snap=await getDocs(q);
      setMyHistory(snap.docs.map(d=>({id:d.id,...d.data()})));
    } catch {}
  };

  const saveGameToFirestore = async (res, log, pls) => {
    const {doc, setDoc, getDoc, updateDoc, serverTimestamp, collection} = window._fb;
    const winner = res==="draw"?null:res.winner;
    setScores(s=>({X:s.X+(winner==="X"?1:0),O:s.O+(winner==="O"?1:0),draw:s.draw+(res==="draw"?1:0)}));
    if (authUser) {
      const isX=pls.X===authUser.username; const won=isX?winner==="X":winner==="O";
      const isDraw=res==="draw";
      const lbRef=doc(db,"leaderboard",authUser.uid);
      const lbSnap=await getDoc(lbRef);
      if(lbSnap.exists()){await updateDoc(lbRef,{wins:(lbSnap.data().wins||0)+(won?1:0),draws:(lbSnap.data().draws||0)+(isDraw?1:0),games:(lbSnap.data().games||0)+1});}
      else{await setDoc(lbRef,{username:authUser.username,photoURL:authUser.photoURL||null,wins:won?1:0,draws:isDraw?1:0,games:1});}
      const histRef=doc(collection(db,`users/${authUser.uid}/history`));
      await setDoc(histRef,{players:pls,winner:winner||"Draw",moves:log.length,mode,createdAt:serverTimestamp()});
      // Update streak & achievements
      await updateUserStats(won, isDraw, mode==="ai", timerMode&&won);
    }
    loadLeaderboard(); if(authUser) loadMyHistory(authUser.uid);
  };

  // ── PRIVATE MESSAGING ───────────────────────────────────────────────────────
  const subscribeConversations = () => {
    const {collection, query, where, orderBy, onSnapshot} = window._fb;
    unsubConvosRef.current?.();
    const q = query(collection(db,"conversations"), where("members","array-contains",authUser.uid), orderBy("lastAt","desc"));
    unsubConvosRef.current = onSnapshot(q, snap => {
      const convos = snap.docs.map(d=>({id:d.id,...d.data()}));
      setConversations(convos);
      const unread = convos.reduce((sum,c)=>sum+(c[`unread_${authUser.uid}`]||0),0);
      setTotalUnread(unread);
    });
  };

  const searchUsers = async () => {
    if (!searchQuery.trim()) return;
    setSearchBusy(true);
    const {collection, getDocs} = window._fb;
    try {
      const snap = await getDocs(collection(db,"users"));
      const results = snap.docs
        .map(d=>({uid:d.id,...d.data()}))
        .filter(u=>u.uid!==authUser.uid && u.username?.toLowerCase().includes(searchQuery.toLowerCase()));
      setSearchResults(results);
    } catch {}
    setSearchBusy(false);
  };

  const openConversation = async (otherUser) => {
    setActiveConvo(otherUser);
    setScreen("private-chat");
  };

  const markRead = async (convoId) => {
    const {doc, updateDoc} = window._fb;
    try { await updateDoc(doc(db,"conversations",convoId), {[`unread_${authUser.uid}`]:0}); } catch {}
  };

  const sendPrivMessage = async () => {
    if (!privInput.trim()||privSending||!activeConvo) return;
    setPrivSending(true);
    const {doc, setDoc, getDoc, updateDoc, addDoc, collection, serverTimestamp} = window._fb;
    const convoId = getConvoId(authUser.uid, activeConvo.uid);
    const text = privInput.trim();
    setPrivInput("");
    try {
      // Create/update conversation doc
      const convoRef = doc(db,"conversations",convoId);
      const convoSnap = await getDoc(convoRef);
      const now = serverTimestamp();
      if (!convoSnap.exists()) {
        await setDoc(convoRef, {
          members:[authUser.uid, activeConvo.uid],
          memberNames:{[authUser.uid]:authUser.username,[activeConvo.uid]:activeConvo.username},
          memberPhotos:{[authUser.uid]:authUser.photoURL||null,[activeConvo.uid]:activeConvo.photoURL||null},
          lastMsg:text, lastAt:now,
          [`unread_${activeConvo.uid}`]:1,
          [`unread_${authUser.uid}`]:0,
        });
      } else {
        await updateDoc(convoRef, {
          lastMsg:text, lastAt:now,
          [`unread_${activeConvo.uid}`]:(convoSnap.data()[`unread_${activeConvo.uid}`]||0)+1,
        });
      }
      // Add message
      await addDoc(collection(db,`conversations/${convoId}/messages`), {
        text, senderUid:authUser.uid, senderName:authUser.username,
        senderPhoto:authUser.photoURL||null, createdAt:now,
      });
      // Send notification to recipient
      await sendNotification(activeConvo.uid, "message", "💬 New Message",
        `${authUser.username}: ${text.slice(0,50)}${text.length>50?"...":""}`);
    } catch(e) { console.error(e); }
    setPrivSending(false);
  };

  const viewPlayerProfile = async (user) => {
    // Load their leaderboard stats
    const {doc, getDoc} = window._fb;
    try {
      const lbSnap = await getDoc(doc(db,"leaderboard",user.uid));
      const stats = lbSnap.exists() ? lbSnap.data() : {wins:0,draws:0,games:0};
      setViewingProfile({...user, ...stats});
    } catch { setViewingProfile(user); }
    setScreen("view-profile");
  };

  // ── AUTH ────────────────────────────────────────────────────────────────────
  const handleRegister = async () => {
    setAuthError(""); setAuthBusy(true);
    const {email,username,password,confirm} = authForm;
    if(!email||!username||!password){setAuthError("All fields are required.");setAuthBusy(false);return;}
    if(!/^[^@]+@[^@]+\.[^@]+$/.test(email)){setAuthError("Enter a valid email.");setAuthBusy(false);return;}
    if(username.length<2){setAuthError("Username must be at least 2 characters.");setAuthBusy(false);return;}
    if(password.length<6){setAuthError("Password must be at least 6 characters.");setAuthBusy(false);return;}
    if(password!==confirm){setAuthError("Passwords do not match.");setAuthBusy(false);return;}
    try {
      const {createUserWithEmailAndPassword,updateProfile} = window._fb;
      const {doc,setDoc} = window._fb;
      const cred = await createUserWithEmailAndPassword(window._fb.auth, email, password);
      await updateProfile(cred.user, {displayName:username});
      await setDoc(doc(db,"users",cred.user.uid), {username,email,photoURL:null,createdAt:Date.now()});
      setAuthForm({email:"",username:"",password:"",confirm:""});
      setWelcomeName(username);
      setShowWelcome(true);
    } catch(e) {
      setAuthError(e.code==="auth/email-already-in-use"?"Email already registered.":e.code==="auth/weak-password"?"Password too weak.":e.message);
    }
    setAuthBusy(false);
  };

  const handleLogin = async () => {
    setAuthError(""); setAuthBusy(true);
    const {email,password} = authForm;
    if(!email||!password){setAuthError("Email and password required.");setAuthBusy(false);return;}
    try {
      await window._fb.signInWithEmailAndPassword(window._fb.auth, email, password);
      setAuthForm({email:"",username:"",password:"",confirm:""});
    } catch(e) {
      setAuthError(e.code==="auth/user-not-found"||e.code==="auth/invalid-credential"?"No account found or wrong password.":e.code==="auth/wrong-password"?"Incorrect password.":e.code==="auth/too-many-requests"?"Too many attempts. Try again later.":e.message);
    }
    setAuthBusy(false);
  };

  const handleForgotPassword = async (emailToUse) => {
    setForgotMsg(""); setForgotBusy(true);
    const em = emailToUse || forgotEmail;
    if(!em){setForgotMsg("error:Enter your email.");setForgotBusy(false);return;}
    try {
      await window._fb.sendPasswordResetEmail(window._fb.auth, em);
      setForgotMsg("success:Reset email sent! Check your inbox 📧");
    } catch(e) { setForgotMsg("error:"+(e.code==="auth/user-not-found"?"No account with this email.":e.message)); }
    setForgotBusy(false);
  };

  // ── COIN SYSTEM ─────────────────────────────────────────────────────────────
  const [coinScreen, setCoinScreen] = useState("wallet"); // wallet | deposit | withdraw | history
  const [coinAmount, setCoinAmount] = useState("");
  const [coinBusy, setCoinBusy] = useState(false);
  const [coinMsg, setCoinMsg] = useState("");
  const [coinHistory, setCoinHistory] = useState([]);
  const [coinHistoryLoading, setCoinHistoryLoading] = useState(false);

  const loadCoinHistory = async () => {
    setCoinHistoryLoading(true);
    const {collection, query, orderBy, limit, getDocs} = window._fb;
    try {
      const snap = await getDocs(query(collection(db,`users/${authUser.uid}/coin_history`), orderBy("createdAt","desc"), limit(30)));
      setCoinHistory(snap.docs.map(d=>({id:d.id,...d.data()})));
    } catch { setCoinHistory([]); }
    setCoinHistoryLoading(false);
  };

  const depositCoins = async () => {
    const amount = parseInt(coinAmount);
    if(!amount||amount<=0){setCoinMsg("error:Enter a valid amount.");return;}
    if(amount<10){setCoinMsg("error:Minimum deposit is 10 coins.");return;}
    if(amount>10000){setCoinMsg("error:Maximum deposit is 10,000 coins.");return;}
    setCoinBusy(true); setCoinMsg("");
    try {
      const {doc, updateDoc, addDoc, collection, serverTimestamp, getDoc} = window._fb;
      const snap = await getDoc(doc(db,"user_stats",authUser.uid));
      const cur = snap.exists()?snap.data():{coins:0};
      const newCoins = (cur.coins||0) + amount;
      await updateDoc(doc(db,"user_stats",authUser.uid),{coins:newCoins});
      await addDoc(collection(db,`users/${authUser.uid}/coin_history`),{
        type:"deposit", amount, balance:newCoins,
        description:`Deposited ${amount} coins`,
        createdAt:serverTimestamp(),
      });
      setUserCoins(newCoins);
      setCoinAmount("");
      setCoinMsg("success:"+amount+" coins deposited successfully! 🪙");
      loadCoinHistory();
    } catch { setCoinMsg("error:Deposit failed. Try again."); }
    setCoinBusy(false);
    setTimeout(()=>setCoinMsg(""),4000);
  };

  const withdrawCoins = async () => {
    const amount = parseInt(coinAmount);
    if(!amount||amount<=0){setCoinMsg("error:Enter a valid amount.");return;}
    if(amount<10){setCoinMsg("error:Minimum withdrawal is 10 coins.");return;}
    if(amount>userCoins){setCoinMsg("error:Insufficient coins. You only have 🪙 "+userCoins);return;}
    setCoinBusy(true); setCoinMsg("");
    try {
      const {doc, updateDoc, addDoc, collection, serverTimestamp, getDoc} = window._fb;
      const snap = await getDoc(doc(db,"user_stats",authUser.uid));
      const cur = snap.exists()?snap.data():{coins:0};
      const newCoins = (cur.coins||0) - amount;
      await updateDoc(doc(db,"user_stats",authUser.uid),{coins:newCoins});
      await addDoc(collection(db,`users/${authUser.uid}/coin_history`),{
        type:"withdraw", amount, balance:newCoins,
        description:`Withdrew ${amount} coins`,
        createdAt:serverTimestamp(),
      });
      setUserCoins(newCoins);
      setCoinAmount("");
      setCoinMsg("success:"+amount+" coins withdrawn successfully! ✅");
      loadCoinHistory();
    } catch { setCoinMsg("error:Withdrawal failed. Try again."); }
    setCoinBusy(false);
    setTimeout(()=>setCoinMsg(""),4000);
  };

  // ── FRIEND SYSTEM ────────────────────────────────────────────────────────────
  const loadFriends = async () => {
    const {collection, getDocs, query, where, doc, getDoc} = window._fb;
    try {
      // Load friends
      const friendsSnap = await getDocs(collection(db,`users/${authUser.uid}/friends`));
      const friendsData = friendsSnap.docs.map(d=>({uid:d.id,...d.data()}));
      setFriends(friendsData);
      // Load friend requests received
      const reqSnap = await getDocs(query(collection(db,"friend_requests"), where("toUid","==",authUser.uid), where("status","==","pending")));
      const reqData = reqSnap.docs.map(d=>({id:d.id,...d.data()}));
      setFriendRequests(reqData);
      setTotalFriendRequests(reqData.length);
      // Load sent requests
      const sentSnap = await getDocs(query(collection(db,"friend_requests"), where("fromUid","==",authUser.uid), where("status","==","pending")));
      setSentRequests(sentSnap.docs.map(d=>({id:d.id,...d.data()})));
    } catch(e){ console.error(e); }
  };

  // Subscribe to friend requests for notification badge
  useEffect(()=>{
    if(!authUser||!fbReady) return;
    const {collection, query, where, onSnapshot} = window._fb;
    const q = query(collection(db,"friend_requests"), where("toUid","==",authUser.uid), where("status","==","pending"));
    const unsub = onSnapshot(q, snap=>{
      setTotalFriendRequests(snap.docs.length);
      setFriendRequests(snap.docs.map(d=>({id:d.id,...d.data()})));
    });
    return ()=>unsub();
  },[authUser?.uid, fbReady]);

  // Subscribe to in-app notifications
  useEffect(()=>{
    if(!authUser||!fbReady) return;
    const {collection, query, where, orderBy, limit, onSnapshot} = window._fb;
    const q = query(
      collection(db,`users/${authUser.uid}/notifications`),
      orderBy("createdAt","desc"),
      limit(50)
    );
    const unsub = onSnapshot(q, snap=>{
      const notifs = snap.docs.map(d=>({id:d.id,...d.data()}));
      setNotifications(notifs);
      setUnreadNotifs(notifs.filter(n=>!n.read).length);
    });
    return ()=>unsub();
  },[authUser?.uid, fbReady]);

  // Subscribe to global announcements
  useEffect(()=>{
    if(!fbReady) return;
    const {collection, query, orderBy, limit, onSnapshot} = window._fb;
    const q = query(collection(db,"announcements"), orderBy("createdAt","desc"), limit(5));
    const unsub = onSnapshot(q, snap=>{
      const newAnnouncements = snap.docs.map(d=>({id:d.id,...d.data()}));
      setGlobalAnnouncements(newAnnouncements);
      // Send notification for new announcements
      if(authUser && newAnnouncements.length>0){
        const latest = newAnnouncements[0];
        const dismissed = JSON.parse(localStorage.getItem("dismissedAnnouncements")||"[]");
        if(!dismissed.includes(latest.id)){
          setUnreadNotifs(n=>n+1);
        }
      }
    });
    return ()=>unsub();
  },[fbReady, authUser?.uid]);

  const dismissAnnouncement = (id) => {
    const dismissed = JSON.parse(localStorage.getItem("dismissedAnnouncements")||"[]");
    dismissed.push(id);
    localStorage.setItem("dismissedAnnouncements", JSON.stringify(dismissed));
    setDismissedAnnouncements([...dismissed]);
  };

  // Helper to send notification
  const sendNotification = async (toUid, type, title, body, data={}) => {
    if(!toUid||toUid===authUser.uid) return;
    const {collection, addDoc, serverTimestamp} = window._fb;
    try {
      await addDoc(collection(db,`users/${toUid}/notifications`),{
        type, title, body, data,
        read:false, createdAt:serverTimestamp(),
        fromUid:authUser.uid, fromUsername:authUser.username,
        fromPhoto:authUser.photoURL||null,
      });
    } catch(e){ console.error(e); }
  };

  // Mark notification as read
  const markNotifRead = async (notifId) => {
    const {doc, updateDoc} = window._fb;
    try { await updateDoc(doc(db,`users/${authUser.uid}/notifications`,notifId),{read:true}); } catch {}
  };

  // Mark all notifications as read
  const markAllNotifsRead = async () => {
    const {doc, updateDoc} = window._fb;
    try {
      for(const n of notifications.filter(n=>!n.read)){
        await updateDoc(doc(db,`users/${authUser.uid}/notifications`,n.id),{read:true});
      }
    } catch {}
  };

  // Update online status
  useEffect(()=>{
    if(!authUser||!fbReady) return;
    const {doc, updateDoc, setDoc} = window._fb;
    const updateOnline = async () => {
      try {
        await setDoc(doc(db,"online_users",authUser.uid),{
          uid:authUser.uid, username:authUser.username,
          photoURL:authUser.photoURL||null, lastSeen:Date.now(), online:true,
        });
      } catch {}
    };
    updateOnline();
    const interval = setInterval(updateOnline, 30000);
    return ()=>{ clearInterval(interval);
      try { window._fb.updateDoc(window._fb.doc(db,"online_users",authUser.uid),{online:false,lastSeen:Date.now()}); } catch {}
    };
  },[authUser?.uid, fbReady]);

  const searchFriends = async () => {
    if(!friendSearch.trim()){setFriendMsg("error:Enter a username to search.");return;}
    setFriendSearchBusy(true); setFriendSearchResults([]);
    const {collection, getDocs} = window._fb;
    try {
      const snap = await getDocs(collection(db,"users"));
      const results = snap.docs
        .map(d=>({uid:d.id,...d.data()}))
        .filter(u=>u.uid!==authUser.uid && u.username?.toLowerCase().includes(friendSearch.toLowerCase()));
      setFriendSearchResults(results);
      if(results.length===0) setFriendMsg("error:No players found for '"+friendSearch+"'");
    } catch { setFriendMsg("error:Search failed. Try again."); }
    setFriendSearchBusy(false);
  };

  const sendFriendRequest = async (toUser) => {
    setFriendMsg("");
    // Check if already friends
    const alreadyFriend = friends.find(f=>f.uid===toUser.uid);
    if(alreadyFriend){setFriendMsg("error:You are already friends with "+toUser.username+"!");return;}
    // Check if already sent
    const alreadySent = sentRequests.find(r=>r.toUid===toUser.uid);
    if(alreadySent){setFriendMsg("error:Friend request already sent to "+toUser.username+"!");return;}
    try {
      const {collection, addDoc, serverTimestamp} = window._fb;
      await addDoc(collection(db,"friend_requests"),{
        fromUid:authUser.uid, fromUsername:authUser.username, fromPhoto:authUser.photoURL||null,
        toUid:toUser.uid, toUsername:toUser.username,
        status:"pending", createdAt:serverTimestamp(),
      });
      // Send notification
      await sendNotification(toUser.uid, "friend_request", "👥 Friend Request",
        `${authUser.username} sent you a friend request!`, {fromUid:authUser.uid});
      setSentRequests(s=>[...s,{toUid:toUser.uid}]);
      setFriendMsg("success:Friend request sent to "+toUser.username+"! 🎉");
    } catch { setFriendMsg("error:Failed to send request. Try again."); }
    setTimeout(()=>setFriendMsg(""),3000);
  };

  const acceptFriendRequest = async (req) => {
    try {
      const {doc, updateDoc, setDoc} = window._fb;
      // Update request status
      await updateDoc(doc(db,"friend_requests",req.id),{status:"accepted"});
      // Add to both users' friend lists
      await setDoc(doc(db,`users/${authUser.uid}/friends`,req.fromUid),{
        uid:req.fromUid, username:req.fromUsername, photoURL:req.fromPhoto||null, addedAt:Date.now(),
      });
      await setDoc(doc(db,`users/${req.fromUid}/friends`,authUser.uid),{
        uid:authUser.uid, username:authUser.username, photoURL:authUser.photoURL||null, addedAt:Date.now(),
      });
      setFriends(f=>[...f,{uid:req.fromUid, username:req.fromUsername, photoURL:req.fromPhoto||null}]);
      setFriendRequests(r=>r.filter(r=>r.id!==req.id));
      // Send notification to requester
      await sendNotification(req.fromUid, "friend_accepted", "✅ Friend Request Accepted",
        `${authUser.username} accepted your friend request! You are now friends 🎉`);
      setFriendMsg("success:You and "+req.fromUsername+" are now friends! 🎉");
    } catch { setFriendMsg("error:Failed to accept. Try again."); }
    setTimeout(()=>setFriendMsg(""),3000);
  };

  const declineFriendRequest = async (req) => {
    try {
      const {doc, updateDoc} = window._fb;
      await updateDoc(doc(db,"friend_requests",req.id),{status:"declined"});
      setFriendRequests(r=>r.filter(r=>r.id!==req.id));
    } catch {}
  };

  const removeFriend = async (friendUid, friendUsername) => {
    try {
      const {doc, deleteDoc} = window._fb;
      await deleteDoc(doc(db,`users/${authUser.uid}/friends`,friendUid));
      await deleteDoc(doc(db,`users/${friendUid}/friends`,authUser.uid));
      setFriends(f=>f.filter(f=>f.uid!==friendUid));
      setFriendMsg("success:"+friendUsername+" removed from friends.");
    } catch { setFriendMsg("error:Failed to remove friend."); }
    setTimeout(()=>setFriendMsg(""),3000);
  };

  const challengeFriend = async (friend) => {
    // Create online room and send them a message with the room code
    const {doc, setDoc, addDoc, collection, serverTimestamp, getDoc, updateDoc} = window._fb;
    const room = Math.random().toString(36).slice(2,8).toUpperCase();
    await setDoc(doc(db,"rooms",room),{
      board:Array(9).fill(null), turn:"X", moveLog:[], result:null, winLine:null,
      hostUid:authUser.uid, hostName:authUser.username,
      guestUid:null, guestName:null, createdAt:serverTimestamp(),
    });
    // Send message to friend with room code
    const convoId = getConvoId(authUser.uid, friend.uid);
    const convoRef = doc(db,"conversations",convoId);
    const convoSnap = await getDoc(convoRef);
    const now = serverTimestamp();
    const challengeMsg = `⚡ GAME CHALLENGE! I challenge you to a Tic Tac Toe match! Join my room with code: ${room} 🎮`;
    if(!convoSnap.exists()){
      await setDoc(convoRef,{
        members:[authUser.uid,friend.uid],
        memberNames:{[authUser.uid]:authUser.username,[friend.uid]:friend.username},
        memberPhotos:{[authUser.uid]:authUser.photoURL||null,[friend.uid]:friend.photoURL||null},
        lastMsg:challengeMsg, lastAt:now,
        [`unread_${friend.uid}`]:1, [`unread_${authUser.uid}`]:0,
      });
    } else {
      await updateDoc(convoRef,{lastMsg:challengeMsg,lastAt:now,[`unread_${friend.uid}`]:(convoSnap.data()[`unread_${friend.uid}`]||0)+1});
    }
    await addDoc(collection(db,`conversations/${convoId}/messages`),{
      text:challengeMsg, senderUid:authUser.uid, senderName:authUser.username,
      senderPhoto:authUser.photoURL||null, createdAt:now,
    });
    setFriendMsg("success:Challenge sent to "+friend.username+"! Room: "+room+" 🎮");
    setTimeout(()=>setFriendMsg(""),5000);
  };

  const submitFeedback = async () => {
    if(!feedbackText.trim()){setFeedbackMsg("error:Please write your feedback.");return;}
    setFeedbackBusy(true); setFeedbackMsg("");
    try {
      const {collection, addDoc, serverTimestamp} = window._fb;
      await addDoc(collection(db,"feedback"),{
        text:feedbackText.trim(), type:feedbackType, rating:feedbackRating,
        uid:authUser.uid, username:authUser.username, email:authUser.email,
        createdAt:serverTimestamp(),
      });
      setFeedbackText(""); setFeedbackRating(5); setFeedbackType("general");
      setFeedbackMsg("success:Thank you for your feedback! 🙏");
    } catch { setFeedbackMsg("error:Failed to submit. Try again."); }
    setFeedbackBusy(false);
  };

  // ── ACHIEVEMENTS DEFINITIONS ────────────────────────────────────────────────
  // ── THEMES & SYMBOLS DEFINITIONS ───────────────────────────────────────────
  const THEMES = [
    {id:"dark", name:"Dark Night", price:0, colors:{bg:"#08080f",card:"#111118",border:"#22223a",accent:"#ffd700",x:"#ff4757",o:"#2ed573",muted:"#5a5a7a"}, preview:["#08080f","#111118","#ffd700"]},
    {id:"ocean", name:"Ocean Blue", price:100, colors:{bg:"#020d1a",card:"#051525",border:"#0a3060",accent:"#00d4ff",x:"#ff6b6b",o:"#00d4ff",muted:"#3a6080"}, preview:["#020d1a","#051525","#00d4ff"]},
    {id:"fire", name:"Fire Red", price:100, colors:{bg:"#1a0500",card:"#2a0800",border:"#5a1500",accent:"#ff6600",x:"#ff6600",o:"#ffd700",muted:"#7a3a1a"}, preview:["#1a0500","#2a0800","#ff6600"]},
    {id:"forest", name:"Forest Green", price:100, colors:{bg:"#010a03",card:"#051508",border:"#0a3010",accent:"#00ff7f",x:"#ff4757",o:"#00ff7f",muted:"#2a6040"}, preview:["#010a03","#051508","#00ff7f"]},
    {id:"galaxy", name:"Galaxy Purple", price:150, colors:{bg:"#05010f",card:"#0d0520",border:"#2a1060",accent:"#bf5fff",x:"#ff4757",o:"#bf5fff",muted:"#5a3a7a"}, preview:["#05010f","#0d0520","#bf5fff"]},
    {id:"sunset", name:"Sunset Orange", price:150, colors:{bg:"#1a0a00",card:"#251200",border:"#5a2a00",accent:"#ff8c00",x:"#ff4757",o:"#ff8c00",muted:"#7a4a1a"}, preview:["#1a0a00","#251200","#ff8c00"]},
    {id:"ice", name:"Ice Crystal", price:200, colors:{bg:"#010a1a",card:"#051525",border:"#1a4060",accent:"#a0e4ff",x:"#ff4757",o:"#a0e4ff",muted:"#3a6080"}, preview:["#010a1a","#051525","#a0e4ff"]},
    {id:"gold", name:"Gold VIP ⭐", price:500, colors:{bg:"#0a0800",card:"#1a1400",border:"#4a3800",accent:"#ffd700",x:"#ff6600",o:"#ffd700",muted:"#6a5a1a"}, preview:["#0a0800","#1a1400","#ffd700"]},
  ];

  const SYMBOLS = [
    {id:"default", name:"Classic ✕ ○", price:0, xEmoji:null, oEmoji:null},
    {id:"cats", name:"🐱 vs 🐶", price:50, xEmoji:"🐱", oEmoji:"🐶"},
    {id:"hearts", name:"❤️ vs 💙", price:50, xEmoji:"❤️", oEmoji:"💙"},
    {id:"stars", name:"⭐ vs 🌙", price:50, xEmoji:"⭐", oEmoji:"🌙"},
    {id:"fire", name:"🔥 vs 💧", price:75, xEmoji:"🔥", oEmoji:"💧"},
    {id:"fruits", name:"🍎 vs 🍊", price:75, xEmoji:"🍎", oEmoji:"🍊"},
    {id:"crowns", name:"👑 vs 💎", price:100, xEmoji:"👑", oEmoji:"💎"},
    {id:"planets", name:"🌍 vs 🪐", price:100, xEmoji:"🌍", oEmoji:"🪐"},
    {id:"dragons", name:"🐉 vs 🦄", price:150, xEmoji:"🐉", oEmoji:"🦄"},
  ];

  const currentTheme = THEMES.find(t=>t.id===activeTheme)||THEMES[0];
  const currentSymbol = SYMBOLS.find(s=>s.id===activeSymbols.X)||SYMBOLS[0];

  const ACHIEVEMENTS = [
    {id:"first_win", icon:"🏆", title:"First Victory!", desc:"Win your first game"},
    {id:"win_5", icon:"⭐", title:"Rising Star", desc:"Win 5 games"},
    {id:"win_10", icon:"🌟", title:"Star Player", desc:"Win 10 games"},
    {id:"win_25", icon:"💫", title:"Champion", desc:"Win 25 games"},
    {id:"win_50", icon:"👑", title:"Legend", desc:"Win 50 games"},
    {id:"streak_3", icon:"🔥", title:"On Fire!", desc:"Win 3 in a row"},
    {id:"streak_5", icon:"⚡", title:"Lightning!", desc:"Win 5 in a row"},
    {id:"streak_10", icon:"🌪️", title:"Unstoppable!", desc:"Win 10 in a row"},
    {id:"games_10", icon:"🎮", title:"Gamer", desc:"Play 10 games"},
    {id:"games_50", icon:"🕹️", title:"Dedicated", desc:"Play 50 games"},
    {id:"beat_ai", icon:"🤖", title:"AI Slayer", desc:"Beat the AI"},
    {id:"draw_master", icon:"🤝", title:"Draw Master", desc:"Get 5 draws"},
    {id:"timer_win", icon:"⏱️", title:"Speed Demon", desc:"Win in timer mode"},
  ];

  // ── LOAD USER STATS & CHECK DAILY BONUS ────────────────────────────────────
  const loadUserStats = async (uid) => {
    const {doc, getDoc} = window._fb;
    try {
      const snap = await getDoc(doc(db,"user_stats",uid));
      if(snap.exists()){
        const data = snap.data();
        setUserStats(data);
        setStreak(data.streak||0);
        setUserCoins(data.coins||0);
        // Load themes & symbols
        if(data.ownedThemes) setOwnedThemes(data.ownedThemes);
        if(data.activeTheme) setActiveTheme(data.activeTheme);
        if(data.ownedSymbols) setOwnedSymbols(data.ownedSymbols);
        if(data.activeSymbols) setActiveSymbols(data.activeSymbols);
        // Check daily login bonus
        const lastLogin = data.lastLogin||0;
        const today = new Date().toDateString();
        const lastLoginDate = new Date(lastLogin).toDateString();
        if(lastLoginDate !== today){
          const dayStreak = data.loginStreak||0;
          const bonus = Math.min(10 + (dayStreak*5), 50);
          setLoginBonusCoins(bonus);
          setShowLoginBonus(true);
          const {updateDoc} = window._fb;
          await updateDoc(doc(db,"user_stats",uid),{
            lastLogin:Date.now(),
            loginStreak:(dayStreak+1),
            coins:(data.coins||0)+bonus,
          });
          setUserCoins(c=>c+bonus);
        }
      } else {
        const {setDoc} = window._fb;
        await setDoc(doc(db,"user_stats",uid),{
          wins:0,draws:0,games:0,streak:0,bestStreak:0,
          achievements:[],coins:50,lastLogin:Date.now(),loginStreak:1,
          ownedThemes:["dark"],activeTheme:"dark",
          ownedSymbols:["default"],activeSymbols:{X:"default",O:"default"},
        });
        setUserCoins(50);
        setLoginBonusCoins(50);
        setShowLoginBonus(true);
      }
    } catch(e){ console.error(e); }
  };

  // ── BUY THEME ──────────────────────────────────────────────────────────────
  const buyTheme = async (theme) => {
    if(userCoins < theme.price){alert("Not enough coins! You need 🪙 "+theme.price+" coins.");return;}
    if(ownedThemes.includes(theme.id)){setActiveTheme(theme.id);saveThemePrefs(theme.id, activeSymbols);return;}
    const newOwned = [...ownedThemes, theme.id];
    const newCoins = userCoins - theme.price;
    setOwnedThemes(newOwned);
    setActiveTheme(theme.id);
    setUserCoins(newCoins);
    saveThemePrefs(theme.id, activeSymbols, newOwned, newCoins);
  };

  const buySymbol = async (symbol) => {
    if(userCoins < symbol.price){alert("Not enough coins! You need 🪙 "+symbol.price+" coins.");return;}
    if(ownedSymbols.includes(symbol.id)){
      const newSymbols = {X:symbol.id, O:symbol.id};
      setActiveSymbols(newSymbols);
      saveThemePrefs(activeTheme, newSymbols);
      return;
    }
    const newOwned = [...ownedSymbols, symbol.id];
    const newCoins = userCoins - symbol.price;
    const newSymbols = {X:symbol.id, O:symbol.id};
    setOwnedSymbols(newOwned);
    setActiveSymbols(newSymbols);
    setUserCoins(newCoins);
    saveThemePrefs(activeTheme, newSymbols, ownedThemes, newCoins, newOwned);
  };

  const saveThemePrefs = async (theme, symbols, newOwnedThemes, newCoins, newOwnedSymbols) => {
    const {doc, updateDoc} = window._fb;
    try {
      await updateDoc(doc(db,"user_stats",authUser.uid),{
        activeTheme: theme,
        activeSymbols: symbols,
        ownedThemes: newOwnedThemes||ownedThemes,
        ownedSymbols: newOwnedSymbols||ownedSymbols,
        coins: newCoins!==undefined ? newCoins : userCoins,
      });
    } catch(e){ console.error(e); }
  };

  // Load stats when user logs in
  useEffect(()=>{ if(authUser) loadUserStats(authUser.uid); },[authUser?.uid]);

  // ── TIMER MODE ──────────────────────────────────────────────────────────────
  useEffect(()=>{
    if(!timerMode||result||screen!=="game") return;
    clearInterval(timerRef.current);
    setTimeLeft(timePerMove);
    timerRef.current = setInterval(()=>{
      setTimeLeft(t=>{
        if(t<=1){
          clearInterval(timerRef.current);
          // Auto forfeit current player's turn
          handleTimerExpiry();
          return timePerMove;
        }
        return t-1;
      });
    },1000);
    return ()=>clearInterval(timerRef.current);
  },[turn, timerMode, result, screen]);

  const handleTimerExpiry = useCallback(()=>{
    // Switch turn without making a move — forfeit
    setTurn(t=>t==="X"?"O":"X");
  },[]);

  // Reset timer on each move
  const resetTimer = () => {
    if(!timerMode) return;
    clearInterval(timerRef.current);
    setTimeLeft(timePerMove);
  };

  // ── CHECK & AWARD ACHIEVEMENTS ──────────────────────────────────────────────
  const checkAchievements = async (newStats) => {
    const {doc, updateDoc} = window._fb;
    const earned = [...(newStats.achievements||[])];
    const toCheck = [
      {id:"first_win", cond:newStats.wins>=1},
      {id:"win_5", cond:newStats.wins>=5},
      {id:"win_10", cond:newStats.wins>=10},
      {id:"win_25", cond:newStats.wins>=25},
      {id:"win_50", cond:newStats.wins>=50},
      {id:"streak_3", cond:newStats.streak>=3},
      {id:"streak_5", cond:newStats.streak>=5},
      {id:"streak_10", cond:newStats.streak>=10},
      {id:"games_10", cond:newStats.games>=10},
      {id:"games_50", cond:newStats.games>=50},
      {id:"beat_ai", cond:newStats.beatAI},
      {id:"draw_master", cond:newStats.draws>=5},
      {id:"timer_win", cond:newStats.timerWins>=1},
    ];
    let newEarned = false;
    for(const {id,cond} of toCheck){
      if(cond && !earned.includes(id)){
        earned.push(id);
        newEarned = true;
        const ach = ACHIEVEMENTS.find(a=>a.id===id);
        if(ach) { setNewAchievement(ach); setTimeout(()=>setNewAchievement(null),4000); }
        break; // Show one at a time
      }
    }
    if(newEarned){
      try { await updateDoc(doc(db,"user_stats",authUser.uid),{achievements:earned}); } catch {}
      setUserStats(s=>({...s,achievements:earned}));
    }
  };

  // ── UPDATE STATS AFTER GAME ─────────────────────────────────────────────────
  const updateUserStats = async (won, drew, vsAI=false, timerWin=false) => {
    if(!authUser) return;
    const {doc, getDoc, updateDoc} = window._fb;
    try {
      const snap = await getDoc(doc(db,"user_stats",authUser.uid));
      const cur = snap.exists()?snap.data():{wins:0,draws:0,games:0,streak:0,bestStreak:0,achievements:[],coins:0,beatAI:false,timerWins:0};
      const newStreak = won ? (cur.streak||0)+1 : 0;
      const coinEarned = won ? 10 : 0; // Only winners earn coins
      const newStats = {
        wins:(cur.wins||0)+(won?1:0),
        draws:(cur.draws||0)+(drew?1:0),
        games:(cur.games||0)+1,
        streak:newStreak,
        bestStreak:Math.max(cur.bestStreak||0, newStreak),
        coins:(cur.coins||0)+coinEarned,
        beatAI:cur.beatAI||(vsAI&&won),
        timerWins:(cur.timerWins||0)+(timerWin?1:0),
        achievements:cur.achievements||[],
      };
      await updateDoc(doc(db,"user_stats",authUser.uid), newStats);
      setUserStats(newStats); setStreak(newStreak); setUserCoins(newStats.coins);
      // Save to coin history if won
      if(won&&coinEarned>0){
        const {addDoc, collection, serverTimestamp} = window._fb;
        await addDoc(collection(db,`users/${authUser.uid}/coin_history`),{
          type:"win", amount:coinEarned, balance:newStats.coins,
          description:`Won a game (+${coinEarned} coins)`,
          createdAt:serverTimestamp(),
        });
      }
      await checkAchievements(newStats);
    } catch(e){ console.error(e); }
  };

  const handleLogout = async () => {
    await window._fb.signOut(window._fb.auth);
    unsubRoomRef.current?.(); unsubPrivRef.current?.();
    unsubConvosRef.current?.(); unsubGameChatRef.current?.();
    setScreen("home"); setOnlineRoom(""); setOnlineRole(null); setResult(null);
    setBoard(Array(9).fill(null)); setMoveLog([]); setScores({X:0,O:0,draw:0});
    setActiveConvo(null); setConversations([]); setPrivMessages([]);
  };

  // ── PROFILE UPDATES ─────────────────────────────────────────────────────────
  const handleEditUsername = async () => {
    setEditUsernameMsg(""); setEditUsernameBusy(true);
    if(!editUsername||editUsername.trim().length<2){setEditUsernameMsg("error:Username must be at least 2 characters.");setEditUsernameBusy(false);return;}
    if(editUsername.trim()===authUser.username){setEditUsernameMsg("error:That's already your username!");setEditUsernameBusy(false);return;}
    try {
      const {updateProfile,doc,updateDoc,getDoc} = window._fb;
      await updateProfile(window._fb.auth.currentUser,{displayName:editUsername.trim()});
      await updateDoc(doc(db,"users",authUser.uid),{username:editUsername.trim()});
      const lbSnap=await getDoc(doc(db,"leaderboard",authUser.uid));
      if(lbSnap.exists()) await updateDoc(doc(db,"leaderboard",authUser.uid),{username:editUsername.trim()});
      setAuthUser(u=>({...u,username:editUsername.trim()}));
      setEditUsernameMsg("success:Username updated! ✅"); setEditUsername("");
    } catch { setEditUsernameMsg("error:Failed to update. Try again."); }
    setEditUsernameBusy(false);
  };

  const handleEditEmail = async () => {
    setEditEmailMsg(""); setEditEmailBusy(true);
    if(!editEmail||!editEmailPw){setEditEmailMsg("error:Enter new email and current password.");setEditEmailBusy(false);return;}
    if(!/^[^@]+@[^@]+\.[^@]+$/.test(editEmail)){setEditEmailMsg("error:Enter a valid email.");setEditEmailBusy(false);return;}
    try {
      const {EmailAuthProvider,reauthenticateWithCredential,updateEmail,doc,updateDoc} = window._fb;
      const credential = EmailAuthProvider.credential(authUser.email, editEmailPw);
      await reauthenticateWithCredential(window._fb.auth.currentUser, credential);
      await updateEmail(window._fb.auth.currentUser, editEmail);
      await updateDoc(doc(db,"users",authUser.uid),{email:editEmail});
      setAuthUser(u=>({...u,email:editEmail}));
      setEditEmailMsg("success:Email updated! ✅"); setEditEmail(""); setEditEmailPw("");
    } catch(e) {
      setEditEmailMsg("error:"+(e.code==="auth/wrong-password"?"Wrong password.":e.code==="auth/email-already-in-use"?"Email already in use.":e.message));
    }
    setEditEmailBusy(false);
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if(!file) return;
    if(file.size>2*1024*1024){setPhotoMsg("error:Image must be under 2MB");return;}
    setUploadingPhoto(true); setPhotoMsg("");
    try {
      // Upload to Cloudinary
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", "ml_default");
      formData.append("cloud_name", "rdq6hm3y");
      formData.append("folder", "favstictac_avatars");
      const response = await fetch(
        "https://api.cloudinary.com/v1_1/rdq6hm3y/image/upload",
        { method:"POST", body:formData }
      );
      const data = await response.json();
      if(!data.secure_url) throw new Error("Upload failed");
      const url = data.secure_url;
      // Save URL to Firebase
      const {updateProfile, doc, updateDoc, getDoc} = window._fb;
      await updateProfile(window._fb.auth.currentUser,{photoURL:url});
      await updateDoc(doc(db,"users",authUser.uid),{photoURL:url});
      const lbSnap = await getDoc(doc(db,"leaderboard",authUser.uid));
      if(lbSnap.exists()) await updateDoc(doc(db,"leaderboard",authUser.uid),{photoURL:url});
      setAuthUser(u=>({...u,photoURL:url}));
      setPhotoMsg("success:Profile picture updated! ✅");
    } catch(e) { 
      console.error(e);
      setPhotoMsg("error:Upload failed. Try again."); 
    }
    setUploadingPhoto(false);
  };

  // ── ONLINE ROOM ─────────────────────────────────────────────────────────────
  const createRoom = async () => {
    setRoomError("");
    const {doc,setDoc,serverTimestamp} = window._fb;
    const room = Math.random().toString(36).slice(2,8).toUpperCase();
    await setDoc(doc(db,"rooms",room),{board:Array(9).fill(null),turn:"X",moveLog:[],result:null,winLine:null,hostUid:authUser.uid,hostName:authUser.username,guestUid:null,guestName:null,createdAt:serverTimestamp()});
    setOnlineRoom(room); setOnlineRole("X"); setPlayers({X:authUser.username,O:"Waiting…"});
    setWaitingForOpponent(true); setBoard(Array(9).fill(null)); setTurn("X");
    setResult(null); setWinLine(null); setMoveLog([]); resultHandledRef.current=false;
    setScores({X:0,O:0,draw:0}); setScreen("game"); subscribeRoom(room); subscribeGameChat(room);
  };

  const joinRoom = async () => {
    setRoomError("");
    const room = roomInput.trim().toUpperCase();
    if(!room){setRoomError("Enter a room code.");return;}
    const {doc,getDoc,updateDoc} = window._fb;
    const snap = await getDoc(doc(db,"rooms",room));
    if(!snap.exists()){setRoomError("Room not found.");return;}
    const data = snap.data();
    if(data.guestUid){setRoomError("Room is full.");return;}
    if(data.hostUid===authUser.uid){setRoomError("Can't join your own room.");return;}
    await updateDoc(doc(db,"rooms",room),{guestUid:authUser.uid,guestName:authUser.username});
    setOnlineRoom(room); setOnlineRole("O"); setPlayers({X:data.hostName,O:authUser.username});
    setWaitingForOpponent(false); setBoard(data.board); setTurn(data.turn);
    setResult(null); setWinLine(null); setMoveLog(data.moveLog||[]); resultHandledRef.current=false;
    setScores({X:0,O:0,draw:0}); setScreen("game"); subscribeRoom(room); subscribeGameChat(room);
  };

  const subscribeRoom = (room) => {
    const {doc,onSnapshot} = window._fb;
    unsubRoomRef.current?.();
    unsubRoomRef.current = onSnapshot(doc(db,"rooms",room), snap => {
      if(!snap.exists()) return;
      const s = snap.data();
      if(s.guestUid&&s.guestName){setWaitingForOpponent(false);setPlayers({X:s.hostName,O:s.guestName});}
      setBoard(s.board); setTurn(s.turn); setMoveLog(s.moveLog||[]);
      if(s.result&&!resultHandledRef.current){
        resultHandledRef.current=true; setResult(s.result);
        if(s.result!=="draw") setWinLine(s.winLine);
        saveGameToFirestore(s.result,s.moveLog||[],{X:s.hostName,O:s.guestName});
      }
    });
  };

  const subscribeGameChat = (room) => {
    const {collection,query,orderBy,onSnapshot} = window._fb;
    unsubGameChatRef.current?.();
    unsubGameChatRef.current = onSnapshot(query(collection(db,`rooms/${room}/chat`),orderBy("createdAt","asc")), snap=>{
      setGameChatMsgs(snap.docs.map(d=>({id:d.id,...d.data()})));
    });
  };

  const sendGameChat = async (text, isVoice=false, audioBase64=null) => {
    if(!isVoice && !text.trim()) return;
    const {collection,addDoc,serverTimestamp} = window._fb;
    const msgData = {
      uid:authUser.uid, username:authUser.username,
      createdAt:serverTimestamp(),
      isVoice: isVoice||false,
      text: isVoice ? "🎙️ Voice note" : text.trim(),
      audioBase64: audioBase64||null,
    };
    await addDoc(collection(db,`rooms/${onlineRoom}/chat`), msgData);
    if(!isVoice) setGameChatInput("");
    setTimeout(()=>gameChatEndRef.current?.scrollIntoView({behavior:"smooth"}),100);
  };

  // Show popup for opponent messages
  useEffect(()=>{
    if(gameChatMsgs.length===0) return;
    const last = gameChatMsgs[gameChatMsgs.length-1];
    if(last.uid!==authUser?.uid) {
      setChatPopup({text:last.text, username:last.username, isVoice:last.isVoice, audioBase64:last.audioBase64});
      setTimeout(()=>setChatPopup(null), 4000);
    }
  },[gameChatMsgs]);

  // Voice recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({audio:true});
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = e => audioChunksRef.current.push(e.data);
      mediaRecorder.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, {type:"audio/webm"});
        const reader = new FileReader();
        reader.onload = async (ev) => {
          await sendGameChat("", true, ev.target.result);
        };
        reader.readAsDataURL(blob);
        stream.getTracks().forEach(t=>t.stop());
        clearInterval(recordingTimerRef.current);
        setRecordingTime(0);
      };
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      recordingTimerRef.current = setInterval(()=>setRecordingTime(t=>t+1), 1000);
    } catch(e) { alert("Microphone access denied. Please allow microphone in browser settings."); }
  };

  const stopRecording = () => {
    if(mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const playAudio = (base64) => {
    const audio = new Audio(base64);
    audio.play();
  };

  // ── AI ──────────────────────────────────────────────────────────────────────
  const [aiThinking, setAiThinking] = useState(false);

  useEffect(() => {
    if(mode!=="ai"||turn!=="O"||result||aiThinking) return;
    setAiThinking(true);
    // Random delay 300-800ms to feel natural but not exploitable
    const delay = 300 + Math.random()*500;
    const t = setTimeout(()=>{
      const m = bestMove(board);
      if(m>=0) handleCellClick(m,board,"O");
      setAiThinking(false);
    }, delay);
    return ()=>{ clearTimeout(t); setAiThinking(false); };
  }, [turn,mode,board,result]);

  // ── CELL CLICK ──────────────────────────────────────────────────────────────
  const handleCellClick = useCallback(async (i,currentBoard=board,currentTurn=turn) => {
    if(currentBoard[i]||result) return;
    if(mode==="ai"&&(currentTurn==="O"||aiThinking)) return; // Block clicks during AI turn
    if(mode==="online"){if(waitingForOpponent||onlineRole!==currentTurn) return;}
    setAnimCell(i); setTimeout(()=>setAnimCell(null),300);
    const nb=[...currentBoard]; nb[i]=currentTurn;
    const newLog=[...moveLog,{player:currentTurn,cell:i,time:Date.now()}];
    const w=calcWinnerForSize(nb, boardSize); const isDraw=!w&&!nb.includes(null);
    const newResult=w||(isDraw?"draw":null);
    const newTurn=currentTurn==="X"?"O":"X";
    setBoard(nb); setMoveLog(newLog);
    if(newResult){setResult(newResult);if(newResult!=="draw")setWinLine(newResult.line);if(mode!=="online")await saveGameToFirestore(newResult,newLog,players);}
    else{setTurn(newTurn);}
    if(mode==="online"){const {doc,updateDoc}=window._fb;await updateDoc(doc(db,"rooms",onlineRoom),{board:nb,turn:newTurn,moveLog:newLog,result:newResult,winLine:newResult&&newResult!=="draw"?newResult.line:null});}
  },[board,turn,result,mode,onlineRole,onlineRoom,moveLog,players,waitingForOpponent,boardSize]);

  const resetGame = async () => {
    // Switch who starts next round
    const nextStarter = roundStarter==="p1"?"p2":"p1";
    setRoundStarter(nextStarter);
    const p1IsX = p1Symbol==="X";
    const p1GoesFirst = nextStarter==="p1";
    const nextTurn = p1GoesFirst ? (p1IsX?"X":"O") : (p1IsX?"O":"X");
    setBoard(Array(9).fill(null)); setTurn(mode==="online"?"X":nextTurn);
    setResult(null); setWinLine(null); setMoveLog([]); resultHandledRef.current=false;
    if(mode==="online"&&onlineRoom){
      const {doc,updateDoc}=window._fb;
      await updateDoc(doc(db,"rooms",onlineRoom),{board:Array(9).fill(null),turn:"X",moveLog:[],result:null,winLine:null});
    }
  };

  const goHome = () => {
    unsubRoomRef.current?.(); unsubGameChatRef.current?.();
    setScreen("home"); setMode("local"); setResult(null); setWinLine(null);
    setBoard(Array(9).fill(null)); setMoveLog([]); setOnlineRoom(""); setOnlineRole(null);
    setScores({X:0,O:0,draw:0}); setWaitingForOpponent(false); setRoomInput(""); setRoomError("");
    setGameChatMsgs([]); resultHandledRef.current=false;
  };

  const startLocalGame = (m) => {
    setSetupMode(m);
    setP1Name(authUser.username);
    setP2Name(m==="ai"?"AI Bot 🤖":"");
    setP1Symbol("X");
    setFirstPlayer("p1");
    setScreen("game-setup");
  };

  const beginGame = () => {
    const p1IsX = p1Symbol==="X";
    const xName = p1IsX ? (p1Name||authUser.username) : (p2Name||(setupMode==="ai"?"AI Bot 🤖":"Player 2"));
    const oName = p1IsX ? (p2Name||(setupMode==="ai"?"AI Bot 🤖":"Player 2")) : (p1Name||authUser.username);
    // Disable AI for larger boards
    const actualMode = boardSize>3?"local":setupMode;
    setMode(actualMode);
    setPlayers({X:xName, O:oName});
    const p1GoesFirst = firstPlayer==="p1";
    const firstTurn = p1GoesFirst ? (p1IsX?"X":"O") : (p1IsX?"O":"X");
    const cells = boardSize*boardSize;
    setBoard(Array(cells).fill(null));
    setTurn(firstTurn); setResult(null); setWinLine(null); setMoveLog([]);
    setScores({X:0,O:0,draw:0}); resultHandledRef.current=false;
    setRoundStarter(firstPlayer);
    setScreen("game");
  };

  const cellClass=(i)=>{let c="cell";if(board[i])c+=` filled ${board[i]==="X"?"x-cell":"o-cell"}`;if(winLine?.includes(i))c+=" win-cell";if(animCell===i)c+=" anim";return c;};
  const getStatus=()=>{
    if(mode==="online"&&waitingForOpponent) return "⏳ Waiting for opponent…";
    if(mode==="ai"&&aiThinking) return "🤖 AI is thinking…";
    if(!result) return `${turn==="X"?players.X:players.O}'s turn (${turn})`;
    if(result==="draw") return "It's a Draw! 🤝";
    return `${result.winner==="X"?players.X:players.O} wins! 🎉`;
  };
  const statusClass=()=>{if(!result)return"status";if(result==="draw")return"status draw";return result.winner==="X"?"status win-x":"status win-o";};
  const fmtTime=(ts)=>{if(!ts?.seconds) return "";const d=new Date(ts.seconds*1000);return d.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});};

  const TopBar = ({backTo, backLabel}) => (
    <div className="topbar">
      <div style={{display:"flex",alignItems:"center",gap:9,cursor:"pointer"}} onClick={()=>setScreen("profile")}>
        <AvatarComp user={authUser}/>
        <div><div className="topbar-name">{authUser?.username}</div><div className="topbar-email">{authUser?.email}</div></div>
      </div>
      <div style={{display:"flex",gap:6,alignItems:"center"}}>
        <div className="coins-display">🪙 {userCoins}</div>
        {streak>=3&&<div className="streak-badge hot">🔥 {streak}</div>}
        {/* Notification Bell */}
        <button onClick={()=>setScreen("notifications")} style={{position:"relative",background:"none",border:"1px solid var(--border)",borderRadius:8,padding:"6px 8px",cursor:"pointer",color:"#f0ede8",fontSize:"1rem"}}>
          🔔
          {unreadNotifs>0&&<span style={{position:"absolute",top:-6,right:-6,background:"var(--error)",color:"#fff",borderRadius:"50%",width:16,height:16,fontSize:".55rem",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700}}>{unreadNotifs>9?"9+":unreadNotifs}</span>}
        </button>
        {backTo&&<button className="btn btn-outline btn-sm" onClick={()=>setScreen(backTo)} style={{width:"auto"}}>{backLabel||"←"}</button>}
        <button className="btn btn-outline btn-sm" onClick={handleLogout} style={{width:"auto"}}>Out</button>
      </div>
    </div>
  );

  const BottomNav = () => (
    <div className="bottom-nav">
      {[["🏠","home","Home"],["🎮","play","Play"],["👥","friends","Friends"],["🔔","notifications","Notifs"],["👤","profile","Me"]].map(([icon,s,label])=>(
        <button key={s} className={`nav-item ${(screen===s||(s==="play"&&screen==="home"))?"active":""}`}
          onClick={()=>{
            if(s==="play") setScreen("home");
            else if(s==="friends"){loadFriends();setScreen("friends");}
            else if(s==="notifications") setScreen("notifications");
            else setScreen(s);
          }}>
          <span style={{fontSize:"1.1rem"}}>{icon}</span>
          {s==="friends"&&totalFriendRequests>0&&<span className="nav-badge">{totalFriendRequests>9?"9+":totalFriendRequests}</span>}
          {s==="notifications"&&unreadNotifs>0&&<span className="nav-badge">{unreadNotifs>9?"9+":unreadNotifs}</span>}
          <span style={{fontSize:".52rem",textTransform:"uppercase",letterSpacing:"1px"}}>{label}</span>
        </button>
      ))}
    </div>
  );

  // ── LOADING ──────────────────────────────────────────────────────────────────
  if(authLoading||!fbReady) return(
    <><style>{getCSS(currentTheme)}</style>
    <div className="app" style={{gap:16,textAlign:"center"}}>
      <Logo/>
      {fbError?<div className="alert alert-error" style={{maxWidth:300}}>Failed to connect. Check internet.</div>
        :<><div className="spinner" style={{width:28,height:28,margin:"0 auto"}}/><div style={{color:"var(--muted)",fontSize:".7rem",marginTop:8}}>Connecting…</div></>}
    </div></>
  );

  // ── DAILY LOGIN BONUS ─────────────────────────────────────────────────────────
  if(showLoginBonus) return(
    <><style>{getCSS(currentTheme)}</style>
    <div className="bonus-overlay">
      <div className="bonus-box">
        <div style={{fontSize:"2rem",marginBottom:8}}>🎁</div>
        <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:"1.2rem",color:"var(--accent)",marginBottom:6}}>Daily Login Bonus!</div>
        <div style={{color:"var(--muted)",fontSize:".75rem",marginBottom:16}}>Welcome back {authUser?.username}! Here's your reward for logging in today!</div>
        <div className="bonus-coins">+{loginBonusCoins}</div>
        <div style={{color:"var(--accent)",fontSize:".8rem",marginBottom:20}}>🪙 Coins Earned!</div>
        <div style={{color:"var(--muted)",fontSize:".68rem",marginBottom:20}}>Total coins: 🪙 {userCoins}</div>
        <div style={{display:"flex",gap:8,justifyContent:"center",fontSize:"1.2rem",marginBottom:20}}>
          {"🪙🎮🏆🔥⭐".split("").map((e,i)=><span key={i} style={{animation:`bounce ${0.6+i*0.1}s ease infinite alternate`}}>{e}</span>)}
        </div>
        <button className="btn btn-primary" onClick={()=>setShowLoginBonus(false)}>🎮 Let's Play!</button>
      </div>
    </div></>
  );

  // ── ACHIEVEMENT POPUP (shown over any screen) ─────────────────────────────────
  const AchievementPopup = () => newAchievement?(
    <div className="ach-popup">
      <div style={{fontSize:".65rem",color:"var(--accent)",textTransform:"uppercase",letterSpacing:2,marginBottom:4}}>🏅 Achievement Unlocked!</div>
      <div className="ach-icon">{newAchievement.icon}</div>
      <div className="ach-title">{newAchievement.title}</div>
      <div className="ach-desc">{newAchievement.desc}</div>
    </div>
  ):null;
  if(showWelcome) return(
    <><style>{getCSS(currentTheme)}</style>
    <div className="welcome-overlay">
      <div className="welcome-box">
        <div className="welcome-emoji">🎉</div>
        <div className="welcome-title">Welcome to FavsTicTac Lovers!</div>
        <div className="welcome-msg">
          Hello <span className="welcome-name">{welcomeName}</span>! 👋<br/><br/>
          Welcome to <span className="welcome-name">Adepoju Favour Emmanuel's</span> Tic Tac Toe game —<br/>
          <span style={{color:"var(--o)",fontWeight:700}}>one of the best paper games you will ever see on your screen!</span> 🏆<br/><br/>
          Play locally, challenge the AI, or compete with friends online. Your journey to becoming a Tic Tac Toe legend starts now! 🎮
        </div>
        <div style={{display:"flex",gap:10,marginBottom:16,justifyContent:"center",fontSize:"1.5rem"}}>
          {"🎮🏆🔥⚡👑".split("").map((e,i)=><span key={i} style={{animation:`bounce ${0.8+i*0.15}s ease infinite alternate`}}>{e}</span>)}
        </div>
        <button className="btn btn-primary" onClick={()=>setShowWelcome(false)}>
          🚀 Let's Play!
        </button>
      </div>
    </div></>
  );

  // ── AUTH ─────────────────────────────────────────────────────────────────────
  if(!authUser) return(
    <><style>{getCSS(currentTheme)}</style>
    <div className="app">
      <div style={{width:"100%",maxWidth:400,display:"flex",flexDirection:"column",alignItems:"center",gap:20}}>
        <div style={{textAlign:"center"}}><Logo/><div className="tagline">⚡ Sign in to play & connect</div></div>
        <div className="card gap">
          <div className="tabs">
            <button className={`tab ${authScreen==="login"?"active":""}`} onClick={()=>{setAuthScreen("login");setAuthError("");setForgotMsg("")}}>Sign In</button>
            <button className={`tab ${authScreen==="register"?"active":""}`} onClick={()=>{setAuthScreen("register");setAuthError("");setForgotMsg("")}}>Register</button>
            <button className={`tab ${authScreen==="forgot"?"active":""}`} onClick={()=>{setAuthScreen("forgot");setAuthError("");setForgotMsg("")}}>Reset PW</button>
          </div>
          {authError&&<div className="alert alert-error">{authError}</div>}
          {authScreen==="forgot"&&(<>
            <div style={{color:"var(--muted)",fontSize:".75rem",textAlign:"center"}}>Enter your email to receive a password reset link.</div>
            {forgotMsg&&<div className={`alert ${forgotMsg.startsWith("success")?"alert-success":"alert-error"}`}>{forgotMsg.split(":")[1]}</div>}
            <div className="field"><div className="label">Email</div><input className="input" type="email" placeholder="you@example.com" value={forgotEmail} onChange={e=>setForgotEmail(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleForgotPassword()}/></div>
            <button className="btn btn-primary" onClick={()=>handleForgotPassword()} disabled={forgotBusy}>{forgotBusy?<><span className="spinner"/> Sending…</>:"📧 Send Reset Email"}</button>
            <button className="btn-ghost" style={{textAlign:"center"}} onClick={()=>setAuthScreen("login")}>← Back to Sign In</button>
          </>)}
          {authScreen!=="forgot"&&(<>
            {authScreen==="register"&&<div className="field"><div className="label">Username</div><input className="input" placeholder="e.g. GameMaster99" value={authForm.username} onChange={e=>setAuthForm(f=>({...f,username:e.target.value}))}/></div>}
            <div className="field"><div className="label">Email</div><input className="input" type="email" placeholder="you@example.com" value={authForm.email} onChange={e=>setAuthForm(f=>({...f,email:e.target.value}))}/></div>
            <div className="field"><div className="label">Password</div>
              <div className="input-wrap">
                <input className="input" type={showPw?"text":"password"} placeholder="••••••••" value={authForm.password} onChange={e=>setAuthForm(f=>({...f,password:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&(authScreen==="login"?handleLogin():handleRegister())} style={{paddingRight:38}}/>
                <button className="eye-btn" onClick={()=>setShowPw(p=>!p)}><EyeIcon show={showPw}/></button>
              </div>
            </div>
            {authScreen==="register"&&<div className="field"><div className="label">Confirm Password</div><input className="input" type="password" placeholder="••••••••" value={authForm.confirm} onChange={e=>setAuthForm(f=>({...f,confirm:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&handleRegister()}/></div>}
            <button className="btn btn-primary" onClick={authScreen==="login"?handleLogin:handleRegister} disabled={authBusy}>
              {authBusy?<><span className="spinner"/> {authScreen==="login"?"Signing in…":"Creating account…"}</>:authScreen==="login"?"🔑 Sign In":"🚀 Create Account"}
            </button>
            {authScreen==="login"&&<button className="btn-ghost" style={{textAlign:"center"}} onClick={()=>setAuthScreen("forgot")}>Forgot password?</button>}
          </>)}
        </div>
        <div style={{color:"var(--muted)",fontSize:".68rem",textAlign:"center"}}>Your <span style={{color:"var(--accent)"}}>FavsTicTac Lovers</span> account works on all devices.</div>
      </div>
    </div></>
  );

  // ── GAME SETUP ────────────────────────────────────────────────────────────────
  if(screen==="game-setup") return(
    <><style>{getCSS(currentTheme)}</style>
    <div className="app"><div style={{width:"100%",maxWidth:420}}>
      <TopBar backTo="home"/>
      <div style={{textAlign:"center",marginBottom:16}}><Logo small/>
        <div className="tagline">{setupMode==="ai"?"🤖 vs AI Setup":"🎮 Local 2-Player Setup"}</div>
      </div>
      <div className="card gap">

        {/* Player 1 Name */}
        <div className="field">
          <div className="label">👤 Player 1 Name</div>
          <input className="input" placeholder={authUser.username} value={p1Name} onChange={e=>setP1Name(e.target.value)}/>
        </div>

        {/* Player 2 Name — only for local */}
        {setupMode==="local"&&(
          <div className="field">
            <div className="label">👤 Player 2 Name</div>
            <input className="input" placeholder="Player 2" value={p2Name} onChange={e=>setP2Name(e.target.value)}/>
          </div>
        )}

        {/* Choose Symbol — only once at beginning */}
        <div className="field">
          <div className="label">🎯 Player 1 plays as (set once)</div>
          <div className="symbol-pick">
            <button className={`symbol-btn ${p1Symbol==="X"?"active-x":""}`} onClick={()=>setP1Symbol("X")}>
              ✕<div style={{fontSize:".65rem",fontFamily:"'Space Mono',monospace",marginTop:4,color:p1Symbol==="X"?"var(--x)":"var(--muted)"}}>Play as X</div>
            </button>
            <button className={`symbol-btn ${p1Symbol==="O"?"active-o":""}`} onClick={()=>setP1Symbol("O")}>
              ○<div style={{fontSize:".65rem",fontFamily:"'Space Mono',monospace",marginTop:4,color:p1Symbol==="O"?"var(--o)":"var(--muted)"}}>Play as O</div>
            </button>
          </div>
        </div>

        {/* Who goes first — only for first round */}
        <div className="field">
          <div className="label">⚡ Who goes first? (1st round only)</div>
          <div className="first-pick">
            <button className={`first-btn ${firstPlayer==="p1"?"active":""}`} onClick={()=>setFirstPlayer("p1")}>
              👤 {p1Name||authUser.username||"Player 1"}<br/>
              <span style={{fontSize:".6rem",opacity:.7}}>goes first</span>
            </button>
            <button className={`first-btn ${firstPlayer==="p2"?"active":""}`} onClick={()=>setFirstPlayer("p2")}>
              👤 {p2Name||(setupMode==="ai"?"AI Bot":"Player 2")}<br/>
              <span style={{fontSize:".6rem",opacity:.7}}>goes first</span>
            </button>
          </div>
          <div style={{fontSize:".65rem",color:"var(--muted)",textAlign:"center",marginTop:4}}>
            🔄 After each round, turns automatically swap
          </div>
        </div>

        {/* Board Size */}
        <div className="field">
          <div className="label">📐 Board Size</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
            {[[3,"3×3","Classic"],[4,"4×4","Hard"],[5,"5×5","Expert"]].map(([size,label,diff])=>(
              <button key={size} onClick={()=>setBoardSize(size)}
                style={{padding:"12px 6px",borderRadius:9,border:`2px solid ${boardSize===size?"var(--accent)":"var(--border)"}`,
                  background:boardSize===size?"rgba(255,215,0,.1)":"#16161f",
                  color:boardSize===size?"var(--accent)":"var(--muted)",
                  cursor:"pointer",fontFamily:"'Space Mono',monospace",fontSize:".72rem",fontWeight:700,textAlign:"center"}}>
                <div style={{fontSize:"1rem",marginBottom:2}}>{label}</div>
                <div style={{fontSize:".6rem",opacity:.7}}>{diff}</div>
              </button>
            ))}
          </div>
          {boardSize===4&&<div style={{fontSize:".65rem",color:"var(--accent)",marginTop:4,textAlign:"center"}}>⚠️ Get 4 in a row to win!</div>}
          {boardSize===5&&<div style={{fontSize:".65rem",color:"var(--accent)",marginTop:4,textAlign:"center"}}>⚠️ Get 5 in a row to win!</div>}
          {boardSize!==3&&<div style={{fontSize:".62rem",color:"var(--muted)",marginTop:2,textAlign:"center"}}>AI not available for larger boards</div>}
        </div>

        {/* Timer Mode */}
        <div className="field">
          <div className="label">⏱️ Timer Mode</div>
          <div style={{display:"flex",alignItems:"center",gap:10,background:"#16161f",borderRadius:9,padding:"10px 14px",border:`1px solid ${timerMode?"var(--accent)":"var(--border)"}`}}>
            <div style={{flex:1}}>
              <div style={{fontSize:".78rem",fontWeight:700,color:timerMode?"var(--accent)":"#f0ede8"}}>⏱️ Enable Timer</div>
              <div style={{fontSize:".62rem",color:"var(--muted)",marginTop:2}}>Each player has limited time per move</div>
            </div>
            <button onClick={()=>setTimerMode(p=>!p)} style={{width:44,height:24,borderRadius:12,border:"none",background:timerMode?"var(--accent)":"var(--border)",cursor:"pointer",position:"relative",transition:"all .2s"}}>
              <div style={{width:18,height:18,borderRadius:"50%",background:"#fff",position:"absolute",top:3,left:timerMode?23:3,transition:"left .2s"}}/>
            </button>
          </div>
          {timerMode&&(
            <div style={{marginTop:8}}>
              <div className="label" style={{marginBottom:6}}>Seconds per move</div>
              <div style={{display:"flex",gap:8}}>
                {[10,15,20,30].map(t=>(
                  <button key={t} onClick={()=>setTimePerMove(t)}
                    style={{flex:1,padding:"8px 4px",borderRadius:8,border:`2px solid ${timePerMove===t?"var(--accent)":"var(--border)"}`,
                      background:timePerMove===t?"rgba(255,215,0,.1)":"#16161f",color:timePerMove===t?"var(--accent)":"var(--muted)",
                      cursor:"pointer",fontFamily:"'Space Mono',monospace",fontSize:".75rem",fontWeight:700}}>
                    {t}s
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <button className="btn btn-primary" onClick={beginGame}>▶ Start Game</button>
        <button className="btn btn-outline" onClick={()=>setScreen("home")}>← Back</button>
      </div>
    </div></div></>
  );

  // ── HOME ─────────────────────────────────────────────────────────────────────
  if(screen==="home") return(
    <><style>{getCSS(currentTheme)}</style>
    <div className="app" style={{background:`radial-gradient(ellipse at 15% 40%,${currentTheme.colors.bg} 0%,#08080f 55%)`}}><div style={{width:"100%",maxWidth:420}}>
      <TopBar/>
      <div style={{textAlign:"center",marginBottom:20}}><Logo/><div className="tagline">Welcome back, {authUser.username}! 🎮</div></div>

      {/* Global Announcements Banner */}
      {globalAnnouncements.filter(a=>!dismissedAnnouncements.includes(a.id)).slice(0,1).map(a=>(
        <div key={a.id} style={{background:"rgba(255,215,0,.1)",border:"2px solid var(--accent)",borderRadius:12,
          padding:"12px 14px",marginBottom:12,position:"relative"}}>
          <div style={{display:"flex",gap:8,alignItems:"flex-start"}}>
            <span style={{fontSize:"1.2rem"}}>📢</span>
            <div style={{flex:1}}>
              <div style={{fontSize:".65rem",color:"var(--accent)",fontWeight:700,textTransform:"uppercase",
                letterSpacing:1,marginBottom:3}}>Announcement from Admin</div>
              <div style={{fontSize:".78rem",color:"#f0ede8",lineHeight:1.5}}>{a.text}</div>
              <div style={{fontSize:".6rem",color:"var(--muted)",marginTop:4}}>
                {a.createdAt?.seconds?new Date(a.createdAt.seconds*1000).toLocaleDateString():""}
              </div>
            </div>
            <button onClick={()=>dismissAnnouncement(a.id)}
              style={{background:"none",border:"none",color:"var(--muted)",cursor:"pointer",fontSize:"1rem",padding:0,flexShrink:0}}>✕</button>
          </div>
        </div>
      ))}

      {/* Quick Stats Banner */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:12}}>
        {[["🪙",userCoins,"Coins"],["🔥",streak,"Streak"],["🏅",(userStats.achievements||[]).length,"Badges"]].map(([icon,val,lbl])=>(
          <div key={lbl} style={{background:"var(--card)",border:"1px solid var(--border)",borderRadius:10,padding:"10px 6px",textAlign:"center"}}>
            <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:"1.1rem",color:"var(--accent)"}}>{icon} {val}</div>
            <div style={{fontSize:".6rem",color:"var(--muted)",marginTop:2}}>{lbl}</div>
          </div>
        ))}
      </div>

      <div className="card gap">
        <button className="btn btn-primary" onClick={()=>startLocalGame("local")}>🎮 Local 2-Player</button>
        <button className="btn btn-x" onClick={()=>startLocalGame("ai")}>🤖 vs AI (Unbeatable)</button>
        <button className="btn btn-o" onClick={()=>{setMode("online");setScreen("online-lobby")}}>🌐 Online Multiplayer</button>
        <div className="divider">explore</div>
        <div className="row">
          <button className="btn btn-outline" style={{flex:1}} onClick={()=>{loadLeaderboard();setScreen("leaderboard")}}>🏆 Ranks</button>
          <button className="btn btn-outline" style={{flex:1,position:"relative"}} onClick={()=>{setScreen("messages");subscribeConversations();}}>
            💬 Messages {totalUnread>0&&<span style={{background:"var(--error)",color:"#fff",borderRadius:50,padding:"1px 5px",fontSize:".6rem",marginLeft:4}}>{totalUnread}</span>}
          </button>
        </div>
        <div className="row">
          <button className="btn btn-outline" style={{flex:1,position:"relative"}} onClick={()=>{loadFriends();setScreen("friends")}}>
            👥 Friends ({friends.length}) {totalFriendRequests>0&&<span style={{background:"var(--error)",color:"#fff",borderRadius:50,padding:"1px 5px",fontSize:".6rem",marginLeft:4}}>{totalFriendRequests}</span>}
          </button>
          <button className="btn btn-outline" style={{flex:1}} onClick={()=>setScreen("feedback")}>📝 Feedback</button>
        </div>
        <button className="btn btn-outline" onClick={()=>setScreen("privacy")}>🔒 Privacy Policy</button>
      </div>
      <BottomNav/>
    </div></div></>
  );

  // ── ONLINE LOBBY ─────────────────────────────────────────────────────────────
  if(screen==="online-lobby") return(
    <><style>{getCSS(currentTheme)}</style>
    <div className="app"><div style={{width:"100%",maxWidth:420}}>
      <TopBar backTo="home"/>
      <div style={{textAlign:"center",marginBottom:16}}><Logo small/><div className="tagline">🌐 Online Multiplayer</div></div>
      <div className="card gap">
        <div className="alert alert-info">Share your room code with a friend on another device!</div>
        {roomError&&<div className="alert alert-error">{roomError}</div>}
        <button className="btn btn-primary" onClick={createRoom}>🏠 Create Room</button>
        <div className="divider">or join</div>
        <div className="field"><div className="label">Room Code</div>
          <input className="input" placeholder="E.g. ABC123" value={roomInput} onChange={e=>setRoomInput(e.target.value.toUpperCase())} style={{textAlign:"center",letterSpacing:4,fontWeight:700,fontSize:"1rem"}} onKeyDown={e=>e.key==="Enter"&&joinRoom()}/>
        </div>
        <button className="btn btn-o" onClick={joinRoom} disabled={!roomInput.trim()}>🚪 Join Room</button>
        <button className="btn btn-outline" onClick={()=>setScreen("home")}>← Back</button>
      </div>
    </div></div></>
  );

  // ── GAME ─────────────────────────────────────────────────────────────────────
  if(screen==="game") return(
    <><style>{getCSS(currentTheme)}</style>
    <div className="app"><div style={{width:"100%",maxWidth:420}}>
      <TopBar backTo="home"/>
      {mode==="online"&&onlineRoom&&(
        <div className="room-badge">
          <div><div style={{fontSize:".6rem",color:"var(--muted)",textTransform:"uppercase",letterSpacing:2}}>Room</div><div className="room-code">{onlineRoom}</div></div>
          <div style={{fontSize:".65rem",color:"var(--muted)"}}>You are <span style={{color:onlineRole==="X"?"var(--x)":"var(--o)",fontWeight:700}}>{onlineRole}</span>{waitingForOpponent&&<span> · <span className="spinner" style={{width:10,height:10,borderWidth:1.5}}/></span>}</div>
        </div>
      )}
      {mode==="online"&&waitingForOpponent?(
        <div className="card"><div style={{textAlign:"center",padding:"24px 0"}}>
          <div style={{color:"var(--muted)",fontSize:".72rem",textTransform:"uppercase",letterSpacing:2}}>Share this code</div>
          <div className="waiting-code">{onlineRoom}</div>
          <div style={{color:"var(--muted)",fontSize:".72rem",marginBottom:16}}>Waiting for opponent…</div>
          <div className="spinner" style={{width:28,height:28,margin:"0 auto"}}/>
        </div><button className="btn btn-outline" onClick={goHome} style={{marginTop:16}}>← Cancel</button></div>
      ):(<>
        {/* Chat popup for opponent messages */}
        {chatPopup&&(
          <div className="chat-popup">
            <div className="chat-popup-name">💬 {chatPopup.username}</div>
            {chatPopup.isVoice && chatPopup.audioBase64
              ? <button className="voice-msg-btn" onClick={()=>playAudio(chatPopup.audioBase64)}>▶ Play voice note 🎙️</button>
              : <div className="chat-popup-text">{chatPopup.text}</div>
            }
          </div>
        )}
        {/* Achievement popup */}
        <AchievementPopup/>

        {/* Timer bar */}
        {timerMode&&!result&&!waitingForOpponent&&(
          <div style={{marginBottom:8}}>
            <div className="timer-display" style={{color:timeLeft<=5?"var(--x)":timeLeft<=10?"var(--accent)":"var(--o)"}}>
              ⏱️ {timeLeft}s
            </div>
            <div className="timer-bar">
              <div className="timer-fill" style={{
                width:`${(timeLeft/timePerMove)*100}%`,
                background:timeLeft<=5?"var(--x)":timeLeft<=10?"var(--accent)":"var(--o)"
              }}/>
            </div>
          </div>
        )}

        <div className="scoreboard">
          <div className={`score-box ${!result&&turn==="X"?"active":""}`}><div className="score-name">{players.X}</div><div className="score-num score-x">{scores.X}</div><div className="score-name" style={{color:"var(--x)"}}>X</div></div>
          <div style={{textAlign:"center"}}><div style={{color:"var(--muted)",fontSize:".65rem"}}>VS</div><div style={{color:"var(--accent)",fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:"1rem"}}>{scores.draw}</div><div style={{color:"var(--muted)",fontSize:".6rem"}}>draws</div></div>
          <div className={`score-box ${!result&&turn==="O"?"active":""}`}><div className="score-name">{players.O}</div><div className="score-num score-o">{scores.O}</div><div className="score-name" style={{color:"var(--o)"}}>O</div></div>
        </div>
        {mode!=="online"&&result&&(
          <div className="round-indicator">
            🔄 Next round: <span style={{color:"var(--accent)"}}>
              {roundStarter==="p1"
                ? (p2Name||(setupMode==="ai"?"AI Bot":"Player 2"))
                : (p1Name||authUser.username)
              } goes first
            </span>
          </div>
        )}
        <div className="board" style={{
          gridTemplateColumns:`repeat(${boardSize},1fr)`,
          gap:boardSize===5?"6px":boardSize===4?"7px":"9px",
          opacity:aiThinking?0.7:1,
          pointerEvents:aiThinking?"none":"auto",
          transition:"opacity .2s"
        }}>
          {board.map((v,i)=>(<div key={i} className={cellClass(i)} onClick={()=>handleCellClick(i)}
            style={{borderRadius:boardSize===5?"8px":boardSize===4?"10px":"12px"}}>
            {v==="X"&&(currentSymbol.xEmoji?<span style={{fontSize:boardSize===5?"clamp(.8rem,4vw,1.3rem)":boardSize===4?"clamp(1rem,5vw,1.6rem)":"clamp(1.2rem,6vw,2rem)"}}>{currentSymbol.xEmoji}</span>:<XIcon/>)}
            {v==="O"&&(currentSymbol.oEmoji?<span style={{fontSize:boardSize===5?"clamp(.8rem,4vw,1.3rem)":boardSize===4?"clamp(1rem,5vw,1.6rem)":"clamp(1.2rem,6vw,2rem)"}}>{currentSymbol.oEmoji}</span>:<OIcon/>)}
          </div>))}
        </div>
        <div className={statusClass()}>{getStatus()}</div>
        <div className="row" style={{marginTop:10}}>
          <button className="btn btn-outline btn-sm" style={{flex:1}} onClick={resetGame}>↺ New</button>
          <button className="btn btn-outline btn-sm" style={{flex:1}} onClick={goHome}>⌂ Home</button>
          {mode==="online"&&<button className="btn btn-outline btn-sm" style={{flex:1}} onClick={()=>setShowGameChat(p=>!p)}>💬 Chat</button>}
        </div>
        {mode==="online"&&showGameChat&&(
          <div className="game-chat">
            <div className="game-chat-header">
              <span>💬 Game Chat</span>
              {isRecording&&<span style={{color:"var(--x)",fontSize:".65rem"}}>🔴 {recordingTime}s recording…</span>}
            </div>
            <div className="game-chat-msgs">
              {gameChatMsgs.length===0&&<div style={{color:"var(--muted)",fontSize:".68rem",textAlign:"center",padding:"8px 0"}}>Say hi! 👋</div>}
              {gameChatMsgs.map(m=>(
                <div key={m.id} className={`game-chat-msg ${m.uid===authUser.uid?"mine":"other"}`}>
                  <span style={{color:m.uid===authUser.uid?"var(--accent)":"var(--o)",fontWeight:700,fontSize:".62rem"}}>{m.uid===authUser.uid?"You":m.username}: </span>
                  {m.isVoice && m.audioBase64
                    ? <button className="voice-msg-btn" onClick={()=>playAudio(m.audioBase64)}>▶ {m.uid===authUser.uid?"Your":"Opponent's"} voice note 🎙️</button>
                    : <span>{m.text}</span>
                  }
                </div>
              ))}
              <div ref={gameChatEndRef}/>
            </div>
            <div className="emoji-row" style={{padding:"4px 8px"}}>{EMOJIS.map(e=>(<button key={e} className="emoji-btn" onClick={()=>sendGameChat(e)}>{e}</button>))}</div>
            <div className="game-chat-input">
              <input className="input" style={{flex:1,padding:"8px 10px",fontSize:".75rem"}} placeholder="Message…" value={gameChatInput} onChange={e=>setGameChatInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendGameChat(gameChatInput)} disabled={isRecording}/>
              <button
                className={`voice-btn ${isRecording?"recording":"idle"}`}
                onMouseDown={startRecording} onMouseUp={stopRecording}
                onTouchStart={e=>{e.preventDefault();startRecording();}} onTouchEnd={e=>{e.preventDefault();stopRecording();}}
                title={isRecording?"Release to send":"Hold to record"}
              >🎙️</button>
              <button className="btn btn-primary btn-sm" onClick={()=>sendGameChat(gameChatInput)} disabled={!gameChatInput.trim()||isRecording}>Send</button>
            </div>
            <div style={{padding:"4px 8px 6px",fontSize:".6rem",color:"var(--muted)",textAlign:"center"}}>
              Hold 🎙️ to record · Release to send
            </div>
          </div>
        )}
        {moveLog.length>0&&(<div style={{marginTop:12}}>
          <div className="label" style={{marginBottom:6}}>Move Log</div>
          <div className="log">{[...moveLog].reverse().map((m,i)=>(<div key={i} className="log-entry"><span className={m.player==="X"?"log-x":"log-o"}>●</span><span className={m.player==="X"?"log-x":"log-o"}>{m.player==="X"?players.X:players.O}</span><span style={{color:"var(--muted)"}}>→ Cell {m.cell+1}</span></div>))}</div>
        </div>)}
      </>)}
    </div></div></>
  );

  // ── FRIENDS SCREEN ────────────────────────────────────────────────────────────
  if(screen==="friends") return(
    <><style>{getCSS(currentTheme)}</style>
    <div className="app"><div style={{width:"100%",maxWidth:440}}>
      <TopBar backTo="home"/>
      <div style={{textAlign:"center",marginBottom:12}}><Logo small/><div className="tagline">👥 Friends</div></div>
      <div className="card">

        {friendMsg&&<div className={`alert ${friendMsg.startsWith("success")?"alert-success":"alert-error"}`} style={{marginBottom:10}}>{friendMsg.split(":")[1]}</div>}

        {/* Tabs */}
        <div className="tabs" style={{marginBottom:14}}>
          <button className={`tab ${friendSearch===""&&friendRequests.length===0?"active":""}`} onClick={()=>{setFriendSearch("");setFriendSearchResults([]);}}>
            👥 Friends ({friends.length})
          </button>
          <button className={`tab ${friendRequests.length>0?"active":""}`} onClick={()=>{}}>
            🔔 Requests {friendRequests.length>0&&<span style={{background:"var(--error)",color:"#fff",borderRadius:50,padding:"1px 5px",fontSize:".55rem",marginLeft:4}}>{friendRequests.length}</span>}
          </button>
          <button className="tab" onClick={()=>{setFriendSearch(" ");setFriendSearchResults([])}}>🔍 Find</button>
        </div>

        {/* Friend Requests */}
        {friendRequests.length>0&&(
          <div style={{marginBottom:14}}>
            <div className="label" style={{marginBottom:8}}>🔔 Friend Requests ({friendRequests.length})</div>
            {friendRequests.map(req=>(
              <div key={req.id} style={{display:"flex",gap:10,alignItems:"center",padding:"10px",borderRadius:10,background:"rgba(255,215,0,.06)",border:"1px solid rgba(255,215,0,.2)",marginBottom:8}}>
                <AvatarComp user={{username:req.fromUsername,photoURL:req.fromPhoto}} size="md"/>
                <div style={{flex:1}}>
                  <div style={{fontWeight:700,fontSize:".82rem"}}>{req.fromUsername}</div>
                  <div style={{fontSize:".65rem",color:"var(--muted)"}}>wants to be your friend</div>
                </div>
                <div style={{display:"flex",gap:6}}>
                  <button className="btn btn-o btn-sm" onClick={()=>acceptFriendRequest(req)}>✅</button>
                  <button className="btn btn-outline btn-sm" onClick={()=>declineFriendRequest(req)}>❌</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Search Friends */}
        <div style={{marginBottom:14}}>
          <div className="label" style={{marginBottom:8}}>🔍 Find Players</div>
          <div className="row" style={{marginBottom:10}}>
            <input className="input" style={{flex:1}} placeholder="Search by username…"
              value={friendSearch} onChange={e=>setFriendSearch(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&searchFriends()}/>
            <button className="btn btn-primary btn-sm" onClick={searchFriends} disabled={friendSearchBusy}>
              {friendSearchBusy?<span className="spinner"/>:"🔍"}
            </button>
          </div>
          {friendSearchResults.map(u=>{
            const isFriend = friends.find(f=>f.uid===u.uid);
            const isPending = sentRequests.find(r=>r.toUid===u.uid);
            return(
              <div key={u.uid} style={{display:"flex",gap:10,alignItems:"center",padding:"10px",borderRadius:10,background:"#16161f",border:"1px solid var(--border)",marginBottom:8}}>
                <AvatarComp user={u} size="md"/>
                <div style={{flex:1}}>
                  <div style={{fontWeight:700,fontSize:".82rem"}}>{u.username}</div>
                  <div style={{fontSize:".65rem",color:"var(--muted)"}}>
                    {isFriend?"✅ Already friends":isPending?"⏳ Request sent":"Tap to add"}
                  </div>
                </div>
                {!isFriend&&!isPending&&(
                  <button className="btn btn-primary btn-sm" onClick={()=>sendFriendRequest(u)}>➕ Add</button>
                )}
                {isFriend&&(
                  <button className="btn btn-o btn-sm" onClick={()=>{setActiveConvo(u);setScreen("private-chat");}}>💬</button>
                )}
              </div>
            );
          })}
        </div>

        {/* Friends List */}
        <div className="label" style={{marginBottom:8}}>👥 My Friends ({friends.length})</div>
        {friends.length===0&&(
          <div style={{textAlign:"center",color:"var(--muted)",padding:"24px 0",fontSize:".78rem"}}>
            No friends yet.<br/>Search for players to add them! 🔍
          </div>
        )}
        {friends.map(f=>{
          const isOnline = onlineFriends.find(o=>o.uid===f.uid);
          return(
            <div key={f.uid} style={{display:"flex",gap:10,alignItems:"center",padding:"10px",borderRadius:10,
              background:"#16161f",border:`1px solid ${isOnline?"rgba(46,213,115,.3)":"var(--border)"}`,marginBottom:8}}>
              <div style={{position:"relative"}}>
                <AvatarComp user={f} size="md"/>
                {isOnline&&<div style={{position:"absolute",bottom:0,right:0,width:10,height:10,borderRadius:"50%",background:"var(--o)",border:"2px solid var(--card)"}}/>}
              </div>
              <div style={{flex:1}}>
                <div style={{fontWeight:700,fontSize:".82rem"}}>{f.username}</div>
                <div style={{fontSize:".65rem",color:isOnline?"var(--o)":"var(--muted)"}}>
                  {isOnline?"🟢 Online":"⚫ Offline"}
                </div>
              </div>
              <div style={{display:"flex",gap:6}}>
                <button className="btn btn-o btn-sm" onClick={()=>{setActiveConvo(f);setScreen("private-chat");}}>💬</button>
                <button className="btn btn-primary btn-sm" onClick={()=>challengeFriend(f)}>⚡</button>
                <button className="btn btn-outline btn-sm" onClick={()=>removeFriend(f.uid,f.username)}>🗑️</button>
              </div>
            </div>
          );
        })}
      </div>
      <BottomNav/>
    </div></div></>
  );

  // ── MESSAGES SCREEN ────────────────────────────────────────────────────────────
  if(screen==="messages") return(
    <><style>{getCSS(currentTheme)}</style>
    <div className="app"><div style={{width:"100%",maxWidth:420}}>
      <TopBar/>
      <div style={{textAlign:"center",marginBottom:12}}><Logo small/><div className="tagline">💬 Messages</div></div>
      <div className="card">
        <div className="tabs">
          <button className={`tab ${msgTab==="inbox"?"active":""}`} onClick={()=>setMsgTab("inbox")}>📥 Inbox {totalUnread>0&&`(${totalUnread})`}</button>
          <button className={`tab ${msgTab==="search"?"active":""}`} onClick={()=>setMsgTab("search")}>🔍 Find Players</button>
        </div>

        {msgTab==="inbox"&&(<>
          {conversations.length===0&&(
            <div style={{textAlign:"center",color:"var(--muted)",padding:"32px 0",fontSize:".78rem"}}>
              No messages yet.<br/>Search for a player to start chatting! 🎮
            </div>
          )}
          {conversations.map(c=>{
            const otherId = c.members.find(m=>m!==authUser.uid);
            const otherName = c.memberNames?.[otherId]||"Player";
            const otherPhoto = c.memberPhotos?.[otherId]||null;
            const unread = c[`unread_${authUser.uid}`]||0;
            return(
              <div key={c.id} className="convo-item" onClick={()=>{setActiveConvo({uid:otherId,username:otherName,photoURL:otherPhoto});setScreen("private-chat");}}>
                <AvatarComp user={{username:otherName,photoURL:otherPhoto}} size="md"/>
                <div className="convo-info">
                  <div className="convo-name">{otherName}</div>
                  <div className="convo-last">{c.lastMsg||"Start a conversation"}</div>
                </div>
                {unread>0&&<div className="convo-badge">{unread}</div>}
              </div>
            );
          })}
        </>)}

        {msgTab==="search"&&(<>
          <div className="row" style={{marginBottom:12}}>
            <input className="input" style={{flex:1}} placeholder="Search by username…" value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} onKeyDown={e=>e.key==="Enter"&&searchUsers()}/>
            <button className="btn btn-primary btn-sm" onClick={searchUsers} disabled={searchBusy}>{searchBusy?<span className="spinner"/>:"🔍"}</button>
          </div>
          {searchResults.length===0&&searchQuery&&!searchBusy&&(
            <div style={{textAlign:"center",color:"var(--muted)",fontSize:".75rem",padding:"16px 0"}}>No players found for "{searchQuery}"</div>
          )}
          {searchResults.map(u=>(
            <div key={u.uid} className="player-item" onClick={()=>viewPlayerProfile(u)}>
              <AvatarComp user={u} size="md"/>
              <div style={{flex:1}}>
                <div style={{fontWeight:700,fontSize:".82rem"}}>{u.username}</div>
                <div style={{fontSize:".65rem",color:"var(--muted)"}}>Tap to view profile</div>
              </div>
              <button className="btn btn-o btn-sm" onClick={e=>{e.stopPropagation();openConversation(u);}}>💬 Message</button>
            </div>
          ))}
        </>)}
      </div>
      <BottomNav/>
    </div></div></>
  );

  // ── PRIVATE CHAT ──────────────────────────────────────────────────────────────
  if(screen==="private-chat"&&activeConvo) return(
    <><style>{getCSS(currentTheme)}</style>
    <div className="app"><div style={{width:"100%",maxWidth:420}}>
      {/* Chat header */}
      <div className="topbar">
        <div style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer"}} onClick={()=>viewPlayerProfile(activeConvo)}>
          <AvatarComp user={activeConvo} size="md"/>
          <div>
            <div className="topbar-name">{activeConvo.username}</div>
            <div className="topbar-email" style={{color:"var(--o)"}}>Tap to view profile</div>
          </div>
        </div>
        <button className="btn btn-outline btn-sm" onClick={()=>{setScreen("messages");setActiveConvo(null);setPrivMessages([]);}} style={{width:"auto"}}>← Back</button>
      </div>

      <div className="card" style={{padding:"12px",display:"flex",flexDirection:"column",height:"calc(100vh - 180px)",minHeight:400}}>
        {/* Messages */}
        <div className="chat-messages" style={{flex:1}}>
          {privMessages.length===0&&(
            <div style={{textAlign:"center",color:"var(--muted)",padding:"32px 0",fontSize:".75rem"}}>
              No messages yet.<br/>Say hello to {activeConvo.username}! 👋
            </div>
          )}
          {privMessages.map(m=>(
            <div key={m.id} className={`chat-msg ${m.senderUid===authUser.uid?"mine":""}`}>
              {m.senderUid!==authUser.uid&&<AvatarComp user={{username:m.senderName,photoURL:m.senderPhoto}} size="sm"/>}
              <div>
                <div className={`chat-bubble ${m.senderUid===authUser.uid?"mine":"other"}`}>{m.text}</div>
                <div className="chat-time">{fmtTime(m.createdAt)}</div>
              </div>
            </div>
          ))}
          <div ref={privEndRef}/>
        </div>

        {/* Emoji row */}
        <div className="emoji-row">{EMOJIS.map(e=>(<button key={e} className="emoji-btn" onClick={()=>{setPrivInput(p=>p+e)}}>{e}</button>))}</div>

        {/* Input */}
        <div className="chat-input-row">
          <input className="input" style={{flex:1,padding:"9px 12px",fontSize:".78rem"}} placeholder="Type a message…" value={privInput} onChange={e=>setPrivInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendPrivMessage()}/>
          <button className="btn btn-primary btn-sm" onClick={sendPrivMessage} disabled={!privInput.trim()||privSending}>
            {privSending?<span className="spinner"/>:"Send"}
          </button>
        </div>
      </div>
    </div></div></>
  );

  // ── VIEW PLAYER PROFILE ───────────────────────────────────────────────────────
  if(screen==="view-profile"&&viewingProfile) return(
    <><style>{getCSS(currentTheme)}</style>
    <div className="app"><div style={{width:"100%",maxWidth:420}}>
      <TopBar backTo="messages"/>
      <div className="card gap">
        <div className="profile-view">
          <AvatarComp user={viewingProfile} size="lg"/>
          <div className="profile-view-name">{viewingProfile.username}</div>
          <div style={{color:"var(--muted)",fontSize:".72rem",marginTop:4}}>FavsTicTac Lovers Player</div>
        </div>

        {/* Stats */}
        <div className="profile-view-stats">
          {[["🏆",viewingProfile.wins||0,"Wins","var(--o)"],["🤝",viewingProfile.draws||0,"Draws","var(--accent)"],["🎮",viewingProfile.games||0,"Games","var(--muted)"]].map(([icon,val,lbl,color])=>(
            <div key={lbl} className="stat-box">
              <div style={{fontSize:"1rem"}}>{icon}</div>
              <div className="stat-val" style={{color}}>{val}</div>
              <div className="stat-lbl">{lbl}</div>
            </div>
          ))}
        </div>

        {/* Rank */}
        {(()=>{
          const rank = leaderboard.findIndex(p=>p.username===viewingProfile.username)+1;
          return rank>0?(
            <div style={{textAlign:"center",background:"#16161f",borderRadius:8,padding:"10px",border:"1px solid var(--border)"}}>
              <span style={{color:"var(--muted)",fontSize:".7rem"}}>Leaderboard Rank </span>
              <span style={{color:"var(--accent)",fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:"1.1rem"}}>#{rank}</span>
            </div>
          ):null;
        })()}

        <button className="btn btn-primary" onClick={()=>{openConversation(viewingProfile);}}>💬 Send Message</button>
        <button className="btn btn-outline" onClick={()=>setScreen("messages")}>← Back to Messages</button>
      </div>
    </div></div></>
  );

  // ── LEADERBOARD ───────────────────────────────────────────────────────────────
  if(screen==="leaderboard") return(
    <><style>{getCSS(currentTheme)}</style>
    <div className="app"><div style={{width:"100%",maxWidth:440}}>
      <TopBar/>
      <div style={{textAlign:"center",marginBottom:16}}><Logo small/><div className="tagline">🏆 Global Leaderboard</div></div>
      <div className="card">
        <div className="lb-row lb-header"><span>#</span><span></span><span>Player</span><span style={{textAlign:"center"}}>W</span><span style={{textAlign:"center"}}>D</span><span style={{textAlign:"center"}}>G</span></div>
        {leaderboard.length===0&&<div style={{textAlign:"center",color:"var(--muted)",padding:"28px 0",fontSize:".78rem"}}>No games yet. Be the first! 🎯</div>}
        {leaderboard.map((p,i)=>(
          <div key={p.id} className="lb-row" style={{cursor:"pointer",background:p.username===authUser.username?"rgba(255,215,0,.04)":"transparent"}}
            onClick={()=>{if(p.id!==authUser.uid) viewPlayerProfile({uid:p.id,...p});}}>
            <span className={`lb-rank ${i===0?"gold":i===1?"silver":i===2?"bronze":""}`}>{i+1}</span>
            <AvatarComp user={{username:p.username,photoURL:p.photoURL}} size="sm"/>
            <span style={{fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",color:p.username===authUser.username?"var(--accent)":"inherit"}}>{p.username}{p.username===authUser.username?" (you)":""}</span>
            <span style={{textAlign:"center",color:"var(--o)"}}>{p.wins||0}</span>
            <span style={{textAlign:"center",color:"var(--accent)"}}>{p.draws||0}</span>
            <span style={{textAlign:"center",color:"var(--muted)"}}>{p.games||0}</span>
          </div>
        ))}
        <div className="row" style={{marginTop:14}}>
          <button className="btn btn-outline btn-sm" onClick={()=>setScreen("home")}>← Home</button>
          <button className="btn btn-outline btn-sm" onClick={()=>{loadMyHistory(authUser.uid);setScreen("history")}}>📜 My History</button>
        </div>
      </div>
      <BottomNav/>
    </div></div></>
  );

  // ── HISTORY ───────────────────────────────────────────────────────────────────
  if(screen==="history") return(
    <><style>{getCSS(currentTheme)}</style>
    <div className="app"><div style={{width:"100%",maxWidth:440}}>
      <TopBar backTo="leaderboard"/>
      <div style={{textAlign:"center",marginBottom:16}}><Logo small/><div className="tagline">📜 {authUser.username}'s History</div></div>
      <div className="card">
        {myHistory.length===0&&<div style={{textAlign:"center",color:"var(--muted)",padding:"28px 0",fontSize:".78rem"}}>No games yet!</div>}
        <div style={{maxHeight:420,overflowY:"auto",scrollbarWidth:"thin"}}>
          {myHistory.map(g=>(
            <div key={g.id} className="hist-item">
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                <span style={{fontWeight:700,color:g.winner==="Draw"?"var(--accent)":g.winner===authUser.username?"var(--o)":"var(--x)"}}>
                  {g.winner==="Draw"?"🤝 Draw":g.winner===authUser.username?"🏆 Won":"💀 Lost"}
                </span>
                <span style={{color:"var(--muted)",fontSize:".62rem"}}>{g.mode}</span>
              </div>
              <div style={{color:"var(--muted)",fontSize:".68rem"}}>{g.players?.X} <span style={{color:"var(--x)"}}>X</span> vs {g.players?.O} <span style={{color:"var(--o)"}}>O</span> · {g.moves} moves</div>
            </div>
          ))}
        </div>
        <div className="row" style={{marginTop:14}}>
          <button className="btn btn-outline btn-sm" onClick={()=>setScreen("home")}>← Home</button>
          <button className="btn btn-outline btn-sm" onClick={()=>{loadLeaderboard();setScreen("leaderboard")}}>🏆 Leaderboard</button>
        </div>
      </div>
    </div></div></>
  );

  // ── PROFILE ───────────────────────────────────────────────────────────────────
  if(screen==="profile") return(
    <><style>{getCSS(currentTheme)}</style>
    <div className="app"><div style={{width:"100%",maxWidth:440}}>
      <TopBar/>
      <div style={{textAlign:"center",marginBottom:16}}><Logo small/><div className="tagline">👤 My Profile</div></div>
      <div className="card gap" style={{maxHeight:"80vh",overflowY:"auto",scrollbarWidth:"thin"}}>

        {/* Avatar */}
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:8,paddingBottom:14,borderBottom:"1px solid var(--border)"}}>
          <input type="file" ref={fileInputRef} accept="image/*" style={{display:"none"}} onChange={handlePhotoUpload}/>
          <div onClick={()=>fileInputRef.current?.click()}><AvatarComp user={authUser} size="lg"/></div>
          {uploadingPhoto&&<div style={{color:"var(--muted)",fontSize:".7rem"}}><span className="spinner"/> Uploading…</div>}
          {photoMsg&&<div className={`alert ${photoMsg.startsWith("success")?"alert-success":"alert-error"}`} style={{fontSize:".7rem"}}>{photoMsg.split(":")[1]}</div>}
          <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:"1.1rem"}}>{authUser.username}</div>
          <div style={{color:"var(--muted)",fontSize:".72rem"}}>{authUser.email}</div>
          <div style={{color:"var(--muted)",fontSize:".65rem"}}>Tap avatar to change photo 📷</div>
        </div>

        {/* Stats */}
        <div>
          <div className="label" style={{marginBottom:8}}>📊 My Stats</div>
          {(()=>{const me=leaderboard.find(p=>p.username===authUser.username);return me?(
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
              {[["🏆",me.wins||0,"Wins","var(--o)"],["🤝",me.draws||0,"Draws","var(--accent)"],["🎮",me.games||0,"Games","var(--muted)"]].map(([icon,v,l,c])=>(
                <div key={l} style={{background:"#16161f",borderRadius:8,padding:"10px 6px",textAlign:"center",border:"1px solid var(--border)"}}>
                  <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:"1.2rem",color:c}}>{v}</div>
                  <div style={{fontSize:".6rem",color:"var(--muted)"}}>{icon} {l}</div>
                </div>
              ))}
            </div>
          ):<div style={{color:"var(--muted)",fontSize:".75rem"}}>Play a game to see your stats!</div>})()}
        </div>

        {/* Change Username */}
        <div style={{borderTop:"1px solid var(--border)",paddingTop:14}}>
          <div className="label" style={{marginBottom:8}}>✏️ Change Username</div>
          {editUsernameMsg&&<div className={`alert ${editUsernameMsg.startsWith("success")?"alert-success":"alert-error"}`} style={{marginBottom:8,fontSize:".7rem"}}>{editUsernameMsg.split(":")[1]}</div>}
          <div className="row">
            <input className="input" style={{flex:1}} placeholder={`Current: ${authUser.username}`} value={editUsername} onChange={e=>setEditUsername(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleEditUsername()}/>
            <button className="btn btn-primary btn-sm" onClick={handleEditUsername} disabled={editUsernameBusy} style={{whiteSpace:"nowrap"}}>{editUsernameBusy?<span className="spinner"/>:"Save"}</button>
          </div>
        </div>

        {/* Change Email */}
        <div style={{borderTop:"1px solid var(--border)",paddingTop:14}}>
          <div className="label" style={{marginBottom:8}}>📧 Change Email</div>
          {editEmailMsg&&<div className={`alert ${editEmailMsg.startsWith("success")?"alert-success":"alert-error"}`} style={{marginBottom:8,fontSize:".7rem"}}>{editEmailMsg.split(":")[1]}</div>}
          <div className="gap">
            <input className="input" type="email" placeholder="New email address" value={editEmail} onChange={e=>setEditEmail(e.target.value)}/>
            <input className="input" type="password" placeholder="Current password (to confirm)" value={editEmailPw} onChange={e=>setEditEmailPw(e.target.value)}/>
            <button className="btn btn-outline" onClick={handleEditEmail} disabled={editEmailBusy}>{editEmailBusy?<><span className="spinner"/> Updating…</>:"📧 Update Email"}</button>
          </div>
        </div>

        {/* Reset Password */}
        <div style={{borderTop:"1px solid var(--border)",paddingTop:14}}>
          <div className="label" style={{marginBottom:8}}>🔑 Reset Password</div>
          <div style={{color:"var(--muted)",fontSize:".72rem",marginBottom:10}}>Send a reset link to <span style={{color:"var(--accent)"}}>{authUser.email}</span></div>
          {forgotMsg&&<div className={`alert ${forgotMsg.startsWith("success")?"alert-success":"alert-error"}`} style={{marginBottom:8,fontSize:".7rem"}}>{forgotMsg.split(":")[1]}</div>}
          <button className="btn btn-outline" onClick={()=>handleForgotPassword(authUser.email)} disabled={forgotBusy}>{forgotBusy?<><span className="spinner"/> Sending…</>:"📧 Send Password Reset Email"}</button>
        </div>

        {/* Account Info */}
        <div style={{borderTop:"1px solid var(--border)",paddingTop:14}}>
          <div className="label" style={{marginBottom:8}}>🆔 Account Info</div>
          <div style={{background:"#16161f",borderRadius:8,padding:10,fontSize:".7rem",display:"flex",flexDirection:"column",gap:6}}>
            <div style={{display:"flex",justifyContent:"space-between"}}><span style={{color:"var(--muted)"}}>Username</span><span style={{fontWeight:700}}>{authUser.username}</span></div>
            <div style={{display:"flex",justifyContent:"space-between"}}><span style={{color:"var(--muted)"}}>Email</span><span style={{fontWeight:700,fontSize:".65rem"}}>{authUser.email}</span></div>
            <div style={{display:"flex",justifyContent:"space-between"}}><span style={{color:"var(--muted)"}}>User ID</span><span style={{color:"var(--muted)",fontSize:".6rem"}}>{authUser.uid?.slice(0,12)}…</span></div>
          </div>
        </div>

        <button className="btn btn-primary" onClick={()=>setScreen("shop")}>🛍️ Theme Shop (🪙 {userCoins} coins)</button>
        <button className="btn btn-primary" onClick={()=>{loadCoinHistory();setScreen("coins")}}>🪙 Coin Wallet ({userCoins} coins)</button>
        <button className="btn btn-outline" onClick={()=>setScreen("achievements")}>🏅 My Achievements ({(userStats.achievements||[]).length}/{ACHIEVEMENTS.length})</button>
        <button className="btn btn-outline" onClick={()=>{loadMyHistory(authUser.uid);setScreen("history")}}>📜 View Game History</button>
        {authUser.uid==="FeJCFJjq36XSLXvxbs7UIt7I9Oo1"&&(
          <button className="btn btn-primary" onClick={()=>setScreen("admin")}>🎛️ Admin Dashboard</button>
        )}
        <button className="btn btn-x" onClick={handleLogout}>🚪 Sign Out</button>
      </div>
      <BottomNav/>
    </div></div></>
  );

  // ── ADMIN DASHBOARD ───────────────────────────────────────────────────────────
  // ── COIN WALLET ───────────────────────────────────────────────────────────────
  if(screen==="coins") return(
    <><style>{getCSS(currentTheme)}</style>
    <div className="app"><div style={{width:"100%",maxWidth:440}}>
      <TopBar backTo="profile"/>
      <div style={{textAlign:"center",marginBottom:16}}><Logo small/><div className="tagline">🪙 Coin Wallet</div></div>
      <div className="card gap">

        {/* Balance card */}
        <div style={{background:"linear-gradient(135deg,#1a0828,#0a1a10)",borderRadius:14,padding:"20px",textAlign:"center",border:"2px solid var(--accent)"}}>
          <div style={{fontSize:".72rem",color:"var(--muted)",textTransform:"uppercase",letterSpacing:2,marginBottom:6}}>Total Balance</div>
          <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:"2.8rem",color:"var(--accent)",lineHeight:1}}>🪙 {userCoins}</div>
          <div style={{fontSize:".7rem",color:"var(--muted)",marginTop:8}}>Earn 10 coins per win · Daily login bonus</div>
        </div>

        {/* Tabs */}
        <div className="coin-tabs">
          {[["💰","deposit","Deposit"],["💸","withdraw","Withdraw"],["📜","history","History"]].map(([icon,t,label])=>(
            <button key={t} className={`coin-tab ${coinScreen===t?"active":""}`}
              onClick={()=>{setCoinScreen(t);setCoinMsg("");if(t==="history")loadCoinHistory();}}>
              {icon} {label}
            </button>
          ))}
        </div>

        {coinMsg&&<div className={`alert ${coinMsg.startsWith("success")?"alert-success":"alert-error"}`}>{coinMsg.split(":")[1]}</div>}

        {/* Deposit */}
        {coinScreen==="deposit"&&(
          <div className="gap">
            <div style={{fontSize:".75rem",color:"var(--muted)",lineHeight:1.6}}>
              Add coins to your wallet. Minimum deposit is <span style={{color:"var(--accent)",fontWeight:700}}>10 coins</span>.
            </div>
            {/* Quick amounts */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>
              {[50,100,250,500].map(a=>(
                <button key={a} onClick={()=>setCoinAmount(String(a))}
                  style={{padding:"10px 4px",borderRadius:9,border:`2px solid ${coinAmount===String(a)?"var(--accent)":"var(--border)"}`,
                    background:coinAmount===String(a)?"rgba(255,215,0,.1)":"#16161f",
                    color:coinAmount===String(a)?"var(--accent)":"var(--muted)",
                    cursor:"pointer",fontFamily:"'Space Mono',monospace",fontSize:".72rem",fontWeight:700}}>
                  {a}
                </button>
              ))}
            </div>
            <div className="field">
              <div className="label">Custom Amount</div>
              <input className="input" type="number" placeholder="Enter amount…" value={coinAmount}
                onChange={e=>setCoinAmount(e.target.value)}
                onKeyDown={e=>e.key==="Enter"&&depositCoins()}/>
            </div>
            <button className="btn btn-primary" onClick={depositCoins} disabled={coinBusy||!coinAmount}>
              {coinBusy?<><span className="spinner"/> Processing…</>:"💰 Deposit Coins"}
            </button>
            <div style={{fontSize:".65rem",color:"var(--muted)",textAlign:"center"}}>
              ⚠️ This is a virtual coin system for the game only.
            </div>
          </div>
        )}

        {/* Withdraw */}
        {coinScreen==="withdraw"&&(
          <div className="gap">
            <div style={{fontSize:".75rem",color:"var(--muted)",lineHeight:1.6}}>
              Withdraw coins from your wallet. You have <span style={{color:"var(--accent)",fontWeight:700}}>🪙 {userCoins} coins</span> available.
            </div>
            {/* Quick amounts */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>
              {[10,25,50,100].map(a=>(
                <button key={a} onClick={()=>setCoinAmount(String(a))}
                  style={{padding:"10px 4px",borderRadius:9,border:`2px solid ${coinAmount===String(a)?"var(--x)":"var(--border)"}`,
                    background:coinAmount===String(a)?"rgba(255,71,87,.1)":"#16161f",
                    color:coinAmount===String(a)?"var(--x)":"var(--muted)",
                    cursor:"pointer",fontFamily:"'Space Mono',monospace",fontSize:".72rem",fontWeight:700,
                    opacity:a>userCoins?0.4:1}}>
                  {a}
                </button>
              ))}
            </div>
            <div className="field">
              <div className="label">Custom Amount</div>
              <input className="input" type="number" placeholder="Enter amount…" value={coinAmount}
                onChange={e=>setCoinAmount(e.target.value)}
                onKeyDown={e=>e.key==="Enter"&&withdrawCoins()}/>
            </div>
            <button className="btn btn-x" onClick={withdrawCoins} disabled={coinBusy||!coinAmount||parseInt(coinAmount)>userCoins}>
              {coinBusy?<><span className="spinner"/> Processing…</>:"💸 Withdraw Coins"}
            </button>
            <div style={{fontSize:".65rem",color:"var(--muted)",textAlign:"center"}}>
              ⚠️ This is a virtual coin system for the game only.
            </div>
          </div>
        )}

        {/* History */}
        {coinScreen==="history"&&(
          <div>
            <div style={{fontSize:".72rem",color:"var(--muted)",marginBottom:10}}>
              Your last 30 coin transactions
            </div>
            {coinHistoryLoading&&<div style={{textAlign:"center",padding:"20px 0"}}><span className="spinner"/></div>}
            {!coinHistoryLoading&&coinHistory.length===0&&(
              <div style={{textAlign:"center",color:"var(--muted)",padding:"24px 0",fontSize:".78rem"}}>
                No transactions yet.<br/>Play games or deposit coins!
              </div>
            )}
            {coinHistory.map(h=>(
              <div key={h.id} className="coin-hist-item">
                <div>
                  <div style={{fontSize:".78rem",fontWeight:700}}>{h.description}</div>
                  <div style={{fontSize:".62rem",color:"var(--muted)",marginTop:2}}>
                    Balance after: 🪙 {h.balance}
                    {h.createdAt?.seconds&&" · "+new Date(h.createdAt.seconds*1000).toLocaleDateString()}
                  </div>
                </div>
                <div className={`coin-hist-amount ${h.type==="deposit"?"coin-hist-deposit":h.type==="withdraw"?"coin-hist-withdraw":"coin-hist-win"}`}>
                  {h.type==="withdraw"?"-":"+"}🪙{h.amount}
                </div>
              </div>
            ))}
          </div>
        )}

        <button className="btn btn-outline" onClick={()=>setScreen("profile")}>← Back to Profile</button>
      </div>
    </div></div></>
  );

  // ── THEME SHOP ────────────────────────────────────────────────────────────────
  if(screen==="shop") return(
    <><style>{getCSS(currentTheme)}</style>
    <div className="app" style={{background:`radial-gradient(ellipse at 15% 40%,${currentTheme.colors.bg} 0%,#08080f 55%)`}}>
    <div style={{width:"100%",maxWidth:440}}>
      <TopBar backTo="profile"/>
      <div style={{textAlign:"center",marginBottom:12}}><Logo small/><div className="tagline">🛍️ Theme Shop</div></div>

      {/* Balance */}
      <div style={{display:"flex",justifyContent:"center",marginBottom:14}}>
        <div className="coins-display" style={{fontSize:".85rem",padding:"8px 16px"}}>🪙 {userCoins} coins available</div>
      </div>

      <div className="card gap">
        <div className="tabs">
          <button className={`tab ${screen==="shop"?"active":""}`} onClick={()=>{}}>🎨 Board Themes</button>
          <button className={`tab`} onClick={()=>setScreen("symbol-shop")}>✕ Symbols</button>
        </div>

        {/* Themes Grid */}
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {THEMES.map(t=>{
            const owned = ownedThemes.includes(t.id);
            const active = activeTheme===t.id;
            return(
              <div key={t.id} style={{display:"flex",gap:12,alignItems:"center",padding:"12px",borderRadius:12,
                border:`2px solid ${active?t.colors.accent:"var(--border)"}`,
                background:active?`rgba(${parseInt(t.colors.accent.slice(1,3),16)},${parseInt(t.colors.accent.slice(3,5),16)},${parseInt(t.colors.accent.slice(5,7),16)},0.08)`:"#16161f",
                cursor:"pointer",transition:"all .2s"}} onClick={()=>buyTheme(t)}>
                {/* Color preview */}
                <div style={{display:"flex",gap:3,flexShrink:0}}>
                  {t.preview.map((c,i)=>(
                    <div key={i} style={{width:i===0?28:i===1?22:16,height:44,borderRadius:6,background:c,border:"1px solid rgba(255,255,255,.1)"}}/>
                  ))}
                </div>
                <div style={{flex:1}}>
                  <div style={{fontWeight:700,fontSize:".85rem",color:active?t.colors.accent:"#f0ede8"}}>{t.name}</div>
                  <div style={{fontSize:".65rem",color:"var(--muted)",marginTop:3}}>
                    {active?"✅ Active":owned?"✅ Owned — tap to activate":t.price===0?"Free":"🪙 "+t.price+" coins"}
                  </div>
                </div>
                <div style={{flexShrink:0}}>
                  {active&&<span style={{color:t.colors.accent,fontSize:"1.2rem"}}>✓</span>}
                  {!active&&!owned&&<span style={{fontSize:".72rem",color:userCoins>=t.price?t.colors.accent:"var(--muted)",fontWeight:700}}>
                    {userCoins>=t.price?"Buy":"🔒"}
                  </span>}
                  {!active&&owned&&<span style={{fontSize:".72rem",color:"var(--o)",fontWeight:700}}>Use</span>}
                </div>
              </div>
            );
          })}
        </div>
        <button className="btn btn-outline" onClick={()=>setScreen("profile")}>← Back</button>
      </div>
    </div></div></>
  );

  // ── SYMBOL SHOP ───────────────────────────────────────────────────────────────
  if(screen==="symbol-shop") return(
    <><style>{getCSS(currentTheme)}</style>
    <div className="app"><div style={{width:"100%",maxWidth:440}}>
      <TopBar backTo="shop"/>
      <div style={{textAlign:"center",marginBottom:12}}><Logo small/><div className="tagline">✕ Symbol Shop</div></div>
      <div style={{display:"flex",justifyContent:"center",marginBottom:14}}>
        <div className="coins-display" style={{fontSize:".85rem",padding:"8px 16px"}}>🪙 {userCoins} coins available</div>
      </div>
      <div className="card gap">
        <div className="tabs">
          <button className="tab" onClick={()=>setScreen("shop")}>🎨 Board Themes</button>
          <button className="tab active">✕ Symbols</button>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {SYMBOLS.map(s=>{
            const owned = ownedSymbols.includes(s.id);
            const active = activeSymbols.X===s.id;
            return(
              <div key={s.id} style={{display:"flex",gap:12,alignItems:"center",padding:"12px",borderRadius:12,
                border:`2px solid ${active?"var(--accent)":"var(--border)"}`,
                background:active?"rgba(255,215,0,.06)":"#16161f",
                cursor:"pointer",transition:"all .2s"}} onClick={()=>buySymbol(s)}>
                {/* Preview */}
                <div style={{display:"flex",gap:8,alignItems:"center",fontSize:"1.5rem",minWidth:70,justifyContent:"center"}}>
                  {s.xEmoji?<span>{s.xEmoji}</span>:<span style={{color:"var(--x)",fontSize:"1.2rem",fontWeight:900}}>✕</span>}
                  <span style={{color:"var(--muted)",fontSize:".8rem"}}>vs</span>
                  {s.oEmoji?<span>{s.oEmoji}</span>:<span style={{color:"var(--o)",fontSize:"1.2rem",fontWeight:900}}>○</span>}
                </div>
                <div style={{flex:1}}>
                  <div style={{fontWeight:700,fontSize:".85rem",color:active?"var(--accent)":"#f0ede8"}}>{s.name}</div>
                  <div style={{fontSize:".65rem",color:"var(--muted)",marginTop:3}}>
                    {active?"✅ Active":owned?"✅ Owned — tap to activate":s.price===0?"Free":"🪙 "+s.price+" coins"}
                  </div>
                </div>
                <div>
                  {active&&<span style={{color:"var(--accent)",fontSize:"1.2rem"}}>✓</span>}
                  {!active&&!owned&&<span style={{fontSize:".72rem",color:userCoins>=s.price?"var(--accent)":"var(--muted)",fontWeight:700}}>
                    {userCoins>=s.price?"Buy":"🔒"}
                  </span>}
                  {!active&&owned&&<span style={{fontSize:".72rem",color:"var(--o)",fontWeight:700}}>Use</span>}
                </div>
              </div>
            );
          })}
        </div>
        <button className="btn btn-outline" onClick={()=>setScreen("profile")}>← Back</button>
      </div>
    </div></div></>
  );

  // ── ACHIEVEMENTS SCREEN ───────────────────────────────────────────────────────
  if(screen==="achievements") return(
    <><style>{getCSS(currentTheme)}</style>
    <div className="app"><div style={{width:"100%",maxWidth:440}}>
      <TopBar backTo="profile"/>
      <div style={{textAlign:"center",marginBottom:16}}><Logo small/><div className="tagline">🏅 Achievements</div></div>
      <div className="card">
        {/* Stats summary */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:16}}>
          {[["🔥",streak,"Streak"],["🪙",userCoins,"Coins"],["🏅",(userStats.achievements||[]).length,"Earned"]].map(([icon,val,lbl])=>(
            <div key={lbl} style={{background:"#16161f",borderRadius:8,padding:"10px 6px",textAlign:"center",border:"1px solid var(--border)"}}>
              <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:"1.2rem",color:"var(--accent)"}}>{val}</div>
              <div style={{fontSize:".6rem",color:"var(--muted)"}}>{icon} {lbl}</div>
            </div>
          ))}
        </div>
        <div style={{maxHeight:500,overflowY:"auto",scrollbarWidth:"thin",display:"flex",flexDirection:"column",gap:8}}>
          {ACHIEVEMENTS.map(a=>{
            const earned = (userStats.achievements||[]).includes(a.id);
            return(
              <div key={a.id} style={{display:"flex",gap:12,alignItems:"center",padding:"10px 12px",borderRadius:10,
                background:earned?"rgba(255,215,0,.06)":"#16161f",border:`1px solid ${earned?"var(--accent)":"var(--border)"}`,
                opacity:earned?1:0.5,transition:"all .2s"}}>
                <div style={{fontSize:"1.8rem",filter:earned?"none":"grayscale(1)"}}>{a.icon}</div>
                <div style={{flex:1}}>
                  <div style={{fontWeight:700,fontSize:".8rem",color:earned?"var(--accent)":"#f0ede8"}}>{a.title}</div>
                  <div style={{fontSize:".65rem",color:"var(--muted)",marginTop:2}}>{a.desc}</div>
                </div>
                {earned&&<div style={{fontSize:".65rem",color:"var(--accent)",fontWeight:700}}>✅</div>}
                {!earned&&<div style={{fontSize:".65rem",color:"var(--muted)"}}>🔒</div>}
              </div>
            );
          })}
        </div>
        <button className="btn btn-outline" style={{marginTop:14}} onClick={()=>setScreen("profile")}>← Back</button>
      </div>
    </div></div></>
  );

  // ── NOTIFICATIONS SCREEN ─────────────────────────────────────────────────────
  if(screen==="notifications") return(
    <><style>{getCSS(currentTheme)}</style>
    <div className="app"><div style={{width:"100%",maxWidth:440}}>
      <TopBar backTo="home"/>
      <div style={{textAlign:"center",marginBottom:12}}><Logo small/><div className="tagline">🔔 Notifications</div></div>
      <div className="card">
        {/* Mark all read button */}
        {unreadNotifs>0&&(
          <button className="btn btn-outline btn-sm" style={{marginBottom:12,width:"100%"}} onClick={markAllNotifsRead}>
            ✅ Mark All as Read ({unreadNotifs} unread)
          </button>
        )}

        {notifications.length===0&&globalAnnouncements.length===0&&(
          <div style={{textAlign:"center",color:"var(--muted)",padding:"32px 0",fontSize:".78rem"}}>
            No notifications yet! 🔔<br/>Play games and connect with friends!
          </div>
        )}

        {/* Global Announcements in notifications */}
        {globalAnnouncements.length>0&&(
          <div style={{marginBottom:12}}>
            <div className="label" style={{marginBottom:8}}>📢 Announcements</div>
            {globalAnnouncements.map(a=>(
              <div key={a.id} style={{display:"flex",gap:10,padding:"12px",borderRadius:10,
                background:"rgba(255,215,0,.06)",border:"1px solid rgba(255,215,0,.2)",marginBottom:8}}>
                <span style={{fontSize:"1.5rem"}}>📢</span>
                <div style={{flex:1}}>
                  <div style={{fontWeight:700,fontSize:".78rem",color:"var(--accent)"}}>Admin Announcement</div>
                  <div style={{fontSize:".72rem",color:"#f0ede8",lineHeight:1.5,marginTop:3}}>{a.text}</div>
                  <div style={{fontSize:".6rem",color:"var(--muted)",marginTop:4}}>
                    By {a.createdBy} · {a.createdAt?.seconds?new Date(a.createdAt.seconds*1000).toLocaleDateString():""}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {notifications.length>0&&<div className="label" style={{marginBottom:8}}>🔔 Your Notifications</div>}

        <div style={{maxHeight:"65vh",overflowY:"auto",scrollbarWidth:"thin",display:"flex",flexDirection:"column",gap:8}}>
          {notifications.map(n=>(
            <div key={n.id} onClick={()=>{markNotifRead(n.id);
              if(n.type==="message"){setScreen("messages");}
              else if(n.type==="friend_request"||n.type==="friend_accepted"){loadFriends();setScreen("friends");}
            }} style={{display:"flex",gap:10,alignItems:"flex-start",padding:"12px",borderRadius:10,
              background:n.read?"#16161f":"rgba(255,215,0,.06)",
              border:`1px solid ${n.read?"var(--border)":"var(--accent)"}`,
              cursor:"pointer",transition:"all .18s"}}>
              {/* Avatar */}
              <div style={{width:40,height:40,borderRadius:"50%",background:"linear-gradient(135deg,#1a0828,#0a1a10)",
                border:"2px solid var(--border)",display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:".85rem",fontWeight:700,overflow:"hidden",flexShrink:0}}>
                {n.fromPhoto?<img src={n.fromPhoto} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                  :n.fromUsername?.slice(0,2).toUpperCase()}
              </div>
              <div style={{flex:1}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:3}}>
                  <div style={{fontWeight:700,fontSize:".78rem",color:n.read?"#f0ede8":"var(--accent)"}}>{n.title}</div>
                  {!n.read&&<div style={{width:8,height:8,borderRadius:"50%",background:"var(--accent)",flexShrink:0}}/>}
                </div>
                <div style={{fontSize:".72rem",color:"var(--muted)",lineHeight:1.5}}>{n.body}</div>
                <div style={{fontSize:".6rem",color:"var(--muted)",marginTop:4}}>
                  {n.createdAt?.seconds?new Date(n.createdAt.seconds*1000).toLocaleString():"Just now"}
                </div>
              </div>
            </div>
          ))}
        </div>
        <button className="btn btn-outline" style={{marginTop:12}} onClick={()=>setScreen("home")}>← Back to Home</button>
      </div>
      <BottomNav/>
    </div></div></>
  );

  // ── PRIVACY POLICY ───────────────────────────────────────────────────────────
  if(screen==="privacy") return(
    <><style>{getCSS(currentTheme)}</style>
    <div className="app"><div style={{width:"100%",maxWidth:440}}>
      <TopBar backTo="home"/>
      <div style={{textAlign:"center",marginBottom:16}}><Logo small/><div className="tagline">🔒 Privacy Policy</div></div>
      <div className="card" style={{maxHeight:"78vh",overflowY:"auto",scrollbarWidth:"thin"}}>
        <div style={{fontSize:".72rem",lineHeight:1.8,display:"flex",flexDirection:"column",gap:14}}>

          <div style={{textAlign:"center",borderBottom:"1px solid var(--border)",paddingBottom:12}}>
            <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:"1rem",color:"var(--accent)"}}>FavsTicTac Lovers</div>
            <div style={{color:"var(--muted)",fontSize:".65rem",marginTop:4}}>Privacy Policy · Last updated: May 2026</div>
          </div>

          {[
            ["📋 Introduction", "FavsTicTac Lovers ('we', 'our', 'us') is owned and operated by Adepoju Favour Emmanuel. This Privacy Policy explains how we collect, use, and protect your personal information when you use our app at favstictac-lovers.netlify.app."],
            ["📊 Information We Collect", "We collect: (1) Account information — your username, email address and profile picture when you register. (2) Game data — your game history, wins, draws and leaderboard statistics. (3) Messages — private messages you send to other players within the app. (4) Usage data — how you interact with the app including games played and features used."],
            ["🎯 How We Use Your Information", "We use your information to: provide and improve the app experience, display your stats on the leaderboard, enable private messaging between players, send password reset emails when requested, and allow admin to manage the platform."],
            ["🔒 Data Security", "Your password is encrypted using SHA-256 hashing and is never stored in plain text. We use Firebase (by Google) for authentication and data storage, which provides industry-standard security. We never sell your personal data to third parties."],
            ["👶 Children's Privacy", "FavsTicTac Lovers is intended for users aged 13 and above. We do not knowingly collect personal information from children under 13. If you believe a child has provided us with personal data, please contact us."],
            ["🍪 Cookies", "Our app uses Firebase which may use cookies and similar technologies to maintain your login session and improve app performance."],
            ["📢 Third Party Services", "We use the following third party services: Firebase (Google) for authentication and database, Netlify for app hosting. Each service has their own privacy policy."],
            ["✏️ Your Rights", "You have the right to: access your personal data, update or correct your information through the Profile screen, delete your account by contacting us, and opt out of any communications."],
            ["📧 Contact Us", "If you have any questions about this Privacy Policy, please contact us through the Feedback section in the app or email: favouradepoju70@gmail.com"],
          ].map(([title, text])=>(
            <div key={title}>
              <div style={{fontWeight:700,color:"var(--accent)",marginBottom:4,fontSize:".75rem"}}>{title}</div>
              <div style={{color:"#d0cdc8",lineHeight:1.7}}>{text}</div>
            </div>
          ))}

          <div style={{textAlign:"center",padding:"12px 0",borderTop:"1px solid var(--border)",color:"var(--muted)",fontSize:".65rem"}}>
            © 2026 FavsTicTac Lovers · Adepoju Favour Emmanuel · All rights reserved.
          </div>
        </div>
        <button className="btn btn-outline" style={{marginTop:14}} onClick={()=>setScreen("home")}>← Back to Home</button>
      </div>
    </div></div></>
  );

  // ── FEEDBACK ─────────────────────────────────────────────────────────────────
  if(screen==="feedback") return(
    <><style>{getCSS(currentTheme)}</style>
    <div className="app"><div style={{width:"100%",maxWidth:440}}>
      <TopBar backTo="home"/>
      <div style={{textAlign:"center",marginBottom:16}}><Logo small/><div className="tagline">📝 Send Feedback</div></div>
      <div className="card gap">
        <div style={{textAlign:"center",fontSize:".78rem",color:"var(--muted)"}}>
          Help us improve FavsTicTac Lovers! Your feedback goes directly to the developer. 🙏
        </div>

        {feedbackMsg&&<div className={`alert ${feedbackMsg.startsWith("success")?"alert-success":"alert-error"}`}>{feedbackMsg.split(":")[1]}</div>}

        {/* Feedback type */}
        <div className="field">
          <div className="label">📌 Feedback Type</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            {[["💡","general","General"],["🐛","bug","Bug Report"],["✨","feature","Feature Request"],["⭐","review","Review"]].map(([icon,type,label])=>(
              <button key={type} onClick={()=>setFeedbackType(type)}
                style={{padding:"10px 8px",borderRadius:9,border:`2px solid ${feedbackType===type?"var(--accent)":"var(--border)"}`,
                  background:feedbackType===type?"rgba(255,215,0,.08)":"#16161f",cursor:"pointer",
                  color:feedbackType===type?"var(--accent)":"var(--muted)",fontFamily:"'Space Mono',monospace",fontSize:".72rem",transition:"all .18s"}}>
                {icon} {label}
              </button>
            ))}
          </div>
        </div>

        {/* Star rating */}
        <div className="field">
          <div className="label">⭐ Rate the App</div>
          <div style={{display:"flex",gap:8,justifyContent:"center",padding:"8px 0"}}>
            {[1,2,3,4,5].map(star=>(
              <button key={star} onClick={()=>setFeedbackRating(star)}
                style={{fontSize:"1.8rem",background:"none",border:"none",cursor:"pointer",transition:"transform .15s",transform:feedbackRating>=star?"scale(1.1)":"scale(1)",filter:feedbackRating>=star?"none":"grayscale(1)"}}>
                ⭐
              </button>
            ))}
          </div>
          <div style={{textAlign:"center",fontSize:".7rem",color:"var(--accent)",fontWeight:700}}>
            {["","😞 Poor","😕 Fair","😊 Good","😃 Great","🤩 Excellent!"][feedbackRating]}
          </div>
        </div>

        {/* Message */}
        <div className="field">
          <div className="label">💬 Your Message</div>
          <textarea
            style={{width:"100%",padding:"11px 14px",background:"#16161f",border:"1px solid var(--border)",borderRadius:9,color:"#f0ede8",fontFamily:"'Space Mono',monospace",fontSize:".78rem",outline:"none",resize:"none",minHeight:100,transition:"border .2s"}}
            placeholder={feedbackType==="bug"?"Describe the bug and how to reproduce it…":feedbackType==="feature"?"What feature would you like to see?":"Share your thoughts about the app…"}
            value={feedbackText} onChange={e=>setFeedbackText(e.target.value)}/>
        </div>

        <button className="btn btn-primary" onClick={submitFeedback} disabled={feedbackBusy||!feedbackText.trim()}>
          {feedbackBusy?<><span className="spinner"/> Submitting…</>:"📤 Submit Feedback"}
        </button>
        <button className="btn btn-outline" onClick={()=>setScreen("home")}>← Back</button>

        <div style={{textAlign:"center",fontSize:".65rem",color:"var(--muted)"}}>
          Submitting as <span style={{color:"var(--accent)"}}>{authUser.username}</span>
        </div>
      </div>
    </div></div></>
  );

  if(screen==="admin") return <AdminDashboard authUser={authUser} db={db} onBack={()=>setScreen("profile")}/>;

  return null;
}


// ── ADMIN DASHBOARD COMPONENT ─────────────────────────────────────────────────
function AdminDashboard({authUser, db, onBack}) {
  const ADMIN_UID = "FeJCFJjq36XSLXvxbs7UIt7I9Oo1";
  const [tab, setTab] = useState("overview");
  const [users, setUsers] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [totalGames, setTotalGames] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchUser, setSearchUser] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [userHistory, setUserHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [actionMsg, setActionMsg] = useState("");
  const [actionBusy, setActionBusy] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [announcementBusy, setAnnoucementBusy] = useState(false);
  const [announcements, setAnnouncements] = useState([]);
  const [liveGames, setLiveGames] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [tournamentForm, setTournamentForm] = useState({name:"",prize:"",maxPlayers:"8"});
  const [tournamentBusy, setTournamentBusy] = useState(false);
  const [adminMsgTarget, setAdminMsgTarget] = useState(null);
  const [adminMsgText, setAdminMsgText] = useState("");
  const [adminMsgBusy, setAdminMsgBusy] = useState(false);
  const [dailyStats, setDailyStats] = useState([]);
  const [bannedUsers, setBannedUsers] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [feedbackFilter, setFeedbackFilter] = useState("all");

  useEffect(()=>{ if(authUser.uid===ADMIN_UID){ loadAll(); subscribeAnnouncements(); subscribeLiveGames(); loadTournaments(); } },[]);

  const loadAll = async () => {
    setLoading(true);
    const {collection, getDocs, query, orderBy, limit} = window._fb;
    try {
      const usersSnap = await getDocs(collection(db,"users"));
      const usersData = usersSnap.docs.map(d=>({uid:d.id,...d.data()}));
      setUsers(usersData);
      const lbSnap = await getDocs(query(collection(db,"leaderboard"),orderBy("wins","desc"),limit(50)));
      const lbData = lbSnap.docs.map(d=>({uid:d.id,...d.data()}));
      setLeaderboard(lbData);
      const total = lbData.reduce((s,p)=>s+(p.games||0),0);
      setTotalGames(Math.round(total/2));
      // Load banned users
      const bannedSnap = await getDocs(collection(db,"banned_users"));
      setBannedUsers(bannedSnap.docs.map(d=>d.id));
      // Load feedback
      const fbSnap = await getDocs(query(collection(db,"feedback"),orderBy("createdAt","desc"),limit(100)));
      setFeedbacks(fbSnap.docs.map(d=>({id:d.id,...d.data()})));
      // Build daily stats from users createdAt
      buildDailyStats(usersData);
    } catch(e){ console.error(e); }
    setLoading(false);
  };

  const buildDailyStats = (usersData) => {
    const days = {};
    for(let i=6;i>=0;i--){
      const d = new Date(); d.setDate(d.getDate()-i);
      const key = d.toLocaleDateString('en',{month:'short',day:'numeric'});
      days[key] = 0;
    }
    usersData.forEach(u=>{
      if(u.createdAt){
        const d = new Date(u.createdAt);
        const key = d.toLocaleDateString('en',{month:'short',day:'numeric'});
        if(days[key]!==undefined) days[key]++;
      }
    });
    setDailyStats(Object.entries(days).map(([date,count])=>({date,count})));
  };

  const subscribeAnnouncements = () => {
    const {collection, query, orderBy, limit, onSnapshot} = window._fb;
    onSnapshot(query(collection(db,"announcements"),orderBy("createdAt","desc"),limit(10)), snap=>{
      setAnnouncements(snap.docs.map(d=>({id:d.id,...d.data()})));
    });
  };

  const subscribeLiveGames = () => {
    const {collection, query, where, onSnapshot} = window._fb;
    onSnapshot(collection(db,"rooms"), snap=>{
      const active = snap.docs.map(d=>({id:d.id,...d.data()})).filter(r=>r.guestUid&&!r.result);
      setLiveGames(active);
    });
  };

  const loadTournaments = async () => {
    const {collection, getDocs, query, orderBy} = window._fb;
    try {
      const snap = await getDocs(query(collection(db,"tournaments"),orderBy("createdAt","desc")));
      setTournaments(snap.docs.map(d=>({id:d.id,...d.data()})));
    } catch {}
  };

  const loadUserHistory = async (uid) => {
    setLoadingHistory(true);
    const {collection, query, orderBy, limit, getDocs} = window._fb;
    try {
      const snap = await getDocs(query(collection(db,`users/${uid}/history`),orderBy("createdAt","desc"),limit(20)));
      setUserHistory(snap.docs.map(d=>({id:d.id,...d.data()})));
    } catch { setUserHistory([]); }
    setLoadingHistory(false);
  };

  const banUser = async (uid, username) => {
    if(!window.confirm) { setActionBusy(true); }
    setActionBusy(true);
    try {
      const {doc, setDoc} = window._fb;
      await setDoc(doc(db,"banned_users",uid), {username, bannedAt:Date.now(), bannedBy:authUser.username});
      setBannedUsers(b=>[...b,uid]);
      setActionMsg("success:"+username+" has been banned ✅");
    } catch { setActionMsg("error:Failed to ban user."); }
    setActionBusy(false);
    setTimeout(()=>setActionMsg(""),3000);
  };

  const unbanUser = async (uid, username) => {
    setActionBusy(true);
    try {
      const {doc, deleteDoc} = window._fb;
      await deleteDoc(doc(db,"banned_users",uid));
      setBannedUsers(b=>b.filter(id=>id!==uid));
      setActionMsg("success:"+username+" has been unbanned ✅");
    } catch { setActionMsg("error:Failed to unban user."); }
    setActionBusy(false);
    setTimeout(()=>setActionMsg(""),3000);
  };

  const deleteUserData = async (uid, username) => {
    setActionBusy(true);
    try {
      const {doc, deleteDoc} = window._fb;
      await deleteDoc(doc(db,"users",uid));
      await deleteDoc(doc(db,"leaderboard",uid));
      setUsers(u=>u.filter(u=>u.uid!==uid));
      setLeaderboard(l=>l.filter(p=>p.uid!==uid));
      setActionMsg("success:"+username+"'s data deleted ✅");
      setSelectedUser(null);
    } catch { setActionMsg("error:Failed to delete user data."); }
    setActionBusy(false);
    setTimeout(()=>setActionMsg(""),3000);
  };

  const resetLeaderboard = async () => {
    setActionBusy(true);
    try {
      const {collection, getDocs, doc, updateDoc} = window._fb;
      const snap = await getDocs(collection(db,"leaderboard"));
      for(const d of snap.docs){
        await updateDoc(doc(db,"leaderboard",d.id),{wins:0,draws:0,games:0});
      }
      setActionMsg("success:Leaderboard reset! ✅");
      loadAll();
    } catch { setActionMsg("error:Failed to reset leaderboard."); }
    setActionBusy(false);
    setTimeout(()=>setActionMsg(""),3000);
  };

  const sendAnnouncement = async () => {
    if(!announcement.trim()) return;
    setAnnoucementBusy(true);
    try {
      const {collection, addDoc, getDocs, serverTimestamp} = window._fb;
      // Add announcement
      await addDoc(collection(db,"announcements"),{
        text:announcement.trim(), createdAt:serverTimestamp(),
        createdBy:authUser.username, uid:authUser.uid,
      });
      // Send notification to ALL users
      const usersSnap = await getDocs(collection(db,"users"));
      const notifPromises = usersSnap.docs
        .filter(d=>d.id!==authUser.uid)
        .map(d=>addDoc(collection(db,`users/${d.id}/notifications`),{
          type:"announcement",
          title:"📢 Announcement from Admin",
          body:announcement.trim().slice(0,100)+(announcement.length>100?"...":""),
          read:false,
          createdAt:serverTimestamp(),
          fromUid:authUser.uid,
          fromUsername:"👑 Admin",
          fromPhoto:authUser.photoURL||null,
        }));
      await Promise.all(notifPromises);
      setAnnouncement("");
      setActionMsg("success:Announcement sent to all "+usersSnap.docs.length+" users! ✅");
    } catch(e) { setActionMsg("error:Failed to send announcement."); }
    setAnnoucementBusy(false);
    setTimeout(()=>setActionMsg(""),3000);
  };

  const deleteAnnouncement = async (id) => {
    try {
      const {doc, deleteDoc} = window._fb;
      await deleteDoc(doc(db,"announcements",id));
    } catch {}
  };

  const sendAdminMessage = async () => {
    if(!adminMsgText.trim()||!adminMsgTarget) return;
    setAdminMsgBusy(true);
    try {
      const {doc, setDoc, getDoc, updateDoc, addDoc, collection, serverTimestamp} = window._fb;
      const convoId = [authUser.uid, adminMsgTarget.uid].sort().join("_");
      const convoRef = doc(db,"conversations",convoId);
      const convoSnap = await getDoc(convoRef);
      const now = serverTimestamp();
      if(!convoSnap.exists()){
        await setDoc(convoRef,{
          members:[authUser.uid,adminMsgTarget.uid],
          memberNames:{[authUser.uid]:authUser.username,[adminMsgTarget.uid]:adminMsgTarget.username},
          memberPhotos:{[authUser.uid]:authUser.photoURL||null,[adminMsgTarget.uid]:adminMsgTarget.photoURL||null},
          lastMsg:adminMsgText.trim(), lastAt:now,
          [`unread_${adminMsgTarget.uid}`]:1, [`unread_${authUser.uid}`]:0,
        });
      } else {
        await updateDoc(convoRef,{lastMsg:adminMsgText.trim(),lastAt:now,[`unread_${adminMsgTarget.uid}`]:(convoSnap.data()[`unread_${adminMsgTarget.uid}`]||0)+1});
      }
      await addDoc(collection(db,`conversations/${convoId}/messages`),{
        text:adminMsgText.trim(), senderUid:authUser.uid, senderName:"👑 "+authUser.username,
        senderPhoto:authUser.photoURL||null, createdAt:now,
      });
      setAdminMsgText(""); setAdminMsgTarget(null);
      setActionMsg("success:Message sent to "+adminMsgTarget.username+"! ✅");
    } catch { setActionMsg("error:Failed to send message."); }
    setAdminMsgBusy(false);
    setTimeout(()=>setActionMsg(""),3000);
  };

  const createTournament = async () => {
    if(!tournamentForm.name.trim()) return;
    setTournamentBusy(true);
    try {
      const {collection, addDoc, serverTimestamp} = window._fb;
      await addDoc(collection(db,"tournaments"),{
        name:tournamentForm.name.trim(), prize:tournamentForm.prize.trim(),
        maxPlayers:parseInt(tournamentForm.maxPlayers)||8,
        status:"open", players:[], createdAt:serverTimestamp(), createdBy:authUser.username,
      });
      setTournamentForm({name:"",prize:"",maxPlayers:"8"});
      setActionMsg("success:Tournament created! ✅");
      loadTournaments();
    } catch { setActionMsg("error:Failed to create tournament."); }
    setTournamentBusy(false);
    setTimeout(()=>setActionMsg(""),3000);
  };

  const closeTournament = async (id) => {
    try {
      const {doc, updateDoc} = window._fb;
      await updateDoc(doc(db,"tournaments",id),{status:"closed"});
      loadTournaments();
    } catch {}
  };

  const filteredUsers = users.filter(u=>
    u.username?.toLowerCase().includes(searchUser.toLowerCase())||
    u.email?.toLowerCase().includes(searchUser.toLowerCase())
  );

  const totalWins = leaderboard.reduce((s,p)=>s+(p.wins||0),0);
  const totalDraws = leaderboard.reduce((s,p)=>s+(p.draws||0),0);
  const mostActive = [...leaderboard].sort((a,b)=>(b.games||0)-(a.games||0))[0];
  const topPlayer = leaderboard[0];
  const oneWeekAgo = Date.now()-7*24*60*60*1000;
  const newThisWeek = users.filter(u=>u.createdAt>oneWeekAgo).length;
  const newToday = users.filter(u=>u.createdAt>Date.now()-24*60*60*1000).length;
  const maxDaily = Math.max(...dailyStats.map(d=>d.count),1);

  const ACSS = `
    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=Space+Mono:wght@400;700&display=swap');
    .adm{min-height:100vh;background:#08080f;color:#f0ede8;font-family:'Space Mono',monospace;padding:0;
      background:radial-gradient(ellipse at 15% 40%,#1a0828 0%,#08080f 55%)}
    .adm-header{background:#111118;border-bottom:1px solid #22223a;padding:14px 16px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:10;backdrop-filter:blur(8px)}
    .adm-title{font-family:'Syne',sans-serif;font-weight:800;font-size:1.1rem;color:#ffd700}
    .adm-tabs{display:flex;gap:4px;padding:10px 16px;overflow-x:auto;scrollbar-width:none;border-bottom:1px solid #22223a}
    .adm-tab{padding:7px 11px;border-radius:8px;border:1px solid #22223a;background:transparent;color:#5a5a7a;
      font-family:'Space Mono',monospace;font-size:.6rem;cursor:pointer;white-space:nowrap;transition:all .18s;text-transform:uppercase;letter-spacing:1px;flex-shrink:0}
    .adm-tab.on{background:#ffd700;color:#08080f;border-color:#ffd700;font-weight:700}
    .adm-body{padding:14px 16px 100px}
    .adm-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px}
    .adm-grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:16px}
    .adm-stat{background:#111118;border:1px solid #22223a;border-radius:12px;padding:14px 10px;text-align:center;transition:border .2s}
    .adm-stat:hover{border-color:#ffd700}
    .adm-stat-val{font-family:'Syne',sans-serif;font-weight:800;font-size:1.5rem;line-height:1}
    .adm-stat-lbl{font-size:.58rem;color:#5a5a7a;text-transform:uppercase;letter-spacing:1px;margin-top:4px}
    .adm-section{margin-bottom:20px}
    .adm-section-title{font-size:.65rem;color:#5a5a7a;text-transform:uppercase;letter-spacing:2px;margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid #22223a;display:flex;justify-content:space-between;align-items:center}
    .adm-user-row{display:flex;gap:10px;align-items:center;padding:10px;border-radius:10px;background:#111118;border:1px solid #22223a;margin-bottom:7px;cursor:pointer;transition:all .18s}
    .adm-user-row:hover{border-color:#ffd700}
    .adm-user-info{flex:1;overflow:hidden}
    .adm-user-name{font-weight:700;font-size:.8rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .adm-user-email{font-size:.63rem;color:#5a5a7a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px}
    .adm-badge{padding:3px 8px;border-radius:20px;font-size:.58rem;font-weight:700;white-space:nowrap}
    .adm-badge-gold{background:rgba(255,215,0,.15);color:#ffd700;border:1px solid rgba(255,215,0,.3)}
    .adm-badge-green{background:rgba(46,213,115,.15);color:#2ed573;border:1px solid rgba(46,213,115,.3)}
    .adm-badge-red{background:rgba(255,71,87,.15);color:#ff4757;border:1px solid rgba(255,71,87,.3)}
    .adm-badge-purple{background:rgba(162,155,254,.15);color:#a29bfe;border:1px solid rgba(162,155,254,.3)}
    .adm-input{width:100%;padding:10px 14px;background:#16161f;border:1px solid #22223a;border-radius:9px;color:#f0ede8;font-family:'Space Mono',monospace;font-size:.78rem;outline:none;margin-bottom:8px;transition:border .2s}
    .adm-input:focus{border-color:#ffd700}
    .adm-textarea{width:100%;padding:10px 14px;background:#16161f;border:1px solid #22223a;border-radius:9px;color:#f0ede8;font-family:'Space Mono',monospace;font-size:.78rem;outline:none;resize:none;min-height:70px;margin-bottom:8px}
    .adm-textarea:focus{border-color:#ffd700}
    .adm-btn{display:flex;align-items:center;justify-content:center;gap:6px;padding:10px 14px;border-radius:9px;border:none;font-family:'Space Mono',monospace;font-size:.75rem;font-weight:700;cursor:pointer;transition:all .18s;text-transform:uppercase;letter-spacing:1px;width:100%}
    .adm-btn:disabled{opacity:.4;cursor:not-allowed}
    .adm-btn-gold{background:#ffd700;color:#08080f}.adm-btn-gold:not(:disabled):hover{background:#ffe44d}
    .adm-btn-red{background:rgba(255,71,87,.15);color:#ff4757;border:1px solid rgba(255,71,87,.3)}.adm-btn-red:not(:disabled):hover{background:rgba(255,71,87,.25)}
    .adm-btn-green{background:rgba(46,213,115,.15);color:#2ed573;border:1px solid rgba(46,213,115,.3)}.adm-btn-green:not(:disabled):hover{background:rgba(46,213,115,.25)}
    .adm-btn-outline{background:transparent;color:#f0ede8;border:1px solid #22223a}.adm-btn-outline:not(:disabled):hover{border-color:#ffd700;color:#ffd700}
    .adm-btn-sm{padding:6px 12px;font-size:.65rem;width:auto}
    .adm-back{background:transparent;border:1px solid #22223a;color:#f0ede8;padding:8px 14px;border-radius:8px;font-family:'Space Mono',monospace;font-size:.72rem;cursor:pointer;transition:all .18s}
    .adm-back:hover{border-color:#ffd700;color:#ffd700}
    .adm-profile-card{background:#111118;border:1px solid #22223a;border-radius:14px;padding:16px;margin-bottom:14px}
    .adm-avatar{width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,#1a0828,#0a1a10);border:2px solid #ffd700;display:flex;align-items:center;justify-content:center;font-family:'Syne',sans-serif;font-weight:800;font-size:.95rem;overflow:hidden;flex-shrink:0}
    .adm-avatar img{width:100%;height:100%;object-fit:cover}
    .adm-hist-item{padding:9px;border-radius:8px;background:#16161f;margin-bottom:6px;font-size:.7rem;border:1px solid #22223a}
    .adm-alert{padding:9px 12px;border-radius:8px;font-size:.72rem;margin-bottom:10px}
    .adm-alert-ok{background:rgba(46,213,115,.1);border:1px solid rgba(46,213,115,.3);color:#2ed573}
    .adm-alert-err{background:rgba(255,71,87,.1);border:1px solid rgba(255,71,87,.3);color:#ff4757}
    .adm-live-badge{background:#ff4757;color:#fff;border-radius:4px;padding:2px 6px;font-size:.55rem;font-weight:700;animation:blink 1s ease infinite alternate}
    @keyframes blink{from{opacity:1}to{opacity:.4}}
    .adm-bar-chart{display:flex;align-items:flex-end;gap:6px;height:80px;margin-bottom:6px}
    .adm-bar{flex:1;border-radius:4px 4px 0 0;background:linear-gradient(to top,#ffd700,rgba(255,215,0,.3));min-height:4px;transition:height .3s}
    .adm-bar-label{font-size:.52rem;color:#5a5a7a;text-align:center;margin-top:4px}
    .adm-row{display:flex;gap:8px;margin-bottom:8px}
    .adm-card{background:#111118;border:1px solid #22223a;border-radius:12px;padding:12px;margin-bottom:10px}
    .adm-spinner{width:16px;height:16px;border:2px solid #22223a;border-top-color:#ffd700;border-radius:50%;animation:spin .7s linear infinite;display:inline-block;vertical-align:middle}
    @keyframes spin{to{transform:rotate(360deg)}}
  `;

  if(authUser.uid!==ADMIN_UID) return(
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#08080f",color:"#ff4757",fontFamily:"monospace",textAlign:"center",padding:20}}>
      <div><div style={{fontSize:"3rem"}}>🚫</div><div style={{marginTop:10,fontSize:".9rem"}}>Access Denied.<br/>Admins only.</div>
        <button onClick={onBack} style={{marginTop:16,background:"transparent",border:"1px solid #22223a",color:"#f0ede8",padding:"8px 16px",borderRadius:8,cursor:"pointer",fontFamily:"monospace"}}>← Go Back</button>
      </div>
    </div>
  );

  return(
    <div className="adm">
      <style>{ACSS}</style>

      {/* Header */}
      <div className="adm-header">
        <div>
          <div className="adm-title">🎛️ Admin Dashboard</div>
          <div style={{fontSize:".6rem",color:"#5a5a7a",marginTop:2}}>FavsTicTac Lovers · {authUser.username} 👑</div>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          {liveGames.length>0&&<span className="adm-live-badge">🔴 {liveGames.length} LIVE</span>}
          <button className="adm-back" onClick={onBack}>← Back</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="adm-tabs">
        {[["📊","overview"],["👥","users"],["📢","announce"],["🏆","tournaments"],["🎮","live"],["📝","feedback"],["📈","stats"],["⚙️","settings"]].map(([icon,t])=>(
          <button key={t} className={`adm-tab ${tab===t?"on":""}`} onClick={()=>setTab(t)}>{icon} {t}</button>
        ))}
      </div>

      <div className="adm-body">
        {/* Global action message */}
        {actionMsg&&<div className={`adm-alert ${actionMsg.startsWith("success")?"adm-alert-ok":"adm-alert-err"}`}>{actionMsg.split(":")[1]}</div>}

        {loading&&<div style={{textAlign:"center",padding:"40px 0",color:"#5a5a7a"}}>
          <div className="adm-spinner" style={{width:28,height:28}}/><div style={{marginTop:10}}>Loading data…</div>
        </div>}

        {/* ── OVERVIEW ── */}
        {!loading&&tab==="overview"&&(<>
          <div className="adm-grid">
            <div className="adm-stat"><div className="adm-stat-val" style={{color:"#ffd700"}}>{users.length}</div><div className="adm-stat-lbl">👥 Total Users</div></div>
            <div className="adm-stat"><div className="adm-stat-val" style={{color:"#2ed573"}}>{totalGames}</div><div className="adm-stat-lbl">🎮 Total Games</div></div>
            <div className="adm-stat"><div className="adm-stat-val" style={{color:"#ff4757"}}>{newToday}</div><div className="adm-stat-lbl">🆕 New Today</div></div>
            <div className="adm-stat"><div className="adm-stat-val" style={{color:"#a29bfe"}}>{newThisWeek}</div><div className="adm-stat-lbl">📅 This Week</div></div>
            <div className="adm-stat"><div className="adm-stat-val" style={{color:"#2ed573"}}>{totalWins}</div><div className="adm-stat-lbl">🏆 Total Wins</div></div>
            <div className="adm-stat"><div className="adm-stat-val" style={{color:"#fd79a8"}}>{liveGames.length}</div><div className="adm-stat-lbl">🔴 Live Games</div></div>
          </div>

          {/* User growth chart */}
          <div className="adm-section">
            <div className="adm-section-title">📈 New Users — Last 7 Days</div>
            <div className="adm-card">
              <div className="adm-bar-chart">
                {dailyStats.map((d,i)=>(
                  <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center"}}>
                    <div style={{fontSize:".6rem",color:"#ffd700",marginBottom:2}}>{d.count>0?d.count:""}</div>
                    <div className="adm-bar" style={{height:`${Math.max((d.count/maxDaily)*70,4)}px`,width:"100%"}}/>
                    <div className="adm-bar-label">{d.date}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {topPlayer&&(<div className="adm-section">
            <div className="adm-section-title">🥇 Top Player</div>
            <div className="adm-user-row" onClick={()=>{setSelectedUser(users.find(u=>u.username===topPlayer.username)||topPlayer);loadUserHistory(topPlayer.uid);setTab("users");}}>
              <div className="adm-avatar">{topPlayer.photoURL?<img src={topPlayer.photoURL} alt=""/>:topPlayer.username?.slice(0,2).toUpperCase()}</div>
              <div className="adm-user-info"><div className="adm-user-name">👑 {topPlayer.username}</div><div className="adm-user-email">{topPlayer.wins}W · {topPlayer.games}G · Win rate: {topPlayer.games?Math.round((topPlayer.wins/topPlayer.games)*100):0}%</div></div>
              <div className="adm-badge adm-badge-gold">#1</div>
            </div>
          </div>)}

          {mostActive&&(<div className="adm-section">
            <div className="adm-section-title">🔥 Most Active</div>
            <div className="adm-user-row">
              <div className="adm-avatar">{mostActive.photoURL?<img src={mostActive.photoURL} alt=""/>:mostActive.username?.slice(0,2).toUpperCase()}</div>
              <div className="adm-user-info"><div className="adm-user-name">🔥 {mostActive.username}</div><div className="adm-user-email">{mostActive.games} games played</div></div>
              <div className="adm-badge adm-badge-green">{mostActive.games}G</div>
            </div>
          </div>)}

          <div className="adm-section">
            <div className="adm-section-title">🕐 Recent Registrations</div>
            {[...users].sort((a,b)=>(b.createdAt||0)-(a.createdAt||0)).slice(0,5).map(u=>(
              <div key={u.uid} className="adm-user-row" onClick={()=>{setSelectedUser(u);loadUserHistory(u.uid);setTab("users");}}>
                <div className="adm-avatar">{u.photoURL?<img src={u.photoURL} alt=""/>:u.username?.slice(0,2).toUpperCase()}</div>
                <div className="adm-user-info"><div className="adm-user-name">{u.username}</div><div className="adm-user-email">{u.email}</div></div>
                <div className="adm-badge adm-badge-green">New</div>
              </div>
            ))}
          </div>
        </>)}

        {/* ── USERS ── */}
        {!loading&&tab==="users"&&(<>
          {selectedUser?(
            <div>
              <button className="adm-back" style={{marginBottom:12}} onClick={()=>{setSelectedUser(null);setUserHistory([]);}}>← All Users</button>
              <div className="adm-profile-card">
                <div style={{display:"flex",gap:12,alignItems:"center",marginBottom:12}}>
                  <div className="adm-avatar" style={{width:56,height:56,fontSize:"1.2rem"}}>{selectedUser.photoURL?<img src={selectedUser.photoURL} alt=""/>:selectedUser.username?.slice(0,2).toUpperCase()}</div>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:700,fontSize:".9rem"}}>{selectedUser.username} {selectedUser.uid===ADMIN_UID&&"👑"}</div>
                    <div style={{fontSize:".65rem",color:"#5a5a7a",marginTop:2}}>{selectedUser.email}</div>
                    <div style={{display:"flex",gap:6,marginTop:6,flexWrap:"wrap"}}>
                      {bannedUsers.includes(selectedUser.uid)&&<span className="adm-badge adm-badge-red">🚫 Banned</span>}
                      {selectedUser.photoURL&&<span className="adm-badge adm-badge-green">📷 Has Photo</span>}
                    </div>
                  </div>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:5,fontSize:".7rem",marginBottom:12}}>
                  {[["User ID",selectedUser.uid?.slice(0,20)+"…"],["Joined",selectedUser.createdAt?new Date(selectedUser.createdAt).toLocaleDateString():"Unknown"]].map(([k,v])=>(
                    <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid #22223a"}}>
                      <span style={{color:"#5a5a7a"}}>{k}</span><span style={{fontWeight:700}}>{v}</span>
                    </div>
                  ))}
                  {(()=>{const lb=leaderboard.find(p=>p.uid===selectedUser.uid||p.username===selectedUser.username);return lb?(
                    <>{[["🏆 Wins",lb.wins||0,"#2ed573"],["🤝 Draws",lb.draws||0,"#ffd700"],["🎮 Games",lb.games||0,"#a29bfe"],["📊 Win Rate",lb.games?Math.round((lb.wins/lb.games)*100)+"%":"0%","#fd79a8"],["🥇 Rank","#"+(leaderboard.findIndex(p=>p.username===selectedUser.username)+1),"#ffd700"]].map(([k,v,c])=>(
                      <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid #22223a"}}>
                        <span style={{color:"#5a5a7a"}}>{k}</span><span style={{fontWeight:700,color:c}}>{v}</span>
                      </div>
                    ))}</>
                  ):null})()}
                </div>

                {/* Action buttons */}
                {selectedUser.uid!==ADMIN_UID&&(
                  <div style={{display:"flex",flexDirection:"column",gap:8}}>
                    <button className="adm-btn adm-btn-green adm-btn-sm" onClick={()=>setAdminMsgTarget(selectedUser)} style={{width:"100%"}}>💬 Send Message</button>
                    {bannedUsers.includes(selectedUser.uid)
                      ? <button className="adm-btn adm-btn-outline adm-btn-sm" onClick={()=>unbanUser(selectedUser.uid,selectedUser.username)} disabled={actionBusy} style={{width:"100%"}}>✅ Unban User</button>
                      : <button className="adm-btn adm-btn-red adm-btn-sm" onClick={()=>banUser(selectedUser.uid,selectedUser.username)} disabled={actionBusy} style={{width:"100%"}}>🚫 Ban User</button>
                    }
                    <button className="adm-btn adm-btn-red adm-btn-sm" onClick={()=>deleteUserData(selectedUser.uid,selectedUser.username)} disabled={actionBusy} style={{width:"100%",opacity:.7}}>🗑️ Delete User Data</button>
                  </div>
                )}
              </div>

              {/* Send message modal */}
              {adminMsgTarget&&adminMsgTarget.uid===selectedUser.uid&&(
                <div className="adm-card">
                  <div style={{fontWeight:700,fontSize:".78rem",marginBottom:8}}>💬 Message to {adminMsgTarget.username}</div>
                  <textarea className="adm-textarea" placeholder="Type your message…" value={adminMsgText} onChange={e=>setAdminMsgText(e.target.value)}/>
                  <div className="adm-row">
                    <button className="adm-btn adm-btn-gold" onClick={sendAdminMessage} disabled={adminMsgBusy||!adminMsgText.trim()}>{adminMsgBusy?<span className="adm-spinner"/>:"📤 Send"}</button>
                    <button className="adm-btn adm-btn-outline" onClick={()=>{setAdminMsgTarget(null);setAdminMsgText("");}}>Cancel</button>
                  </div>
                </div>
              )}

              <div style={{fontWeight:700,fontSize:".78rem",marginBottom:8,marginTop:4}}>📜 Game History ({userHistory.length})</div>
              {loadingHistory&&<div style={{color:"#5a5a7a",fontSize:".75rem",textAlign:"center",padding:"12px 0"}}><span className="adm-spinner"/></div>}
              {!loadingHistory&&userHistory.length===0&&<div style={{color:"#5a5a7a",fontSize:".75rem",textAlign:"center",padding:"12px 0"}}>No games played yet.</div>}
              {userHistory.map(g=>(
                <div key={g.id} className="adm-hist-item">
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                    <span style={{fontWeight:700,color:g.winner==="Draw"?"#ffd700":g.winner===selectedUser.username?"#2ed573":"#ff4757"}}>
                      {g.winner==="Draw"?"🤝 Draw":g.winner===selectedUser.username?"🏆 Won":"💀 Lost"}
                    </span>
                    <span style={{color:"#5a5a7a",fontSize:".62rem"}}>{g.mode}</span>
                  </div>
                  <div style={{color:"#5a5a7a",fontSize:".65rem"}}>{g.players?.X} X vs {g.players?.O} O · {g.moves} moves</div>
                </div>
              ))}
            </div>
          ):(
            <>
              <input className="adm-input" placeholder="🔍 Search username or email…" value={searchUser} onChange={e=>setSearchUser(e.target.value)}/>
              <div style={{color:"#5a5a7a",fontSize:".65rem",marginBottom:10,display:"flex",justifyContent:"space-between"}}>
                <span>{filteredUsers.length} of {users.length} users</span>
                <span style={{color:"#ff4757"}}>{bannedUsers.length} banned</span>
              </div>
              {filteredUsers.map(u=>(
                <div key={u.uid} className="adm-user-row" onClick={()=>{setSelectedUser(u);loadUserHistory(u.uid);}}>
                  <div className="adm-avatar">{u.photoURL?<img src={u.photoURL} alt=""/>:u.username?.slice(0,2).toUpperCase()}</div>
                  <div className="adm-user-info">
                    <div className="adm-user-name">{u.username} {u.uid===ADMIN_UID&&"👑"} {bannedUsers.includes(u.uid)&&"🚫"}</div>
                    <div className="adm-user-email">{u.email}</div>
                  </div>
                  <div style={{textAlign:"right",flexShrink:0}}>
                    <div style={{fontSize:".58rem",color:"#5a5a7a"}}>{u.createdAt?new Date(u.createdAt).toLocaleDateString():"—"}</div>
                    {(()=>{const lb=leaderboard.find(p=>p.username===u.username);return lb?<div style={{fontSize:".62rem",color:"#2ed573",marginTop:2}}>{lb.wins||0}W·{lb.games||0}G</div>:null})()}
                  </div>
                </div>
              ))}
            </>
          )}
        </>)}

        {/* ── ANNOUNCEMENTS ── */}
        {!loading&&tab==="announce"&&(<>
          <div className="adm-section">
            <div className="adm-section-title">📣 Send Announcement to All Users</div>
            <textarea className="adm-textarea" placeholder="Type your announcement… (shown to all users on home screen)" value={announcement} onChange={e=>setAnnouncement(e.target.value)}/>
            <button className="adm-btn adm-btn-gold" onClick={sendAnnouncement} disabled={announcementBusy||!announcement.trim()}>
              {announcementBusy?<><span className="adm-spinner"/> Sending…</>:"📢 Send to All Users"}
            </button>
          </div>
          <div className="adm-section">
            <div className="adm-section-title">📌 Active Announcements <span style={{color:"#ffd700"}}>{announcements.length}</span></div>
            {announcements.length===0&&<div style={{color:"#5a5a7a",fontSize:".75rem",textAlign:"center",padding:"16px 0"}}>No announcements yet.</div>}
            {announcements.map(a=>(
              <div key={a.id} className="adm-card">
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
                  <div style={{flex:1,fontSize:".78rem",lineHeight:1.5}}>{a.text}</div>
                  <button className="adm-btn adm-btn-red adm-btn-sm" onClick={()=>deleteAnnouncement(a.id)} style={{flexShrink:0}}>🗑️</button>
                </div>
                <div style={{fontSize:".6rem",color:"#5a5a7a",marginTop:6}}>By {a.createdBy}</div>
              </div>
            ))}
          </div>
        </>)}

        {/* ── TOURNAMENTS ── */}
        {!loading&&tab==="tournaments"&&(<>
          <div className="adm-section">
            <div className="adm-section-title">🏆 Create Tournament</div>
            <input className="adm-input" placeholder="Tournament name e.g. Weekend Championship" value={tournamentForm.name} onChange={e=>setTournamentForm(f=>({...f,name:e.target.value}))}/>
            <input className="adm-input" placeholder="Prize e.g. $10 airtime" value={tournamentForm.prize} onChange={e=>setTournamentForm(f=>({...f,prize:e.target.value}))}/>
            <input className="adm-input" placeholder="Max players (default: 8)" value={tournamentForm.maxPlayers} onChange={e=>setTournamentForm(f=>({...f,maxPlayers:e.target.value}))} type="number"/>
            <button className="adm-btn adm-btn-gold" onClick={createTournament} disabled={tournamentBusy||!tournamentForm.name.trim()}>
              {tournamentBusy?<><span className="adm-spinner"/> Creating…</>:"🏆 Create Tournament"}
            </button>
          </div>
          <div className="adm-section">
            <div className="adm-section-title">📋 All Tournaments</div>
            {tournaments.length===0&&<div style={{color:"#5a5a7a",fontSize:".75rem",textAlign:"center",padding:"16px 0"}}>No tournaments yet.</div>}
            {tournaments.map(t=>(
              <div key={t.id} className="adm-card">
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                  <div style={{fontWeight:700,fontSize:".85rem"}}>{t.name}</div>
                  <span className={`adm-badge ${t.status==="open"?"adm-badge-green":"adm-badge-red"}`}>{t.status==="open"?"🟢 Open":"🔴 Closed"}</span>
                </div>
                <div style={{fontSize:".7rem",color:"#5a5a7a",display:"flex",flexDirection:"column",gap:4}}>
                  {t.prize&&<span>🎁 Prize: <span style={{color:"#ffd700",fontWeight:700}}>{t.prize}</span></span>}
                  <span>👥 Players: {(t.players||[]).length}/{t.maxPlayers||8}</span>
                  <span>📅 Created by {t.createdBy}</span>
                </div>
                {t.status==="open"&&(
                  <button className="adm-btn adm-btn-red adm-btn-sm" onClick={()=>closeTournament(t.id)} style={{marginTop:10,width:"100%"}}>🔴 Close Tournament</button>
                )}
              </div>
            ))}
          </div>
        </>)}

        {/* ── LIVE GAMES ── */}
        {!loading&&tab==="live"&&(<>
          <div className="adm-section">
            <div className="adm-section-title">🔴 Live Games Now <span style={{color:"#ff4757"}}>{liveGames.length} active</span></div>
            {liveGames.length===0&&(
              <div style={{textAlign:"center",color:"#5a5a7a",padding:"32px 0",fontSize:".78rem"}}>
                No live games right now.<br/>Check back later! 🎮
              </div>
            )}
            {liveGames.map(g=>(
              <div key={g.id} className="adm-card">
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                  <span className="adm-live-badge">🔴 LIVE</span>
                  <span style={{fontSize:".6rem",color:"#5a5a7a"}}>Room: {g.id}</span>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr auto 1fr",gap:8,alignItems:"center",marginBottom:8}}>
                  <div style={{textAlign:"center",background:"rgba(255,71,87,.08)",borderRadius:8,padding:"8px 6px",border:"1px solid rgba(255,71,87,.2)"}}>
                    <div style={{color:"#ff4757",fontWeight:700,fontSize:".75rem"}}>✕</div>
                    <div style={{fontSize:".7rem",fontWeight:700,marginTop:2}}>{g.hostName}</div>
                  </div>
                  <div style={{textAlign:"center",color:"#5a5a7a",fontSize:".7rem"}}>VS</div>
                  <div style={{textAlign:"center",background:"rgba(46,213,115,.08)",borderRadius:8,padding:"8px 6px",border:"1px solid rgba(46,213,115,.2)"}}>
                    <div style={{color:"#2ed573",fontWeight:700,fontSize:".75rem"}}>○</div>
                    <div style={{fontSize:".7rem",fontWeight:700,marginTop:2}}>{g.guestName}</div>
                  </div>
                </div>
                <div style={{fontSize:".65rem",color:"#5a5a7a",textAlign:"center"}}>
                  {g.moveLog?.length||0} moves · {g.turn}'s turn
                </div>
                {/* Mini board */}
                <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:4,marginTop:8}}>
                  {(g.board||Array(9).fill(null)).map((v,i)=>(
                    <div key={i} style={{aspectRatio:1,background:"#16161f",borderRadius:6,border:"1px solid #22223a",display:"flex",alignItems:"center",justifyContent:"center",fontSize:".8rem",color:v==="X"?"#ff4757":v==="O"?"#2ed573":"transparent"}}>
                      {v||"·"}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>)}

        {/* ── FEEDBACK ── */}
        {!loading&&tab==="feedback"&&(<>
          <div className="adm-section">
            <div className="adm-section-title">
              <span>📝 User Feedback ({feedbacks.length})</span>
              <div style={{display:"flex",gap:6}}>
                {["all","general","bug","feature","review"].map(f=>(
                  <button key={f} className={`adm-tab ${feedbackFilter===f?"on":""}`} style={{padding:"4px 8px",fontSize:".55rem"}} onClick={()=>setFeedbackFilter(f)}>{f}</button>
                ))}
              </div>
            </div>

            {/* Stats */}
            <div className="adm-grid" style={{marginBottom:14}}>
              <div className="adm-stat">
                <div className="adm-stat-val" style={{color:"#ffd700"}}>
                  {feedbacks.length>0?(feedbacks.reduce((s,f)=>s+(f.rating||5),0)/feedbacks.length).toFixed(1):0}
                </div>
                <div className="adm-stat-lbl">⭐ Avg Rating</div>
              </div>
              <div className="adm-stat"><div className="adm-stat-val" style={{color:"#2ed573"}}>{feedbacks.filter(f=>f.type==="bug").length}</div><div className="adm-stat-lbl">🐛 Bugs</div></div>
              <div className="adm-stat"><div className="adm-stat-val" style={{color:"#a29bfe"}}>{feedbacks.filter(f=>f.type==="feature").length}</div><div className="adm-stat-lbl">✨ Features</div></div>
              <div className="adm-stat"><div className="adm-stat-val" style={{color:"#fd79a8"}}>{feedbacks.filter(f=>f.rating===5).length}</div><div className="adm-stat-lbl">🤩 5 Stars</div></div>
            </div>

            {feedbacks.filter(f=>feedbackFilter==="all"||f.type===feedbackFilter).length===0&&(
              <div style={{textAlign:"center",color:"#5a5a7a",padding:"24px 0",fontSize:".78rem"}}>No feedback yet.</div>
            )}
            {feedbacks.filter(f=>feedbackFilter==="all"||f.type===feedbackFilter).map(f=>(
              <div key={f.id} className="adm-card">
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                  <div style={{display:"flex",gap:6,alignItems:"center"}}>
                    <span className={`adm-badge ${f.type==="bug"?"adm-badge-red":f.type==="feature"?"adm-badge-purple":f.type==="review"?"adm-badge-gold":"adm-badge-green"}`}>
                      {f.type==="bug"?"🐛 Bug":f.type==="feature"?"✨ Feature":f.type==="review"?"⭐ Review":"💡 General"}
                    </span>
                    <span style={{fontSize:".7rem"}}>{"⭐".repeat(f.rating||5)}</span>
                  </div>
                  <div style={{fontSize:".6rem",color:"#5a5a7a"}}>{f.createdAt?.seconds?new Date(f.createdAt.seconds*1000).toLocaleDateString():""}</div>
                </div>
                <div style={{fontSize:".75rem",lineHeight:1.6,color:"#f0ede8",marginBottom:8}}>{f.text}</div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div style={{fontSize:".65rem",color:"#5a5a7a"}}>By <span style={{color:"#ffd700",fontWeight:700}}>{f.username}</span></div>
                  <div style={{fontSize:".62rem",color:"#5a5a7a"}}>{f.email}</div>
                </div>
              </div>
            ))}
          </div>
        </>)}

        {/* ── STATS ── */}
        {!loading&&tab==="stats"&&(<>
          <div className="adm-grid">
            <div className="adm-stat"><div className="adm-stat-val" style={{color:"#2ed573"}}>{totalWins}</div><div className="adm-stat-lbl">Total Wins</div></div>
            <div className="adm-stat"><div className="adm-stat-val" style={{color:"#ffd700"}}>{totalDraws}</div><div className="adm-stat-lbl">Total Draws</div></div>
            <div className="adm-stat"><div className="adm-stat-val" style={{color:"#ff4757"}}>{totalGames}</div><div className="adm-stat-lbl">Total Games</div></div>
            <div className="adm-stat"><div className="adm-stat-val" style={{color:"#a29bfe"}}>{leaderboard.length}</div><div className="adm-stat-lbl">Active Players</div></div>
            <div className="adm-stat"><div className="adm-stat-val" style={{color:"#ffd700"}}>{users.length}</div><div className="adm-stat-lbl">Registered</div></div>
            <div className="adm-stat"><div className="adm-stat-val" style={{color:"#fd79a8"}}>{users.filter(u=>u.photoURL).length}</div><div className="adm-stat-lbl">Have Photo</div></div>
          </div>
          <div className="adm-section">
            <div className="adm-section-title">🏆 Top 5 Players</div>
            {leaderboard.slice(0,5).map((p,i)=>(
              <div key={p.uid} className="adm-user-row" onClick={()=>{const u=users.find(u=>u.username===p.username);if(u){setSelectedUser(u);loadUserHistory(u.uid);setTab("users");}}}>
                <div style={{fontSize:"1.3rem",width:28,textAlign:"center"}}>{["🥇","🥈","🥉","4️⃣","5️⃣"][i]}</div>
                <div className="adm-avatar">{p.photoURL?<img src={p.photoURL} alt=""/>:p.username?.slice(0,2).toUpperCase()}</div>
                <div className="adm-user-info"><div className="adm-user-name">{p.username}</div><div className="adm-user-email">{p.wins}W · {p.draws}D · {p.games}G</div></div>
                <div className="adm-badge adm-badge-gold">{p.games?Math.round((p.wins/p.games)*100):0}%</div>
              </div>
            ))}
          </div>
          <div className="adm-section">
            <div className="adm-section-title">📋 App Info</div>
            <div className="adm-card" style={{fontSize:".7rem",display:"flex",flexDirection:"column",gap:8}}>
              {[["App","FavsTicTac Lovers"],["Owner","Adepoju Favour Emmanuel"],["Platform","Netlify"],["Database","Firebase Firestore"],["Auth","Firebase Auth"],["Version","3.0.0"],["Total Banned",bannedUsers.length],["Tournaments",tournaments.length]].map(([k,v])=>(
                <div key={k} style={{display:"flex",justifyContent:"space-between",paddingBottom:6,borderBottom:"1px solid #22223a"}}>
                  <span style={{color:"#5a5a7a"}}>{k}</span><span style={{fontWeight:700,color:"#ffd700"}}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </>)}

        {/* ── SETTINGS ── */}
        {!loading&&tab==="settings"&&(<>
          <div className="adm-section">
            <div className="adm-section-title">🔄 Leaderboard Management</div>
            <div className="adm-card">
              <div style={{fontSize:".75rem",color:"#5a5a7a",marginBottom:10,lineHeight:1.5}}>⚠️ Resetting the leaderboard will set all wins, draws and games to 0 for every player. This cannot be undone!</div>
              <button className="adm-btn adm-btn-red" onClick={()=>{ if(window.confirm) resetLeaderboard(); else resetLeaderboard(); }} disabled={actionBusy}>
                {actionBusy?<><span className="adm-spinner"/> Resetting…</>:"🔄 Reset Entire Leaderboard"}
              </button>
            </div>
          </div>
          <div className="adm-section">
            <div className="adm-section-title">🚫 Banned Users ({bannedUsers.length})</div>
            {bannedUsers.length===0&&<div style={{color:"#5a5a7a",fontSize:".75rem",textAlign:"center",padding:"16px 0"}}>No banned users.</div>}
            {users.filter(u=>bannedUsers.includes(u.uid)).map(u=>(
              <div key={u.uid} className="adm-user-row">
                <div className="adm-avatar">{u.photoURL?<img src={u.photoURL} alt=""/>:u.username?.slice(0,2).toUpperCase()}</div>
                <div className="adm-user-info"><div className="adm-user-name">{u.username} 🚫</div><div className="adm-user-email">{u.email}</div></div>
                <button className="adm-btn adm-btn-green adm-btn-sm" onClick={()=>unbanUser(u.uid,u.username)} disabled={actionBusy}>Unban</button>
              </div>
            ))}
          </div>
          <div className="adm-section">
            <div className="adm-section-title">💬 Message Any User</div>
            <div className="adm-card">
              <input className="adm-input" placeholder="Search username to message…" value={searchUser} onChange={e=>setSearchUser(e.target.value)}/>
              {searchUser&&users.filter(u=>u.username?.toLowerCase().includes(searchUser.toLowerCase())&&u.uid!==ADMIN_UID).slice(0,3).map(u=>(
                <div key={u.uid} className="adm-user-row" style={{marginBottom:6}} onClick={()=>setAdminMsgTarget(u)}>
                  <div className="adm-avatar">{u.photoURL?<img src={u.photoURL} alt=""/>:u.username?.slice(0,2).toUpperCase()}</div>
                  <div className="adm-user-info"><div className="adm-user-name">{u.username}</div></div>
                  <span className="adm-badge adm-badge-green">Select</span>
                </div>
              ))}
              {adminMsgTarget&&(
                <div style={{marginTop:8}}>
                  <div style={{fontSize:".75rem",color:"#ffd700",fontWeight:700,marginBottom:6}}>To: {adminMsgTarget.username}</div>
                  <textarea className="adm-textarea" placeholder="Type message…" value={adminMsgText} onChange={e=>setAdminMsgText(e.target.value)}/>
                  <div className="adm-row">
                    <button className="adm-btn adm-btn-gold" onClick={sendAdminMessage} disabled={adminMsgBusy||!adminMsgText.trim()}>{adminMsgBusy?<span className="adm-spinner"/>:"📤 Send"}</button>
                    <button className="adm-btn adm-btn-outline" onClick={()=>{setAdminMsgTarget(null);setAdminMsgText("");setSearchUser("");}}>Cancel</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>)}
      </div>
    </div>
  );
}
