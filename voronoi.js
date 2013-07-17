/***************
 Code adapted from:
 	alexbeutel.com/webgl/voronoi.html
 ***************/

 /**** NOTE: var name == private, this.name == public ****/

/**
 * Class representing a Point
 */
function Point() {
	var vertexColorsArray;
	var vertexColorsSize;
	var x, y;
}

/**
 * Class representing an RGBA Color with values [0, 255]
 */
function Color(r_, g_, b_, a_) {
	this.r = r_;
	this.g = g_;
	this.b = b_;
	this.a = a_;

	/**
	 * The String representation of a Color
	 */
	this.toString = function() {
		return this.r + "," + this.g + "," + this.b + "," + this.a;
	};

	/**
	 * Returns an array of the color values of this object
	 * normalized to be [0, 1]
	 */
	this.normalized = function() {
		var MAX_VALUE = 255;
		return [this.r / MAX_VALUE, this.g / MAX_VALUE, this.b / MAX_VALUE, this.a / MAX_VALUE];
	}
}

/**
 * Class that is responsible for creating
 * a voronoi diagram and manipulating it
 *
 * @param gl WebGL object
 * @param gl2d 2D canvas object
 * @param shaderProgram WebGL shader object
 */
function Voronoi(gl, gl2d, shaderProgram) {
	var _gl = gl;
	var _gl2d = gl2d;
	var _shaderProgram = shaderProgram;
	var self = this;		// Allows me to call public functions from private ones

	var _coneRadius = 1500;
	var _fragments = 50;

	var _coneVertexPositionBuffer;

	var _points = [];
	var _colorToPoints = {};

	var _maxPoints = 40;
	var _minPoints = 20;

	this.init = function() {
		this.initVertices();
		this.initPoints();
		//initTextureFrameBuffer();		// Is this needed????????
	};

	/**
	 * ????
	 */
	this.initVertices = function() {
		_coneVertexPositionBuffer = _gl.createBuffer();
		_gl.bindBuffer(_gl.ARRAY_BUFFER, _coneVertexPositionBuffer);

		var degInc = 360.0 / _fragments;
		var height = _coneRadius / Math.tan(45 * Math.PI / 180.0);
		var numPer = 3;		// RENAME THIS VARIABLE

		var vertices = [];

		var curDeg = 0;
		for (var i = 0; i < _fragments; ++i) {
			vertices = vertices.concat([0, 0, 0]);

			for (var j = 0; j < numPer - 1; ++j) {
				var x1 = _coneRadius * Math.cos((curDeg + j * degInc) * Math.PI / 180.0);
				var y1 = _coneRadius * Math.sin((curDeg + j * degInc) * Math.PI / 180.0);

				vertices = vertices.concat([x1, y1, -1.0 * height]);
			}
			curDeg += degInc;
		}
		_gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), _gl.STATIC_DRAW);

		_coneVertexPositionBuffer.itemSize = numPer;
		_coneVertexPositionBuffer.numItems = _fragments * numPer;
	};

	/**
	 * Experimenting creating random poins to initialize the voronoi diagram
	 */
	this.initPoints = function() {
		var num = Math.floor(Math.random() * (_maxPoints - _minPoints)) + _minPoints;
		var wid = $('2d-canvas').width;
		var hei = $('2d-canvas').height;

		// Color creation variables
		var MAX_VALUE 		= 255;
		var center 			= 128;
		var width 			= 127;
		var redFrequency 	= 1.666;	// These frequencies create a large variety of colors
		var greenFrequency 	= 2.666;
		var blueFrequency 	= 3.666;

		for (var i = 0; i < num; ++i) {
			var p = new Point();
			p.x = Math.floor(Math.random() * wid);
			p.y = Math.floor(Math.random() * hei);

			// Use sine waves to create highly varied colors such that there are no duplicates
			var r = Math.floor(Math.sin(redFrequency 	* i) * width + center);
			var g = Math.floor(Math.sin(greenFrequency 	* i) * width + center);
			var b = Math.floor(Math.sin(blueFrequency 	* i) * width + center);
			var c = new Color(r, g, b, MAX_VALUE);

			p.vertexColorsSize = _fragments * 3;
			p.vertexColorsArray = this.getColorArray(c, p.vertexColorsSize);
			_points = _points.concat(p);
			_colorToPoints[c.toString()] = p;
		}
	};

	/**
	 * Takes a color object and creates an array of the given size with
	 * the color values normalized
	 *
	 * This is so each vertex has the same color
	 */
	this.getColorArray = function(color, size) {
	 	var arr = [];
	 	for (var i = 0; i < size; ++i) {
	 		arr = arr.concat(color.normalized());
	 	}

	 	return arr;
	};

	/**
	 * Renders the voronoi diagram
	 */
	this.draw = function(point) {
		_gl2d.clearRect(0, 0, $('2d-canvas').width, $('2d-canvas').height);

		_gl.clearColor(0.0, 0.0, 0.0, 1.0);
		_gl.clearDepth(1.0);
		_gl.enable(_gl.DEPTH_TEST);
		_gl.depthMask(true);
		_gl.depthFunc(_gl.LEQUAL);

		// WebGL boilerplate code at the beginning of rendering
		gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		ortho(0, gl.viewportWidth, gl.viewportHeight, 0, -5, 5000);
		loadIdentity();

		for (var i = 0; i < _points.length; ++i) {
			this.drawCone(_points[i]);
		}

		// Draw the point parameter that may not be in the point list
		if (point) {
			this.drawCone(point);
		}

		_gl.depthMask(false);	
	};

	/**
	 * TODO
	 */
	this.drawCone = function(p) {
		if (p.x > ($('main-canvas').width + _coneRadius) || 
			p.x < (-1 * _coneRadius) ||
			p.y > ($('main-canvas').height + _coneRadius) ||
			p.y < (-1 * _coneRadius)) {
			// Cone will not influence anything and is just slow, don't plot it
			return;
		}

		loadIdentity();
		mvTranslate([p.x, p.y, 0.0]);

		_gl.bindBuffer(_gl.ARRAY_BUFFER, _coneVertexPositionBuffer);
		_gl.vertexAttribPointer(_shaderProgram.vertexPositionAttribute, 
								_coneVertexPositionBuffer.itemSize, _gl.FLOAT, false, 0, 0);

		_gl.bindBuffer(_gl.ARRAY_BUFFER, this.getColorBuffer(p.vertexColorsArray, p.vertexColorsSize));
		_gl.vertexAttribPointer(_shaderProgram.vertexColorAttribute, 4, _gl.FLOAT, false, 0, 0);

		setMatrixUniforms();
		_gl.drawArrays(_gl.TRIANGLES, 0, _coneVertexPositionBuffer.numItems);

		this.drawCircle2D(_gl2d, p.x, p.y, 2.5);

		_gl.disable(_gl.BLEND);
	};

	/**
	 * Draws a circle on the canvas at the given x,y position with the given radius
	 */
	this.drawCircle2D = function(ctx, x, y, radius) {
		ctx.beginPath();
		ctx.arc(x, y, radius, 0, Math.PI * 2, false);
		ctx.closePath();
		ctx.strokeStyle = "#000";
		ctx.stroke();
		ctx.fillStyle = "#000";
		ctx.fill();
	};

	/**
	 * TODO
	 */
	this.getColorBuffer = function(color, size) {
		var tempVertexColorBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, tempVertexColorBuffer);

		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(color), gl.STATIC_DRAW);
		tempVertexColorBuffer.itemSize = 4;
		tempVertexColorBuffer.numItems = size;

		return tempVertexColorBuffer;
	};

	/**
	 * TODO
	 */
	var _calculateCentroids = function() {
		var centroids = {};
		var regionTotals = {};

		// Initialize containers
		for (var color in _colorToPoints) {
			if (_colorToPoints.hasOwnProperty(color)) {
				var oldP = _colorToPoints[color];
				var p = new Point();
				p.x = 0;
				p.y = 0;
				p.vertexColorsArray = oldP.vertexColorsArray;
				p.vertexColorsSize = oldP.vertexColorsSize;
				centroids[color] = p;
				regionTotals[color] = 0;
			}
		}

		// Get the pixel colours to determine which region they belong to
		_gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);
		self.draw();
		var pixels = new Uint8Array(_gl.canvas.width * _gl.canvas.height * 4);
		_gl.readPixels(0, 0, _gl.canvas.width, _gl.canvas.height, _gl.RGBA, _gl.UNSIGNED_BYTE, pixels);
		_gl.bindFramebuffer(_gl.FRAMEBUFFER, null);

		for (var y = 0; y < _gl.canvas.height; ++y) {
			for (var x = 0; x < _gl.canvas.width; ++x) {
				// Figure out which voronoi region this pixel belongs to

				// inverse the y location of mouse, each increase in y covers width * 4 pixels
				var index = (y * _gl.canvas.width * 4) + (x * 4);//((gl.canvas.height - y) * gl.canvas.width * 4) + x * 4;
				var color = new Color();
				color.r = pixels[index];
				color.g = pixels[index + 1];
				color.b = pixels[index + 2];
				color.a = 255;
				color = color.toString();

				var pixelDensity = 1.0;
				centroids[color].x += x * pixelDensity;
				centroids[color].y += y * pixelDensity;
				regionTotals[color] += pixelDensity;	
			}
		}

		var centroidPoints = [];
		for (color in _colorToPoints) {
			if (regionTotals.hasOwnProperty(color) && centroids.hasOwnProperty(color)) {
				if (regionTotals[color] > 0) {
					centroids[color].x  = centroids[color].x / regionTotals[color];
					centroids[color].y  = centroids[color].y / regionTotals[color];
				}
				centroidPoints.push(centroids[color]);
			}
		}

		return centroidPoints;
	};

	/**
	 * TODO
	 */
	this.moveToCentroid = function() {
		_points = _calculateCentroids();
		this.draw();
	};
}

var frameBuffer;
var texture;

/**
 * TODO: Determine if this is needed???? Currently unused
 * Create a texture and framebuffer to render the voronoi diagram to
 * This will allow us to capture pixel colors that are outputted, to determine voronoi regions
 */
function initTextureFrameBuffer() {
	frameBuffer = gl.createFramebuffer();
	gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);
	frameBuffer.width = gl.canvas.width;	// texture needs to be power of 2?????!!
	frameBuffer.height = gl.canvas.height;

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