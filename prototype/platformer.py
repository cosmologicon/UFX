# Prototype for fancy moves in a platformer. Madness this way lies.

from pygame import *
from random import *
from math import *

mapx, mapy = 2000, 2000
nplatform = 200
nvertplatform = 0
ncircplatform = 0
nstars = 1000

sx, sy = 600, 400
x0, y0 = 0, 0
targetx0, targety0 = 0, 0


class settings:
    lookahead = 100
    gravity = 400
    fallgravity = 800
    spriteheight = 36
    spritewidth = 20
    catchheight = 50
    walkaccel = 600
    walkdecel = 1600
    walkspeed = 240
    walkoffthreshold = 60
    walkoffwidth = 10
    walkoffdelay = 0.16
    jumpyaccel = 3200
    jumpyspeed = 240
    jumpxaccel = 600
    jumpxdecel = 200
    jumpxspeed = 240
    panspeed = 3
    canbackflipfromground = True
    canbackflipfromair = False
    backflipdt = 0.2
    backflipyaccel = 3200
    backflipyspeed = 288
    backflipxspeed = 120
    backflipxaccel = 200
    backflipxdecel = 120
    backflipgravity = gravity
    backflipfallgravity = fallgravity
    cansprint = False
    sprintspeed = 600
    sprintdecel = 1000
    sprintaccel = 10000
    sprintdt = 0.4
    hangaccelfactor = 20
    hangdampfactor = 1
    swingaccel = 400
    



def screenpos(x, y):
    return x - (x0 - sx/2), -y - (-y0 - sy/2)

randomcolor = lambda: (randint(100, 255), randint(100, 255), randint(100, 255))

class Platform:
    color = 255, 255, 255
    def __init__(self, x0, dx, y):
        self.x0 = x0
        self.dx = dx
        self.y = y
        self.x1 = self.x0 + self.dx
        self.children = []
        self.oldy = self.y
        self.oldx0 = self.x0
    def think(self, dt):
        for child in self.children:
            child.think(dt)
    def worldpos(self):
        return self.x0, self.y
    def draw(self):
        x, y = screenpos(self.x0, self.y)
        rect = Rect(x, y, self.dx, 4)
        screen.fill(self.color, rect)
    def catches(self, sprite):
        sx, sy = sprite.worldpos()
        if not (sy < self.y and self.oldy <= sprite.oldpos[1]): return False
        return self.x0 <= sx < self.x1
    def hangcatches(self, sprite):
        sx, sy = sprite.worldpos()
        if not (self.x0 < sx and sprite.oldpos[0] <= self.oldx0): return False
        return sy < self.y < sy + settings.catchheight
    def holds(self, sprite):
        return 0 <= sprite.x <= self.dx or abs(sprite.vx) < settings.walkoffthreshold or sprite.walkofftime < settings.walkoffdelay
    def constrain(self, sprite):
        sprite.y = 0
        sprite.vy = 0
#        sprite.x = 0
    def hangconstrain(self, sprite):
#        sprite.x = 0
        sprite.y = 0
    def updatewalkofftime(self, sprite, dt):
        if settings.walkoffwidth < sprite.x < self.dx - settings.walkoffwidth:
            sprite.walkofftime = 0
        else:
            sprite.walkofftime += dt
    def getvelocity(self):
        return 0, 0

