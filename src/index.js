var num_t = -1;
var num_g = -1;

var p_fpv = 3;
var c_fpv = 4;
var v_fpv = 1;

var sidebar = document.getElementById('sidebar');
var fs_tab = document.getElementById('fs_tab');
var fs_menu = [document.getElementById('fs_menu_0'), document.getElementById('fs_menu_1')];
var sm_tab = document.getElementById('sm_tab');
var sm_menu = [document.getElementById('sm_menu_0'), document.getElementById('sm_menu_1')];


var maxload = document.getElementById('loadbg').clientWidth;

var frozen = false;
var vis_mode = 0; //0: full sample | 1: small multiples

var pos_data;
var rot_data;
var for_data;

var con_data = [];
var max_force_mag = 0;
var max_force_comp = 0;

var viewports;
var viewport_count;

var context_axis;
var ribbon_flow; 
var fn_vectors = new FnVectors(num_t, p_fpv, c_fpv, v_fpv);
var grain_surfaces = new GrainSurfaces(p_fpv, c_fpv, v_fpv);

var flow_visible = false;
var vector_visible = true;

var timeline;
var save_speed = 0;

var compare_mouse;

var slice_interface;
var slices = [];
var slice_ind = 0;

var select_interface;
var select_vectors = [];
var selections = [];
var select_ind = 0;

var sm_viewer;

var context_image;

var global_fields = make_global_fields('rgb(75,137,124)', 1.5);
var global_reader = new FileReader();

var color_mapper = make_color_mapper("#810126 0%, #d00c21 18.7%, #cf0f21 18.7%, #dd171e 23.2%, #df161d 23.2%, #df161d 23.5%, #df191d 23.5%, #e61e1e 26.3%, #e6221e 26.5%, #e8241f 27.7%, #e8261e 27.7%, #f13625 32.2%, #f13824 32.2%, #f63f27 34.2%, #f84528 35.6%, #f84727 35.6%, #fc502c 37.9%, #fd6e33 44.1%, #fc6f34 44.1%, #fd7235 44.9%, #fd7434 45.1%, #fd7b37 46.5%, #fc7d37 46.8%, #fd863a 48.8%, #fe8a3c 49.7%, #fd8c3b 49.7%, #fd9440 52.7%, #fc953f 52.7%, #fe953f 53.1%, #fd9641 53.1%, #fd9d43 55.9%, #fc9e45 55.9%, #fea145 57.5%, #fea346 57.5%, #ffa948 60%, #feaa49 60%, #feb04b 62.3%, #fdb24c 62.3%, #fdb24c 62.6%, #ffb14c 62.6%, #ffb14c 63.1%, #feb34d 63.1%, #feb853 64.9%, #fedd7e 77.8%, #fffecb 100%");
var cmap_reader = new FileReader();

var fs_camera = new FSCamera(.5, .1);
var scrolling;

var VSHADER_SOURCE =
	"attribute vec4 a_Position;\n" +
	"attribute vec4 a_Color;\n" +
	"attribute float a_Visibility;\n" +

	"uniform mat4 u_ModelMatrix;\n" +
	"uniform mat4 u_ViewMatrix;\n" +
	"uniform mat4 u_ProjMatrix;\n" +

	"varying vec3 v_Position;\n" +
	"varying vec4 v_Color;\n"+
	"varying float v_Visibility;\n" +

	"void main() {\n" +
		"gl_Position = u_ProjMatrix * u_ViewMatrix * u_ModelMatrix * a_Position;\n" +
		"v_Position = vec3(u_ModelMatrix * a_Position);\n" +
		"v_Visibility = a_Visibility;\n" +
		"v_Color = a_Color;\n" +
	"}\n";

var FSHADER_SOURCE =
	"precision highp float;\n" +
	"varying vec4 v_Color;\n"+
	"varying float v_Visibility;\n" +

	"void main() { \n" +
		"if(v_Visibility == 0.0) { \n" +
			"gl_FragColor = v_Color;\n" +
		"}\n" +
		"else {\n" + 
			  "discard;\n" +
		"}\n" +
	"}";

