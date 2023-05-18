class ColorMap{
	constructor(css_def){
		this.steps = [];
		this.colors = [];

		let curr_ind = 0;
		while(true){
			let a = css_def.indexOf('#', curr_ind);
			let b = css_def.indexOf(' ', curr_ind);
			let c = css_def.indexOf('%', curr_ind);
			curr_ind = c + 3;
			if(a < 0 || b < 0 || c < 0)
				break;
			this.colors.push(hex_to_rgb(css_def.substring(a, b)));
			this.steps.push(parseFloat(css_def.substring(b + 1, c))/100);
		}
	}

	map(value, low, high){
		if(value <= low){
			return this.colors[0];
		}
		if(value >= high){
			return this.colors[this.colors.length - 1];
		}

		let percentage = (value - low)/(high - low);
		let i = 0;
		while(this.steps[i] < percentage)
			i++;
		if(i + 1 == this.steps.length)
			return this.colors[i];
		if(this.steps[i] == this.steps[i + 1])
			i++
		let mid = (percentage - this.steps[i])/(this.steps[i + 1] - this.steps[i]);
		return {
			r: this.colors[i].r*(1 - mid) + this.colors[i + 1].r*mid,
			g: this.colors[i].g*(1 - mid) + this.colors[i + 1].g*mid,
			b: this.colors[i].b*(1 - mid) + this.colors[i + 1].b*mid,
		};
	}
}