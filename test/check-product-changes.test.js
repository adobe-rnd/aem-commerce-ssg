const assert = require('node:assert/strict');
const { loadState, saveState } = require('../actions/check-product-changes/poller.js');
const { StateManager } = require('../actions/check-product-changes/lib/state.js');
const { MockState } = require('./__mocks__/state.js');


const logger = { debug: () => {}, info: () => {}, error: () => {} };

const createStateManager = () => {
  const stateLib = new MockState(0);
  return new StateManager(stateLib, logger);
}

describe('Poller', () => {
  it('loadState returns default state', async () => {
    const stateMgr = createStateManager();
    const state = await loadState('uk', stateMgr);
    assert.deepEqual(
      state,
      {
        locale: 'uk',
        skus: {},
        skusLastQueriedAt: new Date(0),
      }
    );
  });

  it('loadState returns parsed state', async () => {
    const stateMgr = createStateManager();
    await stateMgr.put('uk', '1,sku1,2,sku2,3,sku3,4');
    const state = await loadState('uk', stateMgr);
    assert.deepEqual(
      state,
      {
        locale: 'uk',
        skus: {
          sku1: new Date(2),
          sku2: new Date(3),
          sku3: new Date(4),
        },
        skusLastQueriedAt: new Date(1),
      }
    );
  });

  it('loadState after saveState', async () => {
    const stateMgr = createStateManager();
    await stateMgr.put('uk', '1,sku1,2,sku2,3,sku3,4');
    const state = await loadState('uk', stateMgr);
    state.skusLastQueriedAt = new Date(5);
    state.skus['sku1'] = new Date(5);
    state.skus['sku2'] = new Date(6);
    await saveState(state, stateMgr);

    const serializedState = await stateMgr.get('uk');
    assert.equal(serializedState?.value, '5,sku1,5,sku2,6,sku3,4');

    const newState = await loadState('uk', stateMgr);
    assert.deepEqual(newState, state);
  });

  it('loadState after saveState with null storeCode', async () => {
    const stateMgr = createStateManager();
    await stateMgr.put('default', '1,sku1,2,sku2,3,sku3,4');
    const state = await loadState(null, stateMgr);
    state.skusLastQueriedAt = new Date(5);
    state.skus['sku1'] = new Date(5);
    state.skus['sku2'] = new Date(6);
    await saveState(state, stateMgr);

    const serializedState = await stateMgr.get('default');
    assert.equal(serializedState?.value, '5,sku1,5,sku2,6,sku3,4');
  });
});