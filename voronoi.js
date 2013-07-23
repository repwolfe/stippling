/***************
 Voronoi diagram Code adapted from:	alexbeutel.com/webgl/voronoi.html
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
	var _gl 	= gl;
	var _gl2d 	= gl2d;
	var _shaderProgram = shaderProgram;
	var self = this;				// Makes it possible to call public functions from private ones

	var _coneRadius = 1500;			// How large each cone should be
	var _fragments = 50;			// Determines how smooth the rendered cones are
	var _verticesPerFragment = 3;	// Each fragment is a triangle
	var _stippleSize = 2.5;
	var _stippleColor = "#000";		// Black initially

	var _coneVertexPositionBuffer;

	var _points;
	var _colorToPoints;

	var _displayVor;

	var _makingCentroidal;

	var _theImageData;

	/**
	 * @private
	 * Initializes the cone vertex position buffer with all the vertices
	 *
	 * Each cone is made of triangles, the number of which is the value of _fragments
	 * The point of the cone is away from the screen, such that we are facing the bottom of the cone
	 */
	var _initVertices = function() {
		_coneVertexPositionBuffer = _gl.createBuffer();
		_gl.bindBuffer(_gl.ARRAY_BUFFER, _coneVertexPositionBuffer);

		var degInc = 360.0 / _fragments;
		var height = _coneRadius / Math.tan(45 * Math.PI / 180.0);
		var itemSize = 3;	// Dimension of each vertex

		var vertices = [];

		var curDeg = 0;
		for (var i = 0; i < _fragments; ++i) {
			vertices = vertices.concat([0, 0, 0]);

			for (var j = 0; j < _verticesPerFragment - 1; ++j) {
				var x1 = _coneRadius * Math.cos((curDeg + j * degInc) * Math.PI / 180.0);
				var y1 = _coneRadius * Math.sin((curDeg + j * degInc) * Math.PI / 180.0);

				vertices = vertices.concat([x1, y1, -1.0 * height]);
			}
			curDeg += degInc;
		}
		_gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), _gl.STATIC_DRAW);

		_coneVertexPositionBuffer.itemSize = itemSize;
		_coneVertexPositionBuffer.numItems = _fragments * itemSize;

		_gl.bindBuffer(gl.ARRAY_BUFFER, null);
	};

	// Call this once the object is created
	_initVertices();

	/**
	 * Starts the application
	 * @param numPoints how many generating/stipple points to use
	 * @param stippleSize the size of the stipple points
	 * @param displayVor boolean if the voronoi diagram should be displayed or not
	 */
	this.start = function(numPoints, stippleSize, displayVor) {
		this.resetPoints(numPoints);
		_stippleSize = stippleSize;
		_displayVor = displayVor;		
		_makingCentroidal = true;
		this.draw();
	};

	this.setStippleSize = function(value) {
		_stippleSize = value;
	};

	this.setStippleColor = function(value) {
		_stippleColor = value;
	};

	this.setDisplayVor = function(value) {
		_displayVor = value;
	};

	this.isMakingCentroidal = function() {
		return _makingCentroidal;
	};

	this.stop = function() {
		_makingCentroidal = false;
	};


	/**
	 * Experimenting creating random poins to initialize the voronoi diagram
	 * @param numPoints how many points to create
	 */
	this.resetPoints = function(numPoints) {
		var wid = $('2d-canvas').width;
		var hei = $('2d-canvas').height;

		// Color creation variables
		var MAX_VALUE 		= 255;
		var center 			= 128;
		var width 			= 127;
		var redFrequency 	= 1.666;	// These frequencies create a large variety of colors
		var greenFrequency 	= 2.666;
		var blueFrequency 	= 3.666;

		_points = [];
		_colorToPoints = {};

		for (var i = 0; i < numPoints; ++i) {
			var p = new Point();
			p.x = Math.floor(Math.random() * wid);
			p.y = Math.floor(Math.random() * hei);

			// Use sine waves to create highly varied colors such that there are no duplicates
			var r = Math.floor(Math.sin(redFrequency 	* i) * width + center);
			var g = Math.floor(Math.sin(greenFrequency 	* i) * width + center);
			var b = Math.floor(Math.sin(blueFrequency 	* i) * width + center);
			var c = new Color(r, g, b, MAX_VALUE);

			p.vertexColorsSize = _fragments * _verticesPerFragment;
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
	 *
	 * Draws a bunch of cones, such that the point of each cone is located at each
	 * generating point. The cones overlap, displaying the correct voronoi diagram
	 */
	this.draw = function(force) {
		if (typeof _points == 'undefined') {
			return;
		}

		_gl2d.clearRect(0, 0, $('2d-canvas').width, $('2d-canvas').height);
		
		for (var i = 0; i < _points.length; ++i) {
			// Draw the generating point on top of WebGL's rendering
			this.drawCircle2D(_gl2d, _points[i].x, _points[i].y, _stippleSize);
		}

		if (force || _displayVor) {
			_gl.enable(_gl.DEPTH_TEST);
			_gl.depthMask(true);
			_gl.depthFunc(_gl.LEQUAL);

			_gl.clearColor(0.0, 0.0, 0.0, 1.0);
			// WebGL boilerplate code at the beginning of rendering
			_gl.viewport(0, 0, _gl.canvas.width, _gl.canvas.height);
			_gl.clear(_gl.COLOR_BUFFER_BIT | _gl.DEPTH_BUFFER_BIT);
			ortho(0, _gl.canvas.width, _gl.canvas.height, 0, -5, 5000);
			loadIdentity();

			for (var i = 0; i < _points.length; ++i) {
				this.drawCone(_points[i]);
			}

			_gl.depthMask(false);
		}
		else {
			// Don't display the Voronoi, just white
			_gl.clearColor(1.0, 1.0, 1.0, 1.0);
			_gl.clear(_gl.COLOR_BUFFER_BIT | _gl.DEPTH_BUFFER_BIT);
		}
	};

	/**
	 * Draws a cone whose point is located at the given location
	 *
	 * @param p location of cone's point (and center)
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
		mvTranslate([p.x, p.y, 0.0]);		// Move origin to point's location

		// Bind the vertex locations buffer
		_gl.bindBuffer(_gl.ARRAY_BUFFER, _coneVertexPositionBuffer);
		_gl.vertexAttribPointer(_shaderProgram.vertexPositionAttribute, 
								_coneVertexPositionBuffer.itemSize, _gl.FLOAT, false, 0, 0);

		// Bind the vertex colours buffer
		_gl.bindBuffer(_gl.ARRAY_BUFFER, this.getColorBuffer(p.vertexColorsArray));
		_gl.vertexAttribPointer(_shaderProgram.vertexColorAttribute, 4, _gl.FLOAT, false, 0, 0);

		setMatrixUniforms();
		// Draw the cone as a bunch of triangles
		_gl.drawArrays(_gl.TRIANGLES, 0, _coneVertexPositionBuffer.numItems);

		_gl.bindBuffer(gl.ARRAY_BUFFER, null);
	};

	/**
	 * Draws a circle on the canvas at the given x,y position with the given radius
	 */
	this.drawCircle2D = function(ctx, x, y, radius) {
		ctx.beginPath();
		ctx.arc(x, y, radius, 0, Math.PI * 2, false);
		ctx.closePath();
		ctx.strokeStyle = _stippleColor;
		ctx.stroke();
		ctx.fillStyle = _stippleColor;
		ctx.fill();
	};

	/**
	 * Creates a temporary WebGL buffer which contains the colours for vertices
	 */
	this.getColorBuffer = function(colors) {
		var tempVertexColorBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, tempVertexColorBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
		gl.bindBuffer(gl.ARRAY_BUFFER, null);

		return tempVertexColorBuffer;
	};

	/**
	 * @private
	 * Implementation of Lloyd's algorithm.
	 * Given a bunch of generating points and their created voronoi diagram,
	 * iteratively moves the poinst to the centroids of their respective regions.
	 *
	 * The algorithm is as follows:
	 * while generating points not converged to centroids, do:
	 * 		Compute voronoi diagram
	 *		Compute centroids
	 *		Move each generating point to its centroid
	 *
	 * Given an image, the stipple density can be modified where regions are darkest
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
		self.draw(true);		// Have to draw again to sample current pixel values
		var pixels = new Uint8Array(_gl.canvas.width * _gl.canvas.height * 4);
		_gl.readPixels(0, 0, _gl.canvas.width, _gl.canvas.height, _gl.RGBA, _gl.UNSIGNED_BYTE, pixels);

		for (var y = 0; y < _gl.canvas.height; ++y) {
			for (var x = 0; x < _gl.canvas.width; ++x) {
				// Figure out which voronoi region this pixel belongs to
				var index = (y * _gl.canvas.width * 4) + (x * 4);		// there's 4 values for each pixel
				var color = new Color();
				color.r = pixels[index];
				color.g = pixels[index + 1];
				color.b = pixels[index + 2];
				color.a = 255;
				color = color.toString();

				var newY = (gl.canvas.height - 1 - y); // Inverse the y axis since its given upside down
				var pixelDensity = _density(x, newY);
				centroids[color].x += x * pixelDensity;
				centroids[color].y +=  newY * pixelDensity;
				regionTotals[color] += pixelDensity;	
			}
		}

		var centroidPoints = [];
		var maximumDistanceMoved = 0;
		var notMovingAnymore = 0.80;		// Value of the maximum distance moved which is considered "not moving" anymore
		for (color in _colorToPoints) {
			var newPoint;
			if (_colorToPoints.hasOwnProperty(color) &&
				regionTotals.hasOwnProperty(color) && 
				centroids.hasOwnProperty(color)) {
				newPoint = centroids[color];
				if (regionTotals[color] > 0) {
					newPoint.x  = newPoint.x / regionTotals[color];
					newPoint.y  = newPoint.y / regionTotals[color];
				}
				centroidPoints.push(newPoint);

				var oldPoint = _colorToPoints[color];

				var distanceMoved = Math.sqrt(Math.pow(oldPoint.x - newPoint.x, 2) + Math.pow(oldPoint.y - newPoint.y, 2));

				if (distanceMoved >= maximumDistanceMoved) {
					maximumDistanceMoved = distanceMoved;
				}

				_colorToPoints[color] = newPoint;
			}
		}

		if (maximumDistanceMoved <= notMovingAnymore) {
			// Stop making it centroidal, it's basically there
			_makingCentroidal = false;
		}

		return centroidPoints;
	};

	/**
	 * Gets the centroids at this point and draws the new voronoi diagram
	 */
	this.moveToCentroid = function() {
		_points = _calculateCentroids();
		this.draw();
	};

	/**
	 * Save the pixel data of the image
	 */
	this.setImage = function(img) {
		var canvas = document.createElement('canvas');
		canvas.width = img.width;
		canvas.height = img.height;
		var context = canvas.getContext('2d');
		context.drawImage(img, 0, 0 );
		_theImageData = context.getImageData(0, 0, img.width, img.height);
	};

	/**
	 * @private
	 * Using a grayscale image, its width and a pixel coordinate
 	 * return the density value, which is 1 if its white and 0 if it's black
	 */
	var _density = function(x, y) {
		// if no image loaded or if pixels are outside the image's pixels pretend its white
		if (typeof _theImageData == 'undefined' || x >= _theImageData.width || y >= _theImageData.height) {
			return 1.0;
		}

		// Invert the y axis
		var color = _theImageData.data[(y * _theImageData.width * 4) + (x * 4)];
		return 1.0 - (color / 255.0);
	};
}