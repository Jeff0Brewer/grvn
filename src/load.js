const readFileAsync = file => {
    const fileReader = new FileReader()
    return new Promise((resolve, reject) => {
        fileReader.onerror = () => {
            fileReader.abort()
            reject(new Error('File read failed'))
        }
        fileReader.onload = () => {
            resolve(fileReader.result)
        }
        fileReader.readAsBinaryString(file)
    })
}

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
        _grain = []
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
        _pos = []
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
        _rot = []
    }
}

const addForceVertices = data => {
    fn_vectors.add_vbos(data)
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

const processFile = (blob, fileName) => {
    const data = msgpack.unpack(blob)

    if(fileName.includes('_fn_')){
        addForceVertices(data)
    }
    else if(fileName.includes('_grain')){
        processGrainSurface(data)
    }
    else if(fileName.includes('_pos')){
        processPositionData(data)
    }
    else if(fileName.includes('_mag')){
        setRotationMagnitudeData(data)
    }
    else if(fileName.includes('_for')){
        setForceData(data)
    }
    else if(fileName.includes('_rot')){
        processRotationData(data)
    }
    else if(fileName.includes('_inds')){
        setGrainSurfaceInds(data)
    }
    else if(fileName.includes('__head')){
        setMetadata(data)
    }
}

const load_data = async () => {
    const DATA_DIR = 'data'
    const files = []
    files.push('__head')
    for (let i = 0; i <= 75; i++) { files.push(`_fn_${i}`) }
    files.push('_for')
    for (let i = 0; i <= 3; i++) { files.push(`_grains_${i}`) }
    files.push('_inds')
    for (let i = 0; i <= 3; i++) { files.push(`_pos_${i}`) }
    files.push('_r_mag')
    for (let i = 0; i <= 3; i++) { files.push(`_rot_${i}`) }

    // show load bar
    remove_class(document.getElementById('load'), ' hidden')

    for (let i = 0; i < files.length; i++) {
        // read and process data file
        const res = await fetch(`${DATA_DIR}/${files[i]}.msgpack`)
        const blob = await res.blob()
        const data = await readFileAsync(blob)
        processFile(data, files[i])
        
        // update load progress bar
        document.getElementById('loadbar').style.width = (maxload - i/(files.length - 1)*maxload).toString() + "px"
    }

    // hide load bar
    add_class(document.getElementById('load'), ' hidden')

    // run main when data load finished
    main()
}
load_data()
