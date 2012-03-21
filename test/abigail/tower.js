

function randomshade(r0, g0, b0) {
    var r = UFX.random.rand
    var a = r(20, 40), b = r(20, 40), c = r(20, 40)
    return "rgb(" + (r0+a+b+c) + "," + (g0+a+b) + "," + (b0+a) + ")"
}

function blocktexture(x, y, color) {
    x = x || 400
    y = y || 400
    var img = document.createElement("canvas")
    img.width = x
    img.height = y
    con.fillStyle = randomshade(color[0], color[1], color[2])
    con.fillRect(0, 0, x, y)
    var nblock = Math.round(x * y / 200)
    var r = UFX.random.rand
    for (var j = 0 ; j < nblock ; ++j) {
        var w = r(20, 80), h = r(10, 40)
        var px = r(x), py = r(y)
        con.fillStyle = randomshade(color[0], color[1], color[2])
        for (var jx = -1 ; jx < 1 ; ++jx) {
            for (var jy = -1 ; jy < 1 ; ++jy) {
                con.fillRect(px+x*jx, py+y*jy, w, h)
            }
        }
    }
    return con
}

function stonetexture(sx, sy, color) {
    var img = document.createElement("canvas")
    img.width = sx
    img.height = sy
    var con = img.getContext("2d")
    var idata = con.createImageData(sx, sy)
    var data = idata.data
    var ndata2 = UFX.noise.wrapslice([sx, sy], 0.123, [64, 64, 256], [0, 0])
    var ndata3 = UFX.noise.wrapslice([sx, sy], 0.234, [8, 16, 256], [0, 0])
//    UFX.noise.fractalize(ndata2, [sx, sy], 2)
    for (var y = 0, j = 0, k = 0 ; y < sy ; ++y) {
        for (var x = 0 ; x < sx; ++x, j += 4, ++k) {
            var v = 150
            v += Math.max(Math.min(1000 * (ndata3[k]), 30), -30)
            v += Math.max(100 - 8000 * Math.abs(ndata3[k]), 0)
            var dx = ndata2[y*sx+(x+1)%sx] - ndata2[y*sx+(x+sx-1)%sx]
            var dy = ndata2[(y+1)%sy*sx+x] - ndata2[(y+sy-1)%sy*sx+x]
            v *= 1 + (2 * dx + dy) * sx * sy / 500000
            data[j] = v * color[0] / 255.
            data[j+1] = v * color[1] / 255.
            data[j+2] = v * color[2] / 255.
            data[j+3] = 255
        }
    }
    con.putImageData(idata, 0, 0)
    return con
}

function groundtexture(sx, sy) {
    var img = document.createElement("canvas")
    img.width = sx
    img.height = sy
    var con = img.getContext("2d")
    var idata = con.createImageData(sx, sy)
    var data = idata.data
    for (var y = 0, j = 0, k = 0 ; y < sy ; ++y) {
        for (var x = 0 ; x < sx; ++x, j += 4, ++k) {
            var dx = 2*x/sx-1, dy = 2*y/sy-1, d = Math.sqrt(dx*dx+dy*dy)
            data[j] = Math.random() * 30 + 80 * Math.min(Math.exp(-8*d+0.75), 1)
            data[j+1] = Math.random() * 30 + 80
            data[j+2] = Math.random() * 20
            data[j+3] = 255
        }
    }
    con.putImageData(idata, 0, 0)
    return con
}

function cloudtexture(sx, sy, t) {
    var img = document.createElement("canvas")
    img.width = sx
    img.height = sy
    var con = img.getContext("2d")
    var idata = con.createImageData(sx, sy)
    var data = idata.data
    var ndata = UFX.noise.wrapslice([sx, sy], t*0.01, [16, 32, 256], [0, 0])
    UFX.noise.fractalize(ndata, [sx, sy], 2)
    for (var y = 0, j = 0, k = 0 ; y < sy ; ++y) {
        for (var x = 0 ; x < sx; ++x, j += 4, ++k) {
            var v = Math.max(Math.min(4 * ndata[k] - 1, 1), 0)
            data[j] = 128 * v
            data[j+1] = 128 * v
            data[j+2] = 128
            data[j+3] = 255
        }
    }
    con.putImageData(idata, 0, 0)
    return con
}


