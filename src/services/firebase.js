import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { Platform } from 'react-native';

const firebaseConfig = {
  apiKey: "AIzaSyDLZ-6cgmSjlfuslkgicMtC6G-BtLnMwho",
  authDomain: "echomood-e035e.firebaseapp.com",
  projectId: "echomood-e035e",
  storageBucket: "echomood-e035e.firebasestorage.app",
  messagingSenderId: "5057787101",
  appId: "1:5057787101:web:a062dbffda314946ab9734"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

let auth;

if (Platform.OS === 'web') {
  const { getAuth } = require('firebase/auth');
  auth = getAuth(app);
} else {
  const { initializeAuth, getReactNativePersistence } = require('firebase/auth');
  const ReactNativeAsyncStorage = require('@react-native-async-storage/async-storage').default;
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage)
  });
}

export { auth };