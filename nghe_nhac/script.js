const $ = document.querySelector.bind(document);
const $$ = document.querySelectorAll.bind(document);

const PLAYER_STORAGE_KEY = "nghe_nhac_player";

const player = $(".player");
const cd = $(".cd");
const heading = $("header h2");
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

const app = {
  currentIndex: 0,
  isPlaying: false,
  isRandom: false,
  isRepeat: false,
  isSeeking: false,
  config: JSON.parse(localStorage.getItem(PLAYER_STORAGE_KEY)) || {},
  songs: [
    {
      name: "Chúng Ta Không Thuộc Về Nhau",
      singer: "Sơn Tùng M-TP",
      path: "./mp3/ChungTaKhongThuocVeNhau.mp3",
      image: "./img/kothuocvenhau.jpg",
    },
    {
      name: "Cứ Đổ Tại Cơn Mưa",
      singer: "Chưa cập nhật",
      path: "./mp3/CuDoTaiConMua.mp3",
      image:
        "./img/Cudotaiconmua.jpg",
    },
    {
      name: "Nếu Ngày Ấy",
      singer: "Soobin Hoàng Sơn",
      path: "./mp3/NeuNgayAy.mp3",
      image:
        "./img/neungayay.jpg",
    },
    {
      name: "Nơi Này Có Anh",
      singer: "Sơn Tùng M-TP",
      path: "./mp3/NoiNayCoAnh.mp3",
      image: "./img/Noinaycoanh.jpg",
    },
    {
      name: "Tình Nhân Ơi",
      singer: "Orange x Binz x Superbrothers",
      path: "./mp3/TinhNhanOi.mp3",
      image: "./img/tinhnhanoi.jpg",
    },
    {
      name: "Vết Mưa",
      singer: "Vũ Cát Tường",
      path: "./mp3/VetMua.mp3",
      image: "./img/vetmua.jpg",
    },
  ],

  setConfig(key, value) {
    this.config[key] = value;
    localStorage.setItem(PLAYER_STORAGE_KEY, JSON.stringify(this.config));
  },

  render() {
    const htmls = this.songs.map((song, index) => {
      return `
        <div class="song ${index === this.currentIndex ? "active" : ""}" data-index="${index}">
          <div class="thumb" style="background-image: url('${song.image}')"></div>
          <div class="body">
            <h3 class="title">${song.name}</h3>
            <p class="author">${song.singer}</p>
          </div>
          <div class="option">
            <i class="fas fa-ellipsis-h"></i>
          </div>
        </div>
      `;
    });
    playlist.innerHTML = htmls.join("");
  },

  formatTime(seconds) {
    if (!Number.isFinite(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  },

  defineProperties() {
    Object.defineProperty(this, "currentSong", {
      get() {
        return this.songs[this.currentIndex];
      },
    });
  },

  handleEvents() {
    const _this = this;
    const cdWidth = cd.offsetWidth;

    const cdThumbAnimate = cdThumb.animate(
      [{ transform: "rotate(360deg)" }],
      {
        duration: 12000,
        iterations: Infinity,
      }
    );
    cdThumbAnimate.pause();

    document.onscroll = function () {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const newCdWidth = cdWidth - scrollTop;
      const width = Math.max(newCdWidth, 0);

      cd.style.width = width + "px";
      cd.style.opacity = width / cdWidth;
    };

    playBtn.onclick = function () {
      if (_this.isPlaying) {
        audio.pause();
      } else {
        audio.play();
      }
    };

    audio.onplay = function () {
      _this.isPlaying = true;
      player.classList.add("playing");
      cdThumbAnimate.play();
    };

    audio.onpause = function () {
      _this.isPlaying = false;
      player.classList.remove("playing");
      cdThumbAnimate.pause();
    };

    audio.ontimeupdate = function () {
      if (audio.duration && !_this.isSeeking) {
        const progressPercent = Math.floor(
          (audio.currentTime / audio.duration) * 100
        );
        progress.value = progressPercent;
        currentTimeText.textContent = _this.formatTime(audio.currentTime);
      }
    };

    progress.oninput = function (e) {
      if (audio.duration) {
        _this.isSeeking = true;
        const seekTime = (audio.duration / 100) * e.target.value;
        currentTimeText.textContent = _this.formatTime(seekTime);
      }
    };

    progress.onchange = function (e) {
      if (audio.duration) {
        const seekTime = (audio.duration / 100) * e.target.value;
        audio.currentTime = seekTime;
        _this.isSeeking = false;
      }
    };

    nextBtn.onclick = function () {
      if (_this.isRandom) {
        _this.playRandomSong();
      } else {
        _this.nextSong();
      }
      audio.play();
      _this.render();
      _this.scrollToActiveSong();
    };

    prevBtn.onclick = function () {
      if (_this.isRandom) {
        _this.playRandomSong();
      } else {
        _this.prevSong();
      }
      audio.play();
      _this.render();
      _this.scrollToActiveSong();
    };

    randomBtn.onclick = function () {
      _this.isRandom = !_this.isRandom;
      _this.setConfig("isRandom", _this.isRandom);
      randomBtn.classList.toggle("active", _this.isRandom);
    };

    repeatBtn.onclick = function () {
      _this.isRepeat = !_this.isRepeat;
      _this.setConfig("isRepeat", _this.isRepeat);
      repeatBtn.classList.toggle("active", _this.isRepeat);
    };

    audio.onended = function () {
      if (_this.isRepeat) {
        audio.play();
      } else {
        nextBtn.click();
      }
    };

    playlist.onclick = function (e) {
      const songNode = e.target.closest(".song:not(.active)");
      if (songNode || e.target.closest(".option")) {
        if (songNode) {
          _this.currentIndex = Number(songNode.dataset.index);
          _this.loadCurrentSong();
          _this.render();
          audio.play();
        }
      }
    };

    audio.onloadedmetadata = function () {
      durationText.textContent = _this.formatTime(audio.duration);
    };
  },

  loadCurrentSong() {
    heading.textContent = this.currentSong.name;
    cdThumb.style.backgroundImage = `url('${this.currentSong.image}')`;
    audio.src = this.currentSong.path;
    progress.value = 0;
    currentTimeText.textContent = "0:00";
    durationText.textContent = "0:00";
    this.isSeeking = false;
  },

  loadConfig() {
    this.isRandom = this.config.isRandom ?? false;
    this.isRepeat = this.config.isRepeat ?? false;
  },

  nextSong() {
    this.currentIndex++;
    if (this.currentIndex >= this.songs.length) {
      this.currentIndex = 0;
    }
    this.loadCurrentSong();
  },

  prevSong() {
    this.currentIndex--;
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
    }, 200);
  },

  start() {
    this.loadConfig();

    this.defineProperties();

    this.handleEvents();

    this.loadCurrentSong();

    this.render();

    randomBtn.classList.toggle("active", this.isRandom);
    repeatBtn.classList.toggle("active", this.isRepeat);
  },
};

app.start();
