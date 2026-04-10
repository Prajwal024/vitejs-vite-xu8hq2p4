import { useState, useEffect, useRef, useCallback } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, sendPasswordResetEmail } from "firebase/auth";
import { getFirestore, doc, getDoc, setDoc, updateDoc, onSnapshot, collection, query, where, serverTimestamp, addDoc, orderBy, getDocs, deleteDoc } from "firebase/firestore";

// ─── FIREBASE ─────────────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyB5ADQ3FcX7XAvIwTOHeos1yBdy9KZ1H4Q",
  authDomain: "coachos2.firebaseapp.com",
  projectId: "coachos2",
  storageBucket: "coachos2.firebasestorage.app",
  messagingSenderId: "1071969610884",
  appId: "1:1071969610884:web:b03058771978d1160c26d1",
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ─── CLOUDINARY ───────────────────────────────────────────────────────────────
const CLOUDINARY_CLOUD_NAME = "dputo3zsh";
const CLOUDINARY_UPLOAD_PRESET = "coachkit_upload";
async function cloudinaryUpload(file, onProgress) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  formData.append("folder", "fitwithankit");
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`);
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100)); };
    xhr.onload = () => { if (xhr.status === 200) resolve(JSON.parse(xhr.responseText)); else reject(new Error("Upload failed")); };
    xhr.onerror = () => reject(new Error("Network error"));
    xhr.send(formData);
  });
}

// ─── DAY COLORS ───────────────────────────────────────────────────────────────
const DAY_COLORS = [
  { bg: "rgba(34,197,94,.08)", border: "rgba(34,197,94,.4)", accent: "#22c55e", label: "MON" },
  { bg: "rgba(59,130,246,.08)", border: "rgba(59,130,246,.4)", accent: "#3b82f6", label: "TUE" },
  { bg: "rgba(167,139,250,.08)", border: "rgba(167,139,250,.4)", accent: "#a78bfa", label: "WED" },
  { bg: "rgba(251,146,60,.08)", border: "rgba(251,146,60,.4)", accent: "#fb923c", label: "THU" },
  { bg: "rgba(248,113,113,.08)", border: "rgba(248,113,113,.4)", accent: "#f87171", label: "FRI" },
  { bg: "rgba(251,191,36,.08)", border: "rgba(251,191,36,.4)", accent: "#fbbf24", label: "SAT" },
  { bg: "rgba(20,184,166,.08)", border: "rgba(20,184,166,.4)", accent: "#14b8a6", label: "SUN" },
];

// ─── DEFAULT DATA ─────────────────────────────────────────────────────────────
const DEFAULT_WORKOUT = [
  { day: "Monday", type: "Push", exercises: [{ name: "Bench Press", sets: 4, reps: "8-10", rest: "90s", videoUrl: "", note: "" }, { name: "Overhead Press", sets: 3, reps: "10-12", rest: "75s", videoUrl: "", note: "" }, { name: "Tricep Pushdowns", sets: 3, reps: "12-15", rest: "60s", videoUrl: "", note: "" }] },
  { day: "Tuesday", type: "Pull", exercises: [{ name: "Pull-ups", sets: 4, reps: "8-10", rest: "90s", videoUrl: "", note: "" }, { name: "Barbell Row", sets: 4, reps: "8-10", rest: "90s", videoUrl: "", note: "" }, { name: "Hammer Curls", sets: 3, reps: "12-15", rest: "60s", videoUrl: "", note: "" }] },
  { day: "Wednesday", type: "Rest", exercises: [] },
  { day: "Thursday", type: "Legs", exercises: [{ name: "Back Squat", sets: 4, reps: "6-8", rest: "120s", videoUrl: "", note: "" }, { name: "Romanian DL", sets: 4, reps: "8-10", rest: "90s", videoUrl: "", note: "" }, { name: "Leg Curl", sets: 3, reps: "12-15", rest: "60s", videoUrl: "", note: "" }] },
  { day: "Friday", type: "Push", exercises: [{ name: "Incline DB Press", sets: 4, reps: "10-12", rest: "90s", videoUrl: "", note: "" }, { name: "Lateral Raises", sets: 4, reps: "15-20", rest: "45s", videoUrl: "", note: "" }] },
  { day: "Saturday", type: "Pull", exercises: [{ name: "Deadlift", sets: 4, reps: "4-6", rest: "120s", videoUrl: "", note: "" }, { name: "Cable Row", sets: 3, reps: "10-12", rest: "75s", videoUrl: "", note: "" }] },
  { day: "Sunday", type: "Rest", exercises: [] },
];
const DEFAULT_MEALS = [
  { name: "Breakfast", time: "7:00 AM", items: [{ food: "Oats", amount: "80g", protein: 10, carbs: 54, fats: 5, fiber: 8, cal: 300 }, { food: "Banana", amount: "1 medium", protein: 1, carbs: 27, fats: 0, fiber: 3, cal: 105 }, { food: "Whey Protein", amount: "1 scoop", protein: 25, carbs: 3, fats: 2, fiber: 0, cal: 130 }] },
  { name: "Lunch", time: "1:00 PM", items: [{ food: "Chicken Breast", amount: "200g", protein: 46, carbs: 0, fats: 4, fiber: 0, cal: 220 }, { food: "Brown Rice", amount: "150g", protein: 4, carbs: 47, fats: 1, fiber: 3, cal: 210 }, { food: "Broccoli", amount: "100g", protein: 3, carbs: 7, fats: 0, fiber: 5, cal: 35 }] },
  { name: "Pre-Workout", time: "5:00 PM", items: [{ food: "Banana", amount: "1 large", protein: 1, carbs: 31, fats: 0, fiber: 3, cal: 120 }, { food: "Peanut Butter", amount: "2 tbsp", protein: 8, carbs: 6, fats: 16, fiber: 2, cal: 190 }] },
  { name: "Dinner", time: "8:00 PM", items: [{ food: "Eggs", amount: "4 whole", protein: 24, carbs: 2, fats: 20, fiber: 0, cal: 280 }, { food: "Sweet Potato", amount: "200g", protein: 3, carbs: 40, fats: 0, fiber: 6, cal: 172 }] },
];

// ─── CSS ──────────────────────────────────────────────────────────────────────
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
@keyframes splashBg{0%{opacity:0}100%{opacity:1}}
@keyframes splashLogo{0%{opacity:0;transform:scale(.4) rotate(-10deg)}60%{transform:scale(1.1) rotate(2deg)}100%{opacity:1;transform:scale(1) rotate(0deg)}}
@keyframes splashText{0%{opacity:0;transform:translateY(30px)}100%{opacity:1;transform:translateY(0)}}
@keyframes splashFadeOut{0%{opacity:1;transform:scale(1)}100%{opacity:0;transform:scale(1.04)}}
@keyframes splashTagline{0%{opacity:0;letter-spacing:.3em}100%{opacity:.7;letter-spacing:.15em}}
@keyframes splashBar{0%{width:0}100%{width:100%}}
@keyframes fadeUp{from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:none}}
@keyframes fadeDown{from{opacity:0;transform:translateY(-18px)}to{opacity:1;transform:none}}
@keyframes slideRight{from{opacity:0;transform:translateX(-20px)}to{opacity:1;transform:none}}
@keyframes bounceIn{0%{opacity:0;transform:scale(.75)}60%{transform:scale(1.05)}80%{transform:scale(.97)}100%{opacity:1;transform:scale(1)}}
@keyframes scaleIn{from{opacity:0;transform:scale(.92)}to{opacity:1;transform:scale(1)}}
@keyframes flashBorder{0%,40%{border-color:var(--green);box-shadow:0 0 0 2px rgba(34,197,94,.2)}100%{border-color:var(--border);box-shadow:none}}
@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
@keyframes glowPulse{0%,100%{box-shadow:0 0 0 0 rgba(34,197,94,.4)}50%{box-shadow:0 0 0 8px rgba(34,197,94,0)}}
@keyframes ringPulse{0%,100%{box-shadow:0 0 0 0 rgba(34,197,94,.5)}50%{box-shadow:0 0 0 5px rgba(34,197,94,0)}}
@keyframes shimmer{0%{background-position:-200% center}100%{background-position:200% center}}
@keyframes sp{to{transform:rotate(360deg)}}
@keyframes sp2{to{transform:rotate(360deg)}}
@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(.8)}}
@keyframes countUp{from{opacity:0;transform:scale(.8)}to{opacity:1;transform:scale(1)}}
@keyframes cardEntrance{from{opacity:0;transform:translateY(24px) scale(.97)}to{opacity:1;transform:none}}
@keyframes dayPop{0%{opacity:0;transform:scale(.9) translateY(10px)}100%{opacity:1;transform:scale(1) translateY(0)}}
@keyframes slideInRight{from{opacity:0;transform:translateX(40px)}to{opacity:1;transform:none}}
@keyframes slideInLeft{from{opacity:0;transform:translateX(-40px)}to{opacity:1;transform:none}}
@keyframes msgPop{from{opacity:0;transform:translateY(12px) scale(.95)}to{opacity:1;transform:none}}

.splash{position:fixed;inset:0;z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;background:radial-gradient(ellipse at 40% 30%,rgba(34,197,94,.12) 0%,transparent 55%),#080d1a;animation:splashBg .4s ease forwards}
.splash.exit{animation:splashFadeOut .5s ease forwards;pointer-events:none}
.splash-logo{width:80px;height:80px;border-radius:22px;background:linear-gradient(135deg,#22c55e,#16a34a);display:flex;align-items:center;justify-content:center;font-family:'Outfit',sans-serif;font-weight:900;font-size:26px;color:#fff;margin-bottom:24px;box-shadow:0 16px 48px rgba(34,197,94,.4);animation:splashLogo .7s cubic-bezier(.34,1.56,.64,1) forwards}
.splash-title{font-family:'Outfit',sans-serif;font-weight:900;font-size:clamp(28px,6vw,42px);color:#fff;text-align:center;opacity:0;animation:splashText .6s ease .5s forwards}
.splash-title span{color:var(--green)}
.splash-tagline{font-size:13px;font-weight:600;color:var(--muted2);letter-spacing:.15em;text-transform:uppercase;margin-top:10px;opacity:0;animation:splashTagline .8s ease .9s forwards}
.splash-bar-wrap{width:200px;height:3px;background:var(--s3);border-radius:2px;margin-top:40px;overflow:hidden;opacity:0;animation:fadeUp .4s ease 1s forwards}
.splash-bar{height:100%;background:linear-gradient(90deg,var(--green),#a78bfa,var(--green));background-size:200% auto;border-radius:2px;animation:splashBar 1.4s cubic-bezier(.4,0,.2,1) 1.1s forwards}
.splash-dots{display:flex;gap:8px;margin-top:18px;opacity:0;animation:fadeUp .4s ease 1.2s forwards}
.splash-dot{width:6px;height:6px;border-radius:50%;background:var(--green);animation:pulse 1.2s ease infinite}
.splash-dot:nth-child(2){animation-delay:.2s;background:var(--purple)}
.splash-dot:nth-child(3){animation-delay:.4s;background:var(--blue)}

.nav{background:rgba(8,13,26,.95);backdrop-filter:blur(16px);border-bottom:1px solid var(--border);padding:0 20px;height:58px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:100}
.nav-logo{display:flex;align-items:center;gap:9px;cursor:pointer;border:none;background:none}
.nav-icon{width:34px;height:34px;border-radius:10px;background:linear-gradient(135deg,#22c55e,#16a34a);display:flex;align-items:center;justify-content:center;font-family:'Outfit',sans-serif;font-weight:900;font-size:11px;color:#fff;transition:transform .2s}
.nav-brand{font-family:'Outfit',sans-serif;font-weight:800;font-size:16px;color:var(--text)}
.nav-brand span{color:var(--green)}
.nav-tabs{display:flex;gap:2px}
.nav-tab{padding:6px 13px;border-radius:8px;border:none;background:transparent;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:500;color:var(--muted);transition:all .18s}
.nav-tab:hover{background:var(--s2);color:var(--text)}
.nav-tab.active{background:var(--green-bg);color:var(--green);border:1px solid var(--green-b)}
.nav-right{display:flex;align-items:center;gap:10px}
.nav-av{width:32px;height:32px;border-radius:50%;background:var(--green-bg);border:1.5px solid var(--green-b);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:11px;color:var(--green);font-family:'Outfit',sans-serif}
.signout{padding:5px 12px;border-radius:8px;border:1px solid var(--border);background:transparent;cursor:pointer;font-size:12px;font-weight:500;color:var(--muted);transition:all .15s}
.signout:hover{border-color:var(--red);color:var(--red)}

.page{max-width:960px;margin:0 auto;padding:24px 16px 48px;animation:fadeUp .4s ease forwards}
.fullpage{max-width:1100px;margin:0 auto;padding:24px 16px 48px;animation:fadeUp .4s ease forwards}
.card{background:var(--s1);border:1px solid var(--border);border-radius:var(--r);padding:18px;box-shadow:var(--sh);transition:transform .2s,box-shadow .2s,border-color .2s;animation:cardEntrance .4s ease forwards}
.card:hover{transform:translateY(-2px);box-shadow:0 8px 32px rgba(0,0,0,.5);border-color:var(--border2)}
.card-title{font-family:'Outfit',sans-serif;font-weight:700;font-size:15px;margin-bottom:14px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px}
.g4{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
.g3{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
.g2{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.ga{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:14px}
.fg{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.stagger-1{animation:cardEntrance .4s ease .05s both}
.stagger-2{animation:cardEntrance .4s ease .1s both}
.stagger-3{animation:cardEntrance .4s ease .15s both}
.stagger-4{animation:cardEntrance .4s ease .2s both}
.stagger-5{animation:cardEntrance .4s ease .25s both}
.mc{background:var(--s1);border:1px solid var(--border);border-radius:var(--r);padding:16px;transition:transform .18s,box-shadow .18s;animation:bounceIn .5s ease both}
.mc:hover{transform:translateY(-3px) scale(1.02);box-shadow:0 8px 24px rgba(0,0,0,.4)}
.mc.flash{animation:flashBorder 2.5s ease forwards}
.mc-val{font-family:'Outfit',sans-serif;font-size:28px;font-weight:800;line-height:1}
.mc-label{font-size:10px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;margin-top:5px}
.btn{display:inline-flex;align-items:center;gap:6px;padding:9px 16px;border-radius:var(--r);border:none;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:600;transition:all .18s;white-space:nowrap}
.btn-p{background:linear-gradient(135deg,#22c55e,#16a34a);color:#fff;box-shadow:0 4px 14px rgba(34,197,94,.3)}
.btn-p:hover{transform:translateY(-2px);box-shadow:0 6px 20px rgba(34,197,94,.4)}
.btn-p:disabled{opacity:.5;cursor:not-allowed;transform:none}
.btn-s{background:var(--s2);color:var(--text);border:1px solid var(--border2)}
.btn-s:hover{background:var(--s3);transform:translateY(-1px)}
.btn-d{background:rgba(248,113,113,.1);color:var(--red);border:1px solid rgba(248,113,113,.2)}
.btn-d:hover{background:rgba(248,113,113,.2);transform:translateY(-1px)}
.btn-warn{background:rgba(251,191,36,.1);color:var(--yellow);border:1px solid rgba(251,191,36,.25)}
.btn-warn:hover{background:rgba(251,191,36,.2)}
.btn-blue{background:rgba(59,130,246,.1);color:var(--blue);border:1px solid rgba(59,130,246,.25)}
.btn-blue:hover{background:rgba(59,130,246,.2)}
.btn-sm{padding:5px 10px;font-size:12px}
.btn-xs{padding:3px 8px;font-size:11px}
.fld{margin-bottom:12px}
.fl{display:block;font-size:11px;font-weight:700;color:var(--muted2);text-transform:uppercase;letter-spacing:.07em;margin-bottom:6px}
.fi{width:100%;padding:10px 14px;background:var(--s2);border:1.5px solid var(--border);border-radius:9px;color:var(--text);font-family:'DM Sans',sans-serif;font-size:14px;outline:none;transition:border .18s,box-shadow .18s}
.fi:focus{border-color:var(--green);box-shadow:0 0 0 3px rgba(34,197,94,.15)}
.fi::placeholder{color:var(--muted)}
.fsel{width:100%;padding:10px 14px;background:var(--s2);border:1.5px solid var(--border);border-radius:9px;color:var(--text);font-family:'DM Sans',sans-serif;font-size:13px;outline:none;transition:border .18s}
.fsel:focus{border-color:var(--green)}
.fta{width:100%;padding:10px 14px;background:var(--s2);border:1.5px solid var(--border);border-radius:9px;color:var(--text);font-family:'DM Sans',sans-serif;font-size:13px;outline:none;resize:vertical;min-height:70px;transition:border .18s}
.fta:focus{border-color:var(--green);box-shadow:0 0 0 3px rgba(34,197,94,.12)}
.num-input{display:flex;align-items:center;border:1.5px solid var(--border);border-radius:9px;overflow:hidden;background:var(--s2);transition:border .18s}
.num-input:focus-within{border-color:var(--green)}
.num-input input{flex:1;padding:10px 8px;background:transparent;border:none;color:var(--text);font-family:'Outfit',sans-serif;font-size:16px;font-weight:700;outline:none;text-align:center;min-width:0}
.num-btn{width:38px;height:42px;background:var(--s3);border:none;cursor:pointer;color:var(--text);font-size:18px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .15s}
.num-btn:hover{background:var(--green);color:#fff}
.tab-bar{display:flex;gap:3px;background:var(--s2);border-radius:10px;padding:3px;margin-bottom:18px;border:1px solid var(--border);flex-wrap:wrap}
.tab-item{flex:1;padding:7px 6px;border-radius:8px;border:none;background:transparent;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:12px;font-weight:600;color:var(--muted);transition:all .18s;min-width:70px;text-align:center}
.tab-item:hover{color:var(--text);background:rgba(255,255,255,.05)}
.tab-item.active{background:var(--s1);color:var(--text);box-shadow:0 1px 6px rgba(0,0,0,.3);animation:scaleIn .2s ease forwards}
.sh{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}
.sh-title{font-family:'Outfit',sans-serif;font-weight:700;font-size:16px}
.sh-link{font-size:12px;font-weight:600;color:var(--green);background:none;border:none;cursor:pointer;transition:all .15s}
.sh-link:hover{color:#86efac}
.ov{position:fixed;inset:0;background:rgba(0,0,0,.85);backdrop-filter:blur(8px);z-index:200;display:flex;align-items:center;justify-content:center;padding:16px;animation:splashBg .2s ease forwards}
.ov-full{position:fixed;inset:0;background:var(--bg);z-index:300;display:flex;flex-direction:column;overflow:hidden;animation:fadeUp .3s ease forwards}
.modal{background:var(--s1);border:1px solid var(--border2);border-radius:var(--r2);width:100%;max-width:640px;max-height:92vh;overflow-y:auto;box-shadow:var(--sh2);animation:bounceIn .35s cubic-bezier(.34,1.56,.64,1) forwards}
.modal-lg{max-width:900px}
.mh{padding:18px 22px 14px;border-bottom:1px solid var(--border);position:sticky;top:0;background:var(--s1);border-radius:var(--r2) var(--r2) 0 0;display:flex;align-items:flex-start;justify-content:space-between;z-index:10}
.mt{font-family:'Outfit',sans-serif;font-weight:800;font-size:18px}
.ms{font-size:12px;color:var(--muted);margin-top:2px}
.mb2{padding:18px 22px 22px}
.xbtn{width:28px;height:28px;border-radius:7px;background:var(--s2);border:1px solid var(--border);cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--muted);font-size:14px;flex-shrink:0;transition:all .2s}
.xbtn:hover{color:var(--red);transform:rotate(90deg);background:rgba(248,113,113,.1)}
.tbl{width:100%;border-collapse:collapse}
.tbl th{text-align:left;padding:8px 12px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--muted);border-bottom:1px solid var(--border)}
.tbl td{padding:11px 12px;font-size:13px;border-bottom:1px solid var(--border);vertical-align:middle}
.tbl tr:last-child td{border-bottom:none}
.tbl tr:hover td{background:rgba(255,255,255,.03)}
.bdg{display:inline-flex;padding:3px 9px;border-radius:20px;font-size:10px;font-weight:700}
.bdg-g{background:var(--green-bg);color:var(--green);border:1px solid var(--green-b)}
.bdg-p{background:rgba(167,139,250,.1);color:var(--purple);border:1px solid rgba(167,139,250,.25)}
.bdg-o{background:rgba(251,146,60,.1);color:var(--orange);border:1px solid rgba(251,146,60,.25)}
.bdg-r{background:rgba(248,113,113,.1);color:var(--red);border:1px solid rgba(248,113,113,.2)}
.bdg-b{background:rgba(59,130,246,.1);color:var(--blue);border:1px solid rgba(59,130,246,.25)}
.bdg-y{background:rgba(251,191,36,.1);color:var(--yellow);border:1px solid rgba(251,191,36,.25)}
.av{border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:'Outfit',sans-serif;font-weight:700;flex-shrink:0}
.av-sm{width:32px;height:32px;font-size:11px}
.av-md{width:38px;height:38px;font-size:13px}
.av-g{background:var(--green-bg);color:var(--green);border:1.5px solid var(--green-b)}
.alert{padding:11px 14px;border-radius:10px;font-size:12px;line-height:1.5;margin-bottom:14px}
.alert-w{background:rgba(251,191,36,.08);border:1px solid rgba(251,191,36,.2);color:#fcd34d}
.alert-g{background:var(--green-bg);border:1px solid var(--green-b);color:#86efac}
.alert-e{background:rgba(248,113,113,.08);border:1px solid rgba(248,113,113,.2);color:var(--red)}
.alert-b{background:rgba(59,130,246,.08);border:1px solid rgba(59,130,246,.2);color:#93c5fd}
.toast{position:fixed;bottom:22px;right:22px;padding:11px 16px;border-radius:10px;font-size:13px;font-weight:500;z-index:9999;box-shadow:var(--sh2);animation:bounceIn .35s cubic-bezier(.34,1.56,.64,1);max-width:320px;pointer-events:none}
.toast-s{background:#166534;border:1px solid #22c55e55;color:#bbf7d0}
.toast-e{background:#7f1d1d;border:1px solid #f8717155;color:#fecaca}
.auth-wrap{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px;background:radial-gradient(ellipse at 30% 20%,rgba(34,197,94,.06) 0%,transparent 60%),var(--bg)}
.auth-card{background:var(--s1);border:1px solid var(--border2);border-radius:22px;padding:36px;width:100%;max-width:400px;box-shadow:var(--sh2);animation:bounceIn .6s cubic-bezier(.34,1.56,.64,1) forwards}
.auth-logo{width:56px;height:56px;border-radius:16px;background:linear-gradient(135deg,#22c55e,#16a34a);display:flex;align-items:center;justify-content:center;font-family:'Outfit',sans-serif;font-weight:900;font-size:17px;color:#fff;margin:0 auto 14px;box-shadow:0 8px 24px rgba(34,197,94,.3);animation:float 3s ease infinite}
.auth-title{font-family:'Outfit',sans-serif;font-weight:800;font-size:24px;text-align:center;margin-bottom:4px}
.auth-sub{font-size:13px;color:var(--muted);text-align:center;margin-bottom:28px}
.auth-btn{width:100%;padding:13px;background:linear-gradient(135deg,#22c55e,#16a34a);color:#fff;border:none;border-radius:10px;font-family:'Outfit',sans-serif;font-weight:700;font-size:15px;cursor:pointer;margin-top:4px;box-shadow:0 4px 16px rgba(34,197,94,.25);transition:all .2s}
.auth-btn:hover{transform:translateY(-2px);box-shadow:0 6px 24px rgba(34,197,94,.4)}
.auth-btn:disabled{opacity:.5;cursor:not-allowed;transform:none}
.auth-switch{text-align:center;margin-top:16px;font-size:12px;color:var(--muted)}
.auth-switch button{background:none;border:none;cursor:pointer;color:var(--green);font-size:12px;font-weight:600}
.live{display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:600;color:var(--green)}
.dot{width:6px;height:6px;border-radius:50%;background:var(--green);flex-shrink:0;animation:pulse 1.4s ease infinite}
.phase{display:inline-flex;align-items:center;gap:5px;padding:4px 11px;border-radius:20px;font-size:12px;font-weight:600;background:var(--green-bg);color:var(--green);border:1px solid var(--green-b)}
.msg-b{background:var(--s2);border:1px solid var(--border);border-radius:12px;padding:13px 15px;font-size:13px;line-height:1.65;color:var(--muted2);white-space:pre-wrap}
.msg-b.has{background:var(--green-bg);border-color:var(--green-b);color:var(--text)}
.nbadge{display:inline-flex;padding:2px 7px;border-radius:20px;font-size:10px;font-weight:700;background:var(--green-bg);color:var(--green);border:1px solid var(--green-b);margin-left:8px}
.spin-wrap{display:flex;align-items:center;justify-content:center;min-height:300px;gap:10px;color:var(--muted);font-size:13px}
.spinner{width:20px;height:20px;border-radius:50%;border:2px solid var(--border);border-top-color:var(--green);animation:sp .7s linear infinite}
.spinner-lg{width:40px;height:40px;border-radius:50%;border:3px solid var(--border);border-top-color:var(--green);animation:sp2 .8s linear infinite}
.empty{text-align:center;padding:40px 24px;color:var(--muted)}
.empty-icon{font-size:44px;margin-bottom:12px;display:block;animation:float 3s ease infinite}
.empty-title{font-family:'Outfit',sans-serif;font-weight:700;font-size:17px;color:var(--text);margin-bottom:8px}
.empty-desc{font-size:13px;margin-bottom:20px}
.wk-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:10px}
.wk-card{border-radius:var(--r);padding:14px 8px;text-align:center;background:var(--s1);border:1px solid var(--border);cursor:pointer;transition:all .2s;animation:cardEntrance .4s ease both}
.wk-card:hover{transform:translateY(-4px) scale(1.03);border-color:var(--border2);box-shadow:0 8px 24px rgba(0,0,0,.4)}
.wk-card.rest{opacity:.45;cursor:default}.wk-card.rest:hover{transform:none;box-shadow:none}
.meal-card{background:var(--s2);border:1px solid var(--border);border-radius:12px;margin-bottom:14px;overflow:hidden;transition:border-color .2s}
.meal-head{padding:12px 16px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--border);background:var(--s3)}
.meal-body{padding:8px 16px 4px}
.meal-total{padding:10px 16px;background:rgba(34,197,94,.06);border-top:1px solid var(--green-b);display:flex;gap:12px;flex-wrap:wrap}
.food-row{display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);font-size:13px}
.food-row:last-child{border-bottom:none}
.ex-row{display:flex;align-items:flex-start;gap:10px;padding:12px 0;border-bottom:1px solid var(--border)}
.ex-row:last-child{border-bottom:none}
.ex-num{width:26px;height:26px;border-radius:6px;background:var(--s2);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:var(--muted);flex-shrink:0;margin-top:2px}
.cl-card{background:var(--s1);border:1px solid var(--border);border-radius:var(--r);padding:16px;cursor:pointer;transition:all .22s;animation:cardEntrance .45s ease both}
.cl-card:hover{border-color:var(--green-b);transform:translateY(-3px);box-shadow:0 8px 28px rgba(0,0,0,.4)}
.photo-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:10px}
.photo-item{border-radius:10px;overflow:hidden;aspect-ratio:3/4;position:relative;cursor:pointer;transition:transform .2s}
.photo-item:hover{transform:scale(1.03)}
.photo-item img,.photo-item video{width:100%;height:100%;object-fit:cover}
.photo-label{position:absolute;bottom:0;left:0;right:0;background:linear-gradient(transparent,rgba(0,0,0,.75));padding:14px 8px 8px;color:#fff;font-size:10px;font-weight:600}
.photo-del{position:absolute;top:6px;right:6px;background:rgba(248,113,113,.85);color:#fff;border:none;border-radius:6px;padding:3px 7px;font-size:10px;font-weight:700;cursor:pointer;display:none}
.photo-item:hover .photo-del{display:block}
.cmp-card{background:var(--s2);border:1px solid var(--border);border-radius:12px;overflow:hidden}
.cmp-head{padding:10px 14px;background:var(--s3);border-bottom:1px solid var(--border);font-weight:700;font-size:13px;text-align:center}
.cmp-body{padding:12px 14px}
.cmp-stat{display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--border);font-size:13px}
.cmp-stat:last-child{border-bottom:none}
.cmp-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:16px}
.upload-area{border:2px dashed var(--border2);border-radius:12px;padding:24px;text-align:center;cursor:pointer;background:var(--s2);transition:all .2s;display:block}
.upload-area:hover{border-color:var(--green);background:var(--green-bg)}
.note-box{background:rgba(251,191,36,.06);border:1px solid rgba(251,191,36,.2);border-radius:8px;padding:9px 12px;font-size:12px;color:#fcd34d;line-height:1.55;margin-top:6px;white-space:pre-wrap}
.prog-bar{height:4px;border-radius:2px;background:var(--border);overflow:hidden;margin-top:6px}
.prog-fill{height:100%;border-radius:2px;transition:width .8s cubic-bezier(.4,0,.2,1)}
.slider-wrap{margin-bottom:18px}
.slider-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}
.slider-label{font-size:13px;font-weight:600;color:var(--text)}
.slider-val{font-family:'Outfit',sans-serif;font-size:20px;font-weight:800;color:var(--green);min-width:28px;text-align:right}
.slider{-webkit-appearance:none;appearance:none;width:100%;height:6px;border-radius:3px;background:var(--s3);outline:none;cursor:pointer}
.slider::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:22px;height:22px;border-radius:50%;background:var(--green);cursor:pointer;box-shadow:0 0 0 3px rgba(34,197,94,.25)}
.slider::-moz-range-thumb{width:22px;height:22px;border-radius:50%;background:var(--green);cursor:pointer;border:none}
.section-hdr{font-family:'Outfit',sans-serif;font-weight:700;font-size:12px;color:var(--muted2);text-transform:uppercase;letter-spacing:.08em;margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid var(--border)}
.autosave{display:inline-flex;align-items:center;gap:5px;font-size:11px;color:var(--green);font-weight:600;opacity:0;transition:opacity .3s}
.autosave.show{opacity:1;animation:bounceIn .4s ease forwards}
.video-badge{position:absolute;top:6px;right:6px;background:rgba(0,0,0,.7);color:#fff;border-radius:6px;padding:2px 6px;font-size:10px;font-weight:700}
.sources-mini{background:var(--s3);border:1px solid var(--border);border-radius:10px;padding:12px 14px;margin-bottom:14px}
.sources-mini-title{font-size:11px;font-weight:700;color:var(--muted2);text-transform:uppercase;letter-spacing:.07em;margin-bottom:8px}
.sources-mini-row{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px}
.sources-mini-tag{padding:3px 9px;border-radius:20px;font-size:11px;font-weight:600;border:1px solid}
.sources-table-wrap{background:var(--s3);border:1px solid var(--border);border-radius:10px;padding:12px 14px;margin-bottom:16px}
.sources-table-title{font-size:11px;font-weight:700;color:var(--muted2);text-transform:uppercase;letter-spacing:.07em;margin-bottom:10px}
.sources-table{width:100%;border-collapse:collapse}
.sources-table th{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;padding:5px 8px;border-bottom:1px solid var(--border);text-align:left}
.sources-table td{font-size:12px;padding:5px 8px;border-bottom:1px solid var(--border)}
.sources-table tr:last-child td{border-bottom:none}
.sec-lbl{font-family:'Outfit',sans-serif;font-weight:700;font-size:12px;color:var(--muted2);text-transform:uppercase;letter-spacing:.08em;margin-bottom:10px;margin-top:4px}
.day-editor-card{border-radius:12px;padding:16px;margin-bottom:14px;border:2px solid;transition:box-shadow .2s;animation:dayPop .4s cubic-bezier(.34,1.56,.64,1) both}

/* CHAT */
.chat-wrap{display:flex;flex-direction:column;height:100%;background:var(--s1)}
.chat-msgs{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px}
.chat-msg{max-width:75%;padding:11px 14px;border-radius:16px;font-size:13px;line-height:1.55;animation:msgPop .25s ease forwards}
.chat-msg.mine{align-self:flex-end;background:linear-gradient(135deg,#22c55e,#16a34a);color:#fff;border-radius:16px 16px 4px 16px}
.chat-msg.theirs{align-self:flex-start;background:var(--s2);border:1px solid var(--border);color:var(--text);border-radius:16px 16px 16px 4px}
.chat-time{font-size:10px;opacity:.6;margin-top:4px}
.chat-input-row{padding:14px 16px;border-top:1px solid var(--border);display:flex;gap:10px;align-items:flex-end;background:var(--s1)}
.chat-input{flex:1;padding:11px 14px;background:var(--s2);border:1.5px solid var(--border);border-radius:12px;color:var(--text);font-family:'DM Sans',sans-serif;font-size:13px;outline:none;resize:none;max-height:100px;transition:border .18s}
.chat-input:focus{border-color:var(--green)}
.chat-send{width:40px;height:40px;border-radius:10px;background:linear-gradient(135deg,#22c55e,#16a34a);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#fff;font-size:16px;flex-shrink:0;transition:all .18s}
.chat-send:hover{transform:scale(1.08)}

/* FULL WINDOW WORKOUT */
.fw-workout{position:fixed;inset:0;background:var(--bg);z-index:300;overflow:hidden;display:flex;flex-direction:column;animation:fadeUp .3s ease}
.fw-nav{padding:16px 24px;background:rgba(8,13,26,.95);backdrop-filter:blur(16px);border-bottom:1px solid var(--border);display:flex;align-items:center;gap:16px;flex-shrink:0}
.fw-body{flex:1;overflow-y:auto;padding:24px;max-width:900px;margin:0 auto;width:100%}
.fw-day-card{background:var(--s1);border:1px solid var(--border);border-radius:16px;padding:24px;margin-bottom:16px;cursor:pointer;transition:all .2s;animation:cardEntrance .35s ease both}
.fw-day-card:hover{transform:translateY(-3px);box-shadow:0 12px 36px rgba(0,0,0,.5);border-color:var(--border2)}
.fw-day-card.expanded{cursor:default;transform:none}
.fw-ex-detail{background:var(--s2);border:1px solid var(--border);border-radius:12px;padding:18px;margin-top:12px;animation:fadeUp .25s ease}

/* WORKOUT EDITOR FULL WINDOW */
.we-day-nav{display:flex;overflow-x:auto;gap:8px;padding:16px 24px;background:var(--s2);border-bottom:1px solid var(--border);flex-shrink:0;scrollbar-width:none}
.we-day-nav::-webkit-scrollbar{display:none}
.we-day-btn{padding:8px 16px;border-radius:10px;border:2px solid;background:transparent;cursor:pointer;font-family:'Outfit',sans-serif;font-weight:700;font-size:12px;white-space:nowrap;transition:all .2s;flex-shrink:0}
.we-day-btn.active{transform:translateY(-2px)}
.we-editor-area{flex:1;overflow-y:auto;padding:24px;max-width:800px;margin:0 auto;width:100%}

/* ACCESS BADGES */
.access-active{background:var(--green-bg);border:1px solid var(--green-b);color:var(--green);padding:4px 12px;border-radius:20px;font-size:11px;font-weight:700}
.access-paused{background:rgba(251,191,36,.1);border:1px solid rgba(251,191,36,.25);color:var(--yellow);padding:4px 12px;border-radius:20px;font-size:11px;font-weight:700}
.access-terminated{background:rgba(248,113,113,.1);border:1px solid rgba(248,113,113,.2);color:var(--red);padding:4px 12px;border-radius:20px;font-size:11px;font-weight:700}

/* FOOD LOG */
.food-log-item{display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:var(--s2);border:1px solid var(--border);border-radius:10px;margin-bottom:8px;animation:slideRight .25s ease both}
.food-log-item.logged{border-color:var(--green-b);background:var(--green-bg)}

/* WEEKLY CHECKIN */
.checkin-week-card{background:var(--s2);border:1px solid var(--border);border-radius:12px;padding:16px;margin-bottom:12px;animation:fadeUp .3s ease both}

/* MACRO DIFF */
.macro-diff{display:flex;align-items:center;gap:6px;padding:8px 14px;border-radius:10px;font-size:13px;font-weight:600}
.macro-diff.surplus{background:rgba(34,197,94,.08);border:1px solid var(--green-b);color:var(--green)}
.macro-diff.deficit{background:rgba(248,113,113,.08);border:1px solid rgba(248,113,113,.2);color:var(--red)}
.macro-diff.on-target{background:rgba(59,130,246,.08);border:1px solid rgba(59,130,246,.2);color:var(--blue)}

@media(max-width:700px){
  .g4{grid-template-columns:1fr 1fr}
  .g3{grid-template-columns:1fr 1fr}
  .fg{grid-template-columns:1fr}
  .nav-tabs{display:none}
  .wk-grid{grid-template-columns:repeat(3,1fr)}
  .fw-body{padding:16px}
  .we-editor-area{padding:16px}
}
`;

