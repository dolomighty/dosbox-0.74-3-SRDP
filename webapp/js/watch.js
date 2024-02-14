

function watch_start(){
    GLOBAL(watch_exit) = false
    watch_run()
}

function watch_stop(){
    GLOBAL(watch_exit) = true
}

function watch_run(){
    if(GLOBAL(watch_exit))return
    regs_and_disasm()
    setTimeout(watch_run,200)
}


