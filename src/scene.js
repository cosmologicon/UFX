// The scene module - keeps track of the scene stack

if (typeof UFX == "undefined") UFX = {}
UFX.scene = {}

UFX.scene.init = function (maxups, minups) {
    maxups = maxups || 300
    minups = minups || 10
    UFX.ticker.registersync(UFX.scene.think, UFX.scene.draw, maxups, minups)
}

UFX.scene.top = function () {
    var n = UFX.scene._stack.length
    return n ? UFX.scene._stack[n-1] : null
}
UFX.scene.push = function (c) {
    var old = UFX.scene.top()
    if (old) old.suspend()
    UFX.scene._stack.push(c)
    c.start()
}
UFX.scene.pop = function () {
    var c = UFX.scene._stack.pop()
    c.stop()
    var n = UFX.scene.top()
    if (n) n.resume()
    return c
}
UFX.scene.think = function (dt) {
    var c = UFX.scene.top()
    UFX.scene._lastthinker = c
    if (c) {
        var args = c.thinkargs(dt)
        c.think.apply(c, args)
    }
}
UFX.scene.draw = function (f) {
    if (UFX.scene._lastthinker) {
        UFX.scene._lastthinker.draw(f)
    }
}

// Use this as a prototype for your own scenes
UFX.scene.Scene = {
    thinkargs: function (dt) {
        return [dt]
    },
    think: function (dt) {
    },
    draw: function (f) {
    },
    start: function () { }, // called when the scene is pushed onto the stack
    suspend: function () { }, // called when another scene is pushed onto this one
    resume: function () { },  // called when another scene is popped off of this one
    stop: function () { }, // called when this scene is popped off the stack
}

UFX.scene._stack = []



