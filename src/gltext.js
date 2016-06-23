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
	prog.posbuffer = gl.makeArrayBuffer([0, 0, 1, 0, 0, 1, 1, 1])
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
varying highp vec2 a;
uniform vec2 w, s, p0;
void main() {
	gl_Position = vec4((p0 + p * s) / w * 2.0 - 1.0, 0.0, 1.0);
	a = p + 0.5 / w;  // Scootch up half a pixel
}
`
UFX.gltext._fsource = `
varying highp vec2 a;
uniform sampler2D t;
uniform highp float alpha;
void main() {
	gl_FragColor = texture2D(t, a);
	gl_FragColor.a *= alpha;
}
`
UFX.gltext._draw = function (text, pos, opts) {
	if (!opts && typeof pos == "object") {
		opts = pos
		pos = null
	}
	opts = opts || {}
	var gl = this.gl

	var DEFAULT = UFX.gltext.DEFAULT
	var fontsize = opts.fontsize || DEFAULT.fontsize
	var fontname = opts.fontname || DEFAULT.fontname
	var color = opts.color || DEFAULT.color
	var owidth = (opts.owidth || DEFAULT.owidth) * DEFAULT.OUTLINE_UNITS
	var ocolor = opts.ocolor || DEFAULT.ocolor
	var hanchor = "hanchor" in opts ? opts.hanchor : DEFAULT.hanchor
	var vanchor = "vanchor" in opts ? opts.vanchor : DEFAULT.vanchor
	var margin = opts.margin || UFX.gltext.fontmargins[fontname] || DEFAULT.margin

	var x = null, y = null
	if (pos) {
		x = pos[0]
		y = pos[1]
	}
	if ("left" in opts) { x = opts.left ; hanchor = 0 }
	if ("centerx" in opts) { x = opts.centerx ; hanchor = 0.5 }
	if ("right" in opts) { x = opts.right ; hanchor = 1 }
	if ("top" in opts) { y = opts.top ; vanchor = 1 }
	if ("centery" in opts) { y = opts.centery ; vanchor = 0.5 }
	if ("bottom" in opts) { y = opts.bottom ; vanchor = 0 }
	if (x == null || y == null) throw "Position insufficiently specified"

	var tbbox = this.gettexture(
		gl, text, fontsize, fontname, color, hanchor, margin, owidth, ocolor
	)
	var texture = tbbox[0], bbox = tbbox[1]
	gl.activeTexture(gl.TEXTURE0)
	gl.bindTexture(gl.TEXTURE_2D, texture)
	this.set({
		w: [gl.canvas.width, gl.canvas.height],
		p0: [x - bbox[2] - hanchor * bbox[4], y - bbox[3] - vanchor * bbox[5]],
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
	owidth: 1,
	ocolor: null,
	OUTLINE_UNITS: 1 / 24,
	hanchor: 0,
	vanchor: 0,
}
UFX.gltext.fontmargins = {
}

// Returns a 2-tuple of [texture, bounding box], where bounding box has 6 elements: texture width,
// texture height, x, y, w, h. The x, y, w, h are the effective subrectangle of where the text is
// drawn within the image, for the purpose of positioning.
UFX.gltext._gettexture = function (gl, text, fontsize, fontname, color, hanchor, margin, owidth, ocolor) {
	var key = [
		text, fontsize, fontname, color, hanchor, margin, owidth, ocolor
	].toString()
	if (this.textures[key]) return this.textures[key]
	var DEBUG = true

	var d = Math.ceil(margin * fontsize)
	var s = 1 * d  // line spacing
	var h = Math.ceil(fontsize)  // line height
	var mtop = d, mbottom = d, mleft = 0, mright = 0
	var lw = 0
	if (ocolor) {
		lw = Math.ceil(fontsize * owidth)
		mtop = Math.max(lw, mtop)
		mbottom = Math.max(lw, mbottom)
		mleft = Math.max(lw, mleft)
		mright = Math.max(lw, mright)
	}


	var canvas = document.createElement("canvas")
	var context = canvas.getContext("2d")
	context.font = fontsize + "px " + fontname
	var texts = text.split("\n")
	var n = texts.length
	var twidths = texts.map(t => context.measureText(t).width)
	var w0 = Math.max.apply(Math, twidths)
	var x0s = twidths.map(w => mleft + Math.round(hanchor * (w0 - w)))
	canvas.width = mleft + mright + w0
	canvas.height = mtop + mbottom + h * n + s * (n - 1)
	if (DEBUG) {
		context.fillStyle = "rgba(255,255,255,0.05)"
		context.fillRect(0, 0, canvas.width, canvas.height)
		for (var j = 0 ; j < n ; ++j) {
			context.fillStyle = "rgba(255,255,255,0.1)"
			context.fillRect(x0s[j], (s + h) * j, twidths[j], h + 2 * d)
			context.fillStyle = "rgba(255,255,255,0.15)"
			context.fillRect(x0s[j], d + (s + h) * j, twidths[j], h)
		}
	}

	// need to re-establish after changing canvas size
	context.font = fontsize + "px " + fontname
	context.textBaseline = "alphabetic"
	context.textAlign = "left"
	context.fillStyle = color
	if (ocolor) {
		context.strokeStyle = ocolor
		context.lineWidth = lw
	}
	texts.forEach(function (tline, j) {
		context.save()
		context.translate(x0s[j], d - s + (s + h) * (j + 1))
		if (ocolor) context.strokeText(tline, 0, 0)
		context.fillText(tline, 0, 0)
		if (DEBUG) {
			context.fillStyle = "white"
			context.fillRect(0, 0, 1, 1)
		}
		context.restore()
	})	
	var texture = gl.buildTexture({ source: canvas, npot: true, flip: true })
	var bbox = [canvas.width, canvas.height, 0, d, w0, -s + (s + h) * n]
	this.textures[key] = [texture, bbox]
	return this.textures[key]
}
