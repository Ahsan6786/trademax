/**
 * TRADEMAX PWA Web Push Notification Utility
 * Handles VAPID key conversion, permission requests, subscription lifecycle,
 * and preference sync with the backend.
 */

// Convert a base64 string to a Uint8Array for applicationServerKey
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Check if the current browser/device supports Web Push
 */
export function isPushNotificationSupported() {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/**
 * Get current browser notification permission
 */
export function getNotificationPermission() {
  if (!isPushNotificationSupported()) return 'unsupported';
  return Notification.permission; // 'default' | 'granted' | 'denied'
}

/**
 * Get active subscription details and registration status
 */
export async function getSubscriptionStatus() {
  if (!isPushNotificationSupported()) {
    return { supported: false, permission: 'unsupported', isSubscribed: false };
  }

  const permission = Notification.permission;
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return {
      supported: true,
      permission,
      isSubscribed: Boolean(subscription),
      subscription
    };
  } catch (err) {
    console.warn('Failed to get push subscription status:', err);
    return {
      supported: true,
      permission,
      isSubscribed: false,
      subscription: null
    };
  }
}

/**
 * Request notification permission and subscribe to PushManager
 * Call this ONLY in direct response to user interaction (e.g. clicking "Enable Notifications")
 */
export async function subscribeToPush(token = null, preferences = {}) {
  if (!isPushNotificationSupported()) {
    return {
      success: false,
      error: 'Web Push notifications are not supported by this browser or device.'
    };
  }

  try {
    // 1. Request native browser permission
    const permissionResult = await Notification.requestPermission();
    if (permissionResult !== 'granted') {
      return {
        success: false,
        denied: permissionResult === 'denied',
        error: 'Notification permission was not granted.'
      };
    }

    // 2. Fetch server public VAPID key
    const vapidRes = await fetch('/api/push/vapid-key');
    const vapidData = await vapidRes.json();
    if (!vapidData.success || !vapidData.publicKey) {
      throw new Error(vapidData.error || 'Failed to retrieve push service credentials.');
    }

    // 3. Ensure service worker is registered and ready, then subscribe
    let existingReg = await navigator.serviceWorker.getRegistration();
    if (!existingReg) {
      await navigator.serviceWorker.register('/sw.js');
    }
    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();

    // If subscription doesn't exist, create it
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey
      });
    }

    // 4. Send subscription to TradeMax backend
    const authToken = token || localStorage.getItem('tm_token');
    const headers = {
      'Content-Type': 'application/json'
    };
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const subJson = subscription.toJSON();
    const saveRes = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        subscription: subJson,
        preferences: {
          notify_motivation: true,
          notify_courses: true,
          notify_live_classes: true,
          notify_announcements: true,
          ...preferences
        }
      })
    });

    const saveData = await saveRes.json();
    if (!saveData.success) {
      throw new Error(saveData.error || 'Failed to register subscription on the server.');
    }

    localStorage.setItem('tm_push_enabled', 'true');
    return { success: true, subscription: subJson };
  } catch (error) {
    console.error('Push subscription failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Unsubscribe from Web Push notifications
 */
export async function unsubscribeFromPush(token = null) {
  if (!isPushNotificationSupported()) return { success: false };

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      const endpoint = subscription.endpoint;
      await subscription.unsubscribe();

      // Notify backend
      await fetch('/api/push/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint })
      });
    }

    localStorage.removeItem('tm_push_enabled');
    return { success: true };
  } catch (err) {
    console.error('Failed to unsubscribe from push:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Fetch user notification preferences
 */
export async function fetchNotificationPreferences(token = null) {
  const authToken = token || localStorage.getItem('tm_token');
  const headers = {};
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

  try {
    const res = await fetch('/api/push/preferences', { headers });
    const data = await res.json();
    if (data.success) {
      return data.preferences;
    }
  } catch (err) {
    console.warn('Failed to fetch preferences:', err);
  }
  return {
    notify_motivation: true,
    notify_courses: true,
    notify_live_classes: true,
    notify_announcements: true
  };
}

/**
 * Save user notification preferences
 */
export async function saveNotificationPreferences(preferences, token = null) {
  const authToken = token || localStorage.getItem('tm_token');
  const headers = { 'Content-Type': 'application/json' };
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    const endpoint = subscription ? subscription.endpoint : null;

    const res = await fetch('/api/push/preferences', {
      method: 'PUT',
      headers,
      body: JSON.stringify({ endpoint, preferences })
    });
    return await res.json();
  } catch (err) {
    console.error('Failed to save preferences:', err);
    return { success: false, error: err.message };
  }
}
