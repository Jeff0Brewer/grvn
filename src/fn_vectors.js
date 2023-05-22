class FnVectors {
    constructor (p_fpv, c_fpv, v_fpv) {
        this.p_fpv = p_fpv
        this.c_fpv = c_fpv
        this.v_fpv = v_fpv

        this.last_step = 0
        this.buffer_changed = false

        this.position_buffers = []
        this.color_buffers = []
        this.visibility_buffers = []
    }

    add_vbos (pos, col) {
        this.position_buffers.push(new Float32Array(pos))
        this.color_buffers.push(new Float32Array(col))

        const ind = this.visibility_buffers.length
        this.visibility_buffers.push(new Float32Array(pos.length / this.p_fpv))
        for (let i = 0; i < this.visibility_buffers[ind].length; i++) { this.visibility_buffers[ind][i] = 0 }
    }

    init_buffers () {
        this.fsize = this.position_buffers[0].BYTES_PER_ELEMENT

        // position buffer
        this.gl_pos_buf = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, this.gl_pos_buf)
        gl.bufferData(gl.ARRAY_BUFFER, this.position_buffers[0], gl.DYNAMIC_DRAW)

        this.a_Position = gl.getAttribLocation(gl.program, 'a_Position')
        gl.vertexAttribPointer(this.a_Position, 3, gl.FLOAT, false, this.fsize * this.p_fpv, 0)
        gl.enableVertexAttribArray(this.a_Position)

        // color buffer
        this.gl_col_buf = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, this.gl_col_buf)
        gl.bufferData(gl.ARRAY_BUFFER, this.color_buffers[0], gl.DYNAMIC_DRAW)

        this.a_Color = gl.getAttribLocation(gl.program, 'a_Color')
        gl.vertexAttribPointer(this.a_Color, 4, gl.FLOAT, false, this.fsize * this.c_fpv, 0)
        gl.enableVertexAttribArray(this.a_Color)

        // visibility buffers
        this.gl_vis_buf = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, this.gl_vis_buf)
        gl.bufferData(gl.ARRAY_BUFFER, this.visibility_buffers[0], gl.DYNAMIC_DRAW)

        this.a_Visibility = gl.getAttribLocation(gl.program, 'a_Visibility')
        gl.vertexAttribPointer(this.a_Visibility, 1, gl.FLOAT, false, this.fsize * this.v_fpv, 0)
        gl.enableVertexAttribArray(this.a_Visibility)

        this.u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix')
        this.u_ViewMatrix = gl.getUniformLocation(gl.program, 'u_ViewMatrix')
        this.u_ProjMatrix = gl.getUniformLocation(gl.program, 'u_ProjMatrix')
    }

    draw (modelMatrix, viewMatrix, projMatrix, timestep, rx, rz, viewport) {
        // buffer data if timestep changed
        this.buffer_changed ||= timestep !== this.last_step
        this.last_step = timestep

        // position buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.gl_pos_buf)
        if (this.buffer_changed) {
            gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.position_buffers[timestep])
        }
        gl.vertexAttribPointer(this.a_Position, 3, gl.FLOAT, false, this.fsize * this.p_fpv, 0)

        // color buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.gl_col_buf)
        if (this.buffer_changed) {
            gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.color_buffers[timestep])
        }
        gl.vertexAttribPointer(this.a_Color, 4, gl.FLOAT, false, this.fsize * this.c_fpv, 0)

        // visibility buffers
        gl.bindBuffer(gl.ARRAY_BUFFER, this.gl_vis_buf)
        if (this.buffer_changed) {
            gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.visibility_buffers[timestep])
        }
        gl.vertexAttribPointer(this.a_Visibility, 1, gl.FLOAT, false, this.fsize * this.v_fpv, 0)

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
        gl.drawArrays(gl.LINES, 0, this.position_buffers[timestep].length / this.p_fpv)
    }

    slice (planefilters) {
        for (let t = 0; t < this.visibility_buffers.length; t++) {
            for (let v = 0; v < this.visibility_buffers[t].length; v++) {
                const pos_ind = v / this.v_fpv * this.p_fpv
                const pos = [
                    this.position_buffers[t][pos_ind],
                    this.position_buffers[t][pos_ind + 1],
                    this.position_buffers[t][pos_ind + 2]
                ]

                let outside = false
                for (let f = 0; !outside && f < planefilters.length; f++) {
                    outside = planefilters[f].check(pos)
                }
                if (outside) { this.visibility_buffers[t][v] -= 1 }
            }
        }
        this.buffer_changed = true
    }

    unslice (planefilters) {
        for (let t = 0; t < this.visibility_buffers.length; t++) {
            for (let v = 0; v < this.visibility_buffers[t].length; v++) {
                const pos_ind = v / this.v_fpv * this.p_fpv
                const pos = [
                    this.position_buffers[t][pos_ind],
                    this.position_buffers[t][pos_ind + 1],
                    this.position_buffers[t][pos_ind + 2]
                ]

                let outside = false
                for (let f = 0; !outside && f < planefilters.length; f++) {
                    outside = planefilters[f].check(pos)
                }
                if (outside) { this.visibility_buffers[t][v] += 1 }
            }
        }
        this.buffer_changed = true
    }

    reset_slices () {
        for (let t = 0; t < this.visibility_buffers.length; t++) {
            for (let v = 0; v < this.visibility_buffers[t].length; v++) {
                this.visibility_buffers[t][v] = 0
            }
        }
    }
}
