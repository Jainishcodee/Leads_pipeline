import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyD3I2bhp2w21OSIodIq1By8xPH-B2y0hhQ",
  authDomain: "mocha-cafe-e6fa0.firebaseapp.com",
  projectId: "mocha-cafe-e6fa0",
  storageBucket: "mocha-cafe-e6fa0.firebasestorage.app",
  messagingSenderId: "52119654233",
  appId: "1:52119654233:web:5b2d3d2a4a157285de4648",
  measurementId: "G-TM2C9WL3RS",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
