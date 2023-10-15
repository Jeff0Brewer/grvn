// wrap filereader events in promise for async ops
const readFileAsync = file => {
    // temp file reader for single file
    const fileReader = new FileReader()

    // wrap loaded value in promise
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

// wrap image events in promise for async loading
const loadImageAsync = async (source, callback) => {
    return new Promise((resolve, reject) => {
        const image = new Image()
        image.src = source
        image.addEventListener('load', () => {
            if (callback !== undefined) {
                callback()
            }
            resolve(image)
        })
        image.addEventListener('error', () => {
            reject(new Error(`failed to load image ${source}`))
        })
    })
}

// read / unpack .msgpack file, return contents
const readMsgpack = async (blob) => {
    const data = await readFileAsync(blob)
    return msgpack.unpack(data)
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

const loadMetadata = async (dataSet, loadCallback) => {
    const file = 'head.msgpack'
    const data = await readMsgpack(dataSet[file])
    const [numT, numG] = data
    loadCallback()
    return { numT, numG }
}

const loadForceVerts = async (dataSet, numFiles, loadCallback) => {
    const posBuffers = []
    const alpBuffers = []
    const visBuffers = []
    for (let i = 0; i < numFiles; i++) {
        const file = `fn${i}.msgpack`
        const data = await readMsgpack(dataSet[file])
        posBuffers.push(new Float32Array(data[0]))
        alpBuffers.push(new Uint8Array(data[1]))
        // 1 alpha value per vertex, length of alpha buffer is num vertex
        const numVertex = data[1].length
        visBuffers.push(new Uint8Array(numVertex))
        loadCallback()
    }
    return { posBuffers, alpBuffers, visBuffers }
}

const loadGrainPositions = async (dataSet, numFiles, loadCallback) => {
    const positions = []
    for (let i = 0; i < numFiles; i++) {
        const file = `pos${i}.msgpack`
        const data = await readMsgpack(dataSet[file])
        const scale = 1 / data[0]
        const pos = data[1]
        scale3DArray(pos, scale)
        positions.push(pos)
        loadCallback()
    }
    return [].concat(...positions)
}

const loadGrainRotations = async (dataSet, numFiles, loadCallback) => {
    const rotations = []
    for (let i = 0; i < numFiles; i++) {
        const file = `rot${i}.msgpack`
        const data = await readMsgpack(dataSet[file])
        const scale = 1 / data[0]
        const rot = data[1]
        scale3DArray(rot, scale)
        rotations.push(rot)
        loadCallback()
    }
    return [].concat(...rotations)
}

const loadGrainSurfaces = async (dataSet, numFiles, loadCallback) => {
    const surfaces = []
    for (let i = 0; i < numFiles; i++) {
        const file = `grains${i}.msgpack`
        const data = await readMsgpack(dataSet[file])
        const scale = 1 / data[0]
        const surf = data[1]
        for (let i = 0; i < surf.length; i++) {
            surf[i] *= scale
        }
        surfaces.push(surf)
        loadCallback()
    }
    return new Float32Array([].concat(...surfaces))
}

const loadGrainInds = async (dataSet, loadCallback) => {
    const file = 'inds.msgpack'
    const inds = await readMsgpack(dataSet[file])
    loadCallback()
    return inds
}

const loadForces = async (dataSet, loadCallback) => {
    const file = 'for.msgpack'
    const [maxForce, forces] = await readMsgpack(dataSet[file])
    loadCallback()
    return { maxForce, forces }
}

const loadRotationMagnitudes = async (dataSet, loadCallback) => {
    const file = 'rmag.msgpack'
    const rotationMagnitudes = await readMsgpack(dataSet[file])
    loadCallback()
    return rotationMagnitudes
}

const loadGlobalField = async (dataSet, loadCallback) => {
    const file = 'global.msgpack'
    const global = await readMsgpack(dataSet[file])
    loadCallback()
    return global
}

const loadZipData = async () => {
    const res = await fetch('./data.zip')
    const blob = await res.blob()
    const { BlobReader, BlobWriter, ZipReader } = zip
    const zipReader = new ZipReader(new BlobReader(blob))
    const entries = await zipReader.getEntries()
    const files = entries
        .filter(entry => entry.filename.match(/^data\/.*(msgpack|json|png)$/))
        .map(async entry => {
            const writer = new BlobWriter()
            return {
                filename: entry.filename.replace(/data\//, ''),
                blob: await entry.getData(writer)
            }
        })
    const data = await Promise.all(files)
    const dataMap = {}
    data.forEach(({ filename, blob }) => { dataMap[filename] = blob })
    return dataMap
}

const loadForcePlot = async (dataSet, numTimestep, loadCallback) => {
    const offsetsFile = 'force_plot/offsets.json'
    const offsetsText = await dataSet[offsetsFile].text()
    const offsets = JSON.parse(offsetsText)
    const texturePromises = []
    for (let i = 0; i < numTimestep; i++) {
        const file = `force_plot/textures/fn${i}.png`
        const url = URL.createObjectURL(dataSet[file])
        texturePromises.push(loadImageAsync(url, loadCallback))
    }
    const textures = await Promise.all(texturePromises)

    document.body.appendChild(textures[0])

    return { offsets, textures }
}

const loadData = async () => {
    const data = await loadZipData()

    // get num files and helper to count file types
    const files = Object.keys(data)
    const countFiles = regex => files.reduce((total, curr) => total + (curr.match(regex) ? 1 : 0), 0)

    // get dom elements / closure for updating load bar
    const loadWrap = document.getElementById('load')
    const loadBar = document.getElementById('loadbar')
    const maxLoadWidth = document.getElementById('loadbg').clientWidth
    const numFiles = files.length
    let filesLoaded = 0
    const updateLoad = () => {
        filesLoaded++
        const loadProgress = filesLoaded / numFiles
        loadBar.style.width = `${(1.0 - loadProgress) * maxLoadWidth}px`
    }

    document.getElementById('loadtext').innerHTML = 'Loading Data...'

    // load all data sequentially to
    // prevent multiple large blobs / file readers in memory
    const { numT, numG } = await loadMetadata(data, updateLoad)
    const forcePlot = await loadForcePlot(data, numT, updateLoad)
    const positions = await loadGrainPositions(data, countFiles(/^pos/), updateLoad)
    const rotations = await loadGrainRotations(data, countFiles(/^rot/), updateLoad)
    const surfaces = await loadGrainSurfaces(data, countFiles(/^grains/), updateLoad)
    const inds = await loadGrainInds(data, updateLoad)
    const { maxForce, forces } = await loadForces(data, updateLoad)
    const rotationMagnitudes = await loadRotationMagnitudes(data, updateLoad)
    const global = await loadGlobalField(data, updateLoad)

    loadWrap.classList.add('hidden')

    // call main with loaded data
    main({
        numT,
        numG,
        forcePlot,
        grains: {
            positions,
            rotations,
            surfaces,
            inds
        },
        forces,
        maxForce,
        rotationMagnitudes,
        global
    })
}

loadData()
