// Cấu hình Firebase cho ứng dụng "thuongbenhat"
// Bạn chỉ cần thay thế các thông tin dưới đây bằng thông tin từ Firebase Console của bạn.
// Nếu giữ nguyên mặc định, ứng dụng sẽ chạy ở chế độ DEMO (Lưu trữ LocalStorage trên trình duyệt) để bạn trải nghiệm ngay lập tức!

const firebaseConfig = {
  apiKey: "AIzaSyCn6UBcxrDi7M34lzZjVVqFwNZ1dX9yo2g",
  authDomain: "thuongbe-9b81e.firebaseapp.com",
  projectId: "thuongbe-9b81e",
  storageBucket: "thuongbe-9b81e.firebasestorage.app",
  messagingSenderId: "255722864231",
  appId: "1:255722864231:web:291c7cca5245daa7aa1ec2",
  vapidKey: "BFcv2DaGckNfI2u7tAezhc7peaZT2C2AJhuE1zxQgw5tJBp-_WFNKRKVgASpyM4TbO_NzIvPf4gApEq1ohx7aY8", // Mã VAPID Key lấy ở Firebase Console -> Cloud Messaging -> Web Configuration
  pinCode: "0604" // Mật khẩu 4 số mặc định để mở khoá website (06/04)
};

// Cấu hình Google Service Account để kích hoạt thông báo đẩy FCM V1 từ trình duyệt
// Được lưu trữ động trong LocalStorage ở màn hình Cài Đặt của web để bảo mật khi dùng GitHub Pages công cộng
let serviceAccount = null;
try {
  const localSA = localStorage.getItem("thuongbenhat_serviceAccount");
  if (localSA) {
    serviceAccount = JSON.parse(localSA);
  }
} catch (e) {
  console.error("Lỗi đọc Service Account từ LocalStorage:", e);
}

if (!serviceAccount) {
  serviceAccount = {
    project_id: "thuongbe-9b81e",
    private_key: "-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY\n-----END PRIVATE KEY-----\n",
    client_email: "firebase-adminsdk-fbsvc@thuongbe-9b81e.iam.gserviceaccount.com"
  };
}

// Kiểm tra xem đã cấu hình Firebase thực sự hay chưa
const isFirebaseConfigured = () => {
  return firebaseConfig.apiKey && firebaseConfig.apiKey !== "YOUR_API_KEY" && firebaseConfig.apiKey.trim() !== "";
};

