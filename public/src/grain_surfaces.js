const SELECT_DELTA = 15
const HOVER_DELTA = 100

class GrainSurfaces {
    constructor (surfaces, inds, positions, rotations, numT, numG) {
        this.posBuffer = surfaces
        this.inds = inds
        this.positions = positions
        this.rotations = rotations
        this.numT = numT
        this.numG = numG

        const defaultColor = [1.0, 1.0, 1.0]
        const timestepColors = []
        for (let g = 0; g < numG; g++) {
            timestepColors.push(defaultColor.slice())
        }
        this.colors = []
        for (let t = 0; t < numT; t++) {
            this.colors.push(timestepColors.slice())
        }
    }

    async initGl (gl) {
        const vert = await fetch('./shaders/grain-vert.glsl').then(res => res.text())
        const frag = await fetch('./shaders/grain-frag.glsl').then(res => res.text())
        this.program = initProgram(gl, vert, frag)
        bindProgram(gl, this.program)

        this.bindPos = initAttribBuffer(gl, 'a_Position', 3, this.posBuffer, gl.FLOAT, gl.STATIC_DRAW)

        this.u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix')
        this.u_ViewMatrix = gl.getUniformLocation(gl.program, 'u_ViewMatrix')
        this.u_ProjMatrix = gl.getUniformLocation(gl.program, 'u_ProjMatrix')
        this.u_GrainPos = gl.getUniformLocation(gl.program, 'u_GrainPos')
        this.u_Color = gl.getUniformLocation(gl.program, 'u_Color')
    }

    drawGrain (gl, t, i) {
        const grainRotation = new Matrix4()
        grainRotation.setFromQuat(...this.rotations[t][i])

        const grainPos = new Matrix4()
        grainPos.translate(...this.positions[t][i])
        grainPos.multiply(grainRotation)

        gl.uniformMatrix4fv(this.u_GrainPos, false, grainPos.elements)
        gl.uniform3fv(this.u_Color, this.colors[t][i])

        const [startInd, endInd] = this.inds[i]
        gl.drawArrays(gl.TRIANGLES, startInd, endInd - startInd)
    }

    drawOverFullSample (gl, viewMatrix, projMatrix, grainInds, t, viewport) {
        gl.enable(gl.DEPTH_TEST)

        bindProgram(gl, this.program)
        this.bindPos(gl)

        const model = new Matrix4()
        model.scale(0.025, 0.025, 0.025)

        gl.uniformMatrix4fv(this.u_ModelMatrix, false, model.elements)
        gl.uniformMatrix4fv(this.u_ViewMatrix, false, viewMatrix.elements)
        gl.uniformMatrix4fv(this.u_ProjMatrix, false, projMatrix.elements)

        viewport.setCurrent(gl)

        for (const i of grainInds) {
            this.drawGrain(gl, t, i)
        }
    }

    drawSmallMultiples (gl, viewMatrix, projMatrix, selectitem, t, viewport) {
        gl.enable(gl.DEPTH_TEST)

        bindProgram(gl, this.program)
        this.bindPos(gl)

        const scale = 0.025
        const { x: ox, y: oy, z: oz } = selectitem.offsets[t]
        const { x: rx, z: rz } = selectitem.rotation

        const model = new Matrix4()
        model.scale(scale, scale, scale)
        model.translate(ox, oy, oz)
        model.rotate(rx, 1, 0, 0)
        model.rotate(rz, 0, 0, 1)
        model.translate(-ox, -oy, -oz)

        const { x: cx, y: cy, z: cz } = selectitem.camera
        viewMatrix.setLookAt(cx, cy, cz, ox * scale, oy * scale, oz * scale, 0, 0, 1)
        projMatrix.setPerspective(35, viewport.width / viewport.height, 1, 500)

        gl.uniformMatrix4fv(this.u_ModelMatrix, false, model.elements)
        gl.uniformMatrix4fv(this.u_ViewMatrix, false, viewMatrix.elements)
        gl.uniformMatrix4fv(this.u_ProjMatrix, false, projMatrix.elements)

        viewport.setCurrent(gl)

        for (const i of selectitem.inds) {
            this.drawGrain(gl, t, i)
        }
    }

