importScripts('../lib/concave-hull.js')

onmessage = ({ data }) => {
    const { positions, scaling, delta, id } = data
    const sideBorders = []
    const topBorders = []
    for (let t = 0; t < positions.length; t++) {
        const sidePoints = []
        const topPoints = []
        for (let g = 0; g < positions[t].length; g++) {
            const point = positions[t][g].map(v => v * scaling)
            sidePoints.push([point[0], point[2]])
            topPoints.push([point[0], point[1]])
        }
        sideBorders.push(hull(sidePoints, delta))
        topBorders.push(hull(topPoints, delta))
    }
    postMessage({ sideBorders, topBorders, id })
}
