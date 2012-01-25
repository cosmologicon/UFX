// UFX.ticker module - frame handling
// Register two callbacks, think() and draw(), and determine how they'll be called.

// think(dt) can take a single argument dt, which is the game time (in seconds) since the previous
//   call. This may be smaller than the actual (wall) time since the previous call, if the game is
//   lagging.
// If you're using a fixed update rate, feel free to ignore this value.

// draw(f) can take a single argument f, which is the current tweening factor. This value is
//   within the interval (0,1], where 0 represents the previous update and 1 represents the
//   current update. If tweening is not enabled, this value will always be 1.
// If you're not accounting for tweening, feel free to ignore this value.

// NOTE: tweening mode is not currently implemented, so there's no point calling draw more than
//   once between successive think calls


// How to divide the labor between think and draw?

// Generally think should do the minimum amount necessary to keep the "simulation" running,
//   and draw should handle all non-essential functions. If you skip one or more draw calls, the
//   game should continue on in a consistent state. The idea is that if the game starts to lag,
//   draw calls can be skipped to keep the updates per second up.

// If performance is not a concern for you, you can feel free to not define draw, and handle both
//   simulation updates and drawing to the screen in the think function.


if (typeof UFX == "undefined") UFX = {}
UFX.ticker = {}

// Every time the think function is called, 

// There are a lot of options involved, and you can set them manually if you like, but it's
//   recommended that you use one of a few patterns (below). A little simpler that way.

// ups (updates per second) is the number of times think should be called per second
// fps (frames per second) is the number of times draw should be called per second
// The HTML5 spec prevents setTimeout from executing recursively with a timeout of less than 4ms,
//   which makes the theoretical maximum rate 250ups/fps.

// Game will not provide more than this ups, even if possible
UFX.ticker.maxups = 30
// minups - If unable to provide this many ups, the game will lag
UFX.ticker.minups = 30
// Note: for a fixed timestep, set maxups and minups to the same value

// Number of updates per frame
UFX.ticker.upf = 1

// Minimum delay in ms between successive update runs.
UFX.ticker.delay = 0

// Use requestAnimationFrame rather than setTimeout
// This is used to throttle the framerate to the screen update frequency
// (probably?) only makes sense if you're getting more than 60ups
UFX.ticker.animsync = false





// The most basic registration function
UFX.ticker.register = function (tcallback, dcallback, opts) {
    UFX.ticker._tcallback = tcallback
    UFX.ticker._dcallback = dcallback
    UFX.ticker.setoptions(opts)
    UFX.ticker.resume()
}

// For use when you want think and draw synched
UFX.ticker.registersync = function (tcallback, dcallback, maxups, minups) {
    var opts = { upf: 1 }
    if (maxups) {
        opts.maxups = maxups
        opts.minups = minups || maxups
    }
    UFX.ticker.register(tcallback, dcallback, opts)
}


// Update all options
UFX.ticker.setoptions = function (opts) {
    if (!opts) return
    
    var copykeys = ["maxups", "minups", "maxupf", "animsync"]

    for (var j = 0 ; j < copykeys.length ; ++j) {
        var key = copykeys[j]
        if (typeof opts[key] != "undefined") UFX.ticker[key] = opts[key]
    }
}

// Stop and resume. Safe to call multiple times.
// Will automatically resume if register is called.
UFX.ticker.stop = function () {
    if (UFX.ticker._rafhandle) {
        window.cancelRequestAnimationFrame(UFX.ticker._rafhandle)
        UFX.ticker._rafhandle = null
    }
    if (UFX.ticker._sthandle) {
        cancelTimeout(UFX.ticker._sthandle)
        UFX.ticker._sthandle = null
    }
}
UFX.ticker.resume = function () {
    UFX.ticker.stop()
    UFX.ticker._think()
}


// Returns a string with a manageable number of digits
UFX.ticker.getfpsstr = function () {
    return UFX.ticker._3digits(UFX.ticker.fps) + "fps"
}
UFX.ticker.getupsstr = function () {
    return UFX.ticker._3digits(UFX.ticker.ups) + "ups"
}
UFX.ticker._3digits = function (f) {
    if (!f) return "???"
    var ndig = f >= 100 ? 0 : f >= 10 ? 1 : f >= 1 ? 2 : 3
    return f.toFixed(ndig)
}



// Called repeatedly, and calls either the _tcallback, or _dcallback, or both,
//   depending on the current options.
// Also updates the FPS and UPS counters.
UFX.ticker._think = function () {

    // Determine which of the callbacks will be called this round
    var now = (new Date()).getTime()
    var dothink = true, dodraw = true
    // Simple case - call think and draw every time
    if (UFX.ticker.upf == 1) {
    } else {
        // TODO: handle this!
    }

    // Call the callbacks if necessary
    if (dothink && UFX.ticker._tcallback) {
        var truedt = UFX.ticker._lastthink ? (now - UFX.ticker._lastthink) * 0.001 : 0
        UFX.ticker._lastthink = now
        var dt = truedt
        if (UFX.ticker.minups) {
            dt = Math.min(1. / UFX.ticker.minups, dt)
        }
        UFX.ticker._tcallback(dt)
        
        // FPS smoothing algorithm
        // http://stackoverflow.com/questions/87304/calculating-frames-per-second-in-a-game
        if (typeof UFX.ticker._avgdtu != "number") {
            UFX.ticker._avgdtu = truedt
        } else {
            UFX.ticker._avgdtu = 0.95 * UFX.ticker._avgdtu + 0.05 * truedt
        }
        UFX.ticker.ups = 1. / UFX.ticker._avgdtu
    }
    if (dodraw && UFX.ticker._dcallback) {
        var dt = UFX.ticker._lastdraw ? (now - UFX.ticker._lastdraw) * 0.001 : 0
        UFX.ticker._lastdraw = now
        UFX.ticker._dcallback(1.0)
        
        if (typeof UFX.ticker._avgdtf != "number") {
            UFX.ticker._avgdtf = dt
        } else {
            UFX.ticker._avgdtf = 0.95 * UFX.ticker._avgdtf + 0.05 * dt
        }
        UFX.ticker.fps = 1. / UFX.ticker._avgdtf
    }
    
    // No draw function registered, use ups as fps
    if (!UFX.ticker._dcallback) {
        UFX.ticker._avgdtf = UFX.ticker._avgdtu
        UFX.ticker.fps = UFX.ticker.ups
    }

    // Set up the next round
    UFX.ticker._rafhandle = UFX.ticker._sthandle = null
    if (UFX.ticker.animsync) {
        UFX.ticker._rafhandle = window.requestAnimationFrame(UFX.ticker._think)
    } else {
        var dtnext = UFX.ticker.maxups ? Math.floor(1000.0 / UFX.ticker.maxups) : 0
        dtnext -= (new Date()).getTime() - now
        var delay = Math.max(dtnext, UFX.ticker.delay)
        UFX.ticker._sthandle = window.setTimeout(UFX.ticker._think, delay)
    }
}



