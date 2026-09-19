function compareTeams(teamA, teamB) {
  const scoreA = judgeByScore(teamA);
  const scoreB = judgeByScore(teamB);

  if (scoreA > scoreB) {
    return {
      result: "win",
      winner: teamA.id,
      scoreA,
      scoreB
    };
  }

  if (scoreB > scoreA) {
    return {
      result: "win",
      winner: teamB.id,
      scoreA,
      scoreB
    };
  }

  return {
    result: "draw",
    winner: null,
    scoreA,
    scoreB
  };
}