// slice interface states
const PICK_VIEWPORT = 0
const DRAW_LINES = 1
const SELECT_AREA = 2

class SliceInterface {
    constructor (width, height, cursorSize, strokeStyle, fillStyle) {
        this.line_color = strokeStyle
        this.fill_color = fillStyle
        this.cursorSize = cursorSize

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
        return this.lines.length > 0 && this.viewport
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
        this.viewports = viewports
        this.points = []
        this.lines = []
        this.state = PICK_VIEWPORT
        this.canvas.style.pointerEvents = 'auto'
    }

    deactivate () {
        this.button.classList.add('hidden')
        this.canvas.style.pointerEvents = 'none'
        this.ctx.restore()
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    }

    centerButtonInViewport (viewport) {
        const buttonWidth = this.button.clientWidth
        const buttonHeight = this.button.clientHeight
        const { x, y, width, height } = viewport
        this.button.style.left = `${x + (width - buttonWidth) * 0.5}px`
        this.button.style.top = `${y + (height - buttonHeight) * 0.9}px`
    }

    drawLine (a, b) {
        this.ctx.beginPath()
        this.ctx.moveTo(a[0], a[1])
        this.ctx.lineTo(b[0], b[1])
        this.ctx.stroke()
    }

    drawCursor (x, y) {
        this.ctx.lineWidth = this.cursorSize / 6

        const r = this.cursorSize * 0.5
        this.ctx.beginPath()
        this.ctx.moveTo(x - r, y)
        this.ctx.lineTo(x + r, y)
        this.ctx.moveTo(x, y - r)
        this.ctx.lineTo(x, y + r)
        this.ctx.stroke()

        this.ctx.lineWidth = 1
    }

    resize (width, height) {
        this.canvas.width = width
        this.canvas.height = height
        this.ctx.strokeStyle = this.line_color
        this.ctx.fillStyle = this.fill_color
    }

    drawCurrLines (mousePos) {
        // draw cursors / current line to mouse if not currently selecting area
        if (this.state !== SELECT_AREA) {
            if (this.points.length % 2 === 1) {
                const lastPoint = this.points[this.points.length - 1]
                this.drawLine(lastPoint, mousePos)
                this.drawCursor(...lastPoint)
            }
            this.drawCursor(...mousePos)
        }

        // draw all currently defined lines
        for (let i = 0; i + 1 < this.points.length; i += 2) {
            const [x0, y0] = this.points[i]
            const [x1, y1] = this.points[i + 1]
            const dx = this.canvas.width
            const dy = dx * (y1 - y0) / (x1 - x0)
            this.drawLine(
                [x0 + dx, y0 + dy],
                [x1 - dx, y1 - dy]
            )
        }
    }

    mousedown (e) {
        const mousePos = [e.clientX, e.clientY]
        switch (this.state) {
            case PICK_VIEWPORT:
                // setup line drawing state in selected viewport
                clipViewport(this.ctx, this.viewport)
                this.centerButtonInViewport(this.viewport)
                this.state = DRAW_LINES

                // add clicked point as first position
                this.points.push([e.clientX, e.clientY])
                break

            case DRAW_LINES:
                this.points.push(mousePos)

                // show apply slices button once at least one line defined
                if (this.points.length > 1) {
                    this.button.classList.remove('hidden')
                }

                // update drawn lines with new point
                this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
                this.drawCurrLines(mousePos)

                break

            case SELECT_AREA:
                // for each line, calculate which side mouse clicked on and store output
                for (let i = 0; i + 1 < this.points.length; i += 2) {
                    const pair = this.points.slice(i, i + 2)
                    const clickSide = Math.sign(dist_point_line(mousePos, pair)) * -1
                    this.lines.push([pair[0], pair[1], clickSide])
                }

                // hide interface once area selection complete
                this.deactivate()
                break
        }
    }

    mousemove (e) {
        const mousePos = [e.clientX, e.clientY]

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

        if (this.state === PICK_VIEWPORT) {
            // highlight / select hovered viewport
            for (const viewport of this.viewports) {
                if (viewport.hitTest(...mousePos)) {
                    this.viewport = viewport
                } else {
                    fillViewport(this.ctx, viewport)
                }
            }
        }

        if (this.state === SELECT_AREA) {
            // highlight hovered slice area by filling in all non-hovered areas
            const edgeLength = this.viewport.diagonalLength()
            for (let i = 0; i + 1 < this.points.length; i += 2) {
                // sort pair by y position for consistent angle measurement from +x axis
                const pair = this.points.slice(i, i + 2).sort((a, b) => a[1] - b[1])

                const line = sub(pair[1], pair[0])
                const angle = angle_between([1, 0], line)
                const fillDirection = Math.sign(dist_point_line(mousePos, pair))

                this.ctx.save()
                this.ctx.translate(...pair[0])
                this.ctx.rotate(angle)
                this.ctx.fillRect(-0.5 * edgeLength, 0, edgeLength, edgeLength * fillDirection)
                this.ctx.restore()
            }
        }

        this.drawCurrLines(mousePos)
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
