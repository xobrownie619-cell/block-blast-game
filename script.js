// DOM Elements
const homeScreen = document.getElementById('home-screen');
const gameWrapper = document.getElementById('game-wrapper');
const gridElement = document.getElementById('game-grid');
const shapesContainer = document.getElementById('shapes-container');
const scoreElement = document.getElementById('score');
const bestElement = document.getElementById('best-score');
const modal = document.getElementById('game-over-modal');
const finalScore = document.getElementById('final-score');
const particlesContainer = document.getElementById('particles-container');

// Game State
let grid = [];
let score = 0;
let bestScore = localStorage.getItem('blockBlastBest') || 0;
let gridSize = 8; // Default to Classic
let isSoundOn = true;

bestElement.innerText = bestScore;

// --- HOME SCREEN LOGIC ---

// Create floating background shapes
function initBackground() {
    const bg = document.getElementById('home-bg');
    bg.innerHTML = '';
    const colors = ['#ff0055', '#ffcc00', '#4e54c8', '#00ff99'];
    for(let i=0; i<15; i++) {
        const div = document.createElement('div');
        div.style.position = 'absolute';
        div.style.width = Math.random() * 40 + 20 + 'px';
        div.style.height = div.style.width;
        div.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        div.style.opacity = '0.1';
        div.style.borderRadius = '10%';
        div.style.left = Math.random() * 100 + '%';
        div.style.top = Math.random() * 100 + '%';
        div.style.animation = `float ${Math.random() * 10 + 5}s infinite linear`;
        bg.appendChild(div);
    }
}
// Add simple keyframe for float
const styleSheet = document.createElement("style");
styleSheet.innerText = `@keyframes float { 0% { transform: translateY(0) rotate(0deg); } 100% { transform: translateY(-100vh) rotate(360deg); } }`;
document.head.appendChild(styleSheet);

initBackground();

function setDifficulty(size) {
    gridSize = size;
    document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('selected'));
    event.currentTarget.classList.add('selected');
}

function startGame() {
    homeScreen.style.display = 'none';
    gameWrapper.classList.remove('hidden');
    initGame();
}

function goHome() {
    modal.classList.add('hidden');
    gameWrapper.classList.add('hidden');
    homeScreen.style.display = 'flex';
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
    modal.classList.add('hidden');
    
    // Adjust grid CSS for size
    gridElement.style.gridTemplateColumns = `repeat(${gridSize}, 1fr)`;
    gridElement.style.gridTemplateRows = `repeat(${gridSize}, 1fr)`;
    
    // Fit to screen
    const screenWidth = Math.min(window.innerWidth, 400);
    const cellSize = (screenWidth - 40) / gridSize;
    gridElement.style.width = (cellSize * gridSize) + (gridSize * 4) + 'px';
    gridElement.style.height = gridElement.style.width;

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
            if (grid[r][c] !== 0) {
                cell.classList.add('taken');
                cell.style.backgroundColor = grid[r][c];
            }
            gridElement.appendChild(cell);
        }
    }
}

// --- REVIVE LOGIC ---
function reviveGame() {
    // "Blast" the center of the board to make space
    const centerStart = Math.floor(gridSize / 2) - 2;
    const centerEnd = centerStart + 4;

    for (let r = 0; r < gridSize; r++) {
        for (let c = 0; c < gridSize; c++) {
            // Clear if in center 4x4 OR random 20% chance elsewhere
            if ((r >= centerStart && r < centerEnd && c >= centerStart && c < centerEnd) || Math.random() > 0.8) {
                grid[r][c] = 0;
                createParticles(r, c); // Visual effect
            }
        }
    }
    
    // Penalty? No, let's keep score but maybe reset shapes
    modal.classList.add('hidden');
    renderGrid();
    generateNewShapes(); // Give fresh shapes
}

function restartGame() {
    initGame();
}

// --- SHAPE & DRAG LOGIC (Standard) ---
function generateNewShapes() {
    shapesContainer.innerHTML = '';
    for (let i = 0; i < 3; i++) {
        createShapeElement();
    }
}

function createShapeElement() {
    const shapeData = SHAPE_TYPES[Math.floor(Math.random() * SHAPE_TYPES.length)];
    const shapeWrapper = document.createElement('div');
    shapeWrapper.classList.add('shape-option');
    shapeWrapper.style.gridTemplateColumns = `repeat(${shapeData.matrix[0].length}, 20px)`;
    shapeWrapper.dataset.matrix = JSON.stringify(shapeData.matrix);
    shapeWrapper.dataset.color = shapeData.color;

    shapeData.matrix.forEach(row => {
        row.forEach(val => {
            const cell = document.createElement('div');
            if (val) {
                cell.classList.add('mini-cell');
                cell.style.backgroundColor = shapeData.color;
            } else {
                cell.style.width = '20px'; cell.style.height = '20px';
            }
            shapeWrapper.appendChild(cell);
        });
    });

    shapeWrapper.addEventListener('touchstart', handleTouchStart, {passive: false});
    shapeWrapper.addEventListener('mousedown', handleMouseDown);
    shapesContainer.appendChild(shapeWrapper);
}

// ... Drag Logic (Simplified for brevity, same as V4 but using dynamic gridSize) ...
let draggedElement = null, mirrorElement = null, currentMatrix = null, currentColor = null;

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
    if(mirrorElement) {
        mirrorElement.style.left = (e.clientX - 20) + 'px';
        mirrorElement.style.top = (e.clientY - 80) + 'px';
    }
}

function handleDragEnd(e) {
    const x = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
    const y = e.changedTouches ? e.changedTouches[0].clientY : e.clientY;
    if(mirrorElement) mirrorElement.remove();
    mirrorElement = null;

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
    for(let r=0; r<gridSize; r++) {
        if(grid[r].every(v => v !== 0)) {
            grid[r].fill(0);
            linesCleared++;
            createParticles(r, -1);
        }
    }
    for(let c=0; c<gridSize; c++) {
        let full = true;
        for(let r=0; r<gridSize; r++) if(grid[r][c] === 0) full = false;
        if(full) {
            for(let r=0; r<gridSize; r++) grid[r][c] = 0;
            linesCleared++;
            createParticles(-1, c);
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

function createParticles(r, c) {
    // Simple particle effect (placeholder for brevity)
}
