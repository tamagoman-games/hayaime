// ============================================================
// script.js — ゲームロジック
// (旧: src/card-effects.js, src/selectCard.js, src/statuses.js,
//      src/assignTeams.js, src/judgeByScore.js, src/compareTeams.js,
//      src/apocalypseMode.js を統合)
// cards.js より後に読み込んでください。
//
// ルールブック Ver.0.1 準拠に修正:
//  - 状態異常を7種類(毒/石化/混乱/病み/呪い/出血/沈黙)に対応
//  - 疾病の進行(風邪→高熱→衰弱→危篤)と毎ターン処理を追加
//  - 運(0〜10)を軸にした確率計算を追加
// ※ 発動確率の具体的な数値(混乱・出血・呪いの運低下・疾病悪化)は
//   ルールブックに明記が無いため、このファイル内の定数として
//   仮の値を設定しています。バランス調整時はこの定数だけを
//   変更すれば挙動を調整できます。危篤時の5%死亡だけはルール
//   ブックに明記された値をそのまま使用しています。
// ============================================================

// ---- 運まわりの共通定義 ---------------------------------------------

const LUCK_MIN = 0;
const LUCK_MAX = 10;
const LUCK_DEFAULT = 5;

function clampLuck(value) {
  return Math.max(LUCK_MIN, Math.min(LUCK_MAX, value));
}

// 危篤中は運が0に固定されるため、確率計算には必ずこちらを使う。
function getEffectiveLuck(player) {
  if (hasDisease(player, "critical")) {
    return 0;
  }
  return clampLuck(player.luck);
}

// 運が高いほど不利な事象の確率が下がり、低いほど上がるように補正する。
// baseChance は運5(初期値)のときの発生確率。
function luckAdjustedChance(baseChance, luck, sensitivity = 0.03) {
  const delta = (LUCK_DEFAULT - clampLuck(luck)) * sensitivity;
  return Math.min(1, Math.max(0, baseChance + delta));
}

// ---- 状態異常・疾病 ---------------------------------------------

const STATUS_NAMES = {
  poison: "毒",
  petrified: "石化",
  confusion: "混乱",
  yami: "病み",
  curse: "呪い",
  bleeding: "出血",
  silenced: "沈黙"
};

const DISEASE_NAMES = {
  cold: "風邪",
  highFever: "高熱",
  weakness: "衰弱",
  critical: "危篤"
};

// 風邪→高熱→衰弱→危篤 の進行順。危篤より先は無い(死亡判定のみ)。
const DISEASE_PROGRESSION = {
  cold: "highFever",
  highFever: "weakness",
  weakness: "critical"
};

// 疾病の毎ターンHP減少量。
const DISEASE_PER_TURN_DAMAGE = {
  cold: 1,
  highFever: 2,
  weakness: 5,
  critical: 5
};

// 各種確率(仮定値。要調整)
const CONFUSION_BASE_CHANCE = 0.3; // 混乱: カード使用時に自分に発動する基準確率
const BLEEDING_BASE_CHANCE = 0.25; // 出血: 追加ダメージが発生する基準確率
const BLEEDING_EXTRA_DAMAGE_RATIO = 0.5; // 出血: 追加ダメージ = 元ダメージ×この割合(端数切り上げ)
const CURSE_LUCK_DROP_CHANCE = 0.2; // 呪い: 行動時に運-1が発生する確率
const DISEASE_PROGRESSION_BASE_CHANCE = 0.15; // 疾病: 毎ターン悪化する基準確率
const CRITICAL_DEATH_CHANCE = 0.05; // 危篤: 毎ターン5%で死亡(ルールブック明記値)

function hasStatus(player, status) {
  return Array.isArray(player.statuses) && player.statuses.includes(status);
}

function hasDisease(player, disease) {
  return Array.isArray(player.diseases) && player.diseases.includes(disease);
}

