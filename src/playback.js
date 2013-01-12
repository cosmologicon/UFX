// Requires UFX.scene

UFX.Recorder = function (obj) {
    if (!(this instanceof UFX.Recorder)) return new UFX.Recorder(obj)
    this.init(obj)
}

UFX.Recorder.prototype = {
    init: function (obj) {
        obj = obj || {}
        this.setnames(obj.gamename, obj.version, obj.playername, obj.sessionname)
        this.setstatefuncs(obj.getprestate, obj.getstate, obj.getpoststate)
        this.sethandler(obj.handler)
        this.setscene(obj.scene || UFX.scene, obj.tethered, obj.tetherswap)
        this.receiverscript = obj.receiverscript
        this.keepchapters = obj.keepchapters
        return this.session
    },
    // Register to record with a scene stack (pass in null in order to de-register)
    setnames: function (gamename, version, playername, sessionname) {
        this.gamename = gamename
        this.version = version
        this.playername = playername
        this.sessionname = sessionname || "" + Date.now()
    },
    setstatefuncs: function (getprestate, getstate, getpoststate) {
        this.getprestate = getprestate
        this.getstate = getstate
        this.getpoststate = getpoststate
    },
    sethandler: function (handler) {
        this.handler = handler
    },
    setscene: function (scene, tethered, tetherswap) {
        if (this.scene) this.scene.recorder = null
        this.scene = scene
        this.nchapters = 0
        if (this.scene) {
            if (this.scene.recorder) {
                throw "Specified recording scene already has associated playback"
            }
            this.scene.recorder = this
            this.prestate = this.getprestate && this.getprestate()
            this.state = []
            this.chapters = []
            this.sessionstart = Date.now()
            this.startchapter()
            this.tethered = tethered
            this.tetherswap = tetherswap
        }
        this.session = {
            gamename: this.gamename,
            version: this.version,
            playername: this.playername,
            name: this.sessionname,
            chapters: this.chapters,
            nchapters: this.nchapters,
            t: this.sessionstart,
        }
    },
    stop: function () {
        this.completechapter()
        var session = this.session
        this.setscene()
        return session
    },
    startchapter: function () {
        var chapter = this.chapter
        this.poststate = this.getpoststate && this.getpoststate()
        this.chapter = {
            n: this.nchapters++,
            t: Date.now(),
            prestate: this.prestate,
            state: this.state.slice(0),
            poststate: this.poststate,
            data: []
        }
        this.chapters.push(this.chapter)
        this.data = this.chapter.data
        this.lastdatum = null
        return chapter
    },
    completechapter: function () {
        var jchapter = this.nchapters - 1
        if (this.receiverscript) {
            this.pushchapter(jchapter)
            if (!this.keepchapters) {
                this.chapters[jchapter] = null
            }
        } else {
            return this.chapters[jchapter]
        }
    },
    checkpoint: function () {
        if (!this.chapter.data.length) return
        var chapter = this.completechapter()
        this.startchapter()
        return chapter
    },
    addpush: function (scenename, args) {
        this.lastdatum = [Date.now(), "push", scenename, args]
        this.data.push(this.lastdatum)
        var state = this.getstate && this.getstate()
        this.state.push([scenename, args, state])
    },
    addpop: function () {
        this.lastdatum = [Date.now(), "pop"]
        this.data.push(this.lastdatum)
        this.state.pop()
        if (!this.state.length && this.tethered) this.stop()
    },
    addswap: function (scenename, args) {
        this.lastdatum = [Date.now(), "swap", scenename, args]
        this.data.push(this.lastdatum)
        var state = this.getstate && this.getstate()
        this.state.pop()
        if (!this.state.length && this.tethered && !this.tetherswap) this.stop()
        this.state.push([scenename, args, state])
    },
    addthink: function (args) {
        if (this.paused || this.scene.top().clipplayback) {
            return this.addclip()
        }
        if (!this.lastdatum || this.lastdatum[1] !== "think") {
            this.lastdatum = [Date.now(), "think"]
            this.data.push(this.lastdatum)
        }
        this.lastdatum.push(args)
    },
    addclip: function () {
        if (!this.lastdatum || this.lastdatum[1] !== "clip") {
            this.lastdatum = [Date.now(), "clip", 0, null]
            this.data.push(this.lastdatum)
        }
        this.lastdatum[2]++
        this.lastdatum[3] = Date.now()
    },
    handle: function (eventtype) {
        if (typeof eventtype !== "string") throw "Invalid event type: " + eventtype
        switch (eventtype) {
            case "push":  this.addpush(arguments[1], arguments[2]) ; break
            case "pop":   this.addpop() ; break
            case "swap":  this.addswap(arguments[1], arguments[2]) ; break
            case "think": this.addthink(arguments[1]) ; break
            case "clip":  this.addclip() ; break
            default:
                var args = Array.prototype.slice.call(arguments, 1)
                this.lastdatum = [Date.now(), eventtype, args]
                this.data.push(this.lastdatum)
                if (this.handler[eventtype]) {
                    this.handler[eventtype].apply(null, args)
                }
        }
    },
    pushchapter: function (jchapter) {
        var req = new XMLHttpRequest()
        req.open("POST", this.receiverscript)
        req.setRequestHeader("Content-type", "application/x-www-form-urlencoded")
        var qstring = [
            "gamename=" + encodeURIComponent(this.session.gamename),
            "gameversion=" + encodeURIComponent(this.session.version),
            "sessionname=" + encodeURIComponent(this.session.name),
            "sessiontime=" + encodeURIComponent(this.session.t),
            "chapternumber=" + encodeURIComponent(jchapter),
            "chapterdata=" + encodeURIComponent(JSON.stringify(this.chapters[jchapter])),
        ]
        if (this.playername) qstring.push("playername=" + encodeURIComponent(this.playername))

        req.send(qstring.join("&"))
    },
}

