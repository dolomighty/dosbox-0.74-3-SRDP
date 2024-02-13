
# dosbox-0.74-3-SRDP

SRDP (wip name) stands for simple remote debug protocol
a lightweight protocol to remotely control dosbox debugger

why not gdb rsp if there's a patch wich implements it? too complex, imo
and my main reverse engineering tool IDA do not work properly with the current implementation, it hangs too often.
maybe one day I'll try to fix those issues, but now it's not that day.

so I prefer to reinvent the wheel by implementing a custom, simpler alternative:
a REST-like tcp/ascii server listening for commands

two protocols are available, plaintext and http
an autodetect mechanism selects one or the other, depending on the client request
with http, web/js control is easily implemented (see the accompanying barebone webapp)

plaintext makes very easy to control the debugger from IDA+python and other tools

