class SMViewer {
    constructor (w, h) {
        this.total_width = w
        this.total_height = h

        this.last_num_selected = -1

        this.rotating = []
        this.zooming = []
        this.playing = []
        this.hovering = []

        this.rotating_vp
        this.highlighted = -1

        this.hover_viewport
        this.scroll_timeout
        this.scroll_end_callback

        this.am_tick_time = 33.33333
        this.am_time_since_step = 100000
        this.am_timesteps = []

        this.canvas = document.getElementById('smcanvas')
        this.canvas.width = w
        this.canvas.height = h
        this.stroke_color = 'rgb(84,84,84)'
        this.line_width = 1
        this.ctx = this.canvas.getContext('2d')
        this.ctx.strokeStyle = this.stroke_color
        this.ctx.lineWidth = this.line_width
        this.line_space = 75

        this.mouse = {
            x: 0,
            y: 0
        }

        this.mode = 0 // 0: animated | 1: small multiples
    }

    set_mode (mode) {
        this.mode = mode
        this.last_num_selected = -1
    }

    update (items, elapsed) {
        for (let i = 0; i < items.length; i++) {
            if (items[i].removed) {
                items.splice(i, 1)
                i--
            }
        }
        if (items.length > 0) {
            switch (this.mode) {
                case 0:
                    if (items[this.playing[0]]) { this.tick_am(elapsed, items) }
                    return this.update_am(items)
                    break
                case 1:
                    return this.update_sm(items)
                    break
            }
        }
        return [[]]
    }

