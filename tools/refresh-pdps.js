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

let ow, stateInstance, filesLib;

async function enableRules({ namespace, auth }) {
    await initStateIfNull({ namespace, auth });
    for (const rule of rules) {
        await ow.rules.enable({
            name: rule,
        });
        console.info(`rule "${rule}" enabled`);
    }
}

async function disableRules({ namespace, auth }) {
    await initStateIfNull({ namespace, auth });
    for (const rule of rules) {
        await ow.rules.disable({
            name: rule,
        });
        console.info(`rule "${rule}" disabled`);
    }
}

async function initStateIfNull({ namespace, auth }) {
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

async function clearStoreState(locales, { namespace, auth }) {
    await initStateIfNull({ namespace, auth });
    for (const locale of locales) {
        await deleteState(locale, filesLib);
        console.info(`file-based state for store "${locale}" deleted`);
    }
}

async function getRunning(state, key = 'running', { namespace, auth }) {
    await initStateIfNull({ namespace, auth });
    return (await state.get(key))?.value === 'true';
}

async function getStoreState(state, store, { namespace, auth }) {
    await initStateIfNull({ namespace, auth });
    const skusList = await state.get(store);
    const running = (await state.get('running'))?.value === 'true';
    return {
        skusList,
        running,
    };
}


async function isPollerStopped(state, timeout, { namespace, auth }) {
    await initStateIfNull({ namespace, auth });
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
        .option('-s, --stores <us,en,uk,...>', 'Comma separated list of locales');

    const { stores: storesString } = program.opts();

    const {
        AIO_RUNTIME_NAMESPACE,
        AIO_runtime_namespace,
        AIO_RUNTIME_AUTH,
        AIO_runtime_auth,
    } = process.env;
    
    const namespace = AIO_RUNTIME_NAMESPACE || AIO_runtime_namespace;
    const auth = AIO_RUNTIME_AUTH || AIO_runtime_auth;

    if (!namespace || !auth) {
        console.error('Missing required environment variables');
        process.exit(1);
    }

    ow = openwhisk({
        api_key: auth,
        namespace,
    });


    const stores = storesString.split(',');

    // 1. stop the poller. If the poller is already activated
    //    it will be stopped until the next activation (step 4)
    await disableRules({ namespace, auth });
    // 2. wait for the poller to stop (timeout 30 min)
    await isPollerStopped(stateInstance, 1800000, { namespace, auth });
    // 3. remove all SKUs from the state
    await clearStoreState(stateInstance, stores, { namespace, auth });
    // 4. restart the poller
    await enableRules({ namespace, auth });
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