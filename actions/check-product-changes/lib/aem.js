/*
Copyright 2025 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

const { request } = require('../../utils');

/**
 * Creates an instance of AdminAPI.
 * @param {Object} params - The parameters for the AdminAPI.
 * @param {string} params.org - The organization name.
 * @param {string} params.site - The site name.
 * @param {Object} context - The context object containing store information.
 * @param {Object} [options={}] - Additional options for the AdminAPI.
 * @param {number} [options.requestPerSecond=5] - The number of requests per second.
 * @param {number} [options.publishBatchSize=100] - The batch size for publishing.
 * @param {string} [options.authToken] - The authentication token.
 */
class AdminAPI {
    previewQueue = [];
    publishQueue = [];
    unpublishQueue = [];
    inflight = [];

    constructor(
        { org, site },
        context,
        { requestPerSecond = 5, publishBatchSize = 100, authToken } = {},
    ) {
        this.site = site;
        this.org = org;
        this.requestPerSecond = requestPerSecond;
        this.publishBatchSize = publishBatchSize;
        this.authToken = authToken;
        this.context = context;
        this.onQueuesProcessed = null;
        this.stopProcessing$ = null;
        this.lastStatusLog = 0;
        this.previewDurations = [];
    }

    previewAndPublish(record) {
        return new Promise((resolve) => {
            this.previewQueue.push({ record, resolve });
        });
    }

    unpublishAndDelete(record) {
        return new Promise((resolve) => {
            this.unpublishQueue.push({ record, resolve });
        });
    }

    async startProcessing() {
        if (this.stopProcessing$) {
            // only restart processing after awaiting stopProcessing
            await this.stopProcessing$;
        }
        if (!this.interval) {
            this.interval = setInterval(() => this.processQueues(), 1000);
        }
    }

    stopProcessing() {
        if (!this.interval) {
            return;
        }
        // stopProcessing only once by keeping a single promise resolving after all queues are processed
        if (!this.stopProcessing$) {
            this.stopProcessing$ = new Promise((resolve) => {
                this.onQueuesProcessed = () => {
                    if (this.previewQueue.length + this.publishQueue.length + this.unpublishQueue.length + this.inflight.length > 0) {
                        // still running
                        return;
                    }

                    // reset callback
                    clearInterval(this.interval);
                    this.onQueuesProcessed = null;
                    this.stopProcessing$ = null;
                    this.interval = null;
                    resolve();
                };
            });
        }
        return this.stopProcessing$;
    }

    trackInFlight(name, callback) {
        const promise = new Promise(callback);
        promise.name = name;
        this.inflight.push(promise);
        promise.then(() => this.inflight.splice(this.inflight.indexOf(promise), 1));
    }

    async execAdminRequest(method, route, path, body) {
        // wait for 10s when using mock
        if (!this.site || !this.org || this.site === 'mock' || this.org === 'mock') {
            return new Promise((resolve) => {
                setTimeout(resolve, 1000);
            });
        }
        // use the admin API to trigger preview or live
        const adminUrl = `https://admin.hlx.page/${route}/${this.org}/${this.site}/main${path}`;

        const req = { method, headers: {} };
        req.headers['User-Agent'] = 'AEM Commerce Poller / 1.0';
        if (body) {
            req.body = JSON.stringify(body);
            req.headers['content-type'] = 'application/json';
        }
        if (this.authToken) {
            req.headers['x-auth-token'] = this.authToken;
        }
        return request(route, adminUrl, req);
    }

    doPreview(item) {
        this.trackInFlight(`preview ${item.record.path}`, async (complete) => {
            const { logger } = this.context;
            const { record } = item;
            const start = new Date();

            try {
                record.previewedAt = new Date();
                await this.execAdminRequest('POST', 'preview', record.path);
                logger.info(`Previewed ${record.path}`);
                this.publishQueue.push(item);
            } catch (e) {
                logger.error(e);
                // only resolve the item promise in case of an error
                item.resolve(record);
            } finally {
                this.previewDurations.push(new Date() - start);
                complete();
            }
        });
    }

    doPublish(items) {
        this.trackInFlight(`publish ${items.length}`, async (complete) => {
            const { logger } = this.context;

            try {
                const paths = items.map(({ record }) => record.path);
                const body = { forceUpdate: false, paths };
                await this.execAdminRequest('POST', 'live', '/*', body);
                logger.info(`Published ${items.length} items`);

                // set published date after publishing done
                items.forEach(({ record }) => record.publishedAt = new Date());
            } catch (e) {
                logger.error(e);
            } finally {
                complete();
                // resolve the original promises
                items.forEach(({ record, resolve }) => resolve(record));
            }
        });
    }

    doUnpublishAndDelete(item) {
        this.trackInFlight(`unpublish ${item.record.path}`, async (complete) => {
            const { logger } = this.context;
            const { record } = item;

            try {
                await this.execAdminRequest('DELETE', 'live', record.path);
                await this.execAdminRequest('DELETE', 'preview', record.path);
                logger.info(`Unpublished ${record.path}`);
                record.deletedAt = new Date();
            } catch (e) {
                logger.error(e);
            } finally {
                complete();
                item.resolve(record);
            }
        });
    }

    processQueues() {
        if (this.lastStatusLog < new Date() - 60000) {
            const { logger } = this.context;
            logger.info(`Queues: preview=${this.previewQueue.length},`
                + ` publish=${this.publishQueue.length},`
                + ` unpublish=${this.unpublishQueue.length},`
                + ` inflight=${this.inflight.length}`);
            this.lastStatusLog = new Date();
        }

        let rateLimitBudget = this.requestPerSecond;

        // first drain the preview queue
        while (this.previewQueue.length && rateLimitBudget > 0) {
            const item = this.previewQueue.shift();
            this.doPreview(item);
            rateLimitBudget -= 1;
        }

        // then drain the unpublish queue
        while (this.unpublishQueue.length && rateLimitBudget > 0) {
            const item = this.unpublishQueue.shift();
            this.doUnpublishAndDelete(item);
            rateLimitBudget -= 1;
        }

        // next drain the publish queues, but collect items to publish into buckets
        let publishBatch = [];
        while (this.publishQueue.length && rateLimitBudget > 0) {
            const item = this.publishQueue.shift();
            publishBatch.push(item);

            if (publishBatch.length === this.publishBatchSize) {
                this.doPublish(publishBatch);
                rateLimitBudget -= 1;
                publishBatch = [];
            }
        }

        if (publishBatch.length) {
            // publish remaining items
            this.doPublish(publishBatch);
        }

        if (this.onQueuesProcessed) {
            this.onQueuesProcessed();
        }
    }
}


module.exports = { AdminAPI };