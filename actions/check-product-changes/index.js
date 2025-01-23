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

const { stateLib } = require('@adobe/aio-lib-state');
const { poll } = require('./poller');

async function main(params) {
  const state = await stateLib.init();
  const running = await state.get('running');

  if (running?.value === 'true') {
    return { state: 'skipped' };
  }

  try {
    // if there is any failure preventing a reset of the 'running' state key to 'false',
    // this might not be updated and action execution could be permanently skipped
    // a ttl == function timeout is a mitigation for this risk
    await state.put('running', 'true', { ttl: 3600 });
    return await poll(params, state);
  } finally {
    await state.put('running', 'false');
  }
}

exports.main = main
