// Thing - component-based game object

if (typeof UFX == "undefined") UFX = {}

// Thing factory/constructor. Give it a Component or a list of Components
UFX.Thing = function (comps) {
    var thing = Object.create(UFX.Thing.prototype)
    thing._comps = []
    if (comps) {
        thing.addcomp(comps)
    }
    return thing
}
UFX.Thing.prototype = {
    definemethod: function (mname) {
        if (this[mname]) return
        var mlist = []
        this[mname] = function () {
            var ret
            for (var j = 0 ; j < mlist.length ; ++j) {
                ret = mlist[j].apply(this, arguments)
            }
            return ret
        }
        this[mname].mlist = mlist
        return this
    },
    addcomp: function (comp) {
        if (comp instanceof Array) {
            for (var j = 0 ; j < comp.length ; ++j) {
                this.addcomp(comp[j])
            }
            return this
        }
        for (var mname in comp) {
            if (mname == "init" || mname == "remove") continue
            if (typeof comp[mname] != "function") continue
            this.definemethod(mname)
            this[mname].mlist.push(comp[mname])
        }
        this._comps.push(comp)
        if (comp.init) {
            comp.init.apply(this, [].slice.call(arguments, 1))
        }
        return this
    },
    removecomp: function (comp) {
        if (comp instanceof Array) {
            for (var j = 0 ; j < comp.length ; ++j) {
                this.removecomp(comp[j])
            }
            return
        }
        if (comp.remove) {
            comp.remove.apply(this, [].slice.call(arguments, 1))
        }
        for (var mname in comp) {
            if (mname == "init" || mname == "remove") continue
            if (!(mname in this)) continue
            this[mname].mlist = this[mname].mlist.filter(function (m) { return m !== comp[mname] })
        }
        this._comps.push(comp)
    },
}



UFX.Component = {}

UFX.Component.HasChildren = {
    init: function () {
        this.children = []
    },
    nchildren: function () {
        return this.children.length
    },
    _addchild: function (child) {
        this.children.push(child)
        return this
    },
    _removechild: function (child) {
        this.children = this.children.filter(function (c) { return c !== child })
        return this
    },
    lastchild: function () {
        return this.children[this.children.length - 1]
    },
    die: function () {
        for (var j = 0 ; j < this.children.length ; ++j) {
            this.children[j].die()
        }
    },
    think: function (dt) {
        for (var j = 0 ; j < this.children.length ; ++j) {
            this.children[j].think(dt)
        }
    },
    draw: function (context) {
        for (var j = 0 ; j < this.children.length ; ++j) {
            context.save()
            this.children[j].draw(context)
            context.restore()
        }
    },
}

UFX.Component.SortChildren = {
    addchild: function (child) {
        this.children.sort(function(a,b) { return a.z - b.z })
    }
}

UFX.Component.HasParent = {
    init: function (parent) {
        this.attachto(parent)
    },
    attachto: function (parent) {
        if (this.parent) {
            this.parent._removechild(this)
        }
        this.parent = parent
        if (this.parent) {
            this.parent._addchild(this)
        }
        return this
    },
    detach: function () {
        return this.attachto()
    },
    die: function () {
        return this.detach()
    },
}

