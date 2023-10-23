const IMG_SIZE = 20

class SliceItem {
    constructor (ind, planefilters, lines, viewport) {
        this.planefilters = planefilters
        this.removed = false

        this.dom = SLICE_ITEM_DOM.cloneNode(true)
        document.getElementById('slice_list').appendChild(this.dom)
        const [canvas, label, deleteButton] = this.dom.children

        label.innerHTML = `Slice ${ind}`
        deleteButton.onmouseup = () => { this.delete() }

        // setup canvas to draw slice lines on
        canvas.width = IMG_SIZE * window.devicePixelRatio
        canvas.height = canvas.width
        const ctx = canvas.getContext('2d')
        ctx.lineWidth = 1
        ctx.strokeStyle = 'rgb(189,189,189)'

        // get scaling factor for main window to img canvas bounds
        // and padding values to maintain aspect ratio of viewport while drawing
        const scale = Math.max(viewport.width, viewport.height)
        const padX = map(scale - viewport.width, 0, scale, 0, canvas.width) * 0.5
        const padY = map(scale - viewport.height, 0, scale, 0, canvas.height) * 0.5

        for (const [p0, p1] of lines) {
            // scale points from main window to img canvas coords
            for (const point of [p0, p1]) {
                point[0] = map(point[0] - viewport.x, 0, viewport.width, padX, canvas.width - padX)
                point[1] = map(point[1] - viewport.y, 0, viewport.height, canvas.height - padY, padY)
            }

            // extend line to edges of canvas
            const slope = (p1[1] - p0[1]) / (p1[0] - p0[0])
            const extended0 = [p0[0] + canvas.width, p0[1] + slope * canvas.width]
            const extended1 = [p1[0] - canvas.width, p1[1] - slope * canvas.width]

            ctx.beginPath()
            ctx.moveTo(...extended0)
            ctx.lineTo(...extended1)
            ctx.stroke()
        }
    }

    delete () {
        this.dom.remove()
        this.removed = true
    }
}

const initSliceItemDom = () => {
    const dom = document.createElement('div')
    const canvas = document.createElement('canvas')
    const label = document.createElement('p')
    const deleteButton = document.createElement('button')

    dom.className = 'list_item selection_highlight'
    canvas.className = 'item_canvas'
    label.className = 'item_label'
    deleteButton.className = 'item_delete'

    dom.append(canvas, label, deleteButton)

    return dom
}
const SLICE_ITEM_DOM = initSliceItemDom()
