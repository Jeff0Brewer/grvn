class GlobalTab{
	constructor(source, dest, label, data, low, high){
		let cloned = source.cloneNode(false);
		remove_class(cloned, ' hidden');
		dest.insertBefore(cloned, source);

		cloned.value = label;

		this.tab = cloned;
		this.clicked = true;

		this.data = data;
		this.low = low;
		this.high = high;
	}
}

function make_global_tab(label, data, low, high){
	let gt_source = document.getElementById('global_tab_source');
	let gt_dest = document.getElementById('global_tabs');

	let gt = new GlobalTab(gt_source, gt_dest, label, data, low, high);

	gt.tab.onmousedown = function(){
		gt.clicked = true;
	}

	return gt;
}


class GlobalFields{
	constructor(line_color, line_width){
		this.elements = {
			body: document.getElementById('global_section'),
			tab_container: document.getElementById('global_tabs'),
			axis: {
				low: document.getElementById('global_low'),
				high: document.getElementById('global_high'),
			},
			workspace: {
				low: document.getElementById('global_work_left'),
				high: document.getElementById('global_work_right')
			},
			canvas: document.getElementById('global_canvas'),
			time_bar: document.getElementById('global_time_bar')
		};

		this.dragging = false;

		this.elements.canvas.width = this.elements.canvas.clientWidth*window.devicePixelRatio;
		this.elements.canvas.height = this.elements.canvas.clientHeight*window.devicePixelRatio;
		this.ctx = this.elements.canvas.getContext('2d');
		this.ctx.transform(1, 0, 0, -1, 0, this.elements.canvas.height);

		this.line_color = line_color;
		this.line_width = line_width;
		this.buffer = 10;

		this.last_ind = -1;

		this.tabs = [];
	}

	add_field(str_data){
		if(this.tabs.length < 4){
			remove_class(this.elements.body, ' hidden');
			let parsed = [];
			let low = 1000000;
			let high = -1000000;

			let lines = str_data.split('\n');
			lines.pop();
			for(let i = 0; i < lines.length; i++){
				let val = parseFloat(lines[i]);
				parsed.push(val);
				low = min(low, val);
				high = max(high, val);
			}

			this.tabs.push(make_global_tab('F' + this.tabs.length.toString(), parsed, low, high));
			this.tab_changed();
		}
	}

	tab_changed(){
		let new_ind = -1;
		for(let i = 0; i < this.tabs.length; i++){
			if(this.tabs[i].clicked){
				new_ind = i;
				this.tabs[i].clicked = false;
				break;
			}
		}
		if(new_ind >= 0){
			if(this.last_ind >= 0){
				remove_class(this.tabs[this.last_ind].tab, ' global_tab_active');
			}
			add_class(this.tabs[new_ind].tab, ' global_tab_active');
			this.last_ind = new_ind;
			this.draw_tab(this.tabs[new_ind]);
		}
	}

	draw_tab(tab){
		this.elements.axis.low.innerHTML = tab.low.toFixed(2);
		this.elements.axis.high.innerHTML = tab.high.toFixed(2);

		this.ctx.clearRect(0, 0, this.elements.canvas.width, this.elements.canvas.height);
		
		this.ctx.strokeStyle = this.line_color;
		this.ctx.lineWidth = this.line_width;
		this.ctx.beginPath();
		this.ctx.moveTo(0, map(tab.data[0], tab.low, tab.high, 0, this.elements.canvas.height));
		let step = this.elements.canvas.width/tab.data.length;
		for(let i = 1; i < tab.data.length; i++){
			this.ctx.lineTo(i*step, map(tab.data[i], tab.low, tab.high, 0, this.elements.canvas.height));
		}
		this.ctx.stroke();
	}

	change_workspace(low, t, high, num_t){
		let low_width = (low/(num_t - 1))*this.elements.canvas.clientWidth;
		this.elements.workspace.low.style.width = low_width.toString() + 'px';
		this.elements.workspace.high.style.width = (((num_t - 1 - high)/(num_t - 1))*this.elements.canvas.clientWidth ).toString() + 'px';
		this.set_time(t, num_t);
	}

	toggle_workspace(low, high){
		if(!(add_class(this.elements.workspace.low, ' hidden') | add_class(this.elements.workspace.high, ' hidden'))){
			remove_class(this.elements.workspace.low, ' hidden');
			remove_class(this.elements.workspace.high, ' hidden');
		}
	}

	set_time(t, num_t){
		this.elements.time_bar.style.marginLeft = ((t/(num_t - 1))*this.elements.canvas.clientWidth).toString() + 'px';
	}

	get_time(e, num_t, low, high){
		let canvas_rect = this.elements.canvas.getBoundingClientRect();
		let t = Math.round(min((e.clientX - canvas_rect.left)/canvas_rect.width, 1)*(num_t - 1));
		t = max(min(t, high), low);
		this.set_time(t, num_t)
		return t;
	}

	start_drag(){
		this.dragging = true;
	}

	end_drag(){
		this.dragging = false;
	}
}

function make_global_fields(line_color, line_width){
	let gf = new GlobalFields(line_color, line_width);

	gf.elements.tab_container.onmousedown = function(){
		gf.tab_changed();
	}

	gf.elements.canvas.onmousedown = function(){
		gf.start_drag();
	}

	gf.elements.canvas.onmouseup = function(){
		gf.end_drag();
	}

	gf.elements.onmouseleave = function(){
		gf.end_drag();
	}

	return gf;
}






