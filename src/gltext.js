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
uniform vec2 w, s, p0, c;
uniform float A;
void main() {
	mat2 R = mat2(cos(A), sin(A), -sin(A), cos(A));
	gl_Position = vec4((p0 + R * (p * s - c)) / w * 2.0 - 1.0, 0.0, 1.0);
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
	var gcolor = opts.gcolor || DEFAULT.gcolor
	var owidth = (opts.owidth || DEFAULT.owidth) * DEFAULT.OUTLINE_UNITS
	var ocolor = opts.ocolor || DEFAULT.ocolor
	var shadow = (opts.shadow || DEFAULT.shadow).map(a => a * DEFAULT.SHADOW_UNITS)
	var scolor = opts.scolor || DEFAULT.scolor
	var hanchor = "hanchor" in opts ? opts.hanchor : DEFAULT.hanchor
	var vanchor = "vanchor" in opts ? opts.vanchor : DEFAULT.vanchor
	var margin = opts.margin || UFX.gltext.fontmargins[fontname] || DEFAULT.margin

	var x = null, y = null
	if (pos) {
		x = pos[0]
		y = pos[1]
	}
	if ("topleft" in opts) {     opts.left    = opts.topleft[0]     ; opts.top     = opts.topleft[1]     }
	if ("midleft" in opts) {     opts.left    = opts.midleft[0]     ; opts.centery = opts.midleft[1]     }
	if ("bottomleft" in opts) {  opts.left    = opts.bottomleft[0]  ; opts.bottom  = opts.bottomleft[1]  }
	if ("midtop" in opts) {      opts.centerx = opts.midtop[0]      ; opts.top     = opts.midtop[1]      }
	if ("center" in opts) {      opts.centerx = opts.center[0]      ; opts.centery = opts.center[1]      }
	if ("midbottom" in opts) {   opts.centerx = opts.midbottom[0]   ; opts.bottom  = opts.midbottom[1]   }
	if ("topright" in opts) {    opts.right   = opts.topright[0]    ; opts.top     = opts.topright[1]    }
	if ("midright" in opts) {    opts.right   = opts.midright[0]    ; opts.centery = opts.midright[1]    }
	if ("bottomright" in opts) { opts.right   = opts.bottomright[0] ; opts.bottom  = opts.bottomright[1] }

	if ("left" in opts) { x = opts.left ; hanchor = 0 }
	if ("centerx" in opts) { x = opts.centerx ; hanchor = 0.5 }
	if ("right" in opts) { x = opts.right ; hanchor = 1 }
	if ("top" in opts) { y = opts.top ; vanchor = 1 }
	if ("centery" in opts) { y = opts.centery ; vanchor = 0.5 }
	if ("bottom" in opts) { y = opts.bottom ; vanchor = 0 }
	if (x == null || y == null) throw "Position insufficiently specified"

	var tbbox = this.gettexture(
		gl, text, fontsize, fontname, color, hanchor, margin,
		gcolor, owidth, ocolor, shadow, scolor
	)
	var texture = tbbox[0], bbox = tbbox[1]
	console.log(bbox)
	gl.activeTexture(gl.TEXTURE0)
	gl.bindTexture(gl.TEXTURE_2D, texture)
	this.set({
		w: [gl.canvas.width, gl.canvas.height],
		p0: [x, y],
		c: [bbox[2] + hanchor * bbox[4], bbox[3] + vanchor * bbox[5]],
		t: 0,
		s: [texture.width, texture.height],
		alpha: "alpha" in opts ? opts.alpha : DEFAULT.alpha,
		A: "rotation" in opts ? opts.rotation : DEFAULT.rotation,
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
	shadow: [1, 1],
	scolor: null,
	OUTLINE_UNITS: 1 / 24,
	SHADOW_UNITS: 1 / 24,
	hanchor: 0,
	vanchor: 0,
	alpha: 1,
	rotation: 0,
}
UFX.gltext.fontmargins = {
}

// Returns a 2-tuple of [texture, bounding box], where bounding box has 6 elements: texture width,
// texture height, x, y, w, h. The x, y, w, h are the effective subrectangle of where the text is
// drawn within the image, for the purpose of positioning.
UFX.gltext._gettexture = function (gl, text, fontsize, fontname, color, hanchor, margin, gcolor, owidth, ocolor, shadow, scolor) {
	var key = [
		text, fontsize, fontname, color, hanchor, margin,
		gcolor, owidth, ocolor, shadow, scolor
	].toString()
	if (this.textures[key]) return this.textures[key]
	var DEBUG = true

	var d = Math.ceil(margin * fontsize)
	var s = 1 * d  // line spacing
	var h = Math.ceil(fontsize)  // line height
	var lw = ocolor ? Math.ceil(fontsize * owidth) : 0
	var sx = scolor ? fontsize * shadow[0] : 0
	var sy = scolor ? fontsize * shadow[1] : 0
	var sb = scolor ? fontsize * (shadow[2] || 0) : 0

	var mtop = d, mbottom = d, mleft = 0, mright = 0
	mtop = Math.max(lw, mtop, -sy) + sb
	mbottom = Math.max(lw, mbottom, sy) + sb
	mleft = Math.max(lw, mleft, -sx) + sb
	mright = Math.max(lw, mright, sx) + sb

	var canvas = document.createElement("canvas")
	var context = canvas.getContext("2d")
	var font = fontsize + "px " + fontname
	context.font = font
	var texts = text.split("\n")
	var n = texts.length
	var twidths = texts.map(t => context.measureText(t).width)
	var w0 = Math.max.apply(Math, twidths)
	var x0s = twidths.map(w => mleft + Math.round(hanchor * (w0 - w)))
	var y0s = twidths.map((w, j) => mbottom + s * j + h * (j + 1))
	canvas.width = mleft + mright + w0
	canvas.height = mtop + mbottom + h * n + s * (n - 1)
	if (DEBUG) {
		context.fillStyle = "rgba(255,255,255,0.05)"
		context.fillRect(0, 0, canvas.width, canvas.height)
		for (var j = 0 ; j < n ; ++j) {
			context.fillStyle = "rgba(255,255,255,0.1)"
			context.fillRect(x0s[j], y0s[j] - h - d, twidths[j], h + 2 * d)
			context.fillStyle = "rgba(255,255,255,0.15)"
			context.fillRect(x0s[j], y0s[j] - h, twidths[j], h)
		}
	}

	// need to re-establish after changing canvas size
	context.font = font
	context.textBaseline = "alphabetic"
	context.textAlign = "left"
	if (gcolor) {
		var grad = context.createLinearGradient(0, 0, 0, -fontsize)
		grad.addColorStop(0, gcolor)
		grad.addColorStop(0.6, color)
		context.fillStyle = grad
	} else if (color) {
		context.fillStyle = color
	}
	if (ocolor) {
		context.strokeStyle = ocolor
		context.lineWidth = lw
	}
	texts.forEach(function (tline, j) {
		context.save()
		context.translate(x0s[j], y0s[j])
		if (DEBUG) {
			context.save()
			context.fillStyle = "white"
			context.fillRect(0, 0, 1, 1)
			context.restore()
		}
		if (ocolor) context.strokeText(tline, 0, 0)
		if (scolor) {
			context.shadowOffsetX = sx
			context.shadowOffsetY = sy
			context.shadowColor = scolor
			context.shadowBlur = sb
		}
		if (gcolor || color) context.fillText(tline, 0, 0)
		context.restore()
	})
	var texture = gl.buildTexture({ source: canvas, npot: true, flip: true, mag_filter: gl.LINEAR })
	var bbox = [canvas.width, canvas.height, mleft, mbottom, w0, h * n + s * (n - 1)]
	this.textures[key] = [texture, bbox]
	return this.textures[key]
}
