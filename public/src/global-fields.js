class GlobalField {
    constructor (label, data, strokeStyle, lineWidth, addTab, setPlot, setInd) {
        const { root, canvas, minVal, maxVal, boundLeft, boundRight, currTime } = getGlobalPlotDom()
        const { tab } = getGlobalTabDom()

        addTab(tab)
        setPlot(root)

        tab.value = label

        canvas.width = canvas.clientWidth * window.devicePixelRatio
        canvas.height = canvas.clientHeight * window.devicePixelRatio
        const ctx = canvas.getContext('2d')

        ctx.transform(1, 0, 0, -1, 0, canvas.height)
        ctx.strokeStyle = strokeStyle
        ctx.lineWidth = lineWidth

        let min = Number.MAX_VALUE
        let max = Number.MIN_VALUE
        for (const val of data) {
            min = Math.min(min, val)
            max = Math.max(max, val)
        }
        const getPosY = (i) => map(data[i], min, max, 0, canvas.height)

        ctx.beginPath()
        ctx.moveTo(0, getPosY(0))
        const incX = canvas.width / data.length
        for (let i = 1; i < data.length; i++) {
            ctx.lineTo(i * incX, getPosY(i))
        }
        ctx.stroke()

        minVal.innerHTML = min.toFixed(2)
        maxVal.innerHTML = max.toFixed(2)

        canvas.addEventListener('mousedown', () => { this.dragging = true })
        canvas.addEventListener('mouseup', () => { this.dragging = false })
        canvas.addEventListener('mouseleave', () => { this.dragging = false })
        tab.addEventListener('mousedown', () => {
            setPlot(root)
            setInd()
        })

        this.canvas = canvas
        this.boundLeft = boundLeft
        this.boundRight = boundRight
        this.currTime = currTime
        this.dragging = false
    }

    setTime (t, numT) {
        const margin = (t / (numT - 1)) * this.canvas.clientWidth
        this.currTime.style.marginLeft = `${margin}px`
    }

    getTime (clientX, numT, leftBound, rightBound) {
        const { left, width } = this.canvas.getBoundingClientRect()
        const perX = clamp((clientX - left) / width, leftBound, rightBound)
        const time = Math.floor(perX * numT)
        this.setTime(time, numT)
        return time
    }

    showTimeBounds () {
        this.boundLeft.classList.remove('hidden')
        this.boundRight.classList.remove('hidden')
    }

    hideTimeBounds () {
        this.boundLeft.classList.add('hidden')
        this.boundRight.classList.add('hidden')
    }

    setTimeBounds (leftBound, rightBound, t, numT) {
        const leftWidth = leftBound * this.canvas.clientWidth
        const rightWidth = (1 - rightBound) * this.canvas.clientWidth
        this.boundLeft.style.width = `${leftWidth}px`
        this.boundRight.style.width = `${rightWidth}px`
        this.setTime(t, numT)
    }
}

class GlobalFields {
    constructor (strokeStyle, lineWidth) {
        this.tabSection = document.getElementById('global-tabs')
        this.plotSection = document.getElementById('global-plot')
        this.strokeStyle = strokeStyle
        this.lineWidth = lineWidth

        this.fields = []
        this.currInd = 0
        this.leftBound = 0
        this.rightBound = 1

        this.addTab = (tab) => { this.tabSection.appendChild(tab) }
        this.setPlot = (root) => {
            while (this.plotSection.firstChild) {
                this.plotSection.removeChild(this.plotSection.lastChild)
            }
            this.plotSection.appendChild(root)
        }
        this.setInd = (ind) => {
            const tabs = this.tabSection.children
            tabs[this.currInd].dataset.current = false
            this.currInd = ind
            tabs[this.currInd].dataset.current = true
        }
    }

    isDragging () {
        return this.currInd < this.fields.length && this.fields[this.currInd].dragging
    }

    addField (data) {
        const ind = this.fields.length
        const field = new GlobalField(
            `F${ind}`,
            data,
            this.strokeStyle,
            this.lineWidth,
            this.addTab,
            this.setPlot,
            () => { this.setInd(ind) }
        )
        this.fields.push(field)
        this.setInd(ind)
    }

    setBounds (leftBound, rightBound, t, numT) {
        this.leftBound = leftBound / (numT - 1)
        this.rightBound = rightBound / (numT - 1)
        for (const field of this.fields) {
            field.setTimeBounds(this.leftBound, this.rightBound, t, numT)
        }
    }

    showBounds () {
        for (const field of this.fields) {
            field.showTimeBounds()
        }
    }

    hideBounds () {
        for (const field of this.fields) {
            field.hideTimeBounds()
        }
    }

    setTime (t, numT) {
        this.fields[this.currInd].setTime(t, numT)
    }

    getTime (clientX, numT) {
        return this.fields[this.currInd].getTime(clientX, numT, this.leftBound, this.rightBound)
    }
}
const initGlobalPlotDom = () => {
    const template =
        `<div class="global-plot-wrap">
            <div class="global-labels">
                <p class="global-min-val">0</p>
                <p class="global-max-val">1</p>
            </div>
            <div class="global-plot">
                <canvas class="global-canvas"></canvas>
                <div class="global-bound-left"></div>
                <div class="global-bound-right"></div>
                <div class="global-curr-time"></div>
            </div>
        </div>`

    const parser = new DOMParser()
    const doc = parser.parseFromString(template, 'text/html')
    return doc.body.firstChild.cloneNode(true)
}

const initGlobalTabDom = () => {
    const template = '<input type="text" class="global-tab" />'

    const parser = new DOMParser()
    const doc = parser.parseFromString(template, 'text/html')
    return doc.body.firstChild.cloneNode(true)
}

const PLOT_DOM = initGlobalPlotDom()
const TAB_DOM = initGlobalTabDom()

const getGlobalPlotDom = () => {
    const root = PLOT_DOM.cloneNode(true)
    const labels = root.children[0]
    const plot = root.children[1]
    const [minVal, maxVal] = labels.children
    const [canvas, boundLeft, boundRight, currTime] = plot.children

    return { root, canvas, minVal, maxVal, boundLeft, boundRight, currTime }
}

const getGlobalTabDom = () => {
    const tab = TAB_DOM.cloneNode(true)

    return { tab }
}
