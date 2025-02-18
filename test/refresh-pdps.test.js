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
const openwhisk = require('openwhisk');
const { program } = require('commander');

const {
    clearStoreState,
    getRunning,
    isPollerStopped,
} = require('../tools/refresh-pdps');

jest.setTimeout(60000);

// Mock external dependencies
jest.mock('@adobe/aio-lib-state');
jest.mock('openwhisk');
jest.mock('commander');

describe('State and Rule Management', () => {
    const mockState = {
        _state: { running: 'true', us: '1234,1234455' },
        put: jest.fn((key, value) => {
            mockState._state[key] = value;
        }),
        init: jest.fn(),
        get: jest.fn((key) => mockState._state[key]),
        delete: jest.fn((key) => { delete mockState._state[key]; }),
    };

    const mockOW = {
        rules: {
            enable: jest.fn(),
            disable: jest.fn(),
        },
    };

    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks();

        // Setup environment variables
        process.env.AIO_RUNTIME_NAMESPACE = 'test-namespace';
        process.env.AIO_RUNTIME_AUTH = 'test-auth';

        // Setup mocks
        stateLib.init.mockResolvedValue(mockState);
        openwhisk.mockReturnValue(mockOW);
        program.opts.mockReturnValue({
            debug: true,
            stores: 'us,uk',
        });
    });

    describe('State Management', () => {
        test('clearStoreState deletes state for multiple stores', async () => {
            const stores = ['us', 'uk'];
            await clearStoreState(mockState, stores);
            expect(mockState.delete).toHaveBeenCalledTimes(2);
            expect(mockState.delete).toHaveBeenCalledWith('us');
            expect(mockState.delete).toHaveBeenCalledWith('uk');
        });

        test('getRunning returns false when state is not "true"', async () => {
            mockState.get.mockResolvedValue('false');
            const result = await getRunning(mockState);
            expect(result).toBe(false);
        });
    });

    describe('Poller Management', () => {
        beforeEach(() => {
            jest.useFakeTimers();
        });

        afterEach(() => {
            jest.useRealTimers();
        });
        test('isPollerStopped resolves when poller stops', async () => {
            const timeout = 2 * 1000;

            // Mock initial state as running
            mockState.get.mockResolvedValue('true');

            // After 1s, change state to not running 
            setTimeout(() => {
                mockState.get.mockResolvedValue(false);
            }, 1000);

            const pollerPromise = isPollerStopped(mockState, timeout);
            jest.advanceTimersByTime(1500);
            await pollerPromise;

            expect(mockState.get).toHaveBeenCalledWith('running');
        });

        test('isPollerStopped throws error on timeout', async () => {
            const timeout = 2 * 1000;

            // Mock state to always return running
            mockState.get.mockResolvedValue('true');

            const pollerPromise = isPollerStopped(mockState, timeout);
            jest.advanceTimersByTime(timeout + 100);

            await expect(pollerPromise).rejects.toThrow(
                `Timeout: poller did not stop within ${timeout} ms`
            );
        });
    });
});
