// UFX.touch: touch and multitouch event handling

// Still working out the API on this one. I don't really have a handle on touch events yet.
// Use with caution.

// Basically, though, I'm trying to make it mostly similar to UFX.muose.

// Basic usage:
// 1. Call UFX.touch.init(canvas)
// 2. Each frame call: var tstate = UFX.touch.state()

// TODO: add documentation to unifac wiki

"use strict"
var UFX = UFX || {}

UFX.touch = {
	// Some options
	capture: {
		start: true,
		end: true,
		tap: true,
		hold: true,
		swipe: true,
		release: true,
	},
	active: true,
	multi: true,
	touchmax: 0,
	tmulti: 100,
	usetouchid: true,
	ps: [],
	qtap: true,
	qdrag: true,
	thold: 300,
	roundpos: true,
	dmove: 50,
	_events: [],
	_mtouch: 0,  // max touches during current event
	_touches: {},  // info on all current touches
	_tkeys: [],   // valid keys for the _touches object
	_ntouches: 0,  // number of touches seen, used to give each a unique identifier
	init: function (element, backdrop) {
		this._captureevents(element, backdrop)
	},
	events: function () {
		this._checkhold()
		var e = this._events
		this._events = []
		return e
	},
	state: function () {
		var state = {
			ps: {},
			deltas: {},
		}
		var capture = this.capture, utid = this.usetouchid
		for (var type in capture) state[type] = []
		this.events().forEach(function (event) {
			if (!capture[event.type]) return
			var id = utid ? event.touchid : event.id, obj
			if (event.type == "tap") {
				obj = { dt: event.dt }
			} else if (event.type == "release") {
				obj = { dt: event.dt, v: event.v, multi: event.multi, }
			} else {
				obj = {}
			}
			obj.id = id
			obj.pos = event.pos
			obj.t = event.t
			state[event.type].push(obj)
		})
		state.ids = []
		for (var id in this._touches) {
			var touch = this._touches[id], tid = utid ? touch.touchid : id
			if (!touch.followed) continue
			state.ids.push(tid)
			var pos = touch.pos, opos = touch.opos
			state.ps[tid] = pos
			state.deltas[tid] = [pos[0] - opos[0], pos[1] - opos[1]]
			touch.ot = touch.t
			touch.opos = pos
		}
		state.ids.sort()
		return state
	},
	// static method. Pass it a state and get an object and get info about two-touch motions
	twotouchstate: function (state) {
		if (state.ids.length != 2) return null
		// convention: lowercase is first finger, uppercase is second finger
		var id = state.ids[0], ID = state.ids[1]
		var x1 = state.ps[id][0], y1 = state.ps[id][1]
		var X1 = state.ps[ID][0], Y1 = state.ps[ID][1]
		var dx1 = X1-x1, dy1 = Y1-y1
		var r1 = Math.sqrt(dx1*dx1+dy1*dy1)
		var theta1 = r1 ? Math.atan2(dy1,dx1) : 0
		var x0 = x1-state.deltas[id][0], y0 = y1-state.deltas[id][1]
		var X0 = X1-state.deltas[ID][0], Y0 = Y1-state.deltas[ID][1]
		var dx0 = X0-x0, dy0 = Y0-y0
		var r0 = Math.sqrt(dx0*dx0+dy0*dy0)
		var theta0 = r0 ? Math.atan2(dy0,dx0) : 0
		return {
			center: [(x1+X1)/2, (y1+Y1)/2],
			dcenter: [(x1+X1-x0-X0)/2, (y1+Y1-y0-Y1)/2],
			r: r1,
			dr: r1-r0,
			rratio: r0 ? r1/r0 : 1,
			theta: theta1,
			dtheta: theta1-theta0,
		}
	},
	_captureevents: function (element, backdrop) {
		element = element || document
		backdrop = backdrop || document
		if (typeof element == "string") element = document.getElementById(element)
		if (typeof backdrop == "string") backdrop = document.getElementById(backdrop)
		//backdrop.addEventListener("blur", UFX.mouse._onblur, true)
		// TODO: add these instead of replacing the event handlers
		function c(obj, mname) { return function (event) { obj[mname](event) } }
		element.ontouchstart = c(this, "_ontouchstart")
		element.ontouchmove = c(this, "_ontouchmove")
		element.ontouchend = c(this, "_ontouchend")
//		backdrop.ontouchmove = element.ontouchmove

		this._element = element
		this._backdrop = backdrop
	},
	_addevent: function (type, id, touchid, obj) {
		if (this.capture[type] && this._touches[id].followed) {
			obj.type = type
			obj.id = id
			obj.touchid = touchid
			this._events.push(obj)
		}
	},
	_handlestart: function (touch) {
		if (!this.active) return
		var id = touch.identifier, touchid = this._ntouches++
		var pos = this._eventpos(touch), t = Date.now()
		this._touches[id] = {
			id: id,   // ID as assigned by the DOM
			touchid: touchid,  // ID as assigned by UFX.touch (will be unique)
			t0: t,  // time of touchstart
			pos0: pos,  // position of touchstart
			tlast: t,  // time of last reconciliation
			poslast: pos,  // position of last reconciliation
			ot: t,  // time of last observation (via UFX.touch.state)
			opos: pos,  // position of last observation
			t: t,  // time of last update
			pos: pos,  // position of last update
			moved: false,  // has the touch moved at all?
			followed: true,  // are we registering events for this touch?
			held: false,  // has this touch registered a hold event?
			multi: 1,  // other touches co-generating multitouch events with this one
			multit0: t,
			vx: 0,
			vy: 0,
		}
		this._settkeys()
		if (this.touchmax && this._tkeys.length > this.touchmax) {
			this._touches[id].followed = false
		}
		this._addevent("start", id, touchid, {
			pos: pos,
			t: t,
		})
		if (this.multi) {
			//this._syncmulti(id)
		}
	},
	// Associate this touch with any other touches that were made at the same time.
/*	_syncmulti: function (id) {
		var t = this._touches[id].t0
		var tmstart = t - this.tmulti, mtouches = [], multit0 = t
		for (var k in this._touches) {
			if (k == id || this._touches[k].multit0 + this.tmstart < t) continue
			mtouches.push(this._touches[k])
		}
		if (mtouches.length == 0) return
		for (var j = 0 ; j < mtouches.length ; ++j) {
			var mmulti = this._touches[mtouches[j]].multi
			if (!mmulit
			
		}
	}, */
	_handlemove: function (touch) {
		if (!this.active) return
		var id = touch.identifier
		if (!this._touches[id]) this._handlestart(touch)
		var tobj = this._touches[id]
		var pos = this._eventpos(touch), t = Date.now()
		var dt = t - tobj.t, dx = pos[0] - tobj.pos[0], dy = pos[1] - tobj.pos[1]
		var dx0 = pos[0] - tobj.pos0[0], dy0 = pos[1] - tobj.pos0[1]
		tobj.t = t
		tobj.pos = pos
		if (!tobj.moved && Math.abs(dx0) + Math.abs(dy0) > this.dmove) {
			tobj.moved = true
		}
		if (dt) {
			tobj.vx = 1000 * dx / dt + 7
			tobj.vy = 1000 * dy / dt
		}
		this._checkhold()
	},
	_handleend: function (touch) {
		if (!this.active) return
		var id = touch.identifier
		if (!this._touches[id]) return
//		this._handlemove(touch)
		var tobj = this._touches[id]
		var pos = this._eventpos(touch)
		var t = Date.now(), dt = t - tobj.t0
		this._addevent("end", tobj.id, tobj.touchid, {
			t: t,
			dt: dt,
			pos: pos,
		})
		if (!tobj.moved && !tobj.held) {
			this._addevent("tap", tobj.id, tobj.touchid, {
				t: t,
				dt: dt,
				pos: pos,
			})
		} else {
			this._addevent("release", tobj.id, tobj.touchid, {
				t: t,
				dt: dt,
				pos0: tobj.pos0,
				pos: pos,
				v: [tobj.vx, tobj.vy],
				multi: tobj.multi,
			})
		}
		delete this._touches[id]
	},
	_settkeys: function () {
		this._tkeys = []
		for (var k in this._touches) this._tkeys.push(k)
		this._tkeys.sort()
		var n = this._tkeys.length
		for (var k in this._touches) {
			this._touches[k].multi = Math.max(this._touches[k].multi, n)
		}
	},
	_checkhold: function () {
		var t = Date.now()
		for (var k in this._touches) {
			var touch = this._touches[k]
			if (touch.held || touch.moved) continue
			if (touch.t0 + this.thold > t) continue
			touch.held = true
			this._addevent("hold", touch.id, touch.touchid, {
				t: touch.t0 + this.thold,
				pos: touch.pos,
			})
		}
	},
	_ontouchstart: function (event) {
		this.ps = this._getps(event.touches)
		this._mtouch = Math.max(this._mtouch, event.touches.length)
		for (var j = 0 ; j < event.changedTouches.length ; ++j) {
			this._handlestart(event.changedTouches[j])
		}
		this._checkhold()
		event.preventDefault()
	},
	_ontouchmove: function (event) {
		this.ps = this._getps(event.touches)
		this._mtouch = Math.max(this._mtouch, event.touches.length)
		for (var j = 0 ; j < event.changedTouches.length ; ++j) {
			this._handlemove(event.changedTouches[j])
		}
		this._checkhold()
		event.preventDefault()
	},
	_ontouchend: function (event) {
		this.ps = this._getps(event.touches)
		this._mtouch = Math.max(this._mtouch, event.touches.length)
		this._checkhold()
		for (var j = 0 ; j < event.changedTouches.length ; ++j) {
			this._handleend(event.changedTouches[j])
		}
		if (!event.touches.length) this._mtouch = 0
		this._settkeys()
		event.preventDefault()
	},
	_eventpos: function (event, elem) {
		elem = elem || this._element
		var rect = elem.getBoundingClientRect()
		var ex = rect.left + elem.clientLeft - elem.scrollLeft
		var ey = rect.top + elem.clientTop - elem.scrollTop
		var x = event.clientX - ex, y = event.clientY - ey
		return this.roundpos ? [Math.round(x), Math.round(y)] : [x, y]
	},
	_getps: function(touches) {
		var ps = []
		for (var j = 0 ; j < touches.length ; ++j) {
			ps.push(this._eventpos(touches[j], this._element))
		}
		return ps
	},
}


