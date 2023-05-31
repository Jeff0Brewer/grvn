class SelectInterface{
	constructor(width, height, linecolor, fillcolor){
		this.fill_color = fillcolor;
		this.line_color = linecolor;

		this.canvas = document.getElementById('selectcanvas');
		this.canvas.width = width;
		this.canvas.height = height;
		this.ctx = this.canvas.getContext('2d');
		this.ctx.fillStyle = fillcolor;
		this.ctx.strokeStyle = linecolor;

		this.button_text = ['Trace Complete', 'Set New Angle', 'Create Selection'];
		this.apply_button = document.getElementById('select_button');
		this.click_ind = 0;

		this.mode = -1;

		this.icon = document.getElementById('mouse_icon');

		this.state = 0;
		this.viewports = [];
		this.select_viewport = -1;
		this.select_points = [];
		this.output = [];
		this.mouse_down = false;
	}

	activate(viewports, mode){
		this.mode = mode;
		this.viewports = viewports;
		this.canvas.style.pointerEvents = 'auto';
		this.select_points = [];
		this.state = 0;
		this.output = [];
		this.click_ind = 0;
		add_class(this.icon, ' pencil');
		if(this.mode == 0)
			this.apply_button.innerHTML = this.button_text[this.click_ind];
		else
			this.apply_button.innerHTML = this.button_text[this.button_text.length - 1];
	}

	cancel(){
		if(this.canvas.style.pointerEvents == 'auto'){
			this.canvas.style.pointerEvents = 'none';
			this.ctx.restore();
			this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
			this.select_points = [];
			this.output = [];
			this.state = 0;
			if(!this.apply_button.className.includes(' hidden'))
				this.apply_button.className = this.apply_button.className + ' hidden';		
			add_class(document.getElementById('select_dropdown'), ' hidden');
			remove_class(this.icon, ' pencil');
			remove_class(this.icon, ' rotate');
			this.icon.style.left = '-100px';
			this.icon.style.top = '-100px';
		}
	}

	finish_step(){
		this.canvas.style.pointerEvents = 'none';
		this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
		this.click_ind++;
		this.apply_button.innerHTML = this.button_text[this.click_ind];
		return [this.select_points, this.select_viewport];
	}

	start_step(){
		this.canvas.style.pointerEvents = 'auto';
		this.select_points = [];
		this.click_ind++;
		this.apply_button.innerHTML = this.button_text[this.click_ind];
	}

	finish_all(){
		this.ctx.restore();
		this.canvas.style.pointerEvents = 'none';
		this.apply_button.className = this.apply_button.className + ' hidden';
		this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
		add_class(document.getElementById('select_dropdown'), ' hidden');
		remove_class(this.icon, ' pencil');
		remove_class(this.icon, ' rotate');
		this.icon.style.left = '-100px';
		this.icon.style.top = '-100px';
		return [this.select_points, this.select_viewport];
	}

	click(x, y){
		switch(this.state){
			case 0:
				for(let i = 0; i < viewports.length; i++){
					if(viewports[i].check_hit(x, y)){
						this.select_viewport = viewports[i];
					}
					else{
						this.ctx.fillRect(viewports[i].x, viewports[i].y, viewports[i].width, viewports[i].height);
					}
				}

				this.ctx.save();
				this.ctx.beginPath();
				this.ctx.moveTo(this.select_viewport.x, this.select_viewport.y);
				this.ctx.lineTo(this.select_viewport.x + this.select_viewport.width, this.select_viewport.y);
				this.ctx.lineTo(this.select_viewport.x + this.select_viewport.width, this.select_viewport.y + this.select_viewport.height);
				this.ctx.lineTo(this.select_viewport.x, this.select_viewport.y + this.select_viewport.height);
				this.ctx.lineTo(this.select_viewport.x, this.select_viewport.y);
				this.ctx.clip();

				this.apply_button.className = this.apply_button.className.replace(' hidden', '');
				this.apply_button.style.left = (this.select_viewport.x + (this.select_viewport.width - this.apply_button.clientWidth)/2).toString() + 'px';
				this.apply_button.style.top = (this.select_viewport.y + 9*(this.select_viewport.height - this.apply_button.clientHeight)/10).toString() + 'px';

				this.state = 1;

				this.select_points.push([x, y]);
				break;
			case 1:
				this.select_points.push([x, y]);
				break;
		}
	}

	hover(x, y){
		switch(this.state){
			case 0:
				this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
				for(let i = 0; i < this.viewports.length; i++){
					if(!viewports[i].check_hit(x, y)){
						this.ctx.fillRect(viewports[i].x, viewports[i].y, viewports[i].width, viewports[i].height);
					}
				}
				break;
			case 1:
				if(this.mouse_down)
					this.select_points.push([x, y]);

				this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
				if(this.select_points[0]){
					this.ctx.beginPath();
					this.ctx.moveTo(this.select_points[0][0], this.select_points[0][1]);
					for(let i = 1; i < this.select_points.length; i++){
						this.ctx.lineTo(this.select_points[i][0], this.select_points[i][1]);
					}
					this.ctx.lineTo(x, y);
					this.ctx.stroke();
				}
				break;
		}
		this.icon.style.left = x.toString() + 'px';
		this.icon.style.top = (y - 30).toString() + 'px';
	}

	hover_rotate(x, y){
		this.icon.style.left = x.toString() + 'px';
		this.icon.style.top = (y - 30).toString() + 'px';
	}

	resize(w, h){
		this.canvas.width = w;
		this.canvas.height = h;
		this.ctx.strokeStyle = this.line_color;
		this.ctx.fillStyle = this.fill_color;
	}
}

function make_select_interface(w, h, lc, fc){
	let si = new SelectInterface(w, h, lc, fc);

	si.canvas.onmousedown = function(e){
		si.click(e.clientX, e.clientY);
		if(si.state != 0)
			si.mouse_down = true;
	}

	si.canvas.onmouseup = function(e){
		si.mouse_down = false;
	}

	si.canvas.onmousemove = function(e){
		si.hover(e.clientX, e.clientY);
	}

	return si;
}

class Brush{
	constructor(points, delta){
		this.points = [];

		let lens = [];
		let slopes = [];
		slopes.push(0);
		let sums = [];
		sums.push(0);
		let sum = 0;

		for(let i = 0; i + 1 < points.length; i++){
			let d = dist(points[i], points[i + 1]);
			sum += d;
			sums.push(sum);
			lens.push(d);
			slopes.push([(points[i + 1][0] - points[i][0])/d, (points[i + 1][1] - points[i][1])/d]);
		}

		let n = 0;
		let len = 0;
		let i = 0;
		while(len < sum){
			len = n*delta;
			if(len > sums[i])
				i++;
			else{
				let point = [points[i][0] - (len - sums[i - 1])*slopes[i][0], points[i][1] - (len - sums[i - 1])*slopes[i][1]];
				this.points.push(point);
				n++;
			}
		}
	}
}

