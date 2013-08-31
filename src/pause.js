// The pause scene - click to continue
// Requires modules scene and mouse
// Draws to the global var context


UFX.pause = function () {
    if (!UFX.pause.ispaused()) {
        UFX.scene.push(UFX.pause.Pause)
    }
}
UFX.pause.unpause = function () {
    if (UFX.pause.ispaused()) {
        UFX.scene.pop()
    }
}
UFX.pause.ispaused = function () {
    return UFX.scene.top() === UFX.pause.Pause
}
UFX.pause.init = function () {
    document.addEventListener("blur", UFX.pause, false)
}


UFX.pause.Pause = {}
UFX.pause.Pause.start = function () {
    var c0 = context.canvas
    this.x = c0.width
    this.y = c0.height
    this.backdrop = document.createElement("canvas")
    this.backdrop.width = this.x
    this.backdrop.height = this.y
    this.bcontext = this.backdrop.getContext("2d")
    this.bcontext.drawImage(c0, 0, 0)
    this.bcontext.fillStyle = "rgba(64,64,64,0.7)"
    this.bcontext.fillRect(0, 0, this.x, this.y)
    this.t = 0
    this.r = Math.min(this.x, this.y) * 0.3
    UFX.mouse.clearevents()
}

UFX.pause.Pause.thinkargs = function (dt) {
    var clicked = false
    UFX.mouse.events().forEach(function (event) {
        if (event.type == "up") clicked = true
    })
    if (UFX.key) {
        UFX.key.clearevents()
        UFX.key.clearcombos()
    }
    return [dt, clicked]
}

UFX.pause.Pause.think = function (dt, clicked) {
    context.drawImage(this.backdrop, 0, 0)
    this.t += dt

    context.save()
    context.translate(0.5*this.x, 0.5*this.y)
    if (this.t < 0.25) {
        var theta = 30 * this.t
        var r = 1 - 4 * this.t
        context.scale(1. + r * Math.cos(theta), 1. - r * Math.sin(theta))
    }
    context.scale(this.r, this.r)
    context.fillStyle = "rgba(255,255,255,0.5)"
    context.beginPath()
    context.moveTo(0.8, 0)
    context.lineTo(-0.5, -0.7)
    context.lineTo(-0.5, 0.7)
    context.closePath()
    context.fill()
    context.restore()
    
    if (clicked) UFX.pause.unpause()
}


