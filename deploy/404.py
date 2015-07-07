import os
import cache

url = os.environ["REQUEST_URI"]
filename = url.split("/")[-1].split("?")[0].split("#")[0]

try:
	src = cache.get(filename)
	print("Content-type: application/javascript")
	print("")
	print(src)
except ValueError as e:
	print("Content-type: text/html")
	print("")
	print("<!DOCTYPE html>")
	print("<title>404</title><p>Unable to generate file: " + filename)
	
