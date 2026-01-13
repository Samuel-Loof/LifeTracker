import React, { createContext, useContext, useState, useEffect } from "react";
import { Alert, Linking, Platform, AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
// Lazy-load notifications to avoid type errors if module isn't installed
let Notifications: any;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  Notifications = require("expo-notifications");
} catch (e) {
  Notifications = {
    setNotificationHandler: () => {},
    getPermissionsAsync: async () => ({ granted: false }),
    requestPermissionsAsync: async () => ({ granted: false }),
    scheduleNotificationAsync: async () => "",
    cancelScheduledNotificationAsync: async () => {},
  };
}

// Interfaces
export interface Habit {
  id: string;
  name: string;
  type: "alcohol" | "caffeine" | "sugar" | "custom";
  customName?: string;
  startDate: string;
  currentStreak: number;
  longestStreak: number;
  totalDays: number;
  isActive: boolean;
  color: string;
  notificationsEnabled?: boolean;
}

export interface HabitEntry {
  id: string;
  habitId: string;
  date: string;
  status: "success" | "failure" | "skip";
  notes?: string;
}

export interface FastingSettings {
  fastingHours: number;
  eatingWindowHours: number;
  startTime: string;
  isActive: boolean;
  notifications: boolean;
  notificationTime: string; // Deprecated, kept for backward compatibility
  notifyBeforeStart: boolean;
  notifyBeforeStartMinutes: number;
  notifyAtStart: boolean;
  notifyBeforeEnd: boolean;
  notifyBeforeEndMinutes: number;
  notifyAtEnd: boolean;
}

export interface FastingSession {
  id: string;
  startTime: string;
  endTime?: string;
  duration: number;
  completed: boolean;
  notes?: string;
}

export interface SupplementReminder {
  id: string;
  name: string;
  time: string;
  isActive: boolean;
  isCustom: boolean;
}

export interface StreakNotificationSettings {
  enabled: boolean;
  time: string;
  milestones: number[];
}

export interface Todo {
  id: string;
  text: string;
  completed: boolean;
  createdAt: string;
  completedAt?: string;
}

export interface HabitContextType {
  habits: Habit[];
  habitEntries: HabitEntry[];
  addHabit: (
    habit: Omit<Habit, "id" | "currentStreak" | "longestStreak" | "totalDays">
  ) => Promise<void>;
  updateHabit: (id: string, updates: Partial<Habit>) => Promise<void>;
  deleteHabit: (id: string) => Promise<void>;
  addHabitEntry: (entry: Omit<HabitEntry, "id">) => Promise<void>;
  updateHabitEntry: (id: string, updates: Partial<HabitEntry>) => Promise<void>;
  setHabitDayStatus: (
    habitId: string,
    date: string,
    status: "success" | "failure" | "none" | "skip"
  ) => Promise<void>;

  // Streak calculations
  getCurrentStreak: (habitId: string) => number;
  getLongestStreak: (habitId: string) => number;
  getTotalDays: (habitId: string) => number;
  getHabitEntriesForDate: (habitId: string, date: string) => HabitEntry[];

  fastingSettings: FastingSettings;
  fastingSessions: FastingSession[];
  updateFastingSettings: (settings: Partial<FastingSettings>) => Promise<void>;
  startFastingSession: () => Promise<void>;
  endFastingSession: () => Promise<void>;
  getCurrentFastingSession: () => FastingSession | null;

  streakNotificationSettings: StreakNotificationSettings;
  updateStreakNotificationSettings: (
    settings: Partial<StreakNotificationSettings>
  ) => Promise<void>;

  scheduleHabitNotification: (habitId: string, days: number) => Promise<void>;
  cancelHabitNotification: (habitId: string) => Promise<void>;
  testFastingNotifications: () => Promise<void>;
  testStreakNotifications: (habitId: string) => Promise<void>;
  ensureNotificationsEnabled: (interactive?: boolean) => Promise<boolean>;
  getNotificationPermissions: () => Promise<{
    granted: boolean;
    canAskAgain?: boolean;
    status?: string;
  }>;

  supplementReminders: SupplementReminder[];
  addSupplementReminder: (
    reminder: Omit<SupplementReminder, "id">
  ) => Promise<void>;
  updateSupplementReminder: (reminder: SupplementReminder) => Promise<void>;
  deleteSupplementReminder: (id: string) => Promise<void>;
  scheduleSupplementNotification: (
    reminder: SupplementReminder
  ) => Promise<void>;
  cancelSupplementNotification: (reminderId: string) => Promise<void>;