// Dữ liệu mẫu (Mock Data) bằng Tiếng Việt đầy cảm xúc
const DEFAULT_MOCK_DATA = {
  coupleInfo: {
    manName: "Anh",
    womanName: "Bé",
    startDate: "2024-05-20T00:00:00", // Ngày bắt đầu yêu nhau (20/05/2024)
    manAvatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=Felix&backgroundColor=ffdfbf",
    womanAvatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=Lily&backgroundColor=ffd5dc"
  },
  timeline: [
    {
      id: "tl-1",
      date: "2024-05-20",
      title: "Lần Đầu Gặp Gỡ",
      desc: "Ngày hôm đó trời đổ cơn mưa nhẹ. Ánh mắt chúng mình chạm nhau và anh biết rằng cuộc đời mình từ nay đã thay đổi. Nụ cười của bé là điều ngọt ngào nhất anh từng thấy.",
      image: "https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?q=80&w=600&auto=format&fit=crop"
    },
    {
      id: "tl-2",
      date: "2024-06-01",
      title: "Lời Tỏ Tình Ngọt Ngào",
      desc: "Sau những buổi hẹn hò đi dạo phố, anh đã lấy hết can đảm để ngỏ lời yêu bé tại góc quán quen thuộc. Khoảnh khắc bé gật đầu mỉm cười là giây phút hạnh phúc nhất đời anh.",
      image: "https://images.unsplash.com/photo-1518199266791-5375a83190b7?q=80&w=600&auto=format&fit=crop"
    },
    {
      id: "tl-3",
      date: "2025-01-01",
      title: "Đón Giao Thừa Đầu Tiên",
      desc: "Cùng nhau ngắm pháo hoa chào năm mới. Giữa hàng ngàn người náo nhiệt, anh chỉ nhìn thấy bé và ước rằng chúng mình sẽ mãi bên nhau như thế này.",
      image: "https://images.unsplash.com/photo-1531747118685-ca8fa6e08806?q=80&w=600&auto=format&fit=crop"
    }
  ],
  photos: [
    { id: "p-1", url: "https://images.unsplash.com/photo-1518199266791-5375a83190b7?q=80&w=800", desc: "Nắm tay nhau đi khắp thế gian", date: "2024-06-15" },
    { id: "p-2", url: "https://images.unsplash.com/photo-1522673607200-164d1b6ce486?q=80&w=800", desc: "Buổi chiều bình yên bên ly cà phê", date: "2024-09-20" },
    { id: "p-3", url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=800", desc: "Nụ cười tỏa nắng của Bé", date: "2025-02-14" },
    { id: "p-4", url: "https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?q=80&w=800", desc: "Kỷ niệm chuyến đi biển đầu tiên", date: "2025-04-30" }
  ],
  letters: [
    {
      id: "l-1",
      title: "Gửi Bé của anh",
      date: "2024-08-20",
      content: "Bé ơi, viết lá thư này khi bé đang ngủ ngon lành. Anh chỉ muốn nói rằng anh yêu bé rất nhiều. Cảm ơn bé đã luôn bao dung, thấu hiểu và đem lại tiếng cười cho anh mỗi ngày. Mong rằng chúng ta sẽ cùng viết tiếp thật nhiều trang sách tình yêu tuyệt đẹp nữa nhé!",
      sender: "Admin",
      isTimeCapsule: false
    },
    {
      id: "l-2",
      title: "Thư gửi tương lai - Kỷ niệm 2 năm",
      date: "2026-05-20",
      unlockDate: "2027-05-20", // Mở vào 20/05/2027 (Tương lai)
      content: "Chúc mừng kỷ niệm 2 năm yêu nhau của chúng mình! Lúc bé đọc được bức thư này, chắc hẳn chúng ta đã cùng nhau vượt qua thêm nhiều thử thách và yêu nhau nhiều hơn nữa. Cảm ơn bé vì đã luôn là bến đỗ bình yên của anh.",
      sender: "Admin",
      isTimeCapsule: true
    },
    {
      id: "l-3",
      title: "Món quà bất ngờ ngày kỷ niệm",
      date: "2026-06-01",
      unlockDate: "2026-06-06", // Mở vào 06/06/2026 (Quá khứ/Hiện tại - mở được ngay)
      content: "Hôm nay là ngày đặc biệt, anh có một điều bất ngờ muốn dành cho bé. Hãy nhìn vào mắt anh và nghe anh nói nhé: 'Anh muốn được cùng bé đi hết đoạn đường đời còn lại'. Thương bé nhất trên đời!",
      sender: "Admin",
      isTimeCapsule: true
    }
  ],
  diary: [
    { id: "d-1", content: "Hôm nay chở bé đi ăn ốc, bé ăn siêu nhiều mà vẫn kêu béo. Đáng yêu xỉu!", emoji: "🐚", sender: "Admin", date: "2026-06-04T18:30:00" },
    { id: "d-2", content: "Anh người yêu hôm nay làm lành bằng cách mua trà sữa dâu 50% đường ít đá đúng ý mình. Tạm thời tha lỗi nha!", emoji: "🧋", sender: "Partner", date: "2026-06-05T20:15:00" },
    { id: "d-3", content: "Cùng nhau xem bộ phim tình cảm lãng mạn. Bé đã khóc sướt mướt và bắt anh hứa không bao giờ được bỏ rơi bé.", emoji: "🎬", sender: "Admin", date: "2026-06-06T21:00:00" }
  ],
  wishlist: [
    { id: "w-1", title: "Cùng nhau đi ngắm tuyết rơi ở Sapa", completed: false, createdBy: "Partner" },
    { id: "w-2", title: "Học nấu món canh kim chi sườn heo ngon đúng điệu", completed: true, createdBy: "Admin" },
    { id: "w-3", title: "Nuôi một chú mèo Anh lông ngắn tên là Bông", completed: false, createdBy: "Partner" },
    { id: "w-4", title: "Cùng nhau đón giao thừa và đếm ngược", completed: true, createdBy: "Admin" },
    { id: "w-5", title: "Đi du lịch Đà Lạt ngắm hoa dã quỳ", completed: false, createdBy: "Admin" }
  ],
  messages: [
    { id: "m-1", text: "Thương bé hơn cả những gì anh có.", sender: "Admin", date: "2026-06-06" },
    { id: "m-2", text: "Nụ cười của bé là hạnh phúc lớn nhất của đời anh.", sender: "Admin", date: "2026-06-06" },
    { id: "m-3", text: "Luôn bên nhau và không bao giờ buông tay nhé anh!", sender: "Partner", date: "2026-06-06" }
  ]
};

// Hàm tiện ích để tương tác dữ liệu (LocalStorage)
const localDb = {
  get: (key, defaultVal) => {
    const data = localStorage.getItem(`thuongbenhat_${key}`);
    return data ? JSON.parse(data) : defaultVal;
  },
  set: (key, value) => {
    localStorage.setItem(`thuongbenhat_${key}`, JSON.stringify(value));
  },
  init: () => {
    // Tự động di trú dữ liệu cũ sang tên mới "Anh" & "Bé"
    const coupleInfoRaw = localStorage.getItem("thuongbenhat_coupleInfo");
    if (coupleInfoRaw) {
      try {
        const parsed = JSON.parse(coupleInfoRaw);
        let changed = false;
        if (parsed.manName === "Anh Thương" || parsed.manName === "Anh Thương ❤️" || parsed.manName === "Anh Thương Nhất") {
          parsed.manName = "Anh";
          changed = true;
        }
        if (parsed.womanName === "Bé Nhất" || parsed.womanName === "Bé nhất") {
          parsed.womanName = "Bé";
          changed = true;
        }
        if (changed) {
          localStorage.setItem("thuongbenhat_coupleInfo", JSON.stringify(parsed));
        }
      } catch (e) {
        console.error("Lỗi tự động cập nhật tên trong coupleInfo:", e);
      }
    }

    // Nếu chưa khởi tạo hoặc muốn làm mới dữ liệu mock
    if (!localStorage.getItem("thuongbenhat_initialized")) {
      Object.keys(DEFAULT_MOCK_DATA).forEach(key => {
        localDb.set(key, DEFAULT_MOCK_DATA[key]);
      });
      localStorage.setItem("thuongbenhat_initialized", "true");
    }
  }
};

// Khởi tạo cơ sở dữ liệu local
localDb.init();

// Xuất cấu hình và dịch vụ dữ liệu để sử dụng ở các file khác
window.firebaseConfig = firebaseConfig;
window.isFirebaseConfigured = isFirebaseConfigured;
window.localDb = localDb;
window.DEFAULT_MOCK_DATA = DEFAULT_MOCK_DATA;
window.serviceAccount = serviceAccount;
