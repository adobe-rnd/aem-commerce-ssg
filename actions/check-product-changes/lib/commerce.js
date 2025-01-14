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

const {getConfig} = require('./aem');
const {performRequest} = require('./util');

const queries = {
getAllSkus: `
  query getAllSkus {
    productSearch(phrase: "", page_size: 500) {
      items {
        productView {
          urlKey
          sku
        }
      }
    }
  }
`,
getLastModified: `
  query getLastModified($skus: [String]!) {
    products(skus: $skus) {
      sku
      urlKey
      lastModifiedAt
    }
  }
`,
getAllSkusPaginated: `
query getAllSkusPaginated($currentPage: Int!) {
	productSearch(phrase: "", page_size: 500, current_page: $currentPage) {
		items {
			productView {
				urlKey
				sku
			}
		}
	}
}
`,
};
  
  /**
   * Performs a SaaS query to the Commerce Catalog Service API.
   *
   * @param {string} query - The GraphQL query string.
   * @param {string} operationName - The name of the GraphQL operation.
   * @param {Object} variables - The variables for the GraphQL query.
   * @param {Object} context - The context object containing configuration and store URL.
   * @param {string} context.storeUrl - The store's base URL.
   * @returns {Promise<Object>} - The response from the Commerce Catalog Service API.
   */
  async function performSaaSQuery(query, operationName, variables, context) {
    const { storeUrl } = context;
    const config = await getConfig(context);
    const headers = {
      'Content-Type': 'application/json',
      origin: storeUrl,
      'magento-customer-group': config['commerce-customer-group'],
      'magento-environment-id': config['commerce-environment-id'],
      'magento-store-code': config['commerce-store-code'],
      'magento-store-view-code': config['commerce-store-view-code'],
      'magento-website-code': config['commerce-website-code'],
      'x-api-key': config['commerce-x-api-key'],
    };

    const method = 'POST';
    return performRequest(
      context,
      `${operationName}(${JSON.stringify(variables)})`,
      config['commerce-endpoint'],
      {
        method,
        headers,
        body: JSON.stringify({
          operationName,
          query,
          variables,
        }),
      },
    );
  }
  
  module.exports = { performSaaSQuery, queries };