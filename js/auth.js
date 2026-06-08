// Quản lý đăng nhập và bảo mật bằng mã PIN 4 số dành cho cặp đôi
class LoveAuthManager {
  constructor() {
    this.user = null;
    this.authListeners = [];
    this.firebaseInitialized = false;
  }

  // Khởi tạo Auth
  init() {
    if (window.isFirebaseConfigured()) {
      try {
        // Khởi tạo Firebase App nếu chưa khởi tạo
        if (!firebase.apps.length) {
          firebase.initializeApp(window.firebaseConfig);
        }
        this.firebaseInitialized = true;
        
        // Đăng ký listener của Firebase Auth
        firebase.auth().onAuthStateChanged((fbUser) => {
          if (fbUser) {
            this.user = {
              uid: fbUser.uid,
              email: fbUser.email,
              role: 'Couple',
              displayName: 'Chúng Mình'
            };
          } else {
            this.user = null;
          }
          this.notifyListeners();
        });
      } catch (error) {
        console.error("Lỗi khởi tạo Firebase Auth, chuyển sang chế độ Demo:", error);
        this.initDemoAuth();
      }
    } else {
      // Chế độ Demo
      this.initDemoAuth();
    }
  }

  initDemoAuth() {
    // Đọc session từ localStorage
    const savedSession = localStorage.getItem('thuongbenhat_session');
    if (savedSession) {
      const parsed = JSON.parse(savedSession);
      // Kiểm tra xem session có quá hạn không (7 ngày)
      if (Date.now() - parsed.timestamp < 7 * 24 * 60 * 60 * 1000) {
        this.user = parsed.user;
      } else {
        localStorage.removeItem('thuongbenhat_session');
        this.user = null;
      }
    } else {
      this.user = null;
    }
    
    // Đợi DOM load xong để báo trạng thái
    setTimeout(() => this.notifyListeners(), 100);
  }

  // Đăng nhập bằng mã PIN 4 số
  login(pin) {
    return new Promise((resolve, reject) => {
      if (!pin || pin.length !== 4 || isNaN(pin)) {
        reject(new Error("Mã PIN phải gồm đúng 4 chữ số!"));
        return;
      }

      const expectedPin = window.firebaseConfig.pinCode || '0604';
      if (pin !== expectedPin) {
        reject(new Error("Mã PIN không chính xác! Hãy thử lại nhé. 💕"));
        return;
      }

      if (this.firebaseInitialized) {
        // Đăng nhập Firebase ẩn bằng tài khoản chung: love@thuongbenhat.com / thuongbenhat
        firebase.auth().signInWithEmailAndPassword('love@thuongbenhat.com', 'thuongbenhat')
          .then((userCredential) => {
            this.user = {
              uid: userCredential.user.uid,
              email: userCredential.user.email,
              role: 'Couple',
              displayName: 'Chúng Mình'
            };
            resolve(this.user);
          })
          .catch((error) => {
            reject(new Error(`Lỗi kết nối Firebase Auth! Hãy tạo tài khoản email 'love@thuongbenhat.com' mật khẩu 'thuongbenhat' trong mục Authentication -> Users của Firebase! (${error.message})`));
          });
      } else {
        // Đăng nhập chế độ Demo
        this.user = {
          uid: 'demo-couple-uid',
          email: 'love@thuongbenhat.com',
          role: 'Couple',
          displayName: 'Chúng Mình'
        };
        
        // Lưu session vào LocalStorage
        localStorage.setItem('thuongbenhat_session', JSON.stringify({
          user: this.user,
          timestamp: Date.now()
        }));
        
        this.notifyListeners();
        resolve(this.user);
      }
    });
  }

  // Đăng xuất
  logout() {
    return new Promise((resolve, reject) => {
      if (this.firebaseInitialized) {
        firebase.auth().signOut()
          .then(() => {
            this.user = null;
            resolve();
          })
          .catch((err) => reject(err));
      } else {
        localStorage.removeItem('thuongbenhat_session');
        this.user = null;
        this.notifyListeners();
        resolve();
      }
    });
  }

  // Lấy thông tin user hiện tại
  getCurrentUser() {
    return this.user;
  }

  // Đăng ký lắng nghe thay đổi trạng thái đăng nhập
  onAuthStateChanged(callback) {
    this.authListeners.push(callback);
    callback(this.user);
    return () => {
      this.authListeners = this.authListeners.filter(l => l !== callback);
    };
  }

  notifyListeners() {
    this.authListeners.forEach(listener => listener(this.user));
  }
}

// Khởi tạo đối tượng xác thực toàn cục
window.loveAuth = new LoveAuthManager();
window.loveAuth.init();
