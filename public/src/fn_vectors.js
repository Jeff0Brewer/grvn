const filterToFunction = (filter) => {
    return `bool outsideSlices (vec3 p) { return ${filter}; }\n`
}
const EMPTY_FILTER = filterToFunction('false')

class FnVectors {
    constructor (metadata, images) {
        this.metadata = metadata
        this.metadata.tex_width = images[0].width
        this.metadata.tex_height = images[0].height

        this.images = images
        this.numVertex = 0

        this.vertSource = ''
        this.fragSource = ''
    }

    updateUniformLocations (gl) {
        this.u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix')
        this.u_ViewMatrix = gl.getUniformLocation(gl.program, 'u_ViewMatrix')
        this.u_ProjMatrix = gl.getUniformLocation(gl.program, 'u_ProjMatrix')
        this.u_CameraPosition = gl.getUniformLocation(gl.program, 'u_CameraPosition')
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
    }

    async init_gl (gl) {
        const vert = await fetch('./shaders/force-vert.glsl').then(res => res.text())
        const frag = await fetch('./shaders/force-frag.glsl').then(res => res.text())
        this.program = initProgram(gl, EMPTY_FILTER + vert, frag)
        bindProgram(gl, this.program)
        this.vertSource = vert
        this.fragSource = frag

        this.textures = []
        this.images.forEach(img => {
            const texture = initTexture(gl)
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img)
            gl.generateMipmap(gl.TEXTURE_2D)
            this.textures.push(texture)
        })
        this.images = []

        // get buffer of vertex indices for
        // texture attribute lookup in shader
        const buffer = new Float32Array(this.metadata.max_lines * 6) // 6 vertices per meshline
        for (let i = 0; i < buffer.length; i++) {
            buffer[i] = i
        }
        this.numVertex = buffer.length

        this.bindIndex = initAttribBuffer(
            gl,
            'a_Index',
            1,
            buffer,
            gl.FLOAT,
            gl.STATIC_DRAW
        )

        this.updateUniformLocations(gl)
        this.updateStaticUniforms(gl)
    }

    draw (gl, viewMatrix, projMatrix, cameraPosition, timestep, viewport) {
        gl.disable(gl.DEPTH_TEST)
        bindProgram(gl, this.program)

        this.bindIndex(gl)

        const scale = 0.025
        const model = new Matrix4()
        model.scale(scale, scale, scale)

        gl.uniformMatrix4fv(this.u_ModelMatrix, false, model.elements)
        gl.uniformMatrix4fv(this.u_ViewMatrix, false, viewMatrix.elements)
        gl.uniformMatrix4fv(this.u_ProjMatrix, false, projMatrix.elements)
        gl.uniform3fv(this.u_CameraPosition, mult(cameraPosition, 1 / scale))
        gl.bindTexture(gl.TEXTURE_2D, this.textures[timestep])

        gl.scissor(viewport.x, viewport.y, viewport.width, viewport.height)
        gl.viewport(viewport.x, viewport.y, viewport.width, viewport.height)

        gl.drawArrays(gl.TRIANGLES, 0, this.numVertex)
    }

    updateSlices (gl, planefilters) {
        // generate glsl filter
        const glslFilter = planefilters.length > 0
            ? filterToFunction(planefilters.map(f => f.glslCheck).join('||'))
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
}
