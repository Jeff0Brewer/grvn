function dist_point_line (point, line) {
    return (point[0] - line[0][0]) * (line[1][1] - line[0][1]) - (point[1] - line[0][1]) * (line[1][0] - line[0][0])
}

function make_vec (a, b) {
    const vec = []
    for (let i = 0; i < a.length; i++) { vec.push(a[i] - b[i]) }
    return vec
}

function resize (vec, delta) {
    let mag = 0
    const resized = []
    for (let i = 0; i < vec.length; i++) {
        mag += Math.pow(vec[i], 2)
    }
    mag = Math.sqrt(mag)
    for (let i = 0; i < vec.length; i++) {
        resized.push(vec[i] * (1 + delta / mag))
    }
    return resized
}

function magnitude (vec) {
    let sum = 0
    for (let i = 0; i < vec.length; i++) {
        sum += Math.pow(vec[i], 2)
    }
    return Math.sqrt(sum)
}

function norm (vec) {
    const mag = magnitude(vec)
    const out = []
    for (let i = 0; i < vec.length; i++) { out.push(vec[i] / mag) }
    return out
}

function angle_between (a, b) {
    return Math.acos(dot(a, b) / (magnitude(a) * magnitude(b)))
}

function cross (a, b) {
    return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
}

function dot (a, b) {
    let sum = 0
    for (let i = 0; i < a.length; i++) { sum += a[i] * b[i] }
    return sum
}

function mult (vec, sclr) {
    const out = []
    for (let i = 0; i < vec.length; i++) { out.push(vec[i] * sclr) }
    return out
}

function sub (a, b) {
    const out = []
    for (let i = 0; i < a.length; i++) { out.push(a[i] - b[i]) }
    return out
}

function add (a, b) {
    const out = []
    for (let i = 0; i < a.length; i++) { out.push(a[i] + b[i]) }
    return out
}

function dist (a, b) {
    let sum = 0
    for (let i = 0; i < a.length; i++) {
        sum += Math.pow(a[i] - b[i], 2)
    }
    return Math.sqrt(sum)
}

function midpoint (a, b) {
    let vec_btwn = []
    for (let i = 0; i < a.length; i++) {
        vec_btwn.push(a[i] - b[i])
    }
    const mid = magnitude(vec_btwn) / 2
    vec_btwn = norm(vec_btwn)
    const out = []
    for (let i = 0; i < a.length; i++) {
        out.push(a[i] + vec_btwn[i] * mid)
    }
    return out
}

function rotateabout (vec, axis, angle) {
    if (magnitude(axis) == 0) { return vec }

    const vec_pll = mult(axis, dot(vec, axis) / dot(axis, axis))
    const vec_perp = sub(vec, vec_pll)
    const w = cross(axis, vec_perp)

    const x1 = Math.cos(angle) / magnitude(vec_perp)
    const x2 = Math.sin(angle) / magnitude(w)

    const vec_perp_rotated = mult(add(mult(vec_perp, x1), mult(w, x2)), magnitude(vec_perp))

    return add(vec_perp_rotated, vec_pll)
}

function pow_map (value, min_in, max_in, min_out, max_out, factor) {
    return Math.pow((value - min_in) / (max_in - min_in), factor) * (max_out - min_out) + min_out
}

function map (value, min_in, max_in, min_out, max_out) {
    return (value - min_in) / (max_in - min_in) * (max_out - min_out) + min_out
}

function unprojectmouse (x, y, Vi, Pi, viewport, winZ, rot) {
    const V = new Matrix4(Vi)
    const P = new Matrix4(Pi)

    const transform_matrix = P.multiply(V).invert()

    const in_vector = new Vector4()
    in_vector.elements[0] = (x - viewport.x) / viewport.width * 2.0 - 1.0
    in_vector.elements[1] = (y - viewport.y) / viewport.height * 2.0 - 1.0
    in_vector.elements[2] = 2.0 * winZ - 1.0
    in_vector.elements[3] = 1.0

    const result_vector = rot.multiplyVector4(transform_matrix.multiplyVector4(in_vector))
    const out = []
    for (let i = 0; i < 3; i++) {
        out.push(result_vector.elements[i] / result_vector.elements[3])
    }

    return out
}

function unprojectvector (x, y, Vi, Pi, viewport, rot) {
    const V = new Matrix4(Vi)
    const P = new Matrix4(Pi)

    const transform_matrix = P.multiply(V).invert()

    const in0 = new Vector4()
    in0.elements[0] = (x - viewport.x) / viewport.width * 2.0 - 1.0
    in0.elements[1] = (y - viewport.y) / viewport.height * 2.0 - 1.0
    in0.elements[2] = -1.0
    in0.elements[3] = 1.0

    const in1 = new Vector4()
    in1.elements[0] = (x - viewport.x) / viewport.width * 2.0 - 1.0
    in1.elements[1] = (y - viewport.y) / viewport.height * 2.0 - 1.0
    in1.elements[2] = 1.0
    in1.elements[3] = 1.0

    const r0 = rot.multiplyVector4(transform_matrix.multiplyVector4(in0))
    const r1 = rot.multiplyVector4(transform_matrix.multiplyVector4(in1))

    const out = [[], []]
    for (let i = 0; i < 3; i++) {
        out[0].push((r0.elements[i] / r0.elements[3]))
        out[1].push((r1.elements[i] / r1.elements[3]))
    }

    return out
}

function getprojectedlength (l, Vi, Pi) {
    const V = new Matrix4(Vi)
    const P = new Matrix4(Pi)

    const transform_matrix = P.multiply(V)

    const vec = new Vector4()
    vec.elements[0] = l
    vec.elements[1] = 0
    vec.elements[2] = 0
    vec.elements[3] = 1

    const result_vec = transform_matrix.multiplyVector4(vec)
    const out = []
    for (let i = 0; i < 3; i++) {
        out.push(result_vec.elements[i] / result_vec.elements[3])
    }

    return magnitude(out)
}

function planefrompoints (center, p1, p2) {
    const normal = norm(cross(sub(p1, center), sub(p2, center)))

    return [normal[0], normal[1], normal[2], -(normal[0] * center[0] + normal[1] * center[1] + normal[2] * center[2])]
}

function add_class (elem, cname) {
    if (!elem.className.includes(cname)) {
        elem.className += cname
        return true
    }
    return false
}

function remove_class (elem, cname) {
    const len = elem.className.length
    elem.className = elem.className.replace(cname, '')
    return len != elem.className.length
}

function replace_class (elem, curr, next) {
    elem.className = elem.className.replace(curr, next)
}

function arrays_equal (a, b) {
    if (a.length !== b.length) { return false }
    for (var i = a.length; i--;) {
        if (a[i] !== b[i]) { return false }
    }
    return true
}

function hex_to_rgb (hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    if (!result) {
        return null
    }
    const r = parseInt(result[1], 16) / 255.0
    const g = parseInt(result[2], 16) / 255.0
    const b = parseInt(result[3], 16) / 255.0
    return [r, g, b]
}

function triangle_check (vec, tri) {
    const pt = vec[0]
    const dir = sub(vec[1], vec[0])

    const edge1 = sub(tri[1], tri[0])
    const edge2 = sub(tri[2], tri[0])

    const pvec = cross(dir, edge2)
    const det = dot(edge1, pvec)

    if (det < 0.000001) { return false }
    const tvec = sub(pt, tri[0])
    const u = dot(tvec, pvec)
    if (u < 0 || u > det) { return false }
    const qvec = cross(tvec, edge1)
    const v = dot(dir, qvec)
    if (v < 0 || u + v > det) { return false }

    return true
}