class PathPlatform(Platform):
    color = 255, 255, 0
    def __init__(self, plist, dx, speed = 100, t0 = 0):
        Platform.__init__(self, plist[0][0], dx, plist[0][1])
        self.plist = plist
        d = lambda (x0,y0),(x1,y1): sqrt((x1-x0)**2 + (y1-y0)**2)
        self.ds = [d(plist[j], plist[-j+1]) for j in range(len(plist))]
        self.speed = speed
        self.tpath = [d / self.speed for d in self.ds]
        self.t = t0
        self.jpath = 0
        self.x, self.y = self.plist[0]
        self.setpos()
    def setpos(self):
        while self.t > self.tpath[self.jpath]:
            self.t -= self.tpath[self.jpath]
            self.jpath = (self.jpath + 1) % len(self.plist)
        f = self.t / self.tpath[self.jpath]
        (x0, y0), (x1, y1) = self.plist[self.jpath], self.plist[-self.jpath+1]
        self.oldx0, self.oldy = self.x0, self.y
        self.x0, self.y = x1*f + x0*(1-f), y1*f + y0*(1-f)
    def think(self, dt):
        self.t += dt
        self.setpos()
        Platform.think(self, dt)
    def getvelocity(self):
        (x0, y0), (x1, y1) = self.plist[self.jpath], self.plist[-self.jpath+1]
        dx, dy = x1 - x0, y1 - y0
        d = sqrt(dx ** 2 + dy ** 2)
        return self.speed * dx / d, self.speed * dy / d

class CirclePlatform(Platform):
    color = 0, 255, 0
    def __init__(self, x0, y0, r, dx, speed = 100, t0 = 0):
        Platform.__init__(self, x0 + r, dx, y0)
        self.x00, self.y0, self.r, self.dx, self.speed = x0, y0, r, dx, speed
        self.t = t0
        self.setpos()
    def setpos(self):
        self.oldx0, self.oldy = self.x0, self.y
        theta = self.t * self.speed / self.r
        self.x0, self.y = self.x00 + self.r * cos(theta), self.y0 - self.r * sin(theta)
        self.x1 = self.x0 + self.dx
    def think(self, dt):
        self.t += dt
        self.setpos()
        Platform.think(self, dt)
    def getvelocity(self):
        raise NotImplementedError


class Ground(Platform):
    def __init__(self):
        Platform.__init__(self, 0, mapx, 0)
        self.color = 0, 128, 0
    def draw(self):
        x, y = screenpos(self.x0, self.y)
        if y < sy:
            rect = Rect(0, y, sx, sy)
            screen.fill(self.color, rect)
    def catches(self, sprite):
        self.oldy = self.y
        sx, sy = sprite.worldpos()
        return sy < self.y and self.oldy <= sprite.oldpos[1]
    def holds(self, sprite):
        return True
    def constrain(self, sprite):
        sprite.y = self.y
        sprite.vy = 0

class State:
    @staticmethod
    def enter(self):
        pass
    @staticmethod
    def exit(self):
        pass

    @staticmethod
    def think(self, dt, keys):
        pass

    @staticmethod
    def collideplatforms(self, platforms):
        catchers = [platform for platform in platforms if platform.catches(self)]
        hangcatchers = [platform for platform in platforms if platform.hangcatches(self)]
        if catchers:
            self.setstate(StandState)
            platform = max(catchers, key = lambda p: p.y)
            self.land(platform)
        elif hangcatchers:
            self.setstate(HangState)
            platform = max(hangcatchers, key = lambda p: p.y)
            self.land(platform)
            
    @staticmethod
    def constrain(self):
        pass
    
