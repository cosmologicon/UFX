// UFX.gltext module
// Requires the UFX.gl module.

"use strict"
var UFX = UFX || {}

UFX.gltext = function (text, pos, opts) {
	if (!UFX.gltext.inited) throw "UFX.gltext.init(gl) has not been called"
	UFX.gltext.prog.draw(text, pos, opts)
}
UFX.gltext.init = function (gl) {
	UFX.gltext.inited = true
	UFX.gltext._gl = gl
	var prog = UFX.gltext.prog = gl.addProgram("text", UFX.gltext._vsource, UFX.gltext._fsource)
	prog.draw = UFX.gltext._draw
	prog.gettexture = UFX.gltext._gettexture
	prog.textures = {}
	prog.buffer = gl.makeArrayBuffer([0, 0, 1, 0, 0, 1, 1, 1])
	prog.assignAttribOffsets({ p: 0 })
	prog._use0 = prog.use
	prog.use = function () {
		this.gl.enable(this.gl.BLEND)
		this.gl.disable(this.gl.DEPTH_TEST)
		this.gl.blendFuncSeparate(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA, 0, 1)
	}
	return prog
}
UFX.gltext._vsource = `
attribute vec2 p;
varying vec2 a;
uniform vec2 w, s, p0;
void main() {
	gl_Position = vec4((p0 + p * s) / w * 2.0 - 1.0, 0.0, 1.0);
	a = p;
}
`
UFX.gltext._fsource = `
varying highp vec2 a;
uniform sampler2D t;
uniform mediump float alpha;
void main() {
	gl_FragColor = texture2D(t, a);
	gl_FragColor.a *= alpha;
}
`
UFX.gltext._draw = function (text, pos, opts) {
	opts = opts || {}
	var gl = this.gl

	var fontsize = opts.fontsize || UFX.gltext.DEFAULT.fontsize
	var fontname = opts.fontname || UFX.gltext.DEFAULT.fontname
	var color = opts.color || UFX.gltext.DEFAULT.color
	var textwidth = opts.textwidth
	var hanchor = 0
	var margin = opts.margin || UFX.gltext.fontmargins[fontname] || UFX.gltext.DEFAULT.margin
	var texture = this.gettexture(
		gl, text, fontsize, fontname, color, textwidth, hanchor, margin
	)

	var x = null, y = null
	x = pos[0]
	y = pos[1]

	gl.activeTexture(gl.TEXTURE0)
	gl.bindTexture(gl.TEXTURE_2D, texture)
	this.set({
		w: [gl.canvas.width, gl.canvas.height],
		p0: [x, y],
		t: 0,
		s: [texture.width, texture.height],
		alpha: 1,
	})
	gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)

}
UFX.gltext.DEFAULT = {
	fontsize: 18,
	fontname: "sans-serif",
	color: "#CCCCCC",
	margin: 0.2,
}
UFX.gltext.fontmargins = {
}

UFX.gltext._gettexture = function (gl, text, fontsize, fontname, color, textwidth, hanchor, margin) {
	var key = [text, fontsize, fontname, color, textwidth, hanchor, margin].toString()
	if (this.textures[key]) return this.textures[key]

//		var d = Math.ceil(margin * fontsize)
//		fontsize = Math.ceil(fontsize)

	var canvas = document.createElement("canvas")
	var context = canvas.getContext("2d")
//		context.font = `${fontsize}px '${fontname}'`
//		var texts = text.split("\n")
	// TODO: apply textwidth
//		var twidths = texts.map(t => context.measureText(t).width)
//		var w0 = Math.max.apply(Math, twidths)
	canvas.width = 200
	canvas.height = 100
//		context.fillRect(0, 0, 200, 100)
	context.font = fontsize + "px " + fontname
	context.fillStyle = color
	context.fillText(text, 100, 50)
	
	var texture = this.textures[key] = gl.buildTexture({ source: canvas, npot: true, flip: true })
	return texture
}
