const wordBank = [
  "CASA",
  "AMIGO",
  "SOL",
  "LUA",
  "RIO",
  "FLOR",
  "MAR",
  "PET",
  "RUA",
  "LIVRO",
  "NAVE",
  "PESCA",
  "ORTO",
  "DESAFIO",
  "TECLADO",
  "JOGO",
  "CORACAO",
  "BRINCAR",
  "FELIZ",
  "BOLA",
  "MUNDO",
  "COMIDA",
  "ARVORE",
  "PONTOS",
  "LUZ",
  "AMOR",
  "GATO",
  "CANTO",
  "VIDA",
  "FUTURO",
  "ONIBUS",
  "VIAGEM",
  "NATUREZA",
  "ESPACO",
  "SEMANA",
  "AMIZADE",
  "BRINQUEDO",
  "FESTA",
  "ALEGRIA",
  "MUSICA",
  "CIDADE",
  "DANCA",
  "COZINHA",
];

const gridSize = 10;
const gridElm = document.getElementById("grid");
const wordListElm = document.getElementById("wordList");
const selectionText = document.getElementById("selectionText");
const foundCountElm = document.getElementById("foundCount");
const totalWordsElm = document.getElementById("totalWords");
const checkButton = document.getElementById("checkButton");
const resetButton = document.getElementById("resetButton");
const nextPhaseButton = document.getElementById("nextPhaseButton");
const phaseTitle = document.getElementById("phaseTitle");
const stageMessage = document.getElementById("stageMessage");
const timerDisplay = document.getElementById("timerDisplay");
const usernameInput = document.getElementById("usernameInput");
const saveUserButton = document.getElementById("saveUserButton");
const userGreeting = document.getElementById("userGreeting");
const rankingListElm = document.getElementById("rankingList");
const timeEndMessage = document.getElementById("timeEndMessage");

let currentStage = 1;
let currentWords = [];
let currentPuzzle = [];
let selectedCells = [];
let foundWords = new Set();
let playerName = localStorage.getItem("wordsearchPlayer") || "";
let timerSeconds = 0;
let timerInterval = null;
let stageExpired = false;
const rankingKey = "wordsearchRanking";

function applyStageTheme(stageNumber) {
  const theme = ((stageNumber - 1) % 4) + 1;
  document.body.classList.remove("phase-1", "phase-2", "phase-3", "phase-4");
  void document.body.offsetWidth;
  document.body.classList.add(`phase-${theme}`);
}

function randomInt(max) {
  return Math.floor(Math.random() * max);
}

function shuffle(array) {
  return array
    .map((value) => ({ value, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ value }) => value);
}

function chooseStageWords(stageNumber) {
  const base = 4;
  const increase = Math.floor((stageNumber - 1) / 2);
  const wordCount = Math.min(base + increase, 8);
  const selected = shuffle(wordBank).slice(0, wordCount);
  return selected;
}

function createEmptyGrid(size) {
  return Array.from({ length: size }, () => Array(size).fill(null));
}

function fillGrid(grid) {
  return grid.map((row) =>
    row.map((letter) => (letter || String.fromCharCode(65 + randomInt(26))))
  );
}

function canPlaceWord(grid, word, row, col, dr, dc) {
  for (let i = 0; i < word.length; i++) {
    const r = row + dr * i;
    const c = col + dc * i;
    if (r < 0 || r >= gridSize || c < 0 || c >= gridSize) return false;
    const current = grid[r][c];
    if (current && current !== word[i]) return false;
  }
  return true;
}

function placeWord(grid, word) {
  const directions = [
    { dr: 0, dc: 1 },
    { dr: 1, dc: 0 },
    { dr: 1, dc: 1 },
    { dr: -1, dc: 1 },
  ];
  const wordToPlace = Math.random() < 0.5 ? word : [...word].reverse().join("");

  const maxAttempts = 150;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const { dr, dc } = directions[randomInt(directions.length)];
    const row = randomInt(gridSize);
    const col = randomInt(gridSize);
    if (canPlaceWord(grid, wordToPlace, row, col, dr, dc)) {
      for (let i = 0; i < wordToPlace.length; i++) {
        const r = row + dr * i;
        const c = col + dc * i;
        grid[r][c] = wordToPlace[i];
      }
      return true;
    }
  }
  return false;
}

