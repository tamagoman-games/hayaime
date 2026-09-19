function assignTeams(players, teamCount) {
  if (!Array.isArray(players)) {
    throw new TypeError("players must be an array");
  }

  if (!Number.isInteger(teamCount) || teamCount < 1) {
    throw new RangeError("teamCount must be a positive integer");
  }

  if (teamCount > players.length) {
    throw new RangeError("teamCount cannot exceed the number of players");
  }

  const shuffledPlayers = [...players];

  for (let i = shuffledPlayers.length - 1; i > 0; i--) {
    const randomIndex = Math.floor(Math.random() * (i + 1));

    [shuffledPlayers[i], shuffledPlayers[randomIndex]] = [
      shuffledPlayers[randomIndex],
      shuffledPlayers[i]
    ];
  }

  const teams = Array.from({ length: teamCount }, (_, index) => ({
    id: `team_${index + 1}`,
    players: []
  }));

  shuffledPlayers.forEach((player, index) => {
    teams[index % teamCount].players.push(player);
  });

  return teams;
}