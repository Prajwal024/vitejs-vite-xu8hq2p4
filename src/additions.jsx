import { useState, useEffect, useRef } from "react";
import { doc, updateDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "./firebase";


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

const DEFAULT_MEALS_AC = [
  { name: "Breakfast",   time: "7:00 AM",  items: [{ food: "Oats", amount: "80g", protein: 10, carbs: 54, fats: 5, fiber: 8, cal: 300 }, { food: "Whey Protein", amount: "1 scoop", protein: 25, carbs: 3, fats: 2, fiber: 0, cal: 130 }] },
  { name: "Lunch",       time: "1:00 PM",  items: [{ food: "Chicken Breast", amount: "200g", protein: 46, carbs: 0, fats: 4, fiber: 0, cal: 220 }, { food: "Brown Rice", amount: "150g", protein: 4, carbs: 47, fats: 1, fiber: 3, cal: 210 }] },
  { name: "Pre-Workout", time: "5:00 PM",  items: [{ food: "Banana", amount: "1 large", protein: 1, carbs: 31, fats: 0, fiber: 3, cal: 120 }] },
  { name: "Dinner",      time: "8:00 PM",  items: [{ food: "Eggs", amount: "4 whole", protein: 24, carbs: 2, fats: 20, fiber: 0, cal: 280 }, { food: "Sweet Potato", amount: "200g", protein: 3, carbs: 40, fats: 0, fiber: 6, cal: 172 }] },
];

const DEFAULT_WORKOUT_AC = [
  { day: "Monday",    type: "Push", exercises: [{ name: "Bench Press",      sets: 4, reps: "8-10",  rest: "90s",  videoUrl: "", note: "" }] },
  { day: "Tuesday",   type: "Pull", exercises: [{ name: "Pull-ups",         sets: 4, reps: "8-10",  rest: "90s",  videoUrl: "", note: "" }] },
  { day: "Wednesday", type: "Rest", exercises: [] },
  { day: "Thursday",  type: "Legs", exercises: [{ name: "Back Squat",       sets: 4, reps: "6-8",   rest: "120s", videoUrl: "", note: "" }] },
  { day: "Friday",    type: "Push", exercises: [{ name: "Incline DB Press", sets: 4, reps: "10-12", rest: "90s",  videoUrl: "", note: "" }] },
  { day: "Saturday",  type: "Pull", exercises: [{ name: "Deadlift",         sets: 4, reps: "4-6",   rest: "120s", videoUrl: "", note: "" }] },
  { day: "Sunday",    type: "Rest", exercises: [] },
];

const MEASUREMENT_FIELDS = [
  { key: "waist",  label: "Waist",  color: "var(--purple)" },
  { key: "neck",   label: "Neck",   color: "var(--blue)"   },
  { key: "chest",  label: "Chest",  color: "var(--green)"  },
  { key: "calves", label: "Calves", color: "var(--orange)" },
  { key: "thighs", label: "Thighs", color: "var(--red)"    },
  { key: "arms",   label: "Arms",   color: "var(--yellow)" },
];

// ── 5 POSES ──────────────────────────────────────────────────────────────────
export const POSES = [
  { key: "Front",              label: "Front",              emoji: "🔵", short: "FR"  },
  { key: "Back",               label: "Back",               emoji: "🟢", short: "BK"  },
  { key: "Side",               label: "Side",               emoji: "🟡", short: "SD"  },
  { key: "Front Double Biceps",label: "Front Double Biceps",emoji: "🔴", short: "FDB" },
  { key: "Back Double Biceps", label: "Back Double Biceps", emoji: "🟣", short: "BDB" },
];

export const CSS_ADDITIONS = `
/* ── MEAL CAT TABS ── */
.meal-cat-tabs{display:flex;gap:6px;margin-bottom:16px;flex-wrap:wrap}
.meal-cat-btn{padding:7px 16px;border-radius:20px;border:1.5px solid var(--border);background:var(--s1);cursor:pointer;font-family:'Outfit',sans-serif;font-weight:700;font-size:12px;color:var(--muted);transition:all .18s;display:flex;align-items:center;gap:6px}
.meal-cat-btn.active{border-color:var(--green);background:var(--green-bg);color:var(--green)}
.meal-cat-btn .cat-cal{font-size:10px;font-weight:600;opacity:.75}
.cal-ring-wrap{display:flex;align-items:center;gap:14px;margin-bottom:14px}
.cal-ring{position:relative;flex-shrink:0}
.cal-ring svg{transform:rotate(-90deg)}
.cal-ring-inner{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}
.deficit-bar-wrap{flex:1}
.deficit-label{font-size:12px;font-weight:700;margin-bottom:6px}
.deficit-bar{height:10px;border-radius:5px;background:var(--border);overflow:hidden;margin-bottom:4px}
.deficit-fill{height:100%;border-radius:5px;transition:width .8s cubic-bezier(.4,0,.2,1)}
.macro-pills{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
.macro-pill{padding:5px 12px;border-radius:20px;font-size:11px;font-weight:700;border:1px solid;display:flex;align-items:center;gap:5px}

/* ── PROFILE PANEL ── */
.profile-panel-overlay{position:fixed;inset:0;z-index:400;display:flex;justify-content:flex-end}
.profile-panel-bg{position:absolute;inset:0;background:rgba(0,0,0,.55);backdrop-filter:blur(4px)}
.profile-panel{position:relative;width:360px;max-width:95vw;height:100vh;background:var(--s1);border-left:1px solid var(--border2);overflow-y:auto;display:flex;flex-direction:column;padding-bottom:40px}
.profile-panel-hdr{padding:20px 22px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;background:var(--s1);z-index:10}
.profile-av-lg{width:64px;height:64px;border-radius:50%;background:var(--green-bg);border:2px solid var(--green-b);display:flex;align-items:center;justify-content:center;font-family:'Outfit',sans-serif;font-weight:900;font-size:22px;color:var(--green);flex-shrink:0}
.profile-row{padding:8px 22px;display:flex;gap:10px;border-bottom:1px solid var(--border);align-items:center}
.profile-row:last-child{border-bottom:none}
.profile-row-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--muted);min-width:80px;flex-shrink:0}
.profile-row-val{font-size:13px;font-weight:600;color:var(--text)}

/* ── MY PROFILE PAGE — mobile-safe ── */
.profile-page-outer{
  display:flex;flex-direction:column;
  height:100dvh;
  padding-top:env(safe-area-inset-top);
  overflow:hidden;
}
.profile-page-scroll{
  flex:1;
  overflow-y:auto;
  -webkit-overflow-scrolling:touch;
  padding:20px 16px calc(100px + env(safe-area-inset-bottom));
  overscroll-behavior:contain;
}
.profile-page-section{background:var(--s1);border:1px solid var(--border);border-radius:var(--r);padding:18px;margin-bottom:16px;animation:cardEntrance .4s ease both}
.profile-page-title{font-family:'Outfit',sans-serif;font-weight:700;font-size:15px;margin-bottom:14px;display:flex;align-items:center;gap:8px}
.meas-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
.meas-card{background:var(--s2);border:1px solid var(--border);border-radius:10px;padding:12px;text-align:center;transition:border-color .2s}
.meas-card:hover{border-color:var(--border2)}
.meas-val{font-family:'Outfit',sans-serif;font-size:22px;font-weight:800;line-height:1}
.meas-label{font-size:10px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.07em;margin-top:4px}
.time-picker{display:flex;align-items:center;gap:10px}
.time-picker input[type=time]{background:var(--s2);border:1.5px solid var(--border);border-radius:9px;color:var(--text);font-family:'DM Sans',sans-serif;font-size:14px;padding:8px 12px;outline:none;transition:border .18s}
.time-picker input[type=time]:focus{border-color:var(--green)}
.bool-toggle{display:flex;align-items:center;gap:12px}
.bool-toggle input[type=checkbox]{width:18px;height:18px;accent-color:var(--green);cursor:pointer}
.bool-toggle label{font-size:13px;font-weight:600;color:var(--text);cursor:pointer}
.pdf-export-btn{background:linear-gradient(135deg,#3b82f6,#1d4ed8);color:#fff;border:none;border-radius:var(--r);padding:11px 20px;font-family:'Outfit',sans-serif;font-weight:700;font-size:14px;cursor:pointer;display:inline-flex;align-items:center;gap:8px;box-shadow:0 4px 14px rgba(59,130,246,.3);transition:all .2s}
.pdf-export-btn:hover{transform:translateY(-2px);box-shadow:0 6px 20px rgba(59,130,246,.4)}
.pdf-export-btn:disabled{opacity:.5;cursor:not-allowed;transform:none}
.plan-option{padding:14px;border-radius:12px;border:2px solid var(--border);background:var(--s2);cursor:pointer;transition:all .18s;text-align:left;width:100%}
.plan-option.selected{border-color:var(--green);background:var(--green-bg)}
.plan-option-title{font-family:'Outfit',sans-serif;font-weight:700;font-size:14px;color:var(--text)}
.plan-option-desc{font-size:11px;color:var(--muted);margin-top:3px}
.log-input-row{display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--border)}
.log-input-row:last-child{border-bottom:none}

/* ── POSE GRID (client upload) ── */
.pose-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:10px}
@media(max-width:700px){
  .pose-grid{grid-template-columns:1fr 1fr;gap:8px}
  .meas-grid{grid-template-columns:1fr 1fr}
  .profile-page-outer{height:calc(100dvh - 52px - env(safe-area-inset-bottom))}
}

/* ── PROFILE PHOTO UPLOAD ── */
.profile-photo-wrap{position:relative;display:inline-flex;align-items:center;justify-content:center}
.profile-photo-upload-btn{position:absolute;bottom:-4px;right:-4px;width:22px;height:22px;border-radius:50%;background:var(--green);border:2px solid var(--bg);display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:11px;transition:transform .2s;z-index:2}
.profile-photo-upload-btn:hover{transform:scale(1.15)}
`;

// ═══════════════════════════════════════════════════════════════════════════════
// ENHANCED FOOD LOG
// ═══════════════════════════════════════════════════════════════════════════════
export function EnhancedFoodLogSection({ uid, d, toast, targetNutrition, mealPlan }) {
  const today = new Date().toLocaleDateString("en-IN");
  const meals = mealPlan || DEFAULT_MEALS_AC;

  const getTodayMealLogs = (mealLogs) => {
    if (!mealLogs) return {};
    if (Array.isArray(mealLogs)) return mealLogs.find(l => l.date === today)?.mealData || {};
    return mealLogs[today]?.mealData || {};
  };

  const [mealLogs, setMealLogs] = useState(() => getTodayMealLogs(d.foodLogs));
  const [activeMeal, setActiveMeal] = useState(null);
  const [inputVals, setInputVals] = useState({ cal: "", protein: "", carbs: "", fats: "" });
  const [saving, setSaving] = useState(false);
  const [mfpTab, setMfpTab] = useState("calories");

  useEffect(() => { setMealLogs(getTodayMealLogs(d.foodLogs)); }, [d.foodLogs]);

  const goalCal     = targetNutrition?.calories || meals.flatMap(m => m.items).reduce((a, i) => a + (i.cal || 0), 0) || 2000;
  const goalProtein = targetNutrition?.protein  || 0;
  const goalCarbs   = targetNutrition?.carbs    || 0;
  const goalFats    = targetNutrition?.fats     || 0;

  const loggedCal     = Object.values(mealLogs).reduce((a, m) => a + (parseFloat(m?.cal)     || 0), 0);
  const loggedProtein = Object.values(mealLogs).reduce((a, m) => a + (parseFloat(m?.protein) || 0), 0);
  const loggedCarbs   = Object.values(mealLogs).reduce((a, m) => a + (parseFloat(m?.carbs)   || 0), 0);
  const loggedFats    = Object.values(mealLogs).reduce((a, m) => a + (parseFloat(m?.fats)    || 0), 0);

  const diff      = loggedCal - goalCal;
  const isSurplus = diff > 50;
  const isDeficit = diff < -50;
  const pct       = goalCal > 0 ? Math.min(Math.round((loggedCal / goalCal) * 100), 150) : 0;
  const statusColor = isSurplus ? "var(--red)" : isDeficit ? "var(--orange)" : loggedCal > 0 ? "var(--green)" : "var(--muted)";
  const statusLabel = loggedCal === 0 ? "Nothing logged yet" : isSurplus ? `+${diff} kcal surplus` : isDeficit ? `${Math.abs(diff)} kcal deficit` : "On target ✅";

  const openMeal = (meal) => {
    const existing = mealLogs[meal.name] || {};
    const planCal     = meal.items.reduce((a, i) => a + (i.cal || 0), 0);
    const planProtein = meal.items.reduce((a, i) => a + (i.protein || 0), 0);
    const planCarbs   = meal.items.reduce((a, i) => a + (i.carbs || 0), 0);
    const planFats    = meal.items.reduce((a, i) => a + (i.fats || 0), 0);
    setInputVals({ cal: existing.cal ?? planCal, protein: existing.protein ?? planProtein, carbs: existing.carbs ?? planCarbs, fats: existing.fats ?? planFats });
    setActiveMeal(meal.name);
  };

  const saveMealLog = async () => {
    if (!activeMeal) return;
    setSaving(true);
    const updated = { ...mealLogs, [activeMeal]: { cal: parseFloat(inputVals.cal) || 0, protein: parseFloat(inputVals.protein) || 0, carbs: parseFloat(inputVals.carbs) || 0, fats: parseFloat(inputVals.fats) || 0, loggedAt: new Date().toISOString() } };
    setMealLogs(updated);
    const existingLogs = Array.isArray(d.foodLogs) ? d.foodLogs : [];
    const todayEntry   = existingLogs.find(l => l.date === today) || { date: today, items: [] };
    await updateDoc(doc(db, "clients", uid), { foodLogs: [...existingLogs.filter(l => l.date !== today), { ...todayEntry, mealData: updated }] });
    toast(`${activeMeal} logged!`, "success");
    setActiveMeal(null); setSaving(false);
  };

  const clearMealLog = async (mealName) => {
    const updated = { ...mealLogs };
    delete updated[mealName];
    setMealLogs(updated);
    const existingLogs = Array.isArray(d.foodLogs) ? d.foodLogs : [];
    const todayEntry   = existingLogs.find(l => l.date === today) || { date: today, items: [] };
    await updateDoc(doc(db, "clients", uid), { foodLogs: [...existingLogs.filter(l => l.date !== today), { ...todayEntry, mealData: updated }] });
    toast("Log cleared", "success");
  };

  const MEAL_COLORS = ["#3b82f6", "#a78bfa", "#fb923c", "#22c55e", "#f87171", "#fbbf24"];
  const svgR = 60; const svgCirc = 2 * Math.PI * svgR;

  const calSlices = (() => {
    const logged = meals.filter(m => mealLogs[m.name]?.cal > 0);
    if (logged.length === 0) return [];
    const total = logged.reduce((a, m) => a + (mealLogs[m.name]?.cal || 0), 0) || 1;
    let offset = 0;
    return logged.map((m, i) => {
      const idx  = meals.indexOf(m);
      const cal  = mealLogs[m.name]?.cal || 0;
      const dash = (cal / total) * svgCirc;
      const slice = { dash, offset, color: MEAL_COLORS[idx % MEAL_COLORS.length], name: m.name, cal };
      offset += dash;
      return slice;
    });
  })();

  const macroData = [
    { label: "Protein", val: loggedProtein, goal: goalProtein, color: "var(--purple)", calVal: loggedProtein * 4 },
    { label: "Carbs",   val: loggedCarbs,   goal: goalCarbs,   color: "var(--orange)", calVal: loggedCarbs * 4   },
    { label: "Fat",     val: loggedFats,    goal: goalFats,    color: "var(--red)",    calVal: loggedFats * 9    },
  ];
  const macroTotal  = macroData.reduce((a, m) => a + m.calVal, 0) || 1;
  const macroSlices = (() => {
    let offset = 0;
    return macroData.map(m => {
      const dash  = (m.calVal / macroTotal) * svgCirc;
      const slice = { dash, offset, color: m.color };
      offset += dash;
      return slice;
    });
  })();

  const nutrients = [
    { label: "Calories",      logged: loggedCal,     goal: goalCal,     color: "var(--green)"  },
    { label: "Protein",       logged: loggedProtein, goal: goalProtein, color: "var(--purple)" },
    { label: "Carbohydrates", logged: loggedCarbs,   goal: goalCarbs,   color: "var(--orange)" },
    { label: "Fat",           logged: loggedFats,    goal: goalFats,    color: "var(--red)"    },
  ];
  const logsCount = Object.keys(mealLogs).length;

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ background: "rgba(59,130,246,.08)", border: "1px solid rgba(59,130,246,.25)", borderRadius: 12, padding: "12px 16px", marginBottom: 14, display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div style={{ fontSize: 22, flexShrink: 0 }}>💡</div>
        <div>
          <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: 13, color: "var(--blue)", marginBottom: 4 }}>How to log your food</div>
          <div style={{ fontSize: 12, color: "var(--muted2)", lineHeight: 1.6 }}>Log your meals in <strong style={{ color: "var(--text)" }}>MyFitnessPal</strong> or <strong style={{ color: "var(--text)" }}>Cronometer</strong> for accurate Indian food data, then enter your meal totals below.</div>
          <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
            {[["MyFitnessPal", "https://www.myfitnesspal.com", "var(--blue)"], ["Cronometer", "https://cronometer.com", "var(--purple)"]].map(([name, url, color]) => (
              <a key={name} href={url} target="_blank" rel="noreferrer" style={{ padding: "4px 12px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: color + "18", color, border: "1px solid " + color + "44", textDecoration: "none" }}>Open {name} →</a>
            ))}
          </div>
        </div>
      </div>
      <div className="card" style={{ marginBottom: 14 }}>
        <div className="card-title">Today's Food Log — {today}</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
          <div style={{ background: "rgba(59,130,246,.06)", border: "1px solid rgba(59,130,246,.25)", borderRadius: 12, padding: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--blue)", textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 8 }}>📋 Coach's Plan</div>
            <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 900, fontSize: 26, color: "var(--blue)", lineHeight: 1 }}>{goalCal}<span style={{ fontSize: 12, fontWeight: 500, marginLeft: 4 }}>kcal</span></div>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 8 }}>
              {[["P", goalProtein, "var(--purple)"], ["C", goalCarbs, "var(--orange)"], ["F", goalFats, "var(--red)"]].map(([l, v, co]) => (
                <div key={l} style={{ padding: "2px 7px", borderRadius: 20, background: co + "18", color: co, border: "1px solid " + co + "44", fontSize: 11, fontWeight: 700 }}>{l} {v}g</div>
              ))}
            </div>
          </div>
          <div style={{ background: isSurplus ? "rgba(248,113,113,.06)" : isDeficit ? "rgba(251,146,60,.06)" : loggedCal > 0 ? "rgba(34,197,94,.06)" : "var(--s2)", border: "1px solid " + (isSurplus ? "rgba(248,113,113,.3)" : isDeficit ? "rgba(251,146,60,.3)" : loggedCal > 0 ? "var(--green-b)" : "var(--border)"), borderRadius: 12, padding: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: statusColor, textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 8 }}>🍽 Your Actual</div>
            <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 900, fontSize: 26, color: statusColor, lineHeight: 1 }}>{Math.round(loggedCal)}<span style={{ fontSize: 12, fontWeight: 500, marginLeft: 4 }}>kcal</span></div>
            <div style={{ fontSize: 12, fontWeight: 700, color: statusColor, marginTop: 6 }}>{statusLabel}</div>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 8 }}>
              {[["P", Math.round(loggedProtein), "var(--purple)"], ["C", Math.round(loggedCarbs), "var(--orange)"], ["F", Math.round(loggedFats), "var(--red)"]].map(([l, v, co]) => (
                <div key={l} style={{ padding: "2px 7px", borderRadius: 20, background: co + "18", color: co, border: "1px solid " + co + "44", fontSize: 11, fontWeight: 700 }}>{l} {v}g</div>
              ))}
            </div>
          </div>
        </div>
        <div style={{ height: 8, borderRadius: 4, background: "var(--border)", overflow: "hidden" }}>
          <div style={{ height: "100%", borderRadius: 4, width: Math.min(pct, 100) + "%", background: isSurplus ? "var(--red)" : isDeficit ? "var(--orange)" : "var(--green)", transition: "width .8s cubic-bezier(.4,0,.2,1)" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--muted)", marginTop: 4 }}>
          <span>0 kcal</span>
          <span style={{ color: statusColor, fontWeight: 700 }}>{pct}% of goal</span>
          <span>{goalCal} kcal</span>
        </div>
      </div>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: 14, color: "var(--muted2)", textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 10 }}>
          Log Your Meals <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 400, textTransform: "none" }}>— enter totals from MFP or Cronometer</span>
        </div>
        {meals.map((meal, mi) => {
          const planCal  = meal.items.reduce((a, i) => a + (i.cal || 0), 0);
          const logged   = mealLogs[meal.name];
          const isLogged = !!logged;
          const actualCal = logged?.cal || 0;
          const calDiff  = actualCal - planCal;
          const color    = MEAL_COLORS[mi % MEAL_COLORS.length];
          const isEditing = activeMeal === meal.name;
          return (
            <div key={mi} style={{ background: "var(--s1)", border: "1.5px solid " + (isLogged ? color + "55" : "var(--border)"), borderRadius: 12, marginBottom: 10, overflow: "hidden", transition: "border-color .2s" }}>
              <div style={{ padding: "12px 14px", background: isLogged ? color + "0a" : "var(--s2)", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}
                onClick={() => isEditing ? setActiveMeal(null) : openMeal(meal)}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: isLogged ? color : "var(--border)", flexShrink: 0 }} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{meal.name}</div>
                    <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 1 }}>{meal.time} · Plan: {planCal} kcal</div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {isLogged && (
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 800, fontSize: 16, color }}>{actualCal} kcal</div>
                      {calDiff !== 0 && <div style={{ fontSize: 10, fontWeight: 700, color: calDiff > 0 ? "var(--red)" : "var(--green)" }}>{calDiff > 0 ? "+" : ""}{calDiff} vs plan</div>}
                    </div>
                  )}
                  <div style={{ padding: "5px 12px", borderRadius: 20, fontSize: 11, fontWeight: 700, border: "1.5px solid", borderColor: isLogged ? color : "var(--border2)", background: isLogged ? color + "18" : "var(--s2)", color: isLogged ? color : "var(--muted2)" }}>
                    {isEditing ? "▲ Close" : isLogged ? "✏ Edit" : "+ Log"}
                  </div>
                </div>
              </div>
              <div style={{ padding: "8px 14px 4px", borderTop: "1px solid var(--border)" }}>
                {meal.items.map((item, ii) => (
                  <div key={ii} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "5px 0", borderBottom: ii < meal.items.length - 1 ? "1px solid var(--border)" : "none", opacity: isLogged ? 0.6 : 1 }}>
                    <span>{item.food} <span style={{ color: "var(--muted)" }}>{item.amount}</span></span>
                    <div style={{ display: "flex", gap: 8 }}>
                      <span style={{ color: "var(--purple)" }}>{item.protein}g P</span>
                      <span style={{ color: "var(--orange)" }}>{item.carbs}g C</span>
                      <span style={{ color: "var(--red)" }}>{item.fats}g F</span>
                      <span style={{ color: "var(--green)", fontWeight: 700 }}>{item.cal} kcal</span>
                    </div>
                  </div>
                ))}
              </div>
              {isEditing && (
                <div style={{ padding: 14, borderTop: "1px solid var(--border)", background: color + "06" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color, marginBottom: 10 }}>Enter what you actually ate for {meal.name}:</div>
                  <div style={{ background: "rgba(59,130,246,.06)", border: "1px solid rgba(59,130,246,.2)", borderRadius: 9, padding: "8px 12px", marginBottom: 12, fontSize: 11, color: "var(--muted2)", lineHeight: 1.5 }}>
                    💡 Log this meal in <strong style={{ color: "var(--blue)" }}>MyFitnessPal</strong> or <strong style={{ color: "var(--purple)" }}>Cronometer</strong>, then copy the totals below.
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 12 }}>
                    {[["Calories", "cal", "var(--green)"], ["Protein g", "protein", "var(--purple)"], ["Carbs g", "carbs", "var(--orange)"], ["Fats g", "fats", "var(--red)"]].map(([l, k, co]) => (
                      <div key={k}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: co, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 4 }}>{l}</div>
                        <input className="fi" type="number" value={inputVals[k] || ""} placeholder="0"
                          onChange={e => setInputVals(p => ({ ...p, [k]: e.target.value }))}
                          style={{ color: co, fontWeight: 800, textAlign: "center", padding: "10px 6px", fontSize: 15, fontFamily: "'Outfit',sans-serif" }} />
                      </div>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
                    <span style={{ fontSize: 11, color: "var(--muted)", alignSelf: "center" }}>Quick fill:</span>
                    {[50, 75, 100, 125].map(p => {
                      const pCal = meal.items.reduce((a, i) => a + (i.cal || 0), 0);
                      const pPro = meal.items.reduce((a, i) => a + (i.protein || 0), 0);
                      const pCrb = meal.items.reduce((a, i) => a + (i.carbs || 0), 0);
                      const pFat = meal.items.reduce((a, i) => a + (i.fats || 0), 0);
                      return (
                        <button key={p} onClick={() => setInputVals({ cal: Math.round(pCal * p / 100), protein: Math.round(pPro * p / 100), carbs: Math.round(pCrb * p / 100), fats: Math.round(pFat * p / 100) })}
                          style={{ padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, border: "1px solid var(--border)", background: "var(--s2)", color: "var(--muted2)", cursor: "pointer" }}>{p}%</button>
                      );
                    })}
                    <button onClick={() => {
                      const pCal = meal.items.reduce((a, i) => a + (i.cal || 0), 0);
                      const pPro = meal.items.reduce((a, i) => a + (i.protein || 0), 0);
                      const pCrb = meal.items.reduce((a, i) => a + (i.carbs || 0), 0);
                      const pFat = meal.items.reduce((a, i) => a + (i.fats || 0), 0);
                      setInputVals({ cal: pCal, protein: pPro, carbs: pCrb, fats: pFat });
                    }} style={{ padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, border: "1.5px solid var(--green-b)", background: "var(--green-bg)", color: "var(--green)", cursor: "pointer" }}>✓ Ate as planned</button>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="btn btn-p" style={{ flex: 1 }} onClick={saveMealLog} disabled={saving}>{saving ? "Saving..." : `Save ${meal.name}`}</button>
                    {isLogged && <button className="btn btn-d btn-sm" onClick={() => { setActiveMeal(null); clearMealLog(meal.name); }}>Clear</button>}
                    <button className="btn btn-s btn-sm" onClick={() => setActiveMeal(null)}>Cancel</button>
                  </div>
                </div>
              )}
              {isLogged && !isEditing && (
                <div style={{ height: 4, background: "var(--border)" }}>
                  <div style={{ height: "100%", width: Math.min((actualCal / (planCal || 1)) * 100, 130) + "%", background: calDiff > 50 ? "var(--red)" : calDiff < -50 ? "var(--orange)" : color, transition: "width .8s ease" }} />
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="card" style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", borderBottom: "1px solid var(--border)", marginBottom: 16 }}>
          {[["calories", "Calories"], ["nutrients", "Nutrients"], ["macros", "Macros"]].map(([key, label]) => (
            <button key={key} onClick={() => setMfpTab(key)} style={{ flex: 1, padding: "10px 6px", background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, color: mfpTab === key ? "var(--blue)" : "var(--muted)", borderBottom: mfpTab === key ? "2px solid var(--blue)" : "2px solid transparent", fontFamily: "'DM Sans',sans-serif" }}>{label}</button>
          ))}
        </div>
        {logsCount === 0 ? (
          <div style={{ textAlign: "center", padding: "32px 16px", color: "var(--muted)" }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>📊</div>
            <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: 15, color: "var(--text)", marginBottom: 6 }}>No data yet</div>
            <div style={{ fontSize: 13 }}>Log your meals above to see charts update.</div>
          </div>
        ) : (
          <>
            {mfpTab === "calories" && (
              <div>
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
                  <div style={{ position: "relative", width: 160, height: 160 }}>
                    <svg width="160" height="160" style={{ transform: "rotate(-90deg)" }}>
                      <circle cx="80" cy="80" r={svgR} fill="none" stroke="var(--s3)" strokeWidth="22" />
                      {calSlices.map((s, i) => s.dash > 0 && (
                        <circle key={i} cx="80" cy="80" r={svgR} fill="none" stroke={s.color} strokeWidth="22"
                          strokeDasharray={s.dash + " " + svgCirc} strokeDashoffset={-s.offset} />
                      ))}
                    </svg>
                    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                      <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 900, fontSize: 20, color: statusColor }}>{Math.round(loggedCal)}</div>
                      <div style={{ fontSize: 10, color: "var(--muted)", fontWeight: 600 }}>/ {goalCal} kcal</div>
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginBottom: 16 }}>
                  {calSlices.map((s, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12 }}>
                      <div style={{ width: 10, height: 10, borderRadius: 3, background: s.color }} />
                      <span style={{ color: "var(--muted2)" }}>{s.name}</span>
                      <span style={{ fontWeight: 700, color: s.color }}>{Math.round(s.cal)} kcal</span>
                    </div>
                  ))}
                </div>
                <div style={{ marginBottom: 16, padding: "10px 14px", borderRadius: 10, background: isSurplus ? "rgba(248,113,113,.08)" : isDeficit ? "rgba(251,146,60,.08)" : "rgba(34,197,94,.08)", border: "1px solid " + (isSurplus ? "rgba(248,113,113,.3)" : isDeficit ? "rgba(251,146,60,.3)" : "var(--green-b)") }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: statusColor }}>{statusLabel}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)" }}>{pct}%</span>
                  </div>
                  <div style={{ height: 8, borderRadius: 4, background: "var(--border)", overflow: "hidden" }}>
                    <div style={{ height: "100%", borderRadius: 4, width: Math.min(pct, 100) + "%", background: isSurplus ? "var(--red)" : isDeficit ? "var(--orange)" : "var(--green)", transition: "width .8s ease" }} />
                  </div>
                </div>
                {[["Total Calories Logged", Math.round(loggedCal), "var(--text)"], ["Goal", goalCal, "var(--muted)"], ["Remaining", goalCal - Math.round(loggedCal), goalCal - loggedCal < 0 ? "var(--red)" : "var(--green)"]].map(([label, val, color]) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--border)", fontSize: 13 }}>
                    <span style={{ color: "var(--muted2)", fontWeight: 500 }}>{label}</span>
                    <span style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 800, color }}>{val}</span>
                  </div>
                ))}
              </div>
            )}
            {mfpTab === "nutrients" && (
              <div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 80px 80px", gap: 8, padding: "0 0 8px", borderBottom: "1px solid var(--border)", marginBottom: 4 }}>
                  <div />
                  {["Logged", "Goal", "Left"].map(h => <div key={h} style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", textAlign: "right" }}>{h}</div>)}
                </div>
                {nutrients.map(n => {
                  const left = n.goal - n.logged;
                  const pctN = n.goal > 0 ? Math.min((n.logged / n.goal) * 100, 100) : 0;
                  return (
                    <div key={n.label}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 80px 80px", gap: 8, padding: "12px 0", borderBottom: "1px solid var(--border)", alignItems: "center" }}>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{n.label}</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: n.color, textAlign: "right", fontFamily: "'Outfit',sans-serif" }}>{Math.round(n.logged)}</div>
                        <div style={{ fontSize: 13, color: "var(--muted)", textAlign: "right" }}>{n.goal}</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: left < 0 ? "var(--red)" : "var(--green)", textAlign: "right", fontFamily: "'Outfit',sans-serif" }}>{Math.round(left)}{left < 0 ? " ⚠" : ""}</div>
                      </div>
                      <div style={{ height: 3, background: "var(--border)", borderRadius: 2, overflow: "hidden", marginBottom: 4 }}>
                        <div style={{ height: "100%", width: pctN + "%", background: n.color, borderRadius: 2, transition: "width .8s ease" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {mfpTab === "macros" && (
              <div>
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
                  <div style={{ position: "relative", width: 160, height: 160 }}>
                    <svg width="160" height="160" style={{ transform: "rotate(-90deg)" }}>
                      <circle cx="80" cy="80" r={svgR} fill="none" stroke="var(--s3)" strokeWidth="22" />
                      {macroSlices.map((s, i) => s.dash > 0 && (
                        <circle key={i} cx="80" cy="80" r={svgR} fill="none" stroke={s.color} strokeWidth="22"
                          strokeDasharray={s.dash + " " + svgCirc} strokeDashoffset={-s.offset} />
                      ))}
                    </svg>
                    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                      <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 900, fontSize: 16, color: "var(--text)" }}>{Math.round(loggedCal)}</div>
                      <div style={{ fontSize: 10, color: "var(--muted)" }}>kcal logged</div>
                    </div>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
                  {macroData.map(m => {
                    const pctM = m.goal > 0 ? Math.min((m.val / m.goal) * 100, 100) : 0;
                    return (
                      <div key={m.label} style={{ background: "var(--s2)", borderRadius: 12, padding: 12, border: "1px solid var(--border)", textAlign: "center" }}>
                        <div style={{ width: 10, height: 10, borderRadius: "50%", background: m.color, margin: "0 auto 8px" }} />
                        <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 800, fontSize: 18, color: m.color }}>{Math.round(m.val)}g</div>
                        <div style={{ fontSize: 10, color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", marginBottom: 4 }}>{m.label}</div>
                        <div style={{ fontSize: 10, color: "var(--muted)" }}>Goal: {m.goal}g</div>
                        <div style={{ height: 4, borderRadius: 2, background: "var(--border)", marginTop: 6, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: pctM + "%", background: m.color, borderRadius: 2, transition: "width .8s ease" }} />
                        </div>
                        <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 4 }}>{Math.round(m.calVal)} kcal</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════════
// CLIENT PROFILE PANEL  (coach side-panel — now shows client photo)
// ═══════════════════════════════════════════════════════════════════════════════
export function ClientProfilePanel({ d, onClose }) {
  const n = d.nutrition || {};
  const initials = d.name?.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  const sleepInfo = (() => {
    if (!d.wakeTime || !d.sleepTime) return null;
    const [wH, wM] = d.wakeTime.split(":").map(Number);
    const [sH, sM] = d.sleepTime.split(":").map(Number);
    const wakeMin = wH * 60 + wM; const sleepMin = sH * 60 + sM;
    const total = wakeMin > sleepMin ? wakeMin - sleepMin : (1440 - sleepMin + wakeMin);
    const hrs = Math.floor(total / 60); const mins = total % 60;
    let color, msg, emoji;
    if (hrs < 6)       { color = "var(--red)";    msg = "Critical! Less than 6hrs."; emoji = "🚨"; }
    else if (hrs < 7)  { color = "var(--orange)"; msg = "Below optimal. Aim for 7+ hrs."; emoji = "⚠️"; }
    else if (hrs <= 8) { color = "var(--green)";  msg = "Great! 7–8hrs is ideal."; emoji = "✅"; }
    else               { color = "var(--blue)";   msg = "Good rest!"; emoji = "💙"; }
    return { hrs, mins, color, msg, emoji };
  })();

  const Row = ({ label, value, color }) => (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid var(--border)", alignItems: "center" }}>
      <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: color || "var(--text)" }}>{value || "—"}</span>
    </div>
  );

  return (
    <div className="profile-panel-overlay">
      <div className="profile-panel-bg" onClick={onClose} />
      <div className="profile-panel">
        <div className="profile-panel-hdr">
          <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 800, fontSize: 16 }}>Client Profile</div>
          <button className="xbtn" onClick={onClose}>✕</button>
        </div>

        {/* Avatar + Basic Info — show client photo if uploaded */}
        <div style={{ padding: "22px 22px 16px", display: "flex", alignItems: "center", gap: 14, borderBottom: "1px solid var(--border)" }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", overflow: "hidden", border: "2px solid var(--green-b)", flexShrink: 0 }}>
            {d.photoUrl
              ? <img src={d.photoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : <div className="profile-av-lg" style={{ width: "100%", height: "100%", borderRadius: "50%", margin: 0 }}>{initials}</div>
            }
          </div>
          <div>
            <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 800, fontSize: 18 }}>{d.name}</div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{d.email}</div>
            {d.phone && <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>📞 {d.phone}</div>}
            <div style={{ marginTop: 6 }}><span className="phase">{d.phase} — W{d.week}</span></div>
          </div>
        </div>

        <div style={{ padding: "14px 22px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 8 }}>Plan Details</div>
          <Row label="🎯 Primary Goal"  value={d.primaryGoal}                                    color="var(--orange)" />
          <Row label="📋 Plan"          value={d.planName || d.phase}                            color="var(--green)"  />
          <Row label="⏱ Duration"       value={d.planDuration ? d.planDuration + " weeks" : null} color="var(--blue)"  />
          <Row label="📅 Week"          value={"Week " + d.week + " of " + (d.planDuration || "—")} color="var(--purple)" />
          <Row label="⚖️ Weight"        value={d.weight   ? d.weight   + " kg" : null} />
          <Row label="📉 Body Fat"      value={d.bodyFat  ? d.bodyFat  + "%"   : null} />
          <Row label="📏 Waist"         value={d.waist    ? d.waist    + " cm" : null} />
        </div>

        <div style={{ padding: "14px 22px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 8 }}>🍽 Macro Targets</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {[["Cal", n.calories, "var(--green)", "kcal"], ["Protein", n.protein, "var(--purple)", "g"], ["Carbs", n.carbs, "var(--orange)", "g"], ["Fats", n.fats, "var(--red)", "g"], ["Fiber", n.fiber, "#34d399", "g"]].map(([l, v, co, u]) => (
              <div key={l} style={{ padding: "5px 10px", borderRadius: 20, background: co + "18", color: co, border: "1px solid " + co + "44", fontSize: 11, fontWeight: 700 }}>
                {l}: {v || "—"}{v ? u : ""}
              </div>
            ))}
          </div>
        </div>

        <div style={{ padding: "14px 22px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 8 }}>⏰ Daily Routine</div>
          <Row label="🌅 Wake-up Time"      value={d.wakeTime}                color="var(--yellow)" />
          <Row label="🌙 Sleep Time"        value={d.sleepTime}               color="var(--blue)"   />
          <Row label="💪 Training Time"     value={d.preferredTrainingTime}   color="var(--purple)" />
          <Row label="👟 Avg Steps"         value={d.avgSteps ? Number(d.avgSteps).toLocaleString() + " steps" : null} color="var(--green)" />
          <Row label="🚽 Bowel Tracking"    value={d.bowelReport === true ? "Enabled" : d.bowelReport === false ? "Disabled" : null} color={d.bowelReport ? "var(--green)" : "var(--muted)"} />
          {sleepInfo && (
            <div style={{ marginTop: 10, padding: "10px 14px", background: sleepInfo.color + "14", border: "1px solid " + sleepInfo.color + "44", borderRadius: 10, fontSize: 12, fontWeight: 700, color: sleepInfo.color }}>
              {sleepInfo.emoji} {sleepInfo.hrs}h {sleepInfo.mins}m sleep — {sleepInfo.msg}
            </div>
          )}
        </div>

        {d.measurements && Object.values(d.measurements).some(v => v) ? (
          <div style={{ padding: "14px 22px", borderBottom: "1px solid var(--border)" }}>
            <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 10 }}>📏 Body Measurements</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              {[
                { key: "waist", label: "Waist", color: "var(--purple)" }, { key: "neck", label: "Neck", color: "var(--blue)" },
                { key: "chest", label: "Chest", color: "var(--green)" }, { key: "calves", label: "Calves", color: "var(--orange)" },
                { key: "thighs", label: "Thighs", color: "var(--red)" }, { key: "arms", label: "Arms", color: "var(--yellow)" },
              ].map(f => d.measurements[f.key] ? (
                <div key={f.key} style={{ background: "var(--s2)", borderRadius: 10, padding: "10px", border: "1px solid var(--border)", textAlign: "center" }}>
                  <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 800, fontSize: 18, color: f.color }}>{d.measurements[f.key]}<span style={{ fontSize: 10, fontWeight: 500 }}>cm</span></div>
                  <div style={{ fontSize: 10, color: "var(--muted)", textTransform: "capitalize", marginTop: 3 }}>{f.label}</div>
                </div>
              ) : null)}
            </div>
          </div>
        ) : null}

        {/* Blood Report — view from coach side */}
        <div style={{ padding: "14px 22px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 8 }}>🩸 Blood Report</div>
          {d.bloodReport ? (
            <div style={{ background: "rgba(59,130,246,.08)", border: "1px solid rgba(59,130,246,.3)", borderRadius: 10, padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontWeight: 700, color: "var(--blue)", fontSize: 13 }}>📄 {d.bloodReport.name}</div>
                <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 3 }}>Uploaded: {d.bloodReport.uploadedAt}</div>
              </div>
              <a href={d.bloodReport.url} target="_blank" rel="noreferrer"
                style={{ padding: "8px 18px", borderRadius: 9, background: "linear-gradient(135deg,#3b82f6,#1d4ed8)", color: "#fff", fontSize: 13, fontWeight: 700, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6, boxShadow: "0 3px 10px rgba(59,130,246,.3)" }}>
                📄 View PDF
              </a>
            </div>
          ) : (
            <div style={{ fontSize: 12, color: "var(--muted)", fontStyle: "italic" }}>No blood report uploaded yet.</div>
          )}
        </div>

        {!d.wakeTime && !d.sleepTime && !d.avgSteps && !(d.measurements && Object.values(d.measurements).some(v => v)) && !d.bloodReport && (
          <div style={{ padding: "28px 22px", textAlign: "center", color: "var(--muted)" }}>
            <div style={{ fontSize: 30, marginBottom: 10 }}>📋</div>
            <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text)", marginBottom: 6 }}>Client profile not filled yet</div>
            <div style={{ fontSize: 12 }}>Once the client fills their My Profile section, details will appear here.</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// COACH MEDIA VIEW — sorted by date, per-pose compare
// ═══════════════════════════════════════════════════════════════════════════════
export function CoachMediaView({ sel, onDeletePhoto }) {
  const [viewMedia, setViewMedia] = useState(null);
  const [compareMode, setCompareMode] = useState(false);
  const [compareA, setCompareA] = useState(null);
  const [compareB, setCompareB] = useState(null);
  const [pickingFor, setPickingFor] = useState(null); // "A" or "B"

  const photos = [...(sel.photos || [])]
    .filter(p => p.url)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  // Group by week
  const byWeek = {};
  photos.forEach(p => {
    const wk = p.week || 1;
    if (!byWeek[wk]) byWeek[wk] = [];
    byWeek[wk].push(p);
  });
  const weeks = Object.keys(byWeek).map(Number).sort((a, b) => b - a);

  const poseLabel = (p) => {
    if (p.pose) return p.pose;
    return null;
  };

  const poseColor = (pose) => {
    const map = {
      "Front": "#22c55e",
      "Back": "#3b82f6",
      "Left Side": "#a78bfa",
      "Right Side": "#fb923c",
      "Front Double Bicep": "#f87171",
      "Back Double Bicep": "#fbbf24",
      "Abs & Thigh": "#38bdf8",
    };
    return map[pose] || "#94a3b8";
  };

  // Compare overlay
  if (compareMode) {
    return (
      <div style={{ position: "fixed", inset: 0, background: "var(--bg)", zIndex: 400, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Top bar */}
        <div style={{ background: "rgba(8,13,26,.97)", borderBottom: "1px solid var(--border)", padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 800, fontSize: 17 }}>📸 Compare Photos</div>
          <button onClick={() => { setCompareMode(false); setCompareA(null); setCompareB(null); }}
            style={{ background: "var(--s2)", border: "1px solid var(--border)", borderRadius: 8, padding: "6px 14px", color: "var(--text)", cursor: "pointer", fontWeight: 600, fontSize: 13 }}>✕ Close</button>
        </div>

        {/* Two panels */}
        <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0, overflow: "hidden" }}>
          {["A", "B"].map(slot => {
            const photo = slot === "A" ? compareA : compareB;
            return (
              <div key={slot} style={{ display: "flex", flexDirection: "column", borderRight: slot === "A" ? "2px solid var(--border)" : "none", overflow: "hidden" }}>
                {/* Slot header */}
                <div style={{ padding: "10px 14px", background: "var(--s1)", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: slot === "A" ? "var(--green)" : "var(--blue)" }}>
                    {slot === "A" ? "📗 Photo A" : "📘 Photo B"}
                  </div>
                  <button onClick={() => slot === "A" ? setCompareA(null) : setCompareB(null)}
                    style={{ background: "var(--s2)", border: "1px solid var(--border)", borderRadius: 6, padding: "3px 10px", color: "var(--muted)", cursor: "pointer", fontSize: 12 }}>
                    {photo ? "Change" : "Pick"}
                  </button>
                </div>

                {photo ? (
                  <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
                    <img src={photo.url} alt="" style={{ width: "100%", height: "100%", objectFit: "contain", background: "#000" }} />
                    <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(transparent,rgba(0,0,0,.85))", padding: "20px 12px 12px" }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>{photo.date}</div>
                      {photo.pose && <div style={{ fontSize: 11, color: poseColor(photo.pose), fontWeight: 700, marginTop: 2 }}>{photo.pose}</div>}
                      <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 1 }}>Week {photo.week || 1}</div>
                    </div>
                  </div>
                ) : (
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, background: "var(--s2)", padding: 24 }}>
                    <div style={{ fontSize: 40 }}>🖼️</div>
                    <div style={{ fontSize: 14, color: "var(--muted)", textAlign: "center" }}>Click a photo below to pick for slot {slot}</div>
                    <button onClick={() => setPickingFor(slot)}
                      style={{ background: slot === "A" ? "var(--green-bg)" : "rgba(59,130,246,.1)", border: "1px solid " + (slot === "A" ? "var(--green-b)" : "rgba(59,130,246,.3)"), borderRadius: 10, padding: "10px 20px", color: slot === "A" ? "var(--green)" : "var(--blue)", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>
                      + Select Photo {slot}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Picker strip at bottom */}
        <div style={{ background: "var(--s1)", borderTop: "1px solid var(--border)", padding: "10px 14px", flexShrink: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted2)", marginBottom: 8, textTransform: "uppercase", letterSpacing: ".06em" }}>
            {pickingFor ? `Selecting for Photo ${pickingFor} — tap any photo` : "Tap a photo to compare · tap again to assign"}
          </div>
          <div style={{ display: "flex", gap: 8, overflowX: "auto", WebkitOverflowScrolling: "touch", paddingBottom: 4 }}>
            {photos.map((p, i) => (
              <div key={i}
                onClick={() => {
                  if (pickingFor === "A") { setCompareA(p); setPickingFor("B"); }
                  else if (pickingFor === "B") { setCompareB(p); setPickingFor(null); }
                  else if (!compareA) { setCompareA(p); setPickingFor("B"); }
                  else if (!compareB) { setCompareB(p); }
                }}
                style={{ flexShrink: 0, width: 72, height: 96, borderRadius: 8, overflow: "hidden", cursor: "pointer", border: "2px solid " + (compareA?.timestamp === p.timestamp ? "var(--green)" : compareB?.timestamp === p.timestamp ? "var(--blue)" : "var(--border)"), position: "relative", transition: "all .15s" }}>
                <img src={p.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(0,0,0,.7)", padding: "3px 4px" }}>
                  <div style={{ fontSize: 8, color: "#fff", fontWeight: 600 }}>{p.date}</div>
                  {p.pose && <div style={{ fontSize: 8, color: poseColor(p.pose), fontWeight: 700 }}>{p.pose?.slice(0, 6)}</div>}
                </div>
                {(compareA?.timestamp === p.timestamp) && <div style={{ position: "absolute", top: 3, left: 3, background: "var(--green)", borderRadius: 4, padding: "1px 5px", fontSize: 9, fontWeight: 800, color: "#fff" }}>A</div>}
                {(compareB?.timestamp === p.timestamp) && <div style={{ position: "absolute", top: 3, left: 3, background: "var(--blue)", borderRadius: 4, padding: "1px 5px", fontSize: 9, fontWeight: 800, color: "#fff" }}>B</div>}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Normal grid view
  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 800, fontSize: 17 }}>
          Client Media <span style={{ fontSize: 13, color: "var(--muted)", fontWeight: 400 }}>({photos.length} files)</span>
        </div>
        <button onClick={() => { setCompareMode(true); setPickingFor("A"); }}
          style={{ background: "rgba(59,130,246,.1)", border: "1px solid rgba(59,130,246,.3)", borderRadius: 10, padding: "8px 16px", color: "var(--blue)", fontWeight: 700, cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
          ⚖️ Compare Photos
        </button>
      </div>

      {photos.length === 0 && (
        <div style={{ textAlign: "center", padding: "48px 24px", color: "var(--muted)" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📷</div>
          <div style={{ fontWeight: 700, fontSize: 16 }}>No photos yet</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>Client hasn't uploaded any photos</div>
        </div>
      )}

      {/* View media fullscreen */}
      {viewMedia && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.95)", zIndex: 500, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}
          onClick={() => setViewMedia(null)}>
          <img src={viewMedia.url} alt="" style={{ maxWidth: "92vw", maxHeight: "80vh", borderRadius: 16, objectFit: "contain" }} />
          <div style={{ marginTop: 14, display: "flex", gap: 12, alignItems: "center" }}>
            {viewMedia.pose && <span style={{ padding: "4px 12px", borderRadius: 20, background: poseColor(viewMedia.pose) + "22", color: poseColor(viewMedia.pose), border: "1px solid " + poseColor(viewMedia.pose) + "55", fontWeight: 700, fontSize: 13 }}>{viewMedia.pose}</span>}
            <span style={{ color: "#94a3b8", fontSize: 13 }}>{viewMedia.date} · Week {viewMedia.week || 1}</span>
            <button onClick={(e) => { e.stopPropagation(); setCompareA(viewMedia); setCompareMode(true); setPickingFor("B"); setViewMedia(null); }}
              style={{ background: "rgba(59,130,246,.15)", border: "1px solid rgba(59,130,246,.4)", borderRadius: 8, padding: "6px 14px", color: "var(--blue)", fontWeight: 700, cursor: "pointer", fontSize: 12 }}>⚖️ Compare this</button>
            <button onClick={(e) => { e.stopPropagation(); onDeletePhoto(viewMedia); setViewMedia(null); }}
              style={{ background: "rgba(248,113,113,.15)", border: "1px solid rgba(248,113,113,.4)", borderRadius: 8, padding: "6px 14px", color: "var(--red)", fontWeight: 700, cursor: "pointer", fontSize: 12 }}>🗑 Delete</button>
          </div>
          <div style={{ marginTop: 8, fontSize: 11, color: "#475569" }}>Tap anywhere to close</div>
        </div>
      )}

      {/* Weeks */}
      {weeks.map(week => {
        const weekPhotos = byWeek[week].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        return (
          <div key={week} style={{ background: "var(--s1)", border: "1px solid var(--border)", borderRadius: 14, padding: "16px", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: "50%", background: "var(--green-bg)", border: "1.5px solid var(--green-b)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Outfit',sans-serif", fontWeight: 800, fontSize: 12, color: "var(--green)" }}>W{week}</div>
                <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 800, fontSize: 16 }}>Week {week}</div>
              </div>
              <span style={{ fontSize: 12, color: "var(--muted)" }}>{weekPhotos.length} files</span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10 }}>
              {weekPhotos.map((p, i) => {
                const pose = poseLabel(p);
                const color = poseColor(pose);
                return (
                  <div key={i}
                    onClick={() => setViewMedia(p)}
                    style={{ borderRadius: 10, overflow: "hidden", cursor: "pointer", border: "2px solid var(--border)", transition: "all .18s", position: "relative" }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = color; e.currentTarget.style.transform = "scale(1.02)"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.transform = "scale(1)"; }}>
                    <div style={{ aspectRatio: "3/4", overflow: "hidden" }}>
                      <img src={p.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </div>
                    {/* Pose badge */}
                    {pose && (
                      <div style={{ position: "absolute", top: 6, left: 6, background: color + "dd", borderRadius: 6, padding: "2px 7px", fontSize: 10, fontWeight: 800, color: "#fff", backdropFilter: "blur(4px)" }}>
                        {pose}
                      </div>
                    )}
                    {/* Compare button on hover */}
                    <div style={{ position: "absolute", top: 6, right: 6 }}>
                      <button
                        onClick={e => { e.stopPropagation(); setCompareA(p); setCompareMode(true); setPickingFor("B"); }}
                        style={{ background: "rgba(59,130,246,.85)", border: "none", borderRadius: 6, padding: "3px 7px", color: "#fff", fontSize: 10, fontWeight: 800, cursor: "pointer", backdropFilter: "blur(4px)" }}>
                        ⚖️
                      </button>
                    </div>
                    {/* Bottom info */}
                    <div style={{ background: "linear-gradient(transparent,rgba(0,0,0,.8))", padding: "20px 8px 8px", position: "absolute", bottom: 0, left: 0, right: 0 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#fff" }}>{p.date}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ADD CLIENT FULLSCREEN ENHANCED
// ═══════════════════════════════════════════════════════════════════════════════
export function AddClientFullscreenEnhanced({ coachUid, coachEmail, onClose, onSuccess }) {
  const GOALS = ["Fat Loss", "Muscle Gain", "Recomposition", "Strength", "Endurance", "Maintenance", "Sports Performance", "General Fitness"];
  const PLANS = [
    { key: "Cut",   label: "Cut",         desc: "Caloric deficit — fat loss focus" },
    { key: "Bulk",  label: "Bulk",        desc: "Caloric surplus — muscle gain focus" },
    { key: "Maint", label: "Maintenance", desc: "TDEE — body recomposition" },
    { key: "Peak",  label: "Peak Week",   desc: "Competition / event prep" },
  ];
  const [nc, setNc] = useState({ name: "", email: "", password: "", phone: "", phase: "Cut Phase 1", week: "1", calories: 2200, protein: 160, carbs: 240, fats: 70, fiber: 25, primaryGoal: "Fat Loss", planName: "Cut Phase 1", planDuration: 12, planType: "Cut" });
  const [saving, setSaving]               = useState(false);
  const [err, setErr]                     = useState("");
  const [activeSection, setActiveSection] = useState(0);

  const NumInput = ({ value, onChange, color }) => (
    <div className="num-input">
      <button className="num-btn" onClick={() => onChange(Math.max(0, (parseInt(value) || 0) - 1))}>-</button>
      <input type="number" value={value} onChange={e => onChange(parseInt(e.target.value) || 0)} style={{ color }} />
      <button className="num-btn" onClick={() => onChange((parseInt(value) || 0) + 1)}>+</button>
    </div>
  );

  const save = async () => {
    if (!nc.name.trim())                        { setErr("Client name is required"); return; }
    if (!nc.email.trim())                       { setErr("Email is required"); return; }
    if (!nc.password || nc.password.length < 6) { setErr("Password needs 6+ characters"); return; }
    setErr(""); setSaving(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, nc.email.trim(), nc.password);
      await setDoc(doc(db, "clients", cred.user.uid), {
        name: nc.name.trim(), email: nc.email.trim().toLowerCase(), phone: nc.phone.trim(),
        avatar: nc.name.trim().split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase(),
        phase: nc.phase, week: parseInt(nc.week) || 1,
        primaryGoal: nc.primaryGoal, planName: nc.planName || nc.phase,
        planDuration: parseInt(nc.planDuration) || 12, planType: nc.planType,
        weight: null, waist: null, bodyFat: null,
        nutrition: { calories: nc.calories, protein: nc.protein, carbs: nc.carbs, fats: nc.fats, fiber: nc.fiber },
        weightHistory: [], weeklyCheckins: [], coachMessage: "", photos: [], foodLogs: [], savedFoods: [],
        mealPlan: DEFAULT_MEALS_AC, workoutPlan: DEFAULT_WORKOUT_AC,
        coachId: coachUid, coachEmail, role: "client", accessStatus: "active",
        createdAt: serverTimestamp(), isNew: true, measurements: {},
      });
      await signInWithEmailAndPassword(auth, coachEmail, window._cp);
      onSuccess(nc.name.trim());
    } catch (e) { setErr(e.code === "auth/email-already-in-use" ? "This email is already registered!" : e.message); }
    setSaving(false);
  };

  const sections = [{ icon: "👤", label: "Personal" }, { icon: "🔐", label: "Login" }, { icon: "🎯", label: "Goal & Plan" }, { icon: "📋", label: "Program" }, { icon: "🍽", label: "Macros" }];

  return (
    <div className="addclient-overlay">
      <div className="addclient-topbar" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap", padding: "10px 14px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <button className="btn btn-s btn-sm" onClick={onClose} style={{ flexShrink: 0 }}>✕</button>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 800, fontSize: 15, whiteSpace: "nowrap" }}>Add New Client</div>
            <div style={{ fontSize: 11, color: "var(--muted)" }}>Fill all sections then click Create</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
          {err && <div style={{ fontSize: 12, color: "var(--red)", maxWidth: 200 }}>{err}</div>}
          <button className="btn btn-p btn-sm" onClick={save} disabled={saving} style={{ flexShrink: 0, whiteSpace: "nowrap" }}>{saving ? "Creating..." : "✓ Create"}</button>
        </div>
      </div>
      <div style={{ display: "flex", gap: 6, padding: "10px 12px", background: "rgba(8,13,26,.97)", borderBottom: "1px solid var(--border)", overflowX: "auto", flexWrap: "nowrap", WebkitOverflowScrolling: "touch", flexShrink: 0, scrollbarWidth: "none" }}>
        {sections.map((s, i) => (
          <button key={i} onClick={() => setActiveSection(i)} style={{ padding: "6px 14px", borderRadius: 20, border: "1.5px solid", cursor: "pointer", fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: 12, whiteSpace: "nowrap", flexShrink: 0, borderColor: activeSection === i ? "var(--green)" : "var(--border)", background: activeSection === i ? "var(--green-bg)" : "var(--s2)", color: activeSection === i ? "var(--green)" : "var(--muted)", transition: "all .18s" }}>{s.icon} {s.label}</button>
        ))}
      </div>
      <div className="addclient-body">
        {activeSection === 0 && (<div className="ac-section"><div className="ac-section-title"><div className="ac-section-icon" style={{ background: "var(--green-bg)" }}>👤</div>Personal Info</div><div className="fg"><div className="fld"><div className="fl">Full Name *</div><input className="fi" placeholder="e.g. Rahul Kumar" value={nc.name} onChange={e => setNc(p => ({ ...p, name: e.target.value }))} /></div><div className="fld"><div className="fl">Phone Number</div><input className="fi" placeholder="+91 98765 43210" value={nc.phone} onChange={e => setNc(p => ({ ...p, phone: e.target.value }))} /></div></div></div>)}
        {activeSection === 1 && (<div className="ac-section"><div className="ac-section-title"><div className="ac-section-icon" style={{ background: "rgba(59,130,246,.12)" }}>🔐</div>Login Credentials</div><div className="alert alert-b">Share the app URL + these credentials with your client via WhatsApp after creating.</div><div className="fg"><div className="fld"><div className="fl">Email *</div><input className="fi" type="email" placeholder="rahul@gmail.com" value={nc.email} onChange={e => setNc(p => ({ ...p, email: e.target.value }))} /></div><div className="fld"><div className="fl">Password * (min 6 chars)</div><input className="fi" type="text" placeholder="e.g. rahul@123" value={nc.password} onChange={e => setNc(p => ({ ...p, password: e.target.value }))} /></div></div></div>)}
        {activeSection === 2 && (
          <div className="ac-section">
            <div className="ac-section-title"><div className="ac-section-icon" style={{ background: "rgba(251,146,60,.12)" }}>🎯</div>Primary Goal & Plan</div>
            <div className="fld" style={{ marginBottom: 18 }}>
              <div className="fl" style={{ marginBottom: 10 }}>Primary Goal *</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 8 }}>
                {GOALS.map(g => (<button key={g} onClick={() => setNc(p => ({ ...p, primaryGoal: g }))} style={{ padding: "10px 12px", borderRadius: 10, border: "1.5px solid", cursor: "pointer", textAlign: "left", fontSize: 13, fontWeight: 700, fontFamily: "'DM Sans',sans-serif", borderColor: nc.primaryGoal === g ? "var(--orange)" : "var(--border)", background: nc.primaryGoal === g ? "rgba(251,146,60,.12)" : "var(--s2)", color: nc.primaryGoal === g ? "var(--orange)" : "var(--muted)", transition: "all .15s" }}>{g}</button>))}
              </div>
            </div>
            <div className="fld" style={{ marginBottom: 18 }}>
              <div className="fl" style={{ marginBottom: 10 }}>Plan Type</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {PLANS.map(plan => (<button key={plan.key} onClick={() => setNc(p => ({ ...p, planType: plan.key, planName: plan.label }))} className={nc.planType === plan.key ? "plan-option selected" : "plan-option"}><div className="plan-option-title">{plan.label}</div><div className="plan-option-desc">{plan.desc}</div></button>))}
              </div>
            </div>
            <div className="fg">
              <div className="fld"><div className="fl">Plan Name</div><input className="fi" placeholder="e.g. 12-Week Cut" value={nc.planName} onChange={e => setNc(p => ({ ...p, planName: e.target.value }))} /></div>
              <div className="fld"><div className="fl">Duration (weeks)</div><NumInput value={nc.planDuration} color="var(--blue)" onChange={v => setNc(p => ({ ...p, planDuration: v }))} /></div>
            </div>
          </div>
        )}
        {activeSection === 3 && (<div className="ac-section"><div className="ac-section-title"><div className="ac-section-icon" style={{ background: "rgba(167,139,250,.12)" }}>📋</div>Training Program</div><div className="fg"><div className="fld"><div className="fl">Phase</div><select className="fsel" value={nc.phase} onChange={e => setNc(p => ({ ...p, phase: e.target.value }))}><option>Cut Phase 1</option><option>Cut Phase 2</option><option>Bulk Phase 1</option><option>Bulk Phase 2</option><option>Maintenance</option><option>Peak Week</option></select></div><div className="fld"><div className="fl">Starting Week</div><input className="fi" type="number" min="1" max="52" value={nc.week} onChange={e => setNc(p => ({ ...p, week: e.target.value }))} /></div></div></div>)}
        {activeSection === 4 && (
          <div className="ac-section">
            <div className="ac-section-title"><div className="ac-section-icon" style={{ background: "rgba(34,197,94,.12)" }}>🍽</div>Starting Macro Targets</div>
            <div className="fg">
              {[["Calories (kcal)", "calories", "var(--green)"], ["Protein (g)", "protein", "var(--purple)"], ["Carbs (g)", "carbs", "var(--orange)"], ["Fats (g)", "fats", "var(--red)"], ["Fiber (g)", "fiber", "#34d399"]].map(([l, k, co]) => (
                <div key={k} className="fld"><div className="fl" style={{ color: co }}>{l}</div><NumInput value={nc[k]} color={co} onChange={v => setNc(p => ({ ...p, [k]: v }))} /></div>
              ))}
            </div>
            <div style={{ marginTop: 12, padding: "10px 14px", background: "var(--s2)", borderRadius: 10, border: "1px solid var(--border)", fontSize: 12, color: "var(--muted2)" }}>
              <span style={{ color: "var(--green)", fontWeight: 700 }}>{nc.calories} kcal</span> · <span style={{ color: "var(--purple)", fontWeight: 700 }}>{nc.protein}g P</span> · <span style={{ color: "var(--orange)", fontWeight: 700 }}>{nc.carbs}g C</span> · <span style={{ color: "var(--red)", fontWeight: 700 }}>{nc.fats}g F</span>
            </div>
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
          {activeSection > 0 ? <button className="btn btn-s" onClick={() => setActiveSection(s => s - 1)}>← Back</button> : <div />}
          {activeSection < sections.length - 1 ? <button className="btn btn-p" onClick={() => setActiveSection(s => s + 1)}>Next →</button> : <button className="btn btn-p" onClick={save} disabled={saving} style={{ padding: "10px 28px" }}>{saving ? "Creating..." : "✓ Create Client"}</button>}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MY PROFILE SECTION — mobile-safe with independent scroll + profile photo upload
// ═══════════════════════════════════════════════════════════════════════════════
export function MyProfileSection({ uid, d, toast }) {
  const [saving, setSaving]             = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [form, setForm] = useState({
    wakeTime: d.wakeTime || "06:00", sleepTime: d.sleepTime || "22:30",
    bowelReport: d.bowelReport ?? false,
    preferredTrainingTime: d.preferredTrainingTime || "", avgSteps: d.avgSteps || "",
  });
  const [meas, setMeas] = useState({ waist: "", neck: "", chest: "", calves: "", thighs: "", arms: "", ...(d.measurements || {}) });

  const sleepInfo = (() => {
    if (!form.wakeTime || !form.sleepTime) return null;
    const [wH, wM] = form.wakeTime.split(":").map(Number);
    const [sH, sM] = form.sleepTime.split(":").map(Number);
    const wakeMin = wH * 60 + wM; const sleepMin = sH * 60 + sM;
    const total = wakeMin > sleepMin ? wakeMin - sleepMin : (1440 - sleepMin + wakeMin);
    const hrs = Math.floor(total / 60); const mins = total % 60;
    let color, msg, emoji;
    if (hrs < 6)       { color = "var(--red)";    msg = "Critical! Less than 6hrs — recovery is suffering."; emoji = "🚨"; }
    else if (hrs < 7)  { color = "var(--orange)"; msg = "Below optimal. Aim for 7+ hours."; emoji = "⚠️"; }
    else if (hrs <= 8) { color = "var(--green)";  msg = "Great! 7–8hrs is ideal."; emoji = "✅"; }
    else               { color = "var(--blue)";   msg = "Good rest!"; emoji = "💙"; }
    return { hrs, mins, color, msg, emoji };
  })();

  const weeksLeft = d.planDuration && d.week ? Math.max(0, parseInt(d.planDuration) - parseInt(d.week) + 1) : null;

  // ── Upload profile photo (client only) ─────────────────────────────────────
  const uploadProfilePhoto = async (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast("Please upload an image file", "error"); return; }
    if (file.size > 10 * 1024 * 1024) { toast("Image too large. Max 10MB", "error"); return; }
    setUploadingPhoto(true);
    try {
      const result = await cloudinaryUpload(file, () => {});
      await updateDoc(doc(db, "clients", uid), { photoUrl: result.secure_url });
      toast("Profile photo updated!", "success");
    } catch (e) { toast("Upload failed: " + e.message, "error"); }
    setUploadingPhoto(false);
  };

  // ── Upload blood report PDF ─────────────────────────────────────────────────
  const uploadBloodReport = async (file) => {
    if (!file) return;
    if (file.type !== "application/pdf") { toast("Please upload a PDF file only", "error"); return; }
    if (file.size > 10 * 1024 * 1024)   { toast("File too large. Max 10MB", "error"); return; }
    setUploadingPdf(true);
    try {
      const formData = new FormData();
      formData.append("file", file); formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET); formData.append("folder", "blood_reports");
      const res  = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`, { method: "POST", body: formData });
      const data = await res.json();
      await updateDoc(doc(db, "clients", uid), { bloodReport: { url: data.secure_url, name: file.name, uploadedAt: new Date().toLocaleDateString("en-IN") } });
      toast("Blood report uploaded!", "success");
    } catch (e) { toast("Upload failed: " + e.message, "error"); }
    setUploadingPdf(false);
  };

  // ── Delete blood report ─────────────────────────────────────────────────────
  const deleteBloodReport = async () => {
    if (!window.confirm("Delete this blood report?")) return;
    await updateDoc(doc(db, "clients", uid), { bloodReport: null });
    toast("Blood report deleted.", "success");
  };

  const saveAll = async () => {
    setSaving(true);
    await updateDoc(doc(db, "clients", uid), {
      wakeTime: form.wakeTime, sleepTime: form.sleepTime, bowelReport: form.bowelReport,
      preferredTrainingTime: form.preferredTrainingTime, avgSteps: form.avgSteps,
      measurements: meas, ...(meas.waist ? { waist: parseFloat(meas.waist) } : {})
    });
    toast("Profile saved!", "success"); setSaving(false);
  };

  const n = d.nutrition || {};
  const TRAINING_TIMES = ["Early Morning (5–7 AM)", "Morning (7–9 AM)", "Mid Morning (9–11 AM)", "Afternoon (12–2 PM)", "Evening (4–6 PM)", "Late Evening (6–8 PM)", "Night (8–10 PM)"];

  return (
    // OUTER wrapper: fixed height, no overflow — only inner scroll
    <div className="profile-page-outer">
      <div className="profile-page-scroll">

        {/* ── PAGE HEADER ── */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 22, fontWeight: 800 }}>My Profile</div>
          <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 5 }}>{d.phase} — Week {d.week}</div>
        </div>

        {/* ── SECTION 1: Identity + plan progress ── */}
        <div className="profile-page-section stagger-1">
          <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 20 }}>

            {/* Profile photo with upload button */}
            <div className="profile-photo-wrap">
              <div style={{ width: 72, height: 72, borderRadius: "50%", overflow: "hidden", border: "2px solid var(--green-b)", flexShrink: 0 }}>
                {d.photoUrl
                  ? <img src={d.photoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : (
                    <div style={{ width: "100%", height: "100%", background: "var(--green-bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                      </svg>
                    </div>
                  )
                }
              </div>
              {/* Upload button overlay */}
              <label className="profile-photo-upload-btn" title={uploadingPhoto ? "Uploading..." : "Change photo"} style={{ opacity: uploadingPhoto ? 0.5 : 1 }}>
                <input type="file" accept="image/*" style={{ display: "none" }} disabled={uploadingPhoto}
                  onChange={e => { if (e.target.files[0]) uploadProfilePhoto(e.target.files[0]); e.target.value = ""; }} />
                {uploadingPhoto ? "⏳" : "📷"}
              </label>
            </div>

            <div>
              <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 900, fontSize: 22 }}>{d.name}</div>
              <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 3 }}>{d.email}</div>
              {d.phone && <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 2 }}>📞 {d.phone}</div>}
              <div style={{ fontSize: 11, color: "var(--muted2)", marginTop: 5 }}>Tap 📷 to update your profile photo</div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
            {[["🎯 Primary Goal", d.primaryGoal || "—", "var(--orange)"], ["📋 Plan", d.planName || d.phase || "—", "var(--green)"], ["⏱ Duration", d.planDuration ? d.planDuration + " weeks" : "—", "var(--blue)"], ["📅 Current Week", `Week ${d.week} of ${d.planDuration || "—"}`, "var(--purple)"]].map(([l, v, co]) => (
              <div key={l} style={{ background: "var(--s2)", borderRadius: 10, padding: "10px 14px", border: "1px solid var(--border)" }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", color: "var(--muted)", marginBottom: 4 }}>{l}</div>
                <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 800, fontSize: 14, color: co }}>{v}</div>
              </div>
            ))}
          </div>
          {d.planDuration && d.week && (
            <div style={{ background: "var(--s2)", borderRadius: 10, padding: "12px 14px", border: "1px solid var(--border)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--muted2)" }}>Plan Progress</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--green)" }}>{weeksLeft} weeks remaining</span>
              </div>
              <div style={{ height: 8, borderRadius: 4, background: "var(--border)", overflow: "hidden" }}>
                <div style={{ height: "100%", borderRadius: 4, background: "linear-gradient(90deg,var(--green),#16a34a)", width: `${Math.min((parseInt(d.week) / parseInt(d.planDuration)) * 100, 100)}%`, transition: "width .8s ease" }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--muted)", marginTop: 4 }}>
                <span>Week 1</span><span>Week {d.planDuration}</span>
              </div>
            </div>
          )}
        </div>

        {/* ── SECTION 2: Daily Routine ── */}
        <div className="profile-page-section stagger-2">
          <div className="profile-page-title"><span style={{ fontSize: 18 }}>⏰</span> Daily Routine</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
  {[
    { label: "🌅 Wake-up Time", key: "wakeTime", color: "var(--yellow)" },
    { label: "🌙 Sleep Time",   key: "sleepTime", color: "var(--blue)"   },
  ].map(({ label, key, color }) => (
    <div key={key} style={{
      background: "var(--s2)",
      border: "1.5px solid var(--border)",
      borderRadius: 12,
      padding: "12px 14px",
      display: "flex",
      flexDirection: "column",
      gap: 8,
    }}>
      <div style={{
        fontSize: 11, fontWeight: 700,
        color, textTransform: "uppercase",
        letterSpacing: ".07em"
      }}>{label}</div>
      <input
        type="time"
        value={form[key]}
        onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
        style={{
          width: "100%",
          background: "transparent",
          border: "none",
          color: "var(--text)",
          fontFamily: "'Outfit',sans-serif",
          fontWeight: 800,
          fontSize: 18,
          outline: "none",
          padding: 0,
          // Fix Android time picker color
          colorScheme: "dark",
        }}
      />
    </div>
  ))}
</div>
          {sleepInfo && (
            <div style={{ padding: "12px 16px", background: sleepInfo.color + "14", border: "1px solid " + sleepInfo.color + "44", borderRadius: 10, marginBottom: 14 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: sleepInfo.color, marginBottom: 4 }}>{sleepInfo.emoji} {sleepInfo.hrs}h {sleepInfo.mins}m sleep</div>
              <div style={{ fontSize: 12, color: sleepInfo.color, opacity: 0.85 }}>{sleepInfo.msg}</div>
            </div>
          )}
          <div className="fld" style={{ marginBottom: 14 }}>
            <div className="fl" style={{ color: "var(--purple)" }}>💪 Preferred Training Time</div>
            <select className="fsel" value={form.preferredTrainingTime} onChange={e => setForm(p => ({ ...p, preferredTrainingTime: e.target.value }))}>
              <option value="">Select preferred time...</option>
              {TRAINING_TIMES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="fld" style={{ marginBottom: 14 }}>
            <div className="fl" style={{ color: "var(--green)" }}>👟 Average Steps Today</div>
            <input className="fi" type="number" placeholder="e.g. 8000" value={form.avgSteps} onChange={e => setForm(p => ({ ...p, avgSteps: e.target.value }))} />
            {form.avgSteps && <div style={{ fontSize: 11, marginTop: 5, color: parseInt(form.avgSteps) >= 10000 ? "var(--green)" : parseInt(form.avgSteps) >= 7000 ? "var(--yellow)" : "var(--orange)", fontWeight: 600 }}>{parseInt(form.avgSteps) >= 10000 ? "🏆 Excellent!" : parseInt(form.avgSteps) >= 7000 ? "👍 Good — try reaching 10k" : "⚡ Increase daily movement"}</div>}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: "var(--s2)", borderRadius: 10, border: "1px solid var(--border)" }}>
            <input type="checkbox" id="bowelReport" checked={form.bowelReport} onChange={e => setForm(p => ({ ...p, bowelReport: e.target.checked }))} style={{ width: 18, height: 18, accentColor: "var(--green)", cursor: "pointer" }} />
            <label htmlFor="bowelReport" style={{ fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Track daily bowel report <span style={{ fontSize: 11, color: "var(--muted)", marginLeft: 6 }}>(optional)</span></label>
          </div>
        </div>

        {/* ── SECTION 3: Body Measurements ── */}
        <div className="profile-page-section stagger-3">
          <div className="profile-page-title"><span style={{ fontSize: 18 }}>📏</span> Body Measurements <span style={{ fontSize: 11, fontWeight: 500, color: "var(--muted)" }}>cm</span></div>
          <div className="meas-grid">
            {[{ key: "waist", label: "Waist", color: "var(--purple)", icon: "🔵" }, { key: "neck", label: "Neck", color: "var(--blue)", icon: "🔷" }, { key: "chest", label: "Chest", color: "var(--green)", icon: "🟢" }, { key: "calves", label: "Calves", color: "var(--orange)", icon: "🟠" }, { key: "thighs", label: "Thighs", color: "var(--red)", icon: "🔴" }, { key: "arms", label: "Arms", color: "var(--yellow)", icon: "🟡" }].map(f => (
              <div key={f.key}>
                <div className="fl" style={{ color: f.color }}>{f.icon} {f.label} (cm)</div>
                <input className="fi" type="number" step="0.1" placeholder="—" value={meas[f.key] || ""} onChange={e => setMeas(p => ({ ...p, [f.key]: e.target.value }))} style={{ color: f.color, fontWeight: 700, textAlign: "center" }} />
              </div>
            ))}
          </div>
          {Object.values(meas).some(v => v) && (
            <div className="meas-grid" style={{ marginTop: 14 }}>
              {MEASUREMENT_FIELDS.map(f => meas[f.key] ? (<div key={f.key} className="meas-card"><div className="meas-val" style={{ color: f.color }}>{meas[f.key]}<span style={{ fontSize: 12, fontWeight: 500 }}>cm</span></div><div className="meas-label">{f.label}</div></div>) : null)}
            </div>
          )}
        </div>

        {/* ── SECTION 4: Blood Report — proper PDF upload/view/delete ── */}
        <div className="profile-page-section stagger-4">
          <div className="profile-page-title"><span style={{ fontSize: 18 }}>🩸</span> Blood Report <span style={{ fontSize: 11, fontWeight: 500, color: "var(--muted)" }}>— upload only if coach requests</span></div>

          {/* Warning note */}
          <div style={{ background: "rgba(251,191,36,.06)", border: "1px solid rgba(251,191,36,.2)", borderRadius: 10, padding: "10px 14px", marginBottom: 14, fontSize: 12, color: "#fcd34d" }}>
            ⚠️ Upload blood report only when requested by your coach.
          </div>

          {/* Existing report */}
          {d.bloodReport ? (
            <div style={{ background: "rgba(59,130,246,.08)", border: "1px solid rgba(59,130,246,.3)", borderRadius: 12, padding: "14px 16px", marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                {/* PDF icon */}
                <div style={{ width: 48, height: 48, borderRadius: 10, background: "rgba(59,130,246,.15)", border: "1px solid rgba(59,130,246,.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>📄</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, color: "var(--blue)", fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.bloodReport.name}</div>
                  <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 3 }}>Uploaded: {d.bloodReport.uploadedAt}</div>
                </div>
              </div>
              {/* Action buttons */}
              <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                <a href={d.bloodReport.url} target="_blank" rel="noreferrer"
                  style={{ flex: 1, padding: "10px 16px", borderRadius: 10, background: "linear-gradient(135deg,#3b82f6,#1d4ed8)", color: "#fff", fontSize: 13, fontWeight: 700, textDecoration: "none", textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, boxShadow: "0 3px 10px rgba(59,130,246,.3)" }}>
                  📄 View PDF
                </a>
                <button onClick={deleteBloodReport}
                  style={{ padding: "10px 16px", borderRadius: 10, background: "rgba(248,113,113,.12)", border: "1.5px solid rgba(248,113,113,.3)", color: "var(--red)", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                  🗑 Delete
                </button>
              </div>
            </div>
          ) : null}

          {/* Upload area */}
          <label style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, border: "2px dashed " + (uploadingPdf ? "var(--green)" : "var(--border2)"), borderRadius: 12, padding: "24px 20px", textAlign: "center", cursor: uploadingPdf ? "default" : "pointer", background: uploadingPdf ? "rgba(34,197,94,.04)" : "var(--s2)", transition: "all .2s", minHeight: 120 }}
            onMouseEnter={e => { if (!uploadingPdf) e.currentTarget.style.borderColor = "var(--blue)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = uploadingPdf ? "var(--green)" : "var(--border2)"; }}>
            <input type="file" accept="application/pdf" style={{ display: "none" }} disabled={uploadingPdf}
              onChange={e => { if (e.target.files[0]) uploadBloodReport(e.target.files[0]); e.target.value = ""; }} />
            <div style={{ fontSize: 32 }}>{uploadingPdf ? "⏳" : "📤"}</div>
            <div style={{ fontWeight: 700, fontSize: 14, color: uploadingPdf ? "var(--green)" : "var(--blue)" }}>
              {uploadingPdf ? "Uploading PDF..." : d.bloodReport ? "Replace Blood Report PDF" : "Upload Blood Report PDF"}
            </div>
            <div style={{ fontSize: 11, color: "var(--muted)" }}>PDF files only · Max 10MB · Tap to browse</div>
          </label>
        </div>

        {/* ── SECTION 5: Macro Targets (read only) ── */}
        <div className="profile-page-section stagger-5">
        <div style={{ display: "flex", gap: 8, overflowX: "auto", WebkitOverflowScrolling: "touch", paddingBottom: 4 }}>
  {[["Calories", n.calories, "var(--green)", "kcal"], ["Protein", n.protein, "var(--purple)", "g"], ["Carbs", n.carbs, "var(--orange)", "g"], ["Fats", n.fats, "var(--red)", "g"], ["Fiber", n.fiber, "#34d399", "g"]].map(([l, v, co, u]) => (
    <div key={l} className="meas-card" style={{ flexShrink: 0, minWidth: 68 }}>
      <div className="meas-val" style={{ color: co, fontSize: 16 }}>{v || "—"}<span style={{ fontSize: 10, fontWeight: 500 }}>{v ? u : ""}</span></div>
      <div className="meas-label">{l}</div>
    </div>
  ))}
</div>
          <div style={{ marginTop: 10, fontSize: 11, color: "var(--muted)" }}>Set by your coach. Updates automatically.</div>
        </div>

        {/* ── SAVE BUTTON ── */}
        <button className="btn btn-p" style={{ width: "100%", padding: "14px", fontSize: 15, borderRadius: 14, marginTop: 4, boxShadow: "0 6px 24px rgba(34,197,94,.3)" }} onClick={saveAll} disabled={saving}>
          {saving ? "Saving..." : "💾 Save Profile"}
        </button>

      </div>{/* end scroll */}
    </div>   /* end outer */
  );
}
// ═══════════════════════════════════════════════════════════════════════════════
// AI FEATURES — Add these exports to your additions.js file
// ═══════════════════════════════════════════════════════════════════════════════
//
// STEP 1: Copy BOTH components below into your additions.js
// STEP 2: Export them: export { AIMotivationSection, AIExerciseGuide }
// STEP 3: In App.jsx, import them at the top where you import from "./additions"
// STEP 4: Follow the 4 integration points marked with ── INTEGRATION POINT ──
//
// ═══════════════════════════════════════════════════════════════════════════════

// ─── DEPENDENCIES NEEDED ──────────────────────────────────────────────────────
// These are already in your app — no new installs needed.
// Uses: useState, useEffect, useRef, doc, getDoc, updateDoc, collection,
//       addDoc, query, where, getDocs, serverTimestamp (all from your imports)

// ═══════════════════════════════════════════════════════════════════════════════
// FEATURE 1: AI DAILY MOTIVATION
// ═══════════════════════════════════════════════════════════════════════════════

export function AIMotivationSection({ client, isCoach = false, db, doc, updateDoc, collection, addDoc, getDocs, query, where, serverTimestamp }) {
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [histLoading, setHistLoading] = useState(true);
  const [generated, setGenerated] = useState(null);

  // Load last 7 days of messages
  useEffect(() => {
    if (!client?.id) return;
    const load = async () => {
      try {
        const q = query(
          collection(db, "motivationMessages"),
          where("clientId", "==", client.id)
        );
        const snap = await getDocs(q);
        const msgs = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => new Date(b.date) - new Date(a.date))
          .slice(0, 7);
        setHistory(msgs);
  
        // Auto-generate if no message exists for today
        const todayStr = new Date().toLocaleDateString("en-IN");
        const alreadyHasToday = msgs.some(m => m.date === todayStr);
        if (!alreadyHasToday && !client?.dailyMotivationDate?.includes(todayStr)) {
          await generateMessage();
        }
      } catch (e) {
        console.error("Failed to load motivation history", e);
      }
      setHistLoading(false);
    };
    load();
  }, [client?.id]); // Only on mount / client change

  const getTodayWorkout = (workoutPlan) => {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const today = days[new Date().getDay()];
    const todayPlan = (workoutPlan || []).find(d => d.day === today);
    if (!todayPlan || todayPlan.type === "Rest") return "Rest & Recovery Day";
    console.log("API KEY LOADED:", !!import.meta.env.VITE_ANTHROPIC_API_KEY);
    return `${todayPlan.type} Day (${todayPlan.exercises?.length || 0} exercises)`;
  };

  const buildPrompt = (c) => {
    const startWeight = (c.weightHistory || [])[0]?.weight || c.weight;
    const currentWeight = c.weight;
    const weightChange = startWeight && currentWeight ? (startWeight - currentWeight).toFixed(1) : null;
    const checkins = c.weeklyCheckins || [];
    const streak = checkins.length;
    const lastCheckin = checkins[checkins.length - 1];
    const todayWorkout = getTodayWorkout(c.workoutPlan);
    const goal = c.primaryGoal || c.phase || "Fitness";
    const n = c.nutrition || {};

    return `You are a motivational fitness coach. Write a SHORT, punchy daily motivation message for a fitness client.

Client details:
- Name: ${c.name?.split(" ")[0] || "there"}
- Goal: ${goal}
- Current Phase: ${c.phase || "Training"}
- Week: ${c.week || 1}
- Today's workout: ${todayWorkout}
- Weekly check-ins completed: ${streak}
- Weight change so far: ${weightChange ? `${weightChange > 0 ? "-" : "+"}${Math.abs(weightChange)}kg` : "tracking in progress"}
- Last sleep quality: ${lastCheckin?.sleepQuality || "N/A"}/10
- Last training adherence: ${lastCheckin?.trainingAdherence || "N/A"}/10
- Calorie target: ${n.calories || "set by coach"}
- Protein target: ${n.protein || "set by coach"}g

Rules:
1. Be PERSONAL — use their name and specific details
2. Be SHORT — 2-3 sentences max
3. Be ENERGETIC but genuine — not cheesy
4. Reference TODAY's workout specifically
5. If they've been consistent, acknowledge it
6. End with a power phrase or emoji that fits
7. Beginner-friendly tone, never intimidating

Generate the motivation message now (just the message, no quotes, no label):`;
  };

  const generateMessage = async () => {
    if (!client) return;

    

    setLoading(true);
    setGenerated(null);

    try {
      const prompt = buildPrompt(client);
      const apiKey = import.meta.env.VITE_GROQ_API_KEY;
    
      const response = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: "llama-3.1-8b-instant",
            max_tokens: 1024,
            messages: [{ role: "user", content: prompt }]
          })
        }
      );
    
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error?.message || `HTTP ${response.status}`);
      }
    
      const rawText = data.choices?.[0]?.message?.content?.trim();
      if (!rawText) throw new Error("No message generated");
    
      // ✅ rawText is used directly — no `msg` variable
      const today = new Date().toLocaleDateString("en-IN");
      const entry = {
        clientId: client.id,
        clientName: client.name,
        message: rawText,        // ← was `msg`, now `rawText`
        date: today,
        workout: getTodayWorkout(client.workoutPlan),
        week: client.week || 1,
        timestamp: new Date().toISOString(),
      };
    
      await addDoc(collection(db, "motivationMessages"), {
        ...entry,
        serverTs: serverTimestamp()
      });
    
      await updateDoc(doc(db, "clients", client.id), {
        dailyMotivation: rawText,   // ← was `msg`
        dailyMotivationDate: today,
      });
    
      setGenerated(entry);
    
    } catch (e) {
      console.error("Motivation generation failed:", e);
      setGenerated({ error: `❌ ${e.message || "Failed to generate."}` });
    }
    setLoading(false);
  };

  const todayStr = new Date().toLocaleDateString("en-IN");
  const todayMsg = history.find(m => m.date === todayStr);

  return (
    <div>
      {/* ── Today's message or generate button ── */}
      <div style={{
        background: "linear-gradient(135deg, rgba(34,197,94,.1), rgba(167,139,250,.08))",
        border: "1px solid var(--green-b)",
        borderRadius: 16, padding: 20, marginBottom: 16,
        position: "relative", overflow: "hidden"
      }}>
        {/* Decorative blob */}
        <div style={{
          position: "absolute", top: -20, right: -20,
          width: 120, height: 120, borderRadius: "50%",
          background: "rgba(34,197,94,.06)", pointerEvents: "none"
        }} />

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 14 }}>
          <div>
          <div style={{
  fontFamily: "'Outfit',sans-serif", fontWeight: 800, fontSize: 15,
  color: "var(--green)", marginBottom: 2
}}>🔥 Keep Going, {client.name?.split(" ")[0]}!</div>
            <div style={{ fontSize: 11, color: "var(--muted)" }}>
              {isCoach ? `For ${client.name} · ` : ""}{todayStr}
            </div>
          </div>
          
        </div>

        {/* Loading state */}
        {loading && (
          <div style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "16px", background: "var(--s2)", borderRadius: 12,
            border: "1px solid var(--border)"
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: "50%",
              border: "3px solid var(--border)", borderTopColor: "var(--green)",
              animation: "sp .8s linear infinite", flexShrink: 0
            }} />
            <div>
              <div style={{ fontWeight: 600, fontSize: 13, color: "var(--text)" }}>
                Crafting {client.name?.split(" ")[0]}'s motivation...
              </div>
              <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
                AI is reading their progress data
              </div>
            </div>
          </div>
        )}

        {/* Generated / existing message */}
        {!loading && (generated?.message || todayMsg?.message || client?.dailyMotivation) && (
          <div style={{
            background: "rgba(34,197,94,.06)", border: "1px solid rgba(34,197,94,.2)",
            borderRadius: 12, padding: "14px 16px",
            animation: generated ? "bounceIn .4s ease" : "none"
          }}>
            <div style={{
              fontSize: 15, lineHeight: 1.65, color: "var(--text)", fontWeight: 500
            }}>
              {generated?.message || todayMsg?.message || client?.dailyMotivation}
            </div>
            <div style={{ marginTop: 8, fontSize: 10, color: "var(--muted)", fontWeight: 600 }}>
              {getTodayWorkout(client.workoutPlan)} · Week {client.week}
            </div>
          </div>
        )}

        {!loading && !generated?.message && !todayMsg?.message && !client?.dailyMotivation && (
          <div style={{
            textAlign: "center", padding: "20px 10px",
            color: "var(--muted)", fontSize: 13
          }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>🤖</div>
            No message yet today. Hit Generate!
          </div>
        )}

        {generated?.error && (
          <div style={{
            background: "rgba(248,113,113,.08)", border: "1px solid rgba(248,113,113,.2)",
            borderRadius: 10, padding: 12, fontSize: 13, color: "var(--red)"
          }}>{generated.error}</div>
        )}
      </div>

      {/* ── Message History (last 7 days) ── */}
      {history.length > 0 && (
        <div style={{
          background: "var(--s1)", border: "1px solid var(--border)",
          borderRadius: 14, overflow: "hidden"
        }}>
          <div style={{
            padding: "12px 16px", borderBottom: "1px solid var(--border)",
            fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: 13,
            display: "flex", alignItems: "center", justifyContent: "space-between"
          }}>
            📜 Last 7 Days
            <span style={{
              fontSize: 10, fontWeight: 600, color: "var(--muted)",
              background: "var(--s2)", padding: "2px 8px", borderRadius: 20,
              border: "1px solid var(--border)"
            }}>{history.length} messages</span>
          </div>
          {histLoading ? (
            <div style={{ padding: 20, textAlign: "center", color: "var(--muted)", fontSize: 12 }}>Loading history...</div>
          ) : (
            history.map((msg, i) => (
              <div key={msg.id || i} style={{
                padding: "12px 16px",
                borderBottom: i < history.length - 1 ? "1px solid var(--border)" : "none",
                background: i === 0 && msg.date === todayStr ? "rgba(34,197,94,.03)" : "transparent"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                  <span style={{
                    fontSize: 10, fontWeight: 700,
                    color: msg.date === todayStr ? "var(--green)" : "var(--muted)",
                    textTransform: "uppercase", letterSpacing: ".05em"
                  }}>
                    {msg.date === todayStr ? "Today" : msg.date}
                  </span>
                  <span style={{ fontSize: 10, color: "var(--muted)" }}>W{msg.week}</span>
                </div>
                <div style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.55 }}>{msg.message}</div>
                <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 4 }}>{msg.workout}</div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// FEATURE 2: AI EXERCISE GUIDE
// ═══════════════════════════════════════════════════════════════════════════════

export function AIExerciseGuide({ uid = null, db, doc, updateDoc, collection, addDoc }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [chatHistory, setChatHistory] = useState([]); // [{role, content}]
  const [mode, setMode] = useState("search"); // "search" | "chat"
  const inputRef = useRef(null);
  const chatEndRef = useRef(null);
  const resultRef = useRef(null);

  const QUICK_SEARCHES = [
    "Bench Press", "Deadlift", "Squats", "Pull-ups",
    "Shoulder Press", "Bicep Curl", "Plank", "Romanian Deadlift"
  ];

  const QUICK_QUESTIONS = [
    "I feel bench press in my shoulders, what's wrong?",
    "How do I fix rounded back on deadlift?",
    "What angle should I use for incline press?",
    "Why do my knees cave on squats?",
    "How to engage lats on pull-ups?",
  ];

  const buildExercisePrompt = (exercise) => `You are an expert fitness coach explaining exercises to beginners. Explain "${exercise}" in a friendly, motivating, beginner-first way.

Format your response EXACTLY like this (use these exact headers):

🎯 WHAT IT WORKS
[List the primary and secondary muscles in 2-3 lines]

📋 PROPER FORM (Step by Step)
[Numbered steps, 5-7 steps, clear and simple language]

⚠️ COMMON MISTAKES
[3-4 bullet points of what people get wrong]

💡 TIPS FOR EVERY LEVEL
Beginner: [1-2 sentences]
Intermediate: [1-2 sentences]
Advanced: [1-2 sentences]

📊 RECOMMENDED SETS & REPS
Goal: Fat Loss → [sets x reps]
Goal: Muscle Gain → [sets x reps]
Goal: Strength → [sets x reps]

🔥 MOTIVATION
[1 sentence — why this exercise is worth doing. Make it powerful and personal]

Keep it conversational, use simple words, never intimidate. Be encouraging throughout.`;

  const buildChatSystemPrompt = () => `You are an expert personal trainer and exercise science coach. You answer questions about exercise form, muscle targeting, technique fixes, body mechanics, and training advice.

Be conversational, precise, and helpful. When someone describes what they feel or where they feel it, give them specific anatomical and practical advice. Use simple language but be accurate. Keep answers focused — 3-6 sentences unless detail is needed. Use bullet points when listing things. Always end with a practical tip they can try immediately.`;

  const parseResponse = (text) => {
    const sections = {};
    const parts = text.split(/\n(?=🎯|📋|⚠️|💡|📊|🔥)/);
    parts.forEach(part => {
      const firstLine = part.split("\n")[0].trim();
      const content = part.split("\n").slice(1).join("\n").trim();
      if (firstLine.includes("WHAT IT WORKS")) sections.muscles = content;
      else if (firstLine.includes("PROPER FORM")) sections.form = content;
      else if (firstLine.includes("COMMON MISTAKES")) sections.mistakes = content;
      else if (firstLine.includes("TIPS FOR EVERY LEVEL")) sections.tips = content;
      else if (firstLine.includes("RECOMMENDED SETS")) sections.sets = content;
      else if (firstLine.includes("MOTIVATION")) sections.motivation = content;
    });
    return sections;
  };
  console.log("GROQ KEY:", import.meta.env.VITE_GROQ_API_KEY)
  const callGroq = async (messages, maxTokens = 1024) => {
    const apiKey = import.meta.env.VITE_GROQ_API_KEY;
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({ model: "llama-3.1-8b-instant", max_tokens: maxTokens, messages })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error?.message || `HTTP ${response.status}`);
    return data.choices?.[0]?.message?.content?.trim();
  };

  const searchExercise = async (exerciseName) => {
    const name = (exerciseName || searchQuery).trim();
    if (!name) return;
    setLoading(true);
    setResult(null);
    try {
      const rawText = await callGroq([{ role: "user", content: buildExercisePrompt(name) }]);
      if (!rawText) throw new Error("No response");
      const parsed = parseResponse(rawText);
      const entry = {
        exercise: name, raw: rawText, sections: parsed,
        timestamp: new Date().toISOString(),
        date: new Date().toLocaleDateString("en-IN")
      };
      setResult(entry);
      setHistory(prev => [entry, ...prev.filter(h => h.exercise.toLowerCase() !== name.toLowerCase())].slice(0, 10));
      if (uid && db && collection && addDoc) {
        try { await addDoc(collection(db, "exerciseGuideHistory"), { uid, exercise: name, timestamp: new Date().toISOString() }); }
        catch (e) { /* non-critical */ }
      }
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    } catch (e) {
      setResult({ error: `❌ ${e.message || "Couldn't load guide."}` });
    }
    setLoading(false);
  };

  const sendChat = async (overrideMsg) => {
    const userMsg = (overrideMsg || chatInput).trim();
    if (!userMsg || chatLoading) return;
    setChatInput("");
    const newHistory = [...chatHistory, { role: "user", content: userMsg }];
    setChatHistory(newHistory);
    setChatLoading(true);
    try {
      const messages = [
        { role: "system", content: buildChatSystemPrompt() },
        ...newHistory.slice(-10) // keep last 10 turns for context
      ];
      const reply = await callGroq(messages, 800);
      setChatHistory(prev => [...prev, { role: "assistant", content: reply }]);
    } catch (e) {
      setChatHistory(prev => [...prev, { role: "assistant", content: `❌ Error: ${e.message}` }]);
    }
    setChatLoading(false);
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  const handleSearchKey = (e) => { if (e.key === "Enter") searchExercise(); };
  const handleChatKey = (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChat(); } };

  const SECTION_STYLES = {
    muscles:    { color: "#4ade80", bg: "rgba(74,222,128,.08)",  border: "rgba(74,222,128,.2)",  icon: "🎯" },
    form:       { color: "#38bdf8", bg: "rgba(56,189,248,.08)",  border: "rgba(56,189,248,.2)",  icon: "📋" },
    mistakes:   { color: "#f87171", bg: "rgba(248,113,113,.08)", border: "rgba(248,113,113,.2)", icon: "⚠️" },
    tips:       { color: "#a78bfa", bg: "rgba(167,139,250,.08)", border: "rgba(167,139,250,.2)", icon: "💡" },
    sets:       { color: "#fb923c", bg: "rgba(251,146,60,.08)",  border: "rgba(251,146,60,.2)",  icon: "📊" },
    motivation: { color: "#fbbf24", bg: "rgba(251,191,36,.08)",  border: "rgba(251,191,36,.3)",  icon: "🔥" },
  };
  const LABELS = {
    muscles: "What It Works", form: "Proper Form", mistakes: "Common Mistakes",
    tips: "Tips For Every Level", sets: "Sets & Reps Guide", motivation: "Why This Exercise",
  };

  return (
    <div style={{ maxWidth: 720, margin: "0 auto" }}>

      {/* ── Header + Mode Toggle ── */}
      <div style={{ marginBottom: 20 }}>
        <div style={{
          background: "linear-gradient(135deg, rgba(59,130,246,.1), rgba(167,139,250,.06))",
          border: "1px solid rgba(59,130,246,.25)", borderRadius: 16, padding: 20, marginBottom: 16
        }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
            <div>
              <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 800, fontSize: 20, marginBottom: 2, color: "var(--text)" }}>
                🏋️ Exercise Guide
              </div>
              <div style={{ fontSize: 10, color: "var(--muted)", letterSpacing: ".04em" }}>
                powered by AI
              </div>
            </div>
            {/* Mode toggle */}
            <div style={{ display: "flex", background: "var(--s2)", borderRadius: 10, border: "1px solid var(--border)", overflow: "hidden" }}>
              {[["search", "🔍 Guide"], ["chat", "💬 Ask"]].map(([m, label]) => (
                <button key={m} onClick={() => setMode(m)} style={{
                  padding: "7px 14px", border: "none", cursor: "pointer",
                  background: mode === m ? "rgba(59,130,246,.2)" : "transparent",
                  color: mode === m ? "var(--blue)" : "var(--muted)",
                  fontWeight: 700, fontSize: 12, fontFamily: "'DM Sans',sans-serif",
                  borderRight: m === "search" ? "1px solid var(--border)" : "none",
                  transition: "all .15s"
                }}>{label}</button>
              ))}
            </div>
          </div>

          {mode === "search" ? (
            <>
              <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 12 }}>
                Search any exercise — get muscles, form, common mistakes & level tips
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <input ref={inputRef} className="fi"
                  style={{ flex: 1, fontSize: 15, fontWeight: 600, borderColor: "rgba(59,130,246,.3)", background: "var(--s2)" }}
                  placeholder="e.g. Bench Press, Deadlift, Plank..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={handleSearchKey}
                />
                <button onClick={() => searchExercise()} disabled={loading || !searchQuery.trim()} style={{
                  padding: "10px 20px", borderRadius: 10, border: "none",
                  background: (loading || !searchQuery.trim()) ? "var(--s3)" : "linear-gradient(135deg,#3b82f6,#6366f1)",
                  color: (loading || !searchQuery.trim()) ? "var(--muted)" : "#fff",
                  cursor: (loading || !searchQuery.trim()) ? "not-allowed" : "pointer",
                  fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: 14,
                  boxShadow: (loading || !searchQuery.trim()) ? "none" : "0 4px 16px rgba(59,130,246,.3)", flexShrink: 0
                }}>{loading ? "..." : "Search"}</button>
              </div>
            </>
          ) : (
            <div style={{ fontSize: 12, color: "var(--muted)" }}>
              Ask anything about exercise form, muscle targeting, technique fixes, or training questions
            </div>
          )}
        </div>

        {/* Quick pills */}
        {mode === "search" && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)", alignSelf: "center" }}>Quick:</span>
            {QUICK_SEARCHES.map(ex => (
              <button key={ex} onClick={() => { setSearchQuery(ex); searchExercise(ex); }} style={{
                padding: "4px 12px", borderRadius: 20, background: "var(--s2)",
                border: "1px solid var(--border)", color: "var(--muted2)", fontSize: 11,
                fontWeight: 600, cursor: "pointer", transition: "all .15s"
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--blue)"; e.currentTarget.style.color = "var(--blue)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--muted2)"; }}
              >{ex}</button>
            ))}
          </div>
        )}

        {mode === "chat" && chatHistory.length === 0 && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)", marginBottom: 8 }}>Try asking:</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {QUICK_QUESTIONS.map(q => (
                <button key={q} onClick={() => { setChatInput(q); sendChat(q); }} style={{
                  padding: "6px 12px", borderRadius: 20, background: "var(--s2)",
                  border: "1px solid var(--border)", color: "var(--muted2)", fontSize: 11,
                  fontWeight: 500, cursor: "pointer", textAlign: "left", transition: "all .15s"
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--purple)"; e.currentTarget.style.color = "var(--purple)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--muted2)"; }}
                >{q}</button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── SEARCH MODE RESULTS ── */}
      {mode === "search" && (
        <>
          {loading && (
            <div style={{ background: "var(--s1)", border: "1px solid var(--border)", borderRadius: 16, padding: 28, textAlign: "center" }}>
              <div style={{ width: 48, height: 48, borderRadius: "50%", border: "3px solid var(--border)", borderTopColor: "var(--blue)", animation: "sp .8s linear infinite", margin: "0 auto 16px" }} />
              <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: 15, marginBottom: 6 }}>Analyzing {searchQuery}...</div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>Getting muscles, form cues, tips & more</div>
            </div>
          )}
          {!loading && result && (
            <div ref={resultRef} style={{ animation: "fadeUp .4s ease" }}>
              {result.error ? (
                <div style={{ background: "rgba(248,113,113,.08)", border: "1px solid rgba(248,113,113,.2)", borderRadius: 12, padding: 16, color: "var(--red)", fontSize: 13 }}>{result.error}</div>
              ) : (
                <div>
                  <div style={{ background: "linear-gradient(135deg, rgba(59,130,246,.12), rgba(99,102,241,.08))", border: "1px solid rgba(59,130,246,.25)", borderRadius: 16, padding: "16px 20px", marginBottom: 16, display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 48, height: 48, borderRadius: 14, background: "rgba(59,130,246,.15)", border: "1.5px solid rgba(59,130,246,.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>🏋️</div>
                    <div>
                      <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 900, fontSize: 22, color: "var(--blue)", textTransform: "capitalize" }}>{result.exercise}</div>
                      <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>Complete guide · Beginner to Advanced</div>
                    </div>
                    {/* Ask follow-up button */}
                    <button onClick={() => { setMode("chat"); setChatInput(`Tell me more about ${result.exercise} — `); }} style={{ marginLeft: "auto", padding: "7px 14px", borderRadius: 10, background: "rgba(167,139,250,.12)", border: "1px solid rgba(167,139,250,.3)", color: "var(--purple)", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>💬 Ask follow-up</button>
                  </div>
                  {Object.entries(result.sections).map(([key, content], i) => {
                    const style = SECTION_STYLES[key];
                    if (!style || !content) return null;
                    return (
                      <div key={key} style={{ background: style.bg, border: "1px solid " + style.border, borderRadius: 14, padding: "16px 18px", marginBottom: 12, animation: `cardEntrance .4s ease ${i * 0.07}s both` }}>
                        <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 800, fontSize: 13, color: style.color, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>{style.icon} {LABELS[key]}</div>
                        <div style={{ fontSize: 13, lineHeight: 1.75, color: "var(--text)", whiteSpace: "pre-wrap" }}>{content}</div>
                      </div>
                    );
                  })}
                  <div style={{ marginTop: 20, display: "flex", gap: 8, justifyContent: "center" }}>
                    <button onClick={() => { setResult(null); setSearchQuery(""); inputRef.current?.focus(); }} style={{ padding: "10px 24px", borderRadius: 10, background: "var(--s2)", border: "1px solid var(--border)", color: "var(--muted2)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>← Search Another</button>
                  </div>
                </div>
              )}
            </div>
          )}
          {!loading && !result && history.length > 0 && (
            <div style={{ background: "var(--s1)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
              <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: 13 }}>🕐 Recent Searches</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", padding: "12px 16px" }}>
                {history.map((h, i) => (
                  <button key={i} onClick={() => { setSearchQuery(h.exercise); searchExercise(h.exercise); }} style={{ padding: "5px 12px", borderRadius: 20, background: "var(--s2)", border: "1px solid var(--border)", color: "var(--muted2)", fontSize: 12, fontWeight: 600, cursor: "pointer", textTransform: "capitalize" }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--blue)"; e.currentTarget.style.color = "var(--blue)"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--muted2)"; }}
                  >{h.exercise}</button>
                ))}
              </div>
            </div>
          )}
          {!loading && !result && history.length === 0 && (
            <div style={{ textAlign: "center", padding: "40px 20px" }}>
              <div style={{ fontSize: 52, marginBottom: 14 }}>💪</div>
              <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 800, fontSize: 18, marginBottom: 8 }}>Any exercise, explained perfectly</div>
              <div style={{ fontSize: 13, color: "var(--muted)", maxWidth: 300, margin: "0 auto" }}>Search any exercise to get muscles, step-by-step form, mistakes to avoid, and tips for all levels.</div>
            </div>
          )}
        </>
      )}

      {/* ── CHAT MODE ── */}
      {mode === "chat" && (
        <div style={{ background: "var(--s1)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden" }}>
          {/* Chat messages */}
          <div style={{ minHeight: 300, maxHeight: 480, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
            {chatHistory.length === 0 && (
              <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--muted)" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>💬</div>
                <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text)", marginBottom: 6 }}>Ask anything about exercise</div>
                <div style={{ fontSize: 12 }}>Form fixes, muscle targeting, technique questions — anything goes</div>
              </div>
            )}
            {chatHistory.map((msg, i) => (
              <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
                <div style={{
                  maxWidth: "82%", padding: "10px 14px", borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                  background: msg.role === "user" ? "linear-gradient(135deg,#3b82f6,#6366f1)" : "var(--s2)",
                  border: msg.role === "user" ? "none" : "1px solid var(--border)",
                  color: msg.role === "user" ? "#fff" : "var(--text)",
                  fontSize: 13, lineHeight: 1.65, whiteSpace: "pre-wrap"
                }}>
                  {msg.role === "assistant" && (
                    <div style={{ fontSize: 10, fontWeight: 700, color: "var(--purple)", marginBottom: 5, textTransform: "uppercase", letterSpacing: ".05em" }}>🏋️ Coach</div>
                  )}
                  {msg.content}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div style={{ display: "flex", justifyContent: "flex-start" }}>
                <div style={{ padding: "10px 16px", borderRadius: "16px 16px 16px 4px", background: "var(--s2)", border: "1px solid var(--border)", display: "flex", gap: 5, alignItems: "center" }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--muted)", animation: `bounce .9s ease ${i * 0.15}s infinite` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Chat input */}
          <div style={{ borderTop: "1px solid var(--border)", padding: 12, display: "flex", gap: 8 }}>
            <textarea
              className="fi"
              style={{ flex: 1, resize: "none", minHeight: 42, maxHeight: 100, fontSize: 13, fontFamily: "'DM Sans',sans-serif", lineHeight: 1.5 }}
              placeholder="Ask about form, muscles, technique fixes..."
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={handleChatKey}
              rows={1}
            />
            <button onClick={() => sendChat()} disabled={chatLoading || !chatInput.trim()} style={{
              padding: "10px 18px", borderRadius: 10, border: "none",
              background: (chatLoading || !chatInput.trim()) ? "var(--s3)" : "linear-gradient(135deg,#6366f1,#3b82f6)",
              color: (chatLoading || !chatInput.trim()) ? "var(--muted)" : "#fff",
              cursor: (chatLoading || !chatInput.trim()) ? "not-allowed" : "pointer",
              fontWeight: 700, fontSize: 13, flexShrink: 0,
              boxShadow: (chatLoading || !chatInput.trim()) ? "none" : "0 4px 14px rgba(99,102,241,.3)"
            }}>Send</button>
          </div>
          <div style={{ padding: "0 12px 10px", fontSize: 10, color: "var(--muted)" }}>Enter to send · Shift+Enter for new line</div>
        </div>
      )}
    </div>
  );
}
// ═══════════════════════════════════════════════════════════════════════════════
// FEATURE 3: CAN I EAT THIS?
// ═══════════════════════════════════════════════════════════════════════════════

export function CanIEatThis({ client, mealLogs, targetNutrition, mealPlan, db, doc, updateDoc, collection, addDoc, serverTimestamp }) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const inputRef = useRef(null);

  const QUICK_FOODS = [
    "🍕 Pizza (2 slices)", "🍔 Burger", "🍚 Biryani", "🍫 Chocolate",
    "🥤 Cold drink", "🍟 Fries", "🍩 Donut", "🧁 Cupcake",
    "🍜 Maggi", "🥛 Protein shake"
  ];

  // Calculate today's nutrition from mealLogs
  const getTodayStats = () => {
    const logs = mealLogs || {};
    const loggedCal     = Object.values(logs).reduce((a, m) => a + (parseFloat(m?.cal)     || 0), 0);
    const loggedProtein = Object.values(logs).reduce((a, m) => a + (parseFloat(m?.protein) || 0), 0);
    const loggedCarbs   = Object.values(logs).reduce((a, m) => a + (parseFloat(m?.carbs)   || 0), 0);
    const loggedFats    = Object.values(logs).reduce((a, m) => a + (parseFloat(m?.fats)    || 0), 0);

    const goalCal     = targetNutrition?.calories || 2000;
    const goalProtein = targetNutrition?.protein  || 150;
    const goalCarbs   = targetNutrition?.carbs    || 200;
    const goalFats    = targetNutrition?.fats     || 60;

    return {
      logged: { cal: loggedCal, protein: loggedProtein, carbs: loggedCarbs, fats: loggedFats },
      goal:   { cal: goalCal,   protein: goalProtein,   carbs: goalCarbs,   fats: goalFats   },
      remaining: {
        cal:     goalCal     - loggedCal,
        protein: goalProtein - loggedProtein,
        carbs:   goalCarbs   - loggedCarbs,
        fats:    goalFats    - loggedFats,
      },
      pct: Math.round((loggedCal / goalCal) * 100)
    };
  };

  const buildPrompt = (foodItem, stats) => {
    const mealsLogged = Object.keys(mealLogs || {});
    const mealsSummary = mealsLogged.length > 0
      ? mealsLogged.map(m => {
          const l = mealLogs[m];
          return `${m}: ${l.cal}kcal, P${l.protein}g, C${l.carbs}g, F${l.fats}g`;
        }).join("\n")
      : "No meals logged yet today";

    return `You are a fun, honest fitness nutrition coach. A client wants to know if they can eat something right now.

CLIENT PROFILE:
- Name: ${client?.name?.split(" ")[0] || "the client"}
- Goal: ${client?.primaryGoal || "Fat Loss"}
- Phase: ${client?.phase || "Cut"}
- Week: ${client?.week || 1}

TODAY'S NUTRITION SO FAR:
${mealsSummary}

TOTALS SO FAR:
- Calories: ${Math.round(stats.logged.cal)} / ${stats.goal.cal} kcal (${stats.pct}% of goal)
- Protein: ${Math.round(stats.logged.protein)} / ${stats.goal.protein}g
- Carbs: ${Math.round(stats.logged.carbs)} / ${stats.goal.carbs}g
- Fats: ${Math.round(stats.logged.fats)} / ${stats.goal.fats}g

REMAINING BUDGET:
- Calories left: ${Math.round(stats.remaining.cal)} kcal
- Protein left: ${Math.round(stats.remaining.protein)}g
- Carbs left: ${Math.round(stats.remaining.carbs)}g
- Fats left: ${Math.round(stats.remaining.fats)}g

THE FOOD THEY WANT TO EAT: "${foodItem}"

YOUR JOB:
1. Estimate the approximate nutrition of "${foodItem}" (calories, protein, carbs, fats)
2. Check if it fits their remaining budget
3. Give an honest, fun, personalized verdict

Response format - respond ONLY with this JSON (no markdown, no extra text):
{
  "food": "name of food as understood",
  "estimate": {
    "cal": number,
    "protein": number,
    "carbs": number,
    "fats": number
  },
  "verdict": "YES" | "MAYBE" | "NO",
  "emoji": "single relevant emoji",
  "headline": "short punchy verdict line (max 8 words)",
  "message": "2-3 sentence honest fun explanation referencing their actual data",
  "tip": "one practical tip or smart swap if needed",
  "fitsInBudget": true | false
}`;
  };

  const checkFood = async (overrideFood) => {
    const food = (overrideFood || input).trim();
    if (!food) return;
    setLoading(true);
    setResult(null);

    const stats = getTodayStats();

    try {
      const apiKey = import.meta.env.VITE_GROQ_API_KEY;
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          max_tokens: 600,
          messages: [{ role: "user", content: buildPrompt(food, stats) }]
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data?.error?.message || `HTTP ${response.status}`);

      let rawText = data.choices?.[0]?.message?.content?.trim();
      if (!rawText) throw new Error("No response");

      // Strip markdown fences if present
      rawText = rawText.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(rawText);

      const entry = { ...parsed, stats, queriedFood: food, timestamp: new Date().toISOString() };
      setResult(entry);
      setHistory(prev => [entry, ...prev].slice(0, 5));

      // Save to Firestore optionally
      if (client?.id && db && collection && addDoc) {
        try {
          await addDoc(collection(db, "canIEatThis"), {
            clientId: client.id,
            food: parsed.food,
            verdict: parsed.verdict,
            calories: parsed.estimate?.cal,
            timestamp: new Date().toISOString(),
          });
        } catch (e) { /* non-critical */ }
      }

    } catch (e) {
      setResult({ error: `❌ ${e.message || "Couldn't analyze. Try again!"}` });
    }
    setLoading(false);
  };

  const handleKey = (e) => { if (e.key === "Enter") checkFood(); };

  const VERDICT_STYLES = {
    YES:   { color: "#22c55e", bg: "rgba(34,197,94,.1)",   border: "rgba(34,197,94,.3)",   label: "Go for it!" },
    MAYBE: { color: "#fbbf24", bg: "rgba(251,191,36,.1)",  border: "rgba(251,191,36,.3)",  label: "Maybe..." },
    NO:    { color: "#f87171", bg: "rgba(248,113,113,.1)", border: "rgba(248,113,113,.3)", label: "Not today" },
  };

  const stats = getTodayStats();
  const hasLogs = Object.keys(mealLogs || {}).length > 0;

  return (
    <div style={{ marginTop: 16 }}>

      {/* ── Header card ── */}
      <div style={{
        background: "linear-gradient(135deg, rgba(251,191,36,.08), rgba(251,146,60,.06))",
        border: "1px solid rgba(251,191,36,.25)", borderRadius: 16,
        padding: 18, marginBottom: 14
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <div style={{ fontSize: 28 }}>🤔</div>
          <div>
            <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 800, fontSize: 16, color: "var(--text)" }}>
              Can I Eat This?
            </div>
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 1 }}>
              AI checks your calorie budget & gives an honest verdict
            </div>
          </div>
        </div>

        {/* Today's budget summary */}
        <div style={{
          background: "var(--s2)", borderRadius: 10, padding: "10px 14px",
          border: "1px solid var(--border)", marginBottom: 12
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 8 }}>
            Your Budget Today
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
            {[
              ["🔥 Left", Math.round(stats.remaining.cal) + " kcal", stats.remaining.cal > 200 ? "var(--green)" : stats.remaining.cal > 0 ? "var(--orange)" : "var(--red)"],
              ["Used", Math.round(stats.logged.cal) + " kcal", "var(--muted)"],
              ["Goal", stats.goal.cal + " kcal", "var(--blue)"],
            ].map(([l, v, co]) => (
              <div key={l} style={{ flex: 1, minWidth: 70, background: "var(--s1)", borderRadius: 8, padding: "8px 10px", border: "1px solid var(--border)", textAlign: "center" }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", marginBottom: 3 }}>{l}</div>
                <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 800, fontSize: 13, color: co }}>{v}</div>
              </div>
            ))}
          </div>
          {/* Progress bar */}
          <div style={{ height: 6, borderRadius: 3, background: "var(--border)", overflow: "hidden" }}>
            <div style={{
              height: "100%", borderRadius: 3,
              width: Math.min(stats.pct, 100) + "%",
              background: stats.pct > 100 ? "var(--red)" : stats.pct > 80 ? "var(--orange)" : "var(--green)",
              transition: "width .8s ease"
            }} />
          </div>
          <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 4, textAlign: "right" }}>
            {stats.pct}% of daily goal used
          </div>
          {!hasLogs && (
            <div style={{ marginTop: 8, fontSize: 11, color: "var(--orange)", fontWeight: 600 }}>
              ⚠️ Log your meals above for accurate analysis
            </div>
          )}
        </div>

        {/* Input */}
        <div style={{ display: "flex", gap: 8 }}>
          <input
            ref={inputRef}
            className="fi"
            style={{ flex: 1, fontSize: 14, fontWeight: 600, borderColor: "rgba(251,191,36,.4)", background: "var(--s2)" }}
            placeholder="e.g. 2 slices of pizza, a samosa, chocolate..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
          />
          <button
            onClick={() => checkFood()}
            disabled={loading || !input.trim()}
            style={{
              padding: "10px 18px", borderRadius: 10, border: "none", flexShrink: 0,
              background: (loading || !input.trim())
                ? "var(--s3)"
                : "linear-gradient(135deg,#f59e0b,#f97316)",
              color: (loading || !input.trim()) ? "var(--muted)" : "#fff",
              cursor: (loading || !input.trim()) ? "not-allowed" : "pointer",
              fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: 13,
              boxShadow: (loading || !input.trim()) ? "none" : "0 4px 14px rgba(245,158,11,.35)",
              transition: "all .2s"
            }}
          >
            {loading ? "⏳" : "Check!"}
          </button>
        </div>

        {/* Quick food pills */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
          {QUICK_FOODS.map(f => (
            <button key={f} onClick={() => { setInput(f); checkFood(f); }} style={{
              padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600,
              background: "var(--s2)", border: "1px solid var(--border)",
              color: "var(--muted2)", cursor: "pointer", transition: "all .15s"
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "#f59e0b"; e.currentTarget.style.color = "#f59e0b"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--muted2)"; }}
            >{f}</button>
          ))}
        </div>
      </div>

      {/* ── Loading ── */}
      {loading && (
        <div style={{
          background: "var(--s1)", border: "1px solid var(--border)",
          borderRadius: 14, padding: "24px 20px", textAlign: "center"
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: "50%",
            border: "3px solid var(--border)", borderTopColor: "#f59e0b",
            animation: "sp .8s linear infinite", margin: "0 auto 14px"
          }} />
          <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: 14 }}>
            Analyzing your budget...
          </div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
            Checking calories, macros & your goal
          </div>
        </div>
      )}

      {/* ── Result ── */}
      {!loading && result && !result.error && (() => {
        const vs = VERDICT_STYLES[result.verdict] || VERDICT_STYLES.MAYBE;
        const afterCal = stats.logged.cal + (result.estimate?.cal || 0);
        const afterPct = Math.round((afterCal / stats.goal.cal) * 100);

        return (
          <div style={{ animation: "bounceIn .4s ease" }}>
            {/* Verdict hero */}
            <div style={{
              background: vs.bg, border: "1px solid " + vs.border,
              borderRadius: 16, padding: 20, marginBottom: 12, textAlign: "center"
            }}>
              <div style={{ fontSize: 52, marginBottom: 8 }}>{result.emoji}</div>
              <div style={{
                fontFamily: "'Outfit',sans-serif", fontWeight: 900, fontSize: 28,
                color: vs.color, marginBottom: 4
              }}>{result.headline}</div>
              <div style={{
                display: "inline-block", padding: "4px 16px", borderRadius: 20,
                background: vs.color + "22", border: "1px solid " + vs.color + "55",
                color: vs.color, fontWeight: 700, fontSize: 13, marginBottom: 14
              }}>{vs.label}</div>

              <div style={{
                fontSize: 14, lineHeight: 1.7, color: "var(--text)",
                fontWeight: 500, maxWidth: 440, margin: "0 auto"
              }}>{result.message}</div>
            </div>

            {/* Nutrition breakdown */}
            <div style={{
              background: "var(--s1)", border: "1px solid var(--border)",
              borderRadius: 14, padding: 16, marginBottom: 12
            }}>
              <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: 13, marginBottom: 12 }}>
                📊 Nutrition Breakdown — {result.food}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 14 }}>
                {[
                  ["Cal", result.estimate?.cal, "var(--green)", "kcal"],
                  ["Protein", result.estimate?.protein, "var(--purple)", "g"],
                  ["Carbs", result.estimate?.carbs, "var(--orange)", "g"],
                  ["Fat", result.estimate?.fats, "var(--red)", "g"],
                ].map(([l, v, co, u]) => (
                  <div key={l} style={{
                    background: "var(--s2)", borderRadius: 10, padding: "10px 8px",
                    border: "1px solid var(--border)", textAlign: "center"
                  }}>
                    <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 800, fontSize: 16, color: co }}>
                      {v}<span style={{ fontSize: 10, fontWeight: 500 }}>{u}</span>
                    </div>
                    <div style={{ fontSize: 10, color: "var(--muted)", fontWeight: 600, marginTop: 2 }}>{l}</div>
                  </div>
                ))}
              </div>

              {/* Before / After calorie bar */}
              <div style={{ marginBottom: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 600, color: "var(--muted)", marginBottom: 5 }}>
                  <span>Before eating</span>
                  <span>After eating</span>
                </div>
                <div style={{ height: 10, borderRadius: 5, background: "var(--border)", overflow: "hidden", position: "relative" }}>
                  {/* Already eaten */}
                  <div style={{
                    position: "absolute", left: 0, top: 0, height: "100%",
                    width: Math.min((stats.logged.cal / stats.goal.cal) * 100, 100) + "%",
                    background: "var(--green)", borderRadius: "5px 0 0 5px", transition: "width .8s ease"
                  }} />
                  {/* This food adds */}
                  <div style={{
                    position: "absolute", top: 0, height: "100%",
                    left: Math.min((stats.logged.cal / stats.goal.cal) * 100, 100) + "%",
                    width: Math.min(((result.estimate?.cal || 0) / stats.goal.cal) * 100, 100 - Math.min((stats.logged.cal / stats.goal.cal) * 100, 100)) + "%",
                    background: result.verdict === "YES" ? "#22c55e99" : result.verdict === "MAYBE" ? "#fbbf2499" : "#f8717199",
                    transition: "width .8s ease"
                  }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--muted)", marginTop: 4 }}>
                  <span>{Math.round(stats.logged.cal)} kcal used</span>
                  <span style={{ color: afterPct > 100 ? "var(--red)" : afterPct > 85 ? "var(--orange)" : "var(--green)", fontWeight: 700 }}>
                    → {Math.round(afterCal)} kcal ({afterPct}% of goal)
                  </span>
                </div>
              </div>
            </div>

            {/* Tip */}
            {result.tip && (
              <div style={{
                background: "rgba(59,130,246,.06)", border: "1px solid rgba(59,130,246,.2)",
                borderRadius: 12, padding: "12px 14px", marginBottom: 12,
                display: "flex", gap: 10, alignItems: "flex-start"
              }}>
                <div style={{ fontSize: 18, flexShrink: 0 }}>💡</div>
                <div style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.6 }}>
                  <strong style={{ color: "var(--blue)" }}>Coach tip: </strong>{result.tip}
                </div>
              </div>
            )}

            {/* Try another */}
            <button
              onClick={() => { setResult(null); setInput(""); inputRef.current?.focus(); }}
              style={{
                width: "100%", padding: "11px", borderRadius: 10,
                background: "var(--s2)", border: "1px solid var(--border)",
                color: "var(--muted2)", fontSize: 13, fontWeight: 600, cursor: "pointer"
              }}
            >🔄 Check Another Food</button>
          </div>
        );
      })()}

      {/* ── Error ── */}
      {!loading && result?.error && (
        <div style={{
          background: "rgba(248,113,113,.08)", border: "1px solid rgba(248,113,113,.2)",
          borderRadius: 12, padding: 14, color: "var(--red)", fontSize: 13
        }}>{result.error}</div>
      )}

      {/* ── History ── */}
      {!loading && !result && history.length > 0 && (
        <div style={{ background: "var(--s1)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: 13 }}>
            🕐 Recent Checks
          </div>
          {history.map((h, i) => {
            const vs = VERDICT_STYLES[h.verdict] || VERDICT_STYLES.MAYBE;
            return (
              <div key={i} style={{
                padding: "10px 16px", borderBottom: i < history.length - 1 ? "1px solid var(--border)" : "none",
                display: "flex", alignItems: "center", gap: 10, cursor: "pointer"
              }} onClick={() => { setInput(h.queriedFood); checkFood(h.queriedFood); }}>
                <div style={{ fontSize: 20 }}>{h.emoji}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{h.food}</div>
                  <div style={{ fontSize: 11, color: "var(--muted)" }}>~{h.estimate?.cal} kcal</div>
                </div>
                <div style={{
                  padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                  background: vs.color + "18", color: vs.color, border: "1px solid " + vs.color + "44"
                }}>{vs.label}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
// ═══════════════════════════════════════════════════════════════════════════════
// MONDAY MESSAGES + SUNDAY REPORTS SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════

export function MondayMessagesSection({ clients, coachUid, db, doc, updateDoc, collection, addDoc, getDocs, query, where, serverTimestamp, toast }) {
  const [messages, setMessages] = useState({});
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [flaggedIdx, setFlaggedIdx] = useState(0);
  const [editingMsg, setEditingMsg] = useState(null);
  const [view, setView] = useState("dashboard"); // "dashboard" | "flagged"
  const today = new Date().toLocaleDateString("en-IN");
  const todayFull = new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  const callGroq = async (prompt) => {
    const apiKey = import.meta.env.VITE_GROQ_API_KEY;
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({ model: "llama-3.1-8b-instant", max_tokens: 200, messages: [{ role: "user", content: prompt }] })
    });
    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim();
  };

  const buildPrompt = (c) => {
    const checkins = c.weeklyCheckins || [];
    const latest = [...checkins].sort((a,b) => (b.week||0)-(a.week||0))[0];
    const prev = checkins[checkins.length - 2];
    const weightChange = latest?.weight && prev?.weight ? (prev.weight - latest.weight).toFixed(1) : null;
    const workout = (() => {
      const days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
      const day = days[new Date().getDay()];
      const plan = (c.workoutPlan||[]).find(d => d.day === day);
      return plan?.type === "Rest" ? "Rest Day" : plan ? `${plan.type} Day` : "Training Day";
    })();
    return `You are a motivational fitness coach writing a Monday check-in message. Write a SHORT personal message (MAX 80 words).

Client: ${c.name?.split(" ")[0]}
Goal: ${c.primaryGoal || "Fitness"}
Phase: ${c.phase} — Week ${c.week}
Today's workout: ${workout}
Last weight: ${latest?.weight || "not logged"}kg
Weight change: ${weightChange ? (weightChange > 0 ? `-${weightChange}kg lost` : `+${Math.abs(weightChange)}kg gained`) : "tracking"}
Sleep quality: ${latest?.sleepQuality || "N/A"}/10
Training adherence: ${latest?.trainingAdherence || "N/A"}/10
Last win: ${latest?.wins || "none logged"}

Rules: Be personal, specific, energetic. Max 80 words. End with an emoji. Never be generic.
Write ONLY the message, no quotes, no label:`;
  };

  const safetyCheck = (msg, client) => {
    const checks = {
      hasName: msg.toLowerCase().includes(client.name?.split(" ")[0].toLowerCase()),
      notTooLong: msg.split(" ").length <= 100,
      hasPositiveTone: !msg.toLowerCase().includes("fail") && !msg.toLowerCase().includes("bad"),
      noExtremeValues: true,
    };
    const passed = Object.values(checks).filter(Boolean).length;
    return passed >= 3 ? "safe" : "flagged";
  };

  const generateAll = async () => {
    setGenerating(true);
    const results = {};
    for (const client of clients) {
      if (!client.id) continue;
      try {
        const checkins = client.weeklyCheckins || [];
        const latest = [...checkins].sort((a,b)=>(b.week||0)-(a.week||0))[0];
        
        if (checkins.length === 0) {
          results[client.id] = { status: "missing", client, message: "" };
          continue;
        }

        const weightHistory = client.weightHistory || [];
        const lastTwo = weightHistory.slice(-2);
        const weightJump = lastTwo.length === 2 ? Math.abs(lastTwo[1].weight - lastTwo[0].weight) > 3 : false;

        const msg = await callGroq(buildPrompt(client));
        if (!msg) { results[client.id] = { status: "missing", client, message: "" }; continue; }

        const status = weightJump ? "flagged" : safetyCheck(msg, client);
        results[client.id] = { status, client, message: msg, flagReason: weightJump ? `Weight jumped ${Math.abs(lastTwo[1].weight - lastTwo[0].weight).toFixed(1)}kg` : null };
      } catch (e) {
        results[client.id] = { status: "missing", client, message: "" };
      }
    }
    setMessages(results);
    setGenerating(false);
  };

  const sendAll = async () => {
    const safeOnes = Object.values(messages).filter(m => m.status === "safe");
    if (safeOnes.length === 0) return;
    setSending(true);
    for (const { client, message } of safeOnes) {
      await updateDoc(doc(db, "clients", client.id), {
        coachMessage: message,
        lastMondayMessage: message,
        lastMondayMessageDate: today,
      });
      await addDoc(collection(db, "clients", client.id, "messages"), {
        type: "monday_checkin",
        content: message,
        sentAt: serverTimestamp(),
        isRead: false,
        readAt: null,
      });
    }
    toast(`${safeOnes.length} messages sent!`, "success");
    setSending(false);
  };

  const sendSingle = async (clientId) => {
    const m = messages[clientId];
    if (!m) return;
    await updateDoc(doc(db, "clients", clientId), {
      coachMessage: m.message,
      lastMondayMessage: m.message,
      lastMondayMessageDate: today,
    });
    await addDoc(collection(db, "clients", clientId, "messages"), {
      type: "monday_checkin", content: m.message, sentAt: serverTimestamp(), isRead: false, readAt: null,
    });
    setMessages(prev => ({ ...prev, [clientId]: { ...prev[clientId], sent: true } }));
    toast(`Sent to ${m.client.name}!`, "success");
  };

  const safe = Object.values(messages).filter(m => m.status === "safe");
  const flagged = Object.values(messages).filter(m => m.status === "flagged");
  const missing = Object.values(messages).filter(m => m.status === "missing");
  const hasGenerated = Object.keys(messages).length > 0;

  if (view === "flagged") {
    const fl = flagged[flaggedIdx];
    if (!fl) { setView("dashboard"); return null; }
    return (
      <div style={{ maxWidth: 600, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <button className="btn btn-s btn-sm" onClick={() => setView("dashboard")}>← Back</button>
          <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 800, fontSize: 16 }}>
            ⚠️ Review Flagged — {flaggedIdx + 1} of {flagged.length}
          </div>
        </div>
        <div style={{ background: "rgba(251,191,36,.08)", border: "1px solid rgba(251,191,36,.3)", borderRadius: 16, padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--green-bg)", border: "1.5px solid var(--green-b)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Outfit',sans-serif", fontWeight: 800, fontSize: 14, color: "var(--green)" }}>
              {fl.client.name?.split(" ").map(w=>w[0]).join("").slice(0,2)}
            </div>
            <div>
              <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 800, fontSize: 16 }}>{fl.client.name}</div>
              {fl.flagReason && <div style={{ fontSize: 11, color: "var(--yellow)", fontWeight: 600 }}>⚠️ {fl.flagReason}</div>}
            </div>
          </div>
          <textarea
            className="fta"
            style={{ minHeight: 140, fontSize: 14, lineHeight: 1.7, borderColor: "rgba(251,191,36,.4)", background: "rgba(251,191,36,.04)", marginBottom: 14 }}
            value={editingMsg !== null ? editingMsg : fl.message}
            onChange={e => setEditingMsg(e.target.value)}
          />
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-p" style={{ flex: 1 }} onClick={async () => {
              const finalMsg = editingMsg !== null ? editingMsg : fl.message;
              setMessages(prev => ({ ...prev, [fl.client.id]: { ...prev[fl.client.id], message: finalMsg, status: "safe" } }));
              await sendSingle(fl.client.id);
              setEditingMsg(null);
              if (flaggedIdx < flagged.length - 1) setFlaggedIdx(i => i + 1);
              else setView("dashboard");
            }}>Send ✅</button>
            <button className="btn btn-s" onClick={() => {
              setEditingMsg(null);
              if (flaggedIdx < flagged.length - 1) setFlaggedIdx(i => i + 1);
              else setView("dashboard");
            }}>Skip ⏭️</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ background: "linear-gradient(135deg,rgba(34,197,94,.1),rgba(59,130,246,.06))", border: "1px solid var(--green-b)", borderRadius: 16, padding: 20, marginBottom: 16 }}>
        <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 800, fontSize: 18, marginBottom: 4 }}>
          📬 Monday Messages
        </div>
        <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 16 }}>{todayFull} · {clients.length} clients</div>

        {!hasGenerated ? (
          <button className="btn btn-p" style={{ width: "100%", padding: 14, fontSize: 15 }} onClick={generateAll} disabled={generating}>
            {generating ? "🤖 Generating AI messages for all clients..." : "🤖 Generate All Messages"}
          </button>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 16 }}>
              {[
                ["✅ Safe to send", safe.length, "var(--green)", "rgba(34,197,94,.1)", "rgba(34,197,94,.3)"],
                ["⚠️ Needs review", flagged.length, "var(--yellow)", "rgba(251,191,36,.1)", "rgba(251,191,36,.3)"],
                ["❌ Missing data", missing.length, "var(--red)", "rgba(248,113,113,.1)", "rgba(248,113,113,.3)"],
              ].map(([label, count, color, bg, border]) => (
                <div key={label} style={{ background: bg, border: "1px solid " + border, borderRadius: 12, padding: "14px 10px", textAlign: "center" }}>
                  <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 900, fontSize: 28, color }}>{count}</div>
                  <div style={{ fontSize: 11, color, fontWeight: 700, marginTop: 3 }}>{label}</div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
              <button className="btn btn-p" style={{ flex: 1, padding: 12, fontSize: 14 }} onClick={sendAll} disabled={sending || safe.length === 0}>
                {sending ? "Sending..." : `🚀 Send ${safe.length} Safe Messages Now`}
              </button>
              {flagged.length > 0 && (
                <button className="btn btn-warn" style={{ padding: "10px 18px", fontSize: 13 }} onClick={() => { setView("flagged"); setFlaggedIdx(0); setEditingMsg(null); }}>
                  Review Flagged →
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {hasGenerated && (
        <div style={{ background: "var(--s1)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: 13 }}>
            All Generated Messages
          </div>
          {Object.values(messages).map((m, i) => {
            const statusColor = m.status === "safe" ? "var(--green)" : m.status === "flagged" ? "var(--yellow)" : "var(--red)";
            const statusLabel = m.status === "safe" ? "✅ Safe" : m.status === "flagged" ? "⚠️ Review" : "❌ Missing";
            return (
              <div key={m.client.id} style={{ padding: "14px 16px", borderBottom: i < Object.values(messages).length - 1 ? "1px solid var(--border)" : "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: m.message ? 8 : 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, flex: 1 }}>{m.client.name}</div>
                  <span style={{ padding: "2px 9px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: statusColor + "18", color: statusColor, border: "1px solid " + statusColor + "44" }}>
                    {statusLabel}
                  </span>
                  {m.message && !m.sent && (
                    <button className="btn btn-s btn-xs" onClick={() => sendSingle(m.client.id)}>Send</button>
                  )}
                  {m.sent && <span style={{ fontSize: 11, color: "var(--green)", fontWeight: 700 }}>✓ Sent</span>}
                </div>
                {m.message && (
                  <div style={{ fontSize: 13, color: "var(--muted2)", lineHeight: 1.6, background: "var(--s2)", borderRadius: 9, padding: "10px 12px", border: "1px solid var(--border)" }}>
                    {m.message}
                  </div>
                )}
                {m.flagReason && (
                  <div style={{ fontSize: 11, color: "var(--yellow)", marginTop: 5, fontWeight: 600 }}>⚠️ {m.flagReason}</div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function ClientMessageInbox({ uid, clientName, db, collection, onSnapshot, doc, updateDoc }) {
  const [messages, setMessages] = useState([]);
  const [openMsg, setOpenMsg] = useState(null);

  useEffect(() => {
    if (!uid) return;
    const q = collection(db, "clients", uid, "messages");
    return onSnapshot(q, snap => {
      const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => new Date(b.sentAt?.toDate?.() || 0) - new Date(a.sentAt?.toDate?.() || 0));
      setMessages(msgs);
    });
  }, [uid]);

  const unread = messages.filter(m => !m.isRead);
  const markRead = async (msg) => {
    if (msg.isRead) return;
    await updateDoc(doc(db, "clients", uid, "messages", msg.id), { isRead: true, readAt: new Date().toISOString() });
  };

  if (openMsg) return (
    <div style={{ animation: "fadeUp .3s ease" }}>
      <button className="btn btn-s btn-sm" style={{ marginBottom: 16 }} onClick={() => setOpenMsg(null)}>← Back</button>
      <div style={{ background: "var(--s1)", border: "1px solid var(--green-b)", borderRadius: 16, padding: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, paddingBottom: 16, borderBottom: "1px solid var(--border)" }}>
          <div style={{ width: 44, height: 44, borderRadius: "50%", background: "var(--green-bg)", border: "2px solid var(--green-b)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>👨‍💼</div>
          <div>
            <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 800, fontSize: 16 }}>Coach Ankit</div>
            <div style={{ fontSize: 11, color: "var(--muted)" }}>
              {openMsg.sentAt?.toDate ? openMsg.sentAt.toDate().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" }) : ""}
            </div>
          </div>
        </div>
        <div style={{ fontSize: 15, lineHeight: 1.8, color: "var(--text)", whiteSpace: "pre-wrap", marginBottom: 24 }}>
          {openMsg.content}
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-p" style={{ flex: 1 }} onClick={() => setOpenMsg(null)}>👍 Got it!</button>
        </div>
      </div>
    </div>
  );

  return (
    <div>
      {unread.length > 0 && (
        <div style={{ background: "linear-gradient(135deg,rgba(34,197,94,.15),rgba(167,139,250,.08))", border: "2px solid var(--green)", borderRadius: 16, padding: 20, marginBottom: 16, cursor: "pointer", animation: "glowPulse 2s ease infinite" }}
          onClick={() => { const msg = unread[0]; markRead(msg); setOpenMsg(msg); }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <span style={{ fontSize: 24 }}>✨</span>
            <div>
              <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 800, fontSize: 15, color: "var(--green)" }}>NEW FROM YOUR COACH</div>
              <div style={{ fontSize: 12, color: "var(--muted2)" }}>Monday Check-in Message 💪</div>
            </div>
            <span style={{ marginLeft: "auto", fontSize: 18 }}>→</span>
          </div>
          <div style={{ fontSize: 13, color: "var(--muted2)", lineHeight: 1.6, background: "rgba(0,0,0,.2)", borderRadius: 10, padding: "10px 14px" }}>
            {unread[0].content?.slice(0, 100)}...
          </div>
          <div style={{ fontSize: 11, color: "var(--green)", fontWeight: 700, marginTop: 10, textAlign: "center" }}>Tap to read →</div>
        </div>
      )}

      {messages.length > 0 && (
        <div style={{ background: "var(--s1)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: 13 }}>
            📬 Messages from Coach
          </div>
          {messages.map((msg, i) => (
            <div key={msg.id} style={{ padding: "14px 16px", borderBottom: i < messages.length - 1 ? "1px solid var(--border)" : "none", cursor: "pointer", background: !msg.isRead ? "rgba(34,197,94,.03)" : "transparent" }}
              onClick={() => { markRead(msg); setOpenMsg(msg); }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {!msg.isRead && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--green)", flexShrink: 0 }} />}
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: !msg.isRead ? 700 : 600, fontSize: 13 }}>
                    {msg.type === "monday_checkin" ? "Monday Check-in 💪" : msg.type === "sunday_report" ? "Sunday Progress Report 📊" : "Message from Coach"}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
                    {msg.sentAt?.toDate ? msg.sentAt.toDate().toLocaleDateString("en-IN") : ""}
                  </div>
                </div>
                <span style={{ fontSize: 12, color: "var(--muted)" }}>→</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════════
// HOW TO INTEGRATE — READ THIS CAREFULLY
// ═══════════════════════════════════════════════════════════════════════════════

/* 
═══════════════════════════════════════════════════
INTEGRATION POINT 1: Import in App.jsx
═══════════════════════════════════════════════════

At the top of App.jsx, update your import from "./additions":

  import {
    CSS_ADDITIONS,
    EnhancedFoodLogSection,
    ClientProfilePanel,
    AddClientFullscreenEnhanced,
    MyProfileSection,
    CoachMediaView,
    POSES,
    AIMotivationSection,   // ← ADD THIS
    AIExerciseGuide,       // ← ADD THIS
  } from "./additions";

═══════════════════════════════════════════════════
INTEGRATION POINT 2: Add "guide" tab to client tabs
═══════════════════════════════════════════════════

In App.jsx, find the `tabs` array for clients (around line where isCoach check is):

  const tabs = isCoach
    ? [["home", "Dashboard"], ["clients", "Clients"], ["analytics", "Analytics"]]
    : [["home", "Home"], ["checkin", "Weekly Check-in"], ["nutrition", "Nutrition"],
       ["sources", "My Sources"], ["training", "Training"], ["photos", "Photos"],
       ["comparison", "Compare"], ["chat", "Chat"],
       ["guide", "Exercise Guide"]];   // ← ADD THIS LINE

Also add the icon in the bottom nav icons object:
  const icons = {
    ...
    guide: "🏋️",  // ← ADD THIS
  };

═══════════════════════════════════════════════════
INTEGRATION POINT 3: Add Exercise Guide tab in ClientDash
═══════════════════════════════════════════════════

In ClientDash function, after the "if (tab === 'comparison')" block,
add this new block:

  if (tab === "guide") {
    return (
      <div className="page">
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 22, fontWeight: 800 }}>Exercise Guide</div>
          <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 5 }}>AI-powered form & technique coach</div>
        </div>
        <AIExerciseGuide
          uid={uid}
          db={db}
          doc={doc}
          updateDoc={updateDoc}
          collection={collection}
          addDoc={addDoc}
        />
      </div>
    );
  }

═══════════════════════════════════════════════════
INTEGRATION POINT 4: Add Motivation in client HOME tab
═══════════════════════════════════════════════════

In ClientDash, in the HOME section (the last return block),
find this line:
  
  <div className="card stagger-3" style={{ marginBottom: 16 }}>
    <div className="card-title">Message from Coach ...

BEFORE that card, add:

  <div className="card stagger-2b" style={{ marginBottom: 16 }}>
    <AIMotivationSection
      client={{ ...d, id: uid }}
      isCoach={false}
      db={db}
      doc={doc}
      updateDoc={updateDoc}
      collection={collection}
      addDoc={addDoc}
      getDocs={getDocs}
      query={query}
      where={where}
      serverTimestamp={serverTimestamp}
    />
  </div>

═══════════════════════════════════════════════════
INTEGRATION POINT 5 (BONUS): Add to Coach client view
═══════════════════════════════════════════════════

In CoachDash, add a new inner tab "motivation" to the tab bar:

  Find:  [["overview","Overview"],["checkins","Check-ins"], ...
  Add:   ["motivation","Motivation"],

Then in the tab content area, add:

  {innerTab === "motivation" && (
    <div className="card">
      <div className="card-title">AI Motivation for {sel.name}</div>
      <AIMotivationSection
        client={{ ...sel, id: selId }}
        isCoach={true}
        db={db}
        doc={doc}
        updateDoc={updateDoc}
        collection={collection}
        addDoc={addDoc}
        getDocs={getDocs}
        query={query}
        where={where}
        serverTimestamp={serverTimestamp}
      />
    </div>
  )}

═══════════════════════════════════════════════════
FIRESTORE RULES — Add these collections
═══════════════════════════════════════════════════

In your Firebase console → Firestore → Rules, ensure these collections are allowed:

  match /motivationMessages/{docId} {
    allow read, write: if request.auth != null;
  }
  match /exerciseGuideHistory/{docId} {
    allow read, write: if request.auth != null;
  }

═══════════════════════════════════════════════════
IMPORTANT NOTE on `query` naming conflict
═══════════════════════════════════════════════════

In App.jsx, "query" is already imported from Firebase AND used as a local
state variable in AIExerciseGuide. To avoid conflicts, the AIExerciseGuide
component uses its own internal state named `query` (lowercase) which is
fine since it's local. The Firebase `query` function is passed as a prop
named `query` only to AIMotivationSection — just make sure your import
from firebase/firestore is: import { ..., query as fsQuery, ... }
and pass it as: query={fsQuery}

OR simply rename the prop to `fsQuery` in AIMotivationSection if you prefer.
*/
