// Global to setup the Interpreter according to CHIP8 architecture
var CHIP8;
var resetInterpreter = function () {
	return {
		pc : 512,		// Program Counter - 16 bit (points to currently executing address)
		memory : new Array(4096),	// 4K of memory	
		stack : new Array(16),	// 16 16-bit values (used to store the address that the interpreter shoud return to when finished with a subroutine. Chip-8 allows for up to 16 levels of nested subroutines.)
		sp : 0,		// Stack Pointer - 8-bit (points to topmost level in stack)
		v : Array(16),	// 16 8-bit registers
		i : 0,			// 16-bit register
		delayTimer : 0,	// Decrements at 60Hz, if non-zero, it is said to be active
		soundTimer : 0	// Decrements at 60Hz, if non-zero, a buzzer will sound
	};
}

function bootInterpreter () {
	CHIP8 = resetInterpreter();
	start();	// Display
	setHexCodes();
	loadProgram();
	drawScene();
}

function loadProgram () {
	var xhr = new XMLHttpRequest;
	xhr.open("GET", "Games/PONG2", true);
	xhr.responseType = "arraybuffer";
	xhr.onload = function () {
		console.log(xhr.response);
		program = new Uint8Array(xhr.response);
		for (var i = 0; i < program.length; i++) {
			CHIP8.memory[i + 0x200] = program[i];
		}
		// Once the program is done loading into memory, we start the Interpreter's cycles
		startInterpreterCycles();	
	};
	xhr.send();
}

var stop = false;	// Global, set true at anytime to stop emulation
var debugCounter = 0;	// Global, used as a breakpoint
function startInterpreterCycles () {
	if (!stop) {
		requestAnimationFrame(startInterpreterCycles);
		for (var i = 0; i < 10; i++) {
			//update();
			if (CHIP8.delayTimer) CHIP8.delayTimer--;
			if (CHIP8.soundTimer) CHIP8.soundTimer--;
			processOpcode();
			drawScene();
		}
		
	}	
}

var lastTime = 0;
function update () {
	var timeNow = new Date().getTime();
	var elapsed = timeNow - lastTime;
	// This decides the fps
	if (elapsed >= 100/60) {
		debugCounter++;
		if (CHIP8.delayTimer) CHIP8.delayTimer--;
		if (CHIP8.soundTimer) CHIP8.soundTimer--;
		processOpcode();
		drawScene();
		lastTime = timeNow;
	}
}

var opCodeInHex;

