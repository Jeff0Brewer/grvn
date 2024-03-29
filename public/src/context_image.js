class ContextImage {
    constructor (bg_color, hl_color, positions) {
        this.canvas = document.getElementById('context_image')
        this.canvas.width = this.canvas.clientWidth
        this.canvas.height = this.canvas.clientHeight
        this.ctx = this.canvas.getContext('2d')

        // print loading message while borders being calculated
        this.ctx.font = '12px sans-serif'
        this.ctx.fillStyle = '#fff'
        this.ctx.textAlign = 'center'
        this.ctx.fillText('loading...', this.canvas.width / 2, this.canvas.height / 2)

        this.ctx.transform(1, 0, 0, -1, 0, this.canvas.height)

        this.bg_color = bg_color
        this.hl_color = hl_color
        this.point_size = 4

        this.scaling = this.canvas.height / 2100

        this.last_t = -1
        this.last_subset = []

        this.border_sides = []
        this.border_tops = []
        this.slice_sides = []
        this.slice_tops = []

        this.worker = new Worker('./src/context-img-hull.js')

        this.worker.onmessage = ({ data }) => {
            const { sideBorders, topBorders, id } = data
            if (id === 'border') {
                this.border_sides = sideBorders
                this.border_tops = topBorders
            } else {
                this.slice_sides = sideBorders
                this.slice_tops = topBorders
            }
        }
        this.worker.postMessage({
            positions,
            scaling: this.scaling,
            delta: 20,
            id: 'border'
        })
    }

    draw (t, subset) {
        if (!this.border_sides.length || !this.border_tops.length) { return }
        if (this.last_t != t || !arrays_equal(this.last_subset, subset)) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
            this.ctx.fillStyle = this.bg_color
            this.ctx.lineWidth = 4

            this.ctx.save()

            this.ctx.translate(this.canvas.width / 4, this.canvas.height / 10)

            // draw side view
            if (this.slice_sides.length == 0 && !subset) { this.ctx.fillStyle = this.hl_color } else { this.ctx.fillStyle = this.bg_color }
            this.ctx.beginPath()
            this.ctx.moveTo(this.border_sides[t][0][0], this.border_sides[t][0][1])
            for (let i = 1; i < this.border_sides[t].length; i++) {
                this.ctx.lineTo(this.border_sides[t][i][0], this.border_sides[t][i][1])
            }
            this.ctx.fill()

            this.ctx.fillStyle = this.hl_color
            if (subset) {
                for (let i = 0; i < subset.length; i++) {
                    this.ctx.fillRect(subset[i][0] * this.scaling - this.point_size / 2, subset[i][2] * this.scaling - this.point_size / 2, this.point_size, this.point_size)
                }
            } else if (this.slice_sides[t] && this.slice_sides[t].length > 0) {
                this.ctx.beginPath()
                this.ctx.moveTo(this.slice_sides[t][0][0], this.slice_sides[t][0][1])
                for (let i = 1; i < this.slice_sides[t].length; i++) {
                    this.ctx.lineTo(this.slice_sides[t][i][0], this.slice_sides[t][i][1])
                }
                this.ctx.fill()
            }

            this.ctx.restore()
            this.ctx.save()

            this.ctx.translate(this.canvas.width - this.canvas.width / 4, this.canvas.height / 2)

            // draw top view
            if (this.slice_sides.length == 0 && !subset) { this.ctx.fillStyle = this.hl_color } else { this.ctx.fillStyle = this.bg_color }
            this.ctx.beginPath()
            this.ctx.moveTo(this.border_tops[t][0][0], this.border_tops[t][0][1])
            for (let i = 1; i < this.border_tops[t].length; i++) {
                this.ctx.lineTo(this.border_tops[t][i][0], this.border_tops[t][i][1])
            }
            this.ctx.fill()

            this.ctx.fillStyle = this.hl_color
            if (subset) {
                for (let i = 0; i < subset.length; i++) {
                    this.ctx.fillRect(subset[i][0] * this.scaling - this.point_size / 2, subset[i][1] * this.scaling - this.point_size / 2, this.point_size, this.point_size)
                }
            } else if (this.slice_tops[t] && this.slice_tops[t].length > 0) {
                this.ctx.beginPath()
                this.ctx.moveTo(this.slice_tops[t][0][0], this.slice_tops[t][0][1])
                for (let i = 1; i < this.slice_tops[t].length; i++) {
                    this.ctx.lineTo(this.slice_tops[t][i][0], this.slice_tops[t][i][1])
                }
                this.ctx.fill()
            }

            this.ctx.restore()
        }
    }

    update_slices (sliced) {
        this.worker.postMessage({
            positions: sliced,
            scaling: this.scaling,
            delta: 10,
            id: 'slices'
        })
    }
}
