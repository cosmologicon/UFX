// The scene module - keeps track of the scene stack

if (typeof UFX == "undefined") UFX = {}
UFX.scene = {}

UFX.scene.init = function (maxups, minups) {
    maxups = maxups || 300
    minups = minups || 10
    UFX.ticker.registersync(UFX.scene.think, UFX.scene.draw, maxups, minups)
}

UFX.scene._actionq = []
UFX.scene._stack = []

UFX.scene.top = function () {
    var n = UFX.scene._stack.length
    return n ? UFX.scene._stack[n-1] : null
}
UFX.scene.ipush = function (c) {
    var old = UFX.scene.top()
    if (old) old.suspend()
    UFX.scene._stack.push(c)
    var args = UFX.scene.playback.resolvestartargs(c, Array.prototype.slice.call(arguments, 1))
    if (c.start) c.start.apply(c, args)
}
UFX.scene.ipop = function () {
    var c = UFX.scene._stack.pop()
    if (c.stop) c.stop()
    var n = UFX.scene.top()
    if (n && n.resume) n.resume()
    return c
}
UFX.scene.iswap = function (c) {
    var c0 = UFX.scene._stack.pop()
    if (c0.stop) c0.stop()
    UFX.scene._stack.push(c)
    var args = UFX.scene.playback.resolvestartargs(c, Array.prototype.slice.call(arguments, 1))
    if (c.start) c.start.apply(c, args)
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
    UFX.scene._resolveq()
    var c = UFX.scene.top()
    UFX.scene._lastthinker = c
    if (c) {
        var args = UFX.scene.playback.resolvethinkargs(c, arguments)
        if (c.think) c.think.apply(c, args)
    }
}
UFX.scene.draw = function () {
	var c = UFX.scene._lastthinker
    if (c && c.draw) {
        c.draw.apply(c, arguments)
    }
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

UFX.scene.playback = {
    seq: [],
    playing: false,
    recording: false,
    trimempty: false,
    seqlimit: 10000000,
    
    resolvestartargs: function (c, args) {
        if (this.playing) return this.pop()
        if (c.startargs) args = c.startargs.apply(c, args)
        if (this.trimempty) args = this.trim(args)
        if (this.recording) this.push(args)
        return args
    },
    resolvethinkargs: function (c, args) {
        if (this.playing) return this.pop()
        if (c.thinkargs) args = c.thinkargs.apply(c, args)
        if (this.trimempty) args = this.trim(args)
        if (this.recording) this.push(args)
        return args
    },
    reset: function () {
        this.seq = []
        this.jrecord = 0
        this.playing = false
        this.recording = false
    },
    record: function () {
        var s = this.seq
        this.reset()
        this.recording = true
        return s
    },
    play: function (state, callback) {
        this.reset()
        this.seq = toString.call(state) == "[Object String]" ? JSON.parse(state) : state
        this.playing = true
        this.playcallback = callback
    },
    stop: function () {
        if (this.playing) {
            this.playing = false
        }
        if (this.recording) {
            this.recording = false
            return this.seq
        }
    },
    pop: function () {
        var r = this.seq[this.jrecord]
        this.jrecord++
        if (this.jrecord >= this.seq.length) {
            this.replaying = false
            if (this.playcallback) this.playcallback()
        }
    },
    push: function (args) {
        if (this.seqlimit && this.seq.length >= this.seqlimit) return
        this.seq.push(args)
    },
    // Eliminate empty/falsy statements from the end of a list
    trim: function (list) {
        for (var j = list.length - 1 ; j >= 0 ; --j) {
            var x = list[j]
            if (!x) continue
            var s = JSON.stringify(x)
            if (s === "{}" || s === "[]") continue
            return j == list.length - 1 ? list : list.slice(0, j+1)
        }
        return []
    },
}




