class ViewPort{
	constructor(x, y, width, height, window_width, window_height){
		this.x = x;
		this.y = y;
		this.width = width;
		this.height = height;

		if (window_width === undefined) 
			this.w_width = -1;
		else
			this.w_width = window_width;
		
		if(window_height === undefined)
			this.w_height = -1;
		else
			this.w_height = window_height;
	}

	check_hit(x, y){
		return x >= this.x && y >= this.y && x < this.x + this.width && y < this.y + this.height;
	}

	equals(other){
		return this.x == other.x && this.y == other.y && this.width == other.width && this.height == other.height;
	}

	clear(){
		gl.scissor(this.x, this.y, this.width, this.height);
		gl.viewport(this.x, this.y, this.width, this.height);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	}

	resize(window_width, window_height){
		let x_scl = window_width/this.w_width;
		let y_scl = window_height/this.w_height;

		this.x *= x_scl;
		this.y *= y_scl;
		this.width *= x_scl;
		this.height *= y_scl;

		this.w_width = window_width;
		this.w_height = window_height;
	}
}

