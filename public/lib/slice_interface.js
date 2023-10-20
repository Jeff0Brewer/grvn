class SliceInterface {
    constructor (width, height, lineColor, fillColor, crossSize) {
        this.line_color = lineColor
        this.fill_color = fillColor
        this.cross_size = crossSize

        this.canvas = document.getElementById('slicecanvas')
        this.canvas.width = width
        this.canvas.height = height
        this.ctx = this.canvas.getContext('2d')
        this.ctx.strokeStyle = lineColor
        this.ctx.fillStyle = fillColor

        this.apply_button = document.getElementById('apply_slice')

        this.state = 0
        this.viewports = []
        this.slice_viewport = -1
        this.slice_points = []
        this.output = []
        this.new_planes = false

        this.canvas.onmousedown = e => {
            if (this.state === 2) {
                this.apply_button.classList.add('apply_loading')
            }
        }

        this.canvas.onmouseup = e => {
            if (this.state === 2) {
                this.apply_button.classList.remove('apply_loading')
            }
            this.click(e.clientX, e.clientY)
        }

        this.canvas.onmousemove = e => {
            this.hover(e.clientX, e.clientY)
        }

        this.apply_button.onmouseup = () => {
            this.select()
        }
    }

    get_output () {
        this.new_planes = false
        return [this.output, this.slice_viewport]
    }

    activate (viewports) {
        this.viewports = viewports
        this.canvas.style.pointerEvents = 'auto'
        this.slice_points = []
        this.state = 0
        this.output = []
    }

    deactivate () {
        this.apply_button.classList.add('hidden')
        this.canvas.style.pointerEvents = 'none'
        this.ctx.restore()
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
        this.new_planes = true
    }

    cancel () {
        if (this.canvas.style.pointerEvents == 'auto') {
            this.canvas.style.pointerEvents = 'none'
            this.ctx.restore()
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
            this.slice_points = []
            this.output = []
            this.new_planes = false
            this.state = 0
            this.apply_button.classList.add('hidden')
        }
    }

    click (x, y) {
        switch (this.state) {
            case 0:
                for (let i = 0; i < viewports.length; i++) {
                    if (viewports[i].hitTest(x, y)) {
                        this.slice_viewport = viewports[i]
                    } else {
                        this.ctx.fillRect(viewports[i].x, viewports[i].y, viewports[i].width, viewports[i].height)
                    }
                }

                this.ctx.save()
                this.ctx.beginPath()
                this.ctx.moveTo(this.slice_viewport.x, this.slice_viewport.y)
                this.ctx.lineTo(this.slice_viewport.x + this.slice_viewport.width, this.slice_viewport.y)
                this.ctx.lineTo(this.slice_viewport.x + this.slice_viewport.width, this.slice_viewport.y + this.slice_viewport.height)
                this.ctx.lineTo(this.slice_viewport.x, this.slice_viewport.y + this.slice_viewport.height)
                this.ctx.lineTo(this.slice_viewport.x, this.slice_viewport.y)
                this.ctx.clip()

                this.apply_button.classList.remove('hidden')
                this.apply_button.style.left = (this.slice_viewport.x + (this.slice_viewport.width - this.apply_button.clientWidth) / 2).toString() + 'px'
                this.apply_button.style.top = (this.slice_viewport.y + 9 * (this.slice_viewport.height - this.apply_button.clientHeight) / 10).toString() + 'px'

                this.state = 1

                this.slice_points.push([x, y])
                break
            case 1:
                this.slice_points.push([x, y])
                break
            case 2:
                for (let i = 0; i + 1 < this.slice_points.length; i += 2) {
                    this.output.push([
                        this.slice_points[i],
                        this.slice_points[i + 1],
                        -1 * Math.sign(dist_point_line([x, y], this.slice_points.slice(i, i + 2)))
                    ])
                }
                this.deactivate()
                break
        }
    }

    hover (x, y) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
        if (this.state == 0) {
            for (let i = 0; i < this.viewports.length; i++) {
                if (!viewports[i].hitTest(x, y)) {
                    this.ctx.fillRect(viewports[i].x, viewports[i].y, viewports[i].width, viewports[i].height)
                }
            }
        } else {
            for (let i = 0; i + 1 < this.slice_points.length; i += 2) {
                const slope = (this.slice_points[i + 1][1] - this.slice_points[i][1]) / (this.slice_points[i + 1][0] - this.slice_points[i][0])

                const p0 = [this.slice_points[i][0] + this.canvas.width, this.slice_points[i][1] + slope * this.canvas.width]
                const p1 = [this.slice_points[i][0] - this.canvas.width, this.slice_points[i][1] - slope * this.canvas.width]

                if (this.state == 2) {
                    const line_length = dist(p0, p1)
                    const line = sub(this.slice_points[i + 1], this.slice_points[i])
                    const axis = [1, 0]
                    let angle = angle_between(axis, line)
                    if (this.slice_points[i][1] > this.slice_points[i + 1][1]) { angle *= -1 }
                    const side = -1 * Math.sign(dist_point_line([x, y], this.slice_points.slice(i, i + 2)))

                    this.ctx.save()
                    this.ctx.translate(p0[0], p0[1])
                    this.ctx.rotate(angle)
                    this.ctx.fillRect(-line_length, 0, 2 * line_length, -1 * side * line_length)
                    this.ctx.restore()
                }
            }
            for (let i = 0; i + 1 < this.slice_points.length; i += 2) {
                const slope = (this.slice_points[i + 1][1] - this.slice_points[i][1]) / (this.slice_points[i + 1][0] - this.slice_points[i][0])

                const p0 = [this.slice_points[i][0] + this.canvas.width, this.slice_points[i][1] + slope * this.canvas.width]
                const p1 = [this.slice_points[i][0] - this.canvas.width, this.slice_points[i][1] - slope * this.canvas.width]

                this.ctx.beginPath()
                this.ctx.moveTo(p0[0], p0[1])
                this.ctx.lineTo(p1[0], p1[1])
                this.ctx.stroke()
            }
        }
        if (this.state != 2) {
            if (this.slice_points.length % 2 == 1) {
                const i = this.slice_points.length - 1
                this.ctx.beginPath()
                this.ctx.moveTo(this.slice_points[i][0], this.slice_points[i][1])
                this.ctx.lineTo(x, y)
                this.ctx.stroke()

                this.draw_cross(this.slice_points[i][0], this.slice_points[i][1])
            }

            this.draw_cross(x, y)
        }
    }

    draw_cross (x, y) {
        this.ctx.lineWidth = this.cross_size / 6
        this.ctx.beginPath()
        this.ctx.moveTo(x - this.cross_size / 2, y)
        this.ctx.lineTo(x + this.cross_size / 2, y)
        this.ctx.moveTo(x, y - this.cross_size / 2)
        this.ctx.lineTo(x, y + this.cross_size / 2)
        this.ctx.stroke()
        this.ctx.lineWidth = 1
    }

    select () {
        this.state = 2
    }

    resize (w, h) {
        this.canvas.width = w
        this.canvas.height = h
        this.ctx.strokeStyle = this.line_color
        this.ctx.fillStyle = this.fill_color
    }
}