    getChain (t, vectors, subsets) {
        // get grain indices in current slice
        const currentSlice = []
        for (let i = 0; i < this.numG; i++) {
            let inside = true
            for (const subset of subsets) {
                for (const filter of subset.planefilters) {
                    inside = inside && !filter.check(this.positions[t][i])
                }
            }
            if (inside) { currentSlice.push(i) }
        }

        // check intersection with drawn paths
        const [firstPath, secondPath] = vectors
        const chainInds = []
        for (const i of currentSlice) {
            let intersected = false
            for (const vector of firstPath) {
                intersected = intersected || this.hitTest(this.positions[t][i], vector, SELECT_DELTA)
            }

            // don't check second path if no intersection with first
            if (!intersected) { continue }

            intersected = false
            for (const vector of secondPath) {
                intersected = intersected || this.hitTest(this.positions[t][i], vector, SELECT_DELTA)
            }

            // add to chain if intersected by both paths
            if (intersected) { chainInds.push(i) }
        }
        return chainInds
    }

    getSliced (subsets) {
        if (subsets.length === 0) {
            return []
        }
        const sliced = []
        for (let t = 0; t < this.numT; t++) {
            sliced.push([])
            for (let g = 0; g < this.numG; g++) {
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

    getCross (t, vectors, subsets) {
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
                hit = hit | this.hitTest(this.positions[t][inside[i]], vectors[v], SELECT_DELTA)
                if (hit) {
                    cross.push(inside[i])
                }
            }
        }
        return cross
    }

    getHovering (t, inds, offset, vec, color) {
        const off = [offset.x, offset.y, offset.z]
        if (color[0] > 0 || color[1] > 0 || color[2] > 0) {
            const near = []
            for (let i = 0; i < inds.length; i++) {
                if (this.hitTest(this.positions[t][inds[i]], vec, HOVER_DELTA)) {
                    near.push(inds[i])
                }
            }
            let canidates = []
            if (canidates.length == 0 && near.length > 0) {
                canidates = near
            }
            const triangles = []
            for (let i = 0; i < canidates.length; i++) {
                for (let tri = this.inds[canidates[i]][0]; tri < this.inds[canidates[i]][1]; tri += 3) {
                    const ind = triangles.length
                    triangles.push([])
                    let dist_from_cam = 0
                    for (let p = 0; p < 3; p++) {
                        triangles[ind].push([])
                        for (let x = 0; x < 3; x++) {
                            triangles[ind][p].push(
                                this.posBuffer[(tri + p) * 3 + x] + this.positions[t][canidates[i]][x]
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

    getShell () {
        const core = []
        for (let g = 0; g < this.numG; g++) {
            if (magnitude(this.positions[0][g].slice(0, 2)) > 310 && this.positions[0][g][1] > 0) {
                core.push(g)
            }
        }
        return core
    }

    getPositions (inds, t) {
        const positions = []
        for (let i = 0; i < inds.length; i++) {
            positions.push(this.positions[t][inds[i]])
        }
        return positions
    }

    getPositionsT (inds) {
        const positions = []
        for (let t = 0; t < this.numT; t++) {
            positions.push([])
            for (let i = 0; i < inds.length; i++) {
                positions[t].push(this.positions[t][inds[i]])
            }
        }
        return positions
    }

    hitTest (pos, vec, delta) {
        const d = magnitude(cross(sub(pos, vec[0]), sub(pos, vec[1]))) / magnitude(sub(vec[1], vec[0]))
        return d < delta
    }

    colorMap (color_mapper) {
        for (let t = 0; t < this.numT; t++) {
            for (let g = 0; g < this.numG; g++) {
                const mapped = color_mapper.color_map(t, g)
                this.colors[t][g] = [mapped.r, mapped.g, mapped.b]
            }
        }
    }
}
