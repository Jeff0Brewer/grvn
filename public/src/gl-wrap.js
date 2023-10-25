// compile program from sources, report errors
const initProgram = (gl, vertSource, fragSource) => {
    const vert = initShader(gl, vertSource, gl.VERTEX_SHADER)
    const frag = initShader(gl, fragSource, gl.FRAGMENT_SHADER)

    const program = gl.createProgram()
    if (!program) {
        throw new Error('Program creation failed')
    }

    // link program from shaders
    gl.attachShader(program, vert)
    gl.attachShader(program, frag)
    gl.linkProgram(program)

    // free shaders linked in program
    gl.deleteShader(vert)
    gl.deleteShader(frag)

    const linked = gl.getProgramParameter(program, gl.LINK_STATUS)
    if (!linked) {
        const log = gl.getProgramInfoLog(program)
        gl.deleteProgram(program)
        throw new Error(`Program linking failed: ${log}`)
    }
    return program
}

const initShader = (gl, source, type) => {
    const shader = gl.createShader(type)
    if (!shader) {
        throw new Error('Shader creation failed')
    }

    gl.shaderSource(shader, source)
    gl.compileShader(shader)

    const compiled = gl.getShaderParameter(shader, gl.COMPILE_STATUS)
    if (!compiled) {
        const log = gl.getShaderInfoLog(shader)
        gl.deleteShader(shader)
        throw new Error(`Shader compilation failed: ${log}`)
    }

    return shader
}

// initialize single attribute buffer
const initAttribBuffer = (gl, name, fpv, data, glType, usage) => {
    const buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, data, usage)

    const attrib = gl.getAttribLocation(gl.program, name)
    const bind = gl => {
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
        gl.vertexAttribPointer(
            attrib,
            fpv,
            glType,
            false,
            data.BYTES_PER_ELEMENT * fpv,
            0 // non-swizzled buffers, no stride
        )
    }
    bind(gl)
    gl.enableVertexAttribArray(attrib)

    // return closure to bind buffer and set vertex pointer
    return bind
}

// set current program
const bindProgram = (gl, program) => {
    gl.useProgram(program)
    gl.program = program
}

const initBuffer = (gl) => {
    const buffer = gl.createBuffer()
    if (!buffer) {
        throw new Error('Buffer creation failed')
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    return buffer
}

const initAttribute = (gl, program, name, size, stride, offset, type) => {
    const location = gl.getAttribLocation(program, name)
    if (location === -1) {
        throw new Error(`Attribute ${name} not found in program`)
    }

    let byteSize = 0
    if (type === gl.FLOAT) {
        byteSize = Float32Array.BYTES_PER_ELEMENT
    } else if (type === gl.UNSIGNED_BYTE) {
        byteSize = Uint8Array.BYTES_PER_ELEMENT
    }

    // store vertex attrib pointer call in closure for future binding
    const bindAttrib = () => {
        gl.vertexAttribPointer(
            location,
            size,
            type,
            false,
            stride * byteSize,
            offset * byteSize
        )
    }
    bindAttrib()

    gl.enableVertexAttribArray(location)
    return bindAttrib
}

const initTexture = (gl) => {
    const texture = gl.createTexture()
    if (!texture) {
        throw new Error('Texture creation failed')
    }
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        1,
        1,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        new Uint8Array([0, 0, 0, 255])
    )
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    return texture
}
