
(function () {
  var BASE = "https://site.api.espn.com/apis/site/v2/sports/";
  var LEAGUES = [
    { label: "NFL", url: BASE + "football/nfl/injuries" },
    { label: "NBA", url: BASE + "basketball/nba/injuries" },
    { label: "CFB", url: BASE + "football/college-football/injuries" },
    { label: "CBB", url: BASE + "basketball/mens-college-basketball/injuries" },
    { label: "NHL", url: BASE + "hockey/nhl/injuries" },
    { label: "MLB", url: BASE + "baseball/mlb/injuries" },
    { label: "WNBA", url: BASE + "basketball/wnba/injuries" }
  ];
  var MAX_PER_LEAGUE = 12;
  var MAX_TOTAL = 48;
  var STALE_MS = 365 * 24 * 60 * 60 * 1000;
  var box = document.getElementById("injuryBoard");
  if (!box) return;

  function bandOf(status) {
    var s = String(status).toLowerCase();
    if (s === "out" || s === "out for season") return 0;
    if (s === "doubtful") return 1;
    if (s === "questionable") return 2;
    return 3;
  }
  function chipClass(status) {
    var s = String(status).toLowerCase();
    if (s === "out" || s === "out for season") return "i-chip out";
    if (s === "doubtful") return "i-chip doubt";
    if (s === "questionable") return "i-chip quest";
    return "i-chip other";
  }
  function keepStatus(status) {
    if (!status) return false;
    var s = String(status).toLowerCase();
    return s !== "active" && s !== "suspension";
  }
  function detailOf(e) {
    var d = e.details;
    if (d && d.type) {
      var t = String(d.type);
      if (d.detail && String(d.detail).toLowerCase() !== t.toLowerCase()) {
        t += " · " + d.detail;
      }
      return t;
    }
    var m = String(e.shortComment || "").match(/\(([^)]{2,40})\)/);
    if (m) return m[1].charAt(0).toUpperCase() + m[1].slice(1);
    return "";
  }
  function rowsFrom(data, label) {
    var best = {};
    var order = [];
    ((data && data.injuries) || []).forEach(function (teamObj) {
      (teamObj.injuries || []).forEach(function (e) {
        if (!e || !keepStatus(e.status)) return;
        if (e.date && (Date.now() - new Date(e.date).getTime() > STALE_MS)) return;
        var a = e.athlete || {};
        var name = a.displayName || a.shortName || "";
        if (!name) return;
        var row = {
          league: label,
          name: name,
          team: (a.team && a.team.abbreviation) || "",
          status: String(e.status),
          band: bandOf(e.status),
          detail: detailOf(e),
          date: e.date || ""
        };
        var prev = best[name];
        if (!prev) { best[name] = row; order.push(name); }
        else if (row.band < prev.band ||
                 (row.band === prev.band && row.date > prev.date)) {
          best[name] = row;
        }
      });
    });
    var rows = order.map(function (n) { return best[n]; });
    rows.sort(function (x, y) { return x.band - y.band; });
    return rows.slice(0, MAX_PER_LEAGUE);
  }
  function span(cls, text) {
    var s = document.createElement("span");
    s.className = cls; s.textContent = text;
    return s;
  }
  function buildRow(r) {
    var row = document.createElement("div");
    row.className = "inj-row";
    var l1 = document.createElement("div");
    l1.className = "i-line1";
    l1.appendChild(span("i-tag", r.league));
    l1.appendChild(span("i-name", r.name));
    if (r.team) l1.appendChild(span("i-team", r.team));
    var l2 = document.createElement("div");
    l2.className = "i-line2";
    var chip = span(chipClass(r.status), r.status.toUpperCase());
    l2.appendChild(chip);
    if (r.detail) {
      var d = r.detail.length > 48 ? r.detail.slice(0, 45) + "…" : r.detail;
      l2.appendChild(span("i-detail", d));
    }
    row.appendChild(l1); row.appendChild(l2);
    return row;
  }
  /* Per-league row buckets in fixed LEAGUES order — the same
     progressive paint as the ticker and the board: each league paints
     the moment its own fetch settles; a failed or empty league is
     skipped silently and the section never shows an error. */
  var buckets = LEAGUES.map(function () { return []; });
  var settled = LEAGUES.map(function () { return false; });
  function paint() {
    var all = [];
    buckets.forEach(function (b) { all = all.concat(b); });
    all = all.slice(0, MAX_TOTAL);
    box.textContent = "";
    if (!all.length) {
      var p = document.createElement("p");
      p.className = "board-note-line";
      var done = settled.every(function (s) { return s; });
      p.textContent = done
        ? "No major injuries on the wire right now."
        : "Injury wire loading…";
      box.appendChild(p);
      return;
    }
    all.forEach(function (r) { box.appendChild(buildRow(r)); });
  }
  function load() {
    settled = LEAGUES.map(function () { return false; });
    LEAGUES.forEach(function (lg, i) {
      fetch(lg.url, { headers: { "Accept": "application/json" } })
        .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
        .then(function (data) { buckets[i] = rowsFrom(data, lg.label); })
        .catch(function () { buckets[i] = []; })
        .then(function () { settled[i] = true; paint(); });
    });
  }
  load();
  setInterval(load, 300000);
})();

