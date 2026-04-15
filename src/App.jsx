import {
  CSS_ADDITIONS,
  EnhancedFoodLogSection,
  ClientProfilePanel,
  AddClientFullscreenEnhanced,
  MyProfileSection
} from "./additions";
import { useState, useEffect, useRef, useCallback } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { auth, db } from "./firebase";
import {
  signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signOut, onAuthStateChanged, sendPasswordResetEmail,
} from "firebase/auth";
import {
  doc, getDoc, setDoc, updateDoc, onSnapshot,
  collection, query, where, serverTimestamp, addDoc, orderBy, getDocs, deleteDoc
} from "firebase/firestore";

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
    xhr.onload = () => { if (xhr.status === 200) resolve(JSON.parse(xhr.responseText)); else reject(new Error("Upload failed: " + xhr.responseText)); };
    xhr.onerror = () => reject(new Error("Network error"));
    xhr.send(formData);
  });
}

const DAY_COLORS = [
  { bg: "rgba(34,197,94,.08)",   border: "rgba(34,197,94,.4)",   accent: "#22c55e", label: "MON" },
  { bg: "rgba(59,130,246,.08)",  border: "rgba(59,130,246,.4)",  accent: "#3b82f6", label: "TUE" },
  { bg: "rgba(167,139,250,.08)", border: "rgba(167,139,250,.4)", accent: "#a78bfa", label: "WED" },
  { bg: "rgba(251,146,60,.08)",  border: "rgba(251,146,60,.4)",  accent: "#fb923c", label: "THU" },
  { bg: "rgba(248,113,113,.08)", border: "rgba(248,113,113,.4)", accent: "#f87171", label: "FRI" },
  { bg: "rgba(251,191,36,.08)",  border: "rgba(251,191,36,.4)",  accent: "#fbbf24", label: "SAT" },
  { bg: "rgba(20,184,166,.08)",  border: "rgba(20,184,166,.4)",  accent: "#14b8a6", label: "SUN" },
];

const WCOLOR = { Push: "#4ade80", Pull: "#818cf8", Legs: "#fb923c", Rest: "#475569", Cardio: "#38bdf8", "Full Body": "#f472b6", Upper: "#e879f9", Lower: "#f59e0b", "Active Recovery": "#34d399" };

const DEFAULT_WORKOUT = [
  { day: "Monday",    type: "Push", exercises: [{ name: "Bench Press",     sets: 4, reps: "8-10",  rest: "90s",  videoUrl: "", note: "" }, { name: "Overhead Press",   sets: 3, reps: "10-12", rest: "75s",  videoUrl: "", note: "" }, { name: "Tricep Pushdowns", sets: 3, reps: "12-15", rest: "60s",  videoUrl: "", note: "" }] },
  { day: "Tuesday",   type: "Pull", exercises: [{ name: "Pull-ups",        sets: 4, reps: "8-10",  rest: "90s",  videoUrl: "", note: "" }, { name: "Barbell Row",      sets: 4, reps: "8-10",  rest: "90s",  videoUrl: "", note: "" }, { name: "Hammer Curls",     sets: 3, reps: "12-15", rest: "60s",  videoUrl: "", note: "" }] },
  { day: "Wednesday", type: "Rest", exercises: [] },
  { day: "Thursday",  type: "Legs", exercises: [{ name: "Back Squat",      sets: 4, reps: "6-8",   rest: "120s", videoUrl: "", note: "" }, { name: "Romanian DL",      sets: 4, reps: "8-10",  rest: "90s",  videoUrl: "", note: "" }, { name: "Leg Curl",         sets: 3, reps: "12-15", rest: "60s",  videoUrl: "", note: "" }] },
  { day: "Friday",    type: "Push", exercises: [{ name: "Incline DB Press", sets: 4, reps: "10-12", rest: "90s",  videoUrl: "", note: "" }, { name: "Lateral Raises",   sets: 4, reps: "15-20", rest: "45s",  videoUrl: "", note: "" }] },
  { day: "Saturday",  type: "Pull", exercises: [{ name: "Deadlift",        sets: 4, reps: "4-6",   rest: "120s", videoUrl: "", note: "" }, { name: "Cable Row",        sets: 3, reps: "10-12", rest: "75s",  videoUrl: "", note: "" }] },
  { day: "Sunday",    type: "Rest", exercises: [] },
];

const DEFAULT_MEALS = [
  { name: "Breakfast",   time: "7:00 AM",  items: [{ food: "Oats",           amount: "80g",      protein: 10, carbs: 54, fats: 5,  fiber: 8, cal: 300 }, { food: "Banana",       amount: "1 medium", protein: 1,  carbs: 27, fats: 0,  fiber: 3, cal: 105 }, { food: "Whey Protein", amount: "1 scoop",  protein: 25, carbs: 3,  fats: 2,  fiber: 0, cal: 130 }] },
  { name: "Lunch",       time: "1:00 PM",  items: [{ food: "Chicken Breast", amount: "200g",     protein: 46, carbs: 0,  fats: 4,  fiber: 0, cal: 220 }, { food: "Brown Rice",   amount: "150g",     protein: 4,  carbs: 47, fats: 1,  fiber: 3, cal: 210 }, { food: "Broccoli",     amount: "100g",     protein: 3,  carbs: 7,  fats: 0,  fiber: 5, cal: 35  }] },
  { name: "Pre-Workout", time: "5:00 PM",  items: [{ food: "Banana",         amount: "1 large",  protein: 1,  carbs: 31, fats: 0,  fiber: 3, cal: 120 }, { food: "Peanut Butter", amount: "2 tbsp",  protein: 8,  carbs: 6,  fats: 16, fiber: 2, cal: 190 }] },
  { name: "Dinner",      time: "8:00 PM",  items: [{ food: "Eggs",           amount: "4 whole",  protein: 24, carbs: 2,  fats: 20, fiber: 0, cal: 280 }, { food: "Sweet Potato", amount: "200g",     protein: 3,  carbs: 40, fats: 0,  fiber: 6, cal: 172 }] },
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
@keyframes splashLogo{0%{opacity:0;transform:scale(.4) rotate(-10deg)}60%{transform:scale(1.1) rotate(2deg)}100%{opacity:1;transform:scale(1) rotate(0)}}
@keyframes splashText{0%{opacity:0;transform:translateY(30px)}100%{opacity:1;transform:none}}
@keyframes splashSub{0%{opacity:0;transform:translateY(20px)}100%{opacity:1;transform:none}}
@keyframes splashBar{0%{width:0}100%{width:100%}}
@keyframes splashFadeOut{0%{opacity:1}100%{opacity:0;transform:scale(1.04)}}
@keyframes splashTagline{0%{opacity:0;letter-spacing:.3em}100%{opacity:.7;letter-spacing:.15em}}
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
@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(.8)}}
@keyframes countUp{from{opacity:0;transform:scale(.8)}to{opacity:1;transform:scale(1)}}
@keyframes cardEntrance{from{opacity:0;transform:translateY(24px) scale(.97)}to{opacity:1;transform:none}}
@keyframes dayPop{0%{opacity:0;transform:scale(.9) translateY(10px)}100%{opacity:1;transform:none}}
@keyframes slideUp{from{opacity:0;transform:translateY(40px)}to{opacity:1;transform:none}}
@keyframes msgSlideIn{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:none}}
@keyframes msgSlideInLeft{from{opacity:0;transform:translateX(-20px)}to{opacity:1;transform:none}}
@keyframes welcomePop{0%{opacity:0;transform:scale(.6) translateY(40px)}60%{transform:scale(1.05) translateY(-8px)}100%{opacity:1;transform:scale(1) translateY(0)}}

