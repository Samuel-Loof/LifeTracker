import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function ManualAddScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Add Food Manually</Text>
      <Text>This feature will be implemented soon!</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
  },
});
