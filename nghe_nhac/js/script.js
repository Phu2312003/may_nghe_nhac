const $ = document.querySelector.bind(document);

const PLAYER_STORAGE_KEY = "nghe_nhac_player";
const SAVE_PROGRESS_STEP = 5;

function getStoredConfig() {
  const rawValue = localStorage.getItem(PLAYER_STORAGE_KEY);

  if (!rawValue) {
    return {};
  }

  try {
    return JSON.parse(rawValue) || {};
  } catch {
    localStorage.removeItem(PLAYER_STORAGE_KEY);
    return {};
  }
}

const player = $(".player");
const cd = $(".cd");
const heading = $(".header-copy h2");
const artistName = $(".artist-name");
const queueCurrent = $(".queue-current");
const modeIndicator = $(".mode-indicator");
const playlistCount = $(".playlist-count");
const cdThumb = $(".cd-thumb");
const audio = $("#audio");
const playBtn = $(".btn-toggle-play");
const progress = $("#progress");
const currentTimeText = $(".current-time");
const durationText = $(".duration");
const prevBtn = $(".btn-prev");
const nextBtn = $(".btn-next");
const randomBtn = $(".btn-random");
const repeatBtn = $(".btn-repeat");
const playlist = $(".playlist");
const appStatus = $(".app-status");

