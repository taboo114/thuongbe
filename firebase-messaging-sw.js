// Import các SDK Firebase cần thiết cho Service Worker
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

// Import file cấu hình của ứng dụng để đọc firebaseConfig
importScripts('js/firebase-config.js');

// Khởi tạo Firebase App trong Service Worker nếu cấu hình Firebase hợp lệ
if (self.firebaseConfig && self.firebaseConfig.apiKey && self.firebaseConfig.apiKey !== "YOUR_API_KEY") {
  firebase.initializeApp(self.firebaseConfig);
  
  try {
    const messaging = firebase.messaging();

    // Lắng nghe và hiển thị thông báo đẩy khi ứng dụng chạy ngầm/tắt
    messaging.onBackgroundMessage((payload) => {
      console.log('[firebase-messaging-sw.js] Nhận thông báo nền: ', payload);
      
      const notificationTitle = payload.notification.title || 'thuongbenhat 💖';
      const notificationOptions = {
        body: payload.notification.body || 'Có cập nhật mới từ đối phương!',
        icon: 'img/love_app_icon.png',
        badge: 'img/love_app_icon.png',
        data: payload.data
      };

      self.registration.showNotification(notificationTitle, notificationOptions);
    });
  } catch (err) {
    console.error('[firebase-messaging-sw.js] Lỗi khởi tạo Firebase Messaging:', err);
  }
} else {
  console.log('[firebase-messaging-sw.js] Đang chạy chế độ Demo (không kết nối Firebase).');
}

// Dự phòng lắng nghe sự kiện push tiêu chuẩn của trình duyệt
self.addEventListener('push', (event) => {
  if (event.data) {
    try {
      const payload = event.data.json();
      const title = payload.notification?.title || 'thuongbenhat 💖';
      const options = {
        body: payload.notification?.body || 'Có cập nhật mới từ đối phương!',
        icon: 'img/love_app_icon.png',
        badge: 'img/love_app_icon.png',
        data: payload.data
      };
      event.waitUntil(self.registration.showNotification(title, options));
    } catch (e) {
      const text = event.data.text();
      event.waitUntil(self.registration.showNotification('thuongbenhat 💖', {
        body: text,
        icon: 'img/love_app_icon.png',
        badge: 'img/love_app_icon.png'
      }));
    }
  }
});

// Xử lý sự kiện khi người dùng click vào thông báo đẩy
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetTab = event.notification.data?.tab || 'home';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Tìm xem có tab nào của ứng dụng đang mở sẵn không
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          // Gửi tin nhắn bảo tab chuyển sang mục mới
          client.postMessage({ type: 'NAVIGATE_TAB', tab: targetTab });
          return client.focus();
        }
      }
      // Nếu không có tab nào mở thì mở cửa sổ mới
      if (clients.openWindow) {
        return clients.openWindow('index.html?tab=' + targetTab);
      }
    })
  );
});
