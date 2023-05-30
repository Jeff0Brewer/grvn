class GrainSurfaces {
    constructor (surfaces, inds, positions, rotations, numT, numG) {
        this.p_fpv = 3
        this.c_fpv = 4
        this.v_fpv = 1
        this.num_t = numT
        this.num_g = numG
        this.buffer_changed = false

        this.inds = inds
        this.positions = positions
        this.rotations = rotations

        this.position_buffer = new Float32Array(surfaces)

        const numVertex = this.position_buffer.length / this.p_fpv
        this.visibility_buffer = new Float32Array(numVertex * this.v_fpv)

        // set default color for all color buffers
        const colorBuffer = new Float32Array(numVertex * this.c_fpv)
        const color = [1, 1, 1, 0.5]
        for (let i = 0; i < colorBuffer.length; i++) {
            colorBuffer[i] = color[i % this.c_fpv]
        }
        this.color_buffers = []
        for (let t = 0; t < numT; t++) {
            this.color_buffers.push(colorBuffer.slice())
        }
    }

    async init_gl (gl) {
        const vert = await fetch('./shaders/vert.glsl').then(res => res.text())
        const frag = await fetch('./shaders/frag.glsl').then(res => res.text())

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
        this.bindCol = initAttribBuffer(
            gl,
            'a_Color',
            this.c_fpv,
            this.color_buffers[0],
            gl.FLOAT,
            gl.STATIC_DRAW
        )
        this.bindVis = initAttribBuffer(
            gl,
            'a_Visibility',
            this.v_fpv,
            this.visibility_buffer,
            gl.FLOAT,
            gl.STATIC_DRAW
        )

        this.u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix')
        this.u_ViewMatrix = gl.getUniformLocation(gl.program, 'u_ViewMatrix')
        this.u_ProjMatrix = gl.getUniformLocation(gl.program, 'u_ProjMatrix')

        bindProgram(gl, oldProgram)
    }

    draw_inds (gl, modelMatrix, viewMatrix, projMatrix, inds, t, rx, rz, viewport) {
        const oldProgram = gl.program
        bindProgram(gl, this.program)

        this.bindPos(gl)
        this.bindVis(gl)
        this.bindCol(gl)
        if (this.buffer_changed) {
            gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.color_buffers[t])
            this.buffer_changed = false
        }

        gl.scissor(viewport.x, viewport.y, viewport.width, viewport.height)
        gl.viewport(viewport.x, viewport.y, viewport.width, viewport.height)

        const model = new Matrix4(modelMatrix)
        model.scale(0.025, 0.025, 0.025)
        model.translate(0, 0, 800)
        model.rotate(rx, 1, 0, 0)
        model.rotate(rz, 0, 0, 1)
        model.translate(0, 0, -800)

        gl.uniformMatrix4fv(this.u_ViewMatrix, false, viewMatrix.elements)
        gl.uniformMatrix4fv(this.u_ProjMatrix, false, projMatrix.elements)

        for (let i = 0; i < inds.length; i++) {
            const grainPos = new Matrix4(model)
            grainPos.translate(
                this.positions[t][inds[i]][0],
                this.positions[t][inds[i]][1],
                this.positions[t][inds[i]][2]
            )
            const quat = new Matrix4()
            quat.setFromQuat(
                this.rotations[t][inds[i]][0],
                this.rotations[t][inds[i]][1],
                this.rotations[t][inds[i]][2],
                this.rotations[t][inds[i]][3]
            )
            grainPos.multiply(quat)

            gl.uniformMatrix4fv(this.u_ModelMatrix, false, grainPos.elements)
            gl.drawArrays(
                gl.TRIANGLES,
                this.inds[inds[i]][1],
                this.inds[inds[i]][2] - this.inds[inds[i]][1]
            )
        }

        bindProgram(gl, oldProgram)
    }

    draw_sm (gl, viewMatrix, projMatrix, selectitem, t, viewport) {
        const oldProgram = gl.program
        bindProgram(gl, this.program)

        this.buffer_changed = true

        const rot = new Matrix4()
        rot.rotate(-selectitem.rotation.x, 1, 0, 0)
        rot.rotate(-selectitem.rotation.y, 0, 1, 0)
        rot.rotate(-selectitem.rotation.z, 0, 0, 1)

        let select_cam = new Vector4()
        select_cam.elements[0] = selectitem.camera.x / 0.025 - selectitem.offsets[t].x
        select_cam.elements[1] = selectitem.camera.y / 0.025 - selectitem.offsets[t].y
        select_cam.elements[2] = selectitem.camera.z / 0.025 - selectitem.offsets[t].z
        select_cam.elements[3] = 1
        select_cam = rot.multiplyVector4(select_cam)

        const cam = [0, 0, 0]
        cam[0] = select_cam.elements[0] / select_cam.elements[3] + selectitem.offsets[t].x
        cam[1] = select_cam.elements[1] / select_cam.elements[3] + selectitem.offsets[t].y
        cam[2] = select_cam.elements[2] / select_cam.elements[3] + selectitem.offsets[t].z

        const pos = this.positions

        function comp (a, b) {
            const da = dist(pos[t][a], cam)
            const db = dist(pos[t][b], cam)
            return db - da
        }

        selectitem.inds.sort(comp)

        this.bindPos(gl)
        this.bindVis(gl)
        this.bindCol(gl)
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.color_buffers[t])

        gl.scissor(viewport.x, viewport.y, viewport.width, viewport.height)
        gl.viewport(viewport.x, viewport.y, viewport.width, viewport.height)

        const modelMatrix = new Matrix4()
        modelMatrix.scale(0.025, 0.025, 0.025)
        modelMatrix.translate(selectitem.offsets[t].x, selectitem.offsets[t].y, selectitem.offsets[t].z)
        modelMatrix.rotate(selectitem.rotation.x, 1, 0, 0)
        modelMatrix.rotate(selectitem.rotation.z, 0, 0, 1)
        modelMatrix.translate(-selectitem.offsets[t].x, -selectitem.offsets[t].y, -selectitem.offsets[t].z)

        viewMatrix.setLookAt(selectitem.camera.x, selectitem.camera.y, selectitem.camera.z, selectitem.offsets[t].x * 0.025, selectitem.offsets[t].y * 0.025, selectitem.offsets[t].z * 0.025, 0, 0, 1)
        gl.uniformMatrix4fv(this.u_ViewMatrix, false, viewMatrix.elements)

        projMatrix.setPerspective(35, viewport.width / viewport.height, 1, 500)
        gl.uniformMatrix4fv(this.u_ProjMatrix, false, projMatrix.elements)

        for (let i = 0; i < selectitem.inds.length; i++) {
            const grainPos = new Matrix4(modelMatrix)

            grainPos.translate(
                this.positions[t][selectitem.inds[i]][0],
                this.positions[t][selectitem.inds[i]][1],
                this.positions[t][selectitem.inds[i]][2]
            )
            const quat = new Matrix4()
            quat.setFromQuat(
                this.rotations[t][selectitem.inds[i]][0],
                this.rotations[t][selectitem.inds[i]][1],
                this.rotations[t][selectitem.inds[i]][2],
                this.rotations[t][selectitem.inds[i]][3]
            )
            grainPos.multiply(quat)

            gl.uniformMatrix4fv(this.u_ModelMatrix, false, grainPos.elements)
            gl.drawArrays(
                gl.TRIANGLES,
                this.inds[selectitem.inds[i]][1],
                this.inds[selectitem.inds[i]][2] - this.inds[selectitem.inds[i]][1]
            )
        }

        bindProgram(gl, oldProgram)
    }

    get_chain (t, vectors, delta, subsets) {
        const inside = []
        for (let g = 0; g < this.positions[t].length; g++) {
            const pos = this.positions[t][g]
            let outside = false
            for (let sub = 0; sub < subsets.length && !outside; sub++) {
                for (let pf = 0; pf < subsets[sub].planefilters.length && !outside; pf++) {
                    outside = subsets[sub].planefilters[pf].check(pos)
                }
            }
            if (!outside) {
                inside.push(g)
            }
        }

        const chain = []
        for (let i = 0; i < inside.length; i++) {
            let hit = false
            for (let v = 0; v < vectors[0].length && !hit; v++) {
                hit = hit | this.hit_test(this.positions[t][inside[i]], vectors[0][v], delta)
            }
            if (hit) {
                for (let v = 0; v < vectors[1].length; v++) {
                    if (this.hit_test(this.positions[t][inside[i]], vectors[1][v], delta)) {
                        chain.push(inside[i])
                        v = vectors[1].length
                    }
                }
            }
        }
        return chain
    }

    get_cross (t, vectors, delta, subsets) {
        const inside = []
        for (let g = 0; g < this.positions[t].length; g++) {
            const pos = this.positions[t][g]
            let outside = false
            for (let sub = 0; sub < subsets.length && !outside; sub++) {
                for (let pf = 0; pf < subsets[sub].planefilters.length && !outside; pf++) {
                    outside = subsets[sub].planefilters[pf].check(pos)
                }
            }
            if (!outside) {
                inside.push(g)
            }
        }

        const cross = []
        for (let i = 0; i < inside.length; i++) {
            let hit = false
            for (let v = 0; v < vectors.length && !hit; v++) {
                hit = hit | this.hit_test(this.positions[t][inside[i]], vectors[v], delta)
                if (hit) {
                    cross.push(inside[i])
                }
            }
        }
        return cross
    }

    get_sliced (subsets) {
        if (subsets.length <= 0) { return [] }
        const sliced = []
        for (let t = 0; t < this.positions.length; t++) {
            sliced.push([])
            for (let g = 0; g < this.positions[t].length; g++) {
                const pos = this.positions[t][g]
                let outside = false
                for (let sub = 0; sub < subsets.length && !outside; sub++) {
                    for (let pf = 0; pf < subsets[sub].planefilters.length && !outside; pf++) {
                        outside = subsets[sub].planefilters[pf].check(pos)
                    }
                }
                if (!outside) {
                    sliced[t].push(this.positions[t][g])
                }
            }
        }
        return sliced
    }

    get_hovering (t, inds, offset, vec, color) {
        const off = [offset.x, offset.y, offset.z]
        const delta = 100
        if (color[0] > 0 || color[1] > 0 || color[2] > 0) {
            const near = []
            for (let i = 0; i < inds.length; i++) {
                if (this.hit_test(this.positions[t][inds[i]], vec, delta)) {
                    near.push(inds[i])
                }
            }
            let canidates = []
            if (canidates.length == 0 && near.length > 0) {
                canidates = near
            }
            const triangles = []
            for (let i = 0; i < canidates.length; i++) {
                for (let tri = this.inds[canidates[i]][1]; tri < this.inds[canidates[i]][2]; tri += 3) {
                    const ind = triangles.length
                    triangles.push([])
                    let dist_from_cam = 0
                    for (let p = 0; p < 3; p++) {
                        triangles[ind].push([])
                        for (let x = 0; x < this.p_fpv; x++) {
                            triangles[ind][p].push(
                                this.position_buffer[(tri + p) * this.p_fpv + x] + this.positions[t][canidates[i]][x]
                            )
                        }
                        dist_from_cam += dist(triangles[ind][p], vec[0])
                    }
                    triangles[ind].push(canidates[i])
                    triangles[ind].push(dist_from_cam / 3)
                }
            }
            triangles.sort(function (a, b) { return a[4] - b[4] })

            for (let i = 0; i < triangles.length; i++) {
                if (triangle_check(vec, triangles[i].slice(0, 3))) {
                    return triangles[i][3]
                }
            }
            return
        }
        return -1
    }

    get_shell () {
        const core = []
        for (let g = 0; g < this.num_g; g++) {
            if (magnitude(this.positions[0][g].slice(0, 2)) > 310 && this.positions[0][g][1] > 0) {
                core.push(g)
            }
        }
        return core
    }

    get_positions (inds, t) {
        const positions = []
        for (let i = 0; i < inds.length; i++) {
            positions.push(this.positions[t][inds[i]])
        }
        return positions
    }

    get_positions_t (inds) {
        const positions = []
        for (let t = 0; t < this.num_t; t++) {
            positions.push([])
            for (let i = 0; i < inds.length; i++) {
                positions[t].push(this.positions[t][inds[i]])
            }
        }
        return positions
    }

    hit_test (pos, vec, delta) {
        const d = magnitude(cross(sub(pos, vec[0]), sub(pos, vec[1]))) / magnitude(sub(vec[1], vec[0]))
        return d < delta
    }

    color_map (color_mapper) {
        for (let t = 0; t < this.num_t; t++) {
            for (let g = 0; g < this.num_g; g++) {
                const mapped = color_mapper.color_map(t, g)
                if (mapped) {
                    const col = [
                        mapped.r,
                        mapped.g,
                        mapped.b,
                        1
                    ]
                    let col_ind = this.inds[g][1] * this.c_fpv
                    for (let i = this.inds[g][1]; i < this.inds[g][2]; i++) {
                        for (let c = 0; c < col.length; c++, col_ind++) {
                            this.color_buffers[t][col_ind] = col[c]
                        }
                    }
                }
            }
        }
    }
}
