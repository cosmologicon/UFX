// Resource loading

if (typeof UFX == "undefined") UFX = {}
UFX.resource = {}

// These will become populated as you call load
UFX.resource.images = {}
UFX.resource.sounds = {}

// Recognized extensions
UFX.resource.imagetypes = "png gif jpg jpeg bmp".split(" ")
UFX.resource.soundtypes = "wav mp3 ogg au".split(" ")

// Base path for loading resources
UFX.resource.base = null

// Set this to a function that should be called when all resources are loaded
UFX.resource.onload = function () {}

// Set this to a function that should be called while resources are loading.
// It takes one argument, which is the fraction of resources that have loaded successfully.
UFX.resource.onloading = function (f) {}

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
UFX.resource.load = function () {
    var resnames = UFX.resource._extractlist(arguments)
    for (var j = 0 ; j < resnames.length ; ++j) {
        var res = resnames[j]
        UFX.resource._load(res[0], res[1])
    }
}

// Calling loadimage or loadsound is recommended when the resource type cannot be auto-detected
//   from the URL. Or if you just want to be explicit about it.
UFX.resource.loadimage = function () {
    var resnames = UFX.resource._extractlist(arguments)
    for (var j = 0 ; j < resnames.length ; ++j) {
        var res = resnames[j]
        UFX.resource._loadimage(res[0], res[1])
    }
}
UFX.resource.loadsound = function () {
    var resnames = UFX.resource._extractlist(arguments)
    for (var j = 0 ; j < resnames.length ; ++j) {
        var res = resnames[j]
        UFX.resource._loadsound(res[0], res[1])
    }
}


UFX.resource._seturl = function (url) {
    if (!UFX.resource.base) return url
    var n = UFX.resource.base.length
    if (!n) return url
    return UFX.resource.base + (UFX.resource.base.charAt(n-1) == "/" ? "" : "/") + url
}

// Try to deduce what the resource is based on the url
UFX.resource._load = function (name, url) {
    var ext = url.split(".").pop()
    if (UFX.resource.imagetypes.indexOf(ext) > -1) {
        return UFX.resource._loadimage(name, url)
    } else if (UFX.resource.soundtypes.indexOf(ext) > -1) {
        return UFX.resource._loadsound(name, url)
    }
    console.log("Treating unknown extension " + ext + " as image")
    return UFX.resource._loadimage(name, url)
}

// Load a single image with the given name
UFX.resource._loadimage = function (iname, imageurl) {
    var img = new Image()
    img.onload = UFX.resource._onload
    img.src = UFX.resource._seturl(imageurl)
    img.iname = iname
    UFX.resource.images[iname] = img
    ++UFX.resource._toload
}
// Load a single audio file with the given name
UFX.resource._loadsound = function (aname, audiourl) {
    var audio = new Audio()
    audio.addEventListener("canplaythrough", UFX.resource._onload, false)
    audio.src = UFX.resource._seturl(audiourl)
    audio.aname = aname
    UFX.resource.sounds[aname] = audio
    ++UFX.resource._toload
}

UFX.resource._extractlist = function (args) {
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
}

UFX.resource._toload = 0
UFX.resource._loaded = 0
UFX.resource._onload = function () {
    ++UFX.resource._loaded
    var f = 1. * UFX.resource._loaded / UFX.resource._toload    
    UFX.resource.onloading(f)
    if (f == 1) {
        UFX.resource.onload()
    }
}

