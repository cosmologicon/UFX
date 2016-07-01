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
	prog.drawbox = UFX.gltext._drawbox
	prog.clean = UFX.gltext._clean
	prog.gettexture = UFX.gltext._gettexture
	prog.texturedata = {
		textures: {},
		tick: 0,
		sizetotal: 0,
		fitcache: {},
	}
	prog.posbuffer = gl.makeArrayBuffer([0, 0, 1, 0, 0, 1, 1, 1])
	prog.assignAttribOffsets({ p: 0 })
	var use0 = prog.use
	prog.use = function () {
		use0.call(this)
		this.gl.enable(this.gl.BLEND)
		this.gl.disable(this.gl.DEPTH_TEST)
		this.gl.blendFuncSeparate(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA, 0, 1)
		this.posbuffer.bind()
		this.assignAttribOffsets({ p: 0 })
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
	a = p;
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
	var CONSTANTS = UFX.gltext.CONSTANTS
	var fontsize = opts.fontsize || DEFAULT.fontsize
	var fontname = opts.fontname || DEFAULT.fontname
	var color = opts.color || DEFAULT.color
	var gcolor = opts.gcolor || DEFAULT.gcolor
	var owidth = (opts.owidth || DEFAULT.owidth) * DEFAULT.OUTLINE_UNITS
	var ocolor = opts.ocolor || DEFAULT.ocolor
	var shadow = (opts.shadow || DEFAULT.shadow).map(function (a) { return a * DEFAULT.SHADOW_UNITS })
	var scolor = opts.scolor || DEFAULT.scolor
	var hanchor = "hanchor" in opts ? opts.hanchor : DEFAULT.hanchor
	var vanchor = "vanchor" in opts ? opts.vanchor : DEFAULT.vanchor
	var margin = "margin" in opts ? opts.margin : (UFX.gltext.fontmargins[fontname] || DEFAULT.margin)
	var lineheight = "lineheight" in opts ? opts.lineheight : DEFAULT.lineheight
	var width = opts.width

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

	var align = hanchor
	if ("align" in opts) {
		switch (opts.align) {
			case "left": align = 0 ; break
			case "center": align = 0.5 ; break
			case "right": align = 1 ; break
			default: align = opts.align
		}
	}

	var tbbox = this.gettexture(
		gl, text, fontsize, fontname, align, margin, width, lineheight,
		color, gcolor, owidth, ocolor, shadow, scolor
	)
	tbbox[3] = ++this.texturedata.tick
	var texture = tbbox[0], bbox = tbbox[1]
	var rotation = "rotation" in opts ? opts.rotation : DEFAULT.rotation
	var alpha = Math.min(Math.max("alpha" in opts ? opts.alpha : DEFAULT.alpha, 0), 1)

	gl.activeTexture(gl.TEXTURE0)
	gl.bindTexture(gl.TEXTURE_2D, texture)
	
	this.set({
		w: [gl.canvas.width, gl.canvas.height],
		p0: [x, y],
		c: [bbox[2] + hanchor * bbox[4], bbox[3] + vanchor * bbox[5]],
		t: 0,
		s: [texture.width, texture.height],
		alpha: alpha,
		A: rotation * CONSTANTS.RADIANS_PER_ROTATION_UNIT % (2 * Math.PI),
	})
	gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
	if (CONSTANTS.AUTO_CLEAN) this.clean()
}
UFX.gltext._drawbox = function (text, box, opts) {
	opts = opts ? Object.create(opts) : {}
	var DEFAULT = UFX.gltext.DEFAULT
	if (!opts.fontname) opts.fontname = DEFAULT.fontname
	//if (!("margin" in opts)) opts.margin = (UFX.gltext.fontmargins[fontname] || DEFAULT.margin)
	if (!("lineheight" in opts)) opts.lineheight = DEFAULT.lineheight
	opts.width = box[2]
	opts.fontsize = UFX.gltext._fitsize(text, opts.fontname, box[2], box[3], opts.lineheight)
	var hanchor = "hanchor" in opts ? opts.hanchor : DEFAULT.hanchor
	var vanchor = "vanchor" in opts ? opts.vanchor : DEFAULT.vanchor
	var x = box[0] + hanchor * box[2], y = box[1] + vanchor * box[3]
	this.draw(text, [x, y], opts)
}
UFX.gltext._fitcache = {}
UFX.gltext._fitsize = function (text, fontname, width, height, lineheight) {
	var key = [text, fontname, width, height, lineheight].toString()
	if (this._fitcache[key]) return this._fitcache[key]
	var canvas = document.createElement("canvas")
	var context = canvas.getContext("2d")
	function fits(fontsize) {
		context.font = fontsize + "px " + fontname
		var texts = UFX.gltext._split(context, text, width)
		var wmax = Math.max.apply(Math, texts.map(function (line) { return context.measureText(line).width }))
		if (wmax > width) return false
		var n = texts.length
		var s = (lineheight - 1) * fontsize, h = fontsize
		return s * (n - 1) + h * n <= height
	}
	var a = 1, b = 2, fontsize
	if (fits(a)) {
		while (fits(b)) {
			a = b
			b <<= 1
		}
		while (b - a > 1) {
			var c = Math.floor((a + b) / 2)
			if (fits(c)) {
				a = c
			} else {
				b = c
			}
		}
	}
	this._fitcache[key] = a
	return a
}

