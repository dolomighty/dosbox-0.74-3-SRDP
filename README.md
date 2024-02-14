
# dosbox-0.74-3-SRDP

SRDP (wip name) stands for simple remote debug protocol,    
a lightweight protocol to remotely control dosbox debugger

why not GDB-RSP, when there's a patch which implements it? too unfriendly & complex, imo.    
also my main reverse engineering tool IDA do not work properly with the current implementation:    
it hangs too often, it have problems tracking code, etc.    
GDB support for x86 real mode is a bit lacking, to say the least.    
then there's ghidra: I'm not too familiar with it, but judging from the few tests I made,
it requires too much setup, and it also has the same hanging problem as IDA.    
maybe one day I'll try to fix those issues, but now it's not that day.

so I'd rather reinvent the wheel by implementing a custom, simpler alternative:      
a REST-like tcp/ascii server listening for commands

two protocols are available, plaintext and http.       
an autodetect mechanism selects one or the other, depending on the client request.      
with http, web/js control is easily implemented       
see the accompanying barebone webapp/      
plaintext makes very easy to control the debugger from IDA+python and other tools      
I've put some .py integrations scripts under IDA/

## compiling
usual automake steps:

`./autogen.sh`      
`./configure --enable-debug --enable-SRDP --program-suffix=-dbg`      
`make -j`      
`sudo make install`      

changing the exe name (with program-suffix) is a matter of taste:       
I do it to preserve the standard dosbox installation, you do you

tcp server listens on localhost port 1234       
one can use telnet or browser/curl/wget to access it, like this:

`$ curl -s http://localhost:1234/read%20registers`           
`> EAX 0000FF67 EBX 00000026 ECX 00005CC5 EDX 00000000 ESI 0000A33C EDI 00003E6F EBP 00000014 ESP 00000BFC EIP 0000D413`           
`DS 57DE ES 31A2 FS 0000 GS 0000 SS 21A2 CS 01A2`           
`CF 0 ZF 0 SF 0 OF 0 AF 0 PF 1 DF 0 IF 1 TF 0`           

`$ telnet localhost 1234`           
`>Trying 127.0.0.1...`           
`>Connected to localhost.`           
`>Escape character is '^]'.`           
`read regi`           
`>EAX 000000B5 EBX 00001800 ECX 000022CB EDX 00000012 ESI 00001800 EDI 00000000 EBP 00000000 ESP 00000BF4 EIP 00002CFA`           
`>DS 01A2 ES 0000 FS 0000 GS 0000 SS 21A2 CS 01A2`           
`>CF 0 ZF 1 SF 0 OF 0 AF 0 PF 1 DF 0 IF 1 TF 0`           
`>Connection closed by foreign host.`           

## supported actions:

TODO 2024-02-13 21:22:10: actions list       
:	:	:	        

all actions have synonyms and abbreviations        
not that useful, but I like it      