/* ── SPLASH ── */
.splash{position:fixed;inset:0;z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;background:radial-gradient(ellipse at 40% 30%,rgba(34,197,94,.12) 0%,transparent 55%),radial-gradient(ellipse at 70% 70%,rgba(167,139,250,.1) 0%,transparent 55%),#080d1a;animation:splashBg .4s ease}
.splash.exit{animation:splashFadeOut .5s ease forwards;pointer-events:none}
.splash-logo{width:80px;height:80px;border-radius:22px;background:linear-gradient(135deg,#22c55e,#16a34a);display:flex;align-items:center;justify-content:center;font-family:'Outfit',sans-serif;font-weight:900;font-size:26px;color:#fff;margin-bottom:24px;box-shadow:0 16px 48px rgba(34,197,94,.4);animation:splashLogo .7s cubic-bezier(.34,1.56,.64,1) forwards}
.splash-title{font-family:'Outfit',sans-serif;font-weight:900;font-size:clamp(28px,6vw,42px);color:#fff;text-align:center;opacity:0;animation:splashText .6s ease .5s forwards}
.splash-title span{color:var(--green)}
.splash-tagline{font-size:13px;font-weight:600;color:var(--muted2);letter-spacing:.15em;text-transform:uppercase;margin-top:10px;opacity:0;animation:splashTagline .8s ease .9s forwards}
.splash-bar-wrap{width:200px;height:3px;background:var(--s3);border-radius:2px;margin-top:40px;overflow:hidden;opacity:0;animation:splashSub .4s ease 1s forwards}
.splash-bar{height:100%;background:linear-gradient(90deg,var(--green),#a78bfa,var(--green));background-size:200% auto;border-radius:2px;animation:splashBar 1.4s cubic-bezier(.4,0,.2,1) 1.1s forwards}
.splash-dots{display:flex;gap:8px;margin-top:18px;opacity:0;animation:splashSub .4s ease 1.2s forwards}
.splash-dot{width:6px;height:6px;border-radius:50%;background:var(--green);animation:pulse 1.2s ease infinite}
.splash-dot:nth-child(2){animation-delay:.2s;background:var(--purple)}
.splash-dot:nth-child(3){animation-delay:.4s;background:var(--blue)}

/* ── WELCOME SPLASH ── */
.welcome-overlay{position:fixed;inset:0;z-index:9000;display:flex;flex-direction:column;align-items:center;justify-content:center;background:radial-gradient(ellipse at 40% 30%,rgba(34,197,94,.18) 0%,transparent 55%),radial-gradient(ellipse at 70% 70%,rgba(167,139,250,.12) 0%,transparent 55%),rgba(8,13,26,.97);backdrop-filter:blur(12px)}
.welcome-card{background:var(--s1);border:1px solid var(--green-b);border-radius:28px;padding:50px 44px;max-width:440px;width:92%;text-align:center;box-shadow:0 0 80px rgba(34,197,94,.15),var(--sh2);animation:welcomePop .7s cubic-bezier(.34,1.56,.64,1) forwards}
.welcome-emoji{font-size:72px;margin-bottom:20px;display:block;animation:float 3s ease infinite}
.welcome-title{font-family:'Outfit',sans-serif;font-weight:900;font-size:32px;color:var(--green);margin-bottom:8px}
.welcome-sub{font-size:16px;color:var(--muted2);margin-bottom:28px;line-height:1.5}
.welcome-btn{background:linear-gradient(135deg,#22c55e,#16a34a);color:#fff;border:none;border-radius:14px;padding:14px 40px;font-family:'Outfit',sans-serif;font-weight:700;font-size:16px;cursor:pointer;box-shadow:0 6px 24px rgba(34,197,94,.35);transition:all .2s}
.welcome-btn:hover{transform:translateY(-2px);box-shadow:0 10px 32px rgba(34,197,94,.45)}

/* ── NAV ── */
.nav{background:rgba(8,13,26,.95);backdrop-filter:blur(16px);border-bottom:1px solid var(--border);padding:0 20px;padding-top:env(safe-area-inset-top);min-height:calc(58px + env(safe-area-inset-top));display:flex;align-items:flex-end;padding-bottom:8px;justify-content:space-between;position:sticky;top:0;z-index:100;animation:fadeDown .5s ease}
.nav-logo{display:flex;align-items:center;gap:9px;cursor:pointer;border:none;background:none}
.nav-icon{width:34px;height:34px;border-radius:10px;background:linear-gradient(135deg,#22c55e,#16a34a);display:flex;align-items:center;justify-content:center;font-family:'Outfit',sans-serif;font-weight:900;font-size:11px;color:#fff;transition:transform .2s}
.nav-logo:hover .nav-icon{transform:scale(1.1)}
.nav-brand{font-family:'Outfit',sans-serif;font-weight:800;font-size:16px;color:var(--text)}
.nav-brand span{color:var(--green)}
.nav-tabs{display:none;gap:2px}
.nav-tab{padding:6px 13px;border-radius:8px;border:none;background:transparent;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:500;color:var(--muted);transition:all .18s}
.nav-tab:hover{background:var(--s2);color:var(--text)}
.nav-tab.active{background:var(--green-bg);color:var(--green);border:1px solid var(--green-b)}
.nav-right{display:flex;align-items:center;gap:10px}
.nav-av{width:32px;height:32px;border-radius:50%;background:var(--green-bg);border:1.5px solid var(--green-b);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:11px;color:var(--green);font-family:'Outfit',sans-serif;transition:transform .2s}
.signout{padding:5px 12px;border-radius:8px;border:1px solid var(--border);background:transparent;cursor:pointer;font-size:12px;font-weight:500;color:var(--muted);transition:all .15s}
.signout:hover{border-color:var(--red);color:var(--red)}

/* ── PAGE / CARD ── */
.page{max-width:960px;margin:0 auto;padding:24px 16px calc(80px + env(safe-area-inset-bottom));animation:fadeUp .4s ease;padding-top:max(24px, 16px)}
.card{background:var(--s1);border:1px solid var(--border);border-radius:var(--r);padding:18px;box-shadow:var(--sh);transition:transform .2s,box-shadow .2s,border-color .2s;animation:cardEntrance .4s ease}
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
.stagger-6{animation:cardEntrance .4s ease .3s both}

/* ── METRIC CARD ── */
.mc{background:var(--s1);border:1px solid var(--border);border-radius:var(--r);padding:16px;transition:transform .18s,box-shadow .18s;animation:bounceIn .5s ease both}
.mc:hover{transform:translateY(-3px) scale(1.02);box-shadow:0 8px 24px rgba(0,0,0,.4);border-color:var(--border2)}
.mc.flash{animation:flashBorder 2.5s ease forwards}
.mc-val{font-family:'Outfit',sans-serif;font-size:28px;font-weight:800;line-height:1}
.mc-label{font-size:10px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;margin-top:5px}

/* ── BUTTONS ── */
.btn{display:inline-flex;align-items:center;gap:6px;padding:9px 16px;border-radius:var(--r);border:none;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:600;transition:all .18s;white-space:nowrap}
.btn-p{background:linear-gradient(135deg,#22c55e,#16a34a);color:#fff;box-shadow:0 4px 14px rgba(34,197,94,.3)}
.btn-p:hover{transform:translateY(-2px);box-shadow:0 6px 20px rgba(34,197,94,.4)}
.btn-p:disabled{opacity:.5;cursor:not-allowed;transform:none}
.btn-s{background:var(--s2);color:var(--text);border:1px solid var(--border2)}
.btn-s:hover{background:var(--s3);transform:translateY(-1px)}
.btn-d{background:rgba(248,113,113,.1);color:var(--red);border:1px solid rgba(248,113,113,.2)}
.btn-d:hover{background:rgba(248,113,113,.2);transform:translateY(-1px)}
.btn-warn{background:rgba(251,191,36,.1);color:var(--yellow);border:1px solid rgba(251,191,36,.2)}
.btn-warn:hover{background:rgba(251,191,36,.2)}
.btn-blue{background:rgba(59,130,246,.1);color:var(--blue);border:1px solid rgba(59,130,246,.2)}
.btn-blue:hover{background:rgba(59,130,246,.2)}
.btn-sm{padding:5px 10px;font-size:12px}
.btn-xs{padding:3px 8px;font-size:11px}

/* ── FORM ── */
.fld{margin-bottom:12px}
.fl{display:block;font-size:11px;font-weight:700;color:var(--muted2);text-transform:uppercase;letter-spacing:.07em;margin-bottom:6px}
.fi{width:100%;padding:10px 14px;background:var(--s2);border:1.5px solid var(--border);border-radius:9px;color:var(--text);font-family:'DM Sans',sans-serif;font-size:14px;outline:none;transition:border .18s,box-shadow .18s}
.fi:focus{border-color:var(--green);box-shadow:0 0 0 3px rgba(34,197,94,.15)}
.fi::placeholder{color:var(--muted)}
.fsel{width:100%;padding:10px 14px;background:var(--s2);border:1.5px solid var(--border);border-radius:9px;color:var(--text);font-family:'DM Sans',sans-serif;font-size:13px;outline:none;transition:border .18s}
.fsel:focus{border-color:var(--green)}
.fta{width:100%;padding:10px 14px;background:var(--s2);border:1.5px solid var(--border);border-radius:9px;color:var(--text);font-family:'DM Sans',sans-serif;font-size:13px;outline:none;resize:vertical;min-height:70px;transition:border .18s}
.fta:focus{border-color:var(--green)}
.num-input{display:flex;align-items:center;border:1.5px solid var(--border);border-radius:9px;overflow:hidden;background:var(--s2)}
.num-input:focus-within{border-color:var(--green)}
.num-input input{flex:1;padding:10px 8px;background:transparent;border:none;color:var(--text);font-family:'Outfit',sans-serif;font-size:16px;font-weight:700;outline:none;text-align:center;min-width:0}
.num-btn{width:38px;height:42px;background:var(--s3);border:none;cursor:pointer;color:var(--text);font-size:18px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .15s}
.num-btn:hover{background:var(--green);color:#fff}

/* ── TABS ── */
.tab-bar{display:flex;gap:3px;background:var(--s2);border-radius:10px;padding:3px;margin-bottom:18px;border:1px solid var(--border);flex-wrap:wrap}
.tab-item{flex:1;padding:7px 6px;border-radius:8px;border:none;background:transparent;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:12px;font-weight:600;color:var(--muted);transition:all .18s;min-width:70px;text-align:center}
.tab-item:hover{color:var(--text);background:rgba(255,255,255,.05)}
.tab-item.active{background:var(--s1);color:var(--text);box-shadow:0 1px 6px rgba(0,0,0,.3)}

/* ── SH ── */
.sh{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}
.sh-title{font-family:'Outfit',sans-serif;font-weight:700;font-size:16px}
.sh-link{font-size:12px;font-weight:600;color:var(--green);background:none;border:none;cursor:pointer}
.sh-link:hover{color:#86efac}

/* ── MODAL / OVERLAY ── */
.ov{position:fixed;inset:0;background:rgba(0,0,0,.85);backdrop-filter:blur(8px);z-index:200;display:flex;align-items:center;justify-content:center;padding:16px;animation:splashBg .2s ease}
.modal{background:var(--s1);border:1px solid var(--border2);border-radius:var(--r2);width:100%;max-width:640px;max-height:92vh;overflow-y:auto;box-shadow:var(--sh2);animation:bounceIn .35s cubic-bezier(.34,1.56,.64,1)}
.modal-lg{max-width:900px}
.mh{padding:18px 22px 14px;border-bottom:1px solid var(--border);position:sticky;top:0;background:var(--s1);border-radius:var(--r2) var(--r2) 0 0;display:flex;align-items:flex-start;justify-content:space-between;z-index:10}
.mt{font-family:'Outfit',sans-serif;font-weight:800;font-size:18px}
.ms{font-size:12px;color:var(--muted);margin-top:2px}
.mb2{padding:18px 22px 22px}
.xbtn{width:28px;height:28px;border-radius:7px;background:var(--s2);border:1px solid var(--border);cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--muted);font-size:14px;flex-shrink:0;transition:all .2s}
.xbtn:hover{color:var(--red);transform:rotate(90deg)}

/* ── TABLE ── */
.tbl{width:100%;border-collapse:collapse}
.tbl th{text-align:left;padding:8px 12px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--muted);border-bottom:1px solid var(--border)}
.tbl td{padding:11px 12px;font-size:13px;border-bottom:1px solid var(--border);vertical-align:middle}
.tbl tr:last-child td{border-bottom:none}
.tbl tr:hover td{background:rgba(255,255,255,.02)}

/* ── BADGES ── */
.bdg{display:inline-flex;padding:3px 9px;border-radius:20px;font-size:10px;font-weight:700}
.bdg-g{background:var(--green-bg);color:var(--green);border:1px solid var(--green-b)}
.bdg-p{background:rgba(167,139,250,.1);color:var(--purple);border:1px solid rgba(167,139,250,.25)}
.bdg-o{background:rgba(251,146,60,.1);color:var(--orange);border:1px solid rgba(251,146,60,.25)}
.bdg-r{background:rgba(248,113,113,.1);color:var(--red);border:1px solid rgba(248,113,113,.2)}
.bdg-b{background:rgba(59,130,246,.1);color:var(--blue);border:1px solid rgba(59,130,246,.25)}
.bdg-y{background:rgba(251,191,36,.1);color:var(--yellow);border:1px solid rgba(251,191,36,.25)}

/* ── AVATAR ── */
.av{border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:'Outfit',sans-serif;font-weight:700;flex-shrink:0}
.av-sm{width:32px;height:32px;font-size:11px}
.av-md{width:38px;height:38px;font-size:13px}
.av-g{background:var(--green-bg);color:var(--green);border:1.5px solid var(--green-b)}

/* ── ALERTS / TOAST ── */
.alert{padding:11px 14px;border-radius:10px;font-size:12px;line-height:1.5;margin-bottom:14px}
.alert-w{background:rgba(251,191,36,.08);border:1px solid rgba(251,191,36,.2);color:#fcd34d}
.alert-g{background:var(--green-bg);border:1px solid var(--green-b);color:#86efac}
.alert-e{background:rgba(248,113,113,.08);border:1px solid rgba(248,113,113,.2);color:var(--red)}
.alert-b{background:rgba(59,130,246,.08);border:1px solid rgba(59,130,246,.2);color:#93c5fd}
.toast{position:fixed;bottom:22px;right:22px;padding:11px 16px;border-radius:10px;font-size:13px;font-weight:500;z-index:9999;box-shadow:var(--sh2);animation:bounceIn .35s cubic-bezier(.34,1.56,.64,1);max-width:320px;pointer-events:none}
.toast-s{background:#166534;border:1px solid #22c55e55;color:#bbf7d0}
.toast-e{background:#7f1d1d;border:1px solid #f8717155;color:#fecaca}

/* ── AUTH ── */
.auth-wrap{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px;background:radial-gradient(ellipse at 30% 20%,rgba(34,197,94,.06) 0%,transparent 60%),radial-gradient(ellipse at 70% 80%,rgba(167,139,250,.06) 0%,transparent 60%),var(--bg)}
.auth-card{background:var(--s1);border:1px solid var(--border2);border-radius:22px;padding:36px;width:100%;max-width:400px;box-shadow:var(--sh2);animation:bounceIn .6s cubic-bezier(.34,1.56,.64,1)}
.auth-logo{width:56px;height:56px;border-radius:16px;background:linear-gradient(135deg,#22c55e,#16a34a);display:flex;align-items:center;justify-content:center;font-family:'Outfit',sans-serif;font-weight:900;font-size:17px;color:#fff;margin:0 auto 14px;box-shadow:0 8px 24px rgba(34,197,94,.3);animation:float 3s ease infinite}
.auth-title{font-family:'Outfit',sans-serif;font-weight:800;font-size:24px;text-align:center;margin-bottom:4px}
.auth-sub{font-size:13px;color:var(--muted);text-align:center;margin-bottom:28px}
.auth-btn{width:100%;padding:13px;background:linear-gradient(135deg,#22c55e,#16a34a);color:#fff;border:none;border-radius:10px;font-family:'Outfit',sans-serif;font-weight:700;font-size:15px;cursor:pointer;margin-top:4px;box-shadow:0 4px 16px rgba(34,197,94,.25);transition:all .2s}
.auth-btn:hover{transform:translateY(-2px)}
.auth-btn:disabled{opacity:.5;cursor:not-allowed;transform:none}
.auth-switch{text-align:center;margin-top:16px;font-size:12px;color:var(--muted)}
.auth-switch button{background:none;border:none;cursor:pointer;color:var(--green);font-size:12px;font-weight:600}

/* ── MISC ── */
.live{display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:600;color:var(--green)}
.dot{width:6px;height:6px;border-radius:50%;background:var(--green);flex-shrink:0;animation:pulse 1.4s ease infinite}
.phase{display:inline-flex;padding:4px 11px;border-radius:20px;font-size:12px;font-weight:600;background:var(--green-bg);color:var(--green);border:1px solid var(--green-b)}
.msg-b{background:var(--s2);border:1px solid var(--border);border-radius:12px;padding:13px 15px;font-size:13px;line-height:1.65;color:var(--muted2);white-space:pre-wrap}
.msg-b.has{background:var(--green-bg);border-color:var(--green-b);color:var(--text)}
.nbadge{display:inline-flex;padding:2px 7px;border-radius:20px;font-size:10px;font-weight:700;background:var(--green-bg);color:var(--green);border:1px solid var(--green-b);margin-left:8px}
.spin-wrap{display:flex;align-items:center;justify-content:center;min-height:300px;gap:10px;color:var(--muted);font-size:13px}
.spinner-lg{width:40px;height:40px;border-radius:50%;border:3px solid var(--border);border-top-color:var(--green);animation:sp .8s linear infinite}
.empty{text-align:center;padding:40px 24px;color:var(--muted)}
.empty-icon{font-size:44px;margin-bottom:12px;display:block;animation:float 3s ease infinite}
.empty-title{font-family:'Outfit',sans-serif;font-weight:700;font-size:17px;color:var(--text);margin-bottom:8px}
.empty-desc{font-size:13px;margin-bottom:20px}

/* ── WORKOUT GRID (coach overview) ── */
.wk-grid-coach{display:grid;grid-template-columns:repeat(7,1fr);gap:0;border:1px solid var(--border);border-radius:14px;overflow:hidden}
.wk-cell-hdr{background:var(--s3);padding:12px 6px;text-align:center;font-size:11px;font-weight:700;letter-spacing:.06em;color:var(--muted2);border-right:1px solid var(--border)}
.wk-cell-hdr:last-child{border-right:none}
.wk-cell{padding:16px 8px;text-align:center;cursor:pointer;border-right:1px solid var(--border);border-top:1px solid var(--border);transition:all .18s;min-height:90px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px}
.wk-cell:last-child{border-right:none}
.wk-cell:hover{transform:none}
.wk-cell.rest-cell{opacity:.55;cursor:default;background:var(--s2)}
.wk-cell:not(.rest-cell):hover{background:var(--s2)}
.wk-type-badge{padding:5px 10px;border-radius:20px;font-size:11px;font-weight:700;border:1.5px solid}
.wk-ex-count{font-size:10px;color:var(--muted);font-weight:600}
.wk-click-hint{font-size:9px;color:var(--muted);opacity:0;transition:opacity .18s}
.wk-cell:not(.rest-cell):hover .wk-click-hint{opacity:1}

/* ── CLIENT WORKOUT GRID ── */
.wk-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:10px}
.wk-card{border-radius:var(--r);padding:14px 8px;text-align:center;background:var(--s1);border:1px solid var(--border);cursor:pointer;transition:all .2s;animation:cardEntrance .4s ease both}
.wk-card:hover{transform:translateY(-4px) scale(1.03);border-color:var(--border2);box-shadow:0 8px 24px rgba(0,0,0,.4)}
.wk-card.rest{opacity:.45;cursor:default}.wk-card.rest:hover{transform:none;box-shadow:none}

/* ── FULLSCREEN WORKOUT EDITOR (coach) ── */
.wke-overlay{position:fixed;inset:0;background:var(--bg);z-index:300;display:flex;flex-direction:column;overflow:hidden;animation:fadeUp .3s ease}
.wke-topbar{background:rgba(8,13,26,.97);backdrop-filter:blur(16px);border-bottom:1px solid var(--border);padding:0 12px;min-height:58px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;flex-wrap:wrap;gap:6px}
.wke-body{flex:1;overflow-y:auto;padding:28px 24px 48px;max-width:900px;margin:0 auto;width:100%}
.ex-editor-card{background:var(--s1);border:1px solid var(--border);border-radius:14px;padding:20px;margin-bottom:14px;animation:fadeUp .25s ease both;transition:border-color .2s}
.autosave{display:inline-flex;align-items:center;gap:5px;font-size:11px;color:var(--green);font-weight:600;opacity:0;transition:opacity .3s}
.autosave.show{opacity:1}

/* ── FULLSCREEN ADD CLIENT ── */
.addclient-overlay{position:fixed;inset:0;background:var(--bg);z-index:300;display:flex;flex-direction:column;overflow:hidden;animation:fadeUp .3s ease}
.addclient-topbar{background:rgba(8,13,26,.97);backdrop-filter:blur(16px);border-bottom:1px solid var(--border);padding:0 16px;min-height:58px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;flex-wrap:wrap;gap:8px}
.addclient-body{flex:1;overflow-y:auto;padding:32px 24px 60px;max-width:780px;margin:0 auto;width:100%}
.ac-section{background:var(--s1);border:1px solid var(--border);border-radius:14px;padding:22px;margin-bottom:18px;animation:cardEntrance .4s ease both}
.ac-section-title{font-family:'Outfit',sans-serif;font-weight:800;font-size:16px;margin-bottom:18px;display:flex;align-items:center;gap:10px}
.ac-section-icon{width:32px;height:32px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:15px;flex-shrink:0}

/* ── CLIENT FULLSCREEN WORKOUT ── */
.wk-fullscreen{position:fixed;inset:0;background:#080d1a;z-index:300;display:flex;flex-direction:column;overflow:hidden;animation:fadeUp .3s ease}
.wk-fs-nav{background:rgba(8,13,26,.95);backdrop-filter:blur(16px);border-bottom:1px solid var(--border);padding:0 24px;height:58px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
.wk-fs-body{flex:1;overflow-y:auto;padding:32px 24px 48px;max-width:800px;margin:0 auto;width:100%}
.wk-day-selector{display:flex;gap:8px;margin-bottom:28px;flex-wrap:wrap}
.wk-day-btn{padding:8px 16px;border-radius:10px;border:1.5px solid var(--border);background:var(--s1);cursor:pointer;font-family:'Outfit',sans-serif;font-weight:700;font-size:12px;color:var(--muted);transition:all .2s}
.ex-card{background:var(--s2);border:1px solid var(--border);border-radius:14px;padding:18px;margin-bottom:12px;animation:slideUp .35s ease both}

/* ── CHAT ── */
.chat-wrap{display:flex;flex-direction:column;height:calc(100vh - 180px);max-height:600px}
.chat-msgs{flex:1;overflow-y:auto;padding:12px 0;display:flex;flex-direction:column;gap:8px}
.chat-msg{display:flex;flex-direction:column;max-width:75%}
.chat-msg.me{align-self:flex-end;align-items:flex-end;animation:msgSlideIn .25s ease both}
.chat-msg.them{align-self:flex-start;align-items:flex-start;animation:msgSlideInLeft .25s ease both}
.chat-bubble{padding:10px 14px;border-radius:16px;font-size:13px;line-height:1.5;word-break:break-word}
.chat-msg.me .chat-bubble{background:linear-gradient(135deg,#22c55e,#16a34a);color:#fff;border-bottom-right-radius:4px}
.chat-msg.them .chat-bubble{background:var(--s2);color:var(--text);border:1px solid var(--border);border-bottom-left-radius:4px}
.chat-time{font-size:10px;color:var(--muted);margin-top:3px;padding:0 4px}
.chat-input-wrap{display:flex;gap:8px;padding-top:12px;border-top:1px solid var(--border)}

/* ── FOOD LOG ── */
.food-log-bar{background:linear-gradient(135deg,rgba(34,197,94,.12),rgba(59,130,246,.08));border:1px solid var(--green-b);border-radius:12px;padding:14px 16px;margin-bottom:16px}
.meal-card{background:var(--s2);border:1px solid var(--border);border-radius:12px;margin-bottom:14px;overflow:hidden}
.meal-card:hover{border-color:var(--border2)}
.meal-head{padding:12px 16px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--border);background:var(--s3)}
.meal-body{padding:8px 16px 4px}
.meal-total{padding:10px 16px;background:rgba(34,197,94,.06);border-top:1px solid var(--green-b);display:flex;gap:12px;flex-wrap:wrap}
.food-row{display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);font-size:13px}
.food-row:hover{background:rgba(255,255,255,.02);padding-left:4px}
.food-row:last-child{border-bottom:none}
.ex-row{display:flex;align-items:flex-start;gap:10px;padding:12px 0;border-bottom:1px solid var(--border)}
.ex-row:last-child{border-bottom:none}
.ex-num{width:26px;height:26px;border-radius:6px;background:var(--s2);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:var(--muted);flex-shrink:0;margin-top:2px}
.note-box{background:rgba(251,191,36,.06);border:1px solid rgba(251,191,36,.2);border-radius:8px;padding:9px 12px;font-size:12px;color:#fcd34d;line-height:1.55;margin-top:6px;white-space:pre-wrap}
.section-hdr{font-family:'Outfit',sans-serif;font-weight:700;font-size:12px;color:var(--muted2);text-transform:uppercase;letter-spacing:.08em;margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid var(--border)}
.prog-bar{height:4px;border-radius:2px;background:var(--border);overflow:hidden;margin-top:6px}
.prog-fill{height:100%;border-radius:2px;transition:width .8s cubic-bezier(.4,0,.2,1)}
.slider-wrap{margin-bottom:18px}
.slider-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}
.slider-label{font-size:13px;font-weight:600;color:var(--text)}
.slider-val{font-family:'Outfit',sans-serif;font-size:20px;font-weight:800;color:var(--green);min-width:28px;text-align:right}
.slider{-webkit-appearance:none;appearance:none;width:100%;height:6px;border-radius:3px;background:var(--s3);outline:none;cursor:pointer}
.slider::-webkit-slider-thumb{-webkit-appearance:none;width:22px;height:22px;border-radius:50%;background:var(--green);cursor:pointer;box-shadow:0 0 0 3px rgba(34,197,94,.25)}
.sources-table-wrap{background:var(--s3);border:1px solid var(--border);border-radius:10px;padding:12px 14px;margin-bottom:16px}
.sources-table-title{font-size:11px;font-weight:700;color:var(--muted2);text-transform:uppercase;letter-spacing:.07em;margin-bottom:10px}
.sources-table{width:100%;border-collapse:collapse}
.sources-table th{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;padding:5px 8px;border-bottom:1px solid var(--border);text-align:left}
.sources-table td{font-size:12px;padding:5px 8px;border-bottom:1px solid var(--border)}
.sources-table tr:last-child td{border-bottom:none}
.photo-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:10px}
.photo-item{border-radius:10px;overflow:hidden;aspect-ratio:3/4;position:relative;cursor:pointer;transition:transform .2s}
.photo-item:hover{transform:scale(1.03)}
.photo-item img,.photo-item video{width:100%;height:100%;object-fit:cover}
.photo-label{position:absolute;bottom:0;left:0;right:0;background:linear-gradient(transparent,rgba(0,0,0,.75));padding:14px 8px 8px;color:#fff;font-size:10px;font-weight:600}
.photo-del{position:absolute;top:6px;right:6px;background:rgba(248,113,113,.85);color:#fff;border:none;border-radius:6px;padding:3px 7px;font-size:10px;font-weight:700;cursor:pointer;display:none}
.photo-item:hover .photo-del{display:block}
.upload-area{border:2px dashed var(--border2);border-radius:12px;padding:24px;text-align:center;cursor:pointer;background:var(--s2);transition:all .2s;display:block}
.upload-area:hover{border-color:var(--green);background:var(--green-bg)}
.video-badge{position:absolute;top:6px;right:6px;background:rgba(0,0,0,.7);color:#fff;border-radius:6px;padding:2px 6px;font-size:10px;font-weight:700}
.cmp-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:16px}
.cmp-card{background:var(--s2);border:1px solid var(--border);border-radius:12px;overflow:hidden;transition:transform .2s;animation:cardEntrance .4s ease both}
.cmp-card:hover{transform:translateY(-2px);border-color:var(--border2)}
.cmp-head{padding:10px 14px;background:var(--s3);border-bottom:1px solid var(--border);font-weight:700;font-size:13px;text-align:center}
.cmp-body{padding:12px 14px}
.cmp-stat{display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--border);font-size:13px}
.cmp-stat:last-child{border-bottom:none}
.sec-lbl{font-family:'Outfit',sans-serif;font-weight:700;font-size:12px;color:var(--muted2);text-transform:uppercase;letter-spacing:.08em;margin-bottom:10px;margin-top:4px}
.cl-card{background:var(--s1);border:1px solid var(--border);border-radius:var(--r);padding:16px;cursor:pointer;transition:all .22s;animation:cardEntrance .45s ease both}
.cl-card:hover{border-color:var(--green-b);transform:translateY(-3px);box-shadow:0 8px 28px rgba(0,0,0,.4)}
.access-badge-paused{background:rgba(251,191,36,.12);border:1px solid rgba(251,191,36,.3);color:var(--yellow);padding:4px 12px;border-radius:20px;font-size:11px;font-weight:700}
.access-badge-terminated{background:rgba(248,113,113,.12);border:1px solid rgba(248,113,113,.3);color:var(--red);padding:4px 12px;border-radius:20px;font-size:11px;font-weight:700}
.access-badge-active{background:var(--green-bg);border:1px solid var(--green-b);color:var(--green);padding:4px 12px;border-radius:20px;font-size:11px;font-weight:700}
.sources-mini{background:var(--s3);border:1px solid var(--border);border-radius:10px;padding:12px 14px;margin-bottom:14px}
.sources-mini-title{font-size:11px;font-weight:700;color:var(--muted2);text-transform:uppercase;letter-spacing:.07em;margin-bottom:8px}
.sources-mini-row{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px}
.sources-mini-tag{padding:3px 9px;border-radius:20px;font-size:11px;font-weight:600;border:1px solid}

/* ── REPLACE existing @media(max-width:700px) block with this ── */
@media(max-width:700px){
  .page{padding:16px 12px 80px}
  .g4{grid-template-columns:1fr 1fr}
  .g3{grid-template-columns:1fr 1fr}
  .fg{grid-template-columns:1fr}
  .g2{grid-template-columns:1fr}
  .wk-grid{grid-template-columns:repeat(3,1fr)}
  .wk-grid-coach{grid-template-columns:repeat(4,1fr)}

  /* MODAL: sheet from bottom */
  .modal{max-height:95vh;border-radius:16px 16px 0 0;position:fixed;bottom:0;left:0;right:0;margin:0;max-width:100%}

  /* NAV */
  .nav{height:calc(52px + env(safe-area-inset-top));padding:0 14px;padding-top:env(safe-area-inset-top)}
  .nav-tabs{display:none}
  .nav-brand{font-size:14px}
  .nav-right{gap:6px}

  /* BOTTOM NAV */
  .bottom-nav{
    display:flex;
    position:fixed;bottom:0;left:0;right:0;
    background:rgba(8,13,26,.98);
    backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);
    border-top:1px solid var(--border);
    z-index:100;
    padding:6px 4px 0 4px;
    padding-bottom:max(10px,env(safe-area-inset-bottom));
    min-height:56px;
  }
  .bottom-nav-btn{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;padding:6px 2px 4px;border:none;background:transparent;cursor:pointer;color:var(--muted);transition:all .18s;min-width:0;border-radius:10px;margin:1px;-webkit-tap-highlight-color:transparent;touch-action:manipulation;min-height:44px}
  .bottom-nav-btn.active{color:var(--green);background:var(--green-bg)}
  .bottom-nav-btn .bn-icon{font-size:22px;line-height:1;display:block}
  .bottom-nav-btn .bn-label{display:none}

  /* CARDS */
  .card{padding:14px 12px}
  .card-title{font-size:14px}
  .mc-val{font-size:22px}
  .tab-bar{gap:2px;overflow-x:auto;flex-wrap:nowrap;padding-bottom:4px}
  .tab-item{font-size:11px;padding:6px 8px;min-width:max-content;flex-shrink:0}
  .fi{font-size:16px}
  .fsel{font-size:16px}

  /* FULLSCREEN OVERLAYS — KEY FIX */
  .wke-overlay,.addclient-overlay,.wk-fullscreen{
    position:fixed;inset:0;
    padding-top:env(safe-area-inset-top);
    padding-bottom:env(safe-area-inset-bottom);
    overflow:hidden;
    display:flex;flex-direction:column;
  }
  .wke-topbar,.addclient-topbar,.wk-fs-nav{
    flex-shrink:0;
    padding:8px 12px;
    height:auto;min-height:52px;
    flex-wrap:wrap;
    gap:6px;
    box-sizing:border-box;
    width:100%;
    overflow:hidden;
  }
  .wke-body,.addclient-body,.wk-fs-body{
    flex:1;
    overflow-y:auto;
    -webkit-overflow-scrolling:touch;
    padding:14px 12px 48px;
    width:100%;
    box-sizing:border-box;
  }

  /* WORKOUT DAY PILLS — fix overflow */
  .wk-day-btn{padding:6px 10px;font-size:11px}

  /* ADDCLIENT SECTION TABS */
  .addclient-overlay > div[style*="display:flex;gap:6px"]{
    overflow-x:auto;flex-wrap:nowrap;-webkit-overflow-scrolling:touch;padding-bottom:2px
  }

  .ex-editor-card{padding:14px 12px}
  .wk-fs-nav{padding:0 10px;min-height:52px}
  .wk-card{padding:10px 4px}
  .ex-card{padding:14px}
  .chat-wrap{height:calc(100vh - 220px)}
}
` + CSS_ADDITIONS;

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function useToast() {
  const [t, setT] = useState(null);
  const show = (msg, type = "success") => { setT({ msg, type }); setTimeout(() => setT(null), 4000); };
 
  return { t, show };
}
function MC({ label, value, color, suffix = "", flash = false }) {
  const [k, setK] = useState(0); const prev = useRef(false);
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
  return (
    <div className="slider-wrap">
      <div className="slider-header"><span className="slider-label">{label}</span><span className="slider-val" style={{ color }}>{value}</span></div>
      <input type="range" className="slider" min={min} max={max} value={value} onChange={e => onChange(parseInt(e.target.value))}
        style={{ background: `linear-gradient(to right, ${color} 0%, ${color} ${((value - min) / (max - min)) * 100}%, var(--s3) ${((value - min) / (max - min)) * 100}%, var(--s3) 100%)` }} />
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
        <thead><tr><th style={{ color: "var(--muted2)" }}>#</th><th style={{ color: "var(--purple)" }}>Protein</th><th style={{ color: "var(--orange)" }}>Carbs</th><th style={{ color: "var(--red)" }}>Fats</th></tr></thead>
        <tbody>{rows.map(({ i, p, c, f }) => (<tr key={i}><td style={{ color: "var(--muted)", fontSize: 10, fontWeight: 700 }}>{i + 1}</td><td style={{ color: p ? "var(--purple)" : "var(--muted)" }}>{p || "-"}</td><td style={{ color: c ? "var(--orange)" : "var(--muted)" }}>{c || "-"}</td><td style={{ color: f ? "var(--red)" : "var(--muted)" }}>{f || "-"}</td></tr>))}</tbody>
      </table>
    </div>
  );
}

// ─── WELCOME SPLASH (new client) ──────────────────────────────────────────────
function WelcomeSplash({ name, onDone }) {
  return (
    <div className="welcome-overlay">
      <div className="welcome-card">
        <span className="welcome-emoji">🎉</span>
        <div className="welcome-title">Welcome, {name?.split(" ")[0]}!</div>
        <div className="welcome-sub">Your coaching journey starts today.<br />Your coach has set up your personalised plan.<br />Let's get to work! 💪</div>
        <button className="welcome-btn" onClick={onDone}>Let's Go →</button>
      </div>
    </div>
  );
}

// ─── SPLASH ───────────────────────────────────────────────────────────────────
function SplashScreen({ onDone }) {
  const [exiting, setExiting] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => { setExiting(true); setTimeout(onDone, 500); }, 1800);
    return () => clearTimeout(t);
  }, []);
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

// ─── VIDEO MODAL ──────────────────────────────────────────────────────────────
function VideoModal({ url, name, onClose }) {
  const isYT = url.includes("youtube.com") || url.includes("youtu.be");
  let embedUrl = url;
  if (isYT) { const id = url.split("v=")[1]?.split("&")[0] || url.split("youtu.be/")[1]?.split("?")[0]; embedUrl = "https://www.youtube.com/embed/" + id; }
  return (
    <div className="ov" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal"><div className="mh"><div><div className="mt">{name}</div></div><button className="xbtn" onClick={onClose}>✕</button></div>
        <div className="mb2">{isYT ? <iframe width="100%" height="315" src={embedUrl} frameBorder="0" allowFullScreen style={{ borderRadius: 10 }} /> : <video src={url} controls style={{ width: "100%", borderRadius: 10 }} />}</div>
      </div>
    </div>
  );
}
// ─── CHAT FULL HEIGHT (fills screen, no scroll waste) ─────────────────────────
function ChatFullHeight({ currentUid, otherUid, currentName, otherName }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const msgsEndRef = useRef(null);
  const inputRef = useRef(null);
  const chatId = [currentUid, otherUid].sort().join("_");

  useEffect(() => {
    const q = query(collection(db, "chats", chatId, "messages"), orderBy("timestamp", "asc"));
    return onSnapshot(q, snap => setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, [chatId]);

  useEffect(() => {
    msgsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // When keyboard opens on mobile, scroll to bottom
  useEffect(() => {
    const handler = () => {
      setTimeout(() => msgsEndRef.current?.scrollIntoView({ behavior: "smooth" }), 300);
    };
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  const sendMsg = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    const msg = text.trim();
    setText("");
    await addDoc(collection(db, "chats", chatId, "messages"), {
      text: msg, senderId: currentUid, senderName: currentName, timestamp: serverTimestamp()
    });
    await setDoc(doc(db, "chats", chatId), {
      participants: [currentUid, otherUid], lastMessage: msg, lastTimestamp: serverTimestamp()
    }, { merge: true });
    setSending(false);
    inputRef.current?.focus();
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMsg(); }
  };

  return (
    <div style={{
      display: "flex", flexDirection: "column",
      height: "100%",
      background: "var(--s1)", border: "1px solid var(--border)",
      borderRadius: 14, overflow: "hidden"
    }}>
      {/* Messages area */}
      <div style={{ flex: 1, overflowY: "auto", padding: "14px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
        {messages.length === 0 && (
          <div style={{ textAlign: "center", color: "var(--muted)", fontSize: 13, padding: 28, margin: "auto" }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>👋</div>
            No messages yet. Say hi!
          </div>
        )}
        {messages.map((m, i) => {
          const isMe = m.senderId === currentUid;
          const ts = m.timestamp?.toDate
            ? m.timestamp.toDate().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
            : "";
          return (
            <div key={m.id} style={{
              display: "flex", flexDirection: "column",
              alignItems: isMe ? "flex-end" : "flex-start",
              alignSelf: isMe ? "flex-end" : "flex-start",
              maxWidth: "78%",
              animation: "msgSlideIn .2s ease both",
              animationDelay: i * 0.01 + "s"
            }}>
              <div style={{
                padding: "9px 13px", borderRadius: isMe ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                fontSize: 13, lineHeight: 1.5, wordBreak: "break-word",
                background: isMe ? "linear-gradient(135deg,#22c55e,#16a34a)" : "var(--s2)",
                color: isMe ? "#fff" : "var(--text)",
                border: isMe ? "none" : "1px solid var(--border)"
              }}>{m.text}</div>
              <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 3, padding: "0 4px" }}>{ts}</div>
            </div>
          );
        })}
        <div ref={msgsEndRef} />
      </div>

      {/* Input row — pinned to bottom */}
      <div style={{
        display: "flex", gap: 8, padding: "10px 12px",
        borderTop: "1px solid var(--border)",
        background: "var(--s2)",
        flexShrink: 0
      }}>
        <input
          ref={inputRef}
          className="fi"
          style={{ flex: 1, fontSize: 14, borderRadius: 22, padding: "10px 16px" }}
          placeholder={`Message ${otherName}...`}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKey}
        />
        <button
          className="btn btn-p"
          onClick={sendMsg}
          disabled={sending || !text.trim()}
          style={{ borderRadius: 22, padding: "10px 18px", flexShrink: 0 }}
        >Send</button>
      </div>
    </div>
  );
}
// ─── CHAT ─────────────────────────────────────────────────────────────────────
function ChatPanel({ currentUid, otherUid, currentName, otherName }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const msgsEndRef = useRef(null);
  const chatId = [currentUid, otherUid].sort().join("_");
  useEffect(() => {
    const q = query(collection(db, "chats", chatId, "messages"), orderBy("timestamp", "asc"));
    return onSnapshot(q, snap => setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, [chatId]);
  useEffect(() => { msgsEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  const sendMsg = async () => {
    if (!text.trim() || sending) return; setSending(true);
    await addDoc(collection(db, "chats", chatId, "messages"), { text: text.trim(), senderId: currentUid, senderName: currentName, timestamp: serverTimestamp() });
    await setDoc(doc(db, "chats", chatId), { participants: [currentUid, otherUid], lastMessage: text.trim(), lastTimestamp: serverTimestamp() }, { merge: true });
    setText(""); setSending(false);
  };
  const handleKey = (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMsg(); } };
  return (
    <div className="chat-wrap">
      <div className="chat-msgs">
        {messages.length === 0 && <div style={{ textAlign: "center", color: "var(--muted)", fontSize: 13, padding: 24 }}>No messages yet. Say hi!</div>}
        {messages.map((m, i) => {
          const isMe = m.senderId === currentUid;
          const ts = m.timestamp?.toDate ? m.timestamp.toDate().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "";
          return (
            <div key={m.id} className={`chat-msg ${isMe ? "me" : "them"}`} style={{ animationDelay: i * 0.02 + "s" }}>
              <div className="chat-bubble">{m.text}</div>
              <div className="chat-time">{ts}</div>
            </div>
          );
        })}
        <div ref={msgsEndRef} />
      </div>
      <div className="chat-input-wrap">
        <input className="fi" style={{ flex: 1 }} placeholder={`Message ${otherName}...`} value={text} onChange={e => setText(e.target.value)} onKeyDown={handleKey} />
        <button className="btn btn-p" onClick={sendMsg} disabled={sending || !text.trim()}>Send</button>
      </div>
    </div>
  );
}

// ─── WEEKLY CHECK-IN ──────────────────────────────────────────────────────────
function WeeklyCheckinSection({ uid, d, toast }) {
  const weekNum = d.week || 1;
  const weekKey = `W${weekNum}`;
  const existing = (d.weeklyCheckins || []).find(c => c.weekKey === weekKey);
  const [form, setForm] = useState({
    weight: existing?.weight || "", waist: existing?.waist || "", bodyFat: existing?.bodyFat || "",
    stressLevel: existing?.stressLevel || 5, sleepQuality: existing?.sleepQuality || 5,
    energyLevel: existing?.energyLevel || 5, nutritionAdherence: existing?.nutritionAdherence || 5,
    trainingAdherence: existing?.trainingAdherence || 5, waterIntake: existing?.waterIntake || 2.5,
    digestion: existing?.digestion || "", injuries: existing?.injuries || "None",
    period: existing?.period || "N/A", wins: existing?.wins || "", challenges: existing?.challenges || "", noteToCoach: existing?.noteToCoach || ""
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(!!existing);
  const submit = async () => {
    setSaving(true);
    const checkin = { ...form, weekKey, week: weekNum, date: new Date().toLocaleDateString("en-IN"), timestamp: new Date().toISOString() };
    const history = [...(d.weeklyCheckins || []).filter(c => c.weekKey !== weekKey), checkin];
    let updates = { weeklyCheckins: history };
    if (form.weight) { const hist = d.weightHistory || []; updates.weightHistory = [...hist.filter(h => h.week !== weekKey), { week: weekKey, weight: parseFloat(form.weight), date: new Date().toLocaleDateString("en-IN"), timestamp: new Date().toISOString() }]; updates.weight = parseFloat(form.weight); }
    if (form.waist) updates.waist = parseFloat(form.waist);
    if (form.bodyFat) updates.bodyFat = parseFloat(form.bodyFat);
    await updateDoc(doc(db, "clients", uid), updates);
    toast("Weekly check-in submitted!", "success"); setSaved(true); setSaving(false);
  };
  return (
    <div className="card" style={{ marginBottom: 18 }}>
      <div className="card-title">Week {weekNum} Check-in {saved && <span className="bdg bdg-g">Submitted</span>}</div>
      <div className="section-hdr">Body Measurements</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
        <div className="fld"><div className="fl">Weight (kg)</div><input className="fi" type="number" step="0.1" placeholder="85.5" value={form.weight} onChange={e => setForm(p => ({ ...p, weight: e.target.value }))} /></div>
        <div className="fld"><div className="fl">Waist (cm)</div><input className="fi" type="number" step="0.1" placeholder="82" value={form.waist} onChange={e => setForm(p => ({ ...p, waist: e.target.value }))} /></div>
        <div className="fld"><div className="fl">Body Fat %</div><input className="fi" type="number" step="0.1" placeholder="18.5" value={form.bodyFat} onChange={e => setForm(p => ({ ...p, bodyFat: e.target.value }))} /></div>
      </div>
      <div className="section-hdr">Performance (1–10)</div>
      <SliderField label="Stress Level" value={form.stressLevel} onChange={v => setForm(p => ({ ...p, stressLevel: v }))} color="#f87171" />
      <SliderField label="Sleep Quality" value={form.sleepQuality} onChange={v => setForm(p => ({ ...p, sleepQuality: v }))} color="#38bdf8" />
      <SliderField label="Energy Level" value={form.energyLevel} onChange={v => setForm(p => ({ ...p, energyLevel: v }))} color="#fbbf24" />
      <SliderField label="Nutrition Adherence" value={form.nutritionAdherence} onChange={v => setForm(p => ({ ...p, nutritionAdherence: v }))} color="#a78bfa" />
      <SliderField label="Training Adherence" value={form.trainingAdherence} onChange={v => setForm(p => ({ ...p, trainingAdherence: v }))} color="#4ade80" />
      <div className="slider-wrap">
        <div className="slider-header"><span className="slider-label">Water Intake</span><span className="slider-val" style={{ color: "#38bdf8" }}>{form.waterIntake}L</span></div>
        <input type="range" className="slider" min={0} max={6} step={0.5} value={form.waterIntake} onChange={e => setForm(p => ({ ...p, waterIntake: parseFloat(e.target.value) }))} style={{ background: `linear-gradient(to right,#38bdf8 0%,#38bdf8 ${(form.waterIntake / 6) * 100}%,var(--s3) ${(form.waterIntake / 6) * 100}%,var(--s3) 100%)` }} />
      </div>
      <div className="section-hdr">Wellbeing</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
        <div className="fld"><div className="fl">Digestion</div><select className="fsel" value={form.digestion} onChange={e => setForm(p => ({ ...p, digestion: e.target.value }))}><option value="">Select...</option><option>Normal</option><option>Bloating</option><option>Constipation</option><option>Loose stools</option><option>Reflux / acidity</option><option>Other</option></select></div>
        <div className="fld"><div className="fl">Injuries / Pain</div><select className="fsel" value={form.injuries} onChange={e => setForm(p => ({ ...p, injuries: e.target.value }))}><option>None</option><option>Minor soreness</option><option>Joint pain</option><option>Muscle pull / strain</option><option>Other</option></select></div>
      </div>
      <div className="fld" style={{ marginBottom: 12 }}><div className="fl">Period (if applicable)</div><select className="fsel" value={form.period} onChange={e => setForm(p => ({ ...p, period: e.target.value }))}><option>N/A</option><option>On period</option><option>Pre-period (PMS)</option><option>Post-period</option></select></div>
      <div className="section-hdr">Reflection</div>
      <div className="fld"><div className="fl" style={{ color: "var(--green)" }}>Wins this week 🏆</div><textarea className="fta" placeholder="What went well?" value={form.wins} onChange={e => setForm(p => ({ ...p, wins: e.target.value }))} /></div>
      <div className="fld"><div className="fl" style={{ color: "var(--orange)" }}>Challenges this week</div><textarea className="fta" placeholder="What was hard?" value={form.challenges} onChange={e => setForm(p => ({ ...p, challenges: e.target.value }))} /></div>
      <div className="fld"><div className="fl">Note to Coach</div><textarea className="fta" placeholder="Anything else for your coach..." value={form.noteToCoach} onChange={e => setForm(p => ({ ...p, noteToCoach: e.target.value }))} /></div>
      <button className="btn btn-p" style={{ width: "100%" }} onClick={submit} disabled={saving}>{saving ? "Submitting..." : saved ? `Update Week ${weekNum} Check-in` : `Submit Week ${weekNum} Check-in`}</button>
    </div>
  );
}

// ─── FOOD LOG ─────────────────────────────────────────────────────────────────
function FoodLogSection({ uid, d, toast, targetNutrition, mealPlan }) {
  const today = new Date().toLocaleDateString("en-IN");
  const meals = mealPlan || DEFAULT_MEALS;
  const getTodayItems = (foodLogs) => { if (!foodLogs) return []; if (Array.isArray(foodLogs)) return foodLogs.find(l => l.date === today)?.items || []; return foodLogs[today] || []; };
  const savedFoods = d.savedFoods || [];
  const [items, setItems] = useState(() => getTodayItems(d.foodLogs));
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveForFuture, setSaveForFuture] = useState(false);
  const [logType, setLogType] = useState("replacement");
  const [selectedMeal, setSelectedMeal] = useState(meals[0]?.name || "");
  const [newFood, setNewFood] = useState({ food: "", amount: "", protein: 0, carbs: 0, fats: 0, fiber: 0, cal: 0 });
  useEffect(() => { setItems(getTodayItems(d.foodLogs)); }, [d.foodLogs, today]);
  const mealObj = meals.find(m => m.name === selectedMeal);
  const mealPlanCal = mealObj ? mealObj.items.reduce((a, i) => a + (i.cal || 0), 0) : 0;
  const planTotalCal = meals.flatMap(m => m.items).reduce((a, i) => a + (i.cal || 0), 0);
  const replacements = items.filter(i => i.logType === "replacement");
  const extras = items.filter(i => i.logType === "extra" || !i.logType);
  const replacedPlanCal = replacements.reduce((a, i) => a + (i.replacedMealCal || 0), 0);
  const replacementLogCal = replacements.reduce((a, i) => a + (i.cal || 0), 0);
  const extraCal = extras.reduce((a, i) => a + (i.cal || 0), 0);
  const effectiveTotalCal = planTotalCal - replacedPlanCal + replacementLogCal + extraCal;
  const effectiveDiff = effectiveTotalCal - (targetNutrition?.calories || planTotalCal);
  const addItem = async () => {
    if (!newFood.food) return; setSaving(true);
    const entry = { ...newFood, id: Date.now(), logType, mealLabel: selectedMeal, replacedMealCal: logType === "replacement" ? mealPlanCal : 0 };
    const updated = [...items, entry]; setItems(updated);
    const existingLogs = Array.isArray(d.foodLogs) ? d.foodLogs : [];
    const logs = [...existingLogs.filter(l => l.date !== today), { date: today, items: updated }];
    let updates = { foodLogs: logs };
    if (saveForFuture && newFood.food) { const alreadySaved = (d.savedFoods || []).find(s => s.food.toLowerCase() === newFood.food.toLowerCase()); if (!alreadySaved) updates.savedFoods = [...(d.savedFoods || []), { ...newFood, id: Date.now() }]; }
    await updateDoc(doc(db, "clients", uid), updates);
    setNewFood({ food: "", amount: "", protein: 0, carbs: 0, fats: 0, fiber: 0, cal: 0 }); setSaveForFuture(false); setShowAdd(false);
    toast("Food logged!", "success"); setSaving(false);
  };
  const removeItem = async (itemId) => {
    const updated = items.filter(i => i.id !== itemId); setItems(updated);
    const existingLogs = Array.isArray(d.foodLogs) ? d.foodLogs : [];
    await updateDoc(doc(db, "clients", uid), { foodLogs: [...existingLogs.filter(l => l.date !== today), { date: today, items: updated }] });
  };
  return (
    <div style={{ marginBottom: 16 }}>
      <div className="card" style={{ marginBottom: 14 }}>
        <div className="card-title">
          Today's Food Log — {today}
          <div style={{ display: "flex", gap: 6 }}><button className="btn btn-p btn-sm" onClick={() => setShowAdd(true)}>+ Log Food</button></div>
        </div>
        <div style={{ background: "linear-gradient(135deg,rgba(34,197,94,.06),rgba(59,130,246,.06))", border: "1px solid var(--border)", borderRadius: 12, padding: 14, marginBottom: 14 }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {[{ label: "Coach Plan", val: planTotalCal, color: "var(--blue)" }, { label: "Effective Total", val: effectiveTotalCal, color: effectiveDiff > 100 ? "var(--red)" : effectiveDiff < -100 ? "var(--green)" : "var(--blue)" }].map(({ label, val, color }) => (
              <div key={label} style={{ background: "var(--s2)", borderRadius: 10, padding: "8px 14px", border: "1px solid var(--border)", flex: 1, minWidth: 80, textAlign: "center" }}>
                <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 18, fontWeight: 800, color }}>{val} kcal</div>
                <div style={{ fontSize: 9, color: "var(--muted)", fontWeight: 700, textTransform: "uppercase", marginTop: 3 }}>{label}</div>
              </div>
            ))}
          </div>
          {items.length > 0 && (
            <div style={{ marginTop: 10, padding: "8px 12px", borderRadius: 9, background: effectiveDiff > 100 ? "rgba(248,113,113,.08)" : effectiveDiff < -100 ? "rgba(34,197,94,.08)" : "rgba(59,130,246,.08)", border: "1px solid " + (effectiveDiff > 100 ? "rgba(248,113,113,.3)" : effectiveDiff < -100 ? "var(--green-b)" : "rgba(59,130,246,.3)") }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: effectiveDiff > 100 ? "var(--red)" : effectiveDiff < -100 ? "var(--green)" : "var(--blue)" }}>
                {effectiveDiff > 100 ? `📈 +${effectiveDiff} kcal surplus vs target` : effectiveDiff < -100 ? `📉 ${Math.abs(effectiveDiff)} kcal deficit vs target` : `✅ On target (${effectiveDiff > 0 ? "+" : ""}${effectiveDiff} kcal)`}
              </div>
            </div>
          )}
        </div>
        {items.length === 0 ? <div style={{ color: "var(--muted)", fontSize: 13, textAlign: "center", padding: "16px 0" }}>No food logged today yet.</div> : (
          <>
            {replacements.length > 0 && <div style={{ marginBottom: 10 }}><div style={{ fontSize: 11, fontWeight: 700, color: "var(--orange)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6 }}>🔄 Replacements</div>{replacements.map((item, i) => (<div key={item.id || i} className="food-row"><div style={{ flex: 1 }}><span style={{ fontWeight: 600 }}>{item.food}</span><span style={{ color: "var(--muted)", fontSize: 12, marginLeft: 8 }}>{item.amount}</span><span style={{ fontSize: 11, color: "var(--muted2)", marginLeft: 8 }}>Plan: <span style={{ color: "var(--blue)" }}>{item.replacedMealCal} kcal</span> → <span style={{ color: item.cal > item.replacedMealCal ? "var(--red)" : "var(--green)", fontWeight: 700 }}>{item.cal} kcal</span></span></div><button className="btn btn-d btn-xs" onClick={() => removeItem(item.id)}>✕</button></div>))}</div>}
            {extras.length > 0 && <div><div style={{ fontSize: 11, fontWeight: 700, color: "var(--purple)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6 }}>➕ Extra Food</div>{extras.map((item, i) => (<div key={item.id || i} className="food-row"><div style={{ flex: 1 }}><span style={{ fontWeight: 600 }}>{item.food}</span><span style={{ color: "var(--muted)", fontSize: 12, marginLeft: 8 }}>{item.amount}</span><span style={{ fontSize: 11, color: "var(--green)", fontWeight: 700, marginLeft: 8 }}>{item.cal} kcal</span></div><button className="btn btn-d btn-xs" onClick={() => removeItem(item.id)}>✕</button></div>))}</div>}
          </>
        )}
      </div>
      {showAdd && (
        <div className="ov" onClick={e => e.target === e.currentTarget && setShowAdd(false)}>
          <div className="modal">
            <div className="mh"><div><div className="mt">Log Food</div></div><button className="xbtn" onClick={() => setShowAdd(false)}>✕</button></div>
            <div className="mb2">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
                {[["replacement", "🔄 Replacement", "Replace a meal", "var(--orange)"], ["extra", "➕ Extra", "Add on top of plan", "var(--purple)"]].map(([type, title, desc, color]) => (
                  <button key={type} onClick={() => setLogType(type)} style={{ padding: "12px", borderRadius: 12, border: "2px solid " + (logType === type ? color : "var(--border)"), background: logType === type ? color + "15" : "var(--s2)", cursor: "pointer", textAlign: "left", transition: "all .18s" }}>
                    <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: 14, color: logType === type ? color : "var(--text)" }}>{title}</div>
                    <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 3 }}>{desc}</div>
                  </button>
                ))}
              </div>
              {logType === "replacement" && (
                <div className="fld"><div className="fl" style={{ color: "var(--orange)" }}>Replacing which meal?</div>
                  <select className="fsel" value={selectedMeal} onChange={e => setSelectedMeal(e.target.value)}>
                    {meals.map(m => { const mCal = m.items.reduce((a, i) => a + (i.cal || 0), 0); return <option key={m.name} value={m.name}>{m.name} ({mCal} kcal)</option>; })}
                  </select>
                </div>
              )}
              {savedFoods.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div className="fl">Quick fill from saved</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {savedFoods.map(f => (<button key={f.id} style={{ padding: "4px 10px", borderRadius: 20, background: "var(--s2)", border: "1px solid var(--border)", fontSize: 11, cursor: "pointer", color: "var(--text)" }} onClick={() => setNewFood({ food: f.food, amount: f.amount, protein: f.protein, carbs: f.carbs, fats: f.fats, fiber: f.fiber || 0, cal: f.cal })}>{f.food}</button>))}
                  </div>
                </div>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 8, marginBottom: 8 }}>
                <div className="fld"><div className="fl">Food Name</div><input className="fi" value={newFood.food} onChange={e => setNewFood(p => ({ ...p, food: e.target.value }))} placeholder="e.g. Chicken Breast" /></div>
                <div className="fld"><div className="fl">Amount</div><input className="fi" value={newFood.amount} onChange={e => setNewFood(p => ({ ...p, amount: e.target.value }))} placeholder="200g" /></div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 8 }}>
                {[["P(g)", "protein", "var(--purple)"], ["C(g)", "carbs", "var(--orange)"], ["F(g)", "fats", "var(--red)"], ["Cal", "cal", "var(--green)"]].map(([l, k, co]) => (
                  <div key={k}><div className="fl" style={{ color: co }}>{l}</div><input className="fi" type="number" value={newFood[k] || ""} onChange={e => setNewFood(p => ({ ...p, [k]: parseFloat(e.target.value) || 0 }))} placeholder="0" style={{ color: co, fontWeight: 700, padding: "10px 6px", textAlign: "center" }} /></div>
                ))}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <input type="checkbox" id="savef" checked={saveForFuture} onChange={e => setSaveForFuture(e.target.checked)} style={{ width: 15, height: 15, accentColor: "var(--green)" }} />
                <label htmlFor="savef" style={{ fontSize: 12, color: "var(--muted2)", cursor: "pointer" }}>Save this food for future use</label>
              </div>
              <button className="btn btn-p" style={{ width: "100%" }} onClick={addItem} disabled={saving || !newFood.food}>{saving ? "Logging..." : logType === "replacement" ? `Log as Replacement` : "Log as Extra Food"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── CLIENT WORKOUT FULLSCREEN ────────────────────────────────────────────────
function WorkoutFullscreen({ workout, phase, week, warmup, cooldown, onClose }) {
  const [selDay, setSelDay] = useState(0);
  const [videoModal, setVideoModal] = useState(null);
  const day = workout[selDay];
  const dc = DAY_COLORS[selDay % DAY_COLORS.length];

  return (
    <div className="wk-fullscreen">
      <div className="wk-fs-nav">
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <button className="btn btn-s btn-sm" onClick={onClose}>← Back</button>
          <div>
            <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 800, fontSize: 16 }}>Workout Plan</div>
            <div style={{ fontSize: 11, color: "var(--muted)" }}>{phase} — Week {week}</div>
          </div>
        </div>
        <span className="live"><span className="dot" />Live plan</span>
      </div>

      <div className="wk-fs-body">
        {/* Day selector pills */}
        {/* Day selector pills — scrollable, never wraps off screen */}
<div style={{ 
  display: "flex", gap: 6, 
  overflowX: "auto", flexWrap: "nowrap",
  marginBottom: 20, paddingBottom: 4,
  WebkitOverflowScrolling: "touch",
  scrollbarWidth: "none"
}}>
  {workout.map((d2, i) => {
    const dc2 = DAY_COLORS[i % DAY_COLORS.length];
    const isActive = selDay === i;
    return (
      <button key={i} onClick={() => setSelDay(i)}
        style={{
          padding: "7px 14px", borderRadius: 20, flexShrink: 0,
          border: "1.5px solid " + (isActive ? dc2.accent : "var(--border)"),
          background: isActive ? dc2.bg : "var(--s2)",
          cursor: "pointer", fontFamily: "'Outfit',sans-serif", fontWeight: 700,
          fontSize: 12, transition: "all .2s",
          color: isActive ? dc2.accent : "var(--muted)",
          opacity: d2.type === "Rest" ? 0.6 : 1
        }}>
        <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: ".07em" }}>{d2.day.slice(0, 3)}</div>
        <div>{d2.type}</div>
        {d2.type !== "Rest" && <div style={{ fontSize: 9, color: isActive ? dc2.accent : "var(--muted)" }}>{d2.exercises.length}ex</div>}
      </button>
    );
  })}
</div>

        {/* Day header */}
        <div style={{
          background: dc.bg, border: "2px solid " + dc.border, borderRadius: 14,
          padding: "14px 18px", marginBottom: 16,
          display: "flex", alignItems: "center", gap: 12
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: "50%",
            background: dc.accent + "22", border: "2px solid " + dc.border,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 17, fontWeight: 900, color: dc.accent, fontFamily: "'Outfit',sans-serif"
          }}>{selDay + 1}</div>
          <div>
            <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 800, fontSize: 20, color: dc.accent }}>{day.day}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 3 }}>
              <span style={{ padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: dc.accent + "22", color: dc.accent, border: "1px solid " + dc.border }}>{day.type}</span>
              {day.type !== "Rest" && <span style={{ fontSize: 11, color: "var(--muted)" }}>{day.exercises.length} exercises</span>}
            </div>
          </div>
        </div>

        {day.type === "Rest" ? (
          <div style={{ textAlign: "center", padding: "40px 24px", background: "var(--s1)", border: "1px solid var(--border)", borderRadius: 14 }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>😴</div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>Rest & Recovery Day</div>
            <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 6 }}>Relax, recover, and come back stronger.</div>
          </div>
        ) : (
          <div style={{ background: "var(--s1)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden", marginBottom: 14 }}>
            {/* Table header */}
            <div style={{
              display: "grid", gridTemplateColumns: "32px 1fr 52px 72px 60px 36px",
              gap: 0, padding: "8px 14px",
              background: "var(--s3)", borderBottom: "1px solid var(--border)"
            }}>
              {["#", "Exercise", "Sets", "Reps", "Rest", ""].map((h, i) => (
                <div key={i} style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".06em", textAlign: i > 1 ? "center" : "left" }}>{h}</div>
              ))}
            </div>
            {/* Exercise rows */}
            {day.exercises.map((ex, ei) => (
              <div key={ei} style={{
                display: "grid", gridTemplateColumns: "32px 1fr 52px 72px 60px 36px",
                gap: 0, padding: "11px 14px", alignItems: "center",
                borderBottom: ei < day.exercises.length - 1 ? "1px solid var(--border)" : "none",
                transition: "background .15s",
              }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,.025)"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >
                {/* # */}
                <div style={{
                  width: 22, height: 22, borderRadius: "50%",
                  background: dc.accent + "20", border: "1.5px solid " + dc.border,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 10, fontWeight: 800, color: dc.accent
                }}>{ei + 1}</div>

                {/* Name + note */}
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: 14 }}>{ex.name}</div>
                  {ex.note && (
                    <div style={{ fontSize: 11, color: "#fbbf24", marginTop: 2, whiteSpace: "normal", lineHeight: 1.4, wordBreak: "break-word" }}>
                    💡 {ex.note}
                  </div>
                  )}
                </div>

                {/* Sets */}
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 15, fontWeight: 800, color: dc.accent }}>{ex.sets}</div>
                  <div style={{ fontSize: 9, color: "var(--muted)", fontWeight: 600, textTransform: "uppercase" }}>sets</div>
                </div>

                {/* Reps */}
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 13, fontWeight: 800, color: "var(--blue)" }}>{ex.reps}</div>
                  <div style={{ fontSize: 9, color: "var(--muted)", fontWeight: 600, textTransform: "uppercase" }}>reps</div>
                </div>

                {/* Rest */}
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 13, fontWeight: 800, color: "var(--orange)" }}>{ex.rest}</div>
                  <div style={{ fontSize: 9, color: "var(--muted)", fontWeight: 600, textTransform: "uppercase" }}>rest</div>
                </div>

                {/* Video */}
                <div style={{ textAlign: "center" }}>
                  {ex.videoUrl && (
                    <button className="btn btn-s btn-xs" onClick={() => setVideoModal(ex)}
                      style={{ padding: "3px 7px", fontSize: 11 }}>▶</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Warm-up */}
        {warmup ? (
          <div style={{ background: "rgba(251,146,60,.06)", border: "1px solid rgba(251,146,60,.25)", borderRadius: 14, padding: "16px 18px", marginBottom: 12 }}>
            <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 800, fontSize: 15, color: "var(--orange)", marginBottom: 10 }}>🔥 Warm-up</div>
            <div style={{ fontSize: 13, color: "var(--muted2)", lineHeight: 1.8, whiteSpace: "pre-wrap" }}>{warmup}</div>
          </div>
        ) : null}

        {/* Cool-down */}
        {cooldown ? (
          <div style={{ background: "rgba(56,189,248,.06)", border: "1px solid rgba(56,189,248,.25)", borderRadius: 14, padding: "16px 18px", marginBottom: 16 }}>
            <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 800, fontSize: 15, color: "#38bdf8", marginBottom: 10 }}>❄️ Cool-down</div>
            <div style={{ fontSize: 13, color: "var(--muted2)", lineHeight: 1.8, whiteSpace: "pre-wrap" }}>{cooldown}</div>
          </div>
        ) : null}
      </div>

      {/* Video modal */}
      {videoModal && (
        <div className="ov" style={{ zIndex: 400 }} onClick={() => setVideoModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="mh"><div><div className="mt">{videoModal.name}</div></div><button className="xbtn" onClick={() => setVideoModal(null)}>✕</button></div>
            <div className="mb2">{(() => {
              const url = videoModal.videoUrl;
              const isYT = url.includes("youtube.com") || url.includes("youtu.be");
              const id = isYT ? (url.split("v=")[1]?.split("&")[0] || url.split("youtu.be/")[1]?.split("?")[0]) : null;
              return isYT
                ? <iframe width="100%" height="315" src={`https://www.youtube.com/embed/${id}`} frameBorder="0" allowFullScreen style={{ borderRadius: 10 }} />
                : <video src={url} controls style={{ width: "100%", borderRadius: 10 }} />;
            })()}</div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// COACH WORKOUT EDITOR — Grid overview → click day → fullscreen day editor
// ═══════════════════════════════════════════════════════════════════════════════
function WorkoutEditorCoach({ plan, onClose, autoSave }) {
  const [days, setDays] = useState(JSON.parse(JSON.stringify(plan)));
  const [editingDay, setEditingDay] = useState(null); // null = grid view, number = day index
  const [autoSaved, setAutoSaved] = useState(false);
const saveTimer = useRef(null);
const warmupTimer = useRef(null);
const cooldownTimer = useRef(null);
const [warmup, setWarmup] = useState(plan.warmup || "");
const [cooldown, setCooldown] = useState(plan.cooldown || "");

const triggerAutoSaveWarmup = (val) => {
  if (warmupTimer.current) clearTimeout(warmupTimer.current);
  warmupTimer.current = setTimeout(() => {
    autoSave([...days], val, cooldown);
    setAutoSaved(true);
    setTimeout(() => setAutoSaved(false), 2000);
  }, 800);
};
const triggerAutoSaveCooldown = (val) => {
  if (cooldownTimer.current) clearTimeout(cooldownTimer.current);
  cooldownTimer.current = setTimeout(() => {
    autoSave([...days], warmup, val);
    setAutoSaved(true);
    setTimeout(() => setAutoSaved(false), 2000);
  }, 800);
};
  const TYPES = ["Push", "Pull", "Legs", "Rest", "Cardio", "Full Body", "Upper", "Lower", "Active Recovery"];

  const triggerAutoSave = (newDays) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      autoSave(newDays, warmup, cooldown);
      setAutoSaved(true);
      setTimeout(() => setAutoSaved(false), 2500);
    }, 800);
  };

  const updateDay = (di, f, v) => { const u = days.map((d, i) => i === di ? { ...d, [f]: v } : d); setDays(u); triggerAutoSave(u); };
  const updateEx = (di, ei, f, v) => { const u = days.map((d, i) => i === di ? { ...d, exercises: d.exercises.map((ex, j) => j === ei ? { ...ex, [f]: v } : ex) } : d); setDays(u); triggerAutoSave(u); };
  const addEx = (di) => { const u = days.map((d, i) => i === di ? { ...d, exercises: [...d.exercises, { name: "", sets: 3, reps: "10-12", rest: "60s", videoUrl: "", note: "" }] } : d); setDays(u); triggerAutoSave(u); };
  const removeEx = (di, ei) => { const u = days.map((d, i) => i === di ? { ...d, exercises: d.exercises.filter((_, j) => j !== ei) } : d); setDays(u); triggerAutoSave(u); };
  const addDay = () => { const u = [...days, { day: "Day " + (days.length + 1), type: "Push", exercises: [] }]; setDays(u); triggerAutoSave(u); };
  const removeDay = (di) => { if (days.length <= 1) return; const u = days.filter((_, i) => i !== di); setDays(u); if (editingDay !== null) setEditingDay(null); triggerAutoSave(u); };

  // ── FULLSCREEN DAY EDITOR ──
  if (editingDay !== null) {
    const day = days[editingDay];
    const dc = DAY_COLORS[editingDay % DAY_COLORS.length];
    return (
      <div className="wke-overlay">
        <div className="wke-topbar">
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <button className="btn btn-s btn-sm" onClick={() => setEditingDay(null)}>← Back to Overview</button>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: dc.accent + "22", border: "2px solid " + dc.border, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: dc.accent }}>{editingDay + 1}</div>
              <div>
                <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 800, fontSize: 16, color: dc.accent }}>{day.day} — {day.type}</div>
                <div style={{ fontSize: 11, color: "var(--muted)" }}>Changes auto-save as you type</div>
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className={`autosave ${autoSaved ? "show" : ""}`}>✓ Saved</span>
            <button className="btn btn-s btn-sm" disabled={editingDay === 0} onClick={() => setEditingDay(d => d - 1)}>← Prev</button>
            <button className="btn btn-s btn-sm" disabled={editingDay === days.length - 1} onClick={() => setEditingDay(d => d + 1)}>Next →</button>
            <button className="btn btn-p btn-sm" onClick={() => setEditingDay(null)}>Done ✓</button>
          </div>
        </div>
        <div className="wke-body">
          {/* Day name + type */}
          <div style={{ background: dc.bg, border: "2px solid " + dc.border, borderRadius: 16, padding: 20, marginBottom: 24 }}>
            <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 160 }}>
                <div className="fl" style={{ color: dc.accent }}>Day Name</div>
                <input className="fi" style={{ borderColor: dc.border, background: "rgba(0,0,0,.25)", fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: 16 }} value={day.day} onChange={e => updateDay(editingDay, "day", e.target.value)} placeholder="Day name" />
              </div>
              <div style={{ minWidth: 160 }}>
                <div className="fl" style={{ color: dc.accent }}>Workout Type</div>
                <select className="fsel" style={{ borderColor: dc.border, background: "rgba(0,0,0,.25)" }} value={day.type} onChange={e => updateDay(editingDay, "type", e.target.value)}>
                  {TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              {days.length > 1 && <button className="btn btn-d btn-sm" onClick={() => removeDay(editingDay)}>Remove Day</button>}
            </div>
            <div style={{ marginTop: 12 }}>
              <span style={{ display: "inline-flex", padding: "4px 14px", borderRadius: 20, fontSize: 12, fontWeight: 700, background: (WCOLOR[day.type] || "#475569") + "22", color: WCOLOR[day.type] || "#475569", border: "1px solid " + (WCOLOR[day.type] || "#475569") + "44" }}>
                {day.type === "Rest" ? "REST DAY" : day.type.toUpperCase() + " — " + day.exercises.length + " exercises"}
              </span>
            </div>
          </div>

          {day.type === "Rest" ? (
            <div style={{ textAlign: "center", padding: "56px 24px", background: "var(--s1)", borderRadius: 16, border: "1px solid var(--border)" }}>
              <div style={{ fontSize: 52, marginBottom: 12 }}>🛌</div>
              <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 800, fontSize: 20, marginBottom: 8 }}>{day.day} — Rest Day</div>
              <div style={{ color: "var(--muted)", fontSize: 14 }}>Recovery is training too. Change the type above to add exercises.</div>
            </div>
          ) : (
            <>
              {day.exercises.map((ex, ei) => (
                <div key={ei} className="ex-editor-card" style={{ borderColor: dc.border, animationDelay: ei * 0.04 + "s" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: dc.accent + "22", border: "2px solid " + dc.border, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: dc.accent, flexShrink: 0 }}>{ei + 1}</div>
                    <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: 13, color: dc.accent, textTransform: "uppercase", letterSpacing: ".05em" }}>Exercise {ei + 1}</div>
                    <button className="btn btn-d btn-xs" style={{ marginLeft: "auto" }} onClick={() => removeEx(editingDay, ei)}>✕ Remove</button>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 64px 80px 64px", gap: 8, marginBottom: 12 }}>
                    <div><div className="fl">Exercise Name</div><input className="fi" value={ex.name} onChange={e => updateEx(editingDay, ei, "name", e.target.value)} placeholder="e.g. Bench Press" style={{ borderColor: dc.border }} /></div>
                    <div><div className="fl">Sets</div><input className="fi" type="number" value={ex.sets} onChange={e => updateEx(editingDay, ei, "sets", parseInt(e.target.value) || 1)} style={{ borderColor: dc.border, textAlign: "center", fontWeight: 700 }} /></div>
                    <div><div className="fl">Reps</div><input className="fi" value={ex.reps} onChange={e => updateEx(editingDay, ei, "reps", e.target.value)} placeholder="10-12" style={{ borderColor: dc.border, textAlign: "center" }} /></div>
                    <div><div className="fl">Rest</div><input className="fi" value={ex.rest} onChange={e => updateEx(editingDay, ei, "rest", e.target.value)} placeholder="60s" style={{ borderColor: dc.border, textAlign: "center" }} /></div>
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <div className="fl">YouTube Demo Link (optional)</div>
                    <input className="fi" value={ex.videoUrl || ""} onChange={e => updateEx(editingDay, ei, "videoUrl", e.target.value)} placeholder="https://youtube.com/watch?v=..." style={{ borderColor: dc.border }} />
                    {ex.videoUrl && <div style={{ marginTop: 6 }}><span className="bdg bdg-b">▶ Video linked</span><button className="btn btn-d btn-xs" style={{ marginLeft: 8 }} onClick={() => updateEx(editingDay, ei, "videoUrl", "")}>Remove</button></div>}
                  </div>
                  <div>
                    <div className="fl" style={{ color: "#fbbf24" }}>Coaching Note (client sees this)</div>
                    <textarea className="fta" style={{ minHeight: 60, fontSize: 12, borderColor: ex.note ? "rgba(251,191,36,.4)" : dc.border, background: ex.note ? "rgba(251,191,36,.04)" : "var(--s2)" }}
                      value={ex.note || ""} onChange={e => updateEx(editingDay, ei, "note", e.target.value)}
                      placeholder="e.g. Keep chest up, controlled negative, pause at bottom" />
                  </div>
                </div>
              ))}
              <button style={{ width: "100%", padding: "14px", borderRadius: 12, border: "2px dashed " + dc.border, background: dc.bg, color: dc.accent, fontSize: 14, fontWeight: 700, cursor: "pointer", transition: "all .2s", fontFamily: "'Outfit',sans-serif" }}
                onMouseEnter={e => { e.currentTarget.style.background = dc.accent + "22"; }} onMouseLeave={e => { e.currentTarget.style.background = dc.bg; }}
                onClick={() => addEx(editingDay)}>+ Add Exercise to {day.day}</button>
            </>
          )}
        </div>
      </div>
    );
  }

  // ── GRID OVERVIEW ──
  return (
    <div className="wke-overlay">
      <div className="wke-topbar">
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <button className="btn btn-s btn-sm" onClick={onClose}>← Done</button>
          <div>
            <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 800, fontSize: 17 }}>Edit Workout Plan</div>
            <div style={{ fontSize: 11, color: "var(--muted)" }}>Click any day to edit exercises</div>
          </div>
        </div>
        <div style={{ 
  display: "flex", alignItems: "center", gap: 6, 
  flexWrap: "wrap", justifyContent: "flex-end",
  flexShrink: 0
}}>
  <span className={`autosave ${autoSaved ? "show" : ""}`}>✓ Saved</span>
  <button className="btn btn-p btn-sm" onClick={onClose}>← Done</button>
