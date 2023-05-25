class Axis {
    constructor (num_ticks, detail) {
        this.p_fpv = 3

        this.num_v = detail * 2 + 4

        this.position_buffer = new Float32Array((this.num_v + 2) * this.p_fpv)

        this.atom_width = Math.PI * 2 / (num_ticks)

        let last_pos = [Math.cos(0), Math.sin(0), 0]
        const angle_step = this.atom_width / detail
        let pos_ind = 0
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
            this.position_buffer,
            gl.FLOAT,
            gl.STATIC_DRAW
        )

        this.u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix')
        this.u_ViewMatrix = gl.getUniformLocation(gl.program, 'u_ViewMatrix')
        this.u_ProjMatrix = gl.getUniformLocation(gl.program, 'u_ProjMatrix')

        bindProgram(gl, oldProgram)
    }

    draw_angle (angle_start, angle_end, gl, modelMatrix, viewMatrix, projMatrix, x, y, z, rx, rz, viewport, scale) {
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
        model.rotate((2 * rz) % (this.atom_width * 180 / Math.PI), 0, 0, 1)

        gl.uniformMatrix4fv(this.u_ViewMatrix, false, viewMatrix.elements)
        gl.uniformMatrix4fv(this.u_ProjMatrix, false, projMatrix.elements)

        const step = this.atom_width * 180 / Math.PI
        model.rotate(angle_start, 0, 0, 1)
        for (let theta = angle_start; theta < angle_end - step; theta += step) {
            model.rotate(step, 0, 0, 1)
            gl.uniformMatrix4fv(this.u_ModelMatrix, false, model.elements)
            gl.drawArrays(gl.LINES, 0, this.num_v)
        }

        gl.uniformMatrix4fv(this.u_ModelMatrix, false, model.elements)
        gl.drawArrays(gl.LINES, this.num_v, 2)

        bindProgram(gl, oldProgram)
    }

    draw (gl, modelMatrix, viewMatrix, projMatrix, x, y, z, rx, rz, viewport, scale) {
        this.draw_angle(0, 360, gl, modelMatrix, viewMatrix, projMatrix, x, y, z, rx, rz, viewport, scale)
    }

    draw_front (gl, modelMatrix, viewMatrix, projMatrix, x, y, z, rx, rz, viewport, scale) {
        this.draw_angle(0, 180, gl, modelMatrix, viewMatrix, projMatrix, x, y, z, rx, rz, viewport, scale)
    }

    draw_back (gl, modelMatrix, viewMatrix, projMatrix, x, y, z, rx, rz, viewport, scale) {
        this.draw_angle(180, 360, gl, modelMatrix, viewMatrix, projMatrix, x, y, z, rx, rz, viewport, scale)
    }
}
