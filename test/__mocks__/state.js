class State {
    internalState = {};
  
    constructor(stateLatency = 200) {
      this.stateLatency = stateLatency;
    }
  
    async get(key) {
      return new Promise((resolve) => {
        setTimeout(() => resolve({ value: this.internalState[key] }), this.stateLatency);
      });
    }
  
    async put(key, value) {
      return new Promise((resolve) => {
        setTimeout(() => resolve(this.internalState[key] = value), this.stateLatency);
      });
    }
  }
  
  module.exports = State;