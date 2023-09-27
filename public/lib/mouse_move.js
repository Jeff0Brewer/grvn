const ROTATE_SPEED = 0.5
const ZOOM_SPEED = 0.1
const UP_VEC = [0, 0, 1]

class FullSampleCamera {
    constructor () {
        this.dragging = false
        this.zRotation = 0
        this.position = [0, 100, 50]
        this.focus = [0, 0, 20]
    }

    mousedown (e) {
        this.dragging = true
    }

    mousemove (e) {
        if (this.dragging) {
            const camvec = sub(this.position, this.focus)
            const axis = norm(cross(camvec, UP_VEC))

            const rotationZ = -e.movementX * ROTATE_SPEED
            const rotationX = e.movementY * ROTATE_SPEED
            const rotation = new Matrix4()
            rotation.rotate(rotationX, ...axis)
            rotation.rotate(rotationZ, ...UP_VEC)

            const newCamvec = rotation.multiplyVector3(new Vector3(camvec))
            this.position = add(this.focus, newCamvec.elements)

            this.zRotation -= rotationZ
        }
    }

    mouseup (e) {
        this.dragging = false
    }

    wheel (e) {
        const camvec = sub(this.position, this.focus)
        const resized = resize(camvec, e.deltaY * ZOOM_SPEED)
        // check if resized camera vec is in same direction as original
        const hasInverted =
            Math.sign(resized[0]) !== Math.sign(camvec[0]) ||
            Math.sign(resized[1]) !== Math.sign(camvec[1]) ||
            Math.sign(resized[2]) !== Math.sign(camvec[2])
        if (!hasInverted) {
            this.position = add(this.focus, resized)
        }
    }
}