</div>
      </div>
      <div className="wke-body">
        {/* ── Grid like your image ── */}
        <div style={{ background: "var(--s1)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden", marginBottom: 24 }}>
          {/* Header row */}
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${days.length}, 1fr)`, borderBottom: "1px solid var(--border)" }}>
            {days.map((day, di) => {
              const dc = DAY_COLORS[di % DAY_COLORS.length];
              return (
                <div key={di} style={{ padding: "14px 8px", textAlign: "center", borderRight: di < days.length - 1 ? "1px solid var(--border)" : "none", background: "var(--s3)" }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: dc.accent, letterSpacing: ".08em", marginBottom: 2 }}>{dc.label}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--muted2)" }}>{day.day}</div>
                </div>
              );
            })}
          </div>
          {/* Type row */}
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${days.length}, 1fr)` }}>
            {days.map((day, di) => {
              const dc = DAY_COLORS[di % DAY_COLORS.length];
              const typeColor = WCOLOR[day.type] || "#475569";
              return (
                <div key={di}
                  onClick={() => setEditingDay(di)}
                  style={{
                    padding: "22px 8px", textAlign: "center", cursor: "pointer",
                    borderRight: di < days.length - 1 ? "1px solid var(--border)" : "none",
                    background: day.type === "Rest" ? "var(--s2)" : "transparent",
                    transition: "all .18s", opacity: day.type === "Rest" ? 0.7 : 1,
                  }}
                  onMouseEnter={e => { if (day.type !== "Rest") e.currentTarget.style.background = dc.bg; }}
                  onMouseLeave={e => { e.currentTarget.style.background = day.type === "Rest" ? "var(--s2)" : "transparent"; }}
                >
                  <div style={{ display: "inline-flex", padding: "6px 14px", borderRadius: 20, fontSize: 13, fontWeight: 800, background: typeColor + "22", color: typeColor, border: "1.5px solid " + typeColor + "55", marginBottom: 8 }}>{day.type}</div>
                  {day.type !== "Rest" && <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600 }}>{day.exercises.length} exercise{day.exercises.length !== 1 ? "s" : ""}</div>}
                  {day.type !== "Rest" && <div style={{ fontSize: 10, color: dc.accent, marginTop: 6, fontWeight: 600 }}>Click to edit →</div>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick type selector grid */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-title">Quick Type Editor</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 10 }}>
            {days.map((day, di) => {
              const dc = DAY_COLORS[di % DAY_COLORS.length];
              return (
                <div key={di} style={{ background: dc.bg, border: "1.5px solid " + dc.border, borderRadius: 12, padding: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <div style={{ width: 26, height: 26, borderRadius: "50%", background: dc.accent + "22", border: "1.5px solid " + dc.border, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: dc.accent }}>{di + 1}</div>
                    <input className="fi" style={{ flex: 1, borderColor: dc.border, background: "rgba(0,0,0,.25)", fontSize: 12, padding: "6px 10px" }} value={day.day} onChange={e => updateDay(di, "day", e.target.value)} />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <select className="fsel" style={{ flex: 1, borderColor: dc.border, background: "rgba(0,0,0,.25)", fontSize: 11, padding: "6px 8px" }} value={day.type} onChange={e => updateDay(di, "type", e.target.value)}>
                      {TYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                    <button className="btn btn-p btn-xs" onClick={() => setEditingDay(di)}>Edit</button>
                  </div>
                </div>
              );
            })}
          </div>
          </div>
      </div>

      {/* ── WARM-UP EDITOR ── */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-title">
          🔥 Warm-up Instructions
          <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 400 }}>— visible to client in workout view</span>
        </div>
        <textarea className="fta" style={{ minHeight: 140, fontSize: 13, lineHeight: 1.7 }}
          placeholder={"General Warm-Up (5 Minutes)\n\nLight cardio of choice (treadmill walk, cycle, cross-trainer)\nGradually increase heart rate\nPurpose: increase blood flow, joint temperature, and readiness\n\nUpper Body Days:\nBand pull-aparts – 2 × 15\nShoulder external rotations (band/cable) – 2 × 12–15\nScapular retractions – 2 × 12\nArm circles (controlled) – 20 reps each direction\n\nLower Body Days:\nHip circles – 10 each side\nHamstring sweeps or toe reaches – 10 reps\nBodyweight squats – 2 × 15\nWalking lunges – 10 each leg"}
          value={warmup}
          onChange={e => { setWarmup(e.target.value); triggerAutoSaveWarmup(e.target.value); }}
        />
      </div>

      {/* ── COOL-DOWN EDITOR ── */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-title">
          ❄️ Cool-down Instructions
          <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 400 }}>— visible to client in workout view</span>
        </div>
        <textarea className="fta" style={{ minHeight: 140, fontSize: 13, lineHeight: 1.7 }}
          placeholder={"Heart Rate Normalisation (3–4 Minutes)\n\nSlow walking or light cycling\nPurpose: bring nervous system down, aid recovery\nDeep nasal breathing\n\nStretching & Mobility (5–6 Minutes)\n\nUpper Body Focus:\nNeck mobility (gentle) – 10–15 reps\nChest stretch – 20–30 sec\nShoulder cross-body stretch – 30 sec each\nTricep overhead stretch – 20–30 sec\n\nLower Body Focus:\nQuad stretch (standing) – 30 sec each\nHamstring stretch – 30 sec each\nGlute stretch (figure-4) – 30 sec each"}
          value={cooldown}
          onChange={e => { setCooldown(e.target.value); triggerAutoSaveCooldown(e.target.value); }}
        />
      </div>
    </div>
  );
}
// ─── DROP-IN REPLACEMENT for the innerTab === "workout" IIFE block ───────────
// Replace this entire block in CoachDash:
//
//   {innerTab === "workout" && (() => { ... })()}
//
// With this component call:
//
//   {innerTab === "workout" && (
//     <CoachWorkoutTab
//       sel={sel}
//       setShowWorkoutEditor={setShowWorkoutEditor}
//       setVideoModal={setVideoModal}
//     />
//   )}
//
// And define CoachWorkoutTab OUTSIDE of CoachDash (e.g. right above it).
// ─────────────────────────────────────────────────────────────────────────────

function CoachWorkoutTab({ sel, setShowWorkoutEditor, setVideoModal }) {
  const wp = sel.workoutPlan || DEFAULT_WORKOUT;
  const [viewDay, setViewDay] = useState(0);

  const vd = wp[viewDay] || wp[0];
  const vdc = DAY_COLORS[viewDay % DAY_COLORS.length];

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 800, fontSize: 17 }}>Workout Plan</div>
        <button className="btn btn-p btn-sm" onClick={() => setShowWorkoutEditor(true)}>✏ Edit Plan</button>
      </div>

      {/* Day selector pills */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
        {wp.map((day, di) => {
          const dc2 = DAY_COLORS[di % DAY_COLORS.length];
          const isActive = viewDay === di;
          return (
            <button key={di} onClick={() => setViewDay(di)}
              style={{
                padding: "6px 13px", borderRadius: 20,
                border: "1.5px solid " + (isActive ? dc2.accent : "var(--border)"),
                background: isActive ? dc2.bg : "var(--s2)",
                cursor: "pointer", fontFamily: "'Outfit',sans-serif", fontWeight: 700,
                fontSize: 11, transition: "all .18s",
                color: isActive ? dc2.accent : "var(--muted)",
                opacity: day.type === "Rest" ? 0.6 : 1
              }}>
              <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: ".07em" }}>{day.day.slice(0, 3)}</div>
              <div>{day.type}</div>
              {day.type !== "Rest" && <div style={{ fontSize: 9 }}>{day.exercises.length}ex</div>}
            </button>
          );
        })}
      </div>

      {/* Day card */}
      <div style={{ background: "var(--s1)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden", marginBottom: 14 }}>
        {/* Day header */}
        <div style={{
          padding: "12px 16px", background: vdc.bg,
          borderBottom: "1px solid var(--border)",
          display: "flex", alignItems: "center", gap: 10
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: "50%",
            background: vdc.accent + "22", border: "1.5px solid " + vdc.border,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 13, fontWeight: 800, color: vdc.accent
          }}>{viewDay + 1}</div>
          <div>
            <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 800, fontSize: 15, color: vdc.accent }}>{vd.day}</div>
            <div style={{ fontSize: 11, color: "var(--muted)" }}>
              {vd.type}{vd.type !== "Rest" ? " · " + vd.exercises.length + " exercises" : ""}
            </div>
          </div>
        </div>

        {vd.type === "Rest" ? (
          <div style={{ padding: "28px 16px", textAlign: "center", color: "var(--muted)" }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>😴</div>
            <div style={{ fontWeight: 700 }}>Rest & Recovery Day</div>
          </div>
        ) : (
          <>
            {/* Table header */}
            <div style={{
              display: "grid", gridTemplateColumns: "28px 1fr 48px 68px 56px 32px",
              gap: 0, padding: "7px 14px",
              background: "var(--s3)", borderBottom: "1px solid var(--border)"
            }}>
              {["#", "Exercise", "Sets", "Reps", "Rest", ""].map((h, i) => (
                <div key={i} style={{
                  fontSize: 10, fontWeight: 700, color: "var(--muted)",
                  textTransform: "uppercase", letterSpacing: ".06em",
                  textAlign: i > 1 ? "center" : "left"
                }}>{h}</div>
              ))}
            </div>

            {/* Exercise rows */}
            {vd.exercises.map((ex, ei) => (
              <div key={ei} style={{
                display: "grid", gridTemplateColumns: "28px 1fr 48px 68px 56px 32px",
                gap: 0, padding: "10px 14px", alignItems: "center",
                borderBottom: ei < vd.exercises.length - 1 ? "1px solid var(--border)" : "none",
                transition: "background .15s"
              }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,.025)"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >
                <div style={{
                  width: 20, height: 20, borderRadius: "50%",
                  background: vdc.accent + "20", border: "1.5px solid " + vdc.border,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 9, fontWeight: 800, color: vdc.accent
                }}>{ei + 1}</div>

                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{ex.name}</div>
                  {ex.note && (
                    <div style={{ fontSize: 11, color: "#fbbf24", marginTop: 2, whiteSpace: "normal", lineHeight: 1.4, wordBreak: "break-word" }}>
                    💡 {ex.note}
                  </div>
                  )}
                </div>

                <div style={{ textAlign: "center" }}>
                  <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 14, fontWeight: 800, color: vdc.accent }}>{ex.sets}</div>
                  <div style={{ fontSize: 9, color: "var(--muted)", textTransform: "uppercase" }}>sets</div>
                </div>

                <div style={{ textAlign: "center" }}>
                  <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 12, fontWeight: 800, color: "var(--blue)" }}>{ex.reps}</div>
                  <div style={{ fontSize: 9, color: "var(--muted)", textTransform: "uppercase" }}>reps</div>
                </div>

                <div style={{ textAlign: "center" }}>
                  <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 12, fontWeight: 800, color: "var(--orange)" }}>{ex.rest}</div>
                  <div style={{ fontSize: 9, color: "var(--muted)", textTransform: "uppercase" }}>rest</div>
                </div>

                <div style={{ textAlign: "center" }}>
                  {ex.videoUrl && (
                    <button className="btn btn-s btn-xs"
                      onClick={() => setVideoModal(ex)}
                      style={{ padding: "2px 6px", fontSize: 10 }}>▶</button>
                  )}
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Warm-up */}
      {sel.workoutWarmup && (
        <div style={{
          background: "rgba(251,146,60,.06)", border: "1px solid rgba(251,146,60,.25)",
          borderRadius: 12, padding: "12px 16px", marginBottom: 10
        }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: "var(--orange)", marginBottom: 6 }}>🔥 Warm-up</div>
          <div style={{ fontSize: 12, color: "var(--muted2)", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{sel.workoutWarmup}</div>
        </div>
      )}

      {/* Cool-down */}
      {sel.workoutCooldown && (
        <div style={{
          background: "rgba(56,189,248,.06)", border: "1px solid rgba(56,189,248,.25)",
          borderRadius: 12, padding: "12px 16px", marginBottom: 14
        }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: "#38bdf8", marginBottom: 6 }}>❄️ Cool-down</div>
          <div style={{ fontSize: 12, color: "var(--muted2)", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{sel.workoutCooldown}</div>
        </div>
      )}
    </div>
  );
}

