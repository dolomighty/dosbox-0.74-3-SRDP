
function regs_and_disasm( txt ){
    SRDP([ "read" , "reg" ], function( regs_txt ){
        // EAX 000001FF EBX 00002D8D ECX 000034A3 EDX 00000004 ESI 00001800 EDI 00000000 EBP 00000000 ESP 00000BFE EIP 0000E47C 
        // DS 01A2 ES 0000 FS 0000 GS 0000 SS 21A2 CS 01A2 
        // CF 0 ZF 0 SF 1 OF 0 AF 0 PF 1 DF 0 IF 1 TF 0 
        const m = regs_txt.replaceAll("\n","").split(" ")
        // [EAX] [000001FF] [EBX] [00002D8D] [ECX] [000034A3] [EDX] [00000004] [ESI] [00001800] [EDI] [00000000] [EBP] [00000000] [ESP] [00000BFE] [EIP] [0000E47C] [DS] [01A2] [ES] [0000] [FS] [0000] [GS] [0000] [SS] [21A2] [CS] [01A2] [CF] [0] [ZF] [0] [SF] [1] [OF] [0] [AF] [0] [PF] [1] [DF] [0] [IF] [1] [TF] [0]
        const regs = {}
        for( let i=0; i<m.length; i+=2 ){
            const r = m[i+0]
            if(r=="")continue
            const v = m[i+1]
//            LOG(r,v)
            regs[r]=parseInt("0x"+v)
        }
//        LOG(regs)
        const addr = regs["CS"]*16+regs["EIP"]
        core.setBasePosition(regs["CS"].toString(16)+":"+regs["EIP"].toString(16)); // li vuole in hex
        SRDP([ "read" , "mem", addr, 30 ], function(txt){
            on_success(regs_txt+"\n"+decode(txt))
        })
    })
}


