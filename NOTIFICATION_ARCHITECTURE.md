# Notification System Architecture

Unified notification system using Firebase Cloud Messaging (FCM) for both Web and Flutter apps.

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Principal (Web App)                       │
│  Creates notification via UI                                 │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ POST /notifications
                     │ { title, message, target_audience }
                     ▼
┌─────────────────────────────────────────────────────────────┐
│            Cloudflare Worker (Backend API)                   │
│                                                              │
│  1. Store in D1 Database (notifications table)              │
│  2. Create recipient records (notification_recipients)       │
│  3. Get FCM tokens for recipients (push_subscriptions)      │
│  4. Send via FCM HTTP v1 API                                │
│                                                              │
└────────────────┬──────────────────────┬─────────────────────┘
                 │                      │
                 │                      │
      ┌──────────▼──────────┐ ┌────────▼──────────┐
      │   Firebase Cloud    │ │  Firebase Cloud   │
      │   Messaging (Web)   │ │  Messaging (Mobile)│
      └──────────┬──────────┘ └────────┬──────────┘
                 │                      │
                 │                      │
      ┌──────────▼──────────┐ ┌────────▼──────────┐
      │    React Web App    │ │   Flutter App     │
      │                     │ │   (Android/iOS)   │
      │  - Service Worker   │ │  - FCM Plugin     │
      │  - Push API         │ │  - Local Notif    │
      └─────────────────────┘ └───────────────────┘
                 │                      │
                 │                      │
      ┌──────────▼──────────────────────▼──────────┐
      │         Teacher/Student/Parent             │
      │   Receives notification on all devices     │
      └────────────────────────────────────────────┘
```

---

## 📊 Data Flow

### 1. User Subscribes to Notifications

**Web (React):**
```typescript
// User grants permission
const permission = await Notification.requestPermission();

// Get FCM token from Firebase SDK
const token = await getToken(messaging, { vapidKey });

// Send to backend
await apiService.subscribeToPush({
  fcm_token: token,
  device_type: 'web',
  user_agent: navigator.userAgent
});
```

**Mobile (Flutter):**
```dart
// Request permission
NotificationSettings settings = await _fcm.requestPermission();

// Get FCM token
String? token = await _fcm.getToken();

// Send to backend
await apiService.subscribeToPush(
  fcmToken: token,
  deviceType: 'android', // or 'ios'
);
```

**Backend stores:**
```sql
INSERT INTO push_subscriptions (
  id, user_id, fcm_token, device_type, status
) VALUES (
  'uuid', 'user-123', 'fcm-token-abc...', 'web', 'active'
);
```

---

### 2. Principal Sends Notification

**Frontend:**
```typescript
await apiService.createNotification({
  title: 'School Holiday',
  message: 'School closed tomorrow',
  target_audience: 'students',
  push_notification_enabled: true
});
```

**Backend Processing:**

```typescript
// 1. Store notification
const notification = {
  id: randomUUID(),
  school_id: 'school-1',
  sender_id: 'principal-user-id',
  title: 'School Holiday',
  message: 'School closed tomorrow',
  target_audience: 'students',
  status: 'sent',
  push_notification_enabled: 1
};
await db.insert('notifications').values(notification);

// 2. Find recipients
const students = await db
  .select()
  .from('users')
  .innerJoin('student_profiles')
  .where({ school_id: 'school-1', role: 'student' });

// 3. Create recipient records
for (const student of students) {
  await db.insert('notification_recipients').values({
    id: randomUUID(),
    notification_id: notification.id,
    user_id: student.user_id,
    role: 'student',
    delivered_at: new Date().toISOString(),
    read_at: null
  });
}

// 4. Get FCM tokens
const tokens = await db
  .select('fcm_token')
  .from('push_subscriptions')
  .where({
    user_id: { in: students.map(s => s.user_id) },
    status: 'active'
  });

