import React, { useState, useEffect } from "react";
import { Text, View, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";

// Interface to define what props this component accepts
interface BarcodeScannerProps {
  onFoodScanned?: (barcode: string) => void; // Optional callback function
  resetKey?: number; // changes trigger resuming scan
}

// Update component to accept props
const BarcodeScanner: React.FC<BarcodeScannerProps> = ({
  onFoodScanned,
  resetKey,
}) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (permission && !permission.granted) {
      requestPermission();
    }
  }, [permission]);

  useEffect(() => {
    // Parent can bump resetKey to resume scanning
    setScanned(false);
  }, [resetKey]);

  // Auto-resume scanning when component mounts or resets
  useEffect(() => {
    setScanned(false);
  }, []);

  // Updated to use the callback function instead of just console.log
  const handleBarCodeScanned = ({
    type,
    data,
  }: {
    type: string;
    data: string;
  }) => {
    setScanned(true);

    // Call parent function directly, no alert
    if (onFoodScanned) {
      onFoodScanned(data); // Pass barcode to parent immediately
    } else {
      // Fallback behavior if no callback provided
      console.log("Add food with barcode:", data);
      router.back();
    }
  };

  if (!permission) {
    return <View />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text>We need your permission to show the camera</Text>
        <TouchableOpacity onPress={requestPermission} style={styles.button}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing="back"
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      />
      <View style={styles.overlay}>
        <View style={styles.unfocusedContainer}></View>
        <View style={styles.middleContainer}>
          <View style={styles.unfocusedContainer}></View>
          <View style={styles.focusedContainer}></View>
          <View style={styles.unfocusedContainer}></View>
        </View>
        <View style={styles.unfocusedContainer}></View>
      </View>
      {/* Removed scan again button - auto-resume scanning */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  unfocusedContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
  },
  middleContainer: {
    flexDirection: "row",
    flex: 1.5,
  },
  focusedContainer: {
    flex: 6,
    borderWidth: 2,
    borderColor: "white",
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  scanAgainButton: {
    position: "absolute",
    bottom: 50,
    alignSelf: "center",
    backgroundColor: "#3498db",
    padding: 15,
    borderRadius: 10,
  },
  scanAgainText: {
    color: "white",
    fontWeight: "bold",
  },
  button: {
    backgroundColor: "#3498db",
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
  },
  buttonText: {
    color: "white",
    fontWeight: "bold",
  },
});

export default BarcodeScanner;
