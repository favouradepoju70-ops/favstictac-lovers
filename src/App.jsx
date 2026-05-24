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
const WINS = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
const calcWinner = (b) => { for(const [a,c,d] of WINS) if(b[a]&&b[a]===b[c]&&b[a]===b[d]) return {winner:b[a],line:[a,c,d]}; return null; };
const minimax = (board,isMax,depth=0) => { const w=calcWinner(board); if(w) return w.winner==="O"?10-depth:depth-10; if(!board.includes(null)) return 0; const moves=board.map((v,i)=>v===null?i:-1).filter(i=>i>=0); if(isMax){let b=-Infinity;for(const m of moves){const nb=[...board];nb[m]="O";b=Math.max(b,minimax(nb,false,depth+1));}return b;}else{let b=Infinity;for(const m of moves){const nb=[...board];nb[m]="X";b=Math.min(b,minimax(nb,true,depth+1));}return b;}};
const bestMove = (board) => { let best=-Infinity,move=-1; board.forEach((v,i)=>{if(v===null){const nb=[...board];nb[i]="O";const s=minimax(nb,false);if(s>best){best=s;move=i;}}}); return move; };

// ── ICONS ─────────────────────────────────────────────────────────────────────
const XIcon = () => <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round"><line x1="8" y1="8" x2="32" y2="32"/><line x1="32" y1="8" x2="8" y2="32"/></svg>;
const OIcon = () => <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="4"><circle cx="20" cy="20" r="12"/></svg>;
const EyeIcon = ({show}) => show ? <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> : <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>;

