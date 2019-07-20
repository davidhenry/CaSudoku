document.addEventListener("DOMContentLoaded", function() { 
	"use_strict";

	// Store game in global variable
	const CASUDOKU = {};

	CASUDOKU.game = (function() {
		// Controls the state of the game

		// Game UI
		let	uiStats     = document.getElementById("gameStats"),
			uiComplete  = document.getElementById("gameComplete"),
			uiNewGame   = document.getElementById("gameNew"),
			gamePadKeys = document.querySelectorAll("#gameKeypad li a");

		// GameKeypad Events
		for (let i = gamePadKeys.length - 1; i >= 0; i--) {
			let key = gamePadKeys[i];

			key.onclick = function(e) {
				e.preventDefault();

				// Parse keycode value
				let number = parseInt(e.currentTarget.innerText, 10);

				if (!number) {
					CASUDOKU.board.update_cell(0);
				} else {
					CASUDOKU.board.update_cell(number);
				}
			}			
		}

		uiNewGame.onclick = function(e) {
			e.preventDefault();

			CASUDOKU.game.start();
		}

		start = function() {
			CASUDOKU.timer.start();
			CASUDOKU.board.new_puzzle();

			uiComplete.style.display = "none";
			uiStats.style.display = "block";
		};

		over = function() {
			CASUDOKU.timer.stop();

			uiComplete.style.display = "block";
			uiStats.style.display = "none";
		};

		// Public api
		return {
			start: start,
			over: over
		};
	}());

	CASUDOKU.timer = (function() {
		let timeout,
			seconds    = 0,
			minutes    = 0,
			secCounter = document.querySelectorAll(".secCounter"),
			minCounter = document.querySelectorAll(".minCounter");

		start = function() {
			if (seconds === 0 && minutes === 0) {
				timer();
			} else {
				stop();
				seconds = 0;
				minutes = 0;
				setText(minCounter, 0);
				timer();
			}
		};

		stop = function() {
			clearTimeout(timeout);
		};

		setText = function(element, time) {
			element.forEach(function(val) {
				val.innerText = time;
			});
		};

		timer = function() {
			timeout = setTimeout(timer, 1000);

			if (seconds === 59) {
				setText(minCounter, ++minutes);
				seconds = 0;
			}

			setText(secCounter, seconds++);
		};

		// Public api
		return {
			start: start,
			stop: stop
		};
	}());

	CASUDOKU.board = (function() {
		// Stores the cells that make up the Sudoku board
		let grid = [],

		// Canvas settings
			canvas       = document.getElementById("gameCanvas"),
			context      = canvas.getContext("2d"),
			canvasWidth  = canvas.offsetWidth,
			canvasHeight = canvas.offsetHeight,

		// Board Settings
			numRows = 9, numCols = 9,
			regionWidth = canvasWidth / 3,
			regionHeight = canvasHeight / 3,

		// Cell Settings
			cellWidth = canvasWidth / numCols,
			cellHeight = canvasHeight / numRows,
			numCells = numRows * numCols,
			selectedCellIndex = 0,

		//Key Codes
			keycode = {
				arrowLeft: 37,
				arrowUp: 38,
				arrowRight: 39,
				arrowDown: 40,
				zero: 48,
				nine: 57
			};
		// End let

		// Keyboard & Mouse Events
		canvas.addEventListener("click", function (e) {
			// Calculate position of mouse click and update selected cell

			let xAxis,
				yAxis,
				canvasOffset = getOffset(),
				cellIndex,
				resultsX = [],
				resultsY = [];

			function getOffset() {
				return {
					left: canvas.getBoundingClientRect().left + window.scrollX,
					top: canvas.getBoundingClientRect().top + window.scrollY
				};
			}

			if (e.pageX !== undefined && e.pageY !== undefined) {
				xAxis = e.pageX;
				yAxis = e.pageY;
			} else {
				xAxis = e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
				yAxis = e.clientY + document.body.scrollTop + document.documentElement.scrollTop;
			}

			xAxis -= canvasOffset.left;
			yAxis -= canvasOffset.top;

			xAxis = Math.min(xAxis, canvasWidth);
			yAxis = Math.min(yAxis, canvasHeight);

			xAxis = Math.floor(xAxis/cellWidth);
			yAxis = Math.floor(yAxis/cellHeight);

			// Matches clicked coordinates to a cell
			for (let i = 0; i < numCells; i+= 1) {
				if (grid[i].col === xAxis && grid[i].row === yAxis) {
					selectedCellIndex = i;
					refresh_board();
				}
			}
		});

		window.addEventListener("keypress", function (e) {
			if (e.which >= keycode.zero && e.which <= keycode.nine) {
				// Subtract 48 to get actual number
				update_cell(e.which - 48);
			}
		});

		window.addEventListener("keydown", function (e) {
			// Arrow Key events for changing the selected cell

			let pressed = e.which,
				col = grid[selectedCellIndex].col,
				row = grid[selectedCellIndex].row;

			if (pressed >= keycode.arrowLeft && pressed <= keycode.arrowDown) {
				if (col < (numCols - 1) && pressed == keycode.arrowRight) {
					selectedCellIndex++;
					refresh_board();
				}

				if (col > 0 && pressed == keycode.arrowLeft) {
					selectedCellIndex--;
					refresh_board();
				}

				if (row < (numRows - 1) && pressed == keycode.arrowDown) {
					selectedCellIndex += numCols;
					refresh_board();
				}

				if (row > 0 && pressed == keycode.arrowUp) {
					selectedCellIndex -= numCols;
					refresh_board();
				}
			}
		});

		new_puzzle = function() {
			let workerSudokuSolver = new Worker("js/sudoku-solver.js"),
				clues = 24,
				puzzle;

			workerSudokuSolver.postMessage(clues);

			workerSudokuSolver.onmessage = function(e) {
				puzzle = e.data;
				make_grid(puzzle);
			};
		};

		make_grid = function(puzzle) {
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
			};

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

		refresh_board = function () {
			let workerSudokuValidator = new Worker("js/sudoku-validator.js");

			workerSudokuValidator.postMessage(grid);

			workerSudokuValidator.onmessage = function(e) {
				let correct = e.data;

				if (correct) {
					CASUDOKU.game.over();
				}

				draw();
			};
		};

		draw = function () {
			// renders the canvas

			let regionPosX = 0, regionPosY = 0,
				cellPosX = 0, cellPosY = 0,
				textPosX = cellWidth * 0.4, textPosY = cellHeight * 0.65;

			// board outline
			context.clearRect(0, 0, canvasWidth, canvasHeight);
			context.strokeRect(0 , 0, canvasWidth, canvasHeight);
			context.globalCompositeOperation = "destination-over";
			context.lineWidth = 10;

			// regions
			for (let x = 0; x < numRows; x++) {
				context.strokeRect(regionPosX, regionPosY, regionWidth, regionHeight);
				regionPosX += regionWidth;

				if (regionPosX == canvasWidth){
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
				context.lineTo(canvasHeight, 0.5 +  y);
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
				}
				else {
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

		update_cell = function (value) {
			if (!grid[selectedCellIndex].isDefault) {
				grid[selectedCellIndex].value = value;
				refresh_board();
			}
		};

		// Public api
		return {
			new_puzzle: new_puzzle,
			update_cell: update_cell
		};
	}());

	CASUDOKU.game.start();
});
