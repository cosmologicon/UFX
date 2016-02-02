// Create a GL program with some convenience functions.

// var prog = UFX.glprog(vsource, fsource)
// vsource is the source code for the vertex shader (or the id of a DOM element with the source)

// Constructor assumes your GL context is a global variable called "gl". If not, pass in the context
// object as a third argument.

// Utility functions:
//   UFX.glutil.enumname(gl.SOME_ENUM)  -> returns string "SOME_ENUM"
//   UFX.glutil.enumasstring(gl.SOME_ENUM)  -> returns string "gl.SOME_ENUM"
//   UFX.glutil.typeletter(gl.INT_VEC2)  -> returns "i"
//   UFX.glutil.typesize(gl.INT_VEC2)  -> returns 2
//   UFX.glutil.ismatrixtype(gl.FLOAT_MAT2)  -> returns true

// Convenience functions:
//   prog.use()
// For uniforms:
//   prog.uniforms.uname  -> the uniform locator for the uniform uname
//   prog.set.uname(value)  -> set the uniform to the given value
//     value should be a scalar or Array as appropriate to the type of the uniform:
//     prog.set.myfloat(1)  -> calls gl.uniform1f
//     prog.set.myvec2([2, 3])  -> calls gl.uniform2fv
//     prog.set.mymat2([4, 5, 6, 7])  -> calls gl.uniformMatrix2fv
// For attributes:
//   prog.attribs.aname  -> the attribute location for the given attribute name
//   prog.setgeneric.aname(value)  -> set the attribute to the generic value and disable as array
//   prog.set.aname(buffer)  -> set the attribute to the given buffer and enable it

"use strict"
var UFX = UFX || {}

