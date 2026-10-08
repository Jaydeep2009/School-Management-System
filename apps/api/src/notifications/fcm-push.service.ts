/**
 * FCM Push Notification Service
 * 
 * Unified push notification service using Firebase Cloud Messaging
 * Works for both web and mobile (Flutter) apps
 */

/**
 * FCM Message payload
 */
interface FCMMessage {
  token?: string;           // Single device
  tokens?: string[];        // Multiple devices (up to 500)
  topic?: string;           // Topic subscription
  notification: {
    title: string;
    body: string;
    image?: string;
  };
  data?: Record<string, string>;  // Custom data
  webpush?: {
    fcm_options?: {
      link?: string;        // URL to open when clicked
    };
    notification?: {
      icon?: string;
      badge?: string;
      click_action?: string;
    };
  };
  android?: {
    priority?: 'high' | 'normal';
    notification?: {
      sound?: string;
      click_action?: string;
    };
  };
  apns?: {
    payload?: {
      aps?: {
        sound?: string;
        badge?: number;
      };
    };
  };
}

/**
 * FCM API Response
 */
interface FCMResponse {
  name?: string;              // Success: Message ID
  error?: {
    code: number;
    message: string;
    status: string;
  };
}

/**
 * FCM Batch Response
 */
interface FCMBatchResponse {
  responses: Array<{
    success: boolean;
    messageId?: string;
    error?: {
      code: string;
      message: string;
    };
  }>;
  successCount: number;
  failureCount: number;
}

/**
 * Get OAuth 2.0 access token for FCM
 * Uses service account from environment variable
 */
async function getFCMAccessToken(env: any): Promise<string> {
  // Service account JSON should be stored in environment variable
  const serviceAccount = JSON.parse(env.FCM_SERVICE_ACCOUNT);
  
  const now = Math.floor(Date.now() / 1000);
  const expiry = now + 3600; // 1 hour

  // Create JWT header
  const header = {
    alg: 'RS256',
    typ: 'JWT',
  };

  // Create JWT payload
  const payload = {
    iss: serviceAccount.client_email,
    sub: serviceAccount.client_email,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: expiry,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
  };

  // Sign JWT (simplified - in production use proper crypto library)
  // For Cloudflare Workers, use Web Crypto API
  const token = await signJWT(header, payload, serviceAccount.private_key);

  // Exchange JWT for access token
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: token,
    }),
  });

  const data = await response.json() as any;
  return data.access_token;
}

/**
 * Sign JWT using RS256 (simplified)
 * In production, use a proper library or Cloudflare's crypto primitives
 */
async function signJWT(header: any, payload: any, privateKey: string): Promise<string> {
  // This is a placeholder - proper implementation requires:
  // 1. Import private key using crypto.subtle.importKey
  // 2. Sign using crypto.subtle.sign with RS256
  // 3. Base64url encode the result
  
  // For now, return a placeholder
  // You'll need to implement proper RS256 signing or use a library
  throw new Error('JWT signing not implemented - use a library like jose or @tsndr/cloudflare-worker-jwt');
}

/**
 * Send push notification to a single device
 */
export async function sendFCMNotification(
  env: any,
  fcmToken: string,
  notification: {
    title: string;
    body: string;
    data?: Record<string, string>;
    imageUrl?: string;
    clickUrl?: string;
  }
): Promise<boolean> {
  try {
    const accessToken = await getFCMAccessToken(env);
    const projectId = JSON.parse(env.FCM_SERVICE_ACCOUNT).project_id;

    const message: FCMMessage = {
      token: fcmToken,
      notification: {
        title: notification.title,
        body: notification.body,
        image: notification.imageUrl,
      },
      data: notification.data,
      webpush: {
        fcm_options: {
          link: notification.clickUrl,
        },
        notification: {
          icon: '/icon-192.png',
          badge: '/badge-72.png',
        },
      },
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
          },
        },
      },
    };

    const response = await fetch(
      `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message }),
      }
    );

    if (!response.ok) {
      const error = await response.json() as FCMResponse;
      console.error('FCM Error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Failed to send FCM notification:', error);
    return false;
  }
}

/**
 * Send push notifications to multiple devices (batch)
 * FCM allows up to 500 tokens per request
 */
export async function sendFCMNotificationBatch(
  env: any,
  fcmTokens: string[],
  notification: {
    title: string;
    body: string;
    data?: Record<string, string>;
    imageUrl?: string;
    clickUrl?: string;
  }
): Promise<{ success: number; failed: number }> {
  // Split into batches of 500
  const BATCH_SIZE = 500;
  const batches = [];
  
  for (let i = 0; i < fcmTokens.length; i += BATCH_SIZE) {
    batches.push(fcmTokens.slice(i, i + BATCH_SIZE));
  }

  let totalSuccess = 0;
  let totalFailed = 0;

  for (const batch of batches) {
    try {
      const accessToken = await getFCMAccessToken(env);
      const projectId = JSON.parse(env.FCM_SERVICE_ACCOUNT).project_id;

      // Send to each token in batch
      const promises = batch.map(token =>
        sendFCMNotification(env, token, notification)
      );

      const results = await Promise.allSettled(promises);
      
      results.forEach(result => {
        if (result.status === 'fulfilled' && result.value) {
          totalSuccess++;
        } else {
          totalFailed++;
        }
      });
    } catch (error) {
      console.error('Batch send failed:', error);
      totalFailed += batch.length;
    }
  }

  return { success: totalSuccess, failed: totalFailed };
}

/**
 * Send notification to a topic (e.g., 'teachers', 'students', 'all')
 */
export async function sendFCMTopicNotification(
  env: any,
  topic: string,
  notification: {
    title: string;
    body: string;
    data?: Record<string, string>;
    imageUrl?: string;
    clickUrl?: string;
  }
): Promise<boolean> {
  try {
    const accessToken = await getFCMAccessToken(env);
    const projectId = JSON.parse(env.FCM_SERVICE_ACCOUNT).project_id;

    const message: FCMMessage = {
      topic: topic,
      notification: {
        title: notification.title,
        body: notification.body,
        image: notification.imageUrl,
      },
      data: notification.data,
      webpush: {
        fcm_options: {
          link: notification.clickUrl,
        },
      },
    };

    const response = await fetch(
      `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message }),
      }
    );

    return response.ok;
  } catch (error) {
    console.error('Failed to send FCM topic notification:', error);
    return false;
  }
}

