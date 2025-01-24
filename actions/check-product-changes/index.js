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

const { Core, State, Files } = require('@adobe/aio-sdk');
const { poll } = require('./poller');
const { StateManager } = require('./lib/state');

async function main(params) {
  const logger = Core.Logger('main', { level: params.LOG_LEVEL || 'info' });
  const stateLib = await State.init();
  const filesLib = await Files.init();
  const stateMgr = new StateManager(stateLib, { logger });

  const running = await stateMgr.get('running');
  if (running?.value === 'true') {
    return { state: 'skipped' };
  }

  try {
    // if there is any failure preventing a reset of the 'running' state key to 'false',
    // this might not be updated and action execution could be permanently skipped
    // a ttl == function timeout is a mitigation for this risk
    await stateMgr.put('running', 'true', 3600);
    return await poll(params, filesLib);
  } finally {
    await stateMgr.put('running', 'false');
  }
}

exports.main = main
