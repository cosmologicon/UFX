
var PlayScene = {
    __proto__: UFX.scene.Scene,

    start: function () {
        this.tower = Tower(500, [128, 128, 128])
//        var p = Portal(this.tower, [100, 100], this.tower, [-20, 10])
//        var p = Platform(this.tower, -40, 100, 100)
        for (var h = 36 ; h < 1600 ; h += 40) {
            var x0 = this.tower.circ * Math.random(), dx = Math.random() * 80 + 40
            var p = Platform(this.tower, x0, x0 + dx, h)
        }
        var ground = Ground(this.tower)
        this.you = You(this.tower, [0, 600])
        UFX.key.watchlist = "up down left right esc P".split(" ")
    },

    thinkargs: function (dt) {
        var press = {}, unpress = {}
        UFX.key.events().forEach(function (event) {
            if (event.type === "down") {
                press[event.name] = true
            }
            if (event.type === "up") {
                unpress[event.name] = event.dt
            }
        })
        var pressed = {}
        for (var key in UFX.key.ispressed) pressed[key] = true
        return [dt, press, unpress, pressed]
    },

    think: function (dt, press, unpress, pressed) {
        this.tower.think(dt)
//        if (typeof unpress.up === "number") this.you.releasejump(unpress.up)
        if (press.esc || press.P) UFX.pause()
        var keymove = (pressed.right ? 1 : 0) - (pressed.left ? 1 : 0)
//        this.you.step(dt * keymove)
        this.you.control(keymove, pressed.up, dt)
        var lookpos = this.you.lookingat()
        this.tower.panto(lookpos[0], lookpos[1])
        document.getElementById("fps").value = UFX.ticker.getfpsstr()
    },
    
    draw: function () {
        context.fillStyle = "rgba(0,0,128,1)"
        context.fillRect(0, 0, settings.canvaswidth, settings.canvasheight)
        context.save()
        context.translate(settings.canvaswidth/2, settings.canvasheight/2)
        this.tower.draw([-settings.canvasheight/2, settings.canvasheight/2])
        context.restore()
    },
}


