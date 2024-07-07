import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore/lite";
import { getAuth, initializeAuth, debugErrorMap, inMemoryPersistence, prodErrorMap } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBIQmshDaKzQrbm-_pbjIvKxEsZtCnWQEs",
  authDomain: "awave-45940.firebaseapp.com",
  projectId: "awave-45940",
  storageBucket: "awave-45940.appspot.com",
  messagingSenderId: "298871222873",
  appId: "1:298871222873:web:db14c0dbaded7037c4f748"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
// const auth = getAuth(app);
const auth = initializeAuth(app, {
  errorMap: prodErrorMap,
  persistence: inMemoryPersistence
});
const db = getFirestore(app);


console.log("Exporting firebase!")
console.log(auth, db)

export { auth, db }