const app = {
  currentIndex: 0,
  isPlaying: false,
  isRandom: false,
  isRepeat: false,
  isSeeking: false,
  pendingResumeTime: 0,
  lastSavedSecond: -1,
  isAppCached: false,
  config: getStoredConfig(),
  songs: [
    {
      name: "Chúng Ta Không Thuộc Về Nhau",
      singer: "Sơn Tùng M-TP",
      path: "./assets/audio/ChungTaKhongThuocVeNhau.mp3",
      image: "./assets/images/kothuocvenhau.jpg",
    },
    {
      name: "Cứ Đổ Tại Cơn Mưa",
      singer: "Chưa cập nhật",
      path: "./assets/audio/CuDoTaiConMua.mp3",
      image: "./assets/images/Cudotaiconmua.jpg",
    },
    {
      name: "Nếu Ngày Ấy",
      singer: "Soobin Hoàng Sơn",
      path: "./assets/audio/NeuNgayAy.mp3",
      image: "./assets/images/neungayay.jpg",
    },
    {
      name: "Nơi Này Có Anh",
      singer: "Sơn Tùng M-TP",
      path: "./assets/audio/NoiNayCoAnh.mp3",
      image: "./assets/images/Noinaycoanh.jpg",
    },
    {
      name: "Tình Nhân Ơi",
      singer: "Orange x Binz x Superbrothers",
      path: "./assets/audio/TinhNhanOi.mp3",
      image: "./assets/images/tinhnhanoi.jpg",
    },
    {
      name: "Vết Mưa",
      singer: "Vũ Cát Tường",
      path: "./assets/audio/VetMua.mp3",
      image: "./assets/images/vetmua.jpg",
    },
  ],

  saveConfig() {
    localStorage.setItem(PLAYER_STORAGE_KEY, JSON.stringify(this.config));
  },

  setConfig(key, value) {
    this.config[key] = value;
    this.saveConfig();
  },

  setStatus(message, state = "pending") {
    if (!appStatus) {
      return;
    }

    appStatus.textContent = message;
    appStatus.dataset.state = state;
  },

  getModeLabel() {
    if (this.isRandom && this.isRepeat) {
      return "Ngẫu nhiên + lặp lại";
    }

    if (this.isRandom) {
      return "Chế độ ngẫu nhiên";
    }

    if (this.isRepeat) {
      return "Chế độ lặp lại";
    }

    return "Chế độ thường";
  },

  updateStatusByConnection() {
    if (window.location.protocol === "file:") {
      this.setStatus("Hãy dùng localhost hoặc HTTPS để bật chế độ ngoại tuyến", "warning");
      return;
    }

    if (!navigator.onLine) {
      this.setStatus("Đang ở chế độ ngoại tuyến", "warning");
      return;
    }

    if (this.isAppCached) {
      this.setStatus("Bộ nhớ đệm ngoại tuyến đã sẵn sàng", "success");
      return;
    }

    this.setStatus("Đang chuẩn bị bộ nhớ đệm ngoại tuyến...", "pending");
  },

  updateDisplayMeta() {
    if (artistName) {
      artistName.textContent = this.currentSong?.singer || "Chưa chọn bài hát";
    }

    if (queueCurrent) {
      const trackNumber = String(this.currentIndex + 1).padStart(2, "0");
      const totalTracks = String(this.songs.length).padStart(2, "0");
      queueCurrent.textContent = `${trackNumber} / ${totalTracks}`;
    }

    if (playlistCount) {
      playlistCount.textContent = `${this.songs.length} bài hát`;
    }

    if (modeIndicator) {
      modeIndicator.textContent = this.getModeLabel();
    }

    randomBtn.classList.toggle("active", this.isRandom);
    repeatBtn.classList.toggle("active", this.isRepeat);
    randomBtn.setAttribute("aria-pressed", String(this.isRandom));
    repeatBtn.setAttribute("aria-pressed", String(this.isRepeat));
    playBtn.setAttribute("aria-pressed", String(this.isPlaying));
  },

  registerServiceWorker() {
    if (!("serviceWorker" in navigator)) {
      this.setStatus("Trình duyệt này không hỗ trợ lưu bộ nhớ đệm ngoại tuyến", "error");
      return;
    }

    if (window.location.protocol === "file:") {
      this.setStatus("Hãy dùng localhost hoặc HTTPS để bật chế độ ngoại tuyến", "warning");
      return;
    }

    window.addEventListener("online", () => this.updateStatusByConnection());
    window.addEventListener("offline", () => this.updateStatusByConnection());
    this.updateStatusByConnection();

    navigator.serviceWorker
      .register("./sw.js")
      .then((registration) => {
        registration.addEventListener("updatefound", () => {
          this.isAppCached = false;
          this.setStatus("Đang cập nhật bộ nhớ đệm ngoại tuyến...", "pending");
        });

        return navigator.serviceWorker.ready;
      })
      .then(() => {
        this.isAppCached = true;
        this.updateStatusByConnection();
      })
      .catch(() => {
        this.setStatus("Thiết lập bộ nhớ đệm ngoại tuyến thất bại", "error");
      });
  },

  render() {
    const htmls = this.songs.map((song, index) => {
      const isActive = index === this.currentIndex;
      const trackNumber = String(index + 1).padStart(2, "0");

      return `
        <div class="song ${isActive ? "active" : ""}" data-index="${index}">
          <span class="song-index">${trackNumber}</span>
          <div class="thumb" style="background-image: url('${song.image}')"></div>
          <div class="body">
            <div class="song-topline">
              <h3 class="title">${song.name}</h3>
              ${isActive ? '<span class="song-state">Đang phát</span>' : ""}
            </div>
            <p class="author">${song.singer}</p>
          </div>
          <div class="option" aria-hidden="true">Mở</div>
        </div>
      `;
    });

    playlist.innerHTML = htmls.join("");
    this.updateDisplayMeta();
  },

  formatTime(seconds) {
    if (!Number.isFinite(seconds)) {
      return "0:00";
    }

    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);

    return `${mins}:${secs.toString().padStart(2, "0")}`;
  },

  persistPlaybackState() {
    this.config.currentIndex = this.currentIndex;
    this.config.currentTime = Math.floor(audio.currentTime || 0);
    this.saveConfig();
  },

  storeSelectedSong() {
    this.config.currentIndex = this.currentIndex;
    this.config.currentTime = 0;
    this.saveConfig();
    this.lastSavedSecond = -1;
  },

  defineProperties() {
    Object.defineProperty(this, "currentSong", {
      get() {
        return this.songs[this.currentIndex];
      },
    });
  },

  handleEvents() {
    const cdThumbAnimate = cdThumb.animate(
      [
        { transform: "rotate(0deg)" },
        { transform: "rotate(360deg)" },
      ],
      {
        duration: 12000,
        iterations: Infinity,
      }
    );

    cdThumbAnimate.pause();

    document.addEventListener("scroll", () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const scale = Math.max(0.84, 1 - scrollTop / 900);

      cd.style.transform = `scale(${scale})`;
    });

    playBtn.addEventListener("click", () => {
      if (this.isPlaying) {
        audio.pause();
        return;
      }

      audio.play().catch(() => {
        this.setStatus("Hãy nhấn phát thêm lần nữa để tiếp tục", "warning");
      });
    });

    audio.addEventListener("play", () => {
      this.isPlaying = true;
      player.classList.add("playing");
      cdThumbAnimate.play();
      this.updateDisplayMeta();
    });

    audio.addEventListener("pause", () => {
      this.isPlaying = false;
      player.classList.remove("playing");
      cdThumbAnimate.pause();
      this.persistPlaybackState();
      this.updateDisplayMeta();
    });

    audio.addEventListener("timeupdate", () => {
      if (audio.duration && !this.isSeeking) {
        const progressPercent = Math.floor(
          (audio.currentTime / audio.duration) * 100
        );

        progress.value = progressPercent;
        currentTimeText.textContent = this.formatTime(audio.currentTime);
      }

      const currentSecond = Math.floor(audio.currentTime || 0);
      const shouldSaveProgress =
        currentSecond > 0 &&
        currentSecond % SAVE_PROGRESS_STEP === 0 &&
        currentSecond !== this.lastSavedSecond;

      if (shouldSaveProgress) {
        this.lastSavedSecond = currentSecond;
        this.persistPlaybackState();
      }
    });

    progress.addEventListener("input", (event) => {
      if (!audio.duration) {
        return;
      }

      this.isSeeking = true;

      const seekTime = (audio.duration / 100) * Number(event.target.value);
      currentTimeText.textContent = this.formatTime(seekTime);
    });

    progress.addEventListener("change", (event) => {
      if (!audio.duration) {
        return;
      }

      const seekTime = (audio.duration / 100) * Number(event.target.value);
      audio.currentTime = seekTime;
      this.isSeeking = false;
      this.persistPlaybackState();
    });

    nextBtn.addEventListener("click", () => {
      if (this.isRandom) {
        this.playRandomSong();
      } else {
        this.nextSong();
      }

      this.storeSelectedSong();
      this.render();
      this.scrollToActiveSong();
      audio.play().catch(() => {
        this.setStatus("Đã sẵn sàng phát bài tiếp theo", "warning");
      });
    });

    prevBtn.addEventListener("click", () => {
      if (this.isRandom) {
        this.playRandomSong();
      } else {
        this.prevSong();
      }

      this.storeSelectedSong();
      this.render();
      this.scrollToActiveSong();
      audio.play().catch(() => {
        this.setStatus("Đã sẵn sàng phát bài trước", "warning");
      });
    });

    randomBtn.addEventListener("click", () => {
      this.isRandom = !this.isRandom;
      this.setConfig("isRandom", this.isRandom);
      this.updateDisplayMeta();
    });

    repeatBtn.addEventListener("click", () => {
      this.isRepeat = !this.isRepeat;
      this.setConfig("isRepeat", this.isRepeat);
      this.updateDisplayMeta();
    });

    audio.addEventListener("ended", () => {
      if (this.isRepeat) {
        audio.currentTime = 0;
        audio.play().catch(() => {
          this.setStatus("Hãy nhấn phát để nghe lại bài này", "warning");
        });
        return;
      }

      nextBtn.click();
    });

    playlist.addEventListener("click", (event) => {
      const optionNode = event.target.closest(".option");
      const songNode = event.target.closest(".song:not(.active)");

      if (optionNode || !songNode) {
        return;
      }

      this.currentIndex = Number(songNode.dataset.index);
      this.loadCurrentSong();
      this.storeSelectedSong();
      this.render();

      audio.play().catch(() => {
        this.setStatus("Đã chọn bài hát. Hãy nhấn phát để tiếp tục", "warning");
      });
    });

    audio.addEventListener("loadedmetadata", () => {
      durationText.textContent = this.formatTime(audio.duration);

      if (this.pendingResumeTime > 0) {
        const resumeTime = Math.min(
          this.pendingResumeTime,
          Math.max(audio.duration - 1, 0)
        );

        audio.currentTime = resumeTime;
        currentTimeText.textContent = this.formatTime(resumeTime);
        progress.value = Math.floor((resumeTime / audio.duration) * 100);
        this.pendingResumeTime = 0;
        this.persistPlaybackState();
      }
    });

    audio.addEventListener("error", () => {
      this.setStatus("Không thể tải bài hát này", "error");
    });

    window.addEventListener("beforeunload", () => {
      this.persistPlaybackState();
    });

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") {
        this.persistPlaybackState();
      }
    });

    document.addEventListener("keydown", (event) => {
      const isTypingTarget =
        event.target instanceof HTMLElement &&
        ["INPUT", "TEXTAREA"].includes(event.target.tagName);

      if (isTypingTarget) {
        return;
      }

      if (event.code === "Space") {
        event.preventDefault();
        playBtn.click();
      }

      if (event.code === "ArrowRight") {
        nextBtn.click();
      }

      if (event.code === "ArrowLeft") {
        prevBtn.click();
      }
    });
  },

  loadCurrentSong() {
    heading.textContent = this.currentSong.name;
    artistName.textContent = this.currentSong.singer;
    cdThumb.style.backgroundImage = `url('${this.currentSong.image}')`;
    audio.src = this.currentSong.path;
    progress.value = 0;
    currentTimeText.textContent = "0:00";
    durationText.textContent = "0:00";
    this.isSeeking = false;
    this.lastSavedSecond = -1;
    this.updateDisplayMeta();
  },

  loadConfig() {
    this.isRandom = this.config.isRandom ?? false;
    this.isRepeat = this.config.isRepeat ?? false;

    const savedIndex = Number(this.config.currentIndex);
    const hasValidIndex =
      Number.isInteger(savedIndex) &&
      savedIndex >= 0 &&
      savedIndex < this.songs.length;

    this.currentIndex = hasValidIndex ? savedIndex : 0;
    this.pendingResumeTime = Math.max(Number(this.config.currentTime) || 0, 0);
  },

  nextSong() {
    this.currentIndex += 1;

    if (this.currentIndex >= this.songs.length) {
      this.currentIndex = 0;
    }

    this.loadCurrentSong();
  },

  prevSong() {
    this.currentIndex -= 1;

    if (this.currentIndex < 0) {
      this.currentIndex = this.songs.length - 1;
    }

    this.loadCurrentSong();
  },

  playRandomSong() {
    let newIndex;

    do {
      newIndex = Math.floor(Math.random() * this.songs.length);
    } while (newIndex === this.currentIndex && this.songs.length > 1);

    this.currentIndex = newIndex;
    this.loadCurrentSong();
  },

  scrollToActiveSong() {
    setTimeout(() => {
      $(".song.active")?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 180);
  },

  start() {
    this.loadConfig();
    this.defineProperties();
    this.handleEvents();
    this.loadCurrentSong();
    this.render();
    this.registerServiceWorker();
    this.updateDisplayMeta();
  },
};

app.start();
