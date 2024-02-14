
EXTERN_FUNCTION( onload )(){
    $( "build" ).innerHTML = JS_BUILD

    $( "run" ).addEventListener( 'click' ,()=>{ SRDP([ "run" ], watch_start ) })

    $( "step"  ).addEventListener( 'click' ,()=>{ SRDP([ "step"  ], stop_regs_and_disasm ) })
    $( "trace" ).addEventListener( 'click' ,()=>{ SRDP([ "trace" ], stop_regs_and_disasm ) })
//    $( "break" ).addEventListener( 'click' ,()=>{ SRDP([ "break" ], stop_regs_and_disasm ) })

    $( "rd_mem"  ).addEventListener( 'click' ,()=>{ SRDP([ "read" , "mem" , 0x01A2 , 0x1000 ], on_success ) })

    $( "rd_regs" ).addEventListener( 'click' , stop_regs_and_disasm )

    GLOBAL(watch_exit)=true
}

function on_success( txt ){
    $("out").innerHTML = txt
}



function stop_regs_and_disasm(){
    watch_stop()
    regs_and_disasm()
}


