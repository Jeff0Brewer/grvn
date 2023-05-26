const readFileAsync = file => {
    // temp file reader for single file
    const fileReader = new FileReader()

    // wrap loaded value in promise for async ops
    return new Promise((resolve, reject) => {
        // log errors
        fileReader.onerror = () => {
            fileReader.abort()
            reject(new Error('File read failed'))
        }
        // return result
        fileReader.onload = () => {
            resolve(fileReader.result)
        }
        // start read
        fileReader.readAsBinaryString(file)
    })
}

const scale3DArray = (arr, scale) => {
    for (let i = 0; i < arr.length; i++) {
        for (let j = 0; j < arr[i].length; j++) {
            for (let k = 0; k < arr[i][j].length; k++) {
                arr[i][j][k] *= scale
            }
        }
    }
}

// read / unpack .msgpack file, return contents
const readMsgpack = async (file) => {
    const res = await fetch(file)
    const blob = await res.blob()
    const data = await readFileAsync(blob)
    return msgpack.unpack(data)
}

const loadMetadata = async (dataDir, loadCallback) => {
    const filePath = `${dataDir}/head.msgpack`
    const data = await readMsgpack(filePath)
    const [numT, numG] = data
    loadCallback()
    return { numT, numG }
}

const loadForceVerts = async (dataDir, numFiles, loadCallback) => {
    const posBuffers = []
    const alpBuffers = []
    for (let i = 0; i < numFiles; i++) {
        const filePath = `${dataDir}/fn${i}.msgpack`
        const data = await readMsgpack(filePath)
        posBuffers.push(data[0])
        alpBuffers.push(data[1])
        loadCallback()
    }
    return { posBuffers, alpBuffers }
}

const loadGrainPositions = async (dataDir, numFiles, loadCallback) => {
    const positions = []
    for (let i = 0; i < numFiles; i++) {
        const filePath = `${dataDir}/pos${i}.msgpack`
        const data = await readMsgpack(filePath)
        const scale = 1 / data[0]
        const pos = data[1]
        scale3DArray(pos, scale)
        positions.push(pos)
        loadCallback()
    }
    return [].concat(...positions)
}

const loadGrainRotations = async (dataDir, numFiles, loadCallback) => {
    const rotations = []
    for (let i = 0; i < numFiles; i++) {
        const filePath = `${dataDir}/rot${i}.msgpack`
        const data = await readMsgpack(filePath)
        const scale = 1 / data[0]
        const rot = data[1]
        scale3DArray(rot, scale)
        rotations.push(rot)
        loadCallback()
    }
    return [].concat(...rotations)
}

const loadGrainSurfaces = async (dataDir, numFiles, loadCallback) => {
    const surfaces = []
    for (let i = 0; i < numFiles; i++) {
        const filePath = `${dataDir}/grains${i}.msgpack`
        const data = await readMsgpack(filePath)
        const scale = 1 / data[0]
        const surf = data[1]
        for (let i = 0; i < surf.length; i++) {
            surf[i] *= scale
        }
        surfaces.push(surf)
        loadCallback()
    }
    return [].concat(...surfaces)
}

const loadGrainInds = async (dataDir, loadCallback) => {
    const filePath = `${dataDir}/inds.msgpack`
    const inds = await readMsgpack(filePath)
    loadCallback()
    return inds
}

const loadForces = async (dataDir, loadCallback) => {
    const filePath = `${dataDir}/for.msgpack`
    const forces = await readMsgpack(filePath)
    loadCallback()
    return forces
}

const loadRotationMagnitudes = async (dataDir, loadCallback) => {
    const filePath = `${dataDir}/rmag.msgpack`
    const rotationMagnitudes = await readMsgpack(filePath)
    loadCallback()
    return rotationMagnitudes
}

const load_data = async () => {
    const NUM_FORCE_VERT_FILES = 76
    const NUM_GRAIN_POS_FILES = 4
    const NUM_GRAIN_ROT_FILES = 4
    const NUM_GRAIN_SURFACE_FILES = 4
    const NUM_FILES = NUM_FORCE_VERT_FILES + NUM_GRAIN_POS_FILES + NUM_GRAIN_ROT_FILES + NUM_GRAIN_SURFACE_FILES
    const DATA_DIR = 'data'

    let filesLoaded = 0
    const loadBar = document.getElementById('loadbar')
    const maxLoadWidth = document.getElementById('loadbg').clientWidth
    const updateLoad = () => {
        filesLoaded++
        const loadProgress = filesLoaded / NUM_FILES
        loadBar.style.width = `${(1.0 - loadProgress) * maxLoadWidth}px`
    }
    const loadWrap = document.getElementById('load')

    loadWrap.classList.remove('hidden')

    const { numT, numG } = await loadMetadata(DATA_DIR, updateLoad)
    const { posBuffers, alpBuffers } = await loadForceVerts(DATA_DIR, NUM_FORCE_VERT_FILES, updateLoad)
    const grainPositions = await loadGrainPositions(DATA_DIR, NUM_GRAIN_POS_FILES, updateLoad)
    const grainRotations = await loadGrainRotations(DATA_DIR, NUM_GRAIN_ROT_FILES, updateLoad)
    const grainSurfaces = await loadGrainSurfaces(DATA_DIR, NUM_GRAIN_SURFACE_FILES, updateLoad)
    const inds = await loadGrainInds(DATA_DIR, updateLoad)
    const forces = await loadForces(DATA_DIR, updateLoad)
    const rotationMags = await loadRotationMagnitudes(DATA_DIR, updateLoad)

    loadWrap.classList.add('hidden')

    // run main when data load finished
    main()
}

load_data()
