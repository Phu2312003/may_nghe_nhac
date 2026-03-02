const CACHE_NAME = "nghe-nhac-cache-v4";
const FONT_CACHE_NAME = "nghe-nhac-font-cache-v1";
const APP_SHELL = [
  "./",
  "./index.html",
  "./main.html",
  "./css/style.css",
  "./js/script.js",
  "./manifest.webmanifest",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
  "./assets/images/kothuocvenhau.jpg",
  "./assets/images/Cudotaiconmua.jpg",
  "./assets/images/neungayay.jpg",
  "./assets/images/Noinaycoanh.jpg",
  "./assets/images/tinhnhanoi.jpg",
  "./assets/images/vetmua.jpg",
  "./assets/audio/ChungTaKhongThuocVeNhau.mp3",
  "./assets/audio/CuDoTaiConMua.mp3",
  "./assets/audio/NeuNgayAy.mp3",
  "./assets/audio/NoiNayCoAnh.mp3",
  "./assets/audio/TinhNhanOi.mp3",
  "./assets/audio/VetMua.mp3"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME && key !== FONT_CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  const requestUrl = new URL(event.request.url);

  const isGoogleFontRequest =
    requestUrl.origin === "https://fonts.googleapis.com" ||
    requestUrl.origin === "https://fonts.gstatic.com";

  if (isGoogleFontRequest) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(event.request).then((networkResponse) => {
          if (
            networkResponse &&
            (networkResponse.ok || networkResponse.type === "opaque")
          ) {
            caches
              .open(FONT_CACHE_NAME)
              .then((cache) => cache.put(event.request, networkResponse.clone()));
          }

          return networkResponse;
        });
      })
    );
    return;
  }

  if (requestUrl.origin !== self.location.origin) {
    return;
  }

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => caches.match("./index.html"))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request)
        .then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200) {
            return networkResponse;
          }

          const responseToCache = networkResponse.clone();
          caches
            .open(CACHE_NAME)
            .then((cache) => cache.put(event.request, responseToCache));

          return networkResponse;
        })
        .catch(() => new Response("", { status: 503, statusText: "Ngoại tuyến" }));
    })
  );
});
