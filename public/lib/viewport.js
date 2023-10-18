class ViewPort {
    constructor (x, y, width, height, windowWidth, windowHeight) {
        this.x = x
        this.y = y
        this.width = width
        this.height = height

        // store window width / height to scale viewport on window resize
        this.windowWidth = windowWidth || -1
        this.windowHeight = windowHeight || -1
    }

    setCurrent (gl) {
        gl.scissor(this.x, this.y, this.width, this.height)
        gl.viewport(this.x, this.y, this.width, this.height)
    }

    clear (gl) {
        this.setCurrent(gl)
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
    }

    resize (windowWidth, windowHeight) {
        const scaleX = windowWidth / this.windowWidth
        const scaleY = windowHeight / this.windowHeight
        this.windowWidth = windowWidth
        this.windowHeight = windowHeight

        this.x *= scaleX
        this.y *= scaleY
        this.width *= scaleX
        this.height *= scaleY
    }

    check_hit (x, y) {
        return (
            x >= this.x && x < this.x + this.width &&
            y >= this.y && y < this.y + this.height
        )
    }

    equals (other) {
        return (
            this.x === other.x &&
            this.y === other.y &&
            this.width === other.width &&
            this.height === other.height
        )
    }
}
