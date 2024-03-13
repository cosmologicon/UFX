// UFX.maximize: expand a canvas to take up the whole window or screen

// Dev note: for handlers and internal methods (with the leading underscore),
// assume that this === UFX.maximize, but don't assume this for public methods.
// Handlers are bound to UFX.maximize.

"use strict"
var UFX = UFX || {}

UFX.maximize = function (element, options) {
	UFX.maximize._addlisteners()
	if (element !== UFX.maximize.element) {
		UFX.maximize._takedown()
		UFX.maximize._setup(element)
	}
	UFX.maximize.setoptions(options || {})
}
UFX.maximize.stop = function () {
	if (UFX.maximize.isfullscreen()) document.exitFullscreen()
	UFX.maximize._unsetstyle()
	UFX.maximize._takedown()
	UFX.maximize._removelisteners()
}

UFX.maximize._options0 = {
	stretch: true,
	resize: true,
	aspects: [0],
	exact: false,
	free: false,
	preventscroll: true,
	fullscreen: false,
	mustfullscreen: false,
	fillcolor: "black",
	applypixelratio: true,
}

// Associate UFX.maximize.element with UFX.maximize. Save the element style values and other values
// we'll be overwriting so that they can be restored later if UFX.maximize.stop is called.
UFX.maximize._setup = function (element) {
	this.element = element
	var options = this.options, style = element.style
	this.size0 = [element.width, element.height]
	var style0 = this._style0 = {}
	;"position left top bottom right margin width height borderLeft borderRight borderTop borderBottom".
		split(" ").forEach(function (sname) {
		style0[sname] = style[sname]
	})
	this._overflow0 = document.body.style.overflow
}
// Remove the association between UFX.maximize.element and UFX.maximize.
UFX.maximize._takedown = function () {
	if (!this.element) return
	this.element.width = this.size0[0]
	this.element.height = this.size0[1]
	for (var sname in this._style0) {
		this.element.style[sname] = this._style0[sname]
	}
	document.body.style.overflow = this._overflow0
	delete this.element
}

UFX.maximize._addlisteners = function () {
	if (this._listeners) return
	window.addEventListener("resize", UFX.maximize.onresize)
	window.addEventListener("fullscreenchange", UFX.maximize.onfullscreenchange)
	window.addEventListener("fullscreenerror", UFX.maximize.onfullscreenerror)
	document.body.addEventListener("touchstart", UFX.maximize.ontouchstart, { passive: false })
	this._listeners = true
}
UFX.maximize._removelisteners = function () {
	if (!this._listeners) return
	window.removeEventListener("resize", UFX.maximize.onresize)
	window.removeEventListener("fullscreenchange", UFX.maximize.onfullscreenchange)
	window.removeEventListener("fullscreenerror", UFX.maximize.onfullscreenerror)
	document.body.removeEventListener("touchstart", UFX.maximize.ontouchstart)
	this._listeners = false
}

UFX.maximize.getfullscreenelement = function () {
	return document.fullscreenElement
}
UFX.maximize.isfullscreen = function () {
	return UFX.maximize.element === UFX.maximize.getfullscreenelement()
}

UFX.maximize.setoptions = function (options) {
	for (var oname in options) {
		switch (oname) {
			case "aspects":
				UFX.maximize._checkaspects(options.aspects)
			case "stretch": case "resize": case "exact": case "free":
			case "preventscroll": case "fullscreen": case "mustfullscreen": case "fillcolor":
			case "applypixelratio":
				UFX.maximize.options[oname] = options[oname]
				break
			case "aspect":
				UFX.maximize._checkaspects([options.aspect])
				UFX.maximize.options.aspects = [options.aspect]
				break
			default:
				throw "Unrecgonized option to UFX.maximize: " + oname
		}
	}
	if (UFX.maximize.element) UFX.maximize._maximize()
}
UFX.maximize.resetoptions = function (options) {
	UFX.maximize.options = JSON.parse(JSON.stringify(UFX.maximize._options0))
	UFX.maximize.setoptions(options || {})
}
UFX.maximize.resetoptions()


UFX.maximize._checkaspects = function (aspects) {
	if (!(aspects instanceof Array)) throw "UFX.maximize aspect list must be an Array"
	if (aspects.length < 1) throw "UFX.maximize aspect list must not be empty"
	aspects.forEach(function (aspect) {
		if (typeof aspect == "number") return
		if (aspect instanceof Array && aspect.length == 2 &&
			typeof(aspect[0]) == "number" && typeof(aspect[1]) == "number") return
		throw "Invalid aspect " + aspect + " must be Number or [Number, Number]"
	})
}


// Setup and setoptions should already be called.
UFX.maximize._maximize = function () {
	this._unsetstyle()
	if (this.options.fullscreen) {
		this._fullscreen()
	} else {
		if (this.isfullscreen()) document.exitFullscreen()
		this._fillscreen()
	}
}
UFX.maximize._fullscreen = function () {
	if (this.isfullscreen()) {
		this.onresize()
	} else if (this.element.requestFullscreen) {
		this.element.requestFullscreen()
	} else {
		this.onfullscreenerror()
	}
}
UFX.maximize.onfullscreenchange = function () {
	if (this.isfullscreen()) {
		this.onresize()
	} else {
		this.onfullscreenerror()
	}
}.bind(UFX.maximize)
UFX.maximize.onfullscreenerror = function () {
	if (this.options.mustfullscreen) {
		this.stop()
	} else {
		this._fillscreen()
	}
}.bind(UFX.maximize)
UFX.maximize._fillscreen = function () {
	this._setstyle()
	this.onresize()
}
// Set a few style values necessary for filling the window.
UFX.maximize._setstyle = function () {
	this.element.style.position = "absolute"
	this.element.style.left = "0px"
	this.element.style.top = "1px"
	document.body.style.overflow = "hidden"
}
UFX.maximize._unsetstyle = function () {
	this.element.style.position = this._style0.position
	this.element.style.left = this._style0.left
	this.element.style.top = this._style0.top
	document.body.style.overflow = this._overflow0
}


