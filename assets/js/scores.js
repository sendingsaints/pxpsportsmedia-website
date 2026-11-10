
(function () {
  var LEAGUES = [
    { label: "NFL", url: "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard" },
    { label: "NBA", url: "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard" },
    { label: "CFB", url: "https://site.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard" },
    { label: "CBB", url: "https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard" }
  ];
  var MAX_PER_LEAGUE = 14;

  function teamLine(c) {
    var name = (c.team && (c.team.abbreviation || c.team.shortDisplayName)) || "—";
    return name + " " + (c.score != null && c.score !== "" ? c.score : "0");
  }
  function stateLine(ev) {
    var st = (ev.status && ev.status.type) || {};
    var detail = (ev.status && ev.status.displayClock) || "";
    var period = (ev.status && ev.status.period) || 0;
    if (st.state === "in") {
      return { text: "LIVE" + (detail ? " · " + detail : "") + (period ? " · P" + period : ""), live: true };
    }
    if (st.state === "post") return { text: st.detail || "Final", live: false };
    var d = ev.date ? new Date(ev.date) : null;
    var when = d ? d.toLocaleString([], { weekday: "short", hour: "numeric", minute: "2-digit" }) : (st.detail || "Scheduled");
    return { text: when, live: false };
  }
  function renderLeague(slot, data) {
    slot.textContent = "";
    var lab = document.createElement("span");
    lab.className = "sb-lab"; lab.textContent = slot.getAttribute("data-league");
    slot.appendChild(lab);
    var events = (data && data.events) || [];
    if (!events.length) {
      var m = document.createElement("span");
      m.className = "sb-msg"; m.textContent = "No games on the board";
      slot.appendChild(m); return;
    }
    events.slice(0, MAX_PER_LEAGUE).forEach(function (ev) {
      var comp = (ev.competitions && ev.competitions[0]) || {};
      var cs = comp.competitors || [];
      if (cs.length < 2) return;
      var away = cs[0].homeAway === "away" ? cs[0] : cs[1];
      var home = cs[0].homeAway === "home" ? cs[0] : cs[1];
      var g = document.createElement("span");
      g.className = "sb-game";
      var s = stateLine(ev);
      var st = document.createElement("span");
      st.className = "st" + (s.live ? " live" : ""); st.textContent = s.text;
      var line = document.createElement("b");
      line.textContent = teamLine(away) + "  @  " + teamLine(home);
      g.appendChild(st); g.appendChild(line);
      slot.appendChild(g);
    });
  }
  function load() {
    LEAGUES.forEach(function (lg) {
      var slot = document.querySelector('.sb-league[data-league="' + lg.label + '"]');
      if (!slot) return;
      fetch(lg.url, { headers: { "Accept": "application/json" } })
        .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
        .then(function (data) { renderLeague(slot, data); })
        .catch(function () {
          if (!slot.querySelector(".sb-game")) {
            slot.textContent = "";
            var lab = document.createElement("span");
            lab.className = "sb-lab"; lab.textContent = lg.label;
            var m = document.createElement("span");
            m.className = "sb-msg"; m.textContent = "Scores updating…";
            slot.appendChild(lab); slot.appendChild(m);
          }
        });
    });
  }
  load();
  setInterval(load, 60000);
})();
