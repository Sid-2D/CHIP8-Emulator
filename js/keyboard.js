var keys = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "a", "b", "c", "d", "e" , "f"];

var keyState = [], lastKey;
var keyChk = false;

(function keySetState () {
	for (var i = 0; i < keys.length; i++) {
		keyState.push(0);		
	}
})();

window.addEventListener('keydown', (event) => {
	lastKey = event.key;
	if (keyChk) {
		stop = false;
	}
	keyState[keys.indexOf(event.key)] = 1;
}); 

window.addEventListener('keyup', (event) => {
	keyState[keys.indexOf(event.key)] = 0;
});