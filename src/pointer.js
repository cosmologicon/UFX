// UFX.pointer module
// Abstracts away interface for games that can use either mouse or touch.

// For simplicity, only one action can be taken at a time. If multiple actions start occurring
// simultaneously (eg right mouse button is clicked while left mouse button is being held), then
// we'll just wait until everything is over before reporting events.

"use strict"
var UFX = UFX || {}

UFX.pointer = function (element) {
	UFX.pointer._state.updatenoevent()
	var state = UFX.pointer._state
	var pstate = {
		wheel: state.getwheel(),
		pinch: state.getpinch(),
	}
	if (element && element !== UFX.pointer._element) {
		UFX.pointer._handlers.setelement(element)
		state.reset()
		return pstate
	}
	state.shiftevents().forEach(function (event) {
		var ptype = event.ptype == "p" ? "" : event.ptype
		pstate[ptype + event.etype] = event
		UFX.pointer.pos = event.pos
	})
	if (state.current) {
		pstate.current = state.current == "l" || state.current == "t" ? "p" : state.current
		var ptype = pstate.current == "p" ? "" : pstate.current
		pstate[ptype + "isdown"] = true
		if (UFX.pointer._state.currentisheld()) pstate[ptype + "isheld"] = true
	}
	if (UFX.pointer.pos) {
		pstate.pos = UFX.pointer.pos
		if (state.posL) {
			pstate.dpos = UFX.pointer._util.dpos(state.posL, UFX.pointer.pos)
		}
		if (UFX.pointer.within) pstate.within = true
	}
	state.posL = UFX.pointer.pos
	return pstate
}

// UFX.pointer options

// Whether to round reported positions to the nearest integer number of pixels.
UFX.pointer.roundpos = true

// Whether to keep the regular browser default behavior of opening a context menu on right click.
UFX.pointer.allowcontextmenu = false

// Hold thresholds
UFX.pointer.thold = 0.5
UFX.pointer.rhold = 5

// Pinch thresholds
UFX.pointer.spinch = 0  // Required change in separation
UFX.pointer.lpinch = 0.25  // Required change in log(separation)
// Tilt threshold
UFX.pointer.atilt = 10  // Required change in tilt

UFX.pointer._util = {
	dpos: function (pos0, pos1) {
		return [pos1[0] - pos0[0], pos1[1] - pos0[1]]
	},
	sep: function (pos0, pos1) {
		var p = UFX.pointer._util.dpos(pos0, pos1)
		return Math.sqrt(p[0] * p[0] + p[1] * p[1])
	},
	avgpos: function (pos0, pos1) {
		return [(pos1[0] + pos0[0]) / 2, (pos1[1] + pos0[1]) / 2]
	},
	tilt: function (pos0, pos1) {
		var dx = pos1[0] - pos0[0], dy = pos1[1] - pos0[1]
		return dx && dy ? Math.atan2(dx, -dy) * 180 / Math.PI : 0
	},
	// Map to range [0, 360)
	normtilt: function (tilt) {
		return (tilt % 360 + 360) % 360
	},
	// Round toward zero.
	dtilt: function (tilt0, tilt1) {
		return ((tilt1 - tilt0 + 180) % 360 + 360) % 360 - 180
	},
	jointouchlists: function (tlist1, tlist2) {
		var list = []
		list.push.apply(list, tlist1)
		list.push.apply(list, tlist2)
		return list
	},
}

