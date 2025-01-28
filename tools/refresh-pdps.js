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

const openwhisk = require('openwhisk');
const { program } = require('commander');
const { exit } = require('process');

require('dotenv').config();

const {
    AIO_RUNTIME_NAMESPACE,
    AIO_RUNTIME_AUTH,
} = process.env;

if (!AIO_RUNTIME_NAMESPACE || !AIO_RUNTIME_AUTH) {
    console.log('Missing required environment variables AIO_RUNTIME_AUTH and AIO_RUNTIME_NAMESPACE');
    exit(1);
}

const [AIO_STATE_MANAGER_ACTION_NAME, AIO_POLLER_RULE_NAME] = ['state-manager', 'poll_every_minute'];

const ow = openwhisk({
    apihost: 'https://adobeioruntime.net',
    api_key: AIO_RUNTIME_AUTH,
    namespace: AIO_RUNTIME_NAMESPACE,
});

let targetLocales = [];

program
    .requiredOption('-l, --locales <locales>', 'Comma-separated list of locales (or stores) to target. For example: en,fr,de')
    .parse(process.argv);

const options = program.opts();

if (!options.keys) {
    console.error('No locales provided to delete.');
    exit(1);
}

targetLocales = options.keys.split(',');

async function checkState(locale) {
    const state = await ow.actions.invoke({
        name: AIO_STATE_MANAGER_ACTION_NAME,
        params: { key: locale, op: 'get' },
        blocking: true,
        result: true,
    });
    return state.value;
}

async function flushStoreState(locale) {
    await ow.actions.invoke({
        name: AIO_STATE_MANAGER_ACTION_NAME,
        params: { key: locale, op: 'delete' },
        blocking: true,
        result: true,
    });
}

async function main(timeout = 20 * 60 * 1000) {
    try {
        // Disable the rule
        await ow.rules.disable({ name: AIO_POLLER_RULE_NAME });

        // Wait until 'running' is not 'true'
        let running = await checkState('running');
        while (running === 'true') {
            console.log('Waiting for running state to be false...');
            await new Promise(resolve => setTimeout(resolve, 60000)); // Wait 1 minute
            running = await checkState('running');
        }

        // Delete specified keys
        for (const key of targetLocales) {
            await flushStoreState(key);
        }

        // Re-enable the rule to trigger the poller cycle start
        await ow.rules.enable({ name: AIO_POLLER_RULE_NAME });

        // Check periodically until 'running' is 'true'
        const startTime = Date.now();
        while (true) {
            running = await checkState('running');
            if (running === 'true') {
                console.log('Running state is true. Exiting...');
                exit(0);
            }
            if (Date.now() - startTime > timeout) {
                console.error('Timeout: running state did not become true within 30 minutes.');
                exit(1);
            }
            await new Promise(resolve => setTimeout(resolve, 60000)); // Wait 1 minute
        }
    } catch (error) {
        console.error('Error:', error);
        exit(1);
    }
}

module.exports = {
    checkState,
    flushStoreState,
    main,
    targetLocales,
};

// Only call main if this file is being run directly
if (require.main === module) {
    main();
}