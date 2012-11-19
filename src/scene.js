// The scene module - keeps track of the scene stack

if (typeof UFX == "undefined") UFX = {}
UFX.scene = {}

UFX.scene.recording = false
UFX.scene.replaying = false

UFX.scene.init = function (maxups, minups) {
    maxups = maxups || 300
    minups = minups || 10
    UFX.ticker.registersync(UFX.scene.think, UFX.scene.draw, maxups, minups)
    UFX.scene.record = []
    UFX.scene.jrecord = 0
}

UFX.scene._actionq = []
UFX.scene.top = function () {
    var n = UFX.scene._stack.length
    return n ? UFX.scene._stack[n-1] : null
}
UFX.scene.ipush = function (c) {
    var old = UFX.scene.top()
    if (old) old.suspend()
    UFX.scene._stack.push(c)
    c.start()
}
UFX.scene.ipop = function () {
    var c = UFX.scene._stack.pop()
    c.stop()
    var n = UFX.scene.top()
    if (n) n.resume()
    return c
}
UFX.scene.iswap = function (c) {
	var c0 = UFX.scene._stack.pop()
	c0.stop()
	UFX.scene._stack.push(c)
	c.start()
	return c0
}
UFX.scene.push = function (c) { UFX.scene._actionq.push(["push", c]) }
UFX.scene.pop = function (c) { UFX.scene._actionq.push(["pop"]) }
UFX.scene.swap = function (c) { UFX.scene._actionq.push(["swap", c]) }
UFX.scene._resolveq = function () {
    for (var j = 0 ; j < UFX.scene._actionq.length ; ++j) {
        switch (UFX.scene._actionq[j][0]) {
            case "push": UFX.scene.ipush(UFX.scene._actionq[j][1]) ; break
            case "pop": UFX.scene.ipop() ; break
            case "swap": UFX.scene.iswap(UFX.scene._actionq[j][1]) ; break
        }
    }
    UFX.scene._actionq = []
}
UFX.scene.think = function () {
    var c = UFX.scene.top()
    UFX.scene._lastthinker = c
    if (c) {
        if (UFX.scene.replaying) {
            var args = UFX.scene.record[UFX.scene.jrecord]
//            UFX.scene.record = UFX.scene.record.splice(1)
            UFX.scene.jrecord++
            if (UFX.scene.jrecord >= UFX.scene.record.length) {
                UFX.scene.replaying = false
            }
        } else {
            var args = c.thinkargs.apply(c, arguments)
            if (UFX.scene.recording) {
                UFX.scene.record.push(args)
            }
        }
        c.think.apply(c, args)
    }
}
UFX.scene.draw = function (f) {
    if (UFX.scene._lastthinker) {
        UFX.scene._lastthinker.draw(f)
    }
    UFX.scene._resolveq()
}

// Use this as a prototype for your own scenes
UFX.scene.Scene = {
    thinkargs: function () {
        return arguments
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



