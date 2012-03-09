// UFX.noise module: Perlin noise generation

// Actually this uses a slight variation of Perlin noise that I prefer, where the gradient vectors
// follow an n-dimensional Gaussian distribution rather than being uniformly-distributed unit
// vectors.

if (typeof UFX == "undefined") UFX = {}

// The basic function that returns noise at a given position in n-space.
// This a slow, general reference implementation. Most calls should use a faster function
//   that computes many values at once.
UFX.noise = function (p) {
    var n = p.length
    var q = new Array(n)  // coordinates of lattice points on all sides of the given point
    var a = new Array(n)  // distance to lower lattice point
    for (var j = 0 ; j < n ; ++j) {
        var i = Math.floor(p[j]) % 256 + (p[j] < 0 ? 256 : 0)
        q[j] = [i, (i+1) % 256]
        a[j] = p[j] - Math.floor(p[j])
    }
    var r = 0  // return value
    for (var k = 0, kmax = 1 << n ; k < kmax ; ++k) {
        var v = new Array(n)
        for (var j = 0 ; j < n ; ++j) {
            v[j] = q[j][(k >> j) & 1]
        }
        var dprod = 0, cprod = 1
        for (var j = 0 ; j < n ; ++j) {
            var g = UFX.noise._gvalue(v, j)  // the j-th component of the gradient
            var t = ((k >> j) & 1) ? 1 - a[j] : -a[j]  // distance along the j-axis to lattice point
            dprod += g * t  // dot product sum
            cprod *= 1 - t * t * (3 - 2 * Math.abs(t))  // cross-fade factor
        }
        r += dprod * cprod
    }
    return r / 1000. / Math.sqrt(n)
}

// TODO: can we get by with 64 elements?

// 256 values in a Gaussian normal distribution (multiplied by 1000 for convenience)
// >>> a = [math.sqrt(2) * scipy.special.erfinv((0.5 + j) / 128. - 1.) for j in range(256)]
// >>> ",".join([str(int(x*1000)) for x in a])
UFX.noise._grad = [-2885,-2520,-2335,-2206,-2106,-2024,-1953,-1891,-1835,-1785,-1739,-1696,-1656,
  -1618,-1583,-1550,-1518,-1488,-1459,-1431,-1404,-1378,-1353,-1329,-1306,-1283,-1261,-1240,-1219,
  -1199,-1179,-1159,-1140,-1122,-1104,-1086,-1068,-1051,-1034,-1018,-1001,-985,-970,-954,-939,-924,
  -909,-894,-879,-865,-851,-837,-823,-809,-796,-783,-769,-756,-743,-730,-718,-705,-693,-680,-668,
  -656,-644,-632,-620,-608,-596,-584,-573,-561,-550,-539,-527,-516,-505,-494,-483,-472,-461,-450,
  -439,-428,-418,-407,-396,-386,-375,-365,-354,-344,-334,-323,-313,-303,-292,-282,-272,-262,-252,
  -242,-232,-222,-212,-202,-192,-182,-172,-162,-152,-142,-132,-122,-112,-102,-93,-83,-73,-63,-53,
  -44,-34,-24,-14,-4,4,14,24,34,44,53,63,73,83,93,102,112,122,132,142,152,162,172,182,192,202,212,
  222,232,242,252,262,272,282,292,303,313,323,334,344,354,365,375,386,396,407,418,428,439,450,461,
  472,483,494,505,516,527,539,550,561,573,584,596,608,620,632,644,656,668,680,693,705,718,730,743,
  756,769,783,796,809,823,837,851,865,879,894,909,924,939,954,970,985,1001,1018,1034,1051,1068,1086,
  1104,1122,1140,1159,1179,1199,1219,1240,1261,1283,1306,1329,1353,1378,1404,1431,1459,1488,1518,
  1550,1583,1618,1656,1696,1739,1785,1835,1891,1953,2024,2106,2206,2335,2520,2885]
// A random permutation of [0,256)
UFX.noise._perm = [127,13,214,153,195,181,253,32,17,180,95,9,159,81,209,129,31,157,21,76,118,79,91,
  0,38,234,8,147,148,227,206,78,22,223,198,109,240,46,115,71,133,175,232,14,168,37,196,49,213,106,
  62,119,85,61,104,220,139,203,44,73,189,237,39,210,28,57,6,172,164,40,51,186,233,52,204,199,50,243,
  161,126,249,7,36,244,131,231,24,1,252,142,27,53,188,254,137,184,92,201,136,165,43,145,205,216,33,
  19,101,75,156,60,228,215,197,185,248,30,26,200,107,96,11,247,173,111,108,235,166,241,105,120,47,
  110,130,167,112,208,160,154,42,16,48,34,202,221,74,122,236,64,143,246,103,88,222,238,162,155,163,
  80,230,72,25,176,68,158,121,124,63,177,113,41,3,45,86,55,114,67,134,212,58,242,179,192,35,170,211,
  15,149,224,140,66,128,219,193,2,229,117,93,54,132,135,218,169,187,207,191,144,138,245,190,65,23,
  146,123,56,152,194,171,18,4,100,150,255,99,98,183,83,70,97,141,178,182,250,84,10,239,217,94,116,
  174,29,151,82,12,225,59,125,20,5,69,251,77,102,90,89,226,87]
// Use the permutation to convert an vector of indices into a gradient value
UFX.noise._gvalue = function (v, n) {
    var i = UFX.noise._perm[n]
    for (var j = 0 ; j < v.length ; ++j) i = UFX.noise._perm[(i + v[j]) & 255]
    return UFX.noise._grad[i]
}