class StandState(State):
    @staticmethod
    def think(self, dt):
        keys = self.keys
        xmove = keys[K_RIGHT] - keys[K_LEFT]
        if not self.sprinting and settings.cansprint:
            if self.previouspress[K_RIGHT] > self.t - settings.sprintdt:
                self.sprinting = True
                self.speed = settings.sprintspeed
            if self.previouspress[K_LEFT] > self.t - settings.sprintdt:
                self.sprinting = True
                self.speed = -settings.sprintspeed

        if self.sprinting and self.vx * xmove < 0:
            self.sprinting = False
        decel, accel, speed = ((settings.sprintdecel, settings.sprintaccel, settings.sprintspeed)
            if self.sprinting else (settings.walkdecel, settings.walkaccel, settings.walkspeed))
        dvx = decel * dt
        if xmove:
            self.facingright = xmove > 0
            if self.vx * xmove < 0:
                if abs(self.vx) < abs(dvx):
                    self.vx = 0
                else:
                    self.vx += dvx if self.vx < 0 else -dvx
            self.vx += xmove * accel * dt
            if xmove > 0: self.vx = min(self.vx, speed)
            if xmove < 0: self.vx = max(self.vx, -speed)
        else:
            if abs(self.vx) < abs(dvx):
                self.vx = 0
            else:
                self.vx += dvx if self.vx < 0 else -dvx
            if self.sprinting and abs(self.vx) < settings.walkspeed:
                self.sprinting = False

        self.x += self.vx * dt
        if not self.parent.holds(self):
            self.setstate(FreefallState)
            self.drop()
            self.jholding = False
        elif keys[K_UP] and not self.oldkeys[K_UP]:
            if settings.canbackflipfromground:
                if xmove > 0 and self.lasthold[K_LEFT] > self.t - settings.backflipdt:
                    self.backflipping = True
                    self.facingright = True
                if xmove < 0 and self.lasthold[K_RIGHT] > self.t - settings.backflipdt:
                    self.backflipping = True
                    self.facingright = False
            self.setstate(FreefallState)
            self.jump()
            self.jholding = True
            self.jtime = 0

    @staticmethod
    def draw(self):
        x, y = screenpos(*self.worldpos())
        k = 1 if self.facingright else -1
        bfac = sqrt(abs(self.vx)) * 0.04
        def f((a,b)): 
            px = x + settings.spritewidth * (a + bfac * b) * k
            py = y - settings.spriteheight * b
            return int(px),int(py)
        ps = map(f, [(0.4,0),(-0.4,0.8),(0.4,0.6),(-0.8,0)])
        draw.polygon(screen, (144, 72, 0), ps, 0)
        draw.lines(screen, (255, 128, 0), True, ps)
        draw.circle(screen, (144, 144, 0), f((0, 1)), 6, 0)
        draw.circle(screen, (255, 255, 0), f((0, 1)), 6, 1)

    @staticmethod
    def constrain(self):
        self.parent.constrain(self)

#    @staticmethod
#    def exit(self):
#        self.sprinting = False        

class FreefallState(State):
    @staticmethod
    def think(self, dt):
        keys = self.keys
        self.jtime += dt
        if not keys[K_UP]: self.jholding = False
        if self.backflipping:
            if self.jholding and self.vy < settings.backflipyspeed:
                self.y += self.vy * dt + 0.5 * settings.backflipyaccel * dt ** 2
                self.vy += settings.backflipyaccel * dt
                if self.vy >= settings.backflipyspeed:
                    self.vy = settings.backflipyspeed
                    self.jholding = False
            else:
                g = settings.backflipgravity if keys[K_UP] else settings.backflipfallgravity
                self.y += self.vy * dt - 0.5 * g * dt ** 2
                self.vy -= g * dt
                if self.vy < 0:
                    self.backflipping = False
        elif self.jholding and self.vy < settings.jumpyspeed:
            self.y += self.vy * dt + 0.5 * settings.jumpyaccel * dt ** 2
            self.vy += settings.jumpyaccel * dt
            if self.vy >= settings.jumpyspeed:
                self.vy = settings.jumpyspeed
                self.jholding = False
        else:
            g = settings.gravity if keys[K_UP] else settings.fallgravity
            self.y += self.vy * dt - 0.5 * g * dt ** 2
            self.vy -= g * dt

        xmove = keys[K_RIGHT] - keys[K_LEFT]
        dvx = (settings.backflipxdecel if self.backflipping else settings.jumpxdecel) * dt
        if xmove:
            if settings.canbackflipfromair and self.jtime < settings.backflipdt:
                if xmove > 0 and not self.oldkeys[K_RIGHT] and self.lasthold[K_LEFT] > self.t - settings.backflipdt:
                    self.backflipping = True
                if xmove < 0 and not self.oldkeys[K_LEFT] and self.lasthold[K_RIGHT] > self.t - settings.backflipdt:
                    self.backflipping = True
            if not self.backflipping:
                self.facingright = xmove > 0
            if self.vx * xmove < 0:
                if abs(self.vx) < abs(dvx):
                    self.vx = 0
                else:
                    self.vx += dvx if self.vx < 0 else -dvx
            if self.backflipping:
                self.vx += xmove * settings.backflipxaccel * dt
                self.vx = min(max(-settings.backflipxspeed, self.vx), settings.backflipxspeed)
            else:
                self.vx += xmove * settings.jumpxaccel * dt
                self.vx = min(max(-settings.jumpxspeed, self.vx), settings.jumpxspeed)
        else:
            if abs(self.vx) < abs(dvx):
                self.vx = 0
            else:
                self.vx += dvx if self.vx < 0 else -dvx
        self.x += self.vx * dt


    @staticmethod
    def draw(self):
        x, y = screenpos(*self.worldpos())
        k = 1 if self.facingright else -1
        vfac = min(max(self.vy, -100), 200) * 0.001
        vx, vy = abs(self.vx), self.vy
        v = sqrt(vx ** 2 + vy ** 2)
        (S, C) = (0, 1) if v < 1 else (vy / v, vx / v)
        theta = 0.25 * sin(2 * atan2(self.vy, self.vx))
        if self.backflipping and not self.jholding:
            theta += -2 * pi * self.vy / settings.backflipyspeed * (1 if self.facingright else -1)
        (S, C) = (0, 1) if v < 1 else (sin(theta), cos(theta))
        def f((a,b)): 
            px = settings.spritewidth * a * k
            py = settings.spriteheight * b * (1 + vfac)
            py -= 0.7 * settings.spriteheight
            px, py = C * px + S * py, -S * px + C * py
            py += 0.7 * settings.spriteheight
            return int(x + px),int(y - py)
        ps = map(f, [(0.4,0),(-0.4,0.8),(0.4,0.6),(-0.8,0)])
        draw.polygon(screen, (144, 72, 0), ps, 0)
        draw.lines(screen, (255, 128, 0), True, ps)
        draw.circle(screen, (144, 144, 0), f((0, 1)), 6, 0)
        draw.circle(screen, (255, 255, 0), f((0, 1)), 6, 1)

    
