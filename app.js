const FLAGS = {
"England": "🏴",
"Portugal": "🇵🇹",
"Brazil": "🇧🇷",
"Netherlands": "🇳🇱",
"Morocco": "🇲🇦",
"Belgium": "🇧🇪",
"Germany": "🇩🇪",
"Croatia": "🇭🇷",
"Colombia": "🇨🇴",
"Senegal": "🇸🇳",
"Mexico": "🇲🇽",
"United States": "🇺🇸",
"Uruguay": "🇺🇾",
"Japan": "🇯🇵",
"Switzerland": "🇨🇭",
"Iran": "🇮🇷",
"Türkiye": "🇹🇷",
"Turkey": "🇹🇷",
"Austria": "🇦🇹",
"Norway": "🇳🇴",
"Paraguay": "🇵🇾",
"Sweden": "🇸🇪",
"Scotland": "🏴"
};

let CONFIG = null;
let DATA = null;

function norm(name) {
if (!name) return "";
const n = String(name).trim();
const low = n.toLowerCase();

if (low === "turkey" || low === "turkiye" || low === "türkiye") return "Türkiye";
if (low === "usa" || low === "united states of america" || low === "usmnt") return "United States";

return n;
}

function getEl(id) {
return document.getElementById(id);
}

function badge(team) {
const t = norm(team);
return "<span class="badge">" + (FLAGS[t] || "⚽") + " " + t + "</span>";
}

function teamScore(team) {
const t = norm(team);

if (!DATA || !DATA.teamStats || !DATA.teamStats[t]) {
return {
points: 0,
played: 0,
wins: 0,
draws: 0,
losses: 0,
bonus: 0
};
}

return DATA.teamStats[t];
}

function ownerOf(team) {
const t = norm(team);

if (!CONFIG || !Array.isArray(CONFIG.players)) return null;

return CONFIG.players.find(function(player) {
return player.teams.map(norm).includes(t);
}) || null;
}

function allTrackedTeams() {
if (!CONFIG || !Array.isArray(CONFIG.players)) return [];

return CONFIG.players.flatMap(function(player) {
return player.teams.map(norm);
});
}

function buildLeaderboard(extraPoints) {
extraPoints = extraPoints || {};

if (!CONFIG || !Array.isArray(CONFIG.players)) return [];

return CONFIG.players.map(function(player) {
const stats = player.teams.map(function(team) {
return teamScore(team);
});

```
const basePoints = stats.reduce(function(total, stat) {
  return total + (stat.points || 0);
}, 0);

const bonus = player.teams.reduce(function(total, team) {
  return total + (extraPoints[norm(team)] || 0);
}, 0);

return {
  name: player.name,
  teams: player.teams,
  points: basePoints + bonus,
  played: stats.reduce(function(total, stat) {
    return total + (stat.played || 0);
  }, 0),
  wins: stats.reduce(function(total, stat) {
    return total + (stat.wins || 0);
  }, 0),
  draws: stats.reduce(function(total, stat) {
    return total + (stat.draws || 0);
  }, 0),
  losses: stats.reduce(function(total, stat) {
    return total + (stat.losses || 0);
  }, 0)
};
```

}).sort(function(a, b) {
return b.points - a.points || b.wins - a.wins || a.name.localeCompare(b.name);
});
}

function rankOf(rows, playerName) {
return rows.findIndex(function(row) {
return row.name === playerName;
}) + 1;
}

function ordinal(n) {
if (!n) return "unranked";
if (n === 1) return "1st";
if (n === 2) return "2nd";
if (n === 3) return "3rd";
return n + "th";
}

function formatDate(dateStr) {
if (!dateStr) return "Date TBC";

const date = new Date(dateStr);

if (Number.isNaN(date.getTime())) return "Date TBC";

return date.toLocaleString([], {
weekday: "short",
day: "numeric",
month: "short",
hour: "2-digit",
minute: "2-digit"
});
}

