
(function () {
  var BASE = "https://site.api.espn.com/apis/site/v2/sports/";
  var LEAGUES = [
    { label: "NFL", url: BASE + "football/nfl/news?limit=8" },
    { label: "NBA", url: BASE + "basketball/nba/news?limit=8" },
    { label: "CFB", url: BASE + "football/college-football/news?limit=8" },
    { label: "CBB", url: BASE + "basketball/mens-college-basketball/news?limit=8" },
    { label: "NHL", url: BASE + "hockey/nhl/news?limit=8" }
  ];
  var MAX_TOTAL = 12;
  var box = document.getElementById("newsRiver");
  if (!box) return;

  function relTime(ts) {
    var mins = Math.max(1, Math.round((Date.now() - ts) / 60000));
    if (mins < 60) return mins + "m ago";
    var hrs = Math.round(mins / 60);
    if (hrs < 24) return hrs + "h ago";
    return Math.round(hrs / 24) + "d ago";
  }
  function articlesFrom(data, label) {
    var out = [];
    ((data && data.articles) || []).forEach(function (a) {
      if (!a || !a.headline) return;
      var href = a.links && a.links.web && a.links.web.href;
      if (!href) return;
      var ts = a.published ? new Date(a.published).getTime() : 0;
      out.push({ league: label, headline: a.headline, href: href, ts: ts });
    });
    return out;
  }
  function buildRow(item, i) {
    var a = document.createElement("a");
    a.href = item.href; a.target = "_blank"; a.rel = "noopener";
    var tag = document.createElement("span");
    tag.className = i % 2 === 0 ? "r-tag" : "r-tag alt";
    tag.textContent = item.league;
    var main = document.createElement("span");
    main.className = "r-main";
    var title = document.createElement("span");
    title.className = "r-title"; title.textContent = item.headline;
    var stamp = document.createElement("span");
    stamp.className = "r-stamp";
    stamp.textContent = item.ts ? relTime(item.ts) + " · ESPN" : "ESPN";
    main.appendChild(title); main.appendChild(stamp);
    a.appendChild(tag); a.appendChild(main);
    return a;
  }
  /* Per-league article buckets; paint() merges everything that has
     landed, sorts newest-first, and renders the top 12 — the same
     progressive paint as the other wires. */
  var buckets = LEAGUES.map(function () { return []; });
  var settled = LEAGUES.map(function () { return false; });
  function paint() {
    var all = [];
    buckets.forEach(function (b) { all = all.concat(b); });
    all.sort(function (x, y) { return y.ts - x.ts; });
    all = all.slice(0, MAX_TOTAL);
    box.textContent = "";
    if (!all.length) {
      var p = document.createElement("p");
      p.className = "board-note-line";
      var done = settled.every(function (s) { return s; });
      p.textContent = done
        ? "The wire is quiet right now — check back."
        : "Headlines loading…";
      box.appendChild(p);
      return;
    }
    all.forEach(function (item, i) { box.appendChild(buildRow(item, i)); });
  }
  function load() {
    settled = LEAGUES.map(function () { return false; });
    LEAGUES.forEach(function (lg, i) {
      fetch(lg.url, { headers: { "Accept": "application/json" } })
        .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
        .then(function (data) { buckets[i] = articlesFrom(data, lg.label); })
        .catch(function () { buckets[i] = []; })
        .then(function () { settled[i] = true; paint(); });
    });
  }
  load();
  setInterval(load, 300000);
})();

