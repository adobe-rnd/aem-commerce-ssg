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

const { findDescription, getPrimaryImage, extractPathDetails, generatePriceString } = require('../actions/pdp-renderer/lib');

describe('lib', () => {
    test('findDescription', () => {
        const product = {
            metaDescription: 'Meta description',
            shortDescription: 'Short description',
            description: 'Full description'
        };

        expect(findDescription(product)).toBe('Meta description');
        expect(findDescription(product, ['shortDescription', 'description'])).toBe('Short description');
        expect(findDescription({ ...product, shortDescription: null }, ['shortDescription', 'description'])).toBe('Full description');
        expect(findDescription({}, ['description'])).toBe('');
    });

    test('getPrimaryImage', () => {
        const product = {
            images: [
                { url: 'image1.jpg', roles: ['thumbnail'] },
                { url: 'image2.jpg', roles: ['image'] },
                { url: 'image3.jpg', roles: ['image', 'thumbnail'] }
            ]
        };

        expect(getPrimaryImage(product)).toEqual({ url: 'image2.jpg', roles: ['image'] });
        expect(getPrimaryImage(product, 'thumbnail')).toEqual({ url: 'image1.jpg', roles: ['thumbnail'] });
        expect(getPrimaryImage(null)).toBeUndefined();
        expect(getPrimaryImage({})).toBeUndefined();
        expect(getPrimaryImage({ images: [] })).toBeUndefined();
    });


    describe('extractPathDetails', () => {
        test('extract sku and urlKey from path', () => {
            expect(extractPathDetails('/products/my-url-key/my-sku', '/products/{urlKey}/{sku}')).toEqual({ sku: 'my-sku', urlKey: 'my-url-key' });
        });
        test('extract urlKey from path', () => {
            expect(extractPathDetails('/my-url-key', '/{urlKey}')).toEqual({ urlKey: 'my-url-key' });
        });
        test('throw error if path is too long', () => {
            expect(() => extractPathDetails('/products/my-url-key/my-sku', '/products/{urlKey}')).toThrow(`Invalid path. Expected '/products/{urlKey}' format.`);
        });
        test('throw error if static part of path does not match', () => {
            expect(() => extractPathDetails('/product/my-sku', '/products/{sku}')).toThrow(`Invalid path. Expected '/products/{sku}' format.`);
        });
        test('empty object for empty path', () => {
            expect(extractPathDetails('')).toEqual({});
        });
        test('empty object for null path', () => {
            expect(extractPathDetails(null)).toEqual({});
        });
    });

    test('generatePriceString', () => {
        const value100 = { amount: { value: 100, currency: 'EUR' }};
        const value80 = { amount: { value: 80, currency: 'EUR' }};
        const value60 = { amount: { value: 60, currency: 'EUR' }};

        // Range
        // Minimum discounted, maximum normal
        expect(generatePriceString({ priceRange: { minimum: { regular: value100, final: value80 }, maximum: { regular: value100, final: value100 }}})).toBe('<s>€100.00</s> €80.00-€100.00');

        // Minimum normal, maximum discounted
        expect(generatePriceString({ priceRange: { minimum: { regular: value100, final: value100 }, maximum: { regular: value100, final: value80 }}})).toBe('€100.00-<s>€100.00</s> €80.00');

        // Both discounted
        expect(generatePriceString({ priceRange: { minimum: { regular: value80, final: value60 }, maximum: { regular: value100, final: value80 }}})).toBe('<s>€80.00</s> €60.00-<s>€100.00</s> €80.00');

        // Equal range
        // With discount
        expect(generatePriceString({ priceRange: { minimum: { regular: value80, final: value60 }, maximum: { regular: value100, final: value60 }}})).toBe('<s>€80.00</s> €60.00');

        // Without discount
        expect(generatePriceString({ priceRange: { minimum: { regular: value80, final: value80 }, maximum: { regular: value80, final: value80 }}})).toBe('€80.00');

        // No range
        // With discount
        expect(generatePriceString({ price: { regular: value100, final: value80 }})).toBe('<s>€100.00</s> €80.00');

        // No discount
        expect(generatePriceString({ price: { regular: value100, final: value100 }})).toBe('€100.00');
    });
});