/*
 *  Copyright (C) 2002-2010  The DOSBox Team
 *
 *  This program is free software; you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation; either version 2 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program; if not, write to the Free Software
 *  Foundation, Inc., 59 Temple Place - Suite 330, Boston, MA 02111-1307, USA.
 */


#include "dosbox.h"
#ifndef C_SRDP
// stub
void SRDP_init(){}
void SRDP_update(){}
#else



#undef NDEBUG
#include <assert.h>

#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <errno.h>
#include <string.h>
#include <fcntl.h>
#include <arpa/inet.h>
#include <assert.h>
#include <poll.h>
#include <pthread.h>

#include <string>
#include <algorithm> 
#include <cctype>
#include <locale>
#include <mutex>
#include <unordered_map>

#include "config.h"
#include "debug.h"
#include "logging.h"
#include "regs.h"
#include "paging.h"

#include "SRDP.h"



static int srdp_listen_socket = 0;

// la comunicazione è half duplex (request→response→bye)
// quindi è sufficente un solo buffer di interscambio
// ma serve una piccola FSM
#define STATE_IDLE           1
#define STATE_REQUEST_READY  2
#define STATE_RESPONSE_READY 3
static int FSM_state = STATE_IDLE;
// scrittura sotto mutex, lettura libera

static std::mutex  mutex;
static std::string xchange;


#define DONT_CARE true


static bool FSM_change( int s ){
    mutex.lock();
    FSM_state = s;
    mutex.unlock();
    return DONT_CARE;
}






// https://stackoverflow.com/questions/216823/how-to-trim-a-stdstring

// trim from start (in place)
static void ltrim(std::string &s) {
    s.erase(s.begin(), std::find_if(s.begin(), s.end(), [](unsigned char ch) {
        return !std::isspace(ch);
    }));
}

// trim from end (in place)
static void rtrim(std::string &s) {
    s.erase(std::find_if(s.rbegin(), s.rend(), [](unsigned char ch) {
        return !std::isspace(ch);
    }).base(), s.end());
}



static std::vector<std::string> split( const std::string& text, const std::string& seps ){
    // splitta text secondo i separatori seps
    // ritorna solo tokens != ""
    std::vector<std::string> tokens;
    for( size_t end = 0; end<text.length(); end++ ){
        size_t beg = end;
        end = text.find_first_of( seps, beg );
        if(end==std::string::npos) end=text.length(); // string end acts as a separator
        if(beg==end)continue; // empty tokens no tnx
        tokens.push_back( text.substr( beg, end-beg ));
    }
    return tokens;    
}


// https://stackoverflow.com/questions/154536/encode-decode-urls-in-c
std::string url_decode( const std::string &SRC ){
    // only works for ascii
    std::string ret;
    for (int i=0; i<SRC.length(); i++) {
        if (SRC[i]=='%') {
            int ii;
            sscanf(SRC.substr(i+1,2).c_str(), "%x", &ii);
            char ch=static_cast<char>(ii);
            ret+=ch;
            i=i+2;
        } else {
            ret+=SRC[i];
        }
    }
    return (ret);
}






// figlet TCP server
//     _____ ____ ____                                 
//    |_   _/ ___|  _ \   ___  ___ _ ____   _____ _ __ 
//      | || |   | |_) | / __|/ _ \ '__\ \ / / _ \ '__|
//      | || |___|  __/  \__ \  __/ |   \ V /  __/ |   
//      |_| \____|_|     |___/\___|_|    \_/ \___|_|   
//                                                     

