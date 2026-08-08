importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyDM3lz6U1RR3_Mv34lJOr8KSseXj6i4H2Y",
  authDomain: "myhealth-12.firebaseapp.com",
  projectId: "myhealth-12",
  storageBucket: "myhealth-12.firebasestorage.app",
  messagingSenderId: "846402645277",
  appId: "1:846402645277:web:78b4fcb3ba9e4f3205c5f4",
  measurementId: "G-D4T034D605"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/icon.png',
    badge: '/badge.png',
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});