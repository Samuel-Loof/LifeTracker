import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Modal,
} from "react-native";
import { useRouter } from "expo-router";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useHabits } from "../HabitContext";

interface SupplementReminder {
  id: string;
  name: string;
  time: string; // HH:MM format
  isActive: boolean;
  isCustom: boolean;
}

const DEFAULT_SUPPLEMENTS = [
  { name: "Multivitamin", isCustom: false },
  { name: "Omega-3", isCustom: false },
  { name: "Creatine", isCustom: false },
  { name: "Vitamin D3", isCustom: false },
];

export default function SupplementReminderScreen() {
  const router = useRouter();
  const {
    supplementReminders,
    addSupplementReminder,
    updateSupplementReminder,
    deleteSupplementReminder,
  } = useHabits();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [customName, setCustomName] = useState("");
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [use24HourFormat, setUse24HourFormat] = useState(false);

  const formatTime = (timeString: string): string => {
    const [hours, minutes] = timeString.split(":");
    const hour = parseInt(hours);

    if (use24HourFormat) {
      return `${hours}:${minutes}`;
    } else {
      const ampm = hour >= 12 ? "PM" : "AM";
      const displayHour = hour % 12 || 12;
      return `${displayHour}:${minutes} ${ampm}`;
    }
  };

  const [selectedSupplement, setSelectedSupplement] = useState<string>("");
  const [showTimeConfirmation, setShowTimeConfirmation] = useState(false);

  const handleSelectSupplement = (supplementName: string) => {
    setSelectedSupplement(supplementName);
    setShowTimePicker(true);
  };

  const handleAddDefaultSupplement = async () => {
    if (!selectedSupplement) return;

    const timeString = `${selectedTime
      .getHours()
      .toString()
      .padStart(2, "0")}:${selectedTime
      .getMinutes()
      .toString()
      .padStart(2, "0")}`;

    const reminder: SupplementReminder = {
      id: Date.now().toString(),
      name: selectedSupplement,
      time: timeString,
      isActive: true,
      isCustom: false,
    };

    await addSupplementReminder(reminder);
    setShowAddModal(false);
    setShowTimePicker(false);
    setSelectedTime(new Date());
    setSelectedSupplement("");
  };

  const handleAddCustomSupplement = async () => {
    if (!customName.trim()) {
      Alert.alert("Error", "Please enter a supplement name");
      return;
    }

    setSelectedSupplement(customName.trim());
    setShowTimePicker(true);
  };

  const handleAddCustomSupplementWithTime = async () => {
    if (!selectedSupplement) return;

    const timeString = `${selectedTime
      .getHours()
      .toString()
      .padStart(2, "0")}:${selectedTime
      .getMinutes()
      .toString()
      .padStart(2, "0")}`;

    const reminder: SupplementReminder = {
      id: Date.now().toString(),
      name: selectedSupplement,
      time: timeString,
      isActive: true,
      isCustom: true,
    };

    await addSupplementReminder(reminder);
    setShowAddModal(false);
    setShowTimePicker(false);
    setSelectedTime(new Date());
    setCustomName("");
    setSelectedSupplement("");
    setIsAddingCustom(false);
  };

  const handleToggleReminder = async (reminder: SupplementReminder) => {
    const updatedReminder = { ...reminder, isActive: !reminder.isActive };
    await updateSupplementReminder(updatedReminder);
  };

  const handleDeleteReminder = async (reminder: SupplementReminder) => {
    Alert.alert(
      "Delete Reminder",
      `Are you sure you want to delete the reminder for ${reminder.name}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteSupplementReminder(reminder.id),
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content}>
        {/* Add Reminder Button */}
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddModal(true)}
        >
          <Text style={styles.addButtonText}>+ Add Supplement Reminder</Text>
        </TouchableOpacity>

        {/* Active Reminders */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Active Reminders</Text>
          {supplementReminders.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                No supplement reminders set yet
              </Text>
              <Text style={styles.emptyStateSubtext}>
                Tap the button above to add your first reminder
              </Text>
            </View>
          ) : (
            supplementReminders.map((reminder) => (
              <View key={reminder.id} style={styles.reminderCard}>
                <View style={styles.reminderInfo}>
                  <Text style={styles.reminderName}>{reminder.name}</Text>
                  <Text style={styles.reminderTime}>
                    {formatTime(reminder.time)}
                  </Text>
                </View>
                <View style={styles.reminderActions}>
                  <TouchableOpacity
                    style={[
                      styles.toggleButton,
                      reminder.isActive
                        ? styles.toggleButtonActive
                        : styles.toggleButtonInactive,
                    ]}
                    onPress={() => handleToggleReminder(reminder)}
                  >
                    <Text
                      style={[
                        styles.toggleButtonText,
                        reminder.isActive
                          ? styles.toggleButtonTextActive
                          : styles.toggleButtonTextInactive,
                      ]}
                    >
                      {reminder.isActive ? "ON" : "OFF"}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDeleteReminder(reminder)}
                  >
                    <Text style={styles.deleteButtonText}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Add Reminder Modal */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Text style={styles.modalClose}>×</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Add Supplement Reminder</Text>
              <View style={{ width: 24 }} />
            </View>

            {isAddingCustom ? (
              <View style={styles.customInputContainer}>
                <Text style={styles.inputLabel}>Supplement Name</Text>
                <TextInput
                  style={styles.textInput}
                  value={customName}
                  onChangeText={setCustomName}
                  placeholder="Enter supplement name"
                  autoFocus
                />
              </View>
            ) : (
              <View style={styles.defaultSupplementsContainer}>
                <Text style={styles.inputLabel}>Choose a supplement:</Text>
                {DEFAULT_SUPPLEMENTS.map((supplement) => (
                  <TouchableOpacity
                    key={supplement.name}
                    style={styles.supplementOption}
                    onPress={() => handleSelectSupplement(supplement.name)}
                  >
                    <Text style={styles.supplementOptionText}>
                      {supplement.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <View style={styles.modalActions}>
              {!isAddingCustom && (
                <TouchableOpacity
                  style={styles.customButton}
                  onPress={() => setIsAddingCustom(true)}
                >
                  <Text style={styles.customButtonText}>
                    Add Custom Supplement
                  </Text>
                </TouchableOpacity>
              )}
              {isAddingCustom && (
                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={handleAddCustomSupplement}
                >
                  <Text style={styles.saveButtonText}>Save Reminder</Text>
                </TouchableOpacity>
              )}
            </View>

            {showTimePicker && (
              <View style={styles.timePickerContainer}>
                <Text style={styles.timePickerTitle}>
                  Set reminder time for {selectedSupplement}
                </Text>
                <DateTimePicker
                  value={selectedTime}
                  mode="time"
                  display="default"
                  onChange={(event, selectedTime) => {
                    setShowTimePicker(false);
                    if (event.type === "set" && selectedTime) {
                      setSelectedTime(selectedTime);
                      setShowTimeConfirmation(true);
                    }
                    // If user pressed "Cancel", just close without showing confirmation
                  }}
                />
              </View>
            )}

            {showTimeConfirmation && (
              <View style={styles.timeConfirmationContainer}>
                <Text style={styles.confirmationTitle}>Confirm Reminder</Text>
                <Text style={styles.confirmationText}>
                  Add reminder for {selectedSupplement} at{" "}
                  {formatTime(
                    `${selectedTime
                      .getHours()
                      .toString()
                      .padStart(2, "0")}:${selectedTime
                      .getMinutes()
                      .toString()
                      .padStart(2, "0")}`
                  )}
                  ?
                </Text>
                <View style={styles.timePickerButtons}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => {
                      setShowTimeConfirmation(false);
                      setSelectedSupplement("");
                      if (isAddingCustom) {
                        setIsAddingCustom(false);
                        setCustomName("");
                      }
                    }}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.confirmButton}
                    onPress={
                      isAddingCustom
                        ? handleAddCustomSupplementWithTime
                        : handleAddDefaultSupplement
                    }
                  >
                    <Text style={styles.confirmButtonText}>Add Reminder</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  timeFormatToggle: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#f0f0f0",
    borderRadius: 16,
  },
  timeFormatText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#2c3e50",
  },
  content: {
    flex: 1,
    padding: 20,
  },
  addButton: {
    backgroundColor: "#2c3e50",
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 24,
  },
  addButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#2c3e50",
    marginBottom: 16,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: "#666",
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: "#999",
  },
  reminderCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  reminderInfo: {
    flex: 1,
  },
  reminderName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2c3e50",
    marginBottom: 4,
  },
  reminderTime: {
    fontSize: 14,
    color: "#666",
  },
  reminderActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  toggleButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  toggleButtonActive: {
    backgroundColor: "#27ae60",
  },
  toggleButtonInactive: {
    backgroundColor: "#e74c3c",
  },
  toggleButtonText: {
    fontSize: 12,
    fontWeight: "600",
  },
  toggleButtonTextActive: {
    color: "white",
  },
  toggleButtonTextInactive: {
    color: "white",
  },
  deleteButton: {
    padding: 8,
  },
  deleteButtonText: {
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "white",
    borderRadius: 12,
    padding: 20,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  modalClose: {
    fontSize: 24,
    color: "#666",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2c3e50",
  },
  customInputContainer: {
    marginBottom: 20,
  },
  defaultSupplementsContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: "#2c3e50",
    marginBottom: 12,
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#f8f9fa",
  },
  supplementOption: {
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#eee",
  },
  supplementOptionText: {
    fontSize: 16,
    color: "#2c3e50",
  },
  timeContainer: {
    marginBottom: 20,
  },
  timeButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#f8f9fa",
  },
  timeButtonText: {
    fontSize: 16,
    color: "#2c3e50",
  },
  timeButtonArrow: {
    fontSize: 16,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  customButton: {
    flex: 1,
    backgroundColor: "#f8f9fa",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  customButtonText: {
    fontSize: 14,
    color: "#666",
  },
  saveButton: {
    flex: 1,
    backgroundColor: "#2c3e50",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  saveButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  timePickerContainer: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 20,
    marginTop: 20,
    alignItems: "center",
  },
  timePickerTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2c3e50",
    marginBottom: 16,
    textAlign: "center",
  },
  timePickerButtons: {
    flexDirection: "row",
    marginTop: 20,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "#f8f9fa",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  cancelButtonText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "600",
  },
  confirmButton: {
    flex: 1,
    backgroundColor: "#2c3e50",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  confirmButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  timeConfirmationContainer: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 20,
    marginTop: 20,
    alignItems: "center",
  },
  confirmationTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2c3e50",
    marginBottom: 12,
    textAlign: "center",
  },
  confirmationText: {
    fontSize: 16,
    color: "#666",
    marginBottom: 20,
    textAlign: "center",
    lineHeight: 22,
  },
});