// ─── HELPERS ──────────────────────────────────────────────────────────────────
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
      {value != null ? <div className="mc-val" style={{ color }}>{value}<span style={{ fontSize: 13, fontWeight: 500 }}>{suffix}</span></div> : <div style={{ width: 28, height: 3, background: color + "44", borderRadius: 2, margin: "8px 0 4px" }} />}
      <div className="mc-label">{label}</div>
    </div>
  );
}

function NumInput({ value, onChange, color }) {
  return (
    <div className="num-input">
      <button className="num-btn" onClick={() => onChange(Math.max(0, (parseInt(value) || 0) - 1))}>-</button>
      <input type="number" value={value} onChange={e => onChange(parseInt(e.target.value) || 0)} style={{ color }} />
      <button className="num-btn" onClick={() => onChange((parseInt(value) || 0) + 1)}>+</button>
    </div>
  );
}

function MealTotals({ items }) {
  const t = items.reduce((a, i) => ({ protein: a.protein + (i.protein || 0), carbs: a.carbs + (i.carbs || 0), fats: a.fats + (i.fats || 0), fiber: a.fiber + (i.fiber || 0), cal: a.cal + (i.cal || 0) }), { protein: 0, carbs: 0, fats: 0, fiber: 0, cal: 0 });
  return (
    <div className="meal-total">
      <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted2)", textTransform: "uppercase" }}>Meal Total:</span>
      <span style={{ fontSize: 12, fontWeight: 700, color: "var(--green)" }}>{t.cal} kcal</span>
      <span style={{ fontSize: 12, fontWeight: 700, color: "var(--purple)" }}>{t.protein}g P</span>
      <span style={{ fontSize: 12, fontWeight: 700, color: "var(--orange)" }}>{t.carbs}g C</span>
      <span style={{ fontSize: 12, fontWeight: 700, color: "var(--red)" }}>{t.fats}g F</span>
      <span style={{ fontSize: 12, fontWeight: 700, color: "#34d399" }}>{t.fiber}g Fib</span>
    </div>
  );
}