// 5. Send via FCM
await sendFCMNotificationBatch(env, tokens, {
  title: notification.title,
  body: notification.message,
  data: {
    notification_id: notification.id,
    type: 'school_notification'
  },
  clickUrl: `https://app.school.com/notifications/${notification.id}`
});
```

---

### 3. User Receives Notification

**Web (Foreground):**
```typescript
// Service worker receives push
onMessage(messaging, (payload) => {
  // Show browser notification
  new Notification(payload.notification.title, {
    body: payload.notification.body,
    icon: '/icon-192.png',
    badge: '/badge-72.png',
    data: payload.data
  });
  
  // Update unread count badge
  updateNotificationBadge();
});
```

**Web (Background):**
```javascript
// firebase-messaging-sw.js
messaging.onBackgroundMessage((payload) => {
  self.registration.showNotification(
    payload.notification.title,
    {
      body: payload.notification.body,
      icon: '/icon-192.png',
      data: payload.data
    }
  );
});
```

**Flutter (Foreground):**
```dart
FirebaseMessaging.onMessage.listen((RemoteMessage message) {
  // Show local notification
  showLocalNotification(
    title: message.notification?.title,
    body: message.notification?.body,
  );
  
  // Update badge count
  updateBadgeCount();
});
```

**Flutter (Background):**
```dart
Future<void> _firebaseMessagingBackgroundHandler(
  RemoteMessage message
) async {
  // Process background message
  print('Background: ${message.notification?.title}');
}
```

---

### 4. User Clicks Notification

**Web:**
```javascript
// Service worker handles click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const notificationId = event.notification.data.notification_id;
  
  // Open app to notification page
  clients.openWindow(`/notifications/${notificationId}`);
});
```

**Flutter:**
```dart
FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
  // Navigate to notification screen
  Navigator.push(
    context,
    MaterialPageRoute(
      builder: (context) => NotificationDetailScreen(
        notificationId: message.data['notification_id'],
      ),
    ),
  );
});
```

---

### 5. User Marks as Read

**Frontend:**
```typescript
await apiService.markNotificationAsRead(notificationId);
```

**Backend:**
```sql
UPDATE notification_recipients
SET read_at = CURRENT_TIMESTAMP
WHERE notification_id = ? AND user_id = ? AND read_at IS NULL;
```

---

## 🗄️ Database Schema

### notifications
```sql
CREATE TABLE notifications (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL,
  sender_id TEXT NOT NULL,
  
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  target_audience TEXT NOT NULL, -- 'all', 'teachers', 'students'
  
  priority TEXT DEFAULT 'normal',
  status TEXT DEFAULT 'sent',
  
  scheduled_at TEXT,
  sent_at TEXT,
  
  push_notification_enabled INTEGER DEFAULT 0,
  push_notification_sent INTEGER DEFAULT 0,
  
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### notification_recipients
```sql
CREATE TABLE notification_recipients (
  id TEXT PRIMARY KEY,
  notification_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL, -- 'principal', 'teacher', 'student'
  
  delivered_at TEXT,  -- When notification was created
  read_at TEXT,       -- When user marked as read
  
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  
  FOREIGN KEY (notification_id) REFERENCES notifications(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE(notification_id, user_id)
);
```

### push_subscriptions
```sql
CREATE TABLE push_subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  
  fcm_token TEXT,              -- FCM device token
  device_type TEXT,            -- 'web', 'android', 'ios'
  
  endpoint TEXT,               -- Web Push endpoint (legacy)
  keys_json TEXT,              -- Web Push keys (legacy)
  
  user_agent TEXT,
  ip_address TEXT,
  
  status TEXT DEFAULT 'active', -- 'active', 'expired', 'revoked'
  expires_at TEXT,
  
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_used_at TEXT,
  
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE(user_id, fcm_token)
);
```

---

## 🔧 Configuration Required

### 1. Firebase Project Setup
- Create Firebase project
- Enable Cloud Messaging
- Add web app, Android app, iOS app
- Download service account JSON

### 2. Cloudflare Secrets
```bash
wrangler secret put FCM_SERVICE_ACCOUNT
# Paste entire service account JSON
```

### 3. Web App Config
- Add Firebase config to `firebase.ts`
- Generate VAPID key in Firebase Console
- Create `firebase-messaging-sw.js` service worker

### 4. Flutter App Config
- Run `flutterfire configure`
- Add `google-services.json` (Android)
- Add `GoogleService-Info.plist` (iOS)
- Enable push capabilities

---

## 📈 Advantages of This Architecture

✅ **Unified Backend** - One API for web + mobile  
✅ **Single Token Store** - Same `fcm_token` field for all devices  
✅ **Consistent Payload** - Same message format everywhere  
✅ **Free Service** - Firebase FCM is free (unlimited messages)  
✅ **Reliable Delivery** - Google's infrastructure  
✅ **Analytics** - Firebase Console shows delivery metrics  
✅ **Topics** - Can subscribe to topics instead of individual tokens  
✅ **Multi-Device** - User can receive on all devices  

---

## 🎯 Notification Types & Use Cases

| Type | Audience | Push? | Email? | Use Case |
|------|----------|-------|--------|----------|
| **Emergency** | All | ✅ Yes | ✅ Yes | School closure, safety alerts |
| **Assignment** | Students | ✅ Yes | ⚠️ Daily digest | New homework, deadlines |
| **Exam** | Students | ✅ Yes | ⚠️ Weekly | Exam schedule, results |
| **Attendance** | Parents | ✅ Yes | ⚠️ Weekly | Child absent, late |
| **Announcement** | All | ✅ Yes | ❌ No | General school news |
| **Fee Due** | Parents | ⚠️ Optional | ✅ Yes | Payment reminders |
| **Report Card** | Parents | ✅ Yes | ✅ Yes | Results published |

---

## 🚀 Next Steps

1. ✅ Database schema updated (migration 0009)
2. ✅ FCM service created (`fcm-push.service.ts`)
3. ⏳ Setup Firebase project
4. ⏳ Add subscription endpoints
5. ⏳ Integrate FCM in web app
6. ⏳ Integrate FCM in Flutter app
7. ⏳ Test end-to-end

---

## 📚 Documentation Links

- [FCM Setup Guide](./FCM_SETUP_GUIDE.md) - Complete setup instructions
- [Firebase Console](https://console.firebase.google.com)
- [FCM HTTP v1 API](https://firebase.google.com/docs/reference/fcm/rest/v1/projects.messages)
- [FlutterFire Docs](https://firebase.flutter.dev/docs/messaging/overview)

