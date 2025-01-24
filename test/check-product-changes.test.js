const assert = require('node:assert/strict');
const { loadState, saveState } = require('../actions/check-product-changes/poller.js');
const State = require('./__mocks__/state.js');

describe('Poller', () => {
  it('loadState returns default state', async () => {
    const stateLib = new State(0);
    const state = await loadState('uk', stateLib);
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
    const stateLib = new State(0);
    await stateLib.put('uk', '1,sku1,2,sku2,3,sku3,4');
    const state = await loadState('uk', stateLib);
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
    const stateLib = new State(0);
    await stateLib.put('uk', '1,sku1,2,sku2,3,sku3,4');
    const state = await loadState('uk', stateLib);
    state.skusLastQueriedAt = new Date(5);
    state.skus['sku1'] = new Date(5);
    state.skus['sku2'] = new Date(6);
    await saveState(state, stateLib);

    const serializedState = await stateLib.get('uk');
    assert.equal(serializedState?.value, '5,sku1,5,sku2,6,sku3,4');

    const newState = await loadState('uk', stateLib);
    assert.deepEqual(newState, state);
  });

  it('loadState after saveState with null locale', async () => {
    const stateLib = new State(0);
    await stateLib.put('default', '1,sku1,2,sku2,3,sku3,4');
    const state = await loadState(null, stateLib);
    state.skusLastQueriedAt = new Date(5);
    state.skus['sku1'] = new Date(5);
    state.skus['sku2'] = new Date(6);
    await saveState(state, stateLib);

    const serializedState = await stateLib.get('default');
    assert.equal(serializedState?.value, '5,sku1,5,sku2,6,sku3,4');
  });
});