function panels(n, x, y, color0) {
    n = n || 10
    x = x || 40
    y = y || 400
    var tex = stonetexture(n * x, y, color0)
    var ps = []
    for (var j = 0 ; j < n ; ++j) {
        var p = document.createElement("canvas")
        p.width = x + 1
        p.height = y + 1
        var pcon = p.getContext("2d")
        // TODO: slightly more efficient?
        pcon.drawImage(tex.canvas, -j*x, 0)
        pcon.drawImage(tex.canvas, (n-j)*x, 0)
        pcon.drawImage(tex.canvas, -j*x, y)
        pcon.drawImage(tex.canvas, (n-j)*x, y)
        ps.push(p)
    }
    return ps
}


// COMPONENTS

// An object that admits a cylindrical coordinate space
CylindricalSpace = {
    init: function (circ) {
        this.circ = circ  // circumference
        this.r = this.circ / (2 * Math.PI)
    },
    // given two x-coordinates, find the closest way to get from x0 to x1
    //   should always be in the range [-circ/2, circ/2)
    getdx: function (x0, x1) {
        var dx = (x1 - x0 + 0.5 * this.circ) % this.circ
        if (dx < 0) dx += this.circ
        return dx - 0.5 * this.circ
    },
    // given an x-range and an x-coordinate, determine whether the coordinate
    //   is within the x-range
    intervalhas: function (x0, x1, x) {
        var dx = (x - x0) % this.circ
        if (dx < 0) dx += this.circ
        return dx < x1 - x0
    },
}

// A cylindrical space that has a certain side facing the camera
// Through fancy 2.5-D effects, the space appears to tilt toward the camera (when looking down)
//   or away from the camera (when looking up)
CylindricalFacer = {
    init: function (x0, y0) {
        this.x0 = x0 || 0
        this.y0 = y0 || 0
        this.fy = 1
        this.fz = 0
        this.h0 = 1200.  // height of eye above ground
        this.hmax = 1800.  // height before we stop tilting away
        this.D = 2400.   // distance from tower to eye
        this.zoom = 2
    },
    // given an x-coordinates, say whether it's visible from the front
    infront: function (x) {
        return Math.abs(this.getdx(this.x0, x)) < this.circ / 4
    },
    worldpos: function (x, y, r) {
        r = this.r + (r || 0)
        var theta = (x - this.x0) / this.r
//        return [r * Math.sin(theta), this.fz * r * Math.cos(theta) + this.fy * (this.y0 - y)]
        return [r * Math.sin(theta), this.fz * r * Math.cos(theta) / this.fy + (this.y0 - y)]
    },
    isvisible: function (yrange, yextent, r) {
        var absz = this.fz * (this.r + (r || 0))
        return yextent[0] - absz <= yrange[1] && yextent[1] + absz >= yrange[0]
    },
    settilt: function () {
        var dy = this.h0 - Math.min(this.y0, this.hmax)
        var d = Math.sqrt(this.D * this.D + dy * dy)
        this.fy = this.D / d
        this.fz = dy / d
    },
    // Set the context clipping region in the shape of the cylinder
    cylinderclip: function (yrange) {
        var ymin = yrange[0], ymax = yrange[1]
        context.beginPath()
        context.moveTo(-this.r-1, this.y0 - ymax)
        if (ymin < 0) {
            for (var jtheta = 0 ; jtheta <= 16 ; ++jtheta) {
                var theta = jtheta * Math.PI / 16
                context.lineTo(-(this.r+1) * Math.cos(theta),
                                this.y0 + this.r * this.fz / this.fy * Math.sin(theta))
            }
        } else {
            context.lineTo(-this.r-1, this.y0 - ymin)
            context.lineTo(this.r+1, this.y0 - ymin)
        }
        context.lineTo(this.r+1, this.y0 - ymax)
        context.clip()
    },
}

// Pans dynamically to a target and zooms dynamically to a zoom factor
CylindricalTargeter = {
    init: function () {
        this.targetx = this.x0
        this.targety = this.y0
        this.targetzoom = this.zoom
    },
    panto: function (x, y) {
        this.targetx = x
        this.targety = y
    },
    zoomto: function (zoom) {
        this.targetzoom = zoom
    },
    scootch: function (dx, dy) {
        this.targetx += dx || 0
        this.targety += dy || 0
    },
    think: function (dt) {
        var f = 1 - Math.exp(-4 * dt)
        this.x0 += f * this.getdx(this.x0, this.targetx)
        this.y0 += f * (this.targety - this.y0)
        if (this.zoom !== this.targetzoom) {
            var zflog = f * Math.log(this.targetzoom / this.zoom)
            if (Math.abs(zflog) < 0.01) {
                this.zoom = this.targetzoom
            } else {
                this.zoom *= Math.exp(zflog)
            }
        }
        this.settilt()
    },
}

