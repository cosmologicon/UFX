// UFX.resource: load external resources

// Basic usage:
// 1. define the callback UFX.resource.onloading(f), which will be called every time a resource is
//    loaded, with f the fraction of resources loaded
// 2. define the callback UFX.resource.onload(), which will be called when the last resource has
//    loaded
// 3. call UFX.resource.load(res), where res is an object mapping names to urls

// The resources will be loaded into the objects UFX.resource.images, UFX.resource.sounds, and
// UFX.resource.data, based on the url extension, and parsed into the appropriate type.

// opts.skipcount: set to true for this resource to not count toward the progress bar.
// opts.skiponloading: set to true to avoid calling UFX.resource.onloading when this resource loads.
// opts.onload: callback specific to this resource.


// TODO: add documentation to the unifac wiki

"use strict"
var UFX = UFX || {}
UFX.resource = {
	// These will become populated as you call load
	images: {},
	sounds: {},
	data: {},

	// Recognized extensions
	jsontypes: "js json".split(" "),
	imagetypes: "png gif jpg jpeg bmp tiff".split(" "),
	soundtypes: "wav mp3 ogg au".split(" "),
	rawtypes: "csv txt frag vert".split(" "),

	// Base path for loading resources
	base: null,

	// If false, then it is an error to call load for the same resource name twice.
	allowduplicate: false,

	soundvolume: undefined,
	musicvolume: undefined,
	audiovolume: undefined,

	// Set this to a function that should be called when all resources are loaded
	onload: function () {},

	// Set this to a function that should be called while resources are loading. Arguments are:
	// f: a number between 0 and 1, the fraction of resources that have loaded successfully.
	onloading: function (f, obj, objtype, objname, url) {},

	// Give it a bunch of resource URLs to preload.
	// Resource type (image or audio) is determined by extension
	// Can call as:
	//   load(url) or
	//   load(url1, url2, url3, ...) or
	//   load(array-of-urls) or
	//   load({name1: url1, name2: url2, ... })
	// If you use the last syntax, then you can key off UFX.resource.images and UFX.resource.sounds
	//   as UFX.resource.images[name1], etc.
	// Otherwise key as UFX.resource.images[url1], etc.
	load: function () {
		var r = UFX.resource._extractlist(arguments), reslist = r[0], opts = r[1]
		for (var j = 0 ; j < reslist.length ; ++j) {
			var res = reslist[j]
			this._load(res[0], res[1], opts)
		}
		if (this._toload === 0) {
			setTimeout(this.onload, 0)
		}
	},

	// Calling loadimage or loadsound is recommended when the resource type cannot be auto-detected
	//   from the URL. Or if you just want to be explicit about it.
	// Same calling conventions as load.
	loadimage: function () {
		var r = UFX.resource._extractlist(arguments), reslist = r[0], opts = r[1]
		for (var j = 0 ; j < reslist.length ; ++j) {
			var res = reslist[j]
			this._loadimage(res[0], res[1], opts)
		}
	},
	loadsound: function () {
		var r = UFX.resource._extractlist(arguments), reslist = r[0], opts = r[1]
		for (var j = 0 ; j < reslist.length ; ++j) {
			var res = reslist[j]
			this._loadsound(res[0], res[1], opts)
		}
	},
	loadjson: function () {
		var r = UFX.resource._extractlist(arguments), reslist = r[0], opts = r[1]
		for (var j = 0 ; j < reslist.length ; ++j) {
			var res = reslist[j]
			this._loadjson(res[0], res[1], opts)
		}
	},
	loadbuffer: function () {
		var r = UFX.resource._extractlist(arguments), reslist = r[0], opts = r[1]
		for (var j = 0 ; j < reslist.length ; ++j) {
			var res = reslist[j]
			this._loadbuffer(res[0], res[1], opts)
		}
	},
	loadaudiobuffer: function (audiocontext) {
		var r = UFX.resource._extractlist([].slice.call(arguments, 1)), reslist = r[0], opts = r[1]
		for (var j = 0 ; j < reslist.length ; ++j) {
			var res = reslist[j]
			this._loadaudiobuffer(audiocontext, res[0], res[1], opts)
		}
	},
	// Called if the given audio context returns an error when decoding the audio buffer specified
	// by the given name. Override if you want a different error handler.
	onaudiobuffererror: function (audiocontext, buffer, name, error) {
		console.error('UFX.resource error decoding audio "' + name + '": ' + error)
	},

	// Load Google web fonts
	loadwebfonts: function () {
		var args = [].slice.call(arguments), opts = {}
		if (typeof args[args.length - 1] != "string") {
			var oopts = args.pop()
			for (var s in oopts) opts[s] = oopts[s]
		}
		WebFontConfig = {
			google: { families: args },
			fontactive: function (familyname, fvd) {
				UFX.resource._onload(null, "fonts", familyname + "-" + fvd, familyname, opts)
			},
		}
		var wf = document.createElement("script")
		wf.src = "https://ajax.googleapis.com/ajax/libs/webfont/1.6.26/webfont.js"
		wf.type = "text/javascript"
		wf.async = "true"
		document.getElementsByTagName("head")[0].appendChild(wf)
		if (!opts.skipcount) this._toload += args.length
	},

	setsoundvolume: function (v) {
		this.soundsvolume = v
	},
	setmusicvolume: function (v) {
		this.musicvolume = v
		if (this.musicplaying) this.musicplaying.volume = this._getmusicvolume()
	},
	setaudiovolume: function (v) {
		this.audiovolume = v
		if (this.musicplaying) this.musicplaying.volume = this._getmusicvolume()
	},
	playsound: function (sname) {
		var s = this.sounds[sname]
		if (!s) {
			console.log("Missing sound: " + sname)
			return
		}
		var v = this.soundvolume === undefined ? this.audiovolume : this.soundvolume
		if (v === undefined) v = 1
		s.volume = v
		s.play()
	},
	musicplaying: null,
	_getmusicvolume: function () {
		if (this.musicvolume !== undefined) return this.musicvolume
		if (this.audiovolume !== undefined) return this.audiovolume
		return 1
	},
	playmusic: function (mname, noloop) {
		this._completependingfades()
		if (!mname) return this.stopmusic()
		var m = this.sounds[mname]
		if (!m) {
			console.log("Missing music: " + mname)
			return
		}
		if (m === this.musicplaying) return
		this.stopmusic()
		m.volume = this._getmusicvolume()
		m.currentTime = 0
		m.play()
		m.loop = !noloop
		this.musicplaying = m
	},
	stopmusic: function () {
		this._completependingfades()
		if (this.musicplaying) this.musicplaying.pause()
		this.musicplaying = null
	},
	_fadeouttime0: 1400,
	_fadeintime0: 1400,
	_fadegap0: 0,
	setfadetime: function (fadeouttime, fadeintime, fadegap) {
		if (fadeouttime !== undefined) this._fadeouttime0 = fadeouttime
		if (fadeintime !== undefined) this._fadeintime0 = fadeintime
		if (fadegap !== undefined) this._fadegap0 = fadegap
	},
	setcrossfade: function (crossfadetime) {
		if (crossfadetime === undefined) crossfadetime = this._fadetime
		this.setfadetime(crossfadetime, crossfadetime, -crossfadetime)
	},
	_completependingfades: function () {
		if (this._fadetimeout) {
			window.clearTimeout(this._fadetimeout)
			this._fadeinstart = -1
			this._fadeoutstart = -1
			this._fadecallback()
		}
	},
	fadetomusic: function (mname, fadeouttime, fadeintime, fadegap, noloop) {
		this._completependingfades()
		if (this.musicplaying && mname && this.sounds[mname] === this.musicplaying) return
		this._fadeouttime = fadeouttime === undefined ? this._fadeouttime0 : fadeouttime
		this._fadeintime = fadeintime === undefined ? this._fadeintime0 : fadeintime
		this._fadegap = fadegap === undefined ? this._fadegap0 : fadegap
		this._fadeoutstart = Date.now()
		this._fadeinstart = this._fadeoutstart + (this.musicplaying ? this._fadeintime + this._fadegap : 0)
		this._pendingmname = mname
		this._pendingnoloop = noloop
		this._outgoingmusic = this.musicplaying
		this.musicplaying = null
		this._fadecallback()
	},
	crossfadetomusic: function (mname, crossfadetime, noloop) {
		if (crossfadetime === undefined) crossfadetime = this._fadeouttime
		this.fadetomusic(mname, crossfadetime, crossfadetime, -crossfadetime, noloop)
	},
	_fadecallback: function () {
		if (this._outgoingmusic) {
			var dtout = Date.now() - this._fadeoutstart
			var fout = this._fadeouttime > 0 ? 1 - dtout / this._fadeouttime : dtout > 0 ? 0 : 1
			if (fout > 0) {
				this._outgoingmusic.volume = fout * this._getmusicvolume()
			} else {
				this._outgoingmusic.pause()
				this._outgoingmusic = null
			}
		}
		if (this._pendingmname) {
			var dtin = Date.now() - this._fadeinstart
			var fin = this._fadeintime > 0 ? dtin / this._fadeintime : dtin > 0 ? 1 : 0
			if (fin > 0) {
				if (!this.musicplaying) {
					var m = this.sounds[this._pendingmname]
					if (!m) {
						console.log("Missing music: " + mname)
					} else {
						m.currentTime = 0
						m.volume = 0
						m.play()
						m.loop = !this._pendingnoloop
						this.musicplaying = m
					}
				}
				if (fin >= 1) {
					this.musicplaying.volume = this._getmusicvolume()
					this._pendingmname = null
				} else {
					this.musicplaying.volume = fin * this._getmusicvolume()
				}
			}
		}
		if (this._outgoingmusic || this._pendingmname) {
			this._fadetimeout = window.setTimeout(this._fadecallback.bind(this), 100)
		} else {
			this._fadetimeout = null
		}
	},

	// Firefox won't let me play a sound more than once every 10 seconds or so.
	// Use this class to create a set of identical sounds if you want to play in rapid succession
	// url can be a sound or a sound.src attribute. Multisound doesn't participate in the loading
	//   cycle, so you should have the url already preloaded when you call this factory.
	// n is the number of identical copies. Defaults to 10.
	Multisound: function (url, n) {
		if (!(this instanceof UFX.resource.Multisound))
			return new UFX.resource.SoundRandomizer(url, n)
		this._init(url, n)
	},

	// Sometimes when you've got a sound that plays over and over again (like gunshots) you want to
	// add a small amount of variation. Pass a list of closely-related sounds to this class to get an
	// object that lets you play one at random. Requires UFX.random.
	SoundRandomizer: function (slist, nskip) {
		if (!(this instanceof UFX.resource.SoundRandomizer))
			return new UFX.resource.SoundRandomizer(slist, nskip)
		this._sounds = []
		for (var j = 0 ; j < slist.length ; ++j) {
			this._sounds.push(typeof slist[j] == "string" ? UFX.resource.sounds[slist[j]] : slist[j])
		}
		this._nskip = Math.min(this._sounds.length - 1, (nskip || 3))
		this._played = []
		this.volume = 1.0
	},

	mergesounds: function () {
		for (var j = 0 ; j < arguments.length ; ++j) {
			var slist = [], sname = arguments[j]
			for (var s in UFX.resource.sounds) {
				if (s.indexOf(sname) == 0) {
					slist.push(s)
				}
			}
			this.sounds[sname] = this.SoundRandomizer(slist)
		}
	},

	_seturl: function (url) {
		if (!this.base) return url
		var n = UFX.resource.base.length
		if (!n) return url
		return this.base + (this.base.charAt(n-1) == "/" ? "" : "/") + url
	},

	// Try to deduce what type the resource is based on the url
	_load: function (name, url, opts) {
		if (url.indexOf(".") == -1) {
			console.log("Treating extensionless URL " + url + " as raw data")
			return this._loaddata(name, url, opts)
		}
		var ext = url.split(".").pop()
		if (this.imagetypes.indexOf(ext) > -1) {
			return this._loadimage(name, url, opts)
		} else if (this.soundtypes.indexOf(ext) > -1) {
			return this._loadsound(name, url, opts)
		} else if (this.jsontypes.indexOf(ext) > -1) {
			return this._loadjson(name, url, opts)
		} else if (this.rawtypes.indexOf(ext) > -1) {
			return this._loaddata(name, url, opts)
		}
		console.log("Treating unknown extension " + ext + " as raw data")
		return this._loaddata(name, url, opts)
	},

	// Load a single image with the given name
	_loadimage: function (iname, imageurl, opts) {
		this._checkdupe("images", iname)
		var img = new Image()
		img.onload = function () {
			UFX.resource._onload(img, "images", iname, imageurl, opts)
		}
		imageurl = this._seturl(imageurl)
		img.src = imageurl
		img.iname = iname
		this.images[iname] = img
		if (!opts.skipcount) ++this._toload
	},
	// Load a single audio file with the given name
	_loadsound: function (aname, audiourl, opts) {
		this._checkdupe("sounds", aname)
		var audio = new Audio()
		audio.addEventListener("canplaythrough", function () {
			UFX.resource._onload(audio, "sounds", aname, audiourl, opts)
		}, false)
		audio.src = this._seturl(audiourl)
		audio.aname = aname
		this.sounds[aname] = audio
		if (!opts.skipcount) ++this._toload
	},
	// Load a single json resource
	_loadjson: function (jname, jsonurl, opts) {
		this._checkdupe("data", jname)
		var req = new XMLHttpRequest()
		req.overrideMimeType("application/json")
		req.open('GET', jsonurl, true); 
		req.onload = function() {
			UFX.resource.data[jname] = JSON.parse(req.responseText)
			UFX.resource._onload(UFX.resource.data[jname], "data", jname, jsonurl, opts)
		}
		req.send(null)
		if (!opts.skipcount) ++this._toload
	},
	// Load a raw data resource
	_loaddata: function (dname, dataurl, opts) {
		this._checkdupe("data", dname)
		var req = new XMLHttpRequest()
		req.open('GET', dataurl, true)
		req.onload = function() {
			UFX.resource.data[dname] = req.responseText
			UFX.resource._onload(UFX.resource.data[dname], "data", dname, dataurl, opts)
		}
		req.send(null)
		if (!opts.skipcount) ++this._toload
	},
	// Load a raw data resource as an arraybuffer
	_loadbuffer: function (dname, dataurl, opts) {
		this._checkdupe("data", dname)
		var req = new XMLHttpRequest()
		req.open("GET", dataurl, true)
		req.responseType = "arraybuffer"
		req.onload  = function () {
			UFX.resource.data[dname] = req.response
			UFX.resource._onload(UFX.resource.data[dname], "data", dname, dataurl, opts)
		}
		req.send(null)
		if (!opts.skipcount) ++this._toload
	},
	// Load a raw data resource as an audio buffer
	_loadaudiobuffer: function (audiocontext, dname, dataurl, opts) {
		this._checkdupe("data", dname)
		var req = new XMLHttpRequest()
		req.open("GET", dataurl, true)
		req.responseType = "arraybuffer"
		req.onload = function () {
			audiocontext.decodeAudioData(req.response, function (buffer) {
				UFX.resource.data[dname] = buffer
				UFX.resource._onload(UFX.resource.data[dname], "data", dname, dataurl, opts)
			}, function (err) {
				UFX.resource.onaudiobuffererror(audiocontext, req.response, dname, err)
				UFX.resource._onload(UFX.resource.data[dname], "data", dname, dataurl, opts)
			})
		}
		req.send(null)
		if (!opts.skipcount) ++this._toload
	},


	_seenvalues: {},
	_checkdupe: function (otype, oname) {
		var key = otype + "." + oname
		var isdupe = this._seenvalues[key]
		this._seenvalues[key] = true
		if (isdupe && !this.allowduplicate) {
			throw 'Duplicate resource loaded: "' + oname + '" of type: ' + otype
		}
	},

	// Extracts one of several forms of argument lists:
	//   s1 s2 s3 ... [opts]
	//   [s1 s2 s3 ...] [opts]
	//   [[k1, v1] [k2, v2], ...] [opts]
	//   {k1: v1, k2: v2, ...} [opts]
	// The s, k, and v values are strings. opts is an object. If no object is specified, the empty
	// object is returned.
	_extractlist: function (args) {
		if (args.length < 1) throw "Error extracting arguments: empty argument list"
		var ret = []
		var opts = {}
		var seenobj = false
		for (var j = 0 ; j < args.length ; ++j) {
			var arg = args[j]
			var isstring = typeof arg == "string"
			var isarray = arg instanceof Array
			var islast = j == args.length - 1
			if (isstring) {
				if (seenobj) throw "Error extracting arguments: string mixed with non-string."
				ret.push([arg, arg])
			} else if (isarray) {
				if (j != 0) throw "Error extracting arguments: Array must be first arg."
				for (var k = 0 ; k < arg.length ; ++k) {
					if (arg[k] instanceof Array) {
						ret.push([arg[k][0], arg[k][1]])
					} else  {
						ret.push([arg[k], arg[k]])
					}
				}
				seenobj = true
			} else {
				if (j == 0) {
					for (var k in arg) {
						ret.push([k, arg[k]])
					}
				} else if (islast) {
					opts = arg
				} else {
					throw "Error extracting arguments: object must be first or last arg."
				}
				seenobj = true
			}
		}
		for (var j = 0 ; j < ret.length ; ++j) {
			if (typeof ret[j][0] != "string" || typeof ret[j][1] != "string") {
				throw "Error extracting arguments: non-string (" + ret[j][0] + ", " + ret[j][1] + ")"
			}
		}
		// Prevent any changes from the given opts object from affecting callbacks.
		var ropts = {}
		for (var s in opts) ropts[s] = opts[s]
		return [ret, opts]
	},

	_toload: 0,
	_loaded: 0,
	// obj: the newly loaded object
	// objtype: one of "image", "sound", "data"
	// objname: string
	// url: string
	// opts: options object
	_onload: function (obj, objtype, objname, url, opts) {
		var newlycomplete = false
		if (!opts.skipcount) {
			++UFX.resource._loaded
			if (UFX.resource._loaded == UFX.resource._toload) newlycomplete = true
		}
		var f = UFX.resource._loaded / UFX.resource._toload
		UFX.resource.onloading(f, obj, objtype, objname, url)
		if (opts.onload) {
			opts.onload(obj, objtype, objname, url)
		}
		if (newlycomplete) {
			UFX.resource.onload()
		}
	},
}

var WebFontConfig

UFX.resource.Multisound.prototype = {
	_init: function (url, n) {
		this.src = typeof url == "string" ? url : url.src
		this._sounds = []
		this._n = n || 10
		this._k = 0
		this.volume = 1.0
		for (var j = 0 ; j < this._n ; ++j) {
			var s = new Audio()
			s.src = this.src
			this._sounds.push(s)
		}
	},
	play: function () {
		var s = this._sounds[this._k++]
		this._k %= this._n
		s.volume = this.volume
		s.play()
	},
	pause: function () {
		for (var j = 0 ; j < this._n ; ++j) {
			this._sounds[j].pause()
		}
	},
}

UFX.resource.SoundRandomizer.prototype = {
	play: function () {
		do {
			var k = UFX.random.rand(this._sounds.length)
		} while (this._played.indexOf(k) > -1)
		var s = this._sounds[k]
		s.volume = this.volume
		s.play()
		if (this._nskip) {
			this._played.push(k)
			while (this._played.length >= this._nskip)
			this._played = this._played.slice(1)
		}
	},
	pause: function () {
		for (var j = 0 ; j < this._sounds.length ; ++j) {
			this._sounds[j].pause()
		}
	},
}

