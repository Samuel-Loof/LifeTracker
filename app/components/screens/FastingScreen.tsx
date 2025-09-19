import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  PanResponder,
  GestureResponderEvent,
  PanResponderGestureState,
} from "react-native";
import { useRouter } from "expo-router";
import { useFood } from "../FoodContext";

export default function FastingScreen() {
  const router = useRouter();
  const { fasting, setFasting } = useFood();

  const [fastH, setFastH] = useState<number>(fasting.fastingHours);
  const eatH = 24 - fastH;

  const barWidth = 280;
  const minFast = 12;
  const maxFast = 23;

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderMove: (
          _: GestureResponderEvent,
          gesture: PanResponderGestureState
        ) => {
          const dx = gesture.moveX - gesture.x0; // not ideal globally, but simple for now
          const ratio = Math.max(
            0,
            Math.min(1, (dx + barWidth / 2) / barWidth)
          );
          const hours = Math.round(minFast + ratio * (maxFast - minFast));
          setFastH(hours);
        },
        onPanResponderRelease: () => {},
      }),
    []
  );

  const knobPosition = useMemo(() => {
    const ratio = (fastH - minFast) / (maxFast - minFast);
    return Math.max(0, Math.min(1, ratio)) * barWidth;
  }, [fastH]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.headerBack}
        >
          <Text style={styles.headerBackText}>×</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Fasting</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Fasting Window</Text>
        <Text style={styles.helperText}>
          Drag to adjust ratio (e.g., 16:8 → 18:6)
        </Text>

        <View style={styles.sliderContainer}>
          <View style={styles.track} {...panResponder.panHandlers}>
            <View
              style={[styles.fastSegment, { width: (fastH / 24) * barWidth }]}
            />
            <View
              style={[styles.eatSegment, { width: (eatH / 24) * barWidth }]}
            />
            <View style={[styles.knob, { left: knobPosition - 12 }]} />
          </View>
          <Text style={styles.ratioText}>
            {fastH}:{eatH}
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Notifications</Text>
        <View style={styles.rowBetween}>
          <Text style={styles.label}>1 hour before end</Text>
          <Switch
            value={!!fasting.notifyOneHourBefore}
            onValueChange={(v) => setFasting({ notifyOneHourBefore: v })}
          />
        </View>
        <View style={styles.rowBetween}>
          <Text style={styles.label}>At end</Text>
          <Switch
            value={!!fasting.notifyAtEnd}
            onValueChange={(v) => setFasting({ notifyAtEnd: v })}
          />
        </View>
        <View style={styles.rowBetween}>
          <Text style={styles.label}>At start</Text>
          <Switch
            value={!!fasting.notifyAtStart}
            onValueChange={(v) => setFasting({ notifyAtStart: v })}
          />
        </View>
      </View>

      <TouchableOpacity
        style={styles.saveButton}
        onPress={async () => {
          await setFasting({ fastingHours: fastH });
          router.back();
        }}
      >
        <Text style={styles.saveButtonText}>Save</Text>
      </TouchableOpacity>
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
  card: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#eee",
    margin: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2c3e50",
    marginBottom: 8,
  },
  helperText: { color: "#7f8c8d", fontSize: 12, marginBottom: 8 },
  sliderContainer: { alignItems: "center" },
  track: {
    width: 280,
    height: 24,
    borderRadius: 12,
    overflow: "hidden",
    flexDirection: "row",
    backgroundColor: "#f1f4f7",
    position: "relative",
  },
  fastSegment: { backgroundColor: "#e6eef4", height: "100%" },
  eatSegment: { backgroundColor: "#d7f3e3", height: "100%" },
  knob: {
    position: "absolute",
    top: -8,
    width: 24,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  ratioText: { marginTop: 8, color: "#2c3e50", fontWeight: "700" },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  label: { color: "#2c3e50" },
  saveButton: {
    backgroundColor: "#3498db",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginHorizontal: 12,
    marginTop: 12,
  },
  saveButtonText: { color: "white", fontSize: 16, fontWeight: "700" },
});
