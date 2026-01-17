const gridElement = document.getElementById('game-grid');
const shapesContainer = document.getElementById('shapes-container');
const scoreElement = document.getElementById('score');
const modal = document.getElementById('game-over-modal');
const finalScore = document.getElementById('final-score');

let grid = [];
let score = 0;
const gridSize = 8;

// --- 1. SHAPE DEFINITIONS & COLORS ---
// We map specific shapes to specific colors for a consistent "Pro" look
const SHAPE_TYPES = [
    { matrix: [[1]], color: '#f1c40f' }, // 1x1 (Yellow)
    { matrix: [[1, 1]], color: '#e67e22' }, // 2x1 (Orange)
    { matrix: [[1], [1]], color: '#e67e22' }, // 1x2 (Orange)
    { matrix: [[1, 1, 1]], color: '#3498db' }, // 3x1 (Blue)
    { matrix: [[1], [1], [1]], color: '#3498db' }, // 1x3 (Blue)
    { matrix: [[1, 1], [1, 1]], color: '#2ecc71' }, // 2x2 (Green)
    { matrix: [[1, 1, 1], [1, 0, 0]], color: '#9b59b6' }, // L-Shape (Purple)
    { matrix: [[1, 1, 1], [0, 0, 1]], color: '#9b59b6' }, // L-Shape Inverse
    { matrix: [[1, 1, 1], [0, 1, 0]], color: '#e74c3c' }, // T-Shape (Red)
    { matrix: [[1, 1, 1, 1]], color: '#1abc9c' }, // 4x1 (Teal)
    { matrix: [[1], [1], [1], [1]], color: '#1abc9c' } // 1x4 (Teal)
];

