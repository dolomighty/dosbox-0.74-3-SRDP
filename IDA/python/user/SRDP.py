#!/usr/bin/env python
# -*- coding:utf-8 -*-

print("SRDP: init")

import socket
import sys
import re
from datetime import datetime







def to_regs_panel_ansi( txt ):
    now = datetime.now().strftime("%H:%M:%S")
    path = idadir("python")+os.sep+"user"+os.sep+"asdasd"
    with open(path,"w") as f:
        f.write("""
\033[2J
\033[01;32m"""+now+"""\033[00m
"""+txt+"\n")


def to_regs_panel_plain( txt ):
    path = idadir("python")+os.sep+"user"+os.sep+"asdasd"
    with open(path,"w") as f:
        f.write(txt)

"""
che poi si monitora con:

xterm -geometry -0-0 -e "tail -F ~/ida61/python/user/asdasd 2> /dev/null"


"""



def SRDP( req ):
    try:
        s = socket.socket()
        s.connect(("127.0.0.1",1234))
    except socket.error as errore:
        print("SRDP: can't connect to server")
        exit(1)

    s.send(req.encode())
    data = s.recv(4096)
    s.close()
    return str(data)


def jump_cs_eip_realmode( regs ):
    m = re.search(r"EIP (\w+)", regs, flags=re.DOTALL)
    if not m: return
    EIP = int(m.group(1),16)

    m = re.search(r"CS (\w+)", regs, flags=re.DOTALL)
    if not m: return
    CS  = int(m.group(1),16)

    Jump(CS*16+EIP)




prev_regs = None

def diff_regs( txt ):
    r = txt.replace("\n","").strip().split(" ")

    regs = {}
    for a,b in zip(*[iter(r)]*2):
        regs[a]=b

    del regs["EIP"] # cambia sempre, inutile mostrarlo

    global prev_regs
    pre  = set(prev_regs.items())
    post = set(regs.items())
    prev_regs = regs

    changes = post-pre

    out=[]
    for a in sorted(changes):
        out.append(a[0]+" "+a[1])

    out = " ".join(out).strip()
    if out != "": print(out)





def print_regs_output( txt ):

    # trovo cosa è cambiato e lo marco
    # c'è un baco/feature nella output window:
    # gli spazi a sinistra vengon trimmati
    # quindi per allineare il tutto è necessario
    # scriver qualcosa prima
    line1=["|"]
    line2=["|"]
    line3=["|"]
    line4=["|"]

    l1 = line1
    l2 = line2
    for reg in ordine:
        val = regs[reg]
        mark = "_" if val != prev_regs[reg] else " "

        txt = reg+" "+val

        if   reg == "AF": txt = "A"+val
        elif reg == "CF": txt = "C"+val
        elif reg == "DF": txt = "D"+val
        elif reg == "IF": txt = "I"+val
        elif reg == "OF": txt = "O"+val
        elif reg == "PF": txt = "P"+val
        elif reg == "SF": txt = "S"+val
        elif reg == "TF": txt = "T"+val
        elif reg == "ZF": txt = "Z"+val

        if reg == "DS":
            l1 = line3
            l2 = line4

        l1.append(mark*len(txt))
        l2.append(txt)

    prev_regs = regs

    print("\n"*10)
    print(" ".join(line1).strip())
    print(" ".join(line2).strip())
    print(" ".join(line3).strip())
    print(" ".join(line4).strip())
    print("")




def print_regs_external(regs,prev_regs,ordine):
    # un monitor esterno è parecchio più veloce dell'output panel
    # e pure stilabile ansi
    line1=[]
    line2=[]
    line3=[]
    line4=[]

    line = line1
    for reg in ordine:
        val = regs[reg]
        
        txt = reg+" "+val

        if val != prev_regs[reg]:
            txt = "\033[01;33m"+txt+"\033[00m"

        if   reg == "ESI" : line = line2
        elif reg == "DS"  : line = line3
        elif reg == "CF"  : line = line4

        line.append(txt)

    prev_regs = regs

    to_regs_panel_ansi(
        " ".join(line1).strip()+"\n"+
        " ".join(line2).strip()+"\n"+
        " ".join(line3).strip()+"\n"+
        " ".join(line4).strip()+"\n"+
        ""
    )









