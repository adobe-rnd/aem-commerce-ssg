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

const { State, Files } = require('@adobe/aio-sdk');
const { poll } = require('./poller');

async function main(params) {
  const stateLib = await State.init();
  const filesLib = await Files.init();
  const running = await stateLib.get('running');

  if (running?.value === 'true') {
    return { state: 'skipped' };
  }

  try {
    await stateLib.put('running', 'true');
    return await poll(params, filesLib);
  } finally {
    await stateLib.put('running', 'false');
  }
}

exports.main = main
