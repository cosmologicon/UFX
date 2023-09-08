// Web AudioContext convenience functions.
// This is not a wrapper library. It just aims to simplify some of the syntax for playing sounds.

"use strict"

var UFX = UFX || {}
UFX.audio = {
	context: null,
	// No need to call this directly. Override this if you want UFX.audio to use polyfill.
	newcontext: function () {
		return new AudioContext()
	},
	// Call to begin. Can optionally set the context to an AudioContext object. If none is specified
	// then one will be generated.
	init: function (acontext) {
		this.nodes = {}
		this._nextjnode = 0
		this.buffers = {}
		this.context = acontext || this.newcontext()
	},
	// Get the desired name of a node. If the opts don't specify one, then return a number that is
	// not currently in use.
	_getnodename: function (opts) {
		opts = opts || {}
		if (opts.name) return opts.name
		while (this.nodes["node_" + this._nextjnode]) ++this._nextjnode
		return "node_" + this._nextjnode++
	},
	// Add the given node to this.nodes and return it. If nodename is unspecified then a free name
	// will be chsen.
	addnode: function (node, nodename) {
		if (!this.context) this.init()
		if (nodename === undefined) nodename = this._getnodename()
		this.nodes[nodename] = node
		node.name = nodename
		return node
	},
	// Disconnect the node and remove it from the node graph, if present.
	_cleannode: function (node) {
		node.disconnect()
		if (this.nodes[node.name] === node) {
			delete this.nodes[node.name]
		}
	},
	_cleannodes: function (nodes) {
		nodes.forEach(node => this._cleannode(node))
	},
	// Create a buffer source with the given buffer or buffer name and play it immediately.
	playbuffer: function (buffer, opts) {
		if (!this.context) this.init()
		opts = opts || {}
		var node = this.makebuffernode(buffer, opts)
		node.start(this.context.currentTime + (opts.dt || 0))
		return node
	},
	// Retrieve the node corresponding to the given node or node name.
	_getnode: function (nodename) {
		if (nodename instanceof AudioNode) return nodename
		var node = this.nodes[nodename]
		if (!node) throw "Unrecognized node " + nodename
		return node
	},
	// Retrieve the AudioBuffer object corresponding to the given buffer or buffer name.
	_getbuffer: function (buffername) {
		if (buffername instanceof AudioBuffer) return buffername
		var buffer = this.buffers[buffername]
		if (!buffer) throw "Unrecognized buffer " + buffername
		return buffer
	},
	// Return the specified output, if any, or the context destination if not specified.
	_getoutput: function (output) {
		if (output === null) return null
		if (output) return this._getnode(output)
		return this.context.destination
	},
	// Set the gain of the specified gain node to the specified value.
	setgain: function (nodename, value, opts) {
		if (!this.context) this.init()
		opts = opts || {}
		var node = this._getnode(nodename), gain = node.gain
		var dt = opts.dt || 0, fade = opts.fade || 0, t0 = this.context.currentTime
		if (fade) {
			gain.setValueAtTime(gain.value, t0 + dt)  // Sets linearRamp start time to now.
			gain.linearRampToValueAtTime(value, t0 + dt + fade)
		} else {
			gain.setValueAtTime(value, t0 + dt)
		}
	},
	// Get the current gain of the specified gain node.
	getgain: function (nodename) {
		var node = this._getnode(nodename)
		return node.gain.value
	},
	// Create a gain node with the given options.
	makegainnode: function (opts) {
		if (!this.context) this.init()
		var node = this.addnode(this.context.createGain(), this._getnodename(opts))
		if (opts.gain !== undefined) this.setgain(node, opts.gain)
		var output = this._getoutput(opts.output)
		if (output) node.connect(output)
		return node
	},
	// Create a buffer node with the given options.
	makebuffernode: function (buffer, opts) {
		if (!this.context) this.init()
		opts = opts || {}
		var sourcename = this._getnodename(opts)
		var output = this._getoutput(opts.output)
		var nodes = []
		if ("gain" in opts || opts.addgain) {
			var gain = this.makegainnode({
				name: opts.gainname || sourcename + "_gain",
				output: output,
				gain: opts.gain,
			})
			output = gain
			nodes.push(gain)
		}
		var source = this.addnode(this.context.createBufferSource(), sourcename)
		nodes.push(source)
		source.buffer = this._getbuffer(buffer)
		if (opts.loop) {
			source.loop = opts.loop
		}
		var cleanup = "cleanup" in opts ? opts.cleanup : !opts.loop
		if (cleanup) {
			source.cleanup = () => this._cleannodes(nodes)
			source.addEventListener("ended", source.cleanup)
		}
		if (output) source.connect(output)
		return source
	},
	// Requires UFX.resource
	loadbuffers: function (objs) {
		var o = {}
		for (var s in objs) o[s + "_buffer"] = objs[s]
		UFX.resource.loadaudiobuffer(this.context, o, {
			onload: function (obj, objtype, objname) {
				UFX.audio.buffers[objname.slice(0, -7)] = obj
			},
		})
	},
}
