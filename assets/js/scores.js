
(function () {
  var LEAGUES = [
    { label: "NFL", url: "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard" },
    { label: "NBA", url: "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard" },
    { label: "CFB", url: "https://site.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard" },
    { label: "CBB", url: "https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard" },
    { label: "NHL", url: "https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/scoreboard" },
    { label: "MLB", url: "https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard" }
  ];
  var MAX_PER_LEAGUE = 16;
  var SECONDS_PER_CHIP = 3.2;
  var track = document.getElementById("tkTrack");
  if (!track) return;

  function typeOf(ev) { return (ev.status && ev.status.type) || {}; }
  function rank(ev) {
    var s = typeOf(ev).state;
    return s === "in" ? 0 : (s === "pre" ? 1 : 2);
  }
  function teamSeg(c, showScore) {
    var name = (c.team && (c.team.abbreviation || c.team.shortDisplayName)) || "—";
    var seg = document.createElement("span");
    if (c.winner === true) seg.className = "win";
    seg.textContent = showScore
      ? name + " " + (c.score != null && c.score !== "" ? c.score : "0")
      : name;
    return seg;
  }
  function statusLine(ev) {
    var st = typeOf(ev);
    if (st.state === "in") {
      var s = st.shortDetail || "";
      if (!s) {
        var dc = (ev.status && ev.status.displayClock) || "";
        var p = (ev.status && ev.status.period) || 0;
        s = dc + (p ? (dc ? " · P" : "P") + p : "");
      }
      return { text: "LIVE" + (s ? " · " + s : ""), live: true };
    }
    if (st.state === "post") return { text: st.detail || "Final", live: false };
    var d = ev.date ? new Date(ev.date) : null;
    var when = d
      ? d.toLocaleString([], { weekday: "short", hour: "numeric", minute: "2-digit" })
      : (st.detail || "Scheduled");
    return { text: when, live: false };
  }
  function buildChip(label, ev) {
    var comp = (ev.competitions && ev.competitions[0]) || {};
    var cs = comp.competitors || [];
    if (cs.length < 2) return null;
    var away = cs[0].homeAway === "away" ? cs[0] : cs[1];
    var home = cs[0].homeAway === "home" ? cs[0] : cs[1];
    var href = (ev.links && ev.links[0] && ev.links[0].href) || "";
    var chip = document.createElement(href ? "a" : "span");
    chip.className = "tk-chip";
    if (href) { chip.href = href; chip.target = "_blank"; chip.rel = "noopener"; }
    var tag = document.createElement("span");
    tag.className = "tk-tag"; tag.textContent = label;
    var showScore = typeOf(ev).state !== "pre";
    var game = document.createElement("span");
    game.className = "tk-game";
    game.appendChild(teamSeg(away, showScore));
    game.appendChild(document.createTextNode("  @  "));
    game.appendChild(teamSeg(home, showScore));
    var s = statusLine(ev);
    var stEl = document.createElement("span");
    stEl.className = "tk-st" + (s.live ? " live" : "");
    stEl.textContent = s.text;
    chip.appendChild(tag); chip.appendChild(game); chip.appendChild(stEl);
    return chip;
  }
  function render(chips) {
    if (!chips.length) return; /* keep "Scores updating…" / prior chips */
    track.textContent = "";
    chips.forEach(function (c) { track.appendChild(c); });
    /* duplicate once: track width becomes exactly 2x one set, so the
       translateX(-50%) loop is seamless. Clones are decorative only. */
    Array.prototype.slice.call(track.children).forEach(function (node) {
      var clone = node.cloneNode(true);
      clone.setAttribute("aria-hidden", "true");
      if (clone.tagName === "A") clone.setAttribute("tabindex", "-1");
      track.appendChild(clone);
    });
    track.style.animationDuration =
      Math.max(30, chips.length * SECONDS_PER_CHIP) + "s";
  }
  function load() {
    var buckets = LEAGUES.map(function () { return []; });
    var pending = LEAGUES.length;
    LEAGUES.forEach(function (lg, i) {
      fetch(lg.url, { headers: { "Accept": "application/json" } })
        .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
        .then(function (data) {
          var events = ((data && data.events) || []).slice();
          events.sort(function (a, b) { return rank(a) - rank(b); });
          events.slice(0, MAX_PER_LEAGUE).forEach(function (ev) {
            var chip = buildChip(lg.label, ev);
            if (chip) buckets[i].push(chip);
          });
        })
        .catch(function () { /* league skipped silently — never an error box */ })
        .then(function () {
          pending -= 1;
          if (pending === 0) {
            var all = [];
            buckets.forEach(function (b) { all = all.concat(b); });
            render(all);
          }
        });
    });
  }
  load();
  setInterval(load, 60000);
})();

