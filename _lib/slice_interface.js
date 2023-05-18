class SliceInterface{
	constructor(width, height, linecolor, fillcolor, crosssize){
		this.line_color = linecolor;
		this.fill_color = fillcolor;
		this.cross_size = crosssize;

		this.canvas = document.getElementById('slicecanvas');
		this.canvas.width = width;
		this.canvas.height = height;
		this.ctx = this.canvas.getContext('2d');
		this.ctx.strokeStyle = linecolor;
		this.ctx.fillStyle = fillcolor;

		this.apply_button = document.getElementById('apply_slice');


		this.state = 0;
		this.viewports = [];
		this.slice_viewport = -1;
		this.slice_points = [];
		this.output = [];
		this.new_planes = false;
	}

	get_output(){
		this.new_planes = false;
		return [this.output, this.slice_viewport];
	}

	activate(viewports){
		this.viewports = viewports;
		this.canvas.style.pointerEvents = 'auto';
		this.slice_points = [];
		this.state = 0;
		this.output = [];
	}

	deactivate(){
		if(!this.apply_button.className.includes(' hidden'))
			this.apply_button.className = this.apply_button.className + ' hidden';
		this.canvas.style.pointerEvents = 'none';
		this.ctx.restore();
		this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
		this.new_planes = true;
	}

	cancel(){
		if(this.canvas.style.pointerEvents == 'auto'){
			this.canvas.style.pointerEvents = 'none';
			this.ctx.restore();
			this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
			this.slice_points = [];
			this.output = [];
			this.new_planes = false;
			this.state = 0;
			if(!this.apply_button.className.includes(' hidden'))
				this.apply_button.className = this.apply_button.className + ' hidden';
		}
	}

	click(x, y){
		switch(this.state){
			case 0:
				for(let i = 0; i < viewports.length; i++){
					if(viewports[i].check_hit(x, y)){
						this.slice_viewport = viewports[i];
					}
					else{
						this.ctx.fillRect(viewports[i].x, viewports[i].y, viewports[i].width, viewports[i].height);
					}
				}

				this.ctx.save();
				this.ctx.beginPath();
				this.ctx.moveTo(this.slice_viewport.x, this.slice_viewport.y);
				this.ctx.lineTo(this.slice_viewport.x + this.slice_viewport.width, this.slice_viewport.y);
				this.ctx.lineTo(this.slice_viewport.x + this.slice_viewport.width, this.slice_viewport.y + this.slice_viewport.height);
				this.ctx.lineTo(this.slice_viewport.x, this.slice_viewport.y + this.slice_viewport.height);
				this.ctx.lineTo(this.slice_viewport.x, this.slice_viewport.y);
				this.ctx.clip();


				this.apply_button.className = this.apply_button.className.replace(' hidden', '');
				this.apply_button.style.left = (this.slice_viewport.x + (this.slice_viewport.width - this.apply_button.clientWidth)/2).toString() + 'px';
				this.apply_button.style.top = (this.slice_viewport.y + 9*(this.slice_viewport.height - this.apply_button.clientHeight)/10).toString() + 'px';

				this.state = 1;

				this.slice_points.push([x, y]);
				break;
			case 1:
				this.slice_points.push([x, y]);
				break;
			case 2:
				for(let i = 0; i + 1 < this.slice_points.length; i += 2)
					this.output.push([this.slice_points[i], this.slice_points[i + 1], -1*Math.sign(dist_point_line([x,y], this.slice_points.slice(i, i + 2)))]);
				this.deactivate();
				break;
		}
	}

	hover(x, y){
		this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
		if(this.state == 0){
			for(let i = 0; i < this.viewports.length; i++){
				if(!viewports[i].check_hit(x, y)){
					this.ctx.fillRect(viewports[i].x, viewports[i].y, viewports[i].width, viewports[i].height);
				}
			}
		}
		else{
			for(let i = 0; i + 1 < this.slice_points.length; i += 2){
				let slope = (this.slice_points[i + 1][1] - this.slice_points[i][1])/(this.slice_points[i + 1][0] - this.slice_points[i][0]);
				
				let p0 = [this.slice_points[i][0] + this.canvas.width, this.slice_points[i][1] + slope*this.canvas.width];
				let p1 = [this.slice_points[i][0] - this.canvas.width, this.slice_points[i][1] - slope*this.canvas.width];

				if(this.state == 2){
					let line_length = dist(p0, p1);
					let line = make_vec(this.slice_points[i + 1], this.slice_points[i]);
					let axis = [1, 0];
					let angle = angle_between(axis, line);
					if(this.slice_points[i][1] > this.slice_points[i + 1][1])
						angle *= -1;
					let side = -1*Math.sign(dist_point_line([x,y], this.slice_points.slice(i, i + 2)));

					this.ctx.save();
					this.ctx.translate(p0[0], p0[1]);
					this.ctx.rotate(angle);
					this.ctx.fillRect(-line_length, 0, 2*line_length, -1*side*line_length);
					this.ctx.restore();
				}
			}
			for(let i = 0; i + 1 < this.slice_points.length; i += 2){
				let slope = (this.slice_points[i + 1][1] - this.slice_points[i][1])/(this.slice_points[i + 1][0] - this.slice_points[i][0]);
				
				let p0 = [this.slice_points[i][0] + this.canvas.width, this.slice_points[i][1] + slope*this.canvas.width];
				let p1 = [this.slice_points[i][0] - this.canvas.width, this.slice_points[i][1] - slope*this.canvas.width];

				this.ctx.beginPath();
				this.ctx.moveTo(p0[0], p0[1]);
				this.ctx.lineTo(p1[0], p1[1]);
				this.ctx.stroke();
			}
		}
		if(this.state != 2){
			if(this.slice_points.length % 2 == 1){
				let i = this.slice_points.length - 1;
				this.ctx.beginPath();
				this.ctx.moveTo(this.slice_points[i][0], this.slice_points[i][1]);
				this.ctx.lineTo(x, y);
				this.ctx.stroke();

				this.draw_cross(this.slice_points[i][0], this.slice_points[i][1]);
			}

			this.draw_cross(x, y);
		}
	}

	draw_cross(x, y){
		this.ctx.lineWidth = this.cross_size/6;
		this.ctx.beginPath();
		this.ctx.moveTo(x - this.cross_size/2, y);
		this.ctx.lineTo(x + this.cross_size/2, y);
		this.ctx.moveTo(x, y - this.cross_size/2);
		this.ctx.lineTo(x, y + this.cross_size/2);
		this.ctx.stroke();
		this.ctx.lineWidth = 1;
	}

	select(){
		this.state = 2;
	}

	resize(w, h){
		this.canvas.width = w;
		this.canvas.height = h;
		this.ctx.strokeStyle = this.line_color;
		this.ctx.fillStyle = this.fill_color;
	}
}

function make_slice_interface(w, h, lc, fc, cs){
	let si = new SliceInterface(w, h, lc, fc, cs);

	si.canvas.onmousedown = function(e){
		if(si.state == 2)
			add_class(si.apply_button, ' apply_loading');
	}

	si.canvas.onmouseup = function(e){
		if(si.state == 2)
			remove_class(si.apply_button, ' apply_loading');
		si.click(e.clientX, e.clientY);
	}

	si.canvas.onmousemove = function(e){
		si.hover(e.clientX, e.clientY);
	}

	si.apply_button.onmouseup = function(){
		si.select();
	}

	return si;
}

