// Screens
const splashScreen = document.getElementById('splash-screen');
const modeScreen = document.getElementById('mode-screen');
const gameWrapper = document.getElementById('game-wrapper');
const modal = document.getElementById('game-over-modal');

// Game Elements
const gridElement = document.getElementById('game-grid');
const shapesContainer = document.getElementById('shapes-container');
const scoreElement = document.getElementById('score');
const bestElement = document.getElementById('best-score');
const finalScore = document.getElementById('final-score');

// State
let grid = [];
let score = 0;
let bestScore = localStorage.getItem('blockBlastBest') || 0;
let gridSize = 8;
let isSoundOn = true;

bestElement.innerText = bestScore;

// --- NAVIGATION ---
function showModeScreen() {
    splashScreen.classList.add('hidden');
    modeScreen.classList.remove('hidden');
}

function goBackToSplash() {
    modeScreen.classList.add('hidden');
    splashScreen.classList.remove('hidden');
}

function startGame(size) {
    gridSize = size;
    modeScreen.classList.add('hidden');
    gameWrapper.classList.remove('hidden');
    initGame();
}

function goHome() {
    modal.classList.add('hidden');
    gameWrapper.classList.add('hidden');
    splashScreen.classList.remove('hidden');
}

function toggleSound() {
    isSoundOn = !isSoundOn;
    document.getElementById('sound-icon').className = isSoundOn ? 'fas fa-volume-up' : 'fas fa-volume-mute';
}

// --- GAME LOGIC ---
const SHAPE_TYPES = [
    { matrix: [[1]], color: '#ffcc00' },
    { matrix: [[1, 1, 1]], color: '#00ccff' },
    { matrix: [[1], [1], [1]], color: '#00ccff' },
    { matrix: [[1, 1], [1, 1]], color: '#ff0055' },
    { matrix: [[1, 1, 1], [0, 1, 0]], color: '#aa00ff' },
    { matrix: [[1, 1], [1, 0]], color: '#00ff99' },
    { matrix: [[1, 1, 1, 1]], color: '#ff5500' }
];

function initGame() {
    grid = Array(gridSize).fill(null).map(() => Array(gridSize).fill(0));
    score = 0;
    scoreElement.innerText = 0;
    
    // Responsive Grid Sizing
    gridElement.style.gridTemplateColumns = `repeat(${gridSize}, 1fr)`;
    gridElement.style.gridTemplateRows = `repeat(${gridSize}, 1fr)`;
    
    // Fit to width
    const w = Math.min(window.innerWidth, 400) - 40;
    const cellSize = (w / gridSize) - 4; // account for gap
    gridElement.style.width = w + 'px';
    gridElement.style.height = w + 'px';

    renderGrid();
    generateNewShapes();
}

function renderGrid() {
    gridElement.innerHTML = '';
    for (let r = 0; r < gridSize; r++) {
        for (let c = 0; c < gridSize; c++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            cell.dataset.row = r;
            cell.dataset.col = c;
            cell.id = `cell-${r}-${c}`; // Easy access for ghosting
            if (grid[r][c] !== 0) {
                cell.classList.add('taken');
                cell.style.backgroundColor = grid[r][c];
            }
            gridElement.appendChild(cell);
        }
    }
}

// --- GHOST PREVIEW & DRAGGING ---
let draggedElement = null, mirrorElement = null;
let currentMatrix = null, currentColor = null;
let lastGhostCells = []; // Track where we drew ghosts to clear them

function handleTouchStart(e) { e.preventDefault(); startDrag(e.touches[0], e.currentTarget); }
function handleMouseDown(e) { startDrag(e, e.currentTarget); }

function startDrag(e, original) {
    if(original.style.opacity === '0') return;
    draggedElement = original;
    currentMatrix = JSON.parse(draggedElement.dataset.matrix);
    currentColor = draggedElement.dataset.color;
    
    mirrorElement = original.cloneNode(true);
    mirrorElement.classList.add('draggable-mirror');
    document.body.appendChild(mirrorElement);
    
    moveMirror(e);
    
    document.addEventListener('touchmove', handleTouchMove, {passive: false});
    document.addEventListener('touchend', handleDragEnd);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleDragEnd);
}