class HangState(State):
    @staticmethod
    def think(self, dt):
        keys = self.keys
        self.vx -= self.x * dt * settings.hangaccelfactor
        self.x += self.vx * dt
        self.vx *= exp(-settings.hangdampfactor * dt)
        if keys[K_DOWN] or keys[K_LEFT]:
            self.setstate(FreefallState)
            self.x = 0
            self.drop()
            self.y -= settings.catchheight + 1
            self.oldpos = self.worldpos()
            self.jholding = False
        elif keys[K_UP] or keys[K_RIGHT]:
            self.setstate(FreefallState)
            self.x = 0
            self.drop()
            self.y -= settings.catchheight + 1
            self.oldpos = self.worldpos()
            self.jholding = True

    @staticmethod
    def draw(self):
        x, y = screenpos(*self.worldpos())
        x -= self.x
        k = 1 if self.facingright else -1
        theta = -self.vx * 0.004
        (S, C) = (sin(theta), cos(theta))
        def f((a,b)): 
            px = settings.spritewidth * a * k
            py = settings.spriteheight * b
            py -= settings.catchheight
            px, py = C * px + S * py, -S * px + C * py
            return int(x + px),int(y - py)
        ps = map(f, [(0.4,0),(-0.4,0.8),(0.4,0.6),(-0.8,0)])
        draw.polygon(screen, (144, 72, 0), ps, 0)
        draw.lines(screen, (255, 128, 0), True, ps)
        draw.circle(screen, (144, 144, 0), f((0, 1)), 6, 0)
        draw.circle(screen, (255, 255, 0), f((0, 1)), 6, 1)

    @staticmethod
    def constrain(self):
        self.parent.hangconstrain(self)


