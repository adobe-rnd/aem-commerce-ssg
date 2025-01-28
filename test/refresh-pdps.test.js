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

// Mock modules before requiring the main file
const mockOpenWhiskInstance = {
    actions: {
        invoke: jest.fn()
    },
    rules: {
        disable: jest.fn(),
        enable: jest.fn()
    }
};

jest.mock('openwhisk', () => {
    return jest.fn(() => mockOpenWhiskInstance);
});

jest.mock('dotenv', () => ({
    config: jest.fn()
}));

jest.mock('commander', () => {
    const mockProgram = {
        option: jest.fn().mockReturnThis(),
        parse: jest.fn().mockReturnThis(),
        opts: jest.fn().mockReturnValue({ keys: 'en,fr' })
    };
    return { program: mockProgram };
});
// Store original process.env
const originalEnv = process.env;

describe('Refresh PDP Tool Tests', () => {
    let mainModule;

    beforeEach(() => {
        // Reset process.env before each test
        process.env = { ...originalEnv };
        process.env.AIO_RUNTIME_NAMESPACE = 'test-namespace';
        process.env.AIO_RUNTIME_AUTH = 'test-auth';

        // Clear all mocks
        jest.clearAllMocks();
        jest.resetModules();

        // Reset mock functions
        mockOpenWhiskInstance.actions.invoke.mockReset();
        mockOpenWhiskInstance.rules.disable.mockReset();
        mockOpenWhiskInstance.rules.enable.mockReset();

        // Mock exit and console
        process.exit = jest.fn();
        console.log = jest.fn();
        console.error = jest.fn();
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    describe('Environment Variables', () => {
        it('should exit if AIO_RUNTIME_NAMESPACE is missing', () => {
            delete process.env.AIO_RUNTIME_NAMESPACE;
            require('../tools/refresh-pdps');

            expect(process.exit).toHaveBeenCalledWith(1);
            expect(console.log).toHaveBeenCalledWith(
                'Missing required environment variables AIO_RUNTIME_AUTH and AIO_RUNTIME_NAMESPACE'
            );
        });

        it('should exit if AIO_RUNTIME_AUTH is missing', () => {
            delete process.env.AIO_RUNTIME_AUTH;
            require('../tools/refresh-pdps');

            expect(process.exit).toHaveBeenCalledWith(1);
            expect(console.log).toHaveBeenCalledWith(
                'Missing required environment variables AIO_RUNTIME_AUTH and AIO_RUNTIME_NAMESPACE'
            );
        });
    });

    describe('checkState function', () => {
        beforeEach(() => {
            mainModule = require('../tools/refresh-pdps');
        });

        it('should return state value for given locale', async () => {
            const expectedState = { value: 'false' };
            mockOpenWhiskInstance.actions.invoke.mockResolvedValueOnce(expectedState);

            const result = await mainModule.checkState('en');

            expect(mockOpenWhiskInstance.actions.invoke).toHaveBeenCalledWith({
                name: 'state-manager',
                params: { key: 'en', op: 'get' },
                blocking: true,
                result: true
            });
            expect(result).toBe('false');
        });

        it('should handle errors when checking state', async () => {
            mockOpenWhiskInstance.actions.invoke.mockRejectedValueOnce(new Error('API Error'));
            await expect(mainModule.checkState('en')).rejects.toThrow('API Error');
        });
    });

    describe('flushStoreState function', () => {
        beforeEach(() => {
            mainModule = require('../tools/refresh-pdps');
        });

        it('should invoke delete operation for given locale', async () => {
            await mainModule.flushStoreState('en');

            expect(mockOpenWhiskInstance.actions.invoke).toHaveBeenCalledWith({
                name: 'state-manager',
                params: { key: 'en', op: 'delete' },
                blocking: true,
                result: true
            });
        });

        it('should handle errors when flushing state', async () => {
            mockOpenWhiskInstance.actions.invoke.mockRejectedValueOnce(new Error('Delete Error'));
            await expect(mainModule.flushStoreState('en')).rejects.toThrow('Delete Error');
        });
    });

    describe('main function', () => {
        beforeEach(() => {
            mainModule = require('../tools/refresh-pdps');
            mockOpenWhiskInstance.rules.disable.mockResolvedValue({});
            mockOpenWhiskInstance.rules.enable.mockResolvedValue({});
            mockOpenWhiskInstance.actions.invoke
                .mockResolvedValueOnce({ value: 'false' })
                .mockResolvedValueOnce({})
                .mockResolvedValueOnce({})
                .mockResolvedValueOnce({ value: 'true' });

            jest.useFakeTimers();
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        it('should successfully complete the state management cycle', async () => {
            const mainPromise = mainModule.main();
            jest.runAllTimers();
            await mainPromise;

            expect(mockOpenWhiskInstance.rules.disable).toHaveBeenCalledWith({
                name: 'poll_every_minute'
            });
            expect(mockOpenWhiskInstance.rules.enable).toHaveBeenCalledWith({
                name: 'poll_every_minute'
            });
            expect(process.exit).toHaveBeenCalledWith(0);
        });

        it('should timeout if running state never becomes true', async () => {
            mockOpenWhiskInstance.actions.invoke.mockResolvedValue({ value: 'false' });

            const timeout = 1500; // to simulate in the test env
            const mainPromise = mainModule.main(timeout);
            jest.advanceTimersByTime(1500);
            await mainPromise;

            expect(console.error).toHaveBeenCalledWith(
                'Timeout: running state did not become true within 30 minutes.'
            );
            expect(process.exit).toHaveBeenCalledWith(1);
        });
    });
});