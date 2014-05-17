// UFX.mouse module: enqueue mouse events

// This is an alternative system to handling mouse events in event handlers.

// The simplest way to use it is to begin by calling:
//   UFX.mouse.init(canvas)
// and then each frame call:
//   var mstate = UFX.mouse.state()

// By default, only the left mouse button is captured.

// Does not yet handle horizontal scrolling

// For more details and options, please see the documentation at:
// https://code.google.com/p/unifac/wiki/UFXDocumentation#UFX.mouse_:_handle_mouse_events

"use strict"
var UFX = UFX || {}
UFX.mouse = {}

UFX.mouse.active = true
UFX.mouse.qdown = true
UFX.mouse.qup = true
UFX.mouse.qclick = false
UFX.mouse.qblur = false
UFX.mouse.qwheel = false
// Should we watch for left, middle, right, and wheel events?
UFX.mouse.capture = { left: true, middle: false, right: false, wheel: false }

// While the mouse is down, this is updated with info on the current drag event
UFX.mouse.watchdrag = true
UFX.mouse.drag = {}

UFX.mouse.events = function () {
    var r = UFX.mouse._events
    UFX.mouse._clearevents()
    return r
}

UFX.mouse.state = function () {
    var r = {}
    r.pos = UFX.mouse.pos
    if (r.pos && UFX.mouse._opos) {
        r.dpos = [r.pos[0] - UFX.mouse._opos[0], r.pos[1] - UFX.mouse._opos[1]]
    } else {
        r.dpos = [0, 0]
    }
    UFX.mouse._opos = r.pos
    if (UFX.mouse.capture.left) r.left = {}
    if (UFX.mouse.capture.middle) r.middle = {}
    if (UFX.mouse.capture.right) r.right = {}
    for (var b in UFX.mouse.buttonsdown) {
        if (UFX.mouse.buttonsdown[b] && r[b]) r[b].isdown = true
    }
    UFX.mouse._events.forEach(function (event) {
        r[UFX.mouse._buttonmap[event.button]][event.type] = event.pos
    })
    UFX.mouse._clearevents()
    if (UFX.mouse.capture.wheel) r.wheeldy = UFX.mouse.getwheeldy()
    if (UFX.mouse.watchdrag) {
    	for (var bname in UFX.mouse.drag) {
    	    if (!r[bname] || !r[bname].isdown) continue
    	    var drag = UFX.mouse.drag[bname]
        	r[bname].dx = r.pos[0] - drag.pos0[0]
        	r[bname].dy = r.pos[1] - drag.pos0[1]
        	r[bname].dt = Date.now() - drag.t0
//            drag.opos = drag.pos
        }
    }
    return r
}

UFX.mouse._clearevents = function () {
    UFX.mouse._events = []
}

UFX.mouse.getwheeldy = function () {
    var dy = UFX.mouse.wheeldy
    UFX.mouse.wheeldy = 0
    return dy
}

// This is updated every mouse event with the last known mouse position (as a length-2 array)
UFX.mouse.pos = null
UFX.mouse._opos = null
// This is updated every event with the latest known info on which mouse buttons are currently down
UFX.mouse.buttonsdown = {}
//UFX.mouse.wheeldx = 0
UFX.mouse.wheeldy = 0

UFX.mouse.init = function (element, backdrop) {
    UFX.mouse._captureevents(element, backdrop)
}


UFX.mouse._events = []

UFX.mouse._captureevents = function (element, backdrop) {
    element = element || document
    backdrop = backdrop || document
    if (typeof element == "string") element = document.getElementById(element)
    if (typeof backdrop == "string") backdrop = document.getElementById(backdrop)

    backdrop.addEventListener("blur", UFX.mouse._onblur, true)
    // TODO: add these instead of replacing the event handlers
    element.onmouseout = UFX.mouse._onmouseout
    element.onmousedown = UFX.mouse._onmousedown
    backdrop.onmouseup = UFX.mouse._onmouseup
    element.onclick = UFX.mouse._onclick
    element.oncontextmenu = UFX.mouse._oncontextmenu
    element.onmousewheel = UFX.mouse._onmousewheel  // non-Firefox
    element.addEventListener("DOMMouseScroll", UFX.mouse._onmousewheel)  // Firefox
    
    backdrop.onmousemove = UFX.mouse._onmousemove

    UFX.mouse._element = element
    UFX.mouse._backdrop = backdrop
    
}

