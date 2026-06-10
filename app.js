const FLAGS = {
  "England":"🏴", "Portugal":"🇵🇹", "Brazil":"🇧🇷", "Netherlands":"🇳🇱", "Morocco":"🇲🇦", "Belgium":"🇧🇪",
  "Germany":"🇩🇪", "Croatia":"🇭🇷", "Colombia":"🇨🇴", "Senegal":"🇸🇳", "Mexico":"🇲🇽", "United States":"🇺🇸",
  "Uruguay":"🇺🇾", "Japan":"🇯🇵", "Switzerland":"🇨🇭", "Iran":"🇮🇷", "Türkiye":"🇹🇷", "Turkey":"🇹🇷",
  "Austria":"🇦🇹", "Norway":"🇳🇴", "Paraguay":"🇵🇾", "Sweden":"🇸🇪", "Scotland":"🏴"
};

let CONFIG = null;
let DATA = null;

function norm(name){
  if(!name) return "";
  const n = String(name).trim();
  const low = n.toLowerCase();
  if(["turkey","turkiye","türkiye"].includes(low)) return "Türkiye";
  if(["usa","united states of america","usmnt"].includes(low)) return "United States";
  return n;
}

function badge(team){
  const t = norm(team);
  return `<span class="badge">${FLAGS[t] || "⚽"} ${t}</span>`;
}

function teamScore(team, data = DATA){
  const t = norm(team);
  return data?.teamStats?.[t] || { points:0, played:0, wins:0, draws:0, losses:0, bonus:0 };
}

function ownerOf(team){
  const t = norm(team);
  return CONFIG.players.find(p => p.teams.map(norm).includes(t)) || null;
}

function allTrackedTeams(){
  return CONFIG.players.flatMap(p => p.teams.map(norm));
}

function buildLeaderboard(data = DATA, extraPoints = {}){
  return CONFIG.players.map(player => {
    const stats = player.teams.map(t => teamScore(t, data));
    const basePoints = stats.reduce((a,b)=>a + (b.points || 0), 0);
    const bonus = player.teams.reduce((sum,t)=>sum + (extraPoints[norm(t)] || 0), 0);
    return {
      name: player.name,
      teams: player.teams,
      points: basePoints + bonus,
      played: stats.reduce((a,b)=>a + (b.played || 0), 0),
      wins: stats.reduce((a,b)=>a + (b.wins || 0), 0),
      draws: stats.reduce((a,b)=>a + (b.draws || 0), 0),
      losses: stats.reduce((a,b)=>a + (b.losses || 0), 0)
    };
  }).sort((a,b) => b.points - a.points || b.wins - a.wins || a.name.localeCompare(b.name));
}

function rankOf(rows, playerName){
  return rows.findIndex(r => r.name === playerName) + 1;
}

function ordinal(n){
  if(!n) return "unranked";
  if(n === 1) return "1st";
  if(n === 2) return "2nd";
  if(n === 3) return "3rd";
  return `${n}th`;
}

function formatDate(dateStr){
  if(!dateStr) return "Date TBC";
  return new Date(dateStr).toLocaleString([], {weekday:"short", day:"numeric", month:"short", hour:"2-digit", minute:"2-digit"});
}

function getUpcomingMatches(){
  const tracked = new Set(allTrackedTeams());
  const now = Date.now();
  return (DATA.matches || [])
    .filter(m => {
      const home = norm(m.homeTeam);
      const away = norm(m.awayTeam);
      const status = String(m.status || "").toUpperCase();
      const time = m.utcDate ? new Date(m.utcDate).getTime() : Number.MAX_SAFE_INTEGER;
      return (tracked.has(home) || tracked.has(away)) && status !== "FINISHED" && time >= now - 60 * 60 * 1000;
    })
    .sort((a,b) => new Date(a.utcDate || "2999-01-01") - new Date(b.utcDate || "2999-01-01"));
}

