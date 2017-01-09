var gl;

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
	gl.enable(gl.CULL_FACE);
}

function initGL (canvas) {
	gl = canvas.getContext("webgl");
	gl.viewportHeight = canvas.height;
	gl.viewportWidth = canvas.width;
}

function getShader (id) {
	var shaderScript = document.getElementById(id);
	var script = shaderScript.textContent;
	var shader;
	if (shaderScript.type == "vertex") {
		shader = gl.createShader(gl.VERTEX_SHADER);
	} else {
		shader = gl.createShader(gl.FRAGMENT_SHADER);
	}
	gl.shaderSource(shader, script);
	gl.compileShader(shader);
	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		console.log(gl.getShaderInfoLog(shader));
		return null;
	}
	return shader;
}

var shaderProgram;
function initShaders () {
	var fragmentShader = getShader("fragment");
	var vertexShader = getShader("vertex");
	shaderProgram = gl.createProgram();
	gl.attachShader(shaderProgram, vertexShader);
	gl.attachShader(shaderProgram, fragmentShader);
	gl.linkProgram(shaderProgram);
	gl.useProgram(shaderProgram);
	shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "vertexPositions");
	gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);
	shaderProgram.vertexColorAttribute = gl.getAttribLocation(shaderProgram, "vertexColors");
	gl.enableVertexAttribArray(shaderProgram.vertexColorAttribute);
	shaderProgram.colorUniform = gl.getUniformLocation(shaderProgram, "uColor");
}

// Vertex Position Attribute
var pixelPositionBuffer;
var pixelPositionItemSize = 2;
var pixelPositionNumberOfItems = 4 * 32 * 64;

// Vertex Color Attribute
var pixelColorBuffer;
var pixelColorItemSize = 2;
var pixelColorNumberOfItems = 4 * 32 * 64;

function initBuffers () {
	pixelPositionBuffer = gl.createBuffer();
	pixelColorBuffer = gl.createBuffer();
	var vertices = [];
	for (var i = 0; i < 32; i++) {
		for (var j = 0; j < 64; j++) {
			vertices = vertices.concat([
				-1 + 0.03125 + 0.03125 * j, 1 - 0.0 - 0.0625 * i,
				-1 + 0.0 + 0.03125 * j, 1 - 0.0 - 0.0625 * i,
				-1 + 0.03125 + 0.03125 * j, 1 - 0.0625 - 0.0625 * i,
				-1 + 0.0 + 0.03125 * j, 1 - 0.0625 - 0.0625 * i
			]);
		}
	}
	gl.bindBuffer(gl.ARRAY_BUFFER, pixelPositionBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
}

var displayBuffer = new Float32Array(32 * 64 * 8);
var displayMatrix = new Uint8Array(32 * 64);

function initDisplay () {
	for (var i = 0; i < 32; i++) {
		for (var j = 0; j < 64; j++) {
			displayMatrix[i * 64 + j]
		}
	}
	for (var i = 0; i < displayBuffer.length; i++) {
		displayBuffer[i] = 0.0;
	}
	gl.bindBuffer(gl.ARRAY_BUFFER, pixelPositionBuffer);
	gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, pixelPositionItemSize, gl.FLOAT, false, 0, 0);
}

function drawScene () {
	gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	gl.bindBuffer(gl.ARRAY_BUFFER, pixelColorBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, displayBuffer, gl.STATIC_DRAW);
	gl.vertexAttribPointer(shaderProgram.vertexColorAttribute, pixelColorItemSize, gl.FLOAT, false, 0, 0);

	gl.drawArrays(gl.TRIANGLE_STRIP, 0, pixelPositionNumberOfItems);
}

function setPixel (posX, posY) {
	if (posX > 31) {
		posX %= 31;
	}
	if (posY > 63) {
		posY %= 63;
	}
	var index = posX * 64 + posY;
	if (displayMatrix[index]) {
		displayMatrix[index] = 0;
		turnPixelOff(posX, posY);
		return true;
	} else {
		displayMatrix[index] = 1;
		turnPixelOn(posX, posY);
		return false;
	}
}

function turnPixelOn (posX, posY) {
	var index = (posX * 64 * 8) + (posY * 8);
	displayBuffer[index + 0] = displayBuffer[index + 2] = displayBuffer[index + 4] = displayBuffer[index + 6] = 1.0; 
	displayBuffer[index + 1] = displayBuffer[index + 3] = displayBuffer[index + 5] = displayBuffer[index + 7] = 0.231;
}

function turnPixelOff (posX, posY) {
	var index = (posX * 64 * 8) + (posY * 8);
	displayBuffer[index + 0] = displayBuffer[index + 2] = displayBuffer[index + 4] = displayBuffer[index + 6] = displayBuffer[index + 1] = displayBuffer[index + 3] = displayBuffer[index + 5] = displayBuffer[index + 7] = 0.0;
}

function drawSprite (opCode, x, y) {
	CHIP8.v[0xf] = 0;
	var n = opCode & 0x000f;
	var sprite, posX = CHIP8.v[y], posY = CHIP8.v[x];
	for (var i = 0; i < n; i++) {
		sprite = CHIP8.memory[CHIP8.i + i];
		for (var j = 0; j < 8; j++) {
			if (sprite & 0x0080) {
				if (setPixel(posX + i, posY + j)) {
					CHIP8.v[0x000f] = 1;
				}
			}
			sprite = sprite << 1;
		}
	}
}