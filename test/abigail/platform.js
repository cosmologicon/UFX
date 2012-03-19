
HorizontalExtent = {
    init: function (tower, x0, x1, y) {
        this.tower = tower
        this.x0 = x0
        this.x1 = x1
        this.dx = x1 - x0
        this.y = y
        this.tower.addplatform(this)
    },
}

// Standard platform holding
HoldSteady = {
    holds: function (sprite) {
//        hright = sprite.cliffhang if sprite.stepped and sprite.facingright else 0
//        hleft = sprite.cliffhang if sprite.stepped and not sprite.facingright else 0
        return this.tower.intervalhas(this.x0, this.x1, sprite.x)
    },
    catches: function (sprite) {
        this.oldy = this.y
        return sprite.y < this.y && this.oldy <= sprite.oldy && this.holds(sprite)
    },
}

// What the ground does, hold everything at this level
HoldEverything = {
    __proto__: HoldSteady,
    holds: function (sprite) {
        return true
    },
}


DrawPlatform = {
    init: function () {
        this.npanel = 10
        this.panelx = this.dx / this.npanel
        var img = document.createElement("canvas")
        img.width = this.dx
        img.height = 12
        con = img.getContext("2d")
        con.fillStyle = "gray"
        con.fillRect(0, 6, this.dx, 6)
        for (var j = 0 ; j < this.dx ; j += 12) {
            con.fillRect(j, 0, 6, 12)
        }

        this.panels = []
        for (var j = 0 ; j < this.npanel ; ++j) {
            var p = document.createElement("canvas")
            p.width = this.panelx + 1
            p.height = 12
            var pcon = p.getContext("2d")
            pcon.drawImage(img, -j*this.panelx, 0)
            this.panels.push(p)
        }
    },

    draw: function (yrange, back) {
        for (var jpanel = 0 ; jpanel < this.npanel ; ++jpanel) {
            var p0 = this.tower.worldpos(this.dx * jpanel / this.npanel, this.y, 12)
            var p1 = this.tower.worldpos(this.dx * (jpanel + 1) / this.npanel, this.y, 12)
            if ((p0[0] >= p1[0]) ^ back) continue
            var xscale = (p1[0] - p0[0]) / this.panelx, yscale = (p1[1] - p0[1]) / this.panelx
            context.save()
            context.transform(xscale, yscale, 0, 1, p0[0], p0[1])
            context.drawImage(this.panels[jpanel], 0, 0)
            context.restore()
        }
    },
    backdraw: function (yrange) {
        this.draw(yrange, true)
    },
}

DrawPlatformPath = {
    init: function () {
        this.r = 12
        this.ncrenel = Math.floor(this.dx / 24.) * 2 + 1
        this.grad0 = context.createLinearGradient(-this.tower.r - this.r, 0, this.tower.r + this.r, 0)
        this.grad0.addColorStop(0, "rgba(0,0,0,1)")
        this.grad0.addColorStop(0.1, "rgba(64,64,64,1)")
        this.grad0.addColorStop(0.3, "rgba(128,128,128,1)")
        this.grad0.addColorStop(1, "rgba(0,0,0,1)")
        this.grad1 = "black"
        this.floorcolor1 = "gray"
        this.floorcolor0 = "gray"
        this.outlinecolor = context.createLinearGradient(-this.tower.r - this.r, 0, this.tower.r + this.r, 0)
        this.outlinecolor.addColorStop(0, "rgba(0,0,0,1)")
        this.outlinecolor.addColorStop(0.15, "rgba(196,196,196,1)")
        this.outlinecolor.addColorStop(0.85, "rgba(196,196,196,1)")
        this.outlinecolor.addColorStop(1, "rgba(0,0,0,1)")
    },
    setps: function () {
        this.px = []
        this.py = []
        this.px0 = []
        this.py0 = []
        for (var j = 0 ; j < this.ncrenel + 1 ; ++j) {
            var p = this.tower.worldpos(this.x0 + this.dx * j / this.ncrenel, this.y, this.r)
            this.px.push(p[0])
            this.py.push(p[1])
            var p0 = this.tower.worldpos(this.x0 + this.dx * j / this.ncrenel, this.y, 1)
            this.px0.push(p0[0])
            this.py0.push(p0[1])
        }
    },
    setwallpath: function (condition) {
        var started = -1
        for (var j = 0 ; j < this.ncrenel ; ++j) {
            if (!condition(this.px[j], this.px[j+1])) continue
            if (started === -1) {
                started = j
                context.beginPath()
                context.moveTo(this.px[j], this.py[j])
            }
            context.lineTo(this.px[j+1], this.py[j+1])
        }
        if (started === -1) return false
        for (var j = this.ncrenel - 1 ; j >= 0 ; --j) {
            if (!condition(this.px[j], this.px[j+1])) continue
            context.lineTo(this.px[j+1], this.py[j+1] - (j % 2 ? 12 : 6))
            context.lineTo(this.px[j+1], this.py[j+1] - (j % 2 ? 6 : 12))
        }
        context.lineTo(this.px[started], this.py[started] - (started % 2 ? 6 : 12))
        context.closePath()
        return true
    },
    setfloorpath: function (condition) {
        var started = -1
        for (var j = 0 ; j < this.ncrenel ; ++j) {
            if (!condition(this.px[j], this.px[j+1])) continue
            if (started === -1) {
                started = j
                context.beginPath()
                context.moveTo(this.px[j], this.py[j])
            }
            context.lineTo(this.px[j+1], this.py[j+1])
        }
        if (started === -1) return false
        for (var j = this.ncrenel - 1 ; j >= 0 ; --j) {
            if (!condition(this.px[j], this.px[j+1])) continue
            context.lineTo(this.px0[j+1], this.py0[j+1])
        }
        context.lineTo(this.px0[started], this.py0[started])
        context.closePath()
        return true
    },
    backdraw: function (yrange) {
        this.setps()

        if (this.setwallpath(function (x0, x1) { return x0 >= x1; })) {
            context.fillStyle = this.grad1
            context.fill()
        }
        if (this.setfloorpath(function (x0, x1) { return x0 >= x1; })) {
            context.fillStyle = this.floorcolor1
            context.fill()
        }
    },
    draw: function (yrange) {
        if (this.setfloorpath(function (x0, x1) { return x0 < x1; })) {
            context.fillStyle = this.floorcolor0
            context.fill()
        }
        if (this.setwallpath(function (x0, x1) { return x0 < x1; })) {
            context.strokeStyle = this.outlinecolor
            context.stroke()
            context.fillStyle = this.grad0
            context.fill()
        }
    },
}

DontDraw = {
    draw: function (yrange) {},
    backdraw: function (yrange) {},
}


function Platform(tower, x0, x1, y) {
    return UFX.Thing().
        addcomp(UFX.Component.HasParent).
        addcomp(HorizontalExtent, tower, x0, x1, y).
        addcomp(HoldSteady).
        addcomp(DrawPlatformPath).
        addcomp(HasInvisibleChildren)
}

// A special platform located at y = 0 that extends around the whole tower
function Ground(tower) {
    return UFX.Thing().
        addcomp(UFX.Component.HasParent).
        addcomp(HorizontalExtent, tower, 0, tower.circ, 0).
        addcomp(HoldEverything).
        addcomp(DontDraw).
        addcomp(HasInvisibleChildren)
}



