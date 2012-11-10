// Procedural texture generation

if (typeof UFX == "undefined") UFX = {}

UFX.texture = {
    joinobj: function (obj0, obj1) {
        var obj = Object.create(obj1)
        if (!obj0) return obj
        for (var s in obj0) obj[s] = obj0[s]
        return obj
    },
    // Return an object whose properties are taken from the first object in the list
    //   that has that property defined
    // This may create some objects with pretty long prototype chains, but who cares?
    reduceargs: function (args) {
        if (args.length == 0) return {}
        var obj = args[0] || {}
        for (var j = 1 ; j < args.length ; ++j) {
            if (args[j]) obj = this.joinobj(obj, args[j])
        }
        return obj
    },
    // Create a canvas of the given dimensions and some corresponding pixel data in canvas.data.
    // When you're done, call canvas.applydata to copy the data back into the canvas.
    makecanvas: function (w, h) {
        var canvas = document.createElement("canvas")
        canvas.width = w
        canvas.height = h
        canvas.context = canvas.getContext("2d")
        var idata = context.createImageData(w, h)
        canvas.data = idata.data
        canvas.applydata = function () {
            canvas.context.putImageData(idata, 0, 0)
            delete canvas.data
        }
        return canvas
    },
    // Static
    stat: function () {
        var obj = this.reduceargs(arguments)
        var w = obj.width || obj.size || 256
        var h = obj.height || obj.size || 256
        var rmin = obj.rmin || 0, rmax = obj.rmax || 256
        var gmin = obj.gmin || 0, gmax = obj.gmax || 256
        var bmin = obj.bmin || 0, bmax = obj.bmax || 256
        var wmin = obj.wmin || 0, wmax = obj.wmax || 0
        if (obj.seed) UFX.random.setseed(obj.seed)
        var canvas = this.makecanvas(w, h), data = canvas.data
        for (var j = 0 ; j < w*h*4 ; j += 4) {
            var white = wmax && UFX.random.rand(wmin, wmax)
            data[j] = white + UFX.random.rand(rmin, rmax)
            data[j+1] = white + UFX.random.rand(gmin, gmax)
            data[j+2] = white + UFX.random.rand(bmin, bmax)
            data[j+3] = 255
        }
        canvas.applydata()
        return canvas
    },
    grass: function () {
        return this.stat(this.reduceargs(arguments), {
            rmin: 40, rmax: 80,
            gmin: 80, gmax: 120,
            bmin: 0, bmax: 10,
        })
    },
    dirt: function () {
        return this.stat(this.reduceargs(arguments), {
            rmin: 90, rmax: 120,
            gmin: 90, gmax: 120,
            bmin: 0, bmax: 10,
        })
    },
    gravel: function () {
        return this.stat(this.reduceargs(arguments), {
            wmin: 60, wmax: 200,
            rmin: 0, rmax: 10,
            gmin: 0, gmax: 10,
            bmin: 0, bmax: 10,
        })
    },
    // Spots
    spots: function () {
        var obj = this.reduceargs(arguments)
        var w = obj.width || obj.size || 256
        var h = obj.height || obj.size || 256
        var rmin = obj.rmin || 0, rmax = obj.rmax || 256
        var gmin = obj.gmin || 0, gmax = obj.gmax || 256
        var bmin = obj.bmin || 0, bmax = obj.bmax || 256
        var wmin = obj.wmin || 0, wmax = obj.wmax || 0
        var nspots = 10000
        if (obj.seed) UFX.random.setseed(obj.seed)
        var canvas = document.createElement("canvas")
        canvas.width = w
        canvas.height = h
        var context = canvas.getContext("2d")
        context.globalAlpha = obj.alpha || 0.1
        for (var j = 0 ; j < nspots ; ++j) {
            var white = wmax && UFX.random.rand(wmin, wmax)
            var r = white + UFX.random.rand(rmin, rmax)
            var g = white + UFX.random.rand(gmin, gmax)
            var b = white + UFX.random.rand(bmin, bmax)
            var x = UFX.random(w), y = UFX.random(h)
            var R = 20
            context.fillStyle = "rgb(" + r + "," + g + "," + b + ")"
            context.beginPath()
            context.arc(x, y, R, 0, 2*Math.PI)
            context.fill()
        }
        return canvas
    },
    
    // Perlin noise
    noisedata: function () {
        var obj = this.reduceargs(arguments)
        var w = obj.width || obj.size || 256
        var h = obj.height || obj.size || 256
        var xscale = obj.xscale || obj.scale || 8
        var yscale = obj.yscale || obj.scale || 8
        var fraclevel = obj.fraclevel || 0
        if (obj.seed) UFX.random.setseed(obj.seed)
        var zscale = 256
        var zoffset = ("zoffset" in obj) ? obj.zoffset : UFX.random(zscale)
        var ndata = UFX.noise.wrapslice([w, h], zoffset, [xscale, yscale, zscale], [0, 0])
        if (fraclevel) UFX.noise.fractalize(ndata, [w, h], fraclevel)
        return ndata
    },

    roughshade: function () {
        var obj = this.reduceargs(arguments)
        var w = obj.width || obj.size || 256
        var h = obj.height || obj.size || 256
        var color = obj.color || [0, 0, 0]
        var alpha0 = obj.alpha0 || 100
        var ascale = obj.ascale || 50
        var r = color[0], g = color[1], b = color[2]
        var canvas = this.makecanvas(w, h), data = canvas.data
        var ndata = this.noisedata(obj, {scale: 64})
        for (var y = 0, j = 0, k = 0 ; y < h ; ++y) {
            for (var x = 0 ; x < w; ++x, j += 4, ++k) {
                var dx = ndata[y*w+(x+1)%w] - ndata[y*w+(x+w-1)%w]
                var dy = ndata[(y+1)%h*w+x] - ndata[(y+h-1)%h*w+x]
                data[j] = r
                data[j+1] = g
                data[j+2] = b
                data[j+3] = alpha0 + ascale * (2 * dx + dy)
            }
        }
        canvas.applydata()
        return canvas
    },

    stone: function () {
        var obj = this.reduceargs(arguments)
        var w = obj.width || obj.size || 256
        var h = obj.height || obj.size || 256
        var color = obj.color || [120, 120, 120]
        var canvas = this.makecanvas(w, h), data = canvas.data
        var ndata = this.noisedata(obj)
        for (var j = 0, k = 0 ; k < w*h ; j += 4, ++k) {
            var v = 150
            v += Math.max(Math.min(1000 * (ndata[k]), 30), -30)
            v += Math.max(100 - 8000 * Math.abs(ndata[k]), 0)
            data[j] = v * color[0] / 255.
            data[j+1] = v * color[1] / 255.
            data[j+2] = v * color[2] / 255.
            data[j+3] = 255
        }
        canvas.applydata()
        return canvas
    },
    
    clouds: function () {
        var obj = this.reduceargs(arguments)
        var w = obj.width || obj.size || 256
        var h = obj.height || obj.size || 256
        var color = obj.color || [200, 200, 200]
        var r = color[0], g = color[1], b = color[2]
        var sharpness = obj.sharpness || 0
        var coverage = (obj.coverage || 0.4) - 0.5
        var afactor = 4000 * Math.exp(sharpness)
        var canvas = this.makecanvas(w, h), data = canvas.data
        var ndata = this.noisedata(obj, {fraclevel: 2})
        for (var j = 0, k = 0 ; k < w*h ; j += 4, ++k) {
            var a = (ndata[k] + coverage) * afactor + 128
            data[j] = r
            data[j+1] = g
            data[j+2] = b
            data[j+3] = a
        }
        canvas.applydata()
        return canvas
    },

    marble: function () {
        var obj = this.reduceargs(arguments)
        var w = obj.width || obj.size || 256
        var h = obj.height || obj.size || 256
        var xfactor = "xfactor" in obj ? obj.xfactor : 1
        var yfactor = "yfactor" in obj ? obj.yfactor : 2
        var coverage = (obj.coverage || 1.5) - 0.5
        var distortion = 3 * Math.exp(obj.distortion || 0)
        var cf = Math.min(30 * Math.exp(obj.cloudiness || 0), 250), df = 255 - cf
        var vfactor = 1000 * Math.exp(obj.sharpness || 0)
        var canvas = this.makecanvas(w, h), data = canvas.data
        var ndata = this.noisedata(obj, {fraclevel: 3, scale: 8})
        var xf = 2 * Math.PI * xfactor / w
        var yf = 2 * Math.PI * yfactor / h
        for (var y = 0, j = 0, k = 0 ; y < h ; ++y) {
            for (var x = 0 ; x < w; ++x, j += 4, ++k) {
                var v = ndata[k]
                v = Math.abs(Math.sin(distortion * v + xf * x + yf * y))
                v = Math.min(v * vfactor, df) + v * cf
                data[j] = v
                data[j+1] = v
                data[j+2] = v
                data[j+3] = 255
            }
        }
        canvas.applydata()
        return canvas
    },

}


