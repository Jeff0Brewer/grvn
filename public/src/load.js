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

const loadForcePlot = async (metadata, data, loadCallback) => {
    const texturePromises = []
    for (let i = 0; i < metadata.num_t; i++) {
        const file = `textures/fn${i}.png`
        const url = URL.createObjectURL(data[file])
        texturePromises.push(loadImageAsync(url, loadCallback))
    }
    const textures = await Promise.all(texturePromises)

    return { metadata, textures }
}

const loadGrainPositions = async (dataSet, numFiles, loadCallback) => {
    const positions = []
    for (let i = 0; i < numFiles; i++) {
        const file = `msgpack/pos${i}.msgpack`
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
        const file = `msgpack/rot${i}.msgpack`
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
        const file = `msgpack/grains${i}.msgpack`
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
    const file = 'msgpack/inds.msgpack'
    const inds = await readMsgpack(dataSet[file])
    loadCallback()
    return inds
}

const loadForces = async (dataSet, loadCallback) => {
    const file = 'msgpack/for.msgpack'
    const [maxForce, forces] = await readMsgpack(dataSet[file])
    loadCallback()
    return { maxForce, forces }
}

const loadRotationMagnitudes = async (dataSet, loadCallback) => {
    const file = 'msgpack/rmag.msgpack'
    const rotationMagnitudes = await readMsgpack(dataSet[file])
    loadCallback()
    return rotationMagnitudes
}

const loadGlobalField = async (dataSet, loadCallback) => {
    const file = 'msgpack/global.msgpack'
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

const unzipData = async (blob) => {
    const { BlobReader, BlobWriter, ZipReader } = zip
    const zipReader = new ZipReader(new BlobReader(blob))
    const entries = await zipReader.getEntries()
    const files = entries
        .filter(entry => entry.filename.match(/^data\/.*(msgpack|png|json)$/))
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

const getMetadata = async (data) => {
    const text = await data['meta.json'].text()
    return JSON.parse(text)
}

const hideLoadbar = () => {
    document.getElementById('load').classList.add('hidden')
}

const loadData = async () => {
    const loadBar = document.getElementById('loadbar')
    const loadText = document.getElementById('loadtext')
    const maxLoadWidth = document.getElementById('loadbg').clientWidth

    loadText.innerHTML = 'Fetching Data...'
    const dataBlob = await fetch('./data.zip').then(res => res.blob())

    loadText.innerHTML = 'Decompressing Data...'
    const data = await unzipData(dataBlob)

    loadText.innerHTML = 'Loading Data...'
    const metadata = await getMetadata(data)
    const { num_t: numT, num_g: numG, num_files: numFiles } = metadata

    // get callback for updating load bar
    let filesLoaded = 0
    const updateLoad = () => {
        filesLoaded++
        const loadProgress = filesLoaded / numFiles
        loadBar.style.width = `${(1.0 - loadProgress) * maxLoadWidth}px`
    }

    // load force textures async during message pack parsing
    const forcePlot = await loadForcePlot(metadata, data, updateLoad)

    // get num files and helper to count file types
    const files = Object.keys(data)
    const countFiles = regex => files.reduce((total, curr) => total + (curr.match(regex) ? 1 : 0), 0)

    const positions = await loadGrainPositions(data, countFiles(/^msgpack\/pos/), updateLoad)
    const rotations = await loadGrainRotations(data, countFiles(/^msgpack\/rot/), updateLoad)
    const surfaces = await loadGrainSurfaces(data, countFiles(/^msgpack\/grains/), updateLoad)
    const inds = await loadGrainInds(data, updateLoad)
    const { maxForce, forces } = await loadForces(data, updateLoad)
    const rotationMagnitudes = await loadRotationMagnitudes(data, updateLoad)
    const global = await loadGlobalField(data, updateLoad)

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
