
(function () {
  var LEAGUES = [
    { label: "NFL", url: "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard" },
    { label: "NBA", url: "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard" },
    { label: "CFB", url: "https://site.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard" },
    { label: "CBB", url: "https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard" },
    { label: "NHL", url: "https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/scoreboard" },
    { label: "MLB", url: "https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard" },
    { label: "WNBA", url: "https://site.api.espn.com/apis/site/v2/sports/basketball/wnba/scoreboard" },
    { label: "EPL", url: "https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard" },
    { label: "MLS", url: "https://site.api.espn.com/apis/site/v2/sports/soccer/usa.1/scoreboard" }
  ];
  var MAX_ROWS = 30;
  var board = document.getElementById("oddsBoard");
  if (!board) return;

  function stateOf(ev) { return ((ev.status && ev.status.type) || {}).state; }
  function usableOdds(ev) {
    var comp = (ev.competitions && ev.competitions[0]) || {};
    var list = comp.odds || [];
    for (var i = 0; i < list.length; i++) {
      var o = list[i];
      if (o && typeof o === "object" && (o.details || o.overUnder != null)) return o;
    }
    return null;
  }
  function mlPair(o) {
    var ml = o.moneyline || {};
    function side(s) {
      var e = ml[s] || {};
      return (e.close && e.close.odds) || (e.open && e.open.odds) || "";
    }
    var a = side("away"), h = side("home");
    return (a && h) ? { away: String(a), home: String(h) } : null;
  }
  function abbr(c) {
    return (c.team && (c.team.abbreviation || c.team.shortDisplayName)) || "—";
  }
  function span(cls, text) {
    var s = document.createElement("span");
    s.className = cls; s.textContent = text;
    return s;
  }
  function buildRow(label, ev, o) {
    var comp = (ev.competitions && ev.competitions[0]) || {};
    var cs = comp.competitors || [];
    if (cs.length < 2) return null;
    var away = cs[0].homeAway === "away" ? cs[0] : cs[1];
    var home = cs[0].homeAway === "home" ? cs[0] : cs[1];
    var row = document.createElement("div");
    row.className = "board-row";
    var l1 = document.createElement("div");
    l1.className = "b-line1";
    l1.appendChild(span("b-tag", label));
    l1.appendChild(span("b-match", abbr(away) + " @ " + abbr(home)));
    var d = ev.date ? new Date(ev.date) : null;
    l1.appendChild(span("b-when", d
      ? d.toLocaleString([], { weekday: "short", hour: "numeric", minute: "2-digit" })
      : ""));
    var l2 = document.createElement("div");
    l2.className = "b-line2";
    l2.appendChild(span("b-num spread", o.details ? String(o.details) : "—"));
    l2.appendChild(span("b-num", o.overUnder != null ? "O/U " + o.overUnder : "—"));
    var ml = mlPair(o);
    if (ml) {
      l2.appendChild(span("b-num",
        abbr(away) + " " + ml.away + " · " + abbr(home) + " " + ml.home));
    }
    row.appendChild(l1); row.appendChild(l2);
    return row;
  }
  /* Per-league row buckets in fixed LEAGUES order, kept across loads —
     the same progressive paint as the ticker (v3.1): each league's
     bucket is replaced the moment its own fetch settles and paint()
     re-renders from whatever has arrived, so the first league to land
     paints immediately. A league still in flight on a refresh keeps
     its previous rows; a failed league drops to an empty bucket. */
  var buckets = LEAGUES.map(function () { return []; });
  var settled = LEAGUES.map(function () { return false; });
  function paint() {
    var all = [];
    buckets.forEach(function (b) { all = all.concat(b); });
    all = all.slice(0, MAX_ROWS);
    board.textContent = "";
    if (!all.length) {
      var p = document.createElement("p");
      p.className = "board-note-line";
      var done = settled.every(function (s) { return s; });
      p.textContent = done
        ? "Lines post closer to game time — check back."
        : "Lines loading…";
      board.appendChild(p);
      return;
    }
    all.forEach(function (r) { board.appendChild(r); });
  }
  function load() {
    settled = LEAGUES.map(function () { return false; });
    LEAGUES.forEach(function (lg, i) {
      fetch(lg.url, { headers: { "Accept": "application/json" } })
        .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
        .then(function (data) {
          var rows = [];
          var events = ((data && data.events) || []).filter(function (ev) {
            return stateOf(ev) === "pre" && usableOdds(ev);
          });
          events.sort(function (a, b) {
            return new Date(a.date) - new Date(b.date);
          });
          events.forEach(function (ev) {
            var row = buildRow(lg.label, ev, usableOdds(ev));
            if (row) rows.push(row);
          });
          buckets[i] = rows;
        })
        .catch(function () { buckets[i] = []; })
        .then(function () { settled[i] = true; paint(); });
    });
  }
  load();
  setInterval(load, 60000);
})();

