/***************
 Code taken from:
 	alexbeutel.com/webgl/voronoi.html
 ***************/
var coneRadius = 1500;
var fragments = 50;
var cone_angle = 45;

var points = [];

var coneVertexPositionBuffer;

/**
 * Class representing a Point
 */
function Point() {
	var colorArray;
	var colorSize;
	var x, y;
}

/**
 * ????
 */
function initVertices() {
	coneVertexPositionBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, coneVertexPositionBuffer);

	var degInc = 360.0 / fragments;
	var height = coneRadius / Math.tan(45 * Math.PI / 180.0);
	var numPer = 3;		// RENAME THIS VARIABLE

	var vertices = [];

	var curDeg = 0;
	for (var i = 0; i < fragments; ++i) {
		vertices = vertices.concat([0, 0, 0]);

		for (var j = 0; j < numPer - 1; ++j) {
			var x1 = coneRadius * Math.cos((curDeg + j * degInc) * Math.PI / 180.0);
			var y1 = coneRadius * Math.sin((curDeg + j * degInc) * Math.PI / 180.0);

			vertices = vertices.concat([x1, y1, -1.0 * height]);
		}
		curDeg += degInc;
	}
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

	coneVertexPositionBuffer.itemSize = numPer;
	coneVertexPositionBuffer.numItems = fragments * numPer;
}

var maxPoints = 40;
var minPoints = 20;
/**
 * Experimenting creating random poins to initialize the voronoi diagram
 */
function initPoints() {
	var num = Math.floor(Math.random() * (maxPoints - minPoints)) + minPoints;
	var wid = $('2d-canvas').width;
	var hei = $('2d-canvas').height;
	for (var i = 0; i < num; ++i) {
		var c = new Point();
		c.x = Math.floor(Math.random() * wid);
		c.y = Math.floor(Math.random() * hei);
		c.colorArray = randColor(fragments * 3);
		c.colorSize = fragments * 3;
		points = points.concat(c);
	}
}

/**
 * Returns an array of random colors, as many as 'size'
 */
 function randColor(size) {
 	var i1 = Math.random();
 	var i2 = Math.random();
 	var i3 = Math.random();

 	var color = [];
 	for (var i = 0; i < size; ++i) {
 		color = color.concat([i1, i2, i3, 1.0]);
 	}

 	return color;
 }

/**
 * TODO
 */
function getColorBuffer(color, size) {
	var tempVertexColorBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, tempVertexColorBuffer);

	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(color), gl.STATIC_DRAW);
	tempVertexColorBuffer.itemSize = 4;
	tempVertexColorBuffer.numItems = size;

	return tempVertexColorBuffer;
}

/**
 * Convenience function to get the cursors position
 */
function getCursorPosition(e) {
	var x, y;
	if (e.pageX || e.pageY) {
		x = e.pageX;
		y = e.pageY;
	}
	else {
		x = e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
		y = e.clientY + document.body.scrollTop + document.documentElement.scrollTop;
	}
	x -= document.getElementById("main-canvas").offsetLeft;
	y -= document.getElementById("main-canvas").offsetTop;

	return [x, y];
}

// Mouse handlers
var mouseIsDown = false;
var curColor = null;
var mousePosition = null;
/**
 * Event handler when the mouse is pressed own
 */
function startDown(e) {
	mouseIsDown = true;

	//
	mousePosition = getCursorPosition(e);
	return;
	//

	curColor = randColor(fragments * 3);
	canvasMouseMove(e);
}

/**
 * Event handler when the mouse is moved over the canvas
 */
function canvasMouseMove(e) {
	if (!mouseIsDown) return;		// Do nothing if not pressing down on mouse

	// Temporarily add a point where the mouse currently is pressed
	mousePosition = getCursorPosition(e);

	//
	return;
	//

	var c = new Point();
	c.x = mousePosition[0];
	c.y = mousePosition[1];
	c.colorArray = curColor;
	c.colorSize = fragments * 3;

	// Draw the diagram plus currently pressed point, which hasn't been added yet
	redraw(c);
}

/**
 * Event handler when a mouse click occurs
 * Adds a new point to the voronoi diagram
 */
function canvasClick(e) {
	mouseIsDown = false;

	//
	return;

	var p = getCursorPosition(e);
	addCone(p[0], p[1], curColor);
	curColor = null;
	redraw();
}

/**
 * TODO
 */
function addCone(cx, cy, cb) {
	var c = new Point();
	if (!cb) cb = randColor(fragments * 3);
	c.x = cx;
	c.y = cy;
	c.colorArray = cb;
	c.colorSize = fragments * 3;
	points = points.concat(c);
	return c;
}

/**
 * Sets up everything at startup
 */
