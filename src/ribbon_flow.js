class RibbonFlow{
	constructor(positions, rotations, forces, max_force, num_t, num_g, p_fpv, c_fpv, v_fpv){
		this.p_fpv = p_fpv;
		this.c_fpv = c_fpv;
		this.v_fpv = v_fpv;
		this.curr_step = 0;
		this.buffer_changed = false;
		this.num_t = num_t;
		this.paused = false;

		let lw = .2;
		let hw = 15;
		let wf = 2.5;
		let rs = 10;
		// let lc = [.35,.35,.8];
		let lc = [.55,.55,1];
		let hc = [1,1,1];
		let cr = 1;
		let mr = 2;
		let cmap = 1;

		this.position_buffer = new Float32Array((num_t*num_g + num_g*2)*2*p_fpv);
		this.color_buffer = new Float32Array((num_t*num_g + num_g*2)*2*c_fpv);
		let pos_ind = 0;
		let col_ind = 0;

		for(let g = 0; g < num_g; g++){
			let total_rotation = 0;

			let last_pos = [];
			let this_pos = [];
			let last_pll = [];
			let this_pll = [];
			for(let pp = 0; pp < 3; pp++){
				last_pos.push(positions[0][g][pp]);
				this_pos.push(positions[0][g][pp]);
				last_pll.push(this_pos[pp] - last_pos[pp]);
				this_pll.push(this_pos[pp] - last_pos[pp]);
			}

			let ribbon_vec = norm([1/(positions[1][g][0] - this_pos[0]), 
								   1/(positions[1][g][1] - this_pos[1]), 
								  -2/(positions[1][g][2] - this_pos[2])]);

			for(let pp = 0; pp < p_fpv*2; pp++, pos_ind++){
				this.position_buffer[pos_ind] = positions[0][g][pp % p_fpv];
				last_pos[pp] = positions[0][g][pp % p_fpv];
				this_pos[pp] = positions[0][g][pp % p_fpv];
			}
			for(let pc = 0; pc < c_fpv*2; pc++, col_ind++){
				this.color_buffer[col_ind] = 0;
			}

			for(let t = 0; t < num_t; t++){
				total_rotation += rotations[t][g];

				let mapper = total_rotation;
				if(cmap == 1)
					mapper = rotations[t][g];

				let col = [pow_map(mapper, 0, mr, lc[0], hc[0], cr),
						   pow_map(mapper, 0, mr, lc[1], hc[1], cr),
						   pow_map(mapper, 0, mr, lc[2], hc[2], cr)];

				for(let pp = 0; pp < p_fpv; pp++){
					this_pos[pp] = positions[t][g][pp];
					this_pll[pp] = this_pos[pp] - last_pos[pp];
				}

				let elbow = cross(this_pll, last_pll);
				let elbow_rot = Math.acos(dot(this_pll, last_pll)/(magnitude(this_pll)*magnitude(last_pll)));

				if(Number.isNaN(elbow_rot))
					elbow_rot = 0;

				ribbon_vec = rotateabout(ribbon_vec, elbow, elbow_rot);
				ribbon_vec = rotateabout(ribbon_vec, this_pll, rs*rotations[t][g]*Math.PI/180);

				let ribbon_size = pow_map(forces[t][g], 0, max_force, lw, hw, wf);

				for(let p = 0; p < p_fpv; p++, pos_ind++)
					this.position_buffer[pos_ind] = positions[t][g][p] + ribbon_vec[p] * ribbon_size;
				for(let p = 0; p < p_fpv; p++, pos_ind++)
					this.position_buffer[pos_ind] = positions[t][g][p] - ribbon_vec[p] * ribbon_size;
				
				let op = Math.pow((14 - magnitude(this_pll))/14, 10);
				for(let c = 0; c < c_fpv - 1; c++, col_ind++)
					this.color_buffer[col_ind] = col[c];
				this.color_buffer[col_ind] = op;
				col_ind++;

				for(let c = 0; c < c_fpv - 1; c++, col_ind++)
					this.color_buffer[col_ind] = col[c];
				this.color_buffer[col_ind] = op;
				col_ind++;

				for(let pp = 0; pp < p_fpv; pp++){
					last_pos[pp] = this_pos[pp];
					last_pll[pp] = this_pll[pp];
				}
			}

			for(let pp = 0; pp < p_fpv*2; pp++, pos_ind++)
				this.position_buffer[pos_ind] = positions[num_t - 1][g][pp % p_fpv];
			for(let pc = 0; pc < c_fpv*2; pc++, col_ind++)
				this.color_buffer[col_ind] = 0;
		}

		let num_v = this.position_buffer.length / this.p_fpv;

		this.visibility_buffers = [];
		let ribbon_len = (num_t + 2)*2;
		for(let t = 0; t < num_t; t++){
			this.visibility_buffers.push(new Float32Array(num_v));
			let ribbon_ind = 0;
			for(let v = 0; v < this.visibility_buffers[t].length; v++, ribbon_ind = (ribbon_ind + 1) % ribbon_len){
				if(ribbon_ind - 2 <= t*2)
					this.visibility_buffers[t][v] = 0;
				else{
					this.visibility_buffers[t][v] = -1;
				}
			}
		}
	}

	init_buffers(){
		this.fsize = this.position_buffer.BYTES_PER_ELEMENT;

		//position buffer
		this.gl_pos_buf = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, this.gl_pos_buf);
		gl.bufferData(gl.ARRAY_BUFFER, this.position_buffer, gl.STATIC_DRAW);

		this.a_Position = gl.getAttribLocation(gl.program, "a_Position");
		gl.vertexAttribPointer(this.a_Position, 3, gl.FLOAT, false, this.fsize * this.p_fpv, 0);
		gl.enableVertexAttribArray(this.a_Position);

		//color buffer
		this.gl_col_buf = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, this.gl_col_buf);
		gl.bufferData(gl.ARRAY_BUFFER, this.color_buffer, gl.STATIC_DRAW);

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
		gl.vertexAttribPointer(this.a_Position, 3, gl.FLOAT, false, this.fsize * this.p_fpv, 0);

		//color buffer
		gl.bindBuffer(gl.ARRAY_BUFFER, this.gl_col_buf);
		gl.vertexAttribPointer(this.a_Color, 4, gl.FLOAT, false, this.fsize * this.c_fpv, 0);

		//visibility buffers
		gl.bindBuffer(gl.ARRAY_BUFFER, this.gl_vis_buf);
		if(this.buffer_changed)
			gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.visibility_buffers[this.curr_step]);
		gl.vertexAttribPointer(this.a_Visibility, 1, gl.FLOAT, false, this.fsize * this.v_fpv, 0);

		this.buffer_changed = false;

		//drawing
		pushMatrix(modelMatrix);

		modelMatrix.scale(.025, .025, .025);
		modelMatrix.translate(0, 0, 800);
		modelMatrix.rotate(rx, 1, 0, 0);
		modelMatrix.rotate(rz, 0, 0, 1);
		modelMatrix.translate(0, 0, -800);

		gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
		gl.scissor(viewport.x, viewport.y, viewport.width, viewport.height);
		gl.viewport(viewport.x, viewport.y, viewport.width, viewport.height);
		gl.drawArrays(gl.TRIANGLE_STRIP, 0, this.position_buffer.length / this.p_fpv);

		modelMatrix = popMatrix();
	}

	slice(planefilters){
		for(let v = 0; v < this.visibility_buffers[0].length; v++){
			let pos_ind = v/this.v_fpv*this.p_fpv;
			let pos = [this.position_buffer[pos_ind],
					   this.position_buffer[pos_ind + 1], 
					   this.position_buffer[pos_ind + 2]];
			let outside = false;
			for(let f = 0; !outside && f < planefilters.length; f++){
				outside = planefilters[f].check(pos);
			}
			if(outside)
				for(let t = 0; t < this.num_t; t++)
					this.visibility_buffers[t][v] -= 1;
		}
		this.buffer_changed = true;
	}

	unslice(planefilters){
		for(let v = 0; v < this.visibility_buffers[0].length; v++){
			let pos_ind = v/this.v_fpv*this.p_fpv;
			let pos = [this.position_buffer[pos_ind],
					   this.position_buffer[pos_ind + 1], 
					   this.position_buffer[pos_ind + 2]];
			let outside = false;
			for(let f = 0; !outside && f < planefilters.length; f++){
				outside = planefilters[f].check(pos);
			}
			if(outside)
				for(let t = 0; t < this.num_t; t++)
					this.visibility_buffers[t][v] += 1;
		}
		this.buffer_changed = true;
	}

	reset_slices(){
		let ribbon_len = (this.num_t + 2)*2;
		for(let t = 0; t < this.num_t; t++){
			let ribbon_ind = 0;
			for(let v = 0; v < this.visibility_buffers[t].length; v++, ribbon_ind = (ribbon_ind + 1) % ribbon_len){
				if(ribbon_ind - 2 <= t*2)
					this.visibility_buffers[t][v] = 0;
				else{
					this.visibility_buffers[t][v] = -1;
				}
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