UFX.gltext._split = function (context, text, width) {
	var texts = []
	function twidth(line) {
		return context.measureText(line).width
	}
	function addline(line) {
		if (!width || twidth(line) <= width || !line.includes(" ")) { texts.push(line) ; return }
		var i = line.indexOf(" "), j
		while ((j = line.indexOf(" ", i + 1)) != -1) {
			if (twidth(line.slice(0, j)) > width) break
			i = j
		}
		texts.push(line.slice(0, i))
		addline(line.slice(i + 1))
	}
	text.split("\n").forEach(addline)
	return texts
}
UFX.gltext._clean = function () {
	var CONSTANTS = UFX.gltext.CONSTANTS
	var tdata = this.texturedata, textures = tdata.textures
	if (tdata.sizetotal < CONSTANTS.MEMORY_LIMIT_MB * (1 << 20)) return
	if (CONSTANTS.MEMORY_LIMIT_MB <= 0) {
		for (var key in textures) {
			this.gl.deleteTexture(textures[key][0])
		}
		tdata.textures = {}
		tdata.sizetotal = 0
	} else {
		var keys = Object.keys(textures)
		keys.sort(function (a, b) { return textures[b][3] - textures[a][3] })
		var limit = CONSTANTS.MEMORY_LIMIT_MB * (1 << 20)
		if (tdata.sizetotal < limit) return
		limit *= CONSTANTS.MEMORY_REDUCTION_FACTOR
		while (tdata.sizetotal > limit && keys.length) {
			var key = keys.pop()
			tdata.sizetotal -= textures[key][2]
			this.gl.deleteTexture(textures[key][0])
			delete tdata.textures[key]
		}
	}
}
UFX.gltext.DEFAULT = {
	fontsize: 18,
	fontname: "sans-serif",
	color: "#CCCCCC",
	margin: 0.2,
	lineheight: 1,
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
UFX.gltext.CONSTANTS = {
	RADIANS_PER_ROTATION_UNIT: Math.PI / 180,
	AUTO_CLEAN: true,
	MEMORY_LIMIT_MB: 64,
	MEMORY_REDUCTION_FACTOR: 0.5,
}
UFX.gltext.fontmargins = {
}

// Returns a 2-tuple of [texture, bounding box], where bounding box has 6 elements: texture width,
// texture height, x, y, w, h. The x, y, w, h are the effective subrectangle of where the text is
// drawn within the image, for the purpose of positioning.
UFX.gltext._gettexture = function (gl,
	text, fontsize, fontname, align, margin, width, lineheight,
	color, gcolor, owidth, ocolor, shadow, scolor) {
	var key = [
		text, fontsize, fontname, align, margin, width, lineheight,
		color, gcolor, owidth, ocolor, shadow, scolor
	].toString()
	if (this.texturedata.textures[key]) return this.texturedata.textures[key]
	var DEBUG = false

	var d = Math.ceil(margin * fontsize)
	var s = Math.ceil((lineheight - 1) * fontsize)  // line spacing
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
	var texts = UFX.gltext._split(context, text, width)
	var n = texts.length
	var twidths = texts.map(function (line) { return context.measureText(line).width })
	var w0 = Math.max.apply(Math, twidths)
	var x0s = twidths.map(function (w) { return mleft + Math.round(align * (w0 - w)) })
	var y0s = twidths.map(function (w, j) { return mbottom + s * j + h * (j + 1) })
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
	var texture = gl.buildTexture({ source: canvas, npot: true, flip: true, filter: gl.LINEAR })
	var bbox = [canvas.width, canvas.height, mleft, mbottom, w0, h * n + s * (n - 1)]
	var size = 4 * canvas.width * canvas.height
	this.texturedata.sizetotal += size
	var ret = this.texturedata.textures[key] = [texture, bbox, size, null]
	return ret
}