function generatePuzzle(words) {
  for (let attempt = 0; attempt < 60; attempt++) {
    const grid = createEmptyGrid(gridSize);
    let success = true;
    for (const word of words) {
      if (!placeWord(grid, word.toUpperCase())) {
        success = false;
        break;
      }
    }
    if (success) {
      return fillGrid(grid);
    }
  }
  return fillGrid(createEmptyGrid(gridSize));
}

function createBoard(puzzle) {
  gridElm.innerHTML = "";
  puzzle.forEach((row, rowIndex) => {
    row.forEach((letter, colIndex) => {
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "cell";
      cell.textContent = letter;
      cell.dataset.row = rowIndex;
      cell.dataset.col = colIndex;
      cell.addEventListener("click", () => toggleCell(cell));
      gridElm.appendChild(cell);
    });
  });
}

function renderWordList() {
  wordListElm.innerHTML = "";
  currentWords.forEach((word) => {
    const item = document.createElement("li");
    item.textContent = word;
    item.className = foundWords.has(word) ? "found" : "";
    wordListElm.appendChild(item);
  });
  totalWordsElm.textContent = currentWords.length;
  foundCountElm.textContent = foundWords.size;
}

function loadRanking() {
  const raw = localStorage.getItem(rankingKey);
  return raw ? JSON.parse(raw) : {};
}

function saveRanking(ranking) {
  localStorage.setItem(rankingKey, JSON.stringify(ranking));
}

function getPlayerBest(name) {
  const ranking = loadRanking();
  return ranking[name] || 0;
}

function saveRankingEntry(name, score) {
  if (!name) return;
  const ranking = loadRanking();
  const previous = ranking[name] || 0;
  ranking[name] = Math.max(previous, score);
  saveRanking(ranking);
  updateRankingDisplay();
}

function updateRankingDisplay() {
  const ranking = loadRanking();
  const entries = Object.entries(ranking)
    .map(([name, score]) => ({ name, score }))
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    .slice(0, 5);

  rankingListElm.innerHTML = "";
  if (entries.length === 0) {
    rankingListElm.innerHTML = `<li>Sem pontuação ainda.</li>`;
    return;
  }
  entries.forEach(({ name, score }) => {
    const item = document.createElement("li");
    item.innerHTML = `<span>${name}</span><span>Fase ${score}</span>`;
    rankingListElm.appendChild(item);
  });
}

function isAdjacent(cellA, cellB) {
  const rowA = Number(cellA.dataset.row);
  const colA = Number(cellA.dataset.col);
  const rowB = Number(cellB.dataset.row);
  const colB = Number(cellB.dataset.col);
  return Math.max(Math.abs(rowA - rowB), Math.abs(colA - colB)) === 1;
}

function canSelect(cell) {
  if (stageExpired) return false;
  if (cell.classList.contains("found")) return false;
  if (selectedCells.length === 0) return true;
  const last = selectedCells[selectedCells.length - 1];
  return isAdjacent(last, cell);
}

function toggleCell(cell) {
  if (cell.classList.contains("found")) {
    return;
  }

  if (cell.classList.contains("selected")) {
    selectedCells = selectedCells.filter((item) => item !== cell);
    cell.classList.remove("selected");
    updateSelectionText();
    return;
  }

  if (!canSelect(cell)) {
    updateSelectionText("Selecione uma célula adjacente à última letra.");
    return;
  }

  selectedCells.push(cell);
  cell.classList.add("selected");
  updateSelectionText();
}

function updateSelectionText(message) {
  if (message) {
    selectionText.textContent = message;
    return;
  }

  if (selectedCells.length === 0) {
    selectionText.textContent = "Clique nas letras para formar uma palavra.";
    return;
  }

  const currentWord = selectedCells.map((cell) => cell.textContent).join("");
  selectionText.textContent = `Palavra selecionada: ${currentWord}`;
}

function resetSelection() {
  selectedCells.forEach((cell) => cell.classList.remove("selected"));
  selectedCells = [];
  updateSelectionText();
}

