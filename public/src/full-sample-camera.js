const ROTATE_SPEED = 0.5
const ZOOM_SPEED = 0.1
const UP_VEC = [0, 0, 1]
const NEG_UP_VEC = UP_VEC.map(v => -v)
const RAD_TO_DEG = 180 / Math.PI
const ANGLE_BOUND = 0.1 // max vertical angle = 180 - ANGLE_BOUND

class FullSampleCamera {
    constructor () {
        this.position = [0, 100, 50]
        this.focus = [0, 0, 20]
        this.dragging = false
        this.zRotation = 0
    }

    mousedown (e) {
        this.dragging = true
    }

    mouseup (e) {
        this.dragging = false
    }

    mousemove (e) {
        if (!this.dragging) { return }

        const camvec = sub(this.position, this.focus)
        const axis = norm(cross(camvec, UP_VEC))

        // bound vertical rotation to prevent going upside down
        const maxRotationX = angle_between(camvec, UP_VEC) * RAD_TO_DEG - ANGLE_BOUND
        const minRotationX = -1 * (angle_between(camvec, NEG_UP_VEC) * RAD_TO_DEG - ANGLE_BOUND)

        const rotationX = clamp(e.movementY * ROTATE_SPEED, minRotationX, maxRotationX)
        const rotationZ = -e.movementX * ROTATE_SPEED

        const rotation = new Matrix4()
        rotation.rotate(rotationX, ...axis)
        rotation.rotate(rotationZ, ...UP_VEC)

        const newCamvec = rotation.multiplyVector3(new Vector3(camvec))
        this.position = add(this.focus, newCamvec.elements)

        this.zRotation -= rotationZ
    }

    wheel (e) {
        const camvec = sub(this.position, this.focus)
        const resized = resize(camvec, e.deltaY * ZOOM_SPEED)
        // check if resized camera vec is in same direction as original
        // to prevent zooming past center
        const hasInverted =
            Math.sign(resized[0]) !== Math.sign(camvec[0]) ||
            Math.sign(resized[1]) !== Math.sign(camvec[1]) ||
            Math.sign(resized[2]) !== Math.sign(camvec[2])
        if (!hasInverted) {
            this.position = add(this.focus, resized)
        }
    }

    autoRotate (elapsed, speed) {
        const camvec = sub(this.position, this.focus)
        const rotation = new Matrix4()
        rotation.rotate(elapsed * speed, ...UP_VEC)
        const newCamvec = rotation.multiplyVector3(new Vector3(camvec))
        this.position = add(this.focus, newCamvec.elements)
    }
}
