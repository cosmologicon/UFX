// Mouse module - puts mouse events in a queue

// Does not yet handle scrolling or multitouch


if (typeof UFX == "undefined") UFX = {}
UFX.mouse = {}


UFX.mouse.active = true
UFX.mouse.qdown = true
UFX.mouse.qup = true
UFX.mouse.qclick = false
UFX.mouse.qblur = false
// Should we watch for left, middle, and right events?
UFX.mouse.capture = { left: true, middle: false, right: false }

// While the mouse is down, this is updated with info on the current drag event
UFX.mouse.watchdrag = true
UFX.mouse.drag = null

UFX.mouse.events = function () {
    var r = UFX.mouse._events
    UFX.mouse.clearevents()
    return r
}

UFX.mouse.clearevents = function () {
    UFX.mouse._events = []
}

// This is updated every mouse event with the last known mouse position (as a length-2 array)
UFX.mouse.pos = null

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
    element.onmouseout = UFX.mouse._onmouseout
    element.onmousedown = UFX.mouse._onmousedown
    backdrop.onmouseup = UFX.mouse._onmouseup
    element.onclick = UFX.mouse._onclick
    element.oncontextmenu = UFX.mouse._oncontextmenu
    
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
    var off = UFX.mouse._elemoffset(elem || event.target)
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
    }
    event.preventDefault()
    return false
}
UFX.mouse._onmousedown = function (event) {
    if (!UFX.mouse.active || !UFX.mouse.capture[UFX.mouse._buttonmap[event.button]]) return true
    var pos = UFX.mouse._geteventpos(event)
    if (UFX.mouse.watchdrag) {
        UFX.mouse.drag = {
            downevent: event,
            button: event.button,
            pos0: pos,
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
    }
    event.preventDefault()
    return false
}
UFX.mouse._onmouseup = function (event) {
    if (!UFX.mouse.active || !UFX.mouse.capture[UFX.mouse._buttonmap[event.button]]) return true
    if (!UFX.mouse.drag) return true
    if (UFX.mouse.qup) {
        var mevent = {
            type: "up",
            pos: UFX.mouse._geteventpos(event, UFX.mouse._element),
            button: event.button,
            time: Date.now(),
            baseevent: event,
        }
        if (UFX.mouse.drag) {
            mevent.t0 = UFX.mouse.drag.t0
            mevent.dt = Date.now() - mevent.t0
            mevent.pos0 = UFX.mouse.drag.pos0
            mevent.dx = mevent.pos[0] - mevent.pos0[0]
            mevent.dy = mevent.pos[1] - mevent.pos0[1]
        }
        UFX.mouse._events.push(mevent)
    }
    UFX.mouse.drag = null
    event.preventDefault()
    return false
}


UFX.mouse._onmousemove = function (event) {
    if (!UFX.mouse.active) return true
    var pos = UFX.mouse._geteventpos(event, UFX.mouse._element)
    UFX.mouse.pos = pos
    if (UFX.mouse.drag) {
        UFX.mouse.drag.pos = pos
        UFX.mouse.drag.dx = pos[0] - UFX.mouse.drag.pos0[0]
        UFX.mouse.drag.dy = pos[1] - UFX.mouse.drag.pos0[1]
        UFX.mouse.drag.dt = Date.now() - UFX.mouse.drag.t0
    }
    return false
}

