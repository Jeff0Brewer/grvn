class PlaneFilter{
  constructor(plane, sign){
    this.plane = plane;
    this.sign = sign;

    this.dist_div = Math.sqrt(Math.pow(this.plane[0],2) + Math.pow(this.plane[1],2) + Math.pow(this.plane[2],2));
  }

  check(point){
  	return this.sign == Math.sign((this.plane[0]*point[0] + this.plane[1]*point[1] + this.plane[2]*point[2] + this.plane[3]) / this.dist_div);
  }
}