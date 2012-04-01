# Prototype for fancy moves in a platformer. Madness this way lies.

from pygame import *
from random import *
from math import *



class settings:
    screensize = 800, 600
    lookahead = 100
    panspeed = 2

    nstars = screensize[0] * screensize[1] // 2000

# Singleton to keep track of unattached entities
class entities:
    children = []
    x = y = 0
    spritestate = None
    @classmethod
    def worldpos(cls):
        return 0, 0
    @classmethod
    def constrain(cls, child):
        pass
    @classmethod
    def think(cls, dt):
        for child in cls.children:
            child.think(dt)
    @classmethod
    def draw(cls):
        for child in cls.children:
            child.draw()        
    @classmethod
    def catchpriority(cls, sprite):
        return 0, 0

class Entity:
    x = y = 0
    vx = vy = 0
    parent = None
    spritestate = None  # The state a sprite has to be in if it's attached to this
    def __init__(self, parent = entities):
        self.children = []
        self.attachto(parent)
    def worldpos(self):
        x0, y0 = self.parent.worldpos()
        return x0 + self.x, y0 + self.y
    def think(self, dt):
        for child in self.children:
            child.think(dt)
    def draw(self):
        for child in self.children:
            child.draw()
    def attachto(self, parent = entities):
        if self.parent:
            px, py = self.parent.worldpos()
            self.x += px
            self.y += py
            self.parent.children.remove(self)
        self.parent = parent
        px, py = self.parent.worldpos()
        self.x -= px
        self.y -= py
        self.parent.children.append(self)
    def constrain(self, child):
        pass
    def holds(self, sprite):
        return True


class State:
    @classmethod
    def enter(cls, sprite):
        pass
    
    @classmethod
    def exit(cls, sprite):
        pass

    @classmethod
    def think(cls, sprite, dt):
        pass

    @classmethod
    def lookat(cls, sprite):
        x, y = sprite.worldpos()
        return x + (1 if sprite.facingright else -1) * settings.lookahead, max(y, camera.sy/4)

    # Return 2 vectors that indicate the sprite's orientation
    # first is "horizontal forward" for the sprite"
    # second is "vertical" for the sprite
    @classmethod
    def orientation(cls, sprite):
        return ((1 if sprite.facingright else -1), 0), (0, 1)

    @classmethod
    def draw(cls, sprite):
        x0, y0 = sprite.worldpos()
        (hx, hy), (vx, vy) = sprite.orientation()
        pos0 = camera.screenpos((x0, y0))
        pos1 = camera.screenpos((x0 + hx * 15, y0 + hy * 15))
        pos2 = camera.screenpos((x0 + vx * 30, y0 + vy * 30))
        draw.line(screen, (255, 0, 0), pos0, pos1, 1)
        draw.line(screen, (255, 0, 0), pos0, pos2, 1)
        draw.circle(screen, (255, 128, 0), pos0, 3, 1)

    @classmethod
    def xmotion(cls, sprite, dt):
        xmove = keytracker.keys[K_RIGHT] - keytracker.keys[K_LEFT]
        k = 1 if sprite.vx > 0 else -1 if sprite.vx < 0 else xmove
        if xmove == 0:  # not holding anything
            dvx = cls.xdecel * dt
            sprite.vx = 0 if abs(sprite.vx) < dvx else sprite.vx - k * dvx
        elif sprite.vx and k * xmove < 0:  # holding backward
            dvx = cls.xbdecel * dt
            sprite.vx = 0 if abs(sprite.vx) < dvx else sprite.vx - k * dvx
        else:  # holding forward
            vx = abs(sprite.vx)
            if vx < cls.xspeed:  # going slower than max speed
                vx = min(vx + cls.xfaccel * dt, cls.xspeed)
            elif vx > cls.xspeed:  # going faster than max speed
                vx = max(vx - cls.xfdecel * dt, cls.xspeed)
            sprite.vx = vx * k
        if xmove:
            sprite.facingright = xmove > 0
        sprite.x += sprite.vx * dt

    @classmethod
    def checkcatch(cls, sprite, platforms):
        pass

