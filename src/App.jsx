// CoachOS - Full Coaching Platform
// Coach can edit: macros, full meal plans, full workout plans, messages, phase
// Client sees: everything updated in real time

import { useState, useEffect, useRef } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { auth, db } from './firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  collection,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';

// ─── DEFAULT TEMPLATES (coach can change everything) ───────────────────────
const DEFAULT_WORKOUT = [
  {
    day: 'Monday',
    type: 'Push',
    exercises: [
      { name: 'Bench Press', sets: 4, reps: '8-10', rest: '90s' },
      { name: 'Overhead Press', sets: 3, reps: '10-12', rest: '75s' },
      { name: 'Tricep Pushdowns', sets: 3, reps: '12-15', rest: '60s' },
    ],
  },
  {
    day: 'Tuesday',
    type: 'Pull',
    exercises: [
      { name: 'Pull-ups', sets: 4, reps: '8-10', rest: '90s' },
      { name: 'Barbell Row', sets: 4, reps: '8-10', rest: '90s' },
      { name: 'Hammer Curls', sets: 3, reps: '12-15', rest: '60s' },
    ],
  },
  {
    day: 'Wednesday',
    type: 'Rest',
    exercises: [],
  },
  {
    day: 'Thursday',
    type: 'Legs',
    exercises: [
      { name: 'Back Squat', sets: 4, reps: '6-8', rest: '120s' },
      { name: 'Romanian DL', sets: 4, reps: '8-10', rest: '90s' },
      { name: 'Leg Curl', sets: 3, reps: '12-15', rest: '60s' },
    ],
  },
  {
    day: 'Friday',
    type: 'Push',
    exercises: [
      { name: 'Incline DB Press', sets: 4, reps: '10-12', rest: '90s' },
      { name: 'Lateral Raises', sets: 4, reps: '15-20', rest: '45s' },
      { name: 'Skull Crushers', sets: 3, reps: '12-15', rest: '60s' },
    ],
  },
  {
    day: 'Saturday',
    type: 'Pull',
    exercises: [
      { name: 'Deadlift', sets: 4, reps: '4-6', rest: '120s' },
      { name: 'Cable Row', sets: 3, reps: '10-12', rest: '75s' },
      { name: 'Barbell Curl', sets: 3, reps: '10-12', rest: '60s' },
    ],
  },
  { day: 'Sunday', type: 'Rest', exercises: [] },
];

const DEFAULT_MEALS = [
  {
    name: 'Breakfast',
    time: '7:00 AM',
    items: [
      {
        food: 'Oats',
        amount: '80g',
        protein: 10,
        carbs: 54,
        fats: 5,
        cal: 300,
      },
      {
        food: 'Banana',
        amount: '1 medium',
        protein: 1,
        carbs: 27,
        fats: 0,
        cal: 105,
      },
      {
        food: 'Whey Protein',
        amount: '1 scoop',
        protein: 25,
        carbs: 3,
        fats: 2,
        cal: 130,
      },
    ],
  },
  {
    name: 'Lunch',
    time: '1:00 PM',
    items: [
      {
        food: 'Chicken Breast',
        amount: '200g',
        protein: 46,
        carbs: 0,
        fats: 4,
        cal: 220,
      },
      {
        food: 'Brown Rice',
        amount: '150g',
        protein: 4,
        carbs: 47,
        fats: 1,
        cal: 210,
      },
      {
        food: 'Broccoli',
        amount: '100g',
        protein: 3,
        carbs: 7,
        fats: 0,
        cal: 35,
      },
    ],
  },
  {
    name: 'Pre-Workout',
    time: '5:00 PM',
    items: [
      {
        food: 'Banana',
        amount: '1 large',
        protein: 1,
        carbs: 31,
        fats: 0,
        cal: 120,
      },
      {
        food: 'Peanut Butter',
        amount: '2 tbsp',
        protein: 8,
        carbs: 6,
        fats: 16,
        cal: 190,
      },
    ],
  },
  {
    name: 'Dinner',
    time: '8:00 PM',
    items: [
      {
        food: 'Eggs',
        amount: '4 whole',
        protein: 24,
        carbs: 2,
        fats: 20,
        cal: 280,
      },
      {
        food: 'Sweet Potato',
        amount: '200g',
        protein: 3,
        carbs: 40,
        fats: 0,
        cal: 172,
      },
      {
        food: 'Olive Oil',
        amount: '1 tbsp',
        protein: 0,
        carbs: 0,
        fats: 14,
        cal: 120,
      },
    ],
  },
];

// ─── STYLES ────────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&family=DM+Sans:wght@400;500;600&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'DM Sans',sans-serif;background:#080d1a;color:#e2e8f0;-webkit-font-smoothing:antialiased}
:root{
  --bg:#080d1a;--s1:#0f1629;--s2:#161f38;--s3:#1e2a45;
  --border:#1e2d45;--border2:#243352;
  --green:#22c55e;--green-bg:rgba(34,197,94,.1);--green-b:rgba(34,197,94,.25);
  --blue:#3b82f6;--purple:#a78bfa;--orange:#fb923c;--red:#f87171;--yellow:#fbbf24;
  --text:#e2e8f0;--muted:#64748b;--muted2:#94a3b8;
  --r:12px;--r2:18px;
  --sh:0 4px 24px rgba(0,0,0,.4);--sh2:0 8px 48px rgba(0,0,0,.6);
}

