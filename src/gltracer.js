// UFX.gltracer: return an object that allows for rendering 2d context drawing commands onto a
// WebGL context.

"use strict"

UFX.gltracer = function(gl, range, drawfunc, opts) {
	UFX.gltracer._init(gl)
	opts = opts || {}

	var obj = {
		_gl: gl,
		_textures: {},
		drawfunc: drawfunc,
		draw: UFX.gltracer._draw,
		clean: UFX.gltracer._clean,
		autosetup: true,
		toffset: 0,
		pot: opts.pot,
		debug: opts.debug,
	}

	if (typeof range == "number") {
		obj.x0 = obj.y0 = -range
		obj.x1 = obj.y1 = range
	} else if (range instanceof Array && range.length == 2) {
		obj.x0 = obj.y0 = range[0]
		obj.x1 = obj.y1 = range[1]
	} else if (range instanceof Array && range.length == 4) {
		obj.x0 = range[0]
		obj.y0 = range[1]
		obj.x1 = range[2]
		obj.y1 = range[3]
	} else {
		throw "Incorrectly formatted range: " + range
	}
	obj.w = obj.x1 - obj.x0
	obj.h = obj.y1 - obj.y0

	return obj
}

UFX.gltracer._init = function (gl) {
	if (this._inited) return
	this._inited = true
	this.pbuffer = gl.makeArrayBuffer([0, 0, 1, 0, 0, 1, 1, 1])
	this.prog = gl.addProgram("gltracer", [
		"attribute vec2 p;",
		"uniform vec2 w, s, p0, d, f;",
		"varying highp vec2 a;",
		"uniform float A;",
		"void main() {",
		"	mat2 R = mat2(cos(A), sin(A), -sin(A), cos(A));",
		"	gl_Position = vec4((p0 + R * ((p * f - d) * s)) / w * 2.0 - 1.0, 0.0, 1.0);",
		"	a = (p - 0.5) * f + 0.5;",
		"}",
	].join("\n"), [
		"varying highp vec2 a;",
		"uniform sampler2D t;",
		"uniform highp float alpha;",
		"void main() {",
		"	gl_FragColor = texture2D(t, a);",
		"	gl_FragColor.a *= alpha;",
		"}",
	].join("\n"))
}

UFX.gltracer._draw = function (pos, scale, opts) {
	scale = scale || 1
	opts = opts || {}
	var rotation = (opts.rotation || 0) * Math.PI / 180
	var alpha = "alpha" in opts ? opts.alpha : 1

	var gl = this._gl
	if (this.autosetup) {
		UFX.gltracer.prog.use()
		gl.enable(gl.BLEND)
		gl.disable(gl.DEPTH_TEST)
		gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, 0, 1)
		UFX.gltracer.pbuffer.bind()
		UFX.gltracer.prog.assignAttribOffsets({ p: 0 })
	}

	var twidth, theight
	if (this.pot) {
		twidth = 16
		while (twidth < this.w * scale || twidth < this.h * scale) twidth *= 2
		theight = twidth
	} else {
		twidth = this.w * scale
		theight = this.h * scale
	}

	var b = Math.min(twidth / this.w, theight / this.h)

	var key = [twidth, theight, b], texture
	if (this._textures[key]) {
		texture = this._textures[key]
	} else {
		var canvas = document.createElement("canvas")
		var context = canvas.getContext("2d")
		canvas.width = twidth
		canvas.height = theight
		context.save()
		context.translate(twidth / 2, theight / 2)
		context.scale(b, b)
		context.translate(-(this.x0 + this.x1) / 2, -(this.y0 + this.y1) / 2)
		this.drawfunc(context, b)
		if (this.debug) {
			UFX.draw(context,
				"lw 1 ss magenta",
				"b m", this.x0, 0, "l", this.x1, 0, "s",
				"b m", 0, this.y0, "l", 0, this.y1, "s",
				"lw 1 sr", this.x0, this.y0, this.x1 - this.x0, this.y1 - this.y0)
		}
		context.restore()
		if (this.debug) UFX.draw(context, "[ fs rgba(0,0,255,0.25) f0 ]")

		texture = gl.buildTexture({
			source: canvas,
			npot: !this.pot,
			flip: true,
			min_filter: this.pot ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR,
			mag_filter: gl.LINEAR,
		})
		this._textures[key] = texture
	}

	var fx = Math.ceil(this.w * b - 0.001) / twidth
	var fy = Math.ceil(this.h * b - 0.001) / theight
	var dx = (-this.x0 * b) / twidth, dy = (this.y1 * b) / theight

	gl.activeTexture(gl.TEXTURE0 + this.toffset)
	gl.bindTexture(gl.TEXTURE_2D, texture)
	UFX.gltracer.prog.set({
		w: [gl.canvas.width, gl.canvas.height],
		p0: pos,
		d: [dx, dy],
		t: this.toffset,
		s: [twidth / b * scale, theight / b * scale],
		alpha: alpha,
		A: rotation,
		f: [fx, fy],
	})
	gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
}
