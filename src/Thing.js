// UFX.Thing: component-based entity system
// https://github.com/cosmologicon/UFX/wiki/UFX.Thing

"use strict"
var UFX = UFX || {}

// Thing factory/constructor.
// Takes a Component or a list of Components
UFX.Thing = function () {
	var thing = Object.create(UFX.Thing.prototype)
	for (var j = 0 ; j < arguments.length ; ++j) {
		thing.addcomp(arguments[j])
	}
	return thing
}
UFX.Thing.prototype = {
	// Create a method with the given spec
	// mname: method name (string)
	// mtype: method type (string, or reduce function, or null for default)
	// mlist: list of component methods
	_createmethod: function (mname, mtype, mlist) {
		mlist = mlist || []
		var f
		if (mtype === "sum") mtype = function (x, y) { return x + y }
		if (mtype === "min") mtype = function (x, y) { return Math.min(x, y) }
		if (mtype === "max") mtype = function (x, y) { return Math.max(x, y) }
		if (!mtype) {
			f = function () {
				var r
				for (var j = 0 ; j < mlist.length ; ++j) {
					r = mlist[j].apply(this, arguments)
				}
				return r
			}
		} else if (mtype === "some") {
			f = function () {
				var r = null
				for (var j = 0 ; j < mlist.length ; ++j) {
					r = mlist[j].apply(this, arguments)
					if (r) return r
				}
				return r
			}
		} else if (mtype === "every") {
			f = function () {
				var r
				for (var j = 0 ; j < mlist.length ; ++j) {
					r = mlist[j].apply(this, arguments)
					if (!r) return r
				}
				return r
			}
		} else if (mtype === "getarray") {
			f = function () {
				var r = []
				for (var j = 0 ; j < mlist.length ; ++j) {
					r.push(mlist[j].apply(this, arguments))
				}
				return r
			}
		} else if (mtype === "putarray") {
			f = function (arg) {
				var r = []
				for (var j = 0 ; j < mlist.length ; ++j) {
					r.push(mlist[j].apply(this, arg[j]))
				}
				return r
			}
		} else if (mtype instanceof Function) {
			f = function () {
				var r = []
				for (var j = 0 ; j < mlist.length ; ++j) {
					r.push(mlist[j].apply(this, arguments))
				}
				return r.reduce(mtype)
			}
		} else {
			throw "Unrecognized method type: " + mtype
		}
		f.mlist = mlist
		f.mtype = mtype
		this[mname] = f
	},
	definemethod: function (mname, mtype) {
		if (this[mname]) return this
		this._createmethod(mname, mtype)
		return this
	},
	addcomp: function (comp) {
		if (comp instanceof Array) {
			var args = [].slice.apply(arguments)
			for (var j = 0 ; j < comp.length ; ++j) {
				args[0] = comp[j]
				this.addcomp.apply(this, args)
			}
			return this
		}
		for (var mname in comp) {
			if (typeof comp[mname] != "function") continue
			if (mname == "init" || mname == "remove") continue
			this.definemethod(mname)
			this[mname].mlist.push(comp[mname])
		}
		if (comp.init) {
			comp.init.apply(this, [].slice.call(arguments, 1))
		}
		return this
	},
	removecomp: function (comp) {
		if (comp instanceof Array) {
			var args = [].slice.apply(arguments)
			for (var j = 0 ; j < comp.length ; ++j) {
				args[0] = comp[j]
				this.removecomp.apply(this, args)
			}
			return this
		}
		if (comp.init) {
			comp.init.apply(this, [].slice.call(arguments, 1))
		}
		for (var mname in comp) {
			if (typeof comp[mname] != "function") continue
			if (mname == "init" || mname == "remove") continue
			if (!this[mname]) continue
			this.definemethod(mname)
			this[mname].mlist = this[mname].mlist.filter(function (m) { return m !== comp[mname] })
		}
		return this
	},
	reversemethods: function (mname) {
		this[mname].mlist.reverse()
		return this
	},
	setmethodmode: function (mname, mtype) {
		this._createmethod(mname, mtype, (this[mname] ? this[mname].mlist : []))
		return this
	},
	normalize: function () {
		for (var mname in this) {
			if (!this.hasOwnProperty(mname)) continue
			var func = this[mname]
			if (!func.mlist || func.mlist.length != 1) continue
			if (func.mtype === "getarray" || func.mtype === "putarray") continue
			this[mname] = func.mlist[0]
		}
	},
}

