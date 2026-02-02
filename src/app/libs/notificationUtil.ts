import EnvConfig from "../environments/envConfig";
import { getVapidPublicKeyService, subscribeUser, unsubscribeUser } from "../services/notification";

// types/notification.ts
export interface PushSubscription {
  endpoint: string;
  keys: {
    auth: string;
    p256dh: string;
  };
}

export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: any;
}
const env = new EnvConfig()
const API_BASE_URL = env.front_api;

export const isPushNotificationSupported = (): boolean => {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
};

export const getNotificationPermission = (): NotificationPermission => {
  return Notification.permission;
};

export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if (!isPushNotificationSupported()) {
    throw new Error('Push notifications are not supported');
  }
  
  return await Notification.requestPermission();
};

const urlB64ToUint8Array = (base64String: string): Uint8Array => {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

export const getVapidPublicKey = async (): Promise<string> => {
  try {
    const response = await getVapidPublicKeyService();
    if (!response.ok) {
      throw new Error('Failed to fetch VAPID public key');
    }
    const data = await response.json();
    return data.publicKey;
  } catch (error) {
    console.error('Error getting VAPID public key:', error);
    throw error;
  }
};

export const registerServiceWorker = async (): Promise<ServiceWorkerRegistration> => {
  if (!('serviceWorker' in navigator)) {
    throw new Error('Service workers are not supported');
  }

  try {
    const registration = await navigator.serviceWorker.register('./sw.js');
    console.log(registration);
    return registration;
  } catch (error) {
    console.error('Service Worker registration failed:', error);
    throw error;
  }
};

export const isUserSubscribed = async (): Promise<boolean> => {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    return subscription !== null;
  } catch (error) {
    console.error('Error checking subscription status:', error);
    return false;
  }
};

export const getCurrentSubscription = async (): Promise<PushSubscription | null> => {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    if (!subscription) return null;
    
    return {
      endpoint: subscription.endpoint,
      keys: {
        auth: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('auth')!))),
        p256dh: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('p256dh')!)))
      }
    };
  } catch (error) {
    console.error('Error getting subscription:', error);
    return null;
  }
};

export const subscribeUserToPush = async (): Promise<PushSubscription> => {
  // Check permission first
  let permission = getNotificationPermission();
  if (permission === 'default') {
    console.log("1")
    permission = await requestNotificationPermission();
  }
  
  if (permission !== 'granted') {
    console.log("2")
    throw new Error('Notification permission denied');
  }
  
  // Get VAPID public key
  const vapidPublicKey = await getVapidPublicKey();
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlB64ToUint8Array(vapidPublicKey),
    });

    const subscriptionData: PushSubscription = {
      endpoint: subscription.endpoint,
      keys: {
        auth: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('auth')!))),
        p256dh: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('p256dh')!)))
      }
    };

    const response = await subscribeUser(subscriptionData)

    if (!response.ok) {
      throw new Error('Failed to save subscription on server');
    }

    console.log('User subscribed to push notifications');
    return subscriptionData;
  } catch (error) {
    console.error('Failed to subscribe user:', error);
    throw error;
  }
};

export const unsubscribeUserFromPush = async (): Promise<void> => {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      const subscriptionData = {
        endpoint: subscription.endpoint,
      };

      // Unsubscribe from browser
      await subscription.unsubscribe();

      // Remove from server
      await unsubscribeUser(subscriptionData)

      console.log('User unsubscribed from push notifications');
    }
  } catch (error) {
    console.error('Failed to unsubscribe user:', error);
    throw error;
  }
};

export const sendTestNotification = async (payload: NotificationPayload): Promise<void> => {
  try {
    const response = await fetch(`${API_BASE_URL}/send-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to send notification');
    }

    console.log('Test notification sent');
  } catch (error) {
    console.error('Failed to send notification:', error);
    throw error;
  }
};

export const initializeNotifications = async (): Promise<void> => {
  if (!isPushNotificationSupported()) {
    console.warn('Push notifications are not supported in this browser');
    return;
  }

  try {
    await registerServiceWorker();
    console.log('Notifications initialized');
  } catch (error) {
    console.error('Failed to initialize notifications:', error);
  }
};

export const shouldPromptForNotifications = async (): Promise<boolean> => {
  if (!isPushNotificationSupported()) return false;
  
  const permission = getNotificationPermission();
  const isSubscribed = await isUserSubscribed();
  
  return permission === 'default' && !isSubscribed;
};