modelMatrix = new Matrix4();
var viewMatrix = new Matrix4();
var projMatrix = new Matrix4();

var g_last = Date.now();

function main() {
        //construct vis classes
        ribbon_flow = new RibbonFlow(pos_data, rot_data, for_data[1], for_data[0], num_t, num_g, p_fpv, c_fpv, v_fpv);
        pos_data = [];
        rot_data = [];
        for_data = [];
        grain_surfaces.finish_add();
        context_axis = new Axis(50, 4, p_fpv, c_fpv, v_fpv);

	timeline = make_timeline(num_t);

	window.addEventListener("keyup", keyup, false);

	canvas = document.getElementById("canvas");
	canvas.width = innerWidth - sidebar.clientWidth;
	canvas.height = innerHeight;
	canvas.addEventListener("webglcontextlost", function(e) {
		console.log('context lost');
	    e.preventDefault();
	}, false);

	canvas.addEventListener("webglcontextrestored", function(e) {
	    e.preventDefault();
		setup_gl();
	}, false);

	setup_gl();

	//init viewports
	viewports = [new ViewPort(0, 0, canvas.width, canvas.height, canvas.width, canvas.height)];
	viewport_count = 1;

	projMatrix.setPerspective(35, canvas.width / canvas.height / viewport_count, 1, 500);
	gl.uniformMatrix4fv(u_ProjMatrix, false, projMatrix.elements);

	//init overlay interface elements
	compare_mouse = new CompareMouse(canvas.width, canvas.height, 'rgb(63,215,177,.9)', 40, 1.75);
	slice_interface = make_slice_interface(canvas.width, canvas.height, 'rgb(255,255,255)', 'rgba(0,0,0,.7)', 15);
	select_interface = make_select_interface(canvas.width, canvas.height, 'rgb(255,255,255)', 'rgba(0,0,0,.7)');

	sm_viewer = make_sm_viewer(canvas.width, canvas.height);


	context_image = new ContextImage('rgb(35,35,35)', 'rgb(108,108,108)', grain_surfaces.positions);

	let chains = [
		[26315, 27280, 27286, 28154, 28983, 29303, 30104, 31012, 31749, 32694, 33549, 34065, 35550, 36277, 36799, 37533, 38977],
		[26658, 27372, 28025, 28608, 29465, 30381, 31370, 31708, 32654, 32696],
		[20162, 20874, 21614, 23105, 23223, 24656, 24821, 25962, 27261, 28543, 29312, 29916],
	];
	for(let i = 0; i < chains.length; i++, select_ind++){
		selections.push(make_selection_item(chains[i], grain_surfaces.get_positions_t(chains[i]), num_t, select_ind));
	}


	var tick = function() {
		let now = Date.now();
		let elapsed = now - g_last;
		g_last = now;

		if(slice_interface.new_planes)
			slice(slice_interface.get_output());
		else{
			for(let i = 0; i < slices.length; i++){
				if(slices[i].removed){
					unslice(slices[i].planefilters);
					slices.splice(i, 1);
					context_image.update_slices(grain_surfaces.get_sliced(slices));
					i--;
				}
			}
		}

		if(!frozen)
			draw(elapsed);

		requestAnimationFrame(tick, canvas);
	};
	tick();
}