// ── CSS ───────────────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=Space+Mono:wght@400;700&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
body{background:#08080f;color:#f0ede8;font-family:'Space Mono',monospace;min-height:100vh}
:root{--x:#ff4757;--o:#2ed573;--card:#111118;--border:#22223a;--accent:#ffd700;--muted:#5a5a7a;--success:#2ed573;--error:#ff4757}
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
.game-chat-header{padding:8px 12px;border-bottom:1px solid var(--border);font-size:.68rem;color:var(--muted);text-transform:uppercase;letter-spacing:2px}
.game-chat-msgs{height:100px;overflow-y:auto;padding:8px;display:flex;flex-direction:column;gap:4px;scrollbar-width:thin}
.game-chat-msg{font-size:.7rem;padding:2px 0}
.game-chat-input{display:flex;gap:6px;padding:8px;border-top:1px solid var(--border)}
.emoji-row{display:flex;gap:5px;padding:6px 0;flex-wrap:wrap}
.emoji-btn{background:#16161f;border:1px solid var(--border);border-radius:7px;padding:5px 7px;font-size:.95rem;cursor:pointer;transition:all .15s}
.emoji-btn:hover{background:#22223a;transform:scale(1.1)}
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

  // Game chat
  const [gameChatMsgs, setGameChatMsgs] = useState([]);
  const [gameChatInput, setGameChatInput] = useState("");
  const [showGameChat, setShowGameChat] = useState(false);

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
      const lbRef=doc(db,"leaderboard",authUser.uid);
      const lbSnap=await getDoc(lbRef);
      if(lbSnap.exists()){await updateDoc(lbRef,{wins:(lbSnap.data().wins||0)+(won?1:0),draws:(lbSnap.data().draws||0)+(res==="draw"?1:0),games:(lbSnap.data().games||0)+1});}
      else{await setDoc(lbRef,{username:authUser.username,photoURL:authUser.photoURL||null,wins:won?1:0,draws:res==="draw"?1:0,games:1});}
      const histRef=doc(collection(db,`users/${authUser.uid}/history`));
      await setDoc(histRef,{players:pls,winner:winner||"Draw",moves:log.length,mode,createdAt:serverTimestamp()});
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
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const {ref,uploadString,getDownloadURL,updateProfile,doc,updateDoc,getDoc} = window._fb;
        const storageRef = ref(storage,`avatars/${authUser.uid}`);
        await uploadString(storageRef, ev.target.result,'data_url');
        const url = await getDownloadURL(storageRef);
        await updateProfile(window._fb.auth.currentUser,{photoURL:url});
        await updateDoc(doc(db,"users",authUser.uid),{photoURL:url});
        const lbSnap=await getDoc(doc(db,"leaderboard",authUser.uid));
        if(lbSnap.exists()) await updateDoc(doc(db,"leaderboard",authUser.uid),{photoURL:url});
        setAuthUser(u=>({...u,photoURL:url}));
        setPhotoMsg("success:Profile picture updated! ✅");
      } catch { setPhotoMsg("error:Upload failed. Try again."); }
      setUploadingPhoto(false);
    };
    reader.readAsDataURL(file);
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

  const sendGameChat = async (text) => {
    if(!text.trim()) return;
    const {collection,addDoc,serverTimestamp} = window._fb;
    await addDoc(collection(db,`rooms/${onlineRoom}/chat`),{text:text.trim(),uid:authUser.uid,username:authUser.username,createdAt:serverTimestamp()});
    setGameChatInput("");
  };

  // ── AI ──────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if(mode!=="ai"||turn!=="O"||result) return;
    const t = setTimeout(()=>{const m=bestMove(board);if(m>=0) handleCellClick(m,board,"O");},550);
    return ()=>clearTimeout(t);
  }, [turn,mode,board,result]);

  // ── CELL CLICK ──────────────────────────────────────────────────────────────
  const handleCellClick = useCallback(async (i,currentBoard=board,currentTurn=turn) => {
    if(currentBoard[i]||result) return;
    if(mode==="online"){if(waitingForOpponent||onlineRole!==currentTurn) return;}
    setAnimCell(i); setTimeout(()=>setAnimCell(null),300);
    const nb=[...currentBoard]; nb[i]=currentTurn;
    const newLog=[...moveLog,{player:currentTurn,cell:i,time:Date.now()}];
    const w=calcWinner(nb); const isDraw=!w&&!nb.includes(null);
    const newResult=w||(isDraw?"draw":null);
    const newTurn=currentTurn==="X"?"O":"X";
    setBoard(nb); setMoveLog(newLog);
    if(newResult){setResult(newResult);if(newResult!=="draw")setWinLine(newResult.line);if(mode!=="online")await saveGameToFirestore(newResult,newLog,players);}
    else{setTurn(newTurn);}
    if(mode==="online"){const {doc,updateDoc}=window._fb;await updateDoc(doc(db,"rooms",onlineRoom),{board:nb,turn:newTurn,moveLog:newLog,result:newResult,winLine:newResult&&newResult!=="draw"?newResult.line:null});}
  },[board,turn,result,mode,onlineRole,onlineRoom,moveLog,players,waitingForOpponent]);

  const resetGame = async () => {
    setBoard(Array(9).fill(null)); setTurn("X"); setResult(null); setWinLine(null); setMoveLog([]); resultHandledRef.current=false;
    if(mode==="online"&&onlineRoom){const {doc,updateDoc}=window._fb;await updateDoc(doc(db,"rooms",onlineRoom),{board:Array(9).fill(null),turn:"X",moveLog:[],result:null,winLine:null});}
  };

  const goHome = () => {
    unsubRoomRef.current?.(); unsubGameChatRef.current?.();
    setScreen("home"); setMode("local"); setResult(null); setWinLine(null);
    setBoard(Array(9).fill(null)); setMoveLog([]); setOnlineRoom(""); setOnlineRole(null);
    setScores({X:0,O:0,draw:0}); setWaitingForOpponent(false); setRoomInput(""); setRoomError("");
    setGameChatMsgs([]); resultHandledRef.current=false;
  };

  const startLocalGame = (m) => {
    setMode(m); setPlayers({X:authUser.username,O:m==="ai"?"AI Bot 🤖":"Player O"});
    setBoard(Array(9).fill(null)); setTurn("X"); setResult(null); setWinLine(null); setMoveLog([]);
    setScores({X:0,O:0,draw:0}); resultHandledRef.current=false; setScreen("game");
  };

  const cellClass=(i)=>{let c="cell";if(board[i])c+=` filled ${board[i]==="X"?"x-cell":"o-cell"}`;if(winLine?.includes(i))c+=" win-cell";if(animCell===i)c+=" anim";return c;};
  const getStatus=()=>{if(mode==="online"&&waitingForOpponent)return"⏳ Waiting for opponent…";if(!result)return`${turn==="X"?players.X:players.O}'s turn (${turn})`;if(result==="draw")return"It's a Draw! 🤝";return`${result.winner==="X"?players.X:players.O} wins! 🎉`;};
  const statusClass=()=>{if(!result)return"status";if(result==="draw")return"status draw";return result.winner==="X"?"status win-x":"status win-o";};
  const fmtTime=(ts)=>{if(!ts?.seconds) return "";const d=new Date(ts.seconds*1000);return d.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});};

  const TopBar = ({backTo, backLabel}) => (
    <div className="topbar">
      <div style={{display:"flex",alignItems:"center",gap:9,cursor:"pointer"}} onClick={()=>setScreen("profile")}>
        <AvatarComp user={authUser}/>
        <div><div className="topbar-name">{authUser?.username}</div><div className="topbar-email">{authUser?.email}</div></div>
      </div>
      <div style={{display:"flex",gap:6}}>
        {backTo&&<button className="btn btn-outline btn-sm" onClick={()=>setScreen(backTo)} style={{width:"auto"}}>{backLabel||"←"}</button>}
        <button className="btn btn-outline btn-sm" onClick={handleLogout} style={{width:"auto"}}>Out</button>
      </div>
    </div>
  );

  const BottomNav = () => (
    <div className="bottom-nav">
      {[["🏠","home","Home"],["🎮","play","Play"],["💬","messages","DMs"],["🏆","leaderboard","Ranks"],["👤","profile","Me"]].map(([icon,s,label])=>(
        <button key={s} className={`nav-item ${(screen===s||(s==="play"&&screen==="home"))?"active":""}`}
          onClick={()=>{
            if(s==="play") setScreen("home");
            else if(s==="leaderboard"){loadLeaderboard();setScreen("leaderboard");}
            else if(s==="messages"){setScreen("messages");subscribeConversations();}
            else setScreen(s);
          }}>
          <span style={{fontSize:"1.1rem"}}>{icon}</span>
          {s==="messages"&&totalUnread>0&&<span className="nav-badge">{totalUnread>9?"9+":totalUnread}</span>}
          <span style={{fontSize:".52rem",textTransform:"uppercase",letterSpacing:"1px"}}>{label}</span>
        </button>
      ))}
    </div>
  );

  // ── LOADING ──────────────────────────────────────────────────────────────────
  if(authLoading||!fbReady) return(
    <><style>{CSS}</style>
    <div className="app" style={{gap:16,textAlign:"center"}}>
      <Logo/>
      {fbError?<div className="alert alert-error" style={{maxWidth:300}}>Failed to connect. Check internet.</div>
        :<><div className="spinner" style={{width:28,height:28,margin:"0 auto"}}/><div style={{color:"var(--muted)",fontSize:".7rem",marginTop:8}}>Connecting…</div></>}
    </div></>
  );

  // ── AUTH ─────────────────────────────────────────────────────────────────────
  if(!authUser) return(
    <><style>{CSS}</style>
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

  // ── HOME ─────────────────────────────────────────────────────────────────────
  if(screen==="home") return(
    <><style>{CSS}</style>
    <div className="app"><div style={{width:"100%",maxWidth:420}}>
      <TopBar/>
      <div style={{textAlign:"center",marginBottom:20}}><Logo/><div className="tagline">Welcome back, {authUser.username}! 🎮</div></div>
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
      </div>
      <BottomNav/>
    </div></div></>
  );

  // ── ONLINE LOBBY ─────────────────────────────────────────────────────────────
  if(screen==="online-lobby") return(
    <><style>{CSS}</style>
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
    <><style>{CSS}</style>
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
        <div className="scoreboard">
          <div className={`score-box ${!result&&turn==="X"?"active":""}`}><div className="score-name">{players.X}</div><div className="score-num score-x">{scores.X}</div><div className="score-name" style={{color:"var(--x)"}}>X</div></div>
          <div style={{textAlign:"center"}}><div style={{color:"var(--muted)",fontSize:".65rem"}}>VS</div><div style={{color:"var(--accent)",fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:"1rem"}}>{scores.draw}</div><div style={{color:"var(--muted)",fontSize:".6rem"}}>draws</div></div>
          <div className={`score-box ${!result&&turn==="O"?"active":""}`}><div className="score-name">{players.O}</div><div className="score-num score-o">{scores.O}</div><div className="score-name" style={{color:"var(--o)"}}>O</div></div>
        </div>
        <div className="board">{board.map((v,i)=>(<div key={i} className={cellClass(i)} onClick={()=>handleCellClick(i)}>{v==="X"&&<XIcon/>}{v==="O"&&<OIcon/>}</div>))}</div>
        <div className={statusClass()}>{getStatus()}</div>
        <div className="row" style={{marginTop:10}}>
          <button className="btn btn-outline btn-sm" style={{flex:1}} onClick={resetGame}>↺ New</button>
          <button className="btn btn-outline btn-sm" style={{flex:1}} onClick={goHome}>⌂ Home</button>
          {mode==="online"&&<button className="btn btn-outline btn-sm" style={{flex:1}} onClick={()=>setShowGameChat(p=>!p)}>💬 Chat</button>}
        </div>
        {mode==="online"&&showGameChat&&(
          <div className="game-chat">
            <div className="game-chat-header">💬 Game Chat</div>
            <div className="game-chat-msgs">
              {gameChatMsgs.length===0&&<div style={{color:"var(--muted)",fontSize:".68rem",textAlign:"center",padding:"8px 0"}}>Say hi! 👋</div>}
              {gameChatMsgs.map(m=>(<div key={m.id} className="game-chat-msg"><span style={{color:m.uid===authUser.uid?"var(--accent)":"var(--o)",fontWeight:700,fontSize:".65rem"}}>{m.uid===authUser.uid?"You":m.username}: </span><span>{m.text}</span></div>))}
            </div>
            <div className="emoji-row" style={{padding:"4px 8px"}}>{EMOJIS.map(e=>(<button key={e} className="emoji-btn" onClick={()=>sendGameChat(e)}>{e}</button>))}</div>
            <div className="game-chat-input">
              <input className="input" style={{flex:1,padding:"8px 10px",fontSize:".75rem"}} placeholder="Message…" value={gameChatInput} onChange={e=>setGameChatInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendGameChat(gameChatInput)}/>
              <button className="btn btn-primary btn-sm" onClick={()=>sendGameChat(gameChatInput)} disabled={!gameChatInput.trim()}>Send</button>
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

  // ── MESSAGES (Inbox + Search) ─────────────────────────────────────────────────
  if(screen==="messages") return(
    <><style>{CSS}</style>
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
    <><style>{CSS}</style>
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
    <><style>{CSS}</style>
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
    <><style>{CSS}</style>
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
    <><style>{CSS}</style>
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
    <><style>{CSS}</style>
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

        <button className="btn btn-outline" onClick={()=>{loadMyHistory(authUser.uid);setScreen("history")}}>📜 View Game History</button>
        <button className="btn btn-x" onClick={handleLogout}>🚪 Sign Out</button>
      </div>
      <BottomNav/>
    </div></div></>
  );

            {leaderboard.length===0&&<div style={{textAlign:"center",color:"#5a5a7a",padding:"28px 0",fontSize:".78rem"}}>No games played yet.</div>}
        </>)}

        {/* ── STATS ── */}
        {!loading&&tab==="stats"&&(<>
          <div className="adm-section">
            <div className="adm-section-title">📊 Game Statistics</div>
            <div className="adm-grid">
              <div className="adm-stat"><div className="adm-stat-val" style={{color:"#2ed573"}}>{totalWins}</div><div className="adm-stat-lbl">Total Wins</div></div>
              <div className="adm-stat"><div className="adm-stat-val" style={{color:"#ffd700"}}>{totalDraws}</div><div className="adm-stat-lbl">Total Draws</div></div>
              <div className="adm-stat"><div className="adm-stat-val" style={{color:"#ff4757"}}>{totalGames}</div><div className="adm-stat-lbl">Total Games</div></div>
              <div className="adm-stat"><div className="adm-stat-val" style={{color:"#a29bfe"}}>{leaderboard.length}</div><div className="adm-stat-lbl">Active Players</div></div>
            </div>
          </div>
          <div className="adm-section">
            <div className="adm-section-title">👥 User Statistics</div>
            <div className="adm-grid">
              <div className="adm-stat"><div className="adm-stat-val" style={{color:"#ffd700"}}>{users.length}</div><div className="adm-stat-lbl">Total Registered</div></div>
              <div className="adm-stat"><div className="adm-stat-val" style={{color:"#2ed573"}}>{newToday}</div><div className="adm-stat-lbl">Joined Today</div></div>
              <div className="adm-stat"><div className="adm-stat-val" style={{color:"#a29bfe"}}>{newThisWeek}</div><div className="adm-stat-lbl">This Week</div></div>
              <div className="adm-stat"><div className="adm-stat-val" style={{color:"#fd79a8"}}>{users.filter(u=>u.photoURL).length}</div><div className="adm-stat-lbl">Have Photo</div></div>
            </div>
          </div>
          <div className="adm-section">
            <div className="adm-section-title">🏆 Top 3 Players</div>
            {leaderboard.slice(0,3).map((p,i)=>(
              <div key={p.uid} className="adm-user-row">
                <div style={{fontSize:"1.5rem"}}>{["🥇","🥈","🥉"][i]}</div>
                <div className="adm-avatar">{p.photoURL?<img src={p.photoURL} alt=""/>:p.username?.slice(0,2).toUpperCase()}</div>
                <div className="adm-user-info">
                  <div className="adm-user-name">{p.username}</div>
                  <div className="adm-user-email">{p.wins} wins · {p.draws} draws · {p.games} games</div>
                </div>
                <div className="adm-badge adm-badge-gold">Win rate: {p.games?Math.round((p.wins/p.games)*100):0}%</div>
              </div>
            ))}
          </div>
          <div className="adm-section">
            <div className="adm-section-title">📋 App Info</div>
            <div style={{background:"#111118",borderRadius:10,padding:12,border:"1px solid #22223a",fontSize:".7rem",display:"flex",flexDirection:"column",gap:8}}>
              {[["App Name","FavsTicTac Lovers"],["Owner","Adepoju Favour Emmanuel"],["Platform","Netlify"],["Database","Firebase Firestore"],["Auth","Firebase Auth"],["Version","2.0.0"]].map(([k,v])=>(
                <div key={k} style={{display:"flex",justifyContent:"space-between",paddingBottom:6,borderBottom:"1px solid #22223a"}}>
                  <span style={{color:"#5a5a7a"}}>{k}</span><span style={{fontWeight:700,color:"#ffd700"}}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </>)}
      </div>
    </div>
  );
}

