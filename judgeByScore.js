function isAlive(player) {
  return player.hp > 0 && !player.isDefeated;
}

function judgeByScore(team) {
  const players = Array.isArray(team?.players) ? team.players : [];

  const aliveCount = players.filter(isAlive).length;

  const hp = players.reduce(
    (total, player) => total + Math.max(0, Number(player.hp) || 0),
    0
  );

  const luck = players.reduce(
    (total, player) => total + (Number(player.luck) || 0),
    0
  );

  const gold = players.reduce(
    (total, player) => total + (Number(player.gold) || 0),
    0
  );

  return aliveCount * 1000 + hp * 10 + luck * 5 + gold;
}