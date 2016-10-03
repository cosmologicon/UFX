# Temporary solution until I can get minification working.

pushd /var/www/UFX
rm *.js
for fname in `ls repo/src` ; do cp repo/src/$fname UFX.${fname%.js}.orig.js ; done
cat UFX.*.orig.js > UFX.orig.js
for fname in UFX*.orig.js ; do cp $fname ${fname%.orig.js}.js ; done
popd
