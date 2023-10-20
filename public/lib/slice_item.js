class SliceItem {
    constructor (source, dest, insert, ind, planefilters, interface_out) {
        this.planefilters = planefilters
        this.ind = ind
        this.removed = false

        const cloned = source.cloneNode(true)
        dest.insertBefore(cloned, insert)

        this.elements = {
            body: cloned,
            canvas: cloned.childNodes[1],
            ind: cloned.childNodes[3],
            delete: cloned.childNodes[5]
        }

        this.elements.canvas.width = 20 * window.devicePixelRatio
        this.elements.canvas.height = 20 * window.devicePixelRatio
        const ctx = this.elements.canvas.getContext('2d')
        ctx.lineWidth = 1
        ctx.strokeStyle = 'rgb(189,189,189)'

        const vp = interface_out[1]
        const points = interface_out[0]
        const scale = max(vp.width, vp.height)
        const x_margin = map(scale - vp.width, 0, scale, 0, this.elements.canvas.width)
        const y_margin = map(scale - vp.height, 0, scale, 0, this.elements.canvas.height)

        for (let i = 0; i < points.length; i++) {
            for (let j = 0; j < 2; j++) {
                points[i][j][0] = map(points[i][j][0] - vp.x, 0, scale, x_margin, this.elements.canvas.width - x_margin)
                points[i][j][1] = map(points[i][j][1] - vp.y, 0, scale, this.elements.canvas.height - y_margin, y_margin)
            }
            const slope = (points[i][1][1] - points[i][0][1]) / (points[i][1][0] - points[i][0][0])
            const p0 = [points[i][0][0] + this.elements.canvas.width, points[i][0][1] + slope * this.elements.canvas.width]
            const p1 = [points[i][0][0] - this.elements.canvas.width, points[i][0][1] - slope * this.elements.canvas.width]

            ctx.beginPath()
            ctx.moveTo(p0[0], p0[1])
            ctx.lineTo(p1[0], p1[1])
            ctx.stroke()
        }

        this.elements.ind.innerHTML += ind.toString()
    }

    hover_on () {
        this.elements.delete.className = this.elements.delete.className.replace(' hidden', '')
    }

    hover_off () {
        this.elements.delete.className = this.elements.delete.className + ' hidden'
    }

    delete () {
        this.elements.body.remove()
        this.removed = true
    }
}

function make_slice_item (ind, planefilters, interface_out) {
    const si_insert = document.getElementById('slice_proto')
    const si_source = si_insert.childNodes[1]
    const si_dest = document.getElementById('slice_list')

    const si = new SliceItem(si_source, si_dest, si_insert, ind, planefilters, interface_out)

    si.elements.body.onmouseenter = function () {
        si.hover_on()
    }

    si.elements.body.onmouseleave = function () {
        si.hover_off()
    }

    si.elements.delete.onmouseup = function () {
        si.delete()
    }

    return si
}
