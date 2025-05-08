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

const { Core, Files } = require('@adobe/aio-sdk');

/**
 * Retrieves the properties of files in the root directory
 * @param {object} params - Action parameters
 * @returns {object} Object containing the directory properties
 */
async function main(params) {
  // Initialize the logger
  const logger = Core.Logger('main', { level: params.LOG_LEVEL || 'info' });
  
  try {
    // Initialize the Files SDK
    const filesLib = await Files.init();
    
    // Create a test file
    logger.info('Creating mock file');
    const testFileName = '/test-dir';
    const testFileContent = Buffer.from('This is a mock file');
    await filesLib.write(testFileName, testFileContent);
    
    // Get properties of the test file
    logger.info(`Retrieving properties for "${testFileName}"`);
    const fileProperties = await filesLib.getProperties(testFileName);
    
    // Extract the ID from the URL
    const url = fileProperties.url;
    // Extract just the base URL without the file path
    const baseUrl = url.match(/(https:\/\/[^"'\s]+?)\/[^\/]+$/)?.[1] || null;
    if (!baseUrl) {
      throw new Error('Failed to extract base URL');
    }
    logger.info(`Extracted base URL: ${baseUrl}`);
    
    // Delete the test file
    logger.info(`Deleting test file "${testFileName}"`);
    await filesLib.delete(testFileName);
    
    logger.info('Operation completed successfully');
    return { overlayUrl: `${baseUrl}-public/public/pdps` };
  } catch (error) {
    logger.error(`Error during file operations: ${error.message}`);
    return {
      error: 'Failed to complete the operations',
      message: error.message
    };
  }
}

exports.main = main;
