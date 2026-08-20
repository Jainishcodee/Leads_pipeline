import { useCallback } from "react";
import {
  takeCameraPhoto,
  selectPhotoFromLibrary,
  savePreference,
  getPreference,
  removePreference,
  sendLocalNotification,
} from "@/lib/capacitor";

/**
 * Custom hook for using Capacitor Camera features
 */
export function useCapacitorCamera() {
  const takePhoto = useCallback(async () => {
    return await takeCameraPhoto();
  }, []);

  const selectPhoto = useCallback(async () => {
    return await selectPhotoFromLibrary();
  }, []);

  return {
    takePhoto,
    selectPhoto,
  };
}

/**
 * Custom hook for using Capacitor Preferences
 */
export function useCapacitorPreferences() {
  const setPreference = useCallback(async (key: string, value: string) => {
    return await savePreference(key, value);
  }, []);

  const getStoredPreference = useCallback(async (key: string) => {
    return await getPreference(key);
  }, []);

  const deletePreference = useCallback(async (key: string) => {
    return await removePreference(key);
  }, []);

  return {
    setPreference,
    getStoredPreference,
    deletePreference,
  };
}

/**
 * Custom hook for using Capacitor Push Notifications
 */
export function useCapacitorNotifications() {
  const sendNotification = useCallback(
    async (title: string, body: string, id?: number) => {
      return await sendLocalNotification(title, body, id);
    },
    []
  );

  return {
    sendNotification,
  };
}

/**
 * Combined hook for all Capacitor features
 */
export function useCapacitor() {
  const camera = useCapacitorCamera();
  const preferences = useCapacitorPreferences();
  const notifications = useCapacitorNotifications();

  return {
    camera,
    preferences,
    notifications,
  };
}