class Sprite:
    def __init__(self):
        self.oldpos = self.x, self.y = mapx/2, 100
        self.vx = self.vy = 0
        self.facingright = True
        self.parent = None
        self.state = None
        self.jholding = False
        self.jtime = 0
        self.backflipping = False
        self.sprinting = False
        self.t = 0
        self.previouspress = { K_UP: -1000, K_DOWN: -1000, K_LEFT: -1000, K_RIGHT: -1000 }
        self.lastpress = { K_UP: -1000, K_DOWN: -1000, K_LEFT: -1000, K_RIGHT: -1000 }
        self.lasthold = { K_UP: -1000, K_DOWN: -1000, K_LEFT: -1000, K_RIGHT: -1000 }
        self.setstate(FreefallState)
    def setstate(self, state):
        if self.state: self.state.exit(self)
        self.state = state
        if self.state: self.state.enter(self)
    def worldpos(self):
        px, py = self.parent.worldpos() if self.parent else (0,0)
        return px + self.x, py + self.y
    def attachto(self, parent = None):
        if self.parent:
            px, py = self.parent.worldpos()
            self.x += px
            self.y += py
            self.parent.children.remove(self)
        self.parent = parent
        if self.parent:
            px, py = self.parent.worldpos()
            self.x -= px
            self.y -= py
            self.state.constrain(self)
            self.parent.children.append(self)
    def lookat(self):
        x, y = self.worldpos()
        return x + (1 if self.facingright else -1) * settings.lookahead, max(y, sy/4)
    def draw(self):
        self.state.draw(self)
    def land(self, platform):
        self.attachto(platform)
        self.walkofftime = 0
    def jump(self):
        self.attachto()
    def drop(self):
        self.attachto()
    def think(self, dt):
        self.t += dt
        for key in self.lastpress:
            if self.keys[key]:
                self.lasthold[key] = self.t
            if self.keys[key] and not self.oldkeys[key]:
                self.previouspress[key] = self.lastpress[key]
                self.lastpress[key] = self.t
        self.state.think(self, dt)
        if self.parent:
            self.state.constrain(self)
            self.parent.updatewalkofftime(self, dt)

    def collideplatforms(self, platforms):
        self.state.collideplatforms(self, platforms)


#platforms = [Platform(random() * mapx, randint(100, 240), random() * mapy) for _ in range(nplatform)]
platforms = []
for j in range(nplatform):
    h = j * 20
    px0 = randint(-h/2-500, h/2+500)
    dx = randint(100, 240)
    platforms.append(Platform(px0, dx, h))
for _ in range(nvertplatform):
    px0, dx, py0 = random() * mapx, randint(100, 240), random() * mapy
    px1, py1 = random() * mapx, random() * mapy
    platforms.append(PathPlatform([[px0, py0], [px0, py1]], dx))
for _ in range(ncircplatform):
    px0, dx, py0 = random() * mapx, randint(100, 240), random() * mapy
    r = randint(200, 600)
    platforms.append(CirclePlatform(px0, py0, r, dx))
platforms.append(Ground())
you = Sprite()

stars = [(randint(0, 10000), randint(0, 10000), uniform(0.25, 0.5), randint(64, 196)) for _ in range(nstars)]

init()
screen = display.set_mode((sx, sy), HWSURFACE)
clock = time.Clock()
you.keys = None
while True:
    dt = clock.tick(30) * 0.001
    dt = 0.033
    for e in event.get():
        if e.type == KEYDOWN and e.key == K_ESCAPE: exit()
        if e.type == QUIT: exit()
    you.oldkeys = you.keys
    you.keys = key.get_pressed()
    if not you.oldkeys: you.oldkeys = you.keys
    you.oldpos = you.worldpos()
    if not you.parent:
        you.think(dt)
    for platform in platforms:
        platform.think(dt)
    you.collideplatforms(platforms)
    targetx0, targety0 = you.lookat()
    f = 1 - exp(-settings.panspeed * dt)
    x0 += f * (targetx0 - x0)
    y0 += f * (targety0 - y0)
    
    screen.fill((0,0,32))
    for x, y, f, c in stars:
        f = 0.5
        px, py = int((x - x0 * f) % sx), int((y + y0 * f) % sy)
        screen.set_at((px, py), (c, c, c))
    for platform in platforms:
        platform.draw()
    you.draw()
    display.flip()
    display.set_caption("%.1ffps" % clock.get_fps())



