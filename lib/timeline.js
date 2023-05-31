class Timeline{
	constructor(num_t){
		this.elements = {
			container: document.getElementById('timeline_container'),
			body: document.getElementById('timeline_body'),
			work_area: {
				left: document.getElementById('outside_left'),
				right: document.getElementById('outside_right'),
			},
			play_state: document.getElementById('play_state'),
			play_pause_icons: {
				play: document.getElementById('play_icon'),
				pause: document.getElementById('pause_icon'),
			},
			canvas: document.getElementById('timeline_canvas'),
		}

		this.elements.canvas.width = (num_t - 1)*4;
		this.elements.canvas.height = 1;

		this.ctx = this.elements.canvas.getContext('2d');
		this.ctx.fillStyle = 'rgb(75,147,70)';

		this.dragging = {
			left: false,
			right: false,
			main: false,
		}

		this.workspace = {
			low: 0,
			high: num_t - 1,
			min: 0,
			max: num_t - 1,
		}

		this.play_speed = 1;
		this.paused = false;

		this.tick_time = 33.33333;
		this.time_since_step = 100000;
		this.timestep = 0;

		this.bookmarks = [];
		for(let i = 0; i < num_t; i++){
			this.bookmarks.push(false);
		}

		this.sidebar = document.getElementById('sidebar');
	}

	tick(elapsed){
		if(!this.paused && !this.dragging.main){
			this.time_since_step += elapsed*this.play_speed;
			if(this.time_since_step > this.tick_time){
				this.time_since_step = 0;
				this.timestep++;
				if(this.timestep > this.workspace.high)
					this.timestep = this.workspace.low
				this.elements.play_state.style.width = (this.elements.body.clientWidth*(this.timestep - this.workspace.low) / this.workspace.max).toString() + 'px';
			}
		}
	}

	toggle_pause(){
		this.paused = !this.paused;
		if(this.paused){
			this.elements.play_pause_icons.play.style.visibility = 'visible';
			this.elements.play_pause_icons.pause.style.visibility = 'hidden';
		}
		else{
			this.elements.play_pause_icons.play.style.visibility = 'hidden';
			this.elements.play_pause_icons.pause.style.visibility = 'visible';
		}
	}

	set_play_speed(speed, buttons){
		this.play_speed = speed;
		for(let i = 0; i < buttons.length; i++){
			add_class(buttons[i], ' timeline_button_passive');
		}
	}

	add_bookmark(){
		this.bookmarks[this.timestep] = true;
		this.update_bookmarks();
	}

	remove_bookmark(){
		this.bookmarks[this.timestep] = false;
		this.update_bookmarks();
	}

	update_bookmarks(){
		this.ctx.clearRect(0, 0, this.elements.canvas.width, this.elements.canvas.height);
		for(let i = 0; i < this.bookmarks.length; i++){
			if(this.bookmarks[i]){
				this.ctx.fillRect(i*4 - 1, 0, 2, 1);
			}
		}
	}

	drag_time(e){
		let body_rect = this.elements.body.getBoundingClientRect();
		this.timestep = Math.round((e.clientX - body_rect.left)/body_rect.width*this.workspace.max);
		if(this.timestep > this.workspace.high)
			this.timestep = this.workspace.high;
		else if(this.timestep < this.workspace.low)
			this.timestep = this.workspace.low;
		this.elements.play_state.style.width = (this.elements.body.clientWidth*(this.timestep - this.workspace.low) / this.workspace.max).toString() + 'px';
		this.dragging.main = true;
	}

	left_clicked(){
		this.dragging.left = true;
	}

	right_clicked(){
		this.dragging.right = true;
	}

	mouseup(){
		this.dragging.left = false;
		this.dragging.right = false;
		this.dragging.main = false;
	}

	mousemove(e){
		if(this.dragging.left){
			let body_rect = this.elements.body.getBoundingClientRect();
			let right_rect = this.elements.work_area.right.getBoundingClientRect();

			let int_width = Math.round((e.clientX - body_rect.left)/body_rect.width*this.workspace.max);

			let left_width = int_width/this.workspace.max*body_rect.width;
			left_width = max(left_width, 0);
			left_width = min(left_width, right_rect.left - body_rect.left);
			this.elements.work_area.left.style.width = left_width.toString() + 'px';			
		
			this.workspace.low = min(max(int_width, this.workspace.min), this.workspace.high);
			if(this.timestep < this.workspace.low)
				this.timestep = this.workspace.low;
			this.elements.play_state.style.width = (this.elements.body.clientWidth*(this.timestep - this.workspace.low) / this.workspace.max).toString() + 'px';
			return[this.workspace.low, this.timestep, this.workspace.high];
		}
		if(this.dragging.right){
			let body_rect = this.elements.body.getBoundingClientRect();
			let left_rect = this.elements.work_area.left.getBoundingClientRect();

			let int_width = Math.round((body_rect.right - e.clientX)/body_rect.width*this.workspace.max);
			
			let right_width = int_width/this.workspace.max*body_rect.width;
			right_width = max(right_width, 0);
			right_width = min(right_width, body_rect.right - left_rect.right);
			this.elements.work_area.right.style.width = right_width.toString() + 'px';
			
			this.workspace.high = min(max(this.workspace.max - int_width, this.workspace.low), this.workspace.max);;
			if(this.timestep > this.workspace.high)
				this.timestep = this.workspace.high;
			this.elements.play_state.style.width = (this.elements.body.clientWidth*(this.timestep - this.workspace.low) / this.workspace.max).toString() + 'px';
			return[this.workspace.low, this.timestep, this.workspace.high];
		}
		if(this.dragging.main){
			let body_rect = this.elements.body.getBoundingClientRect();
			this.timestep = Math.round((e.clientX - body_rect.left)/body_rect.width*this.workspace.max);
			if(this.timestep > this.workspace.high)
				this.timestep = this.workspace.high;
			else if(this.timestep < this.workspace.low)
				this.timestep = this.workspace.low;
			this.elements.play_state.style.width = (this.elements.body.clientWidth*(this.timestep - this.workspace.low) / this.workspace.max).toString() + 'px';
			return[this.workspace.low, this.timestep, this.workspace.high];
		}
	}

	hide(){
		add_class(this.elements.container, ' hidden');
	}

	show(){
		remove_class(this.elements.container, ' hidden');
	}

	set_time(t){
		this.timestep = t;
		if(this.timestep > this.workspace.high)
			this.timestep = this.workspace.high;
		else if(this.timestep < this.workspace.low)
			this.timestep = this.workspace.low;
		this.elements.play_state.style.width = (this.elements.body.clientWidth*(this.timestep - this.workspace.low) / this.workspace.max).toString() + 'px';
	}

	resize(){
		this.elements.container.style.width = (window.innerWidth - this.sidebar.clientWidth).toString() + 'px';
	
		let body_width = this.elements.body.clientWidth;
		this.elements.work_area.left.style.width = (this.workspace.low/this.workspace.max*body_width).toString() + 'px';
		this.elements.work_area.right.style.width = ((this.workspace.max - this.workspace.high)/this.workspace.max*body_width).toString() + 'px';
		this.elements.play_state.style.width = (body_width*(this.timestep - this.workspace.low) / this.workspace.max).toString() + 'px';
	}
}

