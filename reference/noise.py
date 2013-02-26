# Perlin noise prototype - http://noisemachine.com/talk1

import pygame, random, math

sx, sy = 512, 512
nx, ny = 8, 8

grads = []  # gradient of each grid point
for y in range(ny):
    for x in range(nx):
        theta = random.random() * 2 * math.pi
        grads.append((math.sin(theta), math.cos(theta)))

data = [0.] * (sx * sy)

cx = [(j + 0.5) * nx / sx for j in range(sx)]  # Coodinate in x, ranging from 0 to nx
ix = [int(t) for t in cx]  # index of grid point at x
ax = [t - int(t) for t in cx]  # distance from point to previous grid point
bx = [1 - t for t in ax]       # distance from point to next grid point
gx = [t*t*(3-2*t) for t in ax] # cross-fade function of distance to previous grid point
hx = [t*t*(3-2*t) for t in bx] # cross-fade function of distance to next grid point
qx = [[grads[i+nx*y][0] * a for i,a in zip(ix,ax)] for y in range(ny)]  # dot product x-component for each row
rx = [[grads[(i+1)%nx+nx*y][0] * b for i,b in zip(ix,bx)] for y in range(ny)]  # dot product x-component for each row

exit()

# crossfade factors at n sample points)
def cross(n, rev = False, cache = {}):
    key = n, rev
    if key in cache: return cache[key]
    ts = [(j + 0.5) / n for j in range(n)]
    if rev: ts = reversed(ts)
    fades = [t*t*(3-2*t) for t in ts]
    cache[key] = fades
    return fades

# vertical crossfade factors for upper points
crossy0 = []



def f(gx, gy):
    x0, y0 = int(gx), int(gy)
    n = 0
    for x, y in ((x0, y0), (x0+1,y0), (x0,y0+1), (x0+1,y0+1)):
        grx, gry = grads[(x % bx, y % by)]
        dx, dy = x - gx, y - gy
        t = dx * grx + dy * gry
        hx, hy = 1 - abs(dx), 1 - abs(dy)
        n += t * (3 * hx ** 2 - 2 * hx ** 3) * (3 * hy ** 2 - 2 * hy ** 3)
    return n

screen = pygame.display.set_mode((1200, 500))
for py in range(500):
    for px in range(1200):
        val = 0
#        for fac in (1., 2., 4., 8., 16.):
        for fac in (1.,):
            val += f(fac * float(px) / s, fac * float(py) / s) / fac
#            val += -abs(f(fac * float(px) / s, fac * float(py) / s) / fac)
#        val = math.sin(2 * math.pi * px / (bx * s) + 2 * val)
        val = math.sin(12 * val)
        c = 120 + int(80 * val)
        screen.set_at((px, py), (c, c, c))
    pygame.display.flip()

while not any(event.type in (pygame.QUIT, pygame.KEYDOWN) for event in pygame.event.get()):
    pass

