class Logger {
    constructor(showDebug = false) {
      this.showDebug = showDebug;
    }
  
    info(msg) {
      this.log(msg);
    }
  
    error(msg) {
      this.log(msg);
    }
  
    debug(msg) {
      if (this.showDebug) this.log(msg);
    }
  
    log(msg) {
      console.log(`${new Date().toISOString()} - ${msg}`);
    }
  }
  
  module.exports = Logger;