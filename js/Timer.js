"use_strict";

const Timer = (function () {
  let timeout,
    seconds = 0,
    minutes = 0,
    secCounter = document.querySelectorAll(".secCounter"),
    minCounter = document.querySelectorAll(".minCounter");

  const start = function () {
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

  const stop = function () {
    clearTimeout(timeout);
  };

  const setText = function (element, time) {
    element.forEach(function (val) {
      val.innerText = time;
    });
  };

  const timer = function () {
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
    stop: stop,
  };
})();

export default Timer;