static void *accept_loop( void *argpt ){
    // client handler supporting:
    // -plaintext 
    // -http (minimal, strictly for REST/ajax use)
    // via autodetect

    assert(srdp_listen_socket); // fatale

    while(1){
        FSM_change(STATE_IDLE);

        // aspettiamo che qualcuno chiami
        struct sockaddr_in cli_addr={0};
        socklen_t length = sizeof(cli_addr);
        int talk_socket;
        assert((talk_socket = accept(srdp_listen_socket, (struct sockaddr *)&cli_addr, &length))>=0);

        // sentiamo che vuole
        const ssize_t BUFSIZE = 1<<13;
        char buf[BUFSIZE+1];
        auto len = read( talk_socket, buf, BUFSIZE );
        if( len <= 0 ){
            fprintf(stderr,"SRDP: read failed\n");
            close( talk_socket );
            continue;
        }

        xchange = std::string(buf,len);

        // curl -s http://localhost:1234/break
        // GET /break HTTP/1.1
        // Host: localhost:1234
        // User-Agent: curl/7.81.0
        // Accept: */*

        // protocol autodetect:
        // se è una get procediamo con http, es.
        // GET /break HTTP/1.1 → HTTP 200 OK ...
        // altrimenti plaintext, es.
        // break → ""

        const std::string GET_SLASH("GET /");
        int a = xchange.find(GET_SLASH);
        // per esser http la GET deve incominciare in xchange[0]
        // se non è li, o non viene trovata → plain

#define PROTO_PLAIN 1
#define PROTO_HTTP  2
        int proto = (a!=0 ? PROTO_PLAIN : PROTO_HTTP);

        // xchange deve contenere verb+args, separati da spazi, es.
        // "rd mem 0x1A2 0x1000"
        if( proto == PROTO_PLAIN ){
            // qui arriva già nel formato riciesto
            xchange = std::string(buf,len);
            ltrim(xchange);
            rtrim(xchange);
        }else
        if( proto == PROTO_HTTP ){
            a += GET_SLASH.size();
            int b = xchange.find(" ",a);
            if(b==std::string::npos){
                fprintf(stderr,"SRDP: bad request\n");
                close( talk_socket );
                continue;
            }
            xchange = url_decode(xchange.substr(a,b-a));
        }else{
            fprintf(stderr,"SRDP: unknown protocol\n");
            close( talk_socket );
            continue;
        }

        // permettiamo al main thread di accedere alla request
        FSM_change(STATE_REQUEST_READY);

        // aspettiamo che il main thread completi la risposta
        // spinlock... son sicuro che esiste un metodo migliore
        // ma ora proprio non me lo ricordo
        while( FSM_state != STATE_RESPONSE_READY ) usleep(0.01*1E6);

        // mandiam la risposta al client
        if( proto == PROTO_PLAIN ){
            // niente da aggiungere/modificare per questo proto
        }else
        if( proto == PROTO_HTTP ){
            // https://stackoverflow.com/questions/4726515/what-http-response-headers-are-required
            std::string head = std::string(
                "HTTP/1.1 200 OK\n"
                "Server: DosBox SRDP\n"
                "Content-Length: ")+std::to_string(xchange.size())+std::string("\n"
                "Access-Control-Allow-Origin: *\n" // CORS !!
                "Connection: close\n"
                "Content-Type: text/plain\n"
                "\n");
            xchange = head+xchange;
        }

        -write( talk_socket, xchange.c_str(), xchange.size());

        // gently close
        shutdown( talk_socket, SHUT_RDWR );
        while(read(talk_socket, buf, BUFSIZE)>0) usleep(0.01*1E6);
        close( talk_socket );
    }
}







void SRDP_init(){
    srdp_listen_socket = socket( AF_INET, SOCK_STREAM, 0 );

#ifdef WIN32
    const char yes = 1;
#else
    const int  yes = 1;
#endif
    setsockopt( srdp_listen_socket, SOL_SOCKET, SO_REUSEADDR, &yes, sizeof(yes));

    // troviamo una porta libera
    int port = 0;
    for( int tries=0; tries<10; tries++ ){
        port = 1234+tries;
//        DEBUG_ShowMsg("SRDP: binding port %d\n",port);
        struct sockaddr_in serv_addr={0};
        serv_addr.sin_family = AF_INET;
        serv_addr.sin_addr.s_addr = htonl(INADDR_ANY);
        serv_addr.sin_port = htons(port);
        if(bind( srdp_listen_socket, (struct sockaddr *)&serv_addr, sizeof(serv_addr))<0){
//            DEBUG_ShowMsg("SRDP: bind failed, retry\n");
            port = 0;
            continue;
        }
        if(listen(srdp_listen_socket,5)==0) break;   // ok
    }

    if(!port){
        DEBUG_ShowMsg("SRDP: server start failed\n");
        close(srdp_listen_socket);
        srdp_listen_socket=0;
        return;
    }

    // porta trovata, server attivo
    DEBUG_ShowMsg("SRDP: tcp server listening on port %d\n",port);

    pthread_t th;
    pthread_create( &th, 0, accept_loop, 0 );
}












