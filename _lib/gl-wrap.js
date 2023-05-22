// initialize single attribute buffer
const initAttribBuffer = (gl, name, fpv, data, usage) => {
    const buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, data, usage)

    const attrib = gl.getAttribLocation(gl.program, name)
    const bind = gl => {
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
        gl.vertexAttribPointer(
            attrib,
            fpv,
            gl.FLOAT,
            false,
            Float32Array.BYTES_PER_ELEMENT * fpv,
            0 // non-swizzled buffers, no stride
        )
    }
    bind(gl)

    // return closure to bind buffer and set vertex pointer
    return bind
}