# Attached to the top of a platform (can be walking)
class Standing(State):
    xspeed =  200 # The speed you'll eventually hit if you keep holding forward
    xfaccel = 400 # Acceleration (toward xspeed) if you hold forward and speed < xspeed
    xfdecel = 200 # Deceleration (toward xspeed) if you hold forward and speed > xspeed
    xdecel =  400 # Deceleration (toward 0) if you don't hold anything
    xbdecel = 800 # Deceleration (toward 0) if you hold backward
    @classmethod
    def think(cls, sprite, dt):
        cls.xmotion(sprite, dt)
        if not sprite.parent.holds(sprite):
            sprite.nextstate = Falling
        elif keytracker.pressed[K_UP]:
            xmove = keytracker.keys[K_RIGHT] - keytracker.keys[K_LEFT]
            if xmove == 1 and keytracker.keydt(K_LEFT) < 0.25:
                sprite.nextstate = FlipLeaping
            elif xmove == -1 and keytracker.keydt(K_RIGHT) < 0.25:
                sprite.nextstate = FlipLeaping
            else:
                sprite.nextstate = Leaping
        elif keytracker.pressed[K_RIGHT]:
            if keytracker.prevpressdt(K_RIGHT) < 0.4 <= keytracker.pressdt(K_LEFT):
                sprite.nextstate = Sprinting
        elif keytracker.pressed[K_LEFT]:
            if keytracker.prevpressdt(K_LEFT) < 0.4 <= keytracker.pressdt(K_RIGHT):
                sprite.nextstate = Sprinting

    @classmethod
    def orientation(cls, sprite):
        k = 1 if sprite.facingright else -1
        def norm(x, y):
            d = sqrt(x ** 2 + y **2)
            return x/d, y/d
        dx, dy = norm(sprite.parent.dx, sprite.parent.dy)
        v = sqrt(abs(sprite.vx)) * 0.04 * k
        dx2, dy2 = norm(-dy + v, dx + 2)
        return (dx*k, dy*k), (dx2, dy2)


class Ground(Entity):
    x = y = 0
    dx, dy = 1, 0
    color = 0, 64, 0
    spritestate = Standing
    def __init__(self):
        Entity.__init__(self)
    def draw(self):
        x, y = camera.screenpos(self.worldpos())
        if y > camera.sy: return
        rect = Rect(0, y, camera.sx, camera.sy)
        screen.fill(self.color, rect)
    def constrain(self, sprite):
        sprite.y = 0
        sprite.vy = 0
    def catches(self, sprite):
        sx, sy = sprite.worldpos()
        return sy < self.y and self.y <= sprite.lastpos[1]
    def restrict(self, sprite):
        pass
    def catchpriority(self, sprite):
        return 10, self.y

class Platform(Entity):
    color = 255, 255, 255
    spritestate = Standing
    def __init__(self, (x0, y0), (x1, y1)):
        Entity.__init__(self)
        self.x, self.y = x0, y0
        self.x1, self.y1 = x1, y1
        self.dx, self.dy = self.x1 - self.x, self.y1 - self.y
        assert self.dx > 0
    def think(self, dt):
        self.lastpos = self.worldpos()
        Entity.think(self, dt)
    def draw(self):
        x0, y0 = self.worldpos()
        x1, y1 = x0 + self.dx, y0 + self.dy
        draw.line(screen, self.color, camera.screenpos((x0, y0)), camera.screenpos((x1, y1)), 3)
    def catches(self, sprite):
        sx0, sy0 = sprite.worldpos()
        x0, y0 = self.worldpos()
        isabove = self.dx * (sy0 - y0) - self.dy * (sx0 - x0) > 0
        if isabove: return False
        sx1, sy1 = sprite.lastpos
        x1, y1 = self.lastpos
        wasabove = self.dx * (sy1 - y1) - self.dy * (sx1 - x1) > 0
        if not wasabove: return False
        return x0 <= sx0 < x0 + self.dx
    def holds(self, sprite):
        return 0 <= sprite.x <= self.dx
    def constrain(self, sprite):
        sprite.y = sprite.x * self.dy / self.dx
        sprite.vy = sprite.vx * self.dy / self.dx
    def restrict(self, sprite):
        pass
    def catchpriority(self, sprite):
        x, y = sprite.worldpos()
        x0, y0 = self.worldpos()
        return 10, y0 + (x - x0) * self.dy / self.dx

