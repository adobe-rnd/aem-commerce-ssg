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
const { loadState, saveState, deleteState } = require('../../actions/check-product-changes/poller.js');
const { StateManager } = require('../../actions/check-product-changes/lib/state.js');

async function main({ op, key, value }) {
  const logger = Core.Logger('main', { level: process.env.LOG_LEVEL || 'info' });

  const stateLib = await State.init();
  const filesLib = await Files.init();
  const stateMgr = new StateManager(stateLib, { logger });

  let result;

  if (Boolean(value) && key === 'running') {
    switch (op) {
      case 'get': {
        result = await stateMgr.get(key);
        break;
      }
      case 'put': {
        result = await stateMgr.put(key, value, 3600);
        break;
      }
      case 'delete': {
        result = await stateMgr.delete(key);
        break;
      }
    }
  } else {
    switch (op) {
      case 'get': {
        // use aio-state for 'running' key
        if (key === 'running') {
          result = await stateMgr.get('running');
          break;
        }
        const currentState = await loadState(key, filesLib);
        result = currentState[key]
        break;
      }
      case 'put': {
        // use aio-state for 'running' key
        if (key === 'running') {
          result = await stateMgr.put('running', value, 3600);
          break;
        }
        result = await saveState({ locale: key, ...value }, filesLib);
        break;
      }
      case 'delete': {
        result = await deleteState(key, filesLib);
        break;
      }
      case 'stats':
        result = {}
      // eslint-disable-next-line no-fallthrough
      case 'list':
      default: {
        const currentState = await loadState(stateMgr, filesLib);
        result = Object.keys(currentState);
      }
    }
  }

  return { op, key, result };
}

exports.main = main;