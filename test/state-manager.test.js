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

const { StateManager } = require('../actions/lib/state');

describe('StateManager', () => {
  const loggerMock = { warning: jest.fn(), error: jest.fn() };
  const stateLibMock = { put: jest.fn(), get: jest.fn() };

  const stateManager = new StateManager(stateLibMock, { logger: loggerMock }, 3, 2);

  beforeEach(() => {
    stateLibMock.put.mockReset();
    stateLibMock.get.mockReset();
    loggerMock.warning.mockReset();
    loggerMock.error.mockReset();
  });

  test('should retrieve a value from the state', async () => {
    stateLibMock.get.mockResolvedValue('value');
    const result = await stateManager.get('key');
    expect(result).toBe('value');
    expect(stateLibMock.get).toHaveBeenCalledWith('key');
  });

  test('should set a key-value pair in the state', async () => {
    stateLibMock.put.mockResolvedValue('key');
    const result = await stateManager.put('key', 'value');
    expect(result).toBe('key');
    expect(stateLibMock.put).toHaveBeenCalledWith('key', 'value', {});
  });

  test('should set a key-value pair in the state with custom options', async () => {
    stateLibMock.put.mockResolvedValue('key');
    const result = await stateManager.put('key', 'value', { test: 'a' });
    expect(result).toBe('key');
    expect(stateLibMock.put).toHaveBeenCalledWith('key', 'value', { test: 'a' });
  });

  test('should retry on failure', async () => {
    stateLibMock.get.mockRejectedValueOnce(new Error('Temporary error')).mockResolvedValue('value');
    const result = await stateManager.get('key');
    expect(result).toBe('value');
    expect(stateLibMock.get).toHaveBeenCalledTimes(2);
    expect(loggerMock.warning).toHaveBeenCalled();
  }, 5000);

  test('should throw error after max retries', async () => {
    stateLibMock.get.mockRejectedValue(new Error('Permanent error'));
    await expect(stateManager.get('key')).rejects.toThrow('Permanent error');
    expect(stateLibMock.get).toHaveBeenCalledTimes(3);
    expect(loggerMock.error).toHaveBeenCalled();
  }, 10000);
});

describe('StateManager Constructor', () => {
  const loggerMock = {};
  const stateLibMock = {};

  test('should initialize with default values', () => {
    const stateManager = new StateManager(stateLibMock, { logger: loggerMock });
    expect(stateManager.retryCount).toBe(5);
    expect(stateManager.retryDelay).toBe(10000);
    expect(stateManager.logger).toBe(loggerMock);
    expect(stateManager.state).toBe(stateLibMock);
  });

  test('should initialize with custom values', () => {
    const stateManager = new StateManager(stateLibMock, { logger: loggerMock }, 3, 5);
    expect(stateManager.retryCount).toBe(3);
    expect(stateManager.retryDelay).toBe(5000); // 5 seconds in milliseconds
    expect(stateManager.logger).toBe(loggerMock);
    expect(stateManager.state).toBe(stateLibMock);
  });

  test('should set retryCount to 1 if given value is less than or equal to 0', () => {
    const stateManager = new StateManager(stateLibMock, { logger: loggerMock }, 0, 5);
    expect(stateManager.retryCount).toBe(1);
  });
});
