// UFX.random: random number generation

// The random numbers are generated by a quick and easy LCG, which is good enough for games, but
// definitely not for simulations or cryptography.

// There are two reasons to use this instead of Math.random. First, you can seed this RNG, so you
// can deterministically generate the same sequence over again if you want. Second, there are a
// number of handy functions I always wanted.

// You don't need to seed it before the first usage. It's automatically seeded with Math.random in
// that case.

// For more information and options, please see the documentation:
// https://code.google.com/p/unifac/wiki/UFXDocumentation#UFX.random_:_generate_pseudorandom_numbers


"use strict"
var UFX = UFX || {}

// UFX.random and UFX.random.rand - the two basic RNG functions

// UFX.random() : float in [0, 1)
// UFX.random(a) : float in [0, a)
// UFX.random(a, b) : float in [a, b)
// UFX.random.rand() : integer in [0, 2^32)
// UFX.random.rand(n) : integer in [0, n)
// UFX.random.rand(m, n) : integer in [m, n)

UFX.random = function (a, b) {
	return UFX.random.random(a, b)
}
UFX.random.random = function (a, b) {
    if (typeof b == "undefined") {
        b = a
        a = 0
        if (typeof b == "undefined") {
            b = 1
        }
    }
    return UFX.random.rand() * (b - a) / 4294967296 + a
}
UFX.random.rand = function (m, n) {
    if (typeof n != "undefined") return m + UFX.random.rand(n-m)
    if (typeof UFX.random.seed == "undefined") {
        UFX.random.setseed()
    }
    // Values from Numerical Recipes, according to Wikipedia
    UFX.random.seed = (1664525 * UFX.random.seed + 1013904223) % 4294967296
    return m ? Math.floor(UFX.random.seed * m / 4294967296) : UFX.random.seed
}

// Jenkins hash function - used to get a number for seeding the RNG from an arbitrary object
//   http://en.wikipedia.org/wiki/Jenkins_hash_function
// For the purposes of bitwise operations, JavaScript's Number type is a 32-bit signed
//   integer. So we can operate as normal on the lower 32 bits, and only at the very end
//   do we have to worry about whether it's negative.
UFX.random.hash = function (obj) {
    var s = typeof obj == "string" ? obj : JSON.stringify(obj), n = s.length, h = 0
    for (var j = 0 ; j < n ; ++j) {
        h += s.charCodeAt(j)
        h += h << 10
        h ^= h >>> 6
    }
    h += h << 3
    h ^= h >>> 11
    h += h << 15
    if (h < 0) h += 4294967296 
    return h
}

// Call with no argument to set a seed from Math.random
// Call with an integer in the range [0, 4294967296) to set that seed
//   (can also just assign to UFX.random.seed)
// Call with an arbitrary object to set a seed based on that object's hash
// Returns the new seed
UFX.random.setseed = function (n) {
    if (typeof n == "undefined") {
        n = Math.floor(Math.random() * 4294967296)
    } else if (typeof n == "number") {
        n = Math.floor(n) % 4294967296
    } else {
        n = UFX.random.hash(n)
    }
    UFX.random.seed = n
    delete UFX.random.normal._y
    return n
}

// Save the state of the RNG for later use
// Useful if you want to generate some random numbers without messing with the RNG
UFX.random._seedstack = []
UFX.random.pushseed = function (n) {
    if (typeof UFX.random.seed == "undefined") UFX.random.setseed()
    UFX.random._seedstack.push(UFX.random.seed)
    UFX.random.setseed(n)
    return UFX.random.seed
}
// Restore the old state of the RNG
UFX.random.popseed = function () {
    UFX.random.seed = UFX.random._seedstack.pop()
    return UFX.random.seed
}
// Apply a temporary seed for a single method invocation
UFX.random.seedmethod = function (seed, methodname) {
	UFX.random.pushseed(seed)
	var value = UFX.random[methodname || "random"].apply(UFX.random, [].slice.call(arguments, 2))
	UFX.random.popseed()
	return value
}


// Random angle in [0, tau)
UFX.random.angle = function () {
	return UFX.random(0, 2 * Math.PI)
}

// Random 2-d unit vector
UFX.random.direction = function (d) {
	if (typeof d != "number") d = 1
	var a = UFX.random.angle()
	return [d * Math.cos(a), d * Math.sin(a)]
}

