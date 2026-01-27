import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// [보안 중요] 실제 키 값은 코드가 아닌 .env 파일이나 Vercel 환경변수 설정에서 가져옵니다.
// 깃허브에 코드가 올라가도 해커가 키를 알 수 없도록 하는 '국룰' 방식입니다.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// 파이어베이스 초기화 (키가 없으면 에러가 날 수 있으나, Vercel 설정 후 정상 작동합니다)
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);