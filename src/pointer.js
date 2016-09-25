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
	if (UFX.pointer.pos) {
		pstate.pos = UFX.pointer.pos
		if (state.posL) {
			pstate.dpos = UFX.pointer._util.dpos(state.posL, UFX.pointer.pos)
		}
	}
	state.posL = UFX.pointer.pos
	while (state.events.length) {
		var event = state.events.shift()
		var ptype = event.ptype == "p" ? "" : event.ptype
		pstate[ptype + event.etype] = event
	}
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
		UFX.pointer._state.startbutton(UFX.pointer._handlers.getbuttonspec(event))
	},
	mousemove: function (event) {
		UFX.pointer._state.updatebutton(UFX.pointer._handlers.getbuttonspec(event))
	},
	mouseup: function (event) {
		UFX.pointer._state.endbutton(UFX.pointer._handlers.getbuttonspec(event))
	},
	mouseout: function (event) {
	},
	mouseover: function (event) {
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

	addevent: function (etype, ptype, spec) {
		if (this.borked) return
		spec.t = Date.now()
		spec.etype = etype
		spec.ptype = ptype == "l" || ptype == "t" ? "p" : ptype
		this.events.push(spec)
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
			t: 0.001 * (Date.now() - button.t0),
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