  todos: Todo[];
  addTodo: (todo: Omit<Todo, "id">) => Promise<void>;
  updateTodo: (todo: Todo) => Promise<void>;
  deleteTodo: (id: string) => Promise<void>;
}

const HabitContext = createContext<HabitContextType | undefined>(undefined);

export const HabitProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [habitEntries, setHabitEntries] = useState<HabitEntry[]>([]);
  const [fastingSettings, setFastingSettings] = useState<FastingSettings>({
    fastingHours: 16,
    eatingWindowHours: 8,
    startTime: "20:00",
    isActive: false,
    notifications: true,
    notificationTime: "09:00",
    notifyBeforeStart: true,
    notifyBeforeStartMinutes: 15,
    notifyAtStart: true,
    notifyBeforeEnd: true,
    notifyBeforeEndMinutes: 15,
    notifyAtEnd: true,
  });
  const [streakNotificationSettings, setStreakNotificationSettings] =
    useState<StreakNotificationSettings>({
      enabled: true,
      time: "20:00",
      milestones: [3, 7, 14, 30, 60, 90],
    });
  const [fastingSessions, setFastingSessions] = useState<FastingSession[]>([]);
  const [supplementReminders, setSupplementReminders] = useState<
    SupplementReminder[]
  >([]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [appState, setAppState] = useState<string>(AppState.currentState);

  useEffect(() => {
    loadData();
  }, []);

  // AppState listener to trigger daily checks when resuming to foreground
  useEffect(() => {
    const sub = AppState.addEventListener("change", (next) => {
      if (appState.match(/inactive|background/) && next === "active") {
        autoMarkTodayForActiveHabits();
      }
      setAppState(next);
    });
    return () => sub.remove();
  }, [appState, habits, habitEntries]);

  // Notifications: configure handler and ask permissions once
  useEffect(() => {
    (async () => {
      try {
        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: false,
            shouldSetBadge: false,
          }),
        });

        // Android requires a channel; without it, notifications may be dropped
        if (
          Platform.OS === "android" &&
          Notifications.setNotificationChannelAsync
        ) {
          try {
            await Notifications.setNotificationChannelAsync("high", {
              name: "High Importance",
              importance: Notifications.AndroidImportance.HIGH,
              vibrationPattern: [0, 250, 250, 250],
              lightColor: "#FF231F7C",
              sound: true,
            });

            await Notifications.setNotificationChannelAsync("supplements", {
              name: "Supplement Reminders",
              importance: Notifications.AndroidImportance.HIGH,
              vibrationPattern: [0, 250, 250, 250],
              lightColor: "#FF231F7C",
              sound: true,
            });

            await Notifications.setNotificationChannelAsync("default", {
              name: "Default",
              importance: Notifications.AndroidImportance.DEFAULT,
              vibrationPattern: [0, 250, 250, 250],
              lightColor: "#FF231F7C",
            });
          } catch {}
        }

        const settings = await Notifications.getPermissionsAsync();
        console.log("Current notification permissions:", settings);

        if (!settings.granted) {
          const result = await Notifications.requestPermissionsAsync({
            ios: {
              allowAlert: true,
              allowBadge: true,
              allowSound: true,
              allowAnnouncements: true,
            },
            android: {
              allowAlert: true,
              allowBadge: true,
              allowSound: true,
              allowVibrate: true,
              allowShowWhenLocked: true,
              allowDisplayOnLockScreen: true,
            },
          });
          console.log("Requested notification permissions:", result);
          if (!result.granted) {
            console.warn("Notification permissions denied by user");
          }
        }
      } catch (e) {
        console.warn("Notification setup failed:", e);
      }
    })();
  }, []);

  const loadData = async () => {
    try {
      const [
        habitsData,
        entriesData,
        fastingData,
        sessionsData,
        supplementsData,
        streakNotificationData,
        todosData,
      ] = await Promise.all([
        AsyncStorage.getItem("habits"),
        AsyncStorage.getItem("habitEntries"),
        AsyncStorage.getItem("fastingSettings"),
        AsyncStorage.getItem("fastingSessions"),
        AsyncStorage.getItem("supplementReminders"),
        AsyncStorage.getItem("streakNotificationSettings"),
        AsyncStorage.getItem("todos"),
      ]);

      if (habitsData) {
        try {
          const parsed = JSON.parse(habitsData);
          setHabits(Array.isArray(parsed) ? parsed : []);
        } catch {
          setHabits([]);
        }
      }
      if (entriesData) {
        try {
          const parsed = JSON.parse(entriesData);
          setHabitEntries(Array.isArray(parsed) ? parsed : []);
        } catch {
          setHabitEntries([]);
        }
      }
      if (fastingData) {
        const loaded = JSON.parse(fastingData);
        // Handle backward compatibility - add new notification fields if missing
        setFastingSettings({
          ...loaded,
          notifyBeforeStart: loaded.notifyBeforeStart ?? true,
          notifyBeforeStartMinutes: loaded.notifyBeforeStartMinutes ?? 15,
          notifyAtStart: loaded.notifyAtStart ?? true,
          notifyBeforeEnd: loaded.notifyBeforeEnd ?? true,
          notifyBeforeEndMinutes: loaded.notifyBeforeEndMinutes ?? 15,
          notifyAtEnd: loaded.notifyAtEnd ?? true,
        });
      }
      if (sessionsData) {
        setFastingSessions(JSON.parse(sessionsData));
      }
      if (supplementsData) {
        try {
          const parsed = JSON.parse(supplementsData);
          setSupplementReminders(Array.isArray(parsed) ? parsed : []);
        } catch {
          setSupplementReminders([]);
        }
      }
      if (streakNotificationData) {
        try {
          const parsed = JSON.parse(streakNotificationData);
          setStreakNotificationSettings(parsed);
        } catch {}
      }
      if (todosData) {
        try {
          const parsed = JSON.parse(todosData);
          setTodos(Array.isArray(parsed) ? parsed : []);
        } catch {
          setTodos([]);
        }
      }
    } catch (error) {
      console.error("Error loading habit data:", error);
    }
  };

  const addHabit = async (
    habitData: Omit<
      Habit,
      "id" | "currentStreak" | "longestStreak" | "totalDays"
    >
  ) => {
    const newHabit: Habit = {
      ...habitData,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      currentStreak: 0,
      longestStreak: 0,
      totalDays: 0,
    };

    setHabits((prev) => {
      const updated = [...prev, newHabit];
      AsyncStorage.setItem("habits", JSON.stringify(updated)).catch((error) =>
        console.error("Error saving habits:", error)
      );
      return updated;
    });

    try {
      await scheduleDefaultHabitMilestones(newHabit);
    } catch (e) {
      console.warn("Failed to schedule habit milestones:", e);
    }
  };

  const updateHabit = async (id: string, updates: Partial<Habit>) => {
    setHabits((prev) => {
      const updated = prev.map((habit) =>
        habit.id === id ? { ...habit, ...updates } : habit
      );
      AsyncStorage.setItem("habits", JSON.stringify(updated)).catch((error) =>
        console.error("Error saving habits:", error)
      );
      return updated;
    });

    try {
      const target = habits.find((h) => h.id === id);
      const newStart = updates.startDate;
      if (target && newStart) {
        await cancelHabitNotification(id);
        await scheduleDefaultHabitMilestones({
          ...target,
          startDate: newStart,
        } as Habit);
      }
    } catch (e) {
      console.warn("Failed to reschedule habit milestones:", e);
    }
  };

  const deleteHabit = async (id: string) => {
    setHabits((prev) => {
      const updated = prev.filter((habit) => habit.id !== id);
      AsyncStorage.setItem("habits", JSON.stringify(updated)).catch((error) =>
        console.error("Error saving habits:", error)
      );
      return updated;
    });

    setHabitEntries((prev) => {
      const updated = prev.filter((entry) => entry.habitId !== id);
      AsyncStorage.setItem("habitEntries", JSON.stringify(updated)).catch(
        (error) => console.error("Error saving habit entries:", error)
      );
      return updated;
    });
  };

  const addHabitEntry = async (entryData: Omit<HabitEntry, "id">) => {
    const newEntry: HabitEntry = {
      ...entryData,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };

    setHabitEntries((prev) => {
      const updated = [...prev, newEntry];
      AsyncStorage.setItem("habitEntries", JSON.stringify(updated)).catch(
        (error) => console.error("Error saving habit entries:", error)
      );
      return updated;
    });

    updateHabitStreaks(entryData.habitId);
  };

  const updateHabitEntry = async (id: string, updates: Partial<HabitEntry>) => {
    setHabitEntries((prev) => {
      const updated = prev.map((entry) =>
        entry.id === id ? { ...entry, ...updates } : entry
      );
      AsyncStorage.setItem("habitEntries", JSON.stringify(updated)).catch(
        (error) => console.error("Error saving habit entries:", error)
      );
      return updated;
    });
  };

  const setHabitDayStatus = async (
    habitId: string,
    date: string,
    status: "success" | "failure" | "none" | "skip"
  ) => {
    setHabitEntries((prev) => {
      // remove existing entries for that habit/date
      const pruned = prev.filter(
        (e) => !(e.habitId === habitId && e.date === date)
      );
      let updated = pruned;
      if (status !== "none") {
        const newEntry: HabitEntry = {
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          habitId,
          date,
          status,
        };
        updated = [...pruned, newEntry];
      }
      AsyncStorage.setItem("habitEntries", JSON.stringify(updated)).catch(
        (error) => console.error("Error saving habit entries:", error)
      );
      return updated;
    });
    updateHabitStreaks(habitId);
  };

  const formatISODate = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  // Auto-mark today's entry as success for active habits (no backfill)
  const autoMarkTodayForActiveHabits = async () => {
    try {
      const todayISO = formatISODate(new Date());
      for (const habit of habits) {
        if (!habit.isActive) continue;
        const existing = habitEntries.find(
          (e) => e.habitId === habit.id && e.date === todayISO
        );
        if (!existing) {
          await setHabitDayStatus(habit.id, todayISO, "success");
        }
      }
    } catch (e) {
      console.warn("autoMarkTodayForActiveHabits failed", e);
    }
  };

  // Run auto-mark on startup and whenever habits toggle active
  useEffect(() => {
    autoMarkTodayForActiveHabits();
  }, [habits]);

  const getCurrentStreak = (habitId: string): number => {
    const habit = habits.find((h) => h.id === habitId);
    if (!habit) return 0;

    const entries = habitEntries.filter((e) => e.habitId === habitId);
    const successByDate = new Set<string>();
    const skipByDate = new Set<string>();
    for (const e of entries) {
      if (e.status === "success") successByDate.add(e.date);
      if (e.status === "skip") skipByDate.add(e.date);
    }

    const toISO = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${dd}`;
    };

    const cursor = new Date();
    cursor.setHours(0, 0, 0, 0);
    while (true) {
      const iso = toISO(cursor);
      if (!skipByDate.has(iso)) break;
      cursor.setDate(cursor.getDate() - 1);
    }

    let streak = 0;
    while (true) {
      const iso = toISO(cursor);
      if (successByDate.has(iso)) {
        streak += 1;
        cursor.setDate(cursor.getDate() - 1);
        continue;
      }
      break;
    }

    return streak;
  };

  const getLongestStreak = (habitId: string): number => {
    const entries = habitEntries
      .filter(
        (entry) => entry.habitId === habitId && entry.status === "success"
      )
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let longestStreak = 0;
    let currentStreak = 0;
    let lastDate: Date | null = null;

    for (const entry of entries) {
      const entryDate = new Date(entry.date);
      entryDate.setHours(0, 0, 0, 0);

      if (lastDate) {
        const daysDiff = Math.floor(
          (entryDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysDiff === 1) {
          currentStreak++;
        } else {
          longestStreak = Math.max(longestStreak, currentStreak);
          currentStreak = 1;
        }
      } else {
        currentStreak = 1;
      }

      lastDate = entryDate;
    }

    return Math.max(longestStreak, currentStreak);
  };

  const getTotalDays = (habitId: string): number => {
    return habitEntries.filter(
      (entry) => entry.habitId === habitId && entry.status === "success"
    ).length;
  };

  const getHabitEntriesForDate = (
    habitId: string,
    date: string
  ): HabitEntry[] => {
    return habitEntries.filter(
      (entry) => entry.habitId === habitId && entry.date === date
    );
  };

  const updateHabitStreaks = (habitId: string) => {
    const currentStreak = getCurrentStreak(habitId);
    const longestStreak = getLongestStreak(habitId);
    const totalDays = getTotalDays(habitId);

    updateHabit(habitId, {
      currentStreak,
      longestStreak,
      totalDays,
    });
  };

  // Fasting functions
  const updateFastingSettings = async (settings: Partial<FastingSettings>) => {
    setFastingSettings((prev) => {
      const updated = { ...prev, ...settings };
      AsyncStorage.setItem("fastingSettings", JSON.stringify(updated)).catch(
        (error) => console.error("Error saving fasting settings:", error)
      );
      return updated;
    });
  };

  const updateStreakNotificationSettings = async (
    settings: Partial<StreakNotificationSettings>
  ) => {
    setStreakNotificationSettings((prev) => {
      const updated = { ...prev, ...settings };
      AsyncStorage.setItem(
        "streakNotificationSettings",
        JSON.stringify(updated)
      ).catch((error) =>
        console.error("Error saving streak notification settings:", error)
      );
      return updated;
    });
  };

  const startFastingSession = async () => {
    const newSession: FastingSession = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      startTime: new Date().toISOString(),
      duration: fastingSettings.fastingHours,
      completed: false,
    };

    setFastingSessions((prev) => {
      const updated = [...prev, newSession];
      AsyncStorage.setItem("fastingSessions", JSON.stringify(updated)).catch(
        (error) => console.error("Error saving fasting sessions:", error)
      );
      return updated;
    });

    try {
      await scheduleFastingNotifications(newSession);
    } catch (e) {
      console.warn("Failed to schedule fasting notifications:", e);
    }
  };

  const endFastingSession = async () => {
    const currentSession = getCurrentFastingSession();
    if (!currentSession) return;

    const endTime = new Date().toISOString();
    const duration =
      (new Date(endTime).getTime() -
        new Date(currentSession.startTime).getTime()) /
      (1000 * 60 * 60);

    setFastingSessions((prev) => {
      const updated = prev.map((session) =>
        session.id === currentSession.id
          ? { ...session, endTime, duration, completed: true }
          : session
      );
      AsyncStorage.setItem("fastingSessions", JSON.stringify(updated)).catch(
        (error) => console.error("Error saving fasting sessions:", error)
      );
      return updated;
    });

    try {
      await cancelFastingNotifications(currentSession.id);
    } catch (e) {
      console.warn("Failed to cancel fasting notifications:", e);
    }
  };

  const getCurrentFastingSession = (): FastingSession | null => {
    const activeSession = fastingSessions.find((session) => !session.completed);

    if (!activeSession && fastingSettings.isActive) {
      const now = new Date();
      const lastSession = fastingSessions
        .filter((s) => s.completed)
        .sort(
          (a, b) =>
            new Date(b.endTime || b.startTime).getTime() -
            new Date(a.endTime || a.startTime).getTime()
        )[0];

      if (lastSession) {
        const lastEndTime = new Date(
          lastSession.endTime || lastSession.startTime
        );
        const eatingWindowEnd = new Date(
          lastEndTime.getTime() +
            fastingSettings.eatingWindowHours * 60 * 60 * 1000
        );

        if (now >= eatingWindowEnd) {
          startFastingSession();
          return fastingSessions.find((session) => !session.completed) || null;
        }
      } else {
        startFastingSession();
        return fastingSessions.find((session) => !session.completed) || null;
      }
    }

    return activeSession || null;
  };

  const notificationStoreKey = "habitNotificationIds";
  const fastingNotificationStoreKey = "fastingNotificationIds";

  const getNotificationPermissions = async () => {
    try {
      const settings = await Notifications.getPermissionsAsync();
      return settings as {
        granted: boolean;
        canAskAgain?: boolean;
        status?: string;
      };
    } catch (e) {
      return { granted: false };
    }
  };

  const ensureNotificationsEnabled = async (
    interactive: boolean = true
  ): Promise<boolean> => {
    try {
      const settings = await Notifications.getPermissionsAsync();
      if (settings.granted) return true;

      if (interactive) {
        if (settings.canAskAgain) {
          const result = await Notifications.requestPermissionsAsync({
            ios: {
              allowAlert: true,
              allowBadge: true,
              allowSound: true,
              allowAnnouncements: true,
            },
            android: {
              allowAlert: true,
              allowBadge: true,
              allowSound: true,
              allowVibrate: true,
              allowShowWhenLocked: true,
              allowDisplayOnLockScreen: true,
            },
          });
          if (result.granted) return true;
        }
        Alert.alert(
          "Enable Notifications",
          "To get fasting and streak reminders, enable notifications in Settings.",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Open Settings",
              onPress: () => Linking.openSettings().catch(() => {}),
            },
          ]
        );
      }
      return false;
    } catch (e) {
      return false;
    }
  };

  const scheduleHabitNotification = async (habitId: string, days: number) => {
    const habit = habits.find((h) => h.id === habitId);
    if (!habit) return;
    const triggerDate = new Date(habit.startDate);
    triggerDate.setDate(triggerDate.getDate() + days);
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: `${habit.name}: ${days} day${days !== 1 ? "s" : ""} streak!`,
        body:
          habit.type === "alcohol"
            ? days >= 7
              ? "Your liver is starting to repair. Keep going!"
              : "Great progress!"
            : habit.type === "caffeine"
            ? "Better sleep and steady energy are on the way."
            : habit.type === "sugar"
            ? "Blood sugar stabilization benefits are building."
            : "You're building a new habit!",
        sound: null,
      },
      trigger: triggerDate,
    });
    await appendNotificationId(notificationStoreKey, habitId, id);
  };

  const scheduleDefaultHabitMilestones = async (habit: Habit) => {
    const milestones = [1, 3, 7, 14, 30, 90];
    for (const d of milestones) {
      const triggerDate = new Date(habit.startDate);
      triggerDate.setDate(triggerDate.getDate() + d);
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: `${habit.name}: ${d} day${d !== 1 ? "s" : ""} streak!`,
          body:
            habit.type === "alcohol"
              ? d >= 7
                ? "Your liver is starting to repair. Keep going!"
                : "Great progress!"
              : habit.type === "caffeine"
              ? "Better sleep and steady energy are on the way."
              : habit.type === "sugar"
              ? "Blood sugar stabilization benefits are building."
              : "You're building a new habit!",
          sound: null,
        },
        trigger: triggerDate,
      });
      await appendNotificationId(notificationStoreKey, habit.id, id);
    }
  };

  const cancelHabitNotification = async (habitId: string) => {
    const store = await readNotificationStore(notificationStoreKey);
    const ids: string[] = store[habitId] || [];
    for (const id of ids) {
      try {
        await Notifications.cancelScheduledNotificationAsync(id);
      } catch {}
    }
    delete store[habitId];
    await writeNotificationStore(notificationStoreKey, store);
  };

  const scheduleFastingNotifications = async (session: FastingSession) => {
    if (!fastingSettings.notifications) {
      return;
    }

    const start = new Date(session.startTime);
    const end = new Date(start.getTime() + session.duration * 60 * 60 * 1000);
    const now = new Date();

    const ids: string[] = [];

    if (fastingSettings.notifyBeforeStart) {
      const beforeStartMinutes = Math.max(5, Math.min(60, fastingSettings.notifyBeforeStartMinutes || 15));
      const beforeStart = new Date(start.getTime() - beforeStartMinutes * 60 * 1000);
      if (beforeStart.getTime() > now.getTime()) {
        const idBeforeStart = await Notifications.scheduleNotificationAsync({
          content: {
            title: "Fasting starting soon",
            body: `Your ${session.duration}h fast will start in ${beforeStartMinutes} minutes.`,
            sound: null,
          },
          trigger: beforeStart,
        });
        ids.push(idBeforeStart);
      }
    }

    if (fastingSettings.notifyAtStart && start.getTime() > now.getTime()) {
      const idStart = await Notifications.scheduleNotificationAsync({
        content: {
          title: "Fasting started",
          body: `Your ${session.duration}h fast is underway.`,
          sound: null,
        },
        trigger: start,
      });
      ids.push(idStart);
    }

    if (fastingSettings.notifyBeforeEnd) {
      const beforeEndMinutes = Math.max(1, Math.min(60, fastingSettings.notifyBeforeEndMinutes || 15));
      const preEnd = new Date(end.getTime() - beforeEndMinutes * 60 * 1000);
      if (preEnd.getTime() > now.getTime()) {
        const idPre = await Notifications.scheduleNotificationAsync({
          content: {
            title: "Fasting ending soon",
            body: `${beforeEndMinutes} minute${beforeEndMinutes !== 1 ? 's' : ''} remaining.`,
            sound: null,
          },
          trigger: preEnd,
        });
        ids.push(idPre);
      }
    }

    if (fastingSettings.notifyAtEnd && end.getTime() > now.getTime()) {
      const idEnd = await Notifications.scheduleNotificationAsync({
        content: { 
          title: "Fasting complete", 
          body: "Great job! Your fast is complete.", 
          sound: null 
        },
        trigger: end,
      });
      ids.push(idEnd);
    }

    await setFastingNotificationIds(session.id, ids);
  };

  const testFastingNotifications = async () => {
    try {
      const settings = await Notifications.getPermissionsAsync();
      console.log("Test fasting notifications - permissions:", settings);

      if (!settings.granted) {
        console.warn("Notifications not granted, requesting...");

        let result;

        if (Platform.OS === "android") {
          result = await Notifications.requestPermissionsAsync();
          console.log("Android basic request result:", result);

          if (!result.granted) {
            result = await Notifications.requestPermissionsAsync({
              android: {
                allowAlert: true,
                allowBadge: true,
                allowSound: true,
                allowVibrate: true,
                allowShowWhenLocked: true,
                allowDisplayOnLockScreen: true,
              },
            });
            console.log("Android detailed request result:", result);
          }
        } else {
          result = await Notifications.requestPermissionsAsync({
            ios: {
              allowAlert: true,
              allowBadge: true,
              allowSound: true,
              allowAnnouncements: true,
            },
          });
        }

        console.log("Final permission request result:", result);

        if (!result.granted) {
          console.error("Cannot test notifications - permissions denied");
          Alert.alert(
            "Notifications Required",
            "Please enable notifications manually:\n\n1. Go to Settings > Apps > LifeTrack3r\n2. Tap 'Notifications'\n3. Turn ON 'Allow notifications'\n4. Make sure all notification types are enabled",
            [
              { text: "Cancel", style: "cancel" },
              { text: "Open Settings", onPress: () => Linking.openSettings() },
            ]
          );
          return;
        }
      }

      try {
        await Notifications.cancelAllScheduledNotificationsAsync();
        console.log("Cleared previously scheduled notifications");
      } catch {}

      console.log("Scheduling test notification (10s)...");

      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: "[TEST] Notification",
          body: "This should pop up visibly in ~10 seconds",
          sound: true,
          priority: Notifications.AndroidNotificationPriority.MAX,
        },
        trigger: {
          seconds: 10,
        },
      });
      console.log("Scheduled high-importance notification:", id);
    } catch (e) {
      console.error("testFastingNotifications failed:", e);
    }
  };

  const testStreakNotifications = async (habitId: string) => {
    const habit = habits.find((h) => h.id === habitId);
    if (!habit) {
      console.error("Habit not found for ID:", habitId);
      return;
    }

    try {
      const settings = await Notifications.getPermissionsAsync();
      console.log("Test streak notifications - permissions:", settings);

      if (!settings.granted) {
        console.warn("Notifications not granted, requesting...");
        const result = await Notifications.requestPermissionsAsync();
        if (!result.granted) {
          console.error("Cannot test notifications - permissions denied");
          return;
        }
      }

      try {
        await Notifications.cancelAllScheduledNotificationsAsync();
        console.log("Cleared previously scheduled notifications");
      } catch {}

      console.log(
        `Scheduling delayed streak test notifications for ${habit.name}...`
      );

      const id1 = await Notifications.scheduleNotificationAsync({
        content: {
          title: `[TEST] ${habit.name}: 1 day streak`,
          body: "Simulated",
          sound: true,
          priority: Notifications.AndroidNotificationPriority.MAX,
        },
        trigger: {
          seconds: 10,
          channelId: Platform.OS === "android" ? "high" : undefined,
        },
      });
      console.log("Scheduled streak notification 1:", id1);

      const id2 = await Notifications.scheduleNotificationAsync({
        content: {
          title: `[TEST] ${habit.name}: 7 days streak`,
          body: "Simulated",
          sound: true,
          priority: Notifications.AndroidNotificationPriority.MAX,
        },
        trigger: {
          seconds: 20,
          channelId: Platform.OS === "android" ? "high" : undefined,
        },
      });
      console.log("Scheduled streak notification 2:", id2);

      const id3 = await Notifications.scheduleNotificationAsync({
        content: {
          title: `[TEST] ${habit.name}: 30 days streak`,
          body: "Simulated",
          sound: true,
          priority: Notifications.AndroidNotificationPriority.MAX,
        },
        trigger: {
          seconds: 30,
          channelId: Platform.OS === "android" ? "high" : undefined,
        },
      });
      console.log("Scheduled streak notification 3:", id3);

      console.log("All delayed streak notifications scheduled successfully!");
    } catch (e) {
      console.error("testStreakNotifications failed:", e);
    }
  };

  const cancelFastingNotifications = async (sessionId: string) => {
    const map = await readNotificationStore(fastingNotificationStoreKey);
    const ids: string[] = map[sessionId] || [];
    for (const id of ids) {
      try {
        await Notifications.cancelScheduledNotificationAsync(id);
      } catch {}
    }
    delete map[sessionId];
    await writeNotificationStore(fastingNotificationStoreKey, map);
  };

  type IdMap = { [key: string]: string[] };
  const readNotificationStore = async (key: string): Promise<IdMap> => {
    try {
      const raw = await AsyncStorage.getItem(key);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  };
  const writeNotificationStore = async (key: string, map: IdMap) => {
    await AsyncStorage.setItem(key, JSON.stringify(map));
  };
  const appendNotificationId = async (
    key: string,
    entityId: string,
    id: string
  ) => {
    const map = await readNotificationStore(key);
    const list = map[entityId] || [];
    list.push(id);
    map[entityId] = list;
    await writeNotificationStore(key, map);
  };
  const setFastingNotificationIds = async (
    sessionId: string,
    ids: string[]
  ) => {
    const map = await readNotificationStore(fastingNotificationStoreKey);
    map[sessionId] = ids;
    await writeNotificationStore(fastingNotificationStoreKey, map);
  };

  const addSupplementReminder = async (
    reminderData: Omit<SupplementReminder, "id">
  ) => {
    const newReminder: SupplementReminder = {
      ...reminderData,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };

    const updatedReminders = [...supplementReminders, newReminder];
    setSupplementReminders(updatedReminders);
    await AsyncStorage.setItem(
      "supplementReminders",
      JSON.stringify(updatedReminders)
    );

    if (newReminder.isActive) {
      await scheduleSupplementNotification(newReminder);
    }
  };

  const updateSupplementReminder = async (reminder: SupplementReminder) => {
    const oldReminder = supplementReminders.find((r) => r.id === reminder.id);
    const updatedReminders = supplementReminders.map((r) =>
      r.id === reminder.id ? reminder : r
    );
    setSupplementReminders(updatedReminders);
    await AsyncStorage.setItem(
      "supplementReminders",
      JSON.stringify(updatedReminders)
    );

    if (oldReminder?.isActive && !reminder.isActive) {
      await cancelSupplementNotification(reminder.id);
    } else if (!oldReminder?.isActive && reminder.isActive) {
      await scheduleSupplementNotification(reminder);
    } else if (reminder.isActive && oldReminder?.time !== reminder.time) {
      await cancelSupplementNotification(reminder.id);
      await scheduleSupplementNotification(reminder);
    }
  };

  const deleteSupplementReminder = async (id: string) => {
    await cancelSupplementNotification(id);

    const updatedReminders = supplementReminders.filter((r) => r.id !== id);
    setSupplementReminders(updatedReminders);
    await AsyncStorage.setItem(
      "supplementReminders",
      JSON.stringify(updatedReminders)
    );
  };

  const scheduleSupplementNotification = async (
    reminder: SupplementReminder
  ) => {
    try {
      if (!reminder.isActive) return;

      const [hours, minutes] = reminder.time.split(":").map(Number);
      const now = new Date();
      const scheduledTime = new Date();
      scheduledTime.setHours(hours, minutes, 0, 0);

      if (scheduledTime <= now) {
        scheduledTime.setDate(scheduledTime.getDate() + 1);
      }

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: "💊 Supplement Reminder",
          body: `Time to take your ${reminder.name}!`,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: scheduledTime,
      });

      await appendNotificationId(
        "supplementNotifications",
        reminder.id,
        notificationId
      );
    } catch (error) {
      console.error("Error scheduling supplement notification:", error);
    }
  };

  const cancelSupplementNotification = async (reminderId: string) => {
    try {
      const map = await readNotificationStore("supplementNotifications");
      const notificationIds = map[reminderId] || [];

      for (const id of notificationIds) {
        await Notifications.cancelScheduledNotificationAsync(id);
      }

      // Clear the stored IDs
      delete map[reminderId];
      await writeNotificationStore("supplementNotifications", map);
    } catch (error) {
      console.error("Error canceling supplement notification:", error);
    }
  };

  const addTodo = async (todoData: Omit<Todo, "id">) => {
    const newTodo: Todo = {
      ...todoData,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };

    const updatedTodos = [...todos, newTodo];
    setTodos(updatedTodos);
    await AsyncStorage.setItem("todos", JSON.stringify(updatedTodos));
  };

  const updateTodo = async (todo: Todo) => {
    const updatedTodos = todos.map((t) => (t.id === todo.id ? todo : t));
    setTodos(updatedTodos);
    await AsyncStorage.setItem("todos", JSON.stringify(updatedTodos));
  };

  const deleteTodo = async (id: string) => {
    const updatedTodos = todos.filter((t) => t.id !== id);
    setTodos(updatedTodos);
    await AsyncStorage.setItem("todos", JSON.stringify(updatedTodos));
  };

  const value: HabitContextType = {
    habits,
    habitEntries,
    addHabit,
    updateHabit,
    deleteHabit,
    addHabitEntry,
    updateHabitEntry,
    setHabitDayStatus,
    getCurrentStreak,
    getLongestStreak,
    getTotalDays,
    getHabitEntriesForDate,
    fastingSettings,
    fastingSessions,
    updateFastingSettings,
    startFastingSession,
    endFastingSession,
    getCurrentFastingSession,
    streakNotificationSettings,
    updateStreakNotificationSettings,
    scheduleHabitNotification,
    cancelHabitNotification,
    testFastingNotifications,
    testStreakNotifications,
    ensureNotificationsEnabled,
    getNotificationPermissions,
    supplementReminders,
    addSupplementReminder,
    updateSupplementReminder,
    deleteSupplementReminder,
    scheduleSupplementNotification,
    cancelSupplementNotification,
    todos,
    addTodo,
    updateTodo,
    deleteTodo,
  };

  return (
    <HabitContext.Provider value={value}>{children}</HabitContext.Provider>
  );
};

export const useHabits = () => {
  const context = useContext(HabitContext);
  if (context === undefined) {
    throw new Error("useHabits must be used within a HabitProvider");
  }
  return context;
};