// ─── HOW TO USE ───────────────────────────────────────────────────────────────
// 1. Place the CoachWorkoutTab function ABOVE CoachDash (outside it entirely).
//
// 2. Inside CoachDash, find this block and DELETE it:
//
//     {innerTab === "workout" && (() => {
//       const wp = sel.workoutPlan || DEFAULT_WORKOUT;
//       const [viewDay, setViewDay] = useState(0);        // ← illegal hook in IIFE
//       ...
//     })()}
//
// 3. Replace it with this single line:
//
//     {innerTab === "workout" && (
//       <CoachWorkoutTab
//         sel={sel}
//         setShowWorkoutEditor={setShowWorkoutEditor}
//         setVideoModal={setVideoModal}
//       />
//     )}
// ─── MEAL EDITOR ──────────────────────────────────────────────────────────────
function MealEditor({ plan, onClose, clientSources, autoSave }) {
  const [meals, setMeals] = useState(JSON.parse(JSON.stringify(plan)));
  const [autoSaved, setAutoSaved] = useState(false);
  const saveTimer = useRef(null);
  const triggerAutoSave = (newMeals) => { if (saveTimer.current) clearTimeout(saveTimer.current); saveTimer.current = setTimeout(() => { autoSave(newMeals); setAutoSaved(true); setTimeout(() => setAutoSaved(false), 2000); }, 1000); };
  const updateMeal = (mi, f, v) => { const u = meals.map((m, i) => i === mi ? { ...m, [f]: v } : m); setMeals(u); triggerAutoSave(u); };
  const updateItem = (mi, ii, f, v) => { const u = meals.map((m, i) => i === mi ? { ...m, items: m.items.map((item, j) => j === ii ? { ...item, [f]: f === "food" || f === "amount" ? v : (parseFloat(v) || 0) } : item) } : m); setMeals(u); triggerAutoSave(u); };
  const addItem = (mi) => { const u = meals.map((m, i) => i === mi ? { ...m, items: [...m.items, { food: "", amount: "", protein: 0, carbs: 0, fats: 0, fiber: 0, cal: 0 }] } : m); setMeals(u); triggerAutoSave(u); };
  const removeItem = (mi, ii) => { const u = meals.map((m, i) => i === mi ? { ...m, items: m.items.filter((_, j) => j !== ii) } : m); setMeals(u); triggerAutoSave(u); };
  const addMeal = () => { const u = [...meals, { name: "Meal " + (meals.length + 1), time: "12:00 PM", items: [] }]; setMeals(u); triggerAutoSave(u); };
  const removeMeal = (mi) => { const u = meals.filter((_, i) => i !== mi); setMeals(u); triggerAutoSave(u); };
  return (
    <div className="ov" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="mh"><div><div className="mt">Edit Meal Plan</div><div className="ms">Auto-saves as you type</div></div><div style={{ display: "flex", alignItems: "center", gap: 10 }}><span className={`autosave ${autoSaved ? "show" : ""}`}>✓ Saved</span><button className="xbtn" onClick={onClose}>✕</button></div></div>
        <div className="mb2">
          <SourcesTablePanel sources={clientSources} />
          {meals.map((meal, mi) => (
            <div key={mi} style={{ background: "var(--s2)", border: "1px solid var(--border)", borderRadius: 12, marginBottom: 14, overflow: "hidden" }}>
              <div style={{ padding: "12px 14px", background: "var(--s3)", display: "flex", gap: 8, alignItems: "center" }}>
                <input className="fi" style={{ flex: 1 }} value={meal.name} onChange={e => updateMeal(mi, "name", e.target.value)} placeholder="Meal name" />
                <input className="fi" style={{ width: 110 }} value={meal.time} onChange={e => updateMeal(mi, "time", e.target.value)} placeholder="Time" />
                <button className="btn btn-d btn-sm" onClick={() => removeMeal(mi)}>Remove</button>
              </div>
              <div style={{ padding: "10px 14px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 70px 70px 70px 70px 80px auto", gap: 5, marginBottom: 6 }}>{["Food", "Amount", "P(g)", "C(g)", "F(g)", "Fib(g)", "Cal", ""].map((h, i) => <div key={i} className="fl">{h}</div>)}</div>
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
          <button className="btn btn-s" style={{ width: "100%" }} onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ADD CLIENT — Fullscreen proper window (not a modal)
// ═══════════════════════════════════════════════════════════════════════════════
function AddClientFullscreen({ coachUid, coachEmail, onClose, onSuccess }) {
  const [nc, setNc] = useState({ name: "", email: "", password: "", phone: "", phase: "Cut Phase 1", week: "1", calories: 2200, protein: 160, carbs: 240, fats: 70, fiber: 25 });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const save = async () => {
    if (!nc.name.trim()) { setErr("Client name is required"); return; }
    if (!nc.email.trim()) { setErr("Email is required"); return; }
    if (!nc.password || nc.password.length < 6) { setErr("Password needs 6+ characters"); return; }
    setErr(""); setSaving(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, nc.email.trim(), nc.password);
      await setDoc(doc(db, "clients", cred.user.uid), {
        name: nc.name.trim(),
        email: nc.email.trim().toLowerCase(),
        phone: nc.phone.trim(),
        avatar: nc.name.trim().split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase(),
        phase: nc.phase,
        week: parseInt(nc.week) || 1,
        weight: null, waist: null, bodyFat: null,
        nutrition: { calories: nc.calories, protein: nc.protein, carbs: nc.carbs, fats: nc.fats, fiber: nc.fiber },
        weightHistory: [], weeklyCheckins: [], coachMessage: "", photos: [], foodLogs: [], savedFoods: [],
        mealPlan: DEFAULT_MEALS, workoutPlan: DEFAULT_WORKOUT,
        coachId: coachUid, coachEmail, role: "client", accessStatus: "active",
        createdAt: serverTimestamp(),
        isNew: true, // flag so we show welcome splash on first login
      });
      await signInWithEmailAndPassword(auth, coachEmail, window._cp);
      onSuccess(nc.name.trim());
    } catch (e) {
      setErr(e.code === "auth/email-already-in-use" ? "This email is already registered!" : e.message);
    }
    setSaving(false);
  };

  return (
    <div className="addclient-overlay">
      {/* Top bar */}
      <div className="addclient-topbar" style={{ flexDirection: "column", height: "auto", padding: "10px 16px", gap: 8, alignItems: "stretch" }}>
  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <button className="btn btn-s btn-sm" onClick={onClose}>✕</button>
      <div>
        <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 800, fontSize: 15 }}>Add New Client</div>
        <div style={{ fontSize: 11, color: "var(--muted)" }}>Fill in details then click Create</div>
      </div>
    </div>
    <button className="btn btn-p btn-sm" onClick={save} disabled={saving} style={{ flexShrink: 0 }}>
      {saving ? "Creating..." : "✓ Create"}
    </button>
  </div>
  {err && <div style={{ fontSize: 12, color: "var(--red)", padding: "4px 0" }}>{err}</div>}
</div>

      {/* Body */}
      <div className="addclient-body">
        {/* Section 1 — Personal Info */}
        <div className="ac-section" style={{ animationDelay: ".05s" }}>
          <div className="ac-section-title">
            <div className="ac-section-icon" style={{ background: "var(--green-bg)" }}>👤</div>
            Personal Info
          </div>
          <div className="fg">
            <div className="fld">
              <div className="fl">Full Name *</div>
              <input className="fi" placeholder="e.g. Rahul Kumar" value={nc.name} onChange={e => setNc(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="fld">
              <div className="fl">Phone Number</div>
              <input className="fi" placeholder="+91 98765 43210" value={nc.phone} onChange={e => setNc(p => ({ ...p, phone: e.target.value }))} />
            </div>
          </div>
        </div>

        {/* Section 2 — Login Credentials */}
        <div className="ac-section" style={{ animationDelay: ".1s" }}>
          <div className="ac-section-title">
            <div className="ac-section-icon" style={{ background: "rgba(59,130,246,.12)" }}>🔐</div>
            Login Credentials
          </div>
          <div className="alert alert-b">Share the app URL + these credentials with your client via WhatsApp after creating.</div>
          <div className="fg">
            <div className="fld">
              <div className="fl">Email *</div>
              <input className="fi" type="email" placeholder="rahul@gmail.com" value={nc.email} onChange={e => setNc(p => ({ ...p, email: e.target.value }))} />
            </div>
            <div className="fld">
              <div className="fl">Password * (min 6 characters)</div>
              <input className="fi" type="text" placeholder="e.g. rahul@123" value={nc.password} onChange={e => setNc(p => ({ ...p, password: e.target.value }))} />
            </div>
          </div>
        </div>

        {/* Section 3 — Program */}
        <div className="ac-section" style={{ animationDelay: ".15s" }}>
          <div className="ac-section-title">
            <div className="ac-section-icon" style={{ background: "rgba(167,139,250,.12)" }}>📋</div>
            Training Program
          </div>
          <div className="fg">
            <div className="fld">
              <div className="fl">Phase</div>
              <select className="fsel" value={nc.phase} onChange={e => setNc(p => ({ ...p, phase: e.target.value }))}>
                <option>Cut Phase 1</option><option>Cut Phase 2</option>
                <option>Bulk Phase 1</option><option>Bulk Phase 2</option>
                <option>Maintenance</option><option>Peak Week</option>
              </select>
            </div>
            <div className="fld">
              <div className="fl">Starting Week</div>
              <input className="fi" type="number" min="1" max="52" value={nc.week} onChange={e => setNc(p => ({ ...p, week: e.target.value }))} />
            </div>
          </div>
        </div>

        {/* Section 4 — Starting Macros */}
        <div className="ac-section" style={{ animationDelay: ".2s" }}>
          <div className="ac-section-title">
            <div className="ac-section-icon" style={{ background: "rgba(34,197,94,.12)" }}>🍽</div>
            Starting Macro Targets
          </div>
          <div className="fg">
            {[
              ["Calories (kcal)", "calories", "var(--green)"],
              ["Protein (g)", "protein", "var(--purple)"],
              ["Carbs (g)", "carbs", "var(--orange)"],
              ["Fats (g)", "fats", "var(--red)"],
              ["Fiber (g)", "fiber", "#34d399"],
            ].map(([l, k, co]) => (
              <div key={k} className="fld">
                <div className="fl" style={{ color: co }}>{l}</div>
                <NumInput value={nc[k]} color={co} onChange={v => setNc(p => ({ ...p, [k]: v }))} />
              </div>
            ))}
          </div>
          <div style={{ marginTop: 12, padding: "10px 14px", background: "var(--s2)", borderRadius: 10, border: "1px solid var(--border)", fontSize: 12, color: "var(--muted2)" }}>
            Summary: <span style={{ color: "var(--green)", fontWeight: 700 }}>{nc.calories} kcal</span> · <span style={{ color: "var(--purple)", fontWeight: 700 }}>{nc.protein}g P</span> · <span style={{ color: "var(--orange)", fontWeight: 700 }}>{nc.carbs}g C</span> · <span style={{ color: "var(--red)", fontWeight: 700 }}>{nc.fats}g F</span> · <span style={{ color: "#34d399", fontWeight: 700 }}>{nc.fiber}g Fib</span>
          </div>
        </div>

        {/* Bottom create button */}
        <button className="btn btn-p" onClick={save} disabled={saving}
          style={{ width: "100%", padding: "16px", fontSize: 16, borderRadius: 14, marginTop: 8, boxShadow: "0 8px 32px rgba(34,197,94,.35)" }}>
          {saving ? "⏳ Creating Client Account..." : "✓ Create Client Account"}
        </button>
      </div>
    </div>
  );
}

// ─── CLIENT DASHBOARD ─────────────────────────────────────────────────────────
function ClientDash({ uid, tab, setTab, toast }) {
  const [d, setD] = useState(null);
  const [loading, setLoading] = useState(true);
  const prevRef = useRef(null);
  const [flash, setFlash] = useState({});
  const [wModal, setWModal] = useState(null);
  const [videoModal, setVideoModal] = useState(null);
  const [lw, setLw] = useState(""); const [lwa, setLwa] = useState(""); const [lbf, setLbf] = useState("");
  const [saving, setSaving] = useState(false);
  const [viewMedia, setViewMedia] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
const [comparePose, setComparePose] = useState("Front");
const [compareSelections, setCompareSelections] = useState([]);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "clients", uid), snap => {
      if (!snap.exists()) { setLoading(false); return; }
      const data = snap.data();
      // Auto-increment week every Monday
      const today = new Date();
      const isMonday = today.getDay() === 1;
      const todayStr = today.toISOString().split("T")[0];
      if (isMonday && data.lastWeekUpdate !== todayStr) {
        const newWeek = (data.week || 1) + 1;
        updateDoc(doc(db, "clients", uid), { 
          week: newWeek, 
          lastWeekUpdate: todayStr 
        });
      }
      if (prevRef.current) {
        const p = prevRef.current; const changed = {};
        const n = data.nutrition || {}, pn = p.nutrition || {};
        ["calories", "protein", "carbs", "fats", "fiber"].forEach(k => { if (pn[k] !== n[k]) changed[k] = true; });
        if (p.coachMessage !== data.coachMessage) changed.msg = true;
        if (JSON.stringify(p.mealPlan) !== JSON.stringify(data.mealPlan)) changed.meals = true;
        if (JSON.stringify(p.workoutPlan) !== JSON.stringify(data.workoutPlan)) changed.workout = true;
        if (Object.keys(changed).length > 0) { setFlash(changed); toast("Coach updated your plan!", "success"); setTimeout(() => setFlash({}), 3000); }
      }
      // Show welcome splash for new clients on first load
      if (data.isNew && !prevRef.current) {
        setShowWelcome(true);
        updateDoc(doc(db, "clients", uid), { isNew: false });
      }
      prevRef.current = data; setD(data); setLoading(false);
    });
    return unsub;
  }, [uid]);

  const logStats = async () => {
    if (!lw) return; setSaving(true);
    const weight = parseFloat(lw); const hist = d.weightHistory || [];
    const weekKey = "W" + (hist.length + 1);
    await updateDoc(doc(db, "clients", uid), { weight, ...(lwa && { waist: parseFloat(lwa) }), ...(lbf && { bodyFat: parseFloat(lbf) }), weightHistory: [...hist, { week: weekKey, weight, date: new Date().toLocaleDateString("en-IN"), timestamp: new Date().toISOString() }] });
    toast("Weight logged!", "success"); setLw(""); setLwa(""); setLbf(""); setSaving(false);
  };

  const uploadMedia = async (files) => {
    if (!files || files.length === 0) return; setUploading(true); let cnt = 0;
    for (const file of files) {
      const isVideo = file.type.startsWith("video/"); const maxMB = isVideo ? 100 : 25;
      if (file.size / (1024 * 1024) > maxMB) { toast(file.name + " too large", "error"); continue; }
      try {
        setUploadPct(0);
        const result = await cloudinaryUpload(file, pct => setUploadPct(pct));
        const newPhoto = {
          url: result.secure_url,
          publicId: result.public_id,
          type: isVideo ? "video" : "photo",
          name: file.name,
          date: new Date().toLocaleDateString("en-IN"),
          timestamp: new Date().toISOString(),
          week: d.week || 1,
          weekLabel: "Week " + (d.week || 1)
        };
        await updateDoc(doc(db, "clients", uid), {
          photos: [...(d.photos || []), newPhoto]
        });
        cnt++;
      } catch (err) {
        toast("Upload failed: " + err.message, "error");
      }
    }
    if (cnt > 0) toast(cnt + " file(s) uploaded!", "success"); setUploading(false);
  };

  const deleteMedia = async (photo) => { if (!window.confirm("Delete?")) return; await updateDoc(doc(db, "clients", uid), { photos: (d.photos || []).filter(p => p.timestamp !== photo.timestamp) }); toast("Removed.", "success"); };

  if (loading) return <div className="spin-wrap"><div className="spinner-lg" /></div>;
  if (!d) return <div className="spin-wrap">No data. Contact your coach.</div>;

  const n = d.nutrition || {}; const meals = d.mealPlan || DEFAULT_MEALS;
  const workout = d.workoutPlan || DEFAULT_WORKOUT; const coachId = d.coachId || null;

  // Welcome splash
  if (showWelcome) return (
    <div><style>{CSS}</style>
      <WelcomeSplash name={d.name} onDone={() => setShowWelcome(false)} />
    </div>
  );
  if (showProfile) return (
    <div><style>{CSS}</style>
      <ClientProfilePanel d={d} onClose={() => setShowProfile(false)} />
    </div>
  );
  if (tab === "profile") return <MyProfileSection uid={uid} d={d} toast={toast} />;
  if (tab === "checkin") return (
    <div className="page">
      <div style={{ marginBottom: 22 }}><div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 22, fontWeight: 800 }}>Weekly Check-in</div><div style={{ color: "var(--muted)", fontSize: 13, marginTop: 5 }}>Week {d.week} — measurements, performance & reflection</div></div>
      <WeeklyCheckinSection uid={uid} d={d} toast={toast} />
    </div>
  );

  if (tab === "chat") return (
    <div style={{ display: "flex", flexDirection: "column", height: "100dvh", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "16px 16px 10px", flexShrink: 0 }}>
        <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 20, fontWeight: 800 }}>Chat with Coach</div>
        <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 3 }}>Messages saved even after sign out</div>
      </div>
      {/* Chat fills remaining space above bottom nav */}
      <div style={{ flex: 1, overflow: "hidden", padding: "0 12px", paddingBottom: "env(safe-area-inset-bottom)" }}>
        {coachId
          ? <ChatFullHeight currentUid={uid} otherUid={coachId} currentName={d.name || "Client"} otherName="Coach Ankit" />
          : <div className="card" style={{ margin: "0 4px" }}><div className="empty"><span className="empty-icon">💬</span><div className="empty-title">Chat not available</div></div></div>
        }
      </div>
    </div>
  );

  if (tab === "training") return <WorkoutFullscreen workout={workout} phase={d.phase} week={d.week} warmup={d.workoutWarmup || ""} cooldown={d.workoutCooldown || ""} onClose={() => setTab("home")} />;

  
  if (tab === "nutrition") {
    return (
      <div className="page">
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 22, fontWeight: 800 }}>Nutrition Plan</div>
          <div className="live" style={{ marginTop: 7 }}><span className="dot" />Live from coach</div>
        </div>
        <EnhancedFoodLogSection uid={uid} d={d} toast={toast} targetNutrition={n} mealPlan={meals} />
      </div>
    );
  }

  if (tab === "sources") {
    const srcs = d.foodSources || { protein: [], carbs: [], fats: [] };
    const updateSource = async (type, idx, val) => {
      const updated = { ...srcs };
      updated[type] = [...(updated[type] || [])];
      updated[type][idx] = val;
      await updateDoc(doc(db, "clients", uid), { foodSources: updated });
    };
    return (
      <div className="page">
        <div style={{ marginBottom: 22 }}>
          <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 22, fontWeight: 800 }}>My Food Sources</div>
        </div>
        {[
          ["protein", "Top 5 Protein Sources", "var(--purple)", "e.g. Eggs, Chicken, Paneer"],
          ["carbs",   "Top 5 Carb Sources",    "var(--orange)", "e.g. Rice, Oats, Bread"],
          ["fats",    "Top 5 Fat Sources",     "var(--red)",    "e.g. Ghee, Nuts, Peanut Butter"]
        ].map(([type, label, color, hint]) => (
          <div key={type} className="card" style={{ marginBottom: 16 }}>
            <div className="card-title" style={{ color }}>{label}</div>
            {[0, 1, 2, 3, 4].map(i => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <div style={{ width: 26, height: 26, borderRadius: "50%", background: color + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color, flexShrink: 0 }}>{i + 1}</div>
                <input className="fi" placeholder={i === 0 ? hint : "Option " + (i + 1)} defaultValue={(srcs[type] || [])[i] || ""} onBlur={e => updateSource(type, i, e.target.value)} />
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (tab === "photos") {
    const POSES = ["Front", "Back", "Side"];
    const currentWeek = d.week || 1;
    const clientPhotos = d.photos || [];
    
    // Get all weeks that have photos
    const allWeeks = [];
    for (let w = 1; w <= currentWeek; w++) allWeeks.push(w);

    const getPhoto = (week, pose) => 
      clientPhotos.find(p => p.week === week && p.pose === pose);

    

    const uploadPosePhoto = async (week, pose, file) => {
      if (!file) return;
      const isVideo = file.type.startsWith("video/");
      if (file.size / (1024 * 1024) > 25) { toast(file.name + " too large (max 25MB)", "error"); return; }
      setUploading(true); setUploadPct(0);
      try {
        const result = await cloudinaryUpload(file, pct => setUploadPct(pct));
        const existing = clientPhotos.filter(p => !(p.week === week && p.pose === pose));
        const newPhoto = {
          url: result.secure_url,
          publicId: result.public_id,
          type: isVideo ? "video" : "photo",
          pose,
          week,
          weekLabel: "Week " + week,
          date: new Date().toLocaleDateString("en-IN"),
          timestamp: new Date().toISOString(),
        };
        await updateDoc(doc(db, "clients", uid), { photos: [...existing, newPhoto] });
        toast(`${pose} pose uploaded for Week ${week}!`, "success");
      } catch (err) { toast("Upload failed: " + err.message, "error"); }
      setUploading(false);
    };

    const deletePosePhoto = async (week, pose) => {
      if (!window.confirm("Delete this photo?")) return;
      await updateDoc(doc(db, "clients", uid), { 
        photos: clientPhotos.filter(p => !(p.week === week && p.pose === pose)) 
      });
      toast("Deleted.", "success");
    };

    const toggleCompareSelection = (week, pose) => {
      const key = week + "_" + pose;
      const photo = getPhoto(week, pose);
      if (!photo) return;
      setCompareSelections(prev => {
        const exists = prev.find(s => s.key === key);
        if (exists) return prev.filter(s => s.key !== key);
        if (prev.length >= 4) { toast("Max 4 photos to compare", "error"); return prev; }
        return [...prev, { key, week, pose, url: photo.url }];
      });
    };

    return (
      <div className="page">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
          <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 22, fontWeight: 800 }}>Progress Photos</div>
          <div style={{ display: "flex", gap: 8 }}>
            {compareSelections.length > 0 && (
              <button className="btn btn-blue btn-sm" onClick={() => setCompareMode(true)}>
                🔍 Compare ({compareSelections.length})
              </button>
            )}
            {compareSelections.length > 0 && (
              <button className="btn btn-s btn-sm" onClick={() => setCompareSelections([])}>
                Clear
              </button>
            )}
          </div>
        </div>

        {uploading && (
  <div style={{ position: "fixed", bottom: 80, left: "50%", transform: "translateX(-50%)", background: "var(--s1)", border: "1px solid var(--green-b)", borderRadius: 14, padding: "14px 22px", zIndex: 500, display: "flex", alignItems: "center", gap: 14, boxShadow: "0 8px 32px rgba(0,0,0,.5)", minWidth: 260, animation: "bounceIn .3s ease" }}>
    <div style={{ width: 36, height: 36, borderRadius: "50%", border: "3px solid var(--border)", borderTopColor: "var(--green)", animation: "sp .8s linear infinite", flexShrink: 0 }} />
    <div>
      <div style={{ fontWeight: 700, color: "var(--green)", fontSize: 13 }}>Uploading photo... {uploadPct}%</div>
      <div className="prog-bar" style={{ width: 160, marginTop: 6 }}><div className="prog-fill" style={{ width: uploadPct + "%", background: "var(--green)" }} /></div>
    </div>
  </div>
)}

        {/* Tip */}
        <div style={{ background: "rgba(59,130,246,.08)", border: "1px solid rgba(59,130,246,.25)", borderRadius: 12, padding: "10px 14px", marginBottom: 16, fontSize: 12, color: "var(--muted2)" }}>
          💡 Upload Front, Back and Side pose photos each week. Tap any photo to select it for comparison (up to 4 at once).
        </div>

        {/* Week by week */}
        {[...allWeeks].reverse().map(week => (
          <div key={week} className="card" style={{ marginBottom: 16 }}>
            <div className="card-title">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: week === currentWeek ? "var(--green-bg)" : "var(--s2)", border: "1.5px solid " + (week === currentWeek ? "var(--green-b)" : "var(--border)"), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: week === currentWeek ? "var(--green)" : "var(--muted2)" }}>
                  W{week}
                </div>
                <span>Week {week}</span>
                {week === currentWeek && <span className="bdg bdg-g">Current</span>}
              </div>
              <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 400 }}>
                {POSES.filter(pose => getPhoto(week, pose)).length}/3 poses
              </span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
              {POSES.map(pose => {
                const photo = getPhoto(week, pose);
                const selectKey = week + "_" + pose;
                const isSelected = compareSelections.find(s => s.key === selectKey);
                return (
                  <div key={pose}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted2)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6, textAlign: "center" }}>
                      {pose === "Front" ? "🔵" : pose === "Back" ? "🟢" : "🟡"} {pose}
                    </div>
                    {photo ? (
                      <div style={{ position: "relative", borderRadius: 10, overflow: "hidden", aspectRatio: "3/4", border: isSelected ? "3px solid var(--blue)" : "2px solid var(--border)", cursor: "pointer", transition: "border-color .2s" }}
                        onClick={() => toggleCompareSelection(week, pose)}>
                        <img src={photo.url} alt={pose} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        {isSelected && (
                          <div style={{ position: "absolute", top: 6, right: 6, background: "var(--blue)", color: "#fff", borderRadius: "50%", width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700 }}>
                            {compareSelections.findIndex(s => s.key === selectKey) + 1}
                          </div>
                        )}
                        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(transparent,rgba(0,0,0,.7))", padding: "14px 6px 6px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                          <span style={{ color: "#fff", fontSize: 9, fontWeight: 600 }}>{photo.date}</span>
                          <button onClick={e => { e.stopPropagation(); deletePosePhoto(week, pose); }} style={{ background: "rgba(248,113,113,.85)", color: "#fff", border: "none", borderRadius: 6, padding: "2px 6px", fontSize: 9, fontWeight: 700, cursor: "pointer" }}>✕</button>
                        </div>
                      </div>
                    ) : (
                      <label style={{ display: "block", borderRadius: 10, aspectRatio: "3/4", border: "2px dashed var(--border2)", background: "var(--s2)", cursor: week === currentWeek ? "pointer" : "default", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, opacity: week === currentWeek ? 1 : 0.4, transition: "all .2s" }}
                        onMouseEnter={e => { if (week === currentWeek) e.currentTarget.style.borderColor = "var(--green)"; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border2)"; }}>
                        <input type="file" accept="image/*" style={{ display: "none" }} disabled={week !== currentWeek || uploading}
                          onChange={e => { if (e.target.files[0]) uploadPosePhoto(week, pose, e.target.files[0]); e.target.value = ""; }} />
                        <div style={{ fontSize: 20 }}>📷</div>
                        <div style={{ fontSize: 10, color: week === currentWeek ? "var(--green)" : "var(--muted)", fontWeight: 700 }}>
                          {week === currentWeek ? "Upload" : "No photo"}
                        </div>
                      </label>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Compare Modal */}
        {compareMode && compareSelections.length > 0 && (
          <div className="ov" onClick={() => setCompareMode(false)}>
            <div style={{ background: "var(--s1)", border: "1px solid var(--border2)", borderRadius: 18, width: "95%", maxWidth: 900, maxHeight: "92vh", overflow: "auto", padding: 20 }} onClick={e => e.stopPropagation()}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 800, fontSize: 18 }}>📊 Photo Comparison</div>
                <button className="xbtn" onClick={() => setCompareMode(false)}>✕</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(compareSelections.length, 2)}, 1fr)`, gap: 10 }}>
                {compareSelections.map((s, i) => (
                  <div key={i} style={{ borderRadius: 12, overflow: "hidden", border: "1px solid var(--border)" }}>
                    <div style={{ padding: "8px 12px", background: "var(--s2)", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontWeight: 700, fontSize: 13 }}>Week {s.week} — {s.pose}</span>
                      <button onClick={() => setCompareSelections(prev => prev.filter((_, idx) => idx !== i))} style={{ background: "none", border: "none", color: "var(--red)", cursor: "pointer", fontSize: 14 }}>✕</button>
                    </div>
                    <img src={s.url} alt="" style={{ width: "100%", aspectRatio: "3/4", objectFit: "cover" }} />
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 14, padding: "10px 14px", background: "var(--s2)", borderRadius: 10, fontSize: 12, color: "var(--muted2)" }}>
                Tap photos on the main screen to add/remove from comparison. Up to 4 photos at once.
              </div>
            </div>
          </div>
        )}

        {viewMedia && (
          <div className="ov" onClick={() => setViewMedia(null)}>
            <div style={{ maxWidth: 560, width: "100%" }}>
              <img src={viewMedia.url} alt="" style={{ width: "100%", borderRadius: 16 }} />
            </div>
          </div>
        )}
      </div>
    );
  }

  if (tab === "comparison") {
    const checkins = d.weeklyCheckins || [];
    return (
      <div className="page">
        <div style={{ marginBottom: 22 }}><div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 22, fontWeight: 800 }}>Weekly Progress</div></div>
        {checkins.length < 2 ? <div className="card"><div className="empty"><span className="empty-icon">📊</span><div className="empty-title">Need 2+ check-ins</div></div></div>
          : <div className="cmp-grid">{[...checkins].reverse().map((c, i) => (<div key={i} className="cmp-card"><div className="cmp-head" style={{ color: "var(--green)" }}>{c.weekKey} — {c.date}</div><div className="cmp-body"><div className="cmp-stat"><span style={{ color: "var(--muted)" }}>Weight</span><span style={{ fontWeight: 700, color: "var(--green)" }}>{c.weight || "-"} {c.weight ? "kg" : ""}</span></div><div className="cmp-stat"><span style={{ color: "var(--muted)" }}>Waist</span><span>{c.waist ? c.waist + " cm" : "-"}</span></div><div className="cmp-stat"><span style={{ color: "var(--muted)" }}>Sleep</span><span style={{ color: "#38bdf8" }}>{c.sleepQuality}/10</span></div><div className="cmp-stat"><span style={{ color: "var(--muted)" }}>Training</span><span style={{ color: "var(--green)" }}>{c.trainingAdherence}/10</span></div>{c.wins && <div style={{ marginTop: 8, fontSize: 11, color: "var(--green)" }}>🏆 {c.wins}</div>}</div></div>))}</div>}
      </div>
    );
  }

  // HOME
  const checkins = d.weeklyCheckins || [];
  return (
    <div className="page">
      <div style={{ marginBottom: 22 }}>
        <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 26, fontWeight: 800 }}>Hey {(d.name || "").split(" ")[0]} 💪</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10, alignItems: "center" }}>
          <span className="phase">{d.phase} — Week {d.week}</span>
          <span className="live"><span className="dot" />Live sync</span>
        </div>
      </div>
      <div className="g4" style={{ marginBottom: 18 }}>
        {[["Weight KG", d.weight, "var(--green)"], ["Waist CM", d.waist, "var(--purple)"], ["Body Fat %", d.bodyFat, "var(--orange)"], ["Week", "W" + d.week, "var(--blue)"]].map(([l, v, co], i) => (<div key={l} style={{ animationDelay: i * 0.08 + "s" }}><MC label={l} value={v} color={co} /></div>))}
      </div>
      <div className="card stagger-1" style={{ marginBottom: 16 }}>
        <div className="card-title">Log Weight</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 10, alignItems: "flex-end" }}>
          <div><div className="fl">Weight (kg)</div><input className="fi" type="number" step="0.1" placeholder="85.5" value={lw} onChange={e => setLw(e.target.value)} /></div>
          <div><div className="fl">Waist (cm)</div><input className="fi" type="number" step="0.1" placeholder="82" value={lwa} onChange={e => setLwa(e.target.value)} /></div>
          <div><div className="fl">Body Fat %</div><input className="fi" type="number" step="0.1" placeholder="18.5" value={lbf} onChange={e => setLbf(e.target.value)} /></div>
          <button className="btn btn-p" onClick={logStats} disabled={saving || !lw}>{saving ? "..." : "Log"}</button>
        </div>
      </div>
      <div className="stagger-2" style={{ marginBottom: 16, background: "var(--green-bg)", border: "1px solid var(--green-b)", borderRadius: "var(--r)", padding: 16, cursor: "pointer" }} onClick={() => setTab("checkin")}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div><div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: 15, color: "var(--green)" }}>Week {d.week} Check-in</div><div style={{ fontSize: 12, color: "var(--muted2)", marginTop: 3 }}>Measurements, sleep, nutrition & reflection</div></div>
          <span style={{ fontSize: 20 }}>→</span>
        </div>
      </div>
      <div className="card stagger-3" style={{ marginBottom: 16 }}>
        <div className="card-title">Message from Coach {flash.msg && <span className="nbadge">New</span>}</div>
        <div className={"msg-b" + (d.coachMessage ? " has" : "")}>{d.coachMessage || "Your coach has not sent a message yet."}</div>
      </div>
      <div className="sh"><div className="sh-title">Today Targets</div><button className="sh-link" onClick={() => setTab("nutrition")}>Full plan</button></div>
      <div className="g4" style={{ marginBottom: 20 }}>
        {[["Calories", n.calories, "var(--green)", !!flash.calories], ["Protein G", n.protein, "var(--purple)"], ["Carbs G", n.carbs, "var(--orange)"], ["Fats G", n.fats, "var(--red)"]].map(([l, v, co, fl], i) => (<div key={l} style={{ animationDelay: i * 0.07 + "s" }}><MC label={l} value={v} color={co} flash={!!fl} /></div>))}
      </div>
      <div className="sh"><div className="sh-title">This Week</div><button className="sh-link" onClick={() => setTab("training")}>Full plan</button></div>
      <div className="card stagger-4" style={{ marginBottom: 20 }}>
  <div style={{ background: "var(--s2)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
    {/* Header row */}
    <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", borderBottom: "1px solid var(--border)" }}>
      {workout.map((day, i) => {
        const dc = DAY_COLORS[i % DAY_COLORS.length];
        return (
          <div key={i} style={{ padding: "8px 4px", textAlign: "center", borderRight: i < 6 ? "1px solid var(--border)" : "none", background: "var(--s3)" }}>
            <div style={{ fontSize: 9, fontWeight: 800, color: dc.accent, letterSpacing: ".07em" }}>{day.day.slice(0, 3).toUpperCase()}</div>
          </div>
        );
      })}
    </div>
    {/* Type row */}
    <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)" }}>
      {workout.map((day, i) => {
        const dc = DAY_COLORS[i % DAY_COLORS.length];
        const typeColor = WCOLOR[day.type] || "#475569";
        return (
          <div key={i}
            onClick={() => day.type !== "Rest" && setTab("training")}
            style={{
              padding: "12px 4px", textAlign: "center",
              borderRight: i < 6 ? "1px solid var(--border)" : "none",
              cursor: day.type !== "Rest" ? "pointer" : "default",
              background: day.type === "Rest" ? "rgba(0,0,0,.15)" : "transparent",
              transition: "background .15s", opacity: day.type === "Rest" ? 0.5 : 1
            }}
            onMouseEnter={e => { if (day.type !== "Rest") e.currentTarget.style.background = dc.bg; }}
            onMouseLeave={e => { e.currentTarget.style.background = day.type === "Rest" ? "rgba(0,0,0,.15)" : "transparent"; }}
          >
            <div style={{ display: "inline-flex", padding: "3px 7px", borderRadius: 20, fontSize: 9, fontWeight: 800, background: typeColor + "20", color: typeColor, border: "1px solid " + typeColor + "40" }}>
              {day.type === "Rest" ? "Rest" : day.type}
            </div>
            {day.type !== "Rest" && (
              <div style={{ fontSize: 9, color: "var(--muted)", marginTop: 4, fontWeight: 600 }}>{day.exercises.length}ex</div>
            )}
          </div>
        );
      })}
    </div>
  </div>
</div>
      {(d.weightHistory || []).length > 1 && (
        <div className="card stagger-5" style={{ marginBottom: 24 }}>
          <div className="card-title">Weight Progress</div>
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
  const [viewMedia, setViewMedia] = useState(null);
  const [videoModal, setVideoModal] = useState(null);
  const [nc] = useState({});
  const [clientProfileOpen, setClientProfileOpen] = useState(false);
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [dashModal, setDashModal] = useState(null);
  const [renewForm, setRenewForm] = useState({
  planName: "", planType: "Cut", primaryGoal: "Fat Loss", planDuration: 12
});

  useEffect(() => {
    const q = query(collection(db, "clients"), where("coachId", "==", coachUid));
    const unsub = onSnapshot(q, snap => { setClients(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false); });
    return unsub;
  }, [coachUid]);

  useEffect(() => {
    if (!selId) { setSel(null); return; }
    return onSnapshot(doc(db, "clients", selId), snap => { if (snap.exists()) setSel({ id: snap.id, ...snap.data() }); });
  }, [selId]);

  const update = async (f, v) => { if (!selId) return; await updateDoc(doc(db, "clients", selId), { [f]: v }); };
  const updateN = async (f, v) => { if (!selId) return; await updateDoc(doc(db, "clients", selId), { ["nutrition." + f]: parseInt(v) || 0 }); };
  const sendMessage = async () => { if (!msgText.trim() || !selId) return; setSendingMsg(true); await updateDoc(doc(db, "clients", selId), { coachMessage: msgText.trim() }); toast("Message sent!", "success"); setMsgText(""); setSendingMsg(false); };
  const autoSaveWorkout = async (plan, warmup, cooldown) => {
    await updateDoc(doc(db, "clients", selId), {
      workoutPlan: plan,
      workoutWarmup: warmup ?? "",
      workoutCooldown: cooldown ?? "",
    });
    toast("Workout saved!", "success");
  };
  const autoSaveMeals = async (plan) => {
    const cal = plan.reduce((a, m) => a + m.items.reduce((b, i) => b + (i.cal || 0), 0), 0);
    const pro = plan.reduce((a, m) => a + m.items.reduce((b, i) => b + (i.protein || 0), 0), 0);
    const car = plan.reduce((a, m) => a + m.items.reduce((b, i) => b + (i.carbs || 0), 0), 0);
    const fat = plan.reduce((a, m) => a + m.items.reduce((b, i) => b + (i.fats || 0), 0), 0);
    const fib = plan.reduce((a, m) => a + m.items.reduce((b, i) => b + (i.fiber || 0), 0), 0);
    await updateDoc(doc(db, "clients", selId), { mealPlan: plan, nutrition: { calories: cal, protein: pro, carbs: car, fats: fat, fiber: fib } });
  };

  const setClientAccess = async (clientId, status) => {
    if (status === "terminated" && !window.confirm("Terminate this client? They cannot log in until you restore access.")) return;
    await updateDoc(doc(db, "clients", clientId), { accessStatus: status });
    toast(status === "active" ? "Client access restored!" : status === "paused" ? "Client paused." : "Client terminated.", status === "active" ? "success" : "error");
  };

  const deleteClientPhoto = async (photo) => {
    if (!window.confirm("Remove this photo?")) return;
    await updateDoc(doc(db, "clients", selId), { photos: (sel.photos || []).filter(p => p.timestamp !== photo.timestamp) });
    toast("Removed.", "success");
  };

  const AccessBadge = ({ status }) => {
    if (status === "paused") return <span className="access-badge-paused">⏸ Paused</span>;
    if (status === "terminated") return <span className="access-badge-terminated">🚫 Terminated</span>;
    return <span className="access-badge-active">✓ Active</span>;
  };

  if (loading) return <div className="spin-wrap"><div className="spinner-lg" /></div>;

  // Fullscreen editors
  if (showAdd) return (
    <div><style>{CSS}</style>
      <AddClientFullscreenEnhanced
        coachUid={coachUid}
        coachEmail={coachEmail}
        onClose={() => setShowAdd(false)}
        onSuccess={(name) => {
          setShowAdd(false);
          toast(name + " added! Share login details via WhatsApp.", "success");
        }}
        auth={auth}
        createUserWithEmailAndPassword={createUserWithEmailAndPassword}
        setDoc={setDoc}
        signInWithEmailAndPassword={signInWithEmailAndPassword}
        doc={doc}
        serverTimestamp={serverTimestamp}
        db={db}
      />
    </div>
  );
  if (showWorkoutEditor && sel) return <div><style>{CSS}</style><WorkoutEditorCoach plan={sel.workoutPlan || DEFAULT_WORKOUT} onClose={() => setShowWorkoutEditor(false)} autoSave={autoSaveWorkout} /></div>;
  if (showMealEditor && sel) return <div><style>{CSS}</style><MealEditor plan={sel.mealPlan || DEFAULT_MEALS} onClose={() => setShowMealEditor(false)} clientSources={sel.foodSources || null} autoSave={autoSaveMeals} /></div>;

  if (tab === "analytics") return (
    <div className="page">
      <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 22, fontWeight: 800, marginBottom: 22 }}>Analytics</div>
      <div className="g2">
        {clients.map((c, i) => (
          <div key={c.id} className="card" style={{ animationDelay: i * 0.08 + "s" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <div className="av av-sm av-g">{c.avatar}</div>
              <div><div style={{ fontWeight: 700, fontSize: 13 }}>{c.name}</div><div style={{ fontSize: 11, color: "var(--muted)" }}>{c.phase} — W{c.week}</div></div>
              <div style={{ marginLeft: "auto" }}><AccessBadge status={c.accessStatus || "active"} /></div>
            </div>
            {(c.weightHistory || []).length > 1
              ? <div style={{ height: 140 }}><ResponsiveContainer width="100%" height="100%"><AreaChart data={c.weightHistory}><defs><linearGradient id={"g" + c.id} x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#22c55e" stopOpacity={0.2} /><stop offset="95%" stopColor="#22c55e" stopOpacity={0} /></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke="#1e2d45" /><XAxis dataKey="week" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} /><YAxis domain={["auto", "auto"]} tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ background: "#0f1629", border: "1px solid #1e2d45", borderRadius: 8, fontSize: 11 }} /><Area type="monotone" dataKey="weight" stroke="#22c55e" strokeWidth={2} fill={"url(#g" + c.id + ")"} dot={{ fill: "#22c55e", r: 2.5, strokeWidth: 0 }} /></AreaChart></ResponsiveContainer></div>
              : <div style={{ height: 80, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)", fontSize: 12 }}>Awaiting check-ins</div>}
          </div>
          ))
        }
      </div>
    </div>
  );
  

  if (tab === "clients" && sel) {
    // Add this line near the other state declarations inside CoachDash (around line ~590):

    const n = sel.nutrition || {}; const checkins = sel.weeklyCheckins || []; const media = sel.photos || [];
    const accessStatus = sel.accessStatus || "active";
    return (
      <div className="page">
        {videoModal && <VideoModal url={videoModal.videoUrl} name={videoModal.name} onClose={() => setVideoModal(null)} />}
        {viewMedia && <div className="ov" onClick={() => setViewMedia(null)}><div style={{ maxWidth: 520, width: "100%" }}>{viewMedia.type === "video" ? <video src={viewMedia.url} controls style={{ width: "100%", borderRadius: 16 }} /> : <img src={viewMedia.url} alt="" style={{ width: "100%", borderRadius: 16 }} />}</div></div>}

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
          <button className="btn btn-s btn-sm" onClick={() => { setSelId(null); setSel(null); }}>← Back</button>
          <div className="av av-md av-g" onClick={() => setClientProfileOpen(true)} style={{ cursor: "pointer", transition: "transform .2s" }} title="View client profile"
  onMouseEnter={e => e.currentTarget.style.transform = "scale(1.1)"}
  onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}>
  {sel.avatar}
</div>
{clientProfileOpen && (
  <ClientProfilePanel d={sel} onClose={() => setClientProfileOpen(false)} />
)}
          <div style={{ flex: 1 }}><div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 800, fontSize: 19 }}>{sel.name}</div><div style={{ fontSize: 12, color: "var(--muted)" }}>{sel.email}</div></div>
          <AccessBadge status={accessStatus} />
          <span className="live"><span className="dot" />Live</span>
        </div>

        {/* Access control banner */}
        <div style={{ background: accessStatus === "active" ? "var(--green-bg)" : accessStatus === "paused" ? "rgba(251,191,36,.08)" : "rgba(248,113,113,.08)", border: "1px solid " + (accessStatus === "active" ? "var(--green-b)" : accessStatus === "paused" ? "rgba(251,191,36,.25)" : "rgba(248,113,113,.25)"), borderRadius: 12, padding: "12px 16px", marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: accessStatus === "active" ? "var(--green)" : accessStatus === "paused" ? "var(--yellow)" : "var(--red)" }}>
            {accessStatus === "active" ? "✓ Client Access Active" : accessStatus === "paused" ? "⏸ Client Login Paused — they cannot sign in" : "🚫 Client Terminated"}
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
  {accessStatus !== "active" && <button className="btn btn-p btn-sm" onClick={() => setClientAccess(selId, "active")}>▶ Resume</button>}
  {accessStatus === "active" && <button className="btn btn-warn btn-sm" onClick={() => setClientAccess(selId, "paused")}>⏸ Pause</button>}
  {accessStatus !== "terminated" && <button className="btn btn-d btn-sm" onClick={() => setClientAccess(selId, "terminated")}>🚫 Terminate</button>}
  <button className="btn btn-blue btn-sm" onClick={() => {
    setRenewForm({
      planName: sel.planName || sel.phase || "",
      planType: sel.planType || "Cut",
      primaryGoal: sel.primaryGoal || "Fat Loss",
      planDuration: sel.planDuration || 12
    });
    setShowRenewModal(true);
  }}>🔄 Renew</button>
</div>
        </div>

        <div className="tab-bar" style={{ 
  overflowX: "auto", flexWrap: "nowrap", 
  scrollbarWidth: "none", paddingBottom: 4 
}}>
  {[["overview","Overview"],["checkins","Check-ins"],["chat","Chat"],["photos","Media"],
    ["comparison","Compare"],["nutrition","Macros"],["meals","Meals"],
    ["workout","Workout"],["phase","Phase"],["sources","Sources"]].map(([k, l]) => (
    <button key={k} 
      className={innerTab === k ? "tab-item active" : "tab-item"} 
      style={{ whiteSpace: "nowrap", flexShrink: 0 }}
      onClick={() => setInnerTab(k)}>{l}
    </button>
  ))}
</div>

        {innerTab === "overview" && (
          <div>
            <div className="g4" style={{ marginBottom: 14 }}>
              {[["Weight", sel.weight, "var(--green)"], ["Waist", sel.waist, "var(--purple)"], ["Body Fat", sel.bodyFat, "var(--orange)"], ["Week", "W" + sel.week, "var(--blue)"]].map(([l, v, co], i) => (<div key={l} style={{ animationDelay: i * 0.07 + "s" }}><MC label={l} value={v} color={co} /></div>))}
            </div>
            {checkins.length > 0 && (() => {
              const latest = [...checkins].sort((a, b) => (b.week || 0) - (a.week || 0))[0];
              return (
                <div className="card stagger-2" style={{ marginBottom: 14 }}>
                  <div className="card-title">Latest Check-in <span className="bdg bdg-g">{latest.weekKey}</span></div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 10 }}>
                    {[["Stress", latest.stressLevel, "#f87171"], ["Sleep", latest.sleepQuality, "#38bdf8"], ["Energy", latest.energyLevel, "#fbbf24"], ["Nutrition", latest.nutritionAdherence, "#a78bfa"], ["Training", latest.trainingAdherence, "#4ade80"], ["Water", (latest.waterIntake || 0) + "L", "#38bdf8"]].map(([l, v, co], i) => (
                      <div key={l} style={{ background: "var(--s2)", borderRadius: 9, padding: "10px 12px", border: "1px solid var(--border)", textAlign: "center" }}>
                        <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 20, fontWeight: 800, color: co }}>{v}</div>
                        <div style={{ fontSize: 10, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", marginTop: 3 }}>{l}</div>
                      </div>
                    ))}
                  </div>
                  {latest.wins && <div style={{ background: "rgba(34,197,94,.06)", border: "1px solid var(--green-b)", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "var(--green)", marginBottom: 6 }}>🏆 {latest.wins}</div>}
                  {latest.noteToCoach && <div className="note-box">{latest.noteToCoach}</div>}
                </div>
              );
            })()}
            {(sel.weightHistory || []).length > 1 && (
              <div className="card stagger-3" style={{ marginBottom: 14 }}>
                <div className="card-title">Weight Chart</div>
                <div style={{ height: 170 }}><ResponsiveContainer width="100%" height="100%"><AreaChart data={sel.weightHistory}><defs><linearGradient id="wg2" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#22c55e" stopOpacity={0.2} /><stop offset="95%" stopColor="#22c55e" stopOpacity={0} /></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke="#1e2d45" /><XAxis dataKey="week" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} /><YAxis domain={["auto", "auto"]} tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ background: "#0f1629", border: "1px solid #1e2d45", borderRadius: 9 }} /><Area type="monotone" dataKey="weight" stroke="#22c55e" strokeWidth={2.5} fill="url(#wg2)" dot={{ fill: "#22c55e", r: 3, strokeWidth: 0 }} /></AreaChart></ResponsiveContainer></div>
              </div>
            )}
            {/* ── FOOD LOG COMPARISON ── */}
{(() => {
  const today = new Date().toLocaleDateString("en-IN");

  // Get today's mealData (new per-meal logging from EnhancedFoodLogSection)
  const todayMealData = (() => {
    const fl = sel.foodLogs;
    if (!fl) return {};
    if (Array.isArray(fl)) return fl.find(l => l.date === today)?.mealData || {};
    return fl[today]?.mealData || {};
  })();

  const meals = sel.mealPlan || DEFAULT_MEALS;
  const planCal = meals.flatMap(m => m.items).reduce((a, i) => a + (i.cal || 0), 0);

  // Actual logged = sum of only what client manually entered per meal
  const loggedCal = Object.values(todayMealData).reduce((a, m) => a + (parseFloat(m?.cal) || 0), 0);
  const loggedProtein = Object.values(todayMealData).reduce((a, m) => a + (parseFloat(m?.protein) || 0), 0);
  const loggedCarbs = Object.values(todayMealData).reduce((a, m) => a + (parseFloat(m?.carbs) || 0), 0);
  const loggedFats = Object.values(todayMealData).reduce((a, m) => a + (parseFloat(m?.fats) || 0), 0);

  const hasLogged = Object.keys(todayMealData).length > 0;
  const diff = loggedCal - planCal;
  const isSurplus = diff > 50;
  const isDeficit = diff < -50;
  const statusColor = !hasLogged ? "var(--muted)" : isSurplus ? "var(--red)" : isDeficit ? "var(--orange)" : "var(--green)";

  return (
    <div className="card stagger-3" style={{ marginBottom: 14 }}>
      <div className="card-title">
        📊 Today's Calorie Log
        <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 400 }}>{today}</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
        {/* Coach's assigned plan */}
        <div style={{ background: "rgba(59,130,246,.08)", border: "1px solid rgba(59,130,246,.3)", borderRadius: 12, padding: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "var(--blue)", textTransform: "uppercase", marginBottom: 6 }}>📋 Assigned</div>
          <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 900, fontSize: 26, color: "var(--blue)" }}>
            {planCal}<span style={{ fontSize: 12, fontWeight: 500, marginLeft: 4 }}>kcal</span>
          </div>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 8 }}>
            {[["P", Math.round((sel.nutrition||{}).protein||0), "var(--purple)"], ["C", Math.round((sel.nutrition||{}).carbs||0), "var(--orange)"], ["F", Math.round((sel.nutrition||{}).fats||0), "var(--red)"]].map(([l, v, co]) => (
              <div key={l} style={{ padding: "2px 7px", borderRadius: 20, background: co + "18", color: co, border: "1px solid " + co + "44", fontSize: 11, fontWeight: 700 }}>{l} {v}g</div>
            ))}
          </div>
        </div>
        {/* Client's actual logged */}
        <div style={{ background: !hasLogged ? "var(--s2)" : isSurplus ? "rgba(248,113,113,.08)" : isDeficit ? "rgba(251,146,60,.08)" : "rgba(34,197,94,.08)", border: "1px solid " + (!hasLogged ? "var(--border)" : isSurplus ? "rgba(248,113,113,.3)" : isDeficit ? "rgba(251,146,60,.3)" : "var(--green-b)"), borderRadius: 12, padding: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: statusColor, textTransform: "uppercase", marginBottom: 6 }}>🍽 Client Logged</div>
          <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 900, fontSize: 26, color: statusColor }}>
            {Math.round(loggedCal)}<span style={{ fontSize: 12, fontWeight: 500, marginLeft: 4 }}>kcal</span>
          </div>
          {!hasLogged
            ? <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>⏳ No food logged yet today</div>
            : <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 8 }}>
                {[["P", Math.round(loggedProtein), "var(--purple)"], ["C", Math.round(loggedCarbs), "var(--orange)"], ["F", Math.round(loggedFats), "var(--red)"]].map(([l, v, co]) => (
                  <div key={l} style={{ padding: "2px 7px", borderRadius: 20, background: co + "18", color: co, border: "1px solid " + co + "44", fontSize: 11, fontWeight: 700 }}>{l} {v}g</div>
                ))}
              </div>
          }
        </div>
      </div>
      <div style={{ padding: "10px 14px", borderRadius: 10, background: statusColor + "10", border: "1px solid " + statusColor + "33", fontSize: 13, fontWeight: 700, color: statusColor }}>
        {!hasLogged ? "⏳ Waiting for client to log meals..." : isSurplus ? `📈 +${diff} kcal surplus` : isDeficit ? `📉 ${Math.abs(diff)} kcal deficit` : "✅ On target"}
      </div>
    </div>
  );
})()}
  
    

            <div className="card stagger-4"><div className="card-title">Current Message</div><div className={"msg-b" + (sel.coachMessage ? " has" : "")}>{sel.coachMessage || "No message."}</div></div>
          </div>
        )}

        {innerTab === "chat" && <div className="card"><div className="card-title">Chat with {sel.name}</div><ChatPanel currentUid={coachUid} otherUid={selId} currentName={coachName || "Coach"} otherName={sel.name} /></div>}

        {innerTab === "checkins" && (
  <div>
    <div className="card" style={{ marginBottom: 14 }}>
      <div className="card-title">Weekly Check-in History <span className="bdg bdg-g">{checkins.length} total</span></div>
      {checkins.length === 0
        ? <div className="empty"><span className="empty-icon">📋</span><div className="empty-title">No check-ins yet</div></div>
        : [...checkins].reverse().map((c, i) => (
          <div key={i} style={{ background: "var(--s2)", borderRadius: 12, padding: 16, marginBottom: 12, border: "1px solid var(--border)", animation: "cardEntrance .4s ease both", animationDelay: i * 0.05 + "s" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--green-bg)", border: "1.5px solid var(--green-b)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Outfit',sans-serif", fontWeight: 800, fontSize: 13, color: "var(--green)" }}>{c.weekKey}</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{c.weekKey}</div>
                  <div style={{ fontSize: 11, color: "var(--muted)" }}>{c.date}</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {c.weight && <span className="bdg bdg-g">{c.weight} kg</span>}
                {c.waist && <span className="bdg bdg-p">{c.waist} cm</span>}
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 10 }}>
              {[["Stress", c.stressLevel, "#f87171"], ["Sleep", c.sleepQuality, "#38bdf8"], ["Energy", c.energyLevel, "#fbbf24"], ["Nutrition", c.nutritionAdherence, "#a78bfa"], ["Training", c.trainingAdherence, "#4ade80"], ["Water", (c.waterIntake || 0) + "L", "#38bdf8"]].map(([l, v, co]) => (
                <div key={l} style={{ textAlign: "center", background: "var(--s1)", borderRadius: 8, padding: "8px 6px", border: "1px solid var(--border)" }}>
                  <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 17, fontWeight: 800, color: co }}>{v}</div>
                  <div style={{ fontSize: 9, color: "var(--muted)", textTransform: "uppercase", fontWeight: 600 }}>{l}</div>
                </div>
              ))}
            </div>
            {c.wins && <div style={{ background: "rgba(34,197,94,.06)", border: "1px solid var(--green-b)", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "var(--green)", marginBottom: 6 }}>🏆 {c.wins}</div>}
            {c.challenges && <div style={{ background: "rgba(251,146,60,.06)", border: "1px solid rgba(251,146,60,.2)", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "var(--orange)", marginBottom: 6 }}>⚡ {c.challenges}</div>}
            {c.noteToCoach && <div className="note-box">{c.noteToCoach}</div>}
          </div>
        ))}
    </div>
  </div>
)}

{innerTab === "photos" && (() => {
  if (media.length === 0) return <div className="card"><div className="empty"><span className="empty-icon">📷</span><div className="empty-title">No media yet</div></div></div>;
  const grouped = {};
  [...media].reverse().forEach(p => {
    const key = p.weekLabel || ("Week " + (p.week || 1));
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(p);
  });
  return (
    <div>
      {Object.entries(grouped).map(([weekLabel, photos]) => (
        <div key={weekLabel} className="card" style={{ marginBottom: 16 }}>
          <div className="card-title">
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--green-bg)", border: "1.5px solid var(--green-b)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: "var(--green)" }}>
                {weekLabel.replace("Week ", "W")}
              </div>
              <span>{weekLabel}</span>
            </div>
            <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 400 }}>{photos.length} file{photos.length !== 1 ? "s" : ""}</span>
          </div>
          <div className="photo-grid">
            {photos.map((p, i) => (
              <div key={i} className="photo-item">
                <div onClick={() => setViewMedia(p)} style={{ width: "100%", height: "100%" }}>
                  {p.type === "video"
                    ? <><video src={p.url} style={{ width: "100%", height: "100%", objectFit: "cover" }} /><div className="video-badge">Video</div></>
                    : <img src={p.url} alt="" />}
                </div>
                <div className="photo-label">{p.date}</div>
                <button className="photo-del" onClick={e => { e.stopPropagation(); deleteClientPhoto(p); }}>✕</button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
})()}

        {innerTab === "comparison" && (
          <div className="card">
            <div className="card-title">Week-by-Week</div>
            {checkins.length < 2 ? <div className="empty"><span className="empty-icon">📊</span><div className="empty-title">Need 2+ check-ins</div></div>
              : <div className="cmp-grid">{[...checkins].map((c, i) => (<div key={i} className="cmp-card"><div className="cmp-head" style={{ color: "var(--green)" }}>{c.weekKey} — {c.date}</div><div className="cmp-body"><div className="cmp-stat"><span style={{ color: "var(--muted)" }}>Weight</span><span style={{ fontWeight: 700, color: "var(--green)" }}>{c.weight || "-"} {c.weight ? "kg" : ""}</span></div><div className="cmp-stat"><span style={{ color: "var(--muted)" }}>Waist</span><span>{c.waist ? c.waist + " cm" : "-"}</span></div><div className="cmp-stat"><span style={{ color: "var(--muted)" }}>Sleep</span><span style={{ color: "#38bdf8" }}>{c.sleepQuality}/10</span></div></div></div>))}</div>}
          </div>
        )}

        {innerTab === "message" && (
          <div className="card">
            <div className="card-title">Message to {sel.name}</div>
            <div className="alert alert-g">Current: {sel.coachMessage || "None"}</div>
            <div className="fld"><div className="fl">New Message</div><textarea className="fta" placeholder={"Great work " + sel.name.split(" ")[0] + "!"} value={msgText} onChange={e => setMsgText(e.target.value)} /></div>
            <div className="alert alert-w">Client sees this instantly!</div>
            <button className="btn btn-p" onClick={sendMessage} disabled={sendingMsg || !msgText.trim()}>{sendingMsg ? "Sending..." : "Send Message"}</button>
          </div>
        )}

        {innerTab === "nutrition" && (
          <div className="card">
            <div className="card-title">Macro Targets</div>
            <div className="alert alert-w">Syncs instantly to client!</div>
            <div className="fg">{[["Calories (kcal)", "calories", "var(--green)"], ["Protein (g)", "protein", "var(--purple)"], ["Carbs (g)", "carbs", "var(--orange)"], ["Fats (g)", "fats", "var(--red)"], ["Fiber (g)", "fiber", "#34d399"]].map(([l, k, co]) => (<div key={k} className="fld"><div className="fl" style={{ color: co }}>{l}</div><NumInput value={n[k] || 0} color={co} onChange={v => updateN(k, v)} /></div>))}</div>
            <div className="alert alert-g">{n.calories} kcal · {n.protein}g P · {n.carbs}g C · {n.fats}g F · {n.fiber || 0}g Fiber</div>
          </div>
        )}

{innerTab === "workout" && (
  <CoachWorkoutTab
    sel={sel}
    setShowWorkoutEditor={setShowWorkoutEditor}
    setVideoModal={setVideoModal}
  />
)}

        {innerTab === "meals" && (() => {
          const mealPlan = sel.mealPlan || DEFAULT_MEALS;
          return (
            <div className="card">
              <div className="card-title">Meal Plan<button className="btn btn-p btn-sm" style={{ marginLeft: 8 }} onClick={() => setShowMealEditor(true)}>✏ Edit Plan</button></div>
              <SourcesTablePanel sources={sel.foodSources || null} />
              {mealPlan.map((meal, mi) => (
                <div key={mi} className="meal-card" style={{ animationDelay: mi * 0.07 + "s" }}>
                  <div className="meal-head"><div><span style={{ fontWeight: 700 }}>{meal.name}</span><span style={{ fontSize: 12, color: "var(--muted)", marginLeft: 8 }}>{meal.time}</span></div><span className="bdg bdg-g">{meal.items.reduce((a, i) => a + (i.cal || 0), 0)} kcal</span></div>
                  <div className="meal-body">{meal.items.map((item, ii) => (<div key={ii} className="food-row"><div><span style={{ fontWeight: 600 }}>{item.food}</span><span style={{ color: "var(--muted)", fontSize: 12, marginLeft: 6 }}>{item.amount}</span></div><div style={{ display: "flex", gap: 8, fontSize: 12 }}><span style={{ color: "var(--purple)" }}>{item.protein}g</span><span style={{ color: "var(--orange)" }}>{item.carbs}g</span><span style={{ color: "var(--red)" }}>{item.fats}g</span><span style={{ color: "var(--green)", fontWeight: 700 }}>{item.cal}</span></div></div>))}</div>
                  <MealTotals items={meal.items} />
                </div>
              ))}
            </div>
          );
        })()}

        {innerTab === "phase" && (
          <div className="card">
            <div className="card-title">Phase & Stats</div>
            <div className="fg">
              <div className="fld"><div className="fl">Phase</div><select className="fsel" value={sel.phase} onChange={e => { update("phase", e.target.value); toast("Phase updated!", "success"); }}><option>Cut Phase 1</option><option>Cut Phase 2</option><option>Bulk Phase 1</option><option>Bulk Phase 2</option><option>Maintenance</option><option>Peak Week</option><option>Reverse Diet</option></select></div>
              <div className="fld"><div className="fl">Current Week</div><input className="fi" type="number" min="1" max="52" value={sel.week} onChange={e => update("week", parseInt(e.target.value) || 1)} /></div>
              <div className="fld"><div className="fl">Body Fat %</div><NumInput value={sel.bodyFat || 0} color="var(--orange)" onChange={v => { update("bodyFat", v); toast("Updated!", "success"); }} /></div>
              <div className="fld"><div className="fl">Weight (kg)</div><input className="fi" type="number" step="0.1" defaultValue={sel.weight || ""} placeholder="86" onBlur={e => update("weight", parseFloat(e.target.value) || null)} /></div>
            </div>
          </div>
        )}

        {innerTab === "sources" && (() => {
          const sources = sel.foodSources || {};
          return (
            <div className="card">
              <div className="card-title">Food Sources</div>
              <SourcesTablePanel sources={sel.foodSources || null} />
              {[["protein", "Protein", "var(--purple)"], ["carbs", "Carbs", "var(--orange)"], ["fats", "Fats", "var(--red)"]].map(([type, label, color]) => (
                <div key={type} style={{ marginBottom: 16 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color, marginBottom: 8 }}>{label}</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 8 }}>
                    {[0, 1, 2, 3, 4].map(i => { const val = (sources[type] || [])[i]; return (<div key={i} style={{ background: "var(--s2)", borderRadius: 9, padding: "10px 12px", border: "1px solid " + (val ? color + "55" : "var(--border)"), textAlign: "center" }}><div style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", marginBottom: 4 }}>#{i + 1}</div><div style={{ fontWeight: 600, fontSize: 13, color: val ? color : "var(--muted)" }}>{val || "-"}</div></div>); })}
                  </div>
                </div>
              ))}
            </div>
          );
        })()}
        {/* ── RENEW MODAL ── */}
{showRenewModal && (
  <div className="ov" onClick={e => e.target === e.currentTarget && setShowRenewModal(false)}>
    <div className="modal">
      <div className="mh">
        <div>
          <div className="mt">🔄 Renew {sel.name}'s Plan</div>
          <div className="ms">Resets week to 1 and activates client access</div>
        </div>
        <button className="xbtn" onClick={() => setShowRenewModal(false)}>✕</button>
      </div>
      <div className="mb2">

        {/* Primary Goal */}
        <div className="fld" style={{ marginBottom: 18 }}>
          <div className="fl" style={{ color: "var(--orange)" }}>Primary Goal</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(130px,1fr))", gap: 8 }}>
            {["Fat Loss","Muscle Gain","Recomposition","Strength","Endurance","Maintenance","Sports Performance","General Fitness"].map(g => (
              <button key={g} onClick={() => setRenewForm(p => ({ ...p, primaryGoal: g }))}
                style={{ padding: "9px 10px", borderRadius: 10, border: "1.5px solid",
                  cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: "'DM Sans',sans-serif",
                  borderColor: renewForm.primaryGoal === g ? "var(--orange)" : "var(--border)",
                  background: renewForm.primaryGoal === g ? "rgba(251,146,60,.12)" : "var(--s2)",
                  color: renewForm.primaryGoal === g ? "var(--orange)" : "var(--muted)",
                  transition: "all .15s" }}>
                {g}
              </button>
            ))}
          </div>
        </div>

        {/* Plan Type */}
        <div className="fld" style={{ marginBottom: 18 }}>
          <div className="fl" style={{ color: "var(--green)" }}>Plan Type</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {[
              { key: "Cut",   label: "Cut",         desc: "Caloric deficit — fat loss focus" },
              { key: "Bulk",  label: "Bulk",         desc: "Caloric surplus — muscle gain focus" },
              { key: "Maint", label: "Maintenance",  desc: "TDEE — body recomposition" },
              { key: "Peak",  label: "Peak Week",    desc: "Competition / event prep" },
              { key: "Other", label: "Other",        desc: "Custom plan" },
            ].map(plan => (
              <button key={plan.key} onClick={() => setRenewForm(p => ({ ...p, planType: plan.key }))}
                style={{ padding: "12px", borderRadius: 12, border: "2px solid",
                  cursor: "pointer", textAlign: "left", transition: "all .18s",
                  borderColor: renewForm.planType === plan.key ? "var(--green)" : "var(--border)",
                  background: renewForm.planType === plan.key ? "var(--green-bg)" : "var(--s2)" }}>
                <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: 13,
                  color: renewForm.planType === plan.key ? "var(--green)" : "var(--text)" }}>{plan.label}</div>
                <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 3 }}>{plan.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Plan Name */}
        <div className="fld">
          <div className="fl">Plan Name</div>
          <input className="fi" placeholder="e.g. 12-Week Cut Phase 2"
            value={renewForm.planName}
            onChange={e => setRenewForm(p => ({ ...p, planName: e.target.value }))} />
        </div>

        {/* Duration */}
        <div className="fld" style={{ marginBottom: 20 }}>
          <div className="fl" style={{ color: "var(--blue)" }}>Duration (weeks)</div>
          <div className="num-input">
            <button className="num-btn" onClick={() => setRenewForm(p => ({ ...p, planDuration: Math.max(1, p.planDuration - 1) }))}>-</button>
            <input type="number" value={renewForm.planDuration}
              onChange={e => setRenewForm(p => ({ ...p, planDuration: parseInt(e.target.value) || 1 }))}
              style={{ color: "var(--blue)", fontWeight: 800, textAlign: "center" }} />
            <button className="num-btn" onClick={() => setRenewForm(p => ({ ...p, planDuration: p.planDuration + 1 }))}>+</button>
          </div>
        </div>

        {/* Summary */}
        <div style={{ background: "var(--green-bg)", border: "1px solid var(--green-b)", borderRadius: 10,
          padding: "12px 14px", marginBottom: 16, fontSize: 12, color: "var(--muted2)", lineHeight: 1.7 }}>
          <div style={{ fontWeight: 700, color: "var(--green)", marginBottom: 4 }}>✓ Renewal Summary</div>
          <div>Goal: <strong style={{ color: "var(--orange)" }}>{renewForm.primaryGoal}</strong></div>
          <div>Plan: <strong style={{ color: "var(--text)" }}>{renewForm.planName || "(unnamed)"}</strong> — {renewForm.planType}</div>
          <div>Duration: <strong style={{ color: "var(--blue)" }}>{renewForm.planDuration} weeks</strong></div>
          <div style={{ marginTop: 4, color: "var(--green)" }}>Week resets to 1 · Access set to Active</div>
        </div>

        <button className="btn btn-p" style={{ width: "100%", padding: 14, fontSize: 15 }}
          onClick={async () => {
            await updateDoc(doc(db, "clients", selId), {
              planName:     renewForm.planName || renewForm.planType,
              planType:     renewForm.planType,
              primaryGoal:  renewForm.primaryGoal,
              planDuration: renewForm.planDuration,
              phase:        renewForm.planName || renewForm.planType,
              week:         1,
              accessStatus: "active",
              lastWeekUpdate: "",
            });
            toast(`${sel.name}'s plan renewed! Week reset to 1.`, "success");
            setShowRenewModal(false);
          }}>
          ✓ Confirm Renewal
        </button>
      </div>
    </div>
  </div>
)}
        </div>
      );
    }
  
    // Clients list
    if (tab === "clients") return (
    <div className="page">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div><div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 22, fontWeight: 800 }}>My Clients</div><div style={{ color: "var(--muted)", fontSize: 13, marginTop: 3 }}>{clients.length} total</div></div>
        <button className="btn btn-p" style={{ padding: "10px 22px", fontSize: 14 }} onClick={() => setShowAdd(true)}>+ Add Client</button>
      </div>
      {clients.length === 0
        ? <div className="card"><div className="empty"><span className="empty-icon">👥</span><div className="empty-title">No clients yet</div><button className="btn btn-p" onClick={() => setShowAdd(true)}>+ Add First Client</button></div></div>
        : <div className="card" style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
  <table className="tbl" style={{ minWidth: 520 }}>
            <thead><tr><th>Client</th><th>Phase</th><th>Status</th><th>Weight</th><th>Check-ins</th><th>Actions</th></tr></thead>
            <tbody>
              {clients.map(c => {
                const status = c.accessStatus || "active";
                return (
                  <tr key={c.id}>
                    <td><div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                    <div
  style={{
    width: 32,
    height: 32,
    borderRadius: "50%",
    overflow: "hidden",
    border: "1.5px solid var(--green-b)",
    flexShrink: 0,
  }}
>
  {c.photoUrl ? (
    <img
      src={c.photoUrl}
      alt=""
      style={{
        width: "100%",
        height: "100%",
        objectFit: "cover",
      }}
    />
  ) : (
    <div
      className="av av-sm av-g"
      style={{
        width: "100%",
        height: "100%",
        borderRadius: "50%",
      }}
    >
      {c.avatar}
    </div>
  )}
</div><div><div style={{ fontWeight: 600 }}>{c.name}</div><div style={{ fontSize: 11, color: "var(--muted)" }}>{c.email}</div></div></div></td>
                    <td><span className="bdg bdg-g">{c.phase}</span></td>
                    <td>{status === "active" ? <span className="access-badge-active">✓ Active</span> : status === "paused" ? <span className="access-badge-paused">⏸ Paused</span> : <span className="access-badge-terminated">🚫 Terminated</span>}</td>
                    <td style={{ fontWeight: 600 }}>{c.weight ? c.weight + "kg" : "-"}</td>
                    <td><span className="bdg bdg-p">{(c.weeklyCheckins || []).length}</span></td>
                    <td><div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      <button className="btn btn-s btn-xs" onClick={() => { setSelId(c.id); setInnerTab("overview"); }}>View</button>
                      <button className="btn btn-s btn-xs" onClick={() => { setSelId(c.id); setInnerTab("workout"); }}>Workout</button>
                      {status === "active" ? <button className="btn btn-warn btn-xs" onClick={() => setClientAccess(c.id, "paused")}>⏸</button> : <button className="btn btn-p btn-xs" onClick={() => setClientAccess(c.id, "active")}>▶</button>}
                      {status !== "terminated" && <button className="btn btn-d btn-xs" onClick={() => setClientAccess(c.id, "terminated")}>🚫</button>}
                    </div></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>}
    </div>
  );

  // Coach home
  return (
    <div className="page">
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 26, fontWeight: 800 }}>Welcome back, {coachName?.split(" ")[0] || "Ankit"} 👋</div>
        <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 5 }}>{clients.length} client{clients.length !== 1 ? "s" : ""} — Fit with Ankit Dashboard</div>
      </div>
      

