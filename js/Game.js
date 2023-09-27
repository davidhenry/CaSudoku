"use_strict";

import Board from "./Board.js";
import Timer from "./Timer.js";

// Store game in global variable
window.CASUDOKU = {
  Board: Board,
  Timer: Timer,
};

document.addEventListener("DOMContentLoaded", function () {
  CASUDOKU.Game = (function () {
    // Controls the state of the game

    // Game UI
    let uiStats = document.getElementById("gameStats"),
      uiComplete = document.getElementById("gameComplete"),
      uiNewGame = document.getElementById("gameNew"),
      gamePadKeys = document.querySelectorAll("#gameKeypad li a");

    // GameKeypad Events
    for (let i = gamePadKeys.length - 1; i >= 0; i--) {
      let key = gamePadKeys[i];

      key.onclick = function (event) {
        event.preventDefault();

        // Parse keycode value
        let number = parseInt(event.currentTarget.innerText, 10);

        if (!number) {
          CASUDOKU.Board.update_cell(0);
        } else {
          CASUDOKU.Board.update_cell(number);
        }
      };
    }

    uiNewGame.onclick = function (event) {
      event.preventDefault();

      CASUDOKU.Game.start();
    };

    const start = function () {
      CASUDOKU.Timer.start();
      CASUDOKU.Board.new_puzzle();

      uiComplete.style.display = "none";
      uiStats.style.display = "block";
    };

    const over = function () {
      CASUDOKU.Timer.stop();

      uiComplete.style.display = "block";
      uiStats.style.display = "none";
    };

    // Public api
    return {
      start: start,
      over: over,
    };
  })();

  CASUDOKU.Game.start();
});