function SliderField({ label, value, onChange, min = 1, max = 10, color = "var(--green)" }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="slider-wrap">
      <div className="slider-header"><span className="slider-label">{label}</span><span className="slider-val" style={{ color }}>{value}</span></div>
      <input type="range" className="slider" min={min} max={max} value={value} onChange={e => onChange(parseInt(e.target.value))}
        style={{ background: `linear-gradient(to right,${color} 0%,${color} ${pct}%,var(--s3) ${pct}%,var(--s3) 100%)` }} />
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--muted)", marginTop: 3 }}><span>{min} Low</span><span>{max} High</span></div>
    </div>
  );
}

function SourcesTablePanel({ sources }) {
  if (!sources) return null;
  const cats = [{ key: "protein", label: "Protein", color: "var(--purple)" }, { key: "carbs", label: "Carbs", color: "var(--orange)" }, { key: "fats", label: "Fats", color: "var(--red)" }];
  const hasAny = cats.some(c => (sources[c.key] || []).some(v => v));
  if (!hasAny) return <div className="sources-table-wrap"><div className="sources-table-title">Client Food Sources</div><div style={{ fontSize: 12, color: "var(--muted)" }}>Not filled yet.</div></div>;
  const rows = [];
  for (let i = 0; i < 5; i++) { const p = (sources.protein || [])[i] || ""; const c = (sources.carbs || [])[i] || ""; const f = (sources.fats || [])[i] || ""; if (p || c || f) rows.push({ i, p, c, f }); }
  return (
    <div className="sources-table-wrap">
      <div className="sources-table-title">Client Food Sources</div>
      <table className="sources-table">
        <thead><tr><th>#</th><th style={{ color: "var(--purple)" }}>Protein</th><th style={{ color: "var(--orange)" }}>Carbs</th><th style={{ color: "var(--red)" }}>Fats</th></tr></thead>
        <tbody>{rows.map(({ i, p, c, f }) => (<tr key={i}><td style={{ color: "var(--muted)", fontSize: 10 }}>{i + 1}</td><td style={{ color: p ? "var(--purple)" : "var(--muted)" }}>{p || "-"}</td><td style={{ color: c ? "var(--orange)" : "var(--muted)" }}>{c || "-"}</td><td style={{ color: f ? "var(--red)" : "var(--muted)" }}>{f || "-"}</td></tr>))}</tbody>
      </table>
    </div>
  );
}

// ─── VIDEO MODAL ──────────────────────────────────────────────────────────────
function VideoModal({ url, name, onClose }) {
  const isYT = url.includes("youtube.com") || url.includes("youtu.be");
  let embedUrl = url;
  if (isYT) { const id = url.split("v=")[1]?.split("&")[0] || url.split("youtu.be/")[1]?.split("?")[0]; embedUrl = "https://www.youtube.com/embed/" + id; }
  return (
    <div className="ov" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="mh"><div><div className="mt">{name}</div><div className="ms">Exercise demo</div></div><button className="xbtn" onClick={onClose}>✕</button></div>
        <div className="mb2">{isYT ? <iframe width="100%" height="315" src={embedUrl} frameBorder="0" allowFullScreen style={{ borderRadius: 10 }} /> : <video src={url} controls style={{ width: "100%", borderRadius: 10 }} />}</div>
      </div>
    </div>
  );
}

// ─── CHAT COMPONENT ───────────────────────────────────────────────────────────
function ChatPanel({ uid, otherId, otherName, myName }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);
  const chatId = [uid, otherId].sort().join("_");

  useEffect(() => {
    const q = query(collection(db, "chats", chatId, "messages"), orderBy("createdAt", "asc"));
    const unsub = onSnapshot(q, snap => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    });
    return unsub;
  }, [chatId]);

  const send = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    const msg = text.trim(); setText("");
    await addDoc(collection(db, "chats", chatId, "messages"), {
      text: msg, senderId: uid, senderName: myName,
      createdAt: serverTimestamp(),
    });
    await setDoc(doc(db, "chats", chatId), { participants: [uid, otherId], lastMsg: msg, lastTime: serverTimestamp() }, { merge: true });
    setSending(false);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 400 }}>
      <div className="chat-msgs">
        {messages.length === 0 && <div style={{ textAlign: "center", color: "var(--muted)", fontSize: 13, marginTop: 40 }}>No messages yet. Say hi to {otherName}!</div>}
        {messages.map(m => (
          <div key={m.id} style={{ display: "flex", flexDirection: "column", alignItems: m.senderId === uid ? "flex-end" : "flex-start" }}>
            <div className={`chat-msg ${m.senderId === uid ? "mine" : "theirs"}`}>
              {m.text}
              <div className="chat-time">{m.createdAt?.toDate?.()?.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) || ""}</div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="chat-input-row">
        <textarea className="chat-input" placeholder={`Message ${otherName}...`} value={text} rows={1}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} />
        <button className="chat-send" onClick={send} disabled={sending || !text.trim()}>➤</button>
      </div>
    </div>
  );
}

// ─── FULL WINDOW WORKOUT VIEW (CLIENT) ───────────────────────────────────────
function FullWorkoutView({ workout, onClose }) {
  const [openDay, setOpenDay] = useState(null);
  const [videoModal, setVideoModal] = useState(null);
  const WCOLOR = { Push: "#4ade80", Pull: "#818cf8", Legs: "#fb923c", Rest: "#475569", Cardio: "#38bdf8", "Full Body": "#f472b6" };

  return (
    <div className="fw-workout">
      <div className="fw-nav">
        <button className="btn btn-s btn-sm" onClick={onClose}>← Back</button>
        <div>
          <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 800, fontSize: 20 }}>Your Workout Plan</div>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>{workout.filter(d => d.type !== "Rest").length} training days</div>
        </div>
      </div>
      <div className="fw-body">
        {workout.map((day, i) => {
          const dc = DAY_COLORS[i % DAY_COLORS.length];
          const isOpen = openDay === i;
          return (
            <div key={i} className="fw-day-card" style={{ borderLeft: `4px solid ${dc.accent}`, animationDelay: i * 0.05 + "s" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14, cursor: day.type !== "Rest" ? "pointer" : "default" }}
                onClick={() => day.type !== "Rest" && setOpenDay(isOpen ? null : i)}>
                <div style={{ width: 52, height: 52, borderRadius: 14, background: dc.bg, border: `2px solid ${dc.border}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <div style={{ fontSize: 9, fontWeight: 800, color: dc.accent, letterSpacing: ".06em" }}>{dc.label}</div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: dc.accent, fontFamily: "'Outfit',sans-serif" }}>{i + 1}</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 800, fontSize: 17 }}>{day.day}</div>
                  <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
                    <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: (WCOLOR[day.type] || "#475569") + "22", color: WCOLOR[day.type] || "#475569", border: "1px solid " + (WCOLOR[day.type] || "#475569") + "44" }}>{day.type}</span>
                    {day.type !== "Rest" && <span style={{ fontSize: 12, color: "var(--muted)" }}>{day.exercises.length} exercises</span>}
                  </div>
                </div>
                {day.type !== "Rest" && <span style={{ fontSize: 20, color: dc.accent, fontWeight: 700 }}>{isOpen ? "▲" : "▼"}</span>}
              </div>

              {isOpen && day.type !== "Rest" && (
                <div style={{ marginTop: 18 }}>
                  {day.exercises.map((ex, ei) => (
                    <div key={ei} className="fw-ex-detail" style={{ borderLeft: `3px solid ${dc.accent}`, animationDelay: ei * 0.04 + "s" }}>
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                            <div style={{ width: 30, height: 30, borderRadius: "50%", background: dc.accent + "22", border: "2px solid " + dc.border, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: dc.accent, flexShrink: 0 }}>{ei + 1}</div>
                            <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 800, fontSize: 16 }}>{ex.name}</div>
                          </div>
                          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 8 }}>
                            {[["Sets", ex.sets, dc.accent], ["Reps", ex.reps, "var(--blue)"], ["Rest", ex.rest, "var(--orange)"]].map(([l, v, c]) => (
                              <div key={l} style={{ background: "var(--s3)", borderRadius: 9, padding: "8px 14px", textAlign: "center", border: "1px solid var(--border)" }}>
                                <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 18, fontWeight: 800, color: c }}>{v}</div>
                                <div style={{ fontSize: 10, color: "var(--muted)", fontWeight: 600, textTransform: "uppercase" }}>{l}</div>
                              </div>
                            ))}
                          </div>
                          {ex.note && <div className="note-box">{ex.note}</div>}
                          {ex.videoUrl && <button className="btn btn-blue btn-sm" style={{ marginTop: 10 }} onClick={() => setVideoModal(ex)}>▶ Watch Demo</button>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {videoModal && <VideoModal url={videoModal.videoUrl} name={videoModal.name} onClose={() => setVideoModal(null)} />}
    </div>
  );
}

// ─── PROFESSIONAL WORKOUT EDITOR (COACH) ─────────────────────────────────────
function ProfWorkoutEditor({ plan, onClose, autoSave }) {
  const [days, setDays] = useState(JSON.parse(JSON.stringify(plan)));
  const [activeDay, setActiveDay] = useState(0);
  const [autoSaved, setAutoSaved] = useState(false);
  const saveTimer = useRef(null);
  const TYPES = ["Push", "Pull", "Legs", "Rest", "Cardio", "Full Body", "Upper", "Lower", "Active Recovery"];

  const triggerAutoSave = (newDays) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => { autoSave(newDays); setAutoSaved(true); setTimeout(() => setAutoSaved(false), 2500); }, 800);
  };

  const updateDay = (f, v) => { const u = days.map((day, i) => i === activeDay ? { ...day, [f]: v } : day); setDays(u); triggerAutoSave(u); };
  const updateEx = (ei, f, v) => { const u = days.map((day, i) => i === activeDay ? { ...day, exercises: day.exercises.map((ex, j) => j === ei ? { ...ex, [f]: v } : ex) } : day); setDays(u); triggerAutoSave(u); };
  const addEx = () => { const u = days.map((day, i) => i === activeDay ? { ...day, exercises: [...day.exercises, { name: "", sets: 3, reps: "10-12", rest: "60s", videoUrl: "", note: "" }] } : day); setDays(u); triggerAutoSave(u); };
  const removeEx = (ei) => { const u = days.map((day, i) => i === activeDay ? { ...day, exercises: day.exercises.filter((_, j) => j !== ei) } : day); setDays(u); triggerAutoSave(u); };
  const addDay = () => { const newDay = { day: "Day " + (days.length + 1), type: "Push", exercises: [] }; const u = [...days, newDay]; setDays(u); setActiveDay(u.length - 1); triggerAutoSave(u); };
  const removeDay = (di) => { if (days.length <= 1) return; const u = days.filter((_, i) => i !== di); setDays(u); setActiveDay(Math.min(activeDay, u.length - 1)); triggerAutoSave(u); };

  const currentDay = days[activeDay];
  const dc = DAY_COLORS[activeDay % DAY_COLORS.length];
  const WCOLOR = { Push: "#4ade80", Pull: "#818cf8", Legs: "#fb923c", Rest: "#475569", Cardio: "#38bdf8", "Full Body": "#f472b6", Upper: "#e879f9", Lower: "#f59e0b", "Active Recovery": "#34d399" };

  return (
    <div className="fw-workout">
      {/* Top nav */}
      <div className="fw-nav" style={{ flexWrap: "wrap", gap: 12 }}>
        <button className="btn btn-s btn-sm" onClick={onClose}>← Done</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 800, fontSize: 18 }}>Workout Plan Editor</div>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>Click a day tab to edit — changes auto-save</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span className={`autosave ${autoSaved ? "show" : ""}`}>✓ Saved</span>
          <button className="btn btn-p btn-sm" onClick={addDay}>+ Add Day</button>
        </div>
      </div>

      {/* Day tabs */}
      <div className="we-day-nav">
        {days.map((day, di) => {
          const dc2 = DAY_COLORS[di % DAY_COLORS.length];
          return (
            <button key={di} className="we-day-btn" onClick={() => setActiveDay(di)}
              style={{
                borderColor: activeDay === di ? dc2.accent : dc2.border,
                color: dc2.accent,
                background: activeDay === di ? dc2.bg : "transparent",
                boxShadow: activeDay === di ? `0 4px 16px ${dc2.accent}33` : "none",
              }}>
              <div style={{ fontSize: 9, letterSpacing: ".06em", opacity: .8 }}>{dc2.label}</div>
              <div style={{ fontSize: 13 }}>{day.day.length > 10 ? day.day.slice(0, 10) + "..." : day.day}</div>
              <div style={{ fontSize: 10, opacity: .7 }}>{day.type}</div>
            </button>
          );
        })}
      </div>

      {/* Editor area */}
      <div className="we-editor-area">
        {/* Day settings */}
        <div style={{ background: dc.bg, border: `2px solid ${dc.border}`, borderRadius: 16, padding: 20, marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: dc.accent + "22", border: `2px solid ${dc.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Outfit',sans-serif", fontWeight: 900, fontSize: 20, color: dc.accent }}>{activeDay + 1}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: dc.accent, textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 4 }}>Day {activeDay + 1} of {days.length}</div>
              <div style={{ display: "flex", gap: 8 }}>
                <input className="fi" style={{ borderColor: dc.border, background: "rgba(0,0,0,.25)", flex: 1 }} value={currentDay.day} onChange={e => updateDay("day", e.target.value)} placeholder="Day name" />
                <select className="fsel" style={{ width: 150, borderColor: dc.border, background: "rgba(0,0,0,.25)" }} value={currentDay.type} onChange={e => updateDay("type", e.target.value)}>
                  {TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
                {days.length > 1 && <button className="btn btn-d btn-sm" onClick={() => removeDay(activeDay)}>Remove Day</button>}
              </div>
            </div>
          </div>
          <div>
            <span style={{ display: "inline-flex", padding: "4px 14px", borderRadius: 20, fontSize: 12, fontWeight: 700, background: (WCOLOR[currentDay.type] || "#475569") + "22", color: WCOLOR[currentDay.type] || "#475569", border: "1px solid " + (WCOLOR[currentDay.type] || "#475569") + "44" }}>
              {currentDay.type === "Rest" ? "REST / RECOVERY DAY" : currentDay.type.toUpperCase() + " DAY"} — {currentDay.exercises.length} exercises
            </span>
          </div>
        </div>

        {/* Exercises */}
        {currentDay.type !== "Rest" && (
          <>
            {currentDay.exercises.map((ex, ei) => (
              <div key={ei} style={{ background: "var(--s1)", border: `1px solid ${dc.border}`, borderRadius: 14, padding: 20, marginBottom: 14, animation: "fadeUp .25s ease " + ei * 0.04 + "s both" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: dc.accent + "22", border: "2px solid " + dc.border, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: dc.accent, flexShrink: 0 }}>{ei + 1}</div>
                  <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: 14, color: dc.accent, textTransform: "uppercase", letterSpacing: ".05em" }}>Exercise {ei + 1}</div>
                  <button className="btn btn-d btn-xs" style={{ marginLeft: "auto" }} onClick={() => removeEx(ei)}>✕ Remove</button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "2fr 80px 100px 80px", gap: 10, marginBottom: 12 }}>
                  <div><div className="fl">Exercise Name</div><input className="fi" value={ex.name} onChange={e => updateEx(ei, "name", e.target.value)} placeholder="e.g. Bench Press" style={{ borderColor: dc.border }} /></div>
                  <div><div className="fl">Sets</div><input className="fi" type="number" value={ex.sets} onChange={e => updateEx(ei, "sets", parseInt(e.target.value) || 1)} style={{ borderColor: dc.border, textAlign: "center", fontWeight: 700 }} /></div>
                  <div><div className="fl">Reps</div><input className="fi" value={ex.reps} onChange={e => updateEx(ei, "reps", e.target.value)} placeholder="10-12" style={{ borderColor: dc.border, textAlign: "center" }} /></div>
                  <div><div className="fl">Rest</div><input className="fi" value={ex.rest} onChange={e => updateEx(ei, "rest", e.target.value)} placeholder="60s" style={{ borderColor: dc.border, textAlign: "center" }} /></div>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <div className="fl">YouTube Demo Link</div>
                  <input className="fi" value={ex.videoUrl || ""} onChange={e => updateEx(ei, "videoUrl", e.target.value)} placeholder="https://youtube.com/watch?v=..." style={{ borderColor: dc.border }} />
                  {ex.videoUrl && <span className="bdg bdg-b" style={{ marginTop: 6, display: "inline-flex" }}>▶ Video linked</span>}
                </div>
                <div>
                  <div className="fl" style={{ color: "#fbbf24" }}>Coaching Note (client sees this)</div>
                  <textarea className="fta" style={{ minHeight: 60, borderColor: ex.note ? "rgba(251,191,36,.4)" : dc.border, background: ex.note ? "rgba(251,191,36,.04)" : "var(--s2)" }}
                    value={ex.note || ""} onChange={e => updateEx(ei, "note", e.target.value)}
                    placeholder="e.g. Keep chest up, controlled negative, pause at bottom" />
                </div>
              </div>
            ))}
            <button className="btn" style={{ background: dc.bg, color: dc.accent, border: `1px solid ${dc.border}`, borderRadius: 12, padding: "12px 20px", fontSize: 14, fontWeight: 700, width: "100%" }} onClick={addEx}>
              + Add Exercise to {currentDay.day}
            </button>
          </>
        )}
        {currentDay.type === "Rest" && (
          <div style={{ textAlign: "center", padding: 60, background: "var(--s1)", borderRadius: 16, border: "1px solid var(--border)" }}>
            <div style={{ fontSize: 56, marginBottom: 12 }}>🛌</div>
            <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 800, fontSize: 20, marginBottom: 8 }}>{currentDay.day} — Rest Day</div>
            <div style={{ color: "var(--muted)", fontSize: 14 }}>Recovery is training too. No exercises needed.</div>
          </div>
        )}

        {/* Day navigation */}
        <div style={{ display: "flex", gap: 10, marginTop: 24, justifyContent: "center" }}>
          {activeDay > 0 && <button className="btn btn-s" onClick={() => setActiveDay(activeDay - 1)}>← Previous Day</button>}
          {activeDay < days.length - 1 && <button className="btn btn-p" onClick={() => setActiveDay(activeDay + 1)}>Next Day →</button>}
        </div>
      </div>
    </div>
  );
}