function renderPodium(rows){
  const medals = ["🥇","🥈","🥉"];
  document.getElementById("podium").innerHTML = rows.slice(0,3).map((r,i)=>`
    <div class="podium-card">
      <div class="medal">${medals[i]}</div>
      <div class="name">${r.name}</div>
      <div class="badges">${r.teams.map(badge).join("")}</div>
      <div class="points">${r.points} pts</div>
    </div>
  `).join("");
}

function renderNextMatch(match){
  const el = document.getElementById("nextMatch");
  const status = document.getElementById("nextMatchStatus");

  if(!match){
    status.textContent = "None found";
    el.innerHTML = `<p class="error">No upcoming sweepstake fixtures found yet.</p>`;
    return;
  }

  const home = norm(match.homeTeam);
  const away = norm(match.awayTeam);
  const homeOwner = ownerOf(home);
  const awayOwner = ownerOf(away);

  let ownerLine = "";
  if(homeOwner && awayOwner){
    ownerLine = `${homeOwner.name} vs ${awayOwner.name}`;
  } else if(homeOwner){
    ownerLine = `${homeOwner.name}'s team plays next`;
  } else if(awayOwner){
    ownerLine = `${awayOwner.name}'s team plays next`;
  } else {
    ownerLine = "Next tracked match";
  }

  status.textContent = match.status || "Upcoming";

  el.innerHTML = `
    <div class="owner-line">${ownerLine}</div>
    <div class="match-line">${FLAGS[home] || "⚽"} ${home} <span class="muted">vs</span> ${FLAGS[away] || "⚽"} ${away}</div>
    <div class="match-time">${formatDate(match.utcDate)}</div>
    <div class="team-small">
      <span>${homeOwner ? `${homeOwner.name}: ${teamScore(home).points} team pts` : `${home}: not in sweepstake`}</span>
      <span>${awayOwner ? `${awayOwner.name}: ${teamScore(away).points} team pts` : `${away}: not in sweepstake`}</span>
    </div>
  `;
}

function scenarioText(team, outcome, beforeRows, afterRows){
  const owner = ownerOf(team);
  if(!owner) return null;

  const before = rankOf(beforeRows, owner.name);
  const after = rankOf(afterRows, owner.name);

  if(after === 1 && before !== 1) return `${owner.name} would move into 1st place.`;
  if(after < before) return `${owner.name} would move from ${ordinal(before)} to ${ordinal(after)}.`;
  if(after > before) return `${owner.name} would drop from ${ordinal(before)} to ${ordinal(after)}.`;
  return `${owner.name} would stay ${ordinal(before)}.`;
}

function renderImpact(match){
  const el = document.getElementById("impact");
  if(!match){
    el.innerHTML = `<div class="impact-card"><strong>No scenario yet</strong><p>Once fixtures are available, this will show what the next match could change.</p></div>`;
    return;
  }

  const home = norm(match.homeTeam);
  const away = norm(match.awayTeam);
  const homeOwner = ownerOf(home);
  const awayOwner = ownerOf(away);
  const beforeRows = buildLeaderboard();

  const cards = [];

  if(homeOwner){
    const afterWin = buildLeaderboard(DATA, {[home]: CONFIG.scoring.win});
    cards.push(`<div class="impact-card"><strong>If ${home} win</strong><p>${scenarioText(home, "win", beforeRows, afterWin)}</p></div>`);
  }

  if(homeOwner || awayOwner){
    const drawPoints = {};
    if(homeOwner) drawPoints[home] = CONFIG.scoring.draw;
    if(awayOwner) drawPoints[away] = CONFIG.scoring.draw;
    const afterDraw = buildLeaderboard(DATA, drawPoints);
    const drawLines = [];
    if(homeOwner) drawLines.push(scenarioText(home, "draw", beforeRows, afterDraw));
    if(awayOwner) drawLines.push(scenarioText(away, "draw", beforeRows, afterDraw));
    cards.push(`<div class="impact-card"><strong>If it is a draw</strong><p>${drawLines.filter(Boolean).join(" ")}</p></div>`);
  }

  if(awayOwner){
    const afterWin = buildLeaderboard(DATA, {[away]: CONFIG.scoring.win});
    cards.push(`<div class="impact-card"><strong>If ${away} win</strong><p>${scenarioText(away, "win", beforeRows, afterWin)}</p></div>`);
  }

  if(!cards.length){
    cards.push(`<div class="impact-card"><strong>No leaderboard impact</strong><p>This match does not include one of your sweepstake teams.</p></div>`);
  }

  el.innerHTML = cards.join("");
}

