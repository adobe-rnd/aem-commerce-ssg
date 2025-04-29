class ObservabilityClient {
    /**
     * Creates an instance of ObservabilityClient.
     */
    constructor(options = {}) {
        this.endpoint = 'https://blazerank-logs-ingestor.adobeaem.workers.dev/api/v1/services/change-detector/activations';
        this.options = options;
    }

    /**
     * Sends a single activation log entry to the observability endpoint.
     * @param {object} activationData The JSON object representing the activation log.
     * @returns {Promise<void>} A promise that resolves when the log is sent, or rejects on error.
     */
    async sendActivationLog(activationData) {
        if (!activationData || typeof activationData !== 'object') {
            return;
        }

        const payload = {
            activations: [activationData],
            environment: 'staging',
        }; // Wrap the object in an array

        try {
            const response = await fetch(this.endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.options.token}`,
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                let errorBody = '';
                try {
                    errorBody = await response.text();
                } catch (e) { }
            }
        } catch (error) {}
    }
}

module.exports = { ObservabilityClient };
