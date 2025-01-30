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

require('dotenv').config();

const { program } = require('commander');
const { requestSaaS, requestSpreadsheet } = require('../actions/utils');
const { GetAllSkusPaginatedQuery } = require('../actions/queries');

async function main() {
    // TODO: fetch from app.config.yaml (incl. mapped env vars)?
    // https://jira.corp.adobe.com/browse/SITES-28254
    program
        .option('-h, --help', 'Display help for cli')
        .option('-s, --storecode <storecode>', 'Commerce Store Code')
        .option('-c, --config <config>', 'Config name')
        .option('-u, --url <url>', 'Root URL of the store')

    program.parse(process.argv);
    const options = program.opts();

    if (options.help || !options.storecode || !options.config || !options.url) {
        program.help();
    }

    const context = { storeCode: options.storecode, storeUrl: options.url, configName: options.config };
    const { total: actualCount } = await requestSpreadsheet('published-products-index', context);
    let [productsCount, currentPage, expectedCount] = [-1, 1, 0];
    while (productsCount !== 0) {
        const { data: { productSearch: { items: products } } } = await requestSaaS(GetAllSkusPaginatedQuery, 'getAllSkusPaginated', { currentPage }, context);
        productsCount = products.length;
        expectedCount += productsCount;
        currentPage++;
    }

    if (actualCount !== expectedCount) {
        throw new Error(`Expected ${expectedCount} products, but found ${actualCount} products`);
    }
}

main().catch(console.error);