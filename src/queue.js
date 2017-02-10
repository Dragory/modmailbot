class Queue {
  constructor() {
    this.running = false;
    this.queue = [];
  }

  add(fn) {
    this.queue.push(fn);
    if (! this.running) this.next();
  }

  next() {
    this.running = true;

    if (this.queue.length === 0) {
      this.running = false;
      return;
    }

    const fn = this.queue.shift();
    new Promise(resolve => {
      // Either fn() completes or the timeout of 10sec is reached
      Promise.resolve(fn()).then(resolve);
      setTimeout(resolve, 10000);
    }).then(() => this.next());
  }
}

module.exports = Queue;
