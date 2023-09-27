"use_strict";

const Board = (function () {
  // Stores the cells that make up the Sudoku board
  let grid = [],
    // Canvas settings
    canvas = document.getElementById("gameCanvas"),
    context = canvas.getContext("2d"),
    canvasWidth = canvas.offsetWidth,
    canvasHeight = canvas.offsetHeight,
    // Board Settings
    numRows = 9,
    numCols = 9,
    regionWidth = canvasWidth / 3,
    regionHeight = canvasHeight / 3,
    // Cell Settings
    cellWidth = canvasWidth / numCols,
    cellHeight = canvasHeight / numRows,
    numCells = numRows * numCols,
    selectedCellIndex = 0;
  // End let

  // Keyboard & Mouse Events
  canvas.addEventListener("click", function (event) {
    // Calculate position of mouse click and update selected cell

    let xAxis,
      yAxis,
      canvasOffset = getOffset();

    function getOffset() {
      return {
        left: canvas.getBoundingClientRect().left + window.scrollX,
        top: canvas.getBoundingClientRect().top + window.scrollY,
      };
    }

    if (event.pageX !== undefined && event.pageY !== undefined) {
      xAxis = event.pageX;
      yAxis = event.pageY;
    } else {
      xAxis =
        event.clientX +
        document.body.scrollLeft +
        document.documentElement.scrollLeft;
      yAxis =
        event.clientY +
        document.body.scrollTop +
        document.documentElement.scrollTop;
    }

    xAxis -= canvasOffset.left;
    yAxis -= canvasOffset.top;

    xAxis = Math.min(xAxis, canvasWidth);
    yAxis = Math.min(yAxis, canvasHeight);

    xAxis = Math.floor(xAxis / cellWidth);
    yAxis = Math.floor(yAxis / cellHeight);

    // Matches clicked coordinates to a cell
    for (let i = 0; i < numCells; i += 1) {
      if (grid[i].col === xAxis && grid[i].row === yAxis) {
        selectedCellIndex = i;
        refresh_board();
      }
    }
  });

  window.addEventListener("keypress", function (event) {
    if (event.key >= 1 && event.key <= 9) {
      update_cell(event.key);
    }
  });

  window.addEventListener("keydown", function (event) {
    // Arrow Key events for changing the selected cell

    let pressed = event.key,
      col = grid[selectedCellIndex].col,
      row = grid[selectedCellIndex].row;

    if (col < numCols - 1 && pressed == "ArrowRight") {
      selectedCellIndex++;
      refresh_board();
    }

    if (col > 0 && pressed == "ArrowLeft") {
      selectedCellIndex--;
      refresh_board();
    }

    if (row < numRows - 1 && pressed == "ArrowDown") {
      selectedCellIndex += numCols;
      refresh_board();
    }

    if (row > 0 && pressed == "ArrowUp") {
      selectedCellIndex -= numCols;
      refresh_board();
    }
  });

  const new_puzzle = function () {
    let workerSudokuSolver = new Worker("js/workers/sudoku-solver.js"),
        clues = 24,
        puzzle;

    workerSudokuSolver.postMessage(clues);

    workerSudokuSolver.onmessage = function (event) {
      puzzle = event.data;
      make_grid(puzzle);
    };
  };

  const make_grid = function (puzzle) {
    // Makes a grid array filled with cell instances. Each cell stores
    // one puzzle value

    let colCounter = 0,
      rowCounter = 0;

    class Cell {
      constructor() {
        // set fixed puzzle values
        this.isDefault = true;

        this.value = 0;

        // Store position on the canvas
        this.x = 0;
        this.y = 0;

        this.col = 0;
        this.row = 0;
      }
    }

    for (let i = 0; i < puzzle.length; i++) {
      grid[i] = new Cell();
      grid[i].value = puzzle[i];

      if (puzzle[i] === 0) {
        grid[i].isDefault = false;
      }

      // Set cell column and row
      grid[i].col = colCounter;
      grid[i].row = rowCounter;
      colCounter++;

      // change row
      if ((i + 1) % 9 === 0) {
        rowCounter++;
        colCounter = 0;
      }
    }

    refresh_board();
  };

  const refresh_board = function () {
    let workerSudokuValidator = new Worker("js/workers/sudoku-validator.js");

    workerSudokuValidator.postMessage(grid);

    workerSudokuValidator.onmessage = function (event) {
      let correct = event.data;

      if (correct) {
        CASUDOKU.Game.over();
      }

      draw();
    };
  };

  const draw = function () {
    // renders the canvas

    let regionPosX = 0,
      regionPosY = 0,
      cellPosX = 0,
      cellPosY = 0,
      textPosX = cellWidth * 0.4,
      textPosY = cellHeight * 0.65;

    // board outline
    context.clearRect(0, 0, canvasWidth, canvasHeight);
    context.strokeRect(0, 0, canvasWidth, canvasHeight);
    context.globalCompositeOperation = "destination-over";
    context.lineWidth = 10;

    // regions
    for (let x = 0; x < numRows; x++) {
      context.strokeRect(regionPosX, regionPosY, regionWidth, regionHeight);
      regionPosX += regionWidth;

      if (regionPosX == canvasWidth) {
        regionPosY += regionHeight;
        regionPosX = 0;
      }
    }

    // Start to draw the Grid
    context.beginPath();

    // vertical lines
    for (let z = 0; z <= canvasWidth; z += cellWidth) {
      context.moveTo(0.5 + z, 0);
      context.lineTo(0.5 + z, canvasWidth);
    }

    // horizontal lines
    for (let y = 0; y <= canvasHeight; y += cellHeight) {
      context.moveTo(0, 0.5 + y);
      context.lineTo(canvasHeight, 0.5 + y);
    }

    // cell outline
    context.lineWidth = 2;
    context.strokeStyle = "black";
    context.stroke();

    for (let i = 0; i < numCells; i++) {
      grid[i].x = cellPosX;
      grid[i].y = cellPosY;

      // Cell values
      if (grid[i].isDefault) {
        context.font = "bold 1.6em Droid Sans, sans-serif";
        context.fillStyle = "black";
        context.fillText(grid[i].value, textPosX, textPosY);
      }
      if (grid[i].value !== 0 && !grid[i].isDefault) {
        context.font = "1.4em Droid Sans, sans-serif";
        context.fillStyle = "grey";
        context.fillText(grid[i].value, textPosX, textPosY);
      }

      // Cell background colour
      if (i == selectedCellIndex) {
        context.fillStyle = "#00B4FF";
      } else {
        context.fillStyle = "#EEEEEE";
      }

      // Cell background
      context.fillRect(cellPosX, cellPosY, cellWidth, cellHeight);

      cellPosX += cellWidth;
      textPosX += cellWidth;

      // Change row
      if ((i + 1) % numRows === 0) {
        cellPosX = 0;
        cellPosY += cellHeight;
        textPosY += cellHeight;
        textPosX = cellWidth * 0.4;
      }
    }
  };

  const update_cell = function (value) {
    if (!grid[selectedCellIndex].isDefault) {
      grid[selectedCellIndex].value = value;
      refresh_board();
    }
  };

  // Public api
  return {
    new_puzzle: new_puzzle,
    update_cell: update_cell,
  };
})();

export default Board;