function draw(elapsed) {
	//draw visualizations
	let viewport_ind = -1;

	if(vis_mode == 0){ //full sample
		viewMatrix.setLookAt(fs_camera.camera.x, fs_camera.camera.y, fs_camera.camera.z, fs_camera.focus.x, fs_camera.focus.y, fs_camera.focus.z, 0, 0, 1);
		gl.uniformMatrix4fv(u_ViewMatrix, false, viewMatrix.elements);

		if(!global_fields.dragging && !fs_camera.dragging)
			timeline.tick(elapsed);
		ribbon_flow.set_step(timeline.timestep);
		fn_vectors.set_step(timeline.timestep);
		if(global_fields.tabs.length >= 0)
			global_fields.set_time(timeline.timestep, num_t);

		if(flow_visible){
			viewport_ind++;
			viewports[viewport_ind].clear();
			ribbon_flow.draw(u_ModelMatrix, fs_camera.rotation.x, fs_camera.rotation.z, viewports[viewport_ind]);
		}

		if(vector_visible){
			viewport_ind++;
			viewports[viewport_ind].clear();
			fn_vectors.draw(u_ModelMatrix, fs_camera.rotation.x, fs_camera.rotation.z, viewports[viewport_ind]);
		}

		if(selections.length > 0 && viewport_ind >= 0){
			let drawing_inds = [];
			for(let i = 0; i < selections.length; i++){
				if(selections[i].removed){
					selections.splice(i, 1);
					i--;
				}
				else if(selections[i].selected){
					drawing_inds = drawing_inds.concat(selections[i].inds);
				}
			}
			if(drawing_inds.length > 0)
				grain_surfaces.draw_inds(drawing_inds, timeline.timestep, u_ModelMatrix, fs_camera.rotation.x, fs_camera.rotation.z, viewports[viewport_ind]);
		}

		if(fs_camera.dragging){
			for(let i = 0; i < viewports.length; i++)
				context_axis.draw(u_ModelMatrix, 0, 0, 800, fs_camera.rotation.x, fs_camera.rotation.z, viewports[i], 800);
		}

		context_image.draw(timeline.timestep);
	}
	else{ //small multiples
		let rotated = [false, -1];
		if(sm_viewer.rotating.length > 0){
			let ind = sm_viewer.mode == 0 ? sm_viewer.am_timesteps[sm_viewer.rotating[0]] : sm_viewer.rotating[1]*selections[sm_viewer.rotating[0]].step_t;
			let angle = Math.abs(selections[sm_viewer.rotating[0]].rotation.x)%360;
			let order = angle > 90 && angle < 270;
			let updated = sm_viewer.mode == 0 ? selections[sm_viewer.rotating[0]].updated[0] : selections[sm_viewer.rotating[0]].updated[ind];
			rotated = [updated, ind, order];
		}
		let out = sm_viewer.update(selections, elapsed);
		let params = out[0];
		let highlighted = out[1];
		for(let i = 0; i < params.length; i++){
			params[i][2].clear();
		}

		if(rotated[0]){
			let off = selections[sm_viewer.rotating[0]].offsets[rotated[1]];
			if(off){
				if(rotated[2])
					context_axis.draw_front(u_ModelMatrix, off.x, off.y, off.z, selections[sm_viewer.rotating[0]].rotation.x, selections[sm_viewer.rotating[0]].rotation.z, sm_viewer.rotating_vp, selections[sm_viewer.rotating[0]].max_disp);
				else
					context_axis.draw_back(u_ModelMatrix, off.x, off.y, off.z, selections[sm_viewer.rotating[0]].rotation.x, selections[sm_viewer.rotating[0]].rotation.z, sm_viewer.rotating_vp, selections[sm_viewer.rotating[0]].max_disp);
			}
		}

		for(let i = 0; i < params.length; i++){
			grain_surfaces.draw_sm(params[i][0], params[i][1], u_ModelMatrix, viewMatrix, u_ViewMatrix, projMatrix, u_ProjMatrix, params[i][2], highlighted);
		}

		if(rotated[0]){
			let off = selections[sm_viewer.rotating[0]].offsets[rotated[1]];
			if(off){
				if(rotated[2])
					context_axis.draw_back(u_ModelMatrix, off.x, off.y, off.z, selections[sm_viewer.rotating[0]].rotation.x, selections[sm_viewer.rotating[0]].rotation.z, sm_viewer.rotating_vp, selections[sm_viewer.rotating[0]].max_disp);
				else
					context_axis.draw_front(u_ModelMatrix, off.x, off.y, off.z, selections[sm_viewer.rotating[0]].rotation.x, selections[sm_viewer.rotating[0]].rotation.z, sm_viewer.rotating_vp, selections[sm_viewer.rotating[0]].max_disp);
			}
		}
		let one_visible = false;
		for(let i = 0; i < selections.length && !one_visible; i++){
			one_visible = one_visible | selections[i].selected;
		}
		if(!one_visible){
			gl.scissor(0, 0, canvas.width, canvas.height);
			gl.viewport(0, 0, canvas.width, canvas.height);
			gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); 
		}
		if(sm_viewer.hovering.length > 0){
			let t = sm_viewer.hovering[1] < 0 ? sm_viewer.am_timesteps[sm_viewer.hovering[2]] : sm_viewer.hovering[1];
			let subset = grain_surfaces.get_positions(selections[sm_viewer.hovering[0]].inds, t);
			context_image.draw(t, subset);
			global_fields.set_time(t, num_t);

		}
		else{
			context_image.draw(timeline.timestep, []);
			global_fields.set_time(0, num_t);
		}
	}
}

