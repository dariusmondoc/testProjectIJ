const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 30;

const canvas = document.getElementById('game');
const context = canvas.getContext('2d');
context.scale(BLOCK_SIZE, BLOCK_SIZE);

const scoreElem = document.getElementById('score');
const linesElem = document.getElementById('lines');
const statusElem = document.getElementById('status');

const colors = [
  null,
  '#55efc4',
  '#81ecec',
  '#74b9ff',
  '#a29bfe',
  '#fd79a8',
  '#ffeaa7',
  '#fab1a0',
];

function createMatrix(width, height) {
  return Array.from({ length: height }, () => Array(width).fill(0));
}

function createPiece(type) {
  switch (type) {
    case 'T':
      return [
        [0, 0, 0],
        [1, 1, 1],
        [0, 1, 0],
      ];
    case 'O':
      return [
        [2, 2],
        [2, 2],
      ];
    case 'L':
      return [
        [0, 3, 0],
        [0, 3, 0],
        [0, 3, 3],
      ];
    case 'J':
      return [
        [0, 4, 0],
        [0, 4, 0],
        [4, 4, 0],
      ];
    case 'I':
      return [
        [0, 5, 0, 0],
        [0, 5, 0, 0],
        [0, 5, 0, 0],
        [0, 5, 0, 0],
      ];
    case 'S':
      return [
        [0, 6, 6],
        [6, 6, 0],
        [0, 0, 0],
      ];
    case 'Z':
      return [
        [7, 7, 0],
        [0, 7, 7],
        [0, 0, 0],
      ];
    default:
      throw new Error(`Unknown piece type: ${type}`);
  }
}

const arena = createMatrix(COLS, ROWS);
const player = {
  pos: { x: 0, y: 0 },
  matrix: null,
  score: 0,
  lines: 0,
};

const scorePerClear = {
  1: 100,
  2: 300,
  3: 500,
  4: 800,
};

function collide(board, activePlayer) {
  const { matrix, pos } = activePlayer;

  for (let y = 0; y < matrix.length; y += 1) {
    for (let x = 0; x < matrix[y].length; x += 1) {
      if (matrix[y][x] === 0) {
        continue;
      }

      const boardY = y + pos.y;
      const boardX = x + pos.x;
      const outOfBounds = boardY < 0 || boardY >= board.length || boardX < 0 || boardX >= board[0].length;
      if (outOfBounds || board[boardY][boardX] !== 0) {
        return true;
      }
    }
  }

  return false;
}

function merge(board, activePlayer) {
  activePlayer.matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) {
        board[y + activePlayer.pos.y][x + activePlayer.pos.x] = value;
      }
    });
  });
}

function rotate(matrix, direction) {
  for (let y = 0; y < matrix.length; y += 1) {
    for (let x = 0; x < y; x += 1) {
      [matrix[x][y], matrix[y][x]] = [matrix[y][x], matrix[x][y]];
    }
  }

  if (direction > 0) {
    matrix.forEach((row) => row.reverse());
  } else {
    matrix.reverse();
  }
}

function playerRotate(direction) {
  const originalX = player.pos.x;
  let offset = 1;
  rotate(player.matrix, direction);

  while (collide(arena, player)) {
    player.pos.x += offset;
    offset = -(offset + (offset > 0 ? 1 : -1));
    if (Math.abs(offset) > player.matrix[0].length) {
      rotate(player.matrix, -direction);
      player.pos.x = originalX;
      return;
    }
  }
}

function arenaSweep() {
  let cleared = 0;

  outer: for (let y = arena.length - 1; y >= 0; y -= 1) {
    for (let x = 0; x < arena[y].length; x += 1) {
      if (arena[y][x] === 0) {
        continue outer;
      }
    }

    const row = arena.splice(y, 1)[0].fill(0);
    arena.unshift(row);
    y += 1;
    cleared += 1;
  }

  if (cleared > 0) {
    player.lines += cleared;
    player.score += scorePerClear[cleared] || (cleared * 200);
    statusElem.textContent = `Cleared ${cleared} row${cleared > 1 ? 's' : ''}!`;
  } else {
    statusElem.textContent = '';
  }
}

function playerDrop() {
  player.pos.y += 1;
  if (collide(arena, player)) {
    player.pos.y -= 1;
    merge(arena, player);
    arenaSweep();
    playerReset();
    updateScore();
  }
  dropCounter = 0;
}

function playerHardDrop() {
  do {
    player.pos.y += 1;
  } while (!collide(arena, player));

  player.pos.y -= 1;
  merge(arena, player);
  arenaSweep();
  playerReset();
  updateScore();
  dropCounter = 0;
}

function playerMove(offset) {
  player.pos.x += offset;
  if (collide(arena, player)) {
    player.pos.x -= offset;
  }
}

function playerReset() {
  const pieces = 'TJLOSZI';
  player.matrix = createPiece(pieces[Math.floor(Math.random() * pieces.length)]);
  player.pos.y = 0;
  player.pos.x = Math.floor(arena[0].length / 2) - Math.floor(player.matrix[0].length / 2);

  if (collide(arena, player)) {
    arena.forEach((row) => row.fill(0));
    player.score = 0;
    player.lines = 0;
    statusElem.textContent = 'Game over — board reset.';
    updateScore();
  }
}

function drawMatrix(matrix, offset) {
  matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) {
        context.fillStyle = colors[value];
        context.fillRect(x + offset.x, y + offset.y, 1, 1);

        context.strokeStyle = 'rgba(0, 0, 0, 0.35)';
        context.lineWidth = 0.05;
        context.strokeRect(x + offset.x, y + offset.y, 1, 1);
      }
    });
  });
}

function drawGrid() {
  context.save();
  context.strokeStyle = 'rgba(255, 255, 255, 0.06)';
  context.lineWidth = 0.03;

  for (let x = 0; x <= COLS; x += 1) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, ROWS);
    context.stroke();
  }

  for (let y = 0; y <= ROWS; y += 1) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(COLS, y);
    context.stroke();
  }

  context.restore();
}

function draw() {
  context.fillStyle = '#090c18';
  context.fillRect(0, 0, COLS, ROWS);

  drawGrid();
  drawMatrix(arena, { x: 0, y: 0 });
  drawMatrix(player.matrix, player.pos);
}

let dropCounter = 0;
const dropInterval = 900;
let lastTime = 0;

function update(time = 0) {
  const deltaTime = time - lastTime;
  lastTime = time;

  dropCounter += deltaTime;
  if (dropCounter > dropInterval) {
    playerDrop();
  }

  draw();
  requestAnimationFrame(update);
}

function updateScore() {
  scoreElem.textContent = player.score;
  linesElem.textContent = player.lines;
}

document.addEventListener('keydown', (event) => {
  switch (event.key) {
    case 'ArrowLeft':
      playerMove(-1);
      break;
    case 'ArrowRight':
      playerMove(1);
      break;
    case 'ArrowDown':
      playerDrop();
      break;
    case 'q':
    case 'Q':
      playerRotate(-1);
      break;
    case 'ArrowUp':
    case 'w':
    case 'W':
      playerRotate(1);
      break;
    case ' ':
      playerHardDrop();
      break;
    default:
      return;
  }

  event.preventDefault();
});

playerReset();
updateScore();
update();
