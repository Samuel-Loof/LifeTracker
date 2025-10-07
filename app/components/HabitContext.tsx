import React, { createContext, useContext, useState, useEffect } from "react";
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
  customName?: string; // For custom habits
  startDate: string; // ISO date string
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
  date: string; // ISO date string
  status: "success" | "failure" | "skip";
  notes?: string;
}

export interface FastingSettings {
  fastingHours: number;
  eatingWindowHours: number;
  startTime: string; // HH:MM format
  isActive: boolean;
  notifications: boolean;
}

export interface FastingSession {
  id: string;
  startTime: string; // ISO datetime
  endTime?: string; // ISO datetime
  duration: number; // in hours
  completed: boolean;
  notes?: string;
}

export interface HabitContextType {
  // Habits
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

  // Fasting
  fastingSettings: FastingSettings;
  fastingSessions: FastingSession[];
  updateFastingSettings: (settings: Partial<FastingSettings>) => Promise<void>;
  startFastingSession: () => Promise<void>;
  endFastingSession: () => Promise<void>;
  getCurrentFastingSession: () => FastingSession | null;

  // Notifications
  scheduleHabitNotification: (habitId: string, days: number) => Promise<void>;
  cancelHabitNotification: (habitId: string) => Promise<void>;
}

// Create context
const HabitContext = createContext<HabitContextType | undefined>(undefined);

// Provider component
export const HabitProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // State
  const [habits, setHabits] = useState<Habit[]>([]);
  const [habitEntries, setHabitEntries] = useState<HabitEntry[]>([]);
  const [fastingSettings, setFastingSettings] = useState<FastingSettings>({
    fastingHours: 16,
    eatingWindowHours: 8,
    startTime: "20:00",
    isActive: false,
    notifications: true,
  });
  const [fastingSessions, setFastingSessions] = useState<FastingSession[]>([]);

  // Load data from AsyncStorage on mount
  useEffect(() => {
    loadData();
  }, []);

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
        const settings = await Notifications.getPermissionsAsync();
        if (!settings.granted) {
          await Notifications.requestPermissionsAsync();
        }
      } catch (e) {
        console.warn("Notification setup failed:", e);
      }
    })();
  }, []);

  const loadData = async () => {
    try {
      const [habitsData, entriesData, fastingData, sessionsData] =
        await Promise.all([
          AsyncStorage.getItem("habits"),
          AsyncStorage.getItem("habitEntries"),
          AsyncStorage.getItem("fastingSettings"),
          AsyncStorage.getItem("fastingSessions"),
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
        setFastingSettings(JSON.parse(fastingData));
      }
      if (sessionsData) {
        setFastingSessions(JSON.parse(sessionsData));
      }
    } catch (error) {
      console.error("Error loading habit data:", error);
    }
  };

  // Habit management functions
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

    // schedule default milestone notifications
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

    // if startDate changed, reschedule milestones
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

    // Also delete related entries
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

    // Update habit streaks
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
    // Update streaks after change
    updateHabitStreaks(habitId);
  };

  // Streak calculation functions
  const getCurrentStreak = (habitId: string): number => {
    const habit = habits.find((h) => h.id === habitId);
    if (!habit) return 0;

    const entries = habitEntries
      .filter((entry) => entry.habitId === habitId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < entries.length; i++) {
      const entryDate = new Date(entries[i].date);
      entryDate.setHours(0, 0, 0, 0);

      const expectedDate = new Date(today);
      expectedDate.setDate(today.getDate() - i);

      if (
        entryDate.getTime() === expectedDate.getTime() &&
        entries[i].status === "success"
      ) {
        streak++;
      } else {
        break;
      }
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

    // schedule fasting notifications: start, 15m before end, end
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
    return fastingSessions.find((session) => !session.completed) || null;
  };

  // Notification helpers
  const notificationStoreKey = "habitNotificationIds";
  const fastingNotificationStoreKey = "fastingNotificationIds"; // sessionId -> ids

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
    const start = new Date(session.startTime);
    const end = new Date(start.getTime() + session.duration * 60 * 60 * 1000);
    const preEnd = new Date(end.getTime() - 15 * 60 * 1000);

    const ids: string[] = [];
    const idStart = await Notifications.scheduleNotificationAsync({
      content: {
        title: "Fasting started",
        body: `Your ${session.duration}h fast is underway.`,
        sound: null,
      },
      trigger: start,
    });
    ids.push(idStart);
    if (preEnd.getTime() > Date.now()) {
      const idPre = await Notifications.scheduleNotificationAsync({
        content: {
          title: "Fasting ending soon",
          body: "15 minutes remaining.",
          sound: null,
        },
        trigger: preEnd,
      });
      ids.push(idPre);
    }
    if (end.getTime() > Date.now()) {
      const idEnd = await Notifications.scheduleNotificationAsync({
        content: { title: "Fasting complete", body: "Great job!", sound: null },
        trigger: end,
      });
      ids.push(idEnd);
    }
    await setFastingNotificationIds(session.id, ids);
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

  // Notification store helpers
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
    scheduleHabitNotification,
    cancelHabitNotification,
  };

  return (
    <HabitContext.Provider value={value}>{children}</HabitContext.Provider>
  );
};

// Hook to use the context
export const useHabits = () => {
  const context = useContext(HabitContext);
  if (context === undefined) {
    throw new Error("useHabits must be used within a HabitProvider");
  }
  return context;
};
