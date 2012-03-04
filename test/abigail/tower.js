

function randomshade(r0, g0, b0) {
    var r = UFX.random.rand
    var a = r(20, 40), b = r(20, 40), c = r(20, 40)
    return "rgb(" + (r0+a+b+c) + "," + (g0+a+b) + "," + (b0+a) + ")"
}

function blocktexture(x, y) {
    x = x || 400
    y = y || 400
    var img = document.createElement("canvas")
    img.width = x
    img.height = y
    var con = img.getContext("2d")
    con.fillStyle = randomshade(40, 40, 40)
    con.fillRect(0, 0, x, y)
    var nblock = Math.round(x * y / 200)
    var r = UFX.random.rand
    for (var j = 0 ; j < nblock ; ++j) {
        var w = r(20, 80), h = r(10, 40)
        var px = r(x), py = r(y)
        con.fillStyle = randomshade(40, 40, 40)
        for (var jx = -1 ; jx < 1 ; ++jx) {
            for (var jy = -1 ; jy < 1 ; ++jy) {
                con.fillRect(px+x*jx, py+y*jy, w, h)
            }
        }
    }
    return con
}

function panels(n, x, y) {
    n = n || 10
    x = x || 40
    y = y || 400
    var tex = blocktexture(n * x, y)
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

pwidth = 20
pans = panels(20, pwidth, 400)

function drawtower() {
    context.save()
    context.translate(270, 270)
    context.scale(0.5, 0.5)
    var theta = Date.now() * 0.001, dtheta = 2 * Math.PI / pans.length
    for (var jpanel = 0 ; jpanel < pans.length ; ++jpanel) {
        var px0 = 120 * Math.sin(theta + jpanel * dtheta)
        var py0 = 30 * Math.cos(theta + jpanel * dtheta)
        var px1 = 120 * Math.sin(theta + (jpanel + 1) * dtheta)
        var py1 = 30 * Math.cos(theta + (jpanel + 1) * dtheta)
        if (px0 >= px1) continue
        context.save()
        context.transform((px1 - px0 + 1) / pwidth, (py1 - py0) / pwidth, 0, 1, px0, -200 + py0)
        context.drawImage(pans[jpanel], 0, 0)
        context.restore()
    }

    var grad = context.createLinearGradient(-120, 0, 120, 0)
    grad.addColorStop(0, "rgba(0,0,0,0.4)")
    grad.addColorStop(0.3, "rgba(0,0,0,0)")
    grad.addColorStop(1, "rgba(0,0,0,0.8)")
    context.fillStyle = grad
    context.fillRect(-270, -270, 540, 540)

    context.restore()
}




