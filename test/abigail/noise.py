# Perlin noise prototype - http://noisemachine.com/talk1

import pygame, random, math

bx, by = 10, 10  # number of grid points
s = 80  # size of each grid point

grads = {}  # gradient of each grid point
for x in range(bx):
    for y in range(by):
        theta = random.random() * 2 * math.pi
        grads[(x, y)] = math.sin(theta), math.cos(theta)
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