function initGame() {
    grid = Array(gridSize).fill(null).map(() => Array(gridSize).fill(0));
    score = 0;
    scoreElement.innerText = score;
    modal.classList.add('hidden');
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

// --- 2. INTELLIGENT SHAPE GENERATION ---
function generateNewShapes() {
    shapesContainer.innerHTML = '';
    for (let i = 0; i < 3; i++) {
        createShapeElement();
    }
}

function createShapeElement() {
    // Mercy Logic: Check how full the board is
    const occupiedCount = grid.flat().filter(x => x !== 0).length;
    const isCrowded = occupiedCount > 30; // If more than 30 blocks filled
    
    let shapeData;
    
    if (isCrowded && Math.random() > 0.4) {
        // 60% chance to give a small helpful block if crowded
        const helpfulIndices = [0, 1, 2, 5]; // 1x1, 2x1, 2x2
        const idx = helpfulIndices[Math.floor(Math.random() * helpfulIndices.length)];
        shapeData = SHAPE_TYPES[idx];
    } else {
        // Random selection
        shapeData = SHAPE_TYPES[Math.floor(Math.random() * SHAPE_TYPES.length)];
    }

    const shapeWrapper = document.createElement('div');
    shapeWrapper.classList.add('shape-option');
    shapeWrapper.style.gridTemplateColumns = `repeat(${shapeData.matrix[0].length}, 25px)`; // Tight grid
    
    shapeWrapper.dataset.matrix = JSON.stringify(shapeData.matrix);
    shapeWrapper.dataset.color = shapeData.color;

    shapeData.matrix.forEach(row => {
        row.forEach(cellVal => {
            const miniCell = document.createElement('div');
            if (cellVal === 1) {
                miniCell.classList.add('mini-cell');
                miniCell.style.backgroundColor = shapeData.color;
            } else {
                 // Empty div for spacing, but invisible
                 miniCell.style.width = '25px';
                 miniCell.style.height = '25px';
            }
            shapeWrapper.appendChild(miniCell);
        });
    });

    // Listeners
    shapeWrapper.addEventListener('touchstart', handleTouchStart, {passive: false});
    shapeWrapper.addEventListener('mousedown', handleMouseDown);
    
    shapesContainer.appendChild(shapeWrapper);
}

// --- 3. IMPROVED DRAG & DROP ---
let draggedElement = null;
let mirrorElement = null;
let currentShapeMatrix = null;
let currentColor = null;

function handleTouchStart(e) {
    e.preventDefault(); 
    startDrag(e.touches[0], e.currentTarget);
}

function handleMouseDown(e) {
    startDrag(e, e.currentTarget);
}

function startDrag(event, originalElement) {
    if(originalElement.style.opacity === '0') return; // Don't drag already used shapes

    draggedElement = originalElement;
    currentShapeMatrix = JSON.parse(draggedElement.dataset.matrix);
    currentColor = draggedElement.dataset.color;

    mirrorElement = originalElement.cloneNode(true);
    mirrorElement.classList.add('draggable-mirror');
    mirrorElement.style.width = originalElement.offsetWidth + 'px';
    document.body.appendChild(mirrorElement);

    moveMirror(event); // Position immediately

    document.addEventListener('touchmove', handleTouchMove, {passive: false});
    document.addEventListener('touchend', handleTouchEnd);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
}

function handleTouchMove(e) { e.preventDefault(); moveMirror(e.touches[0]); }
function handleMouseMove(e) { moveMirror(e); }

function moveMirror(coords) {
    if (!mirrorElement) return;
    // Offset by 70px upwards so user's finger doesn't hide the block
    mirrorElement.style.left = (coords.clientX - mirrorElement.offsetWidth / 2) + 'px';
    mirrorElement.style.top = (coords.clientY - mirrorElement.offsetHeight / 2 - 70) + 'px';
}

function handleTouchEnd(e) {
    const touch = e.changedTouches[0];
    dropShape(touch.clientX, touch.clientY - 70); // Account for the offset
    cleanupDrag();
}

function handleMouseUp(e) {
    dropShape(e.clientX, e.clientY - 70); // Account for the offset
    cleanupDrag();
}

function cleanupDrag() {
    if (mirrorElement) mirrorElement.remove();
    mirrorElement = null;
    document.removeEventListener('touchmove', handleTouchMove);
    document.removeEventListener('touchend', handleTouchEnd);
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
}

function dropShape(x, y) {
    // Hide mirror momentarily to find element below
    if(mirrorElement) mirrorElement.style.display = 'none';
    const elementBelow = document.elementFromPoint(x, y);
    if(mirrorElement) mirrorElement.style.display = 'block';

    const cell = elementBelow ? elementBelow.closest('.cell') : null;
    
    if (cell) {
        const r = parseInt(cell.dataset.row);
        const c = parseInt(cell.dataset.col);
        
        // Calculate offsets to center the drop
        const rowOffset = Math.floor(currentShapeMatrix.length / 2);
        const colOffset = Math.floor(currentShapeMatrix[0].length / 2);
        
        attemptPlace(r - rowOffset, c - colOffset);
    }
}

function attemptPlace(row, col) {
    if (canPlace(row, col, currentShapeMatrix)) {
        // Place logic
        for (let r = 0; r < currentShapeMatrix.length; r++) {
            for (let c = 0; c < currentShapeMatrix[0].length; c++) {
                if (currentShapeMatrix[r][c] === 1) {
                    grid[row + r][col + c] = currentColor;
                }
            }
        }
        
        // Visual cleanup
        draggedElement.style.visibility = 'hidden';
        draggedElement.style.pointerEvents = 'none'; // Prevent re-drag
        
        renderGrid();
        checkLines();
        
        // Check refill or game over
        const allHidden = Array.from(shapesContainer.children).every(el => el.style.visibility === 'hidden');
        if (allHidden) {
            generateNewShapes();
        } else {
            checkGameOver();
        }
    }
}

function canPlace(row, col, shape) {
    for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[0].length; c++) {
            if (shape[r][c] === 1) {
                if (row + r < 0 || row + r >= gridSize || col + c < 0 || col + c >= gridSize) return false;
                if (grid[row + r][col + c] !== 0) return false;
            }
        }
    }
    return true;
}

function checkLines() {
    let linesCleared = 0;
    
    // Check rows
    for (let r = 0; r < gridSize; r++) {
        if (grid[r].every(val => val !== 0)) {
            grid[r].fill(0);
            linesCleared++;
        }
    }
    // Check cols
    for (let c = 0; c < gridSize; c++) {
        let colFull = true;
        for (let r = 0; r < gridSize; r++) if (grid[r][c] === 0) colFull = false;
        if (colFull) {
            for (let r = 0; r < gridSize; r++) grid[r][c] = 0;
            linesCleared++;
        }
    }

    if (linesCleared > 0) {
        score += linesCleared * 100 * linesCleared; // Bonus for multi-line
        scoreElement.innerText = score;
        renderGrid();
    }
}

function checkGameOver() {
    const shapesInHand = Array.from(shapesContainer.children).filter(el => el.style.visibility !== 'hidden');
    
    let canMove = false;
    for (let el of shapesInHand) {
        const matrix = JSON.parse(el.dataset.matrix);
        for (let r = 0; r < gridSize; r++) {
            for (let c = 0; c < gridSize; c++) {
                if (canPlace(r, c, matrix)) {
                    canMove = true;
                    break;
                }
            }
        }
        if(canMove) break;
    }

    if (!canMove && shapesInHand.length > 0) {
        finalScore.innerText = score;
        modal.classList.remove('hidden');
    }
}

function restartGame() {
    initGame();
}

initGame();
