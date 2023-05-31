class CompareMouse{
	constructor(width, height, color, size, stroke){
		this.canvas = document.getElementById('mousecanvas');
		this.canvas.width = width;
		this.canvas.height = height;
		this.ctx = this.canvas.getContext('2d');

		this.color = color;
		this.stroke = stroke;
		this.radius = size/2;

		this.ctx.strokeStyle = color;
		this.ctx.lineWidth = stroke;

		this.last = [];
	}

	update(x, y, viewports){
		//clear last cursors
		if(this.last.length > 0){
			for(let i = 0; i < this.last.length; i++){
				this.ctx.clearRect(this.last[i][0] - 2*this.radius, this.last[i][1] - 2*this.radius, this.radius*4, this.radius*4);
			}
			this.last = [];
		}

		//draw new cursors
		if(viewports.length > 1){
			let hit_ind = -1;
			for(let i = 0; i < viewports.length && hit_ind < 0; i++){
				if(viewports[i].check_hit(x, y))
					hit_ind = i;
			}
			if(hit_ind >= 0){
				let x_per = (x - viewports[hit_ind].x)/viewports[hit_ind].width;
				let y_per = (y - viewports[hit_ind].y)/viewports[hit_ind].height;
				for(let i = 0; i < viewports.length; i++){
					if(!viewports[i].equals(viewports[hit_ind])){
						let pos = [viewports[i].x + viewports[i].width*x_per, viewports[i].y + viewports[i].height*y_per];

						this.draw_cursor(pos[0], pos[1]);

						this.last.push(pos);
					}
				}
			}
		}
	}

	draw_cursor(x,y){
		let radius = this.radius/5;
		this.ctx.beginPath();
		this.ctx.moveTo(x - this.radius, y + this.radius - radius);
		this.ctx.lineTo(x - this.radius, y - this.radius + radius);
		this.ctx.arc(x - this.radius + radius, y - this.radius + radius, radius, Math.PI, 1.5*Math.PI);
		this.ctx.lineTo(x + this.radius - radius, y - this.radius);
		this.ctx.arc(x + this.radius - radius, y - this.radius + radius, radius, 1.5*Math.PI, 0);
		this.ctx.lineTo(x + this.radius, y + this.radius - radius);
		this.ctx.arc(x + this.radius - radius, y + this.radius - radius, radius, 0, .5*Math.PI);
		this.ctx.lineTo(x - this.radius + radius, y + this.radius);
		this.ctx.arc(x - this.radius + radius, y + this.radius - radius, radius, .5*Math.PI, Math.PI);
		this.ctx.stroke();
	}

	resize(w, h){
		this.canvas.width = w;
		this.canvas.height = h;
		this.ctx.strokeStyle = this.color;
		this.ctx.lineWidth = this.stroke;
	}
}

