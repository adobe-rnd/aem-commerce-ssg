
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