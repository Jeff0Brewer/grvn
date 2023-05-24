class RibbonFlow {
    constructor (positions, rotations, forces, max_force, num_t, num_g, p_fpv, c_fpv, v_fpv) {
        this.p_fpv = p_fpv
        this.c_fpv = c_fpv
        this.v_fpv = v_fpv
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

        this.position_buffer = new Float32Array((num_t * num_g + num_g * 2) * 2 * p_fpv)
        this.color_buffer = new Float32Array((num_t * num_g + num_g * 2) * 2 * c_fpv)
        let pos_ind = 0
        let col_ind = 0

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

            for (let pp = 0; pp < p_fpv * 2; pp++, pos_ind++) {
                this.position_buffer[pos_ind] = positions[0][g][pp % p_fpv]
                last_pos[pp] = positions[0][g][pp % p_fpv]
                this_pos[pp] = positions[0][g][pp % p_fpv]
            }
            for (let pc = 0; pc < c_fpv * 2; pc++, col_ind++) {
                this.color_buffer[col_ind] = 0
            }

            for (let t = 0; t < num_t; t++) {
                total_rotation += rotations[t][g]

                let mapper = total_rotation
                if (cmap == 1) { mapper = rotations[t][g] }

                const col = [
                    pow_map(mapper, 0, mr, lc[0], hc[0], cr),
                    pow_map(mapper, 0, mr, lc[1], hc[1], cr),
                    pow_map(mapper, 0, mr, lc[2], hc[2], cr)
                ]

                for (let pp = 0; pp < p_fpv; pp++) {
                    this_pos[pp] = positions[t][g][pp]
                    this_pll[pp] = this_pos[pp] - last_pos[pp]
                }

                const elbow = cross(this_pll, last_pll)
                let elbow_rot = Math.acos(dot(this_pll, last_pll) / (magnitude(this_pll) * magnitude(last_pll)))

                if (Number.isNaN(elbow_rot)) { elbow_rot = 0 }

                ribbon_vec = rotateabout(ribbon_vec, elbow, elbow_rot)
                ribbon_vec = rotateabout(ribbon_vec, this_pll, rs * rotations[t][g] * Math.PI / 180)

                const ribbon_size = pow_map(forces[t][g], 0, max_force, lw, hw, wf)

                for (let p = 0; p < p_fpv; p++, pos_ind++) { this.position_buffer[pos_ind] = positions[t][g][p] + ribbon_vec[p] * ribbon_size }
                for (let p = 0; p < p_fpv; p++, pos_ind++) { this.position_buffer[pos_ind] = positions[t][g][p] - ribbon_vec[p] * ribbon_size }

                const op = Math.pow((14 - magnitude(this_pll)) / 14, 10)
                for (let c = 0; c < c_fpv - 1; c++, col_ind++) { this.color_buffer[col_ind] = col[c] }
                this.color_buffer[col_ind] = op
                col_ind++

                for (let c = 0; c < c_fpv - 1; c++, col_ind++) { this.color_buffer[col_ind] = col[c] }
                this.color_buffer[col_ind] = op
                col_ind++

                for (let pp = 0; pp < p_fpv; pp++) {
                    last_pos[pp] = this_pos[pp]
                    last_pll[pp] = this_pll[pp]
                }
            }

            for (let pp = 0; pp < p_fpv * 2; pp++, pos_ind++) {
                this.position_buffer[pos_ind] = positions[num_t - 1][g][pp % p_fpv]
            }
            for (let pc = 0; pc < c_fpv * 2; pc++, col_ind++) {
                this.color_buffer[col_ind] = 0
            }
        }

        this.visibility_buffers = []
        const ribbon_len = (num_t + 2) * 2
        for (let t = 0; t < num_t; t++) {
            this.visibility_buffers.push(new Uint8Array(this.position_buffer.length / this.p_fpv * this.v_fpv))
            let ribbon_ind = 0
            for (let v = 0; v < this.visibility_buffers[t].length; v++, ribbon_ind = (ribbon_ind + 1) % ribbon_len) {
                if (ribbon_ind - 2 <= t * 2) {
                    this.visibility_buffers[t][v] = 0
                } else {
                    this.visibility_buffers[t][v] = 1
                }
            }
        }
    }

    init_buffers () {
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
            gl.FLOAT,
            gl.STATIC_DRAW
        )
        this.bindVis = initAttribBuffer(
            gl,
            'a_Visibility',
            this.v_fpv,
            this.visibility_buffers[0],
            gl.UNSIGNED_BYTE,
            gl.DYNAMIC_DRAW
        )
    }

    draw (gl, u_ModelMatrix, timestep, rx, rz, viewport) {
        this.buffer_changed ||= timestep !== this.last_step
        this.last_step = timestep

        this.bindPos(gl)
        this.bindCol(gl)
        this.bindVis(gl)
        if (this.buffer_changed) {
            gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.visibility_buffers[timestep])
        }

        this.buffer_changed = false

        // drawing
        const model = new Matrix4(modelMatrix)
        model.scale(0.025, 0.025, 0.025)
        model.translate(0, 0, 800)
        model.rotate(rx, 1, 0, 0)
        model.rotate(rz, 0, 0, 1)
        model.translate(0, 0, -800)

        gl.uniformMatrix4fv(u_ModelMatrix, false, model.elements)
        gl.scissor(viewport.x, viewport.y, viewport.width, viewport.height)
        gl.viewport(viewport.x, viewport.y, viewport.width, viewport.height)
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, this.position_buffer.length / this.p_fpv)
    }

    slice (planefilters) {
        for (let v = 0; v < this.visibility_buffers[0].length; v++) {
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
                for (let t = 0; t < this.num_t; t++) { this.visibility_buffers[t][v] += 1 }
            }
        }
        this.buffer_changed = true
    }

    unslice (planefilters) {
        for (let v = 0; v < this.visibility_buffers[0].length; v++) {
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
                for (let t = 0; t < this.num_t; t++) { this.visibility_buffers[t][v] -= 1 }
            }
        }
        this.buffer_changed = true
    }

    reset_slices () {
        const ribbon_len = (this.num_t + 2) * 2
        for (let t = 0; t < this.num_t; t++) {
            let ribbon_ind = 0
            for (let v = 0; v < this.visibility_buffers[t].length; v++, ribbon_ind = (ribbon_ind + 1) % ribbon_len) {
                if (ribbon_ind - 2 <= t * 2) {
                    this.visibility_buffers[t][v] = 0
                } else {
                    this.visibility_buffers[t][v] = 1
                }
            }
        }
    }
}