function addStatus(player, status) {
  player.statuses ??= [];

  if (!player.statuses.includes(status)) {
    player.statuses.push(status);
  }

  // 石化は3ターン行動不能。カウンターを(再)セットする。
  if (status === "petrified") {
    player.petrifyTurnsRemaining = 3;
  }
}

function removeStatusFromPlayer(player, status) {
  player.statuses ??= [];
  player.statuses = player.statuses.filter((s) => s !== status);

  if (status === "petrified") {
    player.petrifyTurnsRemaining = 0;
  }
}

function applyDisease(target, disease) {
  target.diseases ??= [];

  if (!target.diseases.includes(disease)) {
    target.diseases.push(disease);
  }

  // 衰弱は発症時に運-3(ルールブック明記)。
  if (disease === "weakness") {
    target.luck = clampLuck(target.luck - 3);
  }
}

function removeDiseaseFromPlayer(player, disease) {
  player.diseases ??= [];
  player.diseases =
    disease === true ? [] : player.diseases.filter((d) => d !== disease);
}

// 石化中は行動できない(呼び出し側のゲームループから毎ターン確認する)。
function canAct(player) {
  return !hasStatus(player, "petrified");
}

// カードが呪文・魔法に該当するかどうかの判定。
// 現状のカードデータには呪文/魔法を明示するフィールドが無いため、
// card.type または card.categories に "呪文"/"魔法" が含まれる場合のみ
// 対象とする。該当カードが増えたらここに合わせてカードデータ側に
// type: "spell" / "magic" を付与すること。
function isSpellOrMagicCard(card) {
  if (card.type === "spell" || card.type === "magic") {
    return true;
  }

  return Boolean(
    card.categories?.includes("呪文") || card.categories?.includes("魔法")
  );
}

