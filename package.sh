#!/bin/bash

#rm -rf node_modules
#npm install
rm -f SHA256SUMS
sha256sum *.js LICENSE > SHA256SUMS
find node_modules/ -type f -exec sha256sum {} \; >> SHA256SUMS
TARFILE=$(npm pack)
tar xf ${TARFILE}
cp -r devices node_modules ./package
tar cf ${TARFILE} package
rm -rf package
echo "Created ${TARFILE}"