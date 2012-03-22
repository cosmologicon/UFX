


HasPosition = {
    init: function (tower, pos) {
        this.tower = tower
        this.x = pos ? pos[0] : 0
        this.y = pos ? pos[1] : 0
        this.tower.addsprite(this)
    },
}

FeelGravity = {
    init: function (g) {
        this.g = g || 400
        this.vx = 0
        this.vy = 0
    },
    
    think: function (dt) {
        if (this.parent === this.tower) {
            this.oldy = this.y
            this.y += (this.vy - 0.5 * this.g * dt) * dt
            this.vy -= this.g * dt
        }
    },

}

CanLand = {
    init: function () {
        this.dropspeed = 1
    },
    land: function (platform) {
/*        if self.vy < -100:
            y0, vy0 = self.y - platform.y, self.vy
            try:
                t = (vy0 + math.sqrt(vy0 ** 2 + 2 * self.g * y0)) / self.g
            except:
                t = 0
            landspeed = vy0 - self.g * t
            if landspeed < -settings.diespeed:
                self.alive = False*/
        this.vy = 0
        this.y = platform.y
        this.attachto(platform)
    },
    drop: function () {
        if (this.parent === this.tower) return
        this.attachto(this.tower)
        this.vy = -this.dropspeed
        this.y -= 0.1
    },

    think: function (dt) {
        if (this.parent === this.tower) {
            var platforms = this.tower.platforms
            for (var j = 0 ; j < platforms.length ; ++j) {
                if (platforms[j].catches(this)) {
                    this.land(platforms[j])
                    return
                }
            }
        } else {
            if (!this.parent.holds(this)) {
                this.drop()
            }
        }
    },
}

FacePosition = {
    init: function () {
        this.facingright = true
    },
    
    lookingat: function () {
        return [this.x + (this.facingright ? 1 : -1) * this.tower.r * 0.4, this.y]
    },
}

DrawBox = {
    draw: function (yrange) {
        var pos = this.tower.worldpos(this.x, this.y, 6)
        context.save()
        context.beginPath()
        context.translate(pos[0], pos[1])
        context.moveTo(-6, 0)
        context.lineTo(6, 0)
        context.lineTo(-4, -20)
        context.lineTo(4, -20)
        context.closePath()
        context.strokeStyle = "orange"
        context.stroke()
        context.restore()
    },
    drawfuncs: function (yrange) {
        return [[this.draw, this, (this.tower.infront(this.x) ? 1 : -1), this.y, "sprite"]]
    },
}


Controlled = {
    init: function () {
    },
    step: function (ds) {
//        if self.outtimer: return
        if (ds == 0) return
        this.x += settings.walkspeed * ds
        this.facingright = ds > 0
        //.stepped = True
    },
    jump: function () {
//        if self.outtimer: return
        if (this.parent === this.tower) {
//            if self.jumps >= self.maxjumps:
                return
//            self.vy = min(self.vy + settings.djumpboost, settings.jumpspeed)
//            self.jumps += 1
//            if self.playsounds: noise.play("jump-1")
        } else {
            this.attachto(this.tower)
            this.vy = settings.jumpspeed
//            self.jumps = 1
//            if self.playsounds: noise.play("jump-1")
        }
    },
}

function You(tower, pos) {
    return UFX.Thing().
        addcomp(UFX.Component.HasParent).
        addcomp(Controlled).
        addcomp(HasPosition, tower, pos).
        addcomp(FacePosition).
        addcomp(FeelGravity).
        addcomp(CanLand).
        addcomp(DrawBox)
}


