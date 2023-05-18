class SelectionItem{
	constructor(source, dest, insert, inds, pos, num_t, select_ind){
		this.inds = inds;
		this.selected = true;
		this.list_out = false;
		this.removed = false;

		this.camera = {
			x: 0,
			y: 100,
			z: 50,
		};

		this.offsets = [];
		this.max_disp = 0;
		for(let t = 0; t < num_t; t++){
			let min_x = 100000;
			let max_x = -100000;
			let min_y = 100000;
			let max_y = -100000;
			let min_z = 100000;
			let max_z = -100000;
			for(let i = 0; i < pos[t].length; i++){
				min_x = min(min_x, pos[t][i][0]);
				max_x = max(max_x, pos[t][i][0]);
				min_y = min(min_y, pos[t][i][1]);
				max_y = max(max_y, pos[t][i][1]);
				min_z = min(min_z, pos[t][i][2]);
				max_z = max(max_z, pos[t][i][2]);
			}
			this.offsets.push({
				x: max_x - (max_x - min_x)/2,
				y: max_y - (max_y - min_y)/2,
				z: max_z - (max_z - min_z)/2,
			});
			min_x = Math.abs(min_x - this.offsets[t].x);
			max_x = Math.abs(max_x - this.offsets[t].x);
			min_y = Math.abs(min_y - this.offsets[t].y);
			max_x = Math.abs(max_y - this.offsets[t].y);
			min_z = Math.abs(min_z - this.offsets[t].z);
			max_z = Math.abs(max_z - this.offsets[t].z);
			this.max_disp = max(this.max_disp, max(max(max(min_x, max_x), max(min_y, max_y)), max(min_z, max_z)));
		}
		this.rotation = {
			x: 0,
			y: 0,
			z: 0,
		};

		this.num_t = num_t
		this.paused = false;
		this.num_steps = 5;
		this.start_t = 0;
		this.end_t = num_t;
		this.step_t = Math.floor(num_t/this.num_steps);
		this.updated = [];
		for(let i = this.start_t; i < this.end_t; i++)
			this.updated.push(true);


		let cloned = source.cloneNode(true);
		dest.insertBefore(cloned, insert);

		this.elements = {
			body: cloned,
			canvas: cloned.childNodes[1],
			arrow: cloned.childNodes[5],
			arrow_svg: cloned.childNodes[5].childNodes[1].childNodes[1],
			delete: cloned.childNodes[7],
			ind_list: cloned.childNodes[9],
			time_inputs: {
				panel: cloned.childNodes[11],
				step_panel: cloned.childNodes[11].childNodes[3].childNodes[5],
				start_t: cloned.childNodes[11].childNodes[3].childNodes[1].childNodes[1],
				end_t: cloned.childNodes[11].childNodes[3].childNodes[3].childNodes[1],
				step_t: cloned.childNodes[11].childNodes[3].childNodes[5].childNodes[1],
			}
		}

		this.elements.time_inputs.start_t.value = this.start_t;
		this.elements.time_inputs.end_t.value = this.end_t;
		this.elements.time_inputs.step_t.value = this.step_t;

		cloned.childNodes[3].innerHTML = inds.length.toString() + '&ensp;Selection ' + select_ind.toString();
		cloned.childNodes[11].childNodes[1].innerHTML = 'Selection ' + select_ind.toString();

		this.elements.canvas.width = 20*window.devicePixelRatio;
		this.elements.canvas.height = 20*window.devicePixelRatio;
		let ctx = this.elements.canvas.getContext('2d');
		ctx.fillStyle = 'rgb(189,189,189)';
		let t = num_t - 1;
		let point_size = 2;
		for(let i = 0; i < pos[t].length; i++){
			ctx.fillRect(map(pos[t][i][0] - this.offsets[t].x, -this.max_disp, this.max_disp, point_size/2, this.elements.canvas.width - point_size/2),
						 map(pos[t][i][2] - this.offsets[t].z, -this.max_disp, this.max_disp, this.elements.canvas.height - point_size/2, point_size/2),
						 point_size, point_size);
		}


		let ind_src = this.elements.ind_list.childNodes[1];
		ind_src.innerHTML = inds[0];
		for(let i = 1; i < inds.length; i++){
			let ind = ind_src.cloneNode(false);
			ind.innerHTML = inds[i];
			this.elements.ind_list.appendChild(ind);
		}
	}

	hover_on(){
		remove_class(this.elements.arrow, ' hidden');
		remove_class(this.elements.delete, ' hidden');
		if(!this.selected)
			add_class(this.elements.body, ' selection_hover');
	}

	hover_off(){
		add_class(this.elements.arrow, ' hidden');
		add_class(this.elements.delete, ' hidden');
		remove_class(this.elements.body, ' selection_hover');
	}

	toggle_select(){
		if(this.selected){
			remove_class(this.elements.body, ' selection_highlight');
			add_class(this.elements.body, ' selection_hover');
			add_class(this.elements.canvas, ' item_canvas_unselected');
			add_class(this.elements.delete, ' item_delete_unselected');
		}
		else{
			add_class(this.elements.body, ' selection_highlight');
			remove_class(this.elements.body, ' selection_hover');
			remove_class(this.elements.canvas, ' item_canvas_unselected');
			remove_class(this.elements.delete, ' item_delete_unselected');
		}
		this.selected = !this.selected;
	}

	toggle_list(){
		if(this.list_out){
			this.elements.ind_list.className = this.elements.ind_list.className + ' hidden';
			this.elements.arrow_svg.setAttribute("transform", "rotate(0)");
		}
		else{
			this.elements.ind_list.className = this.elements.ind_list.className.replace(' hidden', '');
			this.elements.arrow_svg.setAttribute("transform", "rotate(270)");
		}
		this.list_out = !this.list_out;
	}

	set_time_values(start, end, step){
		if(start >= 0)
			 this.start_t = start;
		if(end >= 0)
			this.end_t = end;
		if(step >= 0)
			this.step_t = step;

		this.num_steps = Math.floor((this.end_t - this.start_t)/this.step_t);
		this.updated = [];
		for(let i = this.start_t; i < this.end_t; i++)
			this.updated.push(true);
	}

	refresh_sm(){
		for(let i = 0; i < this.end_t - this.start_t; i++)
			this.updated[i] = true;
	}

	delete(){
		this.elements.body.remove();
		this.removed = true;
	}
}

