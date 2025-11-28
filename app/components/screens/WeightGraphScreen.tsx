import React, { useMemo, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  PanResponder,
  Dimensions,
} from "react-native";
import { useFood, convertKgToLbs, convertLbsToKg } from "../FoodContext";
import Svg, { Polyline, Circle, Line, Text as SvgText } from "react-native-svg";

const MIN_WEIGHT_KG = 20;
const MAX_WEIGHT_KG = 400;
const MIN_WEIGHT_LBS = 44; // ~20kg
const MAX_WEIGHT_LBS = 882; // ~400kg

export default function WeightGraphScreen() {
  const { weightHistory, userGoals, removeWeightEntry, addWeightEntry, setUserGoals } = useFood();
  const [showAddModal, setShowAddModal] = useState(false);
  const [newWeight, setNewWeight] = useState("");
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState(0);

  const sortedHistory = useMemo(() => {
    return [...weightHistory].sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
    );
  }, [weightHistory]);

  // Helper function to format weight input (convert comma to dot, limit to 2 decimals)
  const formatWeightInput = (value: string, previousValue: string): string => {
    // If empty, allow it
    if (value === "") return "";
    
    // Replace comma with dot
    let formatted = value.replace(/,/g, ".");
    // Remove any non-numeric characters except dot
    formatted = formatted.replace(/[^0-9.]/g, "");
    
    // Ensure only one dot
    const parts = formatted.split(".");
    if (parts.length > 2) {
      formatted = parts[0] + "." + parts.slice(1).join("");
    }
    
    // Limit to 2 decimal places - if trying to add more than 2 decimals, block the input
    if (parts.length === 2 && parts[1].length > 2) {
      // Return previous value to prevent the input from changing (this prevents white text)
      return previousValue;
    }
    
    return formatted;
  };

  // Calculate moving average (7-day window)
  const movingAverage = useMemo(() => {
    if (sortedHistory.length === 0) return [];
    const window = 7;
    const averages: number[] = [];
    for (let i = 0; i < sortedHistory.length; i++) {
      const start = Math.max(0, i - Math.floor(window / 2));
      const end = Math.min(sortedHistory.length, i + Math.ceil(window / 2));
      const slice = sortedHistory.slice(start, end);
      const avg = slice.reduce((sum, e) => sum + e.weightKg, 0) / slice.length;
      averages.push(avg);
    }
    return averages;
  }, [sortedHistory]);

  // Smart Y-axis scaling with 5kg increments
  const getYAxisRange = (minWeight: number, maxWeight: number) => {
    const range = maxWeight - minWeight;
    const increment = userGoals?.useImperialUnits ? 5 : 5; // 5kg or ~11lbs
    const unitIncrement = userGoals?.useImperialUnits 
      ? convertKgToLbs(5) 
      : 5;
    
    // Round down min and up max to nearest increment
    const minRounded = Math.floor(minWeight / unitIncrement) * unitIncrement;
    const maxRounded = Math.ceil(maxWeight / unitIncrement) * unitIncrement;
    
    // Add padding (one increment below and above)
    return {
      min: Math.max(0, minRounded - unitIncrement),
      max: maxRounded + unitIncrement,
      increment: unitIncrement,
    };
  };

  const graphData = useMemo(() => {
    if (sortedHistory.length === 0) return null;

    const maxWeight = Math.max(...sortedHistory.map((e) => e.weightKg));
    const minWeight = Math.min(...sortedHistory.map((e) => e.weightKg));
    const yAxis = getYAxisRange(minWeight, maxWeight);

    const width = Dimensions.get("window").width - 80;
    const height = 250;
    const paddingX = 50;
    const paddingY = 40;
    const paddingBottom = 30;

    // Calculate date range for labels
    const firstDate = sortedHistory[0].timestamp;
    const lastDate = sortedHistory[sortedHistory.length - 1].timestamp;
    const daysDiff = Math.ceil(
      (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Smart date label interval based on time span
    let dateInterval = 1;
    if (daysDiff > 365) {
      dateInterval = Math.ceil(daysDiff / 12); // ~monthly
    } else if (daysDiff > 90) {
      dateInterval = Math.ceil(daysDiff / 8); // ~weekly
    } else if (daysDiff > 30) {
      dateInterval = Math.ceil(daysDiff / 6); // ~weekly
    } else {
      dateInterval = Math.max(1, Math.ceil(daysDiff / 5)); // ~daily
    }

    const points = sortedHistory.map((entry, index) => {
      const x =
        paddingX + (index / (sortedHistory.length - 1 || 1)) * (width - paddingX * 2);
      const y =
        paddingY +
        height -
        paddingY -
        paddingBottom -
        ((entry.weightKg - yAxis.min) / (yAxis.max - yAxis.min)) *
          (height - paddingY - paddingBottom);
      return { x, y, weight: entry.weightKg, entry, index };
    });

    const avgPoints = movingAverage.map((avg, index) => {
      const x =
        paddingX + (index / (sortedHistory.length - 1 || 1)) * (width - paddingX * 2);
      const y =
        paddingY +
        height -
        paddingY -
        paddingBottom -
        ((avg - yAxis.min) / (yAxis.max - yAxis.min)) *
          (height - paddingY - paddingBottom);
      return { x, y };
    });

    // Generate Y-axis labels
    const yAxisLabels: { value: number; y: number }[] = [];
    for (let val = yAxis.min; val <= yAxis.max; val += yAxis.increment) {
      const y =
        paddingY +
        height -
        paddingY -
        paddingBottom -
        ((val - yAxis.min) / (yAxis.max - yAxis.min)) *
          (height - paddingY - paddingBottom);
      yAxisLabels.push({ value: val, y });
    }

    // Generate X-axis date labels
    const xAxisLabels: { date: Date; x: number; label: string }[] = [];
    for (let i = 0; i < sortedHistory.length; i += dateInterval) {
      const entry = sortedHistory[i];
      const x =
        paddingX + (i / (sortedHistory.length - 1 || 1)) * (width - paddingX * 2);
      let label = "";
      if (daysDiff > 365) {
        label = entry.timestamp.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
      } else if (daysDiff > 30) {
        label = entry.timestamp.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      } else {
        label = entry.timestamp.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      }
      xAxisLabels.push({ date: entry.timestamp, x, label });
    }
    // Always add last date
    if (xAxisLabels.length === 0 || 
        xAxisLabels[xAxisLabels.length - 1].date.getTime() !== lastDate.getTime()) {
      const x = paddingX + (sortedHistory.length - 1) / (sortedHistory.length - 1 || 1) * (width - paddingX * 2);
      let label = "";
      if (daysDiff > 365) {
        label = lastDate.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
      } else {
        label = lastDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      }
      xAxisLabels.push({ date: lastDate, x, label });
    }

    return {
      points,
      avgPoints,
      width,
      height,
      paddingX,
      paddingY,
      paddingBottom,
      yAxis,
      yAxisLabels,
      xAxisLabels,
    };
  }, [sortedHistory, movingAverage, userGoals?.useImperialUnits]);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const formatWeight = (weight: number) => {
    if (userGoals?.useImperialUnits) {
      return `${weight.toFixed(2).replace(/\.?0+$/, "")} lbs`;
    }
    return `${weight.toFixed(2).replace(/\.?0+$/, "")} kg`;
  };

  const formatWeightDisplay = (weight: number) => {
    if (userGoals?.useImperialUnits) {
      const lbs = convertKgToLbs(weight);
      return `${lbs.toFixed(1)} lbs`;
    }
    return `${weight.toFixed(1)} kg`;
  };

  const handleDelete = (id: string) => {
    removeWeightEntry(id);
  };

  const handleAddWeight = async () => {
    if (!newWeight.trim()) {
      Alert.alert("Error", "Please enter a weight");
      return;
    }

    const weightValue = parseFloat(newWeight);
    if (isNaN(weightValue) || weightValue <= 0) {
      Alert.alert("Error", "Please enter a valid weight");
      return;
    }

    // Convert to kg if imperial
    let weightKg = weightValue;
    if (userGoals?.useImperialUnits) {
      weightKg = convertLbsToKg(weightValue);
    }

    // Validate range
    if (weightKg < MIN_WEIGHT_KG || weightKg > MAX_WEIGHT_KG) {
      const min = userGoals?.useImperialUnits ? MIN_WEIGHT_LBS : MIN_WEIGHT_KG;
      const max = userGoals?.useImperialUnits ? MAX_WEIGHT_LBS : MAX_WEIGHT_KG;
      const unit = userGoals?.useImperialUnits ? "lbs" : "kg";
      Alert.alert(
        "Invalid Weight",
        `Weight must be between ${min} and ${max} ${unit}`
      );
      return;
    }

    // Round to 2 decimals
    weightKg = Math.round(weightKg * 100) / 100;

    // Add to history
    await addWeightEntry(weightKg);

    // Update current weight in user goals
    if (userGoals) {
      const updatedGoals = {
        ...userGoals,
        weightKg,
      };
      await setUserGoals(updatedGoals);
    }

    setNewWeight("");
    setShowAddModal(false);
  };

  if (sortedHistory.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Weight History</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowAddModal(true)}
          >
            <Text style={styles.addButtonText}>+</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No weight entries yet</Text>
          <Text style={styles.emptyStateSubtext}>
            Tap the + button to add your first weight entry
          </Text>
        </View>
        <AddWeightModal
          visible={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSave={handleAddWeight}
          newWeight={newWeight}
          setNewWeight={setNewWeight}
          formatWeightInput={formatWeightInput}
          userGoals={userGoals}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Weight History</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddModal(true)}
        >
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Graph Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Weight Trend</Text>
          {graphData && (
            <View style={styles.graphContainer}>
              <Svg width={graphData.width} height={graphData.height}>
                {/* Y-axis grid lines and labels */}
                {graphData.yAxisLabels.map((label, index) => (
                  <React.Fragment key={index}>
                    <Line
                      x1={graphData.paddingX}
                      y1={label.y}
                      x2={graphData.width - graphData.paddingX}
                      y2={label.y}
                      stroke="#e0e0e0"
                      strokeWidth="1"
                      strokeDasharray="4,4"
                    />
                    <SvgText
                      x={0}
                      y={label.y + 4}
                      fontSize="10"
                      fill="#666"
                      textAnchor="start"
                    >
                      {formatWeightDisplay(
                        userGoals?.useImperialUnits
                          ? convertKgToLbs(label.value)
                          : label.value
                      )}
                    </SvgText>
                  </React.Fragment>
                ))}

                {/* Moving average line (bold blue) */}
                {graphData.avgPoints.length > 1 && (
                  <Polyline
                    points={graphData.avgPoints
                      .map((p) => `${p.x},${p.y}`)
                      .join(" ")}
                    fill="none"
                    stroke="#2196F3"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {/* Median/actual weight line (light blue) */}
                {graphData.points.length > 1 && (
                  <Polyline
                    points={graphData.points
                      .map((p) => `${p.x},${p.y}`)
                      .join(" ")}
                    fill="none"
                    stroke="#87CEEB"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {/* Data points */}
                {graphData.points.map((point, index) => (
                  <Circle
                    key={index}
                    cx={point.x}
                    cy={point.y}
                    r="4"
                    fill="#87CEEB"
                    stroke="white"
                    strokeWidth="2"
                  />
                ))}

                {/* X-axis date labels */}
                {graphData.xAxisLabels.map((label, index) => (
                  <SvgText
                    key={index}
                    x={label.x}
                    y={graphData.height - 5}
                    fontSize="9"
                    fill="#666"
                    textAnchor="middle"
                  >
                    {label.label}
                  </SvgText>
                ))}
              </Svg>
            </View>
          )}

          {/* Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Current</Text>
              <Text style={styles.statValue}>
                {formatWeight(sortedHistory[sortedHistory.length - 1].weightKg)}
              </Text>
            </View>
            {sortedHistory.length > 1 && (
              <>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Change</Text>
                  <Text
                    style={[
                      styles.statValue,
                      sortedHistory[sortedHistory.length - 1].weightKg >
                      sortedHistory[0].weightKg
                        ? styles.statValuePositive
                        : styles.statValueNegative,
                    ]}
                  >
                    {sortedHistory[sortedHistory.length - 1].weightKg >
                    sortedHistory[0].weightKg
                      ? "+"
                      : ""}
                    {formatWeight(
                      sortedHistory[sortedHistory.length - 1].weightKg -
                        sortedHistory[0].weightKg
                    )}
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Entries</Text>
                  <Text style={styles.statValue}>
                    {sortedHistory.length}
                  </Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* History List */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>History</Text>
          {sortedHistory
            .slice()
            .reverse()
            .map((entry) => (
              <View key={entry.id} style={styles.historyItem}>
                <View style={styles.historyInfo}>
                  <Text style={styles.historyWeight}>
                    {formatWeight(entry.weightKg)}
                  </Text>
                  <Text style={styles.historyDate}>
                    {formatDate(entry.timestamp)}
                  </Text>
                  {entry.notes && (
                    <Text style={styles.historyNotes}>{entry.notes}</Text>
                  )}
                </View>
                <TouchableOpacity
                  onPress={() => handleDelete(entry.id)}
                  style={styles.deleteButton}
                >
                  <Text style={styles.deleteButtonText}>🗑️</Text>
                </TouchableOpacity>
              </View>
            ))}
        </View>
      </ScrollView>

      <AddWeightModal
        visible={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setNewWeight("");
        }}
        onSave={handleAddWeight}
        newWeight={newWeight}
        setNewWeight={setNewWeight}
        formatWeightInput={formatWeightInput}
        userGoals={userGoals}
      />
    </View>
  );
}

function AddWeightModal({
  visible,
  onClose,
  onSave,
  newWeight,
  setNewWeight,
  formatWeightInput,
  userGoals,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: () => void;
  newWeight: string;
  setNewWeight: (value: string) => void;
  formatWeightInput: (value: string, previous: string) => string;
  userGoals: any;
}) {
  const [localWeight, setLocalWeight] = useState("");

  React.useEffect(() => {
    if (visible) {
      setLocalWeight(newWeight);
    }
  }, [visible, newWeight]);

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Weight</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.modalClose}>×</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
            <Text style={styles.modalLabel}>
              Weight ({userGoals?.useImperialUnits ? "lbs" : "kg"})
            </Text>
            <TextInput
              style={styles.modalInput}
              value={localWeight}
              onChangeText={(text) => {
                const formatted = formatWeightInput(text, localWeight);
                // Only update if the value actually changed (prevents white text issue)
                if (formatted !== localWeight) {
                  setLocalWeight(formatted);
                  setNewWeight(formatted);
                }
              }}
              placeholder={userGoals?.useImperialUnits ? "165" : "75"}
              keyboardType="numeric"
              autoFocus
            />

            <TouchableOpacity style={styles.modalSaveButton} onPress={onSave}>
              <Text style={styles.modalSaveButtonText}>Add Weight</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2c3e50",
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#4CAF50",
    alignItems: "center",
    justifyContent: "center",
  },
  addButtonText: {
    color: "white",
    fontSize: 24,
    fontWeight: "bold",
    lineHeight: 24,
  },
  scrollContent: {
    padding: 20,
  },
  card: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2c3e50",
    marginBottom: 16,
  },
  graphContainer: {
    alignItems: "center",
    marginVertical: 20,
    overflow: "visible",
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  statItem: {
    alignItems: "center",
  },
  statLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2c3e50",
  },
  statValuePositive: {
    color: "#F44336",
  },
  statValueNegative: {
    color: "#4CAF50",
  },
  historyItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  historyInfo: {
    flex: 1,
  },
  historyWeight: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2c3e50",
    marginBottom: 4,
  },
  historyDate: {
    fontSize: 14,
    color: "#666",
  },
  historyNotes: {
    fontSize: 12,
    color: "#999",
    marginTop: 4,
  },
  deleteButton: {
    padding: 8,
  },
  deleteButtonText: {
    fontSize: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2c3e50",
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 20,
    width: "90%",
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2c3e50",
  },
  modalClose: {
    fontSize: 24,
    color: "#666",
  },
  modalBody: {
    gap: 16,
  },
  modalLabel: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  modalInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#f8f9fa",
    color: "#2c3e50", // Explicitly set text color to black to prevent white text issue
  },
  modalSaveButton: {
    backgroundColor: "#4CAF50",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
  },
  modalSaveButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});
