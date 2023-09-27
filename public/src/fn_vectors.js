class FnVectors {
    constructor (posBuffers, alpBuffers, visBuffers) {
        this.p_fpv = 3
        this.a_fpv = 1
        this.v_fpv = 1

        this.last_step = 0
        this.buffer_changed = false

        this.posData = posBuffers
        this.alpData = alpBuffers
        this.visData = visBuffers

        this.lineWidth = 1
    }

    async init_gl (gl) {
        const vert = await fetch('./shaders/force-vert.glsl').then(res => res.text())
        const frag = await fetch('./shaders/force-frag.glsl').then(res => res.text())
        this.program = initProgram(gl, vert, frag)
        bindProgram(gl, this.program)

        this.bindPos = initAttribBuffer(
            gl,
            'a_Position',
            this.p_fpv,
            this.posData[0],
            gl.FLOAT,
            gl.DYNAMIC_DRAW
        )
        this.bindAlp = initAttribBuffer(
            gl,
            'a_Alpha',
            this.a_fpv,
            this.alpData[0],
            gl.UNSIGNED_BYTE,
            gl.DYNAMIC_DRAW
        )
        this.bindVis = initAttribBuffer(
            gl,
            'a_Visibility',
            this.v_fpv,
            this.visData[0],
            gl.UNSIGNED_BYTE,
            gl.DYNAMIC_DRAW
        )

        this.u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix')
        this.u_ViewMatrix = gl.getUniformLocation(gl.program, 'u_ViewMatrix')
        this.u_ProjMatrix = gl.getUniformLocation(gl.program, 'u_ProjMatrix')
    }

    draw (gl, viewMatrix, projMatrix, timestep, viewport) {
        // buffer data if timestep changed
        this.buffer_changed ||= timestep !== this.last_step
        this.last_step = timestep

        gl.disable(gl.DEPTH_TEST)
        bindProgram(gl, this.program)

        this.bindPos(gl)
        if (this.buffer_changed) {
            gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.posData[timestep])
        }
        this.bindAlp(gl)
        if (this.buffer_changed) {
            gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.alpData[timestep])
        }
        this.bindVis(gl)
        if (this.buffer_changed) {
            gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.visData[timestep])
        }

        this.buffer_changed = false

        const model = new Matrix4()
        model.scale(0.025, 0.025, 0.025)

        gl.uniformMatrix4fv(this.u_ModelMatrix, false, model.elements)
        gl.uniformMatrix4fv(this.u_ViewMatrix, false, viewMatrix.elements)
        gl.uniformMatrix4fv(this.u_ProjMatrix, false, projMatrix.elements)

        gl.scissor(viewport.x, viewport.y, viewport.width, viewport.height)
        gl.viewport(viewport.x, viewport.y, viewport.width, viewport.height)

        gl.lineWidth(this.lineWidth)
        gl.drawArrays(gl.LINES, 0, this.posData[timestep].length / this.p_fpv)
        gl.lineWidth(1)
    }

    slice (planefilters) {
        for (let t = 0; t < this.visData.length; t++) {
            for (let v = 0; v < this.visData[t].length; v++) {
                const pos_ind = v / this.v_fpv * this.p_fpv
                const pos = [
                    this.posData[t][pos_ind],
                    this.posData[t][pos_ind + 1],
                    this.posData[t][pos_ind + 2]
                ]

                let outside = false
                for (let f = 0; !outside && f < planefilters.length; f++) {
                    outside = planefilters[f].check(pos)
                }
                if (outside) { this.visData[t][v] += 1 }
            }
        }
        this.buffer_changed = true
    }

    unslice (planefilters) {
        for (let t = 0; t < this.visData.length; t++) {
            for (let v = 0; v < this.visData[t].length; v++) {
                const pos_ind = v / this.v_fpv * this.p_fpv
                const pos = [
                    this.posData[t][pos_ind],
                    this.posData[t][pos_ind + 1],
                    this.posData[t][pos_ind + 2]
                ]

                let outside = false
                for (let f = 0; !outside && f < planefilters.length; f++) {
                    outside = planefilters[f].check(pos)
                }
                if (outside) { this.visData[t][v] -= 1 }
            }
        }
        this.buffer_changed = true
    }

    reset_slices () {
        for (let t = 0; t < this.visData.length; t++) {
            for (let v = 0; v < this.visData[t].length; v++) {
                this.visData[t][v] = 0
            }
        }
    }
}
