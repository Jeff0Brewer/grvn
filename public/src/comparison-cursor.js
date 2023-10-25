class ComparisonCursor {
    constructor (width, height, size, strokeStyle, lineWidth) {
        this.canvas = document.getElementById('mousecanvas')
        this.canvas.width = width
        this.canvas.height = height

        this.ctx = this.canvas.getContext('2d')
        this.ctx.strokeStyle = strokeStyle
        this.ctx.lineWidth = lineWidth

        this.size = size
        this.lastPositions = []

        // store stroke and width values to reset in context on resize
        this.strokeStyle = strokeStyle
        this.lineWidth = lineWidth
    }

    update (x, y, viewports) {
        // clear last drawn cursors, don't want to clear full canvas for performance
        const clearSize = 2 * this.size
        for (const [x, y] of this.lastPositions) {
            this.ctx.clearRect(x - clearSize * 0.5, y - clearSize * 0.5, clearSize, clearSize)
        }
        this.lastPositions = []

        let hoveredViewport
        for (const viewport of viewports) {
            if (viewport.hitTest(x, y)) {
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

            this.lastPositions.push(pos)
            this.drawCursor(...pos)
        }
    }

    drawCursor (x, y) {
        const corner = this.size * 0.1
        const outer = this.size * 0.5
        const inner = outer - corner
        const angleInc = Math.PI * 0.5

        this.ctx.beginPath()
        this.ctx.moveTo(x + outer, y - inner)
        this.ctx.arc(x + inner, y + inner, corner, 0, angleInc)
        this.ctx.arc(x - inner, y + inner, corner, angleInc, 2 * angleInc)
        this.ctx.arc(x - inner, y - inner, corner, 2 * angleInc, 3 * angleInc)
        this.ctx.arc(x + inner, y - inner, corner, 3 * angleInc, 4 * angleInc)
        this.ctx.stroke()
    }

    resize (width, height) {
        this.canvas.width = width
        this.canvas.height = height

        this.ctx.strokeStyle = this.strokeStyle
        this.ctx.lineWidth = this.lineWidth
    }
}
