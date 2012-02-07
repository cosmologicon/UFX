// Mouse module - puts mouse events in a queue

// Does not yet handle scrolling or multitouch


if (typeof UFX == "undefined") UFX = {}
UFX.mouse = {}


UFX.mouse.active = true
UFX.mouse.qdown = true
UFX.mouse.qup = true
UFX.mouse.qclick = false
UFX.mouse.qblur = false
// Should we watch for left, middle, and right clicks?
UFX.mouse.capture = [true, false, false]

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
    element.onmouseclick = UFX.mouse._onmouseclick

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


UFX.mouse._onblur = function (event) {
    if (!UFX.mouse.active) return true
    
    return true
}
UFX.mouse._onmouseout = function (event) {
}
UFX.mouse._onmousedown = function (event) {
    if (!UFX.mouse.active || !UFX.mouse.capture[event.button]) return true
    var pos = UFX.mouse._geteventpos(event)
    if (UFX.mouse.watchdrag) {
        UFX.mouse.drag = {
            downevent: event,
            pos0: pos,
            pos: pos,
            dx: 0,
            dy: 0,
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
    return false
}
UFX.mouse._onmouseup = function (event) {
    if (!UFX.mouse.active || !UFX.mouse.capture[event.button]) return true
    if (!UFX.mouse.drag) return true
    UFX.mouse.drag = null
    if (UFX.mouse.qup) {
        var mevent = {
            type: "up",
            pos: UFX.mouse._geteventpos(event, UFX.mouse._element),
            button: event.button,
            time: Date.now(),
            baseevent: event,
        }
        UFX.mouse._events.push(mevent)
    }
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
    }
    return false
}

/*

function getEventPos(event) {
    return [event.layerX + event.target.offsetLeft,
            event.layerY + event.target.offsetTop]
}          


// The gamebox is a div or other element that contains the canvas and any text boxes
// It also captures mouse and keyboard events
function setgamebox(boxname) {
    if (typeof boxname == "undefined") boxname = "gamebox"
    gamebox = typeof boxname == "string" ? document.getElementById(boxname) : boxname
    gamebox.onmouseover = function () {
    }
    gamebox.onmouseout = function () {
    }
    gamebox.onmousemove = function (event) {
        mousepos = getEventPos(event)
        if (typeof gamemousemove != "undefined") {
            var p = getEventPos(event)
            gamemousemove(p[0], p[1])
        }
        return false
    }
    gamebox.onmousedown = function (event) {
        if (typeof gamemousedown != "undefined") {
            var p = getEventPos(event)
            gamemousedown(p[0], p[1])
        }
        return false
    }
    gamebox.onmouseup = function (event) {
        if (typeof gamemouseup != "undefined") {
            var p = getEventPos(event)
            gamemouseup(p[0], p[1])
        }
        return false
    }
    gamebox.onclick = function (event) {
        if (typeof gameclick != "undefined") {
            var p = getEventPos(event)
            gameclick(p[0], p[1])
        }
        return false
    }
}
*/
