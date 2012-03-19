

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
            data[j] = Math.random() * 100
            data[j+1] = 40 + Math.random() * 60
            data[j+2] = 0
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
}

// A cylindrical space that has a certain side facing the camera
CylindricalFacer = {
    init: function (x0, y0) {
        this.x0 = x0 || 0
        this.y0 = y0 || 0
        this.targetx = this.x0
        this.targety = this.y0
        this.h0 = 1200.
    },
    face: function (x, y) {
        this.targetx = x
        this.targety = y
    },
    scootch: function (dx, dy) {
        this.targetx += dx || 0
        this.targety += dy || 0
    },
    worldpos: function (x, y, r) {
        r = this.r + (r || 0)
        var theta = (x - this.x0) / this.r
        return [this.r * Math.sin(theta), this.z * Math.cos(theta) - (y - this.y0)]
    },
    think: function (dt) {
        var f = 1 - Math.exp(-4 * dt)
        this.x0 += f * this.getdx(this.x0, this.targetx)
        this.y0 += f * (this.targety - this.y0)
        this.z = Math.max((this.h0 - this.y0) / this.h0 * 0.4, -0.25) * this.r
    },
}

TowerGround = {
    init: function () {
        this.ground = groundtexture(60, 60).canvas
    },
    draw: function(yrange) {
        context.save()
        context.translate(0, this.y0)
        context.scale(25, 25 * this.z / this.r)
        context.save()
        context.rotate(this.x0 / this.circ * 2 * Math.PI)
        context.drawImage(this.ground, -30, -30)
        context.restore()
        var grad = context.createLinearGradient(0, 0, 0, -30)
        grad.addColorStop(0, "rgba(0,0,0,0)")
        grad.addColorStop(1, "rgba(0,0,0,1)")
        context.fillStyle = grad
        context.fillRect(-30, -60, 60, 60)
        context.restore()
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
    draw: function (yrange) {
        var ymin = yrange[0], ymax = yrange[1]

        context.beginPath()
        context.moveTo(-this.r-1, ymin)
        if (this.y0 < ymax) {
            for (var jtheta = 0 ; jtheta <= 16 ; ++jtheta) {
                var theta = jtheta * Math.PI / 16
                context.lineTo(-(this.r+1) * Math.cos(theta), this.y0 + this.z * Math.sin(theta))
            }
        } else {
            context.lineTo(-this.r-1, ymax)
            context.lineTo(this.r+1, ymax)
        }
        context.lineTo(this.r+1, ymin)
        context.clip()

        var rowmin = Math.max(Math.floor((this.y0 - ymax) / this.panely) + 1, 0)
        var rowmax = Math.floor((this.y0 - ymin) / this.panely) - 1
        rowmax = rowmin + 2
        rowmin = 0
        rowmax = 2
//        alert([rowmin, rowmax])
//        top of row is: -this.panely * (row + 1) + this.y0 < ymax
//        row + 1 > (this.y0 - ymax) / this.panely
        for (var jpanel = 0 ; jpanel < this.npanels ; ++jpanel) {
            var p0 = this.worldpos(this.circ * jpanel / this.npanels, this.panely)
            var p1 = this.worldpos(this.circ * (jpanel + 1) / this.npanels, this.panely)
            if (p0[0] >= p1[0]) continue
            context.save()
            var xscale = (p1[0] - p0[0]) / this.panelx, yscale = (p1[1] - p0[1]) / this.panelx
            context.transform(xscale, yscale, 0, 1, p0[0], p0[1])
            for (var row = rowmin ; row < rowmax ; ++row) {
                context.drawImage(this.panels[jpanel], 0, -row * this.panely)
            }
            context.restore()
        }
    },
}

TowerShading = {
    draw: function (yrange) {
        var ymin = yrange[0], height = yrange[1] - yrange[0]
        var grad = context.createLinearGradient(-this.r, 0, this.r, 0)
        grad.addColorStop(0, "rgba(0,0,0,1)")
        grad.addColorStop(0.1, "rgba(0,0,0,0.4)")
        grad.addColorStop(0.3, "rgba(0,0,0,0)")
        grad.addColorStop(1, "rgba(0,0,0,1)")
        context.fillStyle = grad
        context.fillRect(-this.r-4, ymin, 2*this.r+8, height)
    },
}

function Tower(circ, color) {
    return UFX.Thing().
        addcomp(CylindricalSpace, circ).
        addcomp(CylindricalFacer).
        addcomp(TowerGround).
        addcomp(TowerWalls, color).
        addcomp(TowerShading).
        addcomp(UFX.Component.HasChildren)
}




