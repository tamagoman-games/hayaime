const STATUS_NAMES = {
  poison: "毒",
  confusion: "混乱",
  curse: "呪い",
  bleeding: "出血"
};

const DISEASE_NAMES = {
  cold: "風邪"
};

function applyDisease(target, disease) {
  target.diseases ??= [];

  if (!target.diseases.includes(disease)) {
    target.diseases.push(disease);
  }
}