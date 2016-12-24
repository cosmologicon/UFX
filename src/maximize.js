// UFX.maximize: expand a canvas to take up the whole window or screen

// UFX.maximize(element, options)
// Options:
//   stretch
//   resize
//   

// For more details, see the UFX.maximize documentation at:
// https://github.com/cosmologicon/UFX/wiki

"use strict"
var UFX = UFX || {}

UFX.maximize = function (element, options) {
	window.addEventListener("resize", UFX.maximize.onresize)
	window.addEventListener("fullscreenchange", UFX.maximize.onfullscreenchange)
	window.addEventListener("fullscreenerror", UFX.maximize.onfullscreenerror)
	document.body.addEventListener("touchstart", UFX.maximize.ontouchstart)

	if (element !== UFX.maximize.state.element) {
		UFX.maximize.takedown()
		UFX.maximize.element = element
		UFX.maximize.setup()
	}
	UFX.maximize.setoptions(options || {})
}
UFX.maximize.state0 = {
	// Control of resizing
	stretch: true,
	resize: true,
	aspects: [0],
	aspect0: null,
	exact: false,
	free: false,

	preventscroll: true,
	fullscreen: false,
	mustfullscreen: false,
	fillcolor: "black",
}
UFX.maximize.resetoptions = function () {
	UFX.maximize.state = JSON.parse(JSON.stringify(UFX.maximize.state0))
}
UFX.maximize.resetoptions()
// Associate UFX.maximize.element with UFX.maximize. Save the element style values so that they can
// be restored later if UFX.maximize.stop is called.
UFX.maximize.setup = function () {
	var state = UFX.maximize.state, element = UFX.maximize.element, style = element.style
	state.aspect0 = [element.width, element.height]
	UFX.maximize.style0 = {}
	;"position left top bottom right margin width height borderLeft borderRight borderTop borderBottom".
		split(" ").forEach(function (sname) {
		UFX.maximize.style0[sname] = style[sname]
	})
	UFX.maximize.overflow0 = document.body.style.overflow
}
// Remove the association between UFX.maximize.state.element and UFX.maximize.
UFX.maximize.takedown = function () {
	if (!UFX.maximize.element) return
	var state = UFX.maximize.state, element = UFX.maximize.element, style = element.style
	element.width = state.aspect0[0]
	element.height = state.aspect0[1]
	for (var sname in UFX.maximize.style0) {
		style[sname] = UFX.maximize.style0[sname]
	}
	document.body.style.overflow = UFX.maximize.overflow0
	delete UFX.maximize.element
}

// 
UFX.maximize.stop = function () {
	UFX.maximize.takedown()
	window.removeEventListener("resize", UFX.maximize.onresize)
	window.removeEventListener("fullscreenchange", UFX.maximize.onfullscreenchange)
	window.removeEventListener("fullscreenerror", UFX.maximize.onfullscreenerror)
	document.body.removeEventListener("touchstart", UFX.maximize.ontouchstart)
}

UFX.maximize.getfullscreenelement = function () {
	return document.fullscreenElement
}
UFX.maximize.setoptions = function (options) {
	var state = UFX.maximize.state
	for (var oname in options) {
		switch (oname) {
			case "aspects":
				UFX.maximize.checkaspects(options.aspects)
			case "stretch": case "resize": case "exact": case "free":
			case "preventscroll": case "fullscreen": case "mustfullscreen": case "fillcolor":
				state[oname] = options[oname]
				break
			default:
				throw "Unrecgonized option to UFX.maximize: " + oname
		}
	}

	var element = UFX.maximize.element, style = element.style
	var fullscreened = element === UFX.maximize.getfullscreenelement()
	if (state.fullscreen && fullscreened) {
		UFX.maximize.onresize()
	} else if (state.fullscreen && !fullscreened) {
		UFX.maximize.tofill = !state.mustfullscreen
		if (element.requestFullscreen) {
			element.requestFullscreen()
		} else {
			UFX.maximize.onfullscreenerror()
		}
	} else {
		UFX.maximize.fillscreen()
	}
}

