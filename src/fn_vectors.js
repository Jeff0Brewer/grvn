class FnVectors{
	constructor(num_t, p_fpv, c_fpv, v_fpv){
		this.p_fpv = p_fpv;
		this.c_fpv = c_fpv;
		this.v_fpv = v_fpv;
		this.curr_step = 0;
		this.buffer_changed = false;
		this.num_t = num_t;
		this.paused = false;
		
		this.position_buffers = [];
		this.color_buffers = [];
		this.visibility_buffers = [];
	}

	add_vbos(pos, col){
		this.position_buffers.push(new Float32Array(pos));
		this.color_buffers.push(new Float32Array(col));

                const ind = this.visibility_buffers.length
		this.visibility_buffers.push(new Float32Array(pos.length/this.p_fpv));
		for(let i = 0; i < this.visibility_buffers[ind].length; i++)
			this.visibility_buffers[ind][i] = 0;
	}

	init_buffers(){
		this.fsize = this.position_buffers[this.curr_step].BYTES_PER_ELEMENT;

		//position buffer
		this.gl_pos_buf = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, this.gl_pos_buf);
		gl.bufferData(gl.ARRAY_BUFFER, this.position_buffers[this.curr_step], gl.DYNAMIC_DRAW);

		this.a_Position = gl.getAttribLocation(gl.program, "a_Position");
		gl.vertexAttribPointer(this.a_Position, 3, gl.FLOAT, false, this.fsize * this.p_fpv, 0);
		gl.enableVertexAttribArray(this.a_Position);

		//color buffer
		this.gl_col_buf = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, this.gl_col_buf);
		gl.bufferData(gl.ARRAY_BUFFER, this.color_buffers[this.curr_step], gl.DYNAMIC_DRAW);

		this.a_Color = gl.getAttribLocation(gl.program, "a_Color");
		gl.vertexAttribPointer(this.a_Color, 4, gl.FLOAT, false, this.fsize * this.c_fpv, 0);
		gl.enableVertexAttribArray(this.a_Color);

		//visibility buffers
		this.gl_vis_buf = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, this.gl_vis_buf);
		gl.bufferData(gl.ARRAY_BUFFER, this.visibility_buffers[this.curr_step], gl.DYNAMIC_DRAW);

		this.a_Visibility = gl.getAttribLocation(gl.program, "a_Visibility");
		gl.vertexAttribPointer(this.a_Visibility, 1, gl.FLOAT, false, this.fsize * this.v_fpv, 0);
		gl.enableVertexAttribArray(this.a_Visibility);
	}

	draw(u_ModelMatrix, rx, rz, viewport){
		//position buffer
		gl.bindBuffer(gl.ARRAY_BUFFER, this.gl_pos_buf);
		if(this.buffer_changed)
			gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.position_buffers[this.curr_step]);
		gl.vertexAttribPointer(this.a_Position, 3, gl.FLOAT, false, this.fsize * this.p_fpv, 0);

		//color buffer
		gl.bindBuffer(gl.ARRAY_BUFFER, this.gl_col_buf);
		if(this.buffer_changed)
			gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.color_buffers[this.curr_step]);
		gl.vertexAttribPointer(this.a_Color, 4, gl.FLOAT, false, this.fsize * this.c_fpv, 0);

		//visibility buffers
		gl.bindBuffer(gl.ARRAY_BUFFER, this.gl_vis_buf);
		if(this.buffer_changed)
			gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.visibility_buffers[this.curr_step]);
		gl.vertexAttribPointer(this.a_Visibility, 1, gl.FLOAT, false, this.fsize * this.v_fpv, 0);

		this.buffer_changed = false;

		pushMatrix(modelMatrix);
		modelMatrix.scale(.025, .025, .025);
		modelMatrix.translate(0, 0, 800);
		modelMatrix.rotate(rx, 1, 0, 0);
		modelMatrix.rotate(rz, 0, 0, 1);
		modelMatrix.translate(0, 0, -800);

		gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
		gl.scissor(viewport.x, viewport.y, viewport.width, viewport.height);
		gl.viewport(viewport.x, viewport.y, viewport.width, viewport.height);
		gl.drawArrays(gl.LINES, 0, this.position_buffers[this.curr_step].length / this.p_fpv);
		modelMatrix = popMatrix();
	}

	slice(planefilters){
		for(let t = 0; t < this.num_t; t++){
			for(let v = 0; v < this.visibility_buffers[t].length; v++){
				let pos_ind = v/this.v_fpv*this.p_fpv;
				let pos = [this.position_buffers[t][pos_ind],
						   this.position_buffers[t][pos_ind + 1], 
						   this.position_buffers[t][pos_ind + 2]];

				let outside = false;
				for(let f = 0; !outside && f < planefilters.length; f++){
					outside = planefilters[f].check(pos);
				}
				if(outside)
					this.visibility_buffers[t][v] -= 1;
			}
		}
		this.buffer_changed = true;
	}

	unslice(planefilters){
		for(let t = 0; t < this.num_t; t++){
			for(let v = 0; v < this.visibility_buffers[t].length; v++){
				let pos_ind = v/this.v_fpv*this.p_fpv;
				let pos = [this.position_buffers[t][pos_ind],
						   this.position_buffers[t][pos_ind + 1], 
						   this.position_buffers[t][pos_ind + 2]];
						   
				let outside = false;
				for(let f = 0; !outside && f < planefilters.length; f++){
					outside = planefilters[f].check(pos);
				}
				if(outside)
					this.visibility_buffers[t][v] += 1;
			}
		}
		this.buffer_changed = true;
	}

	reset_slices(){
		for(let t = 0; t < this.num_t; t++){
			for(let v = 0; v < this.visibility_buffers[t].length; v++){
				this.visibility_buffers[t][v] = 0;
			}
		}
	}

	set_step(step){
		if(!this.paused){
			this.buffer_changed = this.curr_step != step || this.buffer_changed;
			this.curr_step = step;
		}
	}

	toggle_pause(){
		this.paused = !this.paused;
	}
}