// http://stackoverflow.com/questions/6773481/how-to-get-the-mouseevent-coordinates-for-an-element-that-has-css3-transform
UFX.mouse._elemoffset = function (elem) {
    var rect = elem.getBoundingClientRect()
    var x = rect.left + elem.clientLeft - elem.scrollLeft
    var y = rect.top + elem.clientTop - elem.scrollTop
    return [x, y]
}
UFX.mouse._geteventpos = function (event, elem) {
    elem = elem || event.target
    var off = UFX.mouse._elemoffset(elem)
    if (elem.style.width || elem.style.height) {
        var s = elem.style
        var xf = s.width ? elem.width / parseFloat(s.width) : elem.height / parseFloat(s.height)
        var yf = s.height ? elem.height / parseFloat(s.height) : elem.width / parseFloat(s.width)
        return [xf * (event.clientX - off[0]), yf * (event.clientY - off[1])]
    }
    return [event.clientX - off[0], event.clientY - off[1]]
}

// TODO: make sure the drag event is destroyed when this happens
UFX.mouse._onblur = function (event) {
    if (!UFX.mouse.active) return true
    
    return true
}
UFX.mouse._onmouseout = function (event) {
}
UFX.mouse._oncontextmenu = function (event) {
    if (!UFX.mouse.active || !UFX.mouse.capture.right) return true
    event.preventDefault()
    return false
}
UFX.mouse._buttonmap = ["left", "middle", "right"]
UFX.mouse._onclick = function (event) {
    if (!UFX.mouse.active || !UFX.mouse.capture[UFX.mouse._buttonmap[event.button]]) return true
    if (UFX.mouse.qclick) {
        var mevent = {
            type: "click",
            pos: UFX.mouse._geteventpos(event, UFX.mouse._element),
            button: event.button,
            time: Date.now(),
            baseevent: event,
        }
        UFX.mouse._events.push(mevent)
    }
    event.preventDefault()
    return false
}
UFX.mouse._onmousedown = function (event) {
    if (!UFX.mouse.active) return true
    var bname = UFX.mouse._buttonmap[event.button]
    UFX.mouse.buttonsdown[bname] = true
    if (!UFX.mouse.capture[bname]) return true
    var pos = UFX.mouse._geteventpos(event)
    if (UFX.mouse.watchdrag) {
        UFX.mouse.drag[bname] = {
            downevent: event,
            pos0: pos,
//            opos: pos,
            pos: pos,
            dx: 0,
            dy: 0,
            t0: Date.now(),
            dt: 0,
        }
    }
    if (UFX.mouse.qdown) {
        var mevent = {
            type: "down",
            pos: UFX.mouse._geteventpos(event, UFX.mouse._element),
            button: event.button,
            time: Date.now(),
            baseevent: event,
        }
        UFX.mouse._events.push(mevent)
    }
    event.preventDefault()
    return false
}
UFX.mouse._onmouseup = function (event) {
    if (!UFX.mouse.active) return true
    var bname = UFX.mouse._buttonmap[event.button]
    UFX.mouse.buttonsdown[bname] = false
    if (!UFX.mouse.capture[bname]) return true
//    if (!UFX.mouse.drag[bname]) return true
    if (UFX.mouse.qup) {
        var mevent = {
            type: "up",
            pos: UFX.mouse._geteventpos(event, UFX.mouse._element),
            button: event.button,
            time: Date.now(),
            baseevent: event,
        }
        if (UFX.mouse.drag[bname]) {
            mevent.t0 = UFX.mouse.drag[bname].t0
            mevent.dt = Date.now() - mevent.t0
            mevent.pos0 = UFX.mouse.drag[bname].pos0
            mevent.dx = mevent.pos[0] - mevent.pos0[0]
            mevent.dy = mevent.pos[1] - mevent.pos0[1]
        }
        UFX.mouse._events.push(mevent)
    }
    delete UFX.mouse.drag[bname]
    event.preventDefault()
    return false
}


UFX.mouse._onmousemove = function (event) {
    if (!UFX.mouse.active) return true
    var pos = UFX.mouse._geteventpos(event, UFX.mouse._element)
    UFX.mouse.pos = pos
    for (var bname in UFX.mouse.drag) {
        var d = UFX.mouse.drag[bname]
        d.pos = pos
        d.dx = pos[0] - d.pos0[0]
        d.dy = pos[1] - d.pos0[1]
        d.dt = Date.now() - d.t0
    }
    return false
}

UFX.mouse._onmousewheel = function (event) {
    if (!UFX.mouse.active || !UFX.mouse.capture.wheel) return true
    var dy = "wheelDelta" in event ? event.wheelDelta / 40. : -event.detail
    UFX.mouse.wheeldy += dy
    if (UFX.mouse.qwheel) {
        var mevent = {
            type: "wheel",
            pos: UFX.mouse._geteventpos(event, UFX.mouse._element),
            dy: dy,
//            dx: event.wheelDeltaX,
            time: Date.now(),
            baseevent: event,
        }
        UFX.mouse._events.push(mevent)
    }
    event.preventDefault()
    return false
}