// ─── MEAL EDITOR ──────────────────────────────────────────────────────────────
function MealEditor({ plan, onClose, clientSources, autoSave }) {
  const [meals, setMeals] = useState(JSON.parse(JSON.stringify(plan)));
  const [autoSaved, setAutoSaved] = useState(false);
  const saveTimer = useRef(null);

  const triggerAutoSave = (newMeals) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => { autoSave(newMeals); setAutoSaved(true); setTimeout(() => setAutoSaved(false), 2000); }, 800);
  };

  const updateMeal = (mi, f, v) => { const u = meals.map((m, i) => i === mi ? { ...m, [f]: v } : m); setMeals(u); triggerAutoSave(u); };
  const updateItem = (mi, ii, f, v) => { const u = meals.map((m, i) => i === mi ? { ...m, items: m.items.map((item, j) => j === ii ? { ...item, [f]: f === "food" || f === "amount" ? v : (parseFloat(v) || 0) } : item) } : m); setMeals(u); triggerAutoSave(u); };
  const addItem = (mi) => { const u = meals.map((m, i) => i === mi ? { ...m, items: [...m.items, { food: "", amount: "", protein: 0, carbs: 0, fats: 0, fiber: 0, cal: 0 }] } : m); setMeals(u); triggerAutoSave(u); };
  const removeItem = (mi, ii) => { const u = meals.map((m, i) => i === mi ? { ...m, items: m.items.filter((_, j) => j !== ii) } : m); setMeals(u); triggerAutoSave(u); };
  const addMeal = () => { const u = [...meals, { name: "Meal " + (meals.length + 1), time: "12:00 PM", items: [] }]; setMeals(u); triggerAutoSave(u); };
  const removeMeal = (mi) => { const u = meals.filter((_, i) => i !== mi); setMeals(u); triggerAutoSave(u); };

  return (
    <div className="ov" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="mh">
          <div><div className="mt">Edit Meal Plan</div><div className="ms">Auto-saves as you type</div></div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}><span className={`autosave ${autoSaved ? "show" : ""}`}>✓ Saved</span><button className="xbtn" onClick={onClose}>✕</button></div>
        </div>
        <div className="mb2">
          <SourcesTablePanel sources={clientSources} />
          {meals.map((meal, mi) => (
            <div key={mi} style={{ background: "var(--s2)", border: "1px solid var(--border)", borderRadius: 12, marginBottom: 14, overflow: "hidden", animation: "fadeUp .3s ease " + (mi * 0.06) + "s both" }}>
              <div style={{ padding: "12px 14px", background: "var(--s3)", display: "flex", gap: 8, alignItems: "center" }}>
                <input className="fi" style={{ flex: 1 }} value={meal.name} onChange={e => updateMeal(mi, "name", e.target.value)} placeholder="Meal name" />
                <input className="fi" style={{ width: 110 }} value={meal.time} onChange={e => updateMeal(mi, "time", e.target.value)} placeholder="Time" />
                <button className="btn btn-d btn-sm" onClick={() => removeMeal(mi)}>Remove</button>
              </div>
              <div style={{ padding: "10px 14px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 65px 65px 65px 65px 75px auto", gap: 5, marginBottom: 6 }}>
                  {["Food", "Amount", "P(g)", "C(g)", "F(g)", "Fib(g)", "Cal", ""].map((h, i) => <div key={i} className="fl">{h}</div>)}
                </div>
                {meal.items.map((item, ii) => (
                  <div key={ii} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 65px 65px 65px 65px 75px auto", gap: 5, marginBottom: 8, alignItems: "center" }}>
                    <input className="fi" value={item.food} onChange={e => updateItem(mi, ii, "food", e.target.value)} placeholder="Food name" />
                    <input className="fi" value={item.amount} onChange={e => updateItem(mi, ii, "amount", e.target.value)} placeholder="100g" />
                    <input className="fi" type="number" value={item.protein || ""} onChange={e => updateItem(mi, ii, "protein", e.target.value)} placeholder="0" style={{ color: "var(--purple)", fontWeight: 700, padding: "10px 6px", textAlign: "center" }} />
                    <input className="fi" type="number" value={item.carbs || ""} onChange={e => updateItem(mi, ii, "carbs", e.target.value)} placeholder="0" style={{ color: "var(--orange)", fontWeight: 700, padding: "10px 6px", textAlign: "center" }} />
                    <input className="fi" type="number" value={item.fats || ""} onChange={e => updateItem(mi, ii, "fats", e.target.value)} placeholder="0" style={{ color: "var(--red)", fontWeight: 700, padding: "10px 6px", textAlign: "center" }} />
                    <input className="fi" type="number" value={item.fiber || ""} onChange={e => updateItem(mi, ii, "fiber", e.target.value)} placeholder="0" style={{ color: "#34d399", fontWeight: 700, padding: "10px 6px", textAlign: "center" }} />
                    <input className="fi" type="number" value={item.cal || ""} onChange={e => updateItem(mi, ii, "cal", e.target.value)} placeholder="0" style={{ color: "var(--green)", fontWeight: 700, padding: "10px 6px", textAlign: "center" }} />
                    <button className="btn btn-d btn-xs" onClick={() => removeItem(mi, ii)}>✕</button>
                  </div>
                ))}
                <button className="btn btn-s btn-sm" onClick={() => addItem(mi)} style={{ marginTop: 4 }}>+ Add Food</button>
              </div>
              <MealTotals items={meal.items} />
            </div>
          ))}
          <button className="btn btn-s" onClick={addMeal} style={{ marginBottom: 14 }}>+ Add Meal</button>
          <button className="btn btn-s" style={{ width: "100%" }} onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}

