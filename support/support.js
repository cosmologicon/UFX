// UFX.space browser support survey
// include this from an HTML page to send a report on supported browser features to UFX.space.

"use strict"
var UFX = UFX || {}
UFX.support = {
	version: 5,  // Increment this every time you add something.
	testid: Math.floor(Math.random() * 90000) + 10000,
	useragent: window.navigator.userAgent
}
// UFX.support.version = 0  // 0 = testing. Will not send report.

document.addEventListener("DOMContentLoaded", function () {
	try {
		UFX.support.screensize = [screen.width, screen.height]
	} catch (e) {
		UFX.support.screensize = "Error: " + e
	}
	try {
		var width = window.innerWidth
			|| document.documentElement.clientWidth
			|| document.body.clientWidth
		var height = window.innerHeight
			|| document.documentElement.clientHeight
			|| document.body.clientHeight
		UFX.support.viewportsize = [width, height]
	} catch (e) {
		UFX.support.viewportsize = "Error: " + e
	}
	
	// Match tests.
	UFX.support.matchtests = {}
	function runmatchtest(testname, evalstring, expected) {
		var valid = true, match, value, error
		try {
			value = eval(evalstring)
			match = value === expected
		} catch (exception) {
			valid = false
			error = "" + exception
		}
		var info = {
			testname: testname,
			valid: valid
		}
		if (valid) {
			info.value = value
			info.match = match
		} else {
			info.error = error
		}
		UFX.support.matchtests[testname] = info
	}
	runmatchtest("json.stringify", "JSON.stringify([3])", "[3]")
	runmatchtest("array trailing comma", "[1,2,3,].length", 3)
	runmatchtest("array map", "[1].map(function (x) { return x + 2 })[0]", 3)
	runmatchtest("array reduce", "[1,2,0].reduce(function (x, y) { return x + y })", 3)
	runmatchtest("array filter", "[1,2,3].filter(function (x) { return x % 2 })[1]", 3)
	runmatchtest("array foreach", "var a = 0 ; [1,2].forEach(function (x) { a += x }) ; a", 3)
	runmatchtest("array every", "[1].every(function (x) { return x })", true)
	runmatchtest("array indexof", "[1,2,3,4,5].indexOf(4)", 3)
	runmatchtest("array includes", "[1,2,3,4,5].includes(4)", true)
	runmatchtest("array concat", "[1].concat([3])[1]", 3)
	runmatchtest("array fill", "var a = [1,2]; a.fill(3); a[1]", 3)
	runmatchtest("array isarray", "Array.isArray([1])", true)
	runmatchtest("array from", "Array.from('abc')[2]", "c")
	runmatchtest("array of", "Array.of(1, 2, 3)[2]", 3)
	runmatchtest("string includes", "'abc'.includes('b')", true)
	runmatchtest("string startswith", "'abc'.startsWith('ab')", true)
	runmatchtest("string trim", "' ab  '.trim()", "ab")
	runmatchtest("string concat", "'a'.concat('b')", "ab")
	runmatchtest("string repeat", "'a'.repeat(3)", "aaa")
	runmatchtest("object.keys", "Object.keys({3: 0})[0]", "3")
	runmatchtest("let", "let x = 2 ; x + 1", 3)
	runmatchtest("const", "const x = 2 ; x + 1", 3)
	runmatchtest("arrow function", "(x => x + 1)(2)", 3)
	runmatchtest("destructuring", "var [x, y] = [3, 4] ; x", 3)
	runmatchtest("backtick", "`a`", "a")
	runmatchtest("template string", "var x = 2 ; `${x+1}`", "3")
	runmatchtest("date.now", "var a = Date.now(), b = new Date().getTime(), c = Date.now(); a <= b && b <= c", true)
	runmatchtest("function bind", "(function (a) { return this + a }.bind(1, 2))(1)", 3)
	runmatchtest("2d context", "'' + document.createElement('canvas').getContext('2d')", "[object CanvasRenderingContext2D]")
	runmatchtest("webgl context", "'' + document.createElement('canvas').getContext('webgl')", "[object WebGLRenderingContext]")
	runmatchtest("experimental webgl context", "'' + document.createElement('canvas').getContext('experimental-webgl')", "[object WebGLRenderingContext]")


	// Feature checks
	UFX.support.features = {}
	function runfeaturecheck(base, fname) {
		var exists = fname in base
		var prefixed = []
		for (var s in base) {
			var n = s.length - fname.length
			if (n < 0) continue
			var suffix = s.substr(n)
			if (suffix.toLowerCase() == fname.toLowerCase()) {
				prefixed.push(s)
			}
		}
		UFX.support.features[fname] = {
			exists: exists,
			prefixed: prefixed
		}
	}
	runfeaturecheck(window, "requestAnimationFrame")
	runfeaturecheck(document.body, "requestFullscreen")
	runfeaturecheck(document, "cancelFullscreen")
	runfeaturecheck(window, "AudioContext")
	runfeaturecheck(window, "OfflineAudioContext")

	// WebGL parameter values
	function addparameter(gl, name) {
		var value = gl[name] ? gl.getParameter(gl[name]) : null
		UFX.support.webgl.parameters[name] = value
	}


	if (UFX.support.matchtests["webgl context"].match) {
		// A lot of good stuff at webglreport.com but not everything.
		var gl = document.createElement("canvas").getContext("webgl")
		UFX.support.webgl = {
			parameters: {}
		}
		addparameter(gl, "ALIASED_LINE_WIDTH_RANGE")
		addparameter(gl, "ALIASED_POINT_SIZE_RANGE")
		addparameter(gl, "ALPHA_BITS")
		addparameter(gl, "BLUE_BITS")
		addparameter(gl, "COMPRESSED_TEXTURE_FORMATS")
		addparameter(gl, "DEPTH_BITS")
		addparameter(gl, "GREEN_BITS")
		addparameter(gl, "MAX_COMBINED_TEXTURE_IMAGE_UNITS")
		addparameter(gl, "MAX_CUBE_MAP_TEXTURE_SIZE")
		addparameter(gl, "MAX_FRAGMENT_UNIFORM_VECTORS")
		addparameter(gl, "MAX_RENDERBUFFER_SIZE")
		addparameter(gl, "MAX_TEXTURE_IMAGE_UNITS")
		addparameter(gl, "MAX_TEXTURE_SIZE")
		addparameter(gl, "MAX_VARYING_VECTORS")
		addparameter(gl, "MAX_VERTEX_ATTRIBS")
		addparameter(gl, "MAX_VERTEX_TEXTURE_IMAGE_UNITS")
		addparameter(gl, "MAX_VERTEX_UNIFORM_VECTORS")
		addparameter(gl, "MAX_VIEWPORT_DIMS")
		addparameter(gl, "RED_BITS")
		addparameter(gl, "RENDERER")
		addparameter(gl, "SHADING_LANGUAGE_VERSION")
		addparameter(gl, "STENCIL_BITS")
		addparameter(gl, "SUBPIXEL_BITS")
		addparameter(gl, "VENDOR")
		addparameter(gl, "VERSION")
	}

	if (UFX.support.version > 0) {
		var req = new XMLHttpRequest()
		req.open("POST", "http://universefactory.net/tools/dump/", true)
		req.setRequestHeader("Content-type", "application/x-www-form-urlencoded")
		req.send("project=ufxsupport&data=" + encodeURIComponent(JSON.stringify(UFX.support)))
	}
})


