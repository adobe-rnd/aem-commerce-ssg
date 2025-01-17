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
      attributes(roles: ["visible_in_pdp"]) {
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

const VariantsQuery = `query VariantsQuery($sku: String!) {
    variants(sku: $sku) {
      variants {
        selections
        product {
          sku
          name
          inStock
          images(roles: []) {
            url
            roles
          }
          attributes(roles: ["visible_in_pdp"]) {
            name
            label
            value
            roles
          }
          ... on SimpleProductView {
            price {
              roles
              regular {
                amount {
                  value
                  currency
                }
              }
              final {
                amount {
                  value
                  currency
                }
              }
            }
          }
        }
      }
    }
  }`;

const GetAllSkusQuery = `
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
`;

const GetLastModifiedQuery = `
  query getLastModified($skus: [String]!) {
    products(skus: $skus) {
      sku
      urlKey
      lastModifiedAt
    }
  }
`;

const GetAllSkusPaginatedQuery = `query getAllSkusPaginated($currentPage: Int!) {
	productSearch(phrase: "", page_size: 500, current_page: $currentPage) {
		items {
        productView {
          urlKey
          sku
        }
    }
	}
}
`;

module.exports = {
    ProductQuery,
    VariantsQuery,
    GetAllSkusQuery,
    GetAllSkusPaginatedQuery,
    GetLastModifiedQuery,
};