class ColorMap {
    constructor (cssGradient) {
        this.steps = []
        this.colors = []

        let currInd = 0
        while (true) {
            const a = cssGradient.indexOf('#', currInd)
            const b = cssGradient.indexOf(' ', currInd)
            const c = cssGradient.indexOf('%', currInd)
            currInd = c + 3
            if (a < 0 || b < 0 || c < 0) {
                break
            }

            this.colors.push(hex_to_rgb(cssGradient.substring(a, b)))
            this.steps.push(parseFloat(cssGradient.substring(b + 1, c)) / 100)
        }
    }

    map (value, low, high) {
        if (value <= low) { return this.colors[0] }
        if (value >= high) { return this.colors[this.colors.length - 1] }

        let i = 0
        const percentage = (value - low) / (high - low)
        while (i + 1 < this.steps.length && this.steps[i + 1] < percentage) {
            i++
        }
        if (i === this.steps.length - 1) { return this.colors[i] }

        const mid = (percentage - this.steps[i]) / (this.steps[i + 1] - this.steps[i])
        const [r0, g0, b0] = this.colors[i]
        const [r1, g1, b1] = this.colors[i + 1]
        return [
            r0 * (1 - mid) + r1 * mid,
            g0 * (1 - mid) + g1 * mid,
            b0 * (1 - mid) + b1 * mid
        ]
    }
}
