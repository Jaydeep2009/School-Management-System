# FCM Push Notifications Setup Guide

Complete guide to setup Firebase Cloud Messaging for both Web and Flutter apps.

---

## 📋 Prerequisites

- Firebase project (free tier is enough)
- Cloudflare Workers account
- React web app
- Flutter mobile app

---

## 🔥 Firebase Setup

### 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Add project"
3. Enter project name: `school-management-system`
4. Disable Google Analytics (optional)
5. Click "Create project"

### 2. Add Web App

1. In Firebase Console, click ⚙️ → Project settings
2. Scroll to "Your apps"
3. Click Web icon (</>) to add web app
4. Register app:
   - App nickname: `SMS Web`
   - ✅ Also set up Firebase Hosting (optional)
5. Copy the config object:

```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "school-mgmt.firebaseapp.com",
  projectId: "school-mgmt",
  storageBucket: "school-mgmt.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

### 3. Add Android App (Flutter)

1. Click Android icon to add Android app
2. Android package name: `com.school.sms` (from your Flutter app)
3. Download `google-services.json`
4. Place in `android/app/google-services.json`

### 4. Add iOS App (Flutter)

1. Click iOS icon to add iOS app
2. iOS bundle ID: `com.school.sms` (from your Flutter app)
3. Download `GoogleService-Info.plist`
4. Place in `ios/Runner/GoogleService-Info.plist`

---

## 🔑 Generate Service Account Key

### For Backend (Cloudflare Workers)

1. Go to Firebase Console → ⚙️ → Project settings
2. Go to "Service accounts" tab
3. Click "Generate new private key"
4. Download JSON file
5. Store as Cloudflare secret:

```bash
# Create minified JSON (one line, no spaces)
cat service-account.json | jq -c > service-account-minified.json

# Store as secret
cd apps/api
wrangler secret put FCM_SERVICE_ACCOUNT
# Paste the entire JSON content when prompted
```

---

## 🌐 Web App Setup (React)

### 1. Install Firebase SDK

```bash
cd apps/web
npm install firebase
```

### 2. Create Firebase Config

Create `apps/web/src/lib/firebase.ts`:

```typescript
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

export { messaging };

/**
 * Request notification permission and get FCM token
 */
export async function requestNotificationPermission(): Promise<string | null> {
  try {
    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      // Get FCM token
      const token = await getToken(messaging, {
        vapidKey: 'YOUR_VAPID_KEY' // Get from Firebase Console
      });
      
      return token;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting FCM token:', error);
    return null;
  }
}

/**
 * Listen for foreground messages
 */
export function onForegroundMessage(callback: (payload: any) => void) {
  onMessage(messaging, callback);
}
```

### 3. Get Web VAPID Key

1. Go to Firebase Console → ⚙️ → Project settings
2. Go to "Cloud Messaging" tab
3. Scroll to "Web configuration"
4. Under "Web Push certificates", click "Generate key pair"
5. Copy the key and add to firebase.ts as `vapidKey`

### 4. Create Service Worker

Create `apps/web/public/firebase-messaging-sw.js`:

```javascript
// Import Firebase scripts
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Initialize Firebase
firebase.initializeApp({
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('Background message received:', payload);
  
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/icon-192.png',
    badge: '/badge-72.png',
    data: payload.data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  // Open the app
  event.waitUntil(
    clients.openWindow(event.notification.data?.click_url || '/')
  );
});
```

### 5. Register Service Worker

In `apps/web/src/main.tsx` or `App.tsx`:

```typescript
// Register service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/firebase-messaging-sw.js')
    .then((registration) => {
      console.log('Service Worker registered:', registration);
    })
    .catch((error) => {
      console.error('Service Worker registration failed:', error);
    });
}
```

### 6. Request Permission on Login

In your login success handler:

```typescript
import { requestNotificationPermission } from './lib/firebase';
import { apiService } from './services/api';

async function onLoginSuccess() {
  // ... existing login logic ...
  
  // Request notification permission
  const fcmToken = await requestNotificationPermission();
  
  if (fcmToken) {
    // Send token to backend
    await apiService.subscribeToPush({
      fcm_token: fcmToken,
      device_type: 'web',
      user_agent: navigator.userAgent
    });
  }
}
```

---

## 📱 Flutter App Setup

### 1. Install FlutterFire CLI

```bash
npm install -g firebase-tools
dart pub global activate flutterfire_cli
```

### 2. Configure Firebase

```bash
cd flutter_app
flutterfire configure
```

Select your Firebase project and platforms (Android, iOS).

### 3. Install Dependencies

Add to `pubspec.yaml`:

```yaml
dependencies:
  firebase_core: ^2.24.2
  firebase_messaging: ^14.7.9
```

```bash
flutter pub get
```

### 4. Initialize Firebase

In `lib/main.dart`:

```dart
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'firebase_options.dart';

// Background message handler
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp();
  print('Background message: ${message.messageId}');
}

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Initialize Firebase
  await Firebase.initializeApp(
    options: DefaultFirebaseOptions.currentPlatform,
  );
  
  // Set background message handler
  FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);
  
  runApp(MyApp());
}
```

### 5. Request Permission & Get Token

```dart
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';

class NotificationService {
  final FirebaseMessaging _fcm = FirebaseMessaging.instance;
  
  Future<String?> requestPermissionAndGetToken() async {
    // Request permission (iOS)
    NotificationSettings settings = await _fcm.requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );
    
