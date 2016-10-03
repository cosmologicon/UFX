// UFX.pointer module
// Abstracts away interface for games that can use either mouse or touch.

// For simplicity, only one action can be taken at a time. If multiple actions start occurring
// simultaneously (eg right mouse button is clicked while left mouse button is being held), then
// we'll just wait until everything is over before reporting events.

"use strict"
var UFX = UFX || {}

UFX.pointer = function (element) {
	var state = UFX.pointer._state
	var pstate = {
		wheel: {},
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

UFX.pointer._util = {
	dpos: function (pos0, pos1) {
		return [pos1[0] - pos0[0], pos1[1] - pos0[1]]
	},
}

UFX.pointer._handlers = {
	etypes: [
		"mousedown", "mouseup", "click", "dblcick", "mousewheel",
		"mousemove", "mouseover", "mouseout",
		"touchstart", "touchend", "touchmove", "touchcancel",
		"contextmenu",
	],

	setelement: function (element) {
		if (UFX.pointer._element) this.removelisteners(UFX.pointer._element)
		UFX.pointer._element = element
		this.addlisteners(element)
		document.addEventListener("mousemove", this.documentmousemove)
		document.addEventListener("mouseup", this.documentmouseup)
	},

	// Capture all event types for the given element.
	addlisteners: function (element) {
		this.etypes.forEach(function (etype) {
			element.addEventListener(etype, UFX.pointer._handlers[etype])
		})
	},
	removelisteners: function (element) {
		this.etypes.forEach(function (etype) {
			element.removeEventListener(etype, UFX.pointer._handlers[etype])
		})
	},

	contextmenu: function (event) {
		if (!UFX.pointer.allowcontextmenu) {
			event.preventDefault()
			return false
		}
	},
	mousedown: function (event) {
		var spec = UFX.pointer._handlers.getbuttonspec(event)
		UFX.pointer._state.startbutton(spec)
		UFX.pointer._state.updatepos(spec.pos)
	},
	mousemove: function (event) {
	},
	mouseup: function (event) {
	},
	mouseout: function (event) {
		UFX.pointer._state.updatepos(UFX.pointer._handlers.getpos(event))
	},
	mouseover: function (event) {
		UFX.pointer._state.updatepos(UFX.pointer._handlers.getpos(event))
	},
	documentmousemove: function (event) {
		var spec = UFX.pointer._handlers.getbuttonspec(event)
		UFX.pointer._state.updatebutton(spec)
		UFX.pointer._state.updatepos(spec.pos)
	},
	documentmouseup: function (event) {
		var spec = UFX.pointer._handlers.getbuttonspec(event)
		UFX.pointer._state.endbutton(spec)
		UFX.pointer._state.updatepos(spec.pos)
	},

	touchend: function (event) {
		UFX.pointer._state.cleartouches(event.changedTouches)
	},

	getbuttonspec: function (event) {
		var button = "lmr"[event.button]
		if (!button) throw "Unknown button type: " + event.button
		return {
			ptype: button,
			pos: this.getpos(event),
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
	nbuttons: 0,
	// Touch points currently active.
	touchpoints: {},
	ntouchpoints: 0,
	// event queue
	events: [],

	// Called when a new element is assigned.
	reset: function () {
		UFX.pointer.pos = null
		UFX.pointer.within = false
		this.current = null
		this.borked = false
		this.buttons = {}
		this.nbuttons = 0
		this.touchpoints = {}
		this.ntouchpoints = 0
		this.events = []
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
		} else {
			this.bork()
		}
		var t = Date.now()
		this.buttons[buttonspec.ptype] = {
			ptype: buttonspec.ptype,
			pos0: buttonspec.pos,
			pos: buttonspec.pos,
			posL: buttonspec.pos,
			t0: t,
			tL: t,
			held: false,
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
		this.updatecounts()
	},
	endbutton: function (buttonspec) {
		this.updatebutton(buttonspec)
		var button = this.buttons[buttonspec.ptype]
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
	},
	// Determine whether the given button info passes thresholds for a change to the held state.
	checkhold: function (button) {
		if (Date.now() - button.t0 >= 1000 * UFX.pointer.thold) return true
		var dpos = UFX.pointer._util.dpos(button.pos0, button.pos)
		return dpos[0] * dpos[0] + dpos[1] * dpos[1] >= UFX.pointer.rhold * UFX.pointer.rhold
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
		this.addevent("cancel", this.current, {})
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
		return this.nbuttons == 0 && this.ntouchpoints == 0
	},
	updatecounts: function () {
		this.nbutton = Object.keys(this.buttons).length
		this.ntouchpoint = Object.keys(this.touchpoints).length
	},
}
