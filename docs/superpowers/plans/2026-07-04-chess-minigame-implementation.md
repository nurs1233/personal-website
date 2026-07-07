# Chess Minigame — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Stockfish.js chess minigame at `/chess/` with player-vs-AI, drag-and-drop, legal move highlights, move notation, and per-level win/loss stats.

**Architecture:** Single HTML page at `/chess/index.html` with inline CSS and JS. Uses chess.js (CDN) for game rules and Stockfish.js Web Worker (CDN) for AI. Stats persisted in localStorage. No build step, works on Cloudflare Pages.

**Tech Stack:** chess.js (CDN), Stockfish.js (CDN Web Worker), vanilla HTML/CSS/JS

## Global Constraints

- Only modify/add files in project root; no npm build step
- Dark theme consistent with existing site (`--bg: #0f110f`, `--accent: #7a9e7e`, `--text: #eae5de`)
- All chess logic self-contained in `/chess/` — no shared JS deps except CDN
- Statistik win/loss per level disimpan di localStorage

---

### Task 1: Create `/chess/index.html` (HTML & CSS layout)

**Files:**
- Create: `chess/index.html`

**Interfaces:**
- Consumes: nothing from other tasks
- Produces: `window.ChessGame`, inline CSS classes `.board`, `.square`, `.piece`, `.stats-table`, etc.

- [ ] **Step 1A: Write the HTML skeleton**

```html
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Catur — Jelajah Nusantara</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/css/style.css">
  <style>
    /* inline chess styles — see step 1B */
  </style>
</head>
<body>
  <nav class="navbar scrolled" id="navbar">
    <a href="/" class="logo">Jelajah</a>
    <nav>
      <a href="/map/">Peta</a>
      <a href="/portfolio/">Gabut</a>
      <a href="/chess/" class="active">Catur</a>
    </nav>
  </nav>

  <main class="page-content chess-page">
    <h1>♟ Catur</h1>
    <p class="subtitle">Catur melawan Stockfish AI</p>

    <div class="chess-layout">
      <!-- Board -->
      <div class="board-wrapper">
        <div class="board" id="board"></div>
        <div class="board-status" id="boardStatus">Putih melangkah</div>
      </div>

      <!-- Sidebar -->
      <div class="sidebar">
        <div class="panel">
          <label class="panel-label">Level</label>
          <select id="levelSelect">
            <option value="0">Pemula</option>
            <option value="3" selected>Mudah</option>
            <option value="6">Menengah</option>
            <option value="10">Sulit</option>
            <option value="15">Expert</option>
            <option value="20">Grandmaster</option>
          </select>
          <button class="btn-chess" id="btnNewGame">New Game</button>
        </div>

        <div class="panel moves-panel">
          <label class="panel-label">Riwayat Langkah</label>
          <div class="moves-list" id="movesList">
            <div class="moves-empty">Belum ada langkah</div>
          </div>
        </div>

        <div class="panel">
          <label class="panel-label">Statistik</label>
          <table class="stats-table">
            <thead>
              <tr>
                <th>Level</th>
                <th>Menang</th>
                <th>Kalah</th>
                <th>Total</th>
                <th>WR</th>
              </tr>
            </thead>
            <tbody id="statsBody"></tbody>
          </table>
        </div>
      </div>
    </div>
  </main>

  <div class="overlay" id="overlay">
    <div class="overlay-box">
      <div class="overlay-icon" id="overlayIcon">👑</div>
      <div class="overlay-title" id="overlayTitle">Checkmate!</div>
      <div class="overlay-desc" id="overlayDesc">Putih menang</div>
      <button class="btn-chess" id="overlayBtn">Main Lagi</button>
    </div>
  </div>

  <div id="toast" class="toast"></div>

  <script src="https://cdnjs.cloudflare.com/ajax/libs/chess.js/1.0.0-beta.8/chess.min.js"></script>
  <script src="/js/main.js"></script>
  <script>
    // — see Task 2 for game logic
  </script>
</body>
</html>
```

