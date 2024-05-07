"use strict";
const PriorityQueue = require("js-priority-queue");
var Deque = require("double-ended-queue");

// Print all entries, across all of the *async* sources, in chronological order.
module.exports = (logSources, printer) => {
  // Allow prefetching of up to this many log entries per log source
  const MAX_BUFFER_SIZE = 100;
  // Allow all log sources to call popAsync in parallel, up to a limit: MAX_BUFFER_SIZE
  const logSourceQueues = new Array(logSources.length)
    .fill(null)
    // Queue should *theoretically* be faster than regular array
    // since we're doing .shift()
    .map((_) => new Deque());

  // Keep track of when a log source has filled up it's buffer and
  // last call to asyncPop has finished
  const bufferFilled = new Array(logSources.length).fill(false);

  // Keep track of oldest log entry out of all available ones
  var minQueue = new PriorityQueue({
    comparator: function (a, b) {
      return a.log.date.getTime() - b.log.date.getTime();
    },
  });

  // call popAsync for given log source untill log buffer is filled or source is drained
  async function fillBuffer(index) {
    const logSource = logSources[index];
    while (logSourceQueues[index].length < MAX_BUFFER_SIZE) {
      const nextLog = logSource.popAsync()
      logSourceQueues[index].push(nextLog);
      const res = await nextLog;
      if (!res) break;
    }
    bufferFilled[index] = true;
  }

  // fill up minQueue with first log entries from every source
  for (const index in logSources) {
    const logSource = logSources[index];
    minQueue.queue({
      index,
      log: logSource.last,
    });
    fillBuffer(index);
  }

  async function printAll() {
    while (minQueue.length > 0) {
      // get oldest log line from min queue
      const { log, index } = minQueue.dequeue();
      printer.print(log);

      const nextLog = await logSourceQueues[index].shift();

      // if buffer is filled and done fetching, restart fetch again
      if (
        logSourceQueues[index].length < MAX_BUFFER_SIZE &&
        bufferFilled[index]
      ) {
        bufferFilled[index] = false;
        fillBuffer(index);
      }

      if (nextLog) {
        minQueue.queue({
          index,
          log: nextLog,
        });
      }
    }
    printer.done();
  }

  return printAll().then(() => {
    console.log("Async sort complete.");
  });
};