static std::string rd_regs(){
    char out[4096];
    sprintf(out,
        "EAX %08X "
        "EBX %08X "
        "ECX %08X "
        "EDX %08X "
        "ESI %08X "
        "EDI %08X "
        "EBP %08X "
        "ESP %08X "
        "EIP %08X "
        "\n"
        "DS %04X "
        "ES %04X "
        "FS %04X "
        "GS %04X "
        "SS %04X "
        "CS %04X "
        "\n"
        "CF %d "
        "ZF %d "
        "SF %d "
        "OF %d "
        "AF %d "
        "PF %d "
        "DF %d "
        "IF %d "
        "TF %d "
        "\n"

        ,reg_eax 
        ,reg_ebx 
        ,reg_ecx 
        ,reg_edx 
        ,reg_esi 
        ,reg_edi 
        ,reg_ebp
        ,reg_esp
        ,reg_eip

        ,SegValue(ds)
        ,SegValue(es)
        ,SegValue(fs)
        ,SegValue(gs)
        ,SegValue(ss)
        ,SegValue(cs)

        ,GETFLAG(CF)?1:0
        ,GETFLAG(ZF)?1:0
        ,GETFLAG(SF)?1:0
        ,GETFLAG(OF)?1:0
        ,GETFLAG(AF)?1:0
        ,GETFLAG(PF)?1:0
        ,GETFLAG(DF)?1:0
        ,GETFLAG(IF)?1:0
        ,GETFLAG(TF)?1:0
    );
    return std::string(out);
}




static int phys_from_CS_EIP( const int CS, const int EIP ){
    return CS*16+EIP;
}






static std::string rd_mem_hex( const int start, const int bytes ){
    std::string out;
    for (Bitu x = 0; x < bytes;x++) {
        Bit8u val;
//        if(mem_readb_checked(GetAddress(seg,ofs1+x),&val)) val=0;
//        if(mem_readb_checked(start+x,&val)) val=0;
        val = mem_readb(start+x);
        char hex[16]="12 ";
        snprintf(hex,sizeof(hex)-1,"%02X ",val);
        out += hex;
    }
    return out;
}


static std::string rd_mem( const std::string& _start, const std::string& _bytes ){
    // stoi ha base 10 di default. dando base 0 si innnesca l'autodetect di strtol
    auto start = std::stoi(_start,0,0);
    auto bytes = std::stoi(_bytes,0,0);
    return rd_mem_hex(start,bytes)+"\n";
}





// figlet breakpoints
//     _                    _                _       _       
//    | |__  _ __ ___  __ _| | ___ __   ___ (_)_ __ | |_ ___ 
//    | '_ \| '__/ _ \/ _` | |/ / '_ \ / _ \| | '_ \| __/ __|
//    | |_) | | |  __/ (_| |   <| |_) | (_) | | | | | |_\__ \
//    |_.__/|_|  \___|\__,_|_|\_\ .__/ \___/|_|_| |_|\__|___/
//                              |_|                          


void DEBUG_set_breakpoint( PhysPt addr ); // debug.cpp

static std::string breakpoint_set( const std::string& _addr ){
    // std::stoi ha base 10 di default, e sotto chiama strtol
    // dando base 0 si innesca l'autodetect di strtol, che interpreta anche ottale/esa
    auto addr = std::stoi(_addr,0,0);
    DEBUG_set_breakpoint(addr);
//    DEBUG_ShowMsg("=== addr %x\n",addr);
    return "";
}

static std::string breakpoint_show(){
    return "";
}

void DEBUG_breakpoint_clear_all(); // debug.cpp

static std::string breakpoint_clear_all(){
    DEBUG_breakpoint_clear_all();
    return "";
}





// figlet coverage
//      ___ _____   _____ _ __ __ _  __ _  ___ 
//     / __/ _ \ \ / / _ \ '__/ _` |/ _` |/ _ \
//    | (_| (_) \ V /  __/ | | (_| | (_| |  __/
//     \___\___/ \_/ \___|_|  \__,_|\__, |\___|
//                                  |___/      


