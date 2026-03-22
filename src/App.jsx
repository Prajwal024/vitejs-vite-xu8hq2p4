import { useState, useEffect, useRef } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { auth, db } from "./firebase";
import {
  signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signOut, onAuthStateChanged, sendPasswordResetEmail,
} from "firebase/auth";
import {
  doc, getDoc, setDoc, updateDoc, onSnapshot,
  collection, query, where, serverTimestamp,
} from "firebase/firestore";

const DEFAULT_WORKOUT = [
  { day: "Monday", type: "Push", exercises: [{ name: "Bench Press", sets: 4, reps: "8-10", rest: "90s", videoUrl: "" }, { name: "Overhead Press", sets: 3, reps: "10-12", rest: "75s", videoUrl: "" }, { name: "Tricep Pushdowns", sets: 3, reps: "12-15", rest: "60s", videoUrl: "" }] },
  { day: "Tuesday", type: "Pull", exercises: [{ name: "Pull-ups", sets: 4, reps: "8-10", rest: "90s", videoUrl: "" }, { name: "Barbell Row", sets: 4, reps: "8-10", rest: "90s", videoUrl: "" }, { name: "Hammer Curls", sets: 3, reps: "12-15", rest: "60s", videoUrl: "" }] },
  { day: "Wednesday", type: "Rest", exercises: [] },
  { day: "Thursday", type: "Legs", exercises: [{ name: "Back Squat", sets: 4, reps: "6-8", rest: "120s", videoUrl: "" }, { name: "Romanian DL", sets: 4, reps: "8-10", rest: "90s", videoUrl: "" }, { name: "Leg Curl", sets: 3, reps: "12-15", rest: "60s", videoUrl: "" }] },
  { day: "Friday", type: "Push", exercises: [{ name: "Incline DB Press", sets: 4, reps: "10-12", rest: "90s", videoUrl: "" }, { name: "Lateral Raises", sets: 4, reps: "15-20", rest: "45s", videoUrl: "" }] },
  { day: "Saturday", type: "Pull", exercises: [{ name: "Deadlift", sets: 4, reps: "4-6", rest: "120s", videoUrl: "" }, { name: "Cable Row", sets: 3, reps: "10-12", rest: "75s", videoUrl: "" }] },
  { day: "Sunday", type: "Rest", exercises: [] },
];