function getUpcomingMatches() {
const tracked = new Set(allTrackedTeams());
const now = Date.now();

return (DATA.matches || [])
.filter(function(match) {
const home = norm(match.homeTeam);
const away = norm(match.awayTeam);
const status = String(match.status || "").toUpperCase();
const time = match.utcDate ? new Date(match.utcDate).getTime() : Number.MAX_SAFE_INTEGER;

```
  return (tracked.has(home) || tracked.has(away)) &&
    status !== "FINISHED" &&
    time >= now - 60 * 60 * 1000;
})
.sort(function(a, b) {
  return new Date(a.utcDate || "2999-01-01") - new Date(b.utcDate || "2999-01-01");
});
```

}

function renderPodium(rows) {
const el = getEl("podium");
if (!el) return;

const medals = ["🥇", "🥈", "🥉"];

el.innerHTML = rows.slice(0, 3).map(function(row, index) {
return "<div class="podium-card">" +
"<div class="medal">" + medals[index] + "</div>" +
"<div class="name">" + row.name + "</div>" +
"<div class="badges">" + row.teams.map(badge).join("") + "</div>" +
"<div class="points">" + row.points + " pts</div>" +
"</div>";
}).join("");
}

function renderNextMatch(match) {
const el = getEl("nextMatch");
const status = getEl("nextMatchStatus");

if (!el) return;

if (!match) {
if (status) status.textContent = "None found";
el.innerHTML = "<p class="error">No upcoming sweepstake fixtures found yet.</p>";
return;
}

const home = norm(match.homeTeam);
const away = norm(match.awayTeam);
const homeOwner = ownerOf(home);
const awayOwner = ownerOf(away);

let ownerLine = "";

if (homeOwner && awayOwner && homeOwner.name === awayOwner.name) {
ownerLine = homeOwner.name + " has both teams";
} else if (homeOwner && awayOwner) {
ownerLine = homeOwner.name + " vs " + awayOwner.name;
} else if (homeOwner) {
ownerLine = homeOwner.name + "'s team plays next";
} else if (awayOwner) {
ownerLine = awayOwner.name + "'s team plays next";
} else {
ownerLine = "Next tracked match";
}

if (status) status.textContent = match.status || "Upcoming";

el.innerHTML =
"<div class="owner-line">" + ownerLine + "</div>" +
"<div class="match-line">" + (FLAGS[home] || "⚽") + " " + home + " <span class="muted">vs</span> " + (FLAGS[away] || "⚽") + " " + away + "</div>" +
"<div class="match-time">" + formatDate(match.utcDate) + "</div>" +
"<div class="team-small">" +
"<span>" + (homeOwner ? homeOwner.name + ": " + teamScore(home).points + " team pts" : home + ": not in sweepstake") + "</span>" +
"<span>" + (awayOwner ? awayOwner.name + ": " + teamScore(away).points + " team pts" : away + ": not in sweepstake") + "</span>" +
"</div>";
}

function scenarioText(team, beforeRows, afterRows) {
const owner = ownerOf(team);
if (!owner) return null;

const before = rankOf(beforeRows, owner.name);
const after = rankOf(afterRows, owner.name);

if (after === 1 && before !== 1) return owner.name + " would move into 1st place.";
if (after < before) return owner.name + " would move from " + ordinal(before) + " to " + ordinal(after) + ".";
if (after > before) return owner.name + " would drop from " + ordinal(before) + " to " + ordinal(after) + ".";

return owner.name + " would stay " + ordinal(before) + ".";
}

function renderImpact(match) {
const el = getEl("impact");
if (!el) return;

if (!match) {
el.innerHTML =
"<div class="impact-card">" +
"<strong>No scenario yet</strong>" +
"<p>Once fixtures are available, this will show what the next match could change.</p>" +
"</div>";
return;
}

const home = norm(match.homeTeam);
const away = norm(match.awayTeam);
const homeOwner = ownerOf(home);
const awayOwner = ownerOf(away);
const beforeRows = buildLeaderboard();
const cards = [];

if (homeOwner) {
const extra = {};
extra[home] = CONFIG.scoring.win;
const afterHomeWin = buildLeaderboard(extra);

```
cards.push(
  "<div class=\"impact-card\">" +
  "<strong>If " + home + " win</strong>" +
  "<p>" + scenarioText(home, beforeRows, afterHomeWin) + "</p>" +
  "</div>"
);
```

}

if (homeOwner || awayOwner) {
const drawPoints = {};

```
if (homeOwner) drawPoints[home] = CONFIG.scoring.draw;
if (awayOwner) drawPoints[away] = CONFIG.scoring.draw;

const afterDraw = buildLeaderboard(drawPoints);
const drawLines = [];

if (homeOwner) drawLines.push(scenarioText(home, beforeRows, afterDraw));

if (awayOwner && (!homeOwner || awayOwner.name !== homeOwner.name)) {
  drawLines.push(scenarioText(away, beforeRows, afterDraw));
}

cards.push(
  "<div class=\"impact-card\">" +
  "<strong>If it is a draw</strong>" +
  "<p>" + drawLines.filter(Boolean).join(" ") + "</p>" +
  "</div>"
);
```

}

if (awayOwner) {
const extra = {};
extra[away] = CONFIG.scoring.win;
const afterAwayWin = buildLeaderboard(extra);

```
cards.push(
  "<div class=\"impact-card\">" +
  "<strong>If " + away + " win</strong>" +
  "<p>" + scenarioText(away, beforeRows, afterAwayWin) + "</p>" +
  "</div>"
);
```

}

if (!cards.length) {
cards.push(
"<div class="impact-card">" +
"<strong>No leaderboard impact</strong>" +
"<p>This match does not include one of your sweepstake teams.</p>" +
"</div>"
);
}

el.innerHTML = cards.join("");
}

function renderLeaderboard(rows) {
const el = getEl("leaderboard") || getEl("leaderboardBody");
if (!el) return;

el.innerHTML = rows.map(function(row, index) {
return "<tr>" +
"<td class="rank">" + (index + 1) + "</td>" +
"<td><strong>" + row.name + "</strong></td>" +
"<td><div class="badges">" + row.teams.map(badge).join("") + "</div></td>" +
"<td class="points">" + row.points + "</td>" +
"<td>" + row.wins + "W " + row.draws + "D " + row.losses + "L</td>" +
"</tr>";
}).join("");
}

function renderUpcomingMatches(matches) {
const el = getEl("matches");
if (!el) return;

if (!matches.length) {
el.innerHTML = "<p class="error">No upcoming sweepstake fixtures found yet.</p>";
return;
}

el.innerHTML = matches.slice(0, 5).map(function(match) {
const home = norm(match.homeTeam);
const away = norm(match.awayTeam);
const homeOwner = ownerOf(home);
const awayOwner = ownerOf(away);

```
let ownerLabel = "Tracked match";

if (homeOwner && awayOwner && homeOwner.name === awayOwner.name) {
  ownerLabel = homeOwner.name + " has both teams";
} else if (homeOwner && awayOwner) {
  ownerLabel = homeOwner.name + " vs " + awayOwner.name;
} else if (homeOwner) {
  ownerLabel = homeOwner.name;
} else if (awayOwner) {
  ownerLabel = awayOwner.name;
}

return "<div class=\"match-card\">" +
  "<div class=\"match-meta\">" +
  "<span>" + formatDate(match.utcDate) + "</span>" +
  "<span>" + (match.status || "Upcoming") + "</span>" +
  "</div>" +
  "<div class=\"match-card-title\">" + ownerLabel + "</div>" +
  "<div>" + badge(home) + " <span class=\"muted\">vs</span> " + badge(away) + "</div>" +
  "</div>";
```

}).join("");
}

async function main() {
try {
const cacheBust = Date.now();

```
const configResponse = await fetch("config.json?v=" + cacheBust, { cache: "no-store" });
const dataResponse = await fetch("data.json?v=" + cacheBust, { cache: "no-store" });

CONFIG = await configResponse.json();
DATA = await dataResponse.json();

const status = getEl("statusPill");
const lastUpdated = getEl("lastUpdated");

if (DATA.error) {
  if (status) {
    status.textContent = "Needs setup";
    status.classList.add("bad");
  }

  if (lastUpdated) {
    lastUpdated.textContent = DATA.error;
  }
} else {
  if (status) {
    status.textContent = "Live data ready";
    status.classList.remove("bad");
  }

  if (lastUpdated) {
    lastUpdated.textContent = DATA.lastUpdated
      ? "Updated " + new Date(DATA.lastUpdated).toLocaleString()
      : "Waiting for update";
  }
}

const rows = buildLeaderboard();
const upcoming = getUpcomingMatches();
const nextMatch = upcoming[0];

renderPodium(rows);
renderNextMatch(nextMatch);
renderImpact(nextMatch);
renderLeaderboard(rows);
renderUpcomingMatches(upcoming);
```

} catch (error) {
console.error(error);

```
const status = getEl("statusPill");
const lastUpdated = getEl("lastUpdated");

if (status) {
  status.textContent = "Site error";
  status.classList.add("bad");
}

if (lastUpdated) {
  lastUpdated.textContent = "Check config.json, data.json, index.html or app.js";
}
```

}
}

const leaderboardToggle = getEl("leaderboardToggle");
const leaderboardPanel = getEl("leaderboardPanel");
const refreshBtn = getEl("refreshBtn");

if (leaderboardToggle && leaderboardPanel) {
leaderboardToggle.addEventListener("click", function() {
leaderboardPanel.classList.toggle("hidden");

```
const isOpen = !leaderboardPanel.classList.contains("hidden");
leaderboardToggle.textContent = isOpen ? "Hide Full Leaderboard" : "View Full Leaderboard";

if (isOpen) {
  leaderboardPanel.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}
```

});
}

if (refreshBtn) {
refreshBtn.addEventListener("click", function() {
location.reload();
});
}

main();
