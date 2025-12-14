import { initializeApp } from 'firebase/app';
import {
    initializeFirestore,
    persistentLocalCache,
    persistentMultipleTabManager
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
    apiKey: "AIzaSyCS7HPWqw_K7UXwLNM6-F5PYX6yicph7qs",
    authDomain: "sync-bridge-36fac.firebaseapp.com",
    projectId: "sync-bridge-36fac",
    storageBucket: "sync-bridge-36fac.firebasestorage.app",
    messagingSenderId: "781025230842",
    appId: "1:781025230842:web:122e30b3fbe781c5772e43",
    measurementId: "G-0J1HG9G9Q0"
};

const app = initializeApp(firebaseConfig);

// FIX: Initialize Firestore with Offline Persistence
export const db = initializeFirestore(app, {
    localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
    })
});

export const storage = getStorage(app);