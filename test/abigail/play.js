
var PlayScene = {
    __proto__: UFX.scene.Scene,

    start: function () {
        this.tower = Tower(500, [128, 128, 128])
//        var p = Portal(this.tower, [100, 100], this.tower, [-20, 10])
//        var p = Platform(this.tower, -40, 100, 100)
        for (var h = 36 ; h < 1600 ; h += 24) {
            var x0 = this.tower.circ * Math.random(), dx = Math.random() * 80 + 40
            var p = Platform(this.tower, x0, x0 + dx, h)
        }
        var ground = Ground(this.tower)
        this.you = You(this.tower, [0, 600])
        UFX.key.watchlist = "up down left right".split(" ")
    },

    think: function (dt) {
        this.tower.think(dt)
        var you = this.you
        UFX.key.events().forEach(function (event) {
            if (event.type === "down") {
                if (event.name === "up") {
                    you.jump()
                }
            }
        })
        var keymove = (UFX.key.ispressed.right ? 1 : 0) - (UFX.key.ispressed.left ? 1 : 0)
        this.you.step(dt * keymove)
        var lookpos = this.you.lookingat()
        this.tower.panto(lookpos[0], lookpos[1])
        document.getElementById("fps").value = UFX.ticker.getfpsstr()
    },
    
    draw: function () {
        context.fillStyle = "rgba(0,0,128,1)"
        context.fillRect(0, 0, 540, 540)
        context.save()
        context.translate(270, 270)
//        var s = 1 + 0.2 * Math.sin(Date.now() * 0.001 / 4)
//        var s = 2
//        context.scale(s, s)
//        context.rotate(2 * this.tower.y0 / 800)
//        this.tower.draw([-380/s, 380/s])
        this.tower.draw([-270, 270])
        context.restore()
    },
}


