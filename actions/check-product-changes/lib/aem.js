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
 * @param {number} [options.publishBatchSize=100] - The batch size for publishing.
 * @param {string} [options.authToken] - The authentication token.
 */
class AdminAPI {
    previewQueue = [];
    publishQueue = [];
    unpublishQueue = [];
    unpublishPreviewQueue = [];
    inflight = [];
    MAX_RETRIES = 3;
    RETRY_DELAY = 5000;

    constructor(
        { org, site },
        context,
        { publishBatchSize = 100, authToken } = {},
    ) {
        this.site = site;
        this.org = org;
        this.publishBatchSize = publishBatchSize;
        this.authToken = authToken;
        this.context = context;
        this.onQueuesProcessed = null;
        this.stopProcessing$ = null;
        this.lastStatusLog = 0;
        this.previewDurations = [];
        this.queue = [];
    }

    previewAndPublish(records, locale, batchNumber) {
        return new Promise((resolve) => {
            this.previewQueue.push({ records, resolve, locale, batchNumber });
        });
    }

    unpublishAndDelete(records, locale, batchNumber) {
        return new Promise((resolve) => {
            this.unpublishQueue.push({ records, resolve, locale, batchNumber });
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
                    if (this.previewQueue.length + this.publishQueue.length + this.unpublishQueue.length + this.unpublishPreviewQueue.length + this.inflight.length > 0) {
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
        const executeTask = () => {
            const promise = new Promise(callback);
            promise.name = name;
            this.inflight.push(promise);
            promise.then(() => {
                this.inflight.splice(this.inflight.indexOf(promise), 1);
                if (this.queue.length > 0) {
                    const nextTask = this.queue.shift();
                    nextTask();
                }
            });
        };

        if (this.inflight.length < 2) {
            executeTask();
        } else {
            this.queue.push(executeTask);
        }
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

    async runWithRetry(fn, name) {
        const { logger } = this.context;
        for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
            try {
                return await fn();
            } catch (e) {
                logger.error(`Error running ${name}: ${e}`);

                if (attempt < this.MAX_RETRIES) {
                    const delay = this.RETRY_DELAY * attempt;
                    logger.info(`Retrying to run ${name} in ${delay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }
    }

    async checkJobStatus(job) {
        const { logger } = this.context;
        let status = true;
        while (true) {
            const responseBody = await this.execAdminRequest('GET', 'job', `/${job.topic}/${job.name}`);
            if (responseBody.progress) {
                logger.debug(`Progress for ${job.topic}/${job.name}: ${responseBody.progress.processed}/${responseBody.progress.total}`);

                if (responseBody.state === 'stopped') {
                    const { processed, total, failed } = responseBody.progress;
                    if (total === processed) {
                        if (failed > 0) {
                            logger.error(`Job ${job.topic}/${job.name} completed with failures: ${failed} failed jobs.`);
                            status = false;
                        } else {
                            logger.debug(`Job ${job.topic}/${job.name} completed successfully: ${processed} processed jobs.`);
                        }
                    } else {
                        logger.error(`Not all jobs were processed for ${job.topic}/${job.name}: ${processed}/${total}`);
                        status = false;
                    }

                    if (!status && responseBody.links?.details) {
                        logger.error(`Details of failed jobs for ${job.topic}/${job.name} can be found at: ${responseBody.links.details}`);
                    }

                    return status;
                }
            }

            await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for 2 seconds before the next status check
        }
    }

    doBatchPreview(batch) {
        this.trackInFlight(`preview ${batch.records.length} paths`, async (complete) => {
            const { logger } = this.context;
            const { records, locale, batchNumber } = batch;
            const body = {
                forceUpdate: true,
                paths: records.map(record => record.path),
                delete: false
            };
            const start = new Date();

            // Try to preview the batch using bulk preview API
            const response = await this.runWithRetry(
                async () => {
                    return await this.execAdminRequest('POST', 'preview', '/*', body);
                },
                `preview batch number ${batchNumber} for locale ${locale}`
            );

            let isErrored = false;
            if (response?.job) {
                const status = await this.runWithRetry(
                    async () => {
                        return await this.checkJobStatus(response.job);
                    },
                    `job status check for ${response.job.topic}/${response.job.name}`
                );
                if (status) {
                    logger.info(`Previewed batch number ${batchNumber} for locale ${locale}`);
                    batch.previewedAt = new Date();
                    this.publishQueue.push(batch);
                } else {
                    isErrored = true;
                }
            } else {
                isErrored = true;
            }

            if (isErrored) {
                logger.error(`Error previewing batch number ${batchNumber} for locale ${locale}`);
                // Resolve the original promises in case of an error
                batch.resolve({records, locale, batchNumber});
            }

            // Complete the batch preview
            this.previewDurations.push(new Date() - start);
            complete();
        });
    }

    doBatchPublish(batch) {
        this.trackInFlight(`publish ${batch.records.length} paths`, async (complete) => {
            const { logger } = this.context;
            const { records, locale, batchNumber } = batch;
            const body = {
                forceUpdate: true,
                paths: records.map(record => record.path),
                delete: false
            };

            // Try to publish the batch using bulk publish API
            const response = await this.runWithRetry(
                async () => {
                    return await this.execAdminRequest('POST', 'live', '/*', body);
                },
                `publish batch number ${batchNumber} for locale ${locale}`
            );

            let isErrored = false;
            if (response?.job) {
                const status = await this.runWithRetry(
                    async () => {
                        return await this.checkJobStatus(response.job);
                    },
                    `job status check for ${response.job.topic}/${response.job.name}`
                );
                if (status) {
                    logger.info(`Published batch number ${batchNumber} for locale ${locale}`);
                    batch.publishedAt = new Date();
                } else {
                    isErrored = true;
                }
            } else {
                isErrored = true;
            }

            if (isErrored) {
                logger.error(`Error publishing batch number ${batchNumber} for locale ${locale}`);
            }

            // Complete the batch publish
            complete();
            // Resolve the original promises
            batch.resolve({
                records,
                locale,
                batchNumber,
                previewedAt: batch.previewedAt,
                publishedAt: batch.publishedAt
            });
        });
    }

    doBatchUnpublish(batch, route) {
        this.trackInFlight(`unpublish ${route} ${batch.records.length} paths`, async (complete) => {
            const { logger } = this.context;
            const { records, locale, batchNumber } = batch;
            const body = {
                forceUpdate: true,
                paths: records.map(record => record.path),
                delete: true
            };

            // Try to unpublish live the batch using bulk publish API
            const response = await this.runWithRetry(
                async () => {
                    return await this.execAdminRequest('POST', route, '/*', body);
                },
                `unpublish ${route} batch number ${batchNumber} for locale ${locale}`
            );

            let isErrored = false;
            if (response?.job) {
                const status = await this.runWithRetry(
                    async () => {
                        return await this.checkJobStatus(response.job);
                    },
                    `job status check for ${response.job.topic}/${response.job.name}`
                );
                if (status) {
                    logger.info(`Unpublished ${route} batch number ${batchNumber} for locale ${locale}`);
                    if (route === 'live') {
                        batch.liveUnpublishedAt = new Date();
                        this.unpublishPreviewQueue.push(batch);
                    } else {
                        batch.previewUnpublishedAt = new Date();
                    }

                } else {
                    isErrored = true;
                }
            } else {
                isErrored = true;
            }

            if (isErrored) {
                logger.error(`Error unpublishing ${route} batch number ${batchNumber} for locale ${locale}`);
                if (route === 'live') {
                    // Resolve the original promises in case of an error
                    batch.resolve({records, locale, batchNumber});
                }
            }

            // Complete the batch unpublish
            complete();
            // Resolve the original promises
            if (route === 'preview') {
                batch.resolve({
                    records,
                    liveUnpublishedAt: batch.liveUnpublishedAt,
                    previewUnpublishedAt: batch.previewUnpublishedAt
                });
            }
        });
    }

    processQueues() {
        if (this.lastStatusLog < new Date() - 1000) {
            const { logger } = this.context;
            logger.info(`Queues: preview=${this.previewQueue.length},`
                + ` publish=${this.publishQueue.length},`
                + ` unpublish live=${this.unpublishQueue.length},`
                + ` unpublish preview=${this.unpublishPreviewQueue.length},`
                + ` inflight=${this.inflight.length},`
                + ` in queue=${this.queue.length}`);
            this.lastStatusLog = new Date();
        }

        // first drain the preview queue
        if (this.previewQueue.length > 0) {
            const batch = this.previewQueue.shift();
            this.doBatchPreview(batch);
        }

        // then drain the publish queue
        if (this.publishQueue.length > 0) {
            const batch = this.publishQueue.shift();
            this.doBatchPublish(batch);
        }

        // then drain the unpublish live queue
        if (this.unpublishQueue.length > 0) {
            const batch = this.unpublishQueue.shift();
            this.doBatchUnpublish(batch, 'live');
        }

        // then drain the unpublish preview queue
        if (this.unpublishPreviewQueue.length > 0) {
            const batch = this.unpublishPreviewQueue.shift();
            this.doBatchUnpublish(batch, 'preview');
        }

        if (this.onQueuesProcessed) {
            this.onQueuesProcessed();
        }
    }
}


module.exports = { AdminAPI };