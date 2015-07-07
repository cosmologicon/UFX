# Create a new cached file.

# Supported filenames:
#   UFX.js - latest version of all UFX modules
#   UFX.core.js - UFX core modules
#   UFX.modulename.js - just the UFX.modulename module
#   UFXabc.js - UFX modules with codes a, b, and c
#   *.v#.js - version # of *.js
#   *.orig.js - non-minified version of *.js

import config
import glob, os
from subprocess import Popen, PIPE

def build(outfile, version, modules=None, minify=False):
	subdir = os.path.join(config.srcdir, "v{}".format(version))
	if modules is None:
		srcfiles = glob.glob(os.path.join(subdir, "*.js"))
	else:
		srcfiles = [os.path.join(subdir, modulename + ".js") for modulename in modules]
	src = "\n".join(open(srcfile, "r").read() for srcfile in srcfiles)
	if minify:
		cmd = Popen(config.minifier, stdin=PIPE, stdout=PIPE)
		src, err = cmd.communicate(src)
		# Uglify seems to have a problem removing comments, so do this ad-hoc thing.
		lines = [line.split("//")[0].strip() for line in src.split("\n")]
		lines = filter(None, lines)
		src = "\n".join(lines)
		header = config.header.format(version=version)
		if modules is not None:
			header += config.mheader.format(modulelist = " ".join(modules))
		src = header + src
	else:
		src += "\n;"
	with open(outfile, "w") as out:
		out.write(src)

def get(filename):
	if not os.path.exists(filename):
		parts = filename.split(".")
		if len(parts) < 2 or not all(parts):
			raise ValueError("Invalid filename: " + filename)
		if parts[-1] != "js":
			raise ValueError("Filename must have .js extension: " + filename)
		parts.pop()
		if not parts[0].startswith("UFX"):
			raise ValueError("Filename must start with UFX: " + filename)
		minify = parts[-1] != "orig"
		if not minify:
			parts.pop()
		if len(parts[-1]) > 1 and parts[-1].startswith("v") and parts[-1][1:].isdigit():
			version = parts[-1][1:]
			if version not in config.versions:
				raise ValueError("Unrecognized version: " + version)
			version = int(version)
			parts.pop()
		else:
			version = config.maxversion
		if len(parts) > 2:
			raise ValueError("Invalid filename: " + filename)
		elif len(parts) == 2:
			if parts[0] != "UFX":
				raise ValueError("Invalid filename: " + filename)
			modules = [parts[1]]
		elif parts == ["UFX"]:
			modules = config.versions[str(version)]["modules"]
		else:
			clookup = dict((code, module) for module, code in config.codes.items())
			modules = []
			for code in parts[0][3:]:
				if code not in clookup:
					raise ValueError("Unrecognized module code: " + code)
				modules.append(clookup[code])
		if "core" in modules:
			modules.remove("core")
			modules += config.core
		if len(modules) > len(set(modules)):
			modules = sorted(set(modules), key=modules.index)
		for module in modules:
			if module not in config.versions[str(version)]["modules"]:
				raise ValueError("Unrecognized module {} in version {}".format(module, version))
		build(filename, version=version, modules=modules, minify=minify)
	return open(filename, "r").read()

if __name__ == "__main__":
	import sys
	print(get(sys.argv[1]))

