class ColorMap {
    constructor (css_def) {
        this.steps = []
        this.colors = []

        let curr_ind = 0
        while (true) {
            const a = css_def.indexOf('#', curr_ind)
            const b = css_def.indexOf(' ', curr_ind)
            const c = css_def.indexOf('%', curr_ind)
            curr_ind = c + 3
            if (a < 0 || b < 0 || c < 0) { break }
            this.colors.push(hex_to_rgb(css_def.substring(a, b)))
            this.steps.push(parseFloat(css_def.substring(b + 1, c)) / 100)
        }
    }

    map (value, low, high) {
        if (value <= low) {
            return this.colors[0]
        }
        if (value >= high) {
            return this.colors[this.colors.length - 1]
        }

        const percentage = (value - low) / (high - low)
        let i = 0
        while (i + 1 < this.steps.length && this.steps[i + 1] < percentage) {
            i++
        }
        if (i >= this.steps.length - 1) {
            return this.colors[i]
        }
        const mid = (percentage - this.steps[i]) / (this.steps[i + 1] - this.steps[i])
        return {
            r: this.colors[i].r * (1 - mid) + this.colors[i + 1].r * mid,
            g: this.colors[i].g * (1 - mid) + this.colors[i + 1].g * mid,
            b: this.colors[i].b * (1 - mid) + this.colors[i + 1].b * mid
        }
    }
}
