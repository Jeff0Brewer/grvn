const filterToFunction = (filter) => {
    return `bool outsideSlices (vec3 p) { return ${filter}; }\n`
}
const EMPTY_FILTER = filterToFunction('false')
const DEFAULT_LINE_WIDTH = 1.5

class ForcePlot {
    constructor (metadata, images) {
        this.images = images
        this.metadata = metadata
        this.metadata.tex_width = images[0].width
        this.metadata.tex_height = images[0].height

        // 6 vertices per meshline segment
        this.numVertex = metadata.max_lines * 6

        this.lineWidth = DEFAULT_LINE_WIDTH
        this.vertSource = ''
        this.fragSource = ''
    }

    async initGl (gl) {
        const vert = await fetch('./shaders/force-vert.glsl').then(res => res.text())
        const frag = await fetch('./shaders/force-frag.glsl').then(res => res.text())
        this.program = initProgram(gl, EMPTY_FILTER + vert, frag)
        bindProgram(gl, this.program)

        // store shader sources for recompiling on slice
        this.vertSource = vert
        this.fragSource = frag

        this.textures = []
        this.images.forEach(img => {
            const texture = initTexture(gl)
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img)
            gl.generateMipmap(gl.TEXTURE_2D)
            this.textures.push(texture)
        })

        // lose images reference for gc
        this.images = []

        // fill buffer with vertex indices for attribute lookup from texture in shader
        const buffer = new Float32Array(this.numVertex)
        for (let i = 0; i < buffer.length; i++) {
            buffer[i] = i
        }
        this.bindIndex = initAttribBuffer(gl, 'a_Index', 1, buffer, gl.FLOAT, gl.STATIC_DRAW)

        this.updateUniformLocations(gl)
        this.updateStaticUniforms(gl)
    }

    draw (gl, viewMatrix, projMatrix, cameraPosition, timestep, viewport) {
        gl.enable(gl.DEPTH_TEST)
        gl.depthMask(false)

        bindProgram(gl, this.program)
        this.bindIndex(gl)

        const scale = 0.025
        const model = new Matrix4()
        model.scale(scale, scale, scale)
        // scale camera to same space as vertex coords
        const scaledCameraPosition = mult(cameraPosition, 1 / scale)

        gl.uniformMatrix4fv(this.u_ModelMatrix, false, model.elements)
        gl.uniformMatrix4fv(this.u_ViewMatrix, false, viewMatrix.elements)
        gl.uniformMatrix4fv(this.u_ProjMatrix, false, projMatrix.elements)
        gl.uniform3fv(this.u_CameraPosition, scaledCameraPosition)
        gl.bindTexture(gl.TEXTURE_2D, this.textures[timestep])

        viewport.setCurrent(gl)

        gl.drawArrays(gl.TRIANGLES, 0, this.numVertex)

        gl.depthMask(true)
    }

    updateUniformLocations (gl) {
        this.u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix')
        this.u_ViewMatrix = gl.getUniformLocation(gl.program, 'u_ViewMatrix')
        this.u_ProjMatrix = gl.getUniformLocation(gl.program, 'u_ProjMatrix')
        this.u_CameraPosition = gl.getUniformLocation(gl.program, 'u_CameraPosition')
        this.u_LineWidth = gl.getUniformLocation(gl.program, 'u_LineWidth')
    }

    updateStaticUniforms (gl) {
        const u_TexDim = gl.getUniformLocation(gl.program, 'u_TextureDimensions')
        const u_InvScl = gl.getUniformLocation(gl.program, 'u_InvFloatScale')
        const u_MinPos = gl.getUniformLocation(gl.program, 'u_MinPosition')
        const u_MaxPos = gl.getUniformLocation(gl.program, 'u_MaxPosition')
        gl.uniform2f(u_TexDim, this.metadata.tex_width, this.metadata.tex_height)
        gl.uniform1f(u_InvScl, 1 / this.metadata.float_scale)
        gl.uniform1f(u_MinPos, this.metadata.min_pos)
        gl.uniform1f(u_MaxPos, this.metadata.max_pos)
        gl.uniform1f(this.u_LineWidth, this.lineWidth)
    }

    updateSlices (gl, slices) {
        const filters = slices.map(s => s.planefilters).flat()
        // generate glsl filter
        const glslFilter = filters.length > 0
            ? filterToFunction(filters.map(f => f.glslCheck).join('||'))
            : EMPTY_FILTER

        // recompile program with new filter
        const newProgram = initProgram(gl, glslFilter + this.vertSource, this.fragSource)

        // switch to new program, set uniforms
        bindProgram(gl, newProgram)
        this.updateUniformLocations(gl)
        this.updateStaticUniforms(gl)

        // delete old program
        gl.deleteProgram(this.program)
        this.program = newProgram
    }

    setLineWidth (gl, width) {
        this.lineWidth = width
        gl.uniform1f(this.u_LineWidth, this.lineWidth)
    }
}