- [ ] **Step 1B: Write the inline CSS styles**

```css
.chess-page {
  max-width: 1000px;
}

.chess-layout {
  display: flex;
  gap: 24px;
  align-items: flex-start;
}

.board-wrapper {
  flex-shrink: 0;
}

.board {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  width: 420px;
  height: 420px;
  border: 2px solid var(--border);
  border-radius: 6px;
  overflow: hidden;
  user-select: none;
}

.square {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.4rem;
  cursor: pointer;
  position: relative;
  transition: background 0.15s;
}

.square.light { background: #b7c0a8; }
.square.dark { background: #5e6b51; }

.square.selected { background: #829769 !important; }
.square.legal-move::after {
  content: '';
  position: absolute;
  width: 14px;
  height: 14px;
  background: rgba(0,0,0,0.2);
  border-radius: 50%;
}
.square.legal-capture {
  box-shadow: inset 0 0 0 4px rgba(0,0,0,0.25);
}

.piece {
  cursor: grab;
  z-index: 1;
  line-height: 1;
  pointer-events: none;
  text-shadow: 0 1px 2px rgba(0,0,0,0.3);
}

.piece:active { cursor: grabbing; }

.square.dragging { opacity: 0.4; }
.piece.dragging {
  position: fixed;
  pointer-events: none;
  z-index: 1000;
  font-size: 2.8rem;
  transform: translate(-50%, -50%);
}

.board-status {
  text-align: center;
  margin-top: 12px;
  font-size: 0.9rem;
  color: var(--text-light);
  font-weight: 500;
  min-height: 24px;
}

/* Sidebar */
.sidebar {
  flex: 1;
  min-width: 240px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.panel {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 16px;
}

.panel-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-light);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-bottom: 10px;
  display: block;
}

.panel select {
  width: 100%;
  padding: 8px 12px;
  background: var(--bg);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: 8px;
  font-family: var(--font);
  font-size: 0.85rem;
  margin-bottom: 12px;
  cursor: pointer;
}

.btn-chess {
  width: 100%;
  padding: 10px;
  background: var(--accent);
  color: #fff;
  border: none;
  border-radius: 8px;
  font-family: var(--font);
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-chess:hover { background: var(--accent-hover); }
.btn-chess:active { transform: scale(0.98); }

/* Moves panel */
.moves-panel { flex: 1; }

.moves-list {
  max-height: 240px;
  overflow-y: auto;
  font-family: 'Courier New', monospace;
  font-size: 0.82rem;
  line-height: 1.8;
}

.moves-empty {
  color: var(--text-light);
  font-style: italic;
  font-size: 0.8rem;
}

.move-row {
  display: flex;
  gap: 8px;
  padding: 1px 0;
}

.move-row .move-num {
  color: var(--text-light);
  min-width: 28px;
}

.move-row .move-white,
.move-row .move-black {
  min-width: 48px;
}

/* Stats table */
.stats-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.78rem;
}

.stats-table th {
  text-align: left;
  color: var(--text-light);
  font-weight: 500;
  padding: 4px 6px;
  border-bottom: 1px solid var(--border);
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.stats-table td {
  padding: 5px 6px;
  border-bottom: 1px solid rgba(42,45,42,0.5);
}

.stats-table tr:last-child td { border-bottom: none; }

/* Overlay */
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.7);
  display: none;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  backdrop-filter: blur(4px);
}

.overlay.open { display: flex; }

.overlay-box {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 20px;
  padding: 36px 44px;
  text-align: center;
  max-width: 340px;
  animation: overlayIn 0.4s ease-out;
}

@keyframes overlayIn {
  from { transform: scale(0.9); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

.overlay-icon { font-size: 3rem; margin-bottom: 12px; }
.overlay-title {
  font-size: 1.4rem;
  font-weight: 700;
  margin-bottom: 6px;
}
.overlay-desc {
  color: var(--text-light);
  margin-bottom: 20px;
  font-size: 0.9rem;
}

/* Responsive */
@media (max-width: 768px) {
  .chess-layout { flex-direction: column; align-items: center; }
  .board { width: 320px; height: 320px; }
  .square { font-size: 1.8rem; }
  .sidebar { width: 100%; min-width: unset; }
  .piece.dragging { font-size: 2.2rem; }
}
```