    if (settings.authorizationStatus == AuthorizationStatus.authorized) {
      // Get FCM token
      String? token = await _fcm.getToken();
      print('FCM Token: $token');
      
      // Send to backend
      if (token != null) {
        await _sendTokenToBackend(token);
      }
      
      return token;
    }
    
    return null;
  }
  
  Future<void> _sendTokenToBackend(String token) async {
    // Call your API
    await apiService.subscribeToPush(
      fcmToken: token,
      deviceType: defaultTargetPlatform == TargetPlatform.android 
        ? 'android' 
        : 'ios',
    );
  }
  
  void setupMessageHandlers() {
    // Foreground messages
    FirebaseMessaging.onMessage.listen((RemoteMessage message) {
      print('Foreground message: ${message.notification?.title}');
      
      // Show local notification or update UI
      _showNotification(message);
    });
    
    // When user taps notification
    FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
      print('Notification clicked: ${message.data}');
      
      // Navigate to relevant screen
      _handleNotificationClick(message);
    });
  }
}
```

### 6. Android Configuration

Edit `android/app/build.gradle`:

```gradle
plugins {
    id "com.android.application"
    id "kotlin-android"
    id "dev.flutter.flutter-gradle-plugin"
    id "com.google.gms.google-services"  // Add this
}

dependencies {
    implementation platform('com.google.firebase:firebase-bom:32.7.0')
}
```

Edit `android/build.gradle`:

```gradle
dependencies {
    classpath 'com.google.gms:google-services:4.4.0'  // Add this
}
```

### 7. iOS Configuration

Edit `ios/Runner/AppDelegate.swift`:

```swift
import UIKit
import Flutter
import Firebase  // Add this

@UIApplicationMain
@objc class AppDelegate: FlutterAppDelegate {
  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    FirebaseApp.configure()  // Add this
    
    if #available(iOS 10.0, *) {
      UNUserNotificationCenter.current().delegate = self as? UNUserNotificationCenterDelegate
    }
    
    GeneratedPluginRegistrant.register(with: self)
    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }
}
```

---

## 🔧 Backend API Changes

### Add Subscription Endpoint

Add to `apps/api/src/notifications/notifications.routes.ts`:

```typescript
/**
 * POST /notifications/subscribe
 * Subscribe to push notifications
 */
app.post('/subscribe', async (c) => {
  const tenant = c.get('tenant');
  const body = await c.req.json();
  
  // Validate request
  const data = {
    fcm_token: body.fcm_token,
    device_type: body.device_type,
    user_agent: body.user_agent || c.req.header('user-agent'),
  };
  
  // Save to database
  const subscription = await notificationService.createPushSubscription(
    c.env.DB,
    tenant.userId,
    data
  );
  
  return c.json({ success: true, subscription });
});
```

### Update Notification Sending

In `sendNotificationToRecipients`, add FCM sending:

```typescript
// After creating recipient records
if (notification.push_notification_enabled) {
  // Get FCM tokens for recipients
  const tokens = await getFCMTokensForUsers(db, recipientIds);
  
  // Send via FCM
  await sendFCMNotificationBatch(c.env, tokens, {
    title: notification.title,
    body: notification.message,
    data: {
      notification_id: notification.id,
      type: 'notification'
    },
    clickUrl: `https://yourapp.com/notifications/${notification.id}`
  });
}
```

---

## ✅ Testing

### Web Testing

1. Open web app in Chrome
2. Open DevTools → Application → Service Workers
3. Check if `firebase-messaging-sw.js` is registered
4. Click "Request Permission" button
5. Grant notification permission
6. Send test notification from Firebase Console
7. Check if notification appears

### Flutter Testing

1. Run app: `flutter run`
2. Check logs for FCM token
3. Send test from Firebase Console using token
4. Check if notification appears

### Backend Testing

```bash
# Send test notification
curl -X POST https://sms-api.nmvpmsms.workers.dev/notifications \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Notification",
    "message": "This is a test",
    "target_audience": "students",
    "push_notification_enabled": true
  }'
```

---

## 📊 Firebase Console Monitoring

1. Go to Firebase Console → Engage → Cloud Messaging
2. View:
   - Total notifications sent
   - Delivery success rate
   - Open rate
   - Device tokens
   - Errors

---

## 🐛 Troubleshooting

### Web Issues

**Service Worker not registering:**
- Check browser console for errors
- Ensure `firebase-messaging-sw.js` is in `public/` folder
- Check MIME type is `application/javascript`

**Token not generated:**
- Check VAPID key is correct
- Ensure notification permission granted
- Check Firebase config is correct

### Flutter Issues

**No token generated:**
```bash
# Check Firebase is initialized
flutter run --verbose
```

**Notifications not showing:**
- Check Android notification channels
- Verify `google-services.json` is correct
- Check iOS capabilities include Push Notifications

---

## 🔐 Security Notes

1. **Never commit** `google-services.json` or `GoogleService-Info.plist` with real credentials
2. Store service account JSON as Cloudflare secret
3. Validate FCM tokens before saving
4. Implement rate limiting on subscription endpoint
5. Revoke tokens when user logs out

---

## 📚 Resources

- [Firebase Cloud Messaging Docs](https://firebase.google.com/docs/cloud-messaging)
- [FCM HTTP v1 API](https://firebase.google.com/docs/reference/fcm/rest/v1/projects.messages)
- [FlutterFire Documentation](https://firebase.flutter.dev/)
- [Web Push Notification Best Practices](https://web.dev/push-notifications-overview/)

