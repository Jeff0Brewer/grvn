// accumulators for data split between files
// temporary hack from legacy code, to be fixed
const _rot = []
const _pos = []
const _grain = []

const processGrainSurface = data => {
    const scale = 1 / data[0]
    const surface = data[1]
    const numSurfaceFiles = data[2]
    for (let i = 0; i < surface.length; i++) {
        surface[i] *= scale
    }
    _grain.push(surface)
    if (_grain.length === numSurfaceFiles) {
        const joined = [].concat(..._grain)
        grain_surfaces.make_position_buffer(joined)

        // empty accumulator to free memory
        _grain.splice(0, _grain.length)
    }
}

const processPositionData = data => {
    const scale = 1 / data[0]
    const positions = data[1]
    const numPositionFiles = data[2]
    for (let time = 0; time < positions.length; time++) {
        for (let grain = 0; grain < positions[time].length; grain++) {
            for (let xyz = 0; xyz < 3; xyz++) {
                positions[time][grain][xyz] *= scale
            }
        }
    }
    _pos.push(positions)
    if (_pos.length === numPositionFiles) {
        const joined = [].concat(..._pos)
        grain_surfaces.add_positions(joined)
        pos_data = joined

        // empty accumulator to free memory
        _pos.splice(0, _pos.length)
    }
}

const processRotationData = data => {
    const scale = 1 / data[0]
    const rotations = data[1]
    const numRotationFiles = data[2]
    for (let time = 0; time < rotations.length; time++) {
        for (let grain = 0; grain < rotations[time].length; grain++) {
            for (let quat = 0; quat < 4; quat++) {
                rotations[time][grain][quat] *= scale
            }
        }
    }
    _rot.push(rotations)
    if (_rot.length === numRotationFiles) {
        const joined = [].concat(..._rot)
        grain_surfaces.add_rotations(joined)

        // empty accumulator to free memory
        _rot.splice(0, _rot.length)
    }
}

const processForceVerts = data => {
    const scale = 1 / data[0]
    const pos = data[1]
    const col = data[2]
    for (let i = 0; i < pos.length; i++) {
        pos[i] *= scale
    }
    for (let i = 0; i < col.length; i++) {
        col[i] *= scale
    }
    fn_vectors.add_vbos(pos, col)
}

const setRotationMagnitudeData = data => {
    rot_data = data
}

const setForceData = data => {
    for_data = data
}

const setGrainSurfaceInds = data => {
    grain_surfaces.add_inds(data)
}

const setMetadata = data => {
    num_t = data[0]
    num_g = data[1]
}

const processFile = (blob, fileType) => {
    const data = msgpack.unpack(blob)

    switch (fileType) {
        case 'fn':
            processForceVerts(data)
            break
        case 'grains':
            processGrainSurface(data)
            break
        case 'pos':
            processPositionData(data)
            break
        case 'rmag':
            setRotationMagnitudeData(data)
            break
        case 'for':
            setForceData(data)
            break
        case 'rot':
            processRotationData(data)
            break
        case 'inds':
            setGrainSurfaceInds(data)
            break
        case 'head':
            setMetadata(data)
            break
    }
}

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

// temp fn to get static list of curr data
const getFiles = () => {
    const files = []
    files.push('head') // metadata
    for (let i = 0; i <= 75; i++) { files.push(`fn${i}`) } // force plot verts
    for (let i = 0; i <= 3; i++) { files.push(`pos${i}`) } // grain positions
    for (let i = 0; i <= 3; i++) { files.push(`rot${i}`) } // grain rotations
    for (let i = 0; i <= 3; i++) { files.push(`grains${i}`) } // grain surfaces
    files.push('inds') // grain surface vbo inds
    files.push('for') // force magnitudes
    files.push('rmag') // rotation magnitude

    return files
}

const load_data = async () => {
    const DATA_DIR = 'data_old'
    const files = getFiles()

    // show load bar
    remove_class(document.getElementById('load'), ' hidden')

    for (let i = 0; i < files.length; i++) {
        // read data file
        const res = await fetch(`${DATA_DIR}/${files[i]}.msgpack`)
        const blob = await res.blob()
        const data = await readFileAsync(blob)

        // get data type from file name, process data
        const fileType = files[i].replace(/\d/g, '')
        processFile(data, fileType)
        
        // update load progress bar
        document.getElementById('loadbar').style.width = (maxload - i/(files.length - 1)*maxload).toString() + "px"
    }

    // hide load bar
    add_class(document.getElementById('load'), ' hidden')

    // run main when data load finished
    main()
}

load_data()
