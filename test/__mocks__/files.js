class Files {
  internalStorage = {};

  constructor(storageLatency = 500) {
    this.storageLatency = storageLatency;
  }

  async read(fileLocation) {
    return new Promise((resolve) => {
      setTimeout(() => resolve(this.internalStorage[fileLocation]), this.storageLatency);
    });
  }

  async write(fileLocation, fileData) {
    return new Promise((resolve) => {
      setTimeout(() => resolve(this.internalStorage[fileLocation] = fileData), this.storageLatency);
    });
  }
}

module.exports = Files;
