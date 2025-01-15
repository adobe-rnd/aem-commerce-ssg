const { requestSaaS } = require('../utils');
const { getProductUrl, findDescription, getPrimaryImage } = require('./lib');
const { VariantsQuery } = require('./queries');

function getOffer(product, url) {
  const { sku, inStock, price } = product;
  const offer = {
    '@type': 'Offer',
    sku,
    url,
    availability: inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    price: price?.final?.amount?.value,
    priceCurrency: price?.final?.amount?.currency,
    itemCondition: 'https://schema.org/NewCondition',
  };

  if (price?.final?.amount?.value < price?.regular?.amount?.value) {
    offer.priceSpecification = {
      '@type': 'UnitPriceSpecification',
      priceType: 'https://schema.org/ListPrice',
      price: price?.regular?.amount?.value,
      priceCurrency: price?.regular?.amount?.currency,
    };
  }

  return offer;
}

async function getVariants(baseProduct, url, axes, context) {
  const { logger } = context;
  const variantsData = await requestSaaS(VariantsQuery, 'VariantsQuery', { sku: baseProduct.sku }, context);
  const variants = variantsData.data.variants.variants;

  return variants.map(variant => {
    if (!variant.product) {
      logger.error(`Variant of product ${baseProduct?.sku} is null. Variant data is not correctly synchronized.`, variant);
      throw new Error('Product variant is null');
    }

    const variantImage = getPrimaryImage(variant.product, null);
    const variantUrl = new URL(url);
    variantUrl.searchParams.append('optionsUIDs', variant.selections.sort().join(','));

    const ldJson = {
      '@type': 'Product',
      sku: variant.product.sku,
      name: variant.product.name,
      gtin: '', // TODO: Add based on your data model (https://schema.org/gtin)
      image: getPrimaryImage(variant.product, null),
      offers: [getOffer(variant.product, variantUrl.toString())],
    };
    if (variantImage) {
      ldJson.image = variantImage.url;
    }
    for (let axis of axes) {
      const attribute = variant.product.attributes.find(attr => attr.name === axis);
      if (attribute) {
        ldJson[axis] = attribute.value;
      }
    }

    return ldJson;
  });
}

async function generateLdJson(product, context) {
  const { name, sku, urlKey, __typename } = product;
  const image = getPrimaryImage(product);
  const url = getProductUrl(urlKey, sku, context);
  const gtin = ''; // TODO: Add based on your data model (https://schema.org/gtin)

  let ldJson;
  if (__typename === 'SimpleProductView') {
    ldJson = {
      '@context': 'http://schema.org',
      '@type': 'Product',
      sku,
      name,
      gtin,
      description: findDescription(product, ['shortDescription', 'metaDescription', 'description']),
      '@id': url,
      offers: [getOffer(product, url, image ? image.url : null)],
    };
  } else if (__typename === 'ComplexProductView') {
    const axes = product.options.map(({ id }) => id);

    // TODO: Double check if your axis are a schema org property (e.g. https://schema.org/color) or a simple string
    const schemaOrgProperties = ['color', 'size'];

    ldJson = {
      '@context': 'http://schema.org',
      '@type': 'ProductGroup',
      sku,
      productGroupId: sku,
      name,
      gtin,
      variesBy: axes.map(axis => schemaOrgProperties.includes(axis) ? `https://schema.org/${axis}` : axis),
      description: findDescription(product, ['shortDescription', 'metaDescription', 'description']),
      '@id': url,
      hasVariant: await getVariants(product, url, axes, context),
    };
  } else {
    throw new Error('Unsupported product type');
  }

  if (image) {
    ldJson.image = image.url;
  }

  // TODO: Add other data like aggregated ratings (https://schema.org/AggregateRating),
  // shipping details (https://schema.org/OfferShippingDetails) and return policy (https://schema.org/MerchantReturnPolicy)

  return JSON.stringify(ldJson);
}

module.exports = { generateLdJson };
