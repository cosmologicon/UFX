
DoublePosition = {
    init: function (tower0, p0, tower1, p1) {
        this.pos = [
            { tower: tower0, x: p0[0], y: p0[1] },
            { tower: tower1, x: p1[0], y: p1[1] },
        ]
        tower0.addportal(this)
    },
}

DrawPortal = {
    draw: function (yrange) {
        this.pos.forEach(function (pos) {
            if (!pos.tower.infront(pos.x)) return
            var p = pos.tower.worldpos(pos.x, pos.y)
            // TODO: add a method so I don't have to take the numerical derivative here
            var p0 = pos.tower.worldpos(pos.x - 1, pos.y)
            var p1 = pos.tower.worldpos(pos.x + 1, pos.y)

            context.save()
            var xscale = (p1[0] - p0[0]) / 2., yscale = (p1[1] - p0[1]) / 2.
            context.transform(xscale, yscale, 0, 1, p[0], p[1])
            context.fillStyle = "gray"
            context.fillRect(-10, -40, 20, 40)
            context.fillStyle = "black"
            context.fillRect(-8, -38, 16, 38)

            context.restore()
        })
    },
}


function Portal(tower0, p0, tower1, p1) {
    return UFX.Thing().
        addcomp(DoublePosition, tower0, p0, tower1, p1).
        addcomp(DrawPortal)
        
}


