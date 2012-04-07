/************************************************
   The MIT License

   Copyright (c) 2012 by David Henry d@jh.io

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
*************************************************/

$(document).ready(function() {
	
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
	CASUDOKU.namespace("puzzle");
	CASUDOKU.namespace("board");
	CASUDOKU.namespace("timer");
	CASUDOKU.namespace("validator");
	
	CASUDOKU.game = (function() {
		// Controls the state of the game
		
		// Game UI
		var uiStats = $("#gameStats"),
			uiComplete = $("#gameComplete"),
			uiReset = $("#gameReset");
		
		uiReset.click(function(e) {
			e.preventDefault();
			restart();
		});
		
		start = function() {
			//Generate new puzzle
			var puzzle = CASUDOKU.puzzle();
			
			//Pass new puzzle to the board
			CASUDOKU.board.set_puzzle(puzzle);
			
			CASUDOKU.timer.start();
		};
		
		over = function() {
			CASUDOKU.timer.stop();
			uiStats.hide();
			uiComplete.show();
		};
		
		restart = function() {
			grid = null;
			CASUDOKU.timer.restart();
			CASUDOKU.game.start();
		};
		
		// Public api
		return {
			start: start,
			over: over 
		};
	}());
	
	CASUDOKU.timer = (function() {
		// Reset secCounter and increment 
		// minCounter every minute
		
		var minTimeout,
			secTimeout,
		    seconds = 0,
			minutes = 0,
			secCounter = $(".secCounter"),
			minCounter = $(".minCounter");
		
		// Set initial values
		minCounter.html("0");
		secCounter.html("0");
			
		start = function() {
			min_timer();
			sec_timer();
		},
		
		min_timer = function() {
			minCounter.html(minutes++);
			seconds = 0;
			minTimeout = setTimeout(min_timer, 60000);
		},

		sec_timer = function() {
			secCounter.html(seconds++);
			secTimeout = setTimeout(sec_timer, 1000);
		},
		
		restart = function() {
			clearTimeout(secTimeout);
			seconds = 0;
			secCounter.html(seconds);
			clearTimeout(minTimeout);
			minutes = 0;
			secCounter.html(minutes);
		};
		
		stop = function() {
			clearTimeout(secTimeout);
			clearTimeout(minTimeout);
		};
		
		// Public api
		return {
			start: 	start,
			stop: 	stop,
			restart: restart
		};
	}());
	
	CASUDOKU.board = (function() {
		var grid = [],
		// Canvas settings
			canvas = $("#gameCanvas"),
			context = canvas.get(0).getContext("2d"),
			canvasWidth	 = canvas.width(),
			canvasHeight =	canvas.height(),

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
					arrowLeft	: 	37,
					arrowUp		: 	38,
					arrowRight	: 	39,
					arrowDown	: 	40,

					zero 		: 	48,
					one			: 	49,
					two			: 	50,
					three		: 	51,
					four 		: 	52,
					five		: 	53,
					six			: 	54,
					seven		: 	55,
					eight 		: 	56,
					nine 		: 	57
			};
		// End Var
		
		// UI Events			
		$("#deleteVal").click(function(e) {
			e.preventDefault();
			update_cell(" ");
		});

		$("#enter1").click(function(e) {
			e.preventDefault();
			update_cell("1");
		});

		$("#enter2").click(function(e) {
			e.preventDefault();
			update_cell("2");
		});

		$("#enter3").click(function(e) {
			e.preventDefault();
			update_cell("3");
		});

		$("#enter4").click(function(e) {
			e.preventDefault();
			update_cell("4");
		});

		$("#enter5").click(function(e) {
			e.preventDefault();
			update_cell("5");
		});

		$("#enter6").click(function(e) {
			e.preventDefault();
			update_cell("6");
		});

		$("#enter7").click(function(e) {
			e.preventDefault();
			update_cell("7");
		});

		$("#enter8").click(function(e) {
			e.preventDefault();
			update_cell("8");
		});

		$("#enter9").click(function(e) {
			e.preventDefault();
			update_cell("9");
		});
		
		// Keyboard & Mouse Events
		canvas.click(function (e) {
			// Calculate position of mouse click
			// and update selected cell

			var xAxis,
				yAxis,
				canvasOffset = canvas.offset(),
				cellIndex,
				resultsX = [],
				resultsY = [];

			if (e.pageX != undefined && e.pageY != undefined) {
				xAxis = e.pageX;
				yAxis = e.pageY;
		    }
		 	else {
				xAxis = e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
				yAxis = e.clientY + document.body.scrollTop + document.documentElement.scrollTop;
			}

			xAxis -= canvasOffset.left;
			yAxis -= canvasOffset.top;

			// Returns the smaller of the two numbers
			xAxis = Math.min(xAxis, canvasWidth);
			yAxis = Math.min(yAxis, canvasHeight);

			// Rounds a number down
			xAxis = Math.floor(xAxis/cellWidth);
			yAxis = Math.floor(yAxis/cellHeight);
			
			// Searches for clicked cell
			for (var i = 0; i < numCells; i+= 1) {
				if (grid[i].col === xAxis && grid[i].row === yAxis) {
					selectedCellIndex = i;
					refresh_board();
				};
			};
		});
		
		$(window).keypress(function (e) {
			var enteredChar = e.which;

			if (enteredChar >= keycode.zero && enteredChar <= keycode.nine) {
				switch(enteredChar){
					case keycode.zero:
					update_cell(" ");
					break;

					case keycode.one:
					update_cell("1");
					break;

					case keycode.two:
					update_cell("2");
					break;

					case keycode.three:
					update_cell("3");
					break;

					case keycode.four:
					update_cell("4");
					break;

					case keycode.five:
					update_cell("5");
					break;

					case keycode.six:
					update_cell("6");
					break;

					case keycode.seven:
					update_cell("7");
					break;

					case keycode.eight:
					update_cell("8");
					break;

					case keycode.nine:
					update_cell("9");
					break;
				};
			};
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
		
		set_puzzle = function(newPuzzle) {
			make_grid(newPuzzle);
			refresh_board();
		};
		
		make_grid = function(puzzle) {
			// Makes a grid array filled with
			// cell instances. Each cell stores one
			// puzzle value
			
			var colCounter = 0,
				rowCounter = 0;
			
			// Cell class
			Cell = function() {
				
				// set fixed puzzle values
				this.isDefault = true;
				
				this.value;
				
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
				};

				//Set cell column and row
				grid[i].col = colCounter;
				grid[i].row = rowCounter;
				colCounter++;
				
				// change row
				if ((i+1) % 9 == 0) {
					rowCounter++;
					colCounter = 0;
				};
			};
		};
		
		refresh_board = function () {
			var solutionValid = CASUDOKU.validator.check(grid);
			
			draw();
			
			if (solutionValid) {
				CASUDOKU.game.over();
			};
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
				};		
			};

			// Start to draw the Grid
			context.beginPath();

			// vertical lines 
		    for (var x = 0; x <= canvasWidth; x += cellWidth) {
				context.moveTo(0.5 + x, 0);
				context.lineTo(0.5 + x, canvasWidth);
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
					context.font = "bold 1.6em sans-serif";
					context.fillStyle = "black";
					context.fillText(grid[i].value, textPosX, textPosY);
				}
				if (grid[i].value !== 0 && !grid[i].isDefault1) {
					context.font = "1.4em sans-serif";
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
				if ((i+1) % numRows == 0) {
					cellPosX = 0;
					cellPosY += cellHeight;
					textPosY += cellHeight;
					textPosX = cellWidth * 0.4;
				};		
			};
		};
				
		update_cell = function (value) {
			// updates cell values
			
			if (!grid[selectedCellIndex].isDefault) {
				grid[selectedCellIndex].value = value;
				refresh_board();
			};
		};

		// Public api
		return {
			set_puzzle:set_puzzle
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
				if (max_ret == null) max_ret = 2;
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
				return ret;
			}
		};

		make_seed = function () {
			// Creates a seed for sudoku_solver to solve
			// this is then used to create a new puzzle
			
			var puzzleSeed = [], 
				puzzleSeedSize = [],
				randomIndex = [],
				solver = sudoku_solver(),
				puzzleSeedStr;

			for (var i = 0; i < 81; i++) {
				// Stores periods to mark empty elements for sudoku_solver()
				puzzleSeed[i] = ".";
				
				// Stores numbers 0 to 81 to be randomly picked later
				puzzleSeedSize[i] = i;
			};
			
			for (var x = 0; x < 9; x++) {
				// Pick numbers stored in puzzleSeedSize randomly
				randomIndex[x] = puzzleSeedSize.splice(Math.random()*puzzleSeedSize.length,1);
				
				// Stores numbers 1 - 9 in a random index
				puzzleSeed[randomIndex[x]] = (x + 1);
			};

			puzzleSeedStr = puzzleSeed.join("");
			
			// Generate one correct solution
			solved = solver(puzzleSeedStr, 1);

			return solved[0];
		};

		make_puzzle = function () {
			// Makes a puzzle by randomly adding clues from
			// the solution generated by make_seed()
			
			var randomIndex = [],
				newPuzzle = [],
				solvedPuzzle = make_seed(),
				puzzleSize = [],
				numClues = 23;

			for (var i = 0; i < 81; i++) {
				// Stores 0 to mark empty cells for CASUDOKU.board.draw()
				newPuzzle[i] = 0;
				
				// Stores numbers 0 to 81 to be randomly picked later
				puzzleSize[i] = i;
			};

			for (var x = 0; x < numClues; x++) {
				// Pick numbers stored in puzzleSize randomly
				randomIndex[x] = puzzleSize.splice(Math.random()*puzzleSize.length,1);
				
				// Store random solutions from solved puzzle to create clues
				newPuzzle[randomIndex[x]] = solvedPuzzle[randomIndex[x]];
			}

			return newPuzzle;
		};

		return make_puzzle;
	}());

	CASUDOKU.validator = (function() {
		check = function(grid) {
			var correct = false, 
				solution = "";
				
			for (var i = 0; i < grid.length; i += 1) {
				if (grid[i].value !== 0) {
					// concatenate grid values
					solution += grid[i].value;
				};
			};
			
			if (solution.length === 81 && check_total(solution, 405)) {
				if (correct_rows(solution)){
					if (correct_cols(solution)) {
						if (correct_regions(solution)) {
							correct = true;
						};
					};
				};
			};
			
			return correct;
		};
		
		correct_rows = function(solution) {
			// Slices the solution string in to rows
			// and checks for unique values
			
			var correctRows = 0, 
				rowStart = 0, 
				rowEnd = 8;
				
			for (var i = 0; i < 9; i += 1) {
				currentRow = solution.slice(rowStart, rowEnd);
				correctRows += check_unique(currentRow); 
				rowStart += 9;
				rowEnd += 9;
			};
			
			return (correctRows === 9) ? true : false;
		};
		
		correct_cols = function(solution) {
			// Slices the solution string in to cols
			// and checks for unique values
			
			var correctCols = 0, 
				colVal, 
				colNum = 0, 
				currentCol = "";
				
			for (var y = 0; y < 9; y += 1) {
				currentCol = "";
				colVal = colNum;
				for (var x = 0; x < 9; x += 1){
					currentCol += solution.charAt(colVal);
					colVal += 9;
				};
				correctCols += check_unique(currentCol);
				colNum += 1;
			};
			
			return (correctCols === 9) ? true : false;
		};
		
		correct_regions = function(solution) {
			// Slices the solution string in to regions
			// and checks for unique values
			
			var correctRegions = 0, 
				regionVal = 0, 
				regionStart = 0, 
				currentRegion = "";
				
			for (var z = 0; z < 9; z += 1 ) {
				currentRegion = "";
				regionVal = regionStart;
				for (var r = 1; r < 10; r += 1) {
					currentRegion += solution.charAt(regionVal)
					
					// Change row within the region
					if ( r % 3 === 0) {
						regionVal += 6;
					};
					regionVal += 1;
				};
				correctRegions += check_unique(currentRegion);
				
				// change region row
				if ((z +1) % 3 === 0) {
					regionStart += 21;
				}
				else {
					regionStart += 3;
				};
			};
			
			return (correctRegions === 9) ? true : false;
		};
		
		check_total = function(numbers, total) {
			// parses intergers from a string one
			// character at a time.
			// checks that they add up to the total
			
			var sum = 0;
			
			for (var i = 0; i < numbers.length; i += 1) {
				sum += parseInt(numbers.charAt(i));
			};
			
			return (sum === total) ? true : false;
		};
		
		check_unique = function(numbers) {
			// returns 1 (true) if each character in a 
			// string is unique, 0 (false) if not
			
			var hash = {},
			 	result = [],
				values = numbers.split("");
				
		    for ( var i = 0; i < values.length; ++i ) {
			
			// only add elements from values array that don't exist in the hash object
		        if (!hash.hasOwnProperty(values[i]) ) {
		            hash[ values[i] ] = true;
					
					// store all unique values in new array
		            result.push(values[i]);
		        };
		    };
			
			return (result.length === values.length) ? 1 : 0;
		};
		
		// Public api
		return {
			check:check
		};
	}());
	
	CASUDOKU.game.start();
});