UFX.pointer._handlers = {
	etypes: [
		"mousedown", "mouseup", "click", "dblcick", "wheel",
		"mousemove", "mouseover", "mouseout",
		"touchstart", "touchend", "touchmove", "touchcancel",
		"contextmenu",
	],

	setelement: function (element) {
		if (UFX.pointer._element) this.removelisteners(UFX.pointer._element)
		UFX.pointer._element = element
		this.addlisteners(element)
	},

	// Capture all event types for the given element.
	addlisteners: function (element) {
		this.etypes.forEach(function (etype) {
			element.addEventListener(etype, UFX.pointer._handlers[etype])
			document.addEventListener(etype, UFX.pointer._handlers["document" + etype])
		})
	},
	removelisteners: function (element) {
		this.etypes.forEach(function (etype) {
			element.removeEventListener(etype, UFX.pointer._handlers[etype])
			document.removeEventListener(etype, UFX.pointer._handlers["document" + etype])
		})
	},

	contextmenu: function (event) {
		if (!UFX.pointer.allowcontextmenu) {
			event.preventDefault()
			return false
		}
	},

	// Mouse handlers
	mousedown: function (event) {
		var spec = UFX.pointer._handlers.getbuttonspec(event)
		UFX.pointer._state.startbutton(spec)
		UFX.pointer._state.updatepos(spec.pos)
	},
	documentmousemove: function (event) {
		var spec = UFX.pointer._handlers.getbuttonspec(event)
		if (event.buttons) UFX.pointer._state.updatebutton(spec)
		UFX.pointer._state.updatepos(spec.pos)
	},
	documentmouseup: function (event) {
		var spec = UFX.pointer._handlers.getbuttonspec(event)
		UFX.pointer._state.endbutton(spec)
		UFX.pointer._state.updatepos(spec.pos)
	},
	mouseout: function (event) {
		UFX.pointer._state.updatepos(UFX.pointer._handlers.getpos(event))
	},
	mouseover: function (event) {
		UFX.pointer._state.updatepos(UFX.pointer._handlers.getpos(event))
	},
	wheel: function (event) {
		UFX.pointer._state.updatepos(UFX.pointer._handlers.getpos(event))
		UFX.pointer._state.addwheel(event.deltaX, event.deltaY, event.deltaZ)
	},

	// Touch handlers
	touchstart: function (event) {
		var spec = UFX.pointer._handlers.gettouchspec(event.touches)
		if (spec == null) {
			UFX.pointer._state.bork()
			return
		}
		UFX.pointer._state.startbutton(spec)
		UFX.pointer._state.updatepos(spec.pos)
		event.preventDefault()
	},
	touchmove: function (event) {
		event.preventDefault()
	},
	touchend: function (event) {
		event.preventDefault()
	},
	documenttouchmove: function (event) {
		var spec = UFX.pointer._handlers.gettouchspec(event.touches)
		if (spec == null) {
			UFX.pointer._state.bork()
			return
		}
		UFX.pointer._state.updatebutton(spec)
		UFX.pointer._state.updatepos(spec.pos)
	},
	documenttouchend: function (event) {
		var touches = UFX.pointer._util.jointouchlists(event.targetTouches, event.changedTouches)
		var spec = UFX.pointer._handlers.gettouchspec(touches)
		if (spec == null) {
			UFX.pointer._state.bork()
			return
		}
		UFX.pointer._state.endbutton(spec)
		UFX.pointer._state.updatepos(spec.pos)
	},
	documenttouchcancel: function (event) {
		var spec = UFX.pointer._handlers.gettouchspec(event.touches)
		if (spec) {
			UFX.pointer._state.cancelbutton(spec)
			UFX.pointer._state.updatepos(spec.pos)
		}
	},

	getbuttonspec: function (event) {
		var button = "lmr"[event.button]
		if (!button) throw "Unknown button type: " + event.button
		return {
			ptype: button,
			pos: this.getpos(event),
		}
	},
	gettouchspec: function (touches) {
		if (touches.length == 1) {
			return {
				ptype: "t",
				pos: this.getpos(touches[0]),
			}
		} else if (touches.length == 2) {
			var t0 = this.getpos(touches[0]), t1 = this.getpos(touches[1])
			return {
				ptype: "d",
				pos: UFX.pointer._util.avgpos(t0, t1),
				sep: UFX.pointer._util.sep(t0, t1),
				tilt: UFX.pointer._util.tilt(t0, t1),
			}
		} else {
			return null
		}
	},

	// Position of the given object obj (which is either an event or a Touch object) with respect to
	// _element.
	getpos: function (obj) {
		var element = UFX.pointer._element
		var rect = element.getBoundingClientRect()
		var ex = rect.left + element.clientLeft - element.scrollLeft
		var ey = rect.top + element.clientTop - element.scrollTop
		var x = obj.clientX - ex, y = obj.clientY - ey
		return [x, y]
		//return UFX.pointer.roundpos ? [Math.round(x), Math.round(y)] : [x, y]
	},
}

