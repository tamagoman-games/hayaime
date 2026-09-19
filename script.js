// ============================================================
// script.js — ゲームロジック
// (旧: src/card-effects.js, src/selectCard.js, src/statuses.js,
//      src/assignTeams.js, src/judgeByScore.js, src/compareTeams.js,
//      src/apocalypseMode.js を統合)
// cards.js より後に読み込んでください。
// ============================================================

// ---- 状態異常・疾病 ---------------------------------------------

const STATUS_NAMES = {
  poison: "毒",
  confusion: "混乱",
  curse: "呪い",
  bleeding: "出血",
  yami: "闇"
};

const DISEASE_NAMES = {
  cold: "風邪",
  critical: "重体"
};

function applyDisease(target, disease) {
  target.diseases ??= [];

  if (!target.diseases.includes(disease)) {
    target.diseases.push(disease);
  }
}

// ---- カード効果の適用 ---------------------------------------------

function canPayCost(card, actor) {
  const cost = card.cost || {};

  return (
    actor.hp > (cost.hp || 0) &&
    actor.mp >= (cost.mp || 0) &&
    actor.gold >= (cost.gold || 0)
  );
}

function payCost(card, actor) {
  const cost = card.cost || {};

  actor.hp -= cost.hp || 0;
  actor.mp -= cost.mp || 0;
  actor.gold -= cost.gold || 0;
}

// カードのtargetに応じて、効果を受け取るのが actor(使用者)なのか
// target(選択された相手)なのかを決定する。
// これが無いと、敵に向けた攻撃カードの効果が使用者自身にも
// 適用されてしまったり(自傷)、味方への回復カードが使用者自身を
// 回復してしまったりする(誤爆)。
function resolveRecipient(card, actor, target) {
  const targetType = card.target || "self";

  if (targetType === "self") {
    return actor;
  }

  // enemy / any / all / allEnemies など。
  // targetが渡されていない場合は安全側に倒してactorに適用する。
  return target || actor;
}

function applyCardEffect(card, actor, target) {
  if (!canPayCost(card, actor)) {
    return {
      success: false,
      message: `${card.name}を使うためのコストが足りない。`
    };
  }

  // コストは常に使用者(actor)が支払う。
  payCost(card, actor);

  const effect = card.effect || {};
  const recipient = resolveRecipient(card, actor, target);

  recipient.hp += effect.hp || 0;
  recipient.mp += effect.mp || 0;
  recipient.gold += effect.gold || 0;
  recipient.luck += effect.luck || 0;

  if (card.id === "lottery") {
    if (typeof calculateLotteryGold === "function") {
      recipient.gold += calculateLotteryGold(recipient.luck);
    }
  }

  if (card.applyStatus) {
    recipient.statuses ??= [];

    for (const status of card.applyStatus) {
      if (!recipient.statuses.includes(status)) {
        recipient.statuses.push(status);
      }
    }
  }

  if (card.removeStatus) {
    recipient.statuses ??= [];
    recipient.statuses = recipient.statuses.filter(
      (status) => !card.removeStatus.includes(status)
    );
  }

  if (card.removeDisease) {
    recipient.diseases ??= [];
    recipient.diseases =
      card.removeDisease === true
        ? []
        : recipient.diseases.filter(
            (disease) => disease !== card.removeDisease
          );
  }

  return {
    success: true,
    message: `${card.name}を使用した。`
  };
}

// ---- AIのカード選択ロジック ---------------------------------------

function isRecoveryCard(card) {
  return (
    card.categories?.includes("回復") ||
    card.effect?.hp > 0
  );
}

function isDiseaseRecoveryCard(card) {
  return (
    Boolean(card.removeDisease) ||
    card.categories?.includes("疾病")
  );
}

function isLuckCard(card) {
  return (
    card.effect?.luck > 0 ||
    card.categories?.includes("運")
  );
}

function strongestAttack(hand) {
  const attackCards = hand.filter(
    (card) => card.target === "enemy" && (card.effect?.hp ?? 0) < 0
  );

  if (attackCards.length === 0) {
    return null;
  }

  return attackCards.reduce((strongest, card) =>
    card.effect.hp < strongest.effect.hp ? card : strongest
  );
}

function selectCard(ai) {
  const hand = Array.isArray(ai.hand) ? ai.hand : [];

  if (hand.length === 0) {
    return null;
  }

  if (ai.hp <= 10) {
    const card = hand.find(isRecoveryCard);

    if (card) {
      return card;
    }
  }

  if (ai.hasDisease()) {
    const card = hand.find(isDiseaseRecoveryCard);

    if (card) {
      return card;
    }
  }

  if (ai.luck <= 3) {
    const card = hand.find(isLuckCard);

    if (card) {
      return card;
    }
  }

  return strongestAttack(hand) ?? hand[0];
}

// ---- チーム分け ---------------------------------------------------

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

// ---- スコア判定・チーム比較 -----------------------------------------

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

// ---- 終末モード -----------------------------------------------------

function startApocalypseMode(game) {
  game.mode = "apocalypse";
  game.isApocalypse = true;

  showEventMessage("世界の均衡が崩れ始めた…");
  showEventMessage("終末モード突入");

  game.enemyPowerMultiplier = 1.5;
  game.diseaseRateMultiplier = 1.25;
  game.rareCardRateMultiplier = 2;
}