UFX.glutil = {
	enumname: function (value, _gl) {
		_gl = _gl || gl
		for (var name in _gl) {
			if (name.toUpperCase() == name && _gl[name] === value) return name
		}
		return null
	},
	enumasstring: function (value, _gl) {
		_gl = _gl || gl
		var name = this.enumname(value, _gl)
		return name ? "gl." + name : "unknown GLENUM (" + value + ")"
	},
	typeletter: function (type, _gl) {
		_gl = _gl || gl
		switch (type) {
			case _gl.FLOAT: case _gl.FLOAT_VEC2: case _gl.FLOAT_VEC3: case _gl.FLOAT_VEC4:
			case _gl.FLOAT_MAT2: case _gl.FLOAT_MAT3: case _gl.FLOAT_MAT4:
				return "f"
			case _gl.INT: case _gl.INT_VEC2: case _gl.INT_VEC3: case _gl.INT_VEC4:
			case _gl.BOOL: case _gl.BOOL_VEC2: case _gl.BOOL_VEC3: case _gl.BOOL_VEC4:
			case _gl.SAMPLER_2D: case _gl.SAMPLER_CUBE:
				return "i"
		}
		throw "Unrecognized type: " + this.enumasstring(type, _gl)
	},
	typesize: function (type, _gl) {
		_gl = _gl || gl
		switch (type) {
			case _gl.FLOAT: case _gl.INT: case _gl.BOOL:
			case _gl.SAMPLER_2D: case _gl.SAMPLER_CUBE:
				return 1
			case _gl.FLOAT_VEC2: case _gl.INT_VEC2: case _gl.BOOL_VEC2: case _gl.FLOAT_MAT2:
				return 2
			case _gl.FLOAT_VEC3: case _gl.INT_VEC3: case _gl.BOOL_VEC3: case _gl.FLOAT_MAT3:
				return 3
			case _gl.FLOAT_VEC4: case _gl.INT_VEC4: case _gl.BOOL_VEC4: case _gl.FLOAT_MAT4:
				return 4
		}
		throw "Unable to get size for type: " + this.enumasstring(type, _gl)
	},
	ismatrixtype: function (type, _gl) {
		_gl = _gl || gl
		switch (type) {
			case _gl.FLOAT_MAT2: case _gl.FLOAT_MAT3: case _gl.FLOAT_MAT4:
				return true
			default:
				return false
		}
	},
	// Returns the scalar form for lenth-1 types and the vector form for other types.
	uniformsettername: function (type, _gl) {
		var typesize = this.typesize(type, _gl)
		var typeletter = this.typeletter(type, _gl)
		if (this.ismatrixtype(type, _gl)) {
			return `uniformMatrix${typesize}${typeletter}v`
		} else if (typesize == 1) {
			return `uniform${typesize}${typeletter}`
		} else {
			return `uniform${typesize}${typeletter}v`
		}
	},

	// A argument-checking wrapper for functions that expect a single scalar.
	_wrapargcheckscalar: function (func, message) {
		return function (arg) {
			// isNaN(arg.length) distinguishes between numbers and Arrays.
			if (arguments.length != 1 || !isNaN(arg.length)) throw message
			func(arg)
		}
	},
	// A argument-checking wrapper for functions that expect a single Array argument of the given size.
	_wrapargcheckarray: function (func, size, message) {
		return function (arg) {
			if (arguments.length != 1 || arg.length != size) {
				throw message
			}
			func(arg)
		}
	},
	_getuniformsetter: function (uname, location, type, count, _gl) {
		var typesize = this.typesize(type, _gl)
		var letter = this.typeletter(type, _gl)
		var ismatrix = this.ismatrixtype(type, _gl)
		var ntypevalues = ismatrix ? typesize * typesize : typesize
		var nvalues = count * ntypevalues
		var settername = [
			"uniform",
			ismatrix ? "Matrix" : "",
			typesize,
			letter,
			nvalues == 1 ? "" : "v"
		].join("")
		var setter
		if (ismatrix) {
			setter = _gl[settername].bind(_gl, location, false)
		} else {
			setter = _gl[settername].bind(_gl, location)
		}
		if (true) {  // Add argument checking
			var typename = UFX.glutil.enumasstring(type, _gl)
			if (count > 1) typename += `[${count}]`
			if (nvalues == 1) {
				var message = `Setter gl.${settername} for uniform ${uname} requires a single scalar argument of type ${typename}.`
				setter = this._wrapargcheckscalar(setter, message)
			} else {
				var message = `Setter gl.${settername} for uniform ${uname} requires a single length-${nvalues} Array argument of type ${typename}.`
				setter = this._wrapargcheckarray(setter, nvalues, message)
			}
		}
		return setter
	},
	_getattribsetter: function (aname, location, type, count, _gl) {
		// TODO: make sure this actually works with mat3 attribs!
		console.assert(count == 1)
		var typesize = this.typesize(type, _gl)
		var letter = this.typeletter(type, _gl)
		var ismatrix = this.ismatrixtype(type, _gl)
		var ntypevalues = ismatrix ? typesize * typesize : typesize
		var nvalues = count * ntypevalues
		var settername = [
			"vertexAttrib",
			typesize,
			letter,
			nvalues == 1 ? "" : "v"
		].join("")
		var setter = function (arg) {
			_gl[settername](location, arg)
			_gl.disableVertexAttribArray(location)
		}
		if (true) {  // Add argument checking
			var typename = UFX.glutil.enumasstring(type, _gl)
			if (count > 1) typename += `[${count}]`
			if (nvalues == 1) {
				var message = `Constant setter gl.${settername} for vertex attribute ${aname} requires a single scalar argument of type ${typename}.`
				setter = this._wrapargcheckscalar(setter, message)
			} else {
				var message = `Constant setter gl.${settername} for vertex attribute ${aname} requires a single length-${nvalues} Array argument of type ${typename}.`
				setter = this._wrapargcheckarray(setter, nvalues, message)
			}
		}
		return setter
	},
	_getattribpointersetter: function (aname, location, type, count, _gl) {
		console.assert(count == 1)
		var typesize = this.typesize(type, _gl)
		var letter = this.typeletter(type, _gl)
		var ismatrix = this.ismatrixtype(type, _gl)
		var ntypevalues = ismatrix ? typesize * typesize : typesize
		var nvalues = count * ntypevalues
		var setter = function (data) {
			if (Array.isArray(data)) data = Float32Array.from(data)
			var buffer = _gl.createBuffer()
			_gl.bindBuffer(_gl.ARRAY_BUFFER, buffer)
			_gl.bufferData(_gl.ARRAY_BUFFER, data, _gl.STATIC_DRAW)
			_gl.enableVertexAttribArray(location)
			// TODO: correctly handle other types than Float32Array
			_gl.vertexAttribPointer(location, typesize, _gl.FLOAT, _gl.FALSE, 0, 0)
		}
		if (true) {  // Add argument checking
			setter = (function (func) {
				return function (arg) {
					var isarray = Array.isArray(arg) || arg instanceof Float32Array
					if (arguments.length != 1 || !isarray) {
						throw `Setter for vertex attribute ${aname} requires a single argument Array or Float32Array.`
					}
					func(arg)
				}
			})(setter)
		}
		return setter
	},
}


