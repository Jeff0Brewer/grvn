class RibbonFlow {
    constructor (positions, rotations, forces, max_force, num_t, num_g) {
        this.p_fpv = 3
        this.c_fpv = 4
        this.v_fpv = 1
        this.num_t = num_t
        this.buffer_changed = false
        this.last_step = -1

        const lw = 0.2
        const hw = 15
        const wf = 2.5
        const rs = 10
        // let lc = [.35,.35,.8];
        const lc = [0.55, 0.55, 1]
        const hc = [1, 1, 1]
        const cr = 1
        const mr = 2
        const cmap = 1

        const num_vert = (num_t * num_g + num_g * 2) * 2
        this.position_buffer = new Float32Array(num_vert * this.p_fpv)
        this.color_buffer = new Uint8Array(num_vert * this.c_fpv)
        this.visibility_buffer = new Uint16Array(num_vert * this.v_fpv)
        let pos_ind = 0
        let col_ind = 0
        let vis_ind = 0

        for (let g = 0; g < num_g; g++) {
            let total_rotation = 0

            const last_pos = []
            const this_pos = []
            const last_pll = []
            const this_pll = []
            for (let pp = 0; pp < 3; pp++) {
                last_pos.push(positions[0][g][pp])
                this_pos.push(positions[0][g][pp])
                last_pll.push(this_pos[pp] - last_pos[pp])
                this_pll.push(this_pos[pp] - last_pos[pp])
            }

            let ribbon_vec = norm([
                1 / (positions[1][g][0] - this_pos[0]),
                1 / (positions[1][g][1] - this_pos[1]),
                -2 / (positions[1][g][2] - this_pos[2])
            ])

            for (let pp = 0; pp < this.p_fpv * 2; pp++, pos_ind++) {
                this.position_buffer[pos_ind] = positions[0][g][pp % this.p_fpv]
                last_pos[pp] = positions[0][g][pp % this.p_fpv]
                this_pos[pp] = positions[0][g][pp % this.p_fpv]
            }
            for (let pc = 0; pc < this.c_fpv * 2; pc++, col_ind++) {
                this.color_buffer[col_ind] = 0
            }
            for (let pv = 0; pv < this.v_fpv * 2; pv++, vis_ind++) {
                this.visibility_buffer[vis_ind] = this.num_t
            }

            for (let t = 0; t < num_t; t++) {
                total_rotation += rotations[t][g]

                let mapper = total_rotation
                if (cmap == 1) { mapper = rotations[t][g] }

                for (let pp = 0; pp < this.p_fpv; pp++) {
                    this_pos[pp] = positions[t][g][pp]
                    this_pll[pp] = this_pos[pp] - last_pos[pp]
                }

                const elbow = cross(this_pll, last_pll)
                let elbow_rot = Math.acos(dot(this_pll, last_pll) / (magnitude(this_pll) * magnitude(last_pll)))

                if (Number.isNaN(elbow_rot)) { elbow_rot = 0 }

                ribbon_vec = rotateabout(ribbon_vec, elbow, elbow_rot)
                ribbon_vec = rotateabout(ribbon_vec, this_pll, rs * rotations[t][g] * Math.PI / 180)

                const ribbon_size = pow_map(forces[t][g], 0, max_force, lw, hw, wf)

                for (let p = 0; p < this.p_fpv; p++, pos_ind++) {
                    this.position_buffer[pos_ind] = positions[t][g][p] + ribbon_vec[p] * ribbon_size
                }
                for (let p = 0; p < this.p_fpv; p++, pos_ind++) {
                    this.position_buffer[pos_ind] = positions[t][g][p] - ribbon_vec[p] * ribbon_size
                }

                const col = [
                    pow_map(mapper, 0, mr, lc[0], hc[0], cr),
                    pow_map(mapper, 0, mr, lc[1], hc[1], cr),
                    pow_map(mapper, 0, mr, lc[2], hc[2], cr),
                    Math.pow((14 - magnitude(this_pll)) / 14, 10)
                ]

                for (let c = 0; c < this.c_fpv * 2; c++, col_ind++) {
                    this.color_buffer[col_ind] = col[c % this.c_fpv] * 255
                }

                for (let v = 0; v < this.v_fpv * 2; v++, vis_ind++) {
                    this.visibility_buffer[vis_ind] = t
                }

                for (let pp = 0; pp < this.p_fpv; pp++) {
                    last_pos[pp] = this_pos[pp]
                    last_pll[pp] = this_pll[pp]
                }
            }

            for (let pp = 0; pp < this.p_fpv * 2; pp++, pos_ind++) {
                this.position_buffer[pos_ind] = positions[num_t - 1][g][pp % this.p_fpv]
            }
            for (let pc = 0; pc < this.c_fpv * 2; pc++, col_ind++) {
                this.color_buffer[col_ind] = 0
            }
            for (let pv = 0; pv < this.v_fpv * 2; pv++, vis_ind++) {
                this.visibility_buffer[vis_ind] = this.num_t
            }
        }
    }

    resize_ribbons (gl, scale) {
        for (let i = 0; i < this.position_buffer.length; i += 2 * this.p_fpv) {
            const ribbonLeft = this.position_buffer.slice(i, i + this.p_fpv)
            const ribbonRight = this.position_buffer.slice(i + this.p_fpv, i + 2 * this.p_fpv)
            const ribbonVec = sub(ribbonLeft, ribbonRight)
            const resizedRibbonVec = mult(ribbonVec, scale)
            const newLeft = add(resizedRibbonVec, ribbonRight)
            const newRight = sub(ribbonLeft, resizedRibbonVec)
            for (let j = 0; j < this.p_fpv; j++) {
                this.position_buffer[i + j] = newLeft[j]
            }
            for (let j = 0; j < this.p_fpv; j++) {
                this.position_buffer[i + j + this.p_fpv] = newRight[j]
            }
        }
        this.bindPos(gl)
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.position_buffer)
    }

    async init_gl (gl) {
        const vert = await fetch('./shaders/flow-vert.glsl').then(res => res.text())
        const frag = await fetch('./shaders/flow-frag.glsl').then(res => res.text())
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
        this.bindCol = initAttribBuffer(
            gl,
            'a_Color',
            this.c_fpv,
            this.color_buffer,
            gl.UNSIGNED_BYTE,
            gl.STATIC_DRAW
        )
        this.bindVis = initAttribBuffer(
            gl,
            'a_Visibility',
            this.v_fpv,
            this.visibility_buffer,
            gl.UNSIGNED_SHORT,
            gl.STATIC_DRAW
        )

        this.u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix')
        this.u_ViewMatrix = gl.getUniformLocation(gl.program, 'u_ViewMatrix')
        this.u_ProjMatrix = gl.getUniformLocation(gl.program, 'u_ProjMatrix')
        this.u_TimeStep = gl.getUniformLocation(gl.program, 'u_TimeStep')
    }

    draw (gl, viewMatrix, projMatrix, timestep, viewport) {
        this.buffer_changed ||= timestep !== this.last_step
        this.last_step = timestep

        gl.disable(gl.DEPTH_TEST)
        bindProgram(gl, this.program)

        this.bindPos(gl)
        this.bindCol(gl)
        this.bindVis(gl)
        if (this.buffer_changed) {
            gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.visibility_buffer)
        }

        this.buffer_changed = false

        // drawing
        const model = new Matrix4()
        model.scale(0.025, 0.025, 0.025)

        gl.uniform1f(this.u_TimeStep, timestep)
        gl.uniformMatrix4fv(this.u_ModelMatrix, false, model.elements)
        gl.uniformMatrix4fv(this.u_ViewMatrix, false, viewMatrix.elements)
        gl.uniformMatrix4fv(this.u_ProjMatrix, false, projMatrix.elements)
        gl.scissor(viewport.x, viewport.y, viewport.width, viewport.height)
        gl.viewport(viewport.x, viewport.y, viewport.width, viewport.height)
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, this.position_buffer.length / this.p_fpv)
    }

    slice (planefilters) {
        for (let v = 0; v < this.visibility_buffer.length; v++) {
            const pos_ind = v / this.v_fpv * this.p_fpv
            const pos = [
                this.position_buffer[pos_ind],
                this.position_buffer[pos_ind + 1],
                this.position_buffer[pos_ind + 2]
            ]
            let outside = false
            for (let f = 0; !outside && f < planefilters.length; f++) {
                outside = planefilters[f].check(pos)
            }
            if (outside) {
                this.visibility_buffer[v] += this.num_t
            }
        }
        this.buffer_changed = true
    }

    unslice (planefilters) {
        for (let v = 0; v < this.visibility_buffer.length; v++) {
            const pos_ind = v / this.v_fpv * this.p_fpv
            const pos = [
                this.position_buffer[pos_ind],
                this.position_buffer[pos_ind + 1],
                this.position_buffer[pos_ind + 2]
            ]
            let outside = false
            for (let f = 0; !outside && f < planefilters.length; f++) {
                outside = planefilters[f].check(pos)
            }
            if (outside) {
                this.visibility_buffer[v] -= this.num_t
            }
        }
        this.buffer_changed = true
    }
}
