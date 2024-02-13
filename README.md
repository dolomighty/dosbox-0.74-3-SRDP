
# dosbox-0.74-3-SRDP

SRDP (wip name) stands for simple remote debug protocol
a lightweight protocol to remotely control dosbox debugger

why not gdb rsp? too complex, imo

a tcp/ascii server is listening for commands, REST-like

two protocols are available, plaintext and http
an autodetect mechanism selects one or the other,
depending on the client request
with http, web/js control is easily implemented
see the accompanying barebone webapp

plaintext makes very easy to control the debugger form tools like IDA+python

