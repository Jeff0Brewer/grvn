class CameraPath {
    // get camera path object from arrays of 3d points for positions and focuses
    constructor (positions, focuses) {
        if (positions.length !== focuses.length) {
            const msg = `Camera path positions and focuses must have same length, ${positions.length} != ${focuses.length}`
            throw new Error(msg)
        }
        if (positions.length === 0) {
            const msg = 'Camera path must have > 0 steps'
            throw new Error(msg)
        }
        if (positions[0].length !== 3 || focuses[0].length !== 3) {
            const msg = 'Camera points must have 3 dimensions'
            throw new Error(msg)
        }
        this.pos = positions
        this.foc = focuses
        this.len = positions.length
    }

    // get linearly interpolated camera position and focus from t value in range (0, 1)
    get (t) {
        if (t < 0 || t > 1) {
            const msg = `Camera path fraction must be in range (0, 1), recieved value: ${t}`
            throw new Error(msg)
        }

        const indFrac = (this.len - 1) * t
        // return non-interpolated value if t value directly on integer index
        if (indFrac % 1 === 0) {
            return {
                position: this.pos[indFrac],
                focus: this.foc[indFrac]
            }
        }

        const lowInd = Math.floor(indFrac)
        const highInd = Math.ceil(indFrac)
        const lerpPercentage = indFrac - lowInd // don't need to divide by (highInd - lowInd) because always 1

        // interpolate between points in array if t value between indices
        const position = lerpPoint(this.pos[lowInd], this.pos[highInd], lerpPercentage)
        const focus = lerpPoint(this.foc[lowInd], this.foc[highInd], lerpPercentage)
        return { position, focus }
    }
}

const lerpPoint = (a, b, t) => {
    if (!a || !b || a.length !== 3 || b.length !== 3) {
        return [0, 0, 0]
    }
    return [
        a[0] + (b[0] - a[0]) * t,
        a[1] + (b[1] - a[1]) * t,
        a[2] + (b[2] - a[2]) * t
    ]
}

const parseCameraPath = csv => {
    const lines = csv.split('\n')
    // remove last line if incomplete
    // prevents error on extra new line at end of file
    if (lines[lines.length - 1].length !== 6) {
        lines.splice(lines.length - 1, 1)
    }
    const values = lines.map(line => {
        return line.split(',').map(str =>
            parseFloat(str)
        )
    })
    const positions = []
    const focuses = []
    for (const row of values) {
        if (row.length !== 6) {
            const msg = `Camera path csv must have exactly two 3d points per line, recieved ${row.length} values`
            throw new Error(msg)
        }
        positions.push([row[0], row[1], row[2]])
        focuses.push([row[3], row[4], row[5]])
    }
    return new CameraPath(positions, focuses)
}
