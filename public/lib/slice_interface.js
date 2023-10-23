// slice interface states
const PICK_VIEWPORT = 0
const DRAW_LINES = 1
const SELECT_AREA = 2

class SliceInterface {
    constructor (width, height, cursorSize, strokeStyle, fillStyle) {
        this.line_color = strokeStyle
        this.fill_color = fillStyle
        this.cross_size = cursorSize

        this.button = document.getElementById('apply_slice')

        this.canvas = document.getElementById('slicecanvas')
        this.canvas.width = width
        this.canvas.height = height

        this.ctx = this.canvas.getContext('2d')
        this.ctx.strokeStyle = strokeStyle
        this.ctx.fillStyle = fillStyle

        this.state = PICK_VIEWPORT

        this.viewport = null
        this.viewports = []
        this.points = []
        this.lines = []

        this.canvas.onmousedown = e => { this.mousedown(e) }
        this.canvas.onmousemove = e => { this.mousemove(e) }
        this.button.onmouseup = () => { this.state = SELECT_AREA }
    }

    hasOutput () {
        return this.lines.length > 0
    }

    getOutput () {
        const output = {
            lines: this.lines,
            viewport: this.viewport
        }
        this.lines = []
        this.viewport = null
        return output
    }

    activate (viewports) {
        this.state = PICK_VIEWPORT
        this.viewports = viewports
        this.canvas.style.pointerEvents = 'auto'
        this.points = []
        this.lines = []
    }

    deactivate () {
        this.button.classList.add('hidden')
        this.canvas.style.pointerEvents = 'none'
        this.ctx.restore()
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    }

    mousedown (e) {
        const mousePos = [e.clientX, e.clientY]
        switch (this.state) {
            case PICK_VIEWPORT:
                for (const viewport of this.viewports) {
                    if (viewport.hitTest(...mousePos)) {
                        this.viewport = viewport
                    } else {
                        fillViewport(this.ctx, viewport)
                    }
                }
                clipViewport(this.ctx, this.viewport)
                this.centerButtonInViewport(this.viewport)

                this.points.push([e.clientX, e.clientY])
                this.state = DRAW_LINES
                break

            case DRAW_LINES:
                this.points.push(mousePos)
                if (this.points.length > 1) {
                    this.button.classList.remove('hidden')
                }
                break
            case SELECT_AREA:
                for (let i = 0; i + 1 < this.points.length; i += 2) {
                    const pair = this.points.slice(i, i + 2)
                    const clickSide = Math.sign(dist_point_line(mousePos, pair)) * -1
                    this.lines.push([pair[0], pair[1], clickSide])
                }
                this.deactivate()
                break
        }
    }

    mousemove (e) {
        const x = e.clientX
        const y = e.clientY
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
        if (this.state == PICK_VIEWPORT) {
            for (let i = 0; i < this.viewports.length; i++) {
                if (!viewports[i].hitTest(x, y)) {
                    this.ctx.fillRect(viewports[i].x, viewports[i].y, viewports[i].width, viewports[i].height)
                }
            }
        } else {
            for (let i = 0; i + 1 < this.points.length; i += 2) {
                const slope = (this.points[i + 1][1] - this.points[i][1]) / (this.points[i + 1][0] - this.points[i][0])

                const p0 = [this.points[i][0] + this.canvas.width, this.points[i][1] + slope * this.canvas.width]
                const p1 = [this.points[i][0] - this.canvas.width, this.points[i][1] - slope * this.canvas.width]

                if (this.state == SELECT_AREA) {
                    const line_length = dist(p0, p1)
                    const line = sub(this.points[i + 1], this.points[i])
                    const axis = [1, 0]
                    let angle = angle_between(axis, line)
                    if (this.points[i][1] > this.points[i + 1][1]) { angle *= -1 }
                    const side = -1 * Math.sign(dist_point_line([x, y], this.points.slice(i, i + 2)))

                    this.ctx.save()
                    this.ctx.translate(p0[0], p0[1])
                    this.ctx.rotate(angle)
                    this.ctx.fillRect(-line_length, 0, 2 * line_length, -1 * side * line_length)
                    this.ctx.restore()
                }
            }
            for (let i = 0; i + 1 < this.points.length; i += 2) {
                const slope = (this.points[i + 1][1] - this.points[i][1]) / (this.points[i + 1][0] - this.points[i][0])

                const p0 = [this.points[i][0] + this.canvas.width, this.points[i][1] + slope * this.canvas.width]
                const p1 = [this.points[i][0] - this.canvas.width, this.points[i][1] - slope * this.canvas.width]

                this.ctx.beginPath()
                this.ctx.moveTo(p0[0], p0[1])
                this.ctx.lineTo(p1[0], p1[1])
                this.ctx.stroke()
            }
        }
        if (this.state != SELECT_AREA) {
            if (this.points.length % 2 == 1) {
                const i = this.points.length - 1
                this.ctx.beginPath()
                this.ctx.moveTo(this.points[i][0], this.points[i][1])
                this.ctx.lineTo(x, y)
                this.ctx.stroke()

                this.draw_cross(this.points[i][0], this.points[i][1])
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

    resize (w, h) {
        this.canvas.width = w
        this.canvas.height = h
        this.ctx.strokeStyle = this.line_color
        this.ctx.fillStyle = this.fill_color
    }

    centerButtonInViewport (viewport) {
        const buttonWidth = this.button.clientWidth
        const buttonHeight = this.button.clientHeight
        const { x, y, width, height } = viewport
        this.button.style.left = `${x + (width - buttonWidth) * 0.5}px`
        this.button.style.top = `${y + (height - buttonHeight) * 0.9}px`
    }
}

const clipViewport = (ctx, vp) => {
    ctx.save() // store pre-clipped state
    const vpBounds = new Path2D()
    vpBounds.rect(vp.x, vp.y, vp.width, vp.height)
    ctx.clip(vpBounds)
}

const fillViewport = (ctx, vp) => {
    ctx.fillRect(vp.x, vp.y, vp.width, vp.height)
}