class Clinging(State):
    dropvx = 10
    launchvx = 240
    dropx = 1
    dropvy = -140  # Downward speed before you drop
    gravity = 400  # Slipping gravity if you're not holding anything
    rgravity = 400 # Slipping gravity if you're holding up
    @classmethod
    def think(cls, sprite, dt):
        if keytracker.keys[K_UP]:
            sprite.vy -= cls.rgravity * dt
        else:  # holding up
            sprite.vy -= cls.gravity * dt
        sprite.facingright = not sprite.parent.facingright
        sprite.y += sprite.vy * dt
        rkey = K_LEFT if sprite.parent.facingright else K_RIGHT
        if keytracker.keys[rkey]:
            sprite.nextstate = ClingFalling
        elif keytracker.keys[K_DOWN]:
            sprite.nextstate = Falling
        elif sprite.vy < cls.dropvy:
            sprite.nextstate = Falling
        elif keytracker.pressed[K_UP]:
            sprite.nextstate = Leaping

    @classmethod
    def exit(cls, sprite):
        k = 1 if sprite.facingright else -1
        sprite.vx = cls.dropvx * k
        sprite.x += cls.dropx * k
        if keytracker.pressed[K_UP]:
            sprite.vx = cls.launchvx * k


class Wall(Entity):
    color = 0, 128, 255
    spritestate = Clinging
    def __init__(self, (x0, y0), (x1, y1)):
        Entity.__init__(self)
        self.x, self.y = x0, y0
        self.x1, self.y1 = x1, y1
        self.dx, self.dy = self.x1 - self.x, self.y1 - self.y
        self.facingright = self.dy > 0
        self.color = (0, 128, 255) if self.facingright else (0, 255, 128)
    def think(self, dt):
        self.lastpos = self.worldpos()
        Entity.think(self, dt)
    def draw(self):
        x0, y0 = self.worldpos()
        x1, y1 = x0 + self.dx, y0 + self.dy
        draw.line(screen, self.color, camera.screenpos((x0, y0)), camera.screenpos((x1, y1)), 3)
    def catches(self, sprite):
        if sprite.vy < self.spritestate.dropvy: return False
        sx0, sy0 = sprite.worldpos()
        x0, y0 = self.worldpos()
        isabove = self.dx * (sy0 - y0) - self.dy * (sx0 - x0) > 0
        if isabove: return False
        sx1, sy1 = sprite.lastpos
        x1, y1 = self.lastpos
        wasabove = self.dx * (sy1 - y1) - self.dy * (sx1 - x1) > 0
        if not wasabove: return False
        return y0 <= sy0 < y0 + self.dy or y0 > sy0 >= y0 + self.dy
    def holds(self, sprite):
        return 0 <= sprite.y <= self.dy
    def constrain(self, sprite):
        sprite.x = sprite.y * self.dx / self.dy
        sprite.vx = sprite.vy * self.dx / self.dy
    def restrict(self, sprite):
        sx0, sy0 = sprite.worldpos()
        x0, y0 = self.worldpos()
        isabove = self.dx * (sy0 - y0) - self.dy * (sx0 - x0) > 0
        if isabove: return
        sx1, sy1 = sprite.lastpos
        x1, y1 = self.lastpos
        wasabove = self.dx * (sy1 - y1) - self.dy * (sx1 - x1) > 0
        if not wasabove: return
        if y0 <= sy0 < y0 + self.dy:
            sprite.vx = 0
            xmax = x0 + (sy0 - y0) * self.dx / self.dy - 0.1
            if xmax < sx0: sprite.x -= sx0 - xmax
        elif y0 > sy0 >= y0 + self.dy:
            sprite.vx = 0
            xmin = x0 + (sy0 - y0) * self.dx / self.dy + 0.1
            if sx0 < xmin: sprite.x += xmin - sx0
    def catchpriority(self, sprite):
        x, y = sprite.worldpos()
        x0, y0 = self.worldpos()
        xa = x0 + (x - y0) * self.dx / self.dy
        return 5, xa

