"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { requestPushPermissionAndSubscribe, unsubscribeFromPush } from "@/lib/push";
import { usePalette, useTheme } from "@/lib/theme";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Play } from "lucide-react";
import SettingsGroup from "@/components/SettingsGroup";
import ListRow from "@/components/ListRow";
import Modal from "@/components/Modal";
import { MEASUREMENT_ZONES, REMINDER_OPTIONS, PHYSICAL_REMINDER_OPTIONS, NUTRITION_CLOSE_DAY_OPTIONS, type UnitSystem } from "@/lib/units";
import { FOOD_TASTE_OPTIONS } from "@/lib/foodTastes";
import { clearSwCache } from "@/lib/clearSwCache";
import { computeNutritionGoals, COMMITMENT_OPTIONS, type Sex, type CommitmentLevel } from "@/lib/computeNutritionGoals";

const SOUNDS: Record<string, { label: string; freq: number; pattern: number[] }> = {
  clasico: { label: "Clásico", freq: 880, pattern: [0.35] },
  suave: { label: "Suave", freq: 660, pattern: [0.5] },
  energico: { label: "Enérgico", freq: 990, pattern: [0.12, 0.12, 0.12] },
  campana: { label: "Campana", freq: 1046, pattern: [0.5] },
  digital: { label: "Digital", freq: 1400, pattern: [0.08, 0.08, 0.08, 0.08] },
};

const EQUIPMENT_OPTIONS = ["Horno", "Microondas", "Estufa", "Air fryer", "Licuadora", "Plancha/Parrilla", "Olla arrocera", "Sartén", "Batidora"];

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  const palette = usePalette();
  return (
    <button onClick={onChange} style={{
      width: 42, height: 25, borderRadius: 999, border: "none", cursor: "pointer", position: "relative",
      background: checked ? palette.accent : palette.inputBg, transition: "background .2s",
    }}>
      <div style={{
        width: 20, height: 20, borderRadius: "50%", background: checked ? palette.bg : palette.inkDim,
        position: "absolute", top: 2.5, left: checked ? 20 : 3, transition: "left .2s",
      }} />
    </button>
  );
}

