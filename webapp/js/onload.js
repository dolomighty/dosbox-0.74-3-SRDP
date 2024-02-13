
EXTERN_FUNCTION( onload )(){
    $( "build" ).innerHTML = JS_BUILD

    $( "run" ).addEventListener( 'click' ,()=>{ SRDP([ "run" ], loop_start ) })

    $( "step"  ).addEventListener( 'click' ,()=>{ SRDP([ "step"  ], stop_regs_and_disasm ) })
    $( "trace" ).addEventListener( 'click' ,()=>{ SRDP([ "trace" ], stop_regs_and_disasm ) })
    $( "break" ).addEventListener( 'click' ,()=>{ SRDP([ "break" ], stop_regs_and_disasm ) })

    $( "rd_mem"  ).addEventListener( 'click' ,()=>{ SRDP([ "read" , "mem" , 0x01A2 , 0x1000 ], on_success ) })

    $( "rd_regs" ).addEventListener( 'click' , stop_regs_and_disasm )
}

function on_success( txt ){
    $("out").innerHTML = txt
}



function stop_regs_and_disasm(){
    loop_stop()
    regs_and_disasm()
}



let loop_exit = true

function loop_start(){
    loop_exit = false
    loop_run()
}

function loop_stop(){
    loop_exit = true
}

function loop_run(){
    if(loop_exit)return
    regs_and_disasm()
    setTimeout(loop_run,200)
}


