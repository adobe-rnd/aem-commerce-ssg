const striptags = require('striptags');

/**
 * Extracts the SKU from the path.
 * @param {string} path The path.
 * @returns {Object} An object containing the SKU.
 * @throws Throws an error if the path is invalid.
 */
function extractPathDetails(path) {
  if (!path) {
    return {};
  }
  // TODO: Extend to support store code as well if configured

  // Strip leading slash if present
  if (path.startsWith('/')) {
    path = path.substring(1);
  }

  const pathParts = path.split('/');
  if (pathParts.length !== 3 || pathParts[0] !== 'products') {
    throw new Error(`Invalid path. Expected '/products/{urlKey}/{sku}'`);
  }

  const sku = pathParts[2].toUpperCase();

  return { sku };
}

/**
 * Constructs the URL of a product.
 *
 * @param {string} urlKey The url key of the product.
 * @param {string} sku The sku of the product.
 * @param {Object} context The context object containing the store URL.
 * @returns {string} The product url.
 */
function getProductUrl(urlKey, sku, context) {
  const { storeUrl } = context;
  return `${storeUrl}/products/${urlKey}/${sku}`;
}

/**
 * Finds the description of a product based on a priority list of fields.
 * @param {Object} product The product object.
 * @param {Array<string>} priority The list of fields to check for the description, in order of priority.
 * @returns {string} The description of the product.
 */
function findDescription(product, priority = ['metaDescription', 'shortDescription', 'description']) {
  return priority
    .map(d => product[d]?.trim() || '')
    .map(d => striptags(d))
    .map(d => d.replace(/\r?\n|\r/g, ''))
    .find(d => d.length > 0) || '';
}

/**
 * Returns the first image of a product based on the specified role or the first image if no role is specified.
 * @param {Object} product The product.
 * @param {string} [role='image'] The role of the image to find.
 * @returns {Object|undefined} The primary image object or undefined if not found.
 */
function getPrimaryImage(product, role = 'image') {
  if (role) {
    return product?.images?.find(img => img.roles.includes(role));
  }

  return product?.images?.length > 0 ? product?.images?.[0] : undefined;
}

module.exports = { extractPathDetails, getProductUrl, findDescription, getPrimaryImage };
