const MIN_WIDTH = 0.2
const MAX_WIDTH = 15
const WIDTH_EXP = 2.5
const MIN_COLOR = [140, 140, 255]
const MAX_COLOR = [255, 255, 255]
const ROTATION_SCALE = 10
const MAX_ROTATION = 2
const DEG_TO_RAD = 180 / Math.PI

class RibbonFlow {
    constructor (positions, rotations, forces, maxForce, numT, numG) {
        this.pFpv = 3
        this.cFpv = 4
        this.vFpv = 1

        this.numT = numT
        this.lastTimestep = -1
        this.visibilityChanged = false

        const numVertex = (numT * numG + numG * 2) * 2
        this.posBuffer = new Float32Array(numVertex * this.pFpv)
        this.colBuffer = new Uint8Array(numVertex * this.cFpv)
        this.visBuffer = new Uint16Array(numVertex * this.vFpv)

        let posInd = 0
        let colInd = 0
        let visInd = 0

        const addHiddenVerts = (position) => {
            for (let i = 0; i < 2; i++) {
                this.posBuffer.set(position, posInd)
                this.colBuffer.set([0, 0, 0, 0], colInd)
                this.visBuffer[visInd] = this.numT

                posInd += this.pFpv
                colInd += this.cFpv
                visInd += this.vFpv
            }
        }

        const mapColor = (rotation, pllVec) => {
            return [
                map(rotation, 0, MAX_ROTATION, MIN_COLOR[0], MAX_COLOR[0]),
                map(rotation, 0, MAX_ROTATION, MIN_COLOR[1], MAX_COLOR[1]),
                map(rotation, 0, MAX_ROTATION, MIN_COLOR[2], MAX_COLOR[2]),
                Math.pow((14 - magnitude(pllVec)) / 14, 10) * 255
            ]
        }

        // one ribbon per grain
        for (let g = 0; g < numG; g++) {
            const lastPos = positions[0][g].slice()
            const thisPos = positions[0][g].slice()
            const lastPll = [0, 0, 0]
            const thisPll = [0, 0, 0]

            // initialize ribbon direction vector perpendicular to line motion
            const firstLine = sub(positions[1][g], positions[0][g])
            let ribbonVec = norm([1 / firstLine[0], 1 / firstLine[1], -2 / firstLine[2]])

            addHiddenVerts(positions[0][g])

            // num timstep positions per ribbon
            for (let t = 0; t < numT; t++) {
                for (let i = 0; i < this.pFpv; i++) {
                    thisPos[i] = positions[t][g][i]
                    thisPll[i] = thisPos[i] - lastPos[i]
                }

                // rotate ribbon by change in grain motion direction
                const motionAngle = angle_between(thisPll, lastPll)
                const motionAxis = cross(thisPll, lastPll)
                ribbonVec = rotateabout(ribbonVec, motionAxis, motionAngle)

                // rotate ribbon about center based on grain rotation at timestep
                const ribbonRotation = rotations[t][g] * DEG_TO_RAD * ROTATION_SCALE
                ribbonVec = rotateabout(ribbonVec, thisPll, ribbonRotation)

                const ribbonSize = pow_map(forces[t][g], 0, maxForce, MIN_WIDTH, MAX_WIDTH, WIDTH_EXP)

                const color = mapColor(rotations[t][g], thisPll)

                // copy ribbon attributes into buffers
                for (let i = 0; i < this.pFpv; i++, posInd++) {
                    this.posBuffer[posInd] = thisPos[i] + ribbonVec[i] * ribbonSize
                    this.posBuffer[posInd + this.pFpv] = thisPos[i] - ribbonVec[i] * ribbonSize
                }
                posInd += this.pFpv
                for (let i = 0; i < this.cFpv; i++, colInd++) {
                    this.colBuffer[colInd] = color[i]
                    this.colBuffer[colInd + this.cFpv] = color[i]
                }
                colInd += this.cFpv
                for (let i = 0; i < this.vFpv; i++, visInd++) {
                    this.visBuffer[visInd] = t
                    this.visBuffer[visInd + this.vFpv] = t
                }
                visInd += this.vFpv

                for (let i = 0; i < this.pFpv; i++) {
                    lastPos[i] = thisPos[i]
                    lastPll[i] = thisPll[i]
                }
            }

            addHiddenVerts(positions[numT - 1][g])
        }
    }