    refresh (items) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
        switch (this.mode) {
            case 0:
                return this.refresh_am(items)
                break
            case 1:
                return this.refresh_sm(items)
                break
        }
    }

    update_am (items) {
        const margin_bottom = 120
        const selected = []
        let num_selected = 0
        let select_ind = 0
        for (let item_ind = 0; item_ind < items.length; item_ind++) {
            if (items[item_ind].selected) {
                num_selected++
                if (items[item_ind].updated[0]) {
                    selected.push([item_ind, select_ind])
                    items[item_ind].updated[0] = false
                }
                select_ind++
            }
        }
        if (this.playing.length > 0 && !selected.includes(this.playing)) {
            selected.push(this.playing)
        }
        if (num_selected != this.last_num_selected) {
            this.last_num_selected = num_selected
            return this.refresh(items)
        }
        const params = []
        const h = this.total_height - margin_bottom
        const w = this.total_width / this.last_num_selected
        for (let i = 0; i < selected.length; i++) {
            params.push([items[selected[i][0]], this.am_timesteps[selected[i][1]], new Viewport(w * selected[i][1], margin_bottom, w + 1, h + 1)])
        }

        return [params]
    }

    update_sm (items) {
        const margin_left = items[0].elements.time_inputs.panel.clientWidth
        const updated = []
        let num_selected = 0
        let select_ind = 0
        for (let item_ind = 0; item_ind < items.length; item_ind++) {
            if (items[item_ind].selected) {
                num_selected++
                const highl = (this.zooming.length == 0 && items[item_ind].inds.includes(this.highlighted))
                for (let step_ind = 0; step_ind * items[item_ind].step_t + items[item_ind].start_t < items[item_ind].end_t; step_ind++) {
                    if (items[item_ind].updated[step_ind * items[item_ind].step_t] || highl) {
                        updated.push([item_ind, step_ind, select_ind])
                        items[item_ind].updated[step_ind * items[item_ind].step_t] = false
                    }
                }
                select_ind++
            }
        }
        if (num_selected != this.last_num_selected) {
            this.last_num_selected = num_selected
            return this.refresh(items)
        }
        const params = []
        const h = this.total_height / num_selected
        for (let i = 0; i < updated.length; i++) {
            const w = (this.total_width - margin_left) / items[updated[i][0]].num_steps
            const vp = new Viewport(margin_left + w * updated[i][1], this.total_height - h * updated[i][2] - h, w + 1, h + 1)
            params.push([items[updated[i][0]], items[updated[i][0]].start_t + items[updated[i][0]].step_t * updated[i][1], vp])
        }
        return [params, this.highlighted]
    }

    refresh_am (items) {
        this.playing = []
        this.am_timesteps = []
        for (let i = 0; i < this.last_num_selected; i++) { this.am_timesteps.push(0) }

        const margin_bottom = 120
        const h = this.total_height - margin_bottom
        const w = this.total_width / this.last_num_selected
        let offset = (w - items[0].elements.time_inputs.panel.clientWidth) / 2
        const params = []
        let select_ind = 0
        for (let i = 0; i < items.length; i++) {
            if (items[i].selected) {
                items[i].elements.time_inputs.panel.style.top = (h + 10).toString() + 'px'
                items[i].elements.time_inputs.panel.style.left = offset.toString() + 'px'
                offset += w
                remove_class(items[i].elements.time_inputs.panel, ' hidden')
                add_class(items[i].elements.time_inputs.step_panel, ' hidden')

                params.push([items[i], this.am_timesteps[select_ind], new Viewport(w * select_ind, margin_bottom, w + 1, h + 1)])
                select_ind++
            } else {
                add_class(items[i].elements.time_inputs.panel, ' hidden')
            }
        }

        if (this.last_num_selected >= 2) {
            for (let i = 1; i < this.last_num_selected; i++) {
                this.ctx.beginPath()
                this.ctx.moveTo(w * i, this.line_space)
                this.ctx.lineTo(w * i, this.total_height - this.line_space)
                this.ctx.stroke()
            }
        }

        return [params]
    }

    refresh_sm (items) {
        const margin_left = items[0].elements.time_inputs.panel.clientWidth
        const h = this.total_height / this.last_num_selected
        let offset = 0.4 * h
        const params = []
        let select_ind = 0
        for (let i = 0; i < items.length; i++) {
            if (items[i].selected) {
                items[i].elements.time_inputs.panel.style.top = offset.toString() + 'px'
                items[i].elements.time_inputs.panel.style.left = '0px'
                offset += h
                remove_class(items[i].elements.time_inputs.panel, ' hidden')
                remove_class(items[i].elements.time_inputs.step_panel, ' hidden')

                const w = (this.total_width - margin_left) / items[i].num_steps
                for (let j = 0; j < items[i].num_steps; j++) {
                    params.push([items[i], items[i].start_t + items[i].step_t * j, new Viewport(margin_left + w * j, this.total_height - h * select_ind - h, w + 1, h + 1)])
                    items[i].updated[j] = false
                }
                select_ind++
            } else {
                add_class(items[i].elements.time_inputs.panel, ' hidden')
            }
        }

        if (this.last_num_selected >= 2) {
            for (let i = 1; i < this.last_num_selected; i++) {
                this.ctx.beginPath()
                this.ctx.moveTo(this.line_space, h * i)
                this.ctx.lineTo(this.total_width - this.line_space, h * i)
                this.ctx.stroke()
            }
        }
        return [params]
    }

    start_rotate (x, y, items) {
        this.save_hover = this.hovering
        this.save_play = this.playing
        this.hovering = []
        this.playing = []
        this.highlighted = -1
        switch (this.mode) {
            case 0:
                this.start_rotate_am(x, y, items)
                break
            case 1:
                this.start_rotate_sm(x, y, items)
                break
        }
    }

    start_rotate_sm (x, y, items) {
        const margin_left = items[0].elements.time_inputs.panel.clientWidth
        const selected_ind = Math.floor(y / (this.total_height / this.last_num_selected))
        let num_selected = 0
        let ind = -1
        for (let i = 0; i < items.length; i++) {
            if (items[i].selected) {
                if (num_selected == selected_ind) {
                    ind = i
                    i = items.length
                } else { num_selected++ }
            }
        }
        if (ind >= 0) {
            const w = (this.total_width - margin_left) / items[ind].num_steps
            const step = Math.floor((x - margin_left) / w)
            if (step < items[ind].num_steps && step >= 0) {
                this.rotating = [ind, step, selected_ind]
                const h = this.total_height / this.last_num_selected
                this.rotating_vp = new Viewport(step * w + margin_left, this.total_height - h * selected_ind - h, w + 1, h + 1)
            } else {
                this.rotating = []
            }
            this.mouse.x = x
            this.mouse.y = y
        }
    }

    start_rotate_am (x, y, items) {
        const margin_bottom = 120
        this.mouse.x = x
        this.mouse.y = y
        const ind = Math.floor(x / (this.total_width / this.last_num_selected))
        const selected = []
        for (let i = 0; i < items.length; i++) {
            if (items[i].selected) {
                selected.push(i)
                if (selected.length > ind) {
                    this.rotating = [i, -1, ind]
                    const w = this.total_width / this.last_num_selected
                    const h = this.total_height - margin_bottom
                    this.rotating_vp = new Viewport(w * ind, margin_bottom, w + 1, h + 1)
                    return
                }
            }
        }
    }

    rotate (x, y, items) {
        if (this.rotating.length > 0) {
            const dx = 0.5 * (x - this.mouse.x)
            const dy = 0.5 * (y - this.mouse.y)

            items[this.rotating[0]].rotation.x = items[this.rotating[0]].rotation.x - dy
            items[this.rotating[0]].rotation.z = items[this.rotating[0]].rotation.z + dx
            if (this.mode == 0) {
                items[this.rotating[0]].updated[0] = true
            } else {
                items[this.rotating[0]].updated[items[this.rotating[0]].step_t * this.rotating[1]] = true
            }

            this.mouse.x = x
            this.mouse.y = y
            if (this.mode == 1) {
                items[this.rotating[0]].refresh_sm()
            }
        }
    }

    stop_rotate (items) {
        if (this.rotating.length > 0) {
            if (this.mode == 1) {
                items[this.rotating[0]].refresh_sm()
            }
            this.hovering = this.save_hover
            this.playing = this.save_play
            this.save_hover = []
            this.save_play = []
            this.rotating = []
        }
    }

    zoom (e, items) {
        if (this.zooming.length == 0) {
            this.save_hover = this.hovering
            this.save_play = this.playing
            this.hovering = []
            this.playing = []
        }
        if (items.length > 0) {
            switch (this.mode) {
                case 0:
                    this.zoom_am(e, items)
                    break
                case 1:
                    this.zoom_sm(e, items)
                    break
            }
        }
    }

    zoom_am (e, items) {
        const ind = Math.floor(e.clientX / (this.total_width / this.last_num_selected))
        const item_ind = this.find_real_ind(ind, items)

        const offset_ind = Math.floor(items[item_ind].offsets.length / 2)
        const camvec = [items[item_ind].camera.x - items[item_ind].offsets[offset_ind].x * 0.025, items[item_ind].camera.y - items[item_ind].offsets[offset_ind].y * 0.025, items[item_ind].camera.z - items[item_ind].offsets[offset_ind].z * 0.025]
        const resized = resize(camvec, e.deltaY * 0.1)
        if (Math.sign(resized[0]) == Math.sign(camvec[0]) && Math.sign(resized[1]) == Math.sign(camvec[1]) && Math.sign(resized[2]) == Math.sign(camvec[2])) {
            items[item_ind].camera.x = items[item_ind].offsets[offset_ind].x * 0.025 + resized[0]
            items[item_ind].camera.y = items[item_ind].offsets[offset_ind].y * 0.025 + resized[1]
            items[item_ind].camera.z = items[item_ind].offsets[offset_ind].z * 0.025 + resized[2]
        }
        items[item_ind].refresh_sm()
        this.zooming = [-1, -1, items[item_ind]]

        window.clearTimeout(this.scroll_timeout)

        this.scroll_timeout = setTimeout(this.scroll_end_callback, 70, false)
    }

    zoom_sm (e, items) {
        if (this.zooming.length <= 0) {
            const margin_left = items[0].elements.time_inputs.panel.clientWidth
            const ind = this.find_real_ind(Math.floor(e.clientY / (this.total_height / this.last_num_selected)), items)
            const step = Math.floor((e.clientX - margin_left) / ((this.total_width - margin_left) / items[ind].num_steps))
            this.zooming = [ind, step, items[ind]]
        }

        const offset_ind = Math.floor(items[this.zooming[0]].offsets.length / 2)
        const camvec = [items[this.zooming[0]].camera.x - items[this.zooming[0]].offsets[offset_ind].x * 0.025, items[this.zooming[0]].camera.y - items[this.zooming[0]].offsets[offset_ind].y * 0.025, items[this.zooming[0]].camera.z - items[this.zooming[0]].offsets[offset_ind].z * 0.025]
        const resized = resize(camvec, e.deltaY * 0.1)
        if (Math.sign(resized[0]) == Math.sign(camvec[0]) && Math.sign(resized[1]) == Math.sign(camvec[1]) && Math.sign(resized[2]) == Math.sign(camvec[2])) {
            items[this.zooming[0]].camera.x = items[this.zooming[0]].offsets[offset_ind].x * 0.025 + resized[0]
            items[this.zooming[0]].camera.y = items[this.zooming[0]].offsets[offset_ind].y * 0.025 + resized[1]
            items[this.zooming[0]].camera.z = items[this.zooming[0]].offsets[offset_ind].z * 0.025 + resized[2]
        }
        items[this.zooming[0]].updated[items[this.zooming[0]].step_t * this.zooming[1]] = true

        window.clearTimeout(this.scroll_timeout)

        this.scroll_timeout = setTimeout(this.scroll_end_callback, 70, false)
        items[this.zooming[0]].refresh_sm()
    }

    hover (x, y, items) {
        if (this.rotating.length > 0) { this.rotate(x, y, items) } else if (items.length > 0) {
            if (this.mode == 0) {
                const select_ind = Math.floor(x / (this.total_width / this.last_num_selected))
                if (select_ind != this.playing[1]) {
                    const ind = this.find_real_ind(select_ind, items)
                    if (this.playing.length > 0) {
                        this.am_timesteps[this.playing[1]] = 0
                        items[this.playing[0]].paused = false
                        items[this.playing[0]].updated[0] = true
                    }
                    this.playing[0] = ind
                    this.playing[1] = select_ind
                    this.hovering = [ind, -1, select_ind]
                }
            } else if (this.mode == 1) {
                const margin_left = items[0].elements.time_inputs.panel.clientWidth
                const select_ind = Math.floor(y / (this.total_height / this.last_num_selected))
                const ind = this.find_real_ind(select_ind, items)
                const step_ind = Math.floor((x - margin_left) / ((this.total_width - margin_left) / items[ind].num_steps))

                if (step_ind >= 0) {
                    this.hovering = [ind, items[ind].step_t * step_ind + items[ind].start_t, select_ind]

                    const h = this.total_height / this.last_num_selected
                    const w = (this.total_width - margin_left) / items[ind].num_steps
                    this.hover_viewport = new Viewport(margin_left + w * step_ind, this.total_height - h * select_ind - h, w + 1, h + 1)
                }
            }
        }
    }

    update_highlight (ind) {
        if (ind < 0 && this.highlighted >= 0) { this.last_num_selected = -1 }
        this.highlighted = ind
    }

    pause_playing (items) {
        if (this.mode == 0 && this.playing.length > 0) {
            items[this.playing[0]].paused = !items[this.playing[0]].paused
        }
    }

    mouseleave (items) {
        if (this.rotating.length > 0) { this.stop_rotate(items) }
        if (this.playing.length > 0) { items[this.playing[0]].paused = false }
        this.rotating = []
        this.playing = []
        this.hovering = []
    }

    tick_am (elapsed, items) {
        if (items.length > 0 && this.playing.length > 0 && !items[this.playing[0]].paused) {
            this.am_time_since_step += elapsed * 0.75
            if (this.playing.length > 0 && this.rotating.length <= 0 && this.zooming.length <= 0 && items.length > 0 && this.am_time_since_step > this.am_tick_time) {
                this.am_time_since_step = 0
                this.am_timesteps[this.playing[1]]++
                if (this.am_timesteps[this.playing[1]] >= items[this.playing[0]].end_t || this.am_timesteps[this.playing[1]] < items[this.playing[0]].start_t) { this.am_timesteps[this.playing[1]] = items[this.playing[0]].start_t }
            }
        }
    }

    find_real_ind (selection_ind, items) {
        const selected = []
        for (let i = 0; i < items.length; i++) {
            if (items[i].selected) {
                selected.push(i)
                if (selected.length > selection_ind) {
                    return i
                }
            }
        }
    }

    leave_sm () {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    }

    resize (w, h, items) {
        this.total_width = w
        this.total_height = h

        this.canvas.width = w
        this.canvas.height = h
        this.ctx.strokeStyle = this.stroke_color
        this.ctx.lineWidth = this.line_width

        if (items.length > 0) { return this.refresh(items) }
    }
}

function make_sm_viewer (w, h) {
    const smv = new SMViewer(w, h)

    smv.scroll_end_callback = function () {
        if (smv.mode == 1) { smv.zooming[2].refresh_sm() }
        smv.zooming = []
        smv.hovering = smv.save_hover
        smv.playing = smv.save_play
        smv.save_hover = []
        smv.save_play = []
        smv.rotating = []
    }

    return smv
}
