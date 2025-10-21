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
import { useHabits } from "../HabitContext";

interface Todo {
  id: string;
  text: string;
  completed: boolean;
  createdAt: string; // ISO date string
  completedAt?: string; // ISO date string
}

const ENCOURAGEMENT_MESSAGES = [
  "Great! You've completed a task today! 🎉",
  "Awesome! One more task done! ✨",
  "You're on fire! Keep it up! 🔥",
  "Productivity level: Expert! 💪",
  "Every task completed is a step forward! 🚀",
  "You're building great habits! 🌟",
  "Consistency is key - you've got this! 💯",
  "Small wins lead to big victories! 🏆",
];

export default function TodoListScreen() {
  const router = useRouter();
  const { todos, addTodo, updateTodo, deleteTodo } = useHabits();

  const [showAddModal, setShowAddModal] = useState(false);
  const [newTodoText, setNewTodoText] = useState("");
  const [showEncouragement, setShowEncouragement] = useState(false);
  const [encouragementMessage, setEncouragementMessage] = useState("");

  const today = new Date().toISOString().split("T")[0];
  const todayTodos = todos.filter((todo) => todo.createdAt.startsWith(today));
  const completedToday = todayTodos.filter((todo) => todo.completed).length;
  const totalToday = todayTodos.length;

  const handleAddTodo = async () => {
    if (!newTodoText.trim()) {
      Alert.alert("Error", "Please enter a todo item");
      return;
    }

    const todo: Todo = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      text: newTodoText.trim(),
      completed: false,
      createdAt: new Date().toISOString(),
    };

    await addTodo(todo);
    setNewTodoText("");
    setShowAddModal(false);
  };

  const handleToggleTodo = async (todo: Todo) => {
    const wasCompleted = todo.completed;
    const updatedTodo = {
      ...todo,
      completed: !todo.completed,
      completedAt: !todo.completed ? new Date().toISOString() : undefined,
    };

    await updateTodo(updatedTodo);

    // Show encouragement if completing a task
    if (!wasCompleted) {
      const randomMessage =
        ENCOURAGEMENT_MESSAGES[
          Math.floor(Math.random() * ENCOURAGEMENT_MESSAGES.length)
        ];
      setEncouragementMessage(randomMessage);
      setShowEncouragement(true);

      // Auto-hide after 3 seconds
      setTimeout(() => {
        setShowEncouragement(false);
      }, 3000);
    }
  };

  const handleDeleteTodo = async (todo: Todo) => {
    Alert.alert(
      "Delete Todo",
      `Are you sure you want to delete "${todo.text}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteTodo(todo.id),
        },
      ]
    );
  };

  const getProgressMessage = () => {
    if (totalToday === 0) return "Ready to tackle today's tasks?";
    if (completedToday === 0) return "Let's get started!";
    if (completedToday === totalToday)
      return "Perfect! All tasks completed! 🎯";
    if (completedToday === 1) return "Great start! Keep going! 💪";
    return `You're doing great! ${completedToday}/${totalToday} completed!`;
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ width: 40 }} />
        <Text style={styles.headerTitle}>To-Do List</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddModal(true)}
        >
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Progress Card */}
        <View style={styles.progressCard}>
          <Text style={styles.progressTitle}>Today's Progress</Text>
          <Text style={styles.progressMessage}>{getProgressMessage()}</Text>
          {totalToday > 0 && (
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${(completedToday / totalToday) * 100}%` },
                ]}
              />
            </View>
          )}
          <Text style={styles.progressStats}>
            {completedToday} of {totalToday} tasks completed
          </Text>
        </View>

        {/* Todo List */}
        <View style={styles.todoSection}>
          <Text style={styles.sectionTitle}>Today's Tasks</Text>
          {todayTodos.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No tasks for today yet</Text>
              <Text style={styles.emptyStateSubtext}>
                Tap the + button to add your first task
              </Text>
            </View>
          ) : (
            todayTodos.map((todo) => (
              <View key={todo.id} style={styles.todoItem}>
                <TouchableOpacity
                  style={styles.checkbox}
                  onPress={() => handleToggleTodo(todo)}
                >
                  <Text style={styles.checkboxText}>
                    {todo.completed ? "✓" : ""}
                  </Text>
                </TouchableOpacity>
                <Text
                  style={[
                    styles.todoText,
                    todo.completed && styles.todoTextCompleted,
                  ]}
                >
                  {todo.text}
                </Text>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDeleteTodo(todo)}
                >
                  <Text style={styles.deleteButtonText}>🗑️</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        {/* Previous Days */}
        {todos.filter((todo) => !todo.createdAt.startsWith(today)).length >
          0 && (
          <View style={styles.todoSection}>
            <Text style={styles.sectionTitle}>Previous Tasks</Text>
            {todos
              .filter((todo) => !todo.createdAt.startsWith(today))
              .slice(0, 5) // Show only last 5
              .map((todo) => (
                <View key={todo.id} style={styles.todoItem}>
                  <TouchableOpacity
                    style={styles.checkbox}
                    onPress={() => handleToggleTodo(todo)}
                  >
                    <Text style={styles.checkboxText}>
                      {todo.completed ? "✓" : ""}
                    </Text>
                  </TouchableOpacity>
                  <Text
                    style={[
                      styles.todoText,
                      todo.completed && styles.todoTextCompleted,
                    ]}
                  >
                    {todo.text}
                  </Text>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDeleteTodo(todo)}
                  >
                    <Text style={styles.deleteButtonText}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              ))}
          </View>
        )}
      </ScrollView>

      {/* Add Todo Modal */}
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
              <Text style={styles.modalTitle}>Add New Task</Text>
              <View style={{ width: 24 }} />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>What needs to be done?</Text>
              <TextInput
                style={styles.textInput}
                value={newTodoText}
                onChangeText={setNewTodoText}
                placeholder="Enter your task..."
                autoFocus
                multiline
              />
            </View>

            <TouchableOpacity style={styles.saveButton} onPress={handleAddTodo}>
              <Text style={styles.saveButtonText}>Add Task</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Encouragement Toast */}
      {showEncouragement && (
        <View style={styles.encouragementToast}>
          <Text style={styles.encouragementText}>{encouragementMessage}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    height: 60,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
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
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#2c3e50",
    alignItems: "center",
    justifyContent: "center",
  },
  addButtonText: {
    color: "white",
    fontSize: 20,
    fontWeight: "bold",
  },
  content: {
    flex: 1,
    padding: 20,
  },
  progressCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2c3e50",
    marginBottom: 8,
  },
  progressMessage: {
    fontSize: 16,
    color: "#666",
    marginBottom: 12,
  },
  progressBar: {
    height: 8,
    backgroundColor: "#f0f0f0",
    borderRadius: 4,
    marginBottom: 8,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#4CAF50",
    borderRadius: 4,
  },
  progressStats: {
    fontSize: 14,
    color: "#888",
    textAlign: "center",
  },
  todoSection: {
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
  todoItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    // Notepad-style background
    borderLeftWidth: 4,
    borderLeftColor: "#ffeb3b",
    backgroundColor: "#fefefe",
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#ddd",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    backgroundColor: "white",
  },
  checkboxText: {
    fontSize: 14,
    color: "#4CAF50",
    fontWeight: "bold",
  },
  todoText: {
    flex: 1,
    fontSize: 16,
    color: "#2c3e50",
    lineHeight: 22,
  },
  todoTextCompleted: {
    textDecorationLine: "line-through",
    color: "#888",
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
  inputContainer: {
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
    minHeight: 80,
    textAlignVertical: "top",
  },
  saveButton: {
    backgroundColor: "#2c3e50",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  saveButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  encouragementToast: {
    position: "absolute",
    top: 100,
    left: 20,
    right: 20,
    backgroundColor: "#4CAF50",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  encouragementText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
});
