
(function () {
  var BASE = "https://site.api.espn.com/apis/site/v2/sports/";
  var LEAGUES = [
    { band: "NFL SCOREBOARD", anchor: "nfl", url: BASE + "football/nfl/scoreboard",
      board: "https://www.espn.com/nfl/scoreboard" },
    { band: "NBA SCOREBOARD", anchor: "nba", url: BASE + "basketball/nba/scoreboard",
      board: "https://www.espn.com/nba/scoreboard" },
    { band: "COLLEGE FOOTBALL SCOREBOARD", anchor: "cfb",
      url: BASE + "football/college-football/scoreboard",
      board: "https://www.espn.com/college-football/scoreboard" },
    { band: "MEN'S COLLEGE HOOPS SCOREBOARD", anchor: "ncaam",
      url: BASE + "basketball/mens-college-basketball/scoreboard",
      board: "https://www.espn.com/mens-college-basketball/scoreboard" },
    { band: "WOMEN'S COLLEGE HOOPS SCOREBOARD", anchor: "ncaaw",
      url: BASE + "basketball/womens-college-basketball/scoreboard",
      board: "https://www.espn.com/womens-college-basketball/scoreboard" },
    { band: "NHL SCOREBOARD", anchor: "nhl", url: BASE + "hockey/nhl/scoreboard",
      board: "https://www.espn.com/nhl/scoreboard" },
    { band: "WNBA SCOREBOARD", anchor: "wnba", url: BASE + "basketball/wnba/scoreboard",
      board: "https://www.espn.com/wnba/scoreboard" },
    { band: "MLB SCOREBOARD", anchor: "mlb", url: BASE + "baseball/mlb/scoreboard",
      board: "https://www.espn.com/mlb/scoreboard" },
    { band: "PREMIER LEAGUE SCOREBOARD", anchor: "soccer", url: BASE + "soccer/eng.1/scoreboard",
      board: "https://www.espn.com/soccer/scoreboard/_/league/ENG.1" },
    { band: "MLS SCOREBOARD", anchor: "mls", url: BASE + "soccer/usa.1/scoreboard",
      board: "https://www.espn.com/soccer/scoreboard/_/league/USA.1" }
  ];
  var MAX_PER_LEAGUE = 24;
  var root = document.getElementById("scoresRoot");
  if (!root) return;
  var jump = document.getElementById("scoresJump");
  /* League jump chips (owner's ESPN league-icon row): generic sport
     glyphs only — never league logo artwork. `targets` are LEAGUES
     indexes; a chip renders only when one of its leagues has a
     section on the page, and points at the first such section (the
     single SOCCER chip lands on the Premier League board, or MLS
     when only MLS is playing). */
  var CHIPS = [
    { glyph: "🏈", label: "NFL", targets: [0] },
    { glyph: "🏈", label: "NCAAF", targets: [2] },
    { glyph: "🏀", label: "NBA", targets: [1] },
    { glyph: "🏀", label: "NCAAM", targets: [3] },
    { glyph: "🏀", label: "NCAAW", targets: [4] },
    { glyph: "⚾", label: "MLB", targets: [7] },
    { glyph: "⚽", label: "SOCCER", targets: [8, 9] },
    { glyph: "🏒", label: "NHL", targets: [5] },
    { glyph: "🏀", label: "WNBA", targets: [6] }
  ];

  function etDay(offset) {
    /* YYYYMMDD in America/New_York, `offset` days from today. The
       offset is applied to the instant, then the ET calendar date is
       read back — DST-safe for a ±1 day step. */
    var parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      year: "numeric", month: "2-digit", day: "2-digit"
    }).formatToParts(new Date(Date.now() + offset * 86400000));
    var m = {};
    parts.forEach(function (p) { m[p.type] = p.value; });
    return m.year + m.month + m.day;
  }
  function typeOf(ev) { return (ev.status && ev.status.type) || {}; }
  function rankOf(c) {
    var r = c && c.curatedRank && c.curatedRank.current;
    return (typeof r === "number" && r >= 1 && r <= 25) ? r : null;
  }
  function matchupOf(ev) {
    var comp = (ev.competitions && ev.competitions[0]) || {};
    var cs = comp.competitors || [];
    if (cs.length < 2) return null;
    var away = cs[0].homeAway === "away" ? cs[0] : cs[1];
    var home = cs[0].homeAway === "home" ? cs[0] : cs[1];
    return { comp: comp, away: away, home: home };
  }
  function bestRank(ev) {
    var mu = matchupOf(ev);
    if (!mu) return 999;
    var vals = [rankOf(mu.away), rankOf(mu.home)].filter(function (x) {
      return x != null;
    });
    return vals.length ? Math.min.apply(null, vals) : 999;
  }
  function noteOf(comp) {
    var notes = comp.notes || [];
    for (var i = 0; i < notes.length; i++) {
      if (notes[i] && notes[i].headline) return notes[i].headline;
    }
    return comp.headline || "";
  }
  function statusInfo(ev) {
    var st = typeOf(ev);
    if (st.state === "in") {
      var s = st.shortDetail || "";
      if (!s) {
        var dc = (ev.status && ev.status.displayClock) || "";
        var p = (ev.status && ev.status.period) || 0;
        s = dc + (p ? (dc ? " · Q" : "Q") + p : "");
      }
      return { text: s || "LIVE", cls: "sb-status live" };
    }
    if (st.state === "post") {
      return { text: st.detail || "Final", cls: "sb-status final" };
    }
    var d = ev.date ? new Date(ev.date) : null;
    var t = d ? d.toLocaleString("en-US", {
      timeZone: "America/New_York", hour: "numeric", minute: "2-digit"
    }) : "";
    return { text: t ? t + " ET" : (st.detail || "Scheduled"),
             cls: "sb-status" };
  }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function teamLine(c, state) {
    var t = c.team || {};
    var line = el("div",
      "sb-team" + (state === "post" && c.winner === true ? " win" : ""));
    if (t.logo) {
      var img = document.createElement("img");
      img.className = "sb-logo";
      img.src = t.logo;
      img.alt = "";
      img.loading = "lazy";
      img.addEventListener("error", function () {
        img.style.visibility = "hidden";
      });
      line.appendChild(img);
    } else {
      line.appendChild(el("span", "sb-logo-fallback",
        t.abbreviation || "—"));
    }
    var r = rankOf(c);
    line.appendChild(el("span", "sb-rank", r ? String(r) : ""));
    line.appendChild(el("span", "sb-name",
      t.displayName || t.shortDisplayName || t.abbreviation || "—"));
    line.appendChild(el("span", "sb-score",
      state !== "pre" && c.score != null && c.score !== ""
        ? String(c.score) : ""));
    line.appendChild(el("span", "sb-marker",
      state === "post" && c.winner === true ? "◀" : ""));
    return line;
  }
  function buildGame(ev) {
    var mu = matchupOf(ev);
    if (!mu) return null;
    var state = typeOf(ev).state || "pre";
    var href = (ev.links && ev.links[0] && ev.links[0].href) || "";
    var a = document.createElement(href ? "a" : "div");
    a.className = "sb-game";
    if (href) { a.href = href; a.target = "_blank"; a.rel = "noopener"; }
    var top = el("div", "sb-top");
    var teams = el("div", "sb-teams");
    teams.appendChild(teamLine(mu.away, state));
    teams.appendChild(teamLine(mu.home, state));
    var st = statusInfo(ev);
    top.appendChild(teams);
    top.appendChild(el("span", st.cls, st.text));
    a.appendChild(top);
    var note = noteOf(mu.comp);
    if (note) a.appendChild(el("p", "sb-note", note));
    return a;
  }
  function buildLeague(lg, events) {
    var wrap = el("section", "sb-sec");
    wrap.id = lg.anchor;
    wrap.appendChild(el("h3", "st-league-name", lg.band));
    var card = el("div", "sb");
    var shown = events.slice(0, MAX_PER_LEAGUE);
    shown.forEach(function (ev) {
      var g = buildGame(ev);
      if (g) card.appendChild(g);
    });
    if (!card.children.length) return null;
    if (events.length > shown.length) {
      var more = el("p", "sb-more");
      more.appendChild(document.createTextNode(
        "Top matchups shown — "));
      var link = el("a", "", "full board on ESPN");
      link.href = lg.board; link.target = "_blank"; link.rel = "noopener";
      more.appendChild(link);
      card.appendChild(more);
    }
    wrap.appendChild(card);
    return wrap;
  }
  function fetchDay(url, ymd) {
    return fetch(url + "?dates=" + ymd,
      { headers: { "Accept": "application/json" } })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (data) { return (data && data.events) || []; })
      .catch(function () { return []; });
  }
  /* Per-league section buckets in fixed LEAGUES order — progressive
     paint, same as every other wire on the site: each league's
     section lands the moment its own fetches settle; failures and
     empty leagues are skipped silently. */
  var buckets = LEAGUES.map(function () { return null; });
  var counts = LEAGUES.map(function () { return 0; });
  var settled = LEAGUES.map(function () { return false; });
  var chipSig = "";
  function paintChips() {
    if (!jump) return;
    var sig = buckets.map(function (b, i) {
      return b ? LEAGUES[i].anchor : "";
    }).join(",");
    if (sig === chipSig) return; /* availability unchanged — leave the row be */
    chipSig = sig;
    jump.textContent = "";
    CHIPS.forEach(function (def) {
      var target = null;
      def.targets.forEach(function (i) {
        if (!target && buckets[i]) target = LEAGUES[i].anchor;
      });
      if (!target) return;
      var a = el("a", "sb-chip");
      a.href = "#" + target;
      a.appendChild(el("span", "gly", def.glyph));
      a.appendChild(el("span", "lab", def.label));
      jump.appendChild(a);
    });
  }
  function paint() {
    root.textContent = "";
    var any = false;
    buckets.forEach(function (node) {
      if (node) { root.appendChild(node); any = true; }
    });
    paintChips();
    if (!any) {
      var p = el("p", "board-note-line");
      var done = settled.every(function (s) { return s; });
      p.textContent = done
        ? "No games on the board right now — check back on game day."
        : "Boards loading…";
      root.appendChild(p);
    }
  }
  function load() {
    settled = LEAGUES.map(function () { return false; });
    var today = etDay(0), yest = etDay(-1);
    LEAGUES.forEach(function (lg, i) {
      Promise.all([fetchDay(lg.url, today), fetchDay(lg.url, yest)])
        .then(function (pair) {
          var seen = {};
          var merged = [];
          pair[0].forEach(function (ev) {
            var k = ev.id || (ev.name + "|" + ev.date);
            if (!seen[k]) { seen[k] = 1; merged.push(ev); }
          });
          pair[1].forEach(function (ev) {
            /* yesterday feeds the board only games already played —
               its finals ride along under today's slate */
            if (typeOf(ev).state === "pre") return;
            var k = ev.id || (ev.name + "|" + ev.date);
            if (!seen[k]) { seen[k] = 1; merged.push(ev); }
          });
          merged.sort(function (a, b) {
            var sa = typeOf(a).state === "in" ? 0 : 1;
            var sb = typeOf(b).state === "in" ? 0 : 1;
            if (sa !== sb) return sa - sb;
            var ra = bestRank(a), rb = bestRank(b);
            if (ra !== rb) return ra - rb;
            return new Date(a.date) - new Date(b.date);
          });
          counts[i] = merged.length;
          buckets[i] = merged.length ? buildLeague(lg, merged) : null;
        })
        .catch(function () { buckets[i] = null; counts[i] = 0; })
        .then(function () { settled[i] = true; paint(); });
    });
  }
  load();
  setInterval(load, 60000);
})();

