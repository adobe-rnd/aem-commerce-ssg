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

async function performCoreQuery(query, operationName, variables, context) {
    const { storeUrl } = context;
    const config = await getConfig(context);
    const headers = {
      'Content-Type': 'application/json',
      Store: config['commerce-store-view-code'],
      Origin: storeUrl,
    };
    const method = 'POST';
    return performRequest(
      context,
      `${operationName}(${JSON.stringify(variables)})`,
      config['commerce-core-endpoint'],
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
  
  module.exports = { performCoreQuery, performSaaSQuery, queries };