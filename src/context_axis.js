class Axis {
    constructor (num_ticks, detail, p_fpv, c_fpv, v_fpv) {
        this.p_fpv = p_fpv
        this.c_fpv = c_fpv
        this.v_fpv = v_fpv

        this.num_v = detail * 2 + 4

        this.position_buffer = new Float32Array((this.num_v + 2) * this.p_fpv)
        this.color_buffer = new Float32Array((this.num_v + 2) * this.c_fpv)
        this.visibility_buffer = new Float32Array((this.num_v + 2) * this.v_fpv)

        this.atom_width = Math.PI * 2 / (num_ticks)

        let pos_ind = 0

        const angle_step = this.atom_width / detail
        let last_pos = [Math.cos(0), Math.sin(0), 0]
        for (let theta = angle_step; theta <= this.atom_width; theta += angle_step, pos_ind += 2 * this.p_fpv) {
            this.position_buffer[pos_ind] = last_pos[0]
            this.position_buffer[pos_ind + 1] = last_pos[1]
            this.position_buffer[pos_ind + 2] = last_pos[2]

            last_pos = [Math.cos(theta), Math.sin(theta), 0]

            this.position_buffer[pos_ind + 3] = last_pos[0]
            this.position_buffer[pos_ind + 4] = last_pos[1]
            this.position_buffer[pos_ind + 5] = last_pos[2]
        }

        const large = [-0.02, 0.05]
        const small = [0, 0.02]

        const sizes = [[1 + large[0], 1 + large[1]], [1 + small[0], 1 + small[1]]]

        for (let i = 0; i < 2; i++, pos_ind += 2 * this.p_fpv) {
            const cos = Math.cos(i * this.atom_width / 2)
            const sin = Math.sin(i * this.atom_width / 2)
            this.position_buffer[pos_ind] = cos * sizes[i][0]
            this.position_buffer[pos_ind + 1] = sin * sizes[i][0]
            this.position_buffer[pos_ind + 2] = 0

            this.position_buffer[pos_ind + 3] = cos * sizes[i][1]
            this.position_buffer[pos_ind + 4] = sin * sizes[i][1]
            this.position_buffer[pos_ind + 5] = 0
        }

        this.position_buffer[pos_ind] = 0
        this.position_buffer[pos_ind + 1] = 0
        this.position_buffer[pos_ind + 2] = 1.025

        this.position_buffer[pos_ind + 3] = 0
        this.position_buffer[pos_ind + 4] = 0
        this.position_buffer[pos_ind + 5] = 1.25

        const color = [0.7, 0.7, 0.7, 0.4]
        let col_ind = 0
        for (let i = 0; i < this.num_v * this.c_fpv; i++, col_ind++) {
            this.color_buffer[col_ind] = color[i % this.c_fpv]
        }

        for (let i = 0; i < 2 * this.c_fpv; i++, col_ind++) {
            this.color_buffer[col_ind] = 0.8
        }

        for (let i = 0; i < this.visibility_buffer.length; i++) {
            this.visibility_buffer[i] = 0
        }
    }

    init_buffers () {
        this.fsize = this.position_buffer.BYTES_PER_ELEMENT

        // position buffer
        this.gl_pos_buf = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, this.gl_pos_buf)
        gl.bufferData(gl.ARRAY_BUFFER, this.position_buffer, gl.STATIC_DRAW)

        this.a_Position = gl.getAttribLocation(gl.program, 'a_Position')
        gl.vertexAttribPointer(this.a_Position, 3, gl.FLOAT, false, this.fsize * this.p_fpv, 0)
        gl.enableVertexAttribArray(this.a_Position)

        // color buffer
        this.gl_col_buf = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, this.gl_col_buf)
        gl.bufferData(gl.ARRAY_BUFFER, this.color_buffer, gl.STATIC_DRAW)

        this.a_Color = gl.getAttribLocation(gl.program, 'a_Color')
        gl.vertexAttribPointer(this.a_Color, 4, gl.FLOAT, false, this.fsize * this.c_fpv, 0)
        gl.enableVertexAttribArray(this.a_Color)

        // visibility buffers
        this.gl_vis_buf = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, this.gl_vis_buf)
        gl.bufferData(gl.ARRAY_BUFFER, this.visibility_buffer, gl.STATIC_DRAW)

        this.a_Visibility = gl.getAttribLocation(gl.program, 'a_Visibility')
        gl.vertexAttribPointer(this.a_Visibility, 1, gl.FLOAT, false, this.fsize * this.v_fpv, 0)
        gl.enableVertexAttribArray(this.a_Visibility)
    }

    draw (u_ModelMatrix, x, y, z, rx, rz, viewport, scale) {
        // position buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.gl_pos_buf)
        gl.vertexAttribPointer(this.a_Position, 3, gl.FLOAT, false, this.fsize * this.p_fpv, 0)

        // color buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.gl_col_buf)
        gl.vertexAttribPointer(this.a_Color, 4, gl.FLOAT, false, this.fsize * this.c_fpv, 0)

        // visibility buffers
        gl.bindBuffer(gl.ARRAY_BUFFER, this.gl_vis_buf)
        gl.vertexAttribPointer(this.a_Visibility, 1, gl.FLOAT, false, this.fsize * this.v_fpv, 0)

        gl.scissor(viewport.x, viewport.y, viewport.width, viewport.height)
        gl.viewport(viewport.x, viewport.y, viewport.width, viewport.height)

        pushMatrix(modelMatrix)
        modelMatrix.scale(0.025, 0.025, 0.025)
        modelMatrix.translate(x, y, z)
        modelMatrix.scale(scale, scale, scale)
        modelMatrix.rotate(rx, 1, 0, 0)
        modelMatrix.rotate((2 * rz) % (this.atom_width * 180 / Math.PI), 0, 0, 1)

        const step = this.atom_width * 180 / Math.PI
        for (let theta = 0; theta < 360 - step; theta += step) {
            pushMatrix(modelMatrix)

            modelMatrix.rotate(theta, 0, 0, 1)

            gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements)
            gl.drawArrays(gl.LINES, 0, this.num_v)
            modelMatrix = popMatrix()
        }

        gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements)
        gl.drawArrays(gl.LINES, this.num_v, 2)

        modelMatrix = popMatrix()
    }

    draw_front (u_ModelMatrix, x, y, z, rx, rz, viewport, scale) {
        // position buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.gl_pos_buf)
        gl.vertexAttribPointer(this.a_Position, 3, gl.FLOAT, false, this.fsize * this.p_fpv, 0)

        // color buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.gl_col_buf)
        gl.vertexAttribPointer(this.a_Color, 4, gl.FLOAT, false, this.fsize * this.c_fpv, 0)

        // visibility buffers
        gl.bindBuffer(gl.ARRAY_BUFFER, this.gl_vis_buf)
        gl.vertexAttribPointer(this.a_Visibility, 1, gl.FLOAT, false, this.fsize * this.v_fpv, 0)

        gl.scissor(viewport.x, viewport.y, viewport.width, viewport.height)
        gl.viewport(viewport.x, viewport.y, viewport.width, viewport.height)

        pushMatrix(modelMatrix)
        modelMatrix.scale(0.025, 0.025, 0.025)
        modelMatrix.translate(x, y, z)
        modelMatrix.scale(scale, scale, scale)
        modelMatrix.rotate(rx, 1, 0, 0)
        modelMatrix.rotate((2 * rz) % (this.atom_width * 180 / Math.PI), 0, 0, 1)

        const step = this.atom_width * 180 / Math.PI
        for (let theta = 0; theta < 180 - step; theta += step) {
            pushMatrix(modelMatrix)

            modelMatrix.rotate(theta, 0, 0, 1)

            gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements)
            gl.drawArrays(gl.LINES, 0, this.num_v)
            modelMatrix = popMatrix()
        }

        gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements)
        gl.drawArrays(gl.LINES, this.num_v, 2)

        modelMatrix = popMatrix()
    }

    draw_back (u_ModelMatrix, x, y, z, rx, rz, viewport, scale) {
        // position buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.gl_pos_buf)
        gl.vertexAttribPointer(this.a_Position, 3, gl.FLOAT, false, this.fsize * this.p_fpv, 0)

        // color buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.gl_col_buf)
        gl.vertexAttribPointer(this.a_Color, 4, gl.FLOAT, false, this.fsize * this.c_fpv, 0)

        // visibility buffers
        gl.bindBuffer(gl.ARRAY_BUFFER, this.gl_vis_buf)
        gl.vertexAttribPointer(this.a_Visibility, 1, gl.FLOAT, false, this.fsize * this.v_fpv, 0)

        gl.scissor(viewport.x, viewport.y, viewport.width, viewport.height)
        gl.viewport(viewport.x, viewport.y, viewport.width, viewport.height)

        pushMatrix(modelMatrix)
        modelMatrix.scale(0.025, 0.025, 0.025)
        modelMatrix.translate(x, y, z)
        modelMatrix.scale(scale, scale, scale)
        modelMatrix.rotate(rx, 1, 0, 0)
        modelMatrix.rotate((2 * rz) % (this.atom_width * 180 / Math.PI), 0, 0, 1)

        const step = this.atom_width * 180 / Math.PI
        for (let theta = 180; theta < 360 - step; theta += step) {
            pushMatrix(modelMatrix)

            modelMatrix.rotate(theta, 0, 0, 1)

            gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements)
            gl.drawArrays(gl.LINES, 0, this.num_v)
            modelMatrix = popMatrix()
        }

        modelMatrix = popMatrix()
    }
}