# Under the influence of gravity (may still be going up)
class Falling(State):
    gravity = 800  # gravity with no resistance
    rgravity = 400 # gravity with resistance (holding the UP key)
    xspeed =  240
    xfaccel = 300
    xfdecel = 200
    xdecel =  200
    xbdecel = 400
    @classmethod
    def enter(cls, sprite):
        sprite.attachto()

    @classmethod
    def think(cls, sprite, dt):
        sprite.y += sprite.vy * dt
        g = cls.rgravity if keytracker.keys[K_UP] else cls.gravity
        sprite.vy -= g * dt

        cls.xmotion(sprite, dt)

    @classmethod
    def checkcatch(cls, sprite, platforms):
        for platform in platforms:
            if platform.catches(sprite):
                sprite.attachto(platform)


    @classmethod
    def orientation(cls, sprite):
        k = 1 if sprite.facingright else -1
        h = 1 + min(max(sprite.vy, -100), 200) * 0.001
        def norm(x, y):
            d = sqrt(x ** 2 + y **2)
            return x/d, y/d
        theta = 0.25 * sin(2 * atan2(sprite.vy, sprite.vx))
        S, C = sin(theta), cos(theta)
        return (C*k, -S*k), (S*h, C*h)

# If you come off a wall cling, we give you a small amount of time to
#   decide to jump
class ClingFalling(Falling):
    dt = 0.1
    @classmethod
    def enter(cls, sprite):
        Falling.enter(sprite)
        sprite.transitiontimer = 0

    @classmethod
    def think(cls, sprite, dt):
        sprite.transitiontimer += dt
        Falling.think(sprite, dt)
        if keytracker.keys[K_UP]:
            sprite.nextstate = Leaping
        elif sprite.transitiontimer >= cls.dt:
            sprite.nextstate = Falling


# Actively accelerating upward
class Leaping(State):
    yspeed = 200
    yaccel = 2000
    xspeed =  240
    xfaccel = 600
    xfdecel = 200
    xdecel =  200
    xbdecel = 800
    nextstate = Falling
    
    @classmethod
    def enter(cls, sprite):
        sprite.attachto()

    @classmethod
    def think(cls, sprite, dt):
        sprite.vy += cls.yaccel * dt
        sprite.y += sprite.vy * dt
        if sprite.vy > cls.yspeed:
            sprite.vy = cls.yspeed
            sprite.nextstate = cls.nextstate
        elif not keytracker.keys[K_UP]:
            sprite.nextstate = cls.nextstate
        cls.xmotion(sprite, dt)

# Special move where you sprint as long as you hold down the key
class Sprinting(Standing):
    xspeed =  500
    xfaccel = 1500
    xfdecel = 1500
    xdecel =  400
    xbdecel = 800
    dt = 0.5

    @classmethod
    def enter(cls, sprite):
        sprite.transitiontimer = 0

    @classmethod
    def think(cls, sprite, dt):
        sprite.transitiontimer += dt
        cls.xmotion(sprite, dt)
        xmove = keytracker.keys[K_RIGHT] - keytracker.keys[K_LEFT]
        if not sprite.parent.holds(sprite):
            sprite.nextstate = Falling
        elif keytracker.pressed[K_UP]:
            sprite.nextstate = Leaping
        elif xmove * sprite.vx <= 0 or sprite.transitiontimer >= cls.dt:
            sprite.nextstate = Standing


class Flipping(Falling):
    xspeed =  120
    xfaccel = 200
    xfdecel = 200
    xdecel =  200
    xbdecel = 400
    @classmethod
    def think(cls, sprite, dt):
        sprite.y += sprite.vy * dt
        g = cls.rgravity if keytracker.keys[K_UP] else cls.gravity
        sprite.vy -= g * dt
        if sprite.vy < 0:
            sprite.nextstate = Falling