UFX.maximize.onfullscreenchange = function () {
	var fullscreened = UFX.maximize.element === UFX.maximize.getfullscreenelement()
	if (fullscreened) {
		UFX.maximize.onresize()
	} else {
		UFX.maximize.onfullscreenerror()
	}
}.bind(UFX.maximize)
UFX.maximize.onfullscreenerror = function () {
	if (UFX.maximize.tofill) {
		UFX.maximize.fillscreen()
	} else {
		UFX.maximize.stop()
	}
	delete UFX.maximize.tofill
}.bind(UFX.maximize)
UFX.maximize.fillscreen = function () {
	var style = UFX.maximize.element.style
	style.position = "absolute"
	style.left = "0px"
	style.top = "1px"
	document.body.style.overflow = "hidden"
	UFX.maximize.onresize()
}


UFX.maximize.checkaspects = function (aspects) {
	if (!(aspects instanceof Array)) throw "UFX.maximize aspect list must be an Array"
	if (aspects.length < 1) throw "UFX.maximize aspect list must not be empty"
	aspects.forEach(function (aspect) {
		if (typeof aspect == "number") return
		if (aspect instanceof Array && aspect.length == 2 &&
			typeof(aspect[0]) == "number" && typeof(aspect[1]) == "number") return
		throw "Invalid aspect " + aspect + " must be Number or [Number, Number]"
	})
}
// Resize handler - called whenever the window size changes.
// Chooses the dimensions of UFX.maximize.element and updates the border to fill the window.
UFX.maximize.onresize = function () {
	var state = this.state, element = this.element
	if (!element) return
	if (state.mustfullscreen && element !== this.getfullscreenelement()) return
	var wx = window.innerWidth, wy = window.innerHeight

	function gcd(a, b) {
		return b == 0 ? a : gcd(b, a % b)
	}
	function reduced(aspect) {
		var a = aspect[0], b = aspect[1], g = gcd(a, b)
		return [a / g, b / g]
	}

	// Given an aspect ratio, determine the maximum element size that corresponds to it and fits
	// inside the window. (Returns null if the window is too small and exact is requested.)
	function getesize(wx, wy, aspect, exact) {
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
	var aspects = state.free ? [-1] : state.aspects
	if (!aspects.length) throw "No aspect ratio options specified. Must have at least 1."
	// Choose the aspect ratio that results in the largest element size (in terms of total area)
	var esize = null  // element logical dimensions, i.e. height/width values
	var area = 0, aspect = null
	for (var j = 0 ; j < aspects.length ; ++j) {
		var trialaspect = aspects[j]
		if (trialaspect == 0) trialaspect = state.aspect0
		var trialesize = getesize(wx, wy, trialaspect, state.exact)
		if (!trialesize) continue
		var trialarea = trialesize[0] * trialesize[1]
		if (trialarea > area) {
			esize = trialesize
			area = trialarea
			aspect = trialaspect
		}
	}
	// In the event that no aspect ratio is chosen (because the window was too small for all of
	// them), fall back to the first apsect ratio in the list, and let it be larger than the window.
	if (!esize) {
		apsect = aspects[0]
		esize = reduced(aspect)
	}

	var ssize  // stretched size, ie, how big to style the element
	if (state.resize) {
		ssize = esize
	} else if (state.stretch) {
		ssize = esize
		esize = state.aspect0
	} else {
		ssize = esize = state.aspect0
	}
	element.width = esize[0]
	element.height = esize[1]
	element.style.width = ssize[0] + "px"
	element.style.height = ssize[1] + "px"

	if (element === this.getfullscreenelement()) {
		element.style.top = element.style.bottom = 0
		element.style.left = element.style.right = 0
		element.style.margin = "auto"
		element.style.borderLeft = element.style.borderRight = "none"
		element.style.borderTop = element.style.borderBottom = "none"
	} else {
		element.style.borderLeft = element.style.borderRight = wx > ssize[0]
			? ((wx - ssize[0]) / 2 + 1) + "px " + state.fillcolor + " solid"
			: "none"
		element.style.borderTop = element.style.borderBottom = wy > ssize[1]
			? ((wy - ssize[1]) / 2 + 1) + "px " + state.fillcolor + " solid"
			: "none"
		// TODO: document why this is here
		setTimeout(function () { window.scrollTo(0, 1) }, 1)
	}
	if (this.onadjust) {
		this.onadjust(element, element.width, element.height, aspect)
	}
}.bind(UFX.maximize)

UFX.maximize.ontouchstart = function (event) {
	if (this.element && this.state.preventscroll) event.preventDefault()
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