function setup_gl(){	
	console.log('initializing gl');

	gl = getWebGLContext(canvas);
	gl.enableVertexAttribArray(0);
	gl.enable(gl.BLEND);
	gl.enable(gl.SCISSOR_TEST);
	gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
	gl.clearColor(0, 0, 0, 1);

	initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE);
	init_buffers();

	u_ModelMatrix = gl.getUniformLocation(gl.program, "u_ModelMatrix");
	u_ViewMatrix = gl.getUniformLocation(gl.program, "u_ViewMatrix");
	u_ProjMatrix = gl.getUniformLocation(gl.program, "u_ProjMatrix");

	console.log('gl initialized');
}

function init_buffers() {
	//init visualization buffers
	context_axis.init_buffers();
	ribbon_flow.init_buffers();
	fn_vectors.init_buffers();
	grain_surfaces.init_buffers();
}

function slice(output){
	let out_mouse_def = output[0];
	let out_vp = output[1];
	let rot = new Matrix4();
	if(out_vp.equals(viewports[0])){
		rot.translate(0, 0, 800);
		rot.rotate(-fs_camera.rotation.z, 0, 0, 1);
		rot.rotate(-fs_camera.rotation.x, 1, 0, 0);
		rot.translate(0, 0, -800);
		rot.scale(1/.025, 1/.025, 1/.025);
	}
	else if(out_vp.equals(viewports[1])){
		rot.translate(0, 0, 800);
		rot.rotate(-fs_camera.rotation.z, 0, 0, 1);
		rot.rotate(-fs_camera.rotation.x, 1, 0, 0);
		rot.translate(0, 0, -800);
		rot.scale(1/.025, 1/.025, 1/.025);
	}

	let planes = [];
	for(let i = 0; i < out_mouse_def.length; i++){
		for(let p = 0; p < 2; p++){
			out_mouse_def[i][p][1] = out_vp.height - (out_mouse_def[i][p][1] - out_vp.y);
		}

		let mid = midpoint(out_mouse_def[i][0], out_mouse_def[i][1]);

		let trio = [];
		trio.push(unprojectmouse(out_mouse_def[i][0][0], out_mouse_def[i][0][1], modelMatrix, viewMatrix, projMatrix, out_vp, 0, rot));
		trio.push(unprojectmouse(out_mouse_def[i][1][0], out_mouse_def[i][1][1], modelMatrix, viewMatrix, projMatrix, out_vp, 0, rot));
		trio.push(unprojectmouse(mid[0], mid[1], modelMatrix, viewMatrix, projMatrix, out_vp, 1, rot));

		let plane = planefrompoints(trio[0], trio[1], trio[2]);

		planes.push(new PlaneFilter(plane, out_mouse_def[i][2]));
	}

	fn_vectors.slice(planes);
	ribbon_flow.slice(planes);

	slices.push(make_slice_item(slice_ind, planes, output));
	slice_ind++;

	context_image.update_slices(grain_surfaces.get_sliced(slices));

	frozen = false;
}

function unslice(planes){
	fn_vectors.unslice(planes);
	ribbon_flow.unslice(planes);
}

