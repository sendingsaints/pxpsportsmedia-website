
/* PxP Sports Media — PWA glue (v4): registers the service worker and
   runs the footer install door. Android/Chromium get the real install
   prompt (beforeinstallprompt); iOS Safari has no prompt API, so the
   door reveals the Share -> "Add to Home Screen" instruction instead.
   When the site is already running as the installed app, the door
   hides itself. No popups, no auto-banners. */
(function () {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("/sw.js").catch(function () {});
    });
  }

  var door = document.getElementById("pwa-install");
  var hint = document.getElementById("pwa-ios-hint");
  if (!door) return;

  var standalone = window.matchMedia("(display-mode: standalone)").matches ||
                   window.navigator.standalone === true;
  if (standalone) { door.hidden = true; return; }

  var deferred = null;
  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault();
    deferred = e;
  });
  window.addEventListener("appinstalled", function () {
    door.hidden = true;
    if (hint) hint.hidden = true;
  });

  door.addEventListener("click", function () {
    if (deferred) {
      deferred.prompt();
      deferred.userChoice.then(function () { deferred = null; });
    } else if (hint) {
      hint.hidden = !hint.hidden;
    }
  });
})();
