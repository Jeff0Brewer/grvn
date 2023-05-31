class SliceItem{
	constructor(source, dest, insert, ind, planefilters, interface_out){
		this.planefilters = planefilters;
		this.ind = ind;
		this.removed = false;

		let cloned = source.cloneNode(true);
		dest.insertBefore(cloned, insert);

		this.elements = {
			body: cloned,
			canvas: cloned.childNodes[1],
			ind: cloned.childNodes[3],
			delete: cloned.childNodes[5],
		}

		this.elements.canvas.width = 20*window.devicePixelRatio;
		this.elements.canvas.height = 20*window.devicePixelRatio;
		let ctx = this.elements.canvas.getContext('2d');
		ctx.lineWidth = 1;
		ctx.strokeStyle = 'rgb(189,189,189)';

		let vp = interface_out[1];
		let points = interface_out[0];
		let scale = max(vp.width, vp.height);
		let x_margin = map(scale - vp.width, 0, scale, 0, this.elements.canvas.width);
		let y_margin = map(scale - vp.height, 0, scale, 0, this.elements.canvas.height);

		for(let i = 0; i < points.length; i++){
			for(let j = 0; j < 2; j++){
				points[i][j][0] = map(points[i][j][0] - vp.x, 0, scale, x_margin, this.elements.canvas.width - x_margin);
				points[i][j][1] = map(points[i][j][1] - vp.y, 0, scale, this.elements.canvas.height - y_margin, y_margin);
			}
			let slope = (points[i][1][1] - points[i][0][1])/(points[i][1][0] - points[i][0][0]);
			let p0 = [points[i][0][0] + this.elements.canvas.width, points[i][0][1] + slope*this.elements.canvas.width];
			let p1 = [points[i][0][0] - this.elements.canvas.width, points[i][0][1] - slope*this.elements.canvas.width];

			ctx.beginPath();
			ctx.moveTo(p0[0], p0[1]);
			ctx.lineTo(p1[0], p1[1]);
			ctx.stroke();
		}

		this.elements.ind.innerHTML += ind.toString();
	}

	hover_on(){
		this.elements.delete.className = this.elements.delete.className.replace(' hidden', '');
	}

	hover_off(){
		this.elements.delete.className = this.elements.delete.className + ' hidden';
	}

	delete(){
		this.elements.body.remove();
		this.removed = true;
	}
}

function make_slice_item(ind, planefilters, interface_out){
	let si_insert = document.getElementById('slice_proto');
	let si_source = si_insert.childNodes[1];
	let si_dest = document.getElementById('slice_list');

	let si = new SliceItem(si_source, si_dest, si_insert, ind, planefilters, interface_out);

	si.elements.body.onmouseenter = function(){
		si.hover_on();
	}

	si.elements.body.onmouseleave = function(){
		si.hover_off();
	}

	si.elements.delete.onmouseup = function(){
		si.delete();
	}

	return si;
}





