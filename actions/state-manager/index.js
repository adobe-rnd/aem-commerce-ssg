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

async function main({ op, key, value }) {
  const state = await stateLib.init();
  let result;

  switch (op) {
  case 'get':
    result = await state.get(key);
    break;
  case 'put':
    result = await state.put(key, value);
    break;
  case 'delete':
    result = await state.delete(key);
    break;
  case 'stats':
    result = await state.stats();
  // eslint-disable-next-line no-fallthrough
  case 'list':
  default: {
    result = [];
    for await (const { keys } of state.list()) {
      result.push(...keys);
    }
  }
  }

  return { op, key, result };
}

exports.main = main;