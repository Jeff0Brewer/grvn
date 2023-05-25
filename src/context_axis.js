class Axis {
    constructor (numTicks, detail) {
        this.p_fpv = 3
        this.numVertex = (detail + 1) * 2 + (numTicks + 1) * 2 + 2
        this.posData = new Float32Array(this.numVertex * this.p_fpv)

        // add circle
        const circleStep = Math.PI * 2 / detail
        let posInd = 0
        let angle = 0
        while (angle < Math.PI * 2) {
            this.posData[posInd] = Math.cos(angle)
            this.posData[posInd + 1] = Math.sin(angle)
            this.posData[posInd + 2] = 0
            angle += circleStep
            this.posData[posInd + 3] = Math.cos(angle)
            this.posData[posInd + 4] = Math.sin(angle)
            this.posData[posInd + 5] = 0
            posInd += 6
        }

        // add ticks
        numTicks += numTicks % 2 // ensure even number of ticks
        let currTick = 0
        const ticks = [{ inner: 0.98, outer: 1.05 }, { inner: 1, outer: 1.02 }]
        const tickStep = Math.PI * 2 / numTicks
        for (let angle = 0; angle < Math.PI * 2; angle += tickStep, currTick = (currTick + 1) % 2, posInd += 6) {
            const x = Math.cos(angle)
            const y = Math.sin(angle)
            this.posData[posInd] = x * ticks[currTick].inner
            this.posData[posInd + 1] = y * ticks[currTick].inner
            this.posData[posInd + 2] = 0
            this.posData[posInd + 3] = x * ticks[currTick].outer
            this.posData[posInd + 4] = y * ticks[currTick].outer
            this.posData[posInd + 5] = 0
        }

        // add line on +z
        this.posData[posInd] = 0
        this.posData[posInd + 1] = 0
        this.posData[posInd + 2] = 1.05
        this.posData[posInd + 3] = 0
        this.posData[posInd + 4] = 0
        this.posData[posInd + 5] = 1.25
    }

    async init_gl (gl) {
        const vert = await fetch('./shaders/axis-vert.glsl').then(res => res.text())
        const frag = await fetch('./shaders/axis-frag.glsl').then(res => res.text())

        const oldProgram = gl.program
        this.program = initProgram(gl, vert, frag)
        bindProgram(gl, this.program)

        this.bindPos = initAttribBuffer(
            gl,
            'a_Position',
            this.p_fpv,
            this.posData,
            gl.FLOAT,
            gl.STATIC_DRAW
        )

        this.u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix')
        this.u_ViewMatrix = gl.getUniformLocation(gl.program, 'u_ViewMatrix')
        this.u_ProjMatrix = gl.getUniformLocation(gl.program, 'u_ProjMatrix')

        bindProgram(gl, oldProgram)
    }

    draw (gl, modelMatrix, viewMatrix, projMatrix, x, y, z, rx, rz, viewport, scale) {
        const oldProgram = gl.program
        bindProgram(gl, this.program)
        this.bindPos(gl)

        gl.scissor(viewport.x, viewport.y, viewport.width, viewport.height)
        gl.viewport(viewport.x, viewport.y, viewport.width, viewport.height)

        const model = new Matrix4(modelMatrix)
        model.scale(0.025, 0.025, 0.025)
        model.translate(x, y, z)
        model.scale(scale, scale, scale)
        model.rotate(rx, 1, 0, 0)
        model.rotate((2 * rz), 0, 0, 1)

        gl.uniformMatrix4fv(this.u_ModelMatrix, false, model.elements)
        gl.uniformMatrix4fv(this.u_ViewMatrix, false, viewMatrix.elements)
        gl.uniformMatrix4fv(this.u_ProjMatrix, false, projMatrix.elements)
        gl.drawArrays(gl.LINES, 0, this.numVertex)

        bindProgram(gl, oldProgram)
    }
}
