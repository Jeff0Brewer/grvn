class CompareMouse {
    constructor (width, height, size, strokeColor, strokeWidth) {
        this.color = strokeColor
        this.stroke = strokeWidth
        this.radius = size * 0.5
        this.lastPositions = []

        this.canvas = document.getElementById('mousecanvas')
        this.canvas.width = width
        this.canvas.height = height

        this.ctx = this.canvas.getContext('2d')
        this.ctx.strokeStyle = this.color
        this.ctx.lineWidth = this.stroke
    }

    update (x, y, viewports) {
        // clear last drawn cursors, don't want to clear full canvas for performance
        const clearSize = 4 * this.radius
        for (const [x, y] of this.lastPositions) {
            this.ctx.clearRect(x - clearSize * 0.5, y - clearSize * 0.5, clearSize, clearSize)
        }
        this.lastPositions = []

        let hoveredViewport
        for (const viewport of viewports) {
            if (viewport.check_hit(x, y)) {
                hoveredViewport = viewport
                break
            }
        }
        if (!hoveredViewport) { return }

        // get mouse position within hovered viewport to scale to other viewports
        const percentX = (x - hoveredViewport.x) / hoveredViewport.width
        const percentY = (y - hoveredViewport.y) / hoveredViewport.height

        for (const viewport of viewports) {
            // don't draw cursor in viewport mouse is hovering
            if (viewport.equals(hoveredViewport)) { continue }

            // convert mouse position in hovered viewport
            // to same relative position in other viewport
            const { x, y, width, height } = viewport
            const pos = [x + width * percentX, y + height * percentY]

            this.draw_cursor(...pos)
            this.lastPositions.push(pos)
        }
    }

    draw_cursor (x, y) {
        const radius = this.radius / 5
        this.ctx.beginPath()
        this.ctx.moveTo(x - this.radius, y + this.radius - radius)
        this.ctx.lineTo(x - this.radius, y - this.radius + radius)
        this.ctx.arc(x - this.radius + radius, y - this.radius + radius, radius, Math.PI, 1.5 * Math.PI)
        this.ctx.lineTo(x + this.radius - radius, y - this.radius)
        this.ctx.arc(x + this.radius - radius, y - this.radius + radius, radius, 1.5 * Math.PI, 0)
        this.ctx.lineTo(x + this.radius, y + this.radius - radius)
        this.ctx.arc(x + this.radius - radius, y + this.radius - radius, radius, 0, 0.5 * Math.PI)
        this.ctx.lineTo(x - this.radius + radius, y + this.radius)
        this.ctx.arc(x - this.radius + radius, y + this.radius - radius, radius, 0.5 * Math.PI, Math.PI)
        this.ctx.stroke()
    }

    resize (w, h) {
        this.canvas.width = w
        this.canvas.height = h
        this.ctx.strokeStyle = this.color
        this.ctx.lineWidth = this.stroke
    }
}