UFX.Playback = function (session, obj) {
    if (!(this instanceof UFX.Playback)) return new UFX.Playback(session, obj)
    this.session = session
    this.init(obj)
    this.playing = false
    this.stack = new UFX.SceneStack()
    this.stack.resolveargs = false
}

UFX.Playback.prototype = {
    init: function (obj) {
        obj = obj || {}
        this.setstatefuncs(obj.setprestate, obj.setstate, obj.setpoststate)
        this.sethandler(obj.handler)
        this.setscene(obj.scene || UFX.scene)
        this.syncfactor = obj.syncfactor || 1
        this.sync = obj.sync
        this.cancelcallback = obj.cancelcallback
    },
    setstatefuncs: function (setprestate, setstate, setpoststate) {
        this.setprestate = setprestate
        this.setstate = setstate
        this.setpoststate = setpoststate
    },
    sethandler: function (handler) {
        this.handler = handler
    },
    setscene: function (scene) {
        this.scene = scene
    },
    playall: function () {
        this.jchapter = 0
        this.t = 0
        this.playing = true
        this.loadchapter()
        this.scene.ipush(Object.create(this.PlayScene), this)
        this.scene.frozen = true
    },
    complete: function () {
        this.playing = false
        this.scene.frozen = false
        this.scene.pop()
    },
    loadchapter: function () {
        if (!this.session.chapters[this.jchapter]) return false
        this.chapter = JSON.parse(JSON.stringify(this.session.chapters[this.jchapter]))
        this.jdatum = 0
        this.jthink = 0
        return true
    },
    // Returns undefined for end of chapter
    nextdatum: function () {
        if (this.jdatum >= this.chapter.data.length) return
        var datum = this.chapter.data[this.jdatum]
        if (datum[1] === "think") {
            if (this.jthink < 2) this.jthink = 2
            if (this.jthink < datum.length) {
                return [datum[0], datum[1], datum[this.jthink++]]
            } else {
                this.jdatum++
                this.jthink = 0
                return this.nextdatum()
            }
        }
        this.jdatum++
        return datum
    },
    applypush: function (scenename, args) {
        this.stack.ipush.apply(this.stack, [scenename].concat(args))
    },
    applypop: function () {
        this.stack.ipop()
    },
    applyswap: function (scenename, args) {
        this.stack.iswap.apply(this.stack, [scenename].concat(args))
    },
    applythink: function (args) {
        this.stack.think.apply(this.stack, args)
        if (this.sync) this.t += args[0]
    },
    applyclip: function () {
    },
    handle: function (t, eventtype) {
        if (typeof eventtype !== "string") throw "Invalid event type: " + eventtype
        switch (eventtype) {
            case "push":  this.applypush(arguments[2], arguments[3]) ; break
            case "pop":   this.applypop() ; break
            case "swap":  this.applyswap(arguments[2], arguments[3]) ; break
            case "think": this.applythink(arguments[2]) ; break
            case "clip":  this.applyclip() ; break
            default:
                var args = Array.prototype.slice.call(arguments, 2)
                if (this.handler[eventtype]) {
                    this.handler[eventtype].apply(null, args)
                }
        }
    },
    step: function () {
        var datum = this.nextdatum()
        if (!datum) {
            this.jchapter++
            return this.loadchapter() && this.step()
        }
        this.handle.apply(this, datum)
        return true
    },
    PlayScene: {
        start: function (playback) {
            this.playback = playback
            this.t = 0
        },
        think: function (dt) {
            if (this.playback.sync) {
                this.t += dt * this.playback.syncfactor
                while (this.t > this.playback.t) {
                    if (!this.playback.step()) {
                        this.playback.complete()
                        return
                    }
                }
            } else {
                if (!this.playback.step()) this.playback.complete()
            }
        },
        draw: function () {
            this.playback.stack.draw()
        },
    },
}