export default function ProfileSettingsPage() {
  const palette = usePalette();
  const { theme, setTheme } = useTheme();
  const supabase = createClient();
  const router = useRouter();

  const [uid, setUid] = useState("");
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [timerSound, setTimerSound] = useState("clasico");
  const [notifEnabled, setNotifEnabled] = useState(false);
  const [autoWarmupPrompt, setAutoWarmupPrompt] = useState(true);
  const [dietaryRestrictions, setDietaryRestrictions] = useState("");
  const [kitchenEquipment, setKitchenEquipment] = useState<string[]>([]);
  const [foodLikes, setFoodLikes] = useState<string[]>([]);
  const [foodDislikes, setFoodDislikes] = useState<string[]>([]);
  const [unitSystem, setUnitSystem] = useState<UnitSystem>("metric");
  const [measurementZones, setMeasurementZones] = useState<string[]>([]);
  const [progressReminderDays, setProgressReminderDays] = useState<number | null>(null);
  const [weightKg, setWeightKg] = useState<number | null>(null);
  const [heightCm, setHeightCm] = useState<number | null>(null);
  const [age, setAge] = useState<number | null>(null);
  const [sex, setSex] = useState<Sex | null>(null);
  const [commitment, setCommitment] = useState<CommitmentLevel>("moderado");
  const [physicalReminderDays, setPhysicalReminderDays] = useState<number | null>(null);
  const [nutritionReminderTime, setNutritionReminderTime] = useState<string | null>(null);
  const [goal, setGoal] = useState<string | null>(null);
  const [daysAvailable, setDaysAvailable] = useState(3);

  const [showSoundPicker, setShowSoundPicker] = useState(false);
  const [showNameEdit, setShowNameEdit] = useState(false);
  const [showPhysicalEdit, setShowPhysicalEdit] = useState(false);
  const [showDietEdit, setShowDietEdit] = useState(false);
  const [showProgressEdit, setShowProgressEdit] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const id = auth.user!.id;
      setUid(id);
      setEmail(auth.user!.email ?? "");

      const [{ data: userRow }, { data: clientRow }, { data: foodTasteRow }] = await Promise.all([
        supabase.from("users").select("timer_sound, display_name, auto_warmup_prompt, unit_system, measurement_zones, progress_reminder_days, physical_reminder_days, nutrition_reminder_time").eq("id", id).single(),
        supabase.from("clients").select("dietary_restrictions, kitchen_equipment, current_weight, height_cm, age, sex, commitment, lifestyle").eq("user_id", id).single(),
        // Consulta aparte: si esta migración nueva (food_likes/food_dislikes) todavía no corrió,
        // que falle sola y no tumbe el resto de "clients" (peso, altura, restricciones, etc.)
        supabase.from("clients").select("food_likes, food_dislikes").eq("user_id", id).single(),
      ]);

      if (userRow) {
        setTimerSound(userRow.timer_sound); setDisplayName(userRow.display_name || "");
        setAutoWarmupPrompt(userRow.auto_warmup_prompt ?? true);
        setUnitSystem((userRow.unit_system as UnitSystem) ?? "metric");
        setMeasurementZones(userRow.measurement_zones || []);
        setProgressReminderDays(userRow.progress_reminder_days ?? null);
        setPhysicalReminderDays(userRow.physical_reminder_days ?? null);
        setNutritionReminderTime(userRow.nutrition_reminder_time ?? null);
      }

      if (clientRow) {
        setDietaryRestrictions(clientRow.dietary_restrictions || "");
        setKitchenEquipment(clientRow.kitchen_equipment || []);
        setWeightKg(clientRow.current_weight ?? null);
        setHeightCm(clientRow.height_cm ?? null);
        setAge(clientRow.age ?? null);
        setSex((clientRow.sex as Sex) ?? null);
        setCommitment((clientRow.commitment as CommitmentLevel) ?? "moderado");
        setGoal(clientRow.lifestyle?.goal ?? null);
        setDaysAvailable(clientRow.lifestyle?.days_available ?? 3);
      }

      if (foodTasteRow) {
        setFoodLikes(foodTasteRow.food_likes || []);
        setFoodDislikes(foodTasteRow.food_dislikes || []);
      }

      if ("Notification" in window) setNotifEnabled(Notification.permission === "granted");
    })();
  }, []);

  async function updateSound(key: string) {
    setTimerSound(key);
    await supabase.from("users").update({ timer_sound: key }).eq("id", uid);
    setShowSoundPicker(false);
  }

  function playPreview(key: string) {
    const s = SOUNDS[key];
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      let t = ctx.currentTime;
      s.pattern.forEach((dur) => {
        const osc = ctx.createOscillator(); const gain = ctx.createGain();
        osc.frequency.value = s.freq; osc.connect(gain); gain.connect(ctx.destination);
        gain.gain.setValueAtTime(0.15, t); osc.start(t); osc.stop(t + dur); t += dur + 0.08;
      });
    } catch {}
  }

  async function toggleNotifications() {
    if (!notifEnabled) {
      const granted = await requestPushPermissionAndSubscribe();
      setNotifEnabled(granted);
    } else {
      await unsubscribeFromPush();
      setNotifEnabled(false);
    }
  }

  async function toggleAutoWarmup() {
    const next = !autoWarmupPrompt;
    setAutoWarmupPrompt(next);
    await supabase.from("users").update({ auto_warmup_prompt: next }).eq("id", uid);
  }

  async function saveDisplayName(name: string) {
    setDisplayName(name);
    await supabase.from("users").update({ display_name: name }).eq("id", uid);
    setShowNameEdit(false);
  }

  async function savePhysicalProfile(next: { weightKg: number | null; heightCm: number | null; age: number | null; sex: Sex | null; commitment: CommitmentLevel; reminderDays: number | null }) {
    setWeightKg(next.weightKg);
    setHeightCm(next.heightCm);
    setAge(next.age);
    setSex(next.sex);
    setCommitment(next.commitment);
    setPhysicalReminderDays(next.reminderDays);

    const nutritionGoals = (next.weightKg && next.heightCm && next.age && next.sex)
      ? computeNutritionGoals({
          weightKg: next.weightKg, heightCm: next.heightCm, age: next.age, sex: next.sex,
          daysAvailable, goal, commitment: next.commitment,
        })
      : null;

    await Promise.all([
      supabase.from("clients").update({
        current_weight: next.weightKg, height_cm: next.heightCm, age: next.age, sex: next.sex, commitment: next.commitment,
        ...(nutritionGoals && {
          daily_kcal_goal: nutritionGoals.kcal, daily_protein_goal: nutritionGoals.protein,
          daily_carbs_goal: nutritionGoals.carbs, daily_fat_goal: nutritionGoals.fat,
        }),
      }).eq("user_id", uid),
      supabase.from("users").update({ physical_reminder_days: next.reminderDays }).eq("id", uid),
    ]);
    setShowPhysicalEdit(false);
  }

  async function updateNutritionReminderTime(time: string | null) {
    setNutritionReminderTime(time);
    await supabase.from("users").update({ nutrition_reminder_time: time }).eq("id", uid);
  }

  async function saveDietaryInfo() {
    await Promise.all([
      supabase.from("clients").update({ dietary_restrictions: dietaryRestrictions, kitchen_equipment: kitchenEquipment }).eq("user_id", uid),
      // Aparte de lo de arriba: si esta migración nueva todavía no corrió, que falle sola.
      supabase.from("clients").update({ food_likes: foodLikes, food_dislikes: foodDislikes }).eq("user_id", uid),
    ]);
    setShowDietEdit(false);
  }

  function toggleEquipment(item: string) {
    setKitchenEquipment((prev) => prev.includes(item) ? prev.filter((e) => e !== item) : [...prev, item]);
  }

  function toggleFoodLike(item: string) {
    setFoodLikes((prev) => prev.includes(item) ? prev.filter((e) => e !== item) : [...prev, item]);
  }

  function toggleFoodDislike(item: string) {
    setFoodDislikes((prev) => prev.includes(item) ? prev.filter((e) => e !== item) : [...prev, item]);
  }

  function toggleZone(key: string) {
    setMeasurementZones((prev) => {
      if (prev.includes(key)) return prev.filter((z) => z !== key);
      if (prev.length >= 5) return prev;
      return [...prev, key];
    });
  }

  async function saveProgressSettings() {
    await supabase.from("users").update({
      unit_system: unitSystem, measurement_zones: measurementZones, progress_reminder_days: progressReminderDays,
    }).eq("id", uid);
    setShowProgressEdit(false);
  }

  async function handleLogout() {
    clearSwCache();
    await supabase.auth.signOut();
    router.push("/login");
  }

  async function handleDeleteAccount() {
    setDeleting(true);
    const res = await fetch("/api/account/delete", { method: "POST" });
    if (res.ok) router.push("/login");
    else setDeleting(false);
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
        <Link href="/app/profile" style={{ color: palette.inkDim, display: "flex" }}><ChevronLeft size={20} /></Link>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>Ajustes</h1>
      </div>

      <SettingsGroup title="Apariencia">
        <ListRow label="Oscuro" right={theme === "dark" && <span style={{ color: palette.accent }}>✓</span>} onClick={() => setTheme("dark")} />
        <ListRow label="Claro" right={theme === "light" && <span style={{ color: palette.accent }}>✓</span>} onClick={() => setTheme("light")} />
      </SettingsGroup>

      <SettingsGroup title="Entrenamiento">
        <ListRow label="Sonido del timer" sublabel={SOUNDS[timerSound]?.label} showChevron onClick={() => setShowSoundPicker(true)} />
        <ListRow
          label="Calentamiento automático"
          sublabel="Sugiere series de calentamiento al cargar el peso de tu primera serie"
          right={<Toggle checked={autoWarmupPrompt} onChange={toggleAutoWarmup} />}
        />
      </SettingsGroup>

      <SettingsGroup title="Notificaciones">
        <ListRow
          label="Notificaciones push"
          sublabel="Recordatorios, timer de descanso, mensajes de tu coach"
          right={<Toggle checked={notifEnabled} onChange={toggleNotifications} />}
        />
      </SettingsGroup>

      <SettingsGroup title="Nutrición">
        <ListRow
          label="Preferencias de nutrición"
          sublabel={`${dietaryRestrictions || "Sin restricciones"} · ${kitchenEquipment.length > 0 ? `${kitchenEquipment.length} utensilios` : "sin utensilios"}`}
          showChevron
          onClick={() => setShowDietEdit(true)}
        />
        <ListRow
          label="Recordatorio para cerrar el día"
          sublabel="Te avisamos para que cuentes o grabes todo lo que comiste"
          right={
            <select
              value={nutritionReminderTime ?? ""}
              onChange={(e) => updateNutritionReminderTime(e.target.value || null)}
              style={{ padding: "6px 8px", borderRadius: 8, border: `1px solid ${palette.panelBorder}`, background: palette.inputBg, color: palette.ink, fontSize: 12.5 }}
            >
              {NUTRITION_CLOSE_DAY_OPTIONS.map((o) => (
                <option key={String(o.value)} value={o.value ?? ""}>{o.label}</option>
              ))}
            </select>
          }
        />
      </SettingsGroup>

      <SettingsGroup title="Registro de progreso">
        <ListRow
          label="Unidades y medidas"
          sublabel={`${unitSystem === "imperial" ? "Pulgadas" : "Centímetros"} · ${measurementZones.length > 0 ? `${measurementZones.length} zonas` : "sin zonas"} · ${REMINDER_OPTIONS.find((r) => r.value === progressReminderDays)?.label ?? "Nunca"}`}
          showChevron
          onClick={() => setShowProgressEdit(true)}
        />
      </SettingsGroup>

      <SettingsGroup title="Cuenta">
        <ListRow label="Nombre" sublabel={displayName || "Sin definir"} showChevron onClick={() => setShowNameEdit(true)} />
        <ListRow label="Correo" sublabel={email} />
        <ListRow
          label="Perfil físico"
          sublabel={weightKg && heightCm && age ? `${weightKg} kg · ${heightCm} cm · ${age} años` : "Sin registrar — usado para tus metas de calorías"}
          showChevron
          onClick={() => setShowPhysicalEdit(true)}
        />
        <ListRow label="Cerrar sesión" onClick={handleLogout} />
        <ListRow label="Eliminar cuenta" danger onClick={() => setShowDeleteConfirm(true)} />
      </SettingsGroup>

      {showSoundPicker && (
        <Modal title="Sonido del timer" onClose={() => setShowSoundPicker(false)} maxWidth={340}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {Object.entries(SOUNDS).map(([key, s]) => (
              <div key={key} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px",
                borderRadius: 10, border: `1px solid ${timerSound === key ? palette.accent : palette.panelBorder}`,
                background: timerSound === key ? `${palette.accent}18` : palette.inputBg,
              }}>
                <button onClick={() => updateSound(key)} style={{ background: "none", border: "none", color: palette.ink, fontSize: 13, fontWeight: 600, cursor: "pointer", textAlign: "left", flex: 1 }}>
                  {s.label} {timerSound === key && "✓"}
                </button>
                <button onClick={() => playPreview(key)} style={{ background: "none", border: "none", color: palette.accent, cursor: "pointer", display: "flex" }}>
                  <Play size={15} />
                </button>
              </div>
            ))}
          </div>
        </Modal>
      )}

      {showNameEdit && (
        <Modal title="Tu nombre" onClose={() => setShowNameEdit(false)} maxWidth={320}>
          <NameEditor initial={displayName} onSave={saveDisplayName} />
        </Modal>
      )}

      {showPhysicalEdit && (
        <Modal title="Perfil físico" onClose={() => setShowPhysicalEdit(false)} maxWidth={340}>
          <PhysicalProfileEditor
            initial={{ weightKg, heightCm, age, sex, commitment, reminderDays: physicalReminderDays }}
            showCommitment={goal !== null && goal !== "salud"}
            onSave={savePhysicalProfile}
          />
        </Modal>
      )}

      {showDietEdit && (
        <Modal title="Preferencias de nutrición" onClose={() => setShowDietEdit(false)} maxWidth={380}>
          <label style={{ fontSize: 12, color: palette.inkDim, display: "block", marginBottom: 8 }}>Te gusta comer</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
            {FOOD_TASTE_OPTIONS.map((item) => (
              <button key={item} onClick={() => toggleFoodLike(item)} style={{
                padding: "7px 12px", borderRadius: 999, fontSize: 12, cursor: "pointer", fontWeight: 600,
                border: `1px solid ${foodLikes.includes(item) ? palette.accent : palette.panelBorder}`,
                background: foodLikes.includes(item) ? `${palette.accent}22` : palette.inputBg,
                color: foodLikes.includes(item) ? palette.accent : palette.inkDim,
              }}>{item}</button>
            ))}
          </div>
          <label style={{ fontSize: 12, color: palette.inkDim, display: "block", marginBottom: 8 }}>No te gusta o evitas</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
            {FOOD_TASTE_OPTIONS.map((item) => (
              <button key={item} onClick={() => toggleFoodDislike(item)} style={{
                padding: "7px 12px", borderRadius: 999, fontSize: 12, cursor: "pointer", fontWeight: 600,
                border: `1px solid ${foodDislikes.includes(item) ? palette.accent : palette.panelBorder}`,
                background: foodDislikes.includes(item) ? `${palette.accent}22` : palette.inputBg,
                color: foodDislikes.includes(item) ? palette.accent : palette.inkDim,
              }}>{item}</button>
            ))}
          </div>
          <label style={{ fontSize: 12, color: palette.inkDim, display: "block", marginBottom: 6 }}>Alimentos que restringes</label>
          <textarea
            value={dietaryRestrictions}
            onChange={(e) => setDietaryRestrictions(e.target.value)}
            placeholder="Ej: sin lactosa, vegetariano, alergia al maní..."
            style={{ width: "100%", minHeight: 60, padding: 10, borderRadius: 10, border: `1px solid ${palette.panelBorder}`, background: palette.inputBg, color: palette.ink, fontSize: 13, marginBottom: 14, fontFamily: "inherit" }}
          />
          <label style={{ fontSize: 12, color: palette.inkDim, display: "block", marginBottom: 8 }}>Utensilios disponibles</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
            {EQUIPMENT_OPTIONS.map((item) => (
              <button key={item} onClick={() => toggleEquipment(item)} style={{
                padding: "7px 12px", borderRadius: 999, fontSize: 12, cursor: "pointer", fontWeight: 600,
                border: `1px solid ${kitchenEquipment.includes(item) ? palette.accent : palette.panelBorder}`,
                background: kitchenEquipment.includes(item) ? `${palette.accent}22` : palette.inputBg,
                color: kitchenEquipment.includes(item) ? palette.accent : palette.inkDim,
              }}>{item}</button>
            ))}
          </div>
          <button onClick={saveDietaryInfo} style={{ width: "100%", padding: 12, borderRadius: 11, border: "none", background: `linear-gradient(135deg, ${palette.accent}, ${palette.accentDeep})`, color: palette.bg, fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
            Guardar
          </button>
        </Modal>
      )}

      {showProgressEdit && (
        <Modal title="Registro de progreso" onClose={() => setShowProgressEdit(false)} maxWidth={380}>
          <label style={{ fontSize: 12, color: palette.inkDim, display: "block", marginBottom: 8 }}>Sistema de medidas</label>
          <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
            {(["metric", "imperial"] as UnitSystem[]).map((u) => (
              <button key={u} onClick={() => setUnitSystem(u)} style={{
                flex: 1, padding: "9px", borderRadius: 10, fontSize: 12.5, fontWeight: 600, cursor: "pointer",
                border: `1px solid ${unitSystem === u ? palette.accent : palette.panelBorder}`,
                background: unitSystem === u ? `${palette.accent}22` : palette.inputBg,
                color: unitSystem === u ? palette.accent : palette.inkDim,
              }}>
                {u === "metric" ? "Métrico (cm, kg)" : "Imperial (in, lb)"}
              </button>
            ))}
          </div>

          <label style={{ fontSize: 12, color: palette.inkDim, display: "block", marginBottom: 8 }}>Zonas a medir (hasta 5)</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 18 }}>
            {MEASUREMENT_ZONES.map((z) => (
              <button key={z.key} onClick={() => toggleZone(z.key)} style={{
                padding: "7px 12px", borderRadius: 999, fontSize: 12, cursor: "pointer", fontWeight: 600,
                border: `1px solid ${measurementZones.includes(z.key) ? palette.accent : palette.panelBorder}`,
                background: measurementZones.includes(z.key) ? `${palette.accent}22` : palette.inputBg,
                color: measurementZones.includes(z.key) ? palette.accent : palette.inkDim,
              }}>{z.label}</button>
            ))}
          </div>

          <label style={{ fontSize: 12, color: palette.inkDim, display: "block", marginBottom: 8 }}>Recordatorio de registro</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 18 }}>
            {REMINDER_OPTIONS.map((r) => (
              <button key={String(r.value)} onClick={() => setProgressReminderDays(r.value)} style={{
                padding: "7px 12px", borderRadius: 999, fontSize: 12, cursor: "pointer", fontWeight: 600,
                border: `1px solid ${progressReminderDays === r.value ? palette.accent : palette.panelBorder}`,
                background: progressReminderDays === r.value ? `${palette.accent}22` : palette.inputBg,
                color: progressReminderDays === r.value ? palette.accent : palette.inkDim,
              }}>{r.label}</button>
            ))}
          </div>

          <button onClick={saveProgressSettings} style={{ width: "100%", padding: 12, borderRadius: 11, border: "none", background: `linear-gradient(135deg, ${palette.accent}, ${palette.accentDeep})`, color: palette.bg, fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
            Guardar
          </button>
        </Modal>
      )}

      {showDeleteConfirm && (
        <Modal title="¿Eliminar tu cuenta?" onClose={() => setShowDeleteConfirm(false)} maxWidth={340}>
          <p style={{ fontSize: 12.5, color: palette.inkDim, marginBottom: 18, lineHeight: 1.5 }}>
            Esto borra permanentemente tu cuenta y todos tus datos (entrenamientos, nutrición, fotos). No se puede deshacer.
          </p>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => setShowDeleteConfirm(false)} style={{ flex: 1, padding: 11, borderRadius: 11, border: `1px solid ${palette.panelBorder}`, background: "none", color: palette.ink, cursor: "pointer", fontSize: 13 }}>Cancelar</button>
            <button onClick={handleDeleteAccount} disabled={deleting} style={{ flex: 1, padding: 11, borderRadius: 11, border: "none", background: palette.danger, color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 700, opacity: deleting ? 0.6 : 1 }}>
              {deleting ? "Eliminando..." : "Sí, eliminar"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function NameEditor({ initial, onSave }: { initial: string; onSave: (v: string) => void }) {
  const palette = usePalette();
  const [val, setVal] = useState(initial);
  return (
    <div>
      <input value={val} onChange={(e) => setVal(e.target.value)} placeholder="Tu nombre" style={{ width: "100%", padding: 11, borderRadius: 10, border: `1px solid ${palette.panelBorder}`, background: palette.inputBg, color: palette.ink, fontSize: 14, marginBottom: 14 }} />
      <button onClick={() => onSave(val)} style={{ width: "100%", padding: 12, borderRadius: 11, border: "none", background: `linear-gradient(135deg, ${palette.accent}, ${palette.accentDeep})`, color: palette.bg, fontWeight: 700, fontSize: 14, cursor: "pointer" }}>Guardar</button>
    </div>
  );
}

type PhysicalProfile = { weightKg: number | null; heightCm: number | null; age: number | null; sex: Sex | null; commitment: CommitmentLevel; reminderDays: number | null };

function PhysicalProfileEditor({ initial, showCommitment, onSave }: { initial: PhysicalProfile; showCommitment: boolean; onSave: (v: PhysicalProfile) => void }) {
  const palette = usePalette();
  const [weightKg, setWeightKg] = useState(initial.weightKg);
  const [heightCm, setHeightCm] = useState(initial.heightCm);
  const [age, setAge] = useState(initial.age);
  const [sex, setSex] = useState(initial.sex);
  const [commitment, setCommitment] = useState(initial.commitment);
  const [reminderDays, setReminderDays] = useState(initial.reminderDays);

  function numberInput(value: number | null, onChange: (v: number | null) => void, label: string) {
    return (
      <label style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6, fontSize: 11, color: palette.inkDim }}>
        {label}
        <input
          type="number" inputMode="decimal" min={0} value={value ?? ""}
          onChange={(e) => onChange(e.target.value ? Math.max(0, +e.target.value) : null)}
          onKeyDown={(e) => { if (e.key === "-" || e.key === "+" || e.key === "e") e.preventDefault(); }}
          style={{ width: "100%", padding: 10, borderRadius: 10, border: `1px solid ${palette.panelBorder}`, background: palette.inputBg, color: palette.ink, fontSize: 14, textAlign: "center" }}
        />
      </label>
    );
  }

  return (
    <div>
      <p style={{ fontSize: 11.5, color: palette.inkDim, marginBottom: 14, lineHeight: 1.4 }}>
        Estos datos se usan para calcular tus metas de calorías y macros — actualízalos si cambian.
      </p>
      <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
        {numberInput(weightKg, setWeightKg, "Peso (kg)")}
        {numberInput(heightCm, setHeightCm, "Altura (cm)")}
        {numberInput(age, setAge, "Edad")}
      </div>
      <div style={{ fontSize: 12, color: palette.inkDim, marginBottom: 8 }}>Sexo biológico</div>
      <div style={{ display: "flex", gap: 8, marginBottom: showCommitment ? 18 : 4 }}>
        {(["male", "female"] as Sex[]).map((s) => (
          <button key={s} onClick={() => setSex(s)} style={{
            flex: 1, padding: "9px", borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 600,
            border: `1px solid ${sex === s ? palette.accent : palette.panelBorder}`,
            background: sex === s ? `${palette.accent}22` : palette.inputBg, color: sex === s ? palette.accent : palette.ink,
          }}>{s === "male" ? "Hombre" : "Mujer"}</button>
        ))}
      </div>

      {showCommitment && (
        <>
          <div style={{ fontSize: 12, color: palette.inkDim, marginBottom: 8 }}>Nivel de compromiso con tu objetivo</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 18 }}>
            {COMMITMENT_OPTIONS.map((c) => (
              <button key={c.id} onClick={() => setCommitment(c.id)} style={{
                textAlign: "left", padding: "9px 12px", borderRadius: 10, cursor: "pointer",
                border: `1px solid ${commitment === c.id ? palette.accent : palette.panelBorder}`,
                background: commitment === c.id ? `${palette.accent}18` : palette.inputBg,
              }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: palette.ink }}>{c.label}</div>
              </button>
            ))}
          </div>
        </>
      )}

      <div style={{ fontSize: 12, color: palette.inkDim, marginBottom: 8 }}>Recordarme actualizar estos datos</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 18 }}>
        {PHYSICAL_REMINDER_OPTIONS.map((r) => (
          <button key={String(r.value)} onClick={() => setReminderDays(r.value)} style={{
            padding: "7px 12px", borderRadius: 999, fontSize: 12, cursor: "pointer", fontWeight: 600,
            border: `1px solid ${reminderDays === r.value ? palette.accent : palette.panelBorder}`,
            background: reminderDays === r.value ? `${palette.accent}22` : palette.inputBg,
            color: reminderDays === r.value ? palette.accent : palette.inkDim,
          }}>{r.label}</button>
        ))}
      </div>

      <button
        onClick={() => onSave({ weightKg, heightCm, age, sex, commitment, reminderDays })}
        disabled={!weightKg || !heightCm || !age || !sex}
        style={{
          width: "100%", padding: 12, borderRadius: 11, border: "none",
          background: `linear-gradient(135deg, ${palette.accent}, ${palette.accentDeep})`, color: palette.bg,
          fontWeight: 700, fontSize: 14, cursor: "pointer", opacity: (!weightKg || !heightCm || !age || !sex) ? 0.5 : 1,
        }}
      >
        Guardar
      </button>
    </div>
  );
}