function handleTouchMove(e) { e.preventDefault(); moveMirror(e.touches[0]); }
function handleMouseMove(e) { moveMirror(e); }

function moveMirror(e) {
    if(!mirrorElement) return;
    
    // 1. Move the visual mirror
    const offsetX = 80; // Finger is 80px below the block
    mirrorElement.style.left = (e.clientX - 25) + 'px'; // Center on finger x
    mirrorElement.style.top = (e.clientY - offsetX) + 'px';

    // 2. Calculate Grid Position for Ghost
    // We look for the cell under the "True" position of the block (offset by finger)
    const el = document.elementFromPoint(e.clientX, e.clientY - offsetX);
    const cell = el ? el.closest('.cell') : null;

    if (cell) {
        const r = parseInt(cell.dataset.row);
        const c = parseInt(cell.dataset.col);
        const rOff = Math.floor(currentMatrix.length/2);
        const cOff = Math.floor(currentMatrix[0].length/2);
        
        drawGhost(r - rOff, c - cOff);
    } else {
        clearGhost();
    }
}

function drawGhost(row, col) {
    // 1. Check if placement is valid
    if (!canPlace(row, col, currentMatrix)) {
        clearGhost();
        return;
    }

    // 2. If same as last frame, skip (optimization)
    // (Skipped for simplicity, just redraw)
    clearGhost();

    // 3. Draw new ghost
    for(let r=0; r<currentMatrix.length; r++) {
        for(let c=0; c<currentMatrix[0].length; c++) {
            if(currentMatrix[r][c] === 1) {
                const targetRow = row + r;
                const targetCol = col + c;
                const targetCell = document.getElementById(`cell-${targetRow}-${targetCol}`);
                if (targetCell) {
                    targetCell.classList.add('ghost');
                    targetCell.style.backgroundColor = currentColor; // Tint with shape color
                    lastGhostCells.push(targetCell);
                }
            }
        }
    }
}

function clearGhost() {
    lastGhostCells.forEach(cell => {
        cell.classList.remove('ghost');
        cell.style.backgroundColor = ''; // Remove tint
        // If it was 'taken', restore its color? 
        // No, 'taken' cells aren't ghosted over because canPlace returns false.
        // Empty cells have no inline color, so this is safe.
    });
    lastGhostCells = [];
}

function handleDragEnd(e) {
    const x = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
    const y = e.changedTouches ? e.changedTouches[0].clientY : e.clientY;
    
    if(mirrorElement) mirrorElement.remove();
    mirrorElement = null;
    clearGhost(); // Remove preview

    const el = document.elementFromPoint(x, y - 80);
    const cell = el ? el.closest('.cell') : null;
    
    if (cell) {
        const r = parseInt(cell.dataset.row);
        const c = parseInt(cell.dataset.col);
        const rOff = Math.floor(currentMatrix.length/2);
        const cOff = Math.floor(currentMatrix[0].length/2);
        attemptPlace(r - rOff, c - cOff);
    }
    
    document.removeEventListener('touchmove', handleTouchMove);
    document.removeEventListener('touchend', handleDragEnd);
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleDragEnd);
}

// --- STANDARD GAME LOGIC (Place, Clear, Revive) ---
function attemptPlace(row, col) {
    if (canPlace(row, col, currentMatrix)) {
        for(let r=0; r<currentMatrix.length; r++) {
            for(let c=0; c<currentMatrix[0].length; c++) {
                if(currentMatrix[r][c] === 1) grid[row+r][col+c] = currentColor;
            }
        }
        if(isSoundOn && navigator.vibrate) navigator.vibrate(20);
        draggedElement.style.visibility = 'hidden';
        draggedElement.style.pointerEvents = 'none';
        renderGrid();
        checkLines();
        
        const allUsed = Array.from(shapesContainer.children).every(el => el.style.visibility === 'hidden');
        if(allUsed) generateNewShapes();
        else checkGameOver();
    }
}

