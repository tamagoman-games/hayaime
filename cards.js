// ============================================================
// cards.js — カードデータ & カード参照ロジック
// (旧: data/cards/*.json, data/catalog.json, data/events.json,
//      data/npc_actions.json, src/cards.js を統合)
// ブラウザでそのまま読み込めるよう、require/module.exports は
// 使わずグローバルな定数・関数として公開しています。
// index.html では他のスクリプトより先に読み込んでください。
// ============================================================

// ---- カードデータ(カテゴリ別) --------------------------------

const CARDS_ATTACK = [
  {
    "id": "kick",
    "name": "蹴る",
    "rank": "normal",
    "target": "enemy",
    "effect": {
      "hp": -2
    }
  },
  {
    "id": "slap",
    "name": "平手打ち",
    "rank": "normal",
    "target": "enemy",
    "effect": {
      "hp": -1
    }
  },
  {
    "id": "headbutt",
    "name": "頭突き",
    "rank": "normal",
    "target": "enemy",
    "effect": {
      "hp": -3
    }
  },
  {
    "id": "chair",
    "name": "パイプ椅子",
    "rank": "normal",
    "target": "enemy",
    "effect": {
      "hp": -4
    }
  },
  {
    "id": "frying_pan",
    "name": "フライパン",
    "rank": "good",
    "target": "enemy",
    "effect": {
      "hp": -5
    }
  },
  {
    "id": "bicycle_collision",
    "name": "自転車衝突",
    "rank": "good",
    "target": "enemy",
    "effect": {
      "hp": -6
    }
  },
  {
    "id": "motorcycle",
    "name": "バイク事故",
    "rank": "powerful",
    "target": "enemy",
    "effect": {
      "hp": -10
    },
    "applyStatus": [
      "bleeding"
    ]
  },
  {
    "id": "traffic_accident",
    "name": "交通事故",
    "rank": "powerful",
    "target": "enemy",
    "effect": {
      "hp": -12
    },
    "applyStatus": [
      "bleeding"
    ]
  },
  {
    "id": "construction_accident",
    "name": "工事現場事故",
    "rank": "powerful",
    "target": "enemy",
    "effect": {
      "hp": -13
    }
  },
  {
    "id": "truck_crash",
    "name": "大型トラック事故",
    "rank": "legendary",
    "target": "enemy",
    "effect": {
      "hp": -20
    },
    "applyStatus": [
      "bleeding"
    ]
  },
  {
    "id": "building_collapse",
    "name": "ビル崩落",
    "rank": "legendary",
    "target": "all",
    "effect": {
      "hp": -15
    }
  },
  {
    "id": "train_crash",
    "name": "列車衝突",
    "rank": "legendary",
    "target": "allEnemies",
    "effect": {
      "hp": -18
    }
  }
];

const CARDS_ECONOMY = [
  {
    "id": "allowance",
    "name": "お小遣い",
    "rank": "normal",
    "target": "all",
    "effect": {
      "gold": 5
    }
  },
  {
    "id": "salary",
    "name": "給料日",
    "rank": "normal",
    "target": "self",
    "effect": {
      "gold": 10
    }
  },
  {
    "id": "bonus",
    "name": "ボーナス",
    "rank": "good",
    "target": "self",
    "effect": {
      "gold": 20
    }
  },
  {
    "id": "stock_profit",
    "name": "株で儲ける",
    "rank": "powerful",
    "target": "self",
    "effect": {
      "gold": 30
    }
  },
  {
    "id": "shiny_coin",
    "name": "光るコイン",
    "rank": "normal",
    "target": "self",
    "effect": {
      "gold": 5,
      "luck": 1
    }
  },
  {
    "id": "promotion",
    "name": "昇進",
    "rank": "powerful",
    "target": "self",
    "cost": {
      "mp": 3
    },
    "effect": {
      "gold": 15,
      "luck": 2
    }
  }
];