#        cls.xmotion(sprite, dt)
        sprite.vx = (1 if sprite.facingright else -1) * cls.xspeed
        sprite.x += sprite.vx * dt

    @classmethod
    def draw(cls, sprite):
        x0, y0 = sprite.worldpos()
        k = 1 if sprite.facingright else -1
        theta = -2 * pi * sprite.vy / FlipLeaping.yspeed * k
        S, C = sin(theta), cos(theta)
        def f(a,b):
            b -= 15
            a, b = a*C + b*S, -a*S + b*C
            b += 15
            return x0 + a, y0 + b
        pos0 = camera.screenpos(f(0, 0))
        pos1 = camera.screenpos(f(15*k, 0))
        pos2 = camera.screenpos(f(0, 30))
        draw.line(screen, (255, 0, 0), pos0, pos1, 1)
        draw.line(screen, (255, 0, 0), pos0, pos2, 1)
        draw.circle(screen, (255, 128, 0), pos0, 3, 1)

class FlipLeaping(Leaping):
    yspeed = 240
    yaccel = 2000
    xspeed =  120
    xfaccel = 0
    xfdecel = 0
    xdecel =  0
    xbdecel = 0
    nextstate = Flipping
    @classmethod
    def enter(cls, sprite):
        Leaping.enter(sprite)
        sprite.vx = (1 if sprite.facingright else -1) * cls.xspeed


class You(Entity):
    x = y = 0
    color = 255, 128, 0
    facingright = True
    def __init__(self, (x, y)):
        Entity.__init__(self)
        self.x, self.y = x, y
        self.state = Falling
        self.nextstate = None
    def draw(self):
        Entity.draw(self)
        self.state.draw(self)
    def think(self, dt):
        self.lastpos = self.worldpos()
        Entity.think(self, dt)
        self.state.think(self, dt)
        if self.parent: self.parent.constrain(self)
    def lookat(self):
        return self.state.lookat(self)
    def checkcatch(self, platforms):
#        return self.state.checkcatch(self, platforms)
        catchers = [platform for platform in platforms if platform.catches(self)]
        if not catchers: return
        if self.parent not in catchers: catchers.append(self.parent)
        catcher = max(catchers, key = lambda p: p.catchpriority(self))
        print [(p, p.catchpriority(self)) for p in catchers]
        if catcher is not self.parent:
            self.attachto(catcher)
    def orientation(self):
        return self.state.orientation(self)
    def attachto(self, parent = entities):
        Entity.attachto(self, parent)
        parent.constrain(self)
        if parent.spritestate:
            self.nextstate = parent.spritestate
    def transition(self):
        if not self.nextstate: return
        self.state.exit(self)
        self.state = self.nextstate
        self.state.enter(self)
        self.nextstate = None

# A singleton to keep track of the camera
class camera:
    x = y = 0
    targetx, targety = x, y
    sx, sy = settings.screensize
    stars = [(randint(0, 10000), randint(0, 10000), randint(64, 196)) for _ in range(settings.nstars)]

    @classmethod
    def lookat(cls, wpos):
        cls.targetx, cls.targety = wpos
    @classmethod
    def think(cls, dt):
        f = 1 - exp(-settings.panspeed * dt)
        cls.x += f * (cls.targetx - cls.x)
        cls.y += f * (cls.targety - cls.y)
    @classmethod
    def screenpos(cls, (x, y)):
        return int(cls.sx/2 - cls.x + x), int(cls.sy/2 + cls.y - y)
    @classmethod
    def draw(cls):
        screen.fill((0,0,32))
        for x, y, c in cls.stars:
            f = 0.5
            px, py = int((x - cls.x * f) % cls.sx), int((y + cls.y * f) % cls.sy)
            screen.set_at((px, py), (c, c, c))

screen = display.set_mode(settings.screensize, HWSURFACE)
font.init()