<div className="g4" style={{ marginBottom: 24 }}>
  {(() => {
    const activeClients = clients.filter(c => (c.accessStatus || "active") === "active");
    const endingSoon = clients.filter(c => {
      if (!c.planDuration || !c.week) return false;
      const weeksLeft = parseInt(c.planDuration) - parseInt(c.week) + 1;
      return weeksLeft <= 1 && weeksLeft >= 0;
    });
    const checkinCount = clients.reduce((a, c) => a + (c.weeklyCheckins || []).length, 0);
    const noMessage = clients.filter(c => !c.coachMessage);
    const tiles = [
      { label: "Total Clients",     val: clients.length,      color: "var(--green)",  key: "all"     },
      { label: "Active Clients",    val: activeClients.length, color: "var(--blue)",   key: "active"  },
      { label: "Plans Ending Soon", val: endingSoon.length,    color: endingSoon.length > 0 ? "var(--red)" : "var(--yellow)", key: "ending" },
      { label: "Need Message",      val: noMessage.length,     color: "var(--orange)", key: "nomsg"   },
    ];
    const modalData = {
      all:    { title: "All Clients",         list: clients },
      active: { title: "Active Clients",      list: activeClients },
      ending: { title: "Plans Ending This Week", list: endingSoon },
      nomsg:  { title: "Clients Without Message", list: noMessage },
    };
    return tiles.map(({ label, val, color, key }, i) => (
      <div key={key} style={{ animationDelay: i * 0.09 + "s", cursor: "pointer" }}
        onClick={() => setDashModal(key)}>
        <div className="mc" style={{ border: "1px solid var(--border)", transition: "all .18s" }}
          onMouseEnter={e => e.currentTarget.style.borderColor = color}
          onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border)"}>
          <div className="mc-val" style={{ color }}>{val}</div>
          <div className="mc-label">{label}</div>
          <div style={{ fontSize: 9, color: "var(--muted)", marginTop: 3 }}>tap to view →</div>
        </div>
      </div>
    ));
  })()}
  {/* ── DASH MODAL ── */}
{dashModal && (() => {
  const activeClients = clients.filter(c => (c.accessStatus || "active") === "active");
  const endingSoon = clients.filter(c => {
    if (!c.planDuration || !c.week) return false;
    const weeksLeft = parseInt(c.planDuration) - parseInt(c.week) + 1;
    return weeksLeft <= 1 && weeksLeft >= 0;
  });
  const noMessage = clients.filter(c => !c.coachMessage);
  const modalData = {
    all:    { title: "All Clients",              list: clients },
    active: { title: "Active Clients",           list: activeClients },
    ending: { title: "Plans Ending This Week",   list: endingSoon },
    nomsg:  { title: "Clients Without Message",  list: noMessage },
  };
  const { title, list } = modalData[dashModal];
  return (
    <div className="ov" onClick={() => setDashModal(null)}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="mh">
          <div><div className="mt">{title}</div><div className="ms">{list.length} client{list.length !== 1 ? "s" : ""}</div></div>
          <button className="xbtn" onClick={() => setDashModal(null)}>✕</button>
        </div>
        <div className="mb2">
          {list.length === 0
            ? <div className="empty"><span className="empty-icon">✅</span><div className="empty-title">All clear!</div></div>
            : list.map((c, i) => {
                const weeksLeft = c.planDuration && c.week ? parseInt(c.planDuration) - parseInt(c.week) + 1 : null;
                return (
                  <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: i < list.length - 1 ? "1px solid var(--border)" : "none", cursor: "pointer" }}
                    onClick={() => { setDashModal(null); setTab("clients"); setSelId(c.id); setInnerTab("overview"); }}>
                    {/* Avatar / Photo */}
                    <div style={{ width: 38, height: 38, borderRadius: "50%", overflow: "hidden", flexShrink: 0, border: "1.5px solid var(--green-b)" }}>
                      {c.photoUrl
                        ? <img src={c.photoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        : <div style={{ width: "100%", height: "100%", background: "var(--green-bg)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: 13, color: "var(--green)" }}>{c.avatar}</div>
                      }
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{c.name}</div>
                      <div style={{ fontSize: 11, color: "var(--muted)" }}>{c.phase} — W{c.week}{weeksLeft !== null ? ` · ${weeksLeft}w left` : ""}</div>
                    </div>
                    <span style={{ fontSize: 11, color: "var(--green)" }}>View →</span>
                  </div>
                );
              })
          }
        </div>
      </div>
    </div>
  );
})()}
</div>
      {clients.length === 0
        ? <div className="card"><div className="empty"><span className="empty-icon">👥</span><div className="empty-title">Ready to go!</div><button className="btn btn-p" onClick={() => setShowAdd(true)}>+ Add First Client</button></div></div>
        : <><div className="sh"><div className="sh-title">Clients</div><button className="sh-link" onClick={() => setTab("clients")}>Manage all</button></div>
          <div className="ga">
            {clients.map((c, idx) => {
              const status = c.accessStatus || "active";
              return (
                <div key={c.id} className="cl-card" style={{ animationDelay: idx * 0.07 + "s", opacity: status !== "active" ? 0.75 : 1 }} onClick={() => { setTab("clients"); setSelId(c.id); setInnerTab("overview"); }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 12 }}>
                  <label style={{ cursor: "pointer", flexShrink: 0 }} onClick={e => e.stopPropagation()} title="Click to update photo">
  <input type="file" accept="image/*" style={{ display: "none" }} onChange={async (e) => {
    const file = e.target.files[0]; if (!file) return;
    const fd = new FormData(); fd.append("file", file); fd.append("upload_preset", "coachkit_upload"); fd.append("folder", "client_photos");
    try {
      const res = await fetch(`https://api.cloudinary.com/v1_1/dputo3zsh/image/upload`, { method: "POST", body: fd });
      const data = await res.json();
      await updateDoc(doc(db, "clients", c.id), { photoUrl: data.secure_url });
      toast("Photo updated!", "success");
    } catch { toast("Upload failed", "error"); }
    e.target.value = "";
  }} />
  <div style={{ width: 38, height: 38, borderRadius: "50%", overflow: "hidden", border: "1.5px solid var(--green-b)", flexShrink: 0 }}>
    {c.photoUrl
      ? <img src={c.photoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      : <div className="av av-md av-g" style={{ width: "100%", height: "100%", borderRadius: "50%" }}>{c.avatar}</div>
    }
  </div>
</label>
                    <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 700, fontSize: 14 }}>{c.name}</div><div style={{ fontSize: 11, color: "var(--muted)" }}>{c.email}</div></div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                      <span className="bdg bdg-g">W{c.week}</span>
                      {status !== "active" && (status === "paused" ? <span className="access-badge-paused" style={{ padding: "2px 7px", fontSize: 9 }}>⏸ Paused</span> : <span className="access-badge-terminated" style={{ padding: "2px 7px", fontSize: 9 }}>🚫 Ended</span>)}
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <div style={{ padding: "8px 10px", background: "var(--s2)", borderRadius: 9, border: "1px solid var(--border)" }}><div style={{ fontSize: 13, fontWeight: 700, color: "var(--green)", fontFamily: "'Outfit',sans-serif" }}>{c.weight ? c.weight + "kg" : "-"}</div><div style={{ fontSize: 10, color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", marginTop: 2 }}>Weight</div></div>
                    <div style={{ padding: "8px 10px", background: "var(--s2)", borderRadius: 9, border: "1px solid var(--border)" }}><div style={{ fontSize: 13, fontWeight: 700, color: "var(--purple)", fontFamily: "'Outfit',sans-serif" }}>{(c.weeklyCheckins || []).length} logs</div><div style={{ fontSize: 10, color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", marginTop: 2 }}>Check-ins</div></div>
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
        const data = cSnap.data();
        if (data.accessStatus === "paused") { await signOut(auth); setErr("Your account has been temporarily paused. Please contact your coach."); setLd(false); return; }
        if (data.accessStatus === "terminated") { await signOut(auth); setErr("Your account has been terminated. Please contact your coach."); setLd(false); return; }
        onLogin({ uid, email: em.trim(), role: "client", ...data }); return;
      }
      setErr("Account not found. Contact your coach.");
    } catch (e) {
      const msgs = {
        "auth/invalid-credential": "❌ Incorrect email or password.",
        "auth/wrong-password":     "❌ Incorrect email or password.",
        "auth/user-not-found":     "❌ No account found with this email.",
        "auth/too-many-requests":  "⚠️ Too many attempts. Please wait a few minutes.",
        "auth/network-request-failed": "📶 No internet connection. Check your network.",
        "auth/user-disabled":      "🚫 This account has been disabled.",
      };
      setErr(msgs[e.code] || "Something went wrong. Please try again.");
    }
    setLd(false);
  };
  const sendReset = async () => { if (!forgotEm) return; setForgotLd(true); try { await sendPasswordResetEmail(auth, forgotEm.trim()); setForgotSent(true); } catch { setErr("Could not send reset email."); } setForgotLd(false); };
  if (showForgot) return (
    <div className="auth-wrap"><div className="auth-card">
      <div className="auth-logo">FwA</div><div className="auth-title">Reset Password</div>
      {forgotSent ? <div className="alert alert-g" style={{ textAlign: "center", padding: 20 }}>Reset email sent!<div style={{ marginTop: 14 }}><button className="btn btn-s" onClick={() => { setShowForgot(false); setForgotSent(false); }}>Back</button></div></div>
        : <><div className="fld"><div className="fl">Email</div><input className="fi" type="email" placeholder="your@email.com" value={forgotEm} onChange={e => setForgotEm(e.target.value)} onKeyDown={e => e.key === "Enter" && sendReset()} /></div>{err && <div className="alert alert-e">{err}</div>}<button className="auth-btn" onClick={sendReset} disabled={forgotLd || !forgotEm}>{forgotLd ? "Sending..." : "Send Reset Email"}</button><div className="auth-switch"><button onClick={() => setShowForgot(false)}>Back to Login</button></div></>}
    </div></div>
  );
  return (
    <div className="auth-wrap"><div className="auth-card">
      <div className="auth-logo">FwA</div>
      <div className="auth-title">Fit with Ankit</div>
      <div className="auth-sub">Your personalised coaching platform</div>
      <div className="fld"><div className="fl">Email</div><input className="fi" type="email" placeholder="your@email.com" value={em} onChange={e => setEm(e.target.value)} onKeyDown={e => e.key === "Enter" && login()} /></div>
      <div className="fld"><div className="fl">Password</div><input className="fi" type="password" placeholder="password" value={pw} onChange={e => setPw(e.target.value)} onKeyDown={e => e.key === "Enter" && login()} /></div>
      {err && <div className="alert alert-e">{err}</div>}
      <button className="auth-btn" onClick={login} disabled={ld}>{ld ? "Signing in..." : "Sign In"}</button>
      <div style={{ textAlign: "right", marginTop: 8 }}><button style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, color: "var(--muted)" }} onClick={() => setShowForgot(true)}>Forgot password?</button></div>
      
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
      <div className="auth-logo">FwA</div><div className="auth-title">Setup Fit with Ankit</div>
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
const [networkError, setNetworkError] = useState(false);
  const [user, setUser] = useState(null); const [authLoading, setAuthLoading] = useState(true);
  const [coachExists, setCoachExists] = useState(false); const [screen, setScreen] = useState("login");
  const [tab, setTab] = useState("home"); const [showSplash, setShowSplash] = useState(false);
  const splashShownRef = useRef(false);

  useEffect(() => { getDoc(doc(db, "settings", "app")).then(s => { if (s.exists() && s.data().coachExists) setCoachExists(true); }).catch(() => {}); }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setAuthLoading(false);
    }, 8000);

    const unsub = onAuthStateChanged(auth, async fu => {
      clearTimeout(timeout);
      if (fu) {
        try {
          const uSnap = await getDoc(doc(db, "users", fu.uid));
          if (uSnap.exists()) { setUser({ uid: fu.uid, email: fu.email, ...uSnap.data() }); setAuthLoading(false); return; }
          const cSnap = await getDoc(doc(db, "clients", fu.uid));
          if (cSnap.exists()) {
            const data = cSnap.data();
            if (data.accessStatus === "paused" || data.accessStatus === "terminated") { await signOut(auth); setUser(null); setAuthLoading(false); return; }
            setUser({ uid: fu.uid, email: fu.email, role: "client", ...data }); setAuthLoading(false); return;
          }
          await signOut(auth); setUser(null);
        } catch(e) {
          console.error("Auth load error:", e);
          setUser(null);
          if (e.code === "unavailable" || e.message?.includes("network")) setNetworkError(true);
        }
      } else { setUser(null); }
      setAuthLoading(false);
    });

    return () => { clearTimeout(timeout); unsub(); };
  }, []);

  const handleLogin = (u) => {
    if (!splashShownRef.current) { splashShownRef.current = true; setShowSplash(true); setTimeout(() => { setUser(u); setShowSplash(false); }, 3000); }
    else { setUser(u); }
  };
  const logout = async () => { await signOut(auth); setUser(null); setTab("home"); splashShownRef.current = false; };

  if (showSplash) return <div><style>{CSS}</style><SplashScreen onDone={() => setShowSplash(false)} /></div>;
  if (networkError) return (
    <div style={{ background: "#080d1a", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <style>{CSS}</style>
      <div style={{ fontSize: 48, marginBottom: 16 }}>📶</div>
      <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 800, fontSize: 22, color: "var(--text)", marginBottom: 8 }}>Connection Issue</div>
      <div style={{ fontSize: 14, color: "var(--muted)", textAlign: "center", marginBottom: 24, maxWidth: 300 }}>Check your internet connection and try again.</div>
      <button className="btn btn-p" onClick={() => { setNetworkError(false); window.location.reload(); }}>🔄 Try Again</button>
    </div>
  );
  if (authLoading) return (
    <div style={{ background: "#080d1a", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      <style>{CSS}</style>
      <div style={{ width: 56, height: 56, borderRadius: 16, background: "linear-gradient(135deg,#22c55e,#16a34a)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Outfit',sans-serif", fontWeight: 900, fontSize: 18, color: "#fff", marginBottom: 20, animation: "float 2s ease infinite" }}>FwA</div>
      <div className="spinner-lg" style={{ marginBottom: 16 }} />
      <div style={{ color: "var(--muted)", fontSize: 13, fontWeight: 600 }}>Loading your dashboard...</div>
      <div style={{ marginTop: 8, fontSize: 11, color: "var(--muted)", opacity: 0.6 }}>Checking your connection</div>
    </div>
  );

  if (!user) return (
    <div><style>{CSS}</style>
      {screen === "setup" ? <SetupScreen onDone={u => { handleLogin(u); setCoachExists(true); }} /> : <LoginScreen onLogin={handleLogin} onSetup={() => setScreen("setup")} coachExists={coachExists} />}
      {t && <div className={t.type === "error" ? "toast toast-e" : "toast toast-s"}>{t.msg}</div>}
    </div>
  );

  const isCoach = user.role === "coach";
  const tabs = isCoach
    ? [["home", "Dashboard"], ["clients", "Clients"], ["analytics", "Analytics"]]
    : [["home", "Home"], ["checkin", "Weekly Check-in"], ["nutrition", "Nutrition"], ["sources", "My Sources"], ["training", "Training"], ["photos", "Photos"], ["comparison", "Compare"], ["chat", "Chat"]];

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
  <div 
    onClick={() => !isCoach && setTab("profile")}
    style={{ display: "flex", alignItems: "center", gap: 10, cursor: isCoach ? "default" : "pointer" }}
  >
    <div className="nav-av" style={{ cursor: isCoach ? "default" : "pointer" }}>
      {(user.name || user.email || "U").slice(0, 2).toUpperCase()}
    </div>
    <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
      <div style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.3 }}>{user.name || user.email}</div>
      <div style={{ fontSize: 10, color: isCoach ? "var(--green)" : "var(--purple)", fontWeight: 600, lineHeight: 1.3 }}>{user.role}</div>
    </div>
  </div>
  <button className="signout" onClick={logout}>Sign out</button>
</div>
      </nav>
      {isCoach
        ? <CoachDash coachUid={user.uid} coachEmail={user.email} coachName={user.name} tab={tab} setTab={setTab} toast={show} />
        : <ClientDash uid={user.uid} tab={tab} setTab={setTab} toast={show} />}
      {t && <div className={t.type === "error" ? "toast toast-e" : "toast toast-s"}>{t.msg}</div>}
      {/* ── BOTTOM NAV (mobile only) ── */}
<div className="bottom-nav">
  {tabs.map(([k, l]) => {
    const icons = {
      home: "🏠", checkin: "📋", nutrition: "🍽", sources: "🥗",
      training: "💪", photos: "📸", comparison: "📊", chat: "💬",
      profile: "👤", clients: "👥", analytics: "📈"
    };
    return (
      <button key={k} className={tab === k ? "bottom-nav-btn active" : "bottom-nav-btn"} onClick={() => setTab(k)}>
        <span className="bn-icon">{icons[k] || "●"}</span>
        <span className="bn-label">{l}</span>
      </button>
    );
  })}
</div>
    </div>
  );
}
