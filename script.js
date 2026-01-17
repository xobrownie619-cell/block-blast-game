// --- DOM ELEMENTS ---
const splashScreen = document.getElementById('splash-screen');
const modeScreen = document.getElementById('mode-screen');
const gameWrapper = document.getElementById('game-wrapper');
const modal = document.getElementById('game-over-modal');

const gridElement = document.getElementById('game-grid');
const shapesContainer = document.getElementById('shapes-container');
const scoreElement = document.getElementById('score');
const bestElement = document.getElementById('best-score');
const finalScore = document.getElementById('final-score');

// --- GAME STATE ---
let grid = [];
let score = 0;
let bestScore = localStorage.getItem('blockBlastBest') || 0;
let gridSize = 8;
let isSoundOn = true;

// Init Best Score
bestElement.innerText = bestScore;

// --- NAVIGATION FUNCTIONS ---

function goToModes() {
    splashScreen.classList.add('hidden');
    modeScreen.classList.remove('hidden');
}

function goBackHome() {
    modal.classList.add('hidden');
    gameWrapper.classList.add('hidden');
    modeScreen.classList.add('hidden');
    splashScreen.classList.remove('hidden');
}

function startGame(size) {
    gridSize = size;
    modeScreen.classList.add('hidden');
    gameWrapper.classList.remove('hidden');
    initGame();
}

function toggleSound() {
    isSoundOn = !isSoundOn;
    const icon = document.getElementById('sound-icon');
    icon.className = isSoundOn ? 'fas fa-volume-up' : 'fas fa-volume-mute';
}

// --- GAME LOGIC ---

const SHAPE_TYPES = [
    { matrix: [[1]], color: '#ffcc00' }, // Yellow 1x1
    { matrix: [[1, 1, 1]], color: '#00ccff' }, // Cyan Line
    { matrix: [[1], [1], [1]], color: '#00ccff' }, 
    { matrix: [[1, 1], [1, 1]], color: '#ff0055' }, // Red Square
    { matrix: [[1, 1, 1], [0, 1, 0]], color: '#aa00ff' }, // Purple T
    { matrix: [[1, 1], [1, 0]], color: '#00ff99' }, // Green L
    { matrix: [[1, 1, 1, 1]], color: '#ff5500' } // Orange Long
];

function initGame() {
    // Reset Grid
    grid = Array(gridSize).fill(null).map(() => Array(gridSize).fill(0));
    score = 0;
    scoreElement.innerText = 0;

    // Responsive Grid Size calculation
    gridElement.style.gridTemplateColumns = `repeat(${gridSize}, 1fr)`;
    gridElement.style.gridTemplateRows = `repeat(${gridSize}, 1fr)`;

    // Calculate width to fit screen (max 90% of screen width)
    const screenWidth = window.innerWidth;
    const maxBoardSize = Math.min(screenWidth * 0.9, 400); // Max 400px or 90% width
    
    gridElement.style.width = maxBoardSize + 'px';
    gridElement.style.height = maxBoardSize + 'px';

    renderGrid();
    generateNewShapes();
}

function renderGrid() {
    gridElement.innerHTML = '';
    for (let r = 0; r < gridSize; r++) {
        for (let c = 0; c < gridSize; c++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            cell.id = `c-${r}-${c}`; // ID for ghosting
            cell.dataset.r = r;
            cell.dataset.c = c;
            
            if (grid[r][c] !== 0) {
                cell.classList.add('taken');
                cell.style.backgroundColor = grid[r][c];
            }
            gridElement.appendChild(cell);
        }
    }
}

function generateNewShapes() {
    shapesContainer.innerHTML = '';
    for (let i = 0; i < 3; i++) {
        createShapeOption();
    }
}

function createShapeOption() {
    const shape = SHAPE_TYPES[Math.floor(Math.random() * SHAPE_TYPES.length)];
    const el = document.createElement('div');
    el.className = 'shape-option';
    el.style.gridTemplateColumns = `repeat(${shape.matrix[0].length}, 20px)`;
    el.dataset.matrix = JSON.stringify(shape.matrix);
    el.dataset.color = shape.color;

    shape.matrix.forEach(row => {
        row.forEach(val => {
            const d = document.createElement('div');
            if (val) {
                d.className = 'mini-cell';
                d.style.backgroundColor = shape.color;
            } else {
                d.style.width = '20px'; d.style.height = '20px';
            }
            el.appendChild(d);
        });
    });

    // Add drag listeners
    el.addEventListener('touchstart', handleStart, {passive: false});
    el.addEventListener('mousedown', handleStart);
    shapesContainer.appendChild(el);
}

// --- DRAG & DROP LOGIC ---
let dragEl = null, mirrorEl = null;
let currentMat = null, currentCol = null;

function handleStart(e) {
    if(e.target.closest('.shape-option').style.visibility === 'hidden') return;
    e.preventDefault();
    
    const original = e.currentTarget;
    dragEl = original;
    currentMat = JSON.parse(dragEl.dataset.matrix);
    currentCol = dragEl.dataset.color;

    mirrorEl = original.cloneNode(true);
    mirrorEl.classList.add('draggable-mirror');
    mirrorEl.style.width = original.offsetWidth + 'px';
    document.body.appendChild(mirrorElement = mirrorEl);

    moveMirror(e.touches ? e.touches[0] : e);

    document.addEventListener('touchmove', handleMove, {passive: false});
    document.addEventListener('touchend', handleEnd);
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleEnd);
}

