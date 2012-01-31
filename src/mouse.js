// Mouse module
// Queue up mouse events

if (typeof UFX == "undefined") UFX = {}
UFX.mouse = {}


UFX.mouse.active = true
// Should we watch for left, middle, and right clicks?
UFX.mouse.capture = [true, false, false]


UFX.mouse.init = function (element) {
    UFX.mouse._captureevents(element)
}

UFX.mouse._captureevents = function (element) {
    element = element || document
    if (typeof element == "string") element = document.getElementById(element)

//    element.addEventListener("blur", UFX.mouse._onblur, true)
    element.onmouseout = UFX.mouse._onmouseout
    element.onmousedown = UFX.mouse._onmousedown
//    element.onkeypress = UFX.key._onkeypress
//    element.onkeyup = UFX.key._onkeyup
//    element.onkeydown = UFX.key._onkeydown
    UFX.mouse._element = element
}

UFX.mouse._onmouseout = function (event) {
}
UFX.mouse._onmousedown = function (event) {
    if (!UFX.mouse.active || !UFX.mouse.capture[event.button]) return true
    alert(event)
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