function brush_vecs(out){
	let brush = new Brush(out[0], getprojectedlength(2.5, modelMatrix, viewMatrix, projMatrix));
	let vp = out[1];
	let rot = new Matrix4();
	if(vp.equals(viewports[0])){
		rot.translate(0, 0, 800);
		rot.rotate(-fs_camera.rotation.z, 0, 0, 1);
		rot.rotate(-fs_camera.rotation.x, 1, 0, 0);
		rot.translate(0, 0, -800);
		rot.scale(1/.025, 1/.025, 1/.025);
	}
	else if(vp.equals(viewports[1])){
		rot.translate(0, 0, 800);
		rot.rotate(-fs_camera.rotation.z, 0, 0, 1);
		rot.rotate(-fs_camera.rotation.x, 1, 0, 0);
		rot.translate(0, 0, -800);
		rot.scale(1/.025, 1/.025, 1/.025);
	}

	let vectors = [];
	for(let i = 0; i < brush.points.length; i++){
		brush.points[i][1] = vp.height - (brush.points[i][1] - vp.y);
		vectors.push(unprojectvector(brush.points[i][0], brush.points[i][1], modelMatrix, viewMatrix, projMatrix, vp, rot));
	}
	select_vectors.push(vectors);
}

function get_hovered_sm(e){
	let color = new Uint8Array(4);
	gl.readPixels(e.clientX, canvas.height - e.clientY, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, color);

	let item = selections[sm_viewer.hovering[0]];
	let off = item.offsets[sm_viewer.hovering[1]];

	let rot = new Matrix4();
	rot.translate(off.x, off.y, off.z);
	rot.rotate(-item.rotation.z, 0, 0, 1);
	rot.rotate(-item.rotation.x, 1, 0, 0);
	rot.translate(-off.x, -off.y, -off.z);
	rot.scale(1/.025, 1/.025, 1/.025);

	let vp = sm_viewer.hover_viewport

	let proj = new Matrix4();
	proj.setPerspective(35, vp.width/vp.height, 1, 500);
	let view = new Matrix4();
	view.setLookAt(item.camera.x, item.camera.y, item.camera.y, off.x*.025, off.y*.025, off.z*.025, 0, 0, 1);
	let vec = unprojectvector(e.clientX, canvas.height - e.clientY, modelMatrix, view, proj, vp, rot);

	let ind = grain_surfaces.get_hovering(sm_viewer.hovering[1], selections[sm_viewer.hovering[0]].inds, off, vec, [color[0]/255.0, color[1]/255.0, color[2]/255.0]);
	update_hovered_sm(ind, sm_viewer.hovering[1]);
 
	// console.log(ind);
}

function update_hovered_sm(ind, t){
	if(ind && color_mapper && color_mapper.data.length > 0)
		color_mapper.update_hover(ind, t);
	if(ind && sm_viewer)
		sm_viewer.update_highlight(ind);
}

function switch_mode(mode){
	if(mode != vis_mode){
		vis_mode = mode;
		if(gl){
			gl.scissor(0, 0, canvas.width, canvas.height);
			gl.viewport(0, 0, canvas.width, canvas.height);
			gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);  
		}

		if(global_fields)
			global_fields.toggle_workspace();

		if(mode == 0){ //full sample
			projMatrix.setPerspective(35, canvas.width / canvas.height / viewport_count, 1, 500);
			if(gl)
				gl.uniformMatrix4fv(u_ProjMatrix, false, projMatrix.elements);
			for(let i = 0; i < selections.length; i++)
				add_class(selections[i].elements.time_inputs.panel, ' hidden');
			if(sm_viewer){
				sm_viewer.last_num_selected = -1;
				sm_viewer.leave_sm();
			}
			add_class(document.getElementById('selection_list'), ' selection_list_fs');
			remove_class(document.getElementById('add_selection'), ' hidden');
		}
		else{
			remove_class(document.getElementById('selection_list'), ' selection_list_fs');
			add_class(document.getElementById('add_selection'), ' hidden');
		}
	}
}

