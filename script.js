const gridElement = document.getElementById('game-grid');
const shapesContainer = document.getElementById('shapes-container');
const scoreElement = document.getElementById('score');

let grid = []; // The 8x8 logical grid
let score = 0;
let selectedShape = null; // The shape currently waiting to be placed
let selectedShapeIndex = null; // Which of the 3 slots did it come from?

// 1. Initialize the Game
function initGame() {
    grid = Array(8).fill(null).map(() => Array(8).fill(0));
    score = 0;
    scoreElement.innerText = score;
    renderGrid();
    generateNewShapes();
}

// 2. Draw the 8x8 Grid on screen
function renderGrid() {
    gridElement.innerHTML = '';
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            if (grid[r][c] === 1) {
                cell.classList.add('taken');
            }
            // Add click listener to PLACE the shape
            cell.onclick = () => placeShapeOnGrid(r, c);
            gridElement.appendChild(cell);
        }
    }
}

// 3. Define Shapes (Like Tetris pieces)
const shapes = [
    [[1, 1, 1]],             // Line of 3
    [[1], [1], [1]],         // Vertical line of 3
    [[1, 1], [1, 1]],        // 2x2 Square
    [[1, 1], [1, 0]],        // L-shape
    [[1]]                    // Single dot
];

let currentHand = []; // The 3 shapes currently available to play

function generateNewShapes() {
    shapesContainer.innerHTML = '';
    currentHand = [];
    
    // Create 3 random shapes
    for (let i = 0; i < 3; i++) {
        const randomShape = shapes[Math.floor(Math.random() * shapes.length)];
        currentHand.push(randomShape);
        
        // Create the visual representation for the user to click
        const shapeWrapper = document.createElement('div');
        shapeWrapper.classList.add('shape-option');
        shapeWrapper.style.gridTemplateColumns = `repeat(${randomShape[0].length}, 20px)`;
        
        // Draw the mini-shape
        randomShape.forEach(row => {
            row.forEach(cell => {
                const miniCell = document.createElement('div');
                if (cell === 1) miniCell.classList.add('mini-cell');
                shapeWrapper.appendChild(miniCell);
            });
        });

        // Click to SELECT this shape
        shapeWrapper.onclick = () => selectShape(randomShape, i, shapeWrapper);
        shapesContainer.appendChild(shapeWrapper);
    }
}

function selectShape(shape, index, element) {
    // Remove 'selected' style from all others
    document.querySelectorAll('.shape-option').forEach(el => el.classList.remove('selected'));
    
    // Highlight this one
    element.classList.add('selected');
    selectedShape = shape;
    selectedShapeIndex = index;
}

// 4. Logic to Place the Shape
function placeShapeOnGrid(row, col) {
    if (!selectedShape) return; // No shape selected

    // Check if it fits
    if (canPlace(row, col, selectedShape)) {
        // Update the grid logic
        for (let r = 0; r < selectedShape.length; r++) {
            for (let c = 0; c < selectedShape[0].length; c++) {
                if (selectedShape[r][c] === 1) {
                    grid[row + r][col + c] = 1;
                }
            }
        }

        // Remove shape from the "hand" (UI)
        const allShapes = shapesContainer.children;
        allShapes[selectedShapeIndex].style.visibility = 'hidden'; // Hide it
        allShapes[selectedShapeIndex].onclick = null; // Disable clicking
        
        // Reset selection
        selectedShape = null;
        selectedShapeIndex = null;

        // Re-draw grid with new block
        renderGrid();
        
        // Check for cleared lines
        checkLines();

        // Check if hand is empty, then refill
        if (Array.from(allShapes).every(s => s.style.visibility === 'hidden')) {
            generateNewShapes();
        }
    }
}

// Helper: Check if shape fits at (row, col)
function canPlace(row, col, shape) {
    for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[0].length; c++) {
            if (shape[r][c] === 1) {
                // Check bounds (is it outside the 8x8 grid?)
                if (row + r >= 8 || col + c >= 8) return false;
                // Check overlap (is there already a block there?)
                if (grid[row + r][col + c] === 1) return false;
            }
        }
    }
    return true;
}

// 5. Check and Clear Lines
function checkLines() {
    let linesCleared = 0;

    // Check Rows
    for (let r = 0; r < 8; r++) {
        if (grid[r].every(cell => cell === 1)) {
            grid[r].fill(0); // Clear logic
            linesCleared++;
        }
    }

    // Check Columns
    for (let c = 0; c < 8; c++) {
        let colFull = true;
        for (let r = 0; r < 8; r++) {
            if (grid[r][c] === 0) colFull = false;
        }
        if (colFull) {
            for (let r = 0; r < 8; r++) grid[r][c] = 0; // Clear logic
            linesCleared++;
        }
    }

    if (linesCleared > 0) {
        score += linesCleared * 100;
        scoreElement.innerText = score;
        renderGrid(); // Redraw grid after clearing
    }
}

function restartGame() {
    initGame();
}

// Start immediately
initGame();
