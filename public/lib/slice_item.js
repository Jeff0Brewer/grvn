const IMG_SIZE = 20

class SliceItem {
    constructor (ind, planefilters, interface_out) {
        this.planefilters = planefilters
        this.removed = false

        this.dom = SLICE_ITEM_DOM.cloneNode(true)
        document.getElementById('slice_list').appendChild(this.dom)
        const [canvas, label, deleteButton] = this.dom.children

        label.innerHTML = `Slice ${ind}`
        deleteButton.onmouseup = () => { this.delete() }

        canvas.width = IMG_SIZE * window.devicePixelRatio
        canvas.height = canvas.width

        const ctx = canvas.getContext('2d')
        ctx.lineWidth = 1
        ctx.strokeStyle = 'rgb(189,189,189)'

        const vp = interface_out[1]
        const points = interface_out[0]
        const scale = max(vp.width, vp.height)
        const x_margin = map(scale - vp.width, 0, scale, 0, canvas.width)
        const y_margin = map(scale - vp.height, 0, scale, 0, canvas.height)

        for (let i = 0; i < points.length; i++) {
            for (let j = 0; j < 2; j++) {
                points[i][j][0] = map(points[i][j][0] - vp.x, 0, scale, x_margin, canvas.width - x_margin)
                points[i][j][1] = map(points[i][j][1] - vp.y, 0, scale, canvas.height - y_margin, y_margin)
            }
            const slope = (points[i][1][1] - points[i][0][1]) / (points[i][1][0] - points[i][0][0])
            const p0 = [points[i][0][0] + canvas.width, points[i][0][1] + slope * canvas.width]
            const p1 = [points[i][0][0] - canvas.width, points[i][0][1] - slope * canvas.width]

            ctx.beginPath()
            ctx.moveTo(p0[0], p0[1])
            ctx.lineTo(p1[0], p1[1])
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
