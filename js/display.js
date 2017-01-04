var gl;	// Global variable for WebGL Features.

function start () {
	var canvas = document.getElementById('Display');
	canvas.width = window.innerWidth * 0.75;
	canvas.height = canvas.width / 2;
	initGL(canvas);
	initShaders();
	initBuffers();
	initDisplay();
	gl.clearColor(0.0, 0.0, 0.0, 1.0);
	gl.enable(gl.DEPTH_TEST);
	drawScene();
}

function initGL (canvas) {
	try {
		gl = canvas.getContext("webgl");
		gl.viewportHeight = canvas.height;
		gl.viewportWidth = canvas.width;
	} catch (e) {
		console.log(e);
	}
	if (!gl) {
		console.log("Not supported");
	}
}

function getShader (gl, id) {
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
	} else if (shaderScript.type == "x-shader/x-vertex") {
		shader = gl.createShader(gl.VERTEX_SHADER);
	} else {
		return null;
	}
	gl.shaderSource(shader, str);
	gl.compileShader(shader);
	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		console.log(gl.getShaderInfoLog(shader));
		return null;
	}
	return shader;
}

var shaderProgram;
function initShaders () {
	// Get shaders written in index.html
	var fragmentShader = getShader(gl, "shader-fs");
	var vertexShader = getShader(gl, "shader-vs");
	shaderProgram = gl.createProgram();

	// Attach shaders to global gl
	gl.attachShader(shaderProgram, vertexShader);
	gl.attachShader(shaderProgram, fragmentShader);
	gl.linkProgram(shaderProgram);
	if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
		console.log("Could not initialise shaders.");
	}

	// Activate shader
	gl.useProgram(shaderProgram);
	shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "vertexPositions");
	gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

	shaderProgram.colorVector = gl.getUniformLocation(shaderProgram, "colorVector");
}

var pixelPositionBuffer = [];
var pixelPositionItemSize = 3;
var pixelPositionNumberOfItems = 4;

function initBuffers () {
	for (var i = 0; i < 32; i++) {
		pixelPositionBuffer.push([]);
	}
	var vertices = [];
	for (var i = 0; i < 32; i++) {
		for (var j = 0; j < 64; j++) {
			pixelPositionBuffer[i].push(gl.createBuffer());
			gl.bindBuffer(gl.ARRAY_BUFFER, pixelPositionBuffer[i][j]);
			// Since width is to be 64 pixels, we will set offset as 1/64 * 2 for width and height is 32 pixels so it's offset will be 1/64 * 4
			vertices = [
				-1 + 0.03125 + 0.03125 * j, 1 - 0.0 - 0.0625 * i, 0.0,
				-1 + 0.0 + 0.03125 * j, 1 - 0.0 - 0.0625 * i, 0.0,
				-1 + 0.03125 + 0.03125 * j, 1 - 0.0625 - 0.0625 * i, 0.0,
				-1 + 0.0 + 0.03125 * j, 1 - 0.0625 - 0.0625 * i, 0.0
			];
			gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
		}
	}
}

// A 2-D array to represent the state of the display
var display = [];
function initDisplay () {
	for (var i = 0; i < 32; i++) {
		display.push([]);
		for (var j = 0; j < 64; j++) {
			display[i].push(0);
		}
	}
} 

// RGBA values for pixel on and off
var pixelOn = [0.0, 1.0, 0.231, 1.0];
var pixelOff = [0.0, 0.0, 0.0, 1.0];

function drawScene () {
	gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	for (var i = 0; i < 32; i++) {
		for (var j = 0; j < 64; j++) {
			gl.bindBuffer(gl.ARRAY_BUFFER, pixelPositionBuffer[i][j]);
			gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, pixelPositionItemSize, gl.FLOAT, false, 0, 0);			
			if (display[i][j]) {
				var colorVector = new Float32Array(pixelOn);
			}
			else {
				var colorVector = new Float32Array(pixelOff);
			}
			gl.uniform4fv(shaderProgram.colorVector, colorVector);
			gl.drawArrays(gl.TRIANGLE_STRIP, 0, pixelPositionNumberOfItems);
		}
	}
}

function clear () {
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
}

function drawSprite (opCode, x, y) {
	CHIP8.v[0xf] = 0;
	var n = opCode & 0x000f;
	var sprite, posX = CHIP8.v[y], posY = CHIP8.v[x];
	for (var i = 0; i < n; i++) {
		sprite = CHIP8.memory[CHIP8.i + i];
		for (var j = 0; j < 8; j++) {
			if (sprite & 0x0080) {
				if (colorPixel(posX + i, posY + j)) {
					CHIP8.v[0x000f] = 1;
				}
			}
			sprite = sprite << 1;
		}
	}
}

function colorPixel (posX, posY) {
	if (posX > 31) {
		posX %= 31;
	}
	if (posY > 63) {
		posY %= 63;
	}
	// console.log("posx = " + posX + ", posy = " + posY);
	if (display[posX][posY]) {
		display[posX][posY] = 0;
		return true;
	} else {
		display[posX][posY] = 1;
		return false;
	}
}