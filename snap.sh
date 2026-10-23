#!/bin/sh
# usage: ./snap.sh <version> <commit>  -> frozen read-only copy in snap/<version>/ with own storage keys
set -e; v=$1; c=$2; d=snap/$v; rm -rf $d; mkdir -p $d
git archive $c $(for f in app.js catalog.js index.html style.css lib tex; do git cat-file -e $c:$f 2>/dev/null && echo $f; done) | tar -x -C $d
p=$(echo $v | tr -cd 'a-z0-9'); sed -i "s/gs_/snap${p}_/g" $d/app.js
