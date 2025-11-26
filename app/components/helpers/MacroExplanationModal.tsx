import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TouchableWithoutFeedback,
} from "react-native";

interface MacroExplanationModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function MacroExplanationModal({
  visible,
  onClose,
}: MacroExplanationModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.modalOverlayTouchable} />
        </TouchableWithoutFeedback>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Understanding Macros</Text>
            <TouchableOpacity
              onPress={onClose}
              style={styles.modalCloseButton}
            >
              <Text style={styles.modalCloseText}>×</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            style={styles.modalScrollView}
            contentContainerStyle={styles.modalScrollContent}
            showsVerticalScrollIndicator={true}
            scrollEnabled={true}
            bounces={true}
          >
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Calories</Text>
              <Text style={styles.modalText}>
                Calories are units of energy your body uses for daily functions,
                physical activity, and maintaining body temperature. Your daily
                calorie goal is based on your BMR (Basal Metabolic Rate) and
                activity level.
              </Text>
            </View>
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>
                Macronutrients (Macros)
              </Text>
              <Text style={styles.modalText}>
                Macros are the three main nutrients your body needs in large
                amounts:
              </Text>
            </View>
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Protein</Text>
              <Text style={styles.modalText}>
                Essential for building and repairing muscles, tissues, and cells.
                Each gram provides 4 calories. On a diet, higher protein intake
                helps preserve muscle mass, increases satiety (feeling full), and
                has a higher thermic effect (burns more calories during
                digestion). Aim for 1.6-2.0g per kg (0.73-0.91g per lb) of body
                weight when cutting.
                {'\n\n'}
                If you're weight training, aim for 2.0-2.2g per kg (0.9-1.0g per lb)
                to support muscle recovery and growth. A simple rule is ~1g per lb
                of body weight for active individuals.
              </Text>
            </View>
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Carbohydrates</Text>
              <Text style={styles.modalText}>
                Your body's primary energy source. Each gram provides 4 calories.
                Carbs fuel your brain, muscles, and daily activities. Choose
                complex carbs (whole grains, vegetables) for sustained energy.
                {'\n\n'}
                If you're weight training, carbs become even more important for
                fueling workouts and aiding recovery. Consider timing your carbs
                around your training sessions - having some before and after
                workouts can improve performance and recovery.
              </Text>
            </View>
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Fat</Text>
              <Text style={styles.modalText}>
                Important for hormone production, vitamin absorption, and cell
                function. Each gram provides 9 calories. Maintain at least 0.8g
                per kg (0.36g per lb) of body weight or 15% of calories for
                optimal hormonal health, especially when dieting.
                {'\n\n'}
                If you're weight training, don't go below 0.5g per kg (0.25g per
                lb) as very low fat intake can negatively affect hormone
                production (testosterone, estrogen) and recovery. Healthy fats
                support inflammation reduction and overall recovery.
              </Text>
            </View>
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>
                Why More Protein on a Diet?
              </Text>
              <Text style={styles.modalText}>
                When in a calorie deficit, your body may break down muscle for
                energy. Higher protein intake (2.0g/kg or 0.91g/lb) helps preserve
                muscle mass, keeps you feeling full longer, and requires more
                energy to digest, making it easier to maintain your diet while
                protecting your metabolism.
              </Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalOverlayTouchable: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 15,
    padding: 20,
    width: "90%",
    maxWidth: 500,
    maxHeight: "80%",
    minHeight: 400,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#2c3e50",
    flex: 1,
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f0f0f0",
    alignItems: "center",
    justifyContent: "center",
  },
  modalCloseText: {
    fontSize: 24,
    color: "#666",
    lineHeight: 24,
  },
  modalScrollView: {
    maxHeight: 400,
  },
  modalScrollContent: {
    paddingBottom: 20,
  },
  modalSection: {
    marginBottom: 20,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2c3e50",
    marginBottom: 8,
  },
  modalText: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
});

