
// https://github.com/Recoskie/core/blob/master/x86/dis-x86.js

function decode(e)
{
    // si aspetta una stringona esa tipo 1237AD577FE... 
    // quindi leviamo il resto
    const hex = e.replace(/\n|\r| /g,"")
    core.bitMode=0; // 16 bit realmode
    if (core.loadBinCode(hex)) return core.disassemble()
    return "errore"    
}


