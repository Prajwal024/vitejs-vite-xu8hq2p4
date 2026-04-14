import { useState, useEffect, useRef } from "react";
import { doc, updateDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "./firebase";

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

export const CSS_ADDITIONS = `
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
.profile-panel-overlay{position:fixed;inset:0;z-index:400;display:flex;justify-content:flex-end}
.profile-panel-bg{position:absolute;inset:0;background:rgba(0,0,0,.55);backdrop-filter:blur(4px)}
.profile-panel{position:relative;width:360px;max-width:95vw;height:100vh;background:var(--s1);border-left:1px solid var(--border2);overflow-y:auto;display:flex;flex-direction:column;padding-bottom:40px}
.profile-panel-hdr{padding:20px 22px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;background:var(--s1);z-index:10}
.profile-av-lg{width:64px;height:64px;border-radius:50%;background:var(--green-bg);border:2px solid var(--green-b);display:flex;align-items:center;justify-content:center;font-family:'Outfit',sans-serif;font-weight:900;font-size:22px;color:var(--green);flex-shrink:0}
.profile-row{padding:8px 22px;display:flex;gap:10px;border-bottom:1px solid var(--border);align-items:center}
.profile-row:last-child{border-bottom:none}
.profile-row-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--muted);min-width:80px;flex-shrink:0}
.profile-row-val{font-size:13px;font-weight:600;color:var(--text)}
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
@media(max-width:600px){.meas-grid{grid-template-columns:1fr 1fr}}
`;

// ═══════════════════════════════════════════════════════════════════════════════
// ENHANCED FOOD LOG — client logs per-meal calories, charts update from logs only
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
    setInputVals({
      cal:     existing.cal     ?? planCal,
      protein: existing.protein ?? planProtein,
      carbs:   existing.carbs   ?? planCarbs,
      fats:    existing.fats    ?? planFats,
    });
    setActiveMeal(meal.name);
  };

  const saveMealLog = async () => {
    if (!activeMeal) return;
    setSaving(true);
    const updated = {
      ...mealLogs,
      [activeMeal]: {
        cal:      parseFloat(inputVals.cal)     || 0,
        protein:  parseFloat(inputVals.protein) || 0,
        carbs:    parseFloat(inputVals.carbs)   || 0,
        fats:     parseFloat(inputVals.fats)    || 0,
        loggedAt: new Date().toISOString(),
      }
    };
    setMealLogs(updated);
    const existingLogs = Array.isArray(d.foodLogs) ? d.foodLogs : [];
    const todayEntry   = existingLogs.find(l => l.date === today) || { date: today, items: [] };
    await updateDoc(doc(db, "clients", uid), {
      foodLogs: [...existingLogs.filter(l => l.date !== today), { ...todayEntry, mealData: updated }]
    });
    toast(`${activeMeal} logged!`, "success");
    setActiveMeal(null);
    setSaving(false);
  };

  const clearMealLog = async (mealName) => {
    const updated = { ...mealLogs };
    delete updated[mealName];
    setMealLogs(updated);
    const existingLogs = Array.isArray(d.foodLogs) ? d.foodLogs : [];
    const todayEntry   = existingLogs.find(l => l.date === today) || { date: today, items: [] };
    await updateDoc(doc(db, "clients", uid), {
      foodLogs: [...existingLogs.filter(l => l.date !== today), { ...todayEntry, mealData: updated }]
    });
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

      {/* ── HOW TO LOG BANNER ── */}
      <div style={{ background: "rgba(59,130,246,.08)", border: "1px solid rgba(59,130,246,.25)", borderRadius: 12, padding: "12px 16px", marginBottom: 14, display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div style={{ fontSize: 22, flexShrink: 0 }}>💡</div>
        <div>
          <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: 13, color: "var(--blue)", marginBottom: 4 }}>How to log your food</div>
          <div style={{ fontSize: 12, color: "var(--muted2)", lineHeight: 1.6 }}>
            Log your meals in <strong style={{ color: "var(--text)" }}>MyFitnessPal</strong> or <strong style={{ color: "var(--text)" }}>Cronometer</strong> for accurate Indian food data, then enter your meal totals below. Takes 30 seconds!
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
            {[["MyFitnessPal", "https://www.myfitnesspal.com", "var(--blue)"], ["Cronometer", "https://cronometer.com", "var(--purple)"]].map(([name, url, color]) => (
              <a key={name} href={url} target="_blank" rel="noreferrer"
                style={{ padding: "4px 12px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: color + "18", color, border: "1px solid " + color + "44", textDecoration: "none" }}>
                Open {name} →
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* ── TOP SUMMARY ── */}
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

      {/* ── PER MEAL LOGGING ── */}
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
              {/* Header */}
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

              {/* Plan items */}
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

              {/* Input form */}
              {isEditing && (
                <div style={{ padding: 14, borderTop: "1px solid var(--border)", background: color + "06" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color, marginBottom: 10 }}>
                    Enter what you actually ate for {meal.name}:
                  </div>

                  {/* MFP tip */}
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

                  {/* Quick fill */}
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
                    <span style={{ fontSize: 11, color: "var(--muted)", alignSelf: "center" }}>Quick fill:</span>
                    {[50, 75, 100, 125].map(pct => {
                      const pCal = meal.items.reduce((a, i) => a + (i.cal || 0), 0);
                      const pPro = meal.items.reduce((a, i) => a + (i.protein || 0), 0);
                      const pCrb = meal.items.reduce((a, i) => a + (i.carbs || 0), 0);
                      const pFat = meal.items.reduce((a, i) => a + (i.fats || 0), 0);
                      return (
                        <button key={pct} onClick={() => setInputVals({ cal: Math.round(pCal * pct / 100), protein: Math.round(pPro * pct / 100), carbs: Math.round(pCrb * pct / 100), fats: Math.round(pFat * pct / 100) })}
                          style={{ padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, border: "1px solid var(--border)", background: "var(--s2)", color: "var(--muted2)", cursor: "pointer" }}>
                          {pct}%
                        </button>
                      );
                    })}
                    <button onClick={() => {
                      const pCal = meal.items.reduce((a, i) => a + (i.cal || 0), 0);
                      const pPro = meal.items.reduce((a, i) => a + (i.protein || 0), 0);
                      const pCrb = meal.items.reduce((a, i) => a + (i.carbs || 0), 0);
                      const pFat = meal.items.reduce((a, i) => a + (i.fats || 0), 0);
                      setInputVals({ cal: pCal, protein: pPro, carbs: pCrb, fats: pFat });
                    }} style={{ padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, border: "1.5px solid var(--green-b)", background: "var(--green-bg)", color: "var(--green)", cursor: "pointer" }}>
                      ✓ Ate as planned
                    </button>
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

      {/* ── CHARTS ── */}
      <div className="card" style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", borderBottom: "1px solid var(--border)", marginBottom: 16 }}>
          {[["calories", "Calories"], ["nutrients", "Nutrients"], ["macros", "Macros"]].map(([key, label]) => (
            <button key={key} onClick={() => setMfpTab(key)}
              style={{ flex: 1, padding: "10px 6px", background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, color: mfpTab === key ? "var(--blue)" : "var(--muted)", borderBottom: mfpTab === key ? "2px solid var(--blue)" : "2px solid transparent", fontFamily: "'DM Sans',sans-serif" }}>
              {label}
            </button>
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
                <div style={{ textAlign: "center", fontSize: 12, color: "var(--muted)", marginBottom: 14, fontWeight: 600 }}>📅 Today — {today}</div>
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
                <div style={{ textAlign: "center", fontSize: 12, color: "var(--muted)", marginBottom: 14, fontWeight: 600 }}>📅 Today — {today}</div>
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
                <div style={{ textAlign: "center", fontSize: 12, color: "var(--muted)", marginBottom: 14, fontWeight: 600 }}>📅 Today — {today}</div>
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
// CLIENT PROFILE PANEL
// ═══════════════════════════════════════════════════════════════════════════════
export function ClientProfilePanel({ d, onClose }) {
  const n = d.nutrition || {};
  const initials = d.name?.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  const sleepInfo = (() => {
    if (!d.wakeTime || !d.sleepTime) return null;
    const [wH, wM] = d.wakeTime.split(":").map(Number);
    const [sH, sM] = d.sleepTime.split(":").map(Number);
    const wakeMin = wH * 60 + wM;
    const sleepMin = sH * 60 + sM;
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

        {/* Header */}
        <div className="profile-panel-hdr">
          <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 800, fontSize: 16 }}>Client Profile</div>
          <button className="xbtn" onClick={onClose}>✕</button>
        </div>

        {/* Avatar + Basic Info */}
        <div style={{ padding: "22px 22px 16px", display: "flex", alignItems: "center", gap: 14, borderBottom: "1px solid var(--border)" }}>
          <div className="profile-av-lg">{initials}</div>
          <div>
            <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 800, fontSize: 18 }}>{d.name}</div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{d.email}</div>
            {d.phone && <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>📞 {d.phone}</div>}
            <div style={{ marginTop: 6 }}><span className="phase">{d.phase} — W{d.week}</span></div>
          </div>
        </div>

        {/* Plan Details — filled by coach when adding client */}
        <div style={{ padding: "14px 22px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 8 }}>Plan Details</div>
          <Row label="🎯 Primary Goal"  value={d.primaryGoal}                                    color="var(--orange)" />
          <Row label="📋 Plan"          value={d.planName || d.phase}                            color="var(--green)"  />
          <Row label="⏱ Duration"       value={d.planDuration ? d.planDuration + " weeks" : null} color="var(--blue)"   />
          <Row label="📅 Week"          value={"Week " + d.week + " of " + (d.planDuration || "—")} color="var(--purple)" />
          <Row label="⚖️ Weight"        value={d.weight   ? d.weight   + " kg" : null} />
          <Row label="📉 Body Fat"      value={d.bodyFat  ? d.bodyFat  + "%"   : null} />
          <Row label="📏 Waist"         value={d.waist    ? d.waist    + " cm" : null} />
        </div>

        {/* Macro Targets — set by coach */}
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

        {/* Daily Routine — filled by client in My Profile */}
        <div style={{ padding: "14px 22px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 8 }}>⏰ Daily Routine <span style={{ fontSize: 9, color: "var(--muted)", fontWeight: 400, textTransform: "none" }}>(client filled)</span></div>
          <Row label="🌅 Wake-up Time"       value={d.wakeTime}                                                       color="var(--yellow)" />
          <Row label="🌙 Sleep Time"         value={d.sleepTime}                                                      color="var(--blue)"   />
          <Row label="💪 Training Time"      value={d.preferredTrainingTime}                                          color="var(--purple)" />
          <Row label="👟 Avg Steps"          value={d.avgSteps ? Number(d.avgSteps).toLocaleString() + " steps" : null} color="var(--green)"  />
          <Row label="🚽 Bowel Tracking"     value={d.bowelReport === true ? "Enabled" : d.bowelReport === false ? "Disabled" : null} color={d.bowelReport ? "var(--green)" : "var(--muted)"} />
          {sleepInfo && (
            <div style={{ marginTop: 10, padding: "10px 14px", background: sleepInfo.color + "14", border: "1px solid " + sleepInfo.color + "44", borderRadius: 10, fontSize: 12, fontWeight: 700, color: sleepInfo.color }}>
              {sleepInfo.emoji} {sleepInfo.hrs}h {sleepInfo.mins}m sleep — {sleepInfo.msg}
            </div>
          )}
        </div>

        {/* Body Measurements — filled by client in My Profile */}
        {d.measurements && Object.values(d.measurements).some(v => v) ? (
          <div style={{ padding: "14px 22px", borderBottom: "1px solid var(--border)" }}>
            <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 10 }}>📏 Body Measurements <span style={{ fontSize: 9, fontWeight: 400, textTransform: "none" }}>(client filled)</span></div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              {[
                { key: "waist",  label: "Waist",  color: "var(--purple)" },
                { key: "neck",   label: "Neck",   color: "var(--blue)"   },
                { key: "chest",  label: "Chest",  color: "var(--green)"  },
                { key: "calves", label: "Calves", color: "var(--orange)" },
                { key: "thighs", label: "Thighs", color: "var(--red)"    },
                { key: "arms",   label: "Arms",   color: "var(--yellow)" },
              ].map(f => d.measurements[f.key] ? (
                <div key={f.key} style={{ background: "var(--s2)", borderRadius: 10, padding: "10px", border: "1px solid var(--border)", textAlign: "center" }}>
                  <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 800, fontSize: 18, color: f.color }}>
                    {d.measurements[f.key]}<span style={{ fontSize: 10, fontWeight: 500 }}>cm</span>
                  </div>
                  <div style={{ fontSize: 10, color: "var(--muted)", textTransform: "capitalize", marginTop: 3 }}>{f.label}</div>
                </div>
              ) : null)}
            </div>
          </div>
        ) : (
          <div style={{ padding: "14px 22px", borderBottom: "1px solid var(--border)" }}>
            <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 6 }}>📏 Body Measurements</div>
            <div style={{ fontSize: 12, color: "var(--muted)", fontStyle: "italic" }}>Client hasn't filled measurements yet.</div>
          </div>
        )}

        {/* Blood Report — uploaded by client */}
        <div style={{ padding: "14px 22px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 8 }}>🩸 Blood Report <span style={{ fontSize: 9, fontWeight: 400, textTransform: "none" }}>(client uploaded)</span></div>
          {d.bloodReport ? (
            <div style={{ background: "rgba(59,130,246,.08)", border: "1px solid rgba(59,130,246,.3)", borderRadius: 10, padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontWeight: 700, color: "var(--blue)", fontSize: 13 }}>📄 {d.bloodReport.name}</div>
                <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 3 }}>Uploaded: {d.bloodReport.uploadedAt}</div>
              </div>
              <a href={d.bloodReport.url} target="_blank" rel="noreferrer"
                style={{ padding: "6px 14px", borderRadius: 8, background: "rgba(59,130,246,.15)", color: "var(--blue)", fontSize: 12, fontWeight: 700, textDecoration: "none", border: "1px solid rgba(59,130,246,.3)" }}>
                View PDF
              </a>
            </div>
          ) : (
            <div style={{ fontSize: 12, color: "var(--muted)", fontStyle: "italic" }}>No blood report uploaded yet.</div>
          )}
        </div>

        {/* Fallback if client hasn't filled anything yet */}
        {!d.wakeTime && !d.sleepTime && !d.avgSteps && !(d.measurements && Object.values(d.measurements).some(v => v)) && !d.bloodReport && (
          <div style={{ padding: "28px 22px", textAlign: "center", color: "var(--muted)" }}>
            <div style={{ fontSize: 30, marginBottom: 10 }}>📋</div>
            <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text)", marginBottom: 6 }}>Client profile not filled yet</div>
            <div style={{ fontSize: 12 }}>Once the client fills their My Profile section, sleep time, measurements, and routine will appear here.</div>
          </div>
        )}

      </div>
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
      <div className="addclient-topbar">
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <button className="btn btn-s btn-sm" onClick={onClose}>✕ Cancel</button>
          <div><div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 800, fontSize: 18 }}>Add New Client</div><div style={{ fontSize: 11, color: "var(--muted)" }}>Fill all sections then click Create</div></div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {err && <div style={{ fontSize: 12, color: "var(--red)", maxWidth: 300 }}>{err}</div>}
          <button className="btn btn-p" onClick={save} disabled={saving} style={{ padding: "10px 28px", fontSize: 14 }}>{saving ? "Creating..." : "✓ Create Client"}</button>
        </div>
      </div>
      <div style={{ display: "flex", gap: 6, padding: "12px 24px", background: "rgba(8,13,26,.97)", borderBottom: "1px solid var(--border)", overflowX: "auto" }}>
        {sections.map((s, i) => (<button key={i} onClick={() => setActiveSection(i)} style={{ padding: "6px 14px", borderRadius: 20, border: "1.5px solid", cursor: "pointer", fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: 12, whiteSpace: "nowrap", borderColor: activeSection === i ? "var(--green)" : "var(--border)", background: activeSection === i ? "var(--green-bg)" : "var(--s2)", color: activeSection === i ? "var(--green)" : "var(--muted)", transition: "all .18s" }}>{s.icon} {s.label}</button>))}
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
// MY PROFILE SECTION
// ═══════════════════════════════════════════════════════════════════════════════
export function MyProfileSection({ uid, d, toast }) {
  const [saving, setSaving]             = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);
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
    else if (hrs < 7)  { color = "var(--orange)"; msg = "Below optimal. Aim for 7+ hours for better recovery."; emoji = "⚠️"; }
    else if (hrs <= 8) { color = "var(--green)";  msg = "Great! 7–8hrs is ideal for performance and recovery."; emoji = "✅"; }
    else               { color = "var(--blue)";   msg = "Good rest! Ensure sleep quality is deep."; emoji = "💙"; }
    return { hrs, mins, color, msg, emoji };
  })();

  const weeksLeft = d.planDuration && d.week ? Math.max(0, parseInt(d.planDuration) - parseInt(d.week) + 1) : null;

  const uploadBloodReport = async (file) => {
    if (!file) return;
    if (file.type !== "application/pdf") { toast("Please upload a PDF file only", "error"); return; }
    if (file.size > 10 * 1024 * 1024)   { toast("File too large. Max 10MB", "error"); return; }
    setUploadingPdf(true);
    try {
      const formData = new FormData();
      formData.append("file", file); formData.append("upload_preset", "coachkit_upload"); formData.append("folder", "blood_reports");
      const res  = await fetch("https://api.cloudinary.com/v1_1/dputo3zsh/auto/upload", { method: "POST", body: formData });
      const data = await res.json();
      await updateDoc(doc(db, "clients", uid), { bloodReport: { url: data.secure_url, name: file.name, uploadedAt: new Date().toLocaleDateString("en-IN") } });
      toast("Blood report uploaded!", "success");
    } catch (e) { toast("Upload failed: " + e.message, "error"); }
    setUploadingPdf(false);
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
    <div className="page">
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 22, fontWeight: 800 }}>My Profile</div>
        <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 5 }}>{d.phase} — Week {d.week}</div>
      </div>

      <div className="profile-page-section stagger-1">
        <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 20 }}>
        <label style={{ cursor: "pointer", flexShrink: 0 }} title="Tap to update your photo">
  <input 
    type="file" 
    accept="image/*" 
    style={{ display: "none" }} 
    onChange={async (e) => {
      const file = e.target.files[0]; 
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) { toast("Image too large. Max 5MB", "error"); return; }
      const fd = new FormData(); 
      fd.append("file", file); 
      fd.append("upload_preset", "coachkit_upload"); 
      fd.append("folder", "client_photos");
      try {
        const res = await fetch(`https://api.cloudinary.com/v1_1/dputo3zsh/image/upload`, { method: "POST", body: fd });
        const data = await res.json();
        await updateDoc(doc(db, "clients", uid), { photoUrl: data.secure_url });
        toast("Profile photo updated! ✅", "success");
      } catch { toast("Upload failed", "error"); }
      e.target.value = "";
    }} 
  />
  <div style={{ 
    width: 72, height: 72, borderRadius: "50%", 
    overflow: "hidden",
    border: "2.5px solid var(--green-b)", 
    position: "relative",
    transition: "transform .2s"
  }}>
    {d.photoUrl 
      ? <img src={d.photoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      : <div style={{ width: "100%", height: "100%", background: "var(--green-bg)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Outfit',sans-serif", fontWeight: 800, fontSize: 26, color: "var(--green)" }}>{d.avatar}</div>
    }
    <div style={{ 
      position: "absolute", bottom: 0, left: 0, right: 0, 
      background: "rgba(0,0,0,.6)", 
      padding: "5px 0", textAlign: "center", 
      fontSize: 10, color: "#fff", fontWeight: 700 
    }}>📷</div>
  </div>
</label>
          <div>
            <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 900, fontSize: 22 }}>{d.name}</div>
            <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 3 }}>{d.email}</div>
            {d.phone && <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 2 }}>📞 {d.phone}</div>}
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

      <div className="profile-page-section stagger-2">
        <div className="profile-page-title"><span style={{ fontSize: 18 }}>⏰</span> Daily Routine</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
          <div className="fld">
            <div className="fl" style={{ color: "var(--yellow)" }}>🌅 Wake-up Time</div>
            <input type="time" value={form.wakeTime} onChange={e => setForm(p => ({ ...p, wakeTime: e.target.value }))} style={{ width: "100%", background: "var(--s2)", border: "1.5px solid var(--border)", borderRadius: 9, color: "var(--text)", fontFamily: "'DM Sans',sans-serif", fontSize: 14, padding: "10px 12px", outline: "none" }} />
          </div>
          <div className="fld">
            <div className="fl" style={{ color: "var(--blue)" }}>🌙 Sleep Time</div>
            <input type="time" value={form.sleepTime} onChange={e => setForm(p => ({ ...p, sleepTime: e.target.value }))} style={{ width: "100%", background: "var(--s2)", border: "1.5px solid var(--border)", borderRadius: 9, color: "var(--text)", fontFamily: "'DM Sans',sans-serif", fontSize: 14, padding: "10px 12px", outline: "none" }} />
          </div>
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
          {form.avgSteps && <div style={{ fontSize: 11, marginTop: 5, color: parseInt(form.avgSteps) >= 10000 ? "var(--green)" : parseInt(form.avgSteps) >= 7000 ? "var(--yellow)" : "var(--orange)", fontWeight: 600 }}>{parseInt(form.avgSteps) >= 10000 ? "🏆 Excellent! 10k+ steps" : parseInt(form.avgSteps) >= 7000 ? "👍 Good — try reaching 10k" : "⚡ Increase daily movement"}</div>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: "var(--s2)", borderRadius: 10, border: "1px solid var(--border)" }}>
          <input type="checkbox" id="bowelReport" checked={form.bowelReport} onChange={e => setForm(p => ({ ...p, bowelReport: e.target.checked }))} style={{ width: 18, height: 18, accentColor: "var(--green)", cursor: "pointer" }} />
          <label htmlFor="bowelReport" style={{ fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Track daily bowel report <span style={{ fontSize: 11, color: "var(--muted)", marginLeft: 6 }}>(optional)</span></label>
        </div>
      </div>

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

      <div className="profile-page-section stagger-4">
        <div className="profile-page-title"><span style={{ fontSize: 18 }}>🩸</span> Blood Report <span style={{ fontSize: 11, fontWeight: 500, color: "var(--muted)" }}>— upload only if coach requests</span></div>
        {d.bloodReport ? (
          <div style={{ background: "rgba(59,130,246,.08)", border: "1px solid rgba(59,130,246,.3)", borderRadius: 10, padding: "12px 16px", marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div><div style={{ fontWeight: 700, color: "var(--blue)", fontSize: 13 }}>📄 {d.bloodReport.name}</div><div style={{ fontSize: 11, color: "var(--muted)", marginTop: 3 }}>Uploaded: {d.bloodReport.uploadedAt}</div></div>
            <a href={d.bloodReport.url} target="_blank" rel="noreferrer" style={{ padding: "6px 14px", borderRadius: 8, background: "rgba(59,130,246,.15)", color: "var(--blue)", fontSize: 12, fontWeight: 700, textDecoration: "none", border: "1px solid rgba(59,130,246,.3)" }}>View PDF</a>
          </div>
        ) : (
          <div style={{ background: "rgba(251,191,36,.06)", border: "1px solid rgba(251,191,36,.2)", borderRadius: 10, padding: "10px 14px", marginBottom: 14, fontSize: 12, color: "#fcd34d" }}>⚠️ Upload blood report only when requested by your coach.</div>
        )}
        <label style={{ display: "block", border: "2px dashed var(--border2)", borderRadius: 12, padding: "20px", textAlign: "center", cursor: uploadingPdf ? "default" : "pointer", background: "var(--s2)", transition: "all .2s" }}
          onMouseEnter={e => { if (!uploadingPdf) e.currentTarget.style.borderColor = "var(--blue)"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border2)"; }}>
          <input type="file" accept="application/pdf" style={{ display: "none" }} disabled={uploadingPdf} onChange={e => { if (e.target.files[0]) uploadBloodReport(e.target.files[0]); e.target.value = ""; }} />
          <div style={{ fontSize: 28, marginBottom: 8 }}>📄</div>
          <div style={{ fontWeight: 700, fontSize: 14, color: uploadingPdf ? "var(--muted)" : "var(--blue)", marginBottom: 4 }}>{uploadingPdf ? "Uploading..." : d.bloodReport ? "Replace Blood Report PDF" : "Upload Blood Report PDF"}</div>
          <div style={{ fontSize: 11, color: "var(--muted)" }}>PDF files only · Max 10MB</div>
        </label>
      </div>

      <div className="profile-page-section stagger-5">
        <div className="profile-page-title"><span style={{ fontSize: 18 }}>🍽</span> Current Macro Targets</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 8, overflowX: "auto" }}>
          {[["Calories", n.calories, "var(--green)", "kcal"], ["Protein", n.protein, "var(--purple)", "g"], ["Carbs", n.carbs, "var(--orange)", "g"], ["Fats", n.fats, "var(--red)", "g"], ["Fiber", n.fiber, "#34d399", "g"]].map(([l, v, co, u]) => (
            <div key={l} className="meas-card"><div className="meas-val" style={{ color: co, fontSize: 15, wordBreak: "break-all" }}>{v || "—"}<span style={{ fontSize: 9, fontWeight: 500 }}>{v ? u : ""}</span></div><div className="meas-label">{l}</div></div>
          ))}
        </div>
        <div style={{ marginTop: 10, fontSize: 11, color: "var(--muted)" }}>Set by your coach. Updates automatically.</div>
      </div>

      <button className="btn btn-p" style={{ width: "100%", padding: "14px", fontSize: 15, borderRadius: 14, marginTop: 4, boxShadow: "0 6px 24px rgba(34,197,94,.3)" }} onClick={saveAll} disabled={saving}>
        {saving ? "Saving..." : "💾 Save Profile"}
      </button>
    </div>
  );
}