- [ ] **Step 1C: Verify layout renders correctly on browser resize**

---

### Task 2: Game logic — board rendering, drag-and-drop, legal moves

**Files:**
- Modify: `chess/index.html` (add `<script>` content after `</style>`)

**Interfaces:**
- Consumes: CSS classes from Task 1, `Chess` global from chess.js CDN
- Produces: render functions, drag handlers, move validation

- [ ] **Step 2A: Write board rendering and piece management**

```javascript
const PIECES = {
  wp: '♙', wn: '♘', wb: '♗', wr: '♖', wq: '♕', wk: '♔',
  bp: '♟', bn: '♞', bb: '♝', br: '♜', bq: '♛', bk: '♚'
}

const board = document.getElementById('board')
const movesList = document.getElementById('movesList')
const boardStatus = document.getElementById('boardStatus')
const levelSelect = document.getElementById('levelSelect')
const overlay = document.getElementById('overlay')
const overlayIcon = document.getElementById('overlayIcon')
const overlayTitle = document.getElementById('overlayTitle')
const overlayDesc = document.getElementById('overlayDesc')
const overlayBtn = document.getElementById('overlayBtn')
const statsBody = document.getElementById('statsBody')

let game = new Chess()
let selectedSquare = null
let legalMoves = []
let dragPiece = null
let dragSquare = null
let isAIThinking = false
let gameOver = false

function render() {
  board.innerHTML = ''
  const turn = game.turn()

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const sq = String.fromCharCode(97 + c) + (8 - r)
      const isLight = (r + c) % 2 === 0
      const sqEl = document.createElement('div')
      sqEl.className = `square ${isLight ? 'light' : 'dark'}`
      sqEl.dataset.square = sq

      const piece = game.get(sq)
      if (piece) {
        const pEl = document.createElement('span')
        pEl.className = 'piece'
        pEl.textContent = PIECES[piece.color + piece.type]
        pEl.draggable = false
        sqEl.appendChild(pEl)
      }

      if (selectedSquare === sq) sqEl.classList.add('selected')
      if (legalMoves.includes(sq)) {
        sqEl.classList.add(game.get(sq) ? 'legal-capture' : 'legal-move')
      }

      sqEl.addEventListener('click', () => onSquareClick(sq))
      sqEl.addEventListener('mousedown', (e) => onSquareMouseDown(e, sq))
      board.appendChild(sqEl)
    }
  }

  updateStatus()
}
```

- [ ] **Step 2B: Write click-to-move handler**

```javascript
function onSquareClick(sq) {
  if (isAIThinking || gameOver || game.turn() === 'b') return

  if (selectedSquare) {
    if (legalMoves.includes(sq)) {
      makeMove(selectedSquare, sq)
      selectedSquare = null
      legalMoves = []
      render()
      return
    }
    selectedSquare = null
    legalMoves = []
    render()
  }

  const piece = game.get(sq)
  if (piece && piece.color === 'w') {
    const moves = game.moves({ square: sq, verbose: true })
    if (moves.length > 0) {
      selectedSquare = sq
      legalMoves = moves.map(m => m.to)
      render()
    }
  }
}
```

- [ ] **Step 2C: Write drag-and-drop handlers**