function handleMove(e) {
    const event = e.touches ? e.touches[0] : e;
    e.preventDefault(); // Stop scroll
    moveMirror(event);
    
    // Ghost Logic
    const elBelow = document.elementFromPoint(event.clientX, event.clientY - 80);
    const cell = elBelow ? elBelow.closest('.cell') : null;
    clearGhost();
    
    if (cell) {
        const r = parseInt(cell.dataset.r);
        const c = parseInt(cell.dataset.c);
        const rOff = Math.floor(currentMat.length/2);
        const cOff = Math.floor(currentMat[0].length/2);
        drawGhost(r - rOff, c - cOff);
    }
}

function moveMirror(e) {
    if(mirrorEl) {
        mirrorEl.style.left = (e.clientX - mirrorEl.offsetWidth/2) + 'px';
        mirrorEl.style.top = (e.clientY - 80) + 'px';
    }
}

function drawGhost(row, col) {
    if (!canPlace(row, col, currentMat)) return;
    for(let r=0; r<currentMat.length; r++) {
        for(let c=0; c<currentMat[0].length; c++) {
            if(currentMat[r][c] === 1) {
                const cell = document.getElementById(`c-${row+r}-${col+c}`);
                if(cell) {
                    cell.classList.add('ghost');
                    cell.style.backgroundColor = currentCol;
                }
            }
        }
    }
}

function clearGhost() {
    document.querySelectorAll('.ghost').forEach(el => {
        el.classList.remove('ghost');
        el.style.backgroundColor = '';
    });
}

function handleEnd(e) {
    const event = e.changedTouches ? e.changedTouches[0] : e;
    mirrorEl.remove();
    mirrorEl = null;
    clearGhost();

    const elBelow = document.elementFromPoint(event.clientX, event.clientY - 80);
    const cell = elBelow ? elBelow.closest('.cell') : null;

    if (cell) {
        const r = parseInt(cell.dataset.r);
        const c = parseInt(cell.dataset.c);
        const rOff = Math.floor(currentMat.length/2);
        const cOff = Math.floor(currentMat[0].length/2);
        
        if (canPlace(r - rOff, c - cOff, currentMat)) {
            placeShape(r - rOff, c - cOff);
        }
    }

    document.removeEventListener('touchmove', handleMove);
    document.removeEventListener('touchend', handleEnd);
    document.removeEventListener('mousemove', handleMove);
    document.removeEventListener('mouseup', handleEnd);
}

function canPlace(row, col, mat) {
    for(let r=0; r<mat.length; r++) {
        for(let c=0; c<mat[0].length; c++) {
            if(mat[r][c] === 1) {
                if (row+r < 0 || row+r >= gridSize || col+c < 0 || col+c >= gridSize) return false;
                if (grid[row+r][col+c] !== 0) return false;
            }
        }
    }
    return true;
}

function placeShape(row, col) {
    for(let r=0; r<currentMat.length; r++) {
        for(let c=0; c<currentMat[0].length; c++) {
            if(currentMat[r][c] === 1) grid[row+r][col+c] = currentCol;
        }
    }
    
    if(isSoundOn && navigator.vibrate) navigator.vibrate(20);
    dragEl.style.visibility = 'hidden'; // Hide original
    renderGrid();
    checkLines();
    
    const remaining = Array.from(shapesContainer.children).filter(el => el.style.visibility !== 'hidden');
    if (remaining.length === 0) {
        generateNewShapes();
    } else {
        checkGameOver();
    }
}

function checkLines() {
    let cleared = 0;
    // Check Rows
    for(let r=0; r<gridSize; r++) {
        if(grid[r].every(v => v !== 0)) {
            grid[r].fill(0);
            cleared++;
        }
    }
    // Check Cols
    for(let c=0; c<gridSize; c++) {
        let full = true;
        for(let r=0; r<gridSize; r++) if(grid[r][c] === 0) full = false;
        if(full) {
            for(let r=0; r<gridSize; r++) grid[r][c] = 0;
            cleared++;
        }
    }
    
    if (cleared > 0) {
        score += cleared * 100;
        scoreElement.innerText = score;
        if(score > bestScore) {
            bestScore = score;
            localStorage.setItem('blockBlastBest', score);
            bestElement.innerText = score;
        }
        renderGrid();
    }
}

function checkGameOver() {
    const remaining = Array.from(shapesContainer.children).filter(el => el.style.visibility !== 'hidden');
    let possible = false;
    
    for (let el of remaining) {
        const mat = JSON.parse(el.dataset.matrix);
        for(let r=0; r<gridSize; r++) {
            for(let c=0; c<gridSize; c++) {
                if(canPlace(r, c, mat)) { possible = true; break; }
            }
            if(possible) break;
        }
        if(possible) break;
    }

    if (!possible) {
        finalScore.innerText = score;
        modal.classList.remove('hidden');
    }
}

function reviveGame() {
    // Clear center 4x4
    const start = Math.floor(gridSize/2) - 2;
    for(let r=start; r<start+4; r++) {
        for(let c=start; c<start+4; c++) grid[r][c] = 0;
    }
    modal.classList.add('hidden');
    renderGrid();
    // Maybe give new shapes?
    generateNewShapes();
}

function restartGame() {
    modal.classList.add('hidden');
    initGame();
}

// Background Animation
const bg = document.getElementById('home-bg');
for(let i=0; i<15; i++){
    const d = document.createElement('div');
    d.style.cssText = `position:absolute; background:rgba(255,255,255,0.05); border-radius:10%; width:${Math.random()*50+20}px; height:${Math.random()*50+20}px; left:${Math.random()*100}%; top:${Math.random()*100}%; animation:pulse ${Math.random()*5+2}s infinite`;
    bg.appendChild(d);
}
