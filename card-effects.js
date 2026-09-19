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

function applyCardEffect(card, actor, target) {
  if (!canPayCost(card, actor)) {
    return {
      success: false,
      message: `${card.name}を使うためのコストが足りない。`
    };
  }

  payCost(card, actor);

  const effect = card.effect || {};

  actor.hp += effect.hp || 0;
  actor.gold += effect.gold || 0;
  actor.luck += effect.luck || 0;

  if (card.id === "lottery") {
    actor.gold += calculateLotteryGold(actor.luck);
  }

  if (target && effect.hp < 0) {
    target.hp += effect.hp;
  }

  if (target && effect.gold < 0) {
    target.gold += effect.gold;
  }

  if (target && effect.luck < 0) {
    target.luck += effect.luck;
  }

  if (card.applyStatus && target) {
    target.statuses ??= [];

    for (const status of card.applyStatus) {
      if (!target.statuses.includes(status)) {
        target.statuses.push(status);
      }
    }
  }

  if (card.removeStatus) {
    actor.statuses ??= [];
    actor.statuses = actor.statuses.filter(
      (status) => !card.removeStatus.includes(status)
    );
  }

  return {
    success: true,
    message: `${card.name}を使用した。`
  };
}