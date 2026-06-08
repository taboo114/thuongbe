// Hiệu ứng trái tim bay nhẹ nhàng ở nền trang web
class HeartBackground {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.hearts = [];
    this.bursts = [];
    this.maxHearts = 25; // Giới hạn số lượng để mượt mà trên điện thoại
    this.colors = [
      'rgba(255, 182, 193, opacity)', // Pastel pink
      'rgba(255, 105, 180, opacity)', // Hot pink nhạt
      'rgba(230, 230, 250, opacity)', // Lavender
      'rgba(216, 191, 216, opacity)', // Thistle
      'rgba(255, 218, 233, opacity)'  // Sweet pink
    ];

    this.init();
    this.animate();
    this.bindEvents();
  }

  init() {
    this.resizeCanvas();
    // Tạo ban đầu một số trái tim rải rác trên màn hình
    for (let i = 0; i < this.maxHearts; i++) {
      this.hearts.push(this.createHeart(true));
    }
  }

  resizeCanvas() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  createHeart(randomY = false) {
    const size = Math.random() * 14 + 8; // Kích thước từ 8px đến 22px
    return {
      x: Math.random() * this.canvas.width,
      y: randomY ? Math.random() * this.canvas.height : this.canvas.height + size * 2,
      size: size,
      speedY: Math.random() * 0.8 + 0.4, // Bay lên chậm rãi
      speedX: Math.random() * 0.4 - 0.2, // Lắc nhẹ sang hai bên
      opacity: Math.random() * 0.5 + 0.1, // Độ mờ
      color: this.colors[Math.floor(Math.random() * this.colors.length)],
      swayOffset: Math.random() * Math.PI * 2 // Lệch pha của sóng hình sin
    };
  }

  createBurstHeart(x, y) {
    const size = Math.random() * 10 + 6;
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 3 + 1;
    return {
      x: x,
      y: y,
      size: size,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 1, // Xu hướng bay lên một chút
      opacity: 1,
      color: this.colors[Math.floor(Math.random() * this.colors.length)],
      gravity: 0.05
    };
  }

  drawHeartShape(x, y, size) {
    this.ctx.beginPath();
    // Vẽ trái tim dùng Bezier Curves
    this.ctx.moveTo(x, y);
    this.ctx.bezierCurveTo(x - size / 2, y - size / 2, x - size, y + size / 3, x, y + size);
    this.ctx.bezierCurveTo(x + size, y + size / 3, x + size / 2, y - size / 2, x, y);
    this.ctx.closePath();
  }

  animate() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // 1. Cập nhật và vẽ các hạt trái tim bay lên nền
    for (let i = 0; i < this.hearts.length; i++) {
      const h = this.hearts[i];
      h.y -= h.speedY;
      h.x += h.speedX + Math.sin(h.swayOffset + h.y * 0.01) * 0.3; // Lắc qua lại theo hình sin
      
      // Vẽ
      this.ctx.save();
      this.ctx.fillStyle = h.color.replace('opacity', h.opacity.toString());
      this.drawHeartShape(h.x, h.y, h.size);
      this.ctx.fill();
      this.ctx.restore();

      // Nếu bay khỏi màn hình thì reset xuống dưới
      if (h.y < -h.size * 2 || h.x < -h.size * 2 || h.x > this.canvas.width + h.size * 2) {
        this.hearts[i] = this.createHeart(false);
      }
    }

    // 2. Cập nhật và vẽ các hạt nổ (bursts) khi nhấp chuột
    for (let i = this.bursts.length - 1; i >= 0; i--) {
      const b = this.bursts[i];
      b.x += b.vx;
      b.y += b.vy;
      b.vy += b.gravity;
      b.opacity -= 0.02;

      if (b.opacity <= 0) {
        this.bursts.splice(i, 1);
        continue;
      }

      this.ctx.save();
      this.ctx.fillStyle = b.color.replace('opacity', b.opacity.toString());
      this.drawHeartShape(b.x, b.y, b.size);
      this.ctx.fill();
      this.ctx.restore();
    }

    requestAnimationFrame(() => this.animate());
  }

  bindEvents() {
    // Thay đổi kích thước màn hình
    window.addEventListener('resize', () => this.resizeCanvas());

    // Nhấp chuột hoặc chạm để nổ trái tim
    const triggerBurst = (e) => {
      // Bỏ qua nếu nhấp vào các nút bấm hoặc ô nhập liệu
      const target = e.target;
      if (target.tagName === 'BUTTON' || target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.closest('a') || target.closest('.nav-item')) {
        return;
      }
      
      const x = e.clientX || (e.touches && e.touches[0].clientX);
      const y = e.clientY || (e.touches && e.touches[0].clientY);
      
      if (x && y) {
        // Tạo ra 8-12 trái tim nhỏ nổ tung
        const count = Math.floor(Math.random() * 5) + 8;
        for (let i = 0; i < count; i++) {
          this.bursts.push(this.createBurstHeart(x, y));
        }
      }
    };

    window.addEventListener('click', triggerBurst);
    window.addEventListener('touchstart', triggerBurst, { passive: true });
  }

  triggerBurstAt(x, y, count = 15) {
    for (let i = 0; i < count; i++) {
      this.bursts.push(this.createBurstHeart(x, y));
    }
  }
}

// Khởi chạy khi DOM load xong
document.addEventListener('DOMContentLoaded', () => {
  window.heartsBackground = new HeartBackground('hearts-canvas');
});
