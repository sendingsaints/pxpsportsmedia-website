
(function () {
  var CORE = "https://sports.core.api.espn.com/v2/sports/";
  var LEAGUES = [
    { label: "NFL", url: CORE + "football/leagues/nfl/seasons/2026/types/2/leaders",
      cats: ["passingYards", "rushingYards", "receivingYards"] },
    { label: "NBA", url: CORE + "basketball/leagues/nba/seasons/2027/types/2/leaders",
      cats: ["pointsPerGame", "assistsPerGame", "reboundsPerGame"] },
    { label: "CFB", url: CORE + "football/leagues/college-football/seasons/2026/types/2/leaders",
      cats: ["passingYards", "rushingYards", "receivingYards"] },
    { label: "CBB", url: CORE + "basketball/leagues/mens-college-basketball/seasons/2027/types/2/leaders",
      cats: ["pointsPerGame", "assistsPerGame", "reboundsPerGame"] },
    { label: "NHL", url: CORE + "hockey/leagues/nhl/seasons/2027/types/2/leaders",
      cats: ["points", "goals", "assists"] },
    { label: "MLB", url: CORE + "baseball/leagues/mlb/seasons/2026/types/2/leaders",
      cats: ["homeRuns", "RBIs", "avg"] },
    { label: "WNBA", url: CORE + "basketball/leagues/wnba/seasons/2026/types/2/leaders",
      cats: ["pointsPerGame", "assistsPerGame", "reboundsPerGame"] }
  ];
  var TOP = 5;
  var box = document.getElementById("leadersBoard");
  if (!box) return;

  function https(u) { return u ? String(u).replace(/^http:/, "https:") : ""; }
  /* Value display: the payload's displayValue verbatim when it is a
     plain number ("39.3", "2618"). MLB's categories instead carry a
     whole stat line as displayValue ("135-581, 45 HR, ...") — for
     those, fall back to the payload's numeric `value` (45) formatted
     plainly: integers as-is, rates to 3 decimals with the leading
     zero dropped under 1 (baseball style, .316). Still the wire's
     own number — never recomputed from anything else. */
  function fmtValue(l) {
    var dv = l.displayValue != null ? String(l.displayValue) : "";
    if (/^-?[\d.,]+$/.test(dv)) return dv;
    var v = l.value;
    if (typeof v === "number" && isFinite(v)) {
      if (Math.round(v) === v) return String(v);
      var s = v.toFixed(3);
      if (s.indexOf("0.") === 0) s = s.slice(1);
      return s;
    }
    return dv;
  }
  var refCache = {};
  function hydrate(ref) {
    var url = https(ref);
    if (!url) return Promise.resolve(null);
    if (!refCache[url]) {
      refCache[url] = fetch(url, { headers: { "Accept": "application/json" } })
        .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
        .catch(function () { return null; });
    }
    return refCache[url];
  }
  function leagueBlocks(lg, data) {
    var byName = {};
    ((data && data.categories) || []).forEach(function (c) {
      if (c && c.name && !byName[c.name]) byName[c.name] = c;
    });
    var chosen = lg.cats.map(function (n) { return byName[n]; }).filter(Boolean);
    return Promise.all(chosen.map(function (cat) {
      var leaders = (cat.leaders || []).slice(0, TOP);
      return Promise.all(leaders.map(function (l) {
        return Promise.all([
          hydrate(l.athlete && l.athlete.$ref),
          hydrate(l.team && l.team.$ref)
        ]).then(function (pair) {
          var a = pair[0], t = pair[1];
          if (!a || !a.displayName) return null;
          return { name: a.displayName,
                   team: (t && t.abbreviation) || "",
                   value: fmtValue(l) };
        });
      })).then(function (rows) {
        rows = rows.filter(Boolean);
        if (!rows.length) return null;
        return { league: lg.label, cat: cat.displayName || cat.name, rows: rows };
      });
    })).then(function (blocks) { return blocks.filter(Boolean); });
  }
  function span(cls, text) {
    var s = document.createElement("span");
    s.className = cls; s.textContent = text;
    return s;
  }
  function renderBlock(b) {
    var frag = document.createDocumentFragment();
    var head = document.createElement("div");
    head.className = "ld-cat";
    head.appendChild(span("ld-tag", b.league));
    head.appendChild(span("ld-catname", b.cat));
    frag.appendChild(head);
    b.rows.forEach(function (r, i) {
      var row = document.createElement("div");
      row.className = "ld-row" + (i === b.rows.length - 1 ? " last" : "");
      var l1 = document.createElement("div");
      l1.className = "ld-line1";
      l1.appendChild(span("ld-rank", String(i + 1)));
      l1.appendChild(span("ld-name", r.name));
      if (r.team) l1.appendChild(span("ld-team", r.team));
      row.appendChild(l1);
      row.appendChild(span("ld-val", r.value));
      frag.appendChild(row);
    });
    return frag;
  }
  /* Per-league block buckets in fixed LEAGUES order — the same
     progressive paint as the other wires: a league paints the moment
     its leaders (and their name/team refs) settle; failures and
     empty leagues are skipped silently. */
  var buckets = LEAGUES.map(function () { return []; });
  var settled = LEAGUES.map(function () { return false; });
  function paint() {
    box.textContent = "";
    var any = false;
    buckets.forEach(function (blocks) {
      blocks.forEach(function (b) { box.appendChild(renderBlock(b)); any = true; });
    });
    if (!any) {
      var p = document.createElement("p");
      p.className = "board-note-line";
      var done = settled.every(function (s) { return s; });
      p.textContent = done
        ? "Leaders post as the season builds — check back."
        : "Leaders loading…";
      box.appendChild(p);
    }
  }
  function load() {
    refCache = {};
    settled = LEAGUES.map(function () { return false; });
    LEAGUES.forEach(function (lg, i) {
      fetch(lg.url, { headers: { "Accept": "application/json" } })
        .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
        .then(function (data) { return leagueBlocks(lg, data); })
        .then(function (blocks) { buckets[i] = blocks; })
        .catch(function () { buckets[i] = []; })
        .then(function () { settled[i] = true; paint(); });
    });
  }
  load();
  setInterval(load, 300000);
})();

