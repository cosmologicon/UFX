This directory is for the scripts and information for the site where UFX is hosted.

I want to make a full scripted solution, but for now just copying it all manually is the way to go.

Make the remote directory writeable:
chmod a+x /var/www/UFX
mkdir /var/www/UFX/repo

To copy from local copy:
rsync -avz ./ night@night.xen.prgmr.com:/var/www/UFX/repo



Update copies
rm *.js
for fname in `ls repo/src` ; do cp repo/src/$fname UFX.${fname%.js}.orig.js ; done
cat UFX.*.orig.js > UFX.orig.js

At some point I want these minified instead of copied, but uglify just refuses to work.
for fname in UFX*.orig.js ; do cp $fname ${fname%.orig.js}.js ; done



Upload to remote server:
scp *.py night@night.xen.prgmr.com:/var/www/UFX



