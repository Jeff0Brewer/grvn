const TICK_LENGTHS = [
    { inner: 0.98, outer: 1.05 },
    { inner: 1, outer: 1.02 }
]

const TOP_LINE_BOUNDS = {
    bottom: 1.05,
    top: 1.25
}

class Axis {
    constructor (numTicks, detail) {
        numTicks += numTicks % 2 // ensure even number of ticks

        this.numVertex = (detail + numTicks + 1) * 2
        this.posData = new Float32Array(this.numVertex * 3)
        const setPoint = (offset, x, y, z) => {
            this.posData[offset] = x
            this.posData[offset + 1] = y
            this.posData[offset + 2] = z
        }

        // add ticks
        const tickStep = Math.PI * 2 / (numTicks - 1)
        let currTick = 0
        let posInd = 0
        for (let angle = 0; angle < Math.PI * 2; angle += tickStep, posInd += 6) {
            const x = Math.cos(angle)
            const y = Math.sin(angle)
            const { inner, outer } = TICK_LENGTHS[currTick]

            setPoint(posInd, x * inner, y * inner, 0)
            setPoint(posInd + 3, x * outer, y * outer, 0)

            // alternate tick sizes
            currTick = (currTick + 1) % 2
        }

        // add circle
        const circleStep = Math.PI * 2 / (detail - 1)
        let angle = 0
        while (angle < Math.PI * 2) {
            setPoint(posInd, Math.cos(angle), Math.sin(angle), 0)
            angle += circleStep
            posInd += 3
            setPoint(posInd, Math.cos(angle), Math.sin(angle), 0)
            posInd += 3
        }

        // add line on +z
        setPoint(posInd, 0, 0, TOP_LINE_BOUNDS.bottom)
        setPoint(posInd + 3, 0, 0, TOP_LINE_BOUNDS.top)
    }

    async initGl (gl) {
        const vert = await fetch('./shaders/axis-vert.glsl').then(res => res.text())
        const frag = await fetch('./shaders/axis-frag.glsl').then(res => res.text())
        this.program = initProgram(gl, vert, frag)
        bindProgram(gl, this.program)

        this.bindPos = initAttribBuffer(gl, 'a_Position', 3, this.posData, gl.FLOAT, gl.STATIC_DRAW)

        this.u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix')
        this.u_ViewMatrix = gl.getUniformLocation(gl.program, 'u_ViewMatrix')
        this.u_ProjMatrix = gl.getUniformLocation(gl.program, 'u_ProjMatrix')
    }

    draw (gl, viewMatrix, projMatrix, x, y, z, rx, rz, viewport, scale) {
        gl.enable(gl.DEPTH_TEST)

        bindProgram(gl, this.program)
        this.bindPos(gl)

        viewport.setCurrent(gl)

        const model = new Matrix4()
        model.scale(0.025, 0.025, 0.025)
        model.translate(x, y, z)
        model.scale(scale, scale, scale)
        model.rotate(rx, 1, 0, 0)
        model.rotate(2 * rz, 0, 0, 1)

        gl.uniformMatrix4fv(this.u_ModelMatrix, false, model.elements)
        gl.uniformMatrix4fv(this.u_ViewMatrix, false, viewMatrix.elements)
        gl.uniformMatrix4fv(this.u_ProjMatrix, false, projMatrix.elements)
        gl.drawArrays(gl.LINES, 0, this.numVertex)
    }
}
