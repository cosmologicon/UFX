// The scene module - keeps track of the scene stack

if (typeof UFX == "undefined") UFX = {}
UFX.scene = {}

UFX.scene.top = function () {
    var n = UFX.scene._stack.length
    return n ? UFX.scene._stack[n-1] : null
}
UFX.scene.push = function (c) {
    UFX.scene._stack.push(c)
}
UFX.scene.pop = function () {
    var c = UFX.scene._stack.pop()
    return c
}
UFX.scene.think = function (dt) {
    var c = UFX.scene.top()
    var args = c.thinkargs(dt)
    c.think.apply(c, args)
    UFX.scene._lastthinker = c
}
UFX.scene.draw = function (f) {
    UFX.scene._lastthinker.draw(f)
}


UFX.scene._stack = []

UFX.scene.Scene = {
    thinkargs: function (dt) {
        return [dt]
    },
    think: function (dt) {
    }    
    draw: function (f) {
    }
}



