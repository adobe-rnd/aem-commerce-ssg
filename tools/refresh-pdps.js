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

const stateLib = require('@adobe/aio-lib-state');
const { Files } = require('@adobe/aio-sdk');
const { deleteState } = require('../actions/check-product-changes/poller');
const openwhisk = require('openwhisk');
const { program } = require('commander');
if (require.main === module) require('dotenv').config();

const rules = ['productPollerRule', 'productScraperRule'];

const {
    AIO_RUNTIME_NAMESPACE,
    AIO_runtime_namespace,
    AIO_RUNTIME_AUTH,
    AIO_runtime_auth,
} = process.env;

const namespace = AIO_RUNTIME_NAMESPACE || AIO_runtime_namespace;
const auth = AIO_RUNTIME_AUTH || AIO_runtime_auth;

let stateInstance, filesLib;
const ow = openwhisk({
    api_key: auth,
    namespace,
});

async function enableRules() {
    for (const rule of rules) {
        await ow.rules.enable({
            name: rule,
        });
        console.info(`rule "${rule}" enabled`);
    }
}

async function disableRules() {
    for (const rule of rules) {
        await ow.rules.disable({
            name: rule,
        });
        console.info(`rule "${rule}" disabled`);
    }
}

async function initStateIfNull() {
    if (stateInstance) return;
    console.info('Initializing state libs');
    const cfg = {
        ow: {
            auth,
            namespace,
        },
    };
    filesLib = await Files.init(cfg);
    stateInstance = await stateLib.init(cfg);
}

async function clearStoreState(state, stores) {
    await initStateIfNull();
    for (const store of stores) {
        await deleteState(store, filesLib);
        console.info(`file-based state for store "${store}" deleted`);
    }
}

async function getRunning(state, key = 'running') {
    await initStateIfNull();
    return (await state.get(key))?.value === 'true';
}

async function getStoreState(state, store) {
    await initStateIfNull();
    const skusList = await state.get(store);
    const running = (await state.get('running'))?.value === 'true';
    return {
        skusList,
        running,
    };
}


async function isPollerStopped(state, timeout) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
        const running = await state.get('running');
        if (running !== 'true') {
            return true;
        }
    }
    throw new Error(`Timeout: poller did not stop within ${timeout} ms`);
}


async function main() {
    program
        .option('-d, --debug', 'Additionally prints out the state')
        .requiredOption('-s, --stores <us,en,uk,...>', 'Comma separated list of locales');

    const { debug, stores: storesString } = program.opts();
    const stores = storesString.split(',');

    if (!namespace || !auth) {
        console.error('Missing required environment variables');
        process.exit(1);
    }

    if (debug) {
        console.info('Debug mode enabled');
        const storesState = {};
        for (const store of stores) {
            storesState[store] = await getStoreState(stateInstance, store);
        }

        console.log('storesState', storesState);
        // 1. stop the poller. If the poller is already activated
        //    it will be stopped until the next activation (step 4)
        await disableRules();
        // 2. wait for the poller to stop (timeout 30 min)
        await isPollerStopped();
        // 3. remove all SKUs from the state
        await clearStoreState(stateInstance, stores);
        // 4. restart the poller
        await enableRules();
    }
}

if (require.main === module) {
    main();
}

module.exports = {
    enableRules,
    disableRules,
    initStateIfNull,
    clearStoreState,
    getRunning,
    getStoreState,
    isPollerStopped,
};