```javascript
let dragState = null

function onSquareMouseDown(e, sq) {
  if (isAIThinking || gameOver || game.turn() === 'b') return
  const piece = game.get(sq)
  if (!piece || piece.color !== 'w') return
  dragState = { sq, startX: e.clientX, startY: e.clientY }
  document.addEventListener('mousemove', onDragMove)
  document.addEventListener('mouseup', onDragEnd)
}

function onDragMove(e) {
  if (!dragState) return
  const sqEl = board.querySelector(`[data-square="${dragState.sq}"]`)
  const pieceEl = sqEl.querySelector('.piece')
  if (!pieceEl) return

  sqEl.classList.add('dragging')
  pieceEl.classList.add('dragging')
  pieceEl.style.left = e.clientX + 'px'
  pieceEl.style.top = e.clientY + 'px'

  // highlight legal targets
  const moves = game.moves({ square: dragState.sq, verbose: true })
  board.querySelectorAll('.square').forEach(el => {
    if (moves.find(m => m.to === el.dataset.square)) {
      el.classList.add(game.get(el.dataset.square) ? 'legal-capture' : 'legal-move')
    }
  })
}

function onDragEnd(e) {
  document.removeEventListener('mousemove', onDragMove)
  document.removeEventListener('mouseup', onDragEnd)
  if (!dragState) return

  board.querySelectorAll('.square').forEach(el => {
    el.classList.remove('dragging', 'legal-move', 'legal-capture')
  })
  board.querySelectorAll('.piece').forEach(el => el.classList.remove('dragging'))

  // find target square
  const target = document.elementFromPoint(e.clientX, e.clientY)
  const targetSq = target?.closest('.square')?.dataset.square

  if (targetSq && targetSq !== dragState.sq) {
    makeMove(dragState.sq, targetSq)
  }

  selectedSquare = null
  legalMoves = []
  dragState = null
  render()
}
```

- [ ] **Step 2D: Verify board renders with pieces and click/drag work**

---

### Task 3: Stockfish AI integration + move execution

**Files:**
- Modify: `chess/index.html`

**Interfaces:**
- Consumes: `render()`, `game` (Chess instance) from Task 2
- Produces: `initStockfish()`, `aiMove()`, `makeMove()`

- [ ] **Step 3A: Write Stockfish worker init and AI move logic**

```javascript
let stockfish = null

function initStockfish() {
  stockfish = new Worker(
    'https://cdn.jsdelivr.net/npm/stockfish.js/stockfish.wasm.js'
  )
  stockfish.postMessage('uci')
  stockfish.postMessage('isready')
  stockfish.onmessage = (e) => {
    const msg = e.data
    if (msg.startsWith('bestmove')) {
      const move = msg.split(' ')[1]
      if (move && move !== '(none)') {
        game.move(move, { sloppy: true })
        isAIThinking = false
        render()
        updateMoves()
        checkGameOver()
        if (!gameOver) {
          boardStatus.textContent = 'Putih melangkah'
        }
      }
    }
  }
}

function aiMove() {
  isAIThinking = true
  boardStatus.textContent = 'Stockfish berpikir...'
  const skill = parseInt(levelSelect.value)
  stockfish.postMessage(`setoption name Skill Level value ${skill}`)
  stockfish.postMessage(`position fen ${game.fen()}`)
  stockfish.postMessage('go depth 10')
}
```

- [ ] **Step 3B: Write makeMove and game-over detection**

```javascript
function makeMove(from, to) {
  try {
    const result = game.move({ from, to, promotion: 'q' })
    if (!result) return false

    selectedSquare = null
    legalMoves = []
    render()
    updateMoves()

    if (checkGameOver()) return true
    setTimeout(aiMove, 300)
    return true
  } catch (e) {
    return false
  }
}

function checkGameOver() {
  if (game.isGameOver()) {
    gameOver = true
    let icon = '👑', title = 'Permainan Selesai', desc = ''

    if (game.isCheckmate()) {
      const winner = game.turn() === 'w' ? 'Hitam' : 'Putih'
      icon = game.turn() === 'w' ? '♚' : '♔'
      title = 'Checkmate!'
      desc = `${winner} menang!`
      recordResult(winner === 'Putih' ? 'win' : 'loss')
    } else if (game.isStalemate()) {
      title = 'Stalemate!'
      desc = 'Permainan seri'
      recordResult('draw')
    } else if (game.isDraw()) {
      desc = 'Permainan seri'
      recordResult('draw')
    }

    showOverlay(title, desc, icon)
    boardStatus.textContent = desc
    return true
  }
  return false
}
```

