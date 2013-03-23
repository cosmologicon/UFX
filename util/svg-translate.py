# Translate an SVG file from Inkscape into commands for UFX.draw

# This does not come anywhere close to covering all the things Inkscape can generate for SVGs,
# it's just the minimum that I needed for my work. If you've got an SVG that this doesn't handle,
# send it to me and I'll try to implement whatever features are needed.

import sys, re
import xml.etree.ElementTree as et

svg = et.parse(sys.argv[1]).getroot()
# Remove everything within curly brackets that Inkscape likes to add
base = lambda s: re.sub(r'\{[^)]*\}', '', s)
# Precision I want for floating-point values
f = lambda x: "%.2f" % float(x)
# Yeah sometimes I use a flipped y axis. Confusing but you don't have to do it my way.
# yf = lambda y: y
yf = lambda y: sy - y

sx = float(svg.attrib["width"])
sy = float(svg.attrib["height"])

lingrads = {}
radgrads = {}
paths = []
for child in svg:
	tagname = base(child.tag)
	if tagname == "defs":
		for d in child:
			dtagname = base(d.tag)
			if dtagname == "linearGradient":
				lingrads[d.attrib["id"]] = d
			elif dtagname == "radialGradient":
				radgrads[d.attrib["id"]] = d
			else:
				raise ValueError("Unknown def: %s" % dtagname)
	elif tagname == "g":
		for d in child:
			dtagname = base(d.tag)
			if dtagname == "path":
				paths.append(d)
			else:
				raise ValueError("Unknown group component: %s" % dtagname)
	else:
		print "Skipping top-level element: %s" % tagname

def addalpha(color, alpha):
	if len(color) != 7 or color[0] != "#":
		raise ValueError("Unrecognized color: %s" % color)
	r, g, b = [int(color[j:j+2], 16) for j in (1,3,5)]
	return "rgba(%d,%d,%d,%s)" % (r,g,b,alpha)

def parsestyle(s):
	rs = dict(rule.split(":") for rule in s.split(";"))
	if "fill-opacity" in rs:
		if rs["fill-opacity"] != "1":
			rs["fill"] = addalpha(rs["fill"], rs["fill-opacity"])
		del rs["fill-opacity"]
	if "stroke-opacity" in rs:
		if rs["stroke-opacity"] != "1":
			rs["stroke"] = addalpha(rs["stroke"], rs["stroke-opacity"])
		del rs["stroke-opacity"]
	r, d = [], []
	if "fill" in rs:
		if rs["fill"] != "none":
			d += ["fs", rs["fill"], "f"]
		del rs["fill"]
	if "stroke" in rs:
		if rs["stroke"] != "none":
			d += ["ss", rs["stroke"], "s"]
		del rs["stroke"]
	
	for name, value in rs.items():
		if name == "stroke-width":
			r += ["lw", f(value)]
		elif name == "opacity":
			r += ["alpha", f(value)]
		elif name in ["stroke-linecap", "stroke-linejoin", "stroke-miterlimit", "stroke-dasharray"]:
			pass
		else:
			raise ValueError("Unknown style name %s" % name)
	spec = map(str, r + d)
	spec = [lgspec[s[5:-1]] if s.startswith("url(#linearGradient") else s for s in spec]
	return " ".join(spec)

def parsepath(s):
	words = s.replace(",", " ").split()
	tokens = []
	j = 0
	x = y = 0   # Last position (for getting relative positions)
	lastcom = None  # Last command (for repeated commands)
	ncoms = 0   # SVG spec says that movetos that aren't first are treated as linetos (why??)

	# Convert to absolute coordinates
	def toabs(args):
		args = map(float, args)
		if relative:
			args = [arg + [x, y][j%2] for j, arg in enumerate(args)]
		return args
		return [yf(arg) if j % 2 else arg for j, arg in enumerate(args)]

	while j < len(words):
		com = words[j]
		if com.upper() in "MCLAZ":
			j += 1
			lastcom = com
		else:
			com = lastcom
		ncoms += 1
		relative = com != com.upper()
		com = com.upper()
		if com == "M":
			tokens += ["m" if ncoms == 1 else "l"] + toabs(words[j:j+2])
			j += 2
			x, y = tokens[-2:]
			tokens[-1] = yf(tokens[-1])
		elif com == "L":
			tokens += ["l"] + toabs(words[j:j+2])
			j += 2
			x, y = tokens[-2:]
			tokens[-1] = yf(tokens[-1])
		elif com == "C":
			tokens += ["c"] + toabs(words[j:j+6])
			j += 6
			x, y = tokens[-2:]
			tokens[-5] = yf(tokens[-5])
			tokens[-3] = yf(tokens[-3])
			tokens[-1] = yf(tokens[-1])
		# Ugh, both SVG and canvas arc specifications are a PAIN.
		# Right now I only handle the special case of circles.
		elif com == "A":
			rx, ry = map(float, words[j:j+2])
			assert(rx == ry)
			assert(map(float, words[j+2:j+14]) == [0,1,1,-2*rx,0,rx,ry,0,1,1,2*rx,0])
			tokens += ["o", x-rx, y, rx]
			j += 14
			tokens[-2] = yf(tokens[-2])
		elif com == "Z":
			tokens.extend(")")
		else:
			raise ValueError("Unrecognized command %s" % com)
	tokens = [token if isinstance(token, str) else f(token) for token in tokens]
	return " ".join(tokens)

lgspec = {}
for lname, lingrad in lingrads.items():
	a = dict((base(k), v) for k, v in lingrad.attrib.items())
	if "x1" not in a:
		continue
	x1, y1 = float(a["x1"]), float(a["y1"])
	x2, y2 = float(a["x2"]), float(a["y2"])
	if "gradientTransform" in a:
		A,B,C,D,E,F = map(float, a["gradientTransform"][7:-1].split(","))
		x1,y1 = A*x1+C*y1+E, B*x1+D*y1+F
		x2,y2 = A*x2+C*y2+E, B*x2+D*y2+F
	y1, y2 = yf(y1), yf(y2)
	spec = ["lg"] + map(f, (x1,y1,x2,y2))
	lg = lingrads[a["href"][1:]]
	for child in lg:
		if base(child.tag) == "stop":
			a2 = child.attrib
			style = dict(s.split(":") for s in a2["style"].strip(";").split(";"))
			spec += [f(a2["offset"]), addalpha(style["stop-color"], style["stop-opacity"])]
	spec = "~".join(spec)
	lgspec[lname] = spec
	

for rname, radgrad in radgrads.items():
	a = dict((base(k), v) for k, v in radgrad.attrib.items())
	spec = map(f, [float(a["fx"]), yf(float(a["fy"])), 0,
	               float(a["cx"]), yf(float(a["cy"])), float(a["r"])])
	lg = lingrads[a["href"][1:]]
	for child in lg:
		if base(child.tag) == "stop":
			a2 = child.attrib
			style = dict(s.split(":") for s in a2["style"].strip(";").split(";"))
			spec += [f(a2["offset"]), addalpha(style["stop-color"], style["stop-opacity"])]
	spec = ",".join(spec)
	print "var %s = UFX.draw.radgrad(%s)" % (rname, spec)

for path in paths:
	style = parsestyle(path.attrib["style"])
	data = parsepath(path.attrib["d"])
	print '\t"( %s",' % data
	print '\t\t"%s",' % style

