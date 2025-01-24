const assert = require('node:assert/strict');
const { loadState, saveState, getFileLocation } = require('../actions/check-product-changes/poller.js');
const Files = require('./__mocks__/files.js');

describe('Poller', () => {
  it('loadState returns default state', async () => {
    const filesLib = new Files(0);
    const state = await loadState('uk', filesLib);
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
    const filesLib = new Files(0);
    await filesLib.write(getFileLocation('uk'), '1,sku1,2,sku2,3,sku3,4');
    const state = await loadState('uk', filesLib);
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
    const filesLib = new Files(0);
    await filesLib.write(getFileLocation('uk'), '1,sku1,2,sku2,3,sku3,4');
    const state = await loadState('uk', filesLib);
    state.skusLastQueriedAt = new Date(5);
    state.skus['sku1'] = new Date(5);
    state.skus['sku2'] = new Date(6);
    await saveState(state, filesLib);

    const serializedState = await filesLib.read(getFileLocation('uk'));
    assert.equal(serializedState, '5,sku1,5,sku2,6,sku3,4');

    const newState = await loadState('uk', filesLib);
    assert.deepEqual(newState, state);
  });

  it('loadState after saveState with null storeCode', async () => {
    const filesLib = new Files(0);
    await filesLib.write(getFileLocation('default'), '1,sku1,2,sku2,3,sku3,4');
    const state = await loadState(null, filesLib);
    state.skusLastQueriedAt = new Date(5);
    state.skus['sku1'] = new Date(5);
    state.skus['sku2'] = new Date(6);
    await saveState(state, filesLib);

    const serializedState = await filesLib.read(getFileLocation('default'));
    assert.equal(serializedState, '5,sku1,5,sku2,6,sku3,4');
  });
});