const TEXT_PRECISION = 2
const LABEL_PADDING = 5

const clamp = (value, min, max) => {
    return Math.max(Math.min(value, max), min)
}

const colorToRgbString = (color) => {
    const [r, g, b] = color.map(v => v * 255)
    return `rgb(${r}, ${g}, ${b})`
}

class ColorMap {
    constructor (cssGradient) {
        this.steps = []
        this.colors = []

        let currInd = 0
        while (true) {
            const colorStart = cssGradient.indexOf('#', currInd)
            const colorEnd = cssGradient.indexOf(' ', currInd)
            const percentEnd = cssGradient.indexOf('%', currInd)
            if (colorStart < 0 || colorEnd < 0 || percentEnd < 0) {
                break
            }

            const color = cssGradient.substring(colorStart, colorEnd)
            const percentage = cssGradient.substring(colorEnd + 1, percentEnd)

            this.colors.push(hex_to_rgb(color))
            this.steps.push(parseFloat(percentage) / 100)

            currInd = percentEnd + 3
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

class ColorMapState {
    constructor (cssGradient) {
        this.colorMap = new ColorMap(cssGradient)

        this.data = []
        this.minValue = 0
        this.maxValue = 1
        this.lowValue = this.minValue
        this.highValue = this.maxValue
        this.lastLow = this.lowValue
        this.lastHigh = this.highValue
    }

    hasChanged () {
        return this.lowValue !== this.lastLow || this.highValue !== this.lastHigh
    }

    setData (data) {
        let newMin = Number.MAX_VALUE
        let newMax = Number.MIN_VALUE
        for (let i = 0; i < data.length; i++) {
            for (let j = 0; j < data[i].length; j++) {
                newMin = Math.min(newMin, data[i][j])
                newMax = Math.max(newMax, data[i][j])
            }
        }

        this.minValue = newMin
        this.maxValue = newMax
        this.lowValue = newMin
        this.highValue = newMax
        this.lastLow = newMin
        this.lastHigh = newMax
        this.data = data
    }

    setLow (percentage) {
        const newValue = (this.maxValue - this.minValue) * percentage + this.minValue
        this.lowValue = clamp(newValue, this.minValue, this.highValue)
    }

    setHigh (percentage) {
        const newValue = (this.maxValue - this.minValue) * percentage + this.minValue
        this.highValue = clamp(newValue, this.lowValue, this.maxValue)
    }

    getValue (ind, t) {
        if (ind === null) { return null }
        return this.data[t][ind]
    }

    map (t, g) {
        this.lastLow = this.lowValue
        this.lastHigh = this.highValue
        return this.colorMap.map(this.data[t][g], this.lowValue, this.highValue)
    }
}

class ColorMapSlider {
    constructor (cssGradient) {
        this.state = new ColorMapState(cssGradient)

        this.dragLeft = false
        this.dragRight = false

        this.bars = {
            wrap: document.getElementById('cm_bar'),
            low: document.getElementById('cm_low'),
            mid: document.getElementById('cm_g'),
            high: document.getElementById('cm_high')
        }
        this.handles = {
            low: document.getElementById('cm_h_low'),
            high: document.getElementById('cm_h_high')
        }
        this.labels = {
            min: document.getElementById('cm_min'),
            max: document.getElementById('cm_max'),
            low: document.getElementById('cm_low_val'),
            high: document.getElementById('cm_high_val')
        }
        this.hover = {
            section: document.getElementById('cm_hover_section'),
            line: document.getElementById('cm_hover_line'),
            label: document.getElementById('cm_hover_label')
        }
        this.button = document.getElementById('edit_color_map')

        const barWidth = this.bars.wrap.getBoundingClientRect().width
        this.bars.low.style.width = '0px'
        this.bars.mid.style.width = `${barWidth}px`
        this.bars.high.style.width = '0px'

        this.bars.low.style.background = colorToRgbString(this.state.colorMap.colors[0])
        this.bars.mid.style.background = 'linear-gradient(90deg,' + cssGradient + ')'
        this.bars.high.style.background = colorToRgbString(this.state.colorMap.colors[this.state.colorMap.colors.length - 1])

        this.handles.low.onmousedown = () => { this.dragLeft = true }
        this.handles.high.onmousedown = () => { this.dragRight = true }
        this.bars.low.onmousedown = () => { this.dragLeft = true }
        this.bars.high.onmousedown = () => { this.dragRight = true }
        this.button.onmouseup = () => { this.updateDom() }
        document.body.onmouseleave = () => {
            this.dragLeft = false
            this.dragRight = false
        }
    }

    setData (data) {
        this.state.setData(data)

        this.updateDom()
    }

    map (t, g) {
        return this.state.map(t, g)
    }

    mouseUp () {
        this.dragLeft = false
        this.dragRight = false
    }

    mouseMove (e) {
        if (!this.dragLeft && !this.dragRight) { return }

        const barBounds = this.bars.wrap.getBoundingClientRect()
        const newValue = (e.clientX - barBounds.left) / barBounds.width

        if (this.dragLeft) {
            this.state.setLow(newValue)
        } else if (this.dragRight) {
            this.state.setHigh(newValue)
        }

        this.updateDom()
    }

    updateDom () {
        const { minValue, maxValue, lowValue, highValue } = this.state

        const barWidth = this.bars.wrap.getBoundingClientRect().width
        const lowWidth = map(lowValue, minValue, maxValue, 0, barWidth)
        const highWidth = barWidth - map(highValue, minValue, maxValue, 0, barWidth)
        const midWidth = barWidth - lowWidth - highWidth
        this.bars.low.style.width = `${lowWidth}px`
        this.bars.mid.style.width = `${midWidth}px`
        this.bars.high.style.width = `${highWidth}px`

        this.labels.min.innerHTML = minValue.toFixed(TEXT_PRECISION)
        this.labels.max.innerHTML = maxValue.toFixed(TEXT_PRECISION)
        this.labels.low.innerHTML = lowValue.toFixed(TEXT_PRECISION)
        this.labels.high.innerHTML = highValue.toFixed(TEXT_PRECISION)

        const lowLabelWidth = this.labels.low.getBoundingClientRect().width
        const highLabelWidth = this.labels.high.getBoundingClientRect().width
        const idealLowLabelLeft = Math.max(lowWidth - lowLabelWidth * 0.5, 0)
        const idealHighLabelRight = Math.max(highWidth - highLabelWidth * 0.5, 0)

        // calculate overlap amount of low / high labels
        const totalLowLeft = idealLowLabelLeft + lowLabelWidth
        const totalHighLeft = barWidth - (idealHighLabelRight + highLabelWidth)
        const overlap = Math.max(totalLowLeft - totalHighLeft + LABEL_PADDING, 0)

        // if one label is at end of range, correct overlap scaling to prevent negative margins
        const overlapScale = idealLowLabelLeft !== 0 ? idealHighLabelRight !== 0 ? 0.5 : 1 : 0
        const lowLabelLeft = idealLowLabelLeft - overlap * overlapScale
        const highLabelRight = idealHighLabelRight - overlap * (1 - overlapScale)

        this.labels.low.style.marginLeft = `${lowLabelLeft}px`
        this.labels.high.style.marginRight = `${highLabelRight}px`

        if (this.state.hasChanged()) {
            this.button.classList.remove('hidden')
        } else {
            this.button.classList.add('hidden')
        }
    }

    updateHover (ind, t) {
        const hoverValue = this.state.getValue(ind, t)
        if (hoverValue === null || this.state.hasChanged()) {
            this.hover.section.classList.add('hidden')
        } else {
            this.hover.section.classList.remove('hidden')

            this.hover.label.innerHTML = hoverValue.toFixed(TEXT_PRECISION)

            const sectionWidth = this.hover.section.clientWidth
            const lineWidth = this.hover.line.clientWidth
            const labelWidth = this.hover.label.clientWidth

            const { minValue, maxValue } = this.state
            const centerPosition = map(hoverValue, minValue, maxValue, 0, sectionWidth)
            const linePosition = centerPosition - lineWidth * 0.5
            const labelPosition = clamp(centerPosition - labelWidth * 0.5, 0, sectionWidth - labelWidth)

            this.hover.line.style.marginLeft = `${linePosition}px`
            this.hover.label.style.marginLeft = `${labelPosition}px`
        }
    }
}