// Select a random element from the array arr.
// If remove is set to true, the selected element is removed.
UFX.random.choice = function (arr, remove) {
    return remove ? arr.splice(UFX.random.rand(arr.length), 1)[0] : arr[UFX.random.rand(arr.length)]
}

UFX.random.flip = function (p) {
    return UFX.random() < (p === undefined ? 0.5 : p)
}

// string of n random letters
UFX.random.word = function (n, letters) {
	var a = []
	n = n || 8
	letters = letters || "abcdefghijklmnopqrstuvwxyz"
	for (var j = 0 ; j < n ; ++j)
		a.push(UFX.random.choice(letters))
	return a.join("")
}

UFX.random.color = function () {
	return "#" + UFX.random.word(6, "0123456789ABCDEF")
}

// Fisher-Yates shuffle (in-place)
UFX.random.shuffle = function (arr) {
    for (var i = arr.length - 1 ; i > 0 ; --i) {
        var j = UFX.random.rand(i+1)
        var temp = arr[i]
        arr[i] = arr[j]
        arr[j] = temp
    }
    return arr
}

// TODO: extend the following two functions into more than 3 dimensions
// A random point in the unit circle
UFX.random.rdisk = function () {
    var x, y
    do {
        x = UFX.random(-1, 1)
        y = UFX.random(-1, 1)
    } while (x * x + y * y > 1)
    return [x, y]
}

// A random point on the unit sphere
UFX.random.rsphere = function () {
    var x, y, z
    do {
        x = UFX.random(-1, 1)
        y = UFX.random(-1, 1)
        z = UFX.random(-1, 1)
    } while (x * x + y * y + z * z > 1)
    var d = Math.sqrt(x*x + y*y + z*z)
    if (d === 0) return [0, 0, 1]
    return [x/d, y/d, z/d]
}


// N points in the unit square that avoid clustering
// setting dfac will affect how non-random it appears
// dfac = 1 : very non-random, regular spacing
// dfac = 0.01 : pretty much like a random distribution
// defaults to 0.15
UFX.random.spread = function (n, dfac, scalex, scaley, x0, y0) {
    n = n || 100
    dfac = dfac || 0.15
    scalex = scalex || 1.0
    scaley = scaley || scalex
    x0 = x0 || 0
    y0 = y0 || x0
    var r = [], d2min = 1.
    while (r.length < n) {
        var x = UFX.random(), y = UFX.random(), valid = true
        for (var j = 0 ; j < r.length ; ++j) {
            var dx = Math.abs(x - r[j][0]), dy = Math.abs(y - r[j][1])
            if (dx > 0.5) dx = 1 - dx
            if (dy > 0.5) dy = 1 - dy
            if (dx * dx + dy * dy < d2min) {
                valid = false
                break
            }
        }
        if (valid) {
            r.push([x, y])
            d2min = dfac / r.length
        } else {
            d2min *= 0.9
        }
    }
    for (var j = 0 ; j < n ; ++j) {
        r[j][0] = x0 + r[j][0] * scalex
        r[j][1] = y0 + r[j][1] * scaley
    }
    return r
}

UFX.random.spread1d = function (n, dfac) {
    n = n || 100
    dfac = dfac || 0.15
    var r = [], dmin = 1
    while (r.length < n) {
        var x = UFX.random(), valid = true
        for (var j = 0 ; j < r.length ; ++j) {
            var dx = Math.abs(x - r[j])
            if (dx > 0.5) dx = 1 - dx
            if (dx < dmin) {
                valid = false
                break
            }
        }
        if (valid) {
            r.push(x)
            dmin = 0.5 * dfac / r.length
        } else {
            dmin *= 0.95
        }
    }
//    var scalex = 1, x0 = 0
    return r
}

// Gaussian normal variable
// http://www.taygeta.com/random/gaussian.html
UFX.random.normal = function (mu, sigma) {
    mu = mu || 0
    sigma = sigma || 1
    if (typeof UFX.random.normal._y == "number") {
        var x = UFX.random.normal._y
        delete UFX.random.normal._y
    } else {
        var x, y, w
        do {
            x = UFX.random(-1, 1)
            y = UFX.random(-1, 1)
            w = x * x + y * y
        } while (w > 1)
        try {
            w = Math.sqrt(-2. * Math.log(w) / w)
            x *= w
            y *= w
        } catch (err) {
            x = y = 0
        }
        UFX.random.normal._y = y
    }
    return x * sigma + mu
}




