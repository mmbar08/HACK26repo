export class EventBus {
  constructor() {
    this.listeners = new Map();
  }

  on(eventName, handler) {
    const handlers = this.listeners.get(eventName) || new Set();
    handlers.add(handler);
    this.listeners.set(eventName, handlers);
  }

  emit(eventName, payload) {
    const handlers = this.listeners.get(eventName);

    if (!handlers) {
      return;
    }

    for (const handler of handlers) {
      handler(payload);
    }
  }
}
