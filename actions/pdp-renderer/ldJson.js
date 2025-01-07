const { requestSaaS } = require('../utils');
const { getProductUrl, findDescription, getPrimaryImage } = require('./lib');
const { VariantsQuery } = require('./queries');

function getOffer(product, url, gtin, image) {
  const { sku, inStock, price } = product;
  const offer = {
    '@type': 'Offer',
    sku,
    url,
    gtin,
    availability: inStock ? 'InStock' : 'OutOfStock',
    price: price?.final?.amount?.value,
    priceCurrency: price?.final?.amount?.currency,
  };
  if (image) {
    offer.image = image;
  }

  offer.itemCondition = 'NewCondition';

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

async function addOffers(ldJson, product, context) {
  const { '@id': url, gtin, image } = ldJson;

  ldJson.offers = [];
  if (product.__typename === 'ComplexProductView') {
    const variantsData = await requestSaaS(VariantsQuery, 'VariantsQuery', { sku: product.sku }, context);
    const variants = variantsData.data.variants.variants;

    for (const variant of variants) {
      const variantGtin = ''; // TODO: Add based on your data model
      const variantImage = getPrimaryImage(variant.product, null);

      const variantUrl = new URL(url);
      variantUrl.searchParams.append('optionsUIDs', variant.selections.join(','));

      const offer = getOffer(variant.product, variantUrl.toString(), variantGtin, variantImage?.url);
      ldJson.offers.push(offer);
    }
  } else {
    ldJson.offers.push(getOffer(product, url, gtin, image));
  }
}

async function generateLdJson(product, context) {
  const { name, sku, urlKey } = product;
  const image = getPrimaryImage(product);
  const url = getProductUrl(urlKey, sku, context);

  const ldJson = {
    '@context': 'http://schema.org',
    '@type': 'Product',
    sku,
    name,
    gtin: '', // TODO: Add based on your data model
    description: findDescription(product, ['shortDescription', 'metaDescription', 'description']),
    '@id': url,
  };

  if (image) {
    ldJson.image = image.url;
  }

  await addOffers(ldJson, product, context);

  // TODO: Add other data like aggregated reviews

  return JSON.stringify(ldJson);
}

module.exports = { generateLdJson };