function markStageCompleted() {
  stageMessage.textContent = `Fase ${currentStage} concluída! Avance para a próxima fase.`;
  nextPhaseButton.disabled = false;
  nextPhaseButton.classList.remove("secondary");
  saveRankingEntry(playerName, currentStage);
}

function checkSelection() {
  if (selectedCells.length === 0) {
    updateSelectionText("Selecione pelo menos uma letra.");
    return;
  }

  const currentWord = selectedCells.map((cell) => cell.textContent).join("");
  if (currentWords.includes(currentWord)) {
    if (foundWords.has(currentWord)) {
      updateSelectionText("Essa palavra já foi encontrada.");
      return;
    }

    foundWords.add(currentWord);
    selectedCells.forEach((cell) => {
      cell.classList.remove("selected");
      cell.classList.add("found");
    });
    selectedCells = [];
    renderWordList();
    updateSelectionText(`Boa! Você encontrou: ${currentWord}`);

    if (foundWords.size === currentWords.length) {
      markStageCompleted();
    }
    return;
  }

  selectedCells.forEach((cell) => cell.classList.remove("selected"));
  selectedCells = [];
  updateSelectionText("Palavra incorreta. Tente novamente.");
}

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

function getStageTime(stageNumber) {
  return Math.max(40, 90 - (stageNumber - 1) * 5);
}

function updateTimerDisplay() {
  timerDisplay.textContent = formatTime(timerSeconds);
}

function startStageTimer() {
  stopStageTimer();
  stageExpired = false;
  timeEndMessage.classList.add("hidden");
  timerSeconds = getStageTime(currentStage);
  updateTimerDisplay();
  timerInterval = setInterval(() => {
    timerSeconds -= 1;
    if (timerSeconds <= 0) {
      timerSeconds = 0;
      updateTimerDisplay();
      handleTimeExpired();
      return;
    }
    updateTimerDisplay();
  }, 1000);
}

function stopStageTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function handleTimeExpired() {
  stopStageTimer();
  stageExpired = true;
  selectedCells.forEach((cell) => cell.classList.remove("selected"));
  selectedCells = [];
  stageMessage.textContent = "Tempo esgotado! Você pode reiniciar a fase para tentar de novo.";
  timeEndMessage.textContent = "O tempo acabou! Reinicie a fase para tentar novamente.";
  timeEndMessage.classList.remove("hidden");
  nextPhaseButton.disabled = false;
  nextPhaseButton.classList.remove("secondary");
  nextPhaseButton.textContent = "Reiniciar fase";
}

function updateGreeting() {
  if (playerName) {
    const best = getPlayerBest(playerName);
    userGreeting.textContent = `Olá, ${playerName}! Melhor fase: ${best}.`;
  } else {
    userGreeting.textContent = "Nome não definido.";
  }
}

function saveUsername() {
  const value = usernameInput.value.trim();
  if (!value) {
    userGreeting.textContent = "Digite um nome válido para começar.";
    return;
  }
  playerName = value;
  localStorage.setItem("wordsearchPlayer", playerName);
  saveRankingEntry(playerName, getPlayerBest(playerName));
  updateGreeting();
}

function loadStage(stageNumber) {
  currentStage = stageNumber;
  currentWords = chooseStageWords(stageNumber);
  currentPuzzle = generatePuzzle(currentWords);
  foundWords = new Set();

  phaseTitle.textContent = `Fase ${currentStage}`;
  stageMessage.textContent = `Complete a fase encontrando todas as palavras.`;
  nextPhaseButton.disabled = true;
  nextPhaseButton.classList.add("secondary");
  nextPhaseButton.textContent = "Próxima fase";

  resetSelection();
  createBoard(currentPuzzle);
  renderWordList();
  updateSelectionText();
  updateGreeting();
  updateRankingDisplay();
  applyStageTheme(stageNumber);
  startStageTimer();
}

checkButton.addEventListener("click", checkSelection);
resetButton.addEventListener("click", resetSelection);
saveUserButton.addEventListener("click", saveUsername);
nextPhaseButton.addEventListener("click", () => {
  if (nextPhaseButton.textContent === "Reiniciar fase") {
    loadStage(currentStage);
  } else {
    loadStage(currentStage + 1);
  }
});

if (playerName) {
  usernameInput.value = playerName;
}

updateRankingDisplay();
loadStage(1);