// uso unordered_ perche è O(1)
// se il client ha bisogno di CS:IP in ordine beh... che se li ordini
static std::unordered_map<std::string,std::string> coverage;

static std::string coverage_clear(){
    coverage.clear();
    return "";
}

static std::string coverage_read(){
    std::string ret = "";
    for( auto [CS_EIP,bytes]: coverage ){
        ret += CS_EIP+" "+bytes+"\n";
    }
    return ret;
}


// 2024-02-07 13:00:35
// la baseline del carico cpu @ 3000 cps ≈ 30%
// il solo update della coverage (solo cs:eip) lo porta a 60%
// non va bene, devo ripensare la coverage con un algo più leggero
// sicuramente se la implemento, la lascio spenta di default
// e se proprio serve uno se la accende
// quindi oltre al clear/show coverage serve un enable/disable
// intanto metto il comando in hash

static bool coverage_enabled = false;

static void coverage_update(){
    if(!coverage_enabled)return;

    const auto phys = phys_from_CS_EIP(SegValue(cs),reg_eip);

    // magari non serve ma... non mi è totalmente chiaro
    // come i vari cores interagiscano tra di loro (e lo fanno)
    // quindi semplicemente mettendo una chiamata a SRDP_update() nei vari loops
    // è sicuro (mio malgrado) che verrà chiamata anche
    // più di una volta per istruzione:
    // preferirei di no, quindi metto una guardia su cs:eip
    // 2024-02-07 12:47:04
    // si serve, abbassa il carico cpu
    // probabilmente devo cercare di limitare il + possibile chiamate a questa fn
    // il che vuol dire, devo entrare più nei meandri di dosbox
    static int prev_phys = -1;
    if( prev_phys == phys )return;
    prev_phys = phys;

    // cs:ip + bytes per coverage
    char key[256];
    sprintf(key,"%04X:%08X",SegValue(cs),reg_eip);

//    // salvo n bytes per il disasm offline
//    // abbastanza per 1 istruzione
//    coverage[key]=rd_mem_hex(phys,8);

    // 2024-02-07 12:48:15
    // la fn rd_mem_hex provoca un grande carico
    // da 60% a 95% in top a 3000 cicli/sec
    // il set della coverage da solo è abbastanza leggero invece
    // forse è il caso di limitare la coverage al solo recupero dei cs:eip
    // piuttosto che fare anche il recupero della mem
    coverage[key]="";
}









// figlet azioni
//               _             _ 
//      __ _ ___(_) ___  _ __ (_)
//     / _` |_  / |/ _ \| '_ \| |
//    | (_| |/ /| | (_) | | | | |
//     \__,_/___|_|\___/|_| |_|_|
//                               




enum SUBJ_ENUM {
    SUBJ_NONE=0,
    SUBJ_BREAKPOINTS,
    SUBJ_COVERAGE,
    SUBJ_MEMORY,
    SUBJ_REGISTERS,
};



// helpers
#define ARGC (argv.size()-1)


// debug.cpp
void DEBUG_TraceInto(); 
void DEBUG_StepOver();
void DEBUG_run();


static std::string action_break( const SUBJ_ENUM subj, const std::vector<std::string>& argv ){
    DEBUG_EnableDebugger();
    return "";
}



static std::string action_trace( const SUBJ_ENUM subj, const std::vector<std::string>& argv ){
    DEBUG_EnableDebugger();
    DEBUG_TraceInto();
    return "";
}



static std::string action_step( const SUBJ_ENUM subj, const std::vector<std::string>& argv ){
    DEBUG_EnableDebugger();
    DEBUG_StepOver();
    return "";
}


static std::string action_run( const SUBJ_ENUM subj, const std::vector<std::string>& argv ){
    DEBUG_run();
    return "";
}


static std::string action_read( const SUBJ_ENUM subj, const std::vector<std::string>& argv ){
    if(subj==SUBJ_REGISTERS) return rd_regs();
    if(subj==SUBJ_MEMORY){
        if(ARGC<3)return "";
        return rd_mem(argv[2],argv[3]);
    } 
    if(subj==SUBJ_BREAKPOINTS) return breakpoint_show();
    if(subj==SUBJ_COVERAGE) return coverage_read();
    return "";
}


