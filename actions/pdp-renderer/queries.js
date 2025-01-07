const ProductQuery = `query ProductQuery($sku: String!) {
    products(skus: [$sku]) {
      __typename
      id
      sku
      name
      url
      description
      shortDescription
      metaDescription
      metaKeyword
      metaTitle
      urlKey
      inStock
      externalId
      lastModifiedAt
      images(roles: []) {
        url
        label
        roles
      }
      attributes(roles: []) {
        name
        label
        value
        roles
      }
      ... on SimpleProductView {
        price {
          ...priceFields
        }
      }
      ... on ComplexProductView {
        options {
          id
          title
          required
          values {
            id
            title
            inStock
            ... on ProductViewOptionValueSwatch {
              type
              value
            }
          }
        }
        priceRange {
          maximum {
            ...priceFields
          }
          minimum {
            ...priceFields
          }
        }
      }
    }
  }
  fragment priceFields on ProductViewPrice {
    roles
    regular {
      amount {
        currency
        value
      }
    }
    final {
      amount {
        currency
        value
      }
    }
  }`;

module.exports = { ProductQuery };