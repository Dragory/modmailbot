class Queue {
  constructor() {
    this.running = false;
    this.queue = [];
  }

  add(fn) {
    this.queue.push(fn);
    if (!this.running) this.next();
  }

  next() {
    this.running = true;

    if (this.queue.length === 0) {
      this.running = false;
      return;
    }

    const fn = this.queue.shift();
    Promise.resolve(fn()).then(() => this.next());
  }
}

module.exports = Queue;
