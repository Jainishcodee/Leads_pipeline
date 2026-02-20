import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";
import { App } from "@capacitor/app";
import { Preferences } from "@capacitor/preferences";
import { PushNotifications } from "@capacitor/push-notifications";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import { LocalNotifications } from "@capacitor/local-notifications";

/**
 * Initialize all Capacitor plugins
 * Should be called once when the app starts
 */
export async function initializeCapacitor() {
  if (!Capacitor.isNativePlatform()) {
    console.log("Running on web - Capacitor plugins not available");
    return;
  }

  try {
    applyNativeAppInsets();

    // Initialize Status Bar
    await initializeStatusBar();

    // Initialize Back Button Handler
    initializeBackButton();

    // Initialize Push Notifications
    await initializePushNotifications();

    // Initialize Preferences
    await initializePreferences();

    console.log("✓ All Capacitor plugins initialized successfully");
  } catch (error) {
    console.error("Error initializing Capacitor plugins:", error);
  }
}

function applyNativeAppInsets() {
  const root = document.documentElement;
  const body = document.body;

  root.classList.add('native-app');
  body.classList.add('native-app');

  const isAndroid = Capacitor.getPlatform() === 'android';
  const topFallback = isAndroid ? 28 : 0;
  const bottomFallback = isAndroid ? 16 : 0;

  root.style.setProperty('--app-safe-top', `max(env(safe-area-inset-top, 0px), ${topFallback}px)`);
  root.style.setProperty('--app-safe-bottom', `max(env(safe-area-inset-bottom, 0px), ${bottomFallback}px)`);
}

/**
 * Configure Status Bar for Android
 * Sets proper styling and overlay behavior
 */
async function initializeStatusBar() {
  try {
    // Don't overlay the web content under the status bar
    await StatusBar.setOverlaysWebView({ overlay: false });

    // Set status bar style to dark text on light background
    await StatusBar.setStyle({ style: Style.Dark });

    // Set status bar background color (Android only)
    if (Capacitor.getPlatform() === "android") {
      await StatusBar.setBackgroundColor({ color: "#ffffff" });
    }

    console.log("✓ Status Bar initialized");
  } catch (error) {
    console.error("Error initializing Status Bar:", error);
  }
}

/**
 * Configure Hardware Back Button Handler for Android
 * Allows proper navigation instead of exiting the app
 */
function initializeBackButton() {
  try {
    // Listen for hardware back button presses on Android
    App.addListener("backButton", ({ canGoBack }) => {
      if (canGoBack) {
        // If there's history to go back to, use normal browser back
        window.history.back();
      } else {
        // If no history, minimize app instead of exiting
        // This prevents the app from exiting on the first screen
        App.minimizeApp();
      }
    });

    console.log("✓ Hardware Back Button initialized");
  } catch (error) {
    console.error("Error initializing Back Button:", error);
  }
}


/**
 * Configure Push Notifications
 */
async function initializePushNotifications() {
  try {
    // Check if on native platform first
    if (!Capacitor.isNativePlatform()) {
      console.log("ⓘ Push Notifications skipped - not on native platform");
      return;
    }

    // Avoid crashing if Firebase is not configured in the native app
    const pushEnabled = import.meta.env.VITE_ENABLE_PUSH_NOTIFICATIONS === "true";
    if (!pushEnabled) {
      console.log("ⓘ Push Notifications disabled (VITE_ENABLE_PUSH_NOTIFICATIONS)");
      return;
    }

    // Add a small delay to ensure Firebase is initialized
    await new Promise(resolve => setTimeout(resolve, 500));

    // Request notification permissions
    let permission;
    try {
      permission = await PushNotifications.requestPermissions();
    } catch (permissionError) {
      console.warn("Push notification permissions request failed:", permissionError);
      // Continue even if permissions request fails
      return;
    }

    if (permission.receive === "granted") {
      try {
        // Register for push notifications
        await PushNotifications.register();

        // Handle incoming notifications when app is running
        PushNotifications.addListener("pushNotificationReceived", (notification) => {
          console.log("Push notification received:", notification);
          // You can dispatch events or update app state here
        });

        // Handle notification clicks
        PushNotifications.addListener("pushNotificationActionPerformed", (notification) => {
          console.log("Push notification action performed:", notification);
          // Handle notification action
        });

        console.log("✓ Push Notifications initialized");
      } catch (registerError: any) {
        // Firebase might not be initialized yet - this is expected on first run
        if (registerError?.message?.includes("FirebaseApp")) {
          console.warn("ⓘ Firebase not yet initialized - Push notifications will retry later");
        } else {
          console.error("Push notification registration failed:", registerError);
        }
      }
    } else {
      console.warn("Push notification permissions not granted");
    }
  } catch (error) {
    console.error("Error initializing Push Notifications:", error);
    // Don't crash the app if push notifications fail to initialize
  }
}

/**
 * Initialize Preferences (local storage for app data)
 */
async function initializePreferences() {
  try {
    // Check if app has preferences already set
    const hasInitialized = await Preferences.get({ key: "app_initialized" });

    if (!hasInitialized.value) {
      // Set initial preferences
      await Preferences.set({ key: "app_initialized", value: "true" });
      await Preferences.set({ key: "app_version", value: "1.0.0" });

      console.log("✓ Preferences initialized");
    }
  } catch (error) {
    console.error("Error initializing Preferences:", error);
  }
}

/**
 * Camera utilities - Use for taking photos
 */
export async function takeCameraPhoto() {
  try {
    const image = await Camera.getPhoto({
      quality: 90,
      allowEditing: true,
      resultType: CameraResultType.Uri,
      source: CameraSource.Camera,
    });

    return image.webPath;
  } catch (error) {
    console.error("Error taking photo:", error);
    return null;
  }
}

/**
 * Camera utilities - Use for selecting from photo library
 */
export async function selectPhotoFromLibrary() {
  try {
    const image = await Camera.getPhoto({
      quality: 90,
      allowEditing: false,
      resultType: CameraResultType.Uri,
      source: CameraSource.Photos,
    });

    return image.webPath;
  } catch (error) {
    console.error("Error selecting photo:", error);
    return null;
  }
}

/**
 * Preferences utilities - Save user preferences
 */
export async function savePreference(key: string, value: string) {
  try {
    await Preferences.set({ key, value });
  } catch (error) {
    console.error("Error saving preference:", error);
  }
}

/**
 * Preferences utilities - Get user preference
 */
export async function getPreference(key: string) {
  try {
    const result = await Preferences.get({ key });
    return result.value;
  } catch (error) {
    console.error("Error getting preference:", error);
    return null;
  }
}

/**
 * Preferences utilities - Remove preference
 */
export async function removePreference(key: string) {
  try {
    await Preferences.remove({ key });
  } catch (error) {
    console.error("Error removing preference:", error);
  }
}

/**
 * Push Notifications utilities - Send a local notification
 */
export async function sendLocalNotification(
  title: string,
  body: string,
  id: number = 1
) {
  try {
    await LocalNotifications.schedule({
      notifications: [
        {
          title,
          body,
          id,
          extra: {
            data: "extra data goes here",
          },
        },
      ],
    });
  } catch (error) {
    console.error("Error sending local notification:", error);
  }
}