// ─── FOOD LOG SECTION (CLIENT) ────────────────────────────────────────────────
function FoodLogSection({ uid, mealPlan, targetNutrition }) {
  const today = new Date().toISOString().split("T")[0];
  const [foodLog, setFoodLog] = useState([]);
  const [savedFoods, setSavedFoods] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [form, setForm] = useState({ food: "", amount: "", protein: 0, carbs: 0, fats: 0, fiber: 0, cal: 0, meal: "Breakfast" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "clients", uid), snap => {
      if (!snap.exists()) return;
      const d = snap.data();
      const todayLog = (d.foodLogs || {})[today] || [];
      setFoodLog(todayLog);
      setSavedFoods(d.savedFoods || []);
    });
    return unsub;
  }, [uid, today]);

  const logFood = async (item) => {
    setSaving(true);
    const entry = { ...item, loggedAt: new Date().toISOString() };
    const newLog = [...foodLog, entry];
    await updateDoc(doc(db, "clients", uid), { [`foodLogs.${today}`]: newLog });
    setShowAdd(false);
    setForm({ food: "", amount: "", protein: 0, carbs: 0, fats: 0, fiber: 0, cal: 0, meal: "Breakfast" });
    setSaving(false);
  };

  const saveForFuture = async (item) => {
    const alreadySaved = savedFoods.some(f => f.food === item.food && f.amount === item.amount);
    if (alreadySaved) {
      await updateDoc(doc(db, "clients", uid), { savedFoods: savedFoods.filter(f => !(f.food === item.food && f.amount === item.amount)) });
    } else {
      await updateDoc(doc(db, "clients", uid), { savedFoods: [...savedFoods, { food: item.food, amount: item.amount, protein: item.protein, carbs: item.carbs, fats: item.fats, fiber: item.fiber, cal: item.cal }] });
    }
  };

  const removeLog = async (idx) => {
    const newLog = foodLog.filter((_, i) => i !== idx);
    await updateDoc(doc(db, "clients", uid), { [`foodLogs.${today}`]: newLog });
  };

  const logTotals = foodLog.reduce((a, i) => ({ cal: a.cal + (i.cal || 0), protein: a.protein + (i.protein || 0), carbs: a.carbs + (i.carbs || 0), fats: a.fats + (i.fats || 0) }), { cal: 0, protein: 0, carbs: 0, fats: 0 });
  const mealTotals = mealPlan.flatMap(m => m.items).reduce((a, i) => ({ cal: a.cal + (i.cal || 0) }), { cal: 0 });
  const targetCal = targetNutrition?.calories || mealTotals.cal;
  const calDiff = logTotals.cal - targetCal;

  return (
    <div>
      {/* Summary */}
      <div className="card stagger-1" style={{ marginBottom: 16 }}>
        <div className="card-title">Today's Food Log — {new Date().toLocaleDateString("en-IN")}</div>
        <div className="g4" style={{ marginBottom: 16 }}>
          {[["Logged Cal", logTotals.cal, "var(--green)"], ["Protein", logTotals.protein + "g", "var(--purple)"], ["Carbs", logTotals.carbs + "g", "var(--orange)"], ["Fats", logTotals.fats + "g", "var(--red)"]].map(([l, v, c], i) => (
            <div key={l} className="mc" style={{ animationDelay: i * 0.06 + "s" }}><div className="mc-val" style={{ color: c }}>{v}</div><div className="mc-label">{l}</div></div>
          ))}
        </div>
        {targetCal > 0 && (
          <div className={`macro-diff ${calDiff > 100 ? "surplus" : calDiff < -100 ? "deficit" : "on-target"}`} style={{ marginBottom: 12 }}>
            <span style={{ fontSize: 18 }}>{calDiff > 100 ? "📈" : calDiff < -100 ? "📉" : "✅"}</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>
                {calDiff > 100 ? `Surplus: +${calDiff} kcal above target` : calDiff < -100 ? `Deficit: ${Math.abs(calDiff)} kcal below target` : "On target!"}
              </div>
              <div style={{ fontSize: 11, opacity: .8 }}>Target: {targetCal} kcal — Logged: {logTotals.cal} kcal</div>
            </div>
          </div>
        )}
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-p" onClick={() => setShowAdd(true)}>+ Log Food</button>
          <button className="btn btn-s" onClick={() => setShowSaved(!showSaved)}>📌 Saved Foods ({savedFoods.length})</button>
        </div>
      </div>

      {/* Saved foods quick-add */}
      {showSaved && savedFoods.length > 0 && (
        <div className="card stagger-2" style={{ marginBottom: 16 }}>
          <div className="card-title">Saved Foods — Quick Add</div>
          {savedFoods.map((f, i) => (
            <div key={i} className="food-log-item">
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{f.food}</div>
                <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{f.amount} — {f.cal} kcal | {f.protein}g P | {f.carbs}g C | {f.fats}g F</div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button className="btn btn-p btn-xs" onClick={() => logFood(f)}>+ Log</button>
                <button className="btn btn-d btn-xs" onClick={() => saveForFuture(f)}>🗑</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Today's log */}
      {foodLog.length > 0 && (
        <div className="card stagger-3" style={{ marginBottom: 16 }}>
          <div className="card-title">Today's Logged Foods ({foodLog.length})</div>
          {foodLog.map((item, i) => {
            const isSaved = savedFoods.some(f => f.food === item.food && f.amount === item.amount);
            return (
              <div key={i} className="food-log-item logged" style={{ animationDelay: i * 0.04 + "s" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontWeight: 700 }}>{item.food}</span>
                    <span style={{ fontSize: 11, color: "var(--muted)" }}>{item.amount}</span>
                    {item.meal && <span className="bdg bdg-b" style={{ fontSize: 9 }}>{item.meal}</span>}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--muted2)", marginTop: 3 }}>
                    <span style={{ color: "var(--green)", fontWeight: 700 }}>{item.cal} cal</span>
                    <span style={{ margin: "0 4px" }}>|</span>
                    <span style={{ color: "var(--purple)" }}>{item.protein}g P</span>
                    <span style={{ margin: "0 4px" }}>|</span>
                    <span style={{ color: "var(--orange)" }}>{item.carbs}g C</span>
                    <span style={{ margin: "0 4px" }}>|</span>
                    <span style={{ color: "var(--red)" }}>{item.fats}g F</span>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button className="btn btn-xs" style={{ background: isSaved ? "rgba(34,197,94,.1)" : "var(--s3)", color: isSaved ? "var(--green)" : "var(--muted)", border: "1px solid " + (isSaved ? "var(--green-b)" : "var(--border)") }} onClick={() => saveForFuture(item)} title={isSaved ? "Unsave" : "Save for future"}>
                    {isSaved ? "📌 Saved" : "📌 Save"}
                  </button>
                  <button className="btn btn-d btn-xs" onClick={() => removeLog(i)}>✕</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {foodLog.length === 0 && (
        <div className="card" style={{ textAlign: "center", padding: 40 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🍽</div>
          <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: 17 }}>No food logged today</div>
          <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 6, marginBottom: 16 }}>Track what you eat to compare against your plan</div>
          <button className="btn btn-p" onClick={() => setShowAdd(true)}>+ Log First Meal</button>
        </div>
      )}

      {/* Add food modal */}
      {showAdd && (
        <div className="ov" onClick={e => e.target === e.currentTarget && setShowAdd(false)}>
          <div className="modal">
            <div className="mh"><div><div className="mt">Log Food</div><div className="ms">Track your nutrition today</div></div><button className="xbtn" onClick={() => setShowAdd(false)}>✕</button></div>
            <div className="mb2">
              <div className="fg">
                <div className="fld"><div className="fl">Food Name</div><input className="fi" value={form.food} onChange={e => setForm(p => ({ ...p, food: e.target.value }))} placeholder="e.g. Chicken Breast" /></div>
                <div className="fld"><div className="fl">Amount</div><input className="fi" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} placeholder="e.g. 200g" /></div>
              </div>
              <div className="fld"><div className="fl">Meal</div>
                <select className="fsel" value={form.meal} onChange={e => setForm(p => ({ ...p, meal: e.target.value }))}>
                  {mealPlan.map(m => <option key={m.name}>{m.name}</option>)}
                  <option>Snack</option><option>Other</option>
                </select>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr", gap: 8 }}>
                {[["Calories", "cal", "var(--green)"], ["Protein g", "protein", "var(--purple)"], ["Carbs g", "carbs", "var(--orange)"], ["Fats g", "fats", "var(--red)"], ["Fiber g", "fiber", "#34d399"]].map(([l, k, c]) => (
                  <div key={k} className="fld">
                    <div className="fl" style={{ color: c }}>{l}</div>
                    <input className="fi" type="number" value={form[k] || ""} onChange={e => setForm(p => ({ ...p, [k]: parseFloat(e.target.value) || 0 }))} placeholder="0" style={{ color: c, fontWeight: 700, textAlign: "center", padding: "10px 6px" }} />
                  </div>
                ))}
              </div>
              {/* Quick fill from plan */}
              <div style={{ marginBottom: 14 }}>
                <div className="sec-lbl">Quick fill from meal plan</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {mealPlan.flatMap(m => m.items).slice(0, 10).map((item, i) => (
                    <button key={i} className="btn btn-s btn-xs" onClick={() => setForm(p => ({ ...p, food: item.food, amount: item.amount, protein: item.protein, carbs: item.carbs, fats: item.fats, fiber: item.fiber || 0, cal: item.cal }))}>
                      {item.food}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button className="btn btn-p" style={{ flex: 1 }} onClick={() => logFood(form)} disabled={saving || !form.food}>{saving ? "Logging..." : "Log Food"}</button>
                <button className="btn btn-s" onClick={() => setShowAdd(false)}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── WEEKLY CHECKIN (CLIENT) ──────────────────────────────────────────────────
function WeeklyCheckinSection({ uid, d, toast }) {
  const thisWeek = "W" + (d.week || 1);
  const existing = (d.weeklyCheckins || []).find(c => c.week === thisWeek);
  const [form, setForm] = useState({
    weight: existing?.weight || "", waist: existing?.waist || "", bodyFat: existing?.bodyFat || "",
    stressLevel: existing?.stressLevel || 5, hungerCravings: existing?.hungerCravings || 5,
    trainingPerformance: existing?.trainingPerformance || 5, nutritionAdherence: existing?.nutritionAdherence || 5,
    sleepQuality: existing?.sleepQuality || 5, waterIntake: existing?.waterIntake || 2,
    digestion: existing?.digestion || "", injuries: existing?.injuries || "None",
    period: existing?.period || "N/A", progressNote: existing?.progressNote || "",
    noteToCoach: existing?.noteToCoach || ""
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(!!existing);

  const submit = async () => {
    if (!form.weight) { toast("Please enter your weight", "error"); return; }
    setSaving(true);
    const checkin = { ...form, week: thisWeek, date: new Date().toLocaleDateString("en-IN"), timestamp: new Date().toISOString() };
    const hist = d.weightHistory || [];
    const alreadyInHist = hist.some(h => h.week === thisWeek);
    const newHist = alreadyInHist ? hist.map(h => h.week === thisWeek ? { ...h, weight: parseFloat(form.weight) } : h) : [...hist, { week: thisWeek, weight: parseFloat(form.weight), date: new Date().toLocaleDateString("en-IN") }];
    await updateDoc(doc(db, "clients", uid), {
      weeklyCheckins: [...(d.weeklyCheckins || []).filter(c => c.week !== thisWeek), checkin],
      weightHistory: newHist,
      weight: parseFloat(form.weight),
      waist: form.waist ? parseFloat(form.waist) : d.waist,
      bodyFat: form.bodyFat ? parseFloat(form.bodyFat) : d.bodyFat,
    });
    toast("Weekly check-in submitted!", "success");
    setSaved(true);
    setSaving(false);
  };

  return (
    <div className="card" style={{ marginBottom: 18 }}>
      <div className="card-title">Weekly Check-in — {thisWeek} {saved && <span className="bdg bdg-g">Submitted</span>}</div>
      <div className="section-hdr">Body Measurements</div>
      <div className="fg" style={{ marginBottom: 14 }}>
        <div className="fld"><div className="fl">Weight (kg) *</div><input className="fi" type="number" step="0.1" placeholder="85.5" value={form.weight} onChange={e => setForm(p => ({ ...p, weight: e.target.value }))} /></div>
        <div className="fld"><div className="fl">Waist (cm)</div><input className="fi" type="number" step="0.1" placeholder="82" value={form.waist} onChange={e => setForm(p => ({ ...p, waist: e.target.value }))} /></div>
        <div className="fld"><div className="fl">Body Fat %</div><input className="fi" type="number" step="0.1" placeholder="18.5" value={form.bodyFat} onChange={e => setForm(p => ({ ...p, bodyFat: e.target.value }))} /></div>
      </div>
      <div className="section-hdr">Performance This Week</div>
      <SliderField label="Stress Level" value={form.stressLevel} onChange={v => setForm(p => ({ ...p, stressLevel: v }))} color="#f87171" />
      <SliderField label="Hunger / Cravings" value={form.hungerCravings} onChange={v => setForm(p => ({ ...p, hungerCravings: v }))} color="#fb923c" />
      <SliderField label="Training Performance" value={form.trainingPerformance} onChange={v => setForm(p => ({ ...p, trainingPerformance: v }))} color="#4ade80" />
      <SliderField label="Nutrition Adherence" value={form.nutritionAdherence} onChange={v => setForm(p => ({ ...p, nutritionAdherence: v }))} color="#a78bfa" />
      <SliderField label="Sleep Quality" value={form.sleepQuality} onChange={v => setForm(p => ({ ...p, sleepQuality: v }))} color="#38bdf8" />
      <div className="slider-wrap">
        <div className="slider-header"><span className="slider-label">Avg Daily Water</span><span className="slider-val" style={{ color: "#38bdf8" }}>{form.waterIntake}L</span></div>
        <input type="range" className="slider" min={0} max={6} step={0.5} value={form.waterIntake} onChange={e => setForm(p => ({ ...p, waterIntake: parseFloat(e.target.value) }))} style={{ background: `linear-gradient(to right,#38bdf8 0%,#38bdf8 ${(form.waterIntake / 6) * 100}%,var(--s3) ${(form.waterIntake / 6) * 100}%,var(--s3) 100%)` }} />
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--muted)", marginTop: 3 }}><span>0L</span><span>6L</span></div>
      </div>
      <div className="fg" style={{ marginBottom: 12 }}>
        <div className="fld"><div className="fl">Digestion</div><select className="fsel" value={form.digestion} onChange={e => setForm(p => ({ ...p, digestion: e.target.value }))}><option value="">Select...</option><option>Normal</option><option>Bloating</option><option>Constipation</option><option>Loose stools</option><option>Reflux / acidity</option><option>Other</option></select></div>
        <div className="fld"><div className="fl">Injuries / Pain</div><select className="fsel" value={form.injuries} onChange={e => setForm(p => ({ ...p, injuries: e.target.value }))}><option>None</option><option>Minor soreness (normal)</option><option>Joint pain</option><option>Muscle pull / strain</option><option>Other</option></select></div>
      </div>
      <div className="fld" style={{ marginBottom: 12 }}><div className="fl">Period (if applicable)</div><select className="fsel" value={form.period} onChange={e => setForm(p => ({ ...p, period: e.target.value }))}><option>N/A</option><option>On period</option><option>Pre-period (PMS)</option><option>Post-period</option></select></div>
      <div className="fld" style={{ marginBottom: 12 }}><div className="fl">Your Progress Note</div><textarea className="fta" placeholder="How did this week go? Any wins or struggles?" value={form.progressNote} onChange={e => setForm(p => ({ ...p, progressNote: e.target.value }))} /></div>
      <div className="section-hdr">Note to Coach</div>
      <div className="fld"><textarea className="fta" placeholder="Anything you want your coach to know..." value={form.noteToCoach} onChange={e => setForm(p => ({ ...p, noteToCoach: e.target.value }))} /></div>
      <button className="btn btn-p" style={{ width: "100%" }} onClick={submit} disabled={saving}>{saving ? "Submitting..." : saved ? "Update Weekly Check-in" : "Submit Weekly Check-in"}</button>
    </div>
  );
}

// ─── BLOCKED SCREEN ───────────────────────────────────────────────────────────
function BlockedScreen({ status, onLogout }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)", padding: 20 }}>
      <div style={{ background: "var(--s1)", border: "1px solid var(--border2)", borderRadius: 22, padding: 40, maxWidth: 400, width: "100%", textAlign: "center", boxShadow: "var(--sh2)" }}>
        <div style={{ fontSize: 56, marginBottom: 20 }}>{status === "terminated" ? "🚫" : "⏸"}</div>
        <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 800, fontSize: 24, marginBottom: 12 }}>
          {status === "terminated" ? "Account Terminated" : "Access Paused"}
        </div>
        <div style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
          {status === "terminated"
            ? "Your account has been terminated. Please contact your coach if you believe this is a mistake."
            : "Your access is temporarily paused by your coach. Please reach out to your coach for more information."}
        </div>
        <button className="btn btn-s" onClick={onLogout}>Sign Out</button>
      </div>
    </div>
  );
}

// ─── CLIENT DASHBOARD ─────────────────────────────────────────────────────────
function ClientDash({ uid, coachId, tab, setTab, toast, user }) {
  const [d, setD] = useState(null);
  const [loading, setLoading] = useState(true);
  const [flash, setFlash] = useState({});
  const prevRef = useRef(null);
  const [wModal, setWModal] = useState(null);
  const [videoModal, setVideoModal] = useState(null);
  const [lw, setLw] = useState(""); const [lwa, setLwa] = useState(""); const [lbf, setLbf] = useState("");
  const [saving, setSaving] = useState(false);
  const [viewMedia, setViewMedia] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [showFullWorkout, setShowFullWorkout] = useState(false);
  const WCOLOR = { Push: "#4ade80", Pull: "#818cf8", Legs: "#fb923c", Rest: "#475569", Cardio: "#38bdf8", "Full Body": "#f472b6" };

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "clients", uid), snap => {
      if (!snap.exists()) { setLoading(false); return; }
      const data = snap.data();
      if (prevRef.current) {
        const p = prevRef.current; const changed = {};
        const n = data.nutrition || {}, pn = p.nutrition || {};
        ["calories", "protein", "carbs", "fats", "fiber"].forEach(k => { if (pn[k] !== n[k]) changed[k] = true; });
        if (p.coachMessage !== data.coachMessage) changed.msg = true;
        if (JSON.stringify(p.mealPlan) !== JSON.stringify(data.mealPlan)) changed.meals = true;
        if (JSON.stringify(p.workoutPlan) !== JSON.stringify(data.workoutPlan)) changed.workout = true;
        if (Object.keys(changed).length > 0) { setFlash(changed); toast("Coach updated your plan!", "success"); setTimeout(() => setFlash({}), 3000); }
      }
      prevRef.current = data; setD(data); setLoading(false);
    });
    return unsub;
  }, [uid]);

  const uploadMedia = async (files) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    let successCount = 0;
    for (const file of files) {
      const isVideo = file.type.startsWith("video/"); const maxMB = isVideo ? 100 : 25;
      if (file.size / (1024 * 1024) > maxMB) { toast(file.name + " too large", "error"); continue; }
      try {
        setUploadPct(0);
        const result = await cloudinaryUpload(file, pct => setUploadPct(pct));
        await updateDoc(doc(db, "clients", uid), { photos: [...(d.photos || []), { url: result.secure_url, publicId: result.public_id, type: isVideo ? "video" : "photo", name: file.name, date: new Date().toLocaleDateString("en-IN"), time: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }), timestamp: new Date().toISOString() }] });
        successCount++;
      } catch (err) { toast("Upload failed: " + err.message, "error"); }
    }
    if (successCount > 0) toast(successCount + " file(s) uploaded!", "success");
    setUploading(false);
  };

  const deleteMedia = async (photo) => {
    if (!window.confirm("Delete this photo/video?")) return;
    await updateDoc(doc(db, "clients", uid), { photos: (d.photos || []).filter(p => p.timestamp !== photo.timestamp) });
    toast("Removed.", "success");
  };

  if (loading) return <div className="spin-wrap"><div className="spinner-lg" /></div>;
  if (!d) return <div className="spin-wrap">No data. Contact your coach.</div>;

  const n = d.nutrition || {}; const meals = d.mealPlan || DEFAULT_MEALS;
  const workout = d.workoutPlan || DEFAULT_WORKOUT; const checkins = d.checkIns || [];
  const sources = d.foodSources || null;

  if (tab === "checkin") return (
    <div className="page">
      <div style={{ marginBottom: 22 }}><div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 22, fontWeight: 800 }}>Weekly Check-in</div><div style={{ color: "var(--muted)", fontSize: 13, marginTop: 5 }}>Submit your weekly progress report</div></div>
      <WeeklyCheckinSection uid={uid} d={d} toast={toast} />
    </div>
  );

  if (tab === "training") return (
    <>
      {showFullWorkout && <FullWorkoutView workout={workout} onClose={() => setShowFullWorkout(false)} />}
      <div className="page">
        <div style={{ marginBottom: 22, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 22, fontWeight: 800 }}>Your Workout Plan</div>
            <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 5 }}>{d.phase} - Week {d.week}</div>
            {flash.workout && <span className="nbadge">Updated by coach</span>}
          </div>
          <button className="btn btn-p" onClick={() => setShowFullWorkout(true)}>🏋 Full Screen View</button>
        </div>
        <div className="wk-grid" style={{ marginBottom: 20 }}>
          {workout.map((day, i) => {
            const dc = DAY_COLORS[i % DAY_COLORS.length];
            return (
              <div key={i} className={day.type === "Rest" ? "wk-card rest" : "wk-card"}
                style={{ borderTop: "3px solid " + dc.accent, animationDelay: i * 0.05 + "s" }}
                onClick={() => day.type !== "Rest" && setWModal(day)}>
                <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", color: dc.accent, marginBottom: 6 }}>{day.day.slice(0, 3)}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: WCOLOR[day.type] || "#475569" }}>{day.type}</div>
                {day.type !== "Rest" && <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 3 }}>{day.exercises.length} ex</div>}
              </div>
            );
          })}
        </div>
        {wModal && (
          <div className="ov" onClick={e => e.target === e.currentTarget && setWModal(null)}>
            <div className="modal">
              <div className="mh"><div><div className="mt">{wModal.day} - {wModal.type}</div><div className="ms">{wModal.exercises.length} exercises</div></div><button className="xbtn" onClick={() => setWModal(null)}>✕</button></div>
              <div className="mb2">
                {wModal.exercises.map((ex, i) => (
                  <div key={i} className="ex-row" style={{ animationDelay: i * 0.06 + "s" }}>
                    <div className="ex-num">{i + 1}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{ex.name}</div>
                      <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>Rest: {ex.rest}</div>
                      {ex.note && <div className="note-box">{ex.note}</div>}
                      {ex.videoUrl && <button className="btn btn-blue btn-xs" style={{ marginTop: 6 }} onClick={() => setVideoModal(ex)}>▶ Watch Demo</button>}
                    </div>
                    <div style={{ fontWeight: 800, fontSize: 16, color: WCOLOR[wModal.type] }}>{ex.sets} x {ex.reps}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        {videoModal && <VideoModal url={videoModal.videoUrl} name={videoModal.name} onClose={() => setVideoModal(null)} />}
      </div>
    </>
  );

  if (tab === "nutrition") {
    const allItems = meals.flatMap(m => m.items);
    const totP = allItems.reduce((a, i) => a + (i.protein || 0), 0);
    const totC = allItems.reduce((a, i) => a + (i.carbs || 0), 0);
    const totF = allItems.reduce((a, i) => a + (i.fats || 0), 0);
    const totFib = allItems.reduce((a, i) => a + (i.fiber || 0), 0);
    const totCal = allItems.reduce((a, i) => a + (i.cal || 0), 0);
    return (
      <div className="page">
        <div style={{ marginBottom: 18 }}><div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 22, fontWeight: 800 }}>Nutrition Plan</div><div className="live" style={{ marginTop: 7 }}><span className="dot" />Live from coach</div></div>
        <div className="g4" style={{ marginBottom: 20 }}>
          {[["Calories", n.calories, "var(--green)", !!flash.calories], ["Protein G", n.protein, "var(--purple)", !!flash.protein], ["Carbs G", n.carbs, "var(--orange)", !!flash.carbs], ["Fats G", n.fats, "var(--red)", !!flash.fats]].map(([l, v, co, fl], i) => (
            <div key={l} style={{ animationDelay: i * 0.07 + "s" }}><MC label={l} value={v} color={co} flash={fl} /></div>
          ))}
        </div>
        {meals.map((meal, mi) => {
          const mp = meal.items.reduce((a, i) => a + (i.protein || 0), 0);
          const mc2 = meal.items.reduce((a, i) => a + (i.carbs || 0), 0);
          const mf = meal.items.reduce((a, i) => a + (i.fats || 0), 0);
          const mfib = meal.items.reduce((a, i) => a + (i.fiber || 0), 0);
          const mcal = meal.items.reduce((a, i) => a + (i.cal || 0), 0);
          return (
            <div key={mi} className="meal-card" style={{ animationDelay: mi * 0.07 + "s" }}>
              <div className="meal-head"><div><span style={{ fontWeight: 700, fontSize: 14 }}>{meal.name}</span><span style={{ fontSize: 12, color: "var(--muted)", marginLeft: 8 }}>{meal.time}</span></div><span className="bdg bdg-g">{mcal} kcal</span></div>
              <div className="meal-body">
                {meal.items.map((item, ii) => (
                  <div key={ii} className="food-row">
                    <div><span style={{ fontWeight: 600 }}>{item.food}</span><span style={{ color: "var(--muted)", fontSize: 12, marginLeft: 6 }}>{item.amount}</span></div>
                    <div style={{ display: "flex", gap: 8, fontSize: 12, flexWrap: "wrap", justifyContent: "flex-end" }}>
                      <span style={{ color: "var(--purple)" }}>{item.protein}g P</span><span style={{ color: "var(--orange)" }}>{item.carbs}g C</span><span style={{ color: "var(--red)" }}>{item.fats}g F</span><span style={{ color: "#34d399" }}>{item.fiber || 0}g Fib</span><span style={{ color: "var(--green)", fontWeight: 700 }}>{item.cal} cal</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="meal-total">
                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted2)", textTransform: "uppercase" }}>Meal Total:</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--green)" }}>{mcal} kcal</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--purple)" }}>{mp}g P</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--orange)" }}>{mc2}g C</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--red)" }}>{mf}g F</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#34d399" }}>{mfib}g Fib</span>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  if (tab === "foodlog") return (
    <div className="page">
      <div style={{ marginBottom: 22 }}><div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 22, fontWeight: 800 }}>Food Log</div><div style={{ color: "var(--muted)", fontSize: 13, marginTop: 5 }}>Log what you eat and compare against your plan</div></div>
      <FoodLogSection uid={uid} mealPlan={meals} targetNutrition={n} />
    </div>
  );

  if (tab === "sources") {
    const srcs = d.foodSources || { protein: ["", "", "", "", ""], carbs: ["", "", "", "", ""], fats: ["", "", "", "", ""] };
    const updateSource = async (type, idx, val) => {
      const updated = { ...srcs }; updated[type] = [...(updated[type] || ["", "", "", "", ""])]; updated[type][idx] = val;
      await updateDoc(doc(db, "clients", uid), { foodSources: updated });
    };
    return (
      <div className="page">
        <div style={{ marginBottom: 22 }}><div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 22, fontWeight: 800 }}>My Food Sources</div><div style={{ color: "var(--muted)", fontSize: 13, marginTop: 5 }}>Your coach uses these to design your meal plan</div></div>
        {[["protein", "Top 5 Protein Sources", "var(--purple)", "e.g. Eggs, Chicken, Paneer"], ["carbs", "Top 5 Carb Sources", "var(--orange)", "e.g. Rice, Oats, Sweet Potato"], ["fats", "Top 5 Fat Sources", "var(--red)", "e.g. Ghee, Nuts, Peanut Butter"]].map(([type, label, color, hint], ci) => (
          <div key={type} className="card" style={{ marginBottom: 16, animationDelay: ci * 0.1 + "s" }}>
            <div className="card-title" style={{ color }}>{label}</div>
            <div style={{ display: "grid", gap: 8 }}>
              {[0, 1, 2, 3, 4].map(i => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 26, height: 26, borderRadius: "50%", background: color + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color, flexShrink: 0 }}>{i + 1}</div>
                  <input className="fi" placeholder={i === 0 ? hint : "Option " + (i + 1)} defaultValue={(srcs[type] || [])[i] || ""} onBlur={e => updateSource(type, i, e.target.value)} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (tab === "photos") {
    const clientPhotos = d.photos || [];
    return (
      <div className="page">
        <div style={{ marginBottom: 20 }}><div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 22, fontWeight: 800 }}>Progress Photos & Videos</div></div>
        <div className="card" style={{ marginBottom: 16 }}>
          <label className="upload-area">
            <input type="file" accept="image/*,video/*" multiple style={{ display: "none" }} disabled={uploading} onChange={e => { uploadMedia(Array.from(e.target.files)); e.target.value = ""; }} />
            <div style={{ fontSize: 32, marginBottom: 8 }}>📷</div>
            <div style={{ fontWeight: 700, fontSize: 16, color: uploading ? "var(--muted)" : "var(--green)", marginBottom: 6 }}>{uploading ? "Uploading " + uploadPct + "%" : "Upload Photos or Videos"}</div>
            {uploading && <div className="prog-bar" style={{ maxWidth: 300, margin: "0 auto 10px" }}><div className="prog-fill" style={{ width: uploadPct + "%", background: "var(--green)" }} /></div>}
            <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
              <span className="bdg bdg-g">{clientPhotos.length} files</span>
            </div>
          </label>
        </div>
        {clientPhotos.length > 0 && (
          <div className="card">
            <div className="card-title">Your Media ({clientPhotos.length})</div>
            <div className="photo-grid">
              {[...clientPhotos].reverse().map((p, i) => (
                <div key={i} className="photo-item" style={{ animationDelay: i * 0.04 + "s" }}>
                  <div onClick={() => setViewMedia(p)} style={{ width: "100%", height: "100%" }}>
                    {p.type === "video" ? <><video src={p.url} style={{ width: "100%", height: "100%", objectFit: "cover" }} /><div className="video-badge">Video</div></> : <img src={p.url} alt="" />}
                  </div>
                  <div className="photo-label">{p.date}</div>
                  <button className="photo-del" onClick={e => { e.stopPropagation(); deleteMedia(p); }}>✕ Delete</button>
                </div>
              ))}
            </div>
          </div>
        )}
        {viewMedia && (
          <div className="ov" onClick={() => setViewMedia(null)}>
            <div style={{ maxWidth: 560, width: "100%" }}>
              {viewMedia.type === "video" ? <video src={viewMedia.url} controls autoPlay style={{ width: "100%", borderRadius: 16 }} /> : <img src={viewMedia.url} alt="" style={{ width: "100%", borderRadius: 16 }} />}
              <div style={{ textAlign: "center", marginTop: 10 }}><button className="btn btn-s btn-sm" onClick={() => setViewMedia(null)}>Close</button></div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (tab === "comparison") {
    const checkins2 = d.weeklyCheckins || [];
    return (
      <div className="page">
        <div style={{ marginBottom: 22 }}><div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 22, fontWeight: 800 }}>Week by Week Comparison</div></div>
        {checkins2.length < 2
          ? <div className="card"><div className="empty"><span className="empty-icon">📊</span><div className="empty-title">Not enough data yet</div><div className="empty-desc">Submit at least 2 weekly check-ins to see comparisons.</div></div></div>
          : <div className="cmp-grid">
            {[...checkins2].reverse().map((c, i) => (
              <div key={i} className="cmp-card" style={{ animationDelay: i * 0.06 + "s" }}>
                <div className="cmp-head" style={{ color: "var(--green)" }}>{c.week} — {c.date}</div>
                <div className="cmp-body">
                  <div className="cmp-stat"><span style={{ color: "var(--muted)" }}>Weight</span><span style={{ fontWeight: 700, color: "var(--green)" }}>{c.weight} kg</span></div>
                  <div className="cmp-stat"><span style={{ color: "var(--muted)" }}>Waist</span><span style={{ fontWeight: 700 }}>{c.waist ? c.waist + " cm" : "-"}</span></div>
                  <div className="cmp-stat"><span style={{ color: "var(--muted)" }}>Body Fat</span><span style={{ fontWeight: 700 }}>{c.bodyFat ? c.bodyFat + "%" : "-"}</span></div>
                  <div className="cmp-stat"><span style={{ color: "var(--muted)" }}>Training</span><span style={{ fontWeight: 700, color: "var(--green)" }}>{c.trainingPerformance}/10</span></div>
                  <div className="cmp-stat"><span style={{ color: "var(--muted)" }}>Sleep</span><span style={{ fontWeight: 700, color: "var(--blue)" }}>{c.sleepQuality}/10</span></div>
                </div>
              </div>
            ))}
          </div>}
      </div>
    );
  }

  if (tab === "chat") return (
    <div style={{ height: "calc(100vh - 58px)", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", background: "var(--s1)", display: "flex", alignItems: "center", gap: 12 }}>
        <div className="av av-sm av-g">A</div>
        <div><div style={{ fontWeight: 700 }}>Ankit (Coach)</div><div className="live" style={{ fontSize: 11 }}><span className="dot" />Online</div></div>
      </div>
      <ChatPanel uid={uid} otherId={coachId || "coach"} otherName="Ankit" myName={d.name || "Client"} />
    </div>
  );

  // HOME
  return (
    <div className="page">
      <div style={{ marginBottom: 22 }}>
        <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 26, fontWeight: 800, animation: "fadeDown .5s ease forwards" }}>Hey {(d.name || "").split(" ")[0]} 💪</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10, alignItems: "center" }}>
          <span className="phase">{d.phase} - Week {d.week}</span>
          <span className="live"><span className="dot" />Live sync</span>
        </div>
      </div>
      <div className="g4" style={{ marginBottom: 18 }}>
        {[["Weight KG", d.weight, "var(--green)"], ["Waist CM", d.waist, "var(--purple)"], ["Body Fat %", d.bodyFat, "var(--orange)"], ["Week", "W" + d.week, "var(--blue)"]].map(([l, v, co], i) => (
          <div key={l} style={{ animationDelay: i * 0.08 + "s" }}><MC label={l} value={v} color={co} /></div>
        ))}
      </div>

      {/* Quick actions */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
        <div style={{ background: "var(--green-bg)", border: "1px solid var(--green-b)", borderRadius: 12, padding: 16, cursor: "pointer", transition: "all .2s" }} onClick={() => setTab("checkin")}>
          <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: 15, color: "var(--green)" }}>📋 Weekly Check-in</div>
          <div style={{ fontSize: 12, color: "var(--muted2)", marginTop: 3 }}>Submit your weekly progress</div>
        </div>
        <div style={{ background: "rgba(59,130,246,.08)", border: "1px solid rgba(59,130,246,.25)", borderRadius: 12, padding: 16, cursor: "pointer", transition: "all .2s" }} onClick={() => setTab("chat")}>
          <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: 15, color: "var(--blue)" }}>💬 Chat with Coach</div>
          <div style={{ fontSize: 12, color: "var(--muted2)", marginTop: 3 }}>Ask questions or get support</div>
        </div>
      </div>

      <div className={`stagger-3 ${flash.msg ? "card flash" : "card"}`} style={{ marginBottom: 16 }}>
        <div className="card-title">Message from Coach {flash.msg && <span className="nbadge">New</span>}</div>
        <div className={"msg-b" + (d.coachMessage ? " has" : "")}>{d.coachMessage || "Your coach has not sent a message yet."}</div>
      </div>

      <div className="sh"><div className="sh-title">Today Targets</div><button className="sh-link" onClick={() => setTab("nutrition")}>Full plan</button></div>
      <div className="g4" style={{ marginBottom: 20 }}>
        {[["Calories", n.calories, "var(--green)"], ["Protein G", n.protein, "var(--purple)"], ["Carbs G", n.carbs, "var(--orange)"], ["Fats G", n.fats, "var(--red)"]].map(([l, v, co], i) => (
          <div key={l} style={{ animationDelay: i * 0.07 + "s" }}><MC label={l} value={v} color={co} /></div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        <button className="btn btn-p" style={{ flex: 1 }} onClick={() => setTab("foodlog")}>🍽 Log Food</button>
        <button className="btn btn-s" style={{ flex: 1 }} onClick={() => setTab("training")}>🏋 View Workout</button>
      </div>

      {(d.weightHistory || []).length > 1 && (
        <div className="card stagger-4" style={{ marginBottom: 20 }}>
          <div className="card-title">Weight Progress</div>
          <div style={{ height: 180 }}>
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
      )}
    </div>
  );
}

// ─── COACH DASHBOARD ──────────────────────────────────────────────────────────
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
    toast("Message sent!", "success"); setMsgText(""); setSendingMsg(false);
  };

  const autoSaveWorkout = async (plan) => { await updateDoc(doc(db, "clients", selId), { workoutPlan: plan }); toast("Workout saved!", "success"); };
  const autoSaveMeals = async (plan) => {
    const cal = plan.reduce((a, m) => a + m.items.reduce((b, i) => b + (i.cal || 0), 0), 0);
    const pro = plan.reduce((a, m) => a + m.items.reduce((b, i) => b + (i.protein || 0), 0), 0);
    const car = plan.reduce((a, m) => a + m.items.reduce((b, i) => b + (i.carbs || 0), 0), 0);
    const fat = plan.reduce((a, m) => a + m.items.reduce((b, i) => b + (i.fats || 0), 0), 0);
    const fib = plan.reduce((a, m) => a + m.items.reduce((b, i) => b + (i.fiber || 0), 0), 0);
    await updateDoc(doc(db, "clients", selId), { mealPlan: plan, nutrition: { calories: cal, protein: pro, carbs: car, fats: fat, fiber: fib } });
  };

  // Access management
  const setClientAccess = async (clientId, status) => {
    const confirmMsg = status === "terminated"
      ? "⚠️ PERMANENTLY TERMINATE this client? They will be treated as a new client if they try to sign in again."
      : status === "paused"
        ? "Pause this client's access? They won't be able to log in until resumed."
        : "Resume this client's access?";
    if (!window.confirm(confirmMsg)) return;
    await updateDoc(doc(db, "clients", clientId), { accessStatus: status });
    toast(`Client access ${status}!`, "success");
  };

  const addClient = async () => {
    if (!nc.name || !nc.email || !nc.password) { toast("Name, email and password required", "error"); return; }
    if (nc.password.length < 6) { toast("Password needs 6+ characters", "error"); return; }
    setAddSaving(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, nc.email, nc.password);
      await setDoc(doc(db, "clients", cred.user.uid), {
        name: nc.name.trim(), email: nc.email.trim().toLowerCase(), phone: nc.phone.trim(),
        avatar: nc.name.trim().split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase(),
        phase: nc.phase, week: parseInt(nc.week) || 1, weight: null, waist: null, bodyFat: null,
        nutrition: { calories: nc.calories, protein: nc.protein, carbs: nc.carbs, fats: nc.fats, fiber: nc.fiber },
        weightHistory: [], checkIns: [], weeklyCheckins: [], coachMessage: "", photos: [],
        mealPlan: DEFAULT_MEALS, workoutPlan: DEFAULT_WORKOUT,
        coachId: coachUid, coachEmail, role: "client", accessStatus: "active",
        createdAt: serverTimestamp(),
      });
      await signInWithEmailAndPassword(auth, coachEmail, window._cp);
      setShowAdd(false);
      setNc({ name: "", email: "", password: "", phone: "", phase: "Cut Phase 1", week: "1", calories: 2200, protein: 160, carbs: 240, fats: 70, fiber: 25 });
      toast(nc.name + " added!", "success");
    } catch (err) { toast(err.code === "auth/email-already-in-use" ? "Email already used!" : err.message, "error"); }
    setAddSaving(false);
  };

  if (loading) return <div className="spin-wrap"><div className="spinner-lg" /></div>;

  if (tab === "analytics") return (
    <div className="page">
      <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 22, fontWeight: 800, marginBottom: 22 }}>Analytics</div>
      <div className="g2">
        {clients.map((c, i) => (
          <div key={c.id} className="card" style={{ animationDelay: i * 0.08 + "s" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <div className="av av-sm av-g">{c.avatar}</div>
              <div><div style={{ fontWeight: 700, fontSize: 13 }}>{c.name}</div><div style={{ fontSize: 11, color: "var(--muted)" }}>{c.phase}</div></div>
              <span className="bdg bdg-g" style={{ marginLeft: "auto" }}>{c.weight ? c.weight + "kg" : "-"}</span>
            </div>
            {(c.weightHistory || []).length > 1
              ? <div style={{ height: 140 }}><ResponsiveContainer width="100%" height="100%"><AreaChart data={c.weightHistory}><defs><linearGradient id={"g" + c.id} x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#22c55e" stopOpacity={0.2} /><stop offset="95%" stopColor="#22c55e" stopOpacity={0} /></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke="#1e2d45" /><XAxis dataKey="week" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} /><YAxis domain={["auto", "auto"]} tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ background: "#0f1629", border: "1px solid #1e2d45", borderRadius: 8, fontSize: 11 }} /><Area type="monotone" dataKey="weight" stroke="#22c55e" strokeWidth={2} fill={"url(#g" + c.id + ")"} dot={{ fill: "#22c55e", r: 2.5, strokeWidth: 0 }} /></AreaChart></ResponsiveContainer></div>
              : <div style={{ height: 80, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)", fontSize: 12 }}>Awaiting check-ins</div>}
          </div>
        ))}
      </div>
    </div>
  );

  if (tab === "clients" && sel) {
    const n = sel.nutrition || {}; const media = sel.photos || [];
    const clientSources = sel.foodSources || null;
    const weeklyCheckins = sel.weeklyCheckins || [];
    const accessStatus = sel.accessStatus || "active";
    const WCOLOR = { Push: "#4ade80", Pull: "#818cf8", Legs: "#fb923c", Rest: "#475569", Cardio: "#38bdf8", "Full Body": "#f472b6" };

    return (
      <>
        {showWorkoutEditor && <ProfWorkoutEditor plan={sel.workoutPlan || DEFAULT_WORKOUT} onClose={() => setShowWorkoutEditor(false)} autoSave={autoSaveWorkout} />}
        {showMealEditor && <MealEditor plan={sel.mealPlan || DEFAULT_MEALS} onClose={() => setShowMealEditor(false)} clientSources={sel.foodSources || null} autoSave={autoSaveMeals} />}

        <div className="page">
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
            <button className="btn btn-s btn-sm" onClick={() => { setSelId(null); setSel(null); }}>← Back</button>
            <div className="av av-md av-g">{sel.avatar}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 800, fontSize: 19 }}>{sel.name}</div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>{sel.email}</div>
            </div>
            {/* Access status badge */}
            <span className={accessStatus === "active" ? "access-active" : accessStatus === "paused" ? "access-paused" : "access-terminated"}>
              {accessStatus === "active" ? "✓ Active" : accessStatus === "paused" ? "⏸ Paused" : "🚫 Terminated"}
            </span>
            <span className="live"><span className="dot" />Live</span>
          </div>

          {/* Access control buttons */}
          <div style={{ background: "var(--s2)", border: "1px solid var(--border)", borderRadius: 12, padding: 14, marginBottom: 16, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--muted2)", flex: 1 }}>Client Access Control:</div>
            {accessStatus !== "active" && (
              <button className="btn btn-p btn-sm" onClick={() => setClientAccess(selId, "active")}>▶ Resume Access</button>
            )}
            {accessStatus !== "paused" && accessStatus !== "terminated" && (
              <button className="btn btn-warn btn-sm" onClick={() => setClientAccess(selId, "paused")}>⏸ Pause Access</button>
            )}
            {accessStatus !== "terminated" && (
              <button className="btn btn-d btn-sm" onClick={() => setClientAccess(selId, "terminated")}>🚫 Terminate</button>
            )}
            {accessStatus === "paused" && <span style={{ fontSize: 11, color: "var(--yellow)" }}>Client cannot log in while paused</span>}
            {accessStatus === "terminated" && <span style={{ fontSize: 11, color: "var(--red)" }}>Client is permanently blocked. Resume to reactivate.</span>}
          </div>

          <div className="tab-bar">
            {[["overview","Overview"],["checkins","Check-ins"],["chat","Chat"],["photos","Media"],["comparison","Compare"],["message","Message"],["nutrition","Macros"],["meals","Meals"],["analytics","Analytics"],["sources","Sources"],["workout","Workout"],["phase","Phase"]].map(([k, l]) => (
              <button key={k} className={innerTab === k ? "tab-item active" : "tab-item"} onClick={() => setInnerTab(k)}>{l}</button>
            ))}
          </div>

          {innerTab === "overview" && (
            <div>
              <div className="g4" style={{ marginBottom: 16 }}>
                {[["Weight KG", sel.weight, "var(--green)"], ["Waist CM", sel.waist, "var(--purple)"], ["Body Fat %", sel.bodyFat, "var(--orange)"], ["Week", "W" + sel.week, "var(--blue)"]].map(([l, v, co], i) => (
                  <div key={l} style={{ animationDelay: i * 0.08 + "s" }}><MC label={l} value={v} color={co} /></div>
                ))}
              </div>
              {/* Latest weekly checkin summary */}
              {weeklyCheckins.length > 0 && (() => {
                const latest = [...weeklyCheckins].reverse()[0];
                return (
                  <div className="card stagger-2" style={{ marginBottom: 14 }}>
                    <div className="card-title">Latest Weekly Check-in <span className="bdg bdg-g">{latest.week}</span></div>
                    <div className="g3" style={{ marginBottom: 10 }}>
                      {[["Stress", latest.stressLevel, "#f87171"], ["Hunger", latest.hungerCravings, "#fb923c"], ["Training", latest.trainingPerformance, "#4ade80"], ["Nutrition", latest.nutritionAdherence, "#a78bfa"], ["Sleep", latest.sleepQuality, "#38bdf8"], ["Water", (latest.waterIntake || 0) + "L", "#38bdf8"]].map(([l, v, co]) => (
                        <div key={l} style={{ background: "var(--s2)", borderRadius: 9, padding: "10px 12px", border: "1px solid var(--border)", textAlign: "center" }}>
                          <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 22, fontWeight: 800, color: co }}>{v}</div>
                          <div style={{ fontSize: 10, color: "var(--muted)", textTransform: "uppercase", fontWeight: 600 }}>{l}</div>
                        </div>
                      ))}
                    </div>
                    {latest.noteToCoach && <div className="note-box">{latest.noteToCoach}</div>}
                    {latest.progressNote && <div style={{ marginTop: 8, background: "var(--s2)", borderRadius: 8, padding: "10px 12px", fontSize: 13, color: "var(--muted2)" }}><strong style={{ color: "var(--text)" }}>Client note:</strong> {latest.progressNote}</div>}
                  </div>
                );
              })()}
              <div className="g2 stagger-3" style={{ marginBottom: 14 }}>
                <div className="card"><div className="card-title">Check-ins</div><div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 36, fontWeight: 800, color: "var(--green)" }}>{weeklyCheckins.length}</div></div>
                <div className="card"><div className="card-title">Media</div><div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 36, fontWeight: 800, color: "var(--purple)" }}>{media.length}</div></div>
              </div>
              {(sel.weightHistory || []).length > 1 && (
                <div className="card stagger-4" style={{ marginBottom: 14 }}>
                  <div className="card-title">Weight Chart</div>
                  <div style={{ height: 170 }}><ResponsiveContainer width="100%" height="100%"><AreaChart data={sel.weightHistory}><defs><linearGradient id="wg2" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#22c55e" stopOpacity={0.2} /><stop offset="95%" stopColor="#22c55e" stopOpacity={0} /></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke="#1e2d45" /><XAxis dataKey="week" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} /><YAxis domain={["auto", "auto"]} tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ background: "#0f1629", border: "1px solid #1e2d45", borderRadius: 9 }} /><Area type="monotone" dataKey="weight" stroke="#22c55e" strokeWidth={2.5} fill="url(#wg2)" dot={{ fill: "#22c55e", r: 3, strokeWidth: 0 }} /></AreaChart></ResponsiveContainer></div>
                </div>
              )}
              <div className="card stagger-5"><div className="card-title">Current Message</div><div className={"msg-b" + (sel.coachMessage ? " has" : "")}>{sel.coachMessage || "No message sent yet."}</div></div>
              <div style={{ marginTop: 14 }}><SourcesTablePanel sources={clientSources} /></div>
            </div>
          )}

          {innerTab === "chat" && (
            <div className="card" style={{ padding: 0, overflow: "hidden", minHeight: 500 }}>
              <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)", fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: 15, display: "flex", alignItems: "center", gap: 8 }}>
                💬 Chat with {sel.name}
                <span className="live" style={{ marginLeft: "auto" }}><span className="dot" />Live</span>
              </div>
              <ChatPanel uid={coachUid} otherId={selId} otherName={sel.name} myName={coachName || "Coach"} />
            </div>
          )}

          {innerTab === "checkins" && (
            <div className="card">
              <div className="card-title">Weekly Check-in History — {sel.name}</div>
              {weeklyCheckins.length === 0 ? <div className="empty"><span className="empty-icon">📋</span><div className="empty-title">No check-ins yet</div></div>
                : [...weeklyCheckins].reverse().map((c, i) => (
                  <div key={i} className="checkin-week-card" style={{ animationDelay: i * 0.05 + "s" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                      <span className="bdg bdg-g">{c.week}</span>
                      <span style={{ fontSize: 12, color: "var(--muted)" }}>{c.date}</span>
                    </div>
                    <div className="g3" style={{ marginBottom: 10 }}>
                      {[["Weight", c.weight ? c.weight + "kg" : "-", "var(--green)"], ["Waist", c.waist ? c.waist + "cm" : "-", "var(--purple)"], ["Body Fat", c.bodyFat ? c.bodyFat + "%" : "-", "var(--orange)"]].map(([l, v, co]) => (
                        <div key={l} style={{ textAlign: "center" }}><div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 18, fontWeight: 800, color: co }}>{v}</div><div style={{ fontSize: 10, color: "var(--muted)", textTransform: "uppercase", fontWeight: 600 }}>{l}</div></div>
                      ))}
                    </div>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 8 }}>
                      {[["Training", c.trainingPerformance, "#4ade80"], ["Sleep", c.sleepQuality, "#38bdf8"], ["Stress", c.stressLevel, "#f87171"], ["Nutrition", c.nutritionAdherence, "#a78bfa"]].map(([l, v, co]) => (
                        <div key={l} style={{ background: "var(--s3)", borderRadius: 8, padding: "6px 12px", textAlign: "center", border: "1px solid var(--border)" }}>
                          <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 16, fontWeight: 800, color: co }}>{v}/10</div>
                          <div style={{ fontSize: 10, color: "var(--muted)", fontWeight: 600 }}>{l}</div>
                        </div>
                      ))}
                    </div>
                    {c.noteToCoach && <div className="note-box">{c.noteToCoach}</div>}
                    {c.progressNote && <div style={{ marginTop: 8, background: "var(--s3)", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "var(--muted2)" }}>📝 {c.progressNote}</div>}
                  </div>
                ))}
            </div>
          )}

          {innerTab === "photos" && (
            <div className="card">
              <div className="card-title">Media — {sel.name} ({media.length} files)</div>
              {media.length === 0 ? <div className="empty"><span className="empty-icon">📷</span><div className="empty-title">No media yet</div></div>
                : <div className="photo-grid">{[...media].reverse().map((p, i) => (<div key={i} className="photo-item"><div onClick={() => setViewMedia(p)} style={{ width: "100%", height: "100%" }}>{p.type === "video" ? <><video src={p.url} style={{ width: "100%", height: "100%", objectFit: "cover" }} /><div className="video-badge">Vid</div></> : <img src={p.url} alt="" />}</div><div className="photo-label">{p.date}</div></div>))}</div>}
            </div>
          )}

          {innerTab === "comparison" && (
            <div className="card">
              <div className="card-title">Progress Comparison — {sel.name}</div>
              {weeklyCheckins.length < 2 ? <div className="empty"><span className="empty-icon">📊</span><div className="empty-title">Need 2+ check-ins</div></div>
                : <div className="cmp-grid">{[...weeklyCheckins].reverse().map((c, i, arr) => { const prev = arr[i + 1]; const change = prev ? (parseFloat(c.weight) - parseFloat(prev.weight)).toFixed(1) : null; return (<div key={i} className="cmp-card"><div className="cmp-head" style={{ color: "var(--green)" }}>{c.week} — {c.date}</div><div className="cmp-body"><div className="cmp-stat"><span style={{ color: "var(--muted)" }}>Weight</span><span style={{ fontWeight: 700, color: "var(--green)" }}>{c.weight} kg</span></div><div className="cmp-stat"><span style={{ color: "var(--muted)" }}>Waist</span><span style={{ fontWeight: 700 }}>{c.waist ? c.waist + " cm" : "-"}</span></div><div className="cmp-stat"><span style={{ color: "var(--muted)" }}>Training</span><span style={{ fontWeight: 700 }}>{c.trainingPerformance}/10</span></div>{change !== null && <div className="cmp-stat"><span style={{ color: "var(--muted)" }}>Change</span><span style={{ fontWeight: 700, color: parseFloat(change) < 0 ? "var(--green)" : "var(--red)" }}>{parseFloat(change) > 0 ? "+" : ""}{change} kg</span></div>}</div></div>); })}</div>}
            </div>
          )}

          {innerTab === "message" && (
            <div className="card">
              <div className="card-title">Message to {sel.name}</div>
              <div className="alert alert-g">Current: {sel.coachMessage || "None"}</div>
              <div className="fld"><div className="fl">New Message</div><textarea className="fta" placeholder={"Great work " + sel.name.split(" ")[0] + "! Keep it up"} value={msgText} onChange={e => setMsgText(e.target.value)} /></div>
              <div className="alert alert-w">Client sees this instantly on their home screen!</div>
              <button className="btn btn-p" onClick={sendMessage} disabled={sendingMsg || !msgText.trim()}>{sendingMsg ? "Sending..." : "Send Message"}</button>
            </div>
          )}

          {innerTab === "nutrition" && (
            <div className="card">
              <div className="card-title">Macro Targets — {sel.name}</div>
              <div className="alert alert-w">Syncs instantly to client!</div>
              <div className="fg">
                {[["Calories (kcal)", "calories", "var(--green)"], ["Protein (g)", "protein", "var(--purple)"], ["Carbs (g)", "carbs", "var(--orange)"], ["Fats (g)", "fats", "var(--red)"], ["Fiber (g)", "fiber", "#34d399"]].map(([l, k, co]) => (
                  <div key={k} className="fld"><div className="fl" style={{ color: co }}>{l}</div><NumInput value={n[k] || 0} color={co} onChange={v => updateN(k, v)} /></div>
                ))}
              </div>
              <div className="alert alert-g">Current: {n.calories} kcal — {n.protein}g P — {n.carbs}g C — {n.fats}g F</div>
            </div>
          )}

          {innerTab === "workout" && (
            <div className="card">
              <div className="card-title">Workout Plan — {sel.name} <button className="btn btn-p btn-sm" onClick={() => setShowWorkoutEditor(true)}>✏ Edit Plan (Full Screen)</button></div>
              <div className="alert alert-g">Professional day-by-day editor with auto-save!</div>
              {(sel.workoutPlan || DEFAULT_WORKOUT).map((day, di) => {
                const dc = DAY_COLORS[di % DAY_COLORS.length];
                return (
                  <div key={di} style={{ background: dc.bg, border: "2px solid " + dc.border, borderRadius: 10, padding: 12, marginBottom: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: day.type !== "Rest" ? 10 : 0 }}>
                      <div style={{ width: 28, height: 28, borderRadius: "50%", background: dc.accent + "22", border: "2px solid " + dc.border, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: dc.accent, flexShrink: 0 }}>{di + 1}</div>
                      <span style={{ fontWeight: 700, color: dc.accent }}>{day.day}</span>
                      <span style={{ display: "inline-flex", padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: dc.accent + "22", color: dc.accent, border: "1px solid " + dc.border }}>{day.type}</span>
                      {day.type !== "Rest" && <span style={{ fontSize: 12, color: "var(--muted)", marginLeft: "auto" }}>{day.exercises.length} ex</span>}
                    </div>
                    {day.type !== "Rest" && day.exercises.map((ex, ei) => (
                      <div key={ei} style={{ padding: "7px 0", borderBottom: "1px solid " + dc.border, fontSize: 13 }}>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span style={{ fontWeight: 600 }}>{ex.name}</span>
                          <span style={{ color: "var(--muted)", fontSize: 12 }}>{ex.sets}×{ex.reps}</span>
                        </div>
                        {ex.note && <div className="note-box" style={{ marginTop: 4 }}>{ex.note}</div>}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          )}

          {innerTab === "phase" && (
            <div className="card">
              <div className="card-title">Phase & Stats — {sel.name}</div>
              <div className="fg">
                <div className="fld"><div className="fl">Phase</div><select className="fsel" value={sel.phase} onChange={e => { update("phase", e.target.value); toast("Phase updated!", "success"); }}><option>Cut Phase 1</option><option>Cut Phase 2</option><option>Bulk Phase 1</option><option>Bulk Phase 2</option><option>Maintenance</option><option>Peak Week</option><option>Reverse Diet</option></select></div>
                <div className="fld"><div className="fl">Current Week</div><input className="fi" type="number" min="1" max="52" value={sel.week} onChange={e => update("week", parseInt(e.target.value) || 1)} /></div>
              </div>
            </div>
          )}

          {innerTab === "analytics" && (() => {
            const mealPlan = sel.mealPlan || DEFAULT_MEALS;
            const allItems = mealPlan.flatMap(m => m.items);
            const totP = allItems.reduce((a, i) => a + (i.protein || 0), 0);
            const totC = allItems.reduce((a, i) => a + (i.carbs || 0), 0);
            const totF = allItems.reduce((a, i) => a + (i.fats || 0), 0);
            const totFib = allItems.reduce((a, i) => a + (i.fiber || 0), 0);
            const totCal = allItems.reduce((a, i) => a + (i.cal || 0), 0);
            return (
              <div>
                <div className="card stagger-1" style={{ marginBottom: 14 }}>
                  <div className="card-title">Meal Plan Totals</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    {[["Total Protein", totP + "g", "var(--purple)"], ["Total Carbs", totC + "g", "var(--orange)"], ["Total Fats", totF + "g", "var(--red)"], ["Total Fiber", totFib + "g", "#34d399"], ["Total Calories", totCal + " kcal", "var(--green)"]].map(([l, v, co], i) => (
                      <div key={l} style={{ background: "var(--s2)", borderRadius: 10, padding: "12px 14px", border: "1px solid var(--border)" }}>
                        <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 20, fontWeight: 800, color: co }}>{v}</div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", marginTop: 4 }}>{l}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="card stagger-2">
                  <div className="card-title">Per Meal</div>
                  <table className="tbl">
                    <thead><tr><th>Meal</th><th>Time</th><th style={{ color: "var(--green)" }}>kcal</th><th style={{ color: "var(--purple)" }}>P</th><th style={{ color: "var(--orange)" }}>C</th><th style={{ color: "var(--red)" }}>F</th></tr></thead>
                    <tbody>{mealPlan.map((meal, mi) => { const mp = meal.items.reduce((a, i) => a + (i.protein || 0), 0); const mc = meal.items.reduce((a, i) => a + (i.carbs || 0), 0); const mf = meal.items.reduce((a, i) => a + (i.fats || 0), 0); const mcal = meal.items.reduce((a, i) => a + (i.cal || 0), 0); return (<tr key={mi}><td style={{ fontWeight: 600 }}>{meal.name}</td><td style={{ color: "var(--muted)", fontSize: 12 }}>{meal.time}</td><td style={{ fontWeight: 700, color: "var(--green)" }}>{mcal}</td><td style={{ color: "var(--purple)" }}>{mp}</td><td style={{ color: "var(--orange)" }}>{mc}</td><td style={{ color: "var(--red)" }}>{mf}</td></tr>); })}</tbody>
                  </table>
                </div>
              </div>
            );
          })()}

          {innerTab === "sources" && (() => {
            const sources = sel.foodSources || {};
            return (
              <div className="card">
                <div className="card-title">{sel.name}'s Food Sources</div>
                <SourcesTablePanel sources={sel.foodSources || null} />
                {[["protein", "Protein Sources", "var(--purple)"], ["carbs", "Carb Sources", "var(--orange)"], ["fats", "Fat Sources", "var(--red)"]].map(([type, label, color]) => (
                  <div key={type} style={{ marginBottom: 18 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color, marginBottom: 8 }}>{label}</div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {[0, 1, 2, 3, 4].map(i => { const val = (sources[type] || [])[i]; return val ? <span key={i} className="bdg" style={{ background: color + "15", color, border: "1px solid " + color + "40" }}>{val}</span> : null; })}
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}

          {innerTab === "meals" && (
            <div className="card">
              <div className="card-title">Meal Plan — {sel.name} <button className="btn btn-p btn-sm" onClick={() => setShowMealEditor(true)}>✏ Edit Plan</button></div>
              {(sel.mealPlan || DEFAULT_MEALS).map((meal, mi) => (
                <div key={mi} className="meal-card">
                  <div className="meal-head"><div><span style={{ fontWeight: 700 }}>{meal.name}</span><span style={{ fontSize: 12, color: "var(--muted)", marginLeft: 8 }}>{meal.time}</span></div><span className="bdg bdg-g">{meal.items.reduce((a, i) => a + (i.cal || 0), 0)} kcal</span></div>
                  <div className="meal-body">
                    {meal.items.map((item, ii) => (
                      <div key={ii} className="food-row">
                        <div><span style={{ fontWeight: 600 }}>{item.food}</span><span style={{ color: "var(--muted)", fontSize: 12, marginLeft: 6 }}>{item.amount}</span></div>
                        <div style={{ display: "flex", gap: 6, fontSize: 12 }}>
                          <span style={{ color: "var(--purple)" }}>{item.protein}g P</span><span style={{ color: "var(--orange)" }}>{item.carbs}g C</span><span style={{ color: "var(--red)" }}>{item.fats}g F</span><span style={{ color: "var(--green)", fontWeight: 700 }}>{item.cal} cal</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <MealTotals items={meal.items} />
                </div>
              ))}
            </div>
          )}

          {viewMedia && (
            <div className="ov" onClick={() => setViewMedia(null)}>
              <div style={{ maxWidth: 520, width: "100%" }}>
                {viewMedia.type === "video" ? <video src={viewMedia.url} controls style={{ width: "100%", borderRadius: 16 }} /> : <img src={viewMedia.url} alt="" style={{ width: "100%", borderRadius: 16 }} />}
                <div style={{ textAlign: "center", marginTop: 8 }}><button className="btn btn-s btn-sm" onClick={() => setViewMedia(null)}>Close</button></div>
              </div>
            </div>
          )}
        </div>
      </>
    );
  }

  if (tab === "clients") return (
    <div className="page">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div><div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 22, fontWeight: 800 }}>My Clients</div><div style={{ color: "var(--muted)", fontSize: 13, marginTop: 3 }}>{clients.length} total</div></div>
        <button className="btn btn-p" onClick={() => setShowAdd(true)}>+ Add Client</button>
      </div>
      {clients.length === 0
        ? <div className="card"><div className="empty"><span className="empty-icon">👥</span><div className="empty-title">No clients yet</div><button className="btn btn-p" onClick={() => setShowAdd(true)}>+ Add Client</button></div></div>
        : <div className="card">
          <table className="tbl">
            <thead><tr><th>Client</th><th>Phase</th><th>Weight</th><th>Check-ins</th><th>Access</th><th>Actions</th></tr></thead>
            <tbody>
              {clients.map(c => {
                const accessStatus = c.accessStatus || "active";
                return (
                  <tr key={c.id}>
                    <td><div style={{ display: "flex", alignItems: "center", gap: 9 }}><div className="av av-sm av-g">{c.avatar}</div><div><div style={{ fontWeight: 600 }}>{c.name}</div><div style={{ fontSize: 11, color: "var(--muted)" }}>{c.email}</div></div></div></td>
                    <td><span className="bdg bdg-g">{c.phase}</span></td>
                    <td style={{ fontWeight: 600 }}>{c.weight ? c.weight + "kg" : "-"}</td>
                    <td><span className="bdg bdg-p">{(c.weeklyCheckins || []).length}</span></td>
                    <td>
                      <span className={accessStatus === "active" ? "access-active" : accessStatus === "paused" ? "access-paused" : "access-terminated"} style={{ fontSize: 10 }}>
                        {accessStatus}
                      </span>
                    </td>
                    <td><div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                      <button className="btn btn-s btn-sm" onClick={() => { setSelId(c.id); setInnerTab("overview"); }}>View</button>
                      <button className="btn btn-s btn-sm" onClick={() => { setSelId(c.id); setInnerTab("workout"); }}>Workout</button>
                      {accessStatus === "active" && <button className="btn btn-warn btn-sm" onClick={() => setClientAccess(c.id, "paused")}>⏸</button>}
                      {accessStatus === "paused" && <button className="btn btn-p btn-sm" onClick={() => setClientAccess(c.id, "active")}>▶</button>}
                    </div></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>}

      {showAdd && (
        <div className="ov" onClick={e => e.target === e.currentTarget && setShowAdd(false)}>
          <div className="modal">
            <div className="mh"><div><div className="mt">Add New Client</div><div className="ms">Creates login credentials</div></div><button className="xbtn" onClick={() => setShowAdd(false)}>✕</button></div>
            <div className="mb2">
              <div className="sec-lbl">Client Info</div>
              <div className="fg">
                <div className="fld"><div className="fl">Full Name</div><input className="fi" placeholder="Rahul Kumar" value={nc.name} onChange={e => setNc(p => ({ ...p, name: e.target.value }))} /></div>
                <div className="fld"><div className="fl">Phone</div><input className="fi" placeholder="+91 98765 43210" value={nc.phone} onChange={e => setNc(p => ({ ...p, phone: e.target.value }))} /></div>
              </div>
              <div className="sec-lbl">Login Credentials</div>
              <div className="fg">
                <div className="fld"><div className="fl">Email</div><input className="fi" type="email" value={nc.email} onChange={e => setNc(p => ({ ...p, email: e.target.value }))} /></div>
                <div className="fld"><div className="fl">Password</div><input className="fi" type="text" placeholder="min 6 chars" value={nc.password} onChange={e => setNc(p => ({ ...p, password: e.target.value }))} /></div>
              </div>
              <div className="alert alert-b">Share app URL + email + password via WhatsApp!</div>
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
                <button className="btn btn-p" style={{ flex: 1 }} onClick={addClient} disabled={addSaving}>{addSaving ? "Creating..." : "Create Client Account"}</button>
                <button className="btn btn-s" onClick={() => setShowAdd(false)}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // COACH HOME
  return (
    <div className="page">
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 26, fontWeight: 800, animation: "fadeDown .5s ease forwards" }}>Welcome back, {coachName?.split(" ")[0] || "Ankit"} 👋</div>
        <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 5 }}>{clients.length} client{clients.length !== 1 ? "s" : ""} — Fit with Ankit</div>
      </div>
      <div className="g4" style={{ marginBottom: 24 }}>
        {[
          ["Total Clients", clients.length, "var(--green)"],
          ["Weekly Check-ins", clients.reduce((a, c) => a + (c.weeklyCheckins || []).length, 0), "var(--blue)"],
          ["Active", clients.filter(c => (c.accessStatus || "active") === "active").length, "var(--purple)"],
          ["Paused", clients.filter(c => c.accessStatus === "paused").length, "var(--orange)"]
        ].map(([l, v, co], i) => (
          <div key={l} style={{ animationDelay: i * 0.09 + "s" }}><div className="mc"><div className="mc-val" style={{ color: co }}>{v}</div><div className="mc-label">{l}</div></div></div>
        ))}
      </div>
      {clients.length === 0
        ? <div className="card"><div className="empty"><span className="empty-icon">🚀</span><div className="empty-title">Ready to go!</div><div className="empty-desc">Add your first client to get started.</div><button className="btn btn-p" style={{ padding: "11px 24px" }} onClick={() => setTab("clients")}>+ Add First Client</button></div></div>
        : <>
          <div className="sh"><div className="sh-title">Clients</div><button className="sh-link" onClick={() => setTab("clients")}>Manage all</button></div>
          <div className="ga">
            {clients.map((c, idx) => {
              const accessStatus = c.accessStatus || "active";
              return (
                <div key={c.id} className="cl-card" style={{ animationDelay: idx * 0.07 + "s", opacity: accessStatus === "terminated" ? 0.5 : 1 }} onClick={() => { setTab("clients"); setSelId(c.id); setInnerTab("overview"); }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 12 }}>
                    <div className="av av-md av-g">{c.avatar}</div>
                    <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 700, fontSize: 14 }}>{c.name}</div><div style={{ fontSize: 11, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.email}</div></div>
                    <span className="bdg bdg-g">W{c.week}</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
                    <div style={{ padding: "8px 10px", background: "var(--s2)", borderRadius: 9, border: "1px solid var(--border)" }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--green)", fontFamily: "'Outfit',sans-serif" }}>{c.weight ? c.weight + "kg" : "-"}</div>
                      <div style={{ fontSize: 10, color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", marginTop: 2 }}>Weight</div>
                    </div>
                    <div style={{ padding: "8px 10px", background: "var(--s2)", borderRadius: 9, border: "1px solid var(--border)" }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--purple)", fontFamily: "'Outfit',sans-serif" }}>{(c.weeklyCheckins || []).length}</div>
                      <div style={{ fontSize: 10, color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", marginTop: 2 }}>Check-ins</div>
                    </div>
                  </div>
                  <div style={{ padding: "7px 10px", background: accessStatus === "active" ? "var(--green-bg)" : accessStatus === "paused" ? "rgba(251,191,36,.08)" : "rgba(248,113,113,.08)", borderRadius: 8, fontSize: 11, color: accessStatus === "active" ? "var(--green)" : accessStatus === "paused" ? "var(--yellow)" : "var(--red)", fontWeight: 600, border: "1px solid " + (accessStatus === "active" ? "var(--green-b)" : accessStatus === "paused" ? "rgba(251,191,36,.2)" : "rgba(248,113,113,.2)") }}>
                    {accessStatus === "active" ? "✓ Active" : accessStatus === "paused" ? "⏸ Paused" : "🚫 Terminated"}
                  </div>
                </div>
              );
            })}
          </div>
        </>}
    </div>
  );
}

// ─── AUTH ─────────────────────────────────────────────────────────────────────
function SplashScreen({ onDone }) {
  const [exiting, setExiting] = useState(false);
  useEffect(() => { const t = setTimeout(() => { setExiting(true); setTimeout(onDone, 500); }, 2800); return () => clearTimeout(t); }, []);
  return (
    <div className={`splash ${exiting ? "exit" : ""}`}>
      <div className="splash-logo">FwA</div>
      <div className="splash-title">Fit with <span>Ankit</span></div>
      <div className="splash-tagline">Your transformation starts here</div>
      <div className="splash-bar-wrap"><div className="splash-bar" /></div>
      <div className="splash-dots"><div className="splash-dot" /><div className="splash-dot" /><div className="splash-dot" /></div>
    </div>
  );
}

function LoginScreen({ onLogin, onSetup, coachExists }) {
  const [em, setEm] = useState(""); const [pw, setPw] = useState(""); const [err, setErr] = useState(""); const [ld, setLd] = useState(false);
  const [showForgot, setShowForgot] = useState(false); const [forgotEm, setForgotEm] = useState(""); const [forgotSent, setForgotSent] = useState(false); const [forgotLd, setForgotLd] = useState(false);

  const login = async () => {
    setErr(""); setLd(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, em.trim(), pw);
      const uid = cred.user.uid;
      const uSnap = await getDoc(doc(db, "users", uid));
      if (uSnap.exists()) { window._cp = pw; onLogin({ uid, email: em.trim(), ...uSnap.data() }); return; }
      const cSnap = await getDoc(doc(db, "clients", uid));
      if (cSnap.exists()) {
        const cData = cSnap.data();
        const accessStatus = cData.accessStatus || "active";
        if (accessStatus === "paused") { await signOut(auth); setErr("Your access is temporarily paused. Please contact your coach."); setLd(false); return; }
        if (accessStatus === "terminated") {
          // Treat as new - clear data
          await updateDoc(doc(db, "clients", uid), {
            weight: null, waist: null, bodyFat: null, weightHistory: [], checkIns: [], weeklyCheckins: [],
            coachMessage: "", photos: [], mealPlan: DEFAULT_MEALS, workoutPlan: DEFAULT_WORKOUT,
            accessStatus: "active", foodLogs: {}, savedFoods: []
          });
          onLogin({ uid, email: em.trim(), role: "client", ...cData, accessStatus: "active" }); return;
        }
        onLogin({ uid, email: em.trim(), role: "client", ...cData }); return;
      }
      setErr("Account not found. Contact your coach.");
    } catch (e) { setErr(e.code === "auth/invalid-credential" || e.code === "auth/wrong-password" ? "Incorrect email or password." : e.message); }
    setLd(false);
  };

  const sendReset = async () => {
    if (!forgotEm) return; setForgotLd(true);
    try { await sendPasswordResetEmail(auth, forgotEm.trim()); setForgotSent(true); } catch { setErr("Could not send reset email."); }
    setForgotLd(false);
  };

  if (showForgot) return (
    <div className="auth-wrap"><div className="auth-card">
      <div className="auth-logo">FwA</div><div className="auth-title">Reset Password</div><div className="auth-sub">Enter your email</div>
      {forgotSent ? <div className="alert alert-g" style={{ textAlign: "center" }}>Reset email sent! Check inbox.<div style={{ marginTop: 14 }}><button className="btn btn-s" onClick={() => { setShowForgot(false); setForgotSent(false); }}>Back to Login</button></div></div>
        : <><div className="fld"><div className="fl">Email</div><input className="fi" type="email" value={forgotEm} onChange={e => setForgotEm(e.target.value)} onKeyDown={e => e.key === "Enter" && sendReset()} /></div>{err && <div className="alert alert-e">{err}</div>}<button className="auth-btn" onClick={sendReset} disabled={forgotLd || !forgotEm}>{forgotLd ? "Sending..." : "Send Reset Email"}</button><div className="auth-switch"><button onClick={() => setShowForgot(false)}>Back to Login</button></div></>}
    </div></div>
  );

  return (
    <div className="auth-wrap"><div className="auth-card">
      <div className="auth-logo">FwA</div>
      <div className="auth-title" style={{ animation: "fadeUp .5s ease .1s both" }}>Fit with Ankit</div>
      <div className="auth-sub" style={{ animation: "fadeUp .5s ease .2s both" }}>Your personalised coaching platform</div>
      <div className="fld" style={{ animation: "fadeUp .5s ease .3s both" }}><div className="fl">Email</div><input className="fi" type="email" placeholder="your@email.com" value={em} onChange={e => setEm(e.target.value)} onKeyDown={e => e.key === "Enter" && login()} /></div>
      <div className="fld" style={{ animation: "fadeUp .5s ease .35s both" }}><div className="fl">Password</div><input className="fi" type="password" placeholder="password" value={pw} onChange={e => setPw(e.target.value)} onKeyDown={e => e.key === "Enter" && login()} /></div>
      {err && <div className="alert alert-e">{err}</div>}
      <div style={{ animation: "fadeUp .5s ease .4s both" }}><button className="auth-btn" onClick={login} disabled={ld}>{ld ? "Signing in..." : "Sign In"}</button></div>
      <div style={{ textAlign: "right", marginTop: 8 }}><button style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, color: "var(--muted)", textDecoration: "underline" }} onClick={() => setShowForgot(true)}>Forgot password?</button></div>
      {!coachExists && <div className="auth-switch">First time? <button onClick={onSetup}>Create coach account</button></div>}
      {coachExists && <div style={{ textAlign: "center", marginTop: 14, fontSize: 11, color: "var(--muted)", padding: 10, background: "var(--s2)", borderRadius: 10, border: "1px solid var(--border)" }}>Contact Ankit for your login credentials.</div>}
    </div></div>
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
    } catch (e) { setErr(e.code === "auth/email-already-in-use" ? "Email already registered." : e.message); }
    setLd(false);
  };
  return (
    <div className="auth-wrap"><div className="auth-card">
      <div className="auth-logo">FwA</div><div className="auth-title">Setup Fit with Ankit</div><div className="auth-sub">Create your coach account</div>
      <div className="fld"><div className="fl">Full Name</div><input className="fi" placeholder="Ankit" value={f.name} onChange={e => setF(p => ({ ...p, name: e.target.value }))} /></div>
      <div className="fld"><div className="fl">Email</div><input className="fi" type="email" placeholder="ankit@email.com" value={f.email} onChange={e => setF(p => ({ ...p, email: e.target.value }))} /></div>
      <div className="fld"><div className="fl">Password</div><input className="fi" type="password" placeholder="min 6 characters" value={f.pass} onChange={e => setF(p => ({ ...p, pass: e.target.value }))} onKeyDown={e => e.key === "Enter" && create()} /></div>
      {err && <div className="alert alert-e">{err}</div>}
      <button className="auth-btn" onClick={create} disabled={ld}>{ld ? "Creating..." : "Create Coach Account"}</button>
    </div></div>
  );
}

// ─── ROOT APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const { t, show } = useToast();
  const [user, setUser] = useState(null); const [authLoading, setAuthLoading] = useState(true);
  const [coachExists, setCoachExists] = useState(false); const [screen, setScreen] = useState("login"); const [tab, setTab] = useState("home");
  const [showSplash, setShowSplash] = useState(false);
  const splashShownRef = useRef(false);

  useEffect(() => {
    getDoc(doc(db, "settings", "app")).then(s => { if (s.exists() && s.data().coachExists) setCoachExists(true); }).catch(() => {});
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

  const handleLogin = (u) => {
    if (!splashShownRef.current) { splashShownRef.current = true; setShowSplash(true); setTimeout(() => { setUser(u); setShowSplash(false); }, 3000); }
    else { setUser(u); }
  };

  const logout = async () => { await signOut(auth); setUser(null); setTab("home"); splashShownRef.current = false; };

  if (showSplash) return <div><style>{CSS}</style><SplashScreen onDone={() => setShowSplash(false)} /></div>;
  if (authLoading) return <div style={{ background: "#080d1a" }}><style>{CSS}</style><div className="spin-wrap" style={{ minHeight: "100vh" }}><div className="spinner-lg" /></div></div>;

  if (!user) return (
    <div><style>{CSS}</style>
      {screen === "setup" ? <SetupScreen onDone={u => { handleLogin(u); setCoachExists(true); }} /> : <LoginScreen onLogin={handleLogin} onSetup={() => setScreen("setup")} coachExists={coachExists} />}
      {t && <div className={t.type === "error" ? "toast toast-e" : "toast toast-s"}>{t.msg}</div>}
    </div>
  );

  // Check client access status
  if (user.role === "client") {
    const accessStatus = user.accessStatus || "active";
    if (accessStatus === "paused" || accessStatus === "terminated") {
      return <div><style>{CSS}</style><BlockedScreen status={accessStatus} onLogout={logout} /></div>;
    }
  }

  const isCoach = user.role === "coach";
  const tabs = isCoach
    ? [["home", "Dashboard"], ["clients", "Clients"], ["analytics", "Analytics"]]
    : [["home", "Home"], ["checkin", "Weekly Check-in"], ["nutrition", "Nutrition"], ["foodlog", "Food Log"], ["sources", "My Sources"], ["training", "Training"], ["photos", "Photos"], ["comparison", "Compare"], ["chat", "Chat"]];

  return (
    <div style={{ minHeight: "100vh" }}>
      <style>{CSS}</style>
      <nav className="nav">
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <button className="nav-logo" onClick={() => setTab("home")}>
            <div className="nav-icon">FwA</div>
            <span className="nav-brand">Fit with <span>Ankit</span></span>
          </button>
          <div className="nav-tabs">
            {tabs.map(([k, l]) => <button key={k} className={tab === k ? "nav-tab active" : "nav-tab"} onClick={() => setTab(k)}>{l}</button>)}
          </div>
        </div>
        <div className="nav-right">
          <div className="nav-av">{(user.name || user.email || "U").slice(0, 2).toUpperCase()}</div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 12, fontWeight: 600 }}>{user.name || user.email}</div>
            <div style={{ fontSize: 10, color: isCoach ? "var(--green)" : "var(--purple)", fontWeight: 600, textTransform: "capitalize" }}>{user.role}</div>
          </div>
          <button className="signout" onClick={logout}>Sign out</button>
        </div>
      </nav>
      <div style={{ flex: 1 }}>
        {isCoach
          ? <CoachDash coachUid={user.uid} coachEmail={user.email} coachName={user.name} tab={tab} setTab={setTab} toast={show} />
          : <ClientDash uid={user.uid} coachId={user.coachId} tab={tab} setTab={setTab} toast={show} user={user} />}
      </div>
      {t && <div className={t.type === "error" ? "toast toast-e" : "toast toast-s"}>{t.msg}</div>}
    </div>
  );
}
