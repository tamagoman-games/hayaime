const CARD_POOL = [
  { id: "fire-burst", name: "火炎弾", type: "attack", cost: 3, power: 8, icon: "🔥", text: "火属性 8ダメージ" },
  { id: "water-shield", name: "水膜", type: "guard", cost: 2, power: 6, icon: "💧", text: "MP 2消費, 6軽減" },
  { id: "steel-strike", name: "鋼の一撃", type: "attack", cost: 4, power: 11, icon: "⚙️", text: "鋼属性 11ダメージ" },
  { id: "ground-hold", name: "土の壁", type: "guard", cost: 3, power: 5, icon: "🪨", text: "6軽減" },
  { id: "blind-flash", name: "閃光", type: "attack", cost: 5, power: 14, icon: "✨", text: "光属性 14ダメージ" },
  { id: "blood-pact", name: "血の契約", type: "power", cost: 0, power: 0, icon: "🩸", text: "HP 10失う, 3枚引く" },
  { id: "mad-warrior", name: "狂戦士", type: "power", cost: 0, power: 0, icon: "⚔️", text: "HP 5失う, 次の攻撃2倍" },
  { id: "lucky-draw", name: "幸運の一枚", type: "draw", cost: 1, power: 0, icon: "🍀", text: "カードを2枚引く" }
];

const state = {
  player: {
    hp: 50,
    mp: 20,
    luck: 5,
    gold: 10,
    hand: [],
    deck: [],
    activeDouble: false
  },
  enemy: {
    hp: 35
  },
  log: [],
  turn: 1
};

const logEl = document.getElementById("log");
const handEl = document.getElementById("hand");
const drawCardBtn = document.getElementById("drawCardBtn");
const endTurnBtn = document.getElementById("endTurnBtn");
const resetBtn = document.getElementById("resetBtn");

function addLog(message) {
  state.log.unshift(message);
  logEl.textContent = state.log.slice(0, 8).join("\\n");
}

function updateHud() {
  const { player } = state;
  document.getElementById("playerHp").textContent = player.hp;
  document.getElementById("playerMp").textContent = player.mp;
  document.getElementById("playerLuck").textContent = player.luck;

  document.getElementById("enemyHp").textContent = state.enemy.hp;

  const playerHpRatio = Math.max(0, (player.hp / 50) * 100);
  const playerMpRatio = Math.max(0, (player.mp / 20) * 100);
  const enemyHpRatio = Math.max(0, (state.enemy.hp / 35) * 100);

  document.getElementById("playerHpBar").style.width = `${playerHpRatio}%`;
  document.getElementById("playerMpBar").style.width = `${playerMpRatio}%`;
  document.getElementById("enemyHpBar").style.width = `${enemyHpRatio}%`;
}

function shuffle(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function initDeck() {
  state.player.deck = shuffle(CARD_POOL);
  state.player.hand = [];
  for (let i = 0; i < 7; i++) {
    drawCard();
  }
  state.turn = 1;
  updateHud();
  renderHand();
}

function drawCard() {
  if (state.player.deck.length === 0) {
    addLog("デッキが尽きた。");
    return;
  }

  const card = state.player.deck.pop();
  state.player.hand.push(card);
  renderHand();
  updateHud();
}

function useCard(cardId) {
  const card = state.player.hand.find((item) => item.id === cardId);
  if (!card) return;

  if (card.cost > state.player.mp) {
    addLog(`${card.name}を使うには MP が足りない。`);
    return;
  }

  state.player.hand = state.player.hand.filter((item) => item.id !== cardId);
  state.player.mp -= card.cost;

  if (card.type === "attack") {
    let damage = card.power + Math.max(0, state.player.luck - 5);
    if (state.player.activeDouble) {
      damage *= 2;
      state.player.activeDouble = false;
      addLog("狂戦士の効果で攻撃が2倍になった。");
    }

    state.enemy.hp -= damage;
    addLog(`${card.name}で ${damage} ダメージを与えた。`);
  } else if (card.type === "guard") {
    const gain = card.power + Math.max(0, state.player.luck - 5);
    state.player.hp = Math.min(50, state.player.hp + gain);
    addLog(`${card.name}で ${gain} 回復した。`);
  } else if (card.type === "power") {
    if (card.id === "blood-pact") {
      state.player.hp -= 10;
      addLog("血の契約：HPを10失い、3枚引いた。");
      for (let i = 0; i < 3; i++) drawCard();
    }

    if (card.id === "mad-warrior") {
      state.player.hp -= 5;
      state.player.activeDouble = true;
      addLog("狂戦士：HPを5失った。次の攻撃が2倍になる。");
    }
  } else if (card.type === "draw") {
    addLog(`${card.name}でカードを2枚引いた。`);
    for (let i = 0; i < 2; i++) drawCard();
  }

  if (state.player.hp <= 0) {
    state.player.hp = 0;
    addLog("HPが0になった。敗北。");
    disableAll();
  }

  if (state.enemy.hp <= 0) {
    state.enemy.hp = 0;
    addLog("敵を倒した。勝利！");
    disableAll();
  }

  renderHand();
  updateHud();
}

function renderHand() {
  handEl.innerHTML = "";
  state.player.hand.forEach((card) => {
    const btn = document.createElement("button");
    btn.className = "card-button";
    btn.type = "button";
    btn.innerHTML = `
      <span class="name">${card.icon} ${card.name}</span>
      <span class="meta">MP ${card.cost} / ${card.text}</span>
    `;
    btn.addEventListener("click", () => useCard(card.id));
    handEl.appendChild(btn);
  });
}

function enemyTurn() {
  if (state.enemy.hp <= 0 || state.player.hp <= 0) return;

  const basicDamage = 6 + Math.floor(Math.random() * 5);
  const finalDamage = Math.max(2, basicDamage - Math.floor(state.player.luck / 2));
  state.player.hp -= finalDamage;
  addLog(`敵の攻撃で ${finalDamage} ダメージ。`);

  if (state.player.hp <= 0) {
    state.player.hp = 0;
    addLog("プレイヤーは倒れた。");
    disableAll();
  }

  updateHud();
}

function endTurn() {
  enemyTurn();
  state.turn += 1;
  state.player.mp = Math.min(20, state.player.mp + 2);
  state.player.luck = Math.max(0, Math.min(10, state.player.luck + 1));
  addLog(`ターン ${state.turn} 開始。MPが2回復した。`);
  if (state.player.hand.length < 7) {
    drawCard();
  }
  updateHud();
  renderHand();
}

function disableAll() {
  drawCardBtn.disabled = true;
  endTurnBtn.disabled = true;
  document.querySelectorAll(".card-button").forEach((btn) => {
    btn.disabled = true;
  });
}

function resetGame() {
  state.player.hp = 50;
  state.player.mp = 20;
  state.player.luck = 5;
  state.player.gold = 10;
  state.player.hand = [];
  state.player.deck = [];
  state.player.activeDouble = false;
  state.enemy.hp = 35;
  state.log = [];
  drawCardBtn.disabled = false;
  endTurnBtn.disabled = false;
  addLog("新しい戦闘を開始。");
  initDeck();
  updateHud();
}

drawCardBtn.addEventListener("click", () => {
  if (state.player.hand.length >= 7) {
    addLog("手札が7枚に達している。");
    return;
  }
  drawCard();
});

endTurnBtn.addEventListener("click", endTurn);
resetBtn.addEventListener("click", resetGame);

resetGame();