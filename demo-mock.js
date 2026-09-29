/* CampusPilot static demo: answers the app's /api calls from recorded sample data,
   so the site runs on GitHub Pages with no server. Active only when
   window.__CAMPUSPILOT_STATIC__ is true (set by the Pages workflow). */
(function () {
  if (!window.__CAMPUSPILOT_STATIC__) return;
  var realFetch = window.fetch.bind(window);
  var DATA = null;
  var loading = realFetch("./demo-data.json").then(function (r) { return r.json(); }).then(function (d) { DATA = d; });
  var USERS = {
    "rohan@campuspilot.edu": ["student", "student123"],
    "priya@campuspilot.edu": ["teacher", "teach123"],
    "admin@campuspilot.edu": ["admin", "admin123"],
    "parent@campuspilot.edu": ["parent", "parent123"]
  };
  var role = sessionStorage.getItem("cp_demo_role");
  function reply(status, body, ctype) {
    return new Response(typeof body === "string" ? body : JSON.stringify(body),
      { status: status, headers: { "content-type": ctype || "application/json" } });
  }
  function fromRec(rec) { return rec ? reply(rec.status, rec.body, rec.ctype) : null; }
  window.fetch = async function (input, init) {
    var url = typeof input === "string" ? input : input.url;
    var i = url.indexOf("/api/");
    if (i < 0) return realFetch(input, init);
    await loading;
    var method = ((init && init.method) || (typeof input !== "string" && input.method) || "GET").toUpperCase();
    var path = url.slice(i + 4);
    var pathname = path.split("?")[0];
    var body = {};
    try { body = JSON.parse((init && init.body) || "{}"); } catch (e) {}
    if (method === "POST" && pathname === "/auth/login") {
      var u = USERS[String(body.email || "").toLowerCase()];
      if (!u || u[1] !== body.password) return reply(401, { detail: "Invalid email or password." });
      role = u[0]; sessionStorage.setItem("cp_demo_role", role);
      return fromRec(DATA[role]["POST /auth/login"]);
    }
    if (method === "POST" && (pathname === "/auth/logout" || pathname === "/auth/logout-all")) {
      role = null; sessionStorage.removeItem("cp_demo_role"); return reply(200, { ok: true });
    }
    if (!role) return reply(401, { detail: "Not signed in." });
    var R = DATA[role] || {};
    if (method === "GET") {
      var hit = fromRec(R["GET " + path]);
      if (hit) return hit;
      if (role === "teacher" && /^\/teacher\/attendance\/drafts\/[^/]+$/.test(pathname)) return fromRec(R["GET_draft"]);
      var keys = Object.keys(R).filter(function (k) { return k.indexOf("GET " + pathname) === 0; });
      if (keys.length) return fromRec(R[keys[0]]);
      return reply(404, { detail: "This screen is not part of the static demo." });
    }
    if (role === "teacher" && method === "POST") {
      if (/^\/teacher\/attendance\/drafts$/.test(pathname)) return fromRec(R["POST /attendance/drafts"]);
      if (/\/photos$/.test(pathname)) { await new Promise(function (r) { setTimeout(r, 2500); }); return fromRec(R["POST_photos"]); }
    }
    return reply(200, { ok: true, demo: true, note: "Static demo: changes are not saved." });
  };
  // no real-time server in the static demo: keep the socket "open" and silent
  window.WebSocket = function () {
    var o = new EventTarget(); o.readyState = 1; o.send = function () {}; o.close = function () {};
    setTimeout(function () { var e = new Event("open"); if (o.onopen) o.onopen(e); o.dispatchEvent(e); }, 30);
    return o;
  };
  window.WebSocket.OPEN = 1; window.WebSocket.CLOSED = 3;
  if (navigator.serviceWorker) navigator.serviceWorker.register = function () { return Promise.reject(new Error("off in demo")); };
  window.addEventListener("DOMContentLoaded", function () {
    var b = document.createElement("div");
    b.textContent = "Static demo on sample data. Changes are not saved. Photo OCR shows a recorded result.";
    b.style.cssText = "position:fixed;left:50%;bottom:8px;transform:translateX(-50%);z-index:99999;background:#0f7b6c;color:#fff;font:600 12px Arial;padding:6px 14px;border-radius:14px;opacity:.92;pointer-events:none";
    document.body.appendChild(b);
  });
})();