const DEFAULT_MEALS = [
  { name: "Breakfast", time: "7:00 AM", items: [{ food: "Oats", amount: "80g", protein: 10, carbs: 54, fats: 5, fiber: 8, cal: 300 }, { food: "Banana", amount: "1 medium", protein: 1, carbs: 27, fats: 0, fiber: 3, cal: 105 }, { food: "Whey Protein", amount: "1 scoop", protein: 25, carbs: 3, fats: 2, fiber: 0, cal: 130 }] },
  { name: "Lunch", time: "1:00 PM", items: [{ food: "Chicken Breast", amount: "200g", protein: 46, carbs: 0, fats: 4, fiber: 0, cal: 220 }, { food: "Brown Rice", amount: "150g", protein: 4, carbs: 47, fats: 1, fiber: 3, cal: 210 }, { food: "Broccoli", amount: "100g", protein: 3, carbs: 7, fats: 0, fiber: 5, cal: 35 }] },
  { name: "Pre-Workout", time: "5:00 PM", items: [{ food: "Banana", amount: "1 large", protein: 1, carbs: 31, fats: 0, fiber: 3, cal: 120 }, { food: "Peanut Butter", amount: "2 tbsp", protein: 8, carbs: 6, fats: 16, fiber: 2, cal: 190 }] },
  { name: "Dinner", time: "8:00 PM", items: [{ food: "Eggs", amount: "4 whole", protein: 24, carbs: 2, fats: 20, fiber: 0, cal: 280 }, { food: "Sweet Potato", amount: "200g", protein: 3, carbs: 40, fats: 0, fiber: 6, cal: 172 }] },
];

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
  --r:12px;--r2:18px;--sh:0 4px 24px rgba(0,0,0,.4);--sh2:0 8px 48px rgba(0,0,0,.6);
}
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
.page{max-width:960px;margin:0 auto;padding:24px 16px 48px}
.card{background:var(--s1);border:1px solid var(--border);border-radius:var(--r);padding:18px;box-shadow:var(--sh)}
.card-title{font-family:'Outfit',sans-serif;font-weight:700;font-size:15px;margin-bottom:14px;display:flex;align-items:center;justify-content:space-between}
.g4{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
.g2{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.ga{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:14px}
.fg{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.mc{background:var(--s1);border:1px solid var(--border);border-radius:var(--r);padding:16px}
.mc.flash{animation:flashBorder 2.5s ease forwards}
@keyframes flashBorder{0%,40%{border-color:var(--green);box-shadow:0 0 0 2px rgba(34,197,94,.2)}100%{border-color:var(--border);box-shadow:none}}
.mc-val{font-family:'Outfit',sans-serif;font-size:28px;font-weight:800;line-height:1}
.mc-label{font-size:10px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;margin-top:5px}
.btn{display:inline-flex;align-items:center;gap:6px;padding:9px 16px;border-radius:var(--r);border:none;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:600;transition:all .15s;white-space:nowrap}
.btn-p{background:var(--green);color:#fff}.btn-p:hover{background:#16a34a}
.btn-p:disabled{opacity:.5;cursor:not-allowed}
.btn-s{background:var(--s2);color:var(--text);border:1px solid var(--border2)}.btn-s:hover{background:var(--s3)}
.btn-d{background:rgba(248,113,113,.1);color:var(--red);border:1px solid rgba(248,113,113,.2)}.btn-d:hover{background:rgba(248,113,113,.2)}
.btn-sm{padding:5px 10px;font-size:12px}
.btn-xs{padding:3px 8px;font-size:11px}
.fld{margin-bottom:12px}
.fl{display:block;font-size:11px;font-weight:700;color:var(--muted2);text-transform:uppercase;letter-spacing:.07em;margin-bottom:6px}
.fi{width:100%;padding:10px 14px;background:var(--s2);border:1.5px solid var(--border);border-radius:9px;color:var(--text);font-family:'DM Sans',sans-serif;font-size:14px;outline:none;transition:border .15s}
.fi:focus{border-color:var(--green)}
.fi::placeholder{color:var(--muted)}
.fi-lg{padding:12px 16px;font-size:16px;font-weight:700}
.fsel{width:100%;padding:10px 14px;background:var(--s2);border:1.5px solid var(--border);border-radius:9px;color:var(--text);font-family:'DM Sans',sans-serif;font-size:13px;outline:none}
.fta{width:100%;padding:10px 14px;background:var(--s2);border:1.5px solid var(--border);border-radius:9px;color:var(--text);font-family:'DM Sans',sans-serif;font-size:13px;outline:none;resize:vertical;min-height:90px}
.fta:focus{border-color:var(--green)}
.num-input{display:flex;align-items:center;gap:0;border:1.5px solid var(--border);border-radius:9px;overflow:hidden;background:var(--s2)}
.num-input input{flex:1;padding:10px 8px;background:transparent;border:none;color:var(--text);font-family:'Outfit',sans-serif;font-size:16px;font-weight:700;outline:none;text-align:center;min-width:0}
.num-btn{width:38px;height:42px;background:var(--s3);border:none;cursor:pointer;color:var(--text);font-size:18px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .15s}
.num-btn:hover{background:var(--green);color:#fff}
.tab-bar{display:flex;gap:3px;background:var(--s2);border-radius:10px;padding:3px;margin-bottom:18px;border:1px solid var(--border);flex-wrap:wrap}
.tab-item{flex:1;padding:7px 6px;border-radius:8px;border:none;background:transparent;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:12px;font-weight:600;color:var(--muted);transition:all .15s;min-width:70px;text-align:center}
.tab-item.active{background:var(--s1);color:var(--text);box-shadow:0 1px 6px rgba(0,0,0,.3)}
.sh{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}
.sh-title{font-family:'Outfit',sans-serif;font-weight:700;font-size:16px}
.sh-link{font-size:12px;font-weight:600;color:var(--green);background:none;border:none;cursor:pointer}
.ov{position:fixed;inset:0;background:rgba(0,0,0,.85);backdrop-filter:blur(8px);z-index:200;display:flex;align-items:center;justify-content:center;padding:16px}
.modal{background:var(--s1);border:1px solid var(--border2);border-radius:var(--r2);width:100%;max-width:640px;max-height:92vh;overflow-y:auto;box-shadow:var(--sh2);animation:mIn .2s ease}
.modal-lg{max-width:860px}
@keyframes mIn{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
.mh{padding:18px 22px 14px;border-bottom:1px solid var(--border);position:sticky;top:0;background:var(--s1);border-radius:var(--r2) var(--r2) 0 0;display:flex;align-items:flex-start;justify-content:space-between;z-index:10}
.mt{font-family:'Outfit',sans-serif;font-weight:800;font-size:18px}
.ms{font-size:12px;color:var(--muted);margin-top:2px}
.mb2{padding:18px 22px 22px}
.xbtn{width:28px;height:28px;border-radius:7px;background:var(--s2);border:1px solid var(--border);cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--muted);font-size:14px;flex-shrink:0}
.xbtn:hover{color:var(--red)}
.tbl{width:100%;border-collapse:collapse}
.tbl th{text-align:left;padding:8px 12px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--muted);border-bottom:1px solid var(--border)}
.tbl td{padding:11px 12px;font-size:13px;border-bottom:1px solid var(--border);vertical-align:middle}
.tbl tr:last-child td{border-bottom:none}
.tbl tr:hover td{background:rgba(255,255,255,.02)}
.bdg{display:inline-flex;padding:3px 9px;border-radius:20px;font-size:10px;font-weight:700}
.bdg-g{background:var(--green-bg);color:var(--green);border:1px solid var(--green-b)}
.bdg-p{background:rgba(167,139,250,.1);color:var(--purple);border:1px solid rgba(167,139,250,.25)}
.bdg-o{background:rgba(251,146,60,.1);color:var(--orange);border:1px solid rgba(251,146,60,.25)}
.bdg-r{background:rgba(248,113,113,.1);color:var(--red);border:1px solid rgba(248,113,113,.2)}
.bdg-b{background:rgba(59,130,246,.1);color:var(--blue);border:1px solid rgba(59,130,246,.25)}
.av{border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:'Outfit',sans-serif;font-weight:700;flex-shrink:0}
.av-sm{width:32px;height:32px;font-size:11px}
.av-md{width:38px;height:38px;font-size:13px}
.av-g{background:var(--green-bg);color:var(--green);border:1.5px solid var(--green-b)}
.alert{padding:11px 14px;border-radius:10px;font-size:12px;line-height:1.5;margin-bottom:14px}
.alert-w{background:rgba(251,191,36,.08);border:1px solid rgba(251,191,36,.2);color:#fcd34d}
.alert-g{background:var(--green-bg);border:1px solid var(--green-b);color:#86efac}
.alert-e{background:rgba(248,113,113,.08);border:1px solid rgba(248,113,113,.2);color:var(--red)}
.alert-b{background:rgba(59,130,246,.08);border:1px solid rgba(59,130,246,.2);color:#93c5fd}
.toast{position:fixed;bottom:22px;right:22px;padding:11px 16px;border-radius:10px;font-size:13px;font-weight:500;z-index:9999;box-shadow:var(--sh2);animation:mIn .2s ease;max-width:320px;pointer-events:none}
.toast-s{background:#166534;border:1px solid #22c55e55;color:#bbf7d0}
.toast-e{background:#7f1d1d;border:1px solid #f8717155;color:#fecaca}
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
.forgot-btn{background:none;border:none;cursor:pointer;color:var(--muted);font-size:12px;text-decoration:underline;float:right;margin-top:4px}
.forgot-btn:hover{color:var(--green)}
.live{display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:600;color:var(--green)}
.dot{width:6px;height:6px;border-radius:50%;background:var(--green);flex-shrink:0;animation:pulse 1.4s ease infinite}
@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(.8)}}
.phase{display:inline-flex;align-items:center;gap:5px;padding:4px 11px;border-radius:20px;font-size:12px;font-weight:600;background:var(--green-bg);color:var(--green);border:1px solid var(--green-b)}
.msg-b{background:var(--s2);border:1px solid var(--border);border-radius:12px;padding:13px 15px;font-size:13px;line-height:1.65;color:var(--muted2);white-space:pre-wrap}
.msg-b.has{background:var(--green-bg);border-color:var(--green-b);color:var(--text)}
.nbadge{display:inline-flex;padding:2px 7px;border-radius:20px;font-size:10px;font-weight:700;background:var(--green-bg);color:var(--green);border:1px solid var(--green-b);margin-left:8px}
.spin-wrap{display:flex;align-items:center;justify-content:center;min-height:300px;gap:10px;color:var(--muted);font-size:13px}
.spinner{width:20px;height:20px;border-radius:50%;border:2px solid var(--border);border-top-color:var(--green);animation:sp .7s linear infinite}
@keyframes sp{to{transform:rotate(360deg)}}
.empty{text-align:center;padding:40px 24px;color:var(--muted)}
.empty-icon{font-size:44px;margin-bottom:12px}
.empty-title{font-family:'Outfit',sans-serif;font-weight:700;font-size:17px;color:var(--text);margin-bottom:8px}
.empty-desc{font-size:13px;margin-bottom:20px}
.wk-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:10px}
.wk-card{border-radius:var(--r);padding:14px 8px;text-align:center;background:var(--s1);border:1px solid var(--border);cursor:pointer;transition:all .15s}
.wk-card:hover{transform:translateY(-2px);border-color:var(--border2);box-shadow:var(--sh)}
.wk-card.rest{opacity:.45;cursor:default}.wk-card.rest:hover{transform:none;box-shadow:none}
.meal-card{background:var(--s2);border:1px solid var(--border);border-radius:12px;margin-bottom:14px;overflow:hidden}
.meal-head{padding:12px 16px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--border);background:var(--s3)}
.meal-body{padding:8px 16px 4px}
.meal-total{padding:10px 16px;background:rgba(34,197,94,.06);border-top:1px solid var(--green-b);display:flex;gap:12px;flex-wrap:wrap}
.food-row{display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);font-size:13px}
.food-row:last-child{border-bottom:none}
.ex-row{display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border)}
.ex-row:last-child{border-bottom:none}
.ex-num{width:26px;height:26px;border-radius:6px;background:var(--s2);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:var(--muted);flex-shrink:0}
.cl-card{background:var(--s1);border:1px solid var(--border);border-radius:var(--r);padding:16px;cursor:pointer;transition:all .15s}
.cl-card:hover{border-color:var(--border2);transform:translateY(-1px);box-shadow:var(--sh)}
.sec-lbl{font-family:'Outfit',sans-serif;font-weight:700;font-size:12px;color:var(--muted2);text-transform:uppercase;letter-spacing:.08em;margin-bottom:10px;margin-top:4px}
.photo-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:10px}
.photo-item{border-radius:10px;overflow:hidden;aspect-ratio:3/4;position:relative;cursor:pointer}
.photo-item img,.photo-item video{width:100%;height:100%;object-fit:cover}
.photo-label{position:absolute;bottom:0;left:0;right:0;background:linear-gradient(transparent,rgba(0,0,0,.75));padding:14px 8px 8px;color:#fff;font-size:10px;font-weight:600}
.cmp-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:16px}
.cmp-card{background:var(--s2);border:1px solid var(--border);border-radius:12px;overflow:hidden}
.cmp-head{padding:10px 14px;background:var(--s3);border-bottom:1px solid var(--border);font-weight:700;font-size:13px;text-align:center}
.cmp-body{padding:12px 14px}
.cmp-stat{display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--border);font-size:13px}
.cmp-stat:last-child{border-bottom:none}
.upload-area{border:2px dashed var(--border2);border-radius:12px;padding:24px;text-align:center;cursor:pointer;background:var(--s2);transition:all .15s}
.upload-area:hover{border-color:var(--green);background:var(--green-bg)}
.video-badge{position:absolute;top:6px;right:6px;background:rgba(0,0,0,.7);color:#fff;border-radius:6px;padding:2px 6px;font-size:10px;font-weight:700}
@media(max-width:700px){.g4{grid-template-columns:1fr 1fr}.fg{grid-template-columns:1fr}.nav-tabs{display:none}.wk-grid{grid-template-columns:repeat(3,1fr)}}
`;

function useToast() {
  const [t, setT] = useState(null);
  const show = (msg, type = "success") => { setT({ msg, type }); setTimeout(() => setT(null), 4000); };
  return { t, show };
}

function MC({ label, value, color, suffix = "", flash = false }) {
  const [k, setK] = useState(0);
  const prev = useRef(false);
  useEffect(() => { if (flash && !prev.current) setK(x => x + 1); prev.current = flash; }, [flash]);
  return (
    <div key={k} className={flash ? "mc flash" : "mc"}>
      {value != null
        ? <div className="mc-val" style={{ color }}>{value}<span style={{ fontSize: 13, fontWeight: 500 }}>{suffix}</span></div>
        : <div style={{ width: 28, height: 3, background: color + "44", borderRadius: 2, margin: "8px 0 4px" }} />}
      <div className="mc-label">{label}</div>
    </div>
  );
}

function NumInput({ value, onChange, color }) {
  return (
    <div className="num-input">
      <button className="num-btn" onClick={() => onChange(Math.max(0, (parseInt(value) || 0) - 1))}>−</button>
      <input type="number" value={value} onChange={e => onChange(parseInt(e.target.value) || 0)} style={{ color }} />
      <button className="num-btn" onClick={() => onChange((parseInt(value) || 0) + 1)}>+</button>
    </div>
  );
}

function MealTotals({ items }) {
  const t = items.reduce((a, i) => ({
    protein: a.protein + (i.protein || 0),
    carbs: a.carbs + (i.carbs || 0),
    fats: a.fats + (i.fats || 0),
    fiber: a.fiber + (i.fiber || 0),
    cal: a.cal + (i.cal || 0),
  }), { protein: 0, carbs: 0, fats: 0, fiber: 0, cal: 0 });
  return (
    <div className="meal-total">
      <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted2)", textTransform: "uppercase" }}>Meal Total:</span>
      <span style={{ fontSize: 12, fontWeight: 700, color: "var(--green)" }}>{t.cal} kcal</span>
      <span style={{ fontSize: 12, fontWeight: 700, color: "var(--purple)" }}>{t.protein}g Protein</span>
      <span style={{ fontSize: 12, fontWeight: 700, color: "var(--orange)" }}>{t.carbs}g Carbs</span>
      <span style={{ fontSize: 12, fontWeight: 700, color: "var(--red)" }}>{t.fats}g Fats</span>
      <span style={{ fontSize: 12, fontWeight: 700, color: "#34d399" }}>{t.fiber}g Fiber</span>
    </div>
  );
}

// ─── WORKOUT EDITOR ────────────────────────────────────────────────────────
function WorkoutEditor({ plan, onSave, onClose }) {
  const [days, setDays] = useState(JSON.parse(JSON.stringify(plan)));
  const TYPES = ["Push", "Pull", "Legs", "Rest", "Cardio", "Full Body"];
  const updateDay = (di, f, v) => setDays(d => d.map((day, i) => i === di ? { ...day, [f]: v } : day));
  const updateEx = (di, ei, f, v) => setDays(d => d.map((day, i) => i === di ? { ...day, exercises: day.exercises.map((ex, j) => j === ei ? { ...ex, [f]: v } : ex) } : day));
  const addEx = (di) => setDays(d => d.map((day, i) => i === di ? { ...day, exercises: [...day.exercises, { name: "", sets: 3, reps: "10-12", rest: "60s", videoUrl: "" }] } : day));
  const removeEx = (di, ei) => setDays(d => d.map((day, i) => i === di ? { ...day, exercises: day.exercises.filter((_, j) => j !== ei) } : day));
  const addDay = () => setDays(d => [...d, { day: "Day " + (d.length + 1), type: "Push", exercises: [] }]);
  const removeDay = (di) => setDays(d => d.filter((_, i) => i !== di));
  return (
    <div className="ov" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="mh"><div><div className="mt">💪 Edit Workout Plan</div><div className="ms">Add exercises + paste YouTube/video links for demos</div></div><button className="xbtn" onClick={onClose}>✕</button></div>
        <div className="mb2">
          {days.map((day, di) => (
            <div key={di} style={{ background: "var(--s2)", border: "1px solid var(--border)", borderRadius: 10, padding: 14, marginBottom: 12 }}>
              <div style={{ display: "flex", gap: 8, marginBottom: 10, alignItems: "center" }}>
                <input className="fi" style={{ flex: 1 }} value={day.day} onChange={e => updateDay(di, "day", e.target.value)} placeholder="Day name" />
                <select className="fsel" style={{ width: 130 }} value={day.type} onChange={e => updateDay(di, "type", e.target.value)}>
                  {TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
                <button className="btn btn-d btn-sm" onClick={() => removeDay(di)}>Remove Day</button>
              </div>
              {day.type !== "Rest" && (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "2fr 55px 80px 65px auto", gap: 6, marginBottom: 4 }}>
                    {["Exercise", "Sets", "Reps", "Rest", "Demo Video"].map((h, i) => <div key={i} className="fl">{h}</div>)}
                  </div>
                  {day.exercises.map((ex, ei) => (
                    <div key={ei} style={{ background: "var(--s1)", border: "1px solid var(--border)", borderRadius: 9, padding: 10, marginBottom: 10 }}>
                      <div style={{ display: "grid", gridTemplateColumns: "2fr 55px 80px 65px auto", gap: 6, marginBottom: 8, alignItems: "center" }}>
                        <input className="fi" value={ex.name} onChange={e => updateEx(di, ei, "name", e.target.value)} placeholder="Exercise name" />
                        <input className="fi" type="number" value={ex.sets} onChange={e => updateEx(di, ei, "sets", parseInt(e.target.value) || 1)} />
                        <input className="fi" value={ex.reps} onChange={e => updateEx(di, ei, "reps", e.target.value)} placeholder="10-12" />
                        <input className="fi" value={ex.rest} onChange={e => updateEx(di, ei, "rest", e.target.value)} placeholder="60s" />
                        <button className="btn btn-d btn-xs" onClick={() => removeEx(di, ei)}>✕ Remove</button>
                      </div>
                      {/* VIDEO — both URL paste AND file upload from PC */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, alignItems: "center" }}>
                        <input className="fi" value={ex.videoUrl || ""} onChange={e => updateEx(di, ei, "videoUrl", e.target.value)}
                          placeholder="Paste YouTube link or video URL (e.g. https://youtube.com/watch?v=...)" />
                        <label style={{ cursor: "pointer", whiteSpace: "nowrap" }}>
                          <input type="file" accept="video/*" style={{ display: "none" }}
                            onChange={e => {
                              const file = e.target.files[0];
                              if (!file) return;
                              const reader = new FileReader();
                              reader.onload = ev => updateEx(di, ei, "videoUrl", ev.target.result);
                              reader.readAsDataURL(file);
                            }} />
                          <span className="btn btn-s btn-sm">📁 Upload from PC</span>
                        </label>
                      </div>
                      {ex.videoUrl && (
                        <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 8 }}>
                          <span className="bdg bdg-b">🎥 Video added</span>
                          <button className="btn btn-d btn-xs" onClick={() => updateEx(di, ei, "videoUrl", "")}>Remove video</button>
                        </div>
                      )}
                    </div>
                  ))}
                  <button className="btn btn-s btn-sm" onClick={() => addEx(di)} style={{ marginTop: 4 }}>+ Add Exercise</button>
                </>
              )}
            </div>
          ))}
          <button className="btn btn-s" onClick={addDay} style={{ marginBottom: 16 }}>+ Add Day</button>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn btn-p" style={{ flex: 1 }} onClick={() => onSave(days)}>💾 Save Workout Plan</button>
            <button className="btn btn-s" onClick={onClose}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── MEAL EDITOR ───────────────────────────────────────────────────────────
function MealEditor({ plan, onSave, onClose }) {
  const [meals, setMeals] = useState(JSON.parse(JSON.stringify(plan)));
  const updateMeal = (mi, f, v) => setMeals(m => m.map((meal, i) => i === mi ? { ...meal, [f]: v } : meal));
  const updateItem = (mi, ii, f, v) => setMeals(m => m.map((meal, i) => i === mi ? { ...meal, items: meal.items.map((item, j) => j === ii ? { ...item, [f]: f === "food" || f === "amount" ? v : (parseFloat(v) || 0) } : item) } : meal));
  const addItem = (mi) => setMeals(m => m.map((meal, i) => i === mi ? { ...meal, items: [...meal.items, { food: "", amount: "", protein: 0, carbs: 0, fats: 0, fiber: 0, cal: 0 }] } : meal));
  const removeItem = (mi, ii) => setMeals(m => m.map((meal, i) => i === mi ? { ...meal, items: meal.items.filter((_, j) => j !== ii) } : meal));
  const addMeal = () => setMeals(m => [...m, { name: "Meal " + (m.length + 1), time: "12:00 PM", items: [] }]);
  const removeMeal = (mi) => setMeals(m => m.filter((_, i) => i !== mi));
  return (
    <div className="ov" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="mh"><div><div className="mt">🥩 Edit Meal Plan</div><div className="ms">Includes Protein, Carbs, Fats, Fiber + auto totals</div></div><button className="xbtn" onClick={onClose}>✕</button></div>
        <div className="mb2">
          {meals.map((meal, mi) => (
            <div key={mi} style={{ background: "var(--s2)", border: "1px solid var(--border)", borderRadius: 12, marginBottom: 14, overflow: "hidden" }}>
              <div style={{ padding: "12px 14px", background: "var(--s3)", display: "flex", gap: 8, alignItems: "center" }}>
                <input className="fi" style={{ flex: 1 }} value={meal.name} onChange={e => updateMeal(mi, "name", e.target.value)} placeholder="Meal name" />
                <input className="fi" style={{ width: 110 }} value={meal.time} onChange={e => updateMeal(mi, "time", e.target.value)} placeholder="Time" />
                <button className="btn btn-d btn-sm" onClick={() => removeMeal(mi)}>Remove</button>
              </div>
              <div style={{ padding: "10px 14px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 70px 70px 70px 70px 80px auto", gap: 5, marginBottom: 6 }}>
                  {["Food", "Amount", "P(g)", "C(g)", "F(g)", "Fib(g)", "Cal", ""].map((h, i) => <div key={i} className="fl">{h}</div>)}
                </div>
                {meal.items.map((item, ii) => (
                  <div key={ii} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 70px 70px 70px 70px 80px auto", gap: 5, marginBottom: 8, alignItems: "center" }}>
                    <input className="fi" value={item.food} onChange={e => updateItem(mi, ii, "food", e.target.value)} placeholder="Food name" />
                    <input className="fi" value={item.amount} onChange={e => updateItem(mi, ii, "amount", e.target.value)} placeholder="100g" />
                    <input className="fi" type="number" value={item.protein || ""} onChange={e => updateItem(mi, ii, "protein", e.target.value)} placeholder="0" style={{ color: "var(--purple)", fontSize: 16, fontWeight: 700, padding: "12px 8px", textAlign: "center" }} />
                    <input className="fi" type="number" value={item.carbs || ""} onChange={e => updateItem(mi, ii, "carbs", e.target.value)} placeholder="0" style={{ color: "var(--orange)", fontSize: 16, fontWeight: 700, padding: "12px 8px", textAlign: "center" }} />
                    <input className="fi" type="number" value={item.fats || ""} onChange={e => updateItem(mi, ii, "fats", e.target.value)} placeholder="0" style={{ color: "var(--red)", fontSize: 16, fontWeight: 700, padding: "12px 8px", textAlign: "center" }} />
                    <input className="fi" type="number" value={item.fiber || ""} onChange={e => updateItem(mi, ii, "fiber", e.target.value)} placeholder="0" style={{ color: "#34d399", fontSize: 16, fontWeight: 700, padding: "12px 8px", textAlign: "center" }} />
                    <input className="fi" type="number" value={item.cal || ""} onChange={e => updateItem(mi, ii, "cal", e.target.value)} placeholder="0" style={{ color: "var(--green)", fontSize: 16, fontWeight: 700, padding: "12px 8px", textAlign: "center" }} />
                    <button className="btn btn-d btn-xs" onClick={() => removeItem(mi, ii)}>✕</button>
                  </div>
                ))}
                <button className="btn btn-s btn-sm" onClick={() => addItem(mi)} style={{ marginTop: 4 }}>+ Add Food</button>
              </div>
              <MealTotals items={meal.items} />
            </div>
          ))}
          <button className="btn btn-s" onClick={addMeal} style={{ marginBottom: 14 }}>+ Add Meal</button>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn btn-p" style={{ flex: 1 }} onClick={() => onSave(meals)}>💾 Save Meal Plan</button>
            <button className="btn btn-s" onClick={onClose}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── VIDEO PLAYER ──────────────────────────────────────────────────────────
function VideoModal({ url, name, onClose }) {
  const isYT = url.includes("youtube.com") || url.includes("youtu.be");
  let embedUrl = url;
  if (isYT) {
    const id = url.split("v=")[1]?.split("&")[0] || url.split("youtu.be/")[1]?.split("?")[0];
    embedUrl = "https://www.youtube.com/embed/" + id;
  }
  return (
    <div className="ov" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="mh"><div><div className="mt">🎥 {name}</div><div className="ms">Exercise demo video</div></div><button className="xbtn" onClick={onClose}>✕</button></div>
        <div className="mb2">
          {isYT
            ? <iframe width="100%" height="315" src={embedUrl} frameBorder="0" allowFullScreen style={{ borderRadius: 10 }} />
            : <video src={url} controls style={{ width: "100%", borderRadius: 10 }} />}
        </div>
      </div>
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
  const [videoModal, setVideoModal] = useState(null);
  const [lw, setLw] = useState("");
  const [lwa, setLwa] = useState("");
  const [lbf, setLbf] = useState("");
  const [saving, setSaving] = useState(false);
  const [viewMedia, setViewMedia] = useState(null);
  const WCOLOR = { Push: "#4ade80", Pull: "#818cf8", Legs: "#fb923c", Rest: "#475569", Cardio: "#38bdf8", "Full Body": "#f472b6" };

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "clients", uid), snap => {
      if (!snap.exists()) { setLoading(false); return; }
      const data = snap.data();
      if (prevRef.current) {
        const p = prevRef.current;
        const changed = {};
        const n = data.nutrition || {}, pn = p.nutrition || {};
        ["calories", "protein", "carbs", "fats", "fiber"].forEach(k => { if (pn[k] !== n[k]) changed[k] = true; });
        if (p.coachMessage !== data.coachMessage) changed.msg = true;
        if (p.phase !== data.phase) changed.phase = true;
        if (p.week !== data.week) changed.week = true;
        if (JSON.stringify(p.mealPlan) !== JSON.stringify(data.mealPlan)) changed.meals = true;
        if (JSON.stringify(p.workoutPlan) !== JSON.stringify(data.workoutPlan)) changed.workout = true;
        if (Object.keys(changed).length > 0) {
          setFlash(changed);
          toast("⚡ Coach updated your plan!", "success");
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
    const waist = lwa ? parseFloat(lwa) : (d.waist || null);
    const bodyFat = lbf ? parseFloat(lbf) : (d.bodyFat || null);
    const hist = d.weightHistory || [];
    const checkins = d.checkIns || [];
    const entry = { week: "W" + (hist.length + 1), weight, date: new Date().toLocaleDateString("en-IN"), timestamp: new Date().toISOString() };
    const checkin = { weight, waist, bodyFat, date: new Date().toLocaleDateString("en-IN"), time: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }), timestamp: new Date().toISOString(), week: "W" + (hist.length + 1) };
    await updateDoc(doc(db, "clients", uid), { weight, waist, bodyFat, weightHistory: [...hist, entry], checkIns: [...checkins, checkin] });
    toast("✓ Check-in logged!", "success");
    setLw(""); setLwa(""); setLbf(""); setSaving(false);
  };

  const uploadMedia = async (file) => {
    if (!file) return;
    const isVideo = file.type.startsWith("video/");
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target.result;
      const media = d.photos || [];
      await updateDoc(doc(db, "clients", uid), {
        photos: [...media, { data: base64, type: isVideo ? "video" : "photo", date: new Date().toLocaleDateString("en-IN"), time: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }), timestamp: new Date().toISOString() }]
      });
      toast(isVideo ? "🎥 Video uploaded!" : "📸 Photo uploaded!", "success");
    };
    reader.readAsDataURL(file);
  };

  if (loading) return <div className="spin-wrap"><div className="spinner" /><span>Loading your plan...</span></div>;
  if (!d) return <div className="spin-wrap">No data. Contact your coach.</div>;

  const n = d.nutrition || {};
  const meals = d.mealPlan || DEFAULT_MEALS;
  const workout = d.workoutPlan || DEFAULT_WORKOUT;
  const media = d.photos || [];
  const checkins = d.checkIns || [];

  if (tab === "training") return (
    <div className="page">
      <div style={{ marginBottom: 22 }}>
        <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 22, fontWeight: 800 }}>🏋️ Your Workout Plan</div>
        <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 5 }}>{d.phase} · Week {d.week}</div>
        {flash.workout && <span className="nbadge">✨ Updated by coach</span>}
      </div>
      <div className="wk-grid" style={{ marginBottom: 20 }}>
        {workout.map((day, i) => (
          <div key={i} className={day.type === "Rest" ? "wk-card rest" : "wk-card"}
            style={{ borderTop: "3px solid " + (WCOLOR[day.type] || "#475569") }}
            onClick={() => day.type !== "Rest" && setWModal(day)}>
            <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", color: "var(--muted)", marginBottom: 8 }}>{day.day.slice(0, 3)}</div>
            <div style={{ fontSize: 20, marginBottom: 5 }}>{day.type === "Rest" ? "😴" : day.type === "Legs" ? "🦵" : day.type === "Pull" ? "🏋️" : "💪"}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: WCOLOR[day.type] || "#475569" }}>{day.type}</div>
            {day.type !== "Rest" && <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 3 }}>{day.exercises.length} exercises</div>}
          </div>
        ))}
      </div>
      {wModal && (
        <div className="ov" onClick={e => e.target === e.currentTarget && setWModal(null)}>
          <div className="modal">
            <div className="mh"><div><div className="mt">{wModal.day} — {wModal.type}</div><div className="ms">{wModal.exercises.length} exercises</div></div><button className="xbtn" onClick={() => setWModal(null)}>✕</button></div>
            <div className="mb2">
              {wModal.exercises.map((ex, i) => (
                <div key={i} className="ex-row">
                  <div className="ex-num">{i + 1}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{ex.name}</div>
                    <div style={{ fontSize: 11, color: "var(--muted)" }}>Rest: {ex.rest}</div>
                  </div>
                  <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: WCOLOR[wModal.type] }}>{ex.sets} × {ex.reps}</div>
                    {ex.videoUrl && (
                      <button className="btn btn-s btn-xs" onClick={() => setVideoModal(ex)}>🎥 Watch Demo</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {videoModal && <VideoModal url={videoModal.videoUrl} name={videoModal.name} onClose={() => setVideoModal(null)} />}
    </div>
  );

  if (tab === "nutrition") return (
    <div className="page">
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 22, fontWeight: 800 }}>🥩 Your Nutrition Plan</div>
        <div className="live" style={{ marginTop: 7 }}><span className="dot" />Updates live from coach</div>
      </div>
      <div className="g4" style={{ marginBottom: 20 }}>
        <MC label="Calories" value={n.calories} color="var(--green)" flash={!!flash.calories} />
        <MC label="Protein G" value={n.protein} color="var(--purple)" flash={!!flash.protein} />
        <MC label="Carbs G" value={n.carbs} color="var(--orange)" flash={!!flash.carbs} />
        <MC label="Fats G" value={n.fats} color="var(--red)" flash={!!flash.fats} />
      </div>
      {n.fiber != null && (
        <div className="card" style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 24, fontWeight: 800, color: "#34d399" }}>{n.fiber}g</div>
          <div className="mc-label">Daily Fiber Target</div>
        </div>
      )}
      {meals.map((meal, mi) => (
        <div key={mi} className="meal-card">
          <div className="meal-head">
            <div><span style={{ fontWeight: 700, fontSize: 14 }}>{meal.name}</span><span style={{ fontSize: 12, color: "var(--muted)", marginLeft: 8 }}>{meal.time}</span></div>
            <span className="bdg bdg-g">{meal.items.reduce((a, i) => a + (i.cal || 0), 0)} kcal</span>
          </div>
          <div className="meal-body">
            {meal.items.map((item, ii) => (
              <div key={ii} className="food-row">
                <div><span style={{ fontWeight: 600 }}>{item.food}</span><span style={{ color: "var(--muted)", fontSize: 12, marginLeft: 6 }}>{item.amount}</span></div>
                <div style={{ display: "flex", gap: 8, fontSize: 12, flexWrap: "wrap", justifyContent: "flex-end" }}>
                  <span style={{ color: "var(--purple)" }}>{item.protein}g P</span>
                  <span style={{ color: "var(--orange)" }}>{item.carbs}g C</span>
                  <span style={{ color: "var(--red)" }}>{item.fats}g F</span>
                  <span style={{ color: "#34d399" }}>{item.fiber || 0}g Fib</span>
                  <span style={{ color: "var(--green)", fontWeight: 700 }}>{item.cal} cal</span>
                </div>
              </div>
            ))}
          </div>
          <MealTotals items={meal.items} />
        </div>
      ))}
    </div>
  );

  if (tab === "photos") return (
    <div className="page">
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 22, fontWeight: 800 }}>📸 Progress Photos & Videos</div>
        <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 5 }}>Your coach can see everything you upload · You can upload anytime</div>
      </div>

      {/* UPLOAD AREA — always visible so client can add more anytime */}
      <div className="card" style={{ marginBottom: 16 }}>
        <label className="upload-area" style={{ cursor: "pointer" }}>
          <input type="file" accept="image/*,video/*" multiple style={{ display: "none" }}
            onChange={e => {
              const files = Array.from(e.target.files);
              if (files.length === 0) return;
              files.forEach(uploadMedia);
              e.target.value = ""; // reset so same files can be selected again
            }} />
          <div style={{ fontSize: 36, marginBottom: 10 }}>📤</div>
          <div style={{ fontWeight: 700, fontSize: 16, color: "var(--green)", marginBottom: 6 }}>
            {media.length > 0 ? "Upload More Photos / Videos" : "Upload Photos or Videos"}
          </div>
          <div style={{ color: "var(--muted)", fontSize: 13, marginBottom: 6 }}>
            Click here to select <strong style={{ color: "var(--text)" }}>multiple files</strong> at once
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <span className="bdg bdg-g">📷 JPG / PNG photos</span>
            <span className="bdg bdg-b">🎥 MP4 / MOV videos</span>
            <span className="bdg bdg-p">🔄 Upload anytime</span>
          </div>
        </label>
      </div>

      {media.length > 0 ? (
        <div className="card">
          <div className="card-title">
            Your Media ({media.length} files)
            <label style={{ cursor: "pointer" }}>
              <input type="file" accept="image/*,video/*" multiple style={{ display: "none" }}
                onChange={e => {
                  Array.from(e.target.files).forEach(uploadMedia);
                  e.target.value = "";
                }} />
              <span className="btn btn-p btn-sm">+ Add More</span>
            </label>
          </div>
          <div className="photo-grid">
            {[...media].reverse().map((p, i) => (
              <div key={i} className="photo-item" onClick={() => setViewMedia(p)}>
                {p.type === "video"
                  ? <><video src={p.data} /><div className="video-badge">🎥 Video</div></>
                  : <img src={p.data} alt="" />}
                <div className="photo-label">{p.date} · {p.time}</div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="card"><div className="empty"><div className="empty-icon">📸</div><div className="empty-title">No media yet</div><div className="empty-desc">Click the upload area above to add your first progress photo!</div></div></div>
      )}
      {viewMedia && (
        <div className="ov" onClick={() => setViewMedia(null)}>
          <div style={{ maxWidth: 520, width: "100%" }}>
            {viewMedia.type === "video"
              ? <video src={viewMedia.data} controls style={{ width: "100%", borderRadius: 16 }} />
              : <img src={viewMedia.data} alt="" style={{ width: "100%", borderRadius: 16 }} />}
            <div style={{ textAlign: "center", marginTop: 10, color: "var(--muted2)", fontSize: 13 }}>{viewMedia.date} · {viewMedia.time}</div>
            <div style={{ textAlign: "center", marginTop: 8 }}><button className="btn btn-s btn-sm" onClick={() => setViewMedia(null)}>Close</button></div>
          </div>
        </div>
      )}
    </div>
  );

  if (tab === "comparison") {
    const allCheckins = [...checkins];
    return (
      <div className="page">
        <div style={{ marginBottom: 22 }}>
          <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 22, fontWeight: 800 }}>📊 Week by Week Comparison</div>
          <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 5 }}>See your progress side by side</div>
        </div>
        {allCheckins.length < 2 ? (
          <div className="card"><div className="empty"><div className="empty-icon">📊</div><div className="empty-title">Not enough data yet</div><div className="empty-desc">Log at least 2 check-ins to see comparisons.</div></div></div>
        ) : (
          <>
            <div className="cmp-grid" style={{ marginBottom: 20 }}>
              {allCheckins.map((c, i) => (
                <div key={i} className="cmp-card">
                  <div className="cmp-head" style={{ color: "var(--green)" }}>{c.week} · {c.date}</div>
                  <div className="cmp-body">
                    <div className="cmp-stat"><span style={{ color: "var(--muted)" }}>Weight</span><span style={{ fontWeight: 700, color: "var(--green)" }}>{c.weight} kg</span></div>
                    <div className="cmp-stat"><span style={{ color: "var(--muted)" }}>Waist</span><span style={{ fontWeight: 700 }}>{c.waist ? c.waist + " cm" : "—"}</span></div>
                    <div className="cmp-stat"><span style={{ color: "var(--muted)" }}>Body Fat</span><span style={{ fontWeight: 700 }}>{c.bodyFat ? c.bodyFat + "%" : "—"}</span></div>
                    {i > 0 && (
                      <>
                        <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid var(--border)" }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", marginBottom: 4 }}>Change from prev</div>
                          <div className="cmp-stat">
                            <span style={{ color: "var(--muted)" }}>Weight</span>
                            <span style={{ fontWeight: 700, color: (c.weight - allCheckins[i-1].weight) < 0 ? "var(--green)" : "var(--red)" }}>
                              {(c.weight - allCheckins[i-1].weight) > 0 ? "+" : ""}{(c.weight - allCheckins[i-1].weight).toFixed(1)} kg
                            </span>
                          </div>
                          {c.waist && allCheckins[i-1].waist && (
                            <div className="cmp-stat">
                              <span style={{ color: "var(--muted)" }}>Waist</span>
                              <span style={{ fontWeight: 700, color: (c.waist - allCheckins[i-1].waist) < 0 ? "var(--green)" : "var(--red)" }}>
                                {(c.waist - allCheckins[i-1].waist) > 0 ? "+" : ""}{(c.waist - allCheckins[i-1].waist).toFixed(1)} cm
                              </span>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {media.length >= 2 && (
              <>
                <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: 16, marginBottom: 14 }}>📸 Photo Comparison</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 12 }}>
                  {[...media].filter(m => m.type !== "video").map((p, i) => (
                    <div key={i} style={{ borderRadius: 12, overflow: "hidden", border: "1px solid var(--border)" }}>
                      <div style={{ background: "var(--s3)", padding: "6px 10px", fontSize: 11, fontWeight: 700, color: "var(--green)" }}>
                        {i === 0 ? "📅 First" : i === media.filter(m => m.type !== "video").length - 1 ? "📅 Latest" : "📅 " + p.date}
                      </div>
                      <img src={p.data} alt="" style={{ width: "100%", aspectRatio: "3/4", objectFit: "cover" }} />
                      <div style={{ padding: "6px 10px", fontSize: 10, color: "var(--muted)" }}>{p.date} · {p.time}</div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    );
  }

  return (
    <div className="page">
      <div style={{ marginBottom: 22 }}>
        <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 26, fontWeight: 800 }}>Hey {(d.name || "").split(" ")[0]} 💪</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10, alignItems: "center" }}>
          <span className="phase">{d.phase} · Week {d.week}</span>
          <span className="live"><span className="dot" />Live sync</span>
        </div>
      </div>
      <div className="g4" style={{ marginBottom: 18 }}>
        <MC label="Weight KG" value={d.weight} color="var(--green)" flash={!!flash.weight} />
        <MC label="Waist CM" value={d.waist} color="var(--purple)" flash={!!flash.waist} />
        <MC label="Body Fat %" value={d.bodyFat} color="var(--orange)" suffix="%" />
        <MC label="Week" value={"W" + d.week} color="var(--blue)" flash={!!flash.week} />
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-title">📝 Log Today's Check-in</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 10, alignItems: "flex-end" }}>
          <div><div className="fl">Weight (kg)</div><input className="fi" type="number" step="0.1" placeholder="85.5" value={lw} onChange={e => setLw(e.target.value)} /></div>
          <div><div className="fl">Waist (cm)</div><input className="fi" type="number" step="0.1" placeholder="82" value={lwa} onChange={e => setLwa(e.target.value)} /></div>
          <div><div className="fl">Body Fat %</div><input className="fi" type="number" step="0.1" placeholder="18.5" value={lbf} onChange={e => setLbf(e.target.value)} /></div>
          <button className="btn btn-p" onClick={logStats} disabled={saving || !lw}>{saving ? "..." : "✓ Log"}</button>
        </div>
      </div>

      {checkins.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-title">📋 Recent Check-ins <button className="sh-link" onClick={() => setTab("comparison")}>View comparison →</button></div>
          <table className="tbl">
            <thead><tr><th>Week</th><th>Date</th><th>Weight</th><th>Waist</th><th>Body Fat</th></tr></thead>
            <tbody>
              {[...checkins].reverse().slice(0, 5).map((c, i) => (
                <tr key={i}>
                  <td><span className="bdg bdg-g">{c.week}</span></td>
                  <td style={{ color: "var(--muted)", fontSize: 12 }}>{c.date}</td>
                  <td style={{ fontWeight: 700, color: "var(--green)" }}>{c.weight} kg</td>
                  <td style={{ color: "var(--muted)" }}>{c.waist ? c.waist + " cm" : "—"}</td>
                  <td style={{ color: "var(--orange)" }}>{c.bodyFat ? c.bodyFat + "%" : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className={flash.msg ? "card flash" : "card"} style={{ marginBottom: 16 }}>
        <div className="card-title">💬 Coach's Message {flash.msg && <span className="nbadge">✨ New</span>}</div>
        <div className={"msg-b" + (d.coachMessage ? " has" : "")}>{d.coachMessage || "Your coach hasn't sent a message yet."}</div>
      </div>

      <div className="sh"><div className="sh-title">🥩 Today's Targets</div><button className="sh-link" onClick={() => setTab("nutrition")}>Full plan →</button></div>
      <div className="g4" style={{ marginBottom: 20 }}>
        <MC label="Calories" value={n.calories} color="var(--green)" flash={!!flash.calories} />
        <MC label="Protein G" value={n.protein} color="var(--purple)" flash={!!flash.protein} />
        <MC label="Carbs G" value={n.carbs} color="var(--orange)" flash={!!flash.carbs} />
        <MC label="Fats G" value={n.fats} color="var(--red)" flash={!!flash.fats} />
      </div>

      <div className="sh"><div className="sh-title">🏋️ This Week</div><button className="sh-link" onClick={() => setTab("training")}>Full plan →</button></div>
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 6 }}>
          {workout.map((day, i) => (
            <div key={i} className={day.type === "Rest" ? "wk-card rest" : "wk-card"}
              style={{ borderTop: "3px solid " + (WCOLOR[day.type] || "#475569"), padding: "10px 4px" }}
              onClick={() => day.type !== "Rest" && setWModal(day)}>
              <div style={{ fontSize: 8, fontWeight: 700, textTransform: "uppercase", color: "var(--muted)", marginBottom: 5 }}>{day.day.slice(0, 3)}</div>
              <div style={{ fontSize: 16, marginBottom: 3 }}>{day.type === "Rest" ? "😴" : day.type === "Legs" ? "🦵" : day.type === "Pull" ? "🏋️" : "💪"}</div>
              <div style={{ fontSize: 9, fontWeight: 700, color: WCOLOR[day.type] || "#475569" }}>{day.type}</div>
            </div>
          ))}
        </div>
      </div>

      {(d.weightHistory || []).length > 1 && (
        <>
          <div className="sh"><div className="sh-title">📈 Weight Progress</div></div>
          <div className="card" style={{ marginBottom: 24 }}>
            <div style={{ height: 190 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={d.weightHistory}>
                  <defs><linearGradient id="wg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#22c55e" stopOpacity={0.25} /><stop offset="95%" stopColor="#22c55e" stopOpacity={0} /></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e2d45" />
                  <XAxis dataKey="week" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                  <YAxis domain={["auto", "auto"]} tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "#0f1629", border: "1px solid #1e2d45", borderRadius: 9, fontSize: 12 }} />
                  <Area type="monotone" dataKey="weight" stroke="#22c55e" strokeWidth={2.5} fill="url(#wg)" dot={{ fill: "#22c55e", r: 3, strokeWidth: 0 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
      {wModal && (
        <div className="ov" onClick={e => e.target === e.currentTarget && setWModal(null)}>
          <div className="modal">
            <div className="mh"><div><div className="mt">{wModal.day} — {wModal.type}</div></div><button className="xbtn" onClick={() => setWModal(null)}>✕</button></div>
            <div className="mb2">
              {wModal.exercises.map((ex, i) => (
                <div key={i} className="ex-row">
                  <div className="ex-num">{i + 1}</div>
                  <div style={{ flex: 1 }}><div style={{ fontWeight: 600, fontSize: 14 }}>{ex.name}</div><div style={{ fontSize: 11, color: "var(--muted)" }}>Rest: {ex.rest}</div></div>
                  <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{ex.sets} × {ex.reps}</div>
                    {ex.videoUrl && <button className="btn btn-s btn-xs" onClick={() => setVideoModal(ex)}>🎥 Watch Demo</button>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {videoModal && <VideoModal url={videoModal.videoUrl} name={videoModal.name} onClose={() => setVideoModal(null)} />}
    </div>
  );
}

// ─── COACH DASHBOARD ───────────────────────────────────────────────────────
function CoachDash({ coachUid, coachEmail, coachName, tab, setTab, toast }) {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selId, setSelId] = useState(null);
  const [sel, setSel] = useState(null);
  const [innerTab, setInnerTab] = useState("overview");
  const [msgText, setMsgText] = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [showWorkoutEditor, setShowWorkoutEditor] = useState(false);
  const [showMealEditor, setShowMealEditor] = useState(false);
  const [addSaving, setAddSaving] = useState(false);
  const [viewMedia, setViewMedia] = useState(null);
  const [videoModal, setVideoModal] = useState(null);
  const [nc, setNc] = useState({ name: "", email: "", password: "", phone: "", phase: "Cut Phase 1", week: "1", calories: 2200, protein: 160, carbs: 240, fats: 70, fiber: 25 });

  useEffect(() => {
    const q = query(collection(db, "clients"), where("coachId", "==", coachUid));
    const unsub = onSnapshot(q, snap => { setClients(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false); });
    return unsub;
  }, [coachUid]);

  useEffect(() => {
    if (!selId) { setSel(null); return; }
    const unsub = onSnapshot(doc(db, "clients", selId), snap => { if (snap.exists()) setSel({ id: snap.id, ...snap.data() }); });
    return unsub;
  }, [selId]);

  const update = async (field, value) => { if (!selId) return; await updateDoc(doc(db, "clients", selId), { [field]: value }); };
  const updateN = async (field, value) => { if (!selId) return; await updateDoc(doc(db, "clients", selId), { ["nutrition." + field]: parseInt(value) || 0 }); };

  const sendMessage = async () => {
    if (!msgText.trim() || !selId) return;
    setSendingMsg(true);
    await updateDoc(doc(db, "clients", selId), { coachMessage: msgText.trim() });
    toast("✅ Message sent!", "success");
    setMsgText(""); setSendingMsg(false);
  };

  const saveWorkout = async (plan) => { await updateDoc(doc(db, "clients", selId), { workoutPlan: plan }); toast("💪 Workout saved!", "success"); setShowWorkoutEditor(false); };

  const saveMeals = async (plan) => {
    const cal = plan.reduce((a, m) => a + m.items.reduce((b, i) => b + (i.cal || 0), 0), 0);
    const pro = plan.reduce((a, m) => a + m.items.reduce((b, i) => b + (i.protein || 0), 0), 0);
    const car = plan.reduce((a, m) => a + m.items.reduce((b, i) => b + (i.carbs || 0), 0), 0);
    const fat = plan.reduce((a, m) => a + m.items.reduce((b, i) => b + (i.fats || 0), 0), 0);
    const fib = plan.reduce((a, m) => a + m.items.reduce((b, i) => b + (i.fiber || 0), 0), 0);
    await updateDoc(doc(db, "clients", selId), { mealPlan: plan, nutrition: { calories: cal, protein: pro, carbs: car, fats: fat, fiber: fib } });
    toast("🥩 Meal plan saved!", "success");
    setShowMealEditor(false);
  };

  const addClient = async () => {
    if (!nc.name || !nc.email || !nc.password) { toast("Name, email & password required", "error"); return; }
    if (nc.password.length < 6) { toast("Password needs 6+ characters", "error"); return; }
    setAddSaving(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, nc.email, nc.password);
      const clientUid = cred.user.uid;
      await setDoc(doc(db, "clients", clientUid), {
        name: nc.name.trim(), email: nc.email.trim().toLowerCase(), phone: nc.phone.trim(),
        avatar: nc.name.trim().split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase(),
        phase: nc.phase, week: parseInt(nc.week) || 1,
        weight: null, waist: null, bodyFat: null,
        nutrition: { calories: nc.calories, protein: nc.protein, carbs: nc.carbs, fats: nc.fats, fiber: nc.fiber },
        weightHistory: [], checkIns: [], coachMessage: "", photos: [],
        mealPlan: DEFAULT_MEALS, workoutPlan: DEFAULT_WORKOUT,
        coachId: coachUid, coachEmail, role: "client", createdAt: serverTimestamp(),
      });
      await signInWithEmailAndPassword(auth, coachEmail, window._cp);
      setShowAdd(false);
      setNc({ name: "", email: "", password: "", phone: "", phase: "Cut Phase 1", week: "1", calories: 2200, protein: 160, carbs: 240, fats: 70, fiber: 25 });
      toast("✅ " + nc.name + " added!", "success");
    } catch (err) {
      toast(err.code === "auth/email-already-in-use" ? "Email already used!" : err.message, "error");
    }
    setAddSaving(false);
  };

  if (loading) return <div className="spin-wrap"><div className="spinner" /><span>Loading...</span></div>;

  if (tab === "analytics") return (
    <div className="page">
      <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 22, fontWeight: 800, marginBottom: 22 }}>📊 Analytics</div>
      <div className="g2">
        {clients.map(c => (
          <div key={c.id} className="card">
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <div className="av av-sm av-g">{c.avatar}</div>
              <div><div style={{ fontWeight: 700, fontSize: 13 }}>{c.name}</div><div style={{ fontSize: 11, color: "var(--muted)" }}>{c.phase} · W{c.week}</div></div>
              <span className="bdg bdg-g" style={{ marginLeft: "auto" }}>{c.weight ? c.weight + "kg" : "—"}</span>
            </div>
            {(c.weightHistory || []).length > 1
              ? <div style={{ height: 140 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={c.weightHistory}>
                    <defs><linearGradient id={"g" + c.id} x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#22c55e" stopOpacity={0.2} /><stop offset="95%" stopColor="#22c55e" stopOpacity={0} /></linearGradient></defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e2d45" />
                    <XAxis dataKey="week" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
                    <YAxis domain={["auto", "auto"]} tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: "#0f1629", border: "1px solid #1e2d45", borderRadius: 8, fontSize: 11 }} />
                    <Area type="monotone" dataKey="weight" stroke="#22c55e" strokeWidth={2} fill={"url(#g" + c.id + ")"} dot={{ fill: "#22c55e", r: 2.5, strokeWidth: 0 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              : <div style={{ height: 80, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)", fontSize: 12 }}>Awaiting check-ins</div>}
          </div>
        ))}
      </div>
    </div>
  );

  if (tab === "clients" && sel) {
    const n = sel.nutrition || {};
    const checkins = sel.checkIns || [];
    const media = sel.photos || [];
    return (
      <div className="page">
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <button className="btn btn-s btn-sm" onClick={() => { setSelId(null); setSel(null); }}>← Back</button>
          <div className="av av-md av-g">{sel.avatar}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 800, fontSize: 19 }}>{sel.name}</div>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>{sel.email} {sel.phone ? "· " + sel.phone : ""}</div>
          </div>
          <span className="live"><span className="dot" />Live</span>
        </div>

        <div className="tab-bar">
          {[["overview","📊 Overview"],["checkins","📋 Check-ins"],["photos","📸 Media"],["comparison","🔄 Compare"],["message","📨 Message"],["nutrition","🥩 Macros"],["meals","🍽️ Meals"],["workout","💪 Workout"],["phase","📋 Phase"]].map(([k, l]) => (
            <button key={k} className={innerTab === k ? "tab-item active" : "tab-item"} onClick={() => setInnerTab(k)}>{l}</button>
          ))}
        </div>

        {innerTab === "overview" && (
          <div>
            <div className="g4" style={{ marginBottom: 16 }}>
              <MC label="Weight KG" value={sel.weight} color="var(--green)" />
              <MC label="Waist CM" value={sel.waist} color="var(--purple)" />
              <MC label="Body Fat %" value={sel.bodyFat} color="var(--orange)" suffix="%" />
              <MC label="Week" value={"W" + sel.week} color="var(--blue)" />
            </div>
            <div className="g2" style={{ marginBottom: 14 }}>
              <div className="card"><div className="card-title">📋 Check-ins</div><div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 36, fontWeight: 800, color: "var(--green)" }}>{checkins.length}</div><div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>Total logged</div></div>
              <div className="card"><div className="card-title">📸 Media</div><div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 36, fontWeight: 800, color: "var(--purple)" }}>{media.length}</div><div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>Photos & videos</div></div>
            </div>
            {(sel.weightHistory || []).length > 1 && (
              <div className="card" style={{ marginBottom: 14 }}>
                <div className="card-title">📈 Weight Chart</div>
                <div style={{ height: 170 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={sel.weightHistory}>
                      <defs><linearGradient id="wg2" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#22c55e" stopOpacity={0.2} /><stop offset="95%" stopColor="#22c55e" stopOpacity={0} /></linearGradient></defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e2d45" />
                      <XAxis dataKey="week" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                      <YAxis domain={["auto", "auto"]} tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ background: "#0f1629", border: "1px solid #1e2d45", borderRadius: 9 }} />
                      <Area type="monotone" dataKey="weight" stroke="#22c55e" strokeWidth={2.5} fill="url(#wg2)" dot={{ fill: "#22c55e", r: 3, strokeWidth: 0 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
            <div className="card">
              <div className="card-title">💬 Current Message</div>
              <div className={"msg-b" + (sel.coachMessage ? " has" : "")}>{sel.coachMessage || "No message sent yet."}</div>
            </div>
          </div>
        )}

        {innerTab === "checkins" && (
          <div className="card">
            <div className="card-title">📋 Full Check-in History — {sel.name}</div>
            {checkins.length === 0
              ? <div className="empty"><div className="empty-icon">📋</div><div className="empty-title">No check-ins yet</div></div>
              : <table className="tbl">
                <thead><tr><th>Week</th><th>Date & Time</th><th>Weight</th><th>Waist</th><th>Body Fat</th><th>Change</th></tr></thead>
                <tbody>
                  {[...checkins].reverse().map((c, i, arr) => {
                    const prev = arr[i + 1];
                    const change = prev ? (c.weight - prev.weight).toFixed(1) : null;
                    return (
                      <tr key={i}>
                        <td><span className="bdg bdg-g">{c.week}</span></td>
                        <td style={{ color: "var(--muted)", fontSize: 12 }}>{c.date} · {c.time}</td>
                        <td style={{ fontWeight: 700, color: "var(--green)" }}>{c.weight} kg</td>
                        <td style={{ color: "var(--muted)" }}>{c.waist ? c.waist + " cm" : "—"}</td>
                        <td style={{ color: "var(--orange)" }}>{c.bodyFat ? c.bodyFat + "%" : "—"}</td>
                        <td>{change !== null && <span className={"bdg " + (parseFloat(change) < 0 ? "bdg-g" : parseFloat(change) > 0 ? "bdg-r" : "bdg-p")}>{parseFloat(change) > 0 ? "+" : ""}{change} kg</span>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>}
          </div>
        )}

        {innerTab === "photos" && (
          <div className="card">
            <div className="card-title">📸 {sel.name}'s Progress Media ({media.length} files)</div>
            {media.length === 0
              ? <div className="empty"><div className="empty-icon">📸</div><div className="empty-title">No media yet</div><div className="empty-desc">Client hasn't uploaded anything yet.</div></div>
              : <div className="photo-grid">
                {[...media].reverse().map((p, i) => (
                  <div key={i} className="photo-item" onClick={() => setViewMedia(p)}>
                    {p.type === "video" ? <><video src={p.data} /><div className="video-badge">🎥</div></> : <img src={p.data} alt="" />}
                    <div className="photo-label">{p.date} · {p.time}</div>
                  </div>
                ))}
              </div>}
          </div>
        )}

        {innerTab === "comparison" && (
          <div className="card">
            <div className="card-title">🔄 Week-by-Week Comparison — {sel.name}</div>
            {checkins.length < 2
              ? <div className="empty"><div className="empty-icon">📊</div><div className="empty-title">Not enough data</div><div className="empty-desc">Need at least 2 check-ins.</div></div>
              : <div className="cmp-grid">
                {checkins.map((c, i) => (
                  <div key={i} className="cmp-card">
                    <div className="cmp-head" style={{ color: "var(--green)" }}>{c.week} · {c.date}</div>
                    <div className="cmp-body">
                      <div className="cmp-stat"><span style={{ color: "var(--muted)" }}>Weight</span><span style={{ fontWeight: 700, color: "var(--green)" }}>{c.weight} kg</span></div>
                      <div className="cmp-stat"><span style={{ color: "var(--muted)" }}>Waist</span><span style={{ fontWeight: 700 }}>{c.waist ? c.waist + " cm" : "—"}</span></div>
                      <div className="cmp-stat"><span style={{ color: "var(--muted)" }}>Body Fat</span><span style={{ fontWeight: 700, color: "var(--orange)" }}>{c.bodyFat ? c.bodyFat + "%" : "—"}</span></div>
                      {i > 0 && (
                        <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid var(--border)" }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", marginBottom: 4 }}>vs {checkins[i-1].week}</div>
                          <div className="cmp-stat">
                            <span style={{ color: "var(--muted)" }}>Weight Δ</span>
                            <span style={{ fontWeight: 700, color: (c.weight - checkins[i-1].weight) < 0 ? "var(--green)" : "var(--red)" }}>
                              {(c.weight - checkins[i-1].weight) > 0 ? "+" : ""}{(c.weight - checkins[i-1].weight).toFixed(1)} kg
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>}
            {media.filter(m => m.type !== "video").length >= 2 && (
              <div style={{ marginTop: 20 }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>📸 Photo Timeline</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 10 }}>
                  {media.filter(m => m.type !== "video").map((p, i) => (
                    <div key={i} style={{ borderRadius: 10, overflow: "hidden", border: "1px solid var(--border)" }}>
                      <div style={{ background: "var(--s3)", padding: "5px 10px", fontSize: 11, fontWeight: 700, color: "var(--green)", textAlign: "center" }}>
                        {i === 0 ? "First" : i === media.filter(m => m.type !== "video").length - 1 ? "Latest" : p.date}
                      </div>
                      <img src={p.data} alt="" style={{ width: "100%", aspectRatio: "3/4", objectFit: "cover", cursor: "pointer" }} onClick={() => setViewMedia(p)} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {innerTab === "message" && (
          <div className="card">
            <div className="card-title">📨 Message to {sel.name}</div>
            <div className="alert alert-g"><strong>Current:</strong> {sel.coachMessage || "None"}</div>
            <div className="fld"><div className="fl">New Message</div><textarea className="fta" placeholder={"Great work " + sel.name + "!"} value={msgText} onChange={e => setMsgText(e.target.value)} /></div>
            <div className="alert alert-w">⚡ Client sees instantly!</div>
            <button className="btn btn-p" onClick={sendMessage} disabled={sendingMsg || !msgText.trim()}>{sendingMsg ? "Sending..." : "📤 Send"}</button>
          </div>
        )}

        {innerTab === "nutrition" && (
          <div className="card">
            <div className="card-title">🥩 Macro Targets for {sel.name}</div>
            <div className="alert alert-w">⚡ Use +/− buttons or type directly. Syncs instantly!</div>
            <div className="fg">
              {[["Calories (kcal)", "calories", "var(--green)"], ["Protein (g)", "protein", "var(--purple)"], ["Carbs (g)", "carbs", "var(--orange)"], ["Fats (g)", "fats", "var(--red)"], ["Fiber (g)", "fiber", "#34d399"]].map(([l, k, co]) => (
                <div key={k} className="fld">
                  <div className="fl" style={{ color: co }}>{l}</div>
                  <NumInput value={n[k] || 0} color={co} onChange={v => updateN(k, v)} />
                </div>
              ))}
            </div>
            <div className="alert alert-g"><strong>Current:</strong> {n.calories} kcal · {n.protein}g P · {n.carbs}g C · {n.fats}g F · {n.fiber || 0}g Fiber</div>
          </div>
        )}

        {innerTab === "meals" && (
          <div className="card">
            <div className="card-title">🍽️ Meal Plan for {sel.name} <button className="btn btn-p btn-sm" onClick={() => setShowMealEditor(true)}>✏️ Edit</button></div>
            <div className="alert alert-w">⚡ Edit to fully customize meals with totals!</div>
            {(sel.mealPlan || DEFAULT_MEALS).map((meal, mi) => (
              <div key={mi} className="meal-card">
                <div className="meal-head">
                  <div><span style={{ fontWeight: 700 }}>{meal.name}</span><span style={{ fontSize: 12, color: "var(--muted)", marginLeft: 8 }}>{meal.time}</span></div>
                  <span className="bdg bdg-g">{meal.items.reduce((a, i) => a + (i.cal || 0), 0)} kcal</span>
                </div>
                <div className="meal-body">
                  {meal.items.map((item, ii) => (
                    <div key={ii} className="food-row">
                      <div><span style={{ fontWeight: 600 }}>{item.food}</span><span style={{ color: "var(--muted)", fontSize: 12, marginLeft: 6 }}>{item.amount}</span></div>
                      <div style={{ display: "flex", gap: 8, fontSize: 12, flexWrap: "wrap", justifyContent: "flex-end" }}>
                        <span style={{ color: "var(--purple)" }}>{item.protein}g P</span>
                        <span style={{ color: "var(--orange)" }}>{item.carbs}g C</span>
                        <span style={{ color: "var(--red)" }}>{item.fats}g F</span>
                        <span style={{ color: "#34d399" }}>{item.fiber || 0}g Fib</span>
                        <span style={{ color: "var(--green)", fontWeight: 700 }}>{item.cal} cal</span>
                      </div>
                    </div>
                  ))}
                </div>
                <MealTotals items={meal.items} />
              </div>
            ))}
          </div>
        )}

        {innerTab === "workout" && (
          <div className="card">
            <div className="card-title">💪 Workout Plan for {sel.name} <button className="btn btn-p btn-sm" onClick={() => setShowWorkoutEditor(true)}>✏️ Edit</button></div>
            <div className="alert alert-w">⚡ Add YouTube/video links so clients can watch exercise demos!</div>
            {(sel.workoutPlan || DEFAULT_WORKOUT).map((day, di) => (
              <div key={di} style={{ background: "var(--s2)", border: "1px solid var(--border)", borderRadius: 10, padding: 12, marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: day.type !== "Rest" ? 10 : 0 }}>
                  <div><span style={{ fontWeight: 700 }}>{day.day}</span><span className="bdg bdg-p" style={{ marginLeft: 8 }}>{day.type}</span></div>
                  {day.type !== "Rest" && <span style={{ fontSize: 12, color: "var(--muted)" }}>{day.exercises.length} exercises</span>}
                </div>
                {day.type !== "Rest" && day.exercises.map((ex, ei) => (
                  <div key={ei} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid var(--border)", fontSize: 13 }}>
                    <div>
                      <span>{ex.name}</span>
                      <span style={{ color: "var(--muted)", marginLeft: 8, fontSize: 12 }}>{ex.sets}×{ex.reps} · {ex.rest}</span>
                    </div>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      {ex.videoUrl ? <span className="bdg bdg-b">🎥 Video</span> : <span style={{ fontSize: 11, color: "var(--muted)" }}>No video</span>}
                      {ex.videoUrl && <button className="btn btn-s btn-xs" onClick={() => setVideoModal(ex)}>Watch</button>}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {innerTab === "phase" && (
          <div className="card">
            <div className="card-title">📋 Phase & Stats for {sel.name}</div>
            <div className="alert alert-w">⚡ All changes sync instantly!</div>
            <div className="fg">
              <div className="fld"><div className="fl">Phase</div>
                <select className="fsel" value={sel.phase} onChange={e => { update("phase", e.target.value); toast("Phase updated!", "success"); }}>
                  <option>Cut Phase 1</option><option>Cut Phase 2</option><option>Bulk Phase 1</option><option>Bulk Phase 2</option><option>Maintenance</option><option>Peak Week</option><option>Reverse Diet</option>
                </select>
              </div>
              <div className="fld"><div className="fl">Current Week</div><input className="fi" type="number" min="1" max="52" value={sel.week} onChange={e => update("week", parseInt(e.target.value) || 1)} /></div>
              <div className="fld">
                <div className="fl">Body Fat % (coach update)</div>
                <NumInput value={sel.bodyFat || 0} color="var(--orange)" onChange={v => { update("bodyFat", v); toast("Body fat updated!", "success"); }} />
              </div>
              <div className="fld">
                <div className="fl">Starting Weight (kg)</div>
                <input className="fi" type="number" step="0.1" defaultValue={sel.weight || ""} placeholder="86" onBlur={e => update("weight", parseFloat(e.target.value) || null)} />
              </div>
            </div>
          </div>
        )}

        {showWorkoutEditor && <WorkoutEditor plan={sel.workoutPlan || DEFAULT_WORKOUT} onSave={saveWorkout} onClose={() => setShowWorkoutEditor(false)} />}
        {showMealEditor && <MealEditor plan={sel.mealPlan || DEFAULT_MEALS} onSave={saveMeals} onClose={() => setShowMealEditor(false)} />}
        {videoModal && <VideoModal url={videoModal.videoUrl} name={videoModal.name} onClose={() => setVideoModal(null)} />}
        {viewMedia && (
          <div className="ov" onClick={() => setViewMedia(null)}>
            <div style={{ maxWidth: 520, width: "100%" }}>
              {viewMedia.type === "video" ? <video src={viewMedia.data} controls style={{ width: "100%", borderRadius: 16 }} /> : <img src={viewMedia.data} alt="" style={{ width: "100%", borderRadius: 16 }} />}
              <div style={{ textAlign: "center", marginTop: 10, color: "var(--muted2)", fontSize: 13 }}>{sel.name} · {viewMedia.date}</div>
              <div style={{ textAlign: "center", marginTop: 8 }}><button className="btn btn-s btn-sm" onClick={() => setViewMedia(null)}>Close</button></div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (tab === "clients") return (
    <div className="page">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div><div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 22, fontWeight: 800 }}>👥 My Clients</div><div style={{ color: "var(--muted)", fontSize: 13, marginTop: 3 }}>{clients.length} active</div></div>
        <button className="btn btn-p" onClick={() => setShowAdd(true)}>+ Add Client</button>
      </div>
      {clients.length === 0
        ? <div className="card"><div className="empty"><div className="empty-icon">👤</div><div className="empty-title">No clients yet</div><button className="btn btn-p" onClick={() => setShowAdd(true)}>+ Add Client</button></div></div>
        : <div className="card">
          <table className="tbl">
            <thead><tr><th>Client</th><th>Phase</th><th>Weight</th><th>Check-ins</th><th>Media</th><th>Actions</th></tr></thead>
            <tbody>
              {clients.map(c => (
                <tr key={c.id}>
                  <td><div style={{ display: "flex", alignItems: "center", gap: 9 }}><div className="av av-sm av-g">{c.avatar}</div><div><div style={{ fontWeight: 600 }}>{c.name}</div><div style={{ fontSize: 11, color: "var(--muted)" }}>{c.email}</div></div></div></td>
                  <td><span className="bdg bdg-g">{c.phase}</span></td>
                  <td style={{ fontWeight: 600 }}>{c.weight ? c.weight + "kg" : "—"}</td>
                  <td><span className="bdg bdg-p">{(c.checkIns || []).length}</span></td>
                  <td><span className="bdg bdg-o">{(c.photos || []).length}</span></td>
                  <td><div style={{ display: "flex", gap: 5 }}>
                    <button className="btn btn-s btn-sm" onClick={() => { setSelId(c.id); setInnerTab("overview"); }}>View</button>
                    <button className="btn btn-s btn-sm" onClick={() => { setSelId(c.id); setInnerTab("checkins"); }}>📋</button>
                    <button className="btn btn-s btn-sm" onClick={() => { setSelId(c.id); setInnerTab("comparison"); }}>🔄</button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>}

      {showAdd && (
        <div className="ov" onClick={e => e.target === e.currentTarget && setShowAdd(false)}>
          <div className="modal">
            <div className="mh"><div><div className="mt">➕ Add New Client</div><div className="ms">Creates login — share via WhatsApp</div></div><button className="xbtn" onClick={() => setShowAdd(false)}>✕</button></div>
            <div className="mb2">
              <div className="sec-lbl">Client Info</div>
              <div className="fg">
                <div className="fld"><div className="fl">Full Name *</div><input className="fi" placeholder="Rahul Kumar" value={nc.name} onChange={e => setNc(p => ({ ...p, name: e.target.value }))} /></div>
                <div className="fld"><div className="fl">Phone</div><input className="fi" placeholder="+91 98765 43210" value={nc.phone} onChange={e => setNc(p => ({ ...p, phone: e.target.value }))} /></div>
              </div>
              <div className="sec-lbl">Login Credentials</div>
              <div className="fg">
                <div className="fld"><div className="fl">Email *</div><input className="fi" type="email" placeholder="rahul@gmail.com" value={nc.email} onChange={e => setNc(p => ({ ...p, email: e.target.value }))} /></div>
                <div className="fld"><div className="fl">Password *</div><input className="fi" type="text" placeholder="min 6 chars" value={nc.password} onChange={e => setNc(p => ({ ...p, password: e.target.value }))} /></div>
              </div>
              <div className="alert alert-b">📲 Share app URL + email + password via WhatsApp!</div>
              <div className="sec-lbl">Program</div>
              <div className="fg">
                <div className="fld"><div className="fl">Phase</div><select className="fsel" value={nc.phase} onChange={e => setNc(p => ({ ...p, phase: e.target.value }))}><option>Cut Phase 1</option><option>Cut Phase 2</option><option>Bulk Phase 1</option><option>Bulk Phase 2</option><option>Maintenance</option><option>Peak Week</option></select></div>
                <div className="fld"><div className="fl">Week</div><input className="fi" type="number" min="1" value={nc.week} onChange={e => setNc(p => ({ ...p, week: e.target.value }))} /></div>
              </div>
              <div className="sec-lbl">Starting Macros</div>
              <div className="fg">
                {[["Calories", "calories", "var(--green)"], ["Protein (g)", "protein", "var(--purple)"], ["Carbs (g)", "carbs", "var(--orange)"], ["Fats (g)", "fats", "var(--red)"], ["Fiber (g)", "fiber", "#34d399"]].map(([l, k, co]) => (
                  <div key={k} className="fld"><div className="fl" style={{ color: co }}>{l}</div><NumInput value={nc[k]} color={co} onChange={v => setNc(p => ({ ...p, [k]: v }))} /></div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button className="btn btn-p" style={{ flex: 1 }} onClick={addClient} disabled={addSaving}>{addSaving ? "Creating..." : "✅ Create Client Account"}</button>
                <button className="btn btn-s" onClick={() => setShowAdd(false)}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="page">
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 26, fontWeight: 800 }}>Welcome, {coachName?.split(" ")[0] || "Coach"} 👋</div>
        <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 5 }}>{clients.length} client{clients.length !== 1 ? "s" : ""} · CoachOS</div>
      </div>
      <div className="g4" style={{ marginBottom: 24 }}>
        {[["Total Clients", clients.length, "var(--green)"], ["Total Check-ins", clients.reduce((a, c) => a + (c.checkIns || []).length, 0), "var(--blue)"], ["Media Uploaded", clients.reduce((a, c) => a + (c.photos || []).length, 0), "var(--purple)"], ["Need Attention", clients.filter(c => !c.coachMessage).length, "var(--orange)"]].map(([l, v, co]) => (
          <div key={l} className="mc"><div className="mc-val" style={{ color: co }}>{v}</div><div className="mc-label">{l}</div></div>
        ))}
      </div>
      {clients.length === 0
        ? <div className="card"><div className="empty"><div className="empty-icon">🚀</div><div className="empty-title">You're all set!</div><div className="empty-desc">Add your first client to get started.</div><button className="btn btn-p" style={{ padding: "11px 24px" }} onClick={() => setTab("clients")}>+ Add First Client</button></div></div>
        : <>
          <div className="sh"><div className="sh-title">👥 Clients</div><button className="sh-link" onClick={() => setTab("clients")}>Manage all →</button></div>
          <div className="ga">
            {clients.map(c => (
              <div key={c.id} className="cl-card" onClick={() => { setTab("clients"); setSelId(c.id); setInnerTab("overview"); }}>
                <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 12 }}>
                  <div className="av av-md av-g">{c.avatar}</div>
                  <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 700, fontSize: 14 }}>{c.name}</div><div style={{ fontSize: 11, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.email}</div></div>
                  <span className="bdg bdg-g">W{c.week}</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
                  <div style={{ padding: "8px 10px", background: "var(--s2)", borderRadius: 9, border: "1px solid var(--border)" }}><div style={{ fontSize: 13, fontWeight: 700, color: "var(--green)", fontFamily: "'Outfit',sans-serif" }}>{c.weight ? c.weight + "kg" : "—"}</div><div style={{ fontSize: 10, color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", marginTop: 2 }}>Weight</div></div>
                  <div style={{ padding: "8px 10px", background: "var(--s2)", borderRadius: 9, border: "1px solid var(--border)" }}><div style={{ fontSize: 13, fontWeight: 700, color: "var(--purple)", fontFamily: "'Outfit',sans-serif" }}>{(c.checkIns || []).length} logs</div><div style={{ fontSize: 10, color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", marginTop: 2 }}>Check-ins</div></div>
                </div>
                <div style={{ padding: "7px 10px", background: c.coachMessage ? "var(--green-bg)" : "rgba(251,191,36,.08)", borderRadius: 8, fontSize: 11, color: c.coachMessage ? "var(--green)" : "var(--yellow)", fontWeight: 600, border: "1px solid " + (c.coachMessage ? "var(--green-b)" : "rgba(251,191,36,.2)") }}>
                  {c.coachMessage ? "✓ Message sent" : "⚠ No message yet"}
                </div>
              </div>
            ))}
          </div>
        </>}
    </div>
  );
}

// ─── AUTH ──────────────────────────────────────────────────────────────────
function LoginScreen({ onLogin, onSetup, coachExists }) {
  const [em, setEm] = useState(""); const [pw, setPw] = useState(""); const [err, setErr] = useState(""); const [ld, setLd] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEm, setForgotEm] = useState(""); const [forgotSent, setForgotSent] = useState(false); const [forgotLd, setForgotLd] = useState(false);

  const login = async () => {
    setErr(""); setLd(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, em.trim(), pw);
      const uid = cred.user.uid;
      const uSnap = await getDoc(doc(db, "users", uid));
      if (uSnap.exists()) { window._cp = pw; onLogin({ uid, email: em.trim(), ...uSnap.data() }); return; }
      const cSnap = await getDoc(doc(db, "clients", uid));
      if (cSnap.exists()) { onLogin({ uid, email: em.trim(), role: "client", ...cSnap.data() }); return; }
      setErr("Account not found. Contact your coach.");
    } catch (e) {
      setErr(e.code === "auth/invalid-credential" || e.code === "auth/wrong-password" ? "Incorrect email or password." : e.message);
    }
    setLd(false);
  };

  const sendReset = async () => {
    if (!forgotEm) return;
    setForgotLd(true);
    try {
      await sendPasswordResetEmail(auth, forgotEm.trim());
      setForgotSent(true);
    } catch (e) {
      setErr("Could not send reset email. Check the email address.");
    }
    setForgotLd(false);
  };

  if (showForgot) return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-logo">🔑</div>
        <div className="auth-title">Reset Password</div>
        <div className="auth-sub">Enter your email to receive a reset link</div>
        {forgotSent ? (
          <div className="alert alert-g" style={{ textAlign: "center", padding: 20 }}>
            ✅ Reset email sent!<br />Check your inbox and click the link to reset your password.
            <div style={{ marginTop: 14 }}><button className="btn btn-s" onClick={() => { setShowForgot(false); setForgotSent(false); setForgotEm(""); }}>← Back to Login</button></div>
          </div>
        ) : (
          <>
            <div className="fld"><div className="fl">Your Email</div><input className="fi" type="email" placeholder="your@email.com" value={forgotEm} onChange={e => setForgotEm(e.target.value)} onKeyDown={e => e.key === "Enter" && sendReset()} /></div>
            {err && <div className="alert alert-e">{err}</div>}
            <button className="auth-btn" onClick={sendReset} disabled={forgotLd || !forgotEm}>{forgotLd ? "Sending..." : "Send Reset Email →"}</button>
            <div className="auth-switch"><button onClick={() => setShowForgot(false)}>← Back to Login</button></div>
          </>
        )}
      </div>
    </div>
  );

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-logo">CO</div>
        <div className="auth-title">CoachOS</div>
        <div className="auth-sub">Sign in to your coaching platform</div>
        <div className="fld"><div className="fl">Email</div><input className="fi" type="email" placeholder="your@email.com" value={em} onChange={e => setEm(e.target.value)} onKeyDown={e => e.key === "Enter" && login()} /></div>
        <div className="fld">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <span className="fl" style={{ margin: 0 }}>Password</span>
            <button className="forgot-btn" onClick={() => setShowForgot(true)}>Forgot password?</button>
          </div>
          <input className="fi" type="password" placeholder="••••••••" value={pw} onChange={e => setPw(e.target.value)} onKeyDown={e => e.key === "Enter" && login()} />
        </div>
        {err && <div className="alert alert-e">{err}</div>}
        <button className="auth-btn" onClick={login} disabled={ld}>{ld ? "Signing in..." : "Sign In →"}</button>
        <div style={{ textAlign: "center", marginTop: 14 }}>
          <button className="forgot-btn" style={{ fontSize: 13, color: "var(--muted2)" }} onClick={() => setShowForgot(true)}>🔑 Forgot your password?</button>
        </div>
        {!coachExists && <div className="auth-switch">First time? <button onClick={onSetup}>Create coach account</button></div>}
        {coachExists && <div style={{ textAlign: "center", marginTop: 14, fontSize: 11, color: "var(--muted)", padding: 10, background: "var(--s2)", borderRadius: 10, border: "1px solid var(--border)" }}>🔒 Contact your coach for login credentials.</div>}
      </div>
    </div>
  );
}

function SetupScreen({ onDone }) {
  const [f, setF] = useState({ name: "", email: "", pass: "" }); const [err, setErr] = useState(""); const [ld, setLd] = useState(false);
  const create = async () => {
    if (!f.name || !f.email || !f.pass) { setErr("All fields required"); return; }
    if (f.pass.length < 6) { setErr("Password needs 6+ characters"); return; }
    setErr(""); setLd(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, f.email.trim(), f.pass);
      await setDoc(doc(db, "users", cred.user.uid), { name: f.name.trim(), email: f.email.trim().toLowerCase(), role: "coach", createdAt: serverTimestamp() });
      await setDoc(doc(db, "settings", "app"), { coachExists: true, coachEmail: f.email.trim().toLowerCase(), setupDate: serverTimestamp() });
      window._cp = f.pass;
      onDone({ uid: cred.user.uid, email: f.email.trim(), role: "coach", name: f.name.trim() });
    } catch (e) {
      setErr(e.code === "auth/email-already-in-use" ? "Email already registered." : e.message);
    }
    setLd(false);
  };
  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-logo">CO</div>
        <div className="auth-title">Setup CoachOS</div>
        <div className="auth-sub">Create your coach account — one time only</div>
        <div className="fld"><div className="fl">Full Name</div><input className="fi" placeholder="Coach Ankit Ingle" value={f.name} onChange={e => setF(p => ({ ...p, name: e.target.value }))} /></div>
        <div className="fld"><div className="fl">Email</div><input className="fi" type="email" placeholder="coach@email.com" value={f.email} onChange={e => setF(p => ({ ...p, email: e.target.value }))} /></div>
        <div className="fld"><div className="fl">Password</div><input className="fi" type="password" placeholder="min 6 characters" value={f.pass} onChange={e => setF(p => ({ ...p, pass: e.target.value }))} onKeyDown={e => e.key === "Enter" && create()} /></div>
        {err && <div className="alert alert-e">{err}</div>}
        <button className="auth-btn" onClick={create} disabled={ld}>{ld ? "Creating..." : "Create Coach Account →"}</button>
        <div style={{ textAlign: "center", marginTop: 14, fontSize: 11, color: "var(--muted)" }}>⚠️ After this, no one else can create a coach account.</div>
      </div>
    </div>
  );
}

export default function App() {
  const { t, show } = useToast();
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [coachExists, setCoachExists] = useState(false);
  const [screen, setScreen] = useState("login");
  const [tab, setTab] = useState("home");

  useEffect(() => {
    const check = async () => {
      try {
        const s = await getDoc(doc(db, "settings", "app"));
        if (s.exists() && s.data().coachExists) setCoachExists(true);
      } catch (e) {}
    };
    check();
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async fu => {
      if (fu) {
        const uSnap = await getDoc(doc(db, "users", fu.uid));
        if (uSnap.exists()) { setUser({ uid: fu.uid, email: fu.email, ...uSnap.data() }); setAuthLoading(false); return; }
        const cSnap = await getDoc(doc(db, "clients", fu.uid));
        if (cSnap.exists()) { setUser({ uid: fu.uid, email: fu.email, role: "client", ...cSnap.data() }); setAuthLoading(false); return; }
        await signOut(auth); setUser(null);
      } else { setUser(null); }
      setAuthLoading(false);
    });
    return unsub;
  }, []);

  const logout = async () => { await signOut(auth); setUser(null); setTab("home"); };

  if (authLoading) return <div style={{ background: "var(--bg)" }}><style>{CSS}</style><div className="spin-wrap" style={{ minHeight: "100vh" }}><div className="spinner" /><span>Loading CoachOS...</span></div></div>;

  if (!user) return (
    <div><style>{CSS}</style>
      {screen === "setup" ? <SetupScreen onDone={u => { setUser(u); setCoachExists(true); }} /> : <LoginScreen onLogin={setUser} onSetup={() => setScreen("setup")} coachExists={coachExists} />}
      {t && <div className={t.type === "error" ? "toast toast-e" : "toast toast-s"}>{t.msg}</div>}
    </div>
  );

  const isCoach = user.role === "coach";
  const tabs = isCoach
    ? [["home", "🏠 Dashboard"], ["clients", "👥 Clients"], ["analytics", "📊 Analytics"]]
    : [["home", "🏠 Home"], ["nutrition", "🥩 Nutrition"], ["training", "🏋️ Training"], ["photos", "📸 Photos"], ["comparison", "🔄 Compare"]];

  return (
    <div style={{ minHeight: "100vh" }}>
      <style>{CSS}</style>
      <nav className="nav">
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <button className="nav-logo" onClick={() => setTab("home")}>
            <div className="nav-icon">CO</div>
            <span className="nav-brand">CoachOS</span>
          </button>
          <div className="nav-tabs">
            {tabs.map(([k, l]) => <button key={k} className={tab === k ? "nav-tab active" : "nav-tab"} onClick={() => setTab(k)}>{l}</button>)}
          </div>
        </div>
        <div className="nav-right">
          <div className="nav-av">{(user.name || user.email || "U").slice(0, 2).toUpperCase()}</div>
          <div><div style={{ fontSize: 12, fontWeight: 600 }}>{user.name || user.email}</div><div style={{ fontSize: 10, color: isCoach ? "var(--green)" : "var(--purple)", fontWeight: 600, textTransform: "capitalize" }}>{user.role}</div></div>
          <button className="signout" onClick={logout}>Sign out</button>
        </div>
      </nav>
      <div style={{ flex: 1 }}>
        {isCoach
          ? <CoachDash coachUid={user.uid} coachEmail={user.email} coachName={user.name} tab={tab} setTab={setTab} toast={show} />
          : <ClientDash uid={user.uid} tab={tab} setTab={setTab} toast={show} />}
      </div>
      {t && <div className={t.type === "error" ? "toast toast-e" : "toast toast-s"}>{t.msg}</div>}
    </div>
  );
}