function make_timeline(num_t){
	let tl = new Timeline(num_t);
	let speed_buttons = [document.getElementById('play_full'), document.getElementById('play_half'), document.getElementById('play_quarter')];

	tl.elements.work_area.left.onmousedown = function(e){
		e.stopPropagation();
		tl.left_clicked();
	}

	tl.elements.work_area.right.onmousedown = function(e){
		e.stopPropagation();
		tl.right_clicked();
	}

	tl.elements.body.onmousedown = function(e){
		tl.drag_time(e);
	}

	document.getElementById('work_left').onmousedown = function(e){
		e.stopPropagation();
		tl.left_clicked();
	}

	document.getElementById('work_right').onmousedown = function(e){
		e.stopPropagation();
		tl.right_clicked();
	}

	document.getElementById('play_pause').onmouseup = function(){
		tl.toggle_pause();
	}

	document.getElementById('play_full').onmouseup = function(){
		tl.set_play_speed(1, speed_buttons);
		remove_class(this, ' timeline_button_passive');
	}

	document.getElementById('play_half').onmouseup = function(){
		tl.set_play_speed(.5, speed_buttons);
		remove_class(this, ' timeline_button_passive');
	}

	document.getElementById('play_quarter').onmouseup = function(){
		tl.set_play_speed(.25, speed_buttons);
		remove_class(this, ' timeline_button_passive');
	}

	document.getElementById('create_bookmark').onmouseup = function(){
		tl.add_bookmark();
	}

	return tl;
}

