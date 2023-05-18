class FSCamera{
	constructor(rot_speed, zoom_speed){
		this.dragging = false;
		this.mouse = {
			x: 0,
			y: 0,
		};
		this.rotation = {
			x: 0,
			y: 0,
			z: 0,
		};
		this.camera = {
			x: 0,
			y: 100,
			z: 50,
			speed: {
				rotation: rot_speed,
				zoom: zoom_speed,
			},
		};
		this.focus = {
			x: 0,
			y: 0,
			z: 20,
		};
	}

	mousedown(e){
		this.dragging = true;
		this.mouse.x = e.clientX;
		this.mouse.y = e.clientY;
	}

	mousemove(e){
		if(this.dragging){
			let dx = this.camera.speed.rotation * (e.clientX - this.mouse.x);
			let dy = this.camera.speed.rotation * (e.clientY - this.mouse.y);

			this.rotation.x = this.rotation.x - dy;
			this.rotation.z = this.rotation.z + dx;

			this.mouse.x = e.clientX;
			this.mouse.y = e.clientY;
		}
	}

	mouseup(e){
		this.dragging = false;
	}

	wheel(e){
		let camvec = [this.camera.x - this.focus.x, this.camera.y - this.focus.y, this.camera.z - this.focus.z];
		let resized = resize(camvec, e.deltaY*this.camera.speed.zoom);
		if(Math.sign(resized[0]) == Math.sign(camvec[0]) && Math.sign(resized[1]) == Math.sign(camvec[1]) && Math.sign(resized[2]) == Math.sign(camvec[2])){
			this.camera.x = this.focus.x + resized[0];
			this.camera.y = this.focus.y + resized[1];
			this.camera.z = this.focus.z + resized[2];
		}
	}
}
