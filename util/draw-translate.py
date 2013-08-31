# Translate an SVG path specification into a UFX.draw string
import sys

pathstring = sys.stdin.read()
pathstring = pathstring.replace(",", " ")

# todo: characters next to words

words = pathstring.split()
tokens = []
j = 0
x = y = 0
lastcom = None

def makeabsolute(args):
    return [arg + [x, y][j%2] for j, arg in enumerate(args)] if relative else args


while j < len(words):
    com = words[j]
    if com.upper() in "MCL":
        j += 1
        lastcom = com
    else:
        com = lastcom
    relative = com != com.upper()
    com = com.upper()
    tokens.append(com)
    if com == "M":
        tokens.extend(makeabsolute([float(words[j]), float(words[j+1])]))
        j += 2
    elif com == "L":
        tokens.extend(makeabsolute([float(words[j]), float(words[j+1])]))
        j += 2
    elif com == "C":
        tokens.extend(makeabsolute([float(words[j+k]) for k in (0,1,2,3,4,5)]))
        j += 6
    x = tokens[-2]
    y = tokens[-1]


tokens = [token if isinstance(token, str) else "%.2f" % token for token in tokens]
print " ".join(tokens)

