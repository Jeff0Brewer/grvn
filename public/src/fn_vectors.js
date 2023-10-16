class FnVectors {
    constructor (offsets, images) {
        this.offsets = offsets
        this.images = images
        this.numVertex = 0
    }

    async init_gl (gl) {
        const vert = await fetch('./shaders/force-vert.glsl').then(res => res.text())
        const frag = await fetch('./shaders/force-frag.glsl').then(res => res.text())
        this.program = initProgram(gl, vert, frag)
        bindProgram(gl, this.program)

        this.textures = []
        this.images.forEach(img => {
            const texture = initTexture(gl)
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img)
            gl.generateMipmap(gl.TEXTURE_2D)
            this.textures.push(texture)
        })
        this.images = []

        // get max line count from offsets
        // offsets represent length of all xyz position data
        // number of lines is length of xyz data / 3 since xyz has 3 components
        const maxLineCount = Math.max(...this.offsets) / 3

        // get buffer of vertex indices for
        // texture attribute lookup in shader
        const buffer = new Float32Array(maxLineCount * 6) // 6 vertices per meshline
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

        this.u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix')
        this.u_ViewMatrix = gl.getUniformLocation(gl.program, 'u_ViewMatrix')
        this.u_ProjMatrix = gl.getUniformLocation(gl.program, 'u_ProjMatrix')
        this.u_CameraPosition = gl.getUniformLocation(gl.program, 'u_CameraPosition')
        this.u_DirectionOffset = gl.getUniformLocation(gl.program, 'u_DirectionOffset')
        this.u_TextureDimensions = gl.getUniformLocation(gl.program, 'u_TextureDimensions')

        // TODO: get texture size from images
        gl.uniform2fv(this.u_TextureDimensions, [2048, 1024])
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
        gl.uniform1f(this.u_DirectionOffset, this.offsets[timestep])
        gl.bindTexture(gl.TEXTURE_2D, this.textures[timestep])

        gl.scissor(viewport.x, viewport.y, viewport.width, viewport.height)
        gl.viewport(viewport.x, viewport.y, viewport.width, viewport.height)

        gl.drawArrays(gl.TRIANGLES, 0, this.numVertex)
    }

    slice (planefilters) {
        // for (let t = 0; t < this.visData.length; t++) {
        //    for (let v = 0; v < this.visData[t].length; v++) {
        //        const pos_ind = v / this.v_fpv * this.p_fpv
        //        const pos = [
        //            this.posData[t][pos_ind],
        //            this.posData[t][pos_ind + 1],
        //            this.posData[t][pos_ind + 2]
        //        ]

        //        let outside = false
        //        for (let f = 0; !outside && f < planefilters.length; f++) {
        //            outside = planefilters[f].check(pos)
        //        }
        //        if (outside) { this.visData[t][v] += 1 }
        //    }
        // }
        // this.buffer_changed = true
    }

    unslice (planefilters) {
        // for (let t = 0; t < this.visData.length; t++) {
        //    for (let v = 0; v < this.visData[t].length; v++) {
        //        const pos_ind = v / this.v_fpv * this.p_fpv
        //        const pos = [
        //            this.posData[t][pos_ind],
        //            this.posData[t][pos_ind + 1],
        //            this.posData[t][pos_ind + 2]
        //        ]

        //        let outside = false
        //        for (let f = 0; !outside && f < planefilters.length; f++) {
        //            outside = planefilters[f].check(pos)
        //        }
        //        if (outside) { this.visData[t][v] -= 1 }
        //    }
        // }
        // this.buffer_changed = true
    }

    reset_slices () {
        // for (let t = 0; t < this.visData.length; t++) {
        //     for (let v = 0; v < this.visData[t].length; v++) {
        //         this.visData[t][v] = 0
        //     }
        // }
    }
}
