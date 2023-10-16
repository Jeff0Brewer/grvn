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

const loadMetadata = async (dataSet) => {
    const file = 'head.msgpack'
    const data = await readMsgpack(dataSet[file])
    const [numT, numG] = data
    return { numT, numG }
}

const loadForcePlot = async (numTimestep, loadCallback) => {
    const metadataPromise = fetch('./data/force_plot/meta.json').then(res => res.json())

    const texturePromises = []
    for (let i = 0; i < numTimestep; i++) {
        const promise = fetch(`./data/force_plot/textures/fn${i}.png`)
            .then(res => res.blob())
            .then(blob => URL.createObjectURL(blob))
            .then(url => loadImageAsync(url, loadCallback))
        texturePromises.push(promise)
    }
    const textures = await Promise.all(texturePromises)
    const metadata = await metadataPromise

    return { metadata, textures }
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
    const res = await fetch('./data/msgpack.zip')
    const blob = await res.blob()
    const { BlobReader, BlobWriter, ZipReader } = zip
    const zipReader = new ZipReader(new BlobReader(blob))
    const entries = await zipReader.getEntries()
    const files = entries
        .filter(entry => entry.filename.match(/^msgpack\/.*msgpack$/))
        .map(async entry => {
            const writer = new BlobWriter()
            return {
                filename: entry.filename.replace(/msgpack\//, ''),
                blob: await entry.getData(writer)
            }
        })
    const data = await Promise.all(files)
    const dataMap = {}
    data.forEach(({ filename, blob }) => { dataMap[filename] = blob })
    return dataMap
}

const hideLoadbar = () => {
    document.getElementById('load').classList.add('hidden')
}

const loadData = async () => {
    const msgpackData = await loadZipData()

    // get num files and helper to count file types
    const files = Object.keys(msgpackData)
    const countFiles = regex => files.reduce((total, curr) => total + (curr.match(regex) ? 1 : 0), 0)

    const { numT, numG } = await loadMetadata(msgpackData)

    // get dom elements / closure for updating load bar
    const loadBar = document.getElementById('loadbar')
    const loadText = document.getElementById('loadtext')
    const maxLoadWidth = document.getElementById('loadbg').clientWidth

    // numT number of force textures, not included in files from msgpack data
    const numFiles = files.length + numT
    let filesLoaded = 0
    const updateLoad = () => {
        filesLoaded++
        const loadProgress = filesLoaded / numFiles
        loadBar.style.width = `${(1.0 - loadProgress) * maxLoadWidth}px`
    }

    loadText.innerHTML = 'Loading Data...'

    // load force textures async during message pack parsing
    const forcePlotPromise = loadForcePlot(numT, updateLoad)

    // load all msgpack data sequentially to
    // prevent multiple large blobs / file readers in memory
    const positions = await loadGrainPositions(msgpackData, countFiles(/^pos/), updateLoad)
    const rotations = await loadGrainRotations(msgpackData, countFiles(/^rot/), updateLoad)
    const surfaces = await loadGrainSurfaces(msgpackData, countFiles(/^grains/), updateLoad)
    const inds = await loadGrainInds(msgpackData, updateLoad)
    const { maxForce, forces } = await loadForces(msgpackData, updateLoad)
    const rotationMagnitudes = await loadRotationMagnitudes(msgpackData, updateLoad)
    const global = await loadGlobalField(msgpackData, updateLoad)

    // wait for texture load to finish
    const forcePlot = await forcePlotPromise

    loadText.innerHTML = 'Initializing Visualization...'

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
