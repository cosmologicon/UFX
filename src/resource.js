// UFX.resource: load external resources

// Basic usage:
// 1. define the callback UFX.resource.onloading(f), which will be called every time a resource is
//    loaded, with f the fraction of resources loaded
// 2. define the callback UFX.resource.onload(), which will be called when the last resource has
//    loaded
// 3. call UFX.resource.load(res), where res is an object mapping names to urls

// The resources will be loaded into the objects UFX.resource.images, UFX.resource.sounds, and
// UFX.resource.data, based on the url extension, and parsed into the appropriate type.

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

	// Set this to a function that should be called when all resources are loaded
	onload: function () {},

	// Set this to a function that should be called while resources are loading.
	// It takes one argument, which is the fraction of resources that have loaded successfully.
	onloading: function (f) {},

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
		var resnames = UFX.resource._extractlist(arguments)
		for (var j = 0 ; j < resnames.length ; ++j) {
			var res = resnames[j]
			this._load(res[0], res[1])
		}
		if (this._toload === 0) {
			setTimeout(this.onload, 0)
		}
	},

	// Calling loadimage or loadsound is recommended when the resource type cannot be auto-detected
	//   from the URL. Or if you just want to be explicit about it.
	// Same calling conventions as load.
	loadimage: function () {
		var resnames = this._extractlist(arguments)
		for (var j = 0 ; j < resnames.length ; ++j) {
			var res = resnames[j]
			this._loadimage(res[0], res[1])
		}
	},
	loadsound: function () {
		var resnames = this._extractlist(arguments)
		for (var j = 0 ; j < resnames.length ; ++j) {
			var res = resnames[j]
			this._loadsound(res[0], res[1])
		}
	},
	loadjson: function () {
		var resnames = this._extractlist(arguments)
		for (var j = 0 ; j < resnames.length ; ++j) {
			var res = resnames[j]
			this._loadjson(res[0], res[1])
		}
	},

	// Load Google web fonts
	loadwebfonts: function () {
		WebFontConfig = {
			google: { families: Array.prototype.slice.call(arguments) },
			fontactive: UFX.resource._onload,
		}
		var wf = document.createElement("script")
		wf.src = "https://ajax.googleapis.com/ajax/libs/webfont/1/webfont.js"
		wf.type = "text/javascript"
		wf.async = "true"
		document.getElementsByTagName("head")[0].appendChild(wf)
		this._toload += arguments.length
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
	_load: function (name, url) {
		var ext = url.split(".").pop()
		if (this.imagetypes.indexOf(ext) > -1) {
			return this._loadimage(name, url)
		} else if (this.soundtypes.indexOf(ext) > -1) {
			return this._loadsound(name, url)
		} else if (this.jsontypes.indexOf(ext) > -1) {
			return this._loadjson(name, url)
		} else if (this.rawtypes.indexOf(ext) > -1) {
			return this._loaddata(name, url)
		}
		console.log("Treating unknown extension " + ext + " as raw data")
		return this._loaddata(name, url)
	},

	// Load a single image with the given name
	_loadimage: function (iname, imageurl) {
		var img = new Image()
		img.onload = this._onload
		img.src = this._seturl(imageurl)
		img.iname = iname
		this.images[iname] = img
		++this._toload
	},
	// Load a single audio file with the given name
	_loadsound: function (aname, audiourl) {
		var audio = new Audio()
		audio.addEventListener("canplaythrough", this._onload, false)
		audio.src = this._seturl(audiourl)
		audio.aname = aname
		this.sounds[aname] = audio
		++this._toload
	},
	// Load a single json resource
	_loadjson: function (jname, jsonurl) {
		var req = new XMLHttpRequest()
		req.overrideMimeType("application/json")
		req.open('GET', jsonurl, true);  
		var target = this;
		req.onload  = function() {
			UFX.resource.data[jname] = JSON.parse(req.responseText)
			UFX.resource._onload()
		}
		req.send(null);
		++this._toload
	},
	// Load a single raw data resource
	_loaddata: function (dname, dataurl) {
		var req = new XMLHttpRequest()
		req.open('GET', dataurl, true);  
		var target = this;
		req.onload  = function() {
			UFX.resource.data[dname] = req.responseText
			UFX.resource._onload()
		}
		req.send(null);
		++this._toload
	},

	_extractlist: function (args) {
		var ret = []
		for (var j = 0 ; j < args.length ; ++j) {
			var arg = args[j]
			if (typeof arg == "string") {
				ret.push([arg, arg])
			} else if (arg instanceof Array) {
				for (var k = 0 ; k < arg.length ; ++k) {
					ret.push([arg[k], arg[k]])
				}
			} else {
				for (var k in arg) {
					ret.push([k, arg[k]])
				}
			}
		}
		return ret
	},

	_toload: 0,
	_loaded: 0,
	_onload: function () {
		++UFX.resource._loaded
		var f = this._loaded / this._toload
		UFX.resource.onloading(f)
		if (UFX.resource._loaded == UFX.resource._toload) {
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

