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

    sample(name, elapsed) {
        if (elapsed === undefined) {
            elapsed = new Date() - this.lastTime;
        }
        this.measures[name] = elapsed;
        this.lastTime = new Date();
        return this;
    }
}

function aggregate(values) {
    const n = values.length;
    const max = n > 0 ? Math.max(...values) : 0;
    const min = n > 0 ? Math.min(...values) : 0;
    const avg = n > 0 ? values.reduce((a, b) => a + b, 0) / n : 0;
    return { max, min, avg, n };
}

module.exports = { Timings, aggregate };