function pageStart() {
	var canvas = document.getElementById("main-canvas");
	canvas.addEventListener("mousedown", startDown, false);
	canvas.addEventListener("mousemove", canvasMouseMove, false);
	canvas.addEventListener("mouseup", canvasClick, false);
	initGL(canvas);

	canvas = document.getElementById("2d-canvas");
	canvas.addEventListener("mousedown", startDown, false);
	canvas.addEventListener("mousemove", canvasMouseMove, false);
	canvas.addEventListener("mouseup", canvasClick, false);
	canvas.style.zIndex = "100";
	gl2d = canvas.getContext("2d");

	initShaders();
	initVertices();
	initPoints();

	redraw();
	tick();
}

/**
 * This function is called every animation frame
 */
function tick() {
	requestAnimFrame(tick);

	// TODO: Use this if necessary
	if (mouseIsDown) {
		//gl.readPixels(mousePosition[0], mousePosition[1], 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, buf);
		gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);
		redraw();
		var buf = new Uint8Array(gl.canvas.width * gl.canvas.height * 4);
		gl.readPixels(0, 0, gl.canvas.width, gl.canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, buf);
		// inverse the y location of mouse, each increase in y covers width * 4 pixels
		var index = ((gl.canvas.height - mousePosition[1]) * gl.canvas.width * 4) + mousePosition[0] * 4;
		var r = buf[index];
		var g = buf[index + 1];
		var b = buf[index + 2];
		$("test").style.backgroundColor="rgba(" + [r, g, b, 1] + ")";
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	}
}

/**
 * Convenience function to get access an HTML element
 */
function $(id) { return document.getElementById(id); }

/**
 * WebGL boilerplate code at the beginning of rendering
 */
function startScene() {
	gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	ortho(0, gl.viewportWidth, gl.viewportHeight, 0, -5, 5000);
	loadIdentity();
}

/**
 * Renders the voronoi diagram
 */
function redraw(point) {
	gl2d.clearRect(0, 0, $('2d-canvas').width, $('2d-canvas').height);

	gl.clearColor(0.0, 0.0, 0.0, 1.0);
	gl.clearDepth(1.0);
	gl.enable(gl.DEPTH_TEST);
	gl.depthMask(true);
	gl.depthFunc(gl.LEQUAL);

	startScene();

	for (var i = 0; i < points.length; ++i) {
		drawCone(points[i]);
	}

	// Draw the point parameter that may not be in the point list
	if (point) {
		drawCone(point);
	}

	gl.depthMask(false);	
}

/**
 * TODO
 */
function drawCone(p) {
	if (p.x > ($('main-canvas').width + coneRadius) || 
		p.x < (-1 * coneRadius) ||
		p.y > ($('main-canvas').height + coneRadius) ||
		p.y < (-1 * coneRadius)) {
		// Cone will not influence anything and is just slow, don't plot it
		return;
	}

	loadIdentity();
	mvTranslate([p.x, p.y, 0.0]);

	gl.bindBuffer(gl.ARRAY_BUFFER, coneVertexPositionBuffer);
	gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, coneVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);

	gl.bindBuffer(gl.ARRAY_BUFFER, getColorBuffer(p.colorArray, p.colorSize));
	gl.vertexAttribPointer(shaderProgram.vertexColorAttribute, 4, gl.FLOAT, false, 0, 0);

	setMatrixUniforms();
	gl.drawArrays(gl.TRIANGLES, 0, coneVertexPositionBuffer.numItems);

	drawCircle2D(gl2d, p.x, p.y, 2.5);

	gl.disable(gl.BLEND);
}

/**
 * Draws a circle on the canvas at the given x,y position with the given radius
 */
function drawCircle2D(ctx, x, y, radius) {
	ctx.beginPath();
	ctx.arc(x, y, radius, 0, Math.PI * 2, false);
	ctx.closePath();
	ctx.strokeStyle = "#000";
	ctx.stroke();
	ctx.fillStyle = "#000";
	ctx.fill();
}

var frameBuffer;
var texture;

/**
 * Create a texture and framebuffer to render the voronoi diagram to
 * This will allow us to capture pixel colors that are outputted, to determine voronoi regions
 */
function initTextureFrameBuffer() {
	frameBuffer = gl.createFramebuffer();
	gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);
	frameBuffer.width = canvas.width;	// texture needs to be power of 2?????!!
	frameBuffer.height = canvas.height;

	texture = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
	gl.generateMipmap(gl.TEXTURE_2D);

	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, frameBuffer.width, frameBuffer.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

	var renderbuffer = gl.createRenderbuffer();
	gl.bindRenderbuffer(gl.RENDERBUFFER, renderbuffer);
	gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, frameBuffer.width, frameBuffer.height);

	gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);	// space for rendering colours is our texture
	gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, renderbuffer);		// depth information should use our depth buffer

	gl.bindTexture(gl.TEXTURE_2D, null);
	gl.bindRenderbuffer(gl.RENDERBUFFER, null);
	gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}