function renderLeaderboard(rows){
  document.getElementById("leaderboard").innerHTML = rows.map((r,i)=>`
    <tr>
      <td class="rank">${i+1}</td>
      <td><strong>${r.name}</strong></td>
      <td><div class="badges">${r.teams.map(badge).join("")}</div></td>
      <td class="points">${r.points}</td>
      <td>${r.wins}W ${r.draws}D ${r.losses}L</td>
    </tr>
  `).join("");
}

function renderUpcomingMatches(matches){
  const el = document.getElementById("matches");
  if(!matches.length){
    el.innerHTML = `<p class="error">No upcoming sweepstake fixtures found yet.</p>`;
    return;
  }

  el.innerHTML = matches.slice(0,5).map(m => {
    const home = norm(m.homeTeam);
    const away = norm(m.awayTeam);
    const homeOwner = ownerOf(home);
    const awayOwner = ownerOf(away);
    const ownerLabel = homeOwner && awayOwner ? `${homeOwner.name} vs ${awayOwner.name}` : homeOwner ? homeOwner.name : awayOwner ? awayOwner.name : "Tracked match";
    return `<div class="match-card">
      <div class="match-meta"><span>${formatDate(m.utcDate)}</span><span>${m.status || "Upcoming"}</span></div>
      <div class="match-card-title">${ownerLabel}</div>
      <div>${badge(home)} <span class="muted">vs</span> ${badge(away)}</div>
    </div>`;
  }).join("");
}

async function main(){
  try{
    [CONFIG, DATA] = await Promise.all([
      fetch("config.json", {cache:"no-store"}).then(r=>r.json()),
      fetch("data.json", {cache:"no-store"}).then(r=>r.json())
    ]);

    const status = document.getElementById("statusPill");
    const lastUpdated = document.getElementById("lastUpdated");

    if(DATA.error){
      status.textContent = "Needs setup";
      status.classList.add("bad");
      lastUpdated.textContent = DATA.error;
    } else {
      status.textContent = "Live data ready";
      status.classList.remove("bad");
      lastUpdated.textContent = DATA.lastUpdated ? `Updated ${new Date(DATA.lastUpdated).toLocaleString()}` : "Waiting for update";
    }

    const rows = buildLeaderboard();
    const upcoming = getUpcomingMatches();
    const nextMatch = upcoming[0];

    renderPodium(rows);
    renderNextMatch(nextMatch);
    renderImpact(nextMatch);
    renderLeaderboard(rows);
    renderUpcomingMatches(upcoming);
  } catch(err){
    console.error(err);
    document.getElementById("statusPill").textContent = "Site error";
    document.getElementById("statusPill").classList.add("bad");
    document.getElementById("lastUpdated").textContent = "Check config.json or data.json";
  }
}

document.getElementById("leaderboardToggle").addEventListener("click", () => {
  const panel = document.getElementById("leaderboardPanel");
  const button = document.getElementById("leaderboardToggle");
  panel.classList.toggle("hidden");
  const isOpen = !panel.classList.contains("hidden");
  button.textContent = isOpen ? "Hide Full Leaderboard" : "View Full Leaderboard";
  if(isOpen) panel.scrollIntoView({behavior:"smooth", block:"start"});
});

document.getElementById("refreshBtn").addEventListener("click", () => location.reload());

main();
