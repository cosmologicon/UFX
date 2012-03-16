

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
    var con = img.getContext("2d")
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

function panels(n, x, y, color0) {
    n = n || 10
    x = x || 40
    y = y || 400
    var tex = blocktexture(n * x, y, color0)
    var ps = []
    for (var j = 0 ; j < n ; ++j) {
        var p = document.createElement("canvas")
        p.width = x
        p.height = y
        var pcon = p.getContext("2d")
        pcon.drawImage(tex.canvas, -j*x, 0)
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
        this.z = this.r / 4.
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
    },
}


TowerWalls = {
    init: function (color0) {
        this.color0 = color0
        this.npanels = Math.floor(this.circ / 30.) + 1
        this.panelx = Math.floor(this.circ / this.npanels)
        this.panels = panels(this.npanels, this.panelx, 500, this.color0)
    },
    draw: function () {
        var theta = Date.now() * 0.001, dtheta = 2 * Math.PI / this.npanels
        for (var jpanel = 0 ; jpanel < this.npanels ; ++jpanel) {
            var p0 = this.worldpos(this.circ * jpanel / this.npanels, 500)
            var p1 = this.worldpos(this.circ * (jpanel + 1) / this.npanels, 500)
            if (p0[0] >= p1[0]) continue
            context.save()
            context.transform((p1[0] - p0[0] + 1) / this.panelx, (p1[1] - p0[1]) / this.panelx, 0, 1, p0[0], p0[1])
            context.drawImage(this.panels[jpanel], 0, 0)
            context.restore()
        }
    },
}

TowerShading = {
    draw: function () {
        var grad = context.createLinearGradient(-120, 0, 120, 0)
        grad.addColorStop(0, "rgba(0,0,0,0.4)")
        grad.addColorStop(0.3, "rgba(0,0,0,0)")
        grad.addColorStop(1, "rgba(0,0,0,0.8)")
        context.fillStyle = grad
        context.fillRect(-270, -270, 540, 540)
    },
}

function Tower(circ, color) {
    return UFX.Thing().
        addcomp(CylindricalSpace, circ).
        addcomp(CylindricalFacer).
        addcomp(TowerWalls, color).
        addcomp(UFX.Component.HasChildren)
}




