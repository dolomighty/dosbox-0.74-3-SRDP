
function SRDP( verb_and_args, on_success=alert, on_fail=alert ){
    ASSERT(typeof verb_and_args == "object")
    const xhr = new XMLHttpRequest()
    const port = $("port").value
    const target = encodeURIComponent(verb_and_args.join(" "))
    xhr.open("GET","http://localhost:"+port+"/"+target)
    xhr.onreadystatechange = function(){
        if(xhr.readyState!=4)return
        if(xhr.status!=200)return on_fail("status: "+xhr.status+"\nresponse: "+xhr.response)
        if(!on_success)return
        on_success( xhr.responseText )
    }
    xhr.send()
}

