import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Switch,
} from "react-native";
import { useRouter } from "expo-router";
import { useFood } from "../FoodContext";
import { Link } from "expo-router";

type Sex = "male" | "female";
type ActivityLevel =
  | "sedentary"
  | "light"
  | "moderate"
  | "active"
  | "veryActive";
type GoalStrategy = "maintain" | "gain" | "lose";
type GoalPace = "slow" | "moderate" | "custom";

export default function UserProfileScreen() {
  const router = useRouter();
  const { userGoals, setUserGoals, habits, setHabits } = useFood();

  const [sex, setSex] = useState<Sex>("male");
  const [age, setAge] = useState<string>("30");
  const [heightCm, setHeightCm] = useState<string>("175");
  const [weightKg, setWeightKg] = useState<string>("75");
  const [activity, setActivity] = useState<ActivityLevel>("moderate");

  // Goal strategy & pace
  const [strategy, setStrategy] = useState<GoalStrategy>("maintain");
  const [pace, setPace] = useState<GoalPace>("moderate");
  const [manualDelta, setManualDelta] = useState<string>("0"); // ±kcal

  const [useManualCalories, setUseManualCalories] = useState(false);
  const [manualCalories, setManualCalories] = useState<string>("");

  const [useManualMacros, setUseManualMacros] = useState(false);
  const [manualProtein, setManualProtein] = useState<string>("");
  const [manualCarbs, setManualCarbs] = useState<string>("");
  const [manualFat, setManualFat] = useState<string>("");
  const [minAvgQuality, setMinAvgQuality] = useState<string>("0.9");
  const [minHighQualityPct, setMinHighQualityPct] = useState<string>("75");

  const [cuttingKeepMuscle, setCuttingKeepMuscle] = useState(false);

  // hydrate from saved goals
  useEffect(() => {
    if (!userGoals) return;
    setSex(userGoals.sex);
    setAge(String(userGoals.age || ""));
    setHeightCm(String(userGoals.heightCm || ""));
    setWeightKg(String(userGoals.weightKg || ""));
    setActivity(userGoals.activity);
    setStrategy(userGoals.strategy || "maintain");
    setPace(userGoals.pace || "moderate");
    setManualDelta(String(userGoals.manualCalorieDelta ?? 0));
    setUseManualCalories(!!userGoals.useManualCalories);
    setManualCalories(String(userGoals.manualCalories ?? ""));
    setUseManualMacros(!!userGoals.useManualMacros);
    setManualProtein(String(userGoals.manualProtein ?? ""));
    setManualCarbs(String(userGoals.manualCarbs ?? ""));
    setManualFat(String(userGoals.manualFat ?? ""));
    setCuttingKeepMuscle(!!userGoals.cuttingKeepMuscle);
    setMinAvgQuality(String(userGoals.minAverageProteinQuality ?? "0.9"));
    setMinHighQualityPct(
      String(userGoals.minHighQualityProteinPercent ?? "75")
    );
  }, [userGoals]);

  const activityFactor: Record<ActivityLevel, number> = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    veryActive: 1.9,
  };

  const parsed = {
    age: Number(age) || 0,
    height: Number(heightCm) || 0,
    weight: Number(weightKg) || 0,
    manualCalories: Number(manualCalories) || 0,
    manualProtein: Number(manualProtein) || 0,
    manualCarbs: Number(manualCarbs) || 0,
    manualFat: Number(manualFat) || 0,
  };

  const bmr = useMemo(() => {
    if (!parsed.age || !parsed.height || !parsed.weight) return 0;
    // Mifflin-St Jeor
    const s = sex === "male" ? 5 : -161;
    return Math.round(
      10 * parsed.weight + 6.25 * parsed.height - 5 * parsed.age + s
    );
  }, [parsed.age, parsed.height, parsed.weight, sex]);

  const tdee = useMemo(() => {
    return Math.round(bmr * (activityFactor[activity] || 1.2));
  }, [bmr, activity]);

  const targetCalories = useMemo(() => {
    if (useManualCalories && parsed.manualCalories > 0)
      return parsed.manualCalories;
    const base = tdee || 0;
    // strategy/pace defaults
    let delta = 0;
    if (strategy === "gain") {
      delta =
        pace === "moderate"
          ? 500
          : pace === "slow"
          ? 250
          : Number(manualDelta) || 0;
    } else if (strategy === "lose") {
      delta =
        pace === "moderate"
          ? -500
          : pace === "slow"
          ? -250
          : Number(manualDelta) || 0;
    }
    let suggested = base + delta;
    // If cutting & lose, we already applied a deficit via pace; keep as-is
    return Math.max(0, Math.round(suggested));
  }, [
    useManualCalories,
    parsed.manualCalories,
    tdee,
    strategy,
    pace,
    manualDelta,
  ]);

  const suggestedMacros = useMemo(() => {
    const weight = parsed.weight;
    if (!weight || !targetCalories) return { protein: 0, carbs: 0, fat: 0 };

    let proteinGrams = Math.round((cuttingKeepMuscle ? 2.0 : 1.6) * weight);
    let fatGrams = Math.max(Math.round(0.5 * weight), 30);

    const proteinCals = proteinGrams * 4;
    const fatCals = fatGrams * 9;
    const remainingCals = Math.max(targetCalories - proteinCals - fatCals, 0);
    const carbsGrams = Math.round(remainingCals / 4);

    return { protein: proteinGrams, carbs: carbsGrams, fat: fatGrams };
  }, [parsed.weight, targetCalories, cuttingKeepMuscle]);

  const targetMacros = useMemo(() => {
    if (useManualMacros) {
      return {
        protein: parsed.manualProtein || 0,
        carbs: parsed.manualCarbs || 0,
        fat: parsed.manualFat || 0,
      };
    }
    return suggestedMacros;
  }, [
    useManualMacros,
    parsed.manualProtein,
    parsed.manualCarbs,
    parsed.manualFat,
    suggestedMacros,
  ]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.headerBack}
        >
          <Text style={styles.headerBackText}>×</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Your Profile</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Basics</Text>
          <Row>
            <Field label="Sex">
              <Segmented
                options={[
                  { key: "male", label: "Male" },
                  { key: "female", label: "Female" },
                ]}
                value={sex}
                onChange={(v) => setSex(v as Sex)}
              />
            </Field>
          </Row>
          <Row>
            <Field label="Age (years)">
              <NumInput value={age} onChangeText={setAge} placeholder="30" />
            </Field>
            <Field label="Height (cm)">
              <NumInput
                value={heightCm}
                onChangeText={setHeightCm}
                placeholder="175"
              />
            </Field>
          </Row>
          <Row>
            <Field label="Weight (kg)">
              <NumInput
                value={weightKg}
                onChangeText={setWeightKg}
                placeholder="75"
              />
            </Field>
            <Field label="Activity">
              <Segmented
                options={[
                  { key: "sedentary", label: "Sed." },
                  { key: "light", label: "Light" },
                  { key: "moderate", label: "Mod." },
                  { key: "active", label: "Active" },
                  { key: "veryActive", label: "V.Active" },
                ]}
                value={activity}
                onChange={(v) => setActivity(v as ActivityLevel)}
              />
            </Field>
          </Row>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Calories</Text>
          <Text style={styles.helperText}>
            Cutting preset (2 g/kg protein, ≥0.5 g/kg fat) is intended for
            people who lift/strength train.
          </Text>
          <Row>
            <Field label="Goal">
              <Segmented
                options={[
                  { key: "maintain", label: "Maintain" },
                  { key: "gain", label: "Gain" },
                  { key: "lose", label: "Lose" },
                ]}
                value={strategy}
                onChange={(v) => setStrategy(v as GoalStrategy)}
              />
            </Field>
          </Row>
          <Row>
            <Field label="Pace">
              <Segmented
                options={[
                  { key: "slow", label: "+/−250" },
                  { key: "moderate", label: "+/−500" },
                  { key: "custom", label: "Custom" },
                ]}
                value={pace}
                onChange={(v) => setPace(v as GoalPace)}
              />
            </Field>
            {pace === "custom" ? (
              <Field label="Daily delta (±kcal)">
                <NumInput
                  value={manualDelta}
                  onChangeText={setManualDelta}
                  placeholder="-300 or 400"
                />
              </Field>
            ) : null}
          </Row>
          <Row>
            <Field label="Cutting, keep muscle">
              <Switch
                value={cuttingKeepMuscle}
                onValueChange={setCuttingKeepMuscle}
              />
            </Field>
          </Row>
          <Row>
            <Field label="Use manual calories">
              <Switch
                value={useManualCalories}
                onValueChange={setUseManualCalories}
              />
            </Field>
            {useManualCalories ? (
              <Field label="Manual kcal">
                <NumInput
                  value={manualCalories}
                  onChangeText={setManualCalories}
                  placeholder="2000"
                />
              </Field>
            ) : null}
          </Row>
          <View style={styles.readoutsRow}>
            <Readout label="BMR" value={`${bmr} kcal`} />
            <Readout label="TDEE" value={`${tdee} kcal`} />
            <Readout label="Target" value={`${targetCalories} kcal`} />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Macros</Text>
          <Row>
            <Field label="Min avg protein quality">
              <NumInput
                value={minAvgQuality}
                onChangeText={setMinAvgQuality}
                placeholder="0.9"
              />
            </Field>
            <Field label=">= quality % of protein">
              <NumInput
                value={minHighQualityPct}
                onChangeText={setMinHighQualityPct}
                placeholder="75"
              />
            </Field>
          </Row>
          <Row>
            <Field label="Use manual macros">
              <Switch
                value={useManualMacros}
                onValueChange={setUseManualMacros}
              />
            </Field>
          </Row>
          {useManualMacros ? (
            <>
              <Row>
                <Field label="Protein (g)">
                  <NumInput
                    value={manualProtein}
                    onChangeText={setManualProtein}
                    placeholder="150"
                  />
                </Field>
                <Field label="Carbs (g)">
                  <NumInput
                    value={manualCarbs}
                    onChangeText={setManualCarbs}
                    placeholder="250"
                  />
                </Field>
              </Row>
              <Row>
                <Field label="Fat (g)">
                  <NumInput
                    value={manualFat}
                    onChangeText={setManualFat}
                    placeholder="70"
                  />
                </Field>
              </Row>
            </>
          ) : (
            <View style={styles.readoutsRow}>
              <Readout label="Protein" value={`${suggestedMacros.protein} g`} />
              <Readout label="Carbs" value={`${suggestedMacros.carbs} g`} />
              <Readout label="Fat" value={`${suggestedMacros.fat} g`} />
            </View>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Habits & Fasting</Text>
          <Text style={styles.helperText}>
            Track days free from substances and manage fasting.
          </Text>
          <Row>
            <Field label="Alcohol-free days">
              <View style={styles.counterRow}>
                <Text style={styles.counterValue}>
                  {habits.daysAlcoholFree}
                </Text>
                <TouchableOpacity
                  style={styles.counterBtn}
                  onPress={() =>
                    setHabits({ daysAlcoholFree: habits.daysAlcoholFree + 1 })
                  }
                >
                  <Text style={styles.counterBtnText}>+1</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.counterBtn}
                  onPress={() => setHabits({ daysAlcoholFree: 0 })}
                >
                  <Text style={styles.counterBtnText}>Reset</Text>
                </TouchableOpacity>
              </View>
            </Field>
          </Row>
          <Row>
            <Field label="Nicotine-free days">
              <View style={styles.counterRow}>
                <Text style={styles.counterValue}>
                  {habits.daysNicotineFree}
                </Text>
                <TouchableOpacity
                  style={styles.counterBtn}
                  onPress={() =>
                    setHabits({ daysNicotineFree: habits.daysNicotineFree + 1 })
                  }
                >
                  <Text style={styles.counterBtnText}>+1</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.counterBtn}
                  onPress={() => setHabits({ daysNicotineFree: 0 })}
                >
                  <Text style={styles.counterBtnText}>Reset</Text>
                </TouchableOpacity>
              </View>
            </Field>
          </Row>
          <Row>
            <Field label="Weed-free days">
              <View style={styles.counterRow}>
                <Text style={styles.counterValue}>{habits.daysWeedFree}</Text>
                <TouchableOpacity
                  style={styles.counterBtn}
                  onPress={() =>
                    setHabits({ daysWeedFree: habits.daysWeedFree + 1 })
                  }
                >
                  <Text style={styles.counterBtnText}>+1</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.counterBtn}
                  onPress={() => setHabits({ daysWeedFree: 0 })}
                >
                  <Text style={styles.counterBtnText}>Reset</Text>
                </TouchableOpacity>
              </View>
            </Field>
          </Row>
          <Link href="/components/screens/FastingScreen" asChild>
            <TouchableOpacity style={styles.saveButton}>
              <Text style={styles.saveButtonText}>Open Fasting Settings</Text>
            </TouchableOpacity>
          </Link>
        </View>

        <TouchableOpacity
          style={styles.saveButton}
          onPress={async () => {
            const goals = {
              sex,
              age: Number(age) || 0,
              heightCm: Number(heightCm) || 0,
              weightKg: Number(weightKg) || 0,
              activity,
              strategy,
              pace,
              manualCalorieDelta: Number(manualDelta) || 0,
              useManualCalories,
              manualCalories: Number(manualCalories) || undefined,
              cuttingKeepMuscle,
              useManualMacros,
              manualProtein: Number(manualProtein) || undefined,
              manualCarbs: Number(manualCarbs) || undefined,
              manualFat: Number(manualFat) || undefined,
              minAverageProteinQuality: Number(minAvgQuality) || undefined,
              minHighQualityProteinPercent:
                Number(minHighQualityPct) || undefined,
            } as const;
            await setUserGoals(goals);
            router.back();
          }}
        >
          <Text style={styles.saveButtonText}>Save</Text>
        </TouchableOpacity>

        <View style={{ height: 16 }} />
      </ScrollView>
    </View>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <View style={styles.row}>{children}</View>;
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View>{children}</View>
    </View>
  );
}

