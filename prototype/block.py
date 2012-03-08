# Prototyping a procedural brick generator

import pygame, random

bx, by = 12, 12
scale = 40
bmax = 3

screen = pygame.display.set_mode((scale*bx, scale*by))
texture = pygame.Surface((bx, by))
shade = pygame.Surface((scale*bx, scale*by)).convert_alpha()
for x in range(bx*scale):
    for y in range(by*scale):
        shade.set_at((x, y), (random.randint(50, 70), random.randint(50, 70), random.randint(50, 70), random.randint(100, 200)))
bricks = {}

def grow(rect, direction, texture, empty = (0, 0, 0)):
    tx, ty = texture.get_size()
    if direction == 0:  # up
#        if rect.top <= 0: return None
        pixels = [(x, rect.top - 1) for x in range(rect.left, rect.right)]
        newrect = pygame.Rect(rect.left, rect.top - 1, rect.width, rect.height + 1)
    elif direction == 1: # right
#        if rect.right >= texture.get_width(): return None
        pixels = [(rect.right, y) for y in range(rect.top, rect.bottom)]
        newrect = pygame.Rect(rect.left, rect.top, rect.width + 1, rect.height)
    elif direction == 2: # down
#        if rect.bottom <= texture.get_height(): return None
        pixels = [(x, rect.bottom) for x in range(rect.left, rect.right)]
        newrect = pygame.Rect(rect.left, rect.top, rect.width, rect.height + 1)
    elif direction == 3: # left
#        if rect.left <= 0: return None
        pixels = [(rect.left - 1, y) for y in range(rect.top, rect.bottom)]
        newrect = pygame.Rect(rect.left - 1, rect.top, rect.width + 1, rect.height)
    if all(texture.get_at((x%tx, y%ty)) == empty for x, y in pixels):
        return newrect
    return None


while True:
    if any(event.type in (pygame.QUIT, pygame.KEYDOWN) for event in pygame.event.get()):
        break
    blanks = [(x, y) for x in range(bx) for y in range(by) if texture.get_at((x, y)) == (0, 0, 0)]
    if blanks:
        x, y = random.choice(blanks)
#    x, y = random.randint(0, bx-1), random.randint(0, by-1)
#    if texture.get_at((x, y)) == (0, 0, 0):
        color = random.randint(50, 60), random.randint(50, 60), random.randint(50, 60)
        if color not in bricks:
            bricks[color] = pygame.Rect(x, y, 1, 1)
            texture.fill(color, bricks[color])
#    if bricks:
#        color = random.choice(bricks.keys())
    for color in bricks:
        newrect = grow(bricks[color], random.randint(0,3), texture)
#        if newrect and abs(newrect.width - newrect.height) < 2:
        if newrect and newrect.width <= bmax and newrect.height <= bmax:
            while newrect.left < 0: newrect.move_ip(bx, 0)
            while newrect.top < 0: newrect.move_ip(0, by)
            bricks[color] = newrect
            for dx, dy in [(0,0), (-bx,0), (0,-by), (-bx,-by)]:
                texture.fill(color, newrect.move(dx, dy))

    screen.fill((128,128,128))
    for color, rect0 in bricks.items():
        for dx, dy in [(0,0), (-bx,0), (0,-by), (-bx,-by)]:
            rect = rect0.move(dx, dy)
            x0, y0, x1, y1 = rect.left * scale, rect.top * scale, rect.right * scale, rect.bottom * scale
            pygame.draw.polygon(screen, color,
                [(x0+1,y0+4), (x0+4,y0+1), (x1-4,y0+1), (x1-1, y0+4), (x1-1,y1-4), (x1-4,y1-1), (x0+4,y1-1), (x0+1,y1-4)])
#    screen.blit(pygame.transform.scale(texture, (scale*bx, scale*by)), (0, 0))
    screen.blit(shade, (0, 0))
    pygame.display.flip()


