self.onmessage = function(e) {
    var grid = e.data,
        result = check(grid);

    self.postMessage(result);
    self.close();

    function check(grid) {
        var correct = false,
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
                        correct = true;
                    }
                }
            }
        }

        // Delete solution
        solution.splice(0, 81);

        return correct;
    }

    function correct_rows(solution) {
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
    }

    function correct_cols(solution) {
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
    }

    function correct_regions(solution) {
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
    }

    function check_total(numbers, total) {
        var sum = 0;

        for (var i = 0; i < numbers.length; i += 1) {
            sum += numbers[i];
        }

        return (sum === total) ? true : false;
    }

    function check_unique(array) {
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
    }
};