UFX.maximize.size = {}
UFX.maximize.scale = {}

// Resize handler - called whenever the window size changes.
// Chooses the dimensions of UFX.maximize.element and updates the border to fill the window.
UFX.maximize.onresize = function () {
	var options = this.options, element = this.element
	if (!element) return
	if (options.mustfullscreen && !this.isfullscreen()) return
	var wx = window.innerWidth, wy = window.innerHeight

	// Greatest common divisor.
	function gcd(a, b) {
		return b == 0 ? a : gcd(b, a % b)
	}
	// Given [a,b], return [x,y] such that x/y is a/b in simplest form.
	function reduced(aspect) {
		var a = aspect[0], b = aspect[1], g = gcd(a, b)
		return [a / g, b / g]
	}

	// Given an aspect ratio, determine the maximum element size that corresponds to it and fits
	// inside the window. (Returns null if the window is too small and exact is requested.)
	function getsize(wx, wy, aspect, exact) {
		var ispair = aspect instanceof Array
		if (ispair && !exact) {
			aspect = aspect[0] / aspect[1]
			ispair = false
		}
		if (ispair) {
			var a = reduced(aspect), x = a[0], y = a[1]
			var n = Math.floor(Math.min(wx / x, wy / y))
			return n ? [x * n, y * n] : null
		} else {
			if (aspect == -1) return [wx, wy]
			return wy * aspect > wx
				? [wx, Math.round(wx / aspect)]
				: [Math.round(wy * aspect), wy]
		}
	}
	// TODO: for options.free allow limits on the range of acceptable aspect ratios.
	var aspects = options.free ? [-1] : options.aspects
	if (!aspects.length) throw "No aspect ratio options specified. Must have at least 1."
	// Choose the aspect ratio that results in the largest element size (in terms of total area)
	var Dsize = null  // display size, ie, how big to style the element
	var area = 0, aspect = null
	for (var j = 0 ; j < aspects.length ; ++j) {
		// Treat the special value 0 as the original canvas size.
		var trialaspect = aspects[j] || this.size0
		var trialsize = getsize(wx, wy, trialaspect, options.exact)
		if (!trialsize) continue
		var trialarea = trialsize[0] * trialsize[1]
		if (trialarea > area) {
			Dsize = trialsize
			area = trialarea
			aspect = trialaspect
		}
	}
	// In the event that no aspect ratio is chosen (because the window was too small for all of
	// them), fall back to the first aspect ratio in the list, and let it be larger than the window.
	if (Dsize === null) {
		aspect = aspects[0] || this.size0
		Dsize = reduced(aspect)
	}

	var Lsize = Dsize.slice()  // element logical dimensions, i.e. height/width values
	if (options.applypixelratio) {
		Lsize[0] = Math.floor(Lsize[0] * window.devicePixelRatio)
		Lsize[1] = Math.floor(Lsize[1] * window.devicePixelRatio)
	}
	if (!options.resize) {
		Lsize = this.size0
		if (!options.stretch) Dsize = this.size0
	}
	element.width = Lsize[0]
	element.height = Lsize[1]
	element.style.width = Dsize[0] + "px"
	element.style.height = Dsize[1] + "px"
	
	UFX.maximize.size = {
		D: Dsize,
		L: Lsize,
		A: aspect,
	}
	UFX.maximize.scale = {
		DL: [Dsize[0] / Lsize[0], Dsize[1] / Lsize[1]],
		LD: [Lsize[0] / Dsize[0], Lsize[1] / Dsize[1]],
		AL: aspect instanceof Array ? [aspect[0] / Lsize[0], aspect[1] / Lsize[1]] : null,
		LA: aspect instanceof Array ? [Lsize[0] / aspect[0], Lsize[1] / aspect[1]] : null,
		AD: aspect instanceof Array ? [aspect[0] / Dsize[0], aspect[1] / Dsize[1]] : null,
		DA: aspect instanceof Array ? [Dsize[0] / aspect[0], Dsize[1] / aspect[1]] : null,
	}

	var bx = wx - Dsize[0], by = wy - Dsize[1]
	var left = Math.ceil(bx / 2), right = bx - left
	var top = Math.ceil(by / 2), bottom = by - top
	element.style.borderLeft = left + "px " + options.fillcolor + " solid"
	element.style.borderRight = right + "px " + options.fillcolor + " solid"
	element.style.borderTop = top + "px " + options.fillcolor + " solid"
	element.style.borderBottom = bottom + "px " + options.fillcolor + " solid"
	// TODO: document why this is here. Something on mobile I think?
	setTimeout(function () { window.scrollTo(0, 1) }, 1)
	if (this.onadjust) {
		this.onadjust(element, element.width, element.height, aspect)
	}
}.bind(UFX.maximize)

UFX.maximize.ontouchstart = function (event) {
	if (this.element && this.options.preventscroll) event.preventDefault()
}.bind(UFX.maximize)



// Deprecated usage
// TODO: find everyone who's calling these and update them.
UFX.maximize.fill = function (element, mode) {
	UFX.maximize(element, {
		none: { resize: false, stretch: false },
		fixed: { resize: false },
		aspect: {},
		total: { free: true },
	}[mode])
}
UFX.maximize.full = function (element, mode) {
	UFX.maximize(element, {
		none: { fullscreen: true, resize: false, stretch: false },
		fixed: { fullscreen: true, resize: false },
		aspect: { fullscreen: true },
		total: { fullscreen: true, free: true },
	}[mode])
}

