import json, os.path

# Github repository owner
repoowner = "cosmologicon"
# Github repository name
reponame = "UFX"
# Name of source subdirectory in the repository
reposrcdir = "src"

# Local subdirectory where raw source files are stored
srcdir = "src"

# Header format string for minified source
header = "// UFX v{version} by Christopher Night. CC0. github.com/cosmologicon/UFX\n"
# Subheader for select modules
mheader = "// Modules included: {modulelist}\n"

# Minifier
minifier = "/usr/bin/uglifyjs"

# Core module list
core = "draw key mouse random resource scene ticker Thing".split()

# Module codes
codes = {
	"core": "c",
	"draw": "d",
	"key": "k",
	"maximize": "M",
	"mouse": "m",
	"noise": "n",
	"pause": "u",
	"playback": "P",
	"pointer": "p",
	"random": "r",
	"resource": "R",
	"scene": "s",
	"texture": "x",
	"Thing": "T",
	"ticker": "t",
	"touch": "h",
	"tracer": "A",
}

# Version data
versiondatafile = "versiondata.json"
if os.path.exists(versiondatafile):
	versions = json.load(open(versiondatafile, "r"))
else:
	versions = {}

maxversion = max(map(int, versions)) if versions else -1

def nextversion():
	return maxversion + 1

def addversion(modules, date, number, major=True):
	versions[number] = {
		"date": date,
		"modules": modules,
		"major": major,
	}
	json.dump(versions, open(versiondatafile, "w"))

