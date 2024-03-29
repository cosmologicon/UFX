"use strict"

var UFX = UFX || {}

UFX._gl = {
	getName: function (value) {
		for (var name in this) {
			if (name.toUpperCase() == name && this[name] == value) return name
		}
		return "UNKNOWN_ENUM:" + value
	},
	resize: function (w, h) {
		this.canvas.width = w
		this.canvas.height = h
		this.viewport(0, 0, w, h)
	},
	addProgram: function (progname, vsource, fsource, opts) {
		if (!this.progs) this.progs = {}
		var prog = this.progs[progname] = this.buildProgram(vsource, fsource, opts)
		return prog
	},
	// Build a program, using the given source for the vertex and fragment shaders.
	buildProgram: function (vsource, fsource, opts) {
		opts = opts || {}
		var prog = this.createProgram()
		var vshader = this.createShader(this.VERTEX_SHADER)
		this.shaderSource(vshader, this.findSource(vsource))
		this.compileShader(vshader)
		if (!this.getShaderParameter(vshader, this.COMPILE_STATUS)) {
			throw "Error compiling vertex shader:\n" + this.getShaderInfoLog(vshader)
		}
		this.attachShader(prog, vshader)
		var fshader = this.createShader(this.FRAGMENT_SHADER)
		this.shaderSource(fshader, this.findSource(fsource))
		this.compileShader(fshader)
		if (!this.getShaderParameter(fshader, this.COMPILE_STATUS)) {
			throw "Error compiling fragment shader:\n" + this.getShaderInfoLog(fshader)
		}
		this.attachShader(prog, fshader)
		if (opts.attribs) {
			for (var name in opts.attribs) {
				this.bindAttribLocation(prog, opts.attribs[name], name)
			}
		}
		this.linkProgram(prog)
		if (!this.getProgramParameter(prog, this.LINK_STATUS)) {
			throw "Error linking program:\n" + this.getProgramInfoLog(prog)
		}
		this.validateProgram(prog)
		this.deleteShader(vshader)
		this.deleteShader(fshader)
		this.extendProgram(prog)
		return prog
	},
	findSource: function (scriptId) {
		if (scriptId.split) {
			var shaderScript = document.getElementById(scriptId)
			return shaderScript ? shaderScript.text : scriptId
		} else if (scriptId.text) {
			return scriptId.text
		}
		throw "Unable to find source from scriptId: " + scriptId
	},

	// Attaches member to obj such that obj[name] = member, but also breaks up name into
	// components to allow various ways of accessing member through name. For instance, when
	// name = "a.b[0][1].c", then all of the following will be references to member:
	// obj["a.b[0][1].c"]
	// obj.a["b[0][1].c"]
	// obj.a["b[0]"][1].c
	// obj.a.b[0][1].c
	// Doesn't work for every possible value of name, but it should work for anything that's a valid
	// WebGL uniform name.
	_attach: function (obj, member, name) {
		var pieces = name.split(/(?=[\.\[])/), n = pieces.length, joiners = {}
		for (var i = 0 ; i < n ; ++i) {
			for (var j = i + 1 ; j <= n ; ++j) {
				var joiner = pieces.slice(i, j).join("").replace(/^\./, "")
				if (joiner[0] == "[") joiner = j == i + 1 ? joiner.replace(/[\[\]]/g, "") : null
				joiners[[i, j]] = joiner
			}
		}
		var objchain = [obj]
		for (var j = 1 ; j < n ; ++j) {
			var joiner = joiners[[0, j]]
			if (!obj[joiner]) obj[joiner] = {}
			objchain.push(obj[joiner])
		}
		objchain.push(member)
		for (var i = 0 ; i < n ; ++i) {
			for (var j = i + 1 ; j <= n ; ++j) {
				if (joiners[[i, j]]) objchain[i][joiners[[i, j]]] = objchain[j]
			}
		}
	},

	// Add convenience functions to the given program.
	extendProgram: function (prog, opts) {
		opts = opts || {}
		var checkargs = "checkargs" in opts ? opts.checkargs : true
		var gl = this
		prog.gl = gl
		prog.use = function () {
			gl.useProgram(prog)
			gl.prog = prog
		}
		prog.use()
		prog.set = function (vars) {
			for (var name in vars) {
				this.set[name](vars[name])
			}
		}
		prog.uniforms = {}
		prog.uniforminfo = {}
		prog.setUniform = {}
		prog.setUniformv = {}
		prog.setUniformMatrix = {}
		var n = this.getProgramParameter(prog, this.ACTIVE_UNIFORMS)
		for (var i = 0 ; i < n ; ++i) {
			var info = this.getActiveUniform(prog, i)
			// Arrays will appear as "aname[0]", but there actually n+1 uniforms that can be added.
			var names = [info.name]
			if (/\]$/.test(names[0])) {
				names[0] = names[0].replace(/\[[^\[]*$/, "")
				for (var j = 0 ; j < info.size ; ++j) {
					names.push(names[0] + "[" + j + "]")
				}
			}
			this._attach(prog.uniforminfo, info, names[0])
			var locations = []
			for (var j = 0 ; j < names.length ; ++j) {
				var name = names[j]
				var location = this.getUniformLocation(prog, name)
				this._attach(prog.uniforms, location, name)
				// The number of arguments expected by the v-setter
				var argc = this.getTypeSize(info.type), typename = this.getName(info.type)
				if (this.isMatrixType(info.type)) argc *= argc
				if (j == 0 && names.length > 1) {
					argc *= info.size
					typename += "[" + info.size + "]"
				}
				if (this.isMatrixType(info.type)) {
					var func = this.getUniformMatrixSetter(prog, location, info.type)
					if (checkargs) func = this._checkvarg(func, argc, name, typename, "Uniform matrix")
					this._attach(prog.setUniformMatrix, func, name)
					this._attach(prog.set, func, name)
				} else {
					var func = this.getUniformSetter(prog, location, info.type)
					var funcv = this.getUniformVectorSetter(prog, location, info.type)
					if (checkargs) {
						func = this._checkarg(func, argc, name, typename, "Uniform")
						funcv = this._checkvarg(funcv, argc, name, typename, "Uniform vector")
					}
					this._attach(prog.setUniform, func, name)
					this._attach(prog.setUniformv, funcv, name)
					this._attach(prog.set, argc == 1 ? func : funcv, name)
				}
			}
		}
		prog.attribs = {}
		prog.attribinfo = {}
		prog.setAttrib = {}
		prog.setAttribv = {}
		n = this.getProgramParameter(prog, this.ACTIVE_ATTRIBUTES)
		for (var i = 0 ; i < n ; ++i) {
			var info = this.getActiveAttrib(prog, i)
			if (info.size != 1) throw "Can't handle attribute arrays! (for attrib " + info.name + ")"
			var index0 = gl.getAttribLocation(prog, info.name)
			this._attach(prog.attribinfo, info, info.name)
			var names = [info.name]
			var argc = this.getTypeSize(info.type), typename = this.getName(info.type)
			if (this.isMatrixType(info.type)) {
				names = []
				for (var j = 0 ; j < argc ; ++j) {
					names.push(info.name + "[" + j + "]")
				}
			}
			for (var j = 0 ; j < names.length ; ++j) {
				var name = names[j], index = index0 + j
				this._attach(prog.attribs, index, name)
				var func = this.getAttribSetter(prog, index, info.type)
				var funcv = this.getAttribVectorSetter(prog, index, info.type)
				if (checkargs) {
					func = this._checkarg(func, argc, name, typename, "Vertex attribute")
					funcv = this._checkvarg(funcv, argc, name, typename, "Vertex attribute vector")
				}
				this._attach(prog.setAttrib, func, name)
				this._attach(prog.setAttribv, funcv, name)
				this._attach(prog.set, argc == 1 ? func : funcv, name)
			}
		}
		prog.assignAttribOffsets = this.assignAttribOffsets.bind(this, prog)
	},

	// returns true if the array-like object a has length n and contains only Numbers or Booleans
	_checkn: function (a, n) {
		return a.length == n &&
			[].every.call(a, function (x) { return typeof x == "number" || typeof x == "boolean" })
	},

	// Wrap a function to require it takes exactly argc arguments
	_checkarg: function (func, argc, name, type, settertype) {
		return function () {
			if (UFX._gl._checkn(arguments, argc)) {
				return func.apply(this, arguments)
			}
			throw (settertype + " setter for " + name + " (type " + type + ") expects exactly " +
				argc + " numerical arguments.")
		}
	},

	// Wrap a function to require it takes a single array argument of length argc
	_checkvarg: function (func, argc, name, type, settertype) {
		return function (arg) {
			if (arguments.length == 1 && arg.length && UFX._gl._checkn(arg, argc)) {
				return func.apply(this, arguments)
			}
			throw (settertype + " setter for " + name + " (type " + type +
				") expects a single argument of exactly " + argc + " numerical elements.")
		}
	},

	buildTexture: function (opts) {
		opts = opts || {}
		var target = opts.target || this.TEXTURE_2D
		if (target != this.TEXTURE_2D) throw "can only handle target TEXTURE_2D"

		var texture = this.createTexture()
		this.bindTexture(target, texture)

		if ("flip" in opts) {
			var flip0 = this.getParameter(this.UNPACK_FLIP_Y_WEBGL)
			this.pixelStorei(this.UNPACK_FLIP_Y_WEBGL, opts.flip)
		}

		var level = 0
		var format = opts.format || this.RGBA
		var border = 0
		var type = opts.type || this.UNSIGNED_BYTE
		if (opts.source) {
			this.texImage2D(target, level, format, format, type, opts.source)
			texture.width = opts.source.width
			texture.height = opts.source.height
		} else {
			var pixels = opts.pixels || null
			var size0 = 256
			var width = opts.width || opts.size || size0
			var height = opts.height || opts.size || size0
			this.texImage2D(target, level, format, width, height, border, format, type, pixels)
			texture.width = width
			texture.height = height
		}

		if ("flip" in opts) {
			this.pixelStorei(this.UNPACK_FLIP_Y_WEBGL, flip0)
		}

		var min_filter = opts.min_filter || opts.filter
		var mag_filter = opts.mag_filter || opts.filter
		var wrap_s = opts.wrap_s || opts.wrap
		var wrap_t = opts.wrap_t || opts.wrap

		if (opts.npot) {
			if (!min_filter) min_filter = this.NEAREST
			if (!mag_filter) mag_filter = this.NEAREST
			wrap_s = this.CLAMP_TO_EDGE
			wrap_t = this.CLAMP_TO_EDGE
		}

		if (min_filter) this.texParameteri(target, this.TEXTURE_MIN_FILTER, min_filter)
		if (mag_filter) this.texParameteri(target, this.TEXTURE_MAG_FILTER, mag_filter)
		if (wrap_s) this.texParameteri(target, this.TEXTURE_WRAP_S, wrap_s)
		if (wrap_t) this.texParameteri(target, this.TEXTURE_WRAP_T, wrap_t)

		var mipmap = opts.source || opts.pixels
		if (opts.npot) mipmap = false
		if ("mipmap" in opts) mipmap = opts.mipmap

		if (mipmap) gl.generateMipmap(target)
		return texture
	},

	// For debugging purposes only. Dumps the given texture to the canvas.
	dumpTexture: function (texture, w, h) {
		var vsource = [
			"uniform mediump vec2 v;",
			"void main() { gl_Position = vec4(0.0, 0.0, 0.0, 1.0); gl_PointSize = max(v.x, v.y); }",
		].join("\n")
		var fsource = [
			"uniform mediump vec2 v; uniform sampler2D s;",
			"void main() { gl_FragColor = texture2D(s, gl_FragCoord.xy / v); }",
		].join("\n")
		if (w === undefined) {
			w = texture.width || 256
			h = texture.height || 256
		}
		var prog = this.buildProgram(vsource, fsource)
		prog.use()
		this.resize(w, h)
		this.clearColor(0, 0, 0, 1)
		this.clear(this.COLOR_BUFFER_BIT)
		this.disable(this.DEPTH_TEST)
		this.disable(this.SCISSOR_TEST)
		this.activeTexture(this.TEXTURE0)
		this.bindTexture(this.TEXTURE_2D, texture)
		prog.set({
			s: 0,
			v: [w, h],
		})
		this.drawArrays(this.POINTS, 0, 1)
		this.deleteProgram(prog)
	},

	// Returns "f" or "i" for float or integer type.
	getTypeLetter: function (type) {
		switch (type) {
			case this.FLOAT: case this.FLOAT_VEC2: case this.FLOAT_VEC3: case this.FLOAT_VEC4:
			case this.FLOAT_MAT2: case this.FLOAT_MAT3: case this.FLOAT_MAT4:
				return "f"
			case this.INT: case this.INT_VEC2: case this.INT_VEC3: case this.INT_VEC4:
			case this.BOOL: case this.BOOL_VEC2: case this.BOOL_VEC3: case this.BOOL_VEC4:
			case this.SAMPLER_2D: case this.SAMPLER_CUBE:
				return "i"
		}
		throw "Unrecognized type " + type
	},
	// Returns 1, 2, 3, or 4.
	getTypeSize: function (type) {
		switch (type) {
			case this.FLOAT: case this.INT: case this.BOOL:
			case this.SAMPLER_2D: case this.SAMPLER_CUBE:
				return 1
			case this.FLOAT_VEC2: case this.INT_VEC2: case this.BOOL_VEC2: case this.FLOAT_MAT2:
				return 2
			case this.FLOAT_VEC3: case this.INT_VEC3: case this.BOOL_VEC3: case this.FLOAT_MAT3:
				return 3
			case this.FLOAT_VEC4: case this.INT_VEC4: case this.BOOL_VEC4: case this.FLOAT_MAT4:
				return 4
		}
		throw "Unable to get size for type " + type
	},
	isMatrixType: function (type) {
		switch (type) {
			case this.FLOAT_MAT2: case this.FLOAT_MAT3: case this.FLOAT_MAT4:
				return true
			default:
				return false
		}
	},

	getUniformSetter: function (prog, location, type) {
		if (this.isMatrixType(type)) {
			throw "Cannot call getUniformSetter on matrix type " + this.getName(type)
		}
		var methodname = "uniform" + this.getTypeSize(type) + this.getTypeLetter(type)
		return this[methodname].bind(this, location)
	},
	getUniformVectorSetter: function (prog, location, type) {
		if (this.isMatrixType(type)) {
			throw "Cannot call getUniformVectorSetter on matrix type " + this.getName(type)
		}
		var methodname = "uniform" + this.getTypeSize(type) + this.getTypeLetter(type) + "v"
		return this[methodname].bind(this, location)
	},
	getUniformMatrixSetter: function (prog, location, type) {
		if (!this.isMatrixType(type)) {
			throw "Cannot call getUniformMatrixSetter on non-matrix type " + this.getName(type)
		}
		var methodname = "uniformMatrix" + this.getTypeSize(type) + this.getTypeLetter(type) + "v"
		return this[methodname].bind(this, location, false)
	},
	getAttribSetter: function (prog, index, type) {
		var methodname = "vertexAttrib" + this.getTypeSize(type) + this.getTypeLetter(type)
		return this[methodname].bind(this, index)
	},
	getAttribVectorSetter: function (prog, index, type) {
		var methodname = "vertexAttrib" + this.getTypeSize(type) + this.getTypeLetter(type) + "v"
		return this[methodname].bind(this, index)
	},
	makeArrayBuffer: function (data, opts) {
		opts = opts || {}
		var buffer = this.createBuffer()
		this.bindBuffer(this.ARRAY_BUFFER, buffer)
		this.bufferData(this.ARRAY_BUFFER, new (opts.type || Float32Array)(data), (opts.mode || this.STATIC_DRAW))
		buffer.bind = this.bindBuffer.bind(this, this.ARRAY_BUFFER, buffer)
		return buffer
	},
	makeElementBuffer: function (data, opts) {
		opts = opts || {}
		var buffer = this.createBuffer()
		this.bindBuffer(this.ELEMENT_ARRAY_BUFFER, buffer)
		this.bufferData(this.ELEMENT_ARRAY_BUFFER, new (opts.type || Uint16Array)(data), (opts.mode || this.STATIC_DRAW))
		buffer.bind = this.bindBuffer.bind(this, this.ELEMENT_ARRAY_BUFFER, buffer)
		return buffer
	},
	// Assigns pointers for the attributes corresponding to the given names.
	// Also enables the attributes as arrays.
	assignAttribOffsets: function (prog, offsets, opts) {
		opts = opts || {}
		var datatype = opts.type || this.FLOAT
		var normalize = "normalize" in opts ? opts.normalize : false
		var bytes = opts.bytes || Float32Array.BYTES_PER_ELEMENT, stride
		if ("stride" in opts) {
			stride = opts.stride
		} else {
			stride = 0
			for (var name in offsets) {
				var size = this.getTypeSize(prog.attribinfo[name].type)
				stride = Math.max(stride, offsets[name] + size)
			}
		}
		for (var name in offsets) {
			var size = this.getTypeSize(prog.attribinfo[name].type)
			this.enableVertexAttribArray(prog.attribs[name])
			this.vertexAttribPointer(prog.attribs[name], size, datatype, normalize, stride * bytes, offsets[name] * bytes)
		}
	},
}

UFX.gl = function (canvas, opts) {
	var gl = canvas.getContext("webgl", opts)
	if (!gl) return gl
	for (var method in UFX._gl) gl[method] = UFX._gl[method]
	return gl
}