function canPlace(row, col, matrix) {
    for(let r=0; r<matrix.length; r++) {
        for(let c=0; c<matrix[0].length; c++) {
            if(matrix[r][c] === 1) {
                if(row+r < 0 || row+r >= gridSize || col+c < 0 || col+c >= gridSize) return false;
                if(grid[row+r][col+c] !== 0) return false;
            }
        }
    }
    return true;
}

function checkLines() {
    let linesCleared = 0;
    // Rows
    for(let r=0; r<gridSize; r++) {
        if(grid[r].every(v => v !== 0)) {
            grid[r].fill(0);
            linesCleared++;
        }
    }
    // Cols
    for(let c=0; c<gridSize; c++) {
        let full = true;
        for(let r=0; r<gridSize; r++) if(grid[r][c] === 0) full = false;
        if(full) {
            for(let r=0; r<gridSize; r++) grid[r][c] = 0;
            linesCleared++;
        }
    }
    if(linesCleared > 0) {
        score += linesCleared * 100;
        scoreElement.innerText = score;
        if(score > bestScore) {
            bestScore = score;
            localStorage.setItem('blockBlastBest', bestScore);
            bestElement.innerText = bestScore;
        }
        renderGrid();
    }
}

function generateNewShapes() {
    shapesContainer.innerHTML = '';
    for (let i = 0; i < 3; i++) {
        const shapeData = SHAPE_TYPES[Math.floor(Math.random() * SHAPE_TYPES.length)];
        const wrapper = document.createElement('div');
        wrapper.className = 'shape-option';
        wrapper.style.gridTemplateColumns = `repeat(${shapeData.matrix[0].length}, 20px)`;
        wrapper.dataset.matrix = JSON.stringify(shapeData.matrix);
        wrapper.dataset.color = shapeData.color;
        
        shapeData.matrix.forEach(row => {
            row.forEach(val => {
                const d = document.createElement('div');
                if(val) { d.className = 'mini-cell'; d.style.background = shapeData.color; }
                else { d.style.width='20px'; d.style.height='20px'; }
                wrapper.appendChild(d);
            });
        });
        
        wrapper.addEventListener('touchstart', handleTouchStart, {passive: false});
        wrapper.addEventListener('mousedown', handleMouseDown);
        shapesContainer.appendChild(wrapper);
    }
}

function checkGameOver() {
    const visible = Array.from(shapesContainer.children).filter(el => el.style.visibility !== 'hidden');
    let possible = false;
    for(let el of visible) {
        const mat = JSON.parse(el.dataset.matrix);
        for(let r=0; r<gridSize; r++) {
            for(let c=0; c<gridSize; c++) {
                if(canPlace(r, c, mat)) { possible = true; break; }
            }
        }
    }
    if(!possible && visible.length > 0) {
        finalScore.innerText = score;
        modal.classList.remove('hidden');
    }
}

function reviveGame() {
    const start = Math.floor(gridSize/2)-2;
    for(let r=start; r<start+4; r++) {
        for(let c=start; c<start+4; c++) grid[r][c] = 0;
    }
    modal.classList.add('hidden');
    renderGrid();
    generateNewShapes();
}

function restartGame() { initGame(); }
function createParticles(r, c) {} // Optimized out for speed in this version

// Init Background
const bg = document.getElementById('home-bg');
if(bg) {
    for(let i=0; i<15; i++) {
        const d = document.createElement('div');
        d.style.cssText = `position:absolute; width:${Math.random()*40+20}px; height:${Math.random()*40+20}px; background:rgba(255,255,255,0.1); left:${Math.random()*100}%; top:${Math.random()*100}%; animation: floatLogo ${Math.random()*5+5}s infinite; border-radius:10%`;
        bg.appendChild(d);
    }
}
