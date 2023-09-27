const POS_FPV = 3
const COL_FPV = 3

class CameraTrace {
    async initGl (gl, model, view, proj) {
        const vert = await fetch('./shaders/camera-trace-vert.glsl').then(res => res.text())
        const frag = await fetch('./shaders/camera-trace-frag.glsl').then(res => res.text())
        this.program = initProgram(gl, vert, frag)
        bindProgram(gl, this.program)

        this.pathBuffer = initBuffer(gl)
        this.cameraBuffer = initBuffer(gl)
        this.focusBuffer = initBuffer(gl)
        this.bindAttrib = initAttribute(
            gl,
            this.program,
            'position',
            POS_FPV,
            POS_FPV,
            0,
            gl.FLOAT
        )
        this.numPathVertex = 0
        this.numCameraVerts = 0
        this.numFocusVerts = 0

        const uModelMatrix = gl.getUniformLocation(this.program, 'modelMatrix')
        const uViewMatrix = gl.getUniformLocation(this.program, 'viewMatrix')
        const uProjMatrix = gl.getUniformLocation(this.program, 'projMatrix')

        gl.uniformMatrix4fv(uModelMatrix, false, model.elements)
        gl.uniformMatrix4fv(uViewMatrix, false, view.elements)
        gl.uniformMatrix4fv(uProjMatrix, false, proj.elements)

        this.setModelMatrix = mat => {
            gl.uniformMatrix4fv(uModelMatrix, false, mat.elements)
        }
        this.setViewMatrix = mat => {
            gl.uniformMatrix4fv(uViewMatrix, false, mat.elements)
        }
        this.setProjMatrix = mat => {
            gl.uniformMatrix4fv(uProjMatrix, false, mat.elements)
        }
    }

    setPath (gl, path) {
        const pathVerts = path !== null ? path.getPathTrace() : new Float32Array(0)
        gl.bindBuffer(gl.ARRAY_BUFFER, this.pathBuffer)
        gl.bufferData(gl.ARRAY_BUFFER, pathVerts, gl.STATIC_DRAW)
        this.numPathVertex = pathVerts.length / POS_FPV

        const cameraVerts =
      path !== null ? path.getCameraPoints() : new Float32Array(0)
        gl.bindBuffer(gl.ARRAY_BUFFER, this.cameraBuffer)
        gl.bufferData(gl.ARRAY_BUFFER, cameraVerts, gl.STATIC_DRAW)
        this.numCameraVerts = cameraVerts.length / POS_FPV

        const focusVerts =
      path !== null ? path.getFocusLines() : new Float32Array(0)
        gl.bindBuffer(gl.ARRAY_BUFFER, this.focusBuffer)
        gl.bufferData(gl.ARRAY_BUFFER, focusVerts, gl.STATIC_DRAW)
        this.numFocusVerts = focusVerts.length / POS_FPV
    }

    draw (gl, view) {
        if (this.numCameraVerts > 0) {
            gl.disable(gl.DEPTH_TEST)

            bindProgram(gl, this.program)
            this.setViewMatrix(view)

            gl.bindBuffer(gl.ARRAY_BUFFER, this.pathBuffer)
            this.bindAttrib()
            gl.drawArrays(gl.LINE_STRIP, 0, this.numPathVertex)

            gl.bindBuffer(gl.ARRAY_BUFFER, this.focusBuffer)
            this.bindAttrib()
            gl.drawArrays(gl.LINES, 0, this.numFocusVerts)

            gl.bindBuffer(gl.ARRAY_BUFFER, this.cameraBuffer)
            this.bindAttrib()
            gl.drawArrays(gl.POINTS, 0, this.numCameraVerts)

            gl.enable(gl.DEPTH_TEST)
        }
    }
}

const S = 10 // axis size
const B = 0.5 // axis color brightness
const AXIS_VERTS = new Float32Array([
    0, 0, 0, 1, B, B, // origin, red
    S, 0, 0, 1, B, B, // positive x, red
    0, 0, 0, B, 1, B, // origin, green
    0, S, 0, B, 1, B, // positive y, green
    0, 0, 0, B, B, 1, // origin, blue
    0, 0, S, B, B, 1 // positive z, blue
])

class CameraAxis {
    async initGl (gl, model, view, proj) {
        const vert = await fetch('./shaders/camera-axis-vert.glsl').then(res => res.text())
        const frag = await fetch('./shaders/camera-axis-frag.glsl').then(res => res.text())
        this.program = initProgram(gl, vert, frag)
        bindProgram(gl, this.program)

        const stride = POS_FPV + COL_FPV

        this.buffer = initBuffer(gl)
        gl.bufferData(gl.ARRAY_BUFFER, AXIS_VERTS, gl.STATIC_DRAW)
        this.numVertex = AXIS_VERTS.length / stride

        const bindPosition = initAttribute(
            gl,
            this.program,
            'position',
            POS_FPV,
            stride,
            0,
            gl.FLOAT
        )
        const bindColor = initAttribute(
            gl,
            this.program,
            'color',
            COL_FPV,
            stride,
            POS_FPV,
            gl.FLOAT
        )
        this.bindAttrib = () => {
            bindPosition()
            bindColor()
        }

        const uModelMatrix = gl.getUniformLocation(this.program, 'modelMatrix')
        const uViewMatrix = gl.getUniformLocation(this.program, 'viewMatrix')
        const uProjMatrix = gl.getUniformLocation(this.program, 'projMatrix')

        gl.uniformMatrix4fv(uModelMatrix, false, model.elements)
        gl.uniformMatrix4fv(uViewMatrix, false, view.elements)
        gl.uniformMatrix4fv(uProjMatrix, false, proj.elements)

        this.setModelMatrix = mat => {
            gl.uniformMatrix4fv(uModelMatrix, false, mat.elements)
        }
        this.setViewMatrix = mat => {
            gl.uniformMatrix4fv(uViewMatrix, false, mat.elements)
        }
        this.setProjMatrix = mat => {
            gl.uniformMatrix4fv(uProjMatrix, false, mat.elements)
        }

        this.drawing = false
    }

    setPosition (gl, position) {
        if (position === null) {
            this.drawing = false
        } else {
            const translation = new Matrix4()
            translation.translate(...position)
            bindProgram(gl, this.program)
            this.setModelMatrix(translation)
            this.drawing = true
        }
    }

    draw (gl, view) {
        if (this.drawing) {
            gl.disable(gl.DEPTH_TEST)

            bindProgram(gl, this.program)
            this.setViewMatrix(view)

            gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer)
            this.bindAttrib()
            gl.drawArrays(gl.LINES, 0, this.numVertex)

            gl.enable(gl.DEPTH_TEST)
        }
    }
}
