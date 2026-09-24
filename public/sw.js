//public/sw.js



const CACHE_NAME = "one-alarm-v2";
const APP_SHELL = ["/", "/manifest.webmanifest"];
self.addEventListener("install", (event) => {
event.waitUntil(caches.open(CACHE_NAME).then((cache) =>
cache.addAll(APP_SHELL)));
self.skipWaiting();
});
self.addEventListener("activate", (event) => {
event.waitUntil(
caches.keys().then((keys) => Promise.all(
keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
))
);
self.clients.claim();
});

self.addEventListener("fetch", (event) => {
    if (event.request.method !== "GET") return;

    if (navigator.onLine) return;

    event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request)
    .then((response) => {
    const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
    return response;
})
    .catch(() => caches.match("/")))
    );
});


self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;

  try {
    payload = event.data.json();
  } catch (error) {
    console.error("Invalid push payload:", error);
    return;
  }

  const alarmTime = payload?.time
    ? new Date(payload.time).toLocaleString()
    : "";

  const options = {
    requireInteraction: true,

    body: `${payload?.title ?? "New Alarm"}${alarmTime ? ` at ${alarmTime}` : ""}`,

    icon: "/favicon.svg",

    badge: "/favicon.svg",

    data: {
      url: payload?.url || "/",
      alarmId: payload?.alarmId,
      groupId: payload?.groupId,
    },

    actions: [
      {
        action: "view",
        title: "View",
      },
      {
        action: "close",
        title: "Close",
      },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(
      payload?.title || "One Alarm",
      options
    )
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "close") {
    return;
  }



  const url = event.notification.data?.url || "/";

  event.waitUntil(
    clients.matchAll({
      type: "window",
      includeUncontrolled: true,
    }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }

      return clients.openWindow(url);
    })
  );
});



self.addEventListener('push', (event) => {
  // self.registration.sendNotification('text message', {})

    event.waitUntil(
    self.registration.showNotification(
      payload?.title || "One Alarm",
      {}
    )
  );
})