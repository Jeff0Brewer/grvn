class FnVectors {
    constructor (p_fpv, c_fpv, v_fpv) {
        this.p_fpv = p_fpv
        this.c_fpv = c_fpv
        this.v_fpv = v_fpv

        this.last_step = 0
        this.buffer_changed = false

        this.posData = []
        this.colData = []
        this.visData = []
    }

    add_vbos (pos, col) {
        this.posData.push(new Float32Array(pos))
        this.colData.push(new Float32Array(col))

        const ind = this.visData.length
        this.visData.push(new Float32Array(pos.length / this.p_fpv))
        for (let i = 0; i < this.visData[ind].length; i++) {
            this.visData[ind][i] = 0
        }
    }

    init_gl (gl) {
        this.bindPos = initAttribBuffer(gl, 'a_Position', this.p_fpv, this.posData[0], gl.DYNAMIC_DRAW)
        this.bindCol = initAttribBuffer(gl, 'a_Color', this.c_fpv, this.colData[0], gl.DYNAMIC_DRAW)
        this.bindVis = initAttribBuffer(gl, 'a_Visibility', this.v_fpv, this.visData[0], gl.DYNAMIC_DRAW)

        this.u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix')
        this.u_ViewMatrix = gl.getUniformLocation(gl.program, 'u_ViewMatrix')
        this.u_ProjMatrix = gl.getUniformLocation(gl.program, 'u_ProjMatrix')
    }

    draw (gl, modelMatrix, viewMatrix, projMatrix, timestep, rx, rz, viewport) {
        // buffer data if timestep changed
        this.buffer_changed ||= timestep !== this.last_step
        this.last_step = timestep

        this.bindPos(gl)
        if (this.buffer_changed) {
            gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.posData[timestep])
        }
        this.bindCol(gl)
        if (this.buffer_changed) {
            gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.colData[timestep])
        }
        this.bindVis(gl)
        if (this.buffer_changed) {
            gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.visData[timestep])
        }

        this.buffer_changed = false

        const model = new Matrix4(modelMatrix)
        model.scale(0.025, 0.025, 0.025)
        model.translate(0, 0, 800)
        model.rotate(rx, 1, 0, 0)
        model.rotate(rz, 0, 0, 1)
        model.translate(0, 0, -800)

        gl.uniformMatrix4fv(this.u_ModelMatrix, false, model.elements)
        gl.uniformMatrix4fv(this.u_ViewMatrix, false, viewMatrix.elements)
        gl.uniformMatrix4fv(this.u_ProjMatrix, false, projMatrix.elements)

        gl.scissor(viewport.x, viewport.y, viewport.width, viewport.height)
        gl.viewport(viewport.x, viewport.y, viewport.width, viewport.height)
        gl.drawArrays(gl.LINES, 0, this.posData[timestep].length / this.p_fpv)
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
                if (outside) { this.visData[t][v] -= 1 }
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
                if (outside) { this.visData[t][v] += 1 }
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
