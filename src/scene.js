// The scene module - keeps track of the scene stack

if (typeof UFX == "undefined") UFX = {}

UFX.SceneStack = function () {
    if (!(this instanceof UFX.SceneStack)) return new UFX.SceneStack()
	this._actionq = []
	this._stack = []
	this.resolveargs = true
	this.recorder = null
	this.frozen = false
}
UFX.SceneStack.prototype = {
	init: function (maxups, minups) {
		maxups = maxups || 300
		minups = minups || 10
		var scenestack = this
		UFX.ticker.registersync(
			function () { return scenestack.think.apply(scenestack, arguments) },
			function () { return scenestack.draw.apply(scenestack, arguments) },
			maxups, minups
		)
	},
	top: function () {
		var n = this._stack.length
		return n ? this._stack[n-1] : null
	},
	getscene: function (c) {
		if (typeof c === "string") {
			if (!(c in UFX.scenes)) throw "Unrecognized scene: " + c
			return UFX.scenes[c]
		}
		return c
	},
	ipush: function (cname) {
	    if (this.frozen) return
		var old = this.top()
		if (old && old.suspend) old.suspend()
		var c = this.getscene(cname)
		this._stack.push(c)
		var args = Array.prototype.slice.call(arguments, 1)
		if (this.resolveargs && c.startargs) args = c.startargs.apply(c, args)
		if (this.recorder) this.recorder.addpush(cname, args)
		if (c.start) c.start.apply(c, args)
	},
	ipop: function () {
	    if (this.frozen) return
		var c = this._stack.pop()
		if (c.stop) c.stop()
		var n = this.top()
		if (n && n.resume) n.resume()
		if (this.recorder) this.recorder.addpop()
		return c
	},
	iswap: function (cname) {
	    if (this.frozen) return
		var c0 = this._stack.pop()
		if (c0 && c0.stop) c0.stop()
		var c = this.getscene(cname)
		this._stack.push(c)
		var args = Array.prototype.slice.call(arguments, 1)
		if (this.resolveargs && c.startargs) args = c.startargs.apply(c, args)
		if (this.recorder) this.recorder.addswap(cname, args)
		if (c.start) c.start.apply(c, args)
		return c0
	},
	push: function () {
	    this._actionq.push(["push", Array.prototype.slice.call(arguments, 0)])
    },
	pop: function () {
	    this._actionq.push(["pop"])
    },
	swap: function () {
	    this._actionq.push(["swap", Array.prototype.slice.call(arguments, 0)])
    },
	_resolveq: function () {
		for (var j = 0 ; j < this._actionq.length ; ++j) {
		    switch (this._actionq[j][0]) {
		        case "push": this.ipush.apply(this, this._actionq[j][1]) ; break
		        case "pop": this.ipop() ; break
		        case "swap": this.iswap.apply(this, this._actionq[j][1]) ; break
		    }
		}
		this._actionq = []
	},
    think: function () {
        this._resolveq()
        var c = this.top()
        this._lastthinker = c
        if (c) {
            var args = arguments
            if (this.resolveargs && c.thinkargs) args = c.thinkargs.apply(c, args)
            if (this.recorder) this.recorder.addthink(args)
            if (c.think) c.think.apply(c, args)
        }
    },
    draw: function () {
	    var c = this._lastthinker
        if (c && c.draw) {
            c.draw.apply(c, arguments)
        }
    },
}
// The default for your basic scene stack needs
UFX.scene = new UFX.SceneStack()
UFX.scenes = {}

