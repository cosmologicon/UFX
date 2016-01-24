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
//   prog.uniforms.uname  -> the uniform locator for the uniform uname
//   prog.set.uname(value)  -> set the uniform to the given value
//     value should be a scalar or Array as appropriate to the type of the uniform:
//     prog.set.myfloat(1)
//     prog.set.myvec2([2, 3])
//     prog.set.mymat2([4, 5, 6, 7])


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
}


UFX.glprog = function (vsource, fsource, _gl) {
	if (!(this instanceof UFX.glprog)) return new UFX.glprog(vshader, fshader, _gl)
	this.gl = _gl || gl
	if (!this.gl) throw "GL context not specified."
	this.vshader = this.createshader(vsource, this.gl.VERTEX_SHADER)
	this.fshader = this.createshader(fsource, this.gl.FRAGMENT_SHADER)
	this.buildprogram()
	this.setupuniforms()
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
		function getuniformsetter(uname, location, type, count, _gl) {
			var size = UFX.glutil.typesize(type, _gl)
			var letter = UFX.glutil.typeletter(type, _gl)
			var ismatrix = UFX.glutil.ismatrixtype(type, _gl)
			var settername = [
				"uniform",
				ismatrix ? "Matrix" : "",
				size,
				letter,
				size == 1 ? "" : "v"
			].join("")
			var setter
			if (ismatrix) {
				setter = _gl[settername].bind(_gl, location, false)
			} else {
				setter = _gl[settername].bind(_gl, location)
			}
			if (true) {  // Add argument checking
				var typename = UFX.glutil.enumasstring(type, _gl)
				if (size == 1) {
					var message = `Setter gl.${settername} for uniform ${uname} requires a single scalar argument of type ${typename}.`
					console.log(setter)
					setter = function (method) {
						return function (arg) {
							if (arguments.length != 1 || arg.length) {
								throw message
							}
							method(arg)
						}
					}(setter)
				} else {
					var nvalues = ismatrix ? size * size : size
					var message = `Setter gl.${settername} for uniform ${uname} requires a single length-${nvalues} Array argument of type ${typename}.`
					setter = function (method) {
						return function (arg) {
							if (arguments.length != 1 || arg.length != nvalues) {
								throw message
							}
							method(arg)
						}
					}(setter)
				}
			}
			return setter
		}
		this.set = {}
		this.uniforms = {}
		var nuniforms = this.gl.getProgramParameter(this.prog, this.gl.ACTIVE_UNIFORMS)
		for (var i = 0 ; i < nuniforms ; ++i) {
			var info = this.gl.getActiveUniform(this.prog, i)
			this.uniforms[info.name] = this.gl.getUniformLocation(this.prog, info.name)
			this.set[info.name] = getuniformsetter(info.name, this.uniforms[info.name], info.type, 1, this.gl)
		}
		// TODO: see what the uniform info looks like for a uniform array
		// or for a uniform struct
	},
	use: function () {
		this.gl.useProgram(this.prog)
	},


}
