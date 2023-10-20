const SELECT_DELTA = 15
const HOVER_DELTA = 100

class GrainSurfaces {
    constructor (surfaces, indBounds, positions, rotations, numT, numG) {
        this.posBuffer = surfaces
        this.indBounds = indBounds
        this.positions = positions
        this.rotations = rotations
        this.numT = numT
        this.numG = numG

        const defaultColor = [1.0, 1.0, 1.0]
        const singleTimestepColors = []
        for (let g = 0; g < numG; g++) {
            singleTimestepColors.push(defaultColor.slice())
        }
        this.colors = []
        for (let t = 0; t < numT; t++) {
            this.colors.push(singleTimestepColors.slice())
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

        const [startInd, endInd] = this.indBounds[i]
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

    getSliceInds (t, slices) {
        const currentSlice = []
        for (let i = 0; i < this.numG; i++) {
            let inside = true
            for (const slice of slices) {
                for (const filter of slice.planefilters) {
                    inside = inside && !filter.check(this.positions[t][i])
                }
            }
            if (inside) { currentSlice.push(i) }
        }
        return currentSlice
    }

    getSlicePositions (subsets) {
        if (subsets.length === 0) { return [] }

        const slicePositions = []
        for (let t = 0; t < this.numT; t++) {
            const inds = this.getSliceInds(t, subsets)
            const positions = inds.map(i => this.positions[t][i])
            slicePositions.push(positions)
        }

        return slicePositions
    }

    getChain (t, vectors, slices) {
        // get grain indices in current slice
        const currentSlice = this.getSliceInds(t, slices)

        // check intersection with drawn paths
        const [firstPath, secondPath] = vectors
        const chainInds = []
        for (const i of currentSlice) {
            const intersectFirstPath = this.hitTest(this.positions[t][i], firstPath, SELECT_DELTA)

            // don't check second path if no intersection with first
            if (!intersectFirstPath) { continue }

            const intersectSecondPath = this.hitTest(this.positions[t][i], secondPath, SELECT_DELTA)

            // add to chain if intersected by both paths
            if (intersectSecondPath) { chainInds.push(i) }
        }
        return chainInds
    }

    getPlane (t, vectors, slices) {
        const currentSlice = this.getSliceInds(t, slices)

        const plane = []
        for (const i of currentSlice) {
            const intersectsPath = this.hitTest(this.positions[t][i], vectors, SELECT_DELTA)
            if (intersectsPath) { plane.push(i) }
        }
        return plane
    }

    getHovering (t, inds, offset, mouseVec, mousePixel) {
        // no hovered grain if hovering black (background) pixel
        const [r, g, b] = mousePixel
        if (r === 0 && g === 0 && b === 0) {
            return null
        }

        const cameraPosition = mouseVec[0]

        // find grain indices close to mouse for hit test / depth sorting
        // since don't want to check all grain surfaces
        const nearInds = []
        for (const i of inds) {
            const nearMouse = this.hitTestSingle(this.positions[t][i], mouseVec, HOVER_DELTA)
            if (nearMouse) {
                nearInds.push(i)
            }
        }

        // find all grain depths for depth sorting and all surface triangles for hit testing
        const grainDepths = []
        const grainTriangles = {}
        for (const i of nearInds) {
            const [startInd, endInd] = this.indBounds[i]
            const invNumPoints = 1 / (endInd - startInd)

            let grainDepth = 0
            const triangles = []
            for (let ti = startInd; ti < endInd; ti += 3) {
                const triangle = []
                for (let pi = 0; pi < 3; pi++) {
                    const point = []
                    for (let ci = 0; ci < 3; ci++) {
                        const vertexCoordinate = this.posBuffer[(ti + pi) * 3 + ci]
                        const grainCoordinate = this.positions[t][i][ci]
                        point.push(vertexCoordinate + grainCoordinate)
                    }
                    grainDepth += dist(point, cameraPosition) * invNumPoints
                    triangle.push(point)
                }
                triangles.push(triangle)
            }
            grainDepths.push([i, grainDepth])
            grainTriangles[i] = triangles
        }

        // in order of ascending grain depth, hit test surface triangles
        // with mouse vec to find hovered grain
        grainDepths.sort((a, b) => a[1] - b[1])
        for (const [grainInd] of grainDepths) {
            for (const triangle of grainTriangles[grainInd]) {
                const intersectsMouseVec = triangle_check(mouseVec, triangle)
                if (intersectsMouseVec) {
                    return grainInd
                }
            }
        }

        return null
    }

    getPositions (inds, t) {
        return inds.map(i => this.positions[t][i])
    }

    getPositionsAllT (inds) {
        const positions = []
        for (let t = 0; t < this.numT; t++) {
            positions.push(this.getPositions(inds, t))
        }
        return positions
    }

    colorMap (colorMapper) {
        for (let t = 0; t < this.numT; t++) {
            for (let g = 0; g < this.numG; g++) {
                this.colors[t][g] = colorMapper.map(t, g)
            }
        }
    }

    hitTestSingle (position, vector, delta) {
        const crossMag = magnitude(
            cross(
                sub(position, vector[0]),
                sub(position, vector[1])
            )
        )
        const vectorMag = magnitude(sub(vector[0], vector[1]))
        return crossMag / vectorMag < delta
    }

    hitTest (position, vectors, delta) {
        for (const vector of vectors) {
            if (this.hitTestSingle(position, vector, delta)) {
                return true
            }
        }
        return false
    }
}