    async init_gl (gl) {
        const vert = await fetch('./shaders/flow-vert.glsl').then(res => res.text())
        const frag = await fetch('./shaders/flow-frag.glsl').then(res => res.text())
        this.program = initProgram(gl, vert, frag)
        bindProgram(gl, this.program)

        this.bindPos = initAttribBuffer(
            gl,
            'a_Position',
            this.pFpv,
            this.posBuffer,
            gl.FLOAT,
            gl.STATIC_DRAW
        )
        this.bindCol = initAttribBuffer(
            gl,
            'a_Color',
            this.cFpv,
            this.colBuffer,
            gl.UNSIGNED_BYTE,
            gl.STATIC_DRAW
        )
        this.bindVis = initAttribBuffer(
            gl,
            'a_Visibility',
            this.vFpv,
            this.visBuffer,
            gl.UNSIGNED_SHORT,
            gl.STATIC_DRAW
        )

        this.u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix')
        this.u_ViewMatrix = gl.getUniformLocation(gl.program, 'u_ViewMatrix')
        this.u_ProjMatrix = gl.getUniformLocation(gl.program, 'u_ProjMatrix')
        this.u_TimeStep = gl.getUniformLocation(gl.program, 'u_TimeStep')
    }

    draw (gl, viewMatrix, projMatrix, timestep, viewport) {
        gl.enable(gl.DEPTH_TEST)
        gl.depthMask(false)

        this.visibilityChanged ||= timestep !== this.lastTimestep
        this.lastTimestep = timestep

        bindProgram(gl, this.program)
        this.bindPos(gl)
        this.bindCol(gl)
        this.bindVis(gl)
        if (this.visibilityChanged) {
            gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.visBuffer)
            this.visibilityChanged = false
        }

        // drawing
        const model = new Matrix4()
        model.scale(0.025, 0.025, 0.025)

        gl.uniform1f(this.u_TimeStep, timestep)
        gl.uniformMatrix4fv(this.u_ModelMatrix, false, model.elements)
        gl.uniformMatrix4fv(this.u_ViewMatrix, false, viewMatrix.elements)
        gl.uniformMatrix4fv(this.u_ProjMatrix, false, projMatrix.elements)

        viewport.setCurrent(gl)

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, this.posBuffer.length / this.pFpv)

        gl.depthMask(true)
    }

    updateSlice (planefilters, visibilityDelta) {
        const posIndToVisInd = this.vFpv / this.pFpv
        for (let i = 0; i < this.posBuffer.length; i += this.pFpv) {
            const pos = this.posBuffer.slice(i, i + 3)

            let outside = false
            for (const filter of planefilters) {
                outside = outside || filter.check(pos)
            }

            if (outside) {
                this.visBuffer[i * posIndToVisInd] += visibilityDelta
            }
        }
        this.visibilityChanged = true
    }

    slice (planefilters) {
        this.updateSlice(planefilters, this.numT)
    }

    unslice (planefilters) {
        this.updateSlice(planefilters, -this.numT)
    }

    resizeRibbons (gl, scale) {
        for (let i = 0; i < this.posBuffer.length; i += 2 * this.pFpv) {
            const ribbonLeft = this.posBuffer.slice(i, i + this.pFpv)
            const ribbonRight = this.posBuffer.slice(i + this.pFpv, i + 2 * this.pFpv)
            const center = midpoint(ribbonLeft, ribbonRight)

            const newLeft = add(mult(sub(ribbonLeft, center), scale), center)
            const newRight = add(mult(sub(ribbonRight, center), scale), center)

            for (let j = 0; j < this.pFpv; j++) {
                this.posBuffer[i + j] = newLeft[j]
                this.posBuffer[i + j + this.pFpv] = newRight[j]
            }
        }
        this.bindPos(gl)
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.posBuffer)
    }
}
