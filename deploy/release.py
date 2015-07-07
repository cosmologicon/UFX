# Call to release a new, permanent version of UFX.
# Downloads the source files from github.
# Invalidates cache entries for latest version.

#TODO: set user agent with username

import base64, datetime, glob, json, urllib.request, os
import config

# The parsed JSON response of a github API URL.
def getdata(url):
	response = urllib.request.urlopen(url)
	data = response.read().decode("utf-8")
	return json.loads(data)

# The decoded file contents of a github API URL.
def getcontents(url):
	data = getdata(url)
	if data["encoding"] != "base64":
		raise ValueError("Unrecognized encoding: %s" % (data["encoding"],))
	content = data["content"]
	return base64.b64decode(content.encode("ascii")).decode("utf-8")

# A list of (filename, API url) pairs for all files in the base directory.
def srcurls():
	url = "https://api.github.com/repos/{owner}/{repo}/contents/{srcdir}".format(
		owner = config.repoowner,
		repo = config.reponame,
		srcdir = config.reposrcdir
	)
	for srcfile in getdata(url):
		if srcfile["name"].endswith(".js"):
			yield srcfile["name"], srcfile["url"]

# Download all src files to the given directory.
def downloadsrc(targetdir):
	try:
		os.makedirs(targetdir)
	except OSError:
		pass
	for filename, url in srcurls():
		contents = getcontents(url)
		with open(os.path.join(targetdir, filename), "w") as targetfile:
			targetfile.write(contents)

def listmodules(srcdir):
	for filename in glob.glob(os.path.join(srcdir, "*.js")):
		yield os.path.basename(filename)[:-3]

if __name__ == "__main__":
	vnumber = config.nextversion()
	targetdir = os.path.join(config.srcdir, "v{}".format(vnumber))
	downloadsrc(targetdir)
	modules = list(listmodules(targetdir))
	date = datetime.date.today().strftime("%d %b %Y")
	config.addversion(modules=modules, date=date, number=vnumber)