// カードが使用可能かどうかの事前チェック(石化・沈黙)。
function checkCardUsable(actor, card) {
  if (hasStatus(actor, "petrified")) {
    return { allowed: false, reason: "石化中のため行動できない。" };
  }

  if (hasStatus(actor, "silenced") && isSpellOrMagicCard(card)) {
    return { allowed: false, reason: "沈黙中のため呪文・魔法が使えない。" };
  }

  return { allowed: true };
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

// 病み・混乱による対象の強制変更。
//  - 病み: 治るまで全カードが自分にしか使えない(確定で自分)。
//  - 混乱: 運が低いほど高確率で、対象に関わらず自分に発動する。
function resolveActualRecipient(card, actor, intendedRecipient) {
  if (hasStatus(actor, "yami")) {
    return { recipient: actor, confused: false, forcedByYami: true };
  }

  if (
    hasStatus(actor, "confusion") &&
    intendedRecipient !== actor &&
    Math.random() < luckAdjustedChance(CONFUSION_BASE_CHANCE, getEffectiveLuck(actor))
  ) {
    return { recipient: actor, confused: true, forcedByYami: false };
  }

  return { recipient: intendedRecipient, confused: false, forcedByYami: false };
}

// ダメージ処理を一箇所に集約し、出血・石化の判定をここで行う。
// source: "attack" | "spell" | "magic" | "other"
function applyDamage(recipient, amount, source = "attack") {
  if (amount <= 0) {
    return { applied: 0, blocked: false, extraDamage: 0 };
  }

  // 石化中は攻撃・呪文(魔法含む)によるダメージを受けない。
  if (hasStatus(recipient, "petrified") && ["attack", "spell", "magic"].includes(source)) {
    return { applied: 0, blocked: true, extraDamage: 0 };
  }

  recipient.hp -= amount;
  let extraDamage = 0;

  // 出血: 攻撃・呪文・魔法によるダメージ時のみ追加ダメージ判定。
  if (hasStatus(recipient, "bleeding") && ["attack", "spell", "magic"].includes(source)) {
    const chance = luckAdjustedChance(BLEEDING_BASE_CHANCE, getEffectiveLuck(recipient));

    if (Math.random() < chance) {
      extraDamage = Math.max(1, Math.ceil(amount * BLEEDING_EXTRA_DAMAGE_RATIO));
      recipient.hp -= extraDamage;
    }
  }

  return { applied: amount, blocked: false, extraDamage };
}

// カード使用の「宣言」フェーズ。コストを支払い、対象(病み/混乱による
// 強制変更込み)を確定し、攻撃なら生ダメージ量を計算するところまでを行う。
// ダメージそのものはまだ適用しない — 攻撃側と防御側の間に防御フェーズ
// (防御カードによる軽減)を挟めるようにするための分割。
// 防御フェーズが不要な即時解決には applyCardEffect を使う。
function resolveCardUse(card, actor, target) {
  const usable = checkCardUsable(actor, card);

  if (!usable.allowed) {
    return { success: false, message: usable.reason };
  }

  if (!canPayCost(card, actor)) {
    return {
      success: false,
      message: `${card.name}を使うためのコストが足りない。`
    };
  }

  // コストは常に使用者(actor)が支払う。
  payCost(card, actor);

  const effect = card.effect || {};
  const intendedRecipient = resolveRecipient(card, actor, target);
  const { recipient, confused } = resolveActualRecipient(card, actor, intendedRecipient);

  // 呪い: 行動したこと自体で、一定確率で使用者の運が-1される。
  if (hasStatus(actor, "curse") && Math.random() < CURSE_LUCK_DROP_CHANCE) {
    actor.luck = clampLuck(actor.luck - 1);
  }

  const rawDamage = effect.hp < 0 ? -effect.hp : 0;
  const damageSource = card.type === "spell" || card.type === "magic" ? card.type : "attack";

  return {
    success: true,
    card,
    recipientRef: recipient,
    confused,
    rawDamage,
    damageSource
  };
}

// カード使用の「解決」フェーズ。resolveCardUse() の結果(またはそこから
// 導いたcard/recipient/meta)を受け取り、実際にダメージ・回復・状態異常
// などを適用する。finalDamage を渡すと防御による軽減後の値として使われ、
// null/undefinedならrawDamageそのままダメージが通る。
function finalizeCardEffect(card, recipient, finalDamage, meta = {}) {
  const { confused = false, rawDamage = 0, damageSource = "attack" } = meta;
  const effect = card.effect || {};

  if (rawDamage > 0) {
    applyDamage(recipient, finalDamage != null ? finalDamage : rawDamage, damageSource);
  } else if (effect.hp > 0) {
    // 呪い: 回復量半減。
    const healAmount = hasStatus(recipient, "curse")
      ? Math.floor(effect.hp / 2)
      : effect.hp;
    recipient.hp += healAmount;
  }

  if (effect.mp) {
    const mpAmount =
      effect.mp > 0 && hasStatus(recipient, "curse")
        ? Math.floor(effect.mp / 2)
        : effect.mp;
    recipient.mp += mpAmount;
  }

  recipient.gold += effect.gold || 0;

  if (effect.luck) {
    recipient.luck = clampLuck(recipient.luck + effect.luck);
  }

  if (card.id === "lottery") {
    if (typeof calculateLotteryGold === "function") {
      recipient.gold += calculateLotteryGold(recipient.luck);
    }
  }

  if (card.applyStatus) {
    for (const status of card.applyStatus) {
      addStatus(recipient, status);
    }
  }

  if (card.removeStatus) {
    for (const status of card.removeStatus) {
      removeStatusFromPlayer(recipient, status);
    }
  }

  if (card.removeDisease) {
    removeDiseaseFromPlayer(recipient, card.removeDisease);
  }

  if (card.applyDisease) {
    applyDisease(recipient, card.applyDisease);
  }

  const message = confused
    ? `${card.name}を使用したが、混乱により自分に発動した。`
    : `${card.name}を使用した。`;

  return { success: true, message };
}

// 防御フェーズを挟まず即時解決する、従来どおりのAPI(後方互換用)。
function applyCardEffect(card, actor, target) {
  const resolved = resolveCardUse(card, actor, target);

  if (!resolved.success) {
    return resolved;
  }

  return finalizeCardEffect(resolved.card, resolved.recipientRef, null, {
    confused: resolved.confused,
    rawDamage: resolved.rawDamage,
    damageSource: resolved.damageSource
  });
}

// ---- 防御カード ---------------------------------------------------
// 防御カード(cards.js の CARDS_DEFENSE)は山札を消費しない特別な
// アクション。コスト(MP/GOLD)さえ払えれば、攻撃1回に対して何度でも
// 使うことができる(回数制限は掛けていない)。

function canUseDefenseCard(card, defender) {
  const cost = card.cost || {};
  return defender.mp >= (cost.mp || 0) && defender.gold >= (cost.gold || 0);
}

function useDefenseCard(card, defender) {
  if (!canUseDefenseCard(card, defender)) {
    return {
      success: false,
      message: `${card.name}を使うためのコストが足りない。`,
      block: 0
    };
  }

  const cost = card.cost || {};
  defender.mp -= cost.mp || 0;
  defender.gold -= cost.gold || 0;

  return {
    success: true,
    message: `${defender.name}が${card.name}で防御した(軽減${card.block})。`,
    block: card.block || 0
  };
}

// ---- 毎ターン処理(状態異常・疾病・石化) ------------------------------

// 疾病の悪化判定。運が低いほど悪化しやすい。
function tryProgressDisease(player) {
  if (!Array.isArray(player.diseases)) {
    return;
  }

  const luck = getEffectiveLuck(player);

  // 後ろから処理して、進行によって配列を書き換えても安全にする。
  for (let i = player.diseases.length - 1; i >= 0; i--) {
    const current = player.diseases[i];
    const next = DISEASE_PROGRESSION[current];

    if (!next) {
      continue; // 危篤は最終段階
    }

    const chance = luckAdjustedChance(DISEASE_PROGRESSION_BASE_CHANCE, luck);

    if (Math.random() < chance) {
      player.diseases[i] = next;

      if (next === "weakness") {
        player.luck = clampLuck(player.luck - 3);
      }
    }
  }
}

// 疾病による毎ターンのHP減少・危篤の運固定・死亡判定。
function processDiseasesTurn(player) {
  if (!Array.isArray(player.diseases) || player.diseases.length === 0) {
    return;
  }

  for (const disease of player.diseases) {
    player.hp -= DISEASE_PER_TURN_DAMAGE[disease] || 0;
  }

  if (player.diseases.includes("critical")) {
    player.luck = 0; // 危篤: 運は0に固定

    if (Math.random() < CRITICAL_DEATH_CHANCE) {
      player.hp = 0;
      player.isDefeated = true;
    }
  }
}

// 毒による毎ターンのHP/MP/GOLD減少。
function processStatusesTurn(player) {
  if (hasStatus(player, "poison")) {
    player.hp -= 1;
    player.mp = Math.max(0, player.mp - 1);
    player.gold = Math.max(0, player.gold - 1);
  }
}

// 石化の残りターン数を進め、0になったら解除する。
function processPetrificationTurn(player) {
  if (!hasStatus(player, "petrified")) {
    return;
  }

  player.petrifyTurnsRemaining = (player.petrifyTurnsRemaining ?? 3) - 1;

  if (player.petrifyTurnsRemaining <= 0) {
    removeStatusFromPlayer(player, "petrified");
  }
}

// ゲームループから、1人のプレイヤーについて1ターン分の終了時処理として
// 呼び出す想定のエントリーポイント。
function processPlayerTurnEnd(player) {
  if (player.isDefeated || player.hp <= 0) {
    return;
  }

  processStatusesTurn(player);
  processDiseasesTurn(player);
  tryProgressDisease(player);
  processPetrificationTurn(player);

  if (player.hp <= 0) {
    player.hp = 0;
    player.isDefeated = true;
  }
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

  if (
    hasDisease(ai, "cold") ||
    hasDisease(ai, "highFever") ||
    hasDisease(ai, "weakness") ||
    hasDisease(ai, "critical")
  ) {
    const card = hand.find(isDiseaseRecoveryCard);

    if (card) {
      return card;
    }
  }

  if (getEffectiveLuck(ai) <= 3) {
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

// 200ターン到達時の強制決着で使う順位ポイント計算式。
// 生存人数×1000 + 総HP×10 + 総運×5 + 総GOLD (ルールブック通り)
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

// ---- 終焉モード -----------------------------------------------------
//
// ルールブックの終焉モードは複数の設定(通常100T/早期終焉75T/終焉世界)と
// 5段階の進行(HP減少→運減少→異形活性化→疾病暴走→終末イベント)を持つ。
// 元のstartApocalypseModeは単一の乗数セットしか持たなかったため、
// 設定と段階の両方を扱えるよう拡張した。

const APOCALYPSE_MODE_SETTINGS = {
  normal: { triggerTurn: 100 },
  early: { triggerTurn: 75 },
  world: { triggerTurn: 1 } // 終焉世界: 1ターン目から開始
};

const APOCALYPSE_STAGE_TURN_INTERVAL = 20; // 各段階の目安間隔(仮定値。要調整)

function getApocalypseStage(turnsSinceStart) {
  if (turnsSinceStart < APOCALYPSE_STAGE_TURN_INTERVAL) return 1; // HP-1/ターン
  if (turnsSinceStart < APOCALYPSE_STAGE_TURN_INTERVAL * 2) return 2; // 運減少開始
  if (turnsSinceStart < APOCALYPSE_STAGE_TURN_INTERVAL * 3) return 3; // 異形活性化
  if (turnsSinceStart < APOCALYPSE_STAGE_TURN_INTERVAL * 4) return 4; // 疾病暴走
  return 5; // 終末イベント発生
}

function startApocalypseMode(game, modeKey = "normal") {
  const settings = APOCALYPSE_MODE_SETTINGS[modeKey] || APOCALYPSE_MODE_SETTINGS.normal;

  game.mode = "apocalypse";
  game.isApocalypse = true;
  game.apocalypseModeKey = modeKey;
  game.apocalypseStartTurn = settings.triggerTurn;
  game.apocalypseStage = 1;

  showEventMessage("世界の均衡が崩れ始めた…");
  showEventMessage("終末モード突入");

  game.enemyPowerMultiplier = 1.5;
  game.diseaseRateMultiplier = 1.25;
  game.rareCardRateMultiplier = 2;
}

// 終焉モード中、毎ターン呼び出して段階を更新し、各段階の効果を players に適用する。
function advanceApocalypseStage(game, players) {
  if (!game.isApocalypse) {
    return;
  }

  const turnsSinceStart = Math.max(0, (game.currentTurn ?? 0) - game.apocalypseStartTurn);
  const stage = getApocalypseStage(turnsSinceStart);
  game.apocalypseStage = stage;

  for (const player of players) {
    if (player.isDefeated || player.hp <= 0) {
      continue;
    }

    // 第一段階以降: 全員 毎ターンHP-1
    if (stage >= 1) {
      player.hp -= 1;
    }

    // 第二段階以降: 全員 運減少開始
    if (stage >= 2) {
      player.luck = clampLuck(player.luck - 1);
    }

    // 第三段階: 異形活性化(行動率上昇) は異形側のロジックで
    // game.enemyPowerMultiplier / 行動頻度を参照して処理する想定。
    if (stage >= 3) {
      game.enemyActionRateMultiplier = 1.5;
    }

    // 第四段階: 疾病暴走(悪化率上昇)
    if (stage >= 4) {
      game.diseaseRateMultiplier = 2;
    }

    if (player.hp <= 0) {
      player.hp = 0;
      player.isDefeated = true;
    }
  }

  // 第五段階: 終末イベント発生(疫病/流星群/奇跡/異形の宴など)は
  // 個別のイベント抽選ロジック側で stage === 5 を見て発火させる想定。
}
