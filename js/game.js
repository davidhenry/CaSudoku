/************************************************
*  The MIT License
*
*  Copyright (c) 2012 by David Henry get@dh.io
*
*  Permission is hereby granted, free of charge, to any person obtaining
*  a copy of this software and associated documentation files (the
*  "Software"), to deal in the Software without restriction, including
*  without limitation the rights to use, copy, modify, merge, publish,
*  distribute, sublicense, and/or sell copies of the Software, and to
*  permit persons to whom the Software is furnished to do so, subject to
*  the following conditions:
*
*  The above copyright notice and this permission notice shall be
*  included in all copies or substantial portions of the Software.
*
*  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
*  EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
*  MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
*  NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS
*  BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
*  ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
*  CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
*  SOFTWARE.
*
*************************************************/

$(document).ready(function () {
	// Store game in global variable
	var CASUDOKU = CASUDOKU || {};

	CASUDOKU.namespace = function (ns_string) {
		var parts = ns_string.split("."),
		parent = CASUDOKU,
		i;

		// strip redundant leading global
		if (parts[0] === "CASUDOKU") {
			parts = parts.slice(1);
		}

		for (i = 0; i < parts.length; i += 1) {
			// create a property if it doesn't exist
			if (typeof parent[parts[i]] === "undefined") {
				parent[parts[i]] = {};
			}
			parent = parent[parts[i]];
		}
		return parent;
	};

	// Namespaces
	CASUDOKU.namespace("game");
	CASUDOKU.namespace("timer");
	CASUDOKU.namespace("board");
	CASUDOKU.namespace("puzzle");
	CASUDOKU.namespace("validator");

	CASUDOKU.game = (function() {
		// Controls the state of the game

		// Game UI
		var	uiStats     = $("#gameStats"),
			uiComplete  = $("#gameComplete"),
			uiNewGame   = $("#gameNew"),
			gamePadKeys = $("#gameKeypad li a");

		// GameKeypad Events
		gamePadKeys.click( function(e) {
			e.preventDefault();

			// Parse keycode value
			var number = parseInt($(this).text(), 10);

			if (!number) {
				CASUDOKU.board.update_cell(0);
			}
			else {
				CASUDOKU.board.update_cell(number);
			}
		});

		start = function() {
			uiComplete.hide();
			uiStats.show();
			CASUDOKU.timer.start();
			CASUDOKU.board.new_puzzle();
		};

		over = function() {
			CASUDOKU.timer.stop();
			uiStats.hide();
			uiComplete.show();
		};

		uiNewGame.click(function(e) {
			e.preventDefault();
			CASUDOKU.game.start();
		});

		// Public api
		return {
			start: start,
			over: over
		};
	}());

	CASUDOKU.timer = (function() {
		var timeout,
			seconds    = 0,
			minutes    = 0,
			secCounter = $(".secCounter"),
			minCounter = $(".minCounter");

		start = function() {
			if (seconds === 0 && minutes === 0) {
				timer();
			}
			else {
				stop();
				seconds = 0;
				minutes = 0;
				minCounter.html(0);
				timer();
			}
		};

		stop = function() {
			clearTimeout(timeout);
		};

		timer = function() {
			timeout = setTimeout(timer, 1000);

			if (seconds === 59) {
				minCounter.html(++minutes);
				seconds = 0;
			}

			secCounter.html(seconds++);
		};

		// Public api
		return {
			start: start,
			stop: stop
		};
	}());

	CASUDOKU.board = (function() {
		// Stores the cells that make up the Sudoku board
		var grid = [],

		// Canvas settings
			canvas       = $("#gameCanvas"),
			context      = canvas.get(0).getContext("2d"),
			canvasWidth  = canvas.width(),
			canvasHeight = canvas.height(),

		// Board Settings
			numRows = 9, numCols = 9,
			regionWidth = canvasWidth/3,
			regionHeight = canvasHeight/3,

		// Cell Settings
			cellWidth = canvasWidth/numCols,
			cellHeight = canvasHeight/numRows,
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
		// End Var

		// Keyboard & Mouse Events
		canvas.click(function (e) {
			// Calculate position of mouse click and update selected cell

			var xAxis,
				yAxis,
				canvasOffset = canvas.offset(),
				cellIndex,
				resultsX = [],
				resultsY = [];

			if (e.pageX !== undefined && e.pageY !== undefined) {
				xAxis = e.pageX;
				yAxis = e.pageY;
			}
			else {
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
			for (var i = 0; i < numCells; i+= 1) {
				if (grid[i].col === xAxis && grid[i].row === yAxis) {
					selectedCellIndex = i;
					refresh_board();
				}
			}
		});

		$(window).keypress(function (e) {
			if (e.which >= keycode.zero && e.which <= keycode.nine) {
				// Subtract 48 to get actual number
				update_cell(e.which - 48);
			}
		});

		$(window).keydown(function (e) {
			// Arrow Key events for changing the selected cell

			var pressed = e.which,
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
			var	clues = 24,
				puzzle;

			// use web workers to make puzzle if available
			if (Modernizr.webworkers) {
				var workerSudokuSolver = new Worker("js/sudoku-solver.js");

				// Debugging
				workerSudokuSolver.onerror = function(e){
					console.log(e.message + " (" + e.filename + ":" + e.lineno + ")");
				};

				workerSudokuSolver.postMessage(clues);

				workerSudokuSolver.onmessage = function(e) {
					puzzle = e.data;
					make_grid(puzzle);
				};
			}
			else {
				puzzle = CASUDOKU.puzzle.make(clues);
				make_grid(puzzle);
			}
		};

		make_grid = function(puzzle) {
			// Makes a grid array filled with cell instances. Each cell stores
			// one puzzle value

			var colCounter = 0,
				rowCounter = 0;

			// Cell class
			Cell = function() {

				// set fixed puzzle values
				this.isDefault = true;

				this.value = 0;

				// Store position on the canvas
				this.x = 0;
				this.y = 0;

				this.col = 0;
				this.row = 0;
			};

			for (var i = 0; i < puzzle.length; i++) {
				grid[i] = new Cell();
				grid[i].value = puzzle[i];

				if (puzzle[i] === 0) {
					grid[i].isDefault = false;
				}

				//Set cell column and row
				grid[i].col = colCounter;
				grid[i].row = rowCounter;
				colCounter++;

				// change row
				if ((i+1) % 9 === 0) {
					rowCounter++;
					colCounter = 0;
				}
			}
			refresh_board();
		};

		refresh_board = function () {

			if (Modernizr.webworkers) {
				var workerSudokuValidator = new Worker("js/sudoku-validator.js");

				// Debugging
				workerSudokuValidator.onerror = function(e){
					console.log(e.message + " (" + e.filename + ":" + e.lineno + ")");
				};

				workerSudokuValidator.postMessage(grid);

				workerSudokuValidator.onmessage = function(e) {
					var correct = e.data;

					if (correct) {
						CASUDOKU.game.over();
					}
					draw();
				};
			}
			else {
				var solutionValid = CASUDOKU.validator.check(grid);
				if (solutionValid) {
					CASUDOKU.game.over();
				}
				draw();
			}
		};

		draw = function () {
			// renders the canvas

			var regionPosX = 0, regionPosY = 0,
				cellPosX = 0, cellPosY = 0,
				textPosX = cellWidth * 0.4, textPosY = cellHeight * 0.65;

			// board outline
			context.clearRect(0, 0, canvasWidth, canvasHeight);
			context.strokeRect(0 , 0, canvasWidth, canvasHeight);
			context.globalCompositeOperation = "destination-over";
			context.lineWidth = 10;

			// regions
			for (var x = 0; x < numRows; x++) {
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
			for (var z = 0; z <= canvasWidth; z += cellWidth) {
				context.moveTo(0.5 + z, 0);
				context.lineTo(0.5 + z, canvasWidth);
			}

			// horizontal lines
			for (var y = 0; y <= canvasHeight; y += cellHeight) {
				context.moveTo(0, 0.5 + y);
				context.lineTo(canvasHeight, 0.5 +  y);
			}

			// cell outline
			context.lineWidth = 2;
			context.strokeStyle = "black";
			context.stroke();

			for (var i = 0; i < numCells; i++) {
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
				if ((i+1) % numRows === 0) {
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
			new_puzzle:new_puzzle,
			update_cell:update_cell
		};
	}());

	CASUDOKU.puzzle = (function() {

		function sudoku_solver() {
			/* The MIT License

			   Copyright (c) 2011 by Attractive Chaos <attractor@live.co.uk>
				http://attractivechaos.github.com/plb/kudoku.js

			   Permission is hereby granted, free of charge, to any person obtaining
			   a copy of this software and associated documentation files (the
			   "Software"), to deal in the Software without restriction, including
			   without limitation the rights to use, copy, modify, merge, publish,
			   distribute, sublicense, and/or sell copies of the Software, and to
			   permit persons to whom the Software is furnished to do so, subject to
			   the following conditions:

			   The above copyright notice and this permission notice shall be
			   included in all copies or substantial portions of the Software.

			   THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
			   EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
			   MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
			   NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS
			   BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
			   ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
			   CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
			   SOFTWARE.
			*/
			var C = [], R = []
			{ // generate the sparse representation of the binary matrix
				var i, j, r, c, c2
				for (i = r = 0; i < 9; ++i) // generate c[729][4]
					for (j = 0; j < 9; ++j)
						for (k = 0; k < 9; ++k)
							// the 4 numbers correspond to row-col, box-num, row-num and col-num constraints
							C[r++] = [ 9 * i + j, (Math.floor(i/3)*3 + Math.floor(j/3)) * 9 + k + 81, 9 * i + k + 162, 9 * j + k + 243 ]
				for (c = 0; c < 324; ++c) R[c] = []
				for (r = 0; r < 729; ++r) // generate r[][] from c[][]
					for (c2 = 0; c2 < 4; ++c2)
						R[C[r][c2]].push(r)
			}

			// update the state vectors when we pick up choice r; v=1 for setting choice; v=-1 for reverting
			function sd_update(sr, sc, r, v) {
				var min = 10, min_c = 0;
				for (var c2 = 0; c2 < 4; ++c2) sc[C[r][c2]] += v<<7;
				for (var c2 = 0; c2 < 4; ++c2) { // update # available choices
					var r2, rr, cc2, c = C[r][c2];
					if (v > 0) { // move forward
						for (r2 = 0; r2 < 9; ++r2) {
							if (sr[rr = R[c][r2]]++ != 0) continue; // update the row status
							for (cc2 = 0; cc2 < 4; ++cc2) {
								var cc = C[rr][cc2];
								if (--sc[cc] < min) // update # allowed choices
									min = sc[cc], min_c = cc; // register the minimum number
							}
						}
					} else { // revert
						for (r2 = 0; r2 < 9; ++r2) {
							if (--sr[rr = R[c][r2]] != 0) continue; // update the row status
							var p = C[rr]
							++sc[p[0]]; ++sc[p[1]]; ++sc[p[2]]; ++sc[p[3]]; // update the count array
						}
					}
				}
				return min<<16 | min_c // return the col that has been modified and with the minimal available choices
			}

			// solve a Sudoku; _s is the standard dot/number representation; max_ret sets the maximum number of returned solutions
			return function(_s, max_ret) {
				var r, c, r2, min, cand, dir, hints = 0; // dir=1: forward; dir=-1: backtrack
				// sr[r]: # times the row is forbidden by others; cr[i]: row chosen at step i
				// sc[c]: bit 1-7 - # allowed choices; bit 8: the constraint has been used or not
				// cc[i]: col chosen at step i
				var sr = [], sc = [], cr = [], cc = [], out = [], ret = [];
				if (max_ret == null) max_ret = 1;
				for (r = 0; r < 729; ++r) sr[r] = 0; // no row is forbidden
				for (c = 0; c < 324; ++c) sc[c] = 9; // 9 allowed choices; no constraint has been used
				for (var i = 0; i < 81; ++i) {
					var a = _s.charAt(i) >= '1' && _s.charAt(i) <= '9'? _s.charCodeAt(i) - 49 : -1; // number from -1 to 8
					if (a >= 0) sd_update(sr, sc, i * 9 + a, 1); // set the choice
					if (a >= 0) ++hints; // count the number of hints
					cr[i] = cc[i] = -1, out[i] = a + 1;
				}
				for (var i = 0, dir = 1, cand = 10<<16|0;;) {
					while (i >= 0 && i < 81 - hints) { // at most 81-hints steps
						if (dir == 1) {
							min = cand>>16, cc[i] = cand&0xffff
							if (min > 1) {
								for (c = 0; c < 324; ++c) {
									if (sc[c] < min) {
										min = sc[c], cc[i] = c; // choose the top constraint
										if (min <= 1) break; // this is for acceleration; slower without this line
									}
								}
							}
							if (min == 0 || min == 10) cr[i--] = dir = -1; // backtrack
						}
						c = cc[i];
						if (dir == -1 && cr[i] >= 0) sd_update(sr, sc, R[c][cr[i]], -1); // revert the choice
						for (r2 = cr[i] + 1; r2 < 9; ++r2) // search for the choice to make
							if (sr[R[c][r2]] == 0) break; // found if the state equals 0
						if (r2 < 9) {
							cand = sd_update(sr, sc, R[c][r2], 1); // set the choice
							cr[i++] = r2; dir = 1; // moving forward
						} else cr[i--] = dir = -1; // backtrack
					}
					if (i < 0) break;
					var y = []
					for (var j = 0; j < 81; ++j) y[j] = out[j]
					for (var j = 0; j < i; ++j) r = R[cc[j]][cr[j]], y[Math.floor(r/9)] = r%9 + 1; // the solution array (81 numbers)
					ret.push(y)
					if (ret.length >= max_ret) return ret;
					--i; dir = -1; // backtrack
				}
				return ret[0];
			};
		}

		make_seed = function () {
			// Generates a minimal sudoku puzzle with the numbers from 1 to 9 randomly
			// assigned to an array. This is then solved by sudoku_solver to
			// create a solved puzzle.

			var range = make_range(true, 81),
				seed = make_range(false, 81),
				solver = sudoku_solver(),
				solved;

			// Store numbers 1 - 9 in a random index
			for (var x = 1; x < 10; x++) {
				seed[range.splice(Math.random()*range.length,1)] = x;
			}

			solved = solver(seed.join(), 1);

			return solved[0];
		};

		make_puzzle = function (clues) {
			var newPuzzle =  make_seed(),
				range = make_range(true, 81),
				randomNum = 0;

			// zero out random indexes to create puzzle
			for (var x = 0; x < (81 - clues); x++) {
				randomNum = range.splice(Math.random()*range.length,1);
				newPuzzle[randomNum] = 0;
			}

			return newPuzzle;
		};

		make_range = function (sequential, size) {
			// returns an array filled with periods or sequential numbers up to the
			// specified size

			var range = [];

			for (var i = 0; i < size; i += 1) {
				if (sequential) {
					range[i] = i;
				}
				else {
					range[i] = ".";
				}
			}

			return range;
		};

		return {make: make_puzzle};
	}());

	CASUDOKU.validator = (function() {

		check = function(grid) {
			var isCorrect = false,
				solution = [];

			for (var i = 0; i < grid.length; i += 1) {
				if (grid[i].value !== 0) {
					solution.push(grid[i].value);
				}
			}
			if (solution.length === 81 && check_total(solution, 405)) {
				if (correct_rows(solution)){
					if (correct_cols(solution)) {
						if (correct_regions(solution)) {
							isCorrect = true;
						}
					}
				}
			}

			// Delete solution
			solution.splice(0, 81);

			return isCorrect;
		};

		correct_rows = function(solution) {
			// checks each row, returns true if all rows are correct

			var correctRows = 0,
				begin = 0,
				end = 9;

			// Slices the solution array into rows
			for (var i = 0; i < 9; i += 1) {
				// passes the current row as an argument
				correctRows += check_unique(solution.slice(begin, end));

				begin += 9;
				end += 9;
			}

			return (correctRows === 9) ? true : false;
		};

		correct_cols = function(solution) {
			// checks each column, returns true if all columns are correct

			var correctCols = 0,
				colVal,
				colNum = 0,
				currentCol = [];

			// slices the solution array into columns
			for (var i = 0; i < 9; i += 1) {
				colVal = colNum;
				for (var x = 0; x < 9; x += 1) {
					currentCol[x] = solution[colVal];

					// add next item in the column
					colVal += 9;
				}
				correctCols += check_unique(currentCol);

				// move to the next column
				colNum += 1;
			}

			return (correctCols === 9) ? true : false;
		};

		correct_regions = function(solution) {
			// checks each region, returns true if all regions are correct

			var correctRegions = 0,
				regionVal = 0,
				regionStart = 0,
				currentRegion = "";

			// Slices the solution array into regions
			for (var z = 0; z < 9; z += 1 ) {
				currentRegion = "";
				regionVal = regionStart;
				for (var r = 1; r < 10; r += 1) {
					currentRegion += solution[regionVal];

					// Change row within the region
					if ( r % 3 === 0) {
						regionVal += 6;
					}
					regionVal += 1;
				}
				correctRegions += check_unique(currentRegion);

				// move to next region
				if ((z +1) % 3 === 0) {
					regionStart += 21;
				}
				else {
					regionStart += 3;
				}
			}

			return (correctRegions === 9) ? true : false;
		};

		check_total = function(numbers, total) {
			var sum = 0;

			for (var i = 0; i < numbers.length; i += 1) {
				sum += numbers[i];
			}

			return (sum === total) ? true : false;
		};

		check_unique = function(array) {
			// returns 1 if each number in an array is unique, 0 if not

			var hash = {},
				result = [];

			for ( var i = 0; i < array.length; ++i ) {
				// only add elements from array that don't exist in the hash object
				if (!hash.hasOwnProperty(array[i]) ) {
					hash[array[i]] = true;

					// store all unique values in new array
					result.push(array[i]);
				}
			}

			return (result.length === array.length) ? 1 : 0;
		};

		// Public api
		return {check:check};
	}());

	CASUDOKU.game.start();
});




