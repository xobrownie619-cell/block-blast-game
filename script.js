const gridElement = document.getElementById('game-grid');
const shapesContainer = document.getElementById('shapes-container');
const scoreElement = document.getElementById('score');
const modal = document.getElementById('game-over-modal');
const finalScore = document.getElementById('final-score');

let grid = [];
let score = 0;
const gridSize = 8;

// Colors for different shapes
const COLORS = [
    '#ff3f34', '#0fb9b1', '#f7b731', '#a55eea', '#2bcbba'
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
                cell.style.backgroundColor = grid[r][c]; // Use the stored color
            }
            gridElement.appendChild(cell);
        }
    }
}

const shapes = [
    [[1, 1, 1]], 
    [[1], [1], [1]], 
    [[1, 1], [1, 1]], 
    [[1, 1], [1, 0]],
    [[1, 1, 1], [0, 1, 0]], // T shape
    [[1]]
];

function generateNewShapes() {
    shapesContainer.innerHTML = '';
    for (let i = 0; i < 3; i++) {
        createShapeElement();
    }
}

function createShapeElement() {
    const shapeIdx = Math.floor(Math.random() * shapes.length);
    const shapeMatrix = shapes[shapeIdx];
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];

    const shapeWrapper = document.createElement('div');
    shapeWrapper.classList.add('shape-option');
    shapeWrapper.style.gridTemplateColumns = `repeat(${shapeMatrix[0].length}, 20px)`;
    
    // Store data for drag logic
    shapeWrapper.dataset.matrix = JSON.stringify(shapeMatrix);
    shapeWrapper.dataset.color = color;

    shapeMatrix.forEach(row => {
        row.forEach(cellVal => {
            const miniCell = document.createElement('div');
            if (cellVal === 1) {
                miniCell.classList.add('mini-cell');
                miniCell.style.backgroundColor = color;
            }
            shapeWrapper.appendChild(miniCell);
        });
    });

    // Add Touch/Mouse Listeners for Dragging
    shapeWrapper.addEventListener('touchstart', handleTouchStart, {passive: false});
    shapeWrapper.addEventListener('mousedown', handleMouseDown);
    
    shapesContainer.appendChild(shapeWrapper);
}

// --- DRAG AND DROP LOGIC ---

let draggedElement = null;
let mirrorElement = null; // The visual copy moving with finger
let currentShapeMatrix = null;
let currentColor = null;

function handleTouchStart(e) {
    e.preventDefault(); // Stop scrolling
    startDrag(e.touches[0], e.currentTarget);
}

function handleMouseDown(e) {
    startDrag(e, e.currentTarget);
}

function startDrag(event, originalElement) {
    draggedElement = originalElement;
    currentShapeMatrix = JSON.parse(draggedElement.dataset.matrix);
    currentColor = draggedElement.dataset.color;

    // Create a clone to follow the finger
    mirrorElement = originalElement.cloneNode(true);
    mirrorElement.classList.add('draggable-mirror');
    mirrorElement.style.width = originalElement.offsetWidth + 'px';
    document.body.appendChild(mirrorElement);

    moveMirror(event);

    document.addEventListener('touchmove', handleTouchMove, {passive: false});
    document.addEventListener('touchend', handleTouchEnd);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
}

function handleTouchMove(e) {
    e.preventDefault();
    moveMirror(e.touches[0]);
}

function handleMouseMove(e) {
    moveMirror(e);
}

function moveMirror(coords) {
    if (!mirrorElement) return;
    // Center the shape under finger
    mirrorElement.style.left = (coords.clientX - mirrorElement.offsetWidth / 2) + 'px';
    mirrorElement.style.top = (coords.clientY - mirrorElement.offsetHeight / 2) + 'px';
}

function handleTouchEnd(e) {
    const touch = e.changedTouches[0];
    dropShape(touch.clientX, touch.clientY);
    cleanupDrag();
}

function handleMouseUp(e) {
    dropShape(e.clientX, e.clientY);
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
    // Hide mirror to see what's underneath
    mirrorElement.style.display = 'none';
    const elementBelow = document.elementFromPoint(x, y);
    
    // Check if we dropped on a grid cell
    const cell = elementBelow ? elementBelow.closest('.cell') : null;
    
    if (cell) {
        const r = parseInt(cell.dataset.row);
        const c = parseInt(cell.dataset.col);
        
        // We need to adjust placement because user drags by center, 
        // but grid logic starts at top-left.
        // Simple fix: Try to center the shape around the dropped cell.
        const rowOffset = Math.floor(currentShapeMatrix.length / 2);
        const colOffset = Math.floor(currentShapeMatrix[0].length / 2);

        attemptPlace(r - rowOffset, c - colOffset);
    }
}

function attemptPlace(row, col) {
    if (canPlace(row, col, currentShapeMatrix)) {
        // Place it
        for (let r = 0; r < currentShapeMatrix.length; r++) {
            for (let c = 0; c < currentShapeMatrix[0].length; c++) {
                if (currentShapeMatrix[r][c] === 1) {
                    grid[row + r][col + c] = currentColor;
                }
            }
        }
        
        draggedElement.remove(); // Remove from hand
        renderGrid();
        checkLines();
        
        if (shapesContainer.children.length === 0) {
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
                if (row + r < 0 || row + r >= 8 || col + c < 0 || col + c >= 8) return false;
                if (grid[row + r][col + c] !== 0) return false;
            }
        }
    }
    return true;
}

function checkLines() {
    let linesCleared = 0;
    
    // Rows
    for (let r = 0; r < 8; r++) {
        if (grid[r].every(val => val !== 0)) {
            grid[r].fill(0);
            linesCleared++;
        }
    }
    // Columns
    for (let c = 0; c < 8; c++) {
        let colFull = true;
        for (let r = 0; r < 8; r++) if (grid[r][c] === 0) colFull = false;
        if (colFull) {
            for (let r = 0; r < 8; r++) grid[r][c] = 0;
            linesCleared++;
        }
    }

    if (linesCleared > 0) {
        score += linesCleared * 100;
        scoreElement.innerText = score;
        renderGrid(); // Re-render to show cleared lines
    }
}

function checkGameOver() {
    // Check if ANY shape in hand can fit ANYWHERE
    const shapesInHand = Array.from(shapesContainer.children);
    let canMove = false;

    for (let el of shapesInHand) {
        const matrix = JSON.parse(el.dataset.matrix);
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                if (canPlace(r, c, matrix)) {
                    canMove = true;
                    break;
                }
            }
        }
    }

    if (!canMove) {
        finalScore.innerText = score;
        modal.classList.remove('hidden');
    }
}

function restartGame() {
    initGame();
}

initGame();