static std::string action_write( const SUBJ_ENUM subj, const std::vector<std::string>& argv ){
    if(subj==SUBJ_BREAKPOINTS){
        if(ARGC<2)return "";
        return breakpoint_set(argv[2]);
    } 
    return "";
}


static std::string action_clear( const SUBJ_ENUM subj, const std::vector<std::string>& argv ){
    if(subj==SUBJ_BREAKPOINTS){
        if(ARGC<2)return breakpoint_clear_all();
//        return clear_breakpoint(argv[2]);
        return "";
    }
    if(subj==SUBJ_COVERAGE)return coverage_clear();
    return "";
}


static std::string action_enable( const SUBJ_ENUM subj, const std::vector<std::string>& argv ){
    return "";
}


static std::string action_disable( const SUBJ_ENUM subj, const std::vector<std::string>& argv ){
    return "";
}












/*

all'interprete della cli servono due hash dei sinonimi/abbreviazioni:
-da azione a fn ref
-da soggetto a enum soggetto

i .h corrispondenti si creano in shell con:

(
bash mk-hash.sh << EOF
    break   action_break
    clear   action_clear
    disable action_disable
    enable  action_enable
    get     action_read
    read    action_read
    reset   action_clear
    run     action_run
    set     action_write
    show    action_read
    step    action_step
    trace   action_trace
    view    action_read
    write   action_write
EOF
) > SRDP_action_from_syno.h

(
bash mk-hash.sh << EOF
    breakpoints SUBJ_BREAKPOINTS
    coverage    SUBJ_COVERAGE
    memory      SUBJ_MEMORY
    registers   SUBJ_REGISTERS
EOF
) > SRDP_subj_from_syno.h



*/



typedef std::function<std::string( const SUBJ_ENUM, const std::vector<std::string>& )> ACTION_REF;



static std::string on_client_request( const std::string& req ){
    auto tokens = split(req," ");

    // la cli (la http get finisce nella stessa cli, vedi il server sopra)
    // richiede un'azione, ed opzionalmente un soggetto e dei parametri
    // azioni e soggetti possono essere abbreviati
    // es.
    // step            azione step over, no soggetto, no params
    // set bre 0x1120  setta un breakpoint, soggetto bre=breakpoints, param 0x1120
    // ecc.

    // verb → callback fn ptr 
    static const std::unordered_map<std::string,ACTION_REF> action_from_syno = {
        #include "SRDP_action_from_syno.h"
    };

    // subj → enum
    static const std::unordered_map<std::string,SUBJ_ENUM> subj_from_syno = {
        #include "SRDP_subj_from_syno.h"
    };




    // azione obbligatoria
    if(tokens.size()<1)return "";
    const auto cmd_it = action_from_syno.find(tokens[0]);
    if(cmd_it==action_from_syno.end())return ""; // azione non riconosciuta
    const auto action = cmd_it->second; // alias

    // soggetto opzionale
    // =SUBJ_NONE se non specificato
    auto subj = SUBJ_NONE;
    if(tokens.size()>=2){
        const auto subj_it = subj_from_syno.find(tokens[1]);
        if(subj_it==subj_from_syno.end())return ""; // subj fornito ma non riconosciuto
        subj = subj_it->second;
    }

    return action(subj,tokens);
}













void SRDP_update(){
    // questa gira nel main thread
    // va chiamata periodicamente nei loop di dosbox

//    // check visuale per ↑↑↑
//    static time_t t = 0;
//    time_t n = time(0);
//    if(t!=n){
//        t=n;
//        DEBUG_ShowMsg("%ld\n",n);
//    }

    
    coverage_update();

    // richieste dal client
    if( FSM_state != STATE_REQUEST_READY )return;
    xchange = on_client_request(xchange);
    FSM_change(STATE_RESPONSE_READY);
}




/*

SRDP - simple remote debug protocol

a tcp/ascii server for remotely control dosbox debugger
why not gdb rsp? too complex
two protocols are available, plaintext and http
an autodetect mechanism selects one or the other,
depending on the client request
with http, web/js control is easily implemented
see the accompanying webapp
plaintext is more for tools like IDA+python


*/

#endif