function resize_all(){
	canvas.width = innerWidth - sidebar.clientWidth;
	canvas.height = innerHeight;

	projMatrix.setPerspective(35, canvas.width / canvas.height / viewport_count, 1, 500);
	if(gl)
		gl.uniformMatrix4fv(u_ProjMatrix, false, projMatrix.elements);

	if(viewports){
		for(let i = 0; i < viewports.length; i++){
			viewports[i].resize(canvas.width, canvas.height);
		}
	}
	if(compare_mouse)
		compare_mouse.resize(canvas.width, canvas.height);
	if(slice_interface)
		slice_interface.resize(canvas.width, canvas.height);
	if(select_interface)
		select_interface.resize(canvas.width, canvas.height);
	if(timeline)
		timeline.resize();
	if(sm_viewer){
		let params = sm_viewer.resize(canvas.width, canvas.height, selections);
		if(params)
			params = params[0];
		if(vis_mode == 1 && params){
			for(let i = 0; i < params.length; i++)
				grain_surfaces.draw_sm(params[i][0], params[i][1], u_ModelMatrix, viewMatrix, u_ViewMatrix, projMatrix, u_ProjMatrix, params[i][2]);
		}
	}
}

function keyup(e){
	switch(e.keyCode){
		case 27:
			if(slice_interface)
				slice_interface.cancel();
			if(select_interface)
				select_interface.cancel();
			frozen = false;
			break;
		case 32:
			if(vis_mode == 0){
				if(timeline)
					timeline.toggle_pause();
			}
			else{
				if(sm_viewer)
					sm_viewer.pause_playing(selections);
			}
			break;
		case 8:
			timeline.remove_bookmark();
			break;
	}
}

document.body.onresize = function(){
	resize_all();
}

document.body.onmousemove = function(e){
	if(timeline){
		let workspace = timeline.mousemove(e);
		if(workspace && global_fields)
			global_fields.change_workspace(workspace[0], workspace[1], workspace[2], num_t);
	}
	if(color_mapper)
		color_mapper.mousemove(e);
	if(global_fields.dragging && timeline)
		timeline.set_time(global_fields.get_time(e, num_t, timeline.workspace.low, timeline.workspace.high));
	if(select_interface && select_interface.click_ind == 1)
		select_interface.hover_rotate(e.clientX, e.clientY);
}

document.body.onmouseup = function(e){
	if(timeline)
		timeline.mouseup();
	if(color_mapper)
		color_mapper.mouseup();
	if(global_fields)
		global_fields.end_drag();
}

canvas.onmousedown = function(e){
	if(vis_mode == 0 && fs_camera)
		fs_camera.mousedown(e);
	if(vis_mode == 1 && sm_viewer)
		sm_viewer.start_rotate(e.clientX, e.clientY, selections);
}

canvas.onmousemove = function(e){
	switch(vis_mode){
		case 0: //full sample
			if(fs_camera)
				fs_camera.mousemove(e);
			if(compare_mouse)
				compare_mouse.update(e.clientX, e.clientY, viewports);
			break;
		case 1: //small multiples
			if(sm_viewer){
				sm_viewer.hover(e.clientX, e.clientY, selections);
				if(sm_viewer.mode == 1 && sm_viewer.rotating.length <= 0 && sm_viewer.hovering.length > 0){
					get_hovered_sm(e);
				}
			}
			if(compare_mouse)
				compare_mouse.update(e.clientX, e.clientY, []);
			break;
	}
}

canvas.onmouseup = function(e){
	if(vis_mode == 0 && fs_camera)
		fs_camera.mouseup(e);
	if(vis_mode == 1 && sm_viewer)
		sm_viewer.stop_rotate(selections);
}

canvas.onwheel = function(e){
	if(vis_mode == 0 && fs_camera)
		fs_camera.wheel(e);
	if(vis_mode == 1 && sm_viewer){
		sm_viewer.zoom(e, selections);
	}
}

canvas.onmouseleave = function(e){
	if(compare_mouse)
		compare_mouse.update(e.clientX, e.clientY, []);
	if(sm_viewer)
		sm_viewer.mouseleave(selections);
	update_hovered_sm(-1, 0);
}

sidebar.onmousedown = function(){
	if(slice_interface)
		slice_interface.cancel();
	if(select_interface)
		select_interface.cancel();
	frozen = false;
}

