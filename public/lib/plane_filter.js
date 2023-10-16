const toFloatString = (num) => {
    const str = num.toString()
    return num % 1 !== 0 ? str : str + '.0'
}

class PlaneFilter {
    constructor (plane, sign) {
        this.plane = plane
        this.sign = sign

        const [x, y, z, w] = plane
        this.invDist = Math.sqrt(x * x + y * y + z * z)

        const fX = toFloatString(x)
        const fY = toFloatString(y)
        const fZ = toFloatString(z)
        const fW = toFloatString(w)
        const fSign = toFloatString(sign)
        const fInvDist = toFloatString(this.invDist)
        this.glslCheck = `${fSign}==sign(${fInvDist}*(${fX}*p.x+${fY}*p.y+${fZ}*p.z+${fW}))`
    }

    check (point) {
        const det = this.invDist * (
            this.plane[0] * point[0] +
            this.plane[1] * point[1] +
            this.plane[2] * point[2] +
            this.plane[3]
        )
        return this.sign === Math.sign(det)
    }
}