- [ ] **Step 3C: Write overlay and move notation display**

```javascript
function showOverlay(title, desc, icon) {
  overlayIcon.textContent = icon
  overlayTitle.textContent = title
  overlayDesc.textContent = desc
  overlay.classList.add('open')
}

overlayBtn.addEventListener('click', () => {
  overlay.classList.remove('open')
  newGame()
})
overlay.addEventListener('click', (e) => {
  if (e.target === overlay) overlay.classList.remove('open')
})

function updateMoves() {
  const history = game.history({ verbose: false })
  movesList.innerHTML = ''
  if (history.length === 0) {
    movesList.innerHTML = '<div class="moves-empty">Belum ada langkah</div>'
    return
  }
  for (let i = 0; i < history.length; i += 2) {
    const row = document.createElement('div')
    row.className = 'move-row'
    const num = document.createElement('span')
    num.className = 'move-num'
    num.textContent = Math.floor(i / 2 + 1) + '.'
    row.appendChild(num)
    const white = document.createElement('span')
    white.className = 'move-white'
    white.textContent = history[i]
    row.appendChild(white)
    if (history[i + 1]) {
      const black = document.createElement('span')
      black.className = 'move-black'
      black.textContent = history[i + 1]
      row.appendChild(black)
    }
    movesList.appendChild(row)
  }
  movesList.scrollTop = movesList.scrollHeight
}
```

- [ ] **Step 3D: New Game function**

```javascript
function newGame() {
  game = new Chess()
  selectedSquare = null
  legalMoves = []
  isAIThinking = false
  gameOver = false
  overlay.classList.remove('open')
  render()
  updateMoves()
  boardStatus.textContent = 'Putih melangkah'
}

document.getElementById('btnNewGame').addEventListener('click', newGame)
```

- [ ] **Step 3E: Verify AI responds after player move**

---

### Task 4: Win/Loss stats dashboard (localStorage)

**Files:**
- Modify: `chess/index.html`

**Interfaces:**
- Consumes: nothing
- Produces: stats data in localStorage key `chess_stats`, rendered in stats table

- [ ] **Step 4A: Write stats helpers**

```javascript
const LEVELS = [
  { value: 0, name: 'Pemula' },
  { value: 3, name: 'Mudah' },
  { value: 6, name: 'Menengah' },
  { value: 10, name: 'Sulit' },
  { value: 15, name: 'Expert' },
  { value: 20, name: 'Grandmaster' }
]

function getLevelName(val) {
  const l = LEVELS.find(l => l.value === parseInt(val))
  return l ? l.name : 'Custom'
}

function getStats() {
  try {
    return JSON.parse(localStorage.getItem('chess_stats')) || {}
  } catch { return {} }
}

function saveStats(stats) {
  localStorage.setItem('chess_stats', JSON.stringify(stats))
}

function recordResult(result) {
  const level = levelSelect.value
  const stats = getStats()
  if (!stats[level]) stats[level] = { wins: 0, losses: 0, draws: 0 }
  if (result === 'win') stats[level].wins++
  else if (result === 'loss') stats[level].losses++
  else if (result === 'draw') stats[level].draws++
  saveStats(stats)
  renderStats()
}
```

- [ ] **Step 4B: Write stats table renderer**