const CARDS_RECOVERY = [
  {
    "id": "drink_water",
    "name": "水を飲む",
    "rank": "normal",
    "target": "any",
    "effect": {
      "hp": 2
    }
  },
  {
    "id": "take_break",
    "name": "ひと休み",
    "rank": "normal",
    "target": "any",
    "effect": {
      "hp": 3
    }
  },
  {
    "id": "sleep_well",
    "name": "熟睡",
    "rank": "normal",
    "target": "any",
    "effect": {
      "hp": 5
    }
  },
  {
    "id": "vitamin",
    "name": "栄養ドリンク",
    "rank": "good",
    "target": "any",
    "effect": {
      "hp": 4,
      "mp": 3
    }
  },
  {
    "id": "hospitalization",
    "name": "入院",
    "rank": "powerful",
    "target": "any",
    "effect": {
      "hp": 15
    },
    "removeStatus": [
      "bleeding"
    ]
  },
  {
    "id": "antidote",
    "name": "解毒剤",
    "rank": "powerful",
    "target": "any",
    "removeStatus": [
      "poison"
    ]
  },
  {
    "id": "bandage",
    "name": "包帯",
    "rank": "normal",
    "target": "any",
    "removeStatus": [
      "bleeding"
    ]
  },
  {
    "id": "cpR",
    "name": "救命処置",
    "rank": "legendary",
    "target": "any",
    "removeDisease": "critical"
  }
];

const CARDS_LUCK = [
  {
    "id": "lucky_day",
    "name": "ツイてる日",
    "rank": "powerful",
    "target": "self",
    "effect": {
      "luck": 4
    }
  },
  {
    "id": "good_luck_charm",
    "name": "お守り",
    "rank": "powerful",
    "target": "any",
    "effect": {
      "luck": 3
    }
  },
  {
    "id": "lucky_charm",
    "name": "厄除け",
    "rank": "powerful",
    "target": "any",
    "removeStatus": [
      "curse"
    ]
  },
  {
    "id": "fortune_telling",
    "name": "怪しい占い",
    "rank": "good",
    "target": "any",
    "special": "10%で魔女召喚"
  },
  {
    "id": "strange_present",
    "name": "異形の贈り物",
    "rank": "legendary",
    "target": "self",
    "summon": "random"
  }
];

const CARDS_MISC = [
  {
    "id": "pet_dog",
    "name": "犬に癒される",
    "rank": "good",
    "target": "any",
    "effect": {
      "hp": 5,
      "luck": 1
    }
  }
];

const CARDS_BY_CATEGORY = {
  attack: CARDS_ATTACK,
  economy: CARDS_ECONOMY,
  recovery: CARDS_RECOVERY,
  luck: CARDS_LUCK,
  misc: CARDS_MISC
};

const ALL_CARDS = [
  ...CARDS_ATTACK,
  ...CARDS_ECONOMY,
  ...CARDS_RECOVERY,
  ...CARDS_LUCK,
  ...CARDS_MISC
];

const CARDS_BY_ID = new Map(ALL_CARDS.map((card) => [card.id, card]));

function getCardById(id) {
  return CARDS_BY_ID.get(id) ?? null;
}

function getCardsByCategory(category) {
  return CARDS_BY_CATEGORY[category] ?? [];
}

// ---- カード図鑑用データ ----------------------------------------

const CARD_CATALOG = [
  {
    "id": "drop_of_life",
    "name": "いのちのしずく",
    "rank": "legendary",
    "categories": [
      "回復",
      "状態異常",
      "疾病",
      "運"
    ],
    "summary": [
      "HP +10",
      "全状態異常解除",
      "全疾病回復",
      "運 +2"
    ]
  }
];

// ---- ワールドイベント(終末モードなど) ---------------------------

const WORLD_EVENTS = [
  {
    "event": "world_balance_broken",
    "name": "終末モード突入",
    "message": "世界の均衡が崩れ始めた…",
    "mode": "apocalypse",
    "effects": {
      "turnLimit": 100,
      "enemyPowerMultiplier": 1.5,
      "diseaseRateMultiplier": 1.25,
      "rareCardRateMultiplier": 2
    }
  }
];

// ---- NPC(妖精/妖怪/魔女/悪魔/天使)の行動テーブル -----------------