def print_regs( txt ):
    # porto tutto in un diz
    r = txt.replace("\n","").strip().split(" ")
    regs = {}
    ordine = []
    for reg,val in zip(*[iter(r)]*2):
        if   reg == "EIP": continue # cambia sempre, inutile mostrarlo
        regs[reg]=val
        ordine.append(reg)

    global prev_regs
    if prev_regs == None:
        prev_regs = regs

#    print(txt)
#    diff_txt(regs)
#    print_regs_output(regs)
    print_regs_external(regs,prev_regs,ordine)




def SRDP_step():
    SRDP("step") 
    regs = SRDP("read reg")
    print_regs(regs)
    jump_cs_eip_realmode(regs)


def SRDP_trace():
    SRDP("trace") 
    regs = SRDP("read reg")
    print_regs(regs)
    jump_cs_eip_realmode(regs)


def SRDP_rd_regs():
    regs = SRDP("read reg")
    print_regs(regs)


def SRDP_run():
    SRDP("run")


def SRDP_until():
    ea = ScreenEA()
#    cs = SegStart(ea) # ptr lineare (non segm nativo x86)
#    eip = ea-cs
#    print(hex(ea),">",hex(cs),":",hex(eip))
    SRDP("set break "+str(ea))
    SRDP("run")


#def SRDP_break():
#    SRDP("break")
#    regs = SRDP("read reg")
#    print_regs(regs)
#    jump_cs_eip_realmode(regs)


#def SRDP_set_bp():
#    ea = ScreenEA()
##    cs = SegStart(ea) # ptr lineare (non segm nativo x86)
##    eip = ea-cs
##    print(hex(ea),">",hex(cs),":",hex(eip))
#    SRDP("bp set "+hex(ea))



def SRDP_rd_mem():
    ea = ScreenEA()
#    cs = SegStart(ea) # ptr lineare (non segm nativo x86)
#    eip = ea-cs
#    print(hex(ea),">",hex(cs>>4),":",hex(eip))
    mem = SRDP("read mem "+str(ea)+" 16")
#    PatchByte(ea, value)
#    print(mem.replace("\n","").split(" "))

    for i,b in enumerate(mem.split(" ")[:-1]):
        b = int(b,16)
        PatchByte(ea+i, b)

    print("patched"+str(i+1)+"bytes @"+hex(ea))


def SRDP_download():
    print("downloading&patching...")
    mem = SRDP("read mem 0 0xA0000") # i classici 640K di mem realmode
    for ea,b in enumerate(mem.split(" ")[:-1]):
        b = int(b,16)
        PatchByte(ea,b)
    print("done")



def SRDP_help():
    print("""
Shift+T   trace
Shift+S   step
Shift+G   run
Shift+R   scarica 16 bytes @ cursor
Shift+U   stop @ cursor
altro:
SRDP_download()  scarica i 640K classici e li patcha nel db
""")



def bind( key, code ):
    idaapi.CompileLine('static py_'+code+'() { RunPythonStatement("'+code+'()"); }')
    AddHotkey(key, 'py_'+code)


bind( "Shift+T" , "SRDP_trace"  )
bind( "Shift+S" , "SRDP_step"   )
bind( "Shift+G" , "SRDP_run"    )
bind( "Shift+R" , "SRDP_rd_mem" )
bind( "Shift+U" , "SRDP_until"  )




#txt = """
#EAX 00000808 EBX 00005503 ECX 00000017 EDX 000003CF
#ESI 0000FFFF EDI 00000843 EBP 00000008 ESP 00000BDA EIP 00000D09 
#DS 01A2 ES A400 FS 0000 GS 0000 SS 21A2 CS 01A2 
#CF 0 ZF 0 SF 1 OF 0 AF 0 PF 1 DF 0 IF 1 TF 0 
#"""
##print(re.sub(r"([ACDIOPSTZ])F ","\\1",txt))
#print_regs( txt )