# A singleton to keep track of which keys are/were pressed
class keytracker:
    keys = None      # keys that are currently held down
    lastkeys = None  # keys that were held down the previous frame
    pressed = None   # keys that are newly held down this frame
    lastt = None     # The last time that the given key was held down
    lastpress = None # The last time that the given key was pressed
    prevpress = None # The next-to-last time that the given key was pressed
    t = 0
    @classmethod
    def think(cls, dt):
        cls.t += dt
        cls.lastkeys = cls.keys
        cls.keys = key.get_pressed()
        if not cls.lastkeys:
            cls.lastkeys = cls.keys
            cls.pressed = [False] * len(cls.keys)
            cls.lastpress = [-1000] * len(cls.keys)
            cls.prevpress = [-1000] * len(cls.keys)
            cls.lastt = [-1000] * len(cls.keys)
        for j, (k, lastk) in enumerate(zip(cls.keys, cls.lastkeys)):
            if k:
                cls.lastt[j] = cls.t
            cls.pressed[j] = k and not lastk
            if k and not lastk:
                cls.prevpress[j] = cls.lastpress[j]
                cls.lastpress[j] = cls.t
    # Time since the key was last held
    @classmethod
    def keydt(cls, key):
        return cls.t - cls.lastt[key]
    # Time since the key was last pressed
    @classmethod
    def pressdt(cls, key):
        return cls.t - cls.lastpress[key]
    # Time since the key was previously pressed
    @classmethod
    def prevpressdt(cls, key):
        return cls.t - cls.prevpress[key]
        if keytracker.keys[K_LEFT] or keytracker.keys[K_DOWN]:
            sprite.nextstate = Falling

# singleton for drawing stats
class HUD:
    font = None
    cache = {}
    @classmethod
    def draw(cls, dt):
        if not cls.font:
            cls.font = font.Font(None, 23)
        lines = []
        lines.append("state: %s" % you.state.__name__)
        lines.append("attached to: %s" % (you.parent.__class__.__name__ if you.parent is not entities else None))
        lines.append("%.1ffps" % clock.get_fps())
        for jline, line in enumerate(reversed(lines)):
            if line not in cls.cache:
                cls.cache[line] = cls.font.render(line, True, (255, 255, 255))
            rect = cls.cache[line].get_rect()
            rect.bottomleft = 4, camera.sy - 4 - 24 * jline
            screen.blit(cls.cache[line], rect)

you = You((0, 100))
ground = Ground()

platforms = [Platform((100, 20), (200, 60)), Platform((240, 80), (500, 80)), ground]
ps = [(-600, 100), (-400, 100), (-200, 50), (-50, 50)]
for j in (0,1,2):
    platforms.append(Platform(ps[j], ps[j+1]))
platforms.append(Platform((-700, 40), (-500, -10)))
platforms.append(Wall((440, 20), (540, 800)))
platforms.append(Wall((480, 20), (480, 800)))
platforms.append(Wall((360, 800), (320, 140)))

platforms.append(Wall((550, -10), (550, 80)))
platforms.append(Platform((550, 80), (770, 130)))
platforms.append(Wall((770, 130), (770, -10)))

keytracker.think(0)
slomo = False
clock = time.Clock()
while not keytracker.keys[K_ESCAPE]:
    dt = clock.tick(60) * 0.001
    dt = 0.016
    event.pump()
    keytracker.think(dt)

#    arrows = ("up", K_UP), ("left", K_LEFT), ("right", K_RIGHT), ("down", K_DOWN)
#    print dt, you.state.__name__, int(you.vx), int(you.vy), " ".join(k for k,v in arrows if keytracker.keys[v])


    if keytracker.pressed[K_CAPSLOCK]:
        slomo = not slomo
    if slomo or keytracker.keys[K_LSHIFT] or keytracker.keys[K_RSHIFT]:
        dt /= 3
    

    entities.think(dt)
    camera.lookat(you.lookat())
    camera.think(dt)
    you.checkcatch(platforms)
    you.transition()
    for platform in platforms:
        platform.restrict(you)


    camera.draw()
    entities.draw()
    you.draw()
    HUD.draw(dt)
    display.flip()