const NPC_ACTIONS = {
  "fairy": {
    "actions": [
      {
        "weight": 40,
        "name": "祝福",
        "effect": {
          "luck": 1
        }
      },
      {
        "weight": 20,
        "name": "癒し",
        "effect": {
          "hp": 3
        }
      },
      {
        "weight": 15,
        "name": "応援",
        "effect": {
          "mp": 2
        }
      },
      {
        "weight": 10,
        "name": "幸運のおすそ分け",
        "effect": {
          "gold": 3
        }
      },
      {
        "weight": 10,
        "name": "浄化",
        "removeRandomStatus": true
      },
      {
        "weight": 5,
        "name": "奇跡",
        "effect": {
          "luck": 3,
          "hp": 10
        }
      }
    ]
  },
  "youkai": {
    "actions": [
      {
        "weight": 30,
        "name": "悪戯",
        "effect": {
          "hp": -3
        }
      },
      {
        "weight": 20,
        "name": "金縛り",
        "applyStatus": [
          "confusion"
        ]
      },
      {
        "weight": 15,
        "name": "不幸のおすそ分け",
        "effect": {
          "luck": -1
        }
      },
      {
        "weight": 15,
        "name": "物隠し",
        "effect": {
          "gold": -5
        }
      },
      {
        "weight": 10,
        "name": "病の気配",
        "applyDisease": "cold"
      },
      {
        "weight": 5,
        "name": "百鬼夜行",
        "multiAction": 2
      },
      {
        "weight": 5,
        "name": "大祟り",
        "applyStatus": [
          "curse"
        ]
      }
    ]
  },
  "witch": {
    "actions": [
      {
        "weight": 25,
        "name": "占い",
        "effect": {
          "luck": 1
        }
      },
      {
        "weight": 25,
        "name": "呪詛",
        "applyStatus": [
          "curse"
        ]
      },
      {
        "weight": 15,
        "name": "怪しい薬",
        "applyDisease": "cold"
      },
      {
        "weight": 10,
        "name": "幻覚",
        "applyStatus": [
          "confusion"
        ]
      },
      {
        "weight": 10,
        "name": "闇の儀式",
        "effect": {
          "hp": -5
        }
      },
      {
        "weight": 10,
        "name": "未来予知",
        "drawCards": 1
      },
      {
        "weight": 5,
        "name": "禁術",
        "randomPowerfulSpell": true
      }
    ]
  },
  "devil": {
    "actions": [
      {
        "weight": 25,
        "name": "誘惑",
        "effect": {
          "luck": -1
        }
      },
      {
        "weight": 20,
        "name": "呪縛",
        "applyStatus": [
          "curse"
        ]
      },
      {
        "weight": 15,
        "name": "流血",
        "applyStatus": [
          "bleeding"
        ]
      },
      {
        "weight": 15,
        "name": "絶望",
        "applyStatus": [
          "yami"
        ]
      },
      {
        "weight": 10,
        "name": "堕落",
        "effect": {
          "gold": -10
        }
      },
      {
        "weight": 10,
        "name": "契約",
        "effect": {
          "luck": -3
        }
      },
      {
        "weight": 5,
        "name": "魔王の祝福",
        "applyStatus": [
          "curse",
          "bleeding",
          "confusion"
        ]
      }
    ]
  },
  "angel": {
    "actions": [
      {
        "weight": 25,
        "name": "祝福",
        "effect": {
          "hp": 5
        }
      },
      {
        "weight": 20,
        "name": "導き",
        "effect": {
          "luck": 2
        }
      },
      {
        "weight": 15,
        "name": "救済",
        "removeRandomStatus": true
      },
      {
        "weight": 15,
        "name": "慈悲",
        "removeDisease": true
      },
      {
        "weight": 10,
        "name": "試練",
        "randomCard": true
      },
      {
        "weight": 10,
        "name": "審判",
        "randomTargetRandomCard": true
      },
      {
        "weight": 5,
        "name": "神託",
        "randomLegendaryCard": true
      }
    ]
  }
};