function processOpcode () {
	// Following code can be used to stop the emulation after a certain number of cycles.
	// if (debugCounter == 29) {
	// 	debugger;
	// } 
	//console.log("pc = " + CHIP8.pc);
	var opCode = CHIP8.memory[CHIP8.pc] << 8 | CHIP8.memory[CHIP8.pc + 1];
	//opCodeInHex = opCode.toString(16);
	var x = (opCode & 0x0f00) >> 8;
	var y = (opCode & 0x00f0) >> 4;
	CHIP8.pc += 2;
	if (opCode == 0) {
		stop = true;
		return;
	}
	//console.log("opCode = " + opCode.toString(16));
	switch (opCode & 0xf000) {
		case 0x0000 : {
			switch (opCode) {
				case 0x00E0 : {
					clear();
				} break;
				case 0x00EE : {
					CHIP8.pc = CHIP8.stack[CHIP8.sp--];					
				} break;
				default : {
					stop = true;
					console.log("Invalid OpCode received: 1 - " + opCode.toString(16));
				} break;
			} break;
		}
		case 0x1000 : {
			CHIP8.pc = opCode & 0x0fff;
		} break;
		case 0x2000 : {
			CHIP8.sp++;
			CHIP8.stack[CHIP8.sp] = CHIP8.pc;
			CHIP8.pc = opCode & 0x0fff;
		} break;
		case 0x3000 : {
			if (CHIP8.v[x] === (opCode & 0x00ff)) {
				CHIP8.pc += 2;
			}
		} break;
		case 0x4000 : {
			if (CHIP8.v[x] != (opCode & 0x00ff)) {
				CHIP8.pc += 2;
			}
		} break;
		case 0x5000 : {
			if (CHIP8.v[x] == CHIP8.v[y]) {
				CHIP8.pc += 2;
			}
		} break;
		case 0x6000 : {
			CHIP8.v[x] = opCode & 0x00ff;
		} break;
		case 0x7000 : {
			CHIP8.v[x] += opCode & 0x00ff;
			CHIP8.v[x] &= 0x00ff; 
		} break;
		case 0x8000 : {
			switch (opCode & 0x000f) {
				case 0x0000 : {
					CHIP8.v[x] = CHIP8.v[y];
				} break;
				case 0x0001 : {
					CHIP8.v[x] = CHIP8.v[x] | CHIP8.v[y];
				} break;
				case 0x0002 : {
					CHIP8.v[x] = CHIP8.v[x] & CHIP8.v[y];
				} break;
				case 0x0003 : {
					CHIP8.v[x] = CHIP8.v[x] ^ CHIP8.v[y];
				} break;
				case 0x0004 : {
					CHIP8.v[x] = (CHIP8.v[x] + CHIP8.v[y]) & 0x00ff;	// Keep the last 8 bits of the answer.
					CHIP8.v[0x000f] = ((CHIP8.v[x] + CHIP8.v[y]) & (1 << 8)) >> 8; // Keep the 9th bit of the answer.
				} break;
				case 0x0005 : {
					CHIP8.v[0x000f] = (CHIP8.v[x] > CHIP8.v[y]) ? 1 : 0;
					CHIP8.v[x] = CHIP8.v[x] - CHIP8.v[y];
					if (CHIP8.v[x] < 0) {
						CHIP8.v[x] += 0xff;
					}
				} break;
				case 0x0006 : {
					CHIP8.v[0xf] = CHIP8.v[x] & 1;
					CHIP8.v[x] = CHIP8.v[x] >> 1;
				} break;
				case 0x0007 : {
					CHIP8.v[0x000f] = (CHIP8.v[y] > CHIP8.v[x]) ? 1 : 0;
					CHIP8.v[x] = CHIP8.v[y] - CHIP8.v[x];
					if (CHIP8.v[x] < 0) {
						CHIP8.v[x] += 0xff;
					}
				} break;
				case 0x000e : {
					if (CHIP8.v[x] & (1 << 7)) {
						CHIP8.v[0x000f] = 1;
					} else {
						CHIP8.v[0x000f] = 0;
					}
					CHIP8.v[x] = (CHIP8.v[x] << 1);
				} break;
				default : {
					stop = true;
					console.log("Invalid OpCode received: 2 - " + opCode.toString(16) + "pc = " + CHIP8.pc);
				} break;
			}
		} break;
		case 0x9000 : {
			if (CHIP8.v[x] != CHIP8.v[y]) {
				CHIP8.pc += 2;
			}
		} break;
		case 0xa000 : {
			CHIP8.i = opCode & 0x0fff;
		} break;
		case 0xb000 : {
			CHIP8.pc = CHIP8.v[0] + opCode & 0x0fff;
		} break;
		case 0xc000 : {
			CHIP8.v[x] = (opCode & 0x00ff) & parseInt(Math.random() * 256);
		} break;
		case 0xd000 : {
			drawSprite(opCode, x, y);
		} break;
		case 0xe000 : {
			switch (opCode & 0x00ff) {
				case 0x009e : {
					if (keyState[CHIP8.v[x]]) {
						CHIP8.pc += 2; 
					}
				} break;
				case 0x00a1 : {
					if (keyState[CHIP8.v[x]] == 0) {
						CHIP8.pc += 2; 
					}
				} break; 
				default : {
					stop = true;
					console.log("Invalid OpCode received: 3 - " + opCode.toString(16));
				} break;
 			}
		} break;
		case 0xf000 : {
			switch (opCode & 0x00ff) {
				case 0x0007 : {
					CHIP8.v[x] = CHIP8.delayTimer;
				} break;
				case 0x000a : {
					stop  = keyChk = true;
				} break;
				case 0x0015 : {
					CHIP8.delayTimer = CHIP8.v[x];
				} break;
				case 0x0018 : {
					CHIP8.soundTimer = CHIP8.v[x];
				} break;
				case 0x001e : {
					CHIP8.i += CHIP8.v[x];
				} break;
				case 0x0029 : {
					CHIP8.i = CHIP8.v[x] * 5 + 0x50;
				} break;
				case 0x0033 : {
					var temp = CHIP8.v[x];
					for (var i = 2; i >= 0; i--) {
						CHIP8.memory[CHIP8.i + i] = parseInt(temp % 10);
						temp = temp / 10;
					} 
				} break;
				case 0x0055 : {
					for (var i = 0; i <= x; i++) {
						CHIP8.memory[CHIP8.i + i] = CHIP8.v[i];
					}
				} break;
				case 0x0065 : {
					for (var i = 0; i <= x; i++) {
						CHIP8.v[i] = CHIP8.memory[CHIP8.i + i];
					}
				} break;
				default : {
					stop = true;
					console.log("Invalid OpCode received: 4 - " + opCode.toString(16) + ", pc = " + CHIP8.pc);
				} break;
			}
		} break;
		default : {
			stop = true;
			console.log("Invalid OpCode received: 5 - " + opCode.toString(16)); break;
		} break;
	}
}

var hexCodes = {
	0 : [0xF0, 0x90, 0x90, 0x90, 0xF0],
	1 : [0x20, 0x60, 0x20, 0x20, 0x70],
	2 : [0xF0, 0x10, 0xF0, 0x80, 0xF0],
	3 : [0xF0, 0x10, 0xF0, 0x10, 0xF0],
	4 : [0x90, 0x90, 0xF0, 0x10, 0x10],
	5 : [0xF0, 0x80, 0xF0, 0x10, 0xF0],
 	6 : [0xf0, 0x80, 0xf0, 0x90, 0xf0],
	7 : [0xF0, 0x10, 0x20, 0x40, 0x40],
	8 : [0xF0, 0x90, 0xF0, 0x90, 0xF0],
	9 : [0xF0, 0x90, 0xF0, 0x10, 0xF0],
	10 : [0xF0, 0x90, 0xF0, 0x90, 0x90],
	11 : [0xE0, 0x90, 0xE0, 0x90, 0xE0],
	12 : [0xF0, 0x80, 0x80, 0x80, 0xF0],
	13 : [0xE0, 0x90, 0x90, 0x90, 0xE0],
	14 : [0xF0, 0x80, 0xF0, 0x80, 0xF0],
	15 : [0xF0, 0x80, 0xF0, 0x80, 0x80]
}

function setHexCodes () {
	var code = 0;
	for (var i = 0; i < 16; i ++) {
		hexCodes[code].forEach(function (value, index) {
			CHIP8.memory[0x50 + i*5 + index] = value; 
		});
		code++;
	}
}

function stopEmulation () {
	stop = true;
}