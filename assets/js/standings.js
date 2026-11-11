
(function () {
  var BASE = "https://site.api.espn.com/apis/v2/sports/";
  var LEAGUES = [
    { label: "NFL", url: BASE + "football/nfl/standings",
      cols: [["wins", "W"], ["losses", "L"], ["ties", "T"],
             ["winPercent", "PCT"], ["gamesBehind", "GB"], ["streak", "STRK"]] },
    { label: "NBA", url: BASE + "basketball/nba/standings",
      cols: [["wins", "W"], ["losses", "L"], ["winPercent", "PCT"],
             ["gamesBehind", "GB"], ["streak", "STRK"]] },
    { label: "CFB", url: BASE + "football/college-football/standings",
      cols: [["overall", "REC"], ["pointsFor", "PF"], ["pointsAgainst", "PA"],
             ["pointDifferential", "DIFF"], ["streak", "STRK"]] },
    { label: "CBB", url: BASE + "basketball/mens-college-basketball/standings",
      cols: [["wins", "W"], ["losses", "L"], ["winPercent", "PCT"],
             ["gamesBehind", "GB"]] },
    { label: "NHL", url: BASE + "hockey/nhl/standings",
      cols: [["gamesPlayed", "GP"], ["wins", "W"], ["losses", "L"],
             ["otLosses", "OT"], ["points", "PTS"], ["streak", "STRK"]] },
    { label: "MLB", url: BASE + "baseball/mlb/standings",
      cols: [["wins", "W"], ["losses", "L"], ["winPercent", "PCT"],
             ["gamesBehind", "GB"], ["streak", "STRK"]] },
    { label: "WNBA", url: BASE + "basketball/wnba/standings",
      cols: [["wins", "W"], ["losses", "L"], ["winPercent", "PCT"],
             ["gamesBehind", "GB"], ["streak", "STRK"]] },
    { label: "EPL", url: BASE + "soccer/eng.1/standings",
      cols: [["gamesPlayed", "P"], ["wins", "W"], ["ties", "D"], ["losses", "L"],
             ["pointsFor", "GF"], ["pointsAgainst", "GA"],
             ["pointDifferential", "GD"], ["points", "PTS"]] },
    { label: "MLS", url: BASE + "soccer/usa.1/standings",
      cols: [["gamesPlayed", "P"], ["wins", "W"], ["ties", "D"], ["losses", "L"],
             ["pointsFor", "GF"], ["pointsAgainst", "GA"],
             ["pointDifferential", "GD"], ["points", "PTS"]] }
  ];
  var root = document.getElementById("standingsRoot");
  if (!root) return;

  function statMap(entry) {
    var m = {};
    (entry.stats || []).forEach(function (s) {
      if (s && s.name && !(s.name in m)) {
        m[s.name] = s.displayValue != null ? String(s.displayValue) : "";
      }
    });
    return m;
  }
  function groupsOf(node, out) {
    var st = node.standings || {};
    if (st.entries && st.entries.length) {
      out.push({ name: node.name || "", entries: st.entries });
    }
    (node.children || []).forEach(function (c) { groupsOf(c, out); });
    return out;
  }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function buildLeague(lg, data) {
    var groups = groupsOf(data || {}, []);
    if (!groups.length) return null;
    var wrap = el("section", "st-league");
    wrap.appendChild(el("h3", "st-league-name", lg.label));
    groups.forEach(function (g) {
      if (g.name) wrap.appendChild(el("h4", "st-group", g.name));
      var scroll = el("div", "st-scroll");
      var table = el("table", "st");
      var thead = el("thead");
      var htr = el("tr");
      htr.appendChild(el("th", "", "Team"));
      lg.cols.forEach(function (c) { htr.appendChild(el("th", "", c[1])); });
      thead.appendChild(htr);
      table.appendChild(thead);
      var tbody = el("tbody");
      g.entries.forEach(function (entry) {
        var team = entry.team || {};
        var m = statMap(entry);
        var tr = el("tr");
        var td = el("td", "tm", team.abbreviation || team.shortDisplayName || "—");
        td.title = team.displayName || "";
        tr.appendChild(td);
        lg.cols.forEach(function (c) {
          tr.appendChild(el("td", "", m[c[0]] != null ? m[c[0]] : "—"));
        });
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);
      scroll.appendChild(table);
      wrap.appendChild(scroll);
    });
    return wrap;
  }
  /* Per-league buckets in fixed LEAGUES order — progressive paint,
     same as every other wire on the site: each league's tables land
     the moment its (sometimes large) payload settles; failures are
     skipped silently and the page never shows an error. */
  var buckets = LEAGUES.map(function () { return null; });
  var settled = LEAGUES.map(function () { return false; });
  function paint() {
    root.textContent = "";
    var any = false;
    buckets.forEach(function (node) { if (node) { root.appendChild(node); any = true; } });
    if (!any) {
      var p = el("p", "board-note-line");
      var done = settled.every(function (s) { return s; });
      p.textContent = done
        ? "Standings are between seasons right now — check back."
        : "Tables loading…";
      root.appendChild(p);
    }
  }
  function load() {
    settled = LEAGUES.map(function () { return false; });
    LEAGUES.forEach(function (lg, i) {
      fetch(lg.url, { headers: { "Accept": "application/json" } })
        .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
        .then(function (data) { buckets[i] = buildLeague(lg, data); })
        .catch(function () { buckets[i] = null; })
        .then(function () { settled[i] = true; paint(); });
    });
  }
  load();
  setInterval(load, 300000);
})();

