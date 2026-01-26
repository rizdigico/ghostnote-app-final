# Firebase Integration Guide for GhostNote

## Setup Status

✅ Firebase installed and ready to integrate
- Package: `firebase@^12.8.0`
- All security vulnerabilities fixed
- Compatible with Vercel deployment

## Quick Setup

### 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project"
3. Name it "GhostNote"
4. Enable Google Analytics (optional)
5. Click "Create project"

### 2. Get Firebase Config

1. In Firebase Console, go to Project Settings
2. Find "Web" under "Your apps"
3. Copy the config object:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcd1234efgh5678"
};
```

### 3. Add to Environment Variables

Create `.env.local`:

```bash
VITE_FIREBASE_API_KEY=YOUR_API_KEY
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcd1234efgh5678
```

### 4. Create Firebase Service

Create `firebaseService.ts`:

```typescript
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Example functions
export const registerUser = (email: string, password: string) =>
  createUserWithEmailAndPassword(auth, email, password);

export const loginUser = (email: string, password: string) =>
  signInWithEmailAndPassword(auth, email, password);

export const logoutUser = () => signOut(auth);
```

### 5. Update AuthContext

Replace the mock `dbService` with Firebase calls in `AuthContext.tsx`:

```typescript
import { auth, db } from './firebaseService';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

// Replace the login function
const login = async (email: string) => {
  setIsLoading(true);
  try {
    // For existing users, use signInWithEmailAndPassword
    // For new users, create account first with signUp flow
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
    if (userDoc.exists()) {
      setUser(userDoc.data() as User);
    }
  } catch (error) {
    console.error("Login failed", error);
  } finally {
    setIsLoading(false);
  }
};

// Check auth state on mount
useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser) {
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
      if (userDoc.exists()) {
        setUser(userDoc.data() as User);
      }
    }
    setIsLoading(false);
  });
  return unsubscribe;
}, []);
```

### 6. Configure Firestore

In Firebase Console:

1. Go to Firestore Database
2. Create Database (choose "Start in test mode" for development)
3. Choose region closest to you

Create a collection `users` with documents structured as:

```json
{
  "id": "user_123",
  "email": "user@example.com",
  "name": "User Name",
  "plan": "echo",
  "credits": 5,
  "joinedDate": "2024-01-26T00:00:00Z",
  "instagramConnected": false
}
```

### 7. Enable Authentication

In Firebase Console:

1. Go to Authentication
2. Click "Get Started"
3. Enable "Email/Password" provider
4. Save

### 8. Vercel Environment Variables

On Vercel dashboard:

1. Go to Settings → Environment Variables
2. Add all `VITE_FIREBASE_*` variables
3. Save and redeploy

## What to Replace

| Current | Firebase Alternative |
|---------|----------------------|
| `dbService.login()` | `loginUser()` + Firestore |
| localStorage | Firestore Database |
| Mock users | Firebase Auth |
| Email verification | Firebase Email Verification |
| Password reset | Firebase Password Reset |

## Security Rules

Firestore security rules in Firebase Console:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
    }
    
    // Public voice presets (read-only)
    match /voicePresets/{document=**} {
      allow read: if request.auth != null;
      allow write: if false;
    }
  }
}
```

## Benefits

- ✅ Real user authentication
- ✅ Cloud data storage
- ✅ Automatic backups
- ✅ Real-time sync
- ✅ Built-in security
- ✅ Easy scaling

## Current Status

Without Firebase integration:
- Users stored in localStorage only
- Data lost on browser clear
- No cloud backup
- Limited to single device

With Firebase integration:
- Users stored in cloud
- Data persists across devices
- Automatic backups
- Scalable infrastructure

## Next Steps

1. Create Firebase project
2. Get Firebase config
3. Add to `.env.local`
4. Run `npm run build` to verify
5. Deploy to Vercel
6. Update AuthContext.tsx to use Firebase

## Testing Locally

```bash
# With Firebase config in .env.local
npm run dev

# Test login/signup
# Data should appear in Firestore Console
```

## Support

- Firebase Docs: https://firebase.google.com/docs
- Firestore: https://firebase.google.com/docs/firestore
- Authentication: https://firebase.google.com/docs/auth
- Vercel Integration: https://vercel.com/docs/concepts/environment-variables
