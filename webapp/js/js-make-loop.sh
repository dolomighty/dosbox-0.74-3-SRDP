#!/bin/bash
$OUTERM && OUTERM=false exec xterm -geometry +0-0 -e $0
~/js-make/js-make.sh loop ../index.js 