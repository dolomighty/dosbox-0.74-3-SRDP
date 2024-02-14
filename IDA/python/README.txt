
testato con IDA5&6
copiare questa dir sotto ida*/python/
aggiungere questo snippet alla fine di init.py
in questo modo, all'avvio di ida verranno lanciati tutti gli scripts .py sotto user/ 

tested with IDA5&6
copy this dir under ida*/python/
append this snippet to init.py
this way, when ida starts all .py scripts under user/ will be launched

==========================================================================


import glob
userrc = idadir("python") + os.sep + "user/"
for path in glob.glob(userrc+"*.py"):
    if os.path.basename(path).startswith("-"):
        continue
    idaapi.IDAPython_ExecScript(path, globals())
