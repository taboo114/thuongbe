// Core Logic điều khiển ứng dụng kỷ niệm tình yêu "thuongbenhat"

class LoveApp {
  constructor() {
    this.currentUser = null;
    this.activeTab = 'home';
    this.counterTimer = null;
    this.firestoreUnsubs = []; // Lưu các đăng ký lắng nghe Firestore để hủy khi đăng xuất
    this.currentPhotos = []; // Lưu ảnh hiện tại để phục vụ lightbox slider
    this.coupleInfo = null;

    // Thời gian phiên hoạt động hiện tại và cờ kiểm tra cập nhật
    this.sessionStartTime = Date.now();
    this.hasCheckedUpdates = false;

    // Bộ nhớ tạm lưu dữ liệu các collection để quét cập nhật ngoại tuyến
    this.timelineItems = [];
    this.photoItems = [];
    this.letterItems = [];
    this.diaryItems = [];
    this.wishlistItems = [];
    this.messageItems = [];

    // PIN nhập vào hiện tại
    this.currentPin = "";

    // Các thành phần DOM
    this.loginSection = null;
    this.appSection = null;

    document.addEventListener('DOMContentLoaded', () => this.init());
  }

  init() {
    // Lấy các phần tử DOM chính
    this.loginSection = document.getElementById('login-section');
    this.appSection = document.getElementById('app-section');

    // Khởi chạy lắng nghe trạng thái đăng nhập từ LoveAuth
    if (window.loveAuth) {
      window.loveAuth.onAuthStateChanged((user) => {
        this.handleAuthStateChange(user);
      });
    }

    // Thiết lập bàn phím mã PIN
    this.setupPinKeypad();
    
    // Thiết lập preview khi chọn ảnh
    this.setupFilePreviews();

    // Lắng nghe đăng xuất trên di động
    const mobileLogout = document.getElementById('mobile-logout-btn');
    if (mobileLogout) {
      mobileLogout.addEventListener('click', () => this.handleLogout());
    }

    // Lắng nghe nút đăng xuất trong cài đặt (cho cả di động)
    const settingsLogout = document.getElementById('settings-logout-btn');
    if (settingsLogout) {
      settingsLogout.addEventListener('click', () => this.handleLogout());
    }

    // Lắng nghe nút giả lập thông báo
    const simulateBtn = document.getElementById('btn-simulate-notification');
    if (simulateBtn) {
      simulateBtn.addEventListener('click', () => this.simulatePartnerUpdate());
    }

    // Kiểm tra và hiển thị hướng dẫn cài đặt PWA trên iPhone/Safari
    this.checkIosPwaPrompt();

    // Đăng ký Service Worker cho PWA và nhận Push Notification
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('firebase-messaging-sw.js')
          .then(reg => {
            console.log('Service Worker đăng ký thành công:', reg);
            // Cài đặt FCM thông báo đẩy
            this.setupFcmPushNotifications(reg);
          })
          .catch(err => console.error('Đăng ký Service Worker thất bại:', err));
      });

      // Nhận chỉ thị chuyển tab từ Service Worker khi bấm vào thông báo
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'NAVIGATE_TAB') {
          this.switchTab(event.data.tab);
        }
      });
    }

    // Xử lý deep link (Ví dụ: mở app kèm tham số ?tab=gallery)
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab');
    if (tabParam) {
      setTimeout(() => this.switchTab(tabParam), 800);
    }
  }

  // Thiết lập xử lý nhập mã PIN (Keypad ảo & Bàn phím vật lý)
  setupPinKeypad() {
    const keypad = document.getElementById('pin-keypad');
    if (!keypad) return;

    const btns = keypad.querySelectorAll('.keypad-btn');
    btns.forEach(btn => {
      btn.addEventListener('click', () => {
        const val = btn.dataset.val;
        this.handlePinInput(val);
      });
    });

    // Hỗ trợ gõ bàn phím máy tính trực tiếp
    document.addEventListener('keydown', (e) => {
      if (this.loginSection && !this.loginSection.classList.contains('hidden')) {
        const key = e.key;
        if (key >= '0' && key <= '9') {
          this.handlePinInput(key);
        } else if (key === 'Backspace') {
          this.handlePinInput('back');
        } else if (key === 'Escape' || key === 'c' || key === 'C') {
          this.handlePinInput('clear');
        }
      }
    });
  }

  // Xử lý ký tự PIN nhập vào
  handlePinInput(val) {
    const errMsg = document.getElementById('login-error-msg');
    if (errMsg) errMsg.classList.add('hidden'); // Ẩn lỗi cũ khi gõ tiếp

    if (val === 'clear') {
      this.currentPin = "";
    } else if (val === 'back') {
      this.currentPin = this.currentPin.slice(0, -1);
    } else {
      if (this.currentPin.length < 4) {
        this.currentPin += val;
      }
    }

    this.updatePinDots();

    // Tự động kiểm tra đăng nhập khi đủ 4 số
    if (this.currentPin.length === 4) {
      setTimeout(() => this.submitPin(this.currentPin), 150);
    }
  }

  // Cập nhật hiển thị các chấm tròn mật khẩu
  updatePinDots() {
    const dots = document.querySelectorAll('.pin-dot');
    dots.forEach((dot, index) => {
      if (index < this.currentPin.length) {
        dot.classList.add('active');
      } else {
        dot.classList.remove('active');
      }
    });
  }

  // Submit mã PIN lên hệ thống auth
  submitPin(pin) {
    const errMsg = document.getElementById('login-error-msg');
    const pinDotsContainer = document.getElementById('pin-dots');
    pinDotsContainer.classList.add('verifying');

    window.loveAuth.login(pin)
      .then((user) => {
        this.currentPin = "";
        this.updatePinDots();
        pinDotsContainer.classList.remove('verifying');

        // BẮT ĐẦU HIỆU ỨNG MỞ KHOÁ TÌNH YÊU
        const loginCard = document.querySelector('.login-card');
        loginCard.classList.add('unlocked'); // Quay mở quai khoá hình trái tim

        // Lấy tọa độ biểu tượng khóa để nổ trái tim
        const lockIcon = document.querySelector('.heart-lock-icon');
        if (lockIcon && window.heartsBackground) {
          const rect = lockIcon.getBoundingClientRect();
          const x = rect.left + rect.width / 2;
          const y = rect.top + rect.height / 2;
          // Tạo một cơn mưa nổ tung 40 trái tim từ ổ khóa
          window.heartsBackground.triggerBurstAt(x, y, 40);
        }

        // Đợi 650ms để quai khoá mở ra, sau đó làm mờ trang đăng nhập
        setTimeout(() => {
          loginCard.classList.add('unlocked-fade');
        }, 650);

        // Đợi thêm 450ms (Tổng cộng 1100ms) để hiển thị Dashboard
        setTimeout(() => {
          this.handleAuthStateChange(user);
          loginCard.classList.remove('unlocked', 'unlocked-fade'); // Reset trạng thái cho lần sau
        }, 1100);
      })
      .catch((err) => {
        this.currentPin = "";
        this.updatePinDots();
        if (errMsg) {
          errMsg.textContent = err.message;
          errMsg.classList.remove('hidden');
        }
        pinDotsContainer.classList.remove('verifying');
        pinDotsContainer.classList.add('shake');
        setTimeout(() => pinDotsContainer.classList.remove('shake'), 500);
      });
  }

  // Xử lý sự kiện thay đổi trạng thái đăng nhập
  handleAuthStateChange(user) {
    this.currentUser = user;
    if (user) {
      this.loginSection.classList.add('hidden');
      this.appSection.classList.remove('hidden');

      // Khôi phục mặc định cờ kiểm tra cập nhật cho mỗi lần đăng nhập mới
      this.hasCheckedUpdates = false;

      // Đăng ký các sự kiện điều hướng tab
      this.setupNavigation();

      // Đăng ký các sự kiện gửi form
      this.setupFormHandlers();

      // Khởi tạo các kết nối dữ liệu
      this.initDataSync();


    } else {
      this.loginSection.classList.remove('hidden');
      this.appSection.classList.add('hidden');
      
      if (this.counterTimer) {
        clearInterval(this.counterTimer);
      }

      this.cleanupFirestoreUnsubs();
    }
  }

  // Đăng xuất
  handleLogout() {
    if (confirm('Hai đứa có chắc chắn muốn khóa trang web lại không? 💕')) {
      // Lưu lại thời gian đăng xuất/đóng web gần nhất trước khi xoá phiên
      localStorage.setItem('thuongbenhat_last_active', Date.now().toString());
      
      window.loveAuth.logout().then(() => {
        // Giao diện tự động cập nhật về màn hình PIN
      });
    }
  }

  // Điều hướng SPA
  setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item, .nav-link-btn');
    navItems.forEach(item => {
      const newItem = item.cloneNode(true);
      item.parentNode.replaceChild(newItem, item);

      newItem.addEventListener('click', (e) => {
        e.preventDefault();
        const tabName = newItem.dataset.tab;
        
        if (tabName === 'logout') {
          this.handleLogout();
          return;
        }

        this.switchTab(tabName);
      });
    });
  }

  switchTab(tabName) {
    if (!tabName) return;
    this.activeTab = tabName;

    // Xóa dấu chấm đỏ thông báo unread của tab này
    this.hideBadge(tabName);

    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
      if (item.dataset.tab === tabName) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    const pages = document.querySelectorAll('.app-page');
    pages.forEach(page => {
      page.classList.remove('active');
    });

    const activePage = document.getElementById(`page-${tabName}`);
    if (activePage) {
      activePage.classList.add('active');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  // --- QUẢN LÝ CHẤM ĐỎ THÔNG BÁO (RED DOT BADGES) ---
  showBadge(tab) {
    const badge = document.getElementById('badge-' + tab);
    const mobileBadge = document.getElementById('mobile-badge-' + tab);
    if (badge) badge.classList.remove('hidden');
    if (mobileBadge) mobileBadge.classList.remove('hidden');
  }

  hideBadge(tab) {
    const badge = document.getElementById('badge-' + tab);
    const mobileBadge = document.getElementById('mobile-badge-' + tab);
    if (badge) badge.classList.add('hidden');
    if (mobileBadge) mobileBadge.classList.add('hidden');
  }

  // Chuyển đổi từ tên collection sang tên Tab
  getTabFromCollection(collection) {
    if (collection === 'timeline') return 'timeline';
    if (collection === 'photos') return 'gallery';
    if (collection === 'letters') return 'letters';
    if (collection === 'diary') return 'diary';
    if (collection === 'wishlist') return 'wishlist';
    if (collection === 'messages') return 'home';
    return 'home';
  }

  // --- HỆ THỐNG PHÁT HIỆN CẬP NHẬT MỚI KHI OFFLINE ---
  
  // Quét các dữ liệu vừa được đồng bộ để tìm bản ghi mới nhất
  checkForOfflineUpdates() {
    if (this.hasCheckedUpdates) return;
    this.hasCheckedUpdates = true;

    const lastActive = parseInt(localStorage.getItem('thuongbenhat_last_active') || '0');
    
    // Ghi nhận ngay thời gian hoạt động hiện tại cho lần mở khoá sau
    localStorage.setItem('thuongbenhat_last_active', Date.now().toString());

    // Nếu là lần đầu đăng nhập thì không thông báo
    if (lastActive === 0) return;

    let newestItem = null;
    let newestType = ""; // 'timeline', 'gallery', 'letters', 'diary', 'wishlist', 'home'
    let newestText = "";

    const checkNewest = (items, type, textGen) => {
      if (!items || items.length === 0) return;
      items.forEach(item => {
        const ts = item.timestamp || (item.date ? new Date(item.date).getTime() : 0);
        // Kiểm tra xem item có được tạo trong khoảng thời gian người dùng đang offline không
        if (ts > lastActive && ts < this.sessionStartTime) {
          if (!newestItem || ts > newestItem.timestamp) {
            newestItem = { ...item, timestamp: ts };
            newestType = type;
            newestText = textGen(item);
          }
        }
      });
    };

    // Quét qua tất cả danh mục dữ liệu
    checkNewest(this.timelineItems, 'timeline', (item) => `Cột mốc kỷ niệm mới vừa được viết: "${item.title}"! 📅`);
    checkNewest(this.photoItems, 'gallery', (item) => `Album ảnh vừa được tải lên một bức ảnh mới! 📸`);
    checkNewest(this.letterItems, 'letters', (item) => `Bạn có một lá thư mới trong hộp thư: "${item.title}"! ✉️`);
    checkNewest(this.diaryItems, 'diary', (item) => `Nhật ký tình yêu có một trang cảm xúc mới! ✍️`);
    checkNewest(this.wishlistItems, 'wishlist', (item) => `Kế hoạch chung vừa được thêm mong ước mới! 🌟`);
    checkNewest(this.messageItems, 'home', (item) => `Đối phương vừa gửi một lời nhắn mới lên bảng! 📌`);

    // Nếu phát hiện có cập nhật offline mới nhất
    if (newestItem && newestType && newestText) {
      this.triggerUpdateNotification(newestText, newestType);
    }
  }

  // Hiển thị thông báo nhè nhẹ và tự nhảy tab trực tiếp tới đó
  triggerUpdateNotification(message, targetTab) {
    const banner = document.getElementById('love-notification-banner');
    const text = document.getElementById('love-notification-text');
    if (!banner || !text) return;

    text.textContent = message;
    
    // Slide thông báo xuống
    banner.classList.add('show');

    // Châm chấm đỏ cho tab có thông báo unread
    this.showBadge(targetTab);

    // Sau 1.2 giây sẽ tự động chuyển tab trực tiếp tới mục cập nhật
    setTimeout(() => {
      this.switchTab(targetTab);
    }, 1200);

    // Thu hồi thanh thông báo sau 5 giây
    setTimeout(() => {
      banner.classList.remove('show');
    }, 5000);
  }

  // --- XỬ LÝ LẮNG NGHE REALTIME DATA ĐỂ GẮN CHẤM ĐỎ ---
  processRealtimeNotification(collection, list) {
    // Chỉ check khi đã kiểm tra xong cập nhật offline ban đầu
    if (!this.hasCheckedUpdates) return;
    if (!list || list.length === 0) return;

    // Tìm bản ghi mới nhất vừa được đưa lên DB
    const newest = list.reduce((prev, current) => {
      const prevTs = prev.timestamp || 0;
      const currTs = current.timestamp || 0;
      return (currTs > prevTs) ? current : prev;
    });

    const newestTs = newest.timestamp || 0;
    const tabName = this.getTabFromCollection(collection);

    // Nếu bản ghi vừa được tạo trong phiên chạy online này
    if (newestTs > this.sessionStartTime) {
      // Tránh tự thông báo cho chính mình (nếu thời gian vừa ghi nhận dưới 2.5 giây)
      if (Date.now() - newestTs < 2500) {
        // Nếu ta không ở tab đó thì hiện chấm đỏ thông báo
        if (this.activeTab !== tabName) {
          this.showBadge(tabName);
          
          let alertText = "Cập nhật mới:";
          if (collection === 'timeline') alertText = `Có kỷ niệm mới: "${newest.title}"! 📅`;
          if (collection === 'photos') alertText = `Album vừa có ảnh mới được tải lên! 📸`;
          if (collection === 'letters') alertText = `Bạn nhận được lá thư tình mới: "${newest.title}"! ✉️`;
          if (collection === 'diary') alertText = `Trang nhật ký mới vừa được ghi! ✍️`;
          if (collection === 'wishlist') alertText = `Kế hoạch chung vừa thêm mong ước mới! 🌟`;
          if (collection === 'messages') alertText = `Lời nhắn mới dán trên bảng: "${newest.text}"! 📌`;

          // Phát thông báo bay nhẹ trượt xuống
          const banner = document.getElementById('love-notification-banner');
          const text = document.getElementById('love-notification-text');
          if (banner && text) {
            text.textContent = alertText;
            banner.classList.add('show');
            setTimeout(() => banner.classList.remove('show'), 4000);
          }
        }
      }
    }
  }

  // Thiết lập đồng bộ hóa dữ liệu (Firebase Firestore hoặc LocalStorage)
  initDataSync() {
    this.cleanupFirestoreUnsubs();

    if (window.isFirebaseConfigured()) {
      const db = firebase.firestore();

      // 1. Đồng bộ thông tin cặp đôi
      const unsubCouple = db.collection('settings').doc('coupleInfo')
        .onSnapshot((doc) => {
          if (doc.exists()) {
            this.updateCoupleUI(doc.data());
          } else {
            const defaultInfo = window.localDb.get('coupleInfo', window.DEFAULT_MOCK_DATA.coupleInfo);
            db.collection('settings').doc('coupleInfo').set(defaultInfo);
            this.updateCoupleUI(defaultInfo);
          }
        });
      this.firestoreUnsubs.push(unsubCouple);

      // 2. Dòng thời gian
      const unsubTimeline = db.collection('timeline').orderBy('date', 'asc')
        .onSnapshot((snapshot) => {
          const list = [];
          snapshot.forEach(doc => {
            list.push({ id: doc.id, ...doc.data() });
          });
          this.processRealtimeNotification('timeline', list);
          this.timelineItems = list;
          this.renderTimeline(list);
        });
      this.firestoreUnsubs.push(unsubTimeline);

      // 3. Album ảnh
      const unsubPhotos = db.collection('photos').orderBy('date', 'desc')
        .onSnapshot((snapshot) => {
          const list = [];
          snapshot.forEach(doc => {
            list.push({ id: doc.id, ...doc.data() });
          });
          this.processRealtimeNotification('photos', list);
          this.photoItems = list;
          this.currentPhotos = list;
          this.renderPhotos(list);
        });
      this.firestoreUnsubs.push(unsubPhotos);

      // 4. Thư tình
      const unsubLetters = db.collection('letters').orderBy('date', 'desc')
        .onSnapshot((snapshot) => {
          const list = [];
          snapshot.forEach(doc => {
            list.push({ id: doc.id, ...doc.data() });
          });
          this.processRealtimeNotification('letters', list);
          this.letterItems = list;
          this.renderLetters(list);
        });
      this.firestoreUnsubs.push(unsubLetters);

      // 5. Nhật ký
      const unsubDiary = db.collection('diary').orderBy('date', 'desc')
        .onSnapshot((snapshot) => {
          const list = [];
          snapshot.forEach(doc => {
            list.push({ id: doc.id, ...doc.data() });
          });
          this.processRealtimeNotification('diary', list);
          this.diaryItems = list;
          this.renderDiary(list);
        });
      this.firestoreUnsubs.push(unsubDiary);

      // 6. Wishlist
      const unsubWish = db.collection('wishlist').orderBy('completed', 'asc')
        .onSnapshot((snapshot) => {
          const list = [];
          snapshot.forEach(doc => {
            list.push({ id: doc.id, ...doc.data() });
          });
          this.processRealtimeNotification('wishlist', list);
          this.wishlistItems = list;
          this.renderWishlist(list);
        });
      this.firestoreUnsubs.push(unsubWish);

      // 7. Lời nhắn gửi ngắn
      const unsubMsg = db.collection('messages').orderBy('date', 'desc')
        .onSnapshot((snapshot) => {
          const list = [];
          snapshot.forEach(doc => {
            list.push({ id: doc.id, ...doc.data() });
          });
          this.processRealtimeNotification('messages', list);
          this.messageItems = list;
          this.renderMessages(list);
        });
      this.firestoreUnsubs.push(unsubMsg);

      // Đợi 1.5 giây sau khi kết nối dữ liệu Firebase để kiểm tra các cập nhật offline ban đầu
      setTimeout(() => this.checkForOfflineUpdates(), 1500);

    } else {
      // CHẾ ĐỘ DEMO (LOCAL STORAGE)
      const loadLocalData = () => {
        this.updateCoupleUI(window.localDb.get('coupleInfo'));
        
        this.timelineItems = window.localDb.get('timeline') || [];
        this.renderTimeline(this.timelineItems);
        
        this.photoItems = window.localDb.get('photos') || [];
        this.currentPhotos = this.photoItems;
        this.renderPhotos(this.photoItems);
        
        this.letterItems = window.localDb.get('letters') || [];
        this.renderLetters(this.letterItems);
        
        this.diaryItems = window.localDb.get('diary') || [];
        this.renderDiary(this.diaryItems);
        
        this.wishlistItems = window.localDb.get('wishlist') || [];
        this.renderWishlist(this.wishlistItems);
        
        this.messageItems = window.localDb.get('messages') || [];
        this.renderMessages(this.messageItems);
      };

      loadLocalData();

      window.addEventListener('storage', (e) => {
        if (e.key && e.key.startsWith('thuongbenhat_')) {
          const oldListLength = this.getCollectionLength(e.key.replace('thuongbenhat_', ''));
          loadLocalData();
          const newList = window.localDb.get(e.key.replace('thuongbenhat_', '')) || [];
          // Phát thông báo realtime nếu mở 2 tab local
          if (newList.length > oldListLength) {
            this.processRealtimeNotification(e.key.replace('thuongbenhat_', ''), newList);
          }
        }
      });

      // Đợi 1.2 giây sau khi nạp LocalStorage để kiểm tra các cập nhật offline ban đầu
      setTimeout(() => this.checkForOfflineUpdates(), 1200);
    }
  }

  getCollectionLength(col) {
    if (col === 'timeline') return this.timelineItems.length;
    if (col === 'photos') return this.photoItems.length;
    if (col === 'letters') return this.letterItems.length;
    if (col === 'diary') return this.diaryItems.length;
    if (col === 'wishlist') return this.wishlistItems.length;
    if (col === 'messages') return this.messageItems.length;
    return 0;
  }

  cleanupFirestoreUnsubs() {
    this.firestoreUnsubs.forEach(unsub => {
      if (typeof unsub === 'function') unsub();
    });
    this.firestoreUnsubs = [];
  }

  // --- RENDERING & UI UPDATES ---

  // 1. Cập nhật thông tin cặp đôi và bắt đầu bộ đếm ngày yêu
  updateCoupleUI(info) {
    this.coupleInfo = info;
    
    document.getElementById('man-name').textContent = info.manName || 'Anh';
    document.getElementById('woman-name').textContent = info.womanName || 'Bé';
    
    document.getElementById('man-avatar').src = info.manAvatar || 'https://api.dicebear.com/7.x/adventurer/svg?seed=Felix';
    document.getElementById('woman-avatar').src = info.womanAvatar || 'https://api.dicebear.com/7.x/adventurer/svg?seed=Lily';
    
    const configStartDateInput = document.getElementById('config-start-date');
    if (configStartDateInput) {
      configStartDateInput.value = info.startDate.substring(0, 16);
    }
    const configManNameInput = document.getElementById('config-man-name');
    const configWomanNameInput = document.getElementById('config-woman-name');
    if (configManNameInput) configManNameInput.value = info.manName;
    if (configWomanNameInput) configWomanNameInput.value = info.womanName;

    // Hiển thị sẵn hình ảnh đại diện hiện tại trong phần Cài đặt
    const configManPreview = document.getElementById('config-man-avatar-preview');
    const configWomanPreview = document.getElementById('config-woman-avatar-preview');
    if (configManPreview && info.manAvatar) {
      configManPreview.innerHTML = `<img src="${info.manAvatar}" alt="Preview">`;
      configManPreview.classList.remove('hidden');
    }
    if (configWomanPreview && info.womanAvatar) {
      configWomanPreview.innerHTML = `<img src="${info.womanAvatar}" alt="Preview">`;
      configWomanPreview.classList.remove('hidden');
    }

    if (this.counterTimer) {
      clearInterval(this.counterTimer);
    }
    
    const startDate = new Date(info.startDate);
    
    const updateCounter = () => {
      const now = new Date();
      const diffMs = now - startDate;
      
      if (diffMs < 0) {
        document.getElementById('days-count').textContent = '0';
        return;
      }
      
      const totalDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
      
      document.getElementById('days-count').textContent = totalDays;
      document.getElementById('time-days').textContent = totalDays.toString().padStart(2, '0');
      document.getElementById('time-hours').textContent = hours.toString().padStart(2, '0');
      document.getElementById('time-minutes').textContent = minutes.toString().padStart(2, '0');
      document.getElementById('time-seconds').textContent = seconds.toString().padStart(2, '0');

      const options = { year: 'numeric', month: 'long', day: 'numeric' };
      document.getElementById('anniversary-date-display').textContent = startDate.toLocaleDateString('vi-VN', options);
    };

    updateCounter();
    this.counterTimer = setInterval(updateCounter, 1000);
  }

  // 2. Render Dòng thời gian (Timeline)
  renderTimeline(items) {
    const container = document.getElementById('timeline-container');
    if (!container) return;

    if (items.length === 0) {
      container.innerHTML = `<div class="empty-state">Chưa có cột mốc kỷ niệm nào. Hãy thêm kỷ niệm đầu tiên của hai đứa nhé! 💕</div>`;
      return;
    }

    container.innerHTML = '';
    items.forEach((item, index) => {
      const isLeft = index % 2 === 0;
      const dateFormatted = new Date(item.date).toLocaleDateString('vi-VN', { year: 'numeric', month: 'long', day: 'numeric' });
      
      const timelineItem = document.createElement('div');
      timelineItem.className = `timeline-item ${isLeft ? 'left' : 'right'}`;
      timelineItem.innerHTML = `
        <div class="timeline-dot"></div>
        <div class="timeline-content card glass">
          <div class="timeline-date">${dateFormatted}</div>
          <h3 class="timeline-title">${item.title}</h3>
          ${item.image ? `<img src="${item.image}" class="timeline-img" alt="${item.title}" loading="lazy">` : ''}
          <p class="timeline-desc">${item.desc}</p>
          <div class="card-actions">
            <button class="action-btn edit" onclick="window.loveApp.editItem('timeline', '${item.id}')">✏️ Sửa</button>
            <button class="action-btn delete" onclick="window.loveApp.deleteItem('timeline', '${item.id}')">🗑️ Xóa</button>
          </div>
        </div>
      `;
      container.appendChild(timelineItem);
    });
  }

  // 3. Render Album ảnh (Gallery)
  renderPhotos(items) {
    const grid = document.getElementById('gallery-grid');
    if (!grid) return;

    if (items.length === 0) {
      grid.innerHTML = `<div class="empty-state">Album ảnh đang trống. Hãy tải lên những hình ảnh hạnh phúc nhé! 📸</div>`;
      return;
    }

    grid.innerHTML = '';
    items.forEach((item, index) => {
      const dateFormatted = new Date(item.date).toLocaleDateString('vi-VN', { year: 'numeric', month: 'numeric', day: 'numeric' });
      const photoItem = document.createElement('div');
      photoItem.className = 'gallery-item card glass';
      photoItem.innerHTML = `
        <div class="gallery-img-wrapper">
          <img src="${item.url}" alt="${item.desc}" loading="lazy">
        </div>
        <div class="gallery-info">
          <p class="gallery-desc">${item.desc || 'Kỷ niệm ngọt ngào'}</p>
          <span class="gallery-date">${dateFormatted}</span>
        </div>
        <div class="card-actions" style="margin-top: 8px;">
          <button class="action-btn edit" onclick="event.stopPropagation(); window.loveApp.editItem('photos', '${item.id}')">✏️ Sửa</button>
          <button class="action-btn delete" onclick="event.stopPropagation(); window.loveApp.deleteItem('photos', '${item.id}')">🗑️ Xóa</button>
        </div>
      `;
      photoItem.addEventListener('click', () => this.openLightbox(index));
      grid.appendChild(photoItem);
    });
  }

  // Phóng to ảnh (Lightbox)
  openLightbox(index) {
    if (this.currentPhotos.length === 0) return;
    
    let currentIndex = index;
    const lightbox = document.createElement('div');
    lightbox.className = 'lightbox-overlay';
    lightbox.innerHTML = `
      <button class="lightbox-close">&times;</button>
      <button class="lightbox-arrow prev">&#10094;</button>
      <div class="lightbox-content-wrapper">
        <img class="lightbox-img" src="${this.currentPhotos[currentIndex].url}" alt="">
        <p class="lightbox-caption">${this.currentPhotos[currentIndex].desc || ''}</p>
      </div>
      <button class="lightbox-arrow next">&#10095;</button>
    `;

    document.body.appendChild(lightbox);
    document.body.style.overflow = 'hidden';

    const img = lightbox.querySelector('.lightbox-img');
    const caption = lightbox.querySelector('.lightbox-caption');

    const updateLightbox = () => {
      img.style.opacity = 0;
      setTimeout(() => {
        img.src = this.currentPhotos[currentIndex].url;
        caption.textContent = this.currentPhotos[currentIndex].desc || '';
        img.style.opacity = 1;
      }, 200);
    };

    lightbox.querySelector('.prev').addEventListener('click', (e) => {
      e.stopPropagation();
      currentIndex = (currentIndex - 1 + this.currentPhotos.length) % this.currentPhotos.length;
      updateLightbox();
    });

    lightbox.querySelector('.next').addEventListener('click', (e) => {
      e.stopPropagation();
      currentIndex = (currentIndex + 1) % this.currentPhotos.length;
      updateLightbox();
    });

    const closeLightbox = () => {
      lightbox.remove();
      document.body.style.overflow = '';
    };

    lightbox.querySelector('.lightbox-close').addEventListener('click', closeLightbox);
    lightbox.addEventListener('click', closeLightbox);
    
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') {
        currentIndex = (currentIndex - 1 + this.currentPhotos.length) % this.currentPhotos.length;
        updateLightbox();
      }
      if (e.key === 'ArrowRight') {
        currentIndex = (currentIndex + 1) % this.currentPhotos.length;
        updateLightbox();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    lightbox.addEventListener('DOMNodeRemoved', () => {
      window.removeEventListener('keydown', handleKeyDown);
    });
  }

  // 4. Render Hộp thư tình (Love Letters & Time-capsules)
  renderLetters(items) {
    const lettersGrid = document.getElementById('letters-grid');
    if (!lettersGrid) return;

    if (items.length === 0) {
      lettersGrid.innerHTML = `<div class="empty-state">Hộp thư đang trống. Hãy viết cho đối phương một lá thư ngọt ngào! ✉️</div>`;
      return;
    }

    lettersGrid.innerHTML = '';
    const now = new Date();

    items.forEach(item => {
      let isLocked = false;
      let unlockDateFormatted = '';
      
      if (item.isTimeCapsule && item.unlockDate) {
        const unlock = new Date(item.unlockDate);
        if (now < unlock) {
          isLocked = true;
          unlockDateFormatted = unlock.toLocaleDateString('vi-VN', { year: 'numeric', month: 'long', day: 'numeric' });
        }
      }

      const letterCard = document.createElement('div');
      letterCard.className = `letter-card-wrapper ${isLocked ? 'locked' : ''}`;
      
      const readLetters = window.localDb.get('read_letters', []);
      const isUnread = !readLetters.includes(item.id);

      if (isLocked) {
        letterCard.innerHTML = `
          <div class="envelope closed locked">
            <div class="envelope-flap"></div>
            <div class="envelope-pocket">
              <div class="envelope-lock">
                <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                  <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
                </svg>
              </div>
            </div>
            <div class="letter-preview">
              <h4>${item.title}</h4>
              <p>Mở vào: ${unlockDateFormatted}</p>
            </div>
          </div>
          <div class="envelope-caption">Khóa đến: ${unlockDateFormatted}</div>
          <div class="card-actions" style="margin-top: 8px;">
            <button class="action-btn edit" onclick="event.stopPropagation(); window.loveApp.editItem('letters', '${item.id}')">✏️ Sửa</button>
            <button class="action-btn delete" onclick="event.stopPropagation(); window.loveApp.deleteItem('letters', '${item.id}')">🗑️ Xóa</button>
          </div>
        `;
        const envelope = letterCard.querySelector('.envelope');
        envelope.addEventListener('click', () => {
          alert(`Lá thư hẹn giờ này sẽ tự động mở khóa vào ngày ${unlockDateFormatted}. Hãy kiên nhẫn đợi nhé! 💕`);
        });
      } else {
        const dateFormatted = new Date(item.date).toLocaleDateString('vi-VN', { year: 'numeric', month: 'numeric', day: 'numeric' });
        
        letterCard.innerHTML = `
          <div class="envelope closed">
            ${isUnread ? '<span class="envelope-badge"></span>' : ''}
            <div class="envelope-flap"></div>
            <div class="envelope-pocket">
              <div class="envelope-heart">❤️</div>
            </div>
            <div class="letter-preview">
              <h4>${item.title}</h4>
              <span class="letter-date">${dateFormatted}</span>
            </div>
          </div>
          <div class="envelope-caption">${item.title}</div>
          <div class="card-actions" style="margin-top: 8px;">
            <button class="action-btn edit" onclick="event.stopPropagation(); window.loveApp.editItem('letters', '${item.id}')">✏️ Sửa</button>
            <button class="action-btn delete" onclick="event.stopPropagation(); window.loveApp.deleteItem('letters', '${item.id}')">🗑️ Xóa</button>
          </div>
        `;

        // Click vào phong bì thư thì mở đọc
        const envelope = letterCard.querySelector('.envelope');
        envelope.addEventListener('click', (e) => {
          e.stopPropagation();
          this.openLetterModal(item);
        });
      }
      lettersGrid.appendChild(letterCard);
    });
  }

  // Mở đọc thư
  openLetterModal(letter) {
    // Lưu trạng thái đã đọc vào LocalStorage
    const readLetters = window.localDb.get('read_letters', []);
    if (!readLetters.includes(letter.id)) {
      readLetters.push(letter.id);
      window.localDb.set('read_letters', readLetters);
      // Re-render thư để mất dấu chấm đỏ ngay lập tức
      this.renderLetters(this.letterItems);
    }

    const modal = document.createElement('div');
    modal.className = 'letter-reader-overlay';
    const dateFormatted = new Date(letter.date).toLocaleDateString('vi-VN', { year: 'numeric', month: 'long', day: 'numeric' });
    const senderName = letter.sender === 'Admin' ? (this.coupleInfo?.manName || 'Anh') : (this.coupleInfo?.womanName || 'Bé');

    modal.innerHTML = `
      <div class="letter-reader-card animate-letter-open">
        <button class="letter-close-btn">&times;</button>
        <div class="letter-paper">
          <div class="letter-header">
            <h2 class="letter-title">${letter.title}</h2>
            <div class="letter-meta">Ngày viết: ${dateFormatted} - Người gửi: ${senderName}</div>
          </div>
          <div class="letter-body">${letter.content.replace(/\n/g, '<br>')}</div>
          <div class="letter-footer">
            Yêu thương,<br>
            <strong>${senderName}</strong>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';

    const closeLetter = () => {
      modal.remove();
      document.body.style.overflow = '';
    };

    modal.querySelector('.letter-close-btn').addEventListener('click', closeLetter);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeLetter();
    });
  }

  // 5. Render Nhật ký tình yêu (Love Diary)
  renderDiary(items) {
    const diaryContainer = document.getElementById('diary-timeline');
    if (!diaryContainer) return;

    if (items.length === 0) {
      diaryContainer.innerHTML = `<div class="empty-state">Nhật ký đang trống. Hãy viết lại cảm xúc hôm nay nhé! ✍️</div>`;
      return;
    }

    diaryContainer.innerHTML = '';
    items.forEach(item => {
      const date = new Date(item.date);
      const dateStr = date.toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      const timeStr = date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
      const senderName = item.sender === 'Admin' ? (this.coupleInfo?.manName || 'Anh') : (this.coupleInfo?.womanName || 'Bé');
      const senderAvatar = item.sender === 'Admin' 
        ? (this.coupleInfo?.manAvatar || 'https://api.dicebear.com/7.x/adventurer/svg?seed=Felix') 
        : (this.coupleInfo?.womanAvatar || 'https://api.dicebear.com/7.x/adventurer/svg?seed=Lily');

      const entry = document.createElement('div');
      entry.className = 'diary-entry card glass';
      entry.innerHTML = `
        <div class="diary-header">
          <div class="diary-author">
            <img src="${senderAvatar}" class="diary-avatar" alt="${senderName}">
            <div>
              <span class="diary-author-name">${senderName}</span>
              <span class="diary-time">${dateStr} lúc ${timeStr}</span>
            </div>
          </div>
          <div class="diary-emoji-badge">${item.emoji || '❤️'}</div>
        </div>
        <div class="diary-body">
          <p>${item.content.replace(/\n/g, '<br>')}</p>
        </div>
        <div class="card-actions">
          <button class="action-btn edit" onclick="window.loveApp.editItem('diary', '${item.id}')">✏️ Sửa</button>
          <button class="action-btn delete" onclick="window.loveApp.deleteItem('diary', '${item.id}')">🗑️ Xóa</button>
        </div>
      `;
      diaryContainer.appendChild(entry);
    });
  }

  // 6. Render Danh sách mong ước (Wishlist)
  renderWishlist(items) {
    const listContainer = document.getElementById('wishlist-items');
    const progressText = document.getElementById('wishlist-progress-text');
    const progressBar = document.getElementById('wishlist-progress-bar');
    
    if (!listContainer) return;

    if (items.length === 0) {
      listContainer.innerHTML = `<div class="empty-state">Chưa có điều mong ước nào. Hãy tạo mong ước chung của hai đứa nhé! 🌟</div>`;
      progressText.textContent = 'Hoàn thành: 0%';
      progressBar.style.width = '0%';
      return;
    }

    const total = items.length;
    const completed = items.filter(item => item.completed).length;
    const percent = Math.round((completed / total) * 100);

    progressText.textContent = `Hai đứa đã cùng nhau hoàn thành được ${completed}/${total} việc (${percent}%)`;
    progressBar.style.width = `${percent}%`;

    listContainer.innerHTML = '';
    items.forEach(item => {
      const wishItem = document.createElement('div');
      wishItem.className = `wishlist-item card glass ${item.completed ? 'completed' : ''}`;
      
      const creatorName = item.createdBy === 'Admin' ? (this.coupleInfo?.manName || 'Anh') : (this.coupleInfo?.womanName || 'Bé');
      
      wishItem.innerHTML = `
        <label class="wishlist-checkbox-wrapper">
          <input type="checkbox" ${item.completed ? 'checked' : ''} data-id="${item.id}">
          <span class="checkmark"></span>
          <span class="wishlist-title">${item.title}</span>
        </label>
        <div>
          <span class="wishlist-creator">Tạo bởi: ${creatorName}</span>
          <div class="card-actions" style="margin-top: 8px; border-top:none; padding-top:0;">
            <button class="action-btn edit" onclick="window.loveApp.editItem('wishlist', '${item.id}')">✏️ Sửa</button>
            <button class="action-btn delete" onclick="window.loveApp.deleteItem('wishlist', '${item.id}')">🗑️ Xóa</button>
          </div>
        </div>
      `;

      const checkbox = wishItem.querySelector('input[type="checkbox"]');
      checkbox.addEventListener('change', (e) => {
        const id = e.target.dataset.id;
        const state = e.target.checked;
        this.toggleWishItem(id, state);
      });

      listContainer.appendChild(wishItem);
    });
  }

  // 7. Render Lời nhắn gửi (Notes/Messages)
  renderMessages(items) {
    const container = document.getElementById('messages-grid');
    if (!container) return;

    if (items.length === 0) {
      container.innerHTML = `<div class="empty-state">Chưa có lời nhắn gửi nào. Hãy nhắn một lời ngọt ngào lên đây! 📝</div>`;
      return;
    }

    container.innerHTML = '';
    const stickyColors = ['#fff9db', '#e3faf2', '#e8f7ff', '#ffebf8', '#f8f0fc'];

    items.forEach((item, index) => {
      const color = stickyColors[index % stickyColors.length];
      const senderName = item.sender === 'Admin' ? (this.coupleInfo?.manName || 'Anh') : (this.coupleInfo?.womanName || 'Bé');
      
      const card = document.createElement('div');
      card.className = 'message-card';
      card.style.backgroundColor = color;
      card.innerHTML = `
        <div>
          <div class="message-card-pin">📌</div>
          <p class="message-card-text">${item.text}</p>
        </div>
        <div>
          <div class="message-card-footer">
            <span>— ${senderName}</span>
          </div>
          <div class="card-actions" style="margin-top: 5px; border-top: none; padding-top: 0; justify-content: space-between;">
            <button class="action-btn edit" style="padding: 2px 6px; font-size:10px;" onclick="window.loveApp.editItem('messages', '${item.id}')">✏️</button>
            <button class="action-btn delete" style="padding: 2px 6px; font-size:10px;" onclick="window.loveApp.deleteItem('messages', '${item.id}')">🗑️</button>
          </div>
        </div>
      `;
      container.appendChild(card);
    });
  }

  // --- THIẾT LẬP FILE PREVIEW ---
  setupFilePreviews() {
    // A. Preview cho timeline
    const tlFile = document.getElementById('tl-input-image-file');
    const tlPreview = document.getElementById('tl-upload-preview');
    if (tlFile && tlPreview) {
      tlFile.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (ev) => {
            tlPreview.innerHTML = `<img src="${ev.target.result}" alt="Preview">`;
            tlPreview.classList.remove('hidden');
          };
          reader.readAsDataURL(file);
        }
      });
    }

    // B. Preview cho gallery
    const photoFile = document.getElementById('photo-input-file');
    const photoPreview = document.getElementById('photo-upload-preview');
    if (photoFile && photoPreview) {
      photoFile.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (ev) => {
            photoPreview.innerHTML = `<img src="${ev.target.result}" alt="Preview">`;
            photoPreview.classList.remove('hidden');
          };
          reader.readAsDataURL(file);
        }
      });
    }

    // C. Preview cho ảnh đại diện Anh
    const manAvatarFile = document.getElementById('config-man-avatar-file');
    const manAvatarPreview = document.getElementById('config-man-avatar-preview');
    if (manAvatarFile && manAvatarPreview) {
      manAvatarFile.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (ev) => {
            manAvatarPreview.innerHTML = `<img src="${ev.target.result}" alt="Preview">`;
            manAvatarPreview.classList.remove('hidden');
          };
          reader.readAsDataURL(file);
        }
      });
    }

    // D. Preview cho ảnh đại diện Bé
    const womanAvatarFile = document.getElementById('config-woman-avatar-file');
    const womanAvatarPreview = document.getElementById('config-woman-avatar-preview');
    if (womanAvatarFile && womanAvatarPreview) {
      womanAvatarFile.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (ev) => {
            womanAvatarPreview.innerHTML = `<img src="${ev.target.result}" alt="Preview">`;
            womanAvatarPreview.classList.remove('hidden');
          };
          reader.readAsDataURL(file);
        }
      });
    }

    // Nút đóng edit modal
    const closeBtn = document.getElementById('edit-modal-close-btn');
    const cancelBtn = document.getElementById('edit-modal-cancel-btn');
    const modal = document.getElementById('edit-modal');
    if (closeBtn) closeBtn.addEventListener('click', () => modal.classList.add('hidden'));
    if (cancelBtn) cancelBtn.addEventListener('click', () => modal.classList.add('hidden'));
  }

  // Hàm nén ảnh về Max 800px chất lượng JPEG 70% trước khi lưu
  compressImageFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.7)); // nén 70% chất lượng tốt
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  }

  // Hàm xử lý tải ảnh tự động nén dạng Base64
  async handleImageUpload(file, folder) {
    const compressedBase64 = await this.compressImageFile(file);
    
    if (window.isFirebaseConfigured()) {
      try {
        // Thử upload lên Firebase Storage trước nếu được cài đặt
        const storageRef = firebase.storage().ref(`${folder}/${Date.now()}_${file.name}`);
        const snapshot = await storageRef.put(file);
        const url = await snapshot.ref.getDownloadURL();
        return url;
      } catch (err) {
        console.warn('Firebase Storage chưa cài đặt, lưu trực tiếp Base64 nén vào Firestore:', err);
        return compressedBase64;
      }
    } else {
      // Chế độ demo offline: lưu Base64 nén vào LocalStorage
      return compressedBase64;
    }
  }

  // --- SỬA / XÓA DỮ LIỆU ---

  // Lấy tên tiếng Việt của Collection phục vụ modal title
  getCollectionNameVi(col) {
    if (col === 'timeline') return 'Kỷ Niệm';
    if (col === 'photos') return 'Ảnh Album';
    if (col === 'letters') return 'Thư Tình';
    if (col === 'diary') return 'Nhật Ký';
    if (col === 'wishlist') return 'Mong Ước';
    if (col === 'messages') return 'Lời Nhắn';
    return '';
  }

  // Mở modal Chỉnh sửa dữ liệu chung
  editItem(collection, id) {
    let item = null;
    if (window.isFirebaseConfigured()) {
      if (collection === 'timeline') item = this.timelineItems.find(i => i.id === id);
      if (collection === 'photos') item = this.photoItems.find(i => i.id === id);
      if (collection === 'letters') item = this.letterItems.find(i => i.id === id);
      if (collection === 'diary') item = this.diaryItems.find(i => i.id === id);
      if (collection === 'wishlist') item = this.wishlistItems.find(i => i.id === id);
      if (collection === 'messages') item = this.messageItems.find(i => i.id === id);
    } else {
      const list = window.localDb.get(collection) || [];
      item = list.find(i => i.id === id);
    }

    if (!item) return;

    const modal = document.getElementById('edit-modal');
    const fieldsContainer = document.getElementById('edit-modal-fields');
    const title = document.getElementById('edit-modal-title');
    
    title.textContent = `✏️ Chỉnh Sửa ${this.getCollectionNameVi(collection)}`;
    fieldsContainer.innerHTML = '';

    if (collection === 'timeline') {
      fieldsContainer.innerHTML = `
        <label>Tên cột mốc</label>
        <input type="text" id="edit-title" value="${item.title}" required>
        <label>Ngày kỷ niệm</label>
        <input type="date" id="edit-date" value="${item.date}" required>
        <label>Thay đổi ảnh mới (Nếu muốn)</label>
        <input type="file" id="edit-file" accept="image/*">
        <div id="edit-preview" class="upload-preview"><img src="${item.image || ''}"></div>
        <label style="margin-top: 10px; display: block;">Mô tả chi tiết</label>
        <textarea id="edit-desc" rows="3" required>${item.desc}</textarea>
        <label>Người tạo</label>
        <select id="edit-writer">
          <option value="Admin" ${item.sender === 'Admin' ? 'selected' : ''}>Anh</option>
          <option value="Partner" ${item.sender === 'Partner' ? 'selected' : ''}>Bé</option>
        </select>
      `;
      const fileInput = document.getElementById('edit-file');
      fileInput.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (ev) => {
            document.querySelector('#edit-preview img').src = ev.target.result;
          };
          reader.readAsDataURL(file);
        }
      };
    } else if (collection === 'photos') {
      fieldsContainer.innerHTML = `
        <label>Mô tả bức ảnh</label>
        <input type="text" id="edit-desc" value="${item.desc}" required>
        <label>Ngày chụp</label>
        <input type="date" id="edit-date" value="${item.date}" required>
        <label>Thay đổi ảnh mới (Nếu muốn)</label>
        <input type="file" id="edit-file" accept="image/*">
        <div id="edit-preview" class="upload-preview"><img src="${item.url || ''}"></div>
        <label style="margin-top: 10px; display: block;">Người đăng</label>
        <select id="edit-writer">
          <option value="Admin" ${item.sender === 'Admin' ? 'selected' : ''}>Anh</option>
          <option value="Partner" ${item.sender === 'Partner' ? 'selected' : ''}>Bé</option>
        </select>
      `;
      const fileInput = document.getElementById('edit-file');
      fileInput.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (ev) => {
            document.querySelector('#edit-preview img').src = ev.target.result;
          };
          reader.readAsDataURL(file);
        }
      };
    } else if (collection === 'letters') {
      fieldsContainer.innerHTML = `
        <label>Tiêu đề</label>
        <input type="text" id="edit-title" value="${item.title}" required>
        <label>Nội dung thư tình</label>
        <textarea id="edit-content" rows="6" required>${item.content}</textarea>
        <label>Người viết</label>
        <select id="edit-writer">
          <option value="Admin" ${item.sender === 'Admin' ? 'selected' : ''}>Anh</option>
          <option value="Partner" ${item.sender === 'Partner' ? 'selected' : ''}>Bé</option>
        </select>
      `;
    } else if (collection === 'diary') {
      fieldsContainer.innerHTML = `
        <label>Nội dung nhật ký</label>
        <textarea id="edit-content" rows="4" required>${item.content}</textarea>
        <label>Người viết</label>
        <select id="edit-writer">
          <option value="Admin" ${item.sender === 'Admin' ? 'selected' : ''}>Anh</option>
          <option value="Partner" ${item.sender === 'Partner' ? 'selected' : ''}>Bé</option>
        </select>
      `;
    } else if (collection === 'wishlist') {
      fieldsContainer.innerHTML = `
        <label>Nội dung mong ước</label>
        <input type="text" id="edit-title" value="${item.title}" required>
        <label>Người tạo</label>
        <select id="edit-writer">
          <option value="Admin" ${item.createdBy === 'Admin' ? 'selected' : ''}>Anh</option>
          <option value="Partner" ${item.createdBy === 'Partner' ? 'selected' : ''}>Bé</option>
        </select>
      `;
    } else if (collection === 'messages') {
      fieldsContainer.innerHTML = `
        <label>Lời nhắn</label>
        <input type="text" id="edit-text" value="${item.text}" required>
        <label>Người gửi</label>
        <select id="edit-writer">
          <option value="Admin" ${item.sender === 'Admin' ? 'selected' : ''}>Anh</option>
          <option value="Partner" ${item.sender === 'Partner' ? 'selected' : ''}>Bé</option>
        </select>
      `;
    }

    modal.classList.remove('hidden');

    const form = document.getElementById('edit-modal-form');
    form.onsubmit = async (e) => {
      e.preventDefault();
      
      let updatedData = { timestamp: Date.now() };

      if (collection === 'timeline') {
        const fileInput = document.getElementById('edit-file');
        let imgUrl = item.image;
        if (fileInput.files[0]) {
          imgUrl = await this.handleImageUpload(fileInput.files[0], 'timeline');
        }
        updatedData.title = document.getElementById('edit-title').value;
        updatedData.date = document.getElementById('edit-date').value;
        updatedData.desc = document.getElementById('edit-desc').value;
        updatedData.image = imgUrl;
        updatedData.sender = document.getElementById('edit-writer').value;
      } else if (collection === 'photos') {
        const fileInput = document.getElementById('edit-file');
        let imgUrl = item.url;
        if (fileInput.files[0]) {
          imgUrl = await this.handleImageUpload(fileInput.files[0], 'photos');
        }
        updatedData.desc = document.getElementById('edit-desc').value;
        updatedData.date = document.getElementById('edit-date').value;
        updatedData.url = imgUrl;
        updatedData.sender = document.getElementById('edit-writer').value;
      } else if (collection === 'letters') {
        updatedData.title = document.getElementById('edit-title').value;
        updatedData.content = document.getElementById('edit-content').value;
        updatedData.sender = document.getElementById('edit-writer').value;
      } else if (collection === 'diary') {
        updatedData.content = document.getElementById('edit-content').value;
        updatedData.sender = document.getElementById('edit-writer').value;
      } else if (collection === 'wishlist') {
        updatedData.title = document.getElementById('edit-title').value;
        updatedData.createdBy = document.getElementById('edit-writer').value;
      } else if (collection === 'messages') {
        updatedData.text = document.getElementById('edit-text').value;
        updatedData.sender = document.getElementById('edit-writer').value;
      }

      await this.saveEditedItem(collection, id, updatedData);
      modal.classList.add('hidden');
      alert('Đã cập nhật thay đổi thành công! 💕');
    };
  }

  // Lưu chỉnh sửa vào DB
  saveEditedItem(collection, id, updatedData) {
    return new Promise((resolve) => {
      if (window.isFirebaseConfigured()) {
        firebase.firestore().collection(collection).doc(id).update(updatedData)
          .then(() => resolve())
          .catch(err => {
            console.error("Lỗi cập nhật Firebase:", err);
            resolve();
          });
      } else {
        const list = window.localDb.get(collection) || [];
        const index = list.findIndex(i => i.id === id);
        if (index !== -1) {
          list[index] = { ...list[index], ...updatedData };
          window.localDb.set(collection, list);
          this.triggerLocalRender(collection, list);
        }
        resolve();
      }
    });
  }

  // Xóa bản ghi
  deleteItem(collection, id) {
    if (confirm(`Hai đứa có chắc chắn muốn xóa mục này không? 🗑️`)) {
      if (window.isFirebaseConfigured()) {
        firebase.firestore().collection(collection).doc(id).delete()
          .then(() => alert('Đã xóa mục này thành công!'))
          .catch(err => console.error(err));
      } else {
        const list = window.localDb.get(collection) || [];
        const filtered = list.filter(i => i.id !== id);
        window.localDb.set(collection, filtered);
        this.triggerLocalRender(collection, filtered);
        alert('Đã xóa mục này thành công!');
      }
    }
  }

  // Ép re-render cho chế độ local offline
  triggerLocalRender(collection, list) {
    if (collection === 'timeline') {
      this.timelineItems = list;
      this.renderTimeline(list);
    }
    if (collection === 'photos') {
      this.photoItems = list;
      this.currentPhotos = list;
      this.renderPhotos(list);
    }
    if (collection === 'letters') {
      this.letterItems = list;
      this.renderLetters(list);
    }
    if (collection === 'diary') {
      this.diaryItems = list;
      this.renderDiary(list);
    }
    if (collection === 'wishlist') {
      this.wishlistItems = list;
      this.renderWishlist(list);
    }
    if (collection === 'messages') {
      this.messageItems = list;
      this.renderMessages(list);
    }
  }

  // --- ACTIONS & FORM SUBMISSIONS ---

  setupFormHandlers() {
    // A. Form Thêm Kỷ Niệm (Timeline)
    const formTimeline = document.getElementById('form-add-timeline');
    if (formTimeline) {
      formTimeline.onsubmit = async (e) => {
        e.preventDefault();
        const submitBtn = formTimeline.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Đang nén và lưu...';

        const title = document.getElementById('tl-input-title').value;
        const date = document.getElementById('tl-input-date').value;
        const desc = document.getElementById('tl-input-desc').value;
        const sender = document.querySelector('input[name="timeline-writer"]:checked').value;
        const fileInput = document.getElementById('tl-input-image-file');

        let imageUrl = "";
        if (fileInput.files[0]) {
          imageUrl = await this.handleImageUpload(fileInput.files[0], 'timeline');
        }

        this.addData('timeline', { title, date, desc, image: imageUrl, sender })
          .then(() => {
            formTimeline.reset();
            document.getElementById('tl-upload-preview').classList.add('hidden');
            document.getElementById('details-timeline').removeAttribute('open'); // Đóng details panel lại
            alert('Đã thêm một cột mốc kỷ niệm mới! 🎉');
            this.switchTab('timeline');
          })
          .finally(() => {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Lưu Kỷ Niệm';
          });
      };
    }

    // B. Form Thêm Ảnh (Gallery)
    const formPhoto = document.getElementById('form-add-photo');
    if (formPhoto) {
      formPhoto.onsubmit = async (e) => {
        e.preventDefault();
        const submitBtn = formPhoto.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Đang tải ảnh lên...';

        const desc = document.getElementById('photo-input-desc').value;
        const date = document.getElementById('photo-input-date').value || new Date().toISOString().substring(0, 10);
        const sender = document.querySelector('input[name="photo-writer"]:checked').value;
        const fileInput = document.getElementById('photo-input-file');

        let imageUrl = "";
        if (fileInput.files[0]) {
          imageUrl = await this.handleImageUpload(fileInput.files[0], 'photos');
        }

        this.addData('photos', { url: imageUrl, desc, date, sender })
          .then(() => {
            formPhoto.reset();
            document.getElementById('photo-upload-preview').classList.add('hidden');
            document.getElementById('details-gallery').removeAttribute('open');
            alert('Đã thêm ảnh mới vào Album! 📸');
            this.switchTab('gallery');
          })
          .finally(() => {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Thêm Vào Album';
          });
      };
    }

    // C. Form Viết Thư (Love Letters)
    const formLetter = document.getElementById('form-add-letter');
    if (formLetter) {
      formLetter.onsubmit = (e) => {
        e.preventDefault();
        const title = document.getElementById('letter-input-title').value;
        const content = document.getElementById('letter-input-content').value;
        const isTimeCapsule = document.getElementById('letter-input-capsule').checked;
        const unlockDate = document.getElementById('letter-input-unlock').value;
        const sender = document.querySelector('input[name="letter-writer"]:checked').value;

        if (isTimeCapsule && !unlockDate) {
          alert('Vui lòng chọn ngày mở thư hẹn giờ!');
          return;
        }

        const letterData = {
          title,
          content,
          isTimeCapsule,
          date: new Date().toISOString().substring(0, 10),
          sender: sender
        };

        if (isTimeCapsule) {
          letterData.unlockDate = unlockDate;
        }

        this.addData('letters', letterData)
          .then((newId) => {
            if (newId) {
              const readLetters = window.localDb.get('read_letters', []);
              if (!readLetters.includes(newId)) {
                readLetters.push(newId);
                window.localDb.set('read_letters', readLetters);
              }
            }
            formLetter.reset();
            document.getElementById('letter-unlock-container').classList.add('hidden');
            document.getElementById('details-letters').removeAttribute('open');
            alert('Lá thư tình yêu đã được niêm phong gửi đi! ✉️');
            this.switchTab('letters');
          });
      };

      const checkboxCapsule = document.getElementById('letter-input-capsule');
      checkboxCapsule.onchange = (e) => {
        const dateContainer = document.getElementById('letter-unlock-container');
        if (e.target.checked) {
          dateContainer.classList.remove('hidden');
        } else {
          dateContainer.classList.add('hidden');
        }
      };
    }

    // D. Form Viết Nhật Ký (Love Diary)
    const formDiary = document.getElementById('form-add-diary');
    if (formDiary) {
      let selectedEmoji = '❤️';
      const emojiBtns = document.querySelectorAll('.emoji-select-btn');
      emojiBtns.forEach(btn => {
        btn.onclick = () => {
          emojiBtns.forEach(b => b.classList.remove('selected'));
          btn.classList.add('selected');
          selectedEmoji = btn.dataset.emoji;
        };
      });

      formDiary.onsubmit = (e) => {
        e.preventDefault();
        const content = document.getElementById('diary-input-content').value;
        const sender = document.querySelector('input[name="diary-writer"]:checked').value;

        this.addData('diary', {
          content,
          emoji: selectedEmoji,
          date: new Date().toISOString(),
          sender: sender
        })
          .then(() => {
            formDiary.reset();
            emojiBtns.forEach(b => b.classList.remove('selected'));
            emojiBtns[0].classList.add('selected');
            selectedEmoji = '❤️';
            alert('Đã viết xong một trang nhật ký cảm xúc! ✍️');
            this.switchTab('diary');
          });
      };
    }

    // E. Form Thêm Wishlist
    const formWish = document.getElementById('form-add-wish');
    if (formWish) {
      formWish.onsubmit = (e) => {
        e.preventDefault();
        const title = document.getElementById('wish-input-title').value;
        const sender = document.querySelector('input[name="wish-writer"]:checked').value;

        this.addData('wishlist', {
          title,
          completed: false,
          createdBy: sender
        })
          .then(() => {
            formWish.reset();
            alert('Đã thêm mong ước mới vào danh sách! 🌟');
          });
      };
    }

    // F. Form Gửi Lời Nhắn Nhớ
    const formMsg = document.getElementById('form-add-message');
    if (formMsg) {
      formMsg.onsubmit = (e) => {
        e.preventDefault();
        const text = document.getElementById('msg-input-text').value;
        const sender = document.querySelector('input[name="msg-writer"]:checked').value;

        this.addData('messages', {
          text,
          date: new Date().toISOString().substring(0, 10),
          sender: sender
        })
          .then(() => {
            formMsg.reset();
            alert('Mẩu giấy nhớ đã được dán lên bảng! 📌');
          });
      };
    }

    // G. Form Cập Nhật Cài Đặt (StartDate, Tên, Avatar)
    const formConfig = document.getElementById('form-update-config');
    if (formConfig) {
      formConfig.onsubmit = async (e) => {
        e.preventDefault();
        const submitBtn = formConfig.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Đang nén và lưu...';

        try {
          const manName = document.getElementById('config-man-name').value;
          const womanName = document.getElementById('config-woman-name').value;
          const startDate = document.getElementById('config-start-date').value;

          const manAvatarFile = document.getElementById('config-man-avatar-file');
          const womanAvatarFile = document.getElementById('config-woman-avatar-file');

          let manAvatar = this.coupleInfo?.manAvatar || '';
          let womanAvatar = this.coupleInfo?.womanAvatar || '';

          if (manAvatarFile && manAvatarFile.files[0]) {
            manAvatar = await this.handleImageUpload(manAvatarFile.files[0], 'avatars');
          }
          if (womanAvatarFile && womanAvatarFile.files[0]) {
            womanAvatar = await this.handleImageUpload(womanAvatarFile.files[0], 'avatars');
          }

          const updatedInfo = {
            manName,
            womanName,
            startDate: new Date(startDate).toISOString(),
            manAvatar: manAvatar || 'https://api.dicebear.com/7.x/adventurer/svg?seed=Felix&backgroundColor=ffdfbf',
            womanAvatar: womanAvatar || 'https://api.dicebear.com/7.x/adventurer/svg?seed=Lily&backgroundColor=ffd5dc'
          };

          await this.updateCoupleInfo(updatedInfo);
          alert('Cấu hình kỷ niệm đã được cập nhật thành công! 💕');
          this.switchTab('home');
        } catch (err) {
          console.error("Lỗi cập nhật cấu hình:", err);
          alert("Có lỗi xảy ra khi lưu cấu hình!");
        } finally {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Lưu Thay Đổi';
        }
      };
    }

    // Form Cập nhật FCM Service Account JSON
    const formFcm = document.getElementById('form-update-fcm');
    if (formFcm) {
      // Nạp cấu hình hiện tại vào textarea nếu có
      const localSA = localStorage.getItem("thuongbenhat_serviceAccount");
      if (localSA) {
        document.getElementById('config-fcm-json').value = localSA;
      } else if (window.serviceAccount && window.serviceAccount.private_key && !window.serviceAccount.private_key.includes("YOUR_PRIVATE_KEY")) {
        document.getElementById('config-fcm-json').value = JSON.stringify(window.serviceAccount, null, 2);
      }

      formFcm.onsubmit = (e) => {
        e.preventDefault();
        const jsonVal = document.getElementById('config-fcm-json').value.trim();
        if (!jsonVal) {
          localStorage.removeItem("thuongbenhat_serviceAccount");
          window.serviceAccount = {
            project_id: "thuongbe-9b81e",
            private_key: "-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY\n-----END PRIVATE KEY-----\n",
            client_email: "firebase-adminsdk-fbsvc@thuongbe-9b81e.iam.gserviceaccount.com"
          };
          alert("Đã xóa khóa thông báo đẩy khỏi bộ nhớ máy!");
          return;
        }

        try {
          const parsed = JSON.parse(jsonVal);
          if (!parsed.project_id || !parsed.private_key || !parsed.client_email) {
            alert("File JSON không hợp lệ! Vui lòng nhập đúng file Service Account chứa project_id, private_key và client_email.");
            return;
          }
          localStorage.setItem("thuongbenhat_serviceAccount", JSON.stringify(parsed, null, 2));
          window.serviceAccount = parsed;
          alert("Lưu cấu hình thông báo đẩy thành công! 🎉");
        } catch (err) {
          alert("Lỗi cú pháp JSON! Vui lòng dán chính xác toàn bộ nội dung file .json tải về.");
        }
      };
    }

    // H. Dark Mode / Light Mode Switcher
    const themeToggle = document.getElementById('theme-toggle-btn');
    if (themeToggle) {
      const savedTheme = localStorage.getItem('thuongbenhat_theme') || 'light';
      document.body.className = savedTheme;
      themeToggle.checked = savedTheme === 'dark';

      themeToggle.onchange = (e) => {
        const theme = e.target.checked ? 'dark' : 'light';
        document.body.className = theme;
        localStorage.setItem('thuongbenhat_theme', theme);
      };
    }
  }

  // Thay đổi trạng thái Wishlist
  toggleWishItem(id, completed) {
    if (window.isFirebaseConfigured()) {
      firebase.firestore().collection('wishlist').doc(id).update({ completed: completed })
        .catch(err => console.error(err));
    } else {
      const list = window.localDb.get('wishlist');
      const item = list.find(w => w.id === id);
      if (item) {
        item.completed = completed;
        window.localDb.set('wishlist', list);
        this.renderWishlist(list);
      }
    }
  }

  // Thêm dữ liệu chung hỗ trợ cả Firebase và LocalStorage
  addData(collectionName, data) {
    // Tự động gán thời gian tạo bản ghi
    data.timestamp = Date.now();
    return new Promise((resolve) => {
      if (window.isFirebaseConfigured()) {
        firebase.firestore().collection(collectionName).add(data)
          .then((docRef) => {
            // Tự động gửi thông báo đẩy ngoài màn hình khóa nếu có Firebase
            let pushTitle = "thuongbenhat 💖";
            let pushBody = "Có cập nhật mới!";
            
            if (collectionName === 'timeline') { pushTitle = "Kỷ niệm mới 📅"; pushBody = `Đối phương vừa thêm kỷ niệm: "${data.title}"`; }
            if (collectionName === 'photos') { pushTitle = "Ảnh mới 📸"; pushBody = `Đối phương vừa tải lên ảnh: "${data.desc}"`; }
            if (collectionName === 'letters') { pushTitle = "Thư tình mới ✉️"; pushBody = `Bạn nhận được bức thư: "${data.title}"`; }
            if (collectionName === 'diary') { pushTitle = "Nhật ký mới ✍️"; pushBody = `Đối phương vừa ghi nhật ký: "${data.content.substring(0, 30)}..."`; }
            if (collectionName === 'wishlist') { pushTitle = "Mong ước mới 🌟"; pushBody = `Đối phương vừa thêm mong ước: "${data.title}"`; }
            if (collectionName === 'messages') { pushTitle = "Lời nhắn mới 📌"; pushBody = `Đối phương dán giấy nhắn: "${data.text}"`; }

            const tab = this.getTabFromCollection(collectionName);
            this.sendPushNotification(pushTitle, pushBody, tab);

            resolve(docRef.id);
          })
          .catch(err => {
            console.error(`Lỗi ghi Firebase [${collectionName}]: `, err);
            alert('Không thể kết nối Firebase để lưu. Đang tạm thời lưu Offline!');
          });
      } else {
        const list = window.localDb.get(collectionName) || [];
        const newItem = { id: `${collectionName.substring(0,2)}-${Date.now()}`, ...data };
        list.push(newItem);
        window.localDb.set(collectionName, list);
        this.triggerLocalRender(collectionName, list);
        resolve(newItem.id);
      }
    });
  }

  // Kiểm tra và hiện popup hướng dẫn cài PWA trên Safari iOS (iPhone/iPad)
  checkIosPwaPrompt() {
    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isStandalone = window.navigator.standalone === true;
    
    if (isIos && !isStandalone) {
      const prompt = document.getElementById('ios-pwa-prompt');
      const closeBtn = document.getElementById('ios-prompt-close-btn');
      
      if (prompt) {
        const isDismissed = localStorage.getItem('thuongbenhat_pwa_dismissed') === 'true';
        if (!isDismissed) {
          prompt.classList.remove('hidden');
        }
        if (closeBtn) {
          closeBtn.onclick = () => {
            prompt.classList.add('hidden');
            localStorage.setItem('thuongbenhat_pwa_dismissed', 'true');
          };
        }
      }
    }
  }

  // Thiết lập nhận Firebase Cloud Messaging (FCM) Token
  setupFcmPushNotifications(registration) {
    if (!window.isFirebaseConfigured()) return;
    
    try {
      const messaging = firebase.messaging();
      Notification.requestPermission().then((permission) => {
        if (permission === 'granted') {
          console.log('Quyền thông báo hệ thống đã được cấp!');
          messaging.getToken({ 
            serviceWorkerRegistration: registration,
            vapidKey: window.firebaseConfig.vapidKey
          }).then((currentToken) => {
            if (currentToken) {
              console.log('FCM Token thiết bị:', currentToken);
              this.saveDeviceToken(currentToken);
            } else {
              console.log('Không lấy được Token thiết bị.');
            }
          }).catch((err) => {
            console.warn('Lỗi lấy FCM Token:', err);
          });
        }
      });
    } catch (err) {
      console.warn('Thiết bị hoặc trình duyệt không hỗ trợ Firebase Messaging:', err);
    }
  }

  // Lưu Device Token của đối phương vào Firestore
  saveDeviceToken(token) {
    if (!window.isFirebaseConfigured()) return;
    
    const db = firebase.firestore();
    db.collection('tokens').doc(token).set({
      token: token,
      lastActive: Date.now()
    }).catch(err => console.error("Lỗi lưu token:", err));
  }

  // Gửi thông báo đẩy đến tất cả các thiết bị qua FCM V1 API
  sendPushNotification(title, body, tab) {
    if (!window.isFirebaseConfigured()) return;
    
    // Kiểm tra xem Service Account đã được cấu hình chưa
    if (!window.serviceAccount || !window.serviceAccount.private_key || window.serviceAccount.private_key.includes("YOUR_PRIVATE_KEY")) {
      console.log("Google Service Account chưa được cấu hình trong js/firebase-config.js. Bỏ qua gửi thông báo đẩy ngoài màn hình khóa.");
      return;
    }

    const db = firebase.firestore();
    db.collection('tokens').get().then((snapshot) => {
      const tokens = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        tokens.push(data.token);
      });
      
      if (tokens.length === 0) return;

      // Lấy Access Token từ Service Account để gọi FCM v1 API
      this.getGoogleAccessToken()
        .then((accessToken) => {
          const projectId = window.serviceAccount.project_id || window.firebaseConfig.projectId;
          if (!projectId || projectId === "YOUR_PROJECT_ID") {
            console.error("Project ID chưa được cấu hình hợp lệ.");
            return;
          }

          tokens.forEach((token) => {
            // Gọi FCM V1 REST API
            const url = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;
            const payload = {
              message: {
                token: token,
                notification: {
                  title: title,
                  body: body
                },
                data: {
                  tab: tab
                },
                webpush: {
                  headers: {
                    Urgency: "high"
                  },
                  notification: {
                    icon: 'img/love_app_icon.png',
                    click_action: window.location.origin + window.location.pathname + '?tab=' + tab
                  }
                }
              }
            };

            fetch(url, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
              },
              body: JSON.stringify(payload)
            })
            .then(res => {
              if (!res.ok) {
                // Nếu token không hợp lệ hoặc thiết bị không còn hoạt động (404, 410), tự động xóa khỏi database
                if (res.status === 404 || res.status === 410) {
                  console.log(`Token không hợp lệ (${res.status}), tự động xóa:`, token);
                  db.collection('tokens').doc(token).delete().catch(e => console.error(e));
                }
                return res.json().then(err => {
                  throw new Error(`FCM V1 API error: ${JSON.stringify(err)}`);
                });
              }
              console.log('Đã kích hoạt gửi thông báo đẩy FCM v1 thành công đến token:', token);
            })
            .catch(err => console.error('Lỗi kích hoạt gửi thông báo đẩy FCM v1:', err));
          });
        })
        .catch(err => {
          console.error("Lỗi lấy Google Access Token:", err);
        });
    }).catch(err => console.error("Lỗi đọc danh sách token:", err));
  }

  // Tạo và trao đổi Access Token Google OAuth2 từ Client-side bằng jsrsasign
  getGoogleAccessToken() {
    return new Promise((resolve, reject) => {
      // 1. Kiểm tra cache trong sessionStorage để tránh gửi yêu cầu liên tục (token có hạn 1 tiếng)
      const cachedToken = sessionStorage.getItem('fcm_access_token');
      const cachedExpiry = sessionStorage.getItem('fcm_token_expiry');
      if (cachedToken && cachedExpiry && Date.now() < parseInt(cachedExpiry)) {
        return resolve(cachedToken);
      }

      if (!window.serviceAccount || !window.serviceAccount.private_key || window.serviceAccount.private_key.includes("YOUR_PRIVATE_KEY")) {
        return reject(new Error("Service Account private key chưa được cấu hình."));
      }

      try {
        const header = { alg: "RS256", typ: "JWT" };
        const now = Math.floor(Date.now() / 1000);
        const payload = {
          iss: window.serviceAccount.client_email,
          scope: "https://www.googleapis.com/auth/firebase.messaging",
          aud: "https://oauth2.googleapis.com/token",
          exp: now + 3600,
          iat: now
        };

        const sHeader = JSON.stringify(header);
        const sPayload = JSON.stringify(payload);
        
        // Ký JWT sử dụng thư viện jsrsasign
        const privateKey = window.serviceAccount.private_key;
        const signedJWT = KJUR.jws.JWS.sign("RS256", sHeader, sPayload, privateKey);

        // Trao đổi lấy OAuth2 Access Token từ Google
        fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: new URLSearchParams({
            grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            assertion: signedJWT
          })
        })
        .then(response => {
          if (!response.ok) {
            return response.json().then(err => {
              throw new Error("Lỗi trao đổi mã token OAuth2: " + JSON.stringify(err));
            });
          }
          return response.json();
        })
        .then(data => {
          if (data.access_token) {
            // Lưu cache token (trừ đi 5 phút dự phòng)
            const expiryTime = Date.now() + (data.expires_in - 300) * 1000;
            sessionStorage.setItem('fcm_access_token', data.access_token);
            sessionStorage.setItem('fcm_token_expiry', expiryTime.toString());
            resolve(data.access_token);
          } else {
            reject(new Error("Không nhận được access_token từ Google OAuth."));
          }
        })
        .catch(err => {
          reject(err);
        });
      } catch (e) {
        reject(e);
      }
    });
  }

  // Cập nhật cấu hình cặp đôi
  simulatePartnerUpdate() {
    alert("Bắt đầu chạy giả lập. Bạn hãy đợi 2 giây...");
    setTimeout(() => {
      // Giả lập đối phương thêm một nhật ký mới
      const collections = ['timeline', 'photos', 'letters', 'diary', 'wishlist', 'messages'];
      const randomCol = collections[Math.floor(Math.random() * collections.length)];
      const tabName = this.getTabFromCollection(randomCol);
      
      let mockItemText = "";
      if (randomCol === 'timeline') mockItemText = "Bé vừa thêm kỷ niệm đi chơi mới! 📅";
      if (randomCol === 'photos') mockItemText = "Bé vừa tải lên ảnh đi ăn uống! 📸";
      if (randomCol === 'letters') mockItemText = "Bé vừa gửi cho bạn một lá thư tình ngọt ngào! ✉️";
      if (randomCol === 'diary') mockItemText = "Bé vừa viết nhật ký hôm nay: 'Nhớ anh nhiều quá đi!' ✍️";
      if (randomCol === 'wishlist') mockItemText = "Bé vừa thêm mong ước đi du lịch Sapa! 🌟";
      if (randomCol === 'messages') mockItemText = "Bé vừa dán giấy nhớ mới: 'Đang làm gì đó tình yêu?' 📌";

      // Hiển thị banner thông báo trượt xuống
      const banner = document.getElementById('love-notification-banner');
      const text = document.getElementById('love-notification-text');
      if (banner && text) {
        text.textContent = mockItemText;
        banner.classList.add('show');
        setTimeout(() => banner.classList.remove('show'), 5000);
      }

      // Đặt chấm đỏ trên thanh menu điều hướng
      this.showBadge(tabName);

      // Phát nổ tim lơ lửng ngẫu nhiên trên màn hình
      if (window.heartsBackground) {
        const x = window.innerWidth / 2;
        const y = window.innerHeight / 3;
        window.heartsBackground.triggerBurstAt(x, y, 25);
      }
    }, 2000);
  }

  updateCoupleInfo(info) {
    return new Promise((resolve) => {
      if (window.isFirebaseConfigured()) {
        firebase.firestore().collection('settings').doc('coupleInfo').set(info)
          .then(() => resolve())
          .catch(err => console.error(err));
      } else {
        window.localDb.set('coupleInfo', info);
        this.updateCoupleUI(info);
        resolve();
      }
    });
  }
}

// Khởi chạy ứng dụng
window.loveApp = new LoveApp();