UFX.glprog = function (vsource, fsource, _gl) {
	if (!(this instanceof UFX.glprog)) return new UFX.glprog(vshader, fshader, _gl)
	this.gl = _gl || gl
	if (!this.gl) throw "GL context not specified."
	this.vshader = this.createshader(vsource, this.gl.VERTEX_SHADER)
	this.fshader = this.createshader(fsource, this.gl.FRAGMENT_SHADER)
	this.buildprogram()
	this.use()
	this.set = {}
	this.setconstant = {}
	this.setupuniforms()
	this.setupattribs()
}
UFX.glprog.prototype = {
	createshader: function (shadersource, shadertype) {
		var shader = this.gl.createShader(shadertype)
		if (shadersource.split) {
			var element = document.getElementById(shadersource)
			if (element) shadersource = element.text
		} else if (shadersource.text) {
			shadersource = shadersource.text
		} else {
			throw "Unable to parse as shader source: " + shadersource
		}
		this.gl.shaderSource(shader, shadersource)
		this.gl.compileShader(shader)
		if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
			throw "shader compile error: " + this.gl.getShaderInfoLog(shader)
		}
		return shader
	},
	buildprogram: function () {
		this.prog = this.gl.createProgram()
		this.gl.attachShader(this.prog, this.vshader)
		this.gl.attachShader(this.prog, this.fshader)
		this.gl.linkProgram(this.prog)
		if (!this.gl.getProgramParameter(this.prog, this.gl.LINK_STATUS)) {
			throw "Error linking program:\n" + this.gl.getProgramInfoLog(this.prog)
		}
		this.gl.validateProgram(this.prog)
		// TODO: check validation status
	},
	setupuniforms: function () {
		this.uniforms = {}
		var nuniforms = this.gl.getProgramParameter(this.prog, this.gl.ACTIVE_UNIFORMS)
		for (var i = 0 ; i < nuniforms ; ++i) {
			var info = this.gl.getActiveUniform(this.prog, i)
			this.uniforms[info.name] = this.gl.getUniformLocation(this.prog, info.name)
			this.set[info.name] = UFX.glutil._getuniformsetter(info.name, this.uniforms[info.name], info.type, info.size, this.gl)
		}
	},
	setupattribs: function () {
		this.attribs = {}
		var nattribs = this.gl.getProgramParameter(this.prog, this.gl.ACTIVE_ATTRIBUTES)
		for (var i = 0 ; i < nattribs ; ++i) {
			var info = this.gl.getActiveAttrib(this.prog, i)
			this.attribs[info.name] = this.gl.getAttribLocation(this.prog, info.name)
			this.set[info.name] = UFX.glutil._getattribpointersetter(info.name, this.attribs[info.name], info.type, info.size, this.gl)
			this.setconstant[info.name] = UFX.glutil._getattribsetter(info.name, this.attribs[info.name], info.type, info.size, this.gl)
		}
	},
	use: function () {
		this.gl.useProgram(this.prog)
	},

}
