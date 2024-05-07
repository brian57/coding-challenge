"use strict";
const PriorityQueue = require("js-priority-queue");

// Print all entries, across all of the sources, in chronological order.
module.exports = (logSources, printer) => {
  // use min queue keep track of lowest (oldest) log entry
  var minQueue = new PriorityQueue({
    comparator: function (a, b) {
      return a.log.date.getTime() - b.log.date.getTime();
    },
  });

  // add a new item to the priority queue from the given logSource index
  function addLogFromSourceIndex(index) {
    const log = logSources[index].pop();
    if (log) {
      minQueue.queue({ index, log });
    }
  }

  // fill up min queue with 1 item from every log source
  for (const index in logSources) {
    addLogFromSourceIndex(index);
  }

  // remove oldest log item from the min queue one by one, replacing the
  // removed one with an item from the same log source.
  while (minQueue.length > 0) {
    const logItem = minQueue.dequeue();
    printer.print(logItem.log);
    addLogFromSourceIndex(logItem.index);
  }
  printer.done();

  return console.log("Sync sort complete.");
};
