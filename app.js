const TEAM_LABELS = {
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

function byId(id) {
  return document.getElementById(id);
}

function normaliseTeam(name) {
  if (!name) return "";

  const cleaned = String(name).trim();
  const lower = cleaned.toLowerCase();

  if (lower === "turkey" || lower === "turkiye" || lower === "türkiye") return "Türkiye";
  if (lower === "usa" || lower === "united states of america") return "United States";

  return cleaned;
}

function teamBadge(team) {
  const cleanTeam = normaliseTeam(team);
  const label = TEAM_LABELS[cleanTeam] || "TEAM";

  return '<span class="badge">' + label + " " + cleanTeam + "</span>";
}

function getTeamStats(team) {
  const cleanTeam = normaliseTeam(team);

  if (!DATA || !DATA.teamStats || !DATA.teamStats[cleanTeam]) {
    return {
      points: 0,
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0
    };
  }

  return DATA.teamStats[cleanTeam];
}

function getOwner(team) {
  const cleanTeam = normaliseTeam(team);

  if (!CONFIG || !Array.isArray(CONFIG.players)) return null;

  for (const player of CONFIG.players) {
    const teams = player.teams.map(normaliseTeam);

    if (teams.includes(cleanTeam)) {
      return player;
    }
  }

  return null;
}

function getAllSweepstakeTeams() {
  if (!CONFIG || !Array.isArray(CONFIG.players)) return [];

  const teams = [];

  CONFIG.players.forEach(function(player) {
    player.teams.forEach(function(team) {
      teams.push(normaliseTeam(team));
    });
  });

  return teams;
}

function buildLeaderboard(extraPoints) {
  extraPoints = extraPoints || {};

  if (!CONFIG || !Array.isArray(CONFIG.players)) return [];

  const rows = CONFIG.players.map(function(player) {
    let points = 0;
    let wins = 0;
    let draws = 0;
    let losses = 0;

    player.teams.forEach(function(team) {
      const cleanTeam = normaliseTeam(team);
      const stats = getTeamStats(cleanTeam);

      points += stats.points || 0;
      points += extraPoints[cleanTeam] || 0;
      wins += stats.wins || 0;
      draws += stats.draws || 0;
      losses += stats.losses || 0;
    });

    return {
      name: player.name,
      teams: player.teams,
      points: points,
      wins: wins,
      draws: draws,
      losses: losses
    };
  });

  rows.sort(function(a, b) {
    return b.points - a.points || b.wins - a.wins || a.name.localeCompare(b.name);
  });

  return rows;
}

function getRank(rows, playerName) {
  const index = rows.findIndex(function(row) {
    return row.name === playerName;
  });

  return index + 1;
}

function ordinal(number) {
  if (number === 1) return "1st";
  if (number === 2) return "2nd";
  if (number === 3) return "3rd";
  return number + "th";
}

function formatDate(value) {
  if (!value) return "Date TBC";

  const date = new Date(value);

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
  const sweepstakeTeams = getAllSweepstakeTeams();
  const now = Date.now();

  return (DATA.matches || [])
    .filter(function(match) {
      const home = normaliseTeam(match.homeTeam);
      const away = normaliseTeam(match.awayTeam);
      const status = String(match.status || "").toUpperCase();
      const matchTime = match.utcDate ? new Date(match.utcDate).getTime() : 9999999999999;

      return (
        (sweepstakeTeams.includes(home) || sweepstakeTeams.includes(away)) &&
        status !== "FINISHED" &&
        matchTime >= now - 3600000
      );
    })
    .sort(function(a, b) {
      return new Date(a.utcDate || "2999-01-01") - new Date(b.utcDate || "2999-01-01");
    });
}

function renderPodium(rows) {
  const box = byId("podium");
  if (!box) return;

  const places = ["1st", "2nd", "3rd"];

  box.innerHTML = rows.slice(0, 3).map(function(row, index) {
    return (
      '<div class="podium-card">' +
      '<div class="medal">' + places[index] + '</div>' +
      '<div class="name">' + row.name + '</div>' +
      '<div class="badges">' + row.teams.map(teamBadge).join("") + '</div>' +
      '<div class="points">' + row.points + ' pts</div>' +
      '</div>'
    );
  }).join("");
}

function renderNextMatch(match) {
  const box = byId("nextMatch");
  const statusBox = byId("nextMatchStatus");

  if (!box) return;

  if (!match) {
    if (statusBox) statusBox.textContent = "None found";
    box.innerHTML = '<p class="error">No upcoming sweepstake fixtures found yet.</p>';
    return;
  }

  const home = normaliseTeam(match.homeTeam);
  const away = normaliseTeam(match.awayTeam);
  const homeOwner = getOwner(home);
  const awayOwner = getOwner(away);

  let ownerText = "Next tracked match";

  if (homeOwner && awayOwner && homeOwner.name === awayOwner.name) {
    ownerText = homeOwner.name + " has both teams";
  } else if (homeOwner && awayOwner) {
    ownerText = homeOwner.name + " vs " + awayOwner.name;
  } else if (homeOwner) {
    ownerText = homeOwner.name + "'s team plays next";
  } else if (awayOwner) {
    ownerText = awayOwner.name + "'s team plays next";
  }

  if (statusBox) statusBox.textContent = match.status || "Upcoming";

  box.innerHTML =
    '<div class="owner-line">' + ownerText + '</div>' +
    '<div class="match-line">' + home + ' <span class="muted">vs</span> ' + away + '</div>' +
    '<div class="match-time">' + formatDate(match.utcDate) + '</div>' +
    '<div class="team-small">' +
    '<span>' + (homeOwner ? homeOwner.name + ": " + getTeamStats(home).points + " team pts" : home + ": not in sweepstake") + '</span>' +
    '<span>' + (awayOwner ? awayOwner.name + ": " + getTeamStats(away).points + " team pts" : away + ": not in sweepstake") + '</span>' +
    '</div>';
}

function scenarioText(team, beforeRows, afterRows) {
  const owner = getOwner(team);
  if (!owner) return "";

  const before = getRank(beforeRows, owner.name);
  const after = getRank(afterRows, owner.name);

  if (after === 1 && before !== 1) return owner.name + " would move into 1st place.";
  if (after < before) return owner.name + " would move from " + ordinal(before) + " to " + ordinal(after) + ".";
  if (after > before) return owner.name + " would drop from " + ordinal(before) + " to " + ordinal(after) + ".";

  return owner.name + " would stay " + ordinal(before) + ".";
}

function renderImpact(match) {
  const box = byId("impact");
  if (!box) return;

  if (!match) {
    box.innerHTML = '<div class="impact-card"><strong>No scenario yet</strong><p>Once fixtures are available, this will show what the next match could change.</p></div>';
    return;
  }

  const home = normaliseTeam(match.homeTeam);
  const away = normaliseTeam(match.awayTeam);
  const homeOwner = getOwner(home);
  const awayOwner = getOwner(away);
  const beforeRows = buildLeaderboard();
  const cards = [];

  if (homeOwner) {
    const extra = {};
    extra[home] = CONFIG.scoring.win;
    cards.push('<div class="impact-card"><strong>If ' + home + ' win</strong><p>' + scenarioText(home, beforeRows, buildLeaderboard(extra)) + '</p></div>');
  }

  if (homeOwner || awayOwner) {
    const extra = {};
    const lines = [];

    if (homeOwner) extra[home] = CONFIG.scoring.draw;
    if (awayOwner) extra[away] = CONFIG.scoring.draw;

    const afterDraw = buildLeaderboard(extra);

    if (homeOwner) lines.push(scenarioText(home, beforeRows, afterDraw));
    if (awayOwner && (!homeOwner || awayOwner.name !== homeOwner.name)) {
      lines.push(scenarioText(away, beforeRows, afterDraw));
    }

    cards.push('<div class="impact-card"><strong>If it is a draw</strong><p>' + lines.join(" ") + '</p></div>');
  }

  if (awayOwner) {
    const extra = {};
    extra[away] = CONFIG.scoring.win;
    cards.push('<div class="impact-card"><strong>If ' + away + ' win</strong><p>' + scenarioText(away, beforeRows, buildLeaderboard(extra)) + '</p></div>');
  }

  box.innerHTML = cards.join("");
}

function renderLeaderboard(rows) {
  const box = byId("leaderboard");
  if (!box) return;

  box.innerHTML = rows.map(function(row, index) {
    return (
      '<tr>' +
      '<td class="rank">' + (index + 1) + '</td>' +
      '<td><strong>' + row.name + '</strong></td>' +
      '<td><div class="badges">' + row.teams.map(teamBadge).join("") + '</div></td>' +
      '<td class="points">' + row.points + '</td>' +
      '<td>' + row.wins + 'W ' + row.draws + 'D ' + row.losses + 'L</td>' +
      '</tr>'
    );
  }).join("");
}

function renderFixtures(matches) {
  const box = byId("matches");
  if (!box) return;

  if (!matches.length) {
    box.innerHTML = '<p class="error">No upcoming sweepstake fixtures found yet.</p>';
    return;
  }

  box.innerHTML = matches.slice(0, 5).map(function(match) {
    const home = normaliseTeam(match.homeTeam);
    const away = normaliseTeam(match.awayTeam);
    const homeOwner = getOwner(home);
    const awayOwner = getOwner(away);

    let label = "Tracked match";

    if (homeOwner && awayOwner && homeOwner.name === awayOwner.name) {
      label = homeOwner.name + " has both teams";
    } else if (homeOwner && awayOwner) {
      label = homeOwner.name + " vs " + awayOwner.name;
    } else if (homeOwner) {
      label = homeOwner.name;
    } else if (awayOwner) {
      label = awayOwner.name;
    }

    return (
      '<div class="match-card">' +
      '<div class="match-meta"><span>' + formatDate(match.utcDate) + '</span><span>' + (match.status || "Upcoming") + '</span></div>' +
      '<div class="match-card-title">' + label + '</div>' +
      '<div>' + teamBadge(home) + ' <span class="muted">vs</span> ' + teamBadge(away) + '</div>' +
      '</div>'
    );
  }).join("");
}

async function main() {
  try {
    const cacheBust = Date.now();

    const configResponse = await fetch("config.json?v=" + cacheBust, { cache: "no-store" });
    const dataResponse = await fetch("data.json?v=" + cacheBust, { cache: "no-store" });

    CONFIG = await configResponse.json();
    DATA = await dataResponse.json();

    const statusBox = byId("statusPill");
    const updatedBox = byId("lastUpdated");

    if (DATA.error) {
      if (statusBox) {
        statusBox.textContent = "Needs setup";
        statusBox.classList.add("bad");
      }

      if (updatedBox) updatedBox.textContent = DATA.error;
    } else {
      if (statusBox) {
        statusBox.textContent = "Live data ready";
        statusBox.classList.remove("bad");
      }

      if (updatedBox) {
        updatedBox.textContent = DATA.lastUpdated ? "Updated " + new Date(DATA.lastUpdated).toLocaleString() : "Waiting for update";
      }
    }

    const rows = buildLeaderboard();
    const fixtures = getUpcomingMatches();

    renderPodium(rows);
    renderNextMatch(fixtures[0]);
    renderImpact(fixtures[0]);
    renderLeaderboard(rows);
    renderFixtures(fixtures);
  } catch (error) {
    console.error(error);

    const statusBox = byId("statusPill");
    const updatedBox = byId("lastUpdated");

    if (statusBox) {
      statusBox.textContent = "Site error";
      statusBox.classList.add("bad");
    }

    if (updatedBox) updatedBox.textContent = "Check app.js, config.json or data.json";
  }
}

const toggleButton = byId("leaderboardToggle");
const leaderboardPanel = byId("leaderboardPanel");
const refreshButton = byId("refreshBtn");

if (toggleButton && leaderboardPanel) {
  toggleButton.addEventListener("click", function() {
    leaderboardPanel.classList.toggle("hidden");

    const isOpen = !leaderboardPanel.classList.contains("hidden");
    toggleButton.textContent = isOpen ? "Hide Full Leaderboard" : "View Full Leaderboard";

    if (isOpen) {
      leaderboardPanel.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }
  });
}

if (refreshButton) {
  refreshButton.addEventListener("click", function() {
    location.reload();
  });
}

main();
