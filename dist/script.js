window.addEventListener("DOMContentLoaded",app);

function app() {
	var scene,
		camera,
		camControls,
		renderer,
		donut,
		donutControls,
		GUI,
		patternOptions = [
			"White",
			"Aero Busy",
			"Conic Gradient",
			"Fill Around",
			"Gradient In/Out",
			"Life Preserver",
			"Metro Busy",
			"Rainbow In/Out",
			"Rainbow Wheel",
			"Spokes"
		],
		W = window.innerWidth,
		H = window.innerHeight,
		degToRad = d => THREE.Math.degToRad(d);

	class Donut {
		constructor(args = {}) {
			this.x = args.x || 0;
			this.y = args.y || 0;
			this.z = args.z || 0;

			// configurable
			this.radius = args.radius || 0;
			this.tube = args.tube || 0;
			this.segmentCount = args.segments || 3;
			this.dotsPerSegment = args.dotsPerSegment || 0;
			this.speed = 1;
			this.pattern = args.pattern || "White";
			this.reverseSpin = false;

			this.segments = [];
			this.frame = 0;
			this.framesPerStep = 5;
			this.step = 0;
			this.maxSteps = 0;
			this.group = new THREE.Object3D();
			this.createSegments();

			this.group.position.set(this.x,this.y,this.z);
			this.group.rotation.x = degToRad(45);
			scene.add(this.group);
		}
		adjustDotsPerSegment(n) {
			this.dotsPerSegment = n;
			this.segments.forEach((e,i) => {
				// kill all
				let segmentGroup = e.segmentGroup;
				while (segmentGroup.children.length > 0) {
					let child = segmentGroup.children[0];
					child.geometry.dispose();
					child.geometry = null;
					child.material.dispose();
					child.material = null;

					segmentGroup.remove(child);
					e.dots.shift();
				}
				// create new ones
				e.createDots(this.dotsPerSegment);
			});
			this.updatePattern();
		}
		adjustRadius(r) {
			this.radius = r;
			this.segments.forEach((e,i) => {
				let angleInc = 360 / this.segments.length,
					rotate = angleInc * i,
					angle = degToRad(rotate);

				e.x = this.radius * Math.sin(angle);
				e.z = this.radius * Math.cos(angle);

				e.segmentGroup.position.x = e.x;
				e.segmentGroup.position.z = e.z;
			});
		}
		adjustSegments(n) {
			this.segmentCount = n;
			// kill dots in each segment
			this.segments.forEach((e,i) => {
				let segmentGroup = e.segmentGroup;
				while (segmentGroup.children.length > 0) {
					let child = segmentGroup.children[0];
					child.geometry.dispose();
					child.geometry = null;
					child.material.dispose();
					child.material = null;

					segmentGroup.remove(child);
					e.dots.shift();
				}
			});
			// then the segments themselves
			let group = this.group;
			while (group.children.length > 0) {
				group.remove(group.children[0]);
				this.segments.shift();
			}
			this.createSegments(this.segmentCount);
		}
		adjustTubeRadii(r) {
			this.tube = r;
			this.segments.forEach((e,i) => {
				e.radius = r;
				e.dots.forEach((f,j) => {
					let angleInc = 360 / e.dots.length,
						rotate = angleInc * j,
						angle = degToRad(rotate);

					f.x = e.radius * Math.sin(angle);
					f.z = e.radius * Math.cos(angle);

					f.mesh.position.x = f.x;
					f.mesh.position.z = f.z;
				});
			});
		}
		createSegments() {
			let n = this.segmentCount;
			for (let r = 0; r < n; ++r) {
				let angleInc = 360 / n,
					rotate = angleInc * r,
					angle = degToRad(rotate);

				this.segments.push(
					new Segment({
						x: this.radius * Math.sin(angle),
						z: this.radius * Math.cos(angle),
						radius: this.tube,
						rotationX: angle,
						dots: this.dotsPerSegment
					})
				);
			}
			for (let r of this.segments) {
				this.group.add(r.segmentGroup);
			}
			this.updatePattern();
		}
		incFrame() {
			++this.frame;
			if (this.frame == this.framesPerStep) {
				this.frame = 0;
				++this.step;

				if (this.step >= this.maxSteps)
					this.step = 0;

				this.updatePattern();
			}
		}
		rotateTube() {
			this.segments.forEach((e,i) => {
				let speedInRad = degToRad(this.speed);
				if (donut.reverseSpin) {
					e.rotationY += speedInRad;
					if (e.rotationY >= 360) {
						e.rotationY = 0;
					}
				} else {
					e.rotationY -= speedInRad;
					if (e.rotationY < 0) {
						e.rotationY = 359;
					}
				}
				e.segmentGroup.rotation.y = e.rotationY;
			});
		}
		updatePattern(p = this.pattern) {
			if (p != this.pattern) {
				this.pattern = p;
				this.frame = 0;
				this.step = 0;
			}

			// define max steps for each pattern
			if (
				this.pattern == patternOptions[1] || 
				this.pattern == patternOptions[2] || 
				this.pattern == patternOptions[6] || 
				this.pattern == patternOptions[8]
			)
				this.maxSteps = this.segmentCount;
			else if (this.pattern == patternOptions[3])
				this.maxSteps = this.segmentCount * 2;
			else if (this.pattern == patternOptions[9])
				this.maxSteps = 4;
			else
				this.maxSteps = 0;

			// paint the dots
			this.segments.forEach((e,i) => {
				e.segmentGroup.children.forEach((f,j) => {
					let hue = 0,
						saturation = 0,
						lightness = 0;

					switch (this.pattern) {
						// Aero Busy
						case patternOptions[1]:
							let aeroStep = this.maxSteps - this.step,
								whiteStart = aeroStep + Math.round(this.maxSteps / 24),
								whiteEnd = aeroStep + Math.round(this.maxSteps / 24) * 3,
								lightTealStart = aeroStep,
								lightTealEnd = aeroStep + Math.round(this.maxSteps / 4);

							if ((i >= whiteStart && i < whiteEnd) || (i < whiteEnd - this.maxSteps)) {
								lightness = 0.945;

							} else if ((i >= lightTealStart && i < lightTealEnd) || (i < lightTealEnd - this.maxSteps)) {
								hue = 174 / 360;
								saturation = 0.787;
								lightness = 0.559;

							} else {
								hue = 177 / 360;
								saturation = 0.347;
								lightness = 0.396;
							}
							break;
						// Conic Gradient
						case patternOptions[2]:
							lightness = 0.945 * ((i + (this.maxSteps - this.step)) % this.maxSteps / this.maxSteps);
							break;
						// Fill Around
						case patternOptions[3]:
							hue = 0;
							saturation = 0;
							if (
								(i < this.step && this.step <= this.segmentCount) || 
								(i >= this.step - this.segmentCount && this.step > this.segmentCount)
							) {
								lightness = 0.945;
							}
							break;
						// Gradient In/Out
						case patternOptions[4]:
							lightness = 0.945 * ((j + 1) / this.dotsPerSegment);
							break;
						// Life Preserver
						case patternOptions[5]:
							let segments1_4 = Math.ceil(this.segmentCount / 4),
								fourthMark = i % segments1_4,
								offset = Math.round(this.segmentCount / 10),
								around1_4 = fourthMark < offset;

							hue = 0;
							saturation = around1_4 ? 1 : 0;
							lightness = around1_4 ? 0.5 : 0.945;
							break;
						// Metro Busy
						case patternOptions[6]:
							let metroStep = this.maxSteps - this.step,
								lightBlueStart = metroStep,
								lightBlueEnd = metroStep + Math.round(this.maxSteps / 5);

							if ((i >= lightBlueStart && i < lightBlueEnd) || (i < lightBlueEnd - this.maxSteps)) {
								hue = 195 / 360;
								saturation = 1;
								lightness = 0.606;

							} else {
								hue = 209 / 360;
								saturation = 0.891;
								lightness = 0.569;
							}
							break;
						// Rainbow In/Out
						case patternOptions[7]:
							hue = j / this.dotsPerSegment;
							saturation = 1;
							lightness = 0.5;
							break;
						// Rainbow Wheel
						case patternOptions[8]:
							hue = (i + this.step) / this.maxSteps;
							saturation = 1;
							lightness = 0.5;
							break;
						// Spokes
						case patternOptions[9]:
							lightness = (i + this.step) % 4 == 0 ? 0.75 : 0;
							break;
						// White
						default:
							lightness = 0.945;
							break;
					}
					f.material.color.setHSL(hue,saturation,lightness);
				});
			});
		}
	}
	class Segment {
		constructor(args = {}) {
			this.x = args.x || 0;
			this.y = args.y || 0;
			this.z = args.z || 0;
			this.radius = args.radius || 0;
			this.rotationX = args.rotationX || 0;
			this.rotationY = args.rotationY || 0;

			this.dots = [];
			this.segmentGroup = new THREE.Object3D();
			this.createDots(args.dots || 0);

			this.segmentGroup.position.set(this.x,this.y,this.z);
			this.segmentGroup.rotation.order = "ZXY";
			this.segmentGroup.rotation.set(this.rotationX,0,degToRad(90));
		}
		createDots(n) {
			for (let d = 0; d < n; ++d) {
				let angleInc = 360 / n,
					rotate = angleInc * d,
					angle = degToRad(rotate);

				this.dots.push(
					new Dot({
						x: this.radius * Math.sin(angle),
						z: this.radius * Math.cos(angle)
					})
				);
			}
			for (let d of this.dots) {
				this.segmentGroup.add(d.mesh);
			}
		}
	}
	class Dot {
		constructor(args = {}) {
			this.x = args.x || 0;
			this.y = args.y || 0;
			this.z = args.z || 0;

			this.geo = new THREE.SphereBufferGeometry(3,12,12);
			this.mat = new THREE.MeshBasicMaterial({
				color: 0x000000
			});
			this.mesh = new THREE.Mesh(this.geo,this.mat);
			this.mesh.position.set(this.x,this.y,this.z);
		}
	}
	
	var init = () => {
			// setup
			scene = new THREE.Scene();
			camera = new THREE.OrthographicCamera(-W/2,W/2,H/2,H/-2,-1000,1000);

			camera.position.set(30,30,30);
			camera.lookAt(scene.position);

			renderer = new THREE.WebGLRenderer({
				antialias: true
			});
			renderer.setClearColor(new THREE.Color(0x171717));
			renderer.setSize(W,H);

			camControls = new THREE.OrbitControls(camera,renderer.domElement);
			
			// donut
			donut = new Donut({
				radius: 150,
				tube: 60,
				segments: 40,
				dotsPerSegment: 6
			});

			// control donut appearance
			donutControls = {
				dotsPerSegment: donut.dotsPerSegment,
				pattern: donut.pattern,
				radius: donut.radius,
				reverseSpin: donut.reverseSpin,
				segments: donut.segmentCount,
				speed: donut.speed,
				tube: donut.tube,
				resetCam: function() {
					camControls.reset();
				}
			};
			GUI = new dat.GUI({
				width: 280
			});
			GUI.add(donutControls,"dotsPerSegment",3,12,1).name("Dots per Segment").onChange(e => {
				donut.adjustDotsPerSegment(donutControls.dotsPerSegment);
			});
			GUI.add(donutControls,"pattern",patternOptions).name("Pattern").onChange(e => {
				donut.updatePattern(donutControls.pattern);
			});
			GUI.add(donutControls,"radius",1,200,1).name("Radius").onChange(e => {
				donut.adjustRadius(donutControls.radius);
			});
			GUI.add(donutControls,"reverseSpin").name("Reverse Spin").onChange(e => {
				donut.reverseSpin = !donut.reverseSpin;
			});
			GUI.add(donutControls,"segments",3,48,1).name("Segments").onChange(e => {
				donut.adjustSegments(donutControls.segments);
			});
			GUI.add(donutControls,"speed",0,4,0.1).name("Speed").onChange(e => {
				donut.speed = donutControls.speed;
			});
			GUI.add(donutControls,"tube",1,200,1).name("Tube").onChange(e => {
				donut.adjustTubeRadii(donutControls.tube);
			});
			GUI.add(donutControls,"resetCam").name("Reset Camera");
			
			// render
			document.body.appendChild(renderer.domElement);
		},
		update = () => {
			donut.rotateTube();
			donut.incFrame();

			renderer.render(scene,camera);
			requestAnimationFrame(update);
		},
		adjustScreen = () => {
			W = window.innerWidth;
			H = window.innerHeight;

			camera.left = -W/2;
			camera.right = W/2;
			camera.top = H/2;
			camera.bottom = H/-2;

			camera.aspect = W / H;
			camera.updateProjectionMatrix();
			renderer.setSize(W,H);
		};
	init();
	update();
	window.addEventListener("resize",adjustScreen);
}