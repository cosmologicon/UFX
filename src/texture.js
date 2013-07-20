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
        var idata = canvas.context.createImageData(w, h)
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
        var rmin = obj.rmin || 0, rmax = "rmax" in obj ? obj.rmax : 256
        var gmin = obj.gmin || 0, gmax = "gmax" in obj ? obj.gmax : 256
        var bmin = obj.bmin || 0, bmax = "bmax" in obj ? obj.bmax : 256
        var wmin = obj.wmin || 0, wmax = obj.wmax || 0
        if (obj.seed) UFX.random.setseed(obj.seed)
        var canvas = this.makecanvas(w, h), data = canvas.data
        for (var j = 0 ; j < w*h*4 ; j += 4) {
            var white = wmax && UFX.random.rand(wmin, wmax)
            data[j] = white + (rmax && UFX.random.rand(rmin, rmax))
            data[j+1] = white + (gmax && UFX.random.rand(gmin, gmax))
            data[j+2] = white + (bmax && UFX.random.rand(bmin, bmax))
            data[j+3] = 255
        }
        canvas.applydata()
        return canvas
    },
    grass: function () {
        return this.stat(this.reduceargs(arguments), {
            rmin: 20, rmax: 60,
            gmin: 100, gmax: 140,
            bmin: 0, bmax: 20,
        })
    },
    deadgrass: function () {
        return this.stat(this.reduceargs(arguments), {
            wmin: 100, wmax: 120,
            rmin: 80, rmax: 100,
            gmin: 80, gmax: 100,
            bmin: 0, bmax: 0,
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
        var xoffset = ("xoffset" in obj) ? obj.xoffset : UFX.random(xscale)
        var yoffset = ("yoffset" in obj) ? obj.yoffset : UFX.random(yscale)
        var zoffset = ("zoffset" in obj) ? obj.zoffset : UFX.random(zscale)
        var ndata = UFX.noise.wrapslice([w, h], zoffset, [xscale, yscale, zscale], [xoffset, yoffset])
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

	terrain: function () {
        var obj = this.reduceargs(arguments)
        var w = obj.width || obj.size || 256
        var h = obj.height || obj.size || 256
		// Terrain heightmap color gradient:
		// http://libnoise.sourceforge.net/tutorials/tutorial3.html
		var tgrad = obj.tgrad || [[-1.00, 0, 0, 192], // deeps
		                          [-0.35, 0, 0, 255], // shallow
		                          [-0.10, 0, 128, 255], // shore
		                          [-0.04, 240, 240, 64], // sand
		                          [0.08, 32, 160, 0], // grass
		                          [0.35, 160, 160, 0], // dirt
		                          [0.50, 128, 128, 128], // rock
		                          [0.70, 255, 255, 255], // snow
		], ngrad = tgrad.length
		var sealevel = "sealevel" in obj ? obj.sealevel : -0.10
		var shadecolor = obj.shadecolor || [0, 0, 0]
		var sr = shadecolor[0], sg = shadecolor[1], sb = shadecolor[2]
		var shadex = obj.shadex || 0, shadey = obj.shadey || 0
		var shadefactor = (shadex || shadey) && 2 * Math.exp(obj.shadefactor || 0) / Math.sqrt(shadex*shadex + shadey*shadey)
		var canvas = this.makecanvas(w, h), data = canvas.data
		var ndata = this.noisedata(obj, {fraclevel: 3, scale: 8})
		function terrainmap(v) {
			if (v <= tgrad[0][0]) return [tgrad[0][1], tgrad[0][2], tgrad[0][3]]
			for (var j = 0 ; j < ngrad - 1 ; ++j) {
				var tgrad0 = tgrad[j], tgrad1 = tgrad[j+1]
				if (v >= tgrad0[0] && v < tgrad1[0]) {
				var f = (v - tgrad0[0]) / (tgrad1[0] - tgrad0[0]), g = 1 - f
				return [tgrad1[1]*f + tgrad0[1]*g,
						tgrad1[2]*f + tgrad0[2]*g,
						tgrad1[3]*f + tgrad0[3]*g]
				}
			}
			return [tgrad[ngrad-1][1], tgrad[ngrad-1][2], tgrad[ngrad-1][3]]
		}
		for (var y = 0, j = 0, k = 0 ; y < h ; ++y) {
			for (var x = 0 ; x < w; ++x, j += 4, ++k) {
				var v = ndata[k]
				var color = terrainmap(v)
				if (shadefactor && v > sealevel) {
					var dx = ndata[y*w+(x+1)%w] - ndata[y*w+(x+w-1)%w]
					var dy = ndata[(y+1)%h*w+x] - ndata[(y+h-1)%h*w+x]
					var f = 1 + (shadex * dx + shadey * dy) * shadefactor, g = 1 - f
					color[0] = f * color[0] + g * shadefactor
					color[1] = f * color[1] + g * shadefactor
					color[2] = f * color[2] + g * shadefactor
				}
				data[j] = color[0]
				data[j+1] = color[1]
				data[j+2] = color[2]
				data[j+3] = 255
			}
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
        var shadecolor = obj.shadecolor || [0, 0, 0]
        var sr = shadecolor[0], sg = shadecolor[1], sb = shadecolor[2]
        var shadex = obj.shadex || 0, shadey = obj.shadey || 0
        var shadefactor = (shadex || shadey) && 0.002 * Math.exp(obj.shadefactor || 0) / Math.sqrt(shadex*shadex + shadey*shadey)
        var afactor = 4000 * Math.exp(sharpness)
        var canvas = this.makecanvas(w, h), data = canvas.data
        var ndata = this.noisedata(obj, {fraclevel: 2})
        for (var y = 0, j = 0, k = 0 ; y < h ; ++y) {
            for (var x = 0 ; x < w; ++x, j += 4, ++k) {
                var a = (ndata[k] + coverage) * afactor + 128
                data[j+3] = a
                if (shadefactor) {
                    var a2 = (ndata[((x+shadex)%w) + ((y+shadey)%h)*w] + coverage) * afactor + 128
                    var f = Math.min(Math.max(shadefactor * (a - a2), 0), 1)
                    var d = 1 - f
                    data[j] =   r*d + sr*f
                    data[j+1] = g*d + sg*f
                    data[j+2] = b*d + sb*f
                } else {
                    data[j] =   r
                    data[j+1] = g
                    data[j+2] = b
                }
            }
        }
        canvas.applydata()
        return canvas
    },
    
    overcast: function () {
        var obj = this.reduceargs(arguments)
        var w = obj.width || obj.size || 256
        var h = obj.height || obj.size || 256
        var r0 = "r0" in obj ? obj.r0 : 160, dr = "dr" in obj ? obj.dr : 80
        var g0 = "g0" in obj ? obj.g0 : 160, dg = "dg" in obj ? obj.dg : 80
        var b0 = "b0" in obj ? obj.b0 : 160, db = "db" in obj ? obj.db : 80
        var canvas = this.makecanvas(w, h), data = canvas.data
        var ndata = this.noisedata(obj, {fraclevel: 2, scale: 8})
        for (var j = 0, k = 0 ; k < w*h ; j += 4, ++k) {
            var v = ndata[k]
            data[j] = r0 + v*dr
            data[j+1] = g0 + v*dg
            data[j+2] = b0 + v*db
            data[j+3] = 255
        }
        canvas.applydata()
        return canvas
    },
    // needs work
    ocean: function () {
        return this.overcast(this.reduceargs(arguments), {
            r0: 40, dr: 30, g0: 40, dg: 30, b0: 160, db: 60,
        })
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
    
    nightsky: function () {
        var obj = this.reduceargs(arguments)
        var canvas = this.overcast(obj, {
            r0: 0, dr: 0, g0: 0, dg: 10, b0: 20, db: 20,
        })
        var w = canvas.width, h = canvas.height
        var nstars = Math.floor(("density" in obj ? obj.density : 1) * w * h / 500)
        var spread = "spread" in obj ? obj.spread : 0.15
        var rstar0 = "rstar0" in obj ? obj.rstar0 : 0.0
        var rstar1 = "rstar1" in obj ? obj.rstar1 : 0.8
        var c = canvas.context
        c.beginPath()
        UFX.random.spread(nstars, spread).forEach(function (star) {
        	var x = star[0]*w, y = star[1]*h
        	c.moveTo(x, y)
            c.arc(x, y, UFX.random(rstar0, rstar1), 0, 2*Math.PI)
        })
        c.fillStyle = "white"
        c.fill()
        return canvas
    },    
    
    // Perlin noise + static
    noisestat: function () {
        var obj = this.reduceargs(arguments)
        var w = obj.width || obj.size || 256
        var h = obj.height || obj.size || 256
        var rmin = obj.rmin || 0, rmax = "rmax" in obj ? obj.rmax : 256
        var gmin = obj.gmin || 0, gmax = "gmax" in obj ? obj.gmax : 256
        var bmin = obj.bmin || 0, bmax = "bmax" in obj ? obj.bmax : 256
        var wmin = obj.wmin || 0, wmax = obj.wmax || 0
        var dr = "dr" in obj ? obj.dr : 0
        var dg = "dg" in obj ? obj.dg : 0
        var db = "db" in obj ? obj.db : 0
        var dw = "dw" in obj ? obj.dw : 0
        if (obj.seed) UFX.random.setseed(obj.seed)
        var ndata = this.noisedata(obj)
        var canvas = this.makecanvas(w, h), data = canvas.data
        for (var j = 0, k = 0 ; k < w*h ; j += 4, ++k) {
            var white = wmax && UFX.random.rand(wmin, wmax) + v*dw
            var v = ndata[k]
            data[j] = white + (rmax && UFX.random.rand(rmin, rmax)) + v*dr
            data[j+1] = white + (gmax && UFX.random.rand(gmin, gmax)) + v*dg
            data[j+2] = white + (bmax && UFX.random.rand(bmin, bmax)) + v*db
            data[j+3] = 255
        }
        canvas.applydata()
        return canvas
    },
    
    patchygrass: function () {
        return this.noisestat(this.reduceargs(arguments), {
            wmin: 40, wmax: 80, dw: -40,
            rmin: 0, rmax: 20, dr: -40,
            gmin: 60, gmax: 90, dg: 40,
            bmin: 0, bmax: 10,
        })
    },
    patchydirt: function () {
        return this.noisestat(this.reduceargs(arguments), {
            wmin: 40, wmax: 80, dw: -20,
            rmin: 60, rmax: 80, dr: 60,
            gmin: 20, gmax: 40, dg: 80,
            bmin: 0, bmax: 4,
        })
    },
    cement: function () {
        return this.noisestat(this.reduceargs(arguments), {
            wmin: 120, wmax: 160, dw: 40,
            rmin: 0, rmax: 10,
            gmin: 0, gmax: 10,
            bmin: 0, bmax: 10,
        })
    },

	// Add a buffer around a canvas to avoid edge effects when tiling scaled
	buffertile: function (canvas, buffersize) {
		var b = buffersize || 20, w = canvas.width, h = canvas.height
		var bcanvas = document.createElement("canvas")
		bcanvas.width = w + 2 * b
		bcanvas.height = h + 2 * b
		bcanvas.context = bcanvas.getContext("2d")
		for (var ix = -1 ; ix < 2 ; ++ix) {
			for (var iy = -1 ; iy < 2 ; ++iy) {
				bcanvas.context.drawImage(canvas, b + w * ix, b + h * iy)
			}
		}
		bcanvas.drawclip = function (context, x, y) {
			context.save()
			context.translate(x || 0, y || 0)
			context.beginPath()
			// Adding 0.01 to the control points seems to take care of some edge rounding issue in touchnav test
			// 0.001 is not enough
			context.moveTo(0, 0)
			context.lineTo(w + 0.01, 0)
			context.lineTo(w + 0.01, h + 0.01)
			context.lineTo(0, h + 0.01)
			context.closePath()
			context.clip()
			context.drawImage(bcanvas, -b, -b)
			context.restore()
		}
		return bcanvas
	},
}

// Something that lets you draw a tiled canvas zoomed in without seams or edge effects
UFX.texture.tiler = function (canvas, buffer, nx0, ny0) {
	if (!(this instanceof UFX.texture.tiler))
		return new UFX.texture.tiler(canvas, buffer, nx0, ny0)
	this.canvas = canvas
	this.buffer = buffer || 2
	this.nx = this.ny = 0
	this.makechart(nx0 || 1, ny0 || 1)
}
UFX.texture.tiler.prototype = {
	draw: function (context, x, y, w, h) {
		if (w === undefined) {
			w = x ; h = y ; x = 0 ; y = 0
		}
		var b = this.buffer, cx = this.canvas.width, cy = this.canvas.height
		var x0 = ((x-b)%cx+cx)%cx+b, x1 = x0 + w
		var y0 = ((y-b)%cy+cy)%cy+b, y1 = y0 + h
		this.makechart(Math.floor((x1+b)/cx)+1, Math.floor((y1+b)/cy)+1)
		context.save()
		context.translate(x || 0, y || 0)
		context.beginPath()
		context.moveTo(0, 0)
		context.lineTo(w, 0)
		context.lineTo(w, h)
		context.lineTo(0, h)
		context.closePath()
		context.clip()
		context.drawImage(this.chart, -x0, -y0)
		context.restore()
	},
	makechart: function (nx, ny) {
		if (nx <= this.nx && ny <= this.ny) return
		this.nx = Math.max(nx, this.nx)
		this.ny = Math.max(ny, this.ny)
		this.chart = document.createElement("canvas")
		this.chart.width = this.canvas.width * this.nx
		this.chart.height = this.canvas.height * this.ny
		var context = this.chart.getContext("2d")
		for (var j = 0 ; j < this.nx ; ++j) {
			for (var k = 0 ; k < this.ny ; ++k) {
				context.drawImage(this.canvas, j*this.canvas.width, k*this.canvas.height)
			}
		}
	},	
}




