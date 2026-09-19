function startApocalypseMode(game) {
  game.mode = "apocalypse";
  game.isApocalypse = true;

  showEventMessage("世界の均衡が崩れ始めた…");
  showEventMessage("終末モード突入");

  game.enemyPowerMultiplier = 1.5;
  game.diseaseRateMultiplier = 1.25;
  game.rareCardRateMultiplier = 2;
}