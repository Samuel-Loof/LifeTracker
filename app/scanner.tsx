import React from "react";
import { View, Text, StyleSheet } from "react-native";
import BarcodeScanner from "./components/BarcodeScanner";

const ScannerScreen = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Scan Food Barcode</Text>
      <BarcodeScanner />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    margin: 20,
  },
});

export default ScannerScreen;
