import { useState, useEffect, useCallback, useRef } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// FIREBASE — loaded via CDN scripts injected into the page
// ─────────────────────────────────────────────────────────────────────────────
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBO-4Ft9xcEWOkhjpURfEC0cR2Dx52GyL0",
  authDomain: "favstictac-lovers.firebaseapp.com",
  projectId: "favstictac-lovers",
  storageBucket: "favstictac-lovers.firebasestorage.app",
  messagingSenderId: "508522451543",
  appId: "1:508522451543:web:2ce488ca2c29cde3384912",
};

// We dynamically import Firebase from CDN
let firebaseApp, auth, db;
let firebaseReady = false;

async function initFirebase() {
  if (firebaseReady) return true;
  try {
    const { initializeApp, getApps } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js");
    const { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
            onAuthStateChanged, signOut, updateProfile } =
      await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js");
    const { getFirestore, doc, setDoc, getDoc, updateDoc, collection,
            query, orderBy, limit, getDocs, onSnapshot, serverTimestamp } =
      await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");

    firebaseApp = getApps().length ? getApps()[0] : initializeApp(FIREBASE_CONFIG);
    auth = getAuth(firebaseApp);
    db = getFirestore(firebaseApp);

    window._fb = {
      auth, db,
      createUserWithEmailAndPassword, signInWithEmailAndPassword,
      onAuthStateChanged, signOut, updateProfile,
      doc, setDoc, getDoc, updateDoc, collection,
      query, orderBy, limit, getDocs, onSnapshot, serverTimestamp,
    };
    firebaseReady = true;
    return true;
  } catch (e) {
    console.error("Firebase init error:", e);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GAME LOGIC
// ─────────────────────────────────────────────────────────────────────────────
const WINS = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
const calcWinner = (b) => {
  for (const [a,c,d] of WINS) if (b[a] && b[a]===b[c] && b[a]===b[d]) return { winner: b[a], line: [a,c,d] };
  return null;
};
const minimax = (board, isMax, depth=0) => {
  const w = calcWinner(board);
  if (w) return w.winner==="O" ? 10-depth : depth-10;
  if (!board.includes(null)) return 0;
  const moves = board.map((v,i)=>v===null?i:-1).filter(i=>i>=0);
  if (isMax) { let b=-Infinity; for(const m of moves){const nb=[...board];nb[m]="O";b=Math.max(b,minimax(nb,false,depth+1));} return b; }
  else { let b=Infinity; for(const m of moves){const nb=[...board];nb[m]="X";b=Math.min(b,minimax(nb,true,depth+1));} return b; }
};
const bestMove = (board) => {
  let best=-Infinity, move=-1;
  board.forEach((v,i)=>{if(v===null){const nb=[...board];nb[i]="O";const s=minimax(nb,false);if(s>best){best=s;move=i;}}});
  return move;
};

// ─────────────────────────────────────────────────────────────────────────────
// ICONS
// ─────────────────────────────────────────────────────────────────────────────
const XIcon = () => <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round"><line x1="8" y1="8" x2="32" y2="32"/><line x1="32" y1="8" x2="8" y2="32"/></svg>;
const OIcon = () => <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="4"><circle cx="20" cy="20" r="12"/></svg>;
const EyeIcon = ({show}) => show
  ? <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
  : <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>;

// ─────────────────────────────────────────────────────────────────────────────
// CSS
// ─────────────────────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=Space+Mono:wght@400;700&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
body{background:#08080f;color:#f0ede8;font-family:'Space Mono',monospace;min-height:100vh}
:root{--x:#ff4757;--o:#2ed573;--bg:#08080f;--card:#111118;--border:#22223a;--accent:#ffd700;--muted:#5a5a7a;--success:#2ed573;--error:#ff4757}
.app{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:16px;
  background:radial-gradient(ellipse at 15% 40%,#1a0828 0%,#08080f 55%),radial-gradient(ellipse at 85% 60%,#0a1a10 0%,transparent 50%)}
.logo{font-family:'Syne',sans-serif;font-weight:800;font-size:clamp(1.5rem,6vw,2.4rem);letter-spacing:-1px;line-height:1}
.logo .lf{color:var(--accent)}.logo .lx{color:var(--x)}.logo .lo{color:var(--o)}
.logo .lm{color:var(--muted);font-size:.55em;vertical-align:middle;margin:0 2px}
.logo .lovers{color:#f0ede8;font-size:.35em;font-weight:400;letter-spacing:3px;text-transform:uppercase;vertical-align:middle;margin-left:4px;opacity:.6}
.tagline{color:var(--muted);font-size:.65rem;margin-top:5px;letter-spacing:3px;text-transform:uppercase}
.card{background:var(--card);border:1px solid var(--border);border-radius:18px;padding:clamp(16px,4vw,28px);width:100%;max-width:400px}
.gap{display:flex;flex-direction:column;gap:10px}
.row{display:flex;gap:8px}
.field{display:flex;flex-direction:column;gap:5px}
.label{font-size:.65rem;color:var(--muted);text-transform:uppercase;letter-spacing:2px}
.input-wrap{position:relative;display:flex;align-items:center}
.input{width:100%;padding:11px 14px;background:#16161f;border:1px solid var(--border);border-radius:9px;color:#f0ede8;
  font-family:'Space Mono',monospace;font-size:.82rem;outline:none;transition:border .2s,box-shadow .2s}
.input:focus{border-color:var(--accent);box-shadow:0 0 0 3px rgba(255,215,0,.08)}
.eye-btn{position:absolute;right:10px;background:none;border:none;color:var(--muted);cursor:pointer;display:flex;padding:4px}
.eye-btn:hover{color:#f0ede8}
.btn{display:flex;align-items:center;justify-content:center;gap:7px;width:100%;padding:13px;border-radius:10px;
  border:none;font-family:'Space Mono',monospace;font-size:.8rem;font-weight:700;cursor:pointer;transition:all .18s;
  letter-spacing:1px;text-transform:uppercase}
.btn:disabled{opacity:.4;cursor:not-allowed}
.btn-primary{background:var(--accent);color:#08080f}.btn-primary:not(:disabled):hover{background:#ffe44d;transform:translateY(-1px)}
.btn-outline{background:transparent;color:#f0ede8;border:1px solid var(--border)}.btn-outline:not(:disabled):hover{border-color:var(--accent);color:var(--accent)}
.btn-x{background:rgba(255,71,87,.12);color:var(--x);border:1px solid rgba(255,71,87,.25)}.btn-x:not(:disabled):hover{background:rgba(255,71,87,.22)}
.btn-o{background:rgba(46,213,115,.12);color:var(--o);border:1px solid rgba(46,213,115,.25)}.btn-o:not(:disabled):hover{background:rgba(46,213,115,.22)}
.btn-sm{padding:8px 14px;font-size:.72rem;width:auto;border-radius:8px}
.divider{display:flex;align-items:center;gap:10px;color:var(--muted);font-size:.65rem;margin:2px 0}
.divider::before,.divider::after{content:'';flex:1;height:1px;background:var(--border)}
.alert{padding:9px 12px;border-radius:8px;font-size:.72rem;line-height:1.5}
.alert-error{background:rgba(255,71,87,.1);border:1px solid rgba(255,71,87,.3);color:var(--error)}
.alert-info{background:rgba(255,215,0,.07);border:1px solid rgba(255,215,0,.2);color:var(--accent)}
.avatar{width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;
  font-family:'Syne',sans-serif;font-weight:800;font-size:.9rem;background:linear-gradient(135deg,#1a0828,#0a1a10);
  border:2px solid var(--border);flex-shrink:0}
.topbar{display:flex;align-items:center;justify-content:space-between;padding:10px 14px;
  background:rgba(17,17,24,.95);border-bottom:1px solid var(--border);border-radius:14px 14px 0 0;margin-bottom:16px;
  position:sticky;top:0;z-index:10;backdrop-filter:blur(8px)}
.topbar-name{font-size:.75rem;font-weight:700;color:#f0ede8;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:130px}
.topbar-email{font-size:.6rem;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:130px}
.scoreboard{display:grid;grid-template-columns:1fr auto 1fr;gap:8px;align-items:center;margin-bottom:14px}
.score-box{background:#16161f;border-radius:10px;padding:10px 8px;text-align:center;border:1px solid var(--border);transition:border .2s,box-shadow .2s}
.score-box.active{border-color:var(--accent);box-shadow:0 0 14px rgba(255,215,0,.12)}
.score-name{font-size:.6rem;color:var(--muted);text-transform:uppercase;letter-spacing:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.score-num{font-family:'Syne',sans-serif;font-weight:800;font-size:1.5rem;line-height:1}
.score-x{color:var(--x)}.score-o{color:var(--o)}
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
.log{max-height:100px;overflow-y:auto;scrollbar-width:thin;scrollbar-color:var(--border) transparent}
.log-entry{display:flex;gap:7px;align-items:center;padding:3px 0;border-bottom:1px solid rgba(255,255,255,.04);font-size:.68rem}
.log-x{color:var(--x)}.log-o{color:var(--o)}
.lb-row{display:grid;grid-template-columns:22px 1fr repeat(3,44px);gap:6px;align-items:center;padding:8px 0;border-bottom:1px solid var(--border);font-size:.73rem}
.lb-header{color:var(--muted);font-size:.62rem;text-transform:uppercase;letter-spacing:1px}
.lb-rank{font-weight:700;font-family:'Syne',sans-serif}
.lb-rank.gold{color:#ffd700}.lb-rank.silver{color:#c0c0c0}.lb-rank.bronze{color:#cd7f32}
.hist-item{padding:10px;border-radius:9px;background:#16161f;margin-bottom:7px;font-size:.72rem}
.room-badge{display:flex;align-items:center;gap:10px;background:#16161f;border:1px solid var(--border);
  border-radius:9px;padding:8px 12px;margin-bottom:10px;flex-wrap:wrap}
.room-code{color:var(--accent);font-weight:700;letter-spacing:3px;font-size:.9rem;font-family:'Syne',sans-serif}
.tabs{display:flex;gap:6px;background:#16161f;border-radius:10px;padding:4px;margin-bottom:14px}
.tab{flex:1;padding:7px 6px;border-radius:7px;border:none;font-family:'Space Mono',monospace;font-size:.68rem;
  cursor:pointer;transition:all .18s;background:none;color:var(--muted);text-transform:uppercase;letter-spacing:1px}
.tab.active{background:var(--card);color:#f0ede8;border:1px solid var(--border)}
.spinner{width:18px;height:18px;border:2px solid var(--border);border-top-color:var(--accent);
  border-radius:50%;animation:spin .7s linear infinite;display:inline-block;vertical-align:middle}
@keyframes spin{to{transform:rotate(360deg)}}
.waiting-code{font-family:'Syne',sans-serif;font-weight:800;font-size:2.2rem;color:var(--accent);letter-spacing:6px;margin:10px 0;text-align:center}
@media(max-width:380px){.btn{font-size:.72rem;padding:11px}.score-num{font-size:1.2rem}}
`;

const Logo = ({small}) => (
  <div className="logo" style={small?{fontSize:"1.4rem"}:{}}>
    <span className="lf">Favs</span><span className="lx">Tic</span>
    <span className="lm">✕</span><span className="lo">Tac</span>
    <span className="lovers">Lovers</span>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// MAIN APP
// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  const [fbReady, setFbReady] = useState(false);
  const [fbError, setFbError] = useState(false);
  const [authUser, setAuthUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authScreen, setAuthScreen] = useState("login");
  const [authForm, setAuthForm] = useState({ email:"", username:"", password:"", confirm:"" });
  const [authError, setAuthError] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const [screen, setScreen] = useState("home");
  const [mode, setMode] = useState("local");
  const [players, setPlayers] = useState({ X:"", O:"" });
  const [board, setBoard] = useState(Array(9).fill(null));
  const [turn, setTurn] = useState("X");
  const [scores, setScores] = useState({ X:0, O:0, draw:0 });
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
  const pollRef = useRef(null);
  const resultHandledRef = useRef(false);
  const unsubRoomRef = useRef(null);

  // ── Init Firebase ──────────────────────────────────────────────────────────
  useEffect(() => {
    initFirebase().then(ok => {
      if (ok) {
        setFbReady(true);
        const { onAuthStateChanged } = window._fb;
        onAuthStateChanged(window._fb.auth, async (user) => {
          if (user) {
            const profile = await getUserProfile(user.uid);
            setAuthUser({ uid: user.uid, email: user.email, username: profile?.username || user.displayName || "Player" });
            loadLeaderboard();
            loadMyHistory(user.uid);
          } else {
            setAuthUser(null);
          }
          setAuthLoading(false);
        });
      } else {
        setFbError(true);
        setAuthLoading(false);
      }
    });
  }, []);

  // ── Firestore helpers ──────────────────────────────────────────────────────
  const getUserProfile = async (uid) => {
    const { doc, getDoc } = window._fb;
    try { const s = await getDoc(doc(db, "users", uid)); return s.exists() ? s.data() : null; }
    catch { return null; }
  };

  const loadLeaderboard = async () => {
    const { collection, query, orderBy, limit, getDocs } = window._fb;
    try {
      const q = query(collection(db, "leaderboard"), orderBy("wins","desc"), limit(20));
      const snap = await getDocs(q);
      setLeaderboard(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch {}
  };

  const loadMyHistory = async (uid) => {
    const { collection, query, orderBy, limit, getDocs } = window._fb;
    try {
      const q = query(collection(db, `users/${uid}/history`), orderBy("createdAt","desc"), limit(30));
      const snap = await getDocs(q);
      setMyHistory(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch {}
  };

  const saveGameToFirestore = async (res, log, pls) => {
    const { doc, setDoc, getDoc, updateDoc, serverTimestamp, collection } = window._fb;
    const winner = res === "draw" ? null : res.winner;

    const saveForUser = async (uid, username, won, drew) => {
      if (!uid || !username) return;
      // Update leaderboard doc
      const lbRef = doc(db, "leaderboard", uid);
      const lbSnap = await getDoc(lbRef);
      if (lbSnap.exists()) {
        await updateDoc(lbRef, { wins: (lbSnap.data().wins||0)+(won?1:0), draws: (lbSnap.data().draws||0)+(drew?1:0), games: (lbSnap.data().games||0)+1 });
      } else {
        await setDoc(lbRef, { username, wins:won?1:0, draws:drew?1:0, games:1 });
      }
      // Save to user history
      const histRef = doc(collection(db, `users/${uid}/history`));
      await setDoc(histRef, {
        players: pls, winner: winner || "Draw", moves: log.length,
        mode, createdAt: serverTimestamp(),
      });
    };

    // Find UIDs for both players
    if (authUser) {
      const isX = pls.X === authUser.username;
      await saveForUser(authUser.uid, authUser.username, isX ? winner==="X" : winner==="O", res==="draw");
    }
    loadLeaderboard();
    if (authUser) loadMyHistory(authUser.uid);
  };

  // ── AUTH ───────────────────────────────────────────────────────────────────
  const handleRegister = async () => {
    setAuthError(""); setAuthBusy(true);
    const { email, username, password, confirm } = authForm;
    if (!email||!username||!password) { setAuthError("All fields are required."); setAuthBusy(false); return; }
    if (!/^[^@]+@[^@]+\.[^@]+$/.test(email)) { setAuthError("Enter a valid email."); setAuthBusy(false); return; }
    if (username.length < 2) { setAuthError("Username must be at least 2 characters."); setAuthBusy(false); return; }
    if (password.length < 6) { setAuthError("Password must be at least 6 characters."); setAuthBusy(false); return; }
    if (password !== confirm) { setAuthError("Passwords do not match."); setAuthBusy(false); return; }
    try {
      const { createUserWithEmailAndPassword, updateProfile } = window._fb;
      const { doc, setDoc } = window._fb;
      const cred = await createUserWithEmailAndPassword(window._fb.auth, email, password);
      await updateProfile(cred.user, { displayName: username });
      await setDoc(doc(db, "users", cred.user.uid), { username, email, createdAt: Date.now() });
      setAuthForm({ email:"", username:"", password:"", confirm:"" });
    } catch(e) {
      const msg = e.code==="auth/email-already-in-use" ? "Email already registered. Please sign in."
        : e.code==="auth/weak-password" ? "Password too weak." : e.message;
      setAuthError(msg);
    }
    setAuthBusy(false);
  };

  const handleLogin = async () => {
    setAuthError(""); setAuthBusy(true);
    const { email, password } = authForm;
    if (!email||!password) { setAuthError("Email and password are required."); setAuthBusy(false); return; }
    try {
      const { signInWithEmailAndPassword } = window._fb;
      await signInWithEmailAndPassword(window._fb.auth, email, password);
      setAuthForm({ email:"", username:"", password:"", confirm:"" });
    } catch(e) {
      const msg = e.code==="auth/user-not-found"||e.code==="auth/invalid-credential" ? "No account found with this email or wrong password."
        : e.code==="auth/wrong-password" ? "Incorrect password."
        : e.code==="auth/too-many-requests" ? "Too many attempts. Try again later." : e.message;
      setAuthError(msg);
    }
    setAuthBusy(false);
  };

  const handleLogout = async () => {
    const { signOut } = window._fb;
    await signOut(window._fb.auth);
    clearInterval(pollRef.current);
    if (unsubRoomRef.current) unsubRoomRef.current();
    setScreen("home"); setOnlineRoom(""); setOnlineRole(null); setResult(null);
    setBoard(Array(9).fill(null)); setMoveLog([]); setScores({ X:0,O:0,draw:0 });
  };

  // ── ONLINE ROOM ────────────────────────────────────────────────────────────
  const createRoom = async () => {
    setRoomError("");
    const { doc, setDoc, serverTimestamp } = window._fb;
    const room = Math.random().toString(36).slice(2,8).toUpperCase();
    await setDoc(doc(db, "rooms", room), {
      board: Array(9).fill(null), turn:"X", moveLog:[], result:null, winLine:null,
      hostUid: authUser.uid, hostName: authUser.username,
      guestUid: null, guestName: null, createdAt: serverTimestamp(),
    });
    setOnlineRoom(room); setOnlineRole("X");
    setPlayers({ X: authUser.username, O:"Waiting…" });
    setWaitingForOpponent(true);
    setBoard(Array(9).fill(null)); setTurn("X"); setResult(null); setWinLine(null); setMoveLog([]);
    resultHandledRef.current = false; setScores({ X:0,O:0,draw:0 });
    setScreen("game");
    subscribeRoom(room, "X");
  };

  const joinRoom = async () => {
    setRoomError("");
    const room = roomInput.trim().toUpperCase();
    if (!room) { setRoomError("Enter a room code."); return; }
    const { doc, getDoc, updateDoc } = window._fb;
    const snap = await getDoc(doc(db, "rooms", room));
    if (!snap.exists()) { setRoomError("Room not found. Check the code."); return; }
    const data = snap.data();
    if (data.guestUid) { setRoomError("Room is full."); return; }
    if (data.hostUid === authUser.uid) { setRoomError("You can't join your own room."); return; }
    await updateDoc(doc(db, "rooms", room), { guestUid: authUser.uid, guestName: authUser.username });
    setOnlineRoom(room); setOnlineRole("O");
    setPlayers({ X: data.hostName, O: authUser.username });
    setWaitingForOpponent(false);
    setBoard(data.board); setTurn(data.turn); setResult(null); setWinLine(null); setMoveLog(data.moveLog||[]);
    resultHandledRef.current = false; setScores({ X:0,O:0,draw:0 });
    setScreen("game");
    subscribeRoom(room, "O");
  };

  const subscribeRoom = (room, role) => {
    const { doc, onSnapshot } = window._fb;
    if (unsubRoomRef.current) unsubRoomRef.current();
    unsubRoomRef.current = onSnapshot(doc(db, "rooms", room), (snap) => {
      if (!snap.exists()) return;
      const state = snap.data();
      if (state.guestUid && state.guestName) {
        setWaitingForOpponent(false);
        setPlayers({ X: state.hostName, O: state.guestName });
      }
      setBoard(state.board);
      setTurn(state.turn);
      setMoveLog(state.moveLog || []);
      if (state.result && !resultHandledRef.current) {
        resultHandledRef.current = true;
        setResult(state.result);
        if (state.result !== "draw") setWinLine(state.winLine);
        saveGameToFirestore(state.result, state.moveLog||[], { X: state.hostName, O: state.guestName });
        setScores(s => ({
          X: s.X+(state.result!=="draw"&&state.result?.winner==="X"?1:0),
          O: s.O+(state.result!=="draw"&&state.result?.winner==="O"?1:0),
          draw: s.draw+(state.result==="draw"?1:0),
        }));
      }
    });
  };

  // ── AI ─────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (mode!=="ai"||turn!=="O"||result) return;
    const t = setTimeout(() => { const m=bestMove(board); if(m>=0) handleCellClick(m,board,"O"); }, 550);
    return () => clearTimeout(t);
  }, [turn, mode, board, result]);

  // ── CELL CLICK ─────────────────────────────────────────────────────────────
  const handleCellClick = useCallback(async (i, currentBoard=board, currentTurn=turn) => {
    if (currentBoard[i]||result) return;
    if (mode==="online") { if(waitingForOpponent||onlineRole!==currentTurn) return; }

    setAnimCell(i); setTimeout(()=>setAnimCell(null),300);
    const nb=[...currentBoard]; nb[i]=currentTurn;
    const newLog=[...moveLog, { player:currentTurn, cell:i, time:Date.now() }];
    const w=calcWinner(nb); const isDraw=!w&&!nb.includes(null);
    const newResult=w||(isDraw?"draw":null);
    const newTurn=currentTurn==="X"?"O":"X";

    setBoard(nb); setMoveLog(newLog);
    if (newResult) {
      setResult(newResult);
      if (newResult!=="draw") setWinLine(newResult.line);
      if (mode!=="online") {
        setScores(s=>({ X:s.X+(newResult!=="draw"&&newResult?.winner==="X"?1:0), O:s.O+(newResult!=="draw"&&newResult?.winner==="O"?1:0), draw:s.draw+(newResult==="draw"?1:0) }));
        await saveGameToFirestore(newResult, newLog, players);
      }
    } else { setTurn(newTurn); }

    if (mode==="online") {
      const { doc, updateDoc } = window._fb;
      await updateDoc(doc(db,"rooms",onlineRoom), {
        board:nb, turn:newTurn, moveLog:newLog,
        result:newResult, winLine:newResult&&newResult!=="draw"?newResult.line:null,
      });
    }
  }, [board,turn,result,mode,onlineRole,onlineRoom,moveLog,players,waitingForOpponent]);

  const resetGame = async () => {
    setBoard(Array(9).fill(null)); setTurn("X"); setResult(null); setWinLine(null); setMoveLog([]);
    resultHandledRef.current=false;
    if (mode==="online"&&onlineRoom) {
      const { doc, updateDoc } = window._fb;
      await updateDoc(doc(db,"rooms",onlineRoom), { board:Array(9).fill(null),turn:"X",moveLog:[],result:null,winLine:null });
    }
  };

  const goHome = () => {
    if(unsubRoomRef.current) unsubRoomRef.current();
    setScreen("home"); setMode("local"); setResult(null); setWinLine(null);
    setBoard(Array(9).fill(null)); setMoveLog([]); setOnlineRoom(""); setOnlineRole(null);
    setScores({X:0,O:0,draw:0}); setWaitingForOpponent(false); setRoomInput(""); setRoomError("");
    resultHandledRef.current=false;
  };

  const startLocalGame = (m) => {
    setMode(m);
    setPlayers({ X:authUser.username, O:m==="ai"?"AI Bot 🤖":"Player O" });
    setBoard(Array(9).fill(null)); setTurn("X"); setResult(null); setWinLine(null); setMoveLog([]);
    setScores({X:0,O:0,draw:0}); resultHandledRef.current=false; setScreen("game");
  };

  const cellClass = (i) => {
    let c="cell";
    if(board[i]) c+=` filled ${board[i]==="X"?"x-cell":"o-cell"}`;
    if(winLine?.includes(i)) c+=" win-cell";
    if(animCell===i) c+=" anim";
    return c;
  };
  const getStatus = () => {
    if(mode==="online"&&waitingForOpponent) return "⏳ Waiting for opponent…";
    if(!result) return `${turn==="X"?players.X:players.O}'s turn (${turn})`;
    if(result==="draw") return "It's a Draw! 🤝";
    return `${result.winner==="X"?players.X:players.O} wins! 🎉`;
  };
  const statusClass = () => { if(!result) return "status"; if(result==="draw") return "status draw"; return result.winner==="X"?"status win-x":"status win-o"; };
  const initials = (n) => n?.slice(0,2).toUpperCase()||"??";

  const TopBar = () => (
    <div className="topbar">
      <div style={{display:"flex",alignItems:"center",gap:9}}>
        <div className="avatar">{initials(authUser?.username)}</div>
        <div>
          <div className="topbar-name">{authUser?.username}</div>
          <div className="topbar-email">{authUser?.email}</div>
        </div>
      </div>
      <button className="btn btn-outline btn-sm" onClick={handleLogout} style={{width:"auto"}}>Sign Out</button>
    </div>
  );

  // ── LOADING ────────────────────────────────────────────────────────────────
  if (authLoading || !fbReady) return (
    <>
      <style>{CSS}</style>
      <div className="app" style={{gap:16,textAlign:"center"}}>
        <Logo/>
        {fbError
          ? <div className="alert alert-error" style={{maxWidth:300}}>Failed to connect to Firebase. Check your internet connection and try again.</div>
          : <><div className="spinner" style={{width:28,height:28,margin:"0 auto"}}/><div style={{color:"var(--muted)",fontSize:".7rem",marginTop:8}}>Connecting to database…</div></>
        }
      </div>
    </>
  );

  // ── AUTH ───────────────────────────────────────────────────────────────────
  if (!authUser) return (
    <>
      <style>{CSS}</style>
      <div className="app">
        <div style={{width:"100%",maxWidth:400,display:"flex",flexDirection:"column",alignItems:"center",gap:20}}>
          <div style={{textAlign:"center"}}><Logo/><div className="tagline">⚡ Sign in to play & track your stats</div></div>
          <div className="card gap">
            <div className="tabs">
              <button className={`tab ${authScreen==="login"?"active":""}`} onClick={()=>{setAuthScreen("login");setAuthError("")}}>Sign In</button>
              <button className={`tab ${authScreen==="register"?"active":""}`} onClick={()=>{setAuthScreen("register");setAuthError("")}}>Register</button>
            </div>
            {authError && <div className="alert alert-error">{authError}</div>}
            {authScreen==="register" && (
              <div className="field"><div className="label">Username</div>
                <input className="input" placeholder="e.g. GameMaster99" value={authForm.username} onChange={e=>setAuthForm(f=>({...f,username:e.target.value}))}/>
              </div>
            )}
            <div className="field"><div className="label">Email</div>
              <input className="input" type="email" placeholder="you@example.com" value={authForm.email} onChange={e=>setAuthForm(f=>({...f,email:e.target.value}))}/>
            </div>
            <div className="field"><div className="label">Password</div>
              <div className="input-wrap">
                <input className="input" type={showPw?"text":"password"} placeholder="••••••••" value={authForm.password}
                  onChange={e=>setAuthForm(f=>({...f,password:e.target.value}))}
                  onKeyDown={e=>e.key==="Enter"&&(authScreen==="login"?handleLogin():handleRegister())}
                  style={{paddingRight:38}}/>
                <button className="eye-btn" onClick={()=>setShowPw(p=>!p)}><EyeIcon show={showPw}/></button>
              </div>
            </div>
            {authScreen==="register" && (
              <div className="field"><div className="label">Confirm Password</div>
                <input className="input" type="password" placeholder="••••••••" value={authForm.confirm}
                  onChange={e=>setAuthForm(f=>({...f,confirm:e.target.value}))}
                  onKeyDown={e=>e.key==="Enter"&&handleRegister()}/>
              </div>
            )}
            <button className="btn btn-primary" onClick={authScreen==="login"?handleLogin:handleRegister} disabled={authBusy}>
              {authBusy ? <><span className="spinner"/> {authScreen==="login"?"Signing in…":"Creating account…"}</> : authScreen==="login"?"🔑 Sign In":"🚀 Create Account"}
            </button>
          </div>
          <div style={{color:"var(--muted)",fontSize:".68rem",textAlign:"center"}}>
            Your <span style={{color:"var(--accent)"}}>FavsTicTac Lovers</span> account works on all devices.
          </div>
        </div>
      </div>
    </>
  );

  // ── HOME ───────────────────────────────────────────────────────────────────
  if (screen==="home") return (
    <>
      <style>{CSS}</style>
      <div className="app"><div style={{width:"100%",maxWidth:400}}>
        <TopBar/>
        <div style={{textAlign:"center",marginBottom:20}}><Logo/><div className="tagline">Welcome back, {authUser.username}! 🎮</div></div>
        <div className="card gap">
          <button className="btn btn-primary" onClick={()=>startLocalGame("local")}>🎮 Local 2-Player</button>
          <button className="btn btn-x" onClick={()=>startLocalGame("ai")}>🤖 vs AI (Unbeatable)</button>
          <button className="btn btn-o" onClick={()=>{setMode("online");setScreen("online-lobby")}}>🌐 Online Multiplayer</button>
          <div className="divider">stats</div>
          <div className="row">
            <button className="btn btn-outline" style={{flex:1}} onClick={()=>{loadLeaderboard();setScreen("leaderboard")}}>🏆 Leaderboard</button>
            <button className="btn btn-outline" style={{flex:1}} onClick={()=>{loadMyHistory(authUser.uid);setScreen("history")}}>📜 My History</button>
          </div>
        </div>
      </div></div>
    </>
  );

  // ── ONLINE LOBBY ───────────────────────────────────────────────────────────
  if (screen==="online-lobby") return (
    <>
      <style>{CSS}</style>
      <div className="app"><div style={{width:"100%",maxWidth:400}}>
        <TopBar/>
        <div style={{textAlign:"center",marginBottom:16}}><Logo small/><div className="tagline">🌐 Online Multiplayer</div></div>
        <div className="card gap">
          <div className="alert alert-info">Share your room code with a friend on another device to play in real-time!</div>
          {roomError && <div className="alert alert-error">{roomError}</div>}
          <button className="btn btn-primary" onClick={createRoom}>🏠 Create Room</button>
          <div className="divider">or join a friend</div>
          <div className="field"><div className="label">Room Code</div>
            <input className="input" placeholder="E.g. ABC123" value={roomInput}
              onChange={e=>setRoomInput(e.target.value.toUpperCase())}
              style={{textAlign:"center",letterSpacing:4,fontWeight:700,fontSize:"1rem"}}
              onKeyDown={e=>e.key==="Enter"&&joinRoom()}/>
          </div>
          <button className="btn btn-o" onClick={joinRoom} disabled={!roomInput.trim()}>🚪 Join Room</button>
          <button className="btn btn-outline" onClick={()=>setScreen("home")}>← Back</button>
        </div>
      </div></div>
    </>
  );

  // ── GAME ───────────────────────────────────────────────────────────────────
  if (screen==="game") return (
    <>
      <style>{CSS}</style>
      <div className="app"><div style={{width:"100%",maxWidth:400}}>
        <TopBar/>
        {mode==="online"&&onlineRoom&&(
          <div className="room-badge">
            <div><div style={{fontSize:".6rem",color:"var(--muted)",textTransform:"uppercase",letterSpacing:2}}>Room Code</div>
              <div className="room-code">{onlineRoom}</div></div>
            <div style={{fontSize:".65rem",color:"var(--muted)"}}>
              You are <span style={{color:onlineRole==="X"?"var(--x)":"var(--o)",fontWeight:700}}>{onlineRole}</span>
              {waitingForOpponent&&<span> · <span className="spinner" style={{width:10,height:10,borderWidth:1.5}}/> waiting…</span>}
            </div>
          </div>
        )}
        {mode==="online"&&waitingForOpponent ? (
          <div className="card">
            <div style={{textAlign:"center",padding:"24px 0"}}>
              <div style={{color:"var(--muted)",fontSize:".72rem",textTransform:"uppercase",letterSpacing:2}}>Share this code</div>
              <div className="waiting-code">{onlineRoom}</div>
              <div style={{color:"var(--muted)",fontSize:".72rem",marginBottom:16}}>Waiting for opponent to join…</div>
              <div className="spinner" style={{width:28,height:28,margin:"0 auto"}}/>
            </div>
            <button className="btn btn-outline" onClick={goHome} style={{marginTop:16}}>← Cancel</button>
          </div>
        ) : (<>
          <div className="scoreboard">
            <div className={`score-box ${!result&&turn==="X"?"active":""}`}>
              <div className="score-name">{players.X}</div>
              <div className="score-num score-x">{scores.X}</div>
              <div className="score-name" style={{color:"var(--x)"}}>X</div>
            </div>
            <div style={{textAlign:"center"}}>
              <div style={{color:"var(--muted)",fontSize:".65rem"}}>VS</div>
              <div style={{color:"var(--accent)",fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:"1rem"}}>{scores.draw}</div>
              <div style={{color:"var(--muted)",fontSize:".6rem"}}>draws</div>
            </div>
            <div className={`score-box ${!result&&turn==="O"?"active":""}`}>
              <div className="score-name">{players.O}</div>
              <div className="score-num score-o">{scores.O}</div>
              <div className="score-name" style={{color:"var(--o)"}}>O</div>
            </div>
          </div>
          <div className="board">
            {board.map((v,i)=>(
              <div key={i} className={cellClass(i)} onClick={()=>handleCellClick(i)}>
                {v==="X"&&<XIcon/>}{v==="O"&&<OIcon/>}
              </div>
            ))}
          </div>
          <div className={statusClass()}>{getStatus()}</div>
          <div className="row" style={{marginTop:10}}>
            <button className="btn btn-outline btn-sm" style={{flex:1}} onClick={resetGame}>↺ New Round</button>
            <button className="btn btn-outline btn-sm" style={{flex:1}} onClick={goHome}>⌂ Home</button>
            <button className="btn btn-outline btn-sm" style={{flex:1}} onClick={()=>{loadLeaderboard();setScreen("leaderboard")}}>🏆</button>
          </div>
          {moveLog.length>0&&(
            <div style={{marginTop:14}}>
              <div className="label" style={{marginBottom:6}}>Move Log</div>
              <div className="log">{[...moveLog].reverse().map((m,i)=>(
                <div key={i} className="log-entry">
                  <span className={m.player==="X"?"log-x":"log-o"}>●</span>
                  <span className={m.player==="X"?"log-x":"log-o"}>{m.player==="X"?players.X:players.O}</span>
                  <span style={{color:"var(--muted)"}}>→ Cell {m.cell+1}</span>
                </div>
              ))}</div>
            </div>
          )}
        </>)}
      </div></div>
    </>
  );

  // ── LEADERBOARD ────────────────────────────────────────────────────────────
  if (screen==="leaderboard") return (
    <>
      <style>{CSS}</style>
      <div className="app"><div style={{width:"100%",maxWidth:440}}>
        <TopBar/>
        <div style={{textAlign:"center",marginBottom:16}}><Logo small/><div className="tagline">🏆 Global Leaderboard</div></div>
        <div className="card">
          <div className="lb-row lb-header"><span>#</span><span>Player</span><span style={{textAlign:"center"}}>W</span><span style={{textAlign:"center"}}>D</span><span style={{textAlign:"center"}}>G</span></div>
          {leaderboard.length===0&&<div style={{textAlign:"center",color:"var(--muted)",padding:"28px 0",fontSize:".78rem"}}>No games yet. Be the first! 🎯</div>}
          {leaderboard.map((p,i)=>(
            <div key={p.id} className="lb-row" style={{background:p.username===authUser.username?"rgba(255,215,0,.04)":"transparent"}}>
              <span className={`lb-rank ${i===0?"gold":i===1?"silver":i===2?"bronze":""}`}>{i+1}</span>
              <span style={{fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",color:p.username===authUser.username?"var(--accent)":"inherit"}}>
                {p.username}{p.username===authUser.username?" (you)":""}
              </span>
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
      </div></div>
    </>
  );

  // ── HISTORY ────────────────────────────────────────────────────────────────
  if (screen==="history") return (
    <>
      <style>{CSS}</style>
      <div className="app"><div style={{width:"100%",maxWidth:440}}>
        <TopBar/>
        <div style={{textAlign:"center",marginBottom:16}}><Logo small/><div className="tagline">📜 {authUser.username}'s History</div></div>
        <div className="card">
          {myHistory.length===0&&<div style={{textAlign:"center",color:"var(--muted)",padding:"28px 0",fontSize:".78rem"}}>No games yet. Play your first game!</div>}
          <div style={{maxHeight:420,overflowY:"auto",scrollbarWidth:"thin",scrollbarColor:"var(--border) transparent"}}>
            {myHistory.map(g=>(
              <div key={g.id} className="hist-item">
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                  <span style={{fontWeight:700,color:g.winner==="Draw"?"var(--accent)":g.winner===authUser.username?"var(--o)":"var(--x)"}}>
                    {g.winner==="Draw"?"🤝 Draw":g.winner===authUser.username?"🏆 Won":"💀 Lost"}
                  </span>
                  <span style={{color:"var(--muted)",fontSize:".62rem"}}>{g.mode}</span>
                </div>
                <div style={{color:"var(--muted)",fontSize:".68rem"}}>
                  {g.players?.X} <span style={{color:"var(--x)"}}>X</span> vs {g.players?.O} <span style={{color:"var(--o)"}}>O</span> · {g.moves} moves
                </div>
              </div>
            ))}
          </div>
          <div className="row" style={{marginTop:14}}>
            <button className="btn btn-outline btn-sm" onClick={()=>setScreen("home")}>← Home</button>
            <button className="btn btn-outline btn-sm" onClick={()=>{loadLeaderboard();setScreen("leaderboard")}}>🏆 Leaderboard</button>
          </div>
        </div>
      </div></div>
    </>
  );

  return null;
}