```javascript
function renderStats() {
  const stats = getStats()
  statsBody.innerHTML = ''

  const sortedLevels = [...LEVELS].sort((a, b) => a.value - b.value)

  let totalWins = 0, totalLosses = 0, totalDraws = 0

  sortedLevels.forEach(l => {
    const s = stats[l.value]
    if (!s || (s.wins === 0 && s.losses === 0 && s.draws === 0)) return
    const total = s.wins + s.losses + s.draws
    const wr = total > 0 ? Math.round((s.wins / total) * 100) + '%' : '-'
    totalWins += s.wins
    totalLosses += s.losses
    totalDraws += s.draws

    const row = document.createElement('tr')
    row.innerHTML = `
      <td>${l.name}</td>
      <td style="color:#a8d4ac">${s.wins}</td>
      <td style="color:#c96666">${s.losses}</td>
      <td>${total}</td>
      <td>${wr}</td>
    `
    statsBody.appendChild(row)
  })

  if (totalWins > 0 || totalLosses > 0) {
    const t = totalWins + totalLosses + totalDraws
    const wr = t > 0 ? Math.round((totalWins / t) * 100) + '%' : '-'
    const row = document.createElement('tr')
    row.style.fontWeight = '600'
    row.innerHTML = `
      <td>Total</td>
      <td style="color:#a8d4ac">${totalWins}</td>
      <td style="color:#c96666">${totalLosses}</td>
      <td>${t}</td>
      <td>${wr}</td>
    `
    statsBody.appendChild(row)
  }

  if (statsBody.children.length === 0) {
    statsBody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-light);padding:12px 0;font-style:italic;">Belum ada data</td></tr>'
  }
}
```

- [ ] **Step 4C: Initialize everything on page load**

```javascript
let game = new Chess()
let selectedSquare = null
let legalMoves = []
let isAIThinking = false
let gameOver = false

initStockfish()
render()
updateMoves()
renderStats()
boardStatus.textContent = 'Putih melangkah'
```

- [ ] **Step 4D: Verify stats persist across page reload**

---

### Task 5: Add navigation links

**Files:**
- Modify: `index.html` (navbar)
- Modify: `portfolio/index.html` (project card)

- [ ] **Step 5A: Add "Catur" link to navbar in `index.html`**

Find in `index.html`:
```html
<a href="/portfolio/">Gabut</a>
```
Add after it:
```html
<a href="/chess/">Catur</a>
```

- [ ] **Step 5B: Add chess project card to `portfolio/index.html`**

Find the `.project-grid` div and add a new card after the existing ones:
```html
<div class="project-card">
  <h3>♟ Catur — Stockfish AI</h3>
  <p>Main catur melawan Stockfish engine langsung di browser. Drag & drop, highlight legal moves, notasi langkah, dan statistik win/loss per level.</p>
  <div class="stack">
    <span>chess.js</span>
    <span>Stockfish.js</span>
    <span>Web Worker</span>
  </div>
</div>
```

- [ ] **Step 5C: Open chess page in browser and verify game works end-to-end**

---

### Task 6: Final verification

**Files:**
- N/A — manual testing

- [ ] **Step 6A: Test full game flow**
  - Open `http://localhost:8788/chess/`
  - New Game starts with white to move
  - Click white piece → highlights legal moves
  - Click legal target → piece moves → Stockfish responds
  - Move notation updates after each move
  - Checkmate/stalemate triggers overlay
  - New Game resets everything
  - Stats update after game ends

- [ ] **Step 6B: Test responsive layout**
  - Resize to mobile width → board and sidebar stack vertically
  - Board remains playable at 320px

- [ ] **Step 6C: Test edge cases**
  - Rapid clicking during AI turn (should be blocked)
  - Changing level mid-game (only applies to next New Game)
  - Multiple New Game in a row
  - localStorage cleared (graceful fallback to empty stats)

- [ ] **Step 6D: Verify navbar link works and portfolio card renders**
