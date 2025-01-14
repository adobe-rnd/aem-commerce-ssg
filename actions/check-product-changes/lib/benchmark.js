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

class Timings {
    measures = {};
    lastTime = new Date();
    now = new Date();

    /**
     * Records a timing sample with the given name and elapsed time.
     * If the elapsed time is not provided, it calculates the elapsed time
     * since the last recorded time.
     *
     * @param {string} name - The name of the timing sample.
     * @param {number} [elapsed] - The elapsed time in milliseconds. If not provided, it will be calculated.
     * @returns {Timings} The current instance of the Timings class.
     */
    sample(name, elapsed) {
        if (elapsed === undefined) {
            elapsed = new Date() - this.lastTime;
        }
        this.measures[name] = elapsed;
        this.lastTime = new Date();
        return this;
    }
}

/**
 * Aggregates an array of numeric values to calculate the maximum, minimum, average, and count.
 *
 * @param {number[]} values - The array of numeric values to aggregate.
 * @returns {Object} An object containing the following properties:
 *   - {number} max - The maximum value in the array, or 0 if the array is empty.
 *   - {number} min - The minimum value in the array, or 0 if the array is empty.
 *   - {number} avg - The average value of the array, or 0 if the array is empty.
 *   - {number} n - The number of elements in the array.
 */
function aggregate(values) {
    const n = values.length;
    const max = n > 0 ? Math.max(...values) : 0;
    const min = n > 0 ? Math.min(...values) : 0;
    const avg = n > 0 ? values.reduce((a, b) => a + b, 0) / n : 0;
    return { max, min, avg, n };
}

module.exports = { Timings, aggregate };