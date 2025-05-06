class ObservabilityClient {
    constructor(options = {}) {
        this.endpoints = {
            activationResults: 'https://blazerank-logs-ingestor.adobeaem.workers.dev/api/v1/services/change-detector/activations',
            logs: 'https://blazerank-logs-ingestor.adobeaem.workers.dev/api/v1/services/change-detector/logs',
        };
        this.activationId = process.env.__OW_ACTIVATION_ID;
        this.namespace = process.env.__OW_NAMESPACE;
        this.instanceStartTime = Date.now();
        this.options = options;
    }

    async #sendRequestToObservability(payload) {
        // this method is not awaited, so it runs in the background
        // it is silent and does not throw errors
        try {
          const logEndpoint = this.endpoints[type];
      
          if (logEndpoint) {
            fetch(logEndpoint, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.options.token}`,
            },
              body: JSON.stringify(payload),
            });
            // No `await`, so promise runs in the background
            Promise.resolve(); // Immediately resolve to avoid blocking
          } else {
            Promise.resolve();
          }
        } catch (error) {
          Promise.resolve(); // Still resolve to prevent blocking
        }
      }

    /**
     * Sends a single activation log entry to the observability endpoint.
     * @param {object} activationData The JSON object representing the activation log.
     * @returns {Promise<void>} A promise that resolves when the log is sent, or rejects on error.
     */
    async sendActivationResult(result) {
        if (!result || typeof result !== 'object') {
            return;
        }

        const payload = {
            environment: `${this.namespace}`,
            //TODO: more precise start time
            timestamp: this.instanceStartTime,
            result,
            activationId: this.activationId,
        };

        this.#sendRequestToObservability('activationResults', payload);
    }

    /**
     * Sends a log event to the observability endpoint.
     * @param {string} message The log message.
     * @param {string} severity The log severity.
     * @returns {Promise<void>} A promise that resolves when the log is sent, or rejects on error.
     */
    async sendLogEvent(message, severity = 'INFO') {
        const severityMap = {
            'INFO': 2,
            'ERROR': 4,
            //TODO: add more severity levels
        };

        const payload = {
            environment: `${this.namespace}`,
            timestamp: Date.now(),
            message,
            activationId: `${this.activationId}`,
            severity: severityMap[severity] || 2,
        };

        this.#sendRequestToObservability('logs', payload);
    }
}

module.exports = { ObservabilityClient };
