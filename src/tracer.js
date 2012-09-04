// A tracer is a tool for optimizing vector graphics via caching
// If you've got a sequence of draw commands that you're executing over and over,
//   use this module to cache them to a canvas.
// UFX.draw is not required to use this module, but it is required for a couple of features.

// spec can either be a callback that performs all the drawing operations,
// or a string or array that can be passed to UFX.draw.

if (typeof UFX == "undefined") UFX = {}

UFX.Tracer = function (spec, rect, zmax) {
    var tracer = Object.create(UFX.Tracer.prototype)
    tracer.spec = spec
    if (typeof spec === "function") tracer.trace = spec
    tracer.x0 = rect[0]
    tracer.y0 = rect[1]
    tracer.w = rect[2]
    tracer.h = rect[3]
    tracer.zmax = zmax || 4
    tracer.imgs = {}
    return tracer
}
UFX.Tracer.prototype = {
    trace: function (context) {
        if (context) {
            UFX.draw(context, this.spec)
        } else {
            UFX.draw(this.spec)
        }
    },
    choosez: function (zoom) {
        if (zoom > this.zmax) return null
        var z = 1
        while (zoom > z) z *= 2
        while (zoom < z/2) z /= 2
        return z
    },
    draw: function (zoom, context) {
        var z = this.choosez(zoom || 1)
        if (!z) {
            this.trace(context)
        } else {
            if (!(z in this.imgs)) this.makeimg(z)
            context = context || UFX.draw._context
            if (z == 1) {
                context.drawImage(this.imgs[1], this.x0, this.y0)
            } else {
                context.save()
                context.scale(1/z, 1/z)
                context.drawImage(this.imgs[z], this.x0*z, this.y0*z)
                context.restore()
            }
        }
    },
    makeimg: function (z) {
        var img = document.createElement("canvas")
        img.width = this.w * z
        img.height = this.h * z
        var con = img.getContext("2d")
        con.save()
        con.scale(z, z)
        con.translate(-this.x0, -this.y0)
        this.trace(con)
        con.restore()
        this.imgs[z] = img
    },
}