document.getElementById('fold_sidebar').onmouseup = function(e){
	if(sidebar.clientWidth == 0){
		sidebar.style.width = '225px';
		document.getElementById('collapse_arrow').setAttribute("transform", "rotate(0)");
	}
	else{
		if(slice_interface)
			slice_interface.cancel();
		if(select_interface)
			select_interface.cancel();
		frozen = false;
		sidebar.style.width = '0px';
		document.getElementById('collapse_arrow').setAttribute("transform", "rotate(180)");
	}

	resize_all();
}

fs_tab.onmouseup = function(){
	for(let i = 0; i < fs_menu.length; i++)
		remove_class(fs_menu[i], ' hidden');
	for(let i = 0; i < sm_menu.length; i++)
		add_class(sm_menu[i], ' hidden');

	timeline.show();

	let underline = document.getElementById('tab_underline');
	if(underline.style.animationName && !(underline.style.animationName == 'shift_left'))
		underline.style.animationName = 'shift_left';

	switch_mode(0);
}

sm_tab.onmouseup = function(){
	for(let i = 0; i < fs_menu.length; i++)
		add_class(fs_menu[i], ' hidden');
	for(let i = 0; i < sm_menu.length; i++)
		remove_class(sm_menu[i], ' hidden');

	timeline.hide();

	let underline = document.getElementById('tab_underline');
	if(!(underline.style.animationName == 'shift_right'))
		underline.style.animationName = 'shift_right';

	switch_mode(1);
}

document.getElementById('flow_toggle').onmouseup = function(){
	flow_visible = !flow_visible;

	if(flow_visible){
		viewport_count++;
		this.className = this.className.replace('toggle_passive', 'toggle_active');
	}
	else{
		viewport_count--;
		this.className = this.className.replace('toggle_active', 'toggle_passive');
	}

	if(viewport_count == 0){
		gl.scissor(0, 0, canvas.width, canvas.height);
		gl.viewport(0, 0, canvas.width, canvas.height);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);  
	}

	viewports = [];
	let w = canvas.width/viewport_count;
	for(let i = 0; i < viewport_count; i++){
		viewports.push(new ViewPort(w*i, 0, w, canvas.height, canvas.width, canvas.height));
	}
	if(viewports.length == 0){
		add_class(document.getElementById('add_slice'), ' hidden');
		add_class(document.getElementById('add_selection'), ' hidden');
	}
	else{
		remove_class(document.getElementById('add_slice'), ' hidden');
		remove_class(document.getElementById('add_selection'), ' hidden');
	}

	projMatrix.setPerspective(35, canvas.width / canvas.height / viewport_count, 1, 500);
	gl.uniformMatrix4fv(u_ProjMatrix, false, projMatrix.elements);
}

document.getElementById('vector_toggle').onmouseup = function(){
	vector_visible = !vector_visible;

	if(vector_visible){
		viewport_count++;
		this.className = this.className.replace('toggle_passive', 'toggle_active');
	}
	else{
		viewport_count--;
		this.className = this.className.replace('toggle_active', 'toggle_passive');
	}

	if(viewport_count == 0){
		gl.scissor(0, 0, canvas.width, canvas.height);
		gl.viewport(0, 0, canvas.width, canvas.height);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);  
	}

	viewports = [];
	let w = canvas.width/viewport_count;
	for(let i = 0; i < viewport_count; i++){
		viewports.push(new ViewPort(w*i, 0, w, canvas.height, canvas.width, canvas.height));
	}
	if(viewports.length == 0){
		add_class(document.getElementById('add_slice'), ' hidden');
		add_class(document.getElementById('add_selection'), ' hidden');
	}
	else{
		remove_class(document.getElementById('add_slice'), ' hidden');
		remove_class(document.getElementById('add_selection'), ' hidden');
	}

	projMatrix.setPerspective(35, canvas.width / canvas.height / viewport_count, 1, 500);
	gl.uniformMatrix4fv(u_ProjMatrix, false, projMatrix.elements);
}