TowerGround = {
    init: function () {
        this.groundr = 100
        this.ground = groundtexture(this.groundr * 2, this.groundr * 2).canvas
    },
    drawground: function(yrange) {
        context.save()
        var p = this.worldpos(0, 0, -this.r)
        context.translate(p[0], p[1])
        context.scale(1000/this.groundr, 1000/this.groundr * this.fz / this.fy)
        context.save()
        context.rotate(this.x0 / this.r)
        context.drawImage(this.ground, -this.groundr, -this.groundr)
        context.restore()
        var grad = context.createLinearGradient(0, 0, 0, -1.5*this.groundr)
        grad.addColorStop(0, "rgba(0,0,0,0)")
        grad.addColorStop(0.66, "rgba(144,144,192,1)")
        grad.addColorStop(1, "rgba(0,0,128,1)")
        context.fillStyle = grad
        context.fillRect(-this.groundr, -1.5*this.groundr, 2*this.groundr, 1.5*this.groundr)
        context.restore()
    },
}

HasClouds = {
    init: function() {
        this.cloudsize = 256
        this.cloudt = 0
        this.clouds = cloudtexture(this.cloudsize, this.cloudsize, this.cloudt).canvas
    },
    think: function (dt) {
        this.cloudt += dt
        if (Math.floor(this.cloudt - dt) < Math.floor(this.cloudt))
            this.clouds = cloudtexture(this.cloudsize, this.cloudsize, this.cloudt).canvas
    },
    draw: function(yrange) {
        context.save()
        var zoom = 4
        context.scale(zoom, zoom)
        var f = (this.x0 / this.circ - 0.5) % 1.
        if (f < 0) f += 1.
        f += 0.5
        for (var g = 0 ; g < 5 ; ++g) {
            context.drawImage(this.clouds, -this.cloudsize * f, this.y0/zoom - this.cloudsize * g)
            context.drawImage(this.clouds, -this.cloudsize * (-1 + f), this.y0/zoom - this.cloudsize * g)
        }
        context.restore()

        var grad = context.createLinearGradient(0, -1.5*this.groundr, 0, -6*this.groundr)
        grad.addColorStop(0, "rgba(0,0,128,1)")
        grad.addColorStop(1, "rgba(255, 255, 255,1)")
        context.fillStyle = grad
        context.fillStyle = "red"
        context.fillRect(-this.cloudsize, -6*this.groundr, 2*this.cloudsize, 4.5*this.groundr)
    },

}


TowerWalls = {
    init: function (color0) {
        this.color0 = color0
        this.npanels = Math.floor(this.circ / 30.) + 1
        this.panelx = Math.floor(this.circ / this.npanels)
        this.panely = 500
        this.panels = panels(this.npanels, this.panelx, this.panely, this.color0)
    },
    drawwalls: function (yrange) {
        var ymin = yrange[0], ymax = yrange[1]
        var absz = Math.abs(this.fz) * this.r
        var rowmin = Math.max(Math.floor((ymin - absz) / this.panely), 0)
        var rowmax = Math.floor((ymax + absz) / this.panely)
        for (var jpanel = 0 ; jpanel < this.npanels ; ++jpanel) {
            var p0 = this.worldpos(this.circ * jpanel / this.npanels, this.panely)
            var p1 = this.worldpos(this.circ * (jpanel + 1) / this.npanels, this.panely)
            if (p0[0] >= p1[0]) continue
            context.save()
            var xscale = (p1[0] - p0[0]) / this.panelx, yscale = (p1[1] - p0[1]) / this.panelx
            context.transform(xscale, yscale, 0, 1, p0[0], p0[1])
            for (var row = rowmin ; row <= rowmax ; ++row) {
                context.drawImage(this.panels[jpanel], 0, -row * this.panely)
            }
            context.restore()
        }
    },
}

