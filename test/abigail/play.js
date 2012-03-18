
var PlayScene = {
    __proto__: UFX.scene.Scene,

    start: function () {
        this.tower = Tower(500, [128, 128, 128])
        UFX.key.watchlist = "up down left right".split(" ")
    },

    think: function (dt) {
        this.tower.think(dt)
        var tower = this.tower
        UFX.key.events().forEach(function (event) {
            if (event.type == "down") {
                var dx = {left: -50, right: 50}[event.name]
                var dy = {up: 50, down: -50}[event.name]
                tower.scootch(dx, dy)
            }
        })
        document.getElementById("fps").value = UFX.ticker.getfpsstr()
    },
    
    draw: function () {
        context.fillStyle = "black"
        context.fillRect(0, 0, 540, 540)
        context.save()
        context.translate(270, 270)
        context.scale(2, 2)
        this.tower.draw([-260, 260])
        context.restore()
    },
}


