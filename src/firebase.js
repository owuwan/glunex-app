import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Vercel 환경변수에서 키 값을 가져옵니다.
// [중요] Vercel 사이트의 [Settings] -> [Environment Variables]에
// 아래 값들이 설정되어 있어야만 정상 작동합니다.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// 파이어베이스 초기화
const app = initializeApp(firebaseConfig);

// 인증 및 DB 도구 내보내기
export const auth = getAuth(app);
export const db = getFirestore(app);