function make_selection_item(inds, pos, num_t, sel_ind){
	let si_insert = document.getElementById('selection_proto');
	let si_source = si_insert.childNodes[1];
	let si_dest = document.getElementById('selection_list');

	let si = new SelectionItem(si_source, si_dest, si_insert, inds, pos, num_t, sel_ind);

	si.elements.body.onmouseup = function(){
		si.toggle_select();
	}

	si.elements.body.onmouseenter = function(){
		si.hover_on();
	}

	si.elements.body.onmouseleave = function(){
		si.hover_off();
	}

	si.elements.arrow.onmouseup = function(e){
		e.stopPropagation();
		si.toggle_list();
	}

	si.elements.delete.onmouseup = function(e){
		e.stopPropagation();
		si.delete();
	}

	si.elements.ind_list.onmouseup = function(e){
		e.stopPropagation();
	}

	si.elements.time_inputs.panel.onmouseup = function(e){
		e.stopPropagation();
	}

	si.elements.time_inputs.start_t.onchange = function(e){
		let val = Math.floor(parseFloat(this.value));
		val = max(val, 0);
		val = min(val, si.end_t - 1);
		if(si.end_t - val < si.step_t){
			si.step_t = si.end_t - val;
			si.elements.time_inputs.step_t.value = si.step_t;
		}
		this.value = val;
		si.set_time_values(val, -1, -1);
	}

	si.elements.time_inputs.end_t.onchange = function(e){
		let val = Math.floor(parseFloat(this.value));
		val = min(val, si.num_t);
		val = max(val, si.start_t + 1);
		if(val - si.start_t < si.step_t){
			si.step_t = val - si.start_t;
			si.elements.time_inputs.step_t.value = si.step_t;
		}
		this.value = val;
		si.set_time_values(-1, val, -1);
	}

	si.elements.time_inputs.step_t.onchange = function(e){
		let val = max(Math.floor(parseFloat(this.value)), 1);
		val = min(val, si.end_t - si.start_t);
		this.value = val;
		si.set_time_values(-1, -1, val);
	}

	return si;
}