document.getElementById('standard_layout').onmouseup = function(){
	if(sm_viewer.mode != 0){
		sm_viewer.set_mode(0);

		for(let i = 0; i < selections.length; i++)
			selections[i].refresh_sm();

		gl.scissor(0, 0, canvas.width, canvas.height);
		gl.viewport(0, 0, canvas.width, canvas.height);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);  

		replace_class(this, 'toggle_passive', 'toggle_active');
		replace_class(document.getElementById('tiled_layout'), 'toggle_active', 'toggle_passive');
	}
}

document.getElementById('tiled_layout').onmouseup = function(){
	if(sm_viewer.mode != 1){
		sm_viewer.set_mode(1);

		for(let i = 0; i < selections.length; i++)
			selections[i].refresh_sm();

		gl.scissor(0, 0, canvas.width, canvas.height);
		gl.viewport(0, 0, canvas.width, canvas.height);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);  

		replace_class(this, 'toggle_passive', 'toggle_active');
		replace_class(document.getElementById('standard_layout'), 'toggle_active', 'toggle_passive');
	}
}

//slicing
document.getElementById('add_slice').onmouseup = function(){
	if(viewports.length > 0){
		frozen = true;
		slice_interface.activate(viewports);
	}
}

//selecting
document.getElementById('add_selection').onmouseup = function(){
	if(viewports.length > 0){
		if(select_interface){
			remove_class(document.getElementById('select_dropdown'), ' hidden');
		}
	}
}

document.getElementById('sel_chain').onmouseup = function(){
	frozen = true;
	select_interface.activate(viewports, 0);
}

document.getElementById('sel_cross').onmouseup = function(){
	frozen = true;
	select_interface.activate(viewports, 1);
}

document.getElementById('select_button').onmousedown = function(){
	if(select_interface.click_ind == 2 || (select_interface.mode == 1 && select_interface.click_ind == 0)){
		add_class(this, ' apply_loading');
	}
}

document.getElementById('select_button').onmouseup = function(){
	switch(select_interface.click_ind){
		case 0:
			brush_vecs(select_interface.finish_step());
			if(select_interface.mode == 1){
				let inds = grain_surfaces.get_cross(timeline.timestep, select_vectors[0], 15, slices);
				selections.push(make_selection_item(inds, grain_surfaces.get_positions_t(inds), num_t, select_ind));
				select_ind++;
				select_vectors = [];
				select_interface.finish_all();
				remove_class(this,' apply_loading');
			}
			else{
				save_speed = timeline.play_speed;
				timeline.play_speed = 0;
				let icon = document.getElementById('mouse_icon')
				add_class(icon, ' rotate');
				remove_class(icon, ' pencil');
			}
			frozen = false;
			break;
		case 1:
			select_interface.start_step();
			frozen = true;
			timeline.play_speed = save_speed;
			let icon = document.getElementById('mouse_icon')
			remove_class(icon, ' rotate');
			add_class(icon, ' pencil');
			break;
		case 2:
			brush_vecs(select_interface.finish_all());
			let inds = grain_surfaces.get_chain(timeline.timestep, select_vectors, 15, slices);
			selections.push(make_selection_item(inds, grain_surfaces.get_positions_t(inds), num_t, select_ind));
			select_ind++;
			select_vectors = [];
			frozen = false;
			remove_class(this,' apply_loading');
			break;
	}
}

//color mapping
document.getElementById('add_cmap').onchange = function(){
	cmap_reader.readAsText(this.files[0]);
}

document.getElementById('edit_color_map').onmouseup = function(){
	grain_surfaces.color_map(color_mapper);

	for(let i = 0; i < selections.length; i++)
		selections[i].refresh_sm();

	add_class(this, ' hidden');
}

cmap_reader.onloadend = function(){
	color_mapper.change_data(this.result, num_g);

	grain_surfaces.color_map(color_mapper);

	for(let i = 0; i < selections.length; i++)
		selections[i].refresh_sm();
}


//global fields
document.getElementById('add_global').onchange = function(){
	global_reader.readAsText(this.files[0]);
}

global_reader.onloadend = function(){
	global_fields.add_field(this.result);
}