TowerShading = {
    init: function () {
        var grad = context.createLinearGradient(-this.r, 0, this.r, 0)
        grad.addColorStop(0, "rgba(0,0,0,1)")
        grad.addColorStop(0.1, "rgba(0,0,0,0.4)")
        grad.addColorStop(0.3, "rgba(0,0,0,0)")
        grad.addColorStop(1, "rgba(0,0,0,1)")
        this.towershade = grad
    },
    towershading: function (yrange) {
        var ymin = this.y0 - yrange[1], height = yrange[1] - yrange[0]
        context.fillStyle = this.towershade
        context.fillRect(-this.r-4, ymin, 2*this.r+8, height)
    },
}

// Because the draw order for this game is so complicated, we handle it manually.
// We don't want an object's children necessarily drawn before or after it.
HasTowerChildren = {
    __proto__: UFX.Component.HasChildren,
    init: function () {
        HasTowerChildren.__proto__.init.call(this)
        this.sprites = []
        this.platforms = []
        this.portals = []
    },
    addsprite: function (sprite) {
        this.sprites.push(sprite)
        sprite.attachto(this)
    },
    addplatform: function (platform) {
        this.platforms.push(platform)
        platform.attachto(this)
    },
    addportal: function (portal) {
        this.portals.push(portal)
    },
    // Thus begins the monumental task of drawing the tower parts in the correct order.
    // You'd think that a 2.5-D system would be easier than a 3-D system, but no.
    // Whether an object should be on top or not is not as simple as its distance from a camera.
    // In particular, we don't want sprites' heads to go behind platforms.
    draw: function (Yrange) {
        var yrange = [this.y0 - Yrange[1] / this.zoom / this.fy,
                      this.y0 - Yrange[0] / this.zoom / this.fy]
        context.scale(this.zoom, this.zoom * this.fy)
        this.drawground(yrange)

        // Objects attached to the tower have a different sort order depending on whether
        //   we're looking down or up
        var order
        if (this.fz > 0) {
            order = { "corbel": 1, "floor": 2, "sprite": 3, "crenel": 4 }
        } else {
            order = { "sprite": 1, "floor": 2, "support": 3, "crenel": 4 }
        }
        // Vertical wall draw orders depend on whether it's on the left or right side of the tower
        var getdx = this.getdx, x0 = this.x0
        var onright = function (x) { return getdx(x0, x) > 0 }
        var dfsortfunc = function (df0, df1) {
            // First check the main layers
            if (df0[2] !== df1[2]) return df0[2] - df1[2]
            //  -2 = not attached to the tower, in back
            //  -1 = attached to the tower, in back
            //   0 = part of the tower surface (shaded along with tower walls, notably)
            //   1 = attached to the tower in front
            //   2 = not attached to the tower, in front
            var layer = df0[2]
            // For objects not attached to the tower, we can simply sort by z-coordinate
            if (layer == 0 || layer == -2 || layer == 2) return df0[3] - df1[3]
            if (layer == 1) {
                // Draw from top to bottom
                if (df0[3] !== df1[3]) return df1[3] - df0[3]
                // We're now dealing with parts of a single platform, or a sprite on that platform.
                // Here's where things get tricky.
                return order[df0[4]] - order[df1[4]]
            }
            return 0
        }

        // Array of all functions we'll need to invoke
        var dfs = [
            [context.save, context, 0, -101],
            [this.cylinderclip, this, 0, -100],
            [this.drawwalls, this, 0, 0],
            [this.towershading, this, 0, 1],
            [context.restore, context, 0, 101],
        ]

        // Get draw callbacks from all children
        var getdfs = function (obj) {
            dfs.push.apply(dfs, obj.drawfuncs(yrange))
        }
        this.platforms.forEach(getdfs)
//        this.portals.forEach(getdfs)
        this.sprites.forEach(getdfs)

        // Put draw callbacks into correct order
        dfs.sort(dfsortfunc)
        // Invoke draw callbacks
        dfs.forEach(function (df) { df[0].call(df[1], yrange) })

    },
}


function Tower(circ, color) {
    return UFX.Thing().
        addcomp(CylindricalSpace, circ).
        addcomp(CylindricalFacer).
        addcomp(CylindricalTargeter).
//        addcomp(HasClouds).
        addcomp(TowerGround).
        addcomp(TowerWalls, color).
        addcomp(HasTowerChildren).
        addcomp(TowerShading)
}




