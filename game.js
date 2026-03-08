'use strict';

// ===== 定数 =====
const COLS = 10;
const ROWS = 20;
const HIDDEN_ROWS = 2; // 上部の見えない行数

// テトリミノの形状定義（4x4グリッド、各回転状態）
const PIECES = {
  I: {
    color: '#00cfcf',
    shapes: [
      [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
      [[0,0,1,0],[0,0,1,0],[0,0,1,0],[0,0,1,0]],
      [[0,0,0,0],[0,0,0,0],[1,1,1,1],[0,0,0,0]],
      [[0,1,0,0],[0,1,0,0],[0,1,0,0],[0,1,0,0]],
    ]
  },
  O: {
    color: '#cfcf00',
    shapes: [
      [[0,1,1,0],[0,1,1,0],[0,0,0,0],[0,0,0,0]],
      [[0,1,1,0],[0,1,1,0],[0,0,0,0],[0,0,0,0]],
      [[0,1,1,0],[0,1,1,0],[0,0,0,0],[0,0,0,0]],
      [[0,1,1,0],[0,1,1,0],[0,0,0,0],[0,0,0,0]],
    ]
  },
  T: {
    color: '#cf00cf',
    shapes: [
      [[0,1,0,0],[1,1,1,0],[0,0,0,0],[0,0,0,0]],
      [[0,1,0,0],[0,1,1,0],[0,1,0,0],[0,0,0,0]],
      [[0,0,0,0],[1,1,1,0],[0,1,0,0],[0,0,0,0]],
      [[0,1,0,0],[1,1,0,0],[0,1,0,0],[0,0,0,0]],
    ]
  },
  S: {
    color: '#00cf00',
    shapes: [
      [[0,1,1,0],[1,1,0,0],[0,0,0,0],[0,0,0,0]],
      [[0,1,0,0],[0,1,1,0],[0,0,1,0],[0,0,0,0]],
      [[0,0,0,0],[0,1,1,0],[1,1,0,0],[0,0,0,0]],
      [[1,0,0,0],[1,1,0,0],[0,1,0,0],[0,0,0,0]],
    ]
  },
  Z: {
    color: '#cf0000',
    shapes: [
      [[1,1,0,0],[0,1,1,0],[0,0,0,0],[0,0,0,0]],
      [[0,0,1,0],[0,1,1,0],[0,1,0,0],[0,0,0,0]],
      [[0,0,0,0],[1,1,0,0],[0,1,1,0],[0,0,0,0]],
      [[0,1,0,0],[1,1,0,0],[1,0,0,0],[0,0,0,0]],
    ]
  },
  J: {
    color: '#0000cf',
    shapes: [
      [[1,0,0,0],[1,1,1,0],[0,0,0,0],[0,0,0,0]],
      [[0,1,1,0],[0,1,0,0],[0,1,0,0],[0,0,0,0]],
      [[0,0,0,0],[1,1,1,0],[0,0,1,0],[0,0,0,0]],
      [[0,1,0,0],[0,1,0,0],[1,1,0,0],[0,0,0,0]],
    ]
  },
  L: {
    color: '#cf7f00',
    shapes: [
      [[0,0,1,0],[1,1,1,0],[0,0,0,0],[0,0,0,0]],
      [[0,1,0,0],[0,1,0,0],[0,1,1,0],[0,0,0,0]],
      [[0,0,0,0],[1,1,1,0],[1,0,0,0],[0,0,0,0]],
      [[1,1,0,0],[0,1,0,0],[0,1,0,0],[0,0,0,0]],
    ]
  },
};

const PIECE_KEYS = Object.keys(PIECES);

// スコア計算（ライン数 -> 加算スコア）
const LINE_SCORES = [0, 100, 300, 500, 800];

// ===== ユーティリティ =====
function createMatrix(rows, cols, val = 0) {
  return Array.from({ length: rows }, () => new Array(cols).fill(val));
}

// 7バッグ乱数生成
function createBag() {
  const bag = [...PIECE_KEYS];
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
  return bag;
}

// ===== ゲームエンジン =====
class Tetris {
  constructor(canvas, nextCanvas, holdCanvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.nextCanvas = nextCanvas;
    this.nextCtx = nextCanvas.getContext('2d');
    this.holdCanvas = holdCanvas;
    this.holdCtx = holdCanvas.getContext('2d');

    this.cellSize = 0;
    this.resize();

    this.reset();
  }

  // セルサイズを画面に合わせて計算
  resize() {
    // CSSで定義した --cell 変数を参照
    const cssCell = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--cell')) || 30;
    this.cellSize = cssCell;

    this.canvas.width = COLS * this.cellSize;
    this.canvas.height = ROWS * this.cellSize;

    const previewCell = Math.floor(this.cellSize * 0.8);
    this.previewCellSize = previewCell;
    this.nextCanvas.width = 4 * previewCell;
    this.nextCanvas.height = 4 * previewCell;
    this.holdCanvas.width = 4 * previewCell;
    this.holdCanvas.height = 4 * previewCell;
  }

  reset() {
    this.board = createMatrix(ROWS + HIDDEN_ROWS, COLS);
    this.score = 0;
    this.lines = 0;
    this.level = 1;
    this.bag = createBag();
    this.nextBag = createBag();
    this.holdKey = null;
    this.holdUsed = false;
    this.gameOver = false;
    this.paused = false;
    this.lastTime = 0;
    this.dropCounter = 0;
    this.spawnPiece();
    this.updateUI();
  }

  // 現在の落下インターバル（ms）
  get dropInterval() {
    return Math.max(80, 1000 - (this.level - 1) * 90);
  }

  // バッグからピースを取得
  dequeue() {
    if (this.bag.length === 0) {
      this.bag = this.nextBag;
      this.nextBag = createBag();
    }
    return this.bag.shift();
  }

  peekNext() {
    if (this.bag.length === 0) {
      return this.nextBag[0];
    }
    return this.bag[0];
  }

  spawnPiece() {
    const key = this.dequeue();
    this.current = {
      key,
      rot: 0,
      x: 3,
      y: 0,
    };
    // 出現時に衝突 -> ゲームオーバー
    if (this.collides(this.current)) {
      this.gameOver = true;
    }
    this.holdUsed = false;
  }

  getShape(key, rot) {
    return PIECES[key].shapes[rot];
  }

  getColor(key) {
    return PIECES[key].color;
  }

  collides(piece, dx = 0, dy = 0, rot = null) {
    const shape = this.getShape(piece.key, rot !== null ? rot : piece.rot);
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (!shape[r][c]) continue;
        const nx = piece.x + c + dx;
        const ny = piece.y + r + dy;
        if (nx < 0 || nx >= COLS) return true;
        if (ny >= ROWS + HIDDEN_ROWS) return true;
        if (ny < 0) continue;
        if (this.board[ny][nx]) return true;
      }
    }
    return false;
  }

  // SRS（スーパーローテーションシステム）の壁蹴りオフセット
  getWallKicks(key, fromRot, toRot) {
    if (key === 'I') {
      const kicks = {
        '0>1': [[-2,0],[1,0],[-2,1],[1,-2]],
        '1>0': [[2,0],[-1,0],[2,-1],[-1,2]],
        '1>2': [[-1,0],[2,0],[-1,-2],[2,1]],
        '2>1': [[1,0],[-2,0],[1,2],[-2,-1]],
        '2>3': [[2,0],[-1,0],[2,-1],[-1,2]],
        '3>2': [[-2,0],[1,0],[-2,1],[1,-2]],
        '3>0': [[1,0],[-2,0],[1,2],[-2,-1]],
        '0>3': [[-1,0],[2,0],[-1,-2],[2,1]],
      };
      return kicks[`${fromRot}>${toRot}`] || [];
    }
    const kicks = {
      '0>1': [[-1,0],[-1,-1],[0,2],[-1,2]],
      '1>0': [[1,0],[1,1],[0,-2],[1,-2]],
      '1>2': [[1,0],[1,1],[0,-2],[1,-2]],
      '2>1': [[-1,0],[-1,-1],[0,2],[-1,2]],
      '2>3': [[1,0],[1,-1],[0,2],[1,2]],
      '3>2': [[-1,0],[-1,1],[0,-2],[-1,-2]],
      '3>0': [[-1,0],[-1,1],[0,-2],[-1,-2]],
      '0>3': [[1,0],[1,-1],[0,2],[1,2]],
    };
    return kicks[`${fromRot}>${toRot}`] || [];
  }

  rotate(dir = 1) {
    const fromRot = this.current.rot;
    const toRot = (fromRot + dir + 4) % 4;

    if (!this.collides(this.current, 0, 0, toRot)) {
      this.current.rot = toRot;
      return;
    }
    // 壁蹴り試行
    const kicks = this.getWallKicks(this.current.key, fromRot, toRot);
    for (const [kx, ky] of kicks) {
      if (!this.collides(this.current, kx, ky, toRot)) {
        this.current.x += kx;
        this.current.y += ky;
        this.current.rot = toRot;
        return;
      }
    }
  }

  moveLeft() {
    if (!this.collides(this.current, -1, 0)) this.current.x--;
  }

  moveRight() {
    if (!this.collides(this.current, 1, 0)) this.current.x++;
  }

  softDrop() {
    if (!this.collides(this.current, 0, 1)) {
      this.current.y++;
      this.score += 1;
      this.updateUI();
      this.dropCounter = 0;
    } else {
      this.lock();
    }
  }

  hardDrop() {
    let dropped = 0;
    while (!this.collides(this.current, 0, 1)) {
      this.current.y++;
      dropped++;
    }
    this.score += dropped * 2;
    this.lock();
  }

  hold() {
    if (this.holdUsed) return;
    if (this.holdKey === null) {
      this.holdKey = this.current.key;
      this.spawnPiece();
    } else {
      const tmp = this.holdKey;
      this.holdKey = this.current.key;
      this.current = { key: tmp, rot: 0, x: 3, y: 0 };
    }
    this.holdUsed = true;
  }

  // ゴースト（ピースが落ちる位置のプレビュー）のY座標を計算
  getGhostY() {
    let gy = this.current.y;
    while (!this.collides(this.current, 0, gy - this.current.y + 1)) {
      gy++;
    }
    return gy;
  }

  lock() {
    const shape = this.getShape(this.current.key, this.current.rot);
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (!shape[r][c]) continue;
        const ny = this.current.y + r;
        const nx = this.current.x + c;
        if (ny < 0) continue;
        this.board[ny][nx] = this.current.key;
      }
    }
    this.clearLines();
    this.spawnPiece();
  }

  clearLines() {
    let cleared = 0;
    for (let r = ROWS + HIDDEN_ROWS - 1; r >= 0; r--) {
      if (this.board[r].every(c => c !== 0)) {
        this.board.splice(r, 1);
        this.board.unshift(new Array(COLS).fill(0));
        cleared++;
        r++; // 同じ行を再チェック
      }
    }
    if (cleared > 0) {
      this.lines += cleared;
      this.score += LINE_SCORES[cleared] * this.level;
      this.level = Math.floor(this.lines / 10) + 1;
      this.updateUI();
    }
  }

  updateUI() {
    document.getElementById('score').textContent = this.score;
    document.getElementById('lines').textContent = this.lines;
    document.getElementById('level').textContent = this.level;
  }

  // ===== 描画 =====
  drawCell(ctx, x, y, key, alpha = 1, cellSize = null) {
    const cs = cellSize || this.cellSize;
    const color = this.getColor(key);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.fillRect(x * cs + 1, y * cs + 1, cs - 2, cs - 2);
    // ハイライト
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(x * cs + 1, y * cs + 1, cs - 2, 4);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(x * cs + 1, y * cs + cs - 5, cs - 2, 4);
    ctx.globalAlpha = 1;
  }

  drawBoard() {
    const ctx = this.ctx;
    const cs = this.cellSize;

    // 背景
    ctx.fillStyle = '#0a0a18';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // グリッド線
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    for (let r = 0; r <= ROWS; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * cs);
      ctx.lineTo(COLS * cs, r * cs);
      ctx.stroke();
    }
    for (let c = 0; c <= COLS; c++) {
      ctx.beginPath();
      ctx.moveTo(c * cs, 0);
      ctx.lineTo(c * cs, ROWS * cs);
      ctx.stroke();
    }

    // 固定ブロック（HIDDEN_ROWS分オフセット）
    for (let r = HIDDEN_ROWS; r < ROWS + HIDDEN_ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (this.board[r][c]) {
          this.drawCell(ctx, c, r - HIDDEN_ROWS, this.board[r][c]);
        }
      }
    }

    // ゴースト
    const ghostY = this.getGhostY();
    const shape = this.getShape(this.current.key, this.current.rot);
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (!shape[r][c]) continue;
        const drawY = ghostY + r - HIDDEN_ROWS;
        if (drawY < 0) continue;
        this.drawCell(ctx, this.current.x + c, drawY, this.current.key, 0.2);
      }
    }

    // 現在のピース
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (!shape[r][c]) continue;
        const drawY = this.current.y + r - HIDDEN_ROWS;
        if (drawY < 0) continue;
        this.drawCell(ctx, this.current.x + c, drawY, this.current.key);
      }
    }
  }

  drawPreview(ctx, key, cellSize) {
    ctx.fillStyle = '#0a0a18';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    if (!key) return;
    const shape = this.getShape(key, 0);
    // 描画範囲を計算して中央揃え
    let minR = 4, maxR = 0, minC = 4, maxC = 0;
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (shape[r][c]) {
          minR = Math.min(minR, r); maxR = Math.max(maxR, r);
          minC = Math.min(minC, c); maxC = Math.max(maxC, c);
        }
      }
    }
    const pw = (maxC - minC + 1);
    const ph = (maxR - minR + 1);
    const ox = Math.floor((4 - pw) / 2) - minC;
    const oy = Math.floor((4 - ph) / 2) - minR;
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (shape[r][c]) {
          this.drawCell(ctx, c + ox, r + oy, key, 1, cellSize);
        }
      }
    }
  }

  draw() {
    this.drawBoard();
    this.drawPreview(this.nextCtx, this.peekNext(), this.previewCellSize);
    this.drawPreview(this.holdCtx, this.holdKey, this.previewCellSize);
  }

  // ===== ゲームループ =====
  update(time = 0) {
    if (this.gameOver || this.paused) return;
    const delta = time - this.lastTime;
    this.lastTime = time;
    this.dropCounter += delta;
    if (this.dropCounter >= this.dropInterval) {
      this.dropCounter = 0;
      if (!this.collides(this.current, 0, 1)) {
        this.current.y++;
      } else {
        this.lock();
      }
    }
    this.draw();
  }
}

