const INV_SCALE_MAT = (new Matrix4()).scale(1 / 0.025, 1 / 0.025, 1 / 0.025)

class PlaneFilter {
    constructor (point0, point1, sign, viewMatrix, projMatrix, viewport) {
        const [x0, y0] = point0
        const [x1, y1] = point1
        const [xC, yC] = midpoint(point0, point1)
        this.plane = planeFromPoints(
            unprojectmouse(x0, y0, viewMatrix, projMatrix, viewport, 0, INV_SCALE_MAT),
            unprojectmouse(x1, y1, viewMatrix, projMatrix, viewport, 0, INV_SCALE_MAT),
            unprojectmouse(xC, yC, viewMatrix, projMatrix, viewport, 1, INV_SCALE_MAT)
        )

        this.sign = sign

        const [x, y, z, w] = this.plane
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

function planeFromPoints (p0, p1, p2) {
    const [nx, ny, nz] = norm(cross(sub(p1, p0), sub(p2, p0)))
    const [cx, cy, cz] = p0
    return [nx, ny, nz, -(nx * cx + ny * cy + nz * cz)]
}

const toFloatString = (num) => {
    const str = num.toString()
    return num % 1 !== 0 ? str : str + '.0'
}
