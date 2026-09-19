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