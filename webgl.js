/* WebGL boilerplate code */
function getShader(gl, id) {
	var shaderScript = document.getElementById(id);
	if (!shaderScript) {
		return null;
	}

	var str = "";
	var k = shaderScript.firstChild;
	while (k) {
		if (k.nodeType == 3) {
			str += k.textContent;
		}
		k = k.nextSibling;
	}

	var shader;
	if (shaderScript.type == "x-shader/x-fragment") {
		shader = gl.createShader(gl.FRAGMENT_SHADER);
	}
	else if (shaderScript.type == "x-shader/x-vertex") {
		shader = gl.createShader(gl.VERTEX_SHADER);
	}
	else {
		return null;
	}

	gl.shaderSource(shader, str);
	gl.compileShader(shader);

	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		alert(gl.getShaderInfoLog(shader));
		return null;
	}

	return shader;
}

var mvMatrix;
function loadIdentity() { mvMatrix = Matrix.I(4); }
function multMatrix(m) { mvMatrix = mvMatrix.x(m); }
function mvTranslate(v) {
	var m = Matrix.Translation($V([v[0], v[1], v[2]])).ensure4x4();
	multMatrix(m);
}
var pMatrix;
function perspective(fovy, aspect, znear, zfar) {
	pMatrix = makePerspective(fovy, aspect, znear, zfar);
}

function ortho(left, right, bottom, top, znear, zfar) {
	pMatrix = makeOrtho(left, right, bottom, top, znear, zfar);
}

function setMatrixUniforms() {
	gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, new Float32Array(pMatrix.flatten()));
	gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, new Float32Array(mvMatrix.flatten()));
}

var gl;
var gl2d;	// For drawing points

var shaderProgram;
function initShaders() {
	var fragmentShader 	= getShader(gl, "shader-fs");
	var vertexShader	= getShader(gl, "shader-vs");

	shaderProgram = gl.createProgram();
	gl.attachShader(shaderProgram, vertexShader);
	gl.attachShader(shaderProgram, fragmentShader);
	gl.linkProgram(shaderProgram);

	if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
		alert("Could not initialize shaders");
	} 

	gl.useProgram(shaderProgram);

	shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
	gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

	shaderProgram.vertexColorAttribute = gl.getAttribLocation(shaderProgram, "aVertexColor");
	gl.enableVertexAttribArray(shaderProgram.vertexColorAttribute);

	shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
	shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
}

var vor;
/**
 * Sets up everything at startup
 */
function pageStart() {
	var canvas = $("main-canvas");
	gl = WebGLUtils.setupWebGL(canvas);
	if (!gl) {
		return;
    }
	canvas.width = canvas.clientWidth;
	canvas.height = canvas.clientHeight;
	canvas.addEventListener("mousedown", startDown, false);
	canvas.addEventListener("mousemove", canvasMouseMove, false);
	canvas.addEventListener("mouseup", canvasClick, false);

	canvas = $("2d-canvas");
	canvas.width = canvas.clientWidth;
	canvas.height = canvas.clientHeight;
	canvas.addEventListener("mousedown", startDown, false);
	canvas.addEventListener("mousemove", canvasMouseMove, false);
	canvas.addEventListener("mouseup", canvasClick, false);
	canvas.style.zIndex = "100";
	gl2d = canvas.getContext("2d");

	initShaders();

	var numStipples = $("numStipples").value;
	var displayVor = $("displayVor").checked;
	
	vor = new Voronoi(gl, gl2d, shaderProgram);

	tick();
}

/**
 * When the start button is pressed
 */
function start() {
	var numStipples = $("numStipples").value;
	var stippleSize = $("stippleSize").value;
	var displayVor = $("displayVor").checked;
	vor.start(numStipples, stippleSize, displayVor);
	$("status").innerHTML = "Running...";
	$("start").disabled = true;
	$("stop").disabled = false;
	$("save").disabled = false;
}

/**
 * When the stop button is pressed
 */
function stop() {
	vor.stop();
	$("start").disabled = false;
	$("stop").disabled = true;
}

/**
 * When the save button is pressed
 */
function save() {
	var canvas = $("2d-canvas");
	var img = canvas.toDataURL("image/png");
	window.open(img, "Output", "resizable=0, location=0, width=" + (canvas.width + 50) + ", height=" + (canvas.height + 50));
}

/**
 * When the stipple size control is modified
 */
function stippleSizeChanged() {
	vor.setStippleSize($("stippleSize").value);
	vor.draw();
}

/**
 * When the stipple color control is modified
 */
function stippleColorChanged() {
	vor.setStippleColor($("stippleColor").value);
	vor.draw();
}

/**
 * When the display voronoi checkbox is clicked
 */
function displayVorClicked() {
	vor.setDisplayVor($("displayVor").checked);
	vor.draw();
}

/**
 * When the display image checkbox is clicked
 */
function displayImageClicked() {
	if ($("displayImage").checked) {
		$("theImage").style.visibility = "visible";
	}
	else {
		$("theImage").style.visibility = "hidden";
	}
}

var originalCanvasWidth = 900;
var originalCanvasHeight = 550;

/**
 * When a file is selected using the file selection control
 */
function onFileSelected(event) {
	// Reset canvas size
	setCanvasSize(originalCanvasWidth, originalCanvasHeight);
	var selectedFile = event.target.files[0];
	var reader = new FileReader();

	var img = $("theImage");
	img.title = selectedFile.name;

	// When the image is loaded
	reader.onload = function(event) {
		img.onload = function() {
			vor.setImage(img);
			setCanvasSize(img.width, img.height);
			$("start").disabled = false;
		}
		img.src = event.target.result;
	};

	// Load the selected image
	reader.readAsDataURL(selectedFile);
}

/**
 * Resizes the canvases used by WebGL
 */
function setCanvasSize(width, height) {
	$("canvases").style.width = "" + width + "px";
	$("canvases").style.height = "" + height + "px";
	var canvas = $("main-canvas");
	canvas.width = canvas.clientWidth;
	canvas.height = canvas.clientHeight;
	canvas = $("2d-canvas");
	canvas.width = canvas.clientWidth;
	canvas.height = canvas.clientHeight;
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
var canvasClicked = false;
/**
 * Event handler when the mouse is pressed own
 */
function startDown(e) {
	mouseIsDown = true;
	mousePosition = getCursorPosition(e);
}

/**
 * Event handler when the mouse is moved over the canvas
 */
function canvasMouseMove(e) {
	if (!mouseIsDown) return;		// Do nothing if not pressing down on mouse
	mousePosition = getCursorPosition(e);
}

/**
 * Event handler when a mouse click occurs
 * Adds a new point to the voronoi diagram
 */
function canvasClick(e) {
	mouseIsDown = false;
	canvasClicked = true;
	return;
}

/**
 * This function is called every animation frame
 */
function tick() {
	requestAnimFrame(tick);

	if (vor.isMakingCentroidal()) {
		vor.moveToCentroid();
	}
	else {
		$("status").innerHTML = "Stopped...";
		$("start").disabled = false;
	}
}