/* NAV */
.nav{background:rgba(8,13,26,.95);backdrop-filter:blur(16px);border-bottom:1px solid var(--border);padding:0 20px;height:58px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:100}
.nav-logo{display:flex;align-items:center;gap:9px;cursor:pointer;border:none;background:none}
.nav-icon{width:34px;height:34px;border-radius:10px;background:linear-gradient(135deg,#22c55e,#16a34a);display:flex;align-items:center;justify-content:center;font-family:'Outfit',sans-serif;font-weight:900;font-size:12px;color:#fff}
.nav-brand{font-family:'Outfit',sans-serif;font-weight:800;font-size:16px;color:var(--text)}
.nav-tabs{display:flex;gap:2px}
.nav-tab{padding:6px 13px;border-radius:8px;border:none;background:transparent;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:500;color:var(--muted);transition:all .15s}
.nav-tab:hover{background:var(--s2);color:var(--text)}
.nav-tab.active{background:var(--green-bg);color:var(--green);border:1px solid var(--green-b)}
.nav-right{display:flex;align-items:center;gap:10px}
.nav-av{width:32px;height:32px;border-radius:50%;background:var(--green-bg);border:1.5px solid var(--green-b);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:11px;color:var(--green);font-family:'Outfit',sans-serif}
.signout{padding:5px 12px;border-radius:8px;border:1px solid var(--border);background:transparent;cursor:pointer;font-size:12px;font-weight:500;color:var(--muted);transition:all .15s}
.signout:hover{border-color:var(--red);color:var(--red)}

/* PAGE */
.page{max-width:940px;margin:0 auto;padding:24px 16px 48px}

/* CARDS */
.card{background:var(--s1);border:1px solid var(--border);border-radius:var(--r);padding:18px;box-shadow:var(--sh)}
.card-title{font-family:'Outfit',sans-serif;font-weight:700;font-size:15px;margin-bottom:14px}

/* GRIDS */
.g4{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
.g3{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
.g2{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.fg{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.ga{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:14px}

/* METRIC CARDS */
.mc{background:var(--s1);border:1px solid var(--border);border-radius:var(--r);padding:16px}
.mc.flash{animation:flashBorder 2.5s ease forwards}
@keyframes flashBorder{0%,40%{border-color:var(--green);box-shadow:0 0 0 2px rgba(34,197,94,.2)}100%{border-color:var(--border);box-shadow:none}}
.mc-val{font-family:'Outfit',sans-serif;font-size:28px;font-weight:800;line-height:1}
.mc-label{font-size:10px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;margin-top:5px}

/* BUTTONS */
.btn{display:inline-flex;align-items:center;gap:6px;padding:9px 16px;border-radius:var(--r);border:none;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:600;transition:all .15s;white-space:nowrap}
.btn-p{background:var(--green);color:#fff}.btn-p:hover{background:#16a34a}
.btn-p:disabled{opacity:.5;cursor:not-allowed}
.btn-s{background:var(--s2);color:var(--text);border:1px solid var(--border2)}.btn-s:hover{background:var(--s3)}
.btn-d{background:rgba(248,113,113,.1);color:var(--red);border:1px solid rgba(248,113,113,.2)}.btn-d:hover{background:rgba(248,113,113,.2)}
.btn-sm{padding:5px 10px;font-size:12px}
.btn-xs{padding:3px 8px;font-size:11px}

/* FORMS */
.fg{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.fld{margin-bottom:12px}
.fl{display:block;font-size:11px;font-weight:700;color:var(--muted2);text-transform:uppercase;letter-spacing:.07em;margin-bottom:6px}
.fi{width:100%;padding:9px 12px;background:var(--s2);border:1.5px solid var(--border);border-radius:9px;color:var(--text);font-family:'DM Sans',sans-serif;font-size:13px;outline:none;transition:border .15s}
.fi:focus{border-color:var(--green)}
.fi::placeholder{color:var(--muted)}
.fsel{width:100%;padding:9px 12px;background:var(--s2);border:1.5px solid var(--border);border-radius:9px;color:var(--text);font-family:'DM Sans',sans-serif;font-size:13px;outline:none}
.fta{width:100%;padding:9px 12px;background:var(--s2);border:1.5px solid var(--border);border-radius:9px;color:var(--text);font-family:'DM Sans',sans-serif;font-size:13px;outline:none;resize:vertical;min-height:90px}
.fta:focus{border-color:var(--green)}

/* TABS */
.tab-bar{display:flex;gap:3px;background:var(--s2);border-radius:10px;padding:3px;margin-bottom:18px;border:1px solid var(--border)}
.tab-item{flex:1;padding:7px 6px;border-radius:8px;border:none;background:transparent;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:12px;font-weight:600;color:var(--muted);transition:all .15s}
.tab-item.active{background:var(--s1);color:var(--text);box-shadow:0 1px 6px rgba(0,0,0,.3)}

/* SECTION HEADER */
.sh{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}
.sh-title{font-family:'Outfit',sans-serif;font-weight:700;font-size:16px}
.sh-link{font-size:12px;font-weight:600;color:var(--green);background:none;border:none;cursor:pointer}

/* MODAL */
.ov{position:fixed;inset:0;background:rgba(0,0,0,.8);backdrop-filter:blur(6px);z-index:200;display:flex;align-items:center;justify-content:center;padding:20px}
.modal{background:var(--s1);border:1px solid var(--border2);border-radius:var(--r2);width:100%;max-width:600px;max-height:90vh;overflow-y:auto;box-shadow:var(--sh2);animation:mIn .2s ease}
.modal-lg{max-width:800px}
@keyframes mIn{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
.mh{padding:18px 22px 14px;border-bottom:1px solid var(--border);position:sticky;top:0;background:var(--s1);border-radius:var(--r2) var(--r2) 0 0;display:flex;align-items:flex-start;justify-content:space-between}
.mt{font-family:'Outfit',sans-serif;font-weight:800;font-size:18px}
.ms{font-size:12px;color:var(--muted);margin-top:2px}
.mb2{padding:18px 22px 22px}
.xbtn{width:28px;height:28px;border-radius:7px;background:var(--s2);border:1px solid var(--border);cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--muted);font-size:14px;flex-shrink:0}
.xbtn:hover{color:var(--red)}

/* TABLE */
.tbl{width:100%;border-collapse:collapse}
.tbl th{text-align:left;padding:8px 12px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--muted);border-bottom:1px solid var(--border)}
.tbl td{padding:11px 12px;font-size:13px;border-bottom:1px solid var(--border);vertical-align:middle}
.tbl tr:last-child td{border-bottom:none}
.tbl tr:hover td{background:rgba(255,255,255,.02)}

/* BADGES */
.bdg{display:inline-flex;padding:3px 9px;border-radius:20px;font-size:10px;font-weight:700}
.bdg-g{background:var(--green-bg);color:var(--green);border:1px solid var(--green-b)}
.bdg-p{background:rgba(167,139,250,.1);color:var(--purple);border:1px solid rgba(167,139,250,.25)}
.bdg-o{background:rgba(251,146,60,.1);color:var(--orange);border:1px solid rgba(251,146,60,.25)}

/* AVATAR */
.av{border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:'Outfit',sans-serif;font-weight:700;flex-shrink:0}
.av-sm{width:32px;height:32px;font-size:11px}
.av-md{width:38px;height:38px;font-size:13px}
.av-g{background:var(--green-bg);color:var(--green);border:1.5px solid var(--green-b)}

/* ALERTS */
.alert{padding:11px 14px;border-radius:10px;font-size:12px;line-height:1.5;margin-bottom:14px}
.alert-w{background:rgba(251,191,36,.08);border:1px solid rgba(251,191,36,.2);color:#fcd34d}
.alert-g{background:var(--green-bg);border:1px solid var(--green-b);color:#86efac}
.alert-e{background:rgba(248,113,113,.08);border:1px solid rgba(248,113,113,.2);color:var(--red)}
.alert-b{background:rgba(59,130,246,.08);border:1px solid rgba(59,130,246,.2);color:#93c5fd}

/* TOAST */
.toast{position:fixed;bottom:22px;right:22px;padding:11px 16px;border-radius:10px;font-size:13px;font-weight:500;z-index:9999;box-shadow:var(--sh2);animation:mIn .2s ease;max-width:320px;pointer-events:none}
.toast-s{background:#166534;border:1px solid #22c55e55;color:#bbf7d0}
.toast-e{background:#7f1d1d;border:1px solid #f8717155;color:#fecaca}

/* AUTH */
.auth-wrap{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px;background:radial-gradient(ellipse at 30% 20%,rgba(34,197,94,.06) 0%,transparent 60%),radial-gradient(ellipse at 70% 80%,rgba(167,139,250,.06) 0%,transparent 60%),var(--bg)}
.auth-card{background:var(--s1);border:1px solid var(--border2);border-radius:22px;padding:36px;width:100%;max-width:400px;box-shadow:var(--sh2)}
.auth-logo{width:56px;height:56px;border-radius:16px;background:linear-gradient(135deg,#22c55e,#16a34a);display:flex;align-items:center;justify-content:center;font-family:'Outfit',sans-serif;font-weight:900;font-size:20px;color:#fff;margin:0 auto 14px;box-shadow:0 8px 24px rgba(34,197,94,.3)}
.auth-title{font-family:'Outfit',sans-serif;font-weight:800;font-size:24px;text-align:center;margin-bottom:4px}
.auth-sub{font-size:13px;color:var(--muted);text-align:center;margin-bottom:28px}
.auth-btn{width:100%;padding:13px;background:linear-gradient(135deg,#22c55e,#16a34a);color:#fff;border:none;border-radius:10px;font-family:'Outfit',sans-serif;font-weight:700;font-size:15px;cursor:pointer;margin-top:4px;box-shadow:0 4px 16px rgba(34,197,94,.25);transition:all .15s}
.auth-btn:hover{box-shadow:0 6px 24px rgba(34,197,94,.4);transform:translateY(-1px)}
.auth-btn:disabled{opacity:.5;cursor:not-allowed;transform:none}
.auth-switch{text-align:center;margin-top:16px;font-size:12px;color:var(--muted)}
.auth-switch button{background:none;border:none;cursor:pointer;color:var(--green);font-size:12px;font-weight:600}

/* LIVE */
.live{display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:600;color:var(--green)}
.dot{width:6px;height:6px;border-radius:50%;background:var(--green);flex-shrink:0;animation:pulse 1.4s ease infinite}
@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(.8)}}

/* PHASE CHIP */
.phase{display:inline-flex;align-items:center;gap:5px;padding:4px 11px;border-radius:20px;font-size:12px;font-weight:600;background:var(--green-bg);color:var(--green);border:1px solid var(--green-b)}

/* MSG BUBBLE */
.msg-b{background:var(--s2);border:1px solid var(--border);border-radius:12px;padding:13px 15px;font-size:13px;line-height:1.65;color:var(--muted2);white-space:pre-wrap}
.msg-b.has{background:var(--green-bg);border-color:var(--green-b);color:var(--text)}

/* NEW BADGE */
.nbadge{display:inline-flex;padding:2px 7px;border-radius:20px;font-size:10px;font-weight:700;background:var(--green-bg);color:var(--green);border:1px solid var(--green-b);margin-left:8px;animation:mIn .3s ease}

/* SPINNER */
.spin-wrap{display:flex;align-items:center;justify-content:center;min-height:260px;gap:10px;color:var(--muted);font-size:13px}
.spinner{width:20px;height:20px;border-radius:50%;border:2px solid var(--border);border-top-color:var(--green);animation:sp .7s linear infinite}
@keyframes sp{to{transform:rotate(360deg)}}

/* EMPTY */
.empty{text-align:center;padding:48px 24px;color:var(--muted)}
.empty-icon{font-size:48px;margin-bottom:14px}
.empty-title{font-family:'Outfit',sans-serif;font-weight:700;font-size:17px;color:var(--text);margin-bottom:8px}
.empty-desc{font-size:13px;margin-bottom:20px}

/* WORKOUT CARDS */
.wk-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px}
.wk-card{border-radius:var(--r);padding:14px 8px;text-align:center;background:var(--s1);border:1px solid var(--border);cursor:pointer;transition:all .15s}
.wk-card:hover{transform:translateY(-2px);border-color:var(--border2);box-shadow:var(--sh)}
.wk-card.rest{opacity:.45;cursor:default}.wk-card.rest:hover{transform:none;box-shadow:none}

/* PROGRESS */
.prog-track{background:var(--s2);border-radius:4px;height:5px;overflow:hidden}
.prog-fill{height:100%;border-radius:4px;background:var(--green);transition:width .5s}

/* MEAL CARD */
.meal-card{background:var(--s2);border:1px solid var(--border);border-radius:10px;margin-bottom:12px;overflow:hidden}
.meal-head{padding:11px 14px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--border)}
.meal-body{padding:8px 14px 12px}
.food-row{display:flex;align-items:center;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border);font-size:13px}
.food-row:last-child{border-bottom:none}

/* EXERCISE ROW */
.ex-row{display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid var(--border)}
.ex-row:last-child{border-bottom:none}
.ex-num{width:24px;height:24px;border-radius:6px;background:var(--s2);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:var(--muted);flex-shrink:0}

/* CLIENT CARD */
.cl-card{background:var(--s1);border:1px solid var(--border);border-radius:var(--r);padding:16px;cursor:pointer;transition:all .15s}
.cl-card:hover{border-color:var(--border2);transform:translateY(-1px);box-shadow:var(--sh)}

/* DIVIDER */
.sec-lbl{font-family:'Outfit',sans-serif;font-weight:700;font-size:12px;color:var(--muted2);text-transform:uppercase;letter-spacing:.08em;margin-bottom:10px}

@media(max-width:700px){.g4{grid-template-columns:1fr 1fr}.fg{grid-template-columns:1fr}.nav-tabs{display:none}.wk-grid{grid-template-columns:repeat(4,1fr)}}
`;

// ─── TOAST ─────────────────────────────────────────────────────────────────
function useToast() {
  const [t, setT] = useState(null);
  const show = (msg, type = 'success') => {
    setT({ msg, type });
    setTimeout(() => setT(null), 4000);
  };
  return { t, show };
}

// ─── METRIC CARD ───────────────────────────────────────────────────────────
function MC({ label, value, color, suffix = '', flash = false }) {
  const [k, setK] = useState(0);
  const prev = useRef(false);
  useEffect(() => {
    if (flash && !prev.current) setK((x) => x + 1);
    prev.current = flash;
  }, [flash]);
  return (
    <div key={k} className={flash ? 'mc flash' : 'mc'}>
      {value != null ? (
        <div className="mc-val" style={{ color }}>
          {value}
          <span style={{ fontSize: 13, fontWeight: 500 }}>{suffix}</span>
        </div>
      ) : (
        <div
          style={{
            width: 28,
            height: 3,
            background: color + '44',
            borderRadius: 2,
            margin: '8px 0 4px',
          }}
        />
      )}
      <div className="mc-label">{label}</div>
    </div>
  );
}

// ─── CLIENT DASHBOARD ──────────────────────────────────────────────────────
function ClientDash({ uid, tab, setTab, toast }) {
  const [d, setD] = useState(null);
  const [loading, setLoading] = useState(true);
  const prevRef = useRef(null);
  const [flash, setFlash] = useState({});
  const [wModal, setWModal] = useState(null);
  const [lw, setLw] = useState('');
  const [lwa, setLwa] = useState('');
  const [saving, setSaving] = useState(false);
  const [photos, setPhotos] = useState([]);
  const WTYPE_COLOR = {
    Push: '#4ade80',
    Pull: '#818cf8',
    Legs: '#fb923c',
    Rest: '#475569',
  };

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'clients', uid), (snap) => {
      if (!snap.exists()) {
        setLoading(false);
        return;
      }
      const data = snap.data();
      if (prevRef.current) {
        const p = prevRef.current;
        const changed = {};
        const n = data.nutrition || {},
          pn = p.nutrition || {};
        ['calories', 'protein', 'carbs', 'fats'].forEach((k) => {
          if (pn[k] !== n[k]) changed[k] = true;
        });
        if (p.coachMessage !== data.coachMessage) changed.msg = true;
        if (p.phase !== data.phase) changed.phase = true;
        if (p.week !== data.week) changed.week = true;
        if (JSON.stringify(p.mealPlan) !== JSON.stringify(data.mealPlan))
          changed.meals = true;
        if (JSON.stringify(p.workoutPlan) !== JSON.stringify(data.workoutPlan))
          changed.workout = true;
        if (Object.keys(changed).length > 0) {
          setFlash(changed);
          toast('⚡ Coach updated your plan!', 'success');
          setTimeout(() => setFlash({}), 3000);
        }
      }
      prevRef.current = data;
      setD(data);
      setLoading(false);
    });
    return unsub;
  }, [uid]);

  const logStats = async () => {
    if (!lw) return;
    setSaving(true);
    const weight = parseFloat(lw);
    const waist = lwa ? parseFloat(lwa) : d.waist || null;
    const hist = d.weightHistory || [];
    await updateDoc(doc(db, 'clients', uid), {
      weight,
      waist,
      weightHistory: [
        ...hist,
        {
          week: 'W' + (hist.length + 1),
          weight,
          date: new Date().toLocaleDateString('en-IN'),
        },
      ],
    });
    toast('✓ Logged: ' + lw + 'kg', 'success');
    setLw('');
    setLwa('');
    setSaving(false);
  };

  if (loading)
    return (
      <div className="spin-wrap">
        <div className="spinner" />
        <span>Loading your plan...</span>
      </div>
    );
  if (!d)
    return <div className="spin-wrap">No data found. Contact your coach.</div>;

  const n = d.nutrition || {};
  const meals = d.mealPlan || DEFAULT_MEALS;
  const workout = d.workoutPlan || DEFAULT_WORKOUT;

  // ── TRAINING ──
  if (tab === 'training')
    return (
      <div className="page">
        <div style={{ marginBottom: 22 }}>
          <div
            style={{
              fontFamily: "'Outfit',sans-serif",
              fontSize: 22,
              fontWeight: 800,
            }}
          >
            🏋️ Your Workout Plan
          </div>
          <div style={{ color: 'var(--muted)', fontSize: 13, marginTop: 5 }}>
            {d.phase} · Week {d.week}
          </div>
          {flash.workout && (
            <div className="nbadge" style={{ marginTop: 8 }}>
              ✨ Updated by coach
            </div>
          )}
        </div>
        <div className="wk-grid" style={{ marginBottom: 20 }}>
          {workout.map((day, i) => (
            <div
              key={i}
              className={day.type === 'Rest' ? 'wk-card rest' : 'wk-card'}
              style={{
                borderTop: '3px solid ' + (WTYPE_COLOR[day.type] || '#475569'),
              }}
              onClick={() => day.type !== 'Rest' && setWModal(day)}
            >
              <div
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  color: 'var(--muted)',
                  marginBottom: 8,
                }}
              >
                {day.day.slice(0, 3)}
              </div>
              <div style={{ fontSize: 20, marginBottom: 5 }}>
                {day.type === 'Rest'
                  ? '😴'
                  : day.type === 'Legs'
                  ? '🦵'
                  : day.type === 'Pull'
                  ? '🏋️'
                  : '💪'}
              </div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: WTYPE_COLOR[day.type] || '#475569',
                }}
              >
                {day.type}
              </div>
              {day.type !== 'Rest' && (
                <div
                  style={{ fontSize: 10, color: 'var(--muted)', marginTop: 3 }}
                >
                  {day.exercises.length} exercises
                </div>
              )}
            </div>
          ))}
        </div>
        {wModal && (
          <div
            className="ov"
            onClick={(e) => e.target === e.currentTarget && setWModal(null)}
          >
            <div className="modal">
              <div className="mh">
                <div>
                  <div className="mt">
                    {wModal.day} — {wModal.type}
                  </div>
                  <div className="ms">{wModal.exercises.length} exercises</div>
                </div>
                <button className="xbtn" onClick={() => setWModal(null)}>
                  ✕
                </button>
              </div>
              <div className="mb2">
                {wModal.exercises.map((ex, i) => (
                  <div key={i} className="ex-row">
                    <div className="ex-num">{i + 1}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>
                        {ex.name}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                        Rest: {ex.rest}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: 13,
                          color: WTYPE_COLOR[wModal.type],
                        }}
                      >
                        {ex.sets} × {ex.reps}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--muted)' }}>
                        sets × reps
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );

  // ── NUTRITION ──
  if (tab === 'nutrition')
    return (
      <div className="page">
        <div style={{ marginBottom: 18 }}>
          <div
            style={{
              fontFamily: "'Outfit',sans-serif",
              fontSize: 22,
              fontWeight: 800,
            }}
          >
            🥩 Your Nutrition Plan
          </div>
          <div className="live" style={{ marginTop: 7 }}>
            <span className="dot" />
            Updates live from coach
          </div>
          {flash.meals && (
            <div className="nbadge" style={{ marginTop: 8 }}>
              ✨ Meal plan updated
            </div>
          )}
        </div>
        <div className="g4" style={{ marginBottom: 20 }}>
          <MC
            label="Calories"
            value={n.calories}
            color="var(--green)"
            flash={!!flash.calories}
          />
          <MC
            label="Protein G"
            value={n.protein}
            color="var(--purple)"
            flash={!!flash.protein}
          />
          <MC
            label="Carbs G"
            value={n.carbs}
            color="var(--orange)"
            flash={!!flash.carbs}
          />
          <MC
            label="Fats G"
            value={n.fats}
            color="var(--red)"
            flash={!!flash.fats}
          />
        </div>
        {meals.map((meal, mi) => (
          <div key={mi} className="meal-card">
            <div className="meal-head">
              <div>
                <span style={{ fontWeight: 700, fontSize: 14 }}>
                  {meal.name}
                </span>
                <span
                  style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 8 }}
                >
                  {meal.time}
                </span>
              </div>
              <span className="bdg bdg-g">
                {meal.items.reduce((a, i) => a + (i.cal || 0), 0)} kcal
              </span>
            </div>
            <div className="meal-body">
              {meal.items.map((item, ii) => (
                <div key={ii} className="food-row">
                  <div>
                    <span style={{ fontWeight: 600 }}>{item.food}</span>
                    <span
                      style={{
                        color: 'var(--muted)',
                        fontSize: 12,
                        marginLeft: 6,
                      }}
                    >
                      {item.amount}
                    </span>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      gap: 10,
                      fontSize: 12,
                      color: 'var(--muted)',
                    }}
                  >
                    <span style={{ color: 'var(--purple)' }}>
                      {item.protein}g P
                    </span>
                    <span style={{ color: 'var(--orange)' }}>
                      {item.carbs}g C
                    </span>
                    <span style={{ color: 'var(--red)' }}>{item.fats}g F</span>
                    <span style={{ color: 'var(--green)', fontWeight: 600 }}>
                      {item.cal} cal
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );

  // ── PHOTOS ──
  if (tab === 'photos')
    return (
      <div className="page">
        <div style={{ marginBottom: 20 }}>
          <div
            style={{
              fontFamily: "'Outfit',sans-serif",
              fontSize: 22,
              fontWeight: 800,
            }}
          >
            📸 Progress Photos
          </div>
        </div>
        <div className="card" style={{ marginBottom: 16 }}>
          <label
            style={{
              border: '2px dashed var(--border2)',
              borderRadius: 12,
              padding: 32,
              textAlign: 'center',
              cursor: 'pointer',
              display: 'block',
              background: 'var(--s2)',
            }}
          >
            <input
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => {
                const f = e.target.files[0];
                if (!f) return;
                setPhotos((p) => [
                  ...p,
                  {
                    url: URL.createObjectURL(f),
                    date: new Date().toLocaleDateString('en-IN'),
                  },
                ]);
                toast('Photo saved!', 'success');
              }}
            />
            <div
              style={{
                fontWeight: 600,
                fontSize: 14,
                color: 'var(--green)',
                marginBottom: 4,
              }}
            >
              📤 Click to upload
            </div>
            <div style={{ color: 'var(--muted)', fontSize: 12 }}>
              JPG or PNG
            </div>
          </label>
        </div>
        {photos.length > 0 && (
          <div className="card">
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill,minmax(130px,1fr))',
                gap: 10,
              }}
            >
              {photos.map((p, i) => (
                <div
                  key={i}
                  style={{
                    borderRadius: 10,
                    overflow: 'hidden',
                    aspectRatio: '3/4',
                    position: 'relative',
                  }}
                >
                  <img
                    src={p.url}
                    alt=""
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      background: 'linear-gradient(transparent,rgba(0,0,0,.7))',
                      padding: '12px 8px 8px',
                      color: '#fff',
                      fontSize: 10,
                    }}
                  >
                    {p.date}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );

  // ── HOME ──
  return (
    <div className="page">
      <div style={{ marginBottom: 22 }}>
        <div
          style={{
            fontFamily: "'Outfit',sans-serif",
            fontSize: 26,
            fontWeight: 800,
          }}
        >
          Hey {(d.name || '').split(' ')[0]} 💪
        </div>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 8,
            marginTop: 10,
            alignItems: 'center',
          }}
        >
          <span className="phase">
            {d.phase} · Week {d.week}
          </span>
          <span className="live">
            <span className="dot" />
            Live sync
          </span>
        </div>
      </div>

      <div className="g4" style={{ marginBottom: 18 }}>
        <MC
          label="Weight KG"
          value={d.weight}
          color="var(--green)"
          flash={!!flash.weight}
        />
        <MC
          label="Waist CM"
          value={d.waist}
          color="var(--purple)"
          flash={!!flash.waist}
        />
        <MC
          label="Body Fat %"
          value={d.bodyFat}
          color="var(--orange)"
          suffix="%"
        />
        <MC
          label="Week"
          value={'W' + d.week}
          color="var(--blue)"
          flash={!!flash.week}
        />
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-title">📝 Log Today's Check-in</div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr auto',
            gap: 10,
            alignItems: 'flex-end',
          }}
        >
          <div>
            <div className="fl">Weight (kg)</div>
            <input
              className="fi"
              type="number"
              step="0.1"
              placeholder="85.5"
              value={lw}
              onChange={(e) => setLw(e.target.value)}
            />
          </div>
          <div>
            <div className="fl">Waist (cm)</div>
            <input
              className="fi"
              type="number"
              step="0.1"
              placeholder="82"
              value={lwa}
              onChange={(e) => setLwa(e.target.value)}
            />
          </div>
          <button
            className="btn btn-p"
            onClick={logStats}
            disabled={saving || !lw}
          >
            {saving ? '...' : '✓ Log'}
          </button>
        </div>
      </div>

      <div
        className={flash.msg ? 'card flash' : 'card'}
        style={{ marginBottom: 16 }}
      >
        <div
          className="card-title"
          style={{ display: 'flex', alignItems: 'center' }}
        >
          💬 Coach's Message{' '}
          {flash.msg && <span className="nbadge">✨ New</span>}
        </div>
        <div className={'msg-b' + (d.coachMessage ? ' has' : '')}>
          {d.coachMessage || "Your coach hasn't sent a message yet."}
        </div>
      </div>

      <div className="sh">
        <div className="sh-title">🥩 Today's Targets</div>
        <button className="sh-link" onClick={() => setTab('nutrition')}>
          Full plan →
        </button>
      </div>
      <div className="g4" style={{ marginBottom: 20 }}>
        <MC
          label="Calories"
          value={n.calories}
          color="var(--green)"
          flash={!!flash.calories}
        />
        <MC
          label="Protein G"
          value={n.protein}
          color="var(--purple)"
          flash={!!flash.protein}
        />
        <MC
          label="Carbs G"
          value={n.carbs}
          color="var(--orange)"
          flash={!!flash.carbs}
        />
        <MC
          label="Fats G"
          value={n.fats}
          color="var(--red)"
          flash={!!flash.fats}
        />
      </div>

      <div className="sh">
        <div className="sh-title">🏋️ This Week</div>
        <button className="sh-link" onClick={() => setTab('training')}>
          Full plan →
        </button>
      </div>
      <div className="card" style={{ marginBottom: 20 }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7,1fr)',
            gap: 6,
          }}
        >
          {workout.map((day, i) => (
            <div
              key={i}
              className={day.type === 'Rest' ? 'wk-card rest' : 'wk-card'}
              style={{
                borderTop: '3px solid ' + (WTYPE_COLOR[day.type] || '#475569'),
                padding: '10px 4px',
              }}
              onClick={() => day.type !== 'Rest' && setWModal(day)}
            >
              <div
                style={{
                  fontSize: 8,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  color: 'var(--muted)',
                  marginBottom: 5,
                }}
              >
                {day.day.slice(0, 3)}
              </div>
              <div style={{ fontSize: 16, marginBottom: 3 }}>
                {day.type === 'Rest'
                  ? '😴'
                  : day.type === 'Legs'
                  ? '🦵'
                  : day.type === 'Pull'
                  ? '🏋️'
                  : '💪'}
              </div>
              <div
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  color: WTYPE_COLOR[day.type] || '#475569',
                }}
              >
                {day.type}
              </div>
            </div>
          ))}
        </div>
      </div>

      {(d.weightHistory || []).length > 1 && (
        <>
          <div className="sh">
            <div className="sh-title">📈 Weight Progress</div>
          </div>
          <div className="card" style={{ marginBottom: 24 }}>
            <div style={{ height: 190 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={d.weightHistory}>
                  <defs>
                    <linearGradient id="wg" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor="#22c55e"
                        stopOpacity={0.25}
                      />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e2d45" />
                  <XAxis
                    dataKey="week"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    domain={['auto', 'auto']}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: '#0f1629',
                      border: '1px solid #1e2d45',
                      borderRadius: 9,
                      fontSize: 12,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="weight"
                    stroke="#22c55e"
                    strokeWidth={2.5}
                    fill="url(#wg)"
                    dot={{ fill: '#22c55e', r: 3, strokeWidth: 0 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
      {wModal && (
        <div
          className="ov"
          onClick={(e) => e.target === e.currentTarget && setWModal(null)}
        >
          <div className="modal">
            <div className="mh">
              <div>
                <div className="mt">
                  {wModal.day} — {wModal.type}
                </div>
              </div>
              <button className="xbtn" onClick={() => setWModal(null)}>
                ✕
              </button>
            </div>
            <div className="mb2">
              {wModal.exercises.map((ex, i) => (
                <div key={i} className="ex-row">
                  <div className="ex-num">{i + 1}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>
                      {ex.name}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                      Rest: {ex.rest}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>
                      {ex.sets} × {ex.reps}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── COACH WORKOUT EDITOR ──────────────────────────────────────────────────
function WorkoutEditor({ plan, onSave, onClose }) {
  const [days, setDays] = useState(JSON.parse(JSON.stringify(plan)));
  const TYPES = ['Push', 'Pull', 'Legs', 'Rest', 'Cardio', 'Full Body'];

  const updateDay = (di, field, val) =>
    setDays((d) =>
      d.map((day, i) => (i === di ? { ...day, [field]: val } : day))
    );
  const updateEx = (di, ei, field, val) =>
    setDays((d) =>
      d.map((day, i) =>
        i === di
          ? {
              ...day,
              exercises: day.exercises.map((ex, j) =>
                j === ei ? { ...ex, [field]: val } : ex
              ),
            }
          : day
      )
    );
  const addEx = (di) =>
    setDays((d) =>
      d.map((day, i) =>
        i === di
          ? {
              ...day,
              exercises: [
                ...day.exercises,
                { name: '', sets: 3, reps: '10-12', rest: '60s' },
              ],
            }
          : day
      )
    );
  const removeEx = (di, ei) =>
    setDays((d) =>
      d.map((day, i) =>
        i === di
          ? { ...day, exercises: day.exercises.filter((_, j) => j !== ei) }
          : day
      )
    );
  const addDay = () =>
    setDays((d) => [
      ...d,
      { day: 'Day ' + (d.length + 1), type: 'Push', exercises: [] },
    ]);
  const removeDay = (di) => setDays((d) => d.filter((_, i) => i !== di));

  return (
    <div
      className="ov"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal modal-lg">
        <div className="mh">
          <div>
            <div className="mt">✏️ Edit Workout Plan</div>
            <div className="ms">Changes save to client instantly</div>
          </div>
          <button className="xbtn" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="mb2">
          {days.map((day, di) => (
            <div
              key={di}
              style={{
                background: 'var(--s2)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                padding: 14,
                marginBottom: 12,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  gap: 8,
                  marginBottom: 10,
                  alignItems: 'center',
                }}
              >
                <input
                  className="fi"
                  style={{ flex: 1 }}
                  value={day.day}
                  onChange={(e) => updateDay(di, 'day', e.target.value)}
                  placeholder="Day name"
                />
                <select
                  className="fsel"
                  style={{ width: 120 }}
                  value={day.type}
                  onChange={(e) => updateDay(di, 'type', e.target.value)}
                >
                  {TYPES.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
                <button
                  className="btn btn-d btn-sm"
                  onClick={() => removeDay(di)}
                >
                  ✕
                </button>
              </div>
              {day.type !== 'Rest' && (
                <>
                  {day.exercises.map((ex, ei) => (
                    <div
                      key={ei}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '2fr 60px 80px 70px auto',
                        gap: 6,
                        marginBottom: 6,
                        alignItems: 'center',
                      }}
                    >
                      <input
                        className="fi"
                        value={ex.name}
                        onChange={(e) =>
                          updateEx(di, ei, 'name', e.target.value)
                        }
                        placeholder="Exercise name"
                      />
                      <input
                        className="fi"
                        type="number"
                        value={ex.sets}
                        onChange={(e) =>
                          updateEx(
                            di,
                            ei,
                            'sets',
                            parseInt(e.target.value) || 1
                          )
                        }
                        placeholder="Sets"
                      />
                      <input
                        className="fi"
                        value={ex.reps}
                        onChange={(e) =>
                          updateEx(di, ei, 'reps', e.target.value)
                        }
                        placeholder="Reps"
                      />
                      <input
                        className="fi"
                        value={ex.rest}
                        onChange={(e) =>
                          updateEx(di, ei, 'rest', e.target.value)
                        }
                        placeholder="Rest"
                      />
                      <button
                        className="btn btn-d btn-xs"
                        onClick={() => removeEx(di, ei)}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  <button
                    className="btn btn-s btn-sm"
                    onClick={() => addEx(di)}
                    style={{ marginTop: 4 }}
                  >
                    + Add Exercise
                  </button>
                </>
              )}
            </div>
          ))}
          <button
            className="btn btn-s"
            onClick={addDay}
            style={{ marginBottom: 14 }}
          >
            + Add Day
          </button>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              className="btn btn-p"
              style={{ flex: 1 }}
              onClick={() => onSave(days)}
            >
              💾 Save Workout Plan to Client
            </button>
            <button className="btn btn-s" onClick={onClose}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── COACH MEAL EDITOR ─────────────────────────────────────────────────────
function MealEditor({ plan, onSave, onClose }) {
  const [meals, setMeals] = useState(JSON.parse(JSON.stringify(plan)));

  const updateMeal = (mi, field, val) =>
    setMeals((m) =>
      m.map((meal, i) => (i === mi ? { ...meal, [field]: val } : meal))
    );
  const updateItem = (mi, ii, field, val) =>
    setMeals((m) =>
      m.map((meal, i) =>
        i === mi
          ? {
              ...meal,
              items: meal.items.map((item, j) =>
                j === ii
                  ? {
                      ...item,
                      [field]:
                        field === 'food' || field === 'amount'
                          ? val
                          : parseFloat(val) || 0,
                    }
                  : item
              ),
            }
          : meal
      )
    );
  const addItem = (mi) =>
    setMeals((m) =>
      m.map((meal, i) =>
        i === mi
          ? {
              ...meal,
              items: [
                ...meal.items,
                { food: '', amount: '', protein: 0, carbs: 0, fats: 0, cal: 0 },
              ],
            }
          : meal
      )
    );
  const removeItem = (mi, ii) =>
    setMeals((m) =>
      m.map((meal, i) =>
        i === mi
          ? { ...meal, items: meal.items.filter((_, j) => j !== ii) }
          : meal
      )
    );
  const addMeal = () =>
    setMeals((m) => [
      ...m,
      { name: 'Meal ' + (m.length + 1), time: '12:00 PM', items: [] },
    ]);
  const removeMeal = (mi) => setMeals((m) => m.filter((_, i) => i !== mi));

  return (
    <div
      className="ov"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal modal-lg">
        <div className="mh">
          <div>
            <div className="mt">🥩 Edit Meal Plan</div>
            <div className="ms">Changes save to client instantly</div>
          </div>
          <button className="xbtn" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="mb2">
          {meals.map((meal, mi) => (
            <div
              key={mi}
              style={{
                background: 'var(--s2)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                padding: 14,
                marginBottom: 12,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  gap: 8,
                  marginBottom: 10,
                  alignItems: 'center',
                }}
              >
                <input
                  className="fi"
                  style={{ flex: 1 }}
                  value={meal.name}
                  onChange={(e) => updateMeal(mi, 'name', e.target.value)}
                  placeholder="Meal name"
                />
                <input
                  className="fi"
                  style={{ width: 110 }}
                  value={meal.time}
                  onChange={(e) => updateMeal(mi, 'time', e.target.value)}
                  placeholder="Time"
                />
                <button
                  className="btn btn-d btn-sm"
                  onClick={() => removeMeal(mi)}
                >
                  ✕
                </button>
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 1fr 50px 50px 50px 60px auto',
                  gap: 5,
                  marginBottom: 6,
                }}
              >
                <div className="fl">Food</div>
                <div className="fl">Amount</div>
                <div className="fl">P(g)</div>
                <div className="fl">C(g)</div>
                <div className="fl">F(g)</div>
                <div className="fl">Cal</div>
                <div></div>
              </div>
              {meal.items.map((item, ii) => (
                <div
                  key={ii}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 1fr 50px 50px 50px 60px auto',
                    gap: 5,
                    marginBottom: 6,
                    alignItems: 'center',
                  }}
                >
                  <input
                    className="fi"
                    value={item.food}
                    onChange={(e) => updateItem(mi, ii, 'food', e.target.value)}
                    placeholder="Food name"
                  />
                  <input
                    className="fi"
                    value={item.amount}
                    onChange={(e) =>
                      updateItem(mi, ii, 'amount', e.target.value)
                    }
                    placeholder="100g"
                  />
                  <input
                    className="fi"
                    type="number"
                    value={item.protein}
                    onChange={(e) =>
                      updateItem(mi, ii, 'protein', e.target.value)
                    }
                  />
                  <input
                    className="fi"
                    type="number"
                    value={item.carbs}
                    onChange={(e) =>
                      updateItem(mi, ii, 'carbs', e.target.value)
                    }
                  />
                  <input
                    className="fi"
                    type="number"
                    value={item.fats}
                    onChange={(e) => updateItem(mi, ii, 'fats', e.target.value)}
                  />
                  <input
                    className="fi"
                    type="number"
                    value={item.cal}
                    onChange={(e) => updateItem(mi, ii, 'cal', e.target.value)}
                  />
                  <button
                    className="btn btn-d btn-xs"
                    onClick={() => removeItem(mi, ii)}
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button
                className="btn btn-s btn-sm"
                onClick={() => addItem(mi)}
                style={{ marginTop: 4 }}
              >
                + Add Food
              </button>
            </div>
          ))}
          <button
            className="btn btn-s"
            onClick={addMeal}
            style={{ marginBottom: 14 }}
          >
            + Add Meal
          </button>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              className="btn btn-p"
              style={{ flex: 1 }}
              onClick={() => onSave(meals)}
            >
              💾 Save Meal Plan to Client
            </button>
            <button className="btn btn-s" onClick={onClose}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── COACH DASHBOARD ───────────────────────────────────────────────────────
function CoachDash({ coachUid, coachEmail, coachName, tab, setTab, toast }) {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selId, setSelId] = useState(null);
  const [sel, setSel] = useState(null);
  const [innerTab, setInnerTab] = useState('overview');
  const [msgText, setMsgText] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [showWorkoutEditor, setShowWorkoutEditor] = useState(false);
  const [showMealEditor, setShowMealEditor] = useState(false);
  const [addSaving, setAddSaving] = useState(false);
  const [nc, setNc] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    phase: 'Cut Phase 1',
    week: '1',
    calories: '2200',
    protein: '160',
    carbs: '240',
    fats: '70',
  });

  useEffect(() => {
    const q = query(
      collection(db, 'clients'),
      where('coachId', '==', coachUid)
    );
    const unsub = onSnapshot(q, (snap) => {
      setClients(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, [coachUid]);

  useEffect(() => {
    if (!selId) {
      setSel(null);
      return;
    }
    const unsub = onSnapshot(doc(db, 'clients', selId), (snap) => {
      if (snap.exists()) setSel({ id: snap.id, ...snap.data() });
    });
    return unsub;
  }, [selId]);

  const update = async (field, value) => {
    if (!selId) return;
    await updateDoc(doc(db, 'clients', selId), { [field]: value });
  };

  const updateN = async (field, value) => {
    if (!selId) return;
    await updateDoc(doc(db, 'clients', selId), {
      ['nutrition.' + field]: parseInt(value) || 0,
    });
  };

  const sendMessage = async () => {
    if (!msgText.trim() || !selId) return;
    setSendingMsg(true);
    await updateDoc(doc(db, 'clients', selId), {
      coachMessage: msgText.trim(),
    });
    toast('✅ Message sent!', 'success');
    setMsgText('');
    setSendingMsg(false);
  };

  const saveWorkout = async (plan) => {
    await updateDoc(doc(db, 'clients', selId), { workoutPlan: plan });
    toast('💪 Workout plan saved!', 'success');
    setShowWorkoutEditor(false);
  };

  const saveMeals = async (plan) => {
    // Auto-calculate totals
    const calories = plan.reduce(
      (a, m) => a + m.items.reduce((b, i) => b + (i.cal || 0), 0),
      0
    );
    const protein = plan.reduce(
      (a, m) => a + m.items.reduce((b, i) => b + (i.protein || 0), 0),
      0
    );
    const carbs = plan.reduce(
      (a, m) => a + m.items.reduce((b, i) => b + (i.carbs || 0), 0),
      0
    );
    const fats = plan.reduce(
      (a, m) => a + m.items.reduce((b, i) => b + (i.fats || 0), 0),
      0
    );
    await updateDoc(doc(db, 'clients', selId), {
      mealPlan: plan,
      nutrition: { calories, protein, carbs, fats },
    });
    toast('🥩 Meal plan saved!', 'success');
    setShowMealEditor(false);
  };

  const addClient = async () => {
    if (!nc.name || !nc.email || !nc.password) {
      toast('Name, email & password required', 'error');
      return;
    }
    if (nc.password.length < 6) {
      toast('Password needs 6+ characters', 'error');
      return;
    }
    setAddSaving(true);
    try {
      const cred = await createUserWithEmailAndPassword(
        auth,
        nc.email,
        nc.password
      );
      const clientUid = cred.user.uid;
      await setDoc(doc(db, 'clients', clientUid), {
        name: nc.name.trim(),
        email: nc.email.trim().toLowerCase(),
        phone: nc.phone.trim(),
        avatar: nc.name
          .trim()
          .split(' ')
          .map((w) => w[0])
          .join('')
          .slice(0, 2)
          .toUpperCase(),
        phase: nc.phase,
        week: parseInt(nc.week) || 1,
        weight: null,
        waist: null,
        bodyFat: null,
        nutrition: {
          calories: parseInt(nc.calories) || 2000,
          protein: parseInt(nc.protein) || 150,
          carbs: parseInt(nc.carbs) || 200,
          fats: parseInt(nc.fats) || 60,
        },
        weightHistory: [],
        coachMessage: '',
        mealPlan: DEFAULT_MEALS,
        workoutPlan: DEFAULT_WORKOUT,
        coachId: coachUid,
        coachEmail,
        role: 'client',
        createdAt: serverTimestamp(),
      });
      await signInWithEmailAndPassword(auth, coachEmail, window._cp);
      setShowAdd(false);
      setNc({
        name: '',
        email: '',
        password: '',
        phone: '',
        phase: 'Cut Phase 1',
        week: '1',
        calories: '2200',
        protein: '160',
        carbs: '240',
        fats: '70',
      });
      toast('✅ ' + nc.name + ' added!', 'success');
    } catch (err) {
      toast(
        err.code === 'auth/email-already-in-use'
          ? 'Email already used!'
          : err.message,
        'error'
      );
    }
    setAddSaving(false);
  };

  if (loading)
    return (
      <div className="spin-wrap">
        <div className="spinner" />
        <span>Loading...</span>
      </div>
    );

  // ── ANALYTICS ──
  if (tab === 'analytics')
    return (
      <div className="page">
        <div
          style={{
            fontFamily: "'Outfit',sans-serif",
            fontSize: 22,
            fontWeight: 800,
            marginBottom: 22,
          }}
        >
          📊 Analytics
        </div>
        {clients.length === 0 ? (
          <div className="card">
            <div className="empty">
              <div className="empty-icon">📊</div>
              <div className="empty-title">No clients yet</div>
            </div>
          </div>
        ) : (
          <div className="g2">
            {clients.map((c) => (
              <div key={c.id} className="card">
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    marginBottom: 14,
                  }}
                >
                  <div className="av av-sm av-g">{c.avatar}</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>
                      {c.name}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                      {c.phase} · W{c.week}
                    </div>
                  </div>
                  <span className="bdg bdg-g" style={{ marginLeft: 'auto' }}>
                    {c.weight ? c.weight + 'kg' : '—'}
                  </span>
                </div>
                {(c.weightHistory || []).length > 1 ? (
                  <div style={{ height: 140 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={c.weightHistory}>
                        <defs>
                          <linearGradient
                            id={'g' + c.id}
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor="#22c55e"
                              stopOpacity={0.2}
                            />
                            <stop
                              offset="95%"
                              stopColor="#22c55e"
                              stopOpacity={0}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e2d45" />
                        <XAxis
                          dataKey="week"
                          tick={{ fontSize: 10, fill: '#64748b' }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          domain={['auto', 'auto']}
                          tick={{ fontSize: 10, fill: '#64748b' }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip
                          contentStyle={{
                            background: '#0f1629',
                            border: '1px solid #1e2d45',
                            borderRadius: 8,
                            fontSize: 11,
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="weight"
                          stroke="#22c55e"
                          strokeWidth={2}
                          fill={'url(#g' + c.id + ')'}
                          dot={{ fill: '#22c55e', r: 2.5, strokeWidth: 0 }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div
                    style={{
                      height: 80,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--muted)',
                      fontSize: 12,
                    }}
                  >
                    Awaiting check-ins
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );

  // ── CLIENT DETAIL ──
  if (tab === 'clients' && sel) {
    const n = sel.nutrition || {};
    return (
      <div className="page">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginBottom: 20,
          }}
        >
          <button
            className="btn btn-s btn-sm"
            onClick={() => {
              setSelId(null);
              setSel(null);
            }}
          >
            ← Back
          </button>
          <div className="av av-md av-g">{sel.avatar}</div>
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontFamily: "'Outfit',sans-serif",
                fontWeight: 800,
                fontSize: 19,
              }}
            >
              {sel.name}
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>
              {sel.email} {sel.phone ? '· ' + sel.phone : ''}
            </div>
          </div>
          <span className="live">
            <span className="dot" />
            Live
          </span>
        </div>

        <div className="tab-bar">
          {[
            ['overview', '📊 Overview'],
            ['message', '📨 Message'],
            ['nutrition', '🥩 Macros'],
            ['meals', '🍽️ Meal Plan'],
            ['workout', '💪 Workout'],
            ['phase', '📋 Phase'],
          ].map(([k, l]) => (
            <button
              key={k}
              className={innerTab === k ? 'tab-item active' : 'tab-item'}
              onClick={() => setInnerTab(k)}
            >
              {l}
            </button>
          ))}
        </div>

        {/* OVERVIEW */}
        {innerTab === 'overview' && (
          <div>
            <div className="g4" style={{ marginBottom: 16 }}>
              <MC label="Weight KG" value={sel.weight} color="var(--green)" />
              <MC label="Waist CM" value={sel.waist} color="var(--purple)" />
              <MC
                label="Body Fat %"
                value={sel.bodyFat}
                color="var(--orange)"
                suffix="%"
              />
              <MC label="Week" value={'W' + sel.week} color="var(--blue)" />
            </div>
            <div className="card" style={{ marginBottom: 14 }}>
              <div className="card-title">💬 Current Message</div>
              <div className={'msg-b' + (sel.coachMessage ? ' has' : '')}>
                {sel.coachMessage || 'No message sent yet.'}
              </div>
            </div>
            {(sel.weightHistory || []).length > 1 && (
              <div className="card">
                <div className="card-title">📈 Weight Progress</div>
                <div style={{ height: 170 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={sel.weightHistory}>
                      <defs>
                        <linearGradient id="wg2" x1="0" y1="0" x2="0" y2="1">
                          <stop
                            offset="5%"
                            stopColor="#22c55e"
                            stopOpacity={0.2}
                          />
                          <stop
                            offset="95%"
                            stopColor="#22c55e"
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e2d45" />
                      <XAxis
                        dataKey="week"
                        tick={{ fontSize: 11, fill: '#64748b' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        domain={['auto', 'auto']}
                        tick={{ fontSize: 11, fill: '#64748b' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          background: '#0f1629',
                          border: '1px solid #1e2d45',
                          borderRadius: 9,
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="weight"
                        stroke="#22c55e"
                        strokeWidth={2.5}
                        fill="url(#wg2)"
                        dot={{ fill: '#22c55e', r: 3, strokeWidth: 0 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        )}

        {/* MESSAGE */}
        {innerTab === 'message' && (
          <div className="card">
            <div className="card-title">📨 Send Message to {sel.name}</div>
            <div className="alert alert-g">
              <strong>Current:</strong> {sel.coachMessage || 'None'}
            </div>
            <div className="fld">
              <div className="fl">New Message</div>
              <textarea
                className="fta"
                placeholder={
                  'Great work ' + sel.name + "! Here's your update..."
                }
                value={msgText}
                onChange={(e) => setMsgText(e.target.value)}
              />
            </div>
            <div className="alert alert-w">
              ⚡ Client sees this instantly on their screen!
            </div>
            <button
              className="btn btn-p"
              onClick={sendMessage}
              disabled={sendingMsg || !msgText.trim()}
            >
              {sendingMsg ? 'Sending...' : '📤 Send to ' + sel.name}
            </button>
          </div>
        )}

        {/* MACROS */}
        {innerTab === 'nutrition' && (
          <div className="card">
            <div className="card-title">
              🥩 Daily Macro Targets for {sel.name}
            </div>
            <div className="alert alert-w">
              ⚡ Each change syncs to {sel.name} instantly!
            </div>
            <div className="fg">
              {[
                ['Calories (kcal)', 'calories', 'var(--green)'],
                ['Protein (g)', 'protein', 'var(--purple)'],
                ['Carbs (g)', 'carbs', 'var(--orange)'],
                ['Fats (g)', 'fats', 'var(--red)'],
              ].map(([l, k, co]) => (
                <div key={k} className="fld">
                  <div className="fl" style={{ color: co }}>
                    {l}
                  </div>
                  <input
                    className="fi"
                    type="number"
                    defaultValue={n[k]}
                    key={selId + k + n[k]}
                    onBlur={(e) => updateN(k, e.target.value)}
                  />
                </div>
              ))}
            </div>
            <div className="alert alert-g">
              <strong>Current:</strong> {n.calories} kcal · {n.protein}g P ·{' '}
              {n.carbs}g C · {n.fats}g F
            </div>
          </div>
        )}

        {/* MEAL PLAN */}
        {innerTab === 'meals' && (
          <div className="card">
            <div
              className="card-title"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              🍽️ Meal Plan for {sel.name}
              <button
                className="btn btn-p btn-sm"
                onClick={() => setShowMealEditor(true)}
              >
                ✏️ Edit Meals
              </button>
            </div>
            <div className="alert alert-w">
              ⚡ Click "Edit Meals" to fully customize every meal and food item!
            </div>
            {(sel.mealPlan || DEFAULT_MEALS).map((meal, mi) => (
              <div key={mi} className="meal-card">
                <div className="meal-head">
                  <div>
                    <span style={{ fontWeight: 700 }}>{meal.name}</span>
                    <span
                      style={{
                        fontSize: 12,
                        color: 'var(--muted)',
                        marginLeft: 8,
                      }}
                    >
                      {meal.time}
                    </span>
                  </div>
                  <span className="bdg bdg-g">
                    {meal.items.reduce((a, i) => a + (i.cal || 0), 0)} kcal
                  </span>
                </div>
                <div className="meal-body">
                  {meal.items.map((item, ii) => (
                    <div key={ii} className="food-row">
                      <div>
                        <span style={{ fontWeight: 600 }}>{item.food}</span>
                        <span
                          style={{
                            color: 'var(--muted)',
                            fontSize: 12,
                            marginLeft: 6,
                          }}
                        >
                          {item.amount}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: 8, fontSize: 12 }}>
                        <span style={{ color: 'var(--purple)' }}>
                          {item.protein}g P
                        </span>
                        <span style={{ color: 'var(--orange)' }}>
                          {item.carbs}g C
                        </span>
                        <span style={{ color: 'var(--red)' }}>
                          {item.fats}g F
                        </span>
                        <span
                          style={{ color: 'var(--green)', fontWeight: 600 }}
                        >
                          {item.cal} cal
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* WORKOUT PLAN */}
        {innerTab === 'workout' && (
          <div className="card">
            <div
              className="card-title"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              💪 Workout Plan for {sel.name}
              <button
                className="btn btn-p btn-sm"
                onClick={() => setShowWorkoutEditor(true)}
              >
                ✏️ Edit Workouts
              </button>
            </div>
            <div className="alert alert-w">
              ⚡ Click "Edit Workouts" to add/remove exercises, change
              sets/reps!
            </div>
            {(sel.workoutPlan || DEFAULT_WORKOUT).map((day, di) => (
              <div
                key={di}
                style={{
                  background: 'var(--s2)',
                  border: '1px solid var(--border)',
                  borderRadius: 10,
                  padding: 12,
                  marginBottom: 10,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: day.type !== 'Rest' ? 10 : 0,
                  }}
                >
                  <div>
                    <span style={{ fontWeight: 700 }}>{day.day}</span>
                    <span className="bdg bdg-p" style={{ marginLeft: 8 }}>
                      {day.type}
                    </span>
                  </div>
                  {day.type !== 'Rest' && (
                    <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                      {day.exercises.length} exercises
                    </span>
                  )}
                </div>
                {day.type !== 'Rest' &&
                  day.exercises.map((ex, ei) => (
                    <div
                      key={ei}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '5px 0',
                        borderBottom: '1px solid var(--border)',
                        fontSize: 13,
                      }}
                    >
                      <span>{ex.name}</span>
                      <span style={{ color: 'var(--muted)' }}>
                        {ex.sets}×{ex.reps} · {ex.rest}
                      </span>
                    </div>
                  ))}
              </div>
            ))}
          </div>
        )}

        {/* PHASE */}
        {innerTab === 'phase' && (
          <div className="card">
            <div className="card-title">📋 Phase & Stats for {sel.name}</div>
            <div className="alert alert-w">
              ⚡ All changes sync to client instantly.
            </div>
            <div className="fg">
              <div className="fld">
                <div className="fl">Phase</div>
                <select
                  className="fsel"
                  value={sel.phase}
                  onChange={(e) => {
                    update('phase', e.target.value);
                    toast('Phase updated!', 'success');
                  }}
                >
                  <option>Cut Phase 1</option>
                  <option>Cut Phase 2</option>
                  <option>Bulk Phase 1</option>
                  <option>Bulk Phase 2</option>
                  <option>Maintenance</option>
                  <option>Peak Week</option>
                  <option>Reverse Diet</option>
                </select>
              </div>
              <div className="fld">
                <div className="fl">Current Week</div>
                <input
                  className="fi"
                  type="number"
                  min="1"
                  max="52"
                  value={sel.week}
                  onChange={(e) =>
                    update('week', parseInt(e.target.value) || 1)
                  }
                />
              </div>
              <div className="fld">
                <div className="fl">Body Fat %</div>
                <input
                  className="fi"
                  type="number"
                  step="0.1"
                  defaultValue={sel.bodyFat || ''}
                  placeholder="18.5"
                  onBlur={(e) =>
                    update('bodyFat', parseFloat(e.target.value) || null)
                  }
                />
              </div>
              <div className="fld">
                <div className="fl">Starting Weight (kg)</div>
                <input
                  className="fi"
                  type="number"
                  step="0.1"
                  defaultValue={sel.weight || ''}
                  placeholder="86"
                  onBlur={(e) =>
                    update('weight', parseFloat(e.target.value) || null)
                  }
                />
              </div>
            </div>
          </div>
        )}

        {showWorkoutEditor && (
          <WorkoutEditor
            plan={sel.workoutPlan || DEFAULT_WORKOUT}
            onSave={saveWorkout}
            onClose={() => setShowWorkoutEditor(false)}
          />
        )}
        {showMealEditor && (
          <MealEditor
            plan={sel.mealPlan || DEFAULT_MEALS}
            onSave={saveMeals}
            onClose={() => setShowMealEditor(false)}
          />
        )}
      </div>
    );
  }

  // ── CLIENTS LIST ──
  if (tab === 'clients')
    return (
      <div className="page">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 20,
          }}
        >
          <div>
            <div
              style={{
                fontFamily: "'Outfit',sans-serif",
                fontSize: 22,
                fontWeight: 800,
              }}
            >
              👥 My Clients
            </div>
            <div style={{ color: 'var(--muted)', fontSize: 13, marginTop: 3 }}>
              {clients.length} active
            </div>
          </div>
          <button className="btn btn-p" onClick={() => setShowAdd(true)}>
            + Add Client
          </button>
        </div>

        {clients.length === 0 ? (
          <div className="card">
            <div className="empty">
              <div className="empty-icon">👤</div>
              <div className="empty-title">No clients yet</div>
              <div className="empty-desc">
                Add your first client to get started.
              </div>
              <button className="btn btn-p" onClick={() => setShowAdd(true)}>
                + Add Client
              </button>
            </div>
          </div>
        ) : (
          <div className="card">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Phase</th>
                  <th>Weight</th>
                  <th>Calories</th>
                  <th>Message</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 9,
                        }}
                      >
                        <div className="av av-sm av-g">{c.avatar}</div>
                        <div>
                          <div style={{ fontWeight: 600 }}>{c.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                            {c.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="bdg bdg-g">{c.phase}</span>
                    </td>
                    <td style={{ fontWeight: 600 }}>
                      {c.weight ? (
                        c.weight + 'kg'
                      ) : (
                        <span style={{ color: 'var(--muted)' }}>—</span>
                      )}
                    </td>
                    <td style={{ color: 'var(--muted)', fontSize: 12 }}>
                      {c.nutrition?.calories || '—'} kcal
                    </td>
                    <td>
                      {c.coachMessage ? (
                        <span
                          style={{
                            color: 'var(--green)',
                            fontSize: 12,
                            fontWeight: 600,
                          }}
                        >
                          ✓ Sent
                        </span>
                      ) : (
                        <span
                          style={{
                            color: 'var(--yellow)',
                            fontSize: 12,
                            fontWeight: 600,
                          }}
                        >
                          ⚠ Pending
                        </span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 5 }}>
                        <button
                          className="btn btn-s btn-sm"
                          onClick={() => {
                            setSelId(c.id);
                            setInnerTab('overview');
                          }}
                        >
                          View
                        </button>
                        <button
                          className="btn btn-s btn-sm"
                          onClick={() => {
                            setSelId(c.id);
                            setInnerTab('meals');
                          }}
                        >
                          🍽️
                        </button>
                        <button
                          className="btn btn-s btn-sm"
                          onClick={() => {
                            setSelId(c.id);
                            setInnerTab('workout');
                          }}
                        >
                          💪
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {showAdd && (
          <div
            className="ov"
            onClick={(e) => e.target === e.currentTarget && setShowAdd(false)}
          >
            <div className="modal">
              <div className="mh">
                <div>
                  <div className="mt">➕ Add New Client</div>
                  <div className="ms">
                    Creates login — share credentials via WhatsApp
                  </div>
                </div>
                <button className="xbtn" onClick={() => setShowAdd(false)}>
                  ✕
                </button>
              </div>
              <div className="mb2">
                <div className="sec-lbl">Client Info</div>
                <div className="fg">
                  <div className="fld">
                    <div className="fl">Full Name *</div>
                    <input
                      className="fi"
                      placeholder="Rahul Kumar"
                      value={nc.name}
                      onChange={(e) =>
                        setNc((p) => ({ ...p, name: e.target.value }))
                      }
                    />
                  </div>
                  <div className="fld">
                    <div className="fl">Phone</div>
                    <input
                      className="fi"
                      placeholder="+91 98765 43210"
                      value={nc.phone}
                      onChange={(e) =>
                        setNc((p) => ({ ...p, phone: e.target.value }))
                      }
                    />
                  </div>
                </div>
                <div className="sec-lbl" style={{ marginTop: 4 }}>
                  Login Credentials
                </div>
                <div className="fg">
                  <div className="fld">
                    <div className="fl">Email *</div>
                    <input
                      className="fi"
                      type="email"
                      placeholder="rahul@gmail.com"
                      value={nc.email}
                      onChange={(e) =>
                        setNc((p) => ({ ...p, email: e.target.value }))
                      }
                    />
                  </div>
                  <div className="fld">
                    <div className="fl">Password *</div>
                    <input
                      className="fi"
                      type="text"
                      placeholder="min 6 chars"
                      value={nc.password}
                      onChange={(e) =>
                        setNc((p) => ({ ...p, password: e.target.value }))
                      }
                    />
                  </div>
                </div>
                <div className="alert alert-b">
                  📲 Share the app URL + email + password with your client via
                  WhatsApp!
                </div>
                <div className="sec-lbl">Program</div>
                <div className="fg">
                  <div className="fld">
                    <div className="fl">Phase</div>
                    <select
                      className="fsel"
                      value={nc.phase}
                      onChange={(e) =>
                        setNc((p) => ({ ...p, phase: e.target.value }))
                      }
                    >
                      <option>Cut Phase 1</option>
                      <option>Cut Phase 2</option>
                      <option>Bulk Phase 1</option>
                      <option>Bulk Phase 2</option>
                      <option>Maintenance</option>
                      <option>Peak Week</option>
                    </select>
                  </div>
                  <div className="fld">
                    <div className="fl">Starting Week</div>
                    <input
                      className="fi"
                      type="number"
                      min="1"
                      value={nc.week}
                      onChange={(e) =>
                        setNc((p) => ({ ...p, week: e.target.value }))
                      }
                    />
                  </div>
                </div>
                <div className="sec-lbl" style={{ marginTop: 4 }}>
                  Starting Macros
                </div>
                <div className="fg">
                  {[
                    ['Calories', 'calories'],
                    ['Protein (g)', 'protein'],
                    ['Carbs (g)', 'carbs'],
                    ['Fats (g)', 'fats'],
                  ].map(([l, k]) => (
                    <div key={k} className="fld">
                      <div className="fl">{l}</div>
                      <input
                        className="fi"
                        type="number"
                        value={nc[k]}
                        onChange={(e) =>
                          setNc((p) => ({ ...p, [k]: e.target.value }))
                        }
                      />
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    className="btn btn-p"
                    style={{ flex: 1 }}
                    onClick={addClient}
                    disabled={addSaving}
                  >
                    {addSaving ? 'Creating...' : '✅ Create Client Account'}
                  </button>
                  <button
                    className="btn btn-s"
                    onClick={() => setShowAdd(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );

  // ── COACH HOME ──
  return (
    <div className="page">
      <div style={{ marginBottom: 24 }}>
        <div
          style={{
            fontFamily: "'Outfit',sans-serif",
            fontSize: 26,
            fontWeight: 800,
          }}
        >
          Welcome, {coachName?.split(' ')[0] || 'Coach'} 👋
        </div>
        <div style={{ color: 'var(--muted)', fontSize: 13, marginTop: 5 }}>
          {clients.length} client{clients.length !== 1 ? 's' : ''} · CoachOS
        </div>
      </div>
      <div className="g4" style={{ marginBottom: 24 }}>
        {[
          ['Total Clients', clients.length, 'var(--green)'],
          ['Checked In', clients.filter((c) => c.weight).length, 'var(--blue)'],
          [
            'Messages Sent',
            clients.filter((c) => c.coachMessage).length,
            'var(--purple)',
          ],
          [
            'Need Attention',
            clients.filter((c) => !c.coachMessage).length,
            'var(--orange)',
          ],
        ].map(([l, v, co]) => (
          <div key={l} className="mc">
            <div className="mc-val" style={{ color: co }}>
              {v}
            </div>
            <div className="mc-label">{l}</div>
          </div>
        ))}
      </div>
      {clients.length === 0 ? (
        <div className="card">
          <div className="empty">
            <div className="empty-icon">🚀</div>
            <div className="empty-title">You're all set!</div>
            <div className="empty-desc">
              Add your first client to get started. You can fully customize
              their workout and meal plans.
            </div>
            <button
              className="btn btn-p"
              style={{ fontSize: 14, padding: '11px 24px' }}
              onClick={() => setTab('clients')}
            >
              + Add First Client
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="sh">
            <div className="sh-title">👥 Clients</div>
            <button className="sh-link" onClick={() => setTab('clients')}>
              Manage all →
            </button>
          </div>
          <div className="ga">
            {clients.map((c) => (
              <div
                key={c.id}
                className="cl-card"
                onClick={() => {
                  setTab('clients');
                  setSelId(c.id);
                  setInnerTab('overview');
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 9,
                    marginBottom: 12,
                  }}
                >
                  <div className="av av-md av-g">{c.avatar}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>
                      {c.name}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: 'var(--muted)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {c.email}
                    </div>
                  </div>
                  <span className="bdg bdg-g">W{c.week}</span>
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 8,
                    marginBottom: 10,
                  }}
                >
                  {[
                    [
                      'Weight',
                      c.weight ? c.weight + 'kg' : '—',
                      'var(--green)',
                    ],
                    [
                      'Phase',
                      (c.phase || '').split(' ').slice(0, 2).join(' '),
                      'var(--purple)',
                    ],
                  ].map(([l, v, co]) => (
                    <div
                      key={l}
                      style={{
                        padding: '8px 10px',
                        background: 'var(--s2)',
                        borderRadius: 9,
                        border: '1px solid var(--border)',
                      }}
                    >
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: co,
                          fontFamily: "'Outfit',sans-serif",
                        }}
                      >
                        {v}
                      </div>
                      <div
                        style={{
                          fontSize: 10,
                          color: 'var(--muted)',
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          marginTop: 2,
                        }}
                      >
                        {l}
                      </div>
                    </div>
                  ))}
                </div>
                <div
                  style={{
                    padding: '7px 10px',
                    background: c.coachMessage
                      ? 'var(--green-bg)'
                      : 'rgba(251,191,36,.08)',
                    borderRadius: 8,
                    fontSize: 11,
                    color: c.coachMessage ? 'var(--green)' : 'var(--yellow)',
                    fontWeight: 600,
                    border:
                      '1px solid ' +
                      (c.coachMessage
                        ? 'var(--green-b)'
                        : 'rgba(251,191,36,.2)'),
                  }}
                >
                  {c.coachMessage ? '✓ Message sent' : '⚠ No message yet'}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── AUTH SCREENS ──────────────────────────────────────────────────────────
function LoginScreen({ onLogin, onSetup }) {
  const [em, setEm] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [ld, setLd] = useState(false);
  const login = async () => {
    setErr('');
    setLd(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, em.trim(), pw);
      const uid = cred.user.uid;
      const uSnap = await getDoc(doc(db, 'users', uid));
      if (uSnap.exists()) {
        window._cp = pw;
        onLogin({ uid, email: em.trim(), ...uSnap.data() });
        return;
      }
      const cSnap = await getDoc(doc(db, 'clients', uid));
      if (cSnap.exists()) {
        onLogin({ uid, email: em.trim(), role: 'client', ...cSnap.data() });
        return;
      }
      setErr('Account not found. Contact your coach.');
    } catch (e) {
      setErr(
        e.code === 'auth/invalid-credential' || e.code === 'auth/wrong-password'
          ? 'Incorrect email or password.'
          : e.message
      );
    }
    setLd(false);
  };
  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-logo">CO</div>
        <div className="auth-title">CoachOS</div>
        <div className="auth-sub">Sign in to your coaching platform</div>
        <div className="fld">
          <div className="fl">Email</div>
          <input
            className="fi"
            type="email"
            placeholder="your@email.com"
            value={em}
            onChange={(e) => setEm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && login()}
          />
        </div>
        <div className="fld">
          <div className="fl">Password</div>
          <input
            className="fi"
            type="password"
            placeholder="••••••••"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && login()}
          />
        </div>
        {err && <div className="alert alert-e">{err}</div>}
        <button className="auth-btn" onClick={login} disabled={ld}>
          {ld ? 'Signing in...' : 'Sign In →'}
        </button>
        <div className="auth-switch">
          First time coach?{' '}
          <button onClick={onSetup}>Create coach account</button>
        </div>
      </div>
    </div>
  );
}

function SetupScreen({ onDone }) {
  const [f, setF] = useState({ name: '', email: '', pass: '' });
  const [err, setErr] = useState('');
  const [ld, setLd] = useState(false);
  const create = async () => {
    if (!f.name || !f.email || !f.pass) {
      setErr('All fields required');
      return;
    }
    if (f.pass.length < 6) {
      setErr('Password needs 6+ characters');
      return;
    }
    setErr('');
    setLd(true);
    try {
      const cred = await createUserWithEmailAndPassword(
        auth,
        f.email.trim(),
        f.pass
      );
      await setDoc(doc(db, 'users', cred.user.uid), {
        name: f.name.trim(),
        email: f.email.trim().toLowerCase(),
        role: 'coach',
        createdAt: serverTimestamp(),
      });
      window._cp = f.pass;
      onDone({
        uid: cred.user.uid,
        email: f.email.trim(),
        role: 'coach',
        name: f.name.trim(),
      });
    } catch (e) {
      setErr(
        e.code === 'auth/email-already-in-use'
          ? 'Email already registered. Log in instead.'
          : e.message
      );
    }
    setLd(false);
  };
  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-logo">CO</div>
        <div className="auth-title">Setup CoachOS</div>
        <div className="auth-sub">
          Create your coach account — one time only
        </div>
        <div className="fld">
          <div className="fl">Your Full Name</div>
          <input
            className="fi"
            placeholder="Coach Ankit Ingle"
            value={f.name}
            onChange={(e) => setF((p) => ({ ...p, name: e.target.value }))}
          />
        </div>
        <div className="fld">
          <div className="fl">Your Email</div>
          <input
            className="fi"
            type="email"
            placeholder="coach@email.com"
            value={f.email}
            onChange={(e) => setF((p) => ({ ...p, email: e.target.value }))}
          />
        </div>
        <div className="fld">
          <div className="fl">Password</div>
          <input
            className="fi"
            type="password"
            placeholder="min 6 characters"
            value={f.pass}
            onChange={(e) => setF((p) => ({ ...p, pass: e.target.value }))}
            onKeyDown={(e) => e.key === 'Enter' && create()}
          />
        </div>
        {err && <div className="alert alert-e">{err}</div>}
        <button className="auth-btn" onClick={create} disabled={ld}>
          {ld ? 'Creating...' : 'Create Coach Account →'}
        </button>
        <div className="auth-switch">
          Already have account?{' '}
          <button onClick={() => window.location.reload()}>Sign in</button>
        </div>
      </div>
    </div>
  );
}

// ─── ROOT APP ──────────────────────────────────────────────────────────────
export default function App() {
  const { t, show } = useToast();
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [screen, setScreen] = useState('login');
  const [tab, setTab] = useState('home');

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fu) => {
      if (fu) {
        const uSnap = await getDoc(doc(db, 'users', fu.uid));
        if (uSnap.exists()) {
          setUser({ uid: fu.uid, email: fu.email, ...uSnap.data() });
          setAuthLoading(false);
          return;
        }
        const cSnap = await getDoc(doc(db, 'clients', fu.uid));
        if (cSnap.exists()) {
          setUser({
            uid: fu.uid,
            email: fu.email,
            role: 'client',
            ...cSnap.data(),
          });
          setAuthLoading(false);
          return;
        }
        await signOut(auth);
        setUser(null);
      } else {
        setUser(null);
      }
      setAuthLoading(false);
    });
    return unsub;
  }, []);

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setTab('home');
  };

  if (authLoading)
    return (
      <div style={{ background: 'var(--bg)' }}>
        <style>{CSS}</style>
        <div className="spin-wrap" style={{ minHeight: '100vh' }}>
          <div className="spinner" />
          <span>Loading CoachOS...</span>
        </div>
      </div>
    );

  if (!user)
    return (
      <div>
        <style>{CSS}</style>
        {screen === 'setup' ? (
          <SetupScreen
            onDone={(u) => {
              setUser(u);
              setScreen('login');
            }}
          />
        ) : (
          <LoginScreen onLogin={setUser} onSetup={() => setScreen('setup')} />
        )}
        {t && (
          <div
            className={t.type === 'error' ? 'toast toast-e' : 'toast toast-s'}
          >
            {t.msg}
          </div>
        )}
      </div>
    );

  const isCoach = user.role === 'coach';
  const tabs = isCoach
    ? [
        ['home', '🏠 Dashboard'],
        ['clients', '👥 Clients'],
        ['analytics', '📊 Analytics'],
      ]
    : [
        ['home', '🏠 Home'],
        ['nutrition', '🥩 Nutrition'],
        ['training', '🏋️ Training'],
        ['photos', '📸 Photos'],
      ];

  return (
    <div style={{ minHeight: '100vh' }}>
      <style>{CSS}</style>
      <nav className="nav">
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <button className="nav-logo" onClick={() => setTab('home')}>
            <div className="nav-icon">CO</div>
            <span className="nav-brand">CoachOS</span>
          </button>
          <div className="nav-tabs">
            {tabs.map(([k, l]) => (
              <button
                key={k}
                className={tab === k ? 'nav-tab active' : 'nav-tab'}
                onClick={() => setTab(k)}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
        <div className="nav-right">
          <div className="nav-av">
            {(user.name || user.email || 'U').slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600 }}>
              {user.name || user.email}
            </div>
            <div
              style={{
                fontSize: 10,
                color: isCoach ? 'var(--green)' : 'var(--purple)',
                fontWeight: 600,
                textTransform: 'capitalize',
              }}
            >
              {user.role}
            </div>
          </div>
          <button className="signout" onClick={logout}>
            Sign out
          </button>
        </div>
      </nav>
      <div style={{ flex: 1 }}>
        {isCoach ? (
          <CoachDash
            coachUid={user.uid}
            coachEmail={user.email}
            coachName={user.name}
            tab={tab}
            setTab={setTab}
            toast={show}
          />
        ) : (
          <ClientDash uid={user.uid} tab={tab} setTab={setTab} toast={show} />
        )}
      </div>
      {t && (
        <div className={t.type === 'error' ? 'toast toast-e' : 'toast toast-s'}>
          {t.msg}
        </div>
      )}
    </div>
  );
}
