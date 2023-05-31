class ColorMapSlider {
    constructor (css_def) {
        this.elements = {
            bar: document.getElementById('cm_bar'),
            bars: {
                low: document.getElementById('cm_low'),
                gradient: document.getElementById('cm_g'),
                high: document.getElementById('cm_high')
            },
            handles: {
                low: document.getElementById('cm_h_low'),
                high: document.getElementById('cm_h_high')
            },
            labels: {
                min: document.getElementById('cm_min'),
                max: document.getElementById('cm_max'),
                low: document.getElementById('cm_low_val'),
                high: document.getElementById('cm_high_val')
            },
            hover: {
                section: document.getElementById('cm_hover_section'),
                line: document.getElementById('cm_hover_line'),
                label: document.getElementById('cm_hover_label')
            },
            button: document.getElementById('edit_color_map')
        }

        this.map = new ColorMap(css_def)

        const body_rect = this.elements.bar.getBoundingClientRect()

        this.elements.bars.low.style.width = '0px'
        this.elements.bars.gradient.style.width = body_rect.width.toString() + 'px'
        this.elements.bars.high.style.width = '0px'

        this.elements.bars.gradient.style.background = 'linear-gradient(90deg,' + css_def + ')'
        this.elements.bars.low.style.background = 'rgb(' + (this.map.colors[0].r * 255).toString() + ',' + (this.map.colors[0].g * 255).toString() + ',' + (this.map.colors[0].b * 255).toString() + ')'
        this.elements.bars.high.style.background = 'rgb(' + (this.map.colors[this.map.colors.length - 1].r * 255).toString() + ',' + (this.map.colors[this.map.colors.length - 1].g * 255).toString() + ',' + (this.map.colors[this.map.colors.length - 1].b * 255).toString() + ')'

        this.values = {
            low: 0,
            high: 1,
            min: 0,
            max: 1
        }

        this.elements.labels.min.innerHTML = 0
        this.elements.labels.max.innerHTML = 1
        this.elements.labels.low.innerHTML = 0
        this.elements.labels.high.innerHTML = 1

        this.data = []

        this.dragging = { left: false, right: false }

        this.elements.handles.low.onmousedown = () => { this.dragging.left = true }
        this.elements.handles.high.onmousedown = () => { this.dragging.right = true }
        this.elements.bars.low.onmousedown = () => { this.dragging.left = true }
        this.elements.bars.high.onmousedown = () => { this.dragging.right = true }
    }

    change_data (data) {
        this.data = data
        this.values.max = -10000000
        this.values.min = 10000000
        for (let t = 0; t < this.data.length; t++) {
            for (let g = 0; g < this.data[t].length; g++) {
                this.values.max = Math.max(this.values.max, this.data[t][g])
                this.values.min = Math.min(this.values.min, this.data[t][g])
            }
        }
        this.values.low = this.values.min
        this.values.high = this.values.max

        this.elements.labels.min.innerHTML = this.values.min.toFixed(2)
        this.elements.labels.max.innerHTML = this.values.max.toFixed(2)
        this.elements.labels.low.innerHTML = this.values.min.toFixed(2)
        this.elements.labels.high.innerHTML = this.values.max.toFixed(2)

        const body_rect = this.elements.bar.getBoundingClientRect()

        this.elements.bars.low.style.width = '0px'
        this.elements.bars.gradient.style.width = body_rect.width.toString() + 'px'
        this.elements.bars.high.style.width = '0px'

        this.elements.labels.low.style.marginLeft = '0px'
        this.elements.labels.high.style.marginRight = '0px'

        remove_class(document.getElementById('color_map_container'), ' hidden')
    }

    update_hover (ind, t) {
        if (ind < 0) {
            add_class(this.elements.hover.section, ' hidden')
        } else {
            remove_class(this.elements.hover.section, ' hidden')

            this.elements.hover.label.innerHTML = this.data[t][ind].toFixed(2)
            let pos = map(this.data[t][ind], this.values.min, this.values.max, 0, this.elements.hover.section.clientWidth)
            this.elements.hover.line.style.marginLeft = (pos - this.elements.hover.line.clientWidth / 2).toString() + 'px'
            pos = pos - this.elements.hover.label.clientWidth / 2
            pos = min(max(pos, 0), this.elements.hover.section.clientWidth - this.elements.hover.label.clientWidth)
            this.elements.hover.label.style.marginLeft = pos.toString() + 'px'
        }
    }

    mouseup () {
        if (this.dragging.left || this.dragging.right) {
            remove_class(this.elements.button, ' hidden')
        }
        this.dragging.left = false
        this.dragging.right = false
    }

    mousemove (e) {
        if (this.dragging.left) {
            const body_rect = this.elements.bar.getBoundingClientRect()
            const right_rect = this.elements.bars.high.getBoundingClientRect()

            const low_width = min(max(e.clientX - body_rect.left, 0), right_rect.left - body_rect.left)
            this.elements.bars.low.style.width = low_width.toString() + 'px'
            this.elements.bars.gradient.style.width = (body_rect.width - right_rect.width - low_width).toString() + 'px'

            this.values.low = (low_width / body_rect.width) * (this.values.max - this.values.min) + this.values.min
            this.elements.labels.low.innerHTML = this.values.low.toFixed(2)

            const low_label_rect = this.elements.labels.low.getBoundingClientRect()
            const high_label_rect = this.elements.labels.high.getBoundingClientRect()
            const label_left = min(max(low_width - low_label_rect.width / 2, 0), low_label_rect.right - body_rect.left + (high_label_rect.left - low_label_rect.right) / 2 - low_label_rect.width - 2.5)
            this.elements.labels.low.style.marginLeft = label_left.toString() + 'px'
            const label_right = min(max(right_rect.width - high_label_rect.width / 2, 0), body_rect.right - high_label_rect.left + (high_label_rect.left - low_label_rect.right) / 2 - high_label_rect.width - 2.5)
            this.elements.labels.high.style.marginRight = label_right.toString() + 'px'
        } else if (this.dragging.right) {
            const body_rect = this.elements.bar.getBoundingClientRect()
            const left_rect = this.elements.bars.low.getBoundingClientRect()

            const high_width = min(max(body_rect.right - e.clientX, 0), body_rect.right - left_rect.right)
            this.elements.bars.high.style.width = high_width.toString() + 'px'
            this.elements.bars.gradient.style.width = (body_rect.width - left_rect.width - high_width).toString() + 'px'

            this.values.high = (1 - high_width / body_rect.width) * (this.values.max - this.values.min) + this.values.min
            this.elements.labels.high.innerHTML = this.values.high.toFixed(2)

            const low_label_rect = this.elements.labels.low.getBoundingClientRect()
            const high_label_rect = this.elements.labels.high.getBoundingClientRect()
            const label_right = min(max(high_width - high_label_rect.width / 2, 0), body_rect.right - high_label_rect.left + (high_label_rect.left - low_label_rect.right) / 2 - high_label_rect.width - 2.5)
            this.elements.labels.high.style.marginRight = label_right.toString() + 'px'
            const label_left = min(max(left_rect.width - low_label_rect.width / 2, 0), low_label_rect.right - body_rect.left + (high_label_rect.left - low_label_rect.right) / 2 - low_label_rect.width - 2.5)
            this.elements.labels.low.style.marginLeft = label_left.toString() + 'px'
        }
    }

    color_map (t, g) {
        if (this.data.length === 1) {
            t = 1
        } else if (t > this.data.length) {
            return
        }
        return this.map.map(this.data[t][g], this.values.low, this.values.high)
    }
}
