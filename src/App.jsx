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

// ─── CLOUDINARY CONFIG ────────────────────────────────────────────────────────
const CLOUDINARY_CLOUD_NAME = "dxyz123abc";
const CLOUDINARY_UPLOAD_PRESET = "coachakit_upload";

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
.nav{background:rgba(8,13,26,.95);backdrop-filter:blur(16px);border-bottom:1px solid var(--border);padding:0 20px;height:58px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:100}
.nav-logo{display:flex;align-items:center;gap:9px;cursor:pointer;border:none;background:none}
.nav-icon{width:34px;height:34px;border-radius:10px;background:linear-gradient(135deg,#22c55e,#16a34a);display:flex;align-items:center;justify-content:center;font-family:'Outfit',sans-serif;font-weight:900;font-size:11px;color:#fff;letter-spacing:-.5px}
.nav-brand{font-family:'Outfit',sans-serif;font-weight:800;font-size:16px;color:var(--text)}
.nav-brand span{color:var(--green)}
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
.g3{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
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
.fsel{width:100%;padding:10px 14px;background:var(--s2);border:1.5px solid var(--border);border-radius:9px;color:var(--text);font-family:'DM Sans',sans-serif;font-size:13px;outline:none}
.fta{width:100%;padding:10px 14px;background:var(--s2);border:1.5px solid var(--border);border-radius:9px;color:var(--text);font-family:'DM Sans',sans-serif;font-size:13px;outline:none;resize:vertical;min-height:70px}
.fta:focus{border-color:var(--green)}
.num-input{display:flex;align-items:center;border:1.5px solid var(--border);border-radius:9px;overflow:hidden;background:var(--s2)}
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
.modal-lg{max-width:900px}
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
.auth-logo{width:56px;height:56px;border-radius:16px;background:linear-gradient(135deg,#22c55e,#16a34a);display:flex;align-items:center;justify-content:center;font-family:'Outfit',sans-serif;font-weight:900;font-size:17px;color:#fff;margin:0 auto 14px;box-shadow:0 8px 24px rgba(34,197,94,.3)}
.auth-title{font-family:'Outfit',sans-serif;font-weight:800;font-size:24px;text-align:center;margin-bottom:4px}
.auth-sub{font-size:13px;color:var(--muted);text-align:center;margin-bottom:28px}
.auth-btn{width:100%;padding:13px;background:linear-gradient(135deg,#22c55e,#16a34a);color:#fff;border:none;border-radius:10px;font-family:'Outfit',sans-serif;font-weight:700;font-size:15px;cursor:pointer;margin-top:4px;box-shadow:0 4px 16px rgba(34,197,94,.25);transition:all .15s}
.auth-btn:hover{box-shadow:0 6px 24px rgba(34,197,94,.4);transform:translateY(-1px)}
.auth-btn:disabled{opacity:.5;cursor:not-allowed;transform:none}
.auth-switch{text-align:center;margin-top:16px;font-size:12px;color:var(--muted)}
.auth-switch button{background:none;border:none;cursor:pointer;color:var(--green);font-size:12px;font-weight:600}
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
.ex-row{display:flex;align-items:flex-start;gap:10px;padding:12px 0;border-bottom:1px solid var(--border)}
.ex-row:last-child{border-bottom:none}
.ex-num{width:26px;height:26px;border-radius:6px;background:var(--s2);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:var(--muted);flex-shrink:0;margin-top:2px}
.cl-card{background:var(--s1);border:1px solid var(--border);border-radius:var(--r);padding:16px;cursor:pointer;transition:all .15s}
.cl-card:hover{border-color:var(--border2);transform:translateY(-1px);box-shadow:var(--sh)}
.sec-lbl{font-family:'Outfit',sans-serif;font-weight:700;font-size:12px;color:var(--muted2);text-transform:uppercase;letter-spacing:.08em;margin-bottom:10px;margin-top:4px}
.photo-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:10px}
.photo-item{border-radius:10px;overflow:hidden;aspect-ratio:3/4;position:relative;cursor:pointer}
.photo-item img,.photo-item video{width:100%;height:100%;object-fit:cover}
.photo-label{position:absolute;bottom:0;left:0;right:0;background:linear-gradient(transparent,rgba(0,0,0,.75));padding:14px 8px 8px;color:#fff;font-size:10px;font-weight:600}
.photo-del{position:absolute;top:6px;right:6px;background:rgba(248,113,113,.85);color:#fff;border:none;border-radius:6px;padding:3px 7px;font-size:10px;font-weight:700;cursor:pointer;display:none}
.photo-item:hover .photo-del{display:block}
.cmp-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:16px}
.cmp-card{background:var(--s2);border:1px solid var(--border);border-radius:12px;overflow:hidden}
.cmp-head{padding:10px 14px;background:var(--s3);border-bottom:1px solid var(--border);font-weight:700;font-size:13px;text-align:center}
.cmp-body{padding:12px 14px}
.cmp-stat{display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--border);font-size:13px}
.cmp-stat:last-child{border-bottom:none}
.upload-area{border:2px dashed var(--border2);border-radius:12px;padding:24px;text-align:center;cursor:pointer;background:var(--s2);transition:all .15s;display:block}
.upload-area:hover{border-color:var(--green);background:var(--green-bg)}
.video-badge{position:absolute;top:6px;right:6px;background:rgba(0,0,0,.7);color:#fff;border-radius:6px;padding:2px 6px;font-size:10px;font-weight:700}
.note-box{background:rgba(251,191,36,.06);border:1px solid rgba(251,191,36,.2);border-radius:8px;padding:9px 12px;font-size:12px;color:#fcd34d;line-height:1.55;margin-top:6px;white-space:pre-wrap}
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
.prog-bar{height:4px;border-radius:2px;background:var(--border);overflow:hidden;margin-top:6px}
.prog-fill{height:100%;border-radius:2px;transition:width .4s ease}
/* ── SLIDER ── */
.slider-wrap{margin-bottom:18px}
.slider-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}
.slider-label{font-size:13px;font-weight:600;color:var(--text)}
.slider-val{font-family:'Outfit',sans-serif;font-size:20px;font-weight:800;color:var(--green);min-width:28px;text-align:right}
.slider{-webkit-appearance:none;appearance:none;width:100%;height:6px;border-radius:3px;background:var(--s3);outline:none;cursor:pointer}
.slider::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:22px;height:22px;border-radius:50%;background:var(--green);cursor:pointer;box-shadow:0 0 0 3px rgba(34,197,94,.25)}
.slider::-moz-range-thumb{width:22px;height:22px;border-radius:50%;background:var(--green);cursor:pointer;border:none;box-shadow:0 0 0 3px rgba(34,197,94,.25)}
/* ── CHECK-IN SECTION LABEL ── */
.section-hdr{font-family:'Outfit',sans-serif;font-weight:700;font-size:12px;color:var(--muted2);text-transform:uppercase;letter-spacing:.08em;margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:6px}
/* ── AUTOSAVE INDICATOR ── */
.autosave{display:inline-flex;align-items:center;gap:5px;font-size:11px;color:var(--green);font-weight:600;opacity:0;transition:opacity .3s}
.autosave.show{opacity:1}
@media(max-width:700px){.g4{grid-template-columns:1fr 1fr}.g3{grid-template-columns:1fr 1fr}.fg{grid-template-columns:1fr}.nav-tabs{display:none}.wk-grid{grid-template-columns:repeat(3,1fr)}}
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
      <button className="num-btn" onClick={() => onChange(Math.max(0, (parseInt(value) || 0) - 1))}>-</button>
      <input type="number" value={value} onChange={e => onChange(parseInt(e.target.value) || 0)} style={{ color }} />
      <button className="num-btn" onClick={() => onChange((parseInt(value) || 0) + 1)}>+</button>
    </div>
  );
}

function MealTotals({ items }) {
  const t = items.reduce((a, i) => ({
    protein: a.protein + (i.protein || 0), carbs: a.carbs + (i.carbs || 0),
    fats: a.fats + (i.fats || 0), fiber: a.fiber + (i.fiber || 0), cal: a.cal + (i.cal || 0),
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

// ─── SLIDER COMPONENT ─────────────────────────────────────────────────────────
function SliderField({ label, value, onChange, min = 1, max = 10, color = "var(--green)" }) {
  return (
    <div className="slider-wrap">
      <div className="slider-header">
        <span className="slider-label">{label}</span>
        <span className="slider-val" style={{ color }}>{value}</span>
      </div>
      <input type="range" className="slider" min={min} max={max} value={value}
        onChange={e => onChange(parseInt(e.target.value))}
        style={{ background: `linear-gradient(to right, ${color} 0%, ${color} ${((value - min) / (max - min)) * 100}%, var(--s3) ${((value - min) / (max - min)) * 100}%, var(--s3) 100%)` }}
      />
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--muted)", marginTop: 3 }}>
        <span>{min} Low</span><span>{max} High</span>
      </div>
    </div>
  );
}

// ─── SOURCES COMPONENTS ───────────────────────────────────────────────────────
function SourcesTablePanel({ sources }) {
  if (!sources) return null;
  const cats = [{ key: "protein", label: "Protein", color: "var(--purple)" }, { key: "carbs", label: "Carbs", color: "var(--orange)" }, { key: "fats", label: "Fats", color: "var(--red)" }];
  const hasAny = cats.some(c => (sources[c.key] || []).some(v => v));
  if (!hasAny) return (
    <div className="sources-table-wrap">
      <div className="sources-table-title">Client Food Sources</div>
      <div style={{ fontSize: 12, color: "var(--muted)" }}>Client has not filled food sources yet.</div>
    </div>
  );
  const rows = [];
  for (let i = 0; i < 5; i++) {
    const p = (sources.protein || [])[i] || ""; const c = (sources.carbs || [])[i] || ""; const f = (sources.fats || [])[i] || "";
    if (p || c || f) rows.push({ i, p, c, f });
  }
  return (
    <div className="sources-table-wrap">
      <div className="sources-table-title">Client Food Sources <span style={{ fontWeight: 400, color: "var(--muted)", textTransform: "none", letterSpacing: 0 }}>(use when building meal plan)</span></div>
      <table className="sources-table">
        <thead><tr><th style={{ color: "var(--muted2)" }}>#</th><th style={{ color: "var(--purple)" }}>Protein</th><th style={{ color: "var(--orange)" }}>Carbs</th><th style={{ color: "var(--red)" }}>Fats</th></tr></thead>
        <tbody>
          {rows.map(({ i, p, c, f }) => (
            <tr key={i}>
              <td style={{ color: "var(--muted)", fontSize: 10, fontWeight: 700 }}>{i + 1}</td>
              <td style={{ color: p ? "var(--purple)" : "var(--muted)", fontWeight: p ? 600 : 400 }}>{p || "-"}</td>
              <td style={{ color: c ? "var(--orange)" : "var(--muted)", fontWeight: c ? 600 : 400 }}>{c || "-"}</td>
              <td style={{ color: f ? "var(--red)" : "var(--muted)", fontWeight: f ? 600 : 400 }}>{f || "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SourcesMiniReadonly({ sources }) {
  if (!sources) return null;
  const cats = [
    { key: "protein", label: "Protein Sources", color: "var(--purple)", border: "rgba(167,139,250,.35)" },
    { key: "carbs", label: "Carb Sources", color: "var(--orange)", border: "rgba(251,146,60,.35)" },
    { key: "fats", label: "Fat Sources", color: "var(--red)", border: "rgba(248,113,113,.35)" },
  ];
  const hasAny = cats.some(c => (sources[c.key] || []).some(v => v));
  if (!hasAny) return null;
  return (
    <div className="sources-mini" style={{ marginBottom: 18 }}>
      <div className="sources-mini-title">My Food Sources</div>
      {cats.map(({ key, label, color, border }) => {
        const items = (sources[key] || []).filter(v => v);
        if (!items.length) return null;
        return (
          <div key={key} style={{ marginBottom: 6 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 4 }}>{label}</div>
            <div className="sources-mini-row">
              {items.map((item, i) => <span key={i} className="sources-mini-tag" style={{ color, borderColor: border, background: color + "12" }}>{item}</span>)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── DAILY CHECK-IN SECTION (client) ─────────────────────────────────────────
function DailyCheckinSection({ uid, d, toast }) {
  const today = new Date().toLocaleDateString("en-IN");
  const existingCheckin = (d.dailyCheckins || []).find(c => c.date === today);

  const [form, setForm] = useState({
    stressLevel: existingCheckin?.stressLevel || 5,
    hungerCravings: existingCheckin?.hungerCravings || 5,
    trainingPerformance: existingCheckin?.trainingPerformance || 5,
    nutritionAdherence: existingCheckin?.nutritionAdherence || 5,
    sleepQuality: existingCheckin?.sleepQuality || 5,
    waterIntake: existingCheckin?.waterIntake || 2,
    digestion: existingCheckin?.digestion || "",
    injuries: existingCheckin?.injuries || "None",
    period: existingCheckin?.period || "N/A",
    noteToCoach: existingCheckin?.noteToCoach || "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(!!existingCheckin);

  const submit = async () => {
    setSaving(true);
    const checkin = { ...form, date: today, time: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }), timestamp: new Date().toISOString() };
    const existing = d.dailyCheckins || [];
    const filtered = existing.filter(c => c.date !== today);
    await updateDoc(doc(db, "clients", uid), { dailyCheckins: [...filtered, checkin] });
    toast("Daily check-in submitted!", "success");
    setSaved(true);
    setSaving(false);
  };

  return (
    <div className="card" style={{ marginBottom: 18 }}>
      <div className="card-title">
        Daily Check-in — {today}
        {saved && <span className="bdg bdg-g">Submitted today</span>}
      </div>

      {/* PERFORMANCE SLIDERS */}
      <div className="section-hdr">Performance & Wellbeing</div>
      <SliderField label="Stress Level" value={form.stressLevel} onChange={v => setForm(p => ({ ...p, stressLevel: v }))} color="#f87171" />
      <SliderField label="Hunger / Cravings" value={form.hungerCravings} onChange={v => setForm(p => ({ ...p, hungerCravings: v }))} color="#fb923c" />
      <SliderField label="Training Performance" value={form.trainingPerformance} onChange={v => setForm(p => ({ ...p, trainingPerformance: v }))} color="#4ade80" />
      <SliderField label="Nutrition Adherence" value={form.nutritionAdherence} onChange={v => setForm(p => ({ ...p, nutritionAdherence: v }))} color="#a78bfa" />
      <SliderField label="Sleep Quality" value={form.sleepQuality} onChange={v => setForm(p => ({ ...p, sleepQuality: v }))} color="#38bdf8" />

      {/* WATER INTAKE */}
      <div className="slider-wrap">
        <div className="slider-header">
          <span className="slider-label">Water Intake</span>
          <span className="slider-val" style={{ color: "#38bdf8" }}>{form.waterIntake}L</span>
        </div>
        <input type="range" className="slider" min={0} max={6} step={0.5} value={form.waterIntake}
          onChange={e => setForm(p => ({ ...p, waterIntake: parseFloat(e.target.value) }))}
          style={{ background: `linear-gradient(to right, #38bdf8 0%, #38bdf8 ${(form.waterIntake / 6) * 100}%, var(--s3) ${(form.waterIntake / 6) * 100}%, var(--s3) 100%)` }}
        />
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--muted)", marginTop: 3 }}>
          <span>0L</span><span>6L</span>
        </div>
      </div>

      {/* WELLBEING DROPDOWNS */}
      <div className="section-hdr" style={{ marginTop: 4 }}>Wellbeing</div>
      <div className="fg" style={{ marginBottom: 12 }}>
        <div className="fld">
          <div className="fl">Digestion</div>
          <select className="fsel" value={form.digestion} onChange={e => setForm(p => ({ ...p, digestion: e.target.value }))}>
            <option value="">Select...</option>
            <option>Normal</option>
            <option>Bloating</option>
            <option>Constipation</option>
            <option>Loose stools</option>
            <option>Reflux / acidity</option>
            <option>Other</option>
          </select>
        </div>
        <div className="fld">
          <div className="fl">Any injuries / pain?</div>
          <select className="fsel" value={form.injuries} onChange={e => setForm(p => ({ ...p, injuries: e.target.value }))}>
            <option>None</option>
            <option>Minor soreness (normal)</option>
            <option>Joint pain</option>
            <option>Muscle pull / strain</option>
            <option>Other</option>
          </select>
        </div>
      </div>
      <div className="fld" style={{ marginBottom: 12 }}>
        <div className="fl">Period (if applicable)</div>
        <select className="fsel" value={form.period} onChange={e => setForm(p => ({ ...p, period: e.target.value }))}>
          <option>N/A</option>
          <option>On period</option>
          <option>Pre-period (PMS)</option>
          <option>Post-period</option>
        </select>
      </div>

      {/* NOTE TO COACH */}
      <div className="section-hdr">Note to Coach</div>
      <div className="fld">
        <textarea className="fta" placeholder="Anything you want your coach to know today..." value={form.noteToCoach} onChange={e => setForm(p => ({ ...p, noteToCoach: e.target.value }))} />
      </div>

      <button className="btn btn-p" style={{ width: "100%" }} onClick={submit} disabled={saving}>
        {saving ? "Submitting..." : saved ? "Update Today's Check-in" : "Submit Daily Check-in"}
      </button>
    </div>
  );
}

// ─── WORKOUT EDITOR with auto-save ────────────────────────────────────────────
function WorkoutEditor({ plan, onSave, onClose, autoSave }) {
  const [days, setDays] = useState(JSON.parse(JSON.stringify(plan)));
  const [autoSaved, setAutoSaved] = useState(false);
  const saveTimer = useRef(null);
  const TYPES = ["Push", "Pull", "Legs", "Rest", "Cardio", "Full Body"];

  const triggerAutoSave = (newDays) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      autoSave(newDays);
      setAutoSaved(true);
      setTimeout(() => setAutoSaved(false), 2000);
    }, 1000);
  };

  const updateDay = (di, f, v) => {
    const updated = days.map((day, i) => i === di ? { ...day, [f]: v } : day);
    setDays(updated); triggerAutoSave(updated);
  };
  const updateEx = (di, ei, f, v) => {
    const updated = days.map((day, i) => i === di ? { ...day, exercises: day.exercises.map((ex, j) => j === ei ? { ...ex, [f]: v } : ex) } : day);
    setDays(updated); triggerAutoSave(updated);
  };
  const addEx = (di) => {
    const updated = days.map((day, i) => i === di ? { ...day, exercises: [...day.exercises, { name: "", sets: 3, reps: "10-12", rest: "60s", videoUrl: "", note: "" }] } : day);
    setDays(updated); triggerAutoSave(updated);
  };
  const removeEx = (di, ei) => {
    const updated = days.map((day, i) => i === di ? { ...day, exercises: day.exercises.filter((_, j) => j !== ei) } : day);
    setDays(updated); triggerAutoSave(updated);
  };
  const addDay = () => {
    const updated = [...days, { day: "Day " + (days.length + 1), type: "Push", exercises: [] }];
    setDays(updated); triggerAutoSave(updated);
  };
  const removeDay = (di) => {
    const updated = days.filter((_, i) => i !== di);
    setDays(updated); triggerAutoSave(updated);
  };

  return (
    <div className="ov" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="mh">
          <div>
            <div className="mt">Edit Workout Plan</div>
            <div className="ms">Changes auto-save as you type</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className={`autosave ${autoSaved ? "show" : ""}`}>Saved</span>
            <button className="xbtn" onClick={onClose}>X</button>
          </div>
        </div>
        <div className="mb2">
          {days.map((day, di) => (
            <div key={di} style={{ background: "var(--s2)", border: "1px solid var(--border)", borderRadius: 10, padding: 14, marginBottom: 12 }}>
              <div style={{ display: "flex", gap: 8, marginBottom: 10, alignItems: "center" }}>
                <input className="fi" style={{ flex: 1 }} value={day.day} onChange={e => updateDay(di, "day", e.target.value)} placeholder="Day name" />
                <select className="fsel" style={{ width: 130 }} value={day.type} onChange={e => updateDay(di, "type", e.target.value)}>
                  {TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
                <button className="btn btn-d btn-sm" onClick={() => removeDay(di)}>Remove</button>
              </div>
              {day.type !== "Rest" && (
                <>
                  {day.exercises.map((ex, ei) => (
                    <div key={ei} style={{ background: "var(--s1)", border: "1px solid var(--border)", borderRadius: 9, padding: 12, marginBottom: 10 }}>
                      <div style={{ display: "grid", gridTemplateColumns: "2fr 55px 80px 65px auto", gap: 6, marginBottom: 8, alignItems: "center" }}>
                        <div><div className="fl">Exercise</div><input className="fi" value={ex.name} onChange={e => updateEx(di, ei, "name", e.target.value)} placeholder="Exercise name" /></div>
                        <div><div className="fl">Sets</div><input className="fi" type="number" value={ex.sets} onChange={e => updateEx(di, ei, "sets", parseInt(e.target.value) || 1)} /></div>
                        <div><div className="fl">Reps</div><input className="fi" value={ex.reps} onChange={e => updateEx(di, ei, "reps", e.target.value)} placeholder="10-12" /></div>
                        <div><div className="fl">Rest</div><input className="fi" value={ex.rest} onChange={e => updateEx(di, ei, "rest", e.target.value)} placeholder="60s" /></div>
                        <div style={{ paddingTop: 18 }}><button className="btn btn-d btn-xs" onClick={() => removeEx(di, ei)}>X</button></div>
                      </div>
                      <div style={{ marginBottom: 8 }}>
                        <div className="fl">Video Demo (YouTube link)</div>
                        <input className="fi" value={ex.videoUrl || ""} onChange={e => updateEx(di, ei, "videoUrl", e.target.value)} placeholder="https://youtube.com/watch?v=..." />
                        {ex.videoUrl && <div style={{ marginTop: 5 }}><span className="bdg bdg-b">Video linked</span><button className="btn btn-d btn-xs" style={{ marginLeft: 8 }} onClick={() => updateEx(di, ei, "videoUrl", "")}>Remove</button></div>}
                      </div>
                      <div>
                        <div className="fl" style={{ color: "#fbbf24" }}>Coaching Note (visible to client)</div>
                        <textarea className="fta" style={{ minHeight: 60, fontSize: 12, borderColor: ex.note ? "rgba(251,191,36,.4)" : undefined, background: ex.note ? "rgba(251,191,36,.05)" : undefined }}
                          value={ex.note || ""} onChange={e => updateEx(di, ei, "note", e.target.value)}
                          placeholder="e.g. Use 30 degree incline. Keep elbows tucked. Controlled negative." />
                      </div>
                    </div>
                  ))}
                  <button className="btn btn-s btn-sm" onClick={() => addEx(di)} style={{ marginTop: 4 }}>+ Add Exercise</button>
                </>
              )}
            </div>
          ))}
          <button className="btn btn-s" onClick={addDay} style={{ marginBottom: 16 }}>+ Add Day</button>
          <button className="btn btn-s" style={{ width: "100%" }} onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}

// ─── MEAL EDITOR with auto-save ───────────────────────────────────────────────
function MealEditor({ plan, onSave, onClose, clientSources, autoSave }) {
  const [meals, setMeals] = useState(JSON.parse(JSON.stringify(plan)));
  const [autoSaved, setAutoSaved] = useState(false);
  const saveTimer = useRef(null);

  const triggerAutoSave = (newMeals) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      autoSave(newMeals);
      setAutoSaved(true);
      setTimeout(() => setAutoSaved(false), 2000);
    }, 1000);
  };

  const updateMeal = (mi, f, v) => { const u = meals.map((m, i) => i === mi ? { ...m, [f]: v } : m); setMeals(u); triggerAutoSave(u); };
  const updateItem = (mi, ii, f, v) => {
    const u = meals.map((m, i) => i === mi ? { ...m, items: m.items.map((item, j) => j === ii ? { ...item, [f]: f === "food" || f === "amount" ? v : (parseFloat(v) || 0) } : item) } : m);
    setMeals(u); triggerAutoSave(u);
  };
  const addItem = (mi) => { const u = meals.map((m, i) => i === mi ? { ...m, items: [...m.items, { food: "", amount: "", protein: 0, carbs: 0, fats: 0, fiber: 0, cal: 0 }] } : m); setMeals(u); triggerAutoSave(u); };
  const removeItem = (mi, ii) => { const u = meals.map((m, i) => i === mi ? { ...m, items: m.items.filter((_, j) => j !== ii) } : m); setMeals(u); triggerAutoSave(u); };
  const addMeal = () => { const u = [...meals, { name: "Meal " + (meals.length + 1), time: "12:00 PM", items: [] }]; setMeals(u); triggerAutoSave(u); };
  const removeMeal = (mi) => { const u = meals.filter((_, i) => i !== mi); setMeals(u); triggerAutoSave(u); };

  return (
    <div className="ov" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="mh">
          <div><div className="mt">Edit Meal Plan</div><div className="ms">Changes auto-save as you type</div></div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className={`autosave ${autoSaved ? "show" : ""}`}>Saved</span>
            <button className="xbtn" onClick={onClose}>X</button>
          </div>
        </div>
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
                    <button className="btn btn-d btn-xs" onClick={() => removeItem(mi, ii)}>X</button>
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

// ─── VIDEO MODAL ──────────────────────────────────────────────────────────────
function VideoModal({ url, name, onClose }) {
  const isYT = url.includes("youtube.com") || url.includes("youtu.be");
  let embedUrl = url;
  if (isYT) { const id = url.split("v=")[1]?.split("&")[0] || url.split("youtu.be/")[1]?.split("?")[0]; embedUrl = "https://www.youtube.com/embed/" + id; }
  return (
    <div className="ov" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="mh"><div><div className="mt">{name}</div><div className="ms">Exercise demo</div></div><button className="xbtn" onClick={onClose}>X</button></div>
        <div className="mb2">
          {isYT ? <iframe width="100%" height="315" src={embedUrl} frameBorder="0" allowFullScreen style={{ borderRadius: 10 }} /> : <video src={url} controls style={{ width: "100%", borderRadius: 10 }} />}
        </div>
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
        if (p.phase !== data.phase) changed.phase = true;
        if (p.week !== data.week) changed.week = true;
        if (JSON.stringify(p.mealPlan) !== JSON.stringify(data.mealPlan)) changed.meals = true;
        if (JSON.stringify(p.workoutPlan) !== JSON.stringify(data.workoutPlan)) changed.workout = true;
        if (Object.keys(changed).length > 0) { setFlash(changed); toast("Coach updated your plan!", "success"); setTimeout(() => setFlash({}), 3000); }
      }
      prevRef.current = data; setD(data); setLoading(false);
    });
    return unsub;
  }, [uid]);

  const logStats = async () => {
    if (!lw) return; setSaving(true);
    const weight = parseFloat(lw); const waist = lwa ? parseFloat(lwa) : (d.waist || null); const bodyFat = lbf ? parseFloat(lbf) : (d.bodyFat || null);
    const hist = d.weightHistory || []; const checkins = d.checkIns || [];
    const entry = { week: "W" + (hist.length + 1), weight, date: new Date().toLocaleDateString("en-IN"), timestamp: new Date().toISOString() };
    const checkin = { weight, waist, bodyFat, date: new Date().toLocaleDateString("en-IN"), time: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }), timestamp: new Date().toISOString(), week: "W" + (hist.length + 1) };
    await updateDoc(doc(db, "clients", uid), { weight, waist, bodyFat, weightHistory: [...hist, entry], checkIns: [...checkins, checkin] });
    toast("Check-in logged!", "success"); setLw(""); setLwa(""); setLbf(""); setSaving(false);
  };

  const uploadMedia = async (files) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    let successCount = 0;
    for (const file of files) {
      const isVideo = file.type.startsWith("video/"); const maxMB = isVideo ? 100 : 25; const sizeMB = file.size / (1024 * 1024);
      if (sizeMB > maxMB) { toast(file.name + " too large (max " + maxMB + "MB)", "error"); continue; }
      try {
        toast("Uploading " + file.name + "...", "success"); setUploadPct(0);
        const result = await cloudinaryUpload(file, pct => setUploadPct(pct));
        const currentPhotos = (d.photos || []);
        const newEntry = { url: result.secure_url, publicId: result.public_id, type: isVideo ? "video" : "photo", name: file.name, date: new Date().toLocaleDateString("en-IN"), time: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }), timestamp: new Date().toISOString(), sizeMB: sizeMB.toFixed(2) };
        await updateDoc(doc(db, "clients", uid), { photos: [...currentPhotos, newEntry] });
        successCount++;
      } catch (err) { toast("Upload failed: " + err.message, "error"); }
    }
    if (successCount > 0) toast(successCount + " file(s) uploaded!", "success");
    setUploading(false); setUploadPct(0);
  };

  const deleteMedia = async (photo) => {
    if (!window.confirm("Delete this photo/video?")) return;
    const updated = (d.photos || []).filter(p => p.timestamp !== photo.timestamp);
    await updateDoc(doc(db, "clients", uid), { photos: updated });
    toast("Removed.", "success");
  };

  if (loading) return <div className="spin-wrap"><div className="spinner" /><span>Loading your plan...</span></div>;
  if (!d) return <div className="spin-wrap">No data. Contact your coach.</div>;

  const n = d.nutrition || {}; const meals = d.mealPlan || DEFAULT_MEALS;
  const workout = d.workoutPlan || DEFAULT_WORKOUT; const checkins = d.checkIns || []; const sources = d.foodSources || null;

  if (tab === "checkin") return (
    <div className="page">
      <div style={{ marginBottom: 22 }}>
        <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 22, fontWeight: 800 }}>Daily Check-in</div>
        <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 5 }}>How are you doing today? Your coach can see this.</div>
      </div>
      <DailyCheckinSection uid={uid} d={d} toast={toast} />
    </div>
  );

  if (tab === "training") return (
    <div className="page">
      <div style={{ marginBottom: 22 }}>
        <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 22, fontWeight: 800 }}>Your Workout Plan</div>
        <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 5 }}>{d.phase} - Week {d.week}</div>
        {flash.workout && <span className="nbadge">Updated by coach</span>}
      </div>
      <div className="wk-grid" style={{ marginBottom: 20 }}>
        {workout.map((day, i) => (
          <div key={i} className={day.type === "Rest" ? "wk-card rest" : "wk-card"} style={{ borderTop: "3px solid " + (WCOLOR[day.type] || "#475569") }} onClick={() => day.type !== "Rest" && setWModal(day)}>
            <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", color: "var(--muted)", marginBottom: 8 }}>{day.day.slice(0, 3)}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: WCOLOR[day.type] || "#475569" }}>{day.type}</div>
            {day.type !== "Rest" && <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 3 }}>{day.exercises.length} exercises</div>}
          </div>
        ))}
      </div>
      {wModal && (
        <div className="ov" onClick={e => e.target === e.currentTarget && setWModal(null)}>
          <div className="modal">
            <div className="mh"><div><div className="mt">{wModal.day} - {wModal.type}</div><div className="ms">{wModal.exercises.length} exercises</div></div><button className="xbtn" onClick={() => setWModal(null)}>X</button></div>
            <div className="mb2">
              {wModal.exercises.map((ex, i) => (
                <div key={i} className="ex-row">
                  <div className="ex-num">{i + 1}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{ex.name}</div>
                    <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>Rest: {ex.rest}</div>
                    {ex.note && <div className="note-box">{ex.note}</div>}
                    {ex.videoUrl && <button className="btn btn-s btn-xs" style={{ marginTop: 6 }} onClick={() => setVideoModal(ex)}>Watch Demo</button>}
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
  );

  if (tab === "nutrition") {
    const allItems = meals.flatMap(m => m.items);
    const totP = allItems.reduce((a, i) => a + (i.protein || 0), 0); const totC = allItems.reduce((a, i) => a + (i.carbs || 0), 0);
    const totF = allItems.reduce((a, i) => a + (i.fats || 0), 0); const totFib = allItems.reduce((a, i) => a + (i.fiber || 0), 0);
    const totCal = allItems.reduce((a, i) => a + (i.cal || 0), 0);
    const calFromP = totP * 4; const calFromC = totC * 4; const calFromF = totF * 9;
    return (
      <div className="page">
        <div style={{ marginBottom: 18 }}><div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 22, fontWeight: 800 }}>Your Nutrition Plan</div><div className="live" style={{ marginTop: 7 }}><span className="dot" />Live from coach</div></div>
        <SourcesMiniReadonly sources={sources} />
        <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: 14, marginBottom: 10, color: "var(--muted2)", textTransform: "uppercase", letterSpacing: ".07em" }}>Daily Targets</div>
        <div className="g4" style={{ marginBottom: 20 }}>
          <MC label="Calories" value={n.calories} color="var(--green)" flash={!!flash.calories} />
          <MC label="Protein G" value={n.protein} color="var(--purple)" flash={!!flash.protein} />
          <MC label="Carbs G" value={n.carbs} color="var(--orange)" flash={!!flash.carbs} />
          <MC label="Fats G" value={n.fats} color="var(--red)" flash={!!flash.fats} />
        </div>
        <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: 14, marginBottom: 10, color: "var(--muted2)", textTransform: "uppercase", letterSpacing: ".07em" }}>Meal Plan</div>
        {meals.map((meal, mi) => {
          const mp = meal.items.reduce((a, i) => a + (i.protein || 0), 0); const mc2 = meal.items.reduce((a, i) => a + (i.carbs || 0), 0);
          const mf = meal.items.reduce((a, i) => a + (i.fats || 0), 0); const mfib = meal.items.reduce((a, i) => a + (i.fiber || 0), 0);
          const mcal = meal.items.reduce((a, i) => a + (i.cal || 0), 0);
          return (
            <div key={mi} className="meal-card">
              <div className="meal-head"><div><span style={{ fontWeight: 700, fontSize: 14 }}>{meal.name}</span><span style={{ fontSize: 12, color: "var(--muted)", marginLeft: 8 }}>{meal.time}</span></div><span className="bdg bdg-g">{mcal} kcal</span></div>
              <div className="meal-body">
                {meal.items.map((item, ii) => (
                  <div key={ii} className="food-row">
                    <div><span style={{ fontWeight: 600 }}>{item.food}</span><span style={{ color: "var(--muted)", fontSize: 12, marginLeft: 6 }}>{item.amount}</span></div>
                    <div style={{ display: "flex", gap: 8, fontSize: 12, flexWrap: "wrap", justifyContent: "flex-end" }}>
                      <span style={{ color: "var(--purple)" }}>{item.protein}g P</span><span style={{ color: "var(--orange)" }}>{item.carbs}g C</span>
                      <span style={{ color: "var(--red)" }}>{item.fats}g F</span><span style={{ color: "#34d399" }}>{item.fiber || 0}g Fib</span>
                      <span style={{ color: "var(--green)", fontWeight: 700 }}>{item.cal} cal</span>
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
        <div className="card" style={{ marginBottom: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
            {[["Total Protein", totP + "g", "var(--purple)"], ["Total Carbs", totC + "g", "var(--orange)"], ["Total Fats", totF + "g", "var(--red)"], ["Total Fiber", totFib + "g", "#34d399"], ["Total Calories", totCal + " kcal", "var(--green)"]].map(([l, v, co]) => (
              <div key={l} style={{ background: "var(--s2)", borderRadius: 10, padding: "12px 14px", border: "1px solid var(--border)" }}>
                <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 20, fontWeight: 800, color: co }}>{v}</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", marginTop: 4 }}>{l}</div>
              </div>
            ))}
          </div>
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 14 }}>
            <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: 13, marginBottom: 10, color: "var(--muted2)" }}>Calories from each macro</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              {[["From Protein", calFromP, "var(--purple)", totCal], ["From Carbs", calFromC, "var(--orange)", totCal], ["From Fats", calFromF, "var(--red)", totCal]].map(([l, v, co, tot]) => {
                const pct = tot > 0 ? Math.round(v / tot * 100) : 0;
                return (
                  <div key={l} style={{ background: "var(--s2)", borderRadius: 10, padding: 12, border: "1px solid var(--border)", textAlign: "center" }}>
                    <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 18, fontWeight: 800, color: co }}>{v} kcal</div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)", marginTop: 3 }}>{l}</div>
                    <div style={{ marginTop: 8 }}><div className="prog-bar"><div className="prog-fill" style={{ width: pct + "%", background: co }} /></div><div style={{ fontSize: 11, color: co, fontWeight: 700, marginTop: 3 }}>{pct}%</div></div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (tab === "sources") {
    const srcs = d.foodSources || { protein: ["", "", "", "", ""], carbs: ["", "", "", "", ""], fats: ["", "", "", "", ""] };
    const updateSource = async (type, idx, val) => {
      const updated = { ...srcs }; updated[type] = [...(updated[type] || ["", "", "", "", ""])]; updated[type][idx] = val;
      await updateDoc(doc(db, "clients", uid), { foodSources: updated });
    };
    return (
      <div className="page">
        <div style={{ marginBottom: 22 }}><div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 22, fontWeight: 800 }}>My Food Sources</div><div style={{ color: "var(--muted)", fontSize: 13, marginTop: 5 }}>Your coach uses these to design your meal plan</div></div>
        <div className="alert alert-b" style={{ marginBottom: 18 }}>Fill in foods easily available to you. Saved automatically when you click outside each box.</div>
        {[["protein", "Top 5 Protein Sources", "var(--purple)", "e.g. Eggs, Chicken, Paneer, Whey, Fish"], ["carbs", "Top 5 Carb Sources", "var(--orange)", "e.g. Rice, Oats, Bread, Sweet Potato, Banana"], ["fats", "Top 5 Fat Sources", "var(--red)", "e.g. Ghee, Nuts, Peanut Butter, Oil, Butter"]].map(([type, label, color, hint]) => (
          <div key={type} className="card" style={{ marginBottom: 16 }}>
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
        <div style={{ marginBottom: 20 }}><div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 22, fontWeight: 800 }}>Progress Photos and Videos</div><div style={{ color: "var(--muted)", fontSize: 13, marginTop: 5 }}>Stored on Cloudinary - 25GB free</div></div>
        <div className="card" style={{ marginBottom: 16 }}>
          <label className="upload-area">
            <input type="file" accept="image/*,video/*" multiple style={{ display: "none" }} disabled={uploading} onChange={e => { uploadMedia(Array.from(e.target.files)); e.target.value = ""; }} />
            <div style={{ fontSize: 32, marginBottom: 8 }}>+</div>
            <div style={{ fontWeight: 700, fontSize: 16, color: uploading ? "var(--muted)" : "var(--green)", marginBottom: 6 }}>{uploading ? "Uploading " + uploadPct + "%" : "Upload Photos or Videos"}</div>
            <div style={{ color: "var(--muted2)", fontSize: 13, marginBottom: 10 }}>Select multiple files - full quality - stored free on Cloudinary</div>
            {uploading && <div className="prog-bar" style={{ maxWidth: 300, margin: "0 auto 10px" }}><div className="prog-fill" style={{ width: uploadPct + "%", background: "var(--green)" }} /></div>}
            <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
              <span className="bdg bdg-g">Photos up to 25MB</span>
              <span className="bdg bdg-b">Videos up to 100MB</span>
              <span className="bdg bdg-p">{clientPhotos.length} files uploaded</span>
            </div>
          </label>
        </div>
        {clientPhotos.length > 0 ? (
          <div className="card">
            <div className="card-title">Your Media ({clientPhotos.length})</div>
            <div className="photo-grid">
              {[...clientPhotos].reverse().map((p, i) => (
                <div key={i} className="photo-item">
                  <div onClick={() => setViewMedia(p)} style={{ width: "100%", height: "100%" }}>
                    {p.type === "video" ? <><video src={p.url} style={{ width: "100%", height: "100%", objectFit: "cover" }} /><div className="video-badge">Video</div></> : <img src={p.url} alt="" />}
                  </div>
                  <div className="photo-label">{p.date}</div>
                  <button className="photo-del" onClick={e => { e.stopPropagation(); deleteMedia(p); }}>X Delete</button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="card"><div className="empty"><div className="empty-icon">+</div><div className="empty-title">No photos yet</div><div className="empty-desc">Upload your first progress photo above!</div></div></div>
        )}
        {viewMedia && (
          <div className="ov" onClick={() => setViewMedia(null)}>
            <div style={{ maxWidth: 560, width: "100%" }}>
              {viewMedia.type === "video" ? <video src={viewMedia.url} controls autoPlay style={{ width: "100%", borderRadius: 16 }} /> : <img src={viewMedia.url} alt="" style={{ width: "100%", borderRadius: 16 }} />}
              <div style={{ textAlign: "center", marginTop: 10, color: "var(--muted2)", fontSize: 13 }}>{viewMedia.date}</div>
              <div style={{ textAlign: "center", marginTop: 8 }}><button className="btn btn-s btn-sm" onClick={() => setViewMedia(null)}>Close</button></div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (tab === "comparison") {
    return (
      <div className="page">
        <div style={{ marginBottom: 22 }}><div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 22, fontWeight: 800 }}>Week by Week Comparison</div></div>
        {checkins.length < 2
          ? <div className="card"><div className="empty"><div className="empty-icon">+</div><div className="empty-title">Not enough data yet</div><div className="empty-desc">Log at least 2 check-ins to see comparisons.</div></div></div>
          : <div className="cmp-grid">
            {checkins.map((c, i) => (
              <div key={i} className="cmp-card">
                <div className="cmp-head" style={{ color: "var(--green)" }}>{c.week} - {c.date}</div>
                <div className="cmp-body">
                  <div className="cmp-stat"><span style={{ color: "var(--muted)" }}>Weight</span><span style={{ fontWeight: 700, color: "var(--green)" }}>{c.weight} kg</span></div>
                  <div className="cmp-stat"><span style={{ color: "var(--muted)" }}>Waist</span><span style={{ fontWeight: 700 }}>{c.waist ? c.waist + " cm" : "-"}</span></div>
                  <div className="cmp-stat"><span style={{ color: "var(--muted)" }}>Body Fat</span><span style={{ fontWeight: 700 }}>{c.bodyFat ? c.bodyFat + "%" : "-"}</span></div>
                  {i > 0 && <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid var(--border)" }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", marginBottom: 4 }}>Change from prev</div>
                    <div className="cmp-stat"><span style={{ color: "var(--muted)" }}>Weight</span><span style={{ fontWeight: 700, color: (c.weight - checkins[i - 1].weight) < 0 ? "var(--green)" : "var(--red)" }}>{(c.weight - checkins[i - 1].weight) > 0 ? "+" : ""}{(c.weight - checkins[i - 1].weight).toFixed(1)} kg</span></div>
                  </div>}
                </div>
              </div>
            ))}
          </div>}
      </div>
    );
  }

  // HOME
  return (
    <div className="page">
      <div style={{ marginBottom: 22 }}>
        <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 26, fontWeight: 800 }}>Hey {(d.name || "").split(" ")[0]}</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10, alignItems: "center" }}>
          <span className="phase">{d.phase} - Week {d.week}</span>
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
        <div className="card-title">Log Weight Check-in</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 10, alignItems: "flex-end" }}>
          <div><div className="fl">Weight (kg)</div><input className="fi" type="number" step="0.1" placeholder="85.5" value={lw} onChange={e => setLw(e.target.value)} /></div>
          <div><div className="fl">Waist (cm)</div><input className="fi" type="number" step="0.1" placeholder="82" value={lwa} onChange={e => setLwa(e.target.value)} /></div>
          <div><div className="fl">Body Fat %</div><input className="fi" type="number" step="0.1" placeholder="18.5" value={lbf} onChange={e => setLbf(e.target.value)} /></div>
          <button className="btn btn-p" onClick={logStats} disabled={saving || !lw}>{saving ? "..." : "Log"}</button>
        </div>
      </div>
      {/* Daily Check-in shortcut */}
      <div className="card" style={{ marginBottom: 16, background: "var(--green-bg)", border: "1px solid var(--green-b)", cursor: "pointer" }} onClick={() => setTab("checkin")}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: 15, color: "var(--green)" }}>Daily Check-in</div>
            <div style={{ fontSize: 12, color: "var(--muted2)", marginTop: 3 }}>Stress, sleep, training performance, digestion and more</div>
          </div>
          <span style={{ fontSize: 20 }}>→</span>
        </div>
      </div>
      {checkins.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-title">Recent Check-ins <button className="sh-link" onClick={() => setTab("comparison")}>View all</button></div>
          <table className="tbl">
            <thead><tr><th>Week</th><th>Date</th><th>Weight</th><th>Waist</th><th>Body Fat</th></tr></thead>
            <tbody>
              {[...checkins].reverse().slice(0, 5).map((c, i) => (
                <tr key={i}><td><span className="bdg bdg-g">{c.week}</span></td><td style={{ color: "var(--muted)", fontSize: 12 }}>{c.date}</td><td style={{ fontWeight: 700, color: "var(--green)" }}>{c.weight} kg</td><td style={{ color: "var(--muted)" }}>{c.waist ? c.waist + " cm" : "-"}</td><td style={{ color: "var(--orange)" }}>{c.bodyFat ? c.bodyFat + "%" : "-"}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className={flash.msg ? "card flash" : "card"} style={{ marginBottom: 16 }}>
        <div className="card-title">Message from Coach {flash.msg && <span className="nbadge">New</span>}</div>
        <div className={"msg-b" + (d.coachMessage ? " has" : "")}>{d.coachMessage || "Your coach has not sent a message yet."}</div>
      </div>
      <div className="sh"><div className="sh-title">Today Targets</div><button className="sh-link" onClick={() => setTab("nutrition")}>Full plan</button></div>
      <div className="g4" style={{ marginBottom: 20 }}>
        <MC label="Calories" value={n.calories} color="var(--green)" flash={!!flash.calories} />
        <MC label="Protein G" value={n.protein} color="var(--purple)" flash={!!flash.protein} />
        <MC label="Carbs G" value={n.carbs} color="var(--orange)" flash={!!flash.carbs} />
        <MC label="Fats G" value={n.fats} color="var(--red)" flash={!!flash.fats} />
      </div>
      <div className="sh"><div className="sh-title">This Week</div><button className="sh-link" onClick={() => setTab("training")}>Full plan</button></div>
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 6 }}>
          {workout.map((day, i) => (
            <div key={i} className={day.type === "Rest" ? "wk-card rest" : "wk-card"} style={{ borderTop: "3px solid " + (WCOLOR[day.type] || "#475569"), padding: "10px 4px" }} onClick={() => day.type !== "Rest" && setWModal(day)}>
              <div style={{ fontSize: 8, fontWeight: 700, textTransform: "uppercase", color: "var(--muted)", marginBottom: 5 }}>{day.day.slice(0, 3)}</div>
              <div style={{ fontSize: 9, fontWeight: 700, color: WCOLOR[day.type] || "#475569" }}>{day.type}</div>
            </div>
          ))}
        </div>
      </div>
      {(d.weightHistory || []).length > 1 && (
        <><div className="sh"><div className="sh-title">Weight Progress</div></div>
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
          </div></>
      )}
      {wModal && (
        <div className="ov" onClick={e => e.target === e.currentTarget && setWModal(null)}>
          <div className="modal">
            <div className="mh"><div><div className="mt">{wModal.day} - {wModal.type}</div></div><button className="xbtn" onClick={() => setWModal(null)}>X</button></div>
            <div className="mb2">
              {wModal.exercises.map((ex, i) => (
                <div key={i} className="ex-row">
                  <div className="ex-num">{i + 1}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{ex.name}</div>
                    <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>Rest: {ex.rest}</div>
                    {ex.note && <div className="note-box">{ex.note}</div>}
                    {ex.videoUrl && <button className="btn btn-s btn-xs" style={{ marginTop: 6 }} onClick={() => setVideoModal(ex)}>Watch Demo</button>}
                  </div>
                  <div style={{ fontWeight: 800, fontSize: 16 }}>{ex.sets} x {ex.reps}</div>
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
    if (!msgText.trim() || !selId) return; setSendingMsg(true);
    await updateDoc(doc(db, "clients", selId), { coachMessage: msgText.trim() });
    toast("Message sent!", "success"); setMsgText(""); setSendingMsg(false);
  };

  // AUTO-SAVE handlers — no save button needed
  const autoSaveWorkout = async (plan) => {
    await updateDoc(doc(db, "clients", selId), { workoutPlan: plan });
    toast("Workout auto-saved!", "success");
  };

  const autoSaveMeals = async (plan) => {
    const cal = plan.reduce((a, m) => a + m.items.reduce((b, i) => b + (i.cal || 0), 0), 0);
    const pro = plan.reduce((a, m) => a + m.items.reduce((b, i) => b + (i.protein || 0), 0), 0);
    const car = plan.reduce((a, m) => a + m.items.reduce((b, i) => b + (i.carbs || 0), 0), 0);
    const fat = plan.reduce((a, m) => a + m.items.reduce((b, i) => b + (i.fats || 0), 0), 0);
    const fib = plan.reduce((a, m) => a + m.items.reduce((b, i) => b + (i.fiber || 0), 0), 0);
    await updateDoc(doc(db, "clients", selId), { mealPlan: plan, nutrition: { calories: cal, protein: pro, carbs: car, fats: fat, fiber: fib } });
  };

  const addClient = async () => {
    if (!nc.name || !nc.email || !nc.password) { toast("Name, email and password required", "error"); return; }
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
        weightHistory: [], checkIns: [], dailyCheckins: [], coachMessage: "", photos: [],
        mealPlan: DEFAULT_MEALS, workoutPlan: DEFAULT_WORKOUT,
        coachId: coachUid, coachEmail, role: "client", createdAt: serverTimestamp(),
      });
      await signInWithEmailAndPassword(auth, coachEmail, window._cp);
      setShowAdd(false);
      setNc({ name: "", email: "", password: "", phone: "", phase: "Cut Phase 1", week: "1", calories: 2200, protein: 160, carbs: 240, fats: 70, fiber: 25 });
      toast(nc.name + " added!", "success");
    } catch (err) { toast(err.code === "auth/email-already-in-use" ? "Email already used!" : err.message, "error"); }
    setAddSaving(false);
  };

  const deleteClientPhoto = async (photo) => {
    if (!window.confirm("Remove this photo?")) return;
    const updated = (sel.photos || []).filter(p => p.timestamp !== photo.timestamp);
    await updateDoc(doc(db, "clients", selId), { photos: updated });
    toast("Photo removed.", "success");
  };

  if (loading) return <div className="spin-wrap"><div className="spinner" /><span>Loading...</span></div>;

  if (tab === "analytics") return (
    <div className="page">
      <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 22, fontWeight: 800, marginBottom: 22 }}>Analytics</div>
      <div className="g2">
        {clients.map(c => (
          <div key={c.id} className="card">
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <div className="av av-sm av-g">{c.avatar}</div>
              <div><div style={{ fontWeight: 700, fontSize: 13 }}>{c.name}</div><div style={{ fontSize: 11, color: "var(--muted)" }}>{c.phase} - W{c.week}</div></div>
              <span className="bdg bdg-g" style={{ marginLeft: "auto" }}>{c.weight ? c.weight + "kg" : "-"}</span>
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
    const n = sel.nutrition || {}; const checkins = sel.checkIns || []; const media = sel.photos || [];
    const clientSources = sel.foodSources || null; const dailyCheckins = sel.dailyCheckins || [];
    const today = new Date().toLocaleDateString("en-IN");
    const todayCheckin = dailyCheckins.find(c => c.date === today);
    const recentDailyCheckins = [...dailyCheckins].reverse().slice(0, 7);

    return (
      <div className="page">
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <button className="btn btn-s btn-sm" onClick={() => { setSelId(null); setSel(null); }}>Back</button>
          <div className="av av-md av-g">{sel.avatar}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 800, fontSize: 19 }}>{sel.name}</div>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>{sel.email}{sel.phone ? " - " + sel.phone : ""}</div>
          </div>
          <span className="live"><span className="dot" />Live</span>
        </div>
        <div className="tab-bar">
          {[["overview", "Overview"], ["checkins", "Check-ins"], ["daily", "Daily Logs"], ["photos", "Media"], ["comparison", "Compare"], ["message", "Message"], ["nutrition", "Macros"], ["meals", "Meals"], ["analytics", "Analytics"], ["sources", "Sources"], ["workout", "Workout"], ["phase", "Phase"]].map(([k, l]) => (
            <button key={k} className={innerTab === k ? "tab-item active" : "tab-item"} onClick={() => setInnerTab(k)}>{l}</button>
          ))}
        </div>

        {/* OVERVIEW */}
        {innerTab === "overview" && (
          <div>
            <div className="g4" style={{ marginBottom: 16 }}>
              <MC label="Weight KG" value={sel.weight} color="var(--green)" />
              <MC label="Waist CM" value={sel.waist} color="var(--purple)" />
              <MC label="Body Fat %" value={sel.bodyFat} color="var(--orange)" suffix="%" />
              <MC label="Week" value={"W" + sel.week} color="var(--blue)" />
            </div>
            {/* Today daily check-in snapshot */}
            {todayCheckin && (
              <div className="card" style={{ marginBottom: 14 }}>
                <div className="card-title">Today Daily Check-in <span className="bdg bdg-g">Today</span></div>
                <div className="g3" style={{ marginBottom: 10 }}>
                  {[["Stress", todayCheckin.stressLevel, "#f87171"], ["Hunger", todayCheckin.hungerCravings, "#fb923c"], ["Training", todayCheckin.trainingPerformance, "#4ade80"], ["Nutrition", todayCheckin.nutritionAdherence, "#a78bfa"], ["Sleep", todayCheckin.sleepQuality, "#38bdf8"], ["Water", todayCheckin.waterIntake + "L", "#38bdf8"]].map(([l, v, co]) => (
                    <div key={l} style={{ background: "var(--s2)", borderRadius: 9, padding: "10px 12px", border: "1px solid var(--border)", textAlign: "center" }}>
                      <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 22, fontWeight: 800, color: co }}>{v}</div>
                      <div style={{ fontSize: 10, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", marginTop: 3 }}>{l}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 12, color: "var(--muted2)" }}>
                  {todayCheckin.digestion && <span>Digestion: <strong style={{ color: "var(--text)" }}>{todayCheckin.digestion}</strong></span>}
                  {todayCheckin.injuries && <span>Injuries: <strong style={{ color: todayCheckin.injuries === "None" ? "var(--green)" : "var(--red)" }}>{todayCheckin.injuries}</strong></span>}
                </div>
                {todayCheckin.noteToCoach && <div className="note-box" style={{ marginTop: 10 }}>{todayCheckin.noteToCoach}</div>}
              </div>
            )}
            <div className="g2" style={{ marginBottom: 14 }}>
              <div className="card"><div className="card-title">Check-ins</div><div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 36, fontWeight: 800, color: "var(--green)" }}>{checkins.length}</div></div>
              <div className="card"><div className="card-title">Media</div><div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 36, fontWeight: 800, color: "var(--purple)" }}>{media.length}</div></div>
            </div>
            {(sel.weightHistory || []).length > 1 && (
              <div className="card" style={{ marginBottom: 14 }}>
                <div className="card-title">Weight Chart</div>
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
            <div className="card" style={{ marginBottom: 14 }}>
              <div className="card-title">Current Message</div>
              <div className={"msg-b" + (sel.coachMessage ? " has" : "")}>{sel.coachMessage || "No message sent yet."}</div>
            </div>
            <SourcesTablePanel sources={clientSources} />
          </div>
        )}

        {/* DAILY LOGS — coach view */}
        {innerTab === "daily" && (
          <div className="card">
            <div className="card-title">Daily Check-in Logs - {sel.name}</div>
            {recentDailyCheckins.length === 0
              ? <div className="empty"><div className="empty-icon">+</div><div className="empty-title">No daily check-ins yet</div><div className="empty-desc">Client has not submitted any daily check-ins.</div></div>
              : recentDailyCheckins.map((c, i) => (
                <div key={i} style={{ background: "var(--s2)", borderRadius: 10, padding: 14, marginBottom: 10, border: "1px solid var(--border)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <span style={{ fontWeight: 700, fontSize: 14 }}>{c.date}</span>
                    <span className="bdg bdg-g">{c.time}</span>
                  </div>
                  <div className="g3" style={{ marginBottom: 10 }}>
                    {[["Stress", c.stressLevel, "#f87171"], ["Hunger", c.hungerCravings, "#fb923c"], ["Training", c.trainingPerformance, "#4ade80"], ["Nutrition", c.nutritionAdherence, "#a78bfa"], ["Sleep", c.sleepQuality, "#38bdf8"], ["Water", (c.waterIntake || 0) + "L", "#38bdf8"]].map(([l, v, co]) => (
                      <div key={l} style={{ textAlign: "center" }}>
                        <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 18, fontWeight: 800, color: co }}>{v}</div>
                        <div style={{ fontSize: 10, color: "var(--muted)", textTransform: "uppercase", fontWeight: 600 }}>{l}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 12, color: "var(--muted2)", marginBottom: c.noteToCoach ? 8 : 0 }}>
                    {c.digestion && <span>Digestion: <strong style={{ color: "var(--text)" }}>{c.digestion}</strong></span>}
                    {c.injuries && <span>Injuries: <strong style={{ color: c.injuries === "None" ? "var(--green)" : "var(--red)" }}>{c.injuries}</strong></span>}
                    {c.period && c.period !== "N/A" && <span>Period: <strong style={{ color: "var(--text)" }}>{c.period}</strong></span>}
                  </div>
                  {c.noteToCoach && <div className="note-box">{c.noteToCoach}</div>}
                </div>
              ))}
          </div>
        )}

        {/* CHECK-INS */}
        {innerTab === "checkins" && (
          <div className="card">
            <div className="card-title">Weight Check-in History - {sel.name}</div>
            {checkins.length === 0
              ? <div className="empty"><div className="empty-icon">+</div><div className="empty-title">No check-ins yet</div></div>
              : <table className="tbl">
                <thead><tr><th>Week</th><th>Date</th><th>Weight</th><th>Waist</th><th>Body Fat</th><th>Change</th></tr></thead>
                <tbody>
                  {[...checkins].reverse().map((c, i, arr) => {
                    const prev = arr[i + 1]; const change = prev ? (c.weight - prev.weight).toFixed(1) : null;
                    return (
                      <tr key={i}>
                        <td><span className="bdg bdg-g">{c.week}</span></td>
                        <td style={{ color: "var(--muted)", fontSize: 12 }}>{c.date}</td>
                        <td style={{ fontWeight: 700, color: "var(--green)" }}>{c.weight} kg</td>
                        <td style={{ color: "var(--muted)" }}>{c.waist ? c.waist + " cm" : "-"}</td>
                        <td style={{ color: "var(--orange)" }}>{c.bodyFat ? c.bodyFat + "%" : "-"}</td>
                        <td>{change !== null && <span className={"bdg " + (parseFloat(change) < 0 ? "bdg-g" : parseFloat(change) > 0 ? "bdg-r" : "bdg-p")}>{parseFloat(change) > 0 ? "+" : ""}{change} kg</span>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>}
          </div>
        )}

        {/* PHOTOS */}
        {innerTab === "photos" && (
          <div className="card">
            <div className="card-title">Media - {sel.name} ({media.length} files)</div>
            {media.length === 0
              ? <div className="empty"><div className="empty-icon">+</div><div className="empty-title">No media yet</div></div>
              : <div className="photo-grid">
                {[...media].reverse().map((p, i) => (
                  <div key={i} className="photo-item">
                    <div onClick={() => setViewMedia(p)} style={{ width: "100%", height: "100%" }}>
                      {p.type === "video" ? <><video src={p.url} style={{ width: "100%", height: "100%", objectFit: "cover" }} /><div className="video-badge">Video</div></> : <img src={p.url} alt="" />}
                    </div>
                    <div className="photo-label">{p.date}</div>
                    <button className="photo-del" onClick={e => { e.stopPropagation(); deleteClientPhoto(p); }}>X Delete</button>
                  </div>
                ))}
              </div>}
          </div>
        )}

        {/* COMPARISON */}
        {innerTab === "comparison" && (
          <div className="card">
            <div className="card-title">Week-by-Week - {sel.name}</div>
            {checkins.length < 2
              ? <div className="empty"><div className="empty-icon">+</div><div className="empty-title">Need 2+ check-ins</div></div>
              : <div className="cmp-grid">
                {checkins.map((c, i) => (
                  <div key={i} className="cmp-card">
                    <div className="cmp-head" style={{ color: "var(--green)" }}>{c.week} - {c.date}</div>
                    <div className="cmp-body">
                      <div className="cmp-stat"><span style={{ color: "var(--muted)" }}>Weight</span><span style={{ fontWeight: 700, color: "var(--green)" }}>{c.weight} kg</span></div>
                      <div className="cmp-stat"><span style={{ color: "var(--muted)" }}>Waist</span><span style={{ fontWeight: 700 }}>{c.waist ? c.waist + " cm" : "-"}</span></div>
                      <div className="cmp-stat"><span style={{ color: "var(--muted)" }}>Body Fat</span><span style={{ fontWeight: 700 }}>{c.bodyFat ? c.bodyFat + "%" : "-"}</span></div>
                      {i > 0 && <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid var(--border)" }}>
                        <div className="cmp-stat"><span style={{ color: "var(--muted)" }}>Change</span><span style={{ fontWeight: 700, color: (c.weight - checkins[i - 1].weight) < 0 ? "var(--green)" : "var(--red)" }}>{(c.weight - checkins[i - 1].weight) > 0 ? "+" : ""}{(c.weight - checkins[i - 1].weight).toFixed(1)} kg</span></div>
                      </div>}
                    </div>
                  </div>
                ))}
              </div>}
          </div>
        )}

        {/* MESSAGE */}
        {innerTab === "message" && (
          <div className="card">
            <div className="card-title">Message to {sel.name}</div>
            <div className="alert alert-g">Current: {sel.coachMessage || "None"}</div>
            <div className="fld"><div className="fl">New Message</div><textarea className="fta" placeholder={"Great work " + sel.name.split(" ")[0] + "! Keep it up"} value={msgText} onChange={e => setMsgText(e.target.value)} /></div>
            <div className="alert alert-w">Client sees this instantly!</div>
            <button className="btn btn-p" onClick={sendMessage} disabled={sendingMsg || !msgText.trim()}>{sendingMsg ? "Sending..." : "Send Message"}</button>
          </div>
        )}

        {/* MACROS */}
        {innerTab === "nutrition" && (
          <div className="card">
            <div className="card-title">Macro Targets - {sel.name}</div>
            <div className="alert alert-w">Syncs instantly to client!</div>
            <div className="fg">
              {[["Calories (kcal)", "calories", "var(--green)"], ["Protein (g)", "protein", "var(--purple)"], ["Carbs (g)", "carbs", "var(--orange)"], ["Fats (g)", "fats", "var(--red)"], ["Fiber (g)", "fiber", "#34d399"]].map(([l, k, co]) => (
                <div key={k} className="fld"><div className="fl" style={{ color: co }}>{l}</div><NumInput value={n[k] || 0} color={co} onChange={v => updateN(k, v)} /></div>
              ))}
            </div>
            <div className="alert alert-g">Current: {n.calories} kcal - {n.protein}g P - {n.carbs}g C - {n.fats}g F - {n.fiber || 0}g Fiber</div>
          </div>
        )}

        {/* WORKOUT */}
        {innerTab === "workout" && (
          <div className="card">
            <div className="card-title">Workout Plan - {sel.name} <button className="btn btn-p btn-sm" onClick={() => setShowWorkoutEditor(true)}>Edit Plan</button></div>
            <div className="alert alert-g">Changes auto-save as you type in the editor!</div>
            {(sel.workoutPlan || DEFAULT_WORKOUT).map((day, di) => (
              <div key={di} style={{ background: "var(--s2)", border: "1px solid var(--border)", borderRadius: 10, padding: 12, marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: day.type !== "Rest" ? 10 : 0 }}>
                  <div><span style={{ fontWeight: 700 }}>{day.day}</span><span className="bdg bdg-p" style={{ marginLeft: 8 }}>{day.type}</span></div>
                  {day.type !== "Rest" && <span style={{ fontSize: 12, color: "var(--muted)" }}>{day.exercises.length} exercises</span>}
                </div>
                {day.type !== "Rest" && day.exercises.map((ex, ei) => (
                  <div key={ei} style={{ padding: "8px 0", borderBottom: "1px solid var(--border)", fontSize: 13 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontWeight: 600 }}>{ex.name}</span>
                      <span style={{ color: "var(--muted)", fontSize: 12 }}>{ex.sets}x{ex.reps} - {ex.rest}</span>
                    </div>
                    {ex.note && <div className="note-box" style={{ marginTop: 5 }}>{ex.note}</div>}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* PHASE */}
        {innerTab === "phase" && (
          <div className="card">
            <div className="card-title">Phase and Stats - {sel.name}</div>
            <div className="fg">
              <div className="fld"><div className="fl">Phase</div>
                <select className="fsel" value={sel.phase} onChange={e => { update("phase", e.target.value); toast("Phase updated!", "success"); }}>
                  <option>Cut Phase 1</option><option>Cut Phase 2</option><option>Bulk Phase 1</option><option>Bulk Phase 2</option><option>Maintenance</option><option>Peak Week</option><option>Reverse Diet</option>
                </select>
              </div>
              <div className="fld"><div className="fl">Current Week</div><input className="fi" type="number" min="1" max="52" value={sel.week} onChange={e => update("week", parseInt(e.target.value) || 1)} /></div>
              <div className="fld"><div className="fl">Body Fat %</div><NumInput value={sel.bodyFat || 0} color="var(--orange)" onChange={v => { update("bodyFat", v); toast("Updated!", "success"); }} /></div>
              <div className="fld"><div className="fl">Starting Weight (kg)</div><input className="fi" type="number" step="0.1" defaultValue={sel.weight || ""} placeholder="86" onBlur={e => update("weight", parseFloat(e.target.value) || null)} /></div>
            </div>
          </div>
        )}

        {/* ANALYTICS */}
        {innerTab === "analytics" && (() => {
          const mealPlan = sel.mealPlan || DEFAULT_MEALS;
          const allItems = mealPlan.flatMap(m => m.items);
          const totP = allItems.reduce((a, i) => a + (i.protein || 0), 0); const totC = allItems.reduce((a, i) => a + (i.carbs || 0), 0);
          const totF = allItems.reduce((a, i) => a + (i.fats || 0), 0); const totFib = allItems.reduce((a, i) => a + (i.fiber || 0), 0);
          const totCal = allItems.reduce((a, i) => a + (i.cal || 0), 0);
          const nn = sel.nutrition || {};
          return (
            <div>
              <div className="card" style={{ marginBottom: 14 }}>
                <div className="card-title">Daily Targets</div>
                <div className="fg">
                  {[["Calories (kcal)", "calories", "var(--green)"], ["Protein (g)", "protein", "var(--purple)"], ["Carbs (g)", "carbs", "var(--orange)"], ["Fats (g)", "fats", "var(--red)"], ["Fiber (g)", "fiber", "#34d399"]].map(([l, k, co]) => (
                    <div key={k} className="fld"><div className="fl" style={{ color: co }}>{l}</div><NumInput value={nn[k] || 0} color={co} onChange={v => updateN(k, v)} /></div>
                  ))}
                </div>
              </div>
              <div className="card" style={{ marginBottom: 14 }}>
                <div className="card-title">Meal Plan Totals</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {[["Total Protein", totP + "g", "var(--purple)"], ["Total Carbs", totC + "g", "var(--orange)"], ["Total Fats", totF + "g", "var(--red)"], ["Total Fiber", totFib + "g", "#34d399"], ["Total Calories", totCal + " kcal", "var(--green)"]].map(([l, v, co]) => (
                    <div key={l} style={{ background: "var(--s2)", borderRadius: 10, padding: "12px 14px", border: "1px solid var(--border)" }}>
                      <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 20, fontWeight: 800, color: co }}>{v}</div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", marginTop: 4 }}>{l}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="card">
                <div className="card-title">Per Meal Breakdown</div>
                <table className="tbl">
                  <thead><tr><th>Meal</th><th>Time</th><th style={{ color: "var(--green)" }}>Kcal</th><th style={{ color: "var(--purple)" }}>P</th><th style={{ color: "var(--orange)" }}>C</th><th style={{ color: "var(--red)" }}>F</th><th style={{ color: "#34d399" }}>Fib</th></tr></thead>
                  <tbody>
                    {mealPlan.map((meal, mi) => {
                      const mp = meal.items.reduce((a, i) => a + (i.protein || 0), 0); const mc = meal.items.reduce((a, i) => a + (i.carbs || 0), 0);
                      const mf = meal.items.reduce((a, i) => a + (i.fats || 0), 0); const mfib = meal.items.reduce((a, i) => a + (i.fiber || 0), 0);
                      const mcal = meal.items.reduce((a, i) => a + (i.cal || 0), 0);
                      return (<tr key={mi}><td style={{ fontWeight: 600 }}>{meal.name}</td><td style={{ color: "var(--muted)", fontSize: 12 }}>{meal.time}</td><td style={{ fontWeight: 700, color: "var(--green)" }}>{mcal}</td><td style={{ color: "var(--purple)" }}>{mp}</td><td style={{ color: "var(--orange)" }}>{mc}</td><td style={{ color: "var(--red)" }}>{mf}</td><td style={{ color: "#34d399" }}>{mfib}</td></tr>);
                    })}
                    <tr style={{ borderTop: "2px solid var(--border2)" }}><td style={{ fontWeight: 800, color: "var(--green)" }}>TOTAL</td><td></td><td style={{ fontWeight: 800, color: "var(--green)" }}>{totCal}</td><td style={{ fontWeight: 800, color: "var(--purple)" }}>{totP}</td><td style={{ fontWeight: 800, color: "var(--orange)" }}>{totC}</td><td style={{ fontWeight: 800, color: "var(--red)" }}>{totF}</td><td style={{ fontWeight: 800, color: "#34d399" }}>{totFib}</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          );
        })()}

        {/* SOURCES */}
        {innerTab === "sources" && (() => {
          const sources = sel.foodSources || {};
          return (
            <div className="card">
              <div className="card-title">{sel.name} Food Sources</div>
              <SourcesTablePanel sources={sel.foodSources || null} />
              {[["protein", "Protein Sources", "var(--purple)"], ["carbs", "Carb Sources", "var(--orange)"], ["fats", "Fat Sources", "var(--red)"]].map(([type, label, color]) => (
                <div key={type} style={{ marginBottom: 18 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color, marginBottom: 8 }}>{label}</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 8 }}>
                    {[0, 1, 2, 3, 4].map(i => {
                      const val = (sources[type] || [])[i];
                      return (<div key={i} style={{ background: "var(--s2)", borderRadius: 9, padding: "10px 12px", border: "1px solid " + (val ? color + "55" : "var(--border)"), textAlign: "center" }}><div style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", marginBottom: 4 }}>{"#" + (i + 1)}</div><div style={{ fontWeight: 600, fontSize: 13, color: val ? color : "var(--muted)" }}>{val || "-"}</div></div>);
                    })}
                  </div>
                </div>
              ))}
            </div>
          );
        })()}

        {/* MEALS */}
        {innerTab === "meals" && (() => {
          const mealPlan = sel.mealPlan || DEFAULT_MEALS;
          return (
            <div className="card">
              <div className="card-title">Meal Plan - {sel.name}<button className="btn btn-p btn-sm" style={{ marginLeft: 8 }} onClick={() => setShowMealEditor(true)}>Edit Plan</button></div>
              <div className="alert alert-g">Changes auto-save as you type!</div>
              <SourcesTablePanel sources={clientSources} />
              {mealPlan.map((meal, mi) => (
                <div key={mi} className="meal-card">
                  <div className="meal-head"><div><span style={{ fontWeight: 700 }}>{meal.name}</span><span style={{ fontSize: 12, color: "var(--muted)", marginLeft: 8 }}>{meal.time}</span></div><span className="bdg bdg-g">{meal.items.reduce((a, i) => a + (i.cal || 0), 0)} kcal</span></div>
                  <div className="meal-body">
                    {meal.items.map((item, ii) => (
                      <div key={ii} className="food-row">
                        <div><span style={{ fontWeight: 600 }}>{item.food}</span><span style={{ color: "var(--muted)", fontSize: 12, marginLeft: 6 }}>{item.amount}</span></div>
                        <div style={{ display: "flex", gap: 8, fontSize: 12, flexWrap: "wrap", justifyContent: "flex-end" }}>
                          <span style={{ color: "var(--purple)" }}>{item.protein}g P</span><span style={{ color: "var(--orange)" }}>{item.carbs}g C</span>
                          <span style={{ color: "var(--red)" }}>{item.fats}g F</span><span style={{ color: "#34d399" }}>{item.fiber || 0}g Fib</span>
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
        })()}

        {showWorkoutEditor && <WorkoutEditor plan={sel.workoutPlan || DEFAULT_WORKOUT} onSave={() => { }} onClose={() => setShowWorkoutEditor(false)} autoSave={autoSaveWorkout} />}
        {showMealEditor && <MealEditor plan={sel.mealPlan || DEFAULT_MEALS} onSave={() => { }} onClose={() => setShowMealEditor(false)} clientSources={sel.foodSources || null} autoSave={autoSaveMeals} />}
        {videoModal && <VideoModal url={videoModal.videoUrl} name={videoModal.name} onClose={() => setVideoModal(null)} />}
        {viewMedia && (
          <div className="ov" onClick={() => setViewMedia(null)}>
            <div style={{ maxWidth: 520, width: "100%" }}>
              {viewMedia.type === "video" ? <video src={viewMedia.url} controls style={{ width: "100%", borderRadius: 16 }} /> : <img src={viewMedia.url} alt="" style={{ width: "100%", borderRadius: 16 }} />}
              <div style={{ textAlign: "center", marginTop: 10, color: "var(--muted2)", fontSize: 13 }}>{sel.name} - {viewMedia.date}</div>
              <div style={{ textAlign: "center", marginTop: 8 }}><button className="btn btn-s btn-sm" onClick={() => setViewMedia(null)}>Close</button></div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // CLIENTS LIST
  if (tab === "clients") return (
    <div className="page">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div><div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 22, fontWeight: 800 }}>My Clients</div><div style={{ color: "var(--muted)", fontSize: 13, marginTop: 3 }}>{clients.length} active</div></div>
        <button className="btn btn-p" onClick={() => setShowAdd(true)}>+ Add Client</button>
      </div>
      {clients.length === 0
        ? <div className="card"><div className="empty"><div className="empty-icon">+</div><div className="empty-title">No clients yet</div><button className="btn btn-p" onClick={() => setShowAdd(true)}>+ Add Client</button></div></div>
        : <div className="card">
          <table className="tbl">
            <thead><tr><th>Client</th><th>Phase</th><th>Weight</th><th>Check-ins</th><th>Daily</th><th>Media</th><th>Actions</th></tr></thead>
            <tbody>
              {clients.map(c => {
                const todayDaily = (c.dailyCheckins || []).find(dc => dc.date === new Date().toLocaleDateString("en-IN"));
                return (
                  <tr key={c.id}>
                    <td><div style={{ display: "flex", alignItems: "center", gap: 9 }}><div className="av av-sm av-g">{c.avatar}</div><div><div style={{ fontWeight: 600 }}>{c.name}</div><div style={{ fontSize: 11, color: "var(--muted)" }}>{c.email}</div></div></div></td>
                    <td><span className="bdg bdg-g">{c.phase}</span></td>
                    <td style={{ fontWeight: 600 }}>{c.weight ? c.weight + "kg" : "-"}</td>
                    <td><span className="bdg bdg-p">{(c.checkIns || []).length}</span></td>
                    <td>{todayDaily ? <span className="bdg bdg-g">Done</span> : <span className="bdg bdg-r">Pending</span>}</td>
                    <td><span className="bdg bdg-o">{(c.photos || []).length}</span></td>
                    <td><div style={{ display: "flex", gap: 5 }}>
                      <button className="btn btn-s btn-sm" onClick={() => { setSelId(c.id); setInnerTab("overview"); }}>View</button>
                      <button className="btn btn-s btn-sm" onClick={() => { setSelId(c.id); setInnerTab("meals"); }}>Meals</button>
                      <button className="btn btn-s btn-sm" onClick={() => { setSelId(c.id); setInnerTab("workout"); }}>Workout</button>
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
            <div className="mh"><div><div className="mt">Add New Client</div><div className="ms">Creates login - share via WhatsApp</div></div><button className="xbtn" onClick={() => setShowAdd(false)}>X</button></div>
            <div className="mb2">
              <div className="sec-lbl">Client Info</div>
              <div className="fg">
                <div className="fld"><div className="fl">Full Name</div><input className="fi" placeholder="Rahul Kumar" value={nc.name} onChange={e => setNc(p => ({ ...p, name: e.target.value }))} /></div>
                <div className="fld"><div className="fl">Phone</div><input className="fi" placeholder="+91 98765 43210" value={nc.phone} onChange={e => setNc(p => ({ ...p, phone: e.target.value }))} /></div>
              </div>
              <div className="sec-lbl">Login Credentials</div>
              <div className="fg">
                <div className="fld"><div className="fl">Email</div><input className="fi" type="email" placeholder="rahul@gmail.com" value={nc.email} onChange={e => setNc(p => ({ ...p, email: e.target.value }))} /></div>
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
        <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 26, fontWeight: 800 }}>Welcome, {coachName?.split(" ")[0] || "Ankit"}</div>
        <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 5 }}>{clients.length} client{clients.length !== 1 ? "s" : ""} - Fit with Ankit Dashboard</div>
      </div>
      <div className="g4" style={{ marginBottom: 24 }}>
        {[["Total Clients", clients.length, "var(--green)"], ["Total Check-ins", clients.reduce((a, c) => a + (c.checkIns || []).length, 0), "var(--blue)"], ["Daily Logs Today", clients.filter(c => (c.dailyCheckins || []).some(dc => dc.date === new Date().toLocaleDateString("en-IN"))).length, "var(--purple)"], ["Need Attention", clients.filter(c => !c.coachMessage).length, "var(--orange)"]].map(([l, v, co]) => (
          <div key={l} className="mc"><div className="mc-val" style={{ color: co }}>{v}</div><div className="mc-label">{l}</div></div>
        ))}
      </div>
      {clients.length === 0
        ? <div className="card"><div className="empty"><div className="empty-icon">+</div><div className="empty-title">Ready to go!</div><div className="empty-desc">Add your first client to get started.</div><button className="btn btn-p" style={{ padding: "11px 24px" }} onClick={() => setTab("clients")}>+ Add First Client</button></div></div>
        : <>
          <div className="sh"><div className="sh-title">Clients</div><button className="sh-link" onClick={() => setTab("clients")}>Manage all</button></div>
          <div className="ga">
            {clients.map(c => {
              const todayDaily = (c.dailyCheckins || []).find(dc => dc.date === new Date().toLocaleDateString("en-IN"));
              return (
                <div key={c.id} className="cl-card" onClick={() => { setTab("clients"); setSelId(c.id); setInnerTab("overview"); }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 12 }}>
                    <div className="av av-md av-g">{c.avatar}</div>
                    <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 700, fontSize: 14 }}>{c.name}</div><div style={{ fontSize: 11, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.email}</div></div>
                    <span className="bdg bdg-g">W{c.week}</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
                    <div style={{ padding: "8px 10px", background: "var(--s2)", borderRadius: 9, border: "1px solid var(--border)" }}><div style={{ fontSize: 13, fontWeight: 700, color: "var(--green)", fontFamily: "'Outfit',sans-serif" }}>{c.weight ? c.weight + "kg" : "-"}</div><div style={{ fontSize: 10, color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", marginTop: 2 }}>Weight</div></div>
                    <div style={{ padding: "8px 10px", background: "var(--s2)", borderRadius: 9, border: "1px solid var(--border)" }}><div style={{ fontSize: 13, fontWeight: 700, color: "var(--purple)", fontFamily: "'Outfit',sans-serif" }}>{(c.checkIns || []).length} logs</div><div style={{ fontSize: 10, color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", marginTop: 2 }}>Check-ins</div></div>
                  </div>
                  <div style={{ padding: "7px 10px", background: todayDaily ? "var(--green-bg)" : "rgba(251,191,36,.08)", borderRadius: 8, fontSize: 11, color: todayDaily ? "var(--green)" : "var(--yellow)", fontWeight: 600, border: "1px solid " + (todayDaily ? "var(--green-b)" : "rgba(251,191,36,.2)") }}>
                    {todayDaily ? "Daily check-in done today" : "No daily check-in today"}
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
      if (cSnap.exists()) { onLogin({ uid, email: em.trim(), role: "client", ...cSnap.data() }); return; }
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
      <div className="auth-logo">FwA</div><div className="auth-title">Reset Password</div><div className="auth-sub">Enter your email for a reset link</div>
      {forgotSent
        ? <div className="alert alert-g" style={{ textAlign: "center", padding: 20 }}>Reset email sent!<div style={{ marginTop: 14 }}><button className="btn btn-s" onClick={() => { setShowForgot(false); setForgotSent(false); setForgotEm(""); }}>Back to Login</button></div></div>
        : <><div className="fld"><div className="fl">Email</div><input className="fi" type="email" placeholder="your@email.com" value={forgotEm} onChange={e => setForgotEm(e.target.value)} onKeyDown={e => e.key === "Enter" && sendReset()} /></div>
          {err && <div className="alert alert-e">{err}</div>}
          <button className="auth-btn" onClick={sendReset} disabled={forgotLd || !forgotEm}>{forgotLd ? "Sending..." : "Send Reset Email"}</button>
          <div className="auth-switch"><button onClick={() => setShowForgot(false)}>Back to Login</button></div></>}
    </div></div>
  );

  return (
    <div className="auth-wrap"><div className="auth-card">
      <div className="auth-logo">FwA</div><div className="auth-title">Fit with Ankit</div><div className="auth-sub">Your personalised coaching platform</div>
      <div className="fld"><div className="fl">Email</div><input className="fi" type="email" placeholder="your@email.com" value={em} onChange={e => setEm(e.target.value)} onKeyDown={e => e.key === "Enter" && login()} /></div>
      <div className="fld"><div className="fl">Password</div><input className="fi" type="password" placeholder="password" value={pw} onChange={e => setPw(e.target.value)} onKeyDown={e => e.key === "Enter" && login()} /></div>
      {err && <div className="alert alert-e">{err}</div>}
      <button className="auth-btn" onClick={login} disabled={ld}>{ld ? "Signing in..." : "Sign In"}</button>
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
      <div className="auth-logo">FwA</div><div className="auth-title">Setup Fit with Ankit</div><div className="auth-sub">Create your coach account - one time setup</div>
      <div className="fld"><div className="fl">Full Name</div><input className="fi" placeholder="Ankit" value={f.name} onChange={e => setF(p => ({ ...p, name: e.target.value }))} /></div>
      <div className="fld"><div className="fl">Email</div><input className="fi" type="email" placeholder="ankit@email.com" value={f.email} onChange={e => setF(p => ({ ...p, email: e.target.value }))} /></div>
      <div className="fld"><div className="fl">Password</div><input className="fi" type="password" placeholder="min 6 characters" value={f.pass} onChange={e => setF(p => ({ ...p, pass: e.target.value }))} onKeyDown={e => e.key === "Enter" && create()} /></div>
      {err && <div className="alert alert-e">{err}</div>}
      <button className="auth-btn" onClick={create} disabled={ld}>{ld ? "Creating..." : "Create Coach Account"}</button>
      <div style={{ textAlign: "center", marginTop: 14, fontSize: 11, color: "var(--muted)" }}>After setup, only clients can register via your invitation.</div>
    </div></div>
  );
}

// ─── ROOT APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const { t, show } = useToast();
  const [user, setUser] = useState(null); const [authLoading, setAuthLoading] = useState(true);
  const [coachExists, setCoachExists] = useState(false); const [screen, setScreen] = useState("login"); const [tab, setTab] = useState("home");

  useEffect(() => {
    const check = async () => { try { const s = await getDoc(doc(db, "settings", "app")); if (s.exists() && s.data().coachExists) setCoachExists(true); } catch {} };
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

  if (authLoading) return <div style={{ background: "var(--bg)" }}><style>{CSS}</style><div className="spin-wrap" style={{ minHeight: "100vh" }}><div className="spinner" /><span>Loading Fit with Ankit...</span></div></div>;

  if (!user) return (
    <div><style>{CSS}</style>
      {screen === "setup" ? <SetupScreen onDone={u => { setUser(u); setCoachExists(true); }} /> : <LoginScreen onLogin={setUser} onSetup={() => setScreen("setup")} coachExists={coachExists} />}
      {t && <div className={t.type === "error" ? "toast toast-e" : "toast toast-s"}>{t.msg}</div>}
    </div>
  );

  const isCoach = user.role === "coach";
  const tabs = isCoach
    ? [["home", "Dashboard"], ["clients", "Clients"], ["analytics", "Analytics"]]
    : [["home", "Home"], ["checkin", "Daily Check-in"], ["nutrition", "Nutrition"], ["sources", "My Sources"], ["training", "Training"], ["photos", "Photos"], ["comparison", "Compare"]];

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
