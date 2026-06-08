// Trình quản lý nhạc nền tình yêu
class LoveMusicPlayer {
  constructor(audioUrl) {
    this.audioUrl = audioUrl || 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3'; // Nhạc nhẹ nhàng thư giãn làm mặc định
    this.isPlaying = false;
    this.audio = null;
    this.musicBtn = null;
    this.disc = null;
    
    // Khởi tạo sau khi DOM sẵn sàng
    document.addEventListener('DOMContentLoaded', () => this.init());
  }

  init() {
    // 1. Tạo thẻ audio ẩn
    this.audio = new Audio(this.audioUrl);
    this.audio.loop = true;
    this.audio.volume = 0.5; // Âm lượng vừa phải cho nhạc nền

    // 2. Tìm hoặc tạo nút điều khiển nhạc
    this.musicBtn = document.getElementById('music-control-btn');
    if (!this.musicBtn) {
      this.createPlayerMarkup();
    } else {
      this.disc = this.musicBtn.querySelector('.music-disc');
    }

    // 3. Khôi phục trạng thái nhạc nếu người dùng đã bật trước đó (không tự động chạy theo yêu cầu)
    // Trình duyệt chặn autoplay nên chúng ta sẽ đợi tương tác đầu tiên của người dùng
    this.bindEvents();
  }

  createPlayerMarkup() {
    // Tạo cấu trúc HTML cho đĩa nhạc ở góc màn hình
    const container = document.createElement('div');
    container.id = 'music-control-btn';
    container.className = 'music-player-widget';
    container.setAttribute('title', 'Nhạc nền tình yêu');
    container.innerHTML = `
      <div class="music-disc">
        <div class="music-disc-center"></div>
        <svg class="music-note-icon" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
        </svg>
      </div>
      <div class="music-tooltip">Bật nhạc nền</div>
    `;
    document.body.appendChild(container);
    this.musicBtn = container;
    this.disc = container.querySelector('.music-disc');
  }

  bindEvents() {
    this.musicBtn.addEventListener('click', () => this.togglePlay());

    // Dừng nhạc nếu có cuộc gọi hoặc tab ẩn đi để tiết kiệm pin
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.isPlaying) {
        this.audio.pause();
        this.disc.classList.remove('playing');
      } else if (!document.hidden && this.isPlaying) {
        this.audio.play().catch(err => console.log('Autoplay blocked:', err));
        this.disc.classList.add('playing');
      }
    });
  }

  togglePlay() {
    if (this.isPlaying) {
      this.audio.pause();
      this.disc.classList.remove('playing');
      this.musicBtn.querySelector('.music-tooltip').textContent = 'Bật nhạc';
      this.isPlaying = false;
    } else {
      this.audio.play()
        .then(() => {
          this.disc.classList.add('playing');
          this.musicBtn.querySelector('.music-tooltip').textContent = 'Tắt nhạc';
          this.isPlaying = true;
        })
        .catch(err => {
          console.warn('Không thể phát nhạc: ', err);
          alert('Vui lòng cấp quyền phát âm thanh trên trình duyệt của bạn!');
        });
    }
  }

  setVolume(val) {
    if (this.audio && val >= 0 && val <= 1) {
      this.audio.volume = val;
    }
  }

  changeTrack(newUrl) {
    if (!this.audio) return;
    const wasPlaying = this.isPlaying;
    this.audio.src = newUrl;
    if (wasPlaying) {
      this.audio.play().catch(err => console.log(err));
    }
  }
}

// Khởi tạo player toàn cục (có thể đổi link mp3 lãng mạn tại đây)
window.loveMusic = new LoveMusicPlayer('https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3');