function NumInput(props: React.ComponentProps<typeof TextInput>) {
  return (
    <TextInput
      {...props}
      keyboardType="numeric"
      style={styles.input}
      placeholderTextColor="#a0a7ad"
    />
  );
}

function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { key: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={styles.segmented}>
      {options.map((opt) => {
        const active = opt.key === value;
        return (
          <TouchableOpacity
            key={String(opt.key)}
            style={[styles.segment, active && styles.segmentActive]}
            onPress={() => onChange(opt.key)}
          >
            <Text
              style={[styles.segmentText, active && styles.segmentTextActive]}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function Readout({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.readout}>
      <Text style={styles.readoutLabel}>{label}</Text>
      <Text style={styles.readoutValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fa" },
  header: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  headerBack: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  headerBackText: {
    fontSize: 22,
    color: "#2c3e50",
    fontWeight: "700",
    lineHeight: 22,
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#2c3e50" },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 20 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#eee",
    marginTop: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2c3e50",
    marginBottom: 8,
  },
  helperText: { color: "#7f8c8d", fontSize: 12, marginBottom: 8 },
  row: { flexDirection: "row", gap: 12, marginBottom: 10, flexWrap: "wrap" },
  field: { flex: 1, minWidth: 140 },
  fieldLabel: { color: "#2c3e50", fontWeight: "600", marginBottom: 6 },
  input: {
    backgroundColor: "#fff",
    borderColor: "#ddd",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
    color: "#2c3e50",
  },
  segmented: {
    flexDirection: "row",
    backgroundColor: "#f1f4f7",
    borderRadius: 8,
    padding: 2,
  },
  segment: { paddingVertical: 8, paddingHorizontal: 10, borderRadius: 6 },
  segmentActive: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  segmentText: { color: "#2c3e50" },
  segmentTextActive: { fontWeight: "700" },
  readoutsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  readout: {
    flex: 1,
    backgroundColor: "#f8fafc",
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: "#eee",
    alignItems: "center",
  },
  readoutLabel: { color: "#7f8c8d", fontSize: 12 },
  readoutValue: { color: "#2c3e50", fontWeight: "700", marginTop: 2 },
  saveButton: {
    backgroundColor: "#3498db",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 12,
  },
  saveButtonText: { color: "white", fontSize: 16, fontWeight: "700" },
  counterRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  counterValue: {
    minWidth: 36,
    textAlign: "center",
    fontWeight: "700",
    color: "#2c3e50",
  },
  counterBtn: {
    backgroundColor: "#EFF7FD",
    borderWidth: 1,
    borderColor: "#3498db",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
  },
  counterBtnText: { color: "#3498db", fontWeight: "700" },
});