// ===== メインコントローラ =====
class GameController {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.nextCanvas = document.getElementById('next-canvas');
    this.holdCanvas = document.getElementById('hold-canvas');
    this.overlay = document.getElementById('overlay');
    this.overlayTitle = document.getElementById('overlay-title');
    this.overlayScore = document.getElementById('overlay-score');
    this.overlayBtn = document.getElementById('overlay-btn');

    this.game = new Tetris(this.canvas, this.nextCanvas, this.holdCanvas);
    this.animFrame = null;

    this.keys = {};
    this.dasTimer = null;
    this.dasDelay = 170;
    this.dasRepeat = 50;

    this.bindEvents();
    this.showStartScreen();
  }

  showStartScreen() {
    this.overlayTitle.textContent = 'テトリス';
    this.overlayScore.textContent = 'スタートボタンを押してください';
    this.overlayBtn.textContent = 'スタート';
    this.overlayBtn.onclick = () => this.startGame();
    this.overlay.classList.remove('hidden');
    this.game.draw();
  }

  showGameOver() {
    this.overlayTitle.textContent = 'GAME OVER';
    this.overlayScore.textContent = `スコア: ${this.game.score} | ライン: ${this.game.lines}`;
    this.overlayBtn.textContent = 'もう一度';
    this.overlayBtn.onclick = () => this.startGame();
    this.overlay.classList.remove('hidden');
  }

  startGame() {
    this.overlay.classList.add('hidden');
    this.game.reset();
    this.loop();
  }

  loop(time = 0) {
    this.game.update(time);
    if (this.game.gameOver) {
      this.showGameOver();
      return;
    }
    this.animFrame = requestAnimationFrame(t => this.loop(t));
  }

  bindEvents() {
    // キーボード
    document.addEventListener('keydown', e => this.onKeyDown(e));
    document.addEventListener('keyup', e => this.onKeyUp(e));

    // モバイルボタン
    const btnMap = {
      'btn-left':   () => this.game.moveLeft(),
      'btn-right':  () => this.game.moveRight(),
      'btn-down':   () => this.game.softDrop(),
      'btn-drop':   () => this.game.hardDrop(),
      'btn-rotate': () => this.game.rotate(1),
      'btn-hold':   () => this.game.hold(),
    };
    for (const [id, fn] of Object.entries(btnMap)) {
      const btn = document.getElementById(id);
      if (!btn) continue;
      btn.addEventListener('touchstart', e => {
        e.preventDefault();
        if (!this.game.gameOver && !this.game.paused) fn();
      }, { passive: false });
      btn.addEventListener('mousedown', () => {
        if (!this.game.gameOver && !this.game.paused) fn();
      });
    }

    // タッチスワイプ
    this.bindSwipe();

    // リサイズ
    window.addEventListener('resize', () => {
      this.game.resize();
      this.game.draw();
    });
  }

  startDAS(action) {
    action();
    clearInterval(this.dasTimer);
    this.dasTimer = setTimeout(() => {
      this.dasTimer = setInterval(action, this.dasRepeat);
    }, this.dasDelay);
  }

  stopDAS() {
    clearTimeout(this.dasTimer);
    clearInterval(this.dasTimer);
    this.dasTimer = null;
  }

  onKeyDown(e) {
    if (this.game.gameOver) return;
    switch (e.code) {
      case 'ArrowLeft':
        e.preventDefault();
        if (!this.keys['ArrowLeft']) {
          this.keys['ArrowLeft'] = true;
          this.startDAS(() => { this.game.moveLeft(); });
        }
        break;
      case 'ArrowRight':
        e.preventDefault();
        if (!this.keys['ArrowRight']) {
          this.keys['ArrowRight'] = true;
          this.startDAS(() => { this.game.moveRight(); });
        }
        break;
      case 'ArrowDown':
        e.preventDefault();
        this.game.softDrop();
        break;
      case 'ArrowUp':
      case 'KeyZ':
        e.preventDefault();
        this.game.rotate(1);
        break;
      case 'KeyX':
        e.preventDefault();
        this.game.rotate(-1);
        break;
      case 'Space':
        e.preventDefault();
        this.game.hardDrop();
        break;
      case 'KeyC':
      case 'ShiftLeft':
      case 'ShiftRight':
        e.preventDefault();
        this.game.hold();
        break;
    }
  }

  onKeyUp(e) {
    if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
      this.keys[e.code] = false;
      this.stopDAS();
    }
  }

  bindSwipe() {
    let startX = 0, startY = 0, startTime = 0;
    const TAP_THRESHOLD = 10;
    const SWIPE_MIN = 30;

    this.canvas.addEventListener('touchstart', e => {
      e.preventDefault();
      const t = e.touches[0];
      startX = t.clientX;
      startY = t.clientY;
      startTime = Date.now();
    }, { passive: false });

    this.canvas.addEventListener('touchend', e => {
      e.preventDefault();
      if (this.game.gameOver) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;
      const elapsed = Date.now() - startTime;
      const absDx = Math.abs(dx), absDy = Math.abs(dy);

      if (absDx < TAP_THRESHOLD && absDy < TAP_THRESHOLD && elapsed < 200) {
        // タップ = 回転
        this.game.rotate(1);
      } else if (absDx > absDy && absDx > SWIPE_MIN) {
        // 水平スワイプ
        if (dx > 0) this.game.moveRight(); else this.game.moveLeft();
      } else if (absDy > absDx && absDy > SWIPE_MIN) {
        if (dy > 0) {
          // 下スワイプ = ソフトドロップ or ハードドロップ
          if (absDy > 80) this.game.hardDrop(); else this.game.softDrop();
        }
      }
    }, { passive: false });
  }
}

// ===== 起動 =====
window.addEventListener('DOMContentLoaded', () => {
  new GameController();
});