UFX.pointer._state = {
	// Current event type being watched. Can be one of null, "l", "m", "r", "t", "d", "b"
	// Invariants:
	// When current == null, buttons and touchpoints are empty.
	// When current == "l", keys(buttons) == ["l"], and touchpoints is empty.
	//   similarly with "m" and "r".
	// When current == "t", buttons is empty and len(touchpoints) == 1
	// When current == "d", buttons is empty and len(touchpoints) == 2
	// For all other situations, current == "b" and borked == true
	current: null,
	borked: false,
	// Mouse buttons currently down.
	buttons: {},
	nbutton: 0,
	// Touch points currently active.
	touchpoints: {},
	ntouchpoint: 0,
	// event queue
	events: [],
	// wheel values
	wheel: {},
	pinch: null,

	// Called when a new element is assigned.
	reset: function () {
		UFX.pointer.pos = null
		UFX.pointer.within = false
		this.current = null
		this.borked = false
		this.buttons = {}
		this.nbutton = 0
		this.touchpoints = {}
		this.ntouchpoint = 0
		this.events = []
		this.wheel = {}
		this.pinch = null
	},

	addevent: function (etype, ptype, spec0) {
		if (this.borked) return
		var spec = {}
		if (spec0) {
			for (var s in spec0) spec[s] = spec0[s]
		}
		spec.t = Date.now()
		spec.etype = etype
		spec.ptype = ptype == "l" || ptype == "t" ? "p" : ptype
		this.events.push(spec)
	},
	// Returns a set of events from the front of the event queue such that all events have the same
	// ptype and any "down" events appear at the beginning.
	shiftevents: function () {
		var revents = [], last = null
		while (this.events.length) {
			var event = this.events[0]
			if (last) {
				if (event.etype == "down") break
				if (event.ptype != last.ptype) break
				if (last.etype == "move" && event.etype == "move") {
					event = this.coalescemove(last, event)
					revents.pop()
				}
			}
			revents.push(event)
			last = event
			this.events.shift()
		}
		return revents
	},
	coalescemove: function (mevent1, mevent2) {
		return {
			etype: "move",
			ptype: mevent1.ptype,
			t: mevent2.t,
			pos: mevent2.pos,
			dpos: [mevent1.dpos[0] + mevent2.dpos[0], mevent1.dpos[1] + mevent2.dpos[1]],
		}
	},
	currentisheld: function () {
		if (!this.current) return false
		var button = this.buttons[this.current]
		return button && button.held
	},

	updatepos: function (pos) {
		UFX.pointer.pos = pos
		var x = pos[0], y = pos[1]
		UFX.pointer.within =
			0 <= x && x < UFX.pointer._element.width &&
			0 <= y && y < UFX.pointer._element.height
	},

	startbutton: function (buttonspec) {
		if (this.allclear()) {
			this.current = buttonspec.ptype
		} else if (this.current == buttonspec.ptype) {
			this.cancelcurrent()
		} else if (this.current == "t" && buttonspec.ptype == "d") {
			this.cancelcurrent()
			this.current = buttonspec.ptype
		} else {
			this.bork()
		}
		if (buttonspec.ptype == "l" || buttonspec.ptype == "m" || buttonspec.ptype == "r") {
			UFX.pointer.touch = false
		} else if (buttonspec.ptype == "t" || buttonspec.ptype == "d") {
			UFX.pointer.touch = true
		}
		var t = Date.now()
		var button = this.buttons[buttonspec.ptype] = {
			ptype: buttonspec.ptype,
			pos0: buttonspec.pos,
			pos: buttonspec.pos,
			posL: buttonspec.pos,
			t0: t,
			tL: t,
			held: false,
		}
		if (button.ptype == "d") {
			this.pinch = {
				pinched: false,
				tilted: false,
			}
			var tilt = UFX.pointer.roundpos ? Math.round(buttonspec.tilt) : buttonspec.tilt
			var sep = UFX.pointer.roundpos ? Math.round(buttonspec.sep) : buttonspec.sep
			this.pinch.tilt = this.pinch.tilt0 = this.pinch.tiltL = tilt
			this.pinch.sep = this.pinch.sep0 = this.pinch.sepL = sep
		}
		this.addevent("down", buttonspec.ptype, {
			pos: buttonspec.pos,
		})
		this.updatecounts()
	},
	updatebutton: function (buttonspec) {
		if (!this.current) return
		if (this.current != buttonspec.ptype) {
			this.bork()
		}
		if (!this.buttons[buttonspec.ptype]) return
		var t = Date.now()
		var button = this.buttons[buttonspec.ptype]
		if (button.held) {
			var pos = buttonspec.pos
			if (button.pos != pos) {
				this.addevent("move", buttonspec.ptype, {
					pos: pos,
					dpos: UFX.pointer._util.dpos(button.pos, pos),
				})
				button.pos = pos
			}
		} else {
			button.pos = buttonspec.pos
			if (this.checkhold(button)) {
				button.held = true
				this.addevent("hold", buttonspec.ptype, {
					pos: button.pos0,
				})
				if (button.pos != button.pos0) {
					this.addevent("move", buttonspec.ptype, {
						pos: button.pos,
						dpos: UFX.pointer._util.dpos(button.pos0, button.pos),
					})
				}
			}
		}
		if (button.ptype == "d" && this.pinch) {
			var tilt = UFX.pointer.roundpos ? Math.round(buttonspec.tilt) : buttonspec.tilt
			this.pinch.tilt = UFX.pointer._util.normtilt(tilt)
			this.pinch.sep = UFX.pointer.roundpos ? Math.round(buttonspec.sep) : buttonspec.sep
			if (!this.pinch.pinched) {
				// Has it passed the sep threshold?
				var sep = Math.abs(this.pinch.sep - this.pinch.sep0) >= UFX.pointer.spinch
				// Has it passed the log(sep) threshold?
				var lsep = this.pinch.sep0 == 0 || this.pinch.sep == 0 ||
					Math.abs(Math.log(this.pinch.sep / this.pinch.sep0)) >= UFX.pointer.lpinch
				if (sep && lsep) this.pinch.pinched = true
			}
			if (!this.pinch.tilted) {
				this.pinch.tilted =
					Math.abs(UFX.pointer._util.dtilt(this.pinch.tilt0, this.pinch.tilt)) >=
					UFX.pointer.atilt
			}
		}
		this.updatecounts()
	},
	endbutton: function (buttonspec) {
		this.updatebutton(buttonspec)
		var button = this.buttons[buttonspec.ptype]
		if (!button) {
			// Button was initially clicked outside the element.
			return
		}
		var event = {
			pos: buttonspec.pos,
			dt: 0.001 * (Date.now() - button.t0),
			fly: [0, 0],
		}
		this.addevent("up", buttonspec.ptype, event)
		if (!button.held) {
			this.addevent("click", buttonspec.ptype, event)
		}
		delete this.buttons[buttonspec.ptype]
		this.updatecounts()
		this.checkunbork()
		if (buttonspec.ptype === this.current) this.current = null
	},
	cancelbutton: function (buttonspec) {
		if (this.current == buttonspec.ptype) {
			this.cancelcurrent()
		}
	},
	updatenoevent: function () {
		if (this.checkholdnoevent()) {
			var button = this.buttons[this.current]
			button.held = true
			this.addevent("hold", this.current, {
				pos: button.pos0,
			})
		}
	},

	addwheel: function (dx, dy, dz) {
		if (dx) this.wheel.dx = (this.wheel.dx || 0) + dx
		if (dy) this.wheel.dy = (this.wheel.dy || 0) + dy
		if (dz) this.wheel.dz = (this.wheel.dz || 0) + dz
	},
	getwheel: function () {
		var wheel = this.wheel
		this.wheel = {}
		return wheel
	},
	getpinch: function () {
		if (!this.pinch) return null
		var sep = this.pinch.pinched ? this.pinch.sep : this.pinch.sepL
		var tilt = this.pinch.tilted ? this.pinch.tilt : this.pinch.tiltL
		var dlogsep = this.pinch.sepL && sep ? Math.log(sep / this.pinch.sepL) : 0
		if (UFX.pointer.roundpos) dlogsep = Math.round(dlogsep * 10000) / 10000
		var ret = {
			tilt: tilt,
			dtilt: UFX.pointer._util.dtilt(this.pinch.tiltL, tilt),
			sep: sep,
			dsep: sep - this.pinch.sepL,
			dlogsep: dlogsep,
		}
		if (this.current == "d") {
			this.pinch.tiltL = tilt
			this.pinch.sepL = sep
		} else {
			this.pinch = null
		}
		return ret
	},

	// Determine whether the given button info passes thresholds for a change to the held state.
	checkhold: function (button) {
		if (Date.now() - button.t0 >= 1000 * UFX.pointer.thold) return true
		var dpos = UFX.pointer._util.dpos(button.pos0, button.pos)
		return dpos[0] * dpos[0] + dpos[1] * dpos[1] >= UFX.pointer.rhold * UFX.pointer.rhold
	},
	// Determine whether the current button (with no new mouse events as updates) passes timing
	// threshold for a change to the held state.
	checkholdnoevent: function () {
		if (!this.current || this.current == "b") return false
		var button = this.buttons[this.current]
		if (!button || button.held) return false
		return Date.now() - button.t0 >= 1000 * UFX.pointer.thold
	},

	// Given a list of active touch points, update the positions and active status.
	settouches: function (touches) {
		for (var j = 0 ; j < touches.length ; ++j) {
			var touch = touches[j]
			this.touchpoints[touch.identifier] = this.getpos(touch)
		}
	},
	// Given a list of touch points that are no longer active, remove them from the active touch
	// point list.
	cleartouches: function (touches) {
		for (var j = 0 ; j < touches.length ; ++j) {
			var touch = touches[j]
			delete this.touchpoints[touch.identifier]
		}
	},

	cancelcurrent: function () {
		this.addevent("cancel", this.current, { pos: this.buttons[this.current].pos })
	},

	// Enter a borked state, and cancel out any pending watches.
	bork: function () {
		if (this.borked) return
		if (this.current) this.cancelcurrent()
		this.current = "b"
		this.borked = true
	},
	checkunbork: function () {
		if (this.borked && this.allclear()) {
			this.current = null
			this.borked = false
		}
	},


	// Whether we're in a "clean slate" state, i.e., no buttons are down and no touch points are
	// active. Used to determine when to leave a borked state.
	allclear: function () {
		return this.nbutton == 0 && this.ntouchpoint == 0
	},
	updatecounts: function () {
		this.nbutton = Object.keys(this.buttons).length
		this.ntouchpoint = Object.keys(this.touchpoints).length
	},
}
