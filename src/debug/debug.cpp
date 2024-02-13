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

/* $Id: debug.cpp,v 1.97 2009-04-11 19:49:52 c2woody Exp $ */

#include "dosbox.h"
#if C_DEBUG

#include <string.h>
#include <list>
#include <ctype.h>
#include <fstream>
#include <iomanip>
#include <string>
#include <sstream>
using namespace std;

#include "debug.h"
#include "cross.h" //snprintf
#include "cpu.h"
#include "video.h"
#include "pic.h"
#include "mapper.h"
#include "cpu.h"
#include "callback.h"
#include "SRDP.h"
#include "inout.h"
#include "mixer.h"
#include "timer.h"
#include "paging.h"
#include "support.h"
#include "shell.h"
#include "programs.h"
#include "debug_inc.h"
#include "../cpu/lazyflags.h"
#include "keyboard.h"
#include "setup.h"
#include <unordered_map>


#ifdef WIN32
void WIN32_Console();
#else
#include <termios.h>
#include <unistd.h>
static struct termios consolesettings;
#endif
int old_cursor_state;



// Forwards
static void DrawCode(void);
static void DEBUG_RaiseTimerIrq(void);
static void SaveMemory(Bit16u seg, Bit32u ofs1, Bit32u num);
static void SaveMemoryBin(Bit16u seg, Bit32u ofs1, Bit32u num);
static void LogMCBS(void);
static void LogGDT(void);
static void LogLDT(void);
static void LogIDT(void);
static void LogPages(char* selname);
static void LogCPUInfo(void);
static void OutputVecTable(char* filename);
static void DrawVariables(void);
static void SetCodeWinStart();
static char* AnalyzeInstruction(char* inst, bool saveSelector);
static Bit32u GetHexValue(char* str, char*& hex);
static void debugging_leave();
static void debugging_enter();
static int after_traceinto( int ret );



class DebugPageHandler : public PageHandler {
public:
    Bitu readb(PhysPt /*addr*/) { return 0; }
    Bitu readw(PhysPt /*addr*/) { return 0; }
    Bitu readd(PhysPt /*addr*/) { return 0; }
    void writeb(PhysPt /*addr*/,Bitu /*val*/) {}
    void writew(PhysPt /*addr*/,Bitu /*val*/) {}
    void writed(PhysPt /*addr*/,Bitu /*val*/) {}
};


class DEBUG;

DEBUG*  pDebugcom   = 0;
bool    exitLoop    = false;
Bitu debugCallback;


// Heavy Debugging Vars for logging
#if C_HEAVY_DEBUG
static ofstream     cpuLogFile;
static bool     cpuLog          = false;
static int      cpuLogCounter   = 0;
static int      cpuLogType      = 1;    // log detail
static bool zeroProtect = false;
static bool     logHeavy      = false;
#endif



static struct  {
    Bit32u eax,ebx,ecx,edx,esi,edi,ebp,esp,eip;
} oldregs;

static char curSelectorName[3] = { 0,0,0 };

static Segment oldsegs[6];
static Bitu oldflags,oldcpucpl;
DBGBlock dbg;
static Bitu input_count;
Bitu cycle_count;
static bool debugging;


static void SetColor(Bitu test) {
    if (test) {
        if (has_colors()) { wattrset(dbg.win_reg,COLOR_PAIR(PAIR_BYELLOW_BLACK));}
    } else {
        if (has_colors()) { wattrset(dbg.win_reg,0);}
    }
}

struct SCodeViewData {  
    int     cursorPos;
    Bit16u  firstInstSize;
    Bit16u  useCS;
    Bit32u  useEIPlast, useEIPmid;
    Bit32u  useEIP;
    Bit16u  cursorSeg;
    Bit32u  cursorOfs;
    bool    inputMode;
    char    inputStr[255];
    char    prevInputStr[255];
} codeViewData;

static Bit16u   dataSeg;
static Bit32u   dataOfs;
static bool     showExtend = true;







/***********/
/* Helpers */
/***********/




Bit32u PhysMakeProt(Bit16u selector, Bit32u offset)
{
    Descriptor desc;
    if (cpu.gdt.GetDescriptor(selector,desc)) return desc.GetBase()+offset;
    return 0;
};

Bit32u GetAddress(Bit16u seg, Bit32u offset)
{
    if (seg==SegValue(cs)) return SegPhys(cs)+offset;
    if (cpu.pmode && !(reg_flags & FLAG_VM)) {
        Descriptor desc;
        if (cpu.gdt.GetDescriptor(seg,desc)) return PhysMakeProt(seg,offset);
    }
    return (seg<<4)+offset;
}

static char empty_sel[] = { ' ',' ',0 };

bool GetDescriptorInfo(char* selname, char* out1, char* out2)
{
    Bitu sel;
    Descriptor desc;

    if (strstr(selname,"cs") || strstr(selname,"CS")) sel = SegValue(cs);
    else if (strstr(selname,"ds") || strstr(selname,"DS")) sel = SegValue(ds);
    else if (strstr(selname,"es") || strstr(selname,"ES")) sel = SegValue(es);
    else if (strstr(selname,"fs") || strstr(selname,"FS")) sel = SegValue(fs);
    else if (strstr(selname,"gs") || strstr(selname,"GS")) sel = SegValue(gs);
    else if (strstr(selname,"ss") || strstr(selname,"SS")) sel = SegValue(ss);
    else {
        sel = GetHexValue(selname,selname);
        if (*selname==0) selname=empty_sel;
    }
    if (cpu.gdt.GetDescriptor(sel,desc)) {
        switch (desc.Type()) {
            case DESC_TASK_GATE:
                sprintf(out1,"%s: s:%08lX type:%02X p"
                    ,selname
                    ,desc.GetSelector()
                    ,desc.saved.gate.type
                );
                sprintf(out2,"    TaskGate   dpl : %01X %1X",desc.saved.gate.dpl,desc.saved.gate.p);
                return true;
            case DESC_LDT:
            case DESC_286_TSS_A:
            case DESC_286_TSS_B:
            case DESC_386_TSS_A:
            case DESC_386_TSS_B:
                sprintf(out1,"%s: b:%08X type:%02X pag"
                    ,selname
                    ,desc.GetBase()
                    ,desc.saved.seg.type
                );
                sprintf(out2,"    l:%08lX dpl : %01X %1X%1X%1X"
                    ,desc.GetLimit()
                    ,desc.saved.seg.dpl
                    ,desc.saved.seg.p
                    ,desc.saved.seg.avl
                    ,desc.saved.seg.g
                );
                return true;
            case DESC_286_CALL_GATE:
            case DESC_386_CALL_GATE:
                sprintf(out1,"%s: s:%08lX type:%02X p params: %02X",selname,desc.GetSelector(),desc.saved.gate.type,desc.saved.gate.paramcount);
                sprintf(out2,"    o:%08lX dpl : %01X %1X",desc.GetOffset(),desc.saved.gate.dpl,desc.saved.gate.p);
                return true;
            case DESC_286_INT_GATE:
            case DESC_286_TRAP_GATE:
            case DESC_386_INT_GATE:
            case DESC_386_TRAP_GATE:
                sprintf(out1,"%s: s:%08lX type:%02X p"
                    ,selname
                    ,desc.GetSelector()
                    ,desc.saved.gate.type
                );
                sprintf(out2,"    o:%08lX dpl : %01X %1X",desc.GetOffset()
                    ,desc.saved.gate.dpl
                    ,desc.saved.gate.p
                );
                return true;
        }
        sprintf(out1
            ,"%s: b:%08X type:%02X parbg",selname,desc.GetBase(),desc.saved.seg.type);
        sprintf(out2,"    l:%08lX dpl : %01X %1X%1X%1X%1X%1X"
            ,desc.GetLimit()
            ,desc.saved.seg.dpl
            ,desc.saved.seg.p
            ,desc.saved.seg.avl
            ,desc.saved.seg.r
            ,desc.saved.seg.big
            ,desc.saved.seg.g
        );
        return true;
    } else {
        strcpy(out1,"                                     ");
        strcpy(out2,"                                     ");
    }
    return false;
};

/******************/
/* DebugVar   stuff */
/******************/

class CDebugVar
{
public:
    CDebugVar(char* _name, PhysPt _adr) { adr=_adr; safe_strncpy(name,_name,16); };
    
    char*   GetName(void) { return name; };
    PhysPt  GetAdr (void) { return adr;  };

private:
    PhysPt  adr;
    char    name[16];

public: 
    static void         InsertVariable  (char* name, PhysPt adr);
    static CDebugVar*   FindVar         (PhysPt adr);
    static void         DeleteAll       ();
    static bool         SaveVars        (char* name);
    static bool         LoadVars        (char* name);

    static std::list<CDebugVar*>    varList;
};

std::list<CDebugVar*> CDebugVar::varList;

static bool skipFirstInstruction = false;

/********************/
/* Breakpoint stuff */
/********************/

#include "CBreakpoint.h"



bool DEBUG_Breakpoint(void)
{
    /* First get the phyiscal address and check for a set Breakpoint */
    if (!CBreakpoint::CheckBreakpoint(SegValue(cs),reg_eip)) return false;
    // Found. Breakpoint is valid
    PhysPt where=GetAddress(SegValue(cs),reg_eip);
    CBreakpoint::ActivateAllBreakpoints(false);
    return true;
};


bool DEBUG_IntBreakpoint(Bit8u intNum)
{
    /* First get the phyiscal address and check for a set Breakpoint */
    PhysPt where=GetAddress(SegValue(cs),reg_eip);
    if (!CBreakpoint::CheckIntBreakpoint(where,intNum,reg_ah)) return false;
    // Found. Breakpoint is valid
    CBreakpoint::ActivateAllBreakpoints(false);
    return true;
};


static void run_program(){
    if(!debugging)return;
    CBreakpoint::ActivateAllBreakpoints(true);                     
    ignoreAddressOnce = SegPhys(cs)+reg_eip;
    debugging_leave();
    after_traceinto(0);
}




static bool StepOver()
{
    // se l'istr è una di quelle sotto:
    // -setta un breakpoint momentaneo all'istr successiva
    // -lancia la vm
    // 
    // altrimenti fa solo un traceinto

    exitLoop = false;
    PhysPt start = GetAddress(SegValue(cs),reg_eip);
    char dline[200];
    Bitu size = DasmI386(dline, start, reg_eip, cpu.code.big);
    if (strstr(dline,"call") ||
        strstr(dline,"loop") ||
        strstr(dline,"int")  ||
        strstr(dline,"rep")
    ){
        CBreakpoint::AddBreakpoint      (start+size, true);
        CBreakpoint::ActivateAllBreakpoints(true);
        DrawCode();
        debugging_leave();
        return true;
    } 

    return false; // verra chiamata traceinto e after_traceinto
};


static int TraceInto(){
    exitLoop = false;
    skipFirstInstruction = true; // for heavy debugger
    CPU_Cycles = 1; // esegui solo un'instruzione (e se arriva un interrupt?)
    int ret=(*cpudecoder)();
    SetCodeWinStart();
    CBreakpoint::ignoreOnce = 0;
    return ret;
}


bool DEBUG_ExitLoop(void)
{
    // chiamata a ripetizione nel normal cpu loop (non debug loop)
    SRDP_update();

#if C_HEAVY_DEBUG
    DrawVariables();
#endif
    
    if (exitLoop) {
        exitLoop = false;
        return true;
    }
    return false;
};


/********************/
/*   Draw windows   */
/********************/

static void DrawData(void) {
    
    Bit8u ch;
    Bit32u add = dataOfs;
    Bit32u address;
    /* Data win */  
    for (int y=0; y<8; y++) {
        // Address
        if (add<0x10000) mvwprintw (dbg.win_data,1+y,0,"%04X:%04X     ",dataSeg,add);
        else mvwprintw (dbg.win_data,1+y,0,"%04X:%08X ",dataSeg,add);
        for (int x=0; x<16; x++) {
            address = GetAddress(dataSeg,add);
            if (mem_readb_checked(address,&ch)) ch=0;
            mvwprintw (dbg.win_data,1+y,14+3*x,"%02X",ch);
            if (ch<32 || !isprint(*reinterpret_cast<unsigned char*>(&ch))) ch='.';
            mvwprintw (dbg.win_data,1+y,63+x,"%c",ch);
            add++;
        };
    }   
    wrefresh(dbg.win_data);
};


static void DrawRegisters(void) {
    /* Main Registers */
    SetColor(reg_eax!=oldregs.eax);oldregs.eax=reg_eax;mvwprintw (dbg.win_reg,0,4,"%08X",reg_eax);
    SetColor(reg_ebx!=oldregs.ebx);oldregs.ebx=reg_ebx;mvwprintw (dbg.win_reg,1,4,"%08X",reg_ebx);
    SetColor(reg_ecx!=oldregs.ecx);oldregs.ecx=reg_ecx;mvwprintw (dbg.win_reg,2,4,"%08X",reg_ecx);
    SetColor(reg_edx!=oldregs.edx);oldregs.edx=reg_edx;mvwprintw (dbg.win_reg,3,4,"%08X",reg_edx);

    SetColor(reg_esi!=oldregs.esi);oldregs.esi=reg_esi;mvwprintw (dbg.win_reg,0,18,"%08X",reg_esi);
    SetColor(reg_edi!=oldregs.edi);oldregs.edi=reg_edi;mvwprintw (dbg.win_reg,1,18,"%08X",reg_edi);
    SetColor(reg_ebp!=oldregs.ebp);oldregs.ebp=reg_ebp;mvwprintw (dbg.win_reg,2,18,"%08X",reg_ebp);
    SetColor(reg_esp!=oldregs.esp);oldregs.esp=reg_esp;mvwprintw (dbg.win_reg,3,18,"%08X",reg_esp);
    SetColor(reg_eip!=oldregs.eip);oldregs.eip=reg_eip;mvwprintw (dbg.win_reg,1,42,"%08X",reg_eip);
    
    SetColor(SegValue(ds)!=oldsegs[ds].val);oldsegs[ds].val=SegValue(ds);mvwprintw (dbg.win_reg,0,31,"%04X",SegValue(ds));
    SetColor(SegValue(es)!=oldsegs[es].val);oldsegs[es].val=SegValue(es);mvwprintw (dbg.win_reg,0,41,"%04X",SegValue(es));
    SetColor(SegValue(fs)!=oldsegs[fs].val);oldsegs[fs].val=SegValue(fs);mvwprintw (dbg.win_reg,0,51,"%04X",SegValue(fs));
    SetColor(SegValue(gs)!=oldsegs[gs].val);oldsegs[gs].val=SegValue(gs);mvwprintw (dbg.win_reg,0,61,"%04X",SegValue(gs));
    SetColor(SegValue(ss)!=oldsegs[ss].val);oldsegs[ss].val=SegValue(ss);mvwprintw (dbg.win_reg,0,71,"%04X",SegValue(ss));
    SetColor(SegValue(cs)!=oldsegs[cs].val);oldsegs[cs].val=SegValue(cs);mvwprintw (dbg.win_reg,1,31,"%04X",SegValue(cs));

    /*Individual flags*/
    Bitu changed_flags = reg_flags ^ oldflags;
    oldflags = reg_flags;

    SetColor(changed_flags&FLAG_CF);
    mvwprintw (dbg.win_reg,1,53,"%01X",GETFLAG(CF) ? 1:0);
    SetColor(changed_flags&FLAG_ZF);
    mvwprintw (dbg.win_reg,1,56,"%01X",GETFLAG(ZF) ? 1:0);
    SetColor(changed_flags&FLAG_SF);
    mvwprintw (dbg.win_reg,1,59,"%01X",GETFLAG(SF) ? 1:0);
    SetColor(changed_flags&FLAG_OF);
    mvwprintw (dbg.win_reg,1,62,"%01X",GETFLAG(OF) ? 1:0);
    SetColor(changed_flags&FLAG_AF);
    mvwprintw (dbg.win_reg,1,65,"%01X",GETFLAG(AF) ? 1:0);
    SetColor(changed_flags&FLAG_PF);
    mvwprintw (dbg.win_reg,1,68,"%01X",GETFLAG(PF) ? 1:0);

    SetColor(changed_flags&FLAG_DF);
    mvwprintw (dbg.win_reg,1,71,"%01X",GETFLAG(DF) ? 1:0);
    SetColor(changed_flags&FLAG_IF);
    mvwprintw (dbg.win_reg,1,74,"%01X",GETFLAG(IF) ? 1:0);
    SetColor(changed_flags&FLAG_TF);
    mvwprintw (dbg.win_reg,1,77,"%01X",GETFLAG(TF) ? 1:0);

    SetColor(changed_flags&FLAG_IOPL);
    mvwprintw (dbg.win_reg,2,72,"%01lX",GETFLAG(IOPL)>>12);


    SetColor(cpu.cpl ^ oldcpucpl);
    mvwprintw (dbg.win_reg,2,78,"%01lX",cpu.cpl);
    oldcpucpl=cpu.cpl;

    if (cpu.pmode) {
        if (reg_flags & FLAG_VM) mvwprintw(dbg.win_reg,0,76,"VM86");
        else if (cpu.code.big) mvwprintw(dbg.win_reg,0,76,"Pr32");
        else mvwprintw(dbg.win_reg,0,76,"Pr16");
    } else  
        mvwprintw(dbg.win_reg,0,76,"Real");

    // Selector info, if available
    if ((cpu.pmode) && curSelectorName[0]) {
        char out1[200], out2[200];
        GetDescriptorInfo(curSelectorName,out1,out2);
        mvwprintw(dbg.win_reg,2,28,out1);
        mvwprintw(dbg.win_reg,3,28,out2);
    }

    wattrset(dbg.win_reg,0);
    mvwprintw(dbg.win_reg,3,60,"%lu       ",cycle_count);
    wrefresh(dbg.win_reg);
};

static void DrawCode(void) {
    bool saveSel; 
    Bit32u disEIP = codeViewData.useEIP;
    PhysPt start  = GetAddress(codeViewData.useCS,codeViewData.useEIP);
    char dline[200];Bitu size;Bitu c;
    static char line20[21] = "                    ";
    
    for (int i=0;i<10;i++) {
        saveSel = false;
        if (has_colors()) {
            if ((codeViewData.useCS==SegValue(cs)) && (disEIP == reg_eip)) {
                wattrset(dbg.win_code,COLOR_PAIR(PAIR_GREEN_BLACK));            
                if (codeViewData.cursorPos==-1) {
                    codeViewData.cursorPos = i; // Set Cursor 
                    codeViewData.cursorSeg = SegValue(cs);
                    codeViewData.cursorOfs = disEIP;
                }
                saveSel = (i == codeViewData.cursorPos);
            } else if (i == codeViewData.cursorPos) {
                wattrset(dbg.win_code,COLOR_PAIR(PAIR_BLACK_GREY));         
                codeViewData.cursorSeg = codeViewData.useCS;
                codeViewData.cursorOfs = disEIP;
                saveSel = true;
            } else if (CBreakpoint::IsBreakpointDrawn(start)) {
                wattrset(dbg.win_code,COLOR_PAIR(PAIR_GREY_RED));           
            } else {
                wattrset(dbg.win_code,0);           
            }
        }


        Bitu drawsize=size=DasmI386(dline, start, disEIP, cpu.code.big);
        bool toolarge = false;
        mvwprintw(dbg.win_code,i,0,"%04X:%04X  ",codeViewData.useCS,disEIP);
        
        if (drawsize>10) { toolarge = true; drawsize = 9; };
        for (c=0;c<drawsize;c++) {
            Bit8u value;
            if (mem_readb_checked(start+c,&value)) value=0;
            wprintw(dbg.win_code,"%02X",value);
        }
        if (toolarge) { waddstr(dbg.win_code,".."); drawsize++; };
        // Spacepad up to 20 characters
        if(drawsize && (drawsize < 11)) {
            line20[20 - drawsize*2] = 0;
            waddstr(dbg.win_code,line20);
            line20[20 - drawsize*2] = ' ';
        } else waddstr(dbg.win_code,line20);

        char empty_res[] = { 0 };
        char* res = empty_res;
        if (showExtend) res = AnalyzeInstruction(dline, saveSel);
        // Spacepad it up to 28 characters
        size_t dline_len = strlen(dline);
        if(dline_len < 28) for (c = dline_len; c < 28;c++) dline[c] = ' '; dline[28] = 0;
        waddstr(dbg.win_code,dline);
        // Spacepad it up to 20 characters
        size_t res_len = strlen(res);
        if(res_len && (res_len < 21)) {
            waddstr(dbg.win_code,res);
            line20[20-res_len] = 0;
            waddstr(dbg.win_code,line20);
            line20[20-res_len] = ' ';
        } else  waddstr(dbg.win_code,line20);
        
        start+=size;
        disEIP+=size;

        if (i==0) codeViewData.firstInstSize = size;
        if (i==4) codeViewData.useEIPmid     = disEIP;
    }

    codeViewData.useEIPlast = disEIP;
    
    wattrset(dbg.win_code,0);           
    if (!debugging) {
        mvwprintw(dbg.win_code,10,0,"(Running)");
    } else { 
        if(!*codeViewData.inputStr) { //Clear old commands
            mvwprintw(dbg.win_code,10,0,"                                                                            ");
        }
        mvwprintw(dbg.win_code,10,0,"-> %s_  ",codeViewData.inputStr);
    }

    wrefresh(dbg.win_code);
}

static void SetCodeWinStart()
{
    if ((SegValue(cs)==codeViewData.useCS) && (reg_eip>=codeViewData.useEIP) && (reg_eip<=codeViewData.useEIPlast)) {
        // in valid window - scroll ?
        if (reg_eip>=codeViewData.useEIPmid) codeViewData.useEIP += codeViewData.firstInstSize;
        
    } else {
        // totally out of range.
        codeViewData.useCS  = SegValue(cs);
        codeViewData.useEIP = reg_eip;
    }
    codeViewData.cursorPos = -1;    // Recalc Cursor position
};


/********************/
/*    User input    */
/********************/

static Bit32u GetHexValue(char* str, char*& hex)
{
    Bit32u  value = 0;
    Bit32u regval = 0;
    hex = str;
    while (*hex==' ') hex++;
    if (strstr(hex,"EAX")==hex) { hex+=3; regval = reg_eax; };
    if (strstr(hex,"EBX")==hex) { hex+=3; regval = reg_ebx; };
    if (strstr(hex,"ECX")==hex) { hex+=3; regval = reg_ecx; };
    if (strstr(hex,"EDX")==hex) { hex+=3; regval = reg_edx; };
    if (strstr(hex,"ESI")==hex) { hex+=3; regval = reg_esi; };
    if (strstr(hex,"EDI")==hex) { hex+=3; regval = reg_edi; };
    if (strstr(hex,"EBP")==hex) { hex+=3; regval = reg_ebp; };
    if (strstr(hex,"ESP")==hex) { hex+=3; regval = reg_esp; };
    if (strstr(hex,"EIP")==hex) { hex+=3; regval = reg_eip; };
    if (strstr(hex,"AX")==hex) { hex+=2; regval = reg_ax; };
    if (strstr(hex,"BX")==hex) { hex+=2; regval = reg_bx; };
    if (strstr(hex,"CX")==hex) { hex+=2; regval = reg_cx; };
    if (strstr(hex,"DX")==hex) { hex+=2; regval = reg_dx; };
    if (strstr(hex,"SI")==hex) { hex+=2; regval = reg_si; };
    if (strstr(hex,"DI")==hex) { hex+=2; regval = reg_di; };
    if (strstr(hex,"BP")==hex) { hex+=2; regval = reg_bp; };
    if (strstr(hex,"SP")==hex) { hex+=2; regval = reg_sp; };
    if (strstr(hex,"IP")==hex) { hex+=2; regval = reg_ip; };
    if (strstr(hex,"CS")==hex) { hex+=2; regval = SegValue(cs); };
    if (strstr(hex,"DS")==hex) { hex+=2; regval = SegValue(ds); };
    if (strstr(hex,"ES")==hex) { hex+=2; regval = SegValue(es); };
    if (strstr(hex,"FS")==hex) { hex+=2; regval = SegValue(fs); };
    if (strstr(hex,"GS")==hex) { hex+=2; regval = SegValue(gs); };
    if (strstr(hex,"SS")==hex) { hex+=2; regval = SegValue(ss); };

    while (*hex) {
        if ((*hex>='0') && (*hex<='9')) value = (value<<4)+*hex-'0';
        else if ((*hex>='A') && (*hex<='F')) value = (value<<4)+*hex-'A'+10; 
        else { 
            if(*hex == '+') {hex++;return regval + value + GetHexValue(hex,hex); };
            if(*hex == '-') {hex++;return regval + value - GetHexValue(hex,hex); };
            break; // No valid char
        }
        hex++;
    };
    return regval + value;
};

bool ChangeRegister(char* str)
{
    char* hex = str;
    while (*hex==' ') hex++;
    if (strstr(hex,"EAX")==hex) { hex+=3; reg_eax = GetHexValue(hex,hex); } else
    if (strstr(hex,"EBX")==hex) { hex+=3; reg_ebx = GetHexValue(hex,hex); } else
    if (strstr(hex,"ECX")==hex) { hex+=3; reg_ecx = GetHexValue(hex,hex); } else
    if (strstr(hex,"EDX")==hex) { hex+=3; reg_edx = GetHexValue(hex,hex); } else
    if (strstr(hex,"ESI")==hex) { hex+=3; reg_esi = GetHexValue(hex,hex); } else
    if (strstr(hex,"EDI")==hex) { hex+=3; reg_edi = GetHexValue(hex,hex); } else
    if (strstr(hex,"EBP")==hex) { hex+=3; reg_ebp = GetHexValue(hex,hex); } else
    if (strstr(hex,"ESP")==hex) { hex+=3; reg_esp = GetHexValue(hex,hex); } else
    if (strstr(hex,"EIP")==hex) { hex+=3; reg_eip = GetHexValue(hex,hex); } else
    if (strstr(hex,"AX")==hex) { hex+=2; reg_ax = (Bit16u)GetHexValue(hex,hex); } else
    if (strstr(hex,"BX")==hex) { hex+=2; reg_bx = (Bit16u)GetHexValue(hex,hex); } else
    if (strstr(hex,"CX")==hex) { hex+=2; reg_cx = (Bit16u)GetHexValue(hex,hex); } else
    if (strstr(hex,"DX")==hex) { hex+=2; reg_dx = (Bit16u)GetHexValue(hex,hex); } else
    if (strstr(hex,"SI")==hex) { hex+=2; reg_si = (Bit16u)GetHexValue(hex,hex); } else
    if (strstr(hex,"DI")==hex) { hex+=2; reg_di = (Bit16u)GetHexValue(hex,hex); } else
    if (strstr(hex,"BP")==hex) { hex+=2; reg_bp = (Bit16u)GetHexValue(hex,hex); } else
    if (strstr(hex,"SP")==hex) { hex+=2; reg_sp = (Bit16u)GetHexValue(hex,hex); } else
    if (strstr(hex,"IP")==hex) { hex+=2; reg_ip = (Bit16u)GetHexValue(hex,hex); } else
    if (strstr(hex,"CS")==hex) { hex+=2; SegSet16(cs,(Bit16u)GetHexValue(hex,hex)); } else
    if (strstr(hex,"DS")==hex) { hex+=2; SegSet16(ds,(Bit16u)GetHexValue(hex,hex)); } else
    if (strstr(hex,"ES")==hex) { hex+=2; SegSet16(es,(Bit16u)GetHexValue(hex,hex)); } else
    if (strstr(hex,"FS")==hex) { hex+=2; SegSet16(fs,(Bit16u)GetHexValue(hex,hex)); } else
    if (strstr(hex,"GS")==hex) { hex+=2; SegSet16(gs,(Bit16u)GetHexValue(hex,hex)); } else
    if (strstr(hex,"SS")==hex) { hex+=2; SegSet16(ss,(Bit16u)GetHexValue(hex,hex)); } else
    if (strstr(hex,"AF")==hex) { hex+=2; SETFLAGBIT(AF,GetHexValue(hex,hex)); } else
    if (strstr(hex,"CF")==hex) { hex+=2; SETFLAGBIT(CF,GetHexValue(hex,hex)); } else
    if (strstr(hex,"DF")==hex) { hex+=2; SETFLAGBIT(DF,GetHexValue(hex,hex)); } else
    if (strstr(hex,"IF")==hex) { hex+=2; SETFLAGBIT(IF,GetHexValue(hex,hex)); } else
    if (strstr(hex,"OF")==hex) { hex+=2; SETFLAGBIT(OF,GetHexValue(hex,hex)); } else
    if (strstr(hex,"ZF")==hex) { hex+=2; SETFLAGBIT(ZF,GetHexValue(hex,hex)); } else
    if (strstr(hex,"PF")==hex) { hex+=2; SETFLAGBIT(PF,GetHexValue(hex,hex)); } else
    if (strstr(hex,"SF")==hex) { hex+=2; SETFLAGBIT(SF,GetHexValue(hex,hex)); } else
    { return false; };
    return true;
};


bool DEBUG_ParseCommand( const char* _str ){
    if(!debugging)return true;

    char str[256];
    strncpy(str,_str,sizeof(str));

    char* found = str;
    for(char* idx = found;*idx != 0; idx++)
        *idx = toupper(*idx);

    found = trim(found);
    string s_found(found);
    istringstream stream(s_found);
    string command;
    stream >> command;
    string::size_type next = s_found.find_first_not_of(' ',command.size());
    if(next == string::npos) next = command.size();
    (s_found.erase)(0,next);
    found = const_cast<char*>(s_found.c_str());

    if (command == "MEMDUMP") { // Dump memory to file
        Bit16u seg = (Bit16u)GetHexValue(found,found); found++;
        Bit32u ofs = GetHexValue(found,found); found++;
        Bit32u num = GetHexValue(found,found); found++;
        SaveMemory(seg,ofs,num);
        return true;
    };

    if (command == "MEMDUMPBIN") { // Dump memory to file bineary
        Bit16u seg = (Bit16u)GetHexValue(found,found); found++;
        Bit32u ofs = GetHexValue(found,found); found++;
        Bit32u num = GetHexValue(found,found); found++;
        SaveMemoryBin(seg,ofs,num);
        return true;
    };

    if (command == "IV") { // Insert variable
        Bit16u seg = (Bit16u)GetHexValue(found,found); found++;
        Bit32u ofs = (Bit16u)GetHexValue(found,found); found++;
        char name[16];
        for (int i=0; i<16; i++) {
            if (found[i] && (found[i]!=' ')) name[i] = found[i]; 
            else { name[i] = 0; break; };
        };
        name[15] = 0;

        if(!name[0]) return false;
        DEBUG_ShowMsg("DEBUG: Created debug var %s at %04X:%04X\n",name,seg,ofs);
        CDebugVar::InsertVariable(name,GetAddress(seg,ofs));
        return true;
    };

    if (command == "SV") { // Save variables
        char name[13];
        for (int i=0; i<12; i++) {
            if (found[i] && (found[i]!=' ')) name[i] = found[i]; 
            else { name[i] = 0; break; };
        };
        name[12] = 0;
        if(!name[0]) return false;
        DEBUG_ShowMsg("DEBUG: Variable list save (%s) : %s.\n",name,(CDebugVar::SaveVars(name)?"ok":"failure"));
        return true;
    };

    if (command == "LV") { // load variables
        char name[13];
        for (int i=0; i<12; i++) {
            if (found[i] && (found[i]!=' ')) name[i] = found[i]; 
            else { name[i] = 0; break; };
        };
        name[12] = 0;
        if(!name[0]) return false;
        DEBUG_ShowMsg("DEBUG: Variable list load (%s) : %s.\n",name,(CDebugVar::LoadVars(name)?"ok":"failure"));
        return true;
    };

    if (command == "SR") { // Set register value
        DEBUG_ShowMsg("DEBUG: Set Register %s.\n",(ChangeRegister(found)?"success":"failure"));
        return true;
    };

    if (command == "SM") { // Set memory with following values
        Bit16u seg = (Bit16u)GetHexValue(found,found); found++;
        Bit32u ofs = GetHexValue(found,found); found++;
        Bit16u count = 0;
        while (*found) {
            while (*found==' ') found++;
            if (*found) {
                Bit8u value = (Bit8u)GetHexValue(found,found);
                if(*found) found++;
                mem_writeb_checked(GetAddress(seg,ofs+count),value);
                count++;
            }
        };
        DEBUG_ShowMsg("DEBUG: Memory changed.\n");
        return true;
    };

    if (command == "BP") { // Add new breakpoint
        Bit16u seg = (Bit16u)GetHexValue(found,found);found++; // skip ":"
        Bit32u ofs = GetHexValue(found,found);
        CBreakpoint::AddBreakpoint(seg,ofs,false);
        DEBUG_ShowMsg("DEBUG: Set breakpoint at %04X:%04X\n",seg,ofs);
        return true;
    };

#if C_HEAVY_DEBUG

    if (command == "BPM") { // Add new breakpoint
        Bit16u seg = (Bit16u)GetHexValue(found,found);found++; // skip ":"
        Bit32u ofs = GetHexValue(found,found);
        CBreakpoint::AddMemBreakpoint(seg,ofs);
        DEBUG_ShowMsg("DEBUG: Set memory breakpoint at %04X:%04X\n",seg,ofs);
        return true;
    };

    if (command == "BPPM") { // Add new breakpoint
        Bit16u seg = (Bit16u)GetHexValue(found,found);found++; // skip ":"
        Bit32u ofs = GetHexValue(found,found);
        CBreakpoint* bp = CBreakpoint::AddMemBreakpoint(seg,ofs);
        if (bp) {
            bp->SetType(BKPNT_MEMORY_PROT);
            DEBUG_ShowMsg("DEBUG: Set prot-mode memory breakpoint at %04X:%08X\n",seg,ofs);
        }
        return true;
    };

    if (command == "BPLM") { // Add new breakpoint
        Bit32u ofs = GetHexValue(found,found);
        CBreakpoint* bp = CBreakpoint::AddMemBreakpoint(0,ofs);
        if (bp) bp->SetType(BKPNT_MEMORY_LINEAR);
        DEBUG_ShowMsg("DEBUG: Set linear memory breakpoint at %08X\n",ofs);
        return true;
    };

#endif

    if (command == "BPINT") { // Add Interrupt Breakpoint
        Bit8u intNr = (Bit8u)GetHexValue(found,found);
        bool all = !(*found);found++;
        Bit8u valAH = (Bit8u)GetHexValue(found,found);
        if ((valAH==0x00) && (*found=='*' || all)) {
            CBreakpoint::AddIntBreakpoint(intNr,BPINT_ALL,false);
            DEBUG_ShowMsg("DEBUG: Set interrupt breakpoint at INT %02X\n",intNr);
        } else {
            CBreakpoint::AddIntBreakpoint(intNr,valAH,false);
            DEBUG_ShowMsg("DEBUG: Set interrupt breakpoint at INT %02X AH=%02X\n",intNr,valAH);
        }
        return true;
    };

    if (command == "BPLIST") {
        DEBUG_ShowMsg("Breakpoint list:\n");
        DEBUG_ShowMsg("-------------------------------------------------------------------------\n");
        CBreakpoint::ShowList();
        return true;
    };

    if (command == "BPDEL") { // Delete Breakpoints
        Bit8u bpNr  = (Bit8u)GetHexValue(found,found); 
        if ((bpNr==0x00) && (*found=='*')) { // Delete all
            CBreakpoint::DeleteAll();       
            DEBUG_ShowMsg("DEBUG: Breakpoints deleted.\n");
        } else {        
            // delete single breakpoint
            DEBUG_ShowMsg("DEBUG: Breakpoint deletion %s.\n",(CBreakpoint::DeleteByIndex(bpNr)?"success":"failure"));
        }
        return true;
    };

    if (command == "C") { // Set code overview
        Bit16u codeSeg = (Bit16u)GetHexValue(found,found); found++;
        Bit32u codeOfs = GetHexValue(found,found);
        DEBUG_ShowMsg("DEBUG: Set code overview to %04X:%04X\n",codeSeg,codeOfs);
        codeViewData.useCS  = codeSeg;
        codeViewData.useEIP = codeOfs;
        return true;
    };

    if (command == "D") { // Set data overview
        dataSeg = (Bit16u)GetHexValue(found,found); found++;
        dataOfs = GetHexValue(found,found);
        DEBUG_ShowMsg("DEBUG: Set data overview to %04X:%04X\n",dataSeg,dataOfs);
        return true;
    };

#if C_HEAVY_DEBUG

    if (command == "LOG") { // Create Cpu normal log file
        cpuLogType = 1;
        command = "logcode";
    }

    if (command == "LOGS") { // Create Cpu short log file
        cpuLogType = 0;
        command = "logcode";
    }

    if (command == "LOGL") { // Create Cpu long log file
        cpuLogType = 2;
        command = "logcode";
    }

    if (command == "logcode") { //Shared code between all logs
        DEBUG_ShowMsg("DEBUG: Starting log\n");
        cpuLogFile.open("LOGCPU.TXT");
        if (!cpuLogFile.is_open()) {
            DEBUG_ShowMsg("DEBUG: Logfile couldn't be created.\n");
            return false;
        }
        //Initialize log object
        cpuLogFile << hex << noshowbase << setfill('0') << uppercase;
        cpuLog = true;
        cpuLogCounter = GetHexValue(found,found);
        CBreakpoint::ActivateAllBreakpoints(true);                     
        ignoreAddressOnce = SegPhys(cs)+reg_eip;
        debugging = false;
        DOSBOX_SetNormalLoop(); 
        return true;
    };

#endif

    if (command == "INTT") { //trace int.
        Bit8u intNr = (Bit8u)GetHexValue(found,found);
        DEBUG_ShowMsg("DEBUG: Tracing INT %02X\n",intNr);
        CPU_HW_Interrupt(intNr);
        SetCodeWinStart();
        return true;
    };

    if (command == "INT") { // start int.
        Bit8u intNr = (Bit8u)GetHexValue(found,found);
        DEBUG_ShowMsg("DEBUG: Starting INT %02X\n",intNr);
        CBreakpoint::AddBreakpoint(SegValue(cs),reg_eip, true);
        CBreakpoint::ActivateAllBreakpoints(true);
        DrawCode();
        debugging = false;
        DOSBOX_SetNormalLoop();
        CPU_HW_Interrupt(intNr);
        return true;
    };  

    if (command == "SELINFO") {
        while (found[0] == ' ') found++;
        char out1[200],out2[200];
        GetDescriptorInfo(found,out1,out2);
        DEBUG_ShowMsg("SelectorInfo %s:\n%s\n%s\n",found,out1,out2);
        return true;
    };

    if (command == "DOS") {
        stream >> command;
        if (command == "MCBS") LogMCBS();
        return true;
    }

    if (command == "GDT") {LogGDT(); return true;}
    
    if (command == "LDT") {LogLDT(); return true;}
    
    if (command == "IDT") {LogIDT(); return true;}
    
    if (command == "PAGING") {LogPages(found); return true;}

    if (command == "CPU") {LogCPUInfo(); return true;}

    if (command == "INTVEC") {
        if (found[0] != 0) {
            OutputVecTable(found);
            return true;
        }
    };

    if (command == "INTHAND") {
        if (found[0] != 0) {
            Bit8u intNr = (Bit8u)GetHexValue(found,found);
            DEBUG_ShowMsg("DEBUG: Set code overview to interrupt handler %X\n",intNr);
            codeViewData.useCS  = mem_readw(intNr*4+2);
            codeViewData.useEIP = mem_readw(intNr*4);
            return true;
        }
    };

    if(command == "EXTEND") { //Toggle additional data. 
        showExtend = !showExtend;
        return true;
    };

    if(command == "TIMERIRQ") { //Start a timer irq
        DEBUG_RaiseTimerIrq(); 
        DEBUG_ShowMsg("Debug: Timer Int started.\n");
        return true;
    };


#if C_HEAVY_DEBUG
    if (command == "HEAVYLOG") { // Create Cpu log file
        logHeavy = !logHeavy;
        DEBUG_ShowMsg("DEBUG: Heavy cpu logging %s.\n",logHeavy?"on":"off");
        return true;
    };

    if (command == "ZEROPROTECT") { //toggle zero protection
        zeroProtect = !zeroProtect;
        DEBUG_ShowMsg("DEBUG: Zero code execution protection %s.\n",zeroProtect?"on":"off");
        return true;
    };

#endif
    if (command == "HELP" || command == "?") {
        DEBUG_ShowMsg("Debugger commands (enter all values in hex or as register):\n");
        DEBUG_ShowMsg("--------------------------------------------------------------------------\n");
        DEBUG_ShowMsg("F3/F6                     - Re-enter previous command.\n");
        DEBUG_ShowMsg("F9                        - Run.\n");
        DEBUG_ShowMsg("F2                        - Set/Remove breakpoint.\n");
        DEBUG_ShowMsg("F8/F7                     - Step over / trace into instruction.\n");
        DEBUG_ShowMsg("ALT + D/E/S/X/B           - Set data view to DS:SI/ES:DI/SS:SP/DS:DX/ES:BX.\n");
        DEBUG_ShowMsg("Escape                    - Clear input line.");
        DEBUG_ShowMsg("Up/Down                   - Move code view cursor.\n");
        DEBUG_ShowMsg("Page Up/Down              - Scroll data view.\n");
        DEBUG_ShowMsg("Home/End                  - Scroll log messages.\n");
        DEBUG_ShowMsg("BP     [segment]:[offset] - Set breakpoint.\n");
        DEBUG_ShowMsg("BPINT  [intNr] *          - Set interrupt breakpoint.\n");
        DEBUG_ShowMsg("BPINT  [intNr] [ah]       - Set interrupt breakpoint with ah.\n");
#if C_HEAVY_DEBUG
        DEBUG_ShowMsg("BPM    [segment]:[offset] - Set memory breakpoint (memory change).\n");
        DEBUG_ShowMsg("BPPM   [selector]:[offset]- Set pmode-memory breakpoint (memory change).\n");
        DEBUG_ShowMsg("BPLM   [linear address]   - Set linear memory breakpoint (memory change).\n");
#endif
        DEBUG_ShowMsg("BPLIST                    - List breakpoints.\n");       
        DEBUG_ShowMsg("BPDEL  [bpNr] / *         - Delete breakpoint nr / all.\n");
        DEBUG_ShowMsg("C / D  [segment]:[offset] - Set code / data view address.\n");
        DEBUG_ShowMsg("DOS MCBS                  - Show Memory Control Block chain.\n");
        DEBUG_ShowMsg("INT [nr] / INTT [nr]      - Execute / Trace into interrupt.\n");
#if C_HEAVY_DEBUG
        DEBUG_ShowMsg("LOG [num]                 - Write cpu log file.\n");
        DEBUG_ShowMsg("LOGS/LOGL [num]           - Write short/long cpu log file.\n");
        DEBUG_ShowMsg("HEAVYLOG                  - Enable/Disable automatic cpu log when dosbox exits.\n");
        DEBUG_ShowMsg("ZEROPROTECT               - Enable/Disable zero code execution detecion.\n");
#endif
        DEBUG_ShowMsg("SR [reg] [value]          - Set register value.\n");
        DEBUG_ShowMsg("SM [seg]:[off] [val] [.]..- Set memory with following values.\n");   
    
        DEBUG_ShowMsg("IV [seg]:[off] [name]     - Create var name for memory address.\n");
        DEBUG_ShowMsg("SV [filename]             - Save var list in file.\n");
        DEBUG_ShowMsg("LV [filename]             - Load var list from file.\n");

        DEBUG_ShowMsg("MEMDUMP [seg]:[off] [len] - Write memory to file memdump.txt.\n");
        DEBUG_ShowMsg("MEMDUMPBIN [s]:[o] [len]  - Write memory to file memdump.bin.\n");
        DEBUG_ShowMsg("SELINFO [segName]         - Show selector info.\n");

        DEBUG_ShowMsg("INTVEC [filename]         - Writes interrupt vector table to file.\n");
        DEBUG_ShowMsg("INTHAND [intNum]          - Set code view to interrupt handler.\n");

        DEBUG_ShowMsg("CPU                       - Display CPU status information.\n");
        DEBUG_ShowMsg("GDT                       - Lists descriptors of the GDT.\n");
        DEBUG_ShowMsg("LDT                       - Lists descriptors of the LDT.\n");
        DEBUG_ShowMsg("IDT                       - Lists descriptors of the IDT.\n");
        DEBUG_ShowMsg("PAGING [page]             - Display content of page table.\n");
        DEBUG_ShowMsg("EXTEND                    - Toggle additional info.\n");
        DEBUG_ShowMsg("TIMERIRQ                  - Run the system timer.\n");

        DEBUG_ShowMsg("HELP                      - Help\n");
        
        return true;
    };
    return false;
};












static char* AnalyzeInstruction(char* inst, bool saveSelector) {
    static char result[256];
    
    char instu[256];
    char prefix[3];
    Bit16u seg;

    strcpy(instu,inst);
    upcase(instu);

    result[0] = 0;
    char* pos = strchr(instu,'[');
    if (pos) {
        // Segment prefix ?
        if (*(pos-1)==':') {
            char* segpos = pos-3;
            prefix[0] = tolower(*segpos);
            prefix[1] = tolower(*(segpos+1));
            prefix[2] = 0;
            seg = (Bit16u)GetHexValue(segpos,segpos);
        } else {
            if (strstr(pos,"SP") || strstr(pos,"BP")) {
                seg = SegValue(ss);
                strcpy(prefix,"ss");
            } else {
                seg = SegValue(ds);
                strcpy(prefix,"ds");
            };
        };

        pos++;
        Bit32u adr = GetHexValue(pos,pos);
        while (*pos!=']') {
            if (*pos=='+') {
                pos++;
                adr += GetHexValue(pos,pos);
            } else if (*pos=='-') {
                pos++;
                adr -= GetHexValue(pos,pos); 
            } else 
                pos++;
        };
        Bit32u address = GetAddress(seg,adr);
        if (!(get_tlb_readhandler(address)->flags & PFLAG_INIT)) {
            static char outmask[] = "%s:[%04X]=%02X";
            
            if (cpu.pmode) outmask[6] = '8';
                switch (DasmLastOperandSize()) {
                case 8 : {  Bit8u val = mem_readb(address);
                            outmask[12] = '2';
                            sprintf(result,outmask,prefix,adr,val);
                        }   break;
                case 16: {  Bit16u val = mem_readw(address);
                            outmask[12] = '4';
                            sprintf(result,outmask,prefix,adr,val);
                        }   break;
                case 32: {  Bit32u val = mem_readd(address);
                            outmask[12] = '8';
                            sprintf(result,outmask,prefix,adr,val);
                        }   break;
            }
        } else {
            sprintf(result,"[illegal]");
        }
        // Variable found ?
        CDebugVar* var = CDebugVar::FindVar(address);
        if (var) {
            // Replace occurance
            char* pos1 = strchr(inst,'[');
            char* pos2 = strchr(inst,']');
            if (pos1 && pos2) {
                char temp[256];
                strcpy(temp,pos2);              // save end
                pos1++; *pos1 = 0;              // cut after '['
                strcat(inst,var->GetName());    // add var name
                strcat(inst,temp);              // add end
            };
        };
        // show descriptor info, if available
        if ((cpu.pmode) && saveSelector) {
            strcpy(curSelectorName,prefix);
        };
    };
    // If it is a callback add additional info
    pos = strstr(inst,"callback");
    if (pos) {
        pos += 9;
        Bitu nr = GetHexValue(pos,pos);
        const char* descr = CALLBACK_GetDescription(nr);
        if (descr) {
            strcat(inst,"  ("); strcat(inst,descr); strcat(inst,")");
        }
    };
    // Must be a jump
    if (instu[0] == 'J')
    {
        bool jmp = false;
        switch (instu[1]) {
        case 'A' :  {   jmp = (get_CF()?false:true) && (get_ZF()?false:true); // JA
                    }   break;
        case 'B' :  {   if (instu[2] == 'E') {
                            jmp = (get_CF()?true:false) || (get_ZF()?true:false); // JBE
                        } else {
                            jmp = get_CF()?true:false; // JB
                        }
                    }   break;
        case 'C' :  {   if (instu[2] == 'X') {
                            jmp = reg_cx == 0; // JCXZ
                        } else {
                            jmp = get_CF()?true:false; // JC
                        }
                    }   break;
        case 'E' :  {   jmp = get_ZF()?true:false; // JE
                    }   break;
        case 'G' :  {   if (instu[2] == 'E') {
                            jmp = (get_SF()?true:false)==(get_OF()?true:false); // JGE
                        } else {
                            jmp = (get_ZF()?false:true) && ((get_SF()?true:false)==(get_OF()?true:false)); // JG
                        }
                    }   break;
        case 'L' :  {   if (instu[2] == 'E') {
                            jmp = (get_ZF()?true:false) || ((get_SF()?true:false)!=(get_OF()?true:false)); // JLE
                        } else {
                            jmp = (get_SF()?true:false)!=(get_OF()?true:false); // JL
                        }
                    }   break;
        case 'M' :  {   jmp = true; // JMP
                    }   break;
        case 'N' :  {   switch (instu[2]) {
                        case 'B' :  
                        case 'C' :  {   jmp = get_CF()?false:true;  // JNB / JNC
                                    }   break;
                        case 'E' :  {   jmp = get_ZF()?false:true;  // JNE
                                    }   break;
                        case 'O' :  {   jmp = get_OF()?false:true;  // JNO
                                    }   break;
                        case 'P' :  {   jmp = get_PF()?false:true;  // JNP
                                    }   break;
                        case 'S' :  {   jmp = get_SF()?false:true;  // JNS
                                    }   break;
                        case 'Z' :  {   jmp = get_ZF()?false:true;  // JNZ
                                    }   break;
                        }
                    }   break;
        case 'O' :  {   jmp = get_OF()?true:false; // JO
                    }   break;
        case 'P' :  {   if (instu[2] == 'O') {
                            jmp = get_PF()?false:true; // JPO
                        } else {
                            jmp = get_SF()?true:false; // JP / JPE
                        }
                    }   break;
        case 'S' :  {   jmp = get_SF()?true:false; // JS
                    }   break;
        case 'Z' :  {   jmp = get_ZF()?true:false; // JZ
                    }   break;
        }
        if (jmp) {
            pos = strchr(instu,'$');
            if (pos) {
            pos = strchr(instu,'+');
            if (pos) {
                strcpy(result,"(down)");
            } else {
                strcpy(result,"(up)");
            }
            }
        } else {
            sprintf(result,"(no jmp)");
        }
    }
    return result;
};














Bit32u DEBUG_CheckKeys_winstyle( int key );


#if !(defined(WIN32) && defined(__PDCURSES__))
// curses+posix non ha ALT_xyz, a differenza di curses+windows
// sotto windows, getch ritorna un singolo codice per ogni ALT+key
// sotto posix invece, getch ritorna 27 per indicare "tasto modificato"
// una seconda getch ritorna il carattere
// in altri casi invece ritorna un codice 0x80+[0,0x1F]
// concetto simile a simile a ctrl+x che ritorna [0,1F]
// l'idea quindi è di uniformare 'sto casino in un layout unico:
// arbitrariamente scelgo quello di windows
// DEBUG_CheckKeys opera la traslazione
#define ALT_D ('D'+0x10000)
#define ALT_E ('E'+0x10000)
#define ALT_X ('X'+0x10000)
#define ALT_B ('B'+0x10000)
#define ALT_S ('S'+0x10000)
#endif


Bit32u DEBUG_CheckKeys(void) {
    int key = getch(); // getch è configurata non-blocking
    if( key <= 0 )return 0; // questa condizione era in DEBUG_CheckKeys() originale

    // le combo ALT+x che ci interessano
    static std::unordered_map<int,int> xlat {
        {'D',ALT_D},
        {'E',ALT_E},
        {'X',ALT_X},
        {'B',ALT_B},
        {'S',ALT_S},
    };

#if !(defined(WIN32) && defined(__PDCURSES__))
    // curses+posix

    // a volte ALT+x appare come 27+x (due getch di seguito)
    // okkio che in questo caso esc appare come 27+ERR (seconda getch fallisce)
    if(key==27){
        key = getch();
        if(key<0){ // ERR
            key=27;
        }else{
            key = toupper(key);
            if( xlat.find(key) == xlat.end())return 0;
            key = xlat[key];
        }
    }else{
        if(key&0x80){
            // altre volte invece ha un suo codice > 0x80:
            // ALT+A = 1
            // ALT+B = 2
            // ALT+C = 3
            // ALT+D = 4
            // ALT+d = 0x24 (0x20+(ALT+D))
            // ALT+e = 0x25 (0x20+(ALT+E))
            // ecc
            key &= 0x1F;    // come fosse "uppercase" ALT+a → ALT+A
            key += 'A'-1;   // e lo portiamo nel range della xlat
            if( xlat.find(key) == xlat.end())return 0;
            key = xlat[key];
        }
        // carattere normale, non lo tocchiamo
        }
#endif

    // ora i tasti sotto ALT hanno un loro codice specifico

    return DEBUG_CheckKeys_winstyle(key);

    // tuttavia credo sarebbe meglio passare da key_name(getch())
    // che genera cose tipo "^R" per CTRL+R, "+G" per SHIFT-G, ecc
    // key_name in curses c'è, ma credo non sia standard... e non la compila
}


static int after_traceinto( int ret ){
    // questo snippet prima stava in DEBUG_CheckKeys_winstyle
    // prende il retval di TraceInto()
    // esportata per implementare le actions senza passar dalla console
    if (ret<0) return ret;
    if (ret>0) {
        ret=(*CallBack_Handlers[ret])();
        if (ret) {
            exitLoop=true;
            CPU_Cycles=CPU_CycleLeft=0;
            return ret;
        }
    }
    DEBUG_DrawScreen();
    return 0;
}




Bit32u DEBUG_CheckKeys_winstyle( int key ){

    Bits traceinto_retval=0;

    switch (key) {
        case 27:    // escape (a bit slow): Clears line. and processes alt commands.
            codeViewData.inputStr[0] = 0; 
            break;

        case ALT_D : // ds:si
            dataSeg = SegValue(ds);
            if (cpu.pmode && !(reg_flags & FLAG_VM)) dataOfs = reg_esi;
            else dataOfs = reg_si;
            break;
        
        case ALT_E : // es:di
            dataSeg = SegValue(es);
            if (cpu.pmode && !(reg_flags & FLAG_VM)) dataOfs = reg_edi;
            else dataOfs = reg_di;
            break;
        
        case ALT_X: // ds:dx
            dataSeg = SegValue(ds);
            if (cpu.pmode && !(reg_flags & FLAG_VM)) dataOfs = reg_edx;
            else dataOfs = reg_dx;
            break;
        
        case ALT_B : // es:bx
            dataSeg = SegValue(es);
            if (cpu.pmode && !(reg_flags & FLAG_VM)) dataOfs = reg_ebx;
            else dataOfs = reg_bx;
            break;
        
        case ALT_S: // ss:sp
            dataSeg = SegValue(ss);
            if (cpu.pmode && !(reg_flags & FLAG_VM)) dataOfs = reg_esp;
            else dataOfs = reg_sp;
            break;
        
        case KEY_PPAGE :    dataOfs -= 16;  break;
        case KEY_NPAGE :    dataOfs += 16;  break;

        case KEY_DOWN:
            if (codeViewData.cursorPos<9) codeViewData.cursorPos++;
            else codeViewData.useEIP += codeViewData.firstInstSize; 
            break;

        case KEY_UP:
            if (codeViewData.cursorPos>0) codeViewData.cursorPos--;
            else {
                Bitu bytes = 0;
                char dline[200];
                Bitu size = 0;
                Bit32u newEIP = codeViewData.useEIP - 1;
                if(codeViewData.useEIP) {
                    for (; bytes < 10; bytes++) {
                        PhysPt start = GetAddress(codeViewData.useCS,newEIP);
                        size = DasmI386(dline, start, newEIP, cpu.code.big);
                        if(codeViewData.useEIP == newEIP+size) break;
                        newEIP--;
                    }
                    if (bytes>=10) newEIP = codeViewData.useEIP - 1;
                }
                codeViewData.useEIP = newEIP;
            }
            break;

        case KEY_HOME:  // scroll log page up
            DEBUG_RefreshPage(-1);
            break;

        case KEY_END:   // scroll log page down
            DEBUG_RefreshPage(1);
            break;

        case KEY_F(6):  // Re-enter previous command (f1-f4 generate rubbish at my place)
        case KEY_F(3):  // Re-enter previous command
            // copy prevInputStr back into inputStr
            safe_strncpy(codeViewData.inputStr, codeViewData.prevInputStr, sizeof(codeViewData.inputStr));
            break;

        case KEY_F(9):  // Run Program
            run_program();
            break;

        case KEY_F(2):  // Set/Remove TBreakpoint
            {
                PhysPt ptr = GetAddress(codeViewData.cursorSeg,codeViewData.cursorOfs);
                if (CBreakpoint::IsBreakpoint(ptr)) CBreakpoint::DeleteBreakpoint(ptr);
                else                                CBreakpoint::AddBreakpoint(codeViewData.cursorSeg, codeViewData.cursorOfs, false);
            }
            break;

        case KEY_F(8):  // Step over inst
            if (StepOver()) return 0;
            traceinto_retval = TraceInto();
            break;

        case KEY_F(7):  // trace into
            traceinto_retval = TraceInto();
            break;

        case 0x0A: //Parse typed Command
            codeViewData.inputMode = true;
            if(DEBUG_ParseCommand(codeViewData.inputStr)) {
                // copy inputStr to prevInputStr so we can restore it if the user hits F3
                safe_strncpy(codeViewData.prevInputStr, codeViewData.inputStr, sizeof(codeViewData.prevInputStr));
                // clear input line ready for next command
                codeViewData.inputStr[0] = 0;
            }
            break;

        case 0x107:     //backspace (linux)
        case 0x7f:  //backspace in some terminal emulators (linux)
        case 0x08:  // delete
            if (strlen(codeViewData.inputStr)>0) codeViewData.inputStr[strlen(codeViewData.inputStr)-1] = 0;
            break;

        default:
            if ((key>=32) && (key<=128) && (strlen(codeViewData.inputStr)<253)) {
                Bit32u len = strlen(codeViewData.inputStr);
                codeViewData.inputStr[len]  = char(key);
                codeViewData.inputStr[len+1] = 0;
            }
            break;
    }


    return after_traceinto(traceinto_retval);
};









Bitu DEBUG_Loop(void) {
    // chiamata a ripetizione mentre la console è attiva (non "running")

    // visto che DEBUG_CheckKeys non è bloccante, questo loop è in effetti una busywait:
    // SDL_Delay evita cpu load spikes
    SDL_Delay(1); 

//TODO Disable sound
    SRDP_update();

    GFX_Events();

    // Interrupt started ? - then skip it
    // ...credo che si risolva il problema degli interrupts
    // non eseguendoli se arrivano

    PhysPt prev = GetAddress(SegValue(cs),reg_eip);
    PIC_runIRQs();
    PhysPt addr = GetAddress(SegValue(cs),reg_eip);

    if ( addr != prev ){
        CBreakpoint::AddBreakpoint(prev,true);
        CBreakpoint::ActivateAllBreakpoints(true);
        debugging_leave();
        return 0;
    }

    return DEBUG_CheckKeys();
}



static void debugging_leave(){
    debugging=false;
    DOSBOX_SetNormalLoop(); 
}

static void debugging_enter(){
    debugging=true;
    DOSBOX_SetLoop(&DEBUG_Loop);
}




void DEBUG_Enable(bool pressed=true) {
    // invocata quando si preme/rilascia la combo debug-break da dosbox
    // ma anche da DEBUG_EnableDebugger() 
    if(!pressed)return; // ci interessa solo la pressione
    if(debugging)return;
    debugging_enter();
    SetCodeWinStart();
    DEBUG_DrawScreen();
    static bool showhelp=true;
    if(showhelp) { 
        showhelp=false;
        DEBUG_ShowMsg("***| TYPE HELP (+ENTER) TO GET AN OVERVIEW OF ALL COMMANDS |***\n");
    }
    KEYBOARD_ClrBuffer();
}






void DEBUG_DrawScreen(void) {
    DrawData();
    DrawCode();
    DrawRegisters();
    DrawVariables();
}




static void DEBUG_RaiseTimerIrq(void) {
    PIC_ActivateIRQ(0);
}




// Display the content of the MCB chain starting with the MCB at the specified segment.
static void LogMCBChain(Bit16u mcb_segment) {
    DOS_MCB mcb(mcb_segment);
    char filename[9]; // 8 characters plus a terminating NUL
    const char *psp_seg_note;
    PhysPt dataAddr = PhysMake(dataSeg,dataOfs);// location being viewed in the "Data Overview"

    // loop forever, breaking out of the loop once we've processed the last MCB
    while (true) {
        // verify that the type field is valid
        if (mcb.GetType()!=0x4d && mcb.GetType()!=0x5a) {
            LOG(LOG_MISC,LOG_ERROR)("MCB chain broken at %04X:0000!",mcb_segment);
            return;
        }

        mcb.GetFileName(filename);

        // some PSP segment values have special meanings
        switch (mcb.GetPSPSeg()) {
            case MCB_FREE:
                psp_seg_note = "(free)";
                break;
            case MCB_DOS:
                psp_seg_note = "(DOS)";
                break;
            default:
                psp_seg_note = "";
        }

        LOG(LOG_MISC,LOG_ERROR)("   %04X  %12u     %04X %-7s  %s",mcb_segment,mcb.GetSize() << 4,mcb.GetPSPSeg(), psp_seg_note, filename);

        // print a message if dataAddr is within this MCB's memory range
        PhysPt mcbStartAddr = PhysMake(mcb_segment+1,0);
        PhysPt mcbEndAddr = PhysMake(mcb_segment+1+mcb.GetSize(),0);
        if (dataAddr >= mcbStartAddr && dataAddr < mcbEndAddr) {
            LOG(LOG_MISC,LOG_ERROR)("   (data addr %04hX:%04X is %u bytes past this MCB)",dataSeg,dataOfs,dataAddr - mcbStartAddr);
        }

        // if we've just processed the last MCB in the chain, break out of the loop
        if (mcb.GetType()==0x5a) {
            break;
        }
        // else, move to the next MCB in the chain
        mcb_segment+=mcb.GetSize()+1;
        mcb.SetPt(mcb_segment);
    }
}

// Display the content of all Memory Control Blocks.
static void LogMCBS(void)
{
    LOG(LOG_MISC,LOG_ERROR)("MCB Seg  Size (bytes)  PSP Seg (notes)  Filename");
    LOG(LOG_MISC,LOG_ERROR)("Conventional memory:");
    LogMCBChain(dos.firstMCB);

    LOG(LOG_MISC,LOG_ERROR)("Upper memory:");
    LogMCBChain(dos_infoblock.GetStartOfUMBChain());
}

static void LogGDT(void)
{
    char out1[512];
    Descriptor desc;
    Bitu length = cpu.gdt.GetLimit();
    PhysPt address = cpu.gdt.GetBase();
    PhysPt max     = address + length;
    Bitu i = 0;
    LOG(LOG_MISC,LOG_ERROR)("GDT Base:%08X Limit:%08lX",address,length);
    while (address<max) {
        desc.Load(address);
        sprintf(out1,"%04lX: b:%08X type: %02X parbg"
            ,(i<<3)
            ,desc.GetBase()
            ,desc.saved.seg.type
        );
        LOG(LOG_MISC,LOG_ERROR)("%s",out1);
        sprintf(out1,"      l:%08lX dpl : %01X  %1X%1X%1X%1X%1X"
            ,desc.GetLimit()
            ,desc.saved.seg.dpl
            ,desc.saved.seg.p
            ,desc.saved.seg.avl
            ,desc.saved.seg.r
            ,desc.saved.seg.big
            ,desc.saved.seg.g
        );
        LOG(LOG_MISC,LOG_ERROR)("%s",out1);
        address+=8; i++;
    };
};

static void LogLDT(void) {
    char out1[512];
    Descriptor desc;
    Bitu ldtSelector = cpu.gdt.SLDT();
    if (!cpu.gdt.GetDescriptor(ldtSelector,desc)) return;
    Bitu length = desc.GetLimit();
    PhysPt address = desc.GetBase();
    PhysPt max     = address + length;
    Bitu i = 0;
    LOG(LOG_MISC,LOG_ERROR)("LDT Base:%08X Limit:%08lX",address,length);
    while (address<max) {
        desc.Load(address);
        sprintf(out1,"%04lX: b:%08X type: %02X parbg"
            ,(i<<3)|4
            ,desc.GetBase()
            ,desc.saved.seg.type
        );
        LOG(LOG_MISC,LOG_ERROR)("%s",out1);
        sprintf(out1,"      l:%08lX dpl : %01X  %1X%1X%1X%1X%1X"
            ,desc.GetLimit()
            ,desc.saved.seg.dpl
            ,desc.saved.seg.p
            ,desc.saved.seg.avl
            ,desc.saved.seg.r
            ,desc.saved.seg.big
            ,desc.saved.seg.g
        );
        LOG(LOG_MISC,LOG_ERROR)("%s",out1);
        address+=8; i++;
    };
};

static void LogIDT(void) {
    char out1[512];
    Descriptor desc;
    Bitu address = 0;
    while (address<256*8) {
        if (cpu.idt.GetDescriptor(address,desc)) {
            sprintf(out1,"%04lX: sel:%04lX off:%02lX",address/8,desc.GetSelector(),desc.GetOffset());
            LOG(LOG_MISC,LOG_ERROR)("%s",out1);
        }
        address+=8;
    };
};

void LogPages(char* selname) {
    char out1[512];
    if (paging.enabled) {
        Bitu sel = GetHexValue(selname,selname);
        if ((sel==0x00) && ((*selname==0) || (*selname=='*'))) {
            for (int i=0; i<0xfffff; i++) {
                Bitu table_addr=(paging.base.page<<12)+(i >> 10)*4;
                X86PageEntry table;
                table.load=phys_readd(table_addr);
                if (table.block.p) {
                    X86PageEntry entry;
                    Bitu entry_addr=(table.block.base<<12)+(i & 0x3ff)*4;
                    entry.load=phys_readd(entry_addr);
                    if (entry.block.p) {
                        sprintf(out1,"page %05Xxxx -> %04Xxxx  flags [uw] %x:%x::%x:%x [d=%x|a=%x]",
                            i,entry.block.base,entry.block.us,table.block.us,
                            entry.block.wr,table.block.wr,entry.block.d,entry.block.a);
                        LOG(LOG_MISC,LOG_ERROR)("%s",out1);
                    }
                }
            }
        } else {
            Bitu table_addr=(paging.base.page<<12)+(sel >> 10)*4;
            X86PageEntry table;
            table.load=phys_readd(table_addr);
            if (table.block.p) {
                X86PageEntry entry;
                Bitu entry_addr=(table.block.base<<12)+(sel & 0x3ff)*4;
                entry.load=phys_readd(entry_addr);
                sprintf(out1,"page %05lXxxx -> %04Xxxx  flags [puw] %x:%x::%x:%x::%x:%x"
                    ,sel
                    ,entry.block.base
                    ,entry.block.p
                    ,table.block.p
                    ,entry.block.us
                    ,table.block.us
                    ,entry.block.wr
                    ,table.block.wr
                );
                LOG(LOG_MISC,LOG_ERROR)("%s",out1);
            } else {
                sprintf(out1,"pagetable %03lX not present, flags [puw] %x::%x::%x"
                    ,(sel >> 10)
                    ,table.block.p
                    ,table.block.us
                    ,table.block.wr
                );
                LOG(LOG_MISC,LOG_ERROR)("%s",out1);
            }
        }
    }
};

static void LogCPUInfo(void) {
    char out1[512];
    sprintf(out1,"cr0:%08lX cr2:%08lX cr3:%08lX  cpl=%lx",cpu.cr0,paging.cr2,paging.cr3,cpu.cpl);
    LOG(LOG_MISC,LOG_ERROR)("%s",out1);
    sprintf(out1,"eflags:%08lX [vm=%lx iopl=%lx nt=%lx]",reg_flags,GETFLAG(VM)>>17,GETFLAG(IOPL)>>12,GETFLAG(NT)>>14);
    LOG(LOG_MISC,LOG_ERROR)("%s",out1);
    sprintf(out1,"GDT base=%08X limit=%08lX",cpu.gdt.GetBase(),cpu.gdt.GetLimit());
    LOG(LOG_MISC,LOG_ERROR)("%s",out1);
    sprintf(out1,"IDT base=%08X limit=%08lX",cpu.idt.GetBase(),cpu.idt.GetLimit());
    LOG(LOG_MISC,LOG_ERROR)("%s",out1);

    Bitu sel=CPU_STR();
    Descriptor desc;
    if (cpu.gdt.GetDescriptor(sel,desc)) {
        sprintf(out1,"TR selector=%04lX, base=%08X limit=%08lX*%X"
            ,sel
            ,desc.GetBase()
            ,desc.GetLimit()
            ,desc.saved.seg.g?0x4000:1
        );
        LOG(LOG_MISC,LOG_ERROR)("%s",out1);
    }
    sel=CPU_SLDT();
    if (cpu.gdt.GetDescriptor(sel,desc)) {
        sprintf(out1,"LDT selector=%04lX, base=%08X limit=%08lX*%X"
            ,sel
            ,desc.GetBase()
            ,desc.GetLimit()
            ,desc.saved.seg.g?0x4000:1
        );
        LOG(LOG_MISC,LOG_ERROR)("%s",out1);
    }
};






#if C_HEAVY_DEBUG

static void LogInstruction(Bit16u segValue, Bit32u eipValue,  ofstream& out) {
    static char empty[23] = { 32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,0 };

    PhysPt start = GetAddress(segValue,eipValue);
    char dline[200];Bitu size;
    size = DasmI386(dline, start, reg_eip, cpu.code.big);
    char* res = empty;
    if (showExtend && (cpuLogType > 0) ) {
        res = AnalyzeInstruction(dline,false);
        if (!res || !(*res)) res = empty;
        Bitu reslen = strlen(res);
        if (reslen<22) for (Bitu i=0; i<22-reslen; i++) res[reslen+i] = ' '; res[22] = 0;
    };
    Bitu len = strlen(dline);
    if (len<30) for (Bitu i=0; i<30-len; i++) dline[len + i] = ' '; dline[30] = 0;

    // Get register values

    if(cpuLogType == 0) {
        out << setw(4) << SegValue(cs) << ":" << setw(4) << reg_eip << "  " << dline;
    } else if (cpuLogType == 1) {
        out << setw(4) << SegValue(cs) << ":" << setw(8) << reg_eip << "  " << dline << "  " << res;
    } else if (cpuLogType == 2) {
        char ibytes[200]="";    char tmpc[200];
        for (Bitu i=0; i<size; i++) {
            Bit8u value;
            if (mem_readb_checked(start+i,&value)) sprintf(tmpc,"?? ");
            else sprintf(tmpc,"%02X ",value);
            strcat(ibytes,tmpc);
        }
        len = strlen(ibytes);
        if (len<21) { for (Bitu i=0; i<21-len; i++) ibytes[len + i] =' '; ibytes[21]=0;} //NOTE THE BRACKETS
        out << setw(4) << SegValue(cs) << ":" << setw(8) << reg_eip << "  " << dline << "  " << res << "  " << ibytes;
    }
   
    out << " EAX:" << setw(8) << reg_eax << " EBX:" << setw(8) << reg_ebx 
        << " ECX:" << setw(8) << reg_ecx << " EDX:" << setw(8) << reg_edx
        << " ESI:" << setw(8) << reg_esi << " EDI:" << setw(8) << reg_edi 
        << " EBP:" << setw(8) << reg_ebp << " ESP:" << setw(8) << reg_esp 
        << " DS:"  << setw(4) << SegValue(ds)<< " ES:"  << setw(4) << SegValue(es);

    if(cpuLogType == 0) {
        out << " SS:"  << setw(4) << SegValue(ss) << " C"  << (get_CF()>0)  << " Z"   << (get_ZF()>0)  
            << " S" << (get_SF()>0) << " O"  << (get_OF()>0) << " I"  << GETFLAGBOOL(IF);
    } else {
        out << " FS:"  << setw(4) << SegValue(fs) << " GS:"  << setw(4) << SegValue(gs)
            << " SS:"  << setw(4) << SegValue(ss)
            << " CF:"  << (get_CF()>0)  << " ZF:"   << (get_ZF()>0)  << " SF:"  << (get_SF()>0)
            << " OF:"  << (get_OF()>0)  << " AF:"   << (get_AF()>0)  << " PF:"  << (get_PF()>0)
            << " IF:"  << GETFLAGBOOL(IF);
    }
    if(cpuLogType == 2) {
        out << " TF:" << GETFLAGBOOL(TF) << " VM:" << GETFLAGBOOL(VM) <<" FLG:" << setw(8) << reg_flags 
            << " CR0:" << setw(8) << cpu.cr0;   
    }
    out << endl;
};
#endif

// DEBUG.COM stuff

class DEBUG : public Program {
public:
    DEBUG()     { pDebugcom = this; active = false; };
    ~DEBUG()    { pDebugcom = 0; };

    bool IsActive() { return active; };

    void Run(void)
    {
        if(cmd->FindExist("/NOMOUSE",false)) {
                real_writed(0,0x33<<2,0);
            return;
        }
       
        char filename[128];
        char args[256+1];
    
        cmd->FindCommand(1,temp_line);
        safe_strncpy(filename,temp_line.c_str(),128);
        // Read commandline
        Bit16u i    =2;
        bool ok     = false; 
        args[0]     = 0;
        for (;cmd->FindCommand(i++,temp_line)==true;) {
            strncat(args,temp_line.c_str(),256);
            strncat(args," ",256);
        }
        // Start new shell and execute prog     
        active = true;
        // Save cpu state....
        Bit16u oldcs    = SegValue(cs);
        Bit32u oldeip   = reg_eip;  
        Bit16u oldss    = SegValue(ss);
        Bit32u oldesp   = reg_esp;

        // Start shell
        DOS_Shell shell;
        shell.Execute(filename,args);

        // set old reg values
        SegSet16(ss,oldss);
        reg_esp = oldesp;
        SegSet16(cs,oldcs);
        reg_eip = oldeip;
    };

private:
    bool    active;
};

void DEBUG_CheckExecuteBreakpoint(Bit16u seg, Bit32u off)
{
    if (pDebugcom && pDebugcom->IsActive()) {
        CBreakpoint::AddBreakpoint(seg,off,true);       
        CBreakpoint::ActivateAllBreakpoints(true); 
        pDebugcom = 0;
    };
};

Bitu DEBUG_EnableDebugger(void)
{
    // invocata dai cpu loops quando si attiva un breakpoint
    exitLoop = true;
    CPU_Cycles=CPU_CycleLeft=0;
    DEBUG_Enable();
    return 0;
};

static void DEBUG_ProgramStart(Program * * make) {
    *make=new DEBUG;
}

// INIT 

void DEBUG_SetupConsole(void) {
    #ifdef WIN32
    WIN32_Console();
    #else
    tcgetattr(0,&consolesettings);
    printf("\e[8;50;80t"); //resize terminal
    fflush(NULL);
    #endif  
    memset((void *)&dbg,0,sizeof(dbg));
    debugging=false;
    dbg.active_win=3;
    input_count=0;
    /* Start the Debug Gui */
    DBGUI_StartUp();
}

static void DEBUG_ShutDown(Section * /*sec*/) {
    CBreakpoint::DeleteAll();
    CDebugVar::DeleteAll();
    curs_set(old_cursor_state);
    #ifndef WIN32
    tcsetattr(0, TCSANOW,&consolesettings);
//  printf("\e[0m\e[2J"); //Seems to destroy scrolling
    printf("\ec");
    fflush(NULL);
    #endif
}









void DEBUG_Init(Section* sec) {

    MSG_Add("DEBUG_CONFIGFILE_HELP","Debugger related options.\n");
    DEBUG_DrawScreen();
    /* Add some keyhandlers */
    MAPPER_AddHandler(DEBUG_Enable,MK_pause,MMOD2,"debugger","Debugger");
    /* Clear the TBreakpoint list */
    memset((void*)&codeViewData,0,sizeof(codeViewData));
    /* setup debug.com */
    PROGRAMS_MakeFile("DEBUG.COM",DEBUG_ProgramStart);
    /* Setup callback */
    debugCallback=CALLBACK_Allocate();
    CALLBACK_Setup(debugCallback,DEBUG_EnableDebugger,CB_RETF,"debugger");
    /* shutdown function */
    sec->AddDestroyFunction(&DEBUG_ShutDown);
    SRDP_init();
}




// DEBUGGING VAR STUFF

void CDebugVar::InsertVariable(char* name, PhysPt adr)
{
    varList.push_back(new CDebugVar(name,adr));
};

void CDebugVar::DeleteAll(void) 
{
    std::list<CDebugVar*>::iterator i;
    CDebugVar* bp;
    for(i=varList.begin(); i != varList.end(); i++) {
        bp = static_cast<CDebugVar*>(*i);
        delete bp;
    };
    (varList.clear)();
};

CDebugVar* CDebugVar::FindVar(PhysPt pt)
{
    std::list<CDebugVar*>::iterator i;
    CDebugVar* bp;
    for(i=varList.begin(); i != varList.end(); i++) {
        bp = static_cast<CDebugVar*>(*i);
        if (bp->GetAdr()==pt) return bp;
    };
    return 0;
};

bool CDebugVar::SaveVars(char* name)
{
    FILE* f = fopen(name,"wb+");
    if (!f) return false;
    if (varList.size()>65535) return false;

    // write number of vars
    Bit16u num = (Bit16u)varList.size();
    fwrite(&num,1,sizeof(num),f);

    std::list<CDebugVar*>::iterator i;
    CDebugVar* bp;
    for(i=varList.begin(); i != varList.end(); i++) {
        bp = static_cast<CDebugVar*>(*i);
        // name
        fwrite(bp->GetName(),1,16,f);
        // adr
        PhysPt adr = bp->GetAdr();
        fwrite(&adr,1,sizeof(adr),f);
    };
    fclose(f);
    return true;
};

bool CDebugVar::LoadVars(char* name)
{
    FILE* f = fopen(name,"rb");
    if (!f) return false;

    // read number of vars
    Bit16u num;
    if (fread(&num,sizeof(num),1,f) != 1) return false;

    for (Bit16u i=0; i<num; i++) {
        char name[16];
        // name
        if (fread(name,16,1,f) != 1) break;
        // adr
        PhysPt adr;
        if (fread(&adr,sizeof(adr),1,f) != 1) break;
        // insert
        InsertVariable(name,adr);
    };
    fclose(f);
    return true;
};

static void SaveMemory(Bit16u seg, Bit32u ofs1, Bit32u num) {
    FILE* f = fopen("MEMDUMP.TXT","wt");
    if (!f) {
        DEBUG_ShowMsg("DEBUG: Memory dump failed.\n");
        return;
    }
    
    char buffer[128];
    char temp[16];

    while (num>16) {
        sprintf(buffer,"%04X:%04X   ",seg,ofs1);
        for (Bit16u x=0; x<16; x++) {
            Bit8u value;
            if (mem_readb_checked(GetAddress(seg,ofs1+x),&value)) sprintf(temp,"?? ");
            else sprintf(temp,"%02X ",value);
            strcat(buffer,temp);
        }
        ofs1+=16;
        num-=16;

        fprintf(f,"%s\n",buffer);
    }
    if (num>0) {
        sprintf(buffer,"%04X:%04X   ",seg,ofs1);
        for (Bit16u x=0; x<num; x++) {
            Bit8u value;
            if (mem_readb_checked(GetAddress(seg,ofs1+x),&value)) sprintf(temp,"?? ");
            else sprintf(temp,"%02X ",value);
            strcat(buffer,temp);
        }
        fprintf(f,"%s\n",buffer);
    }
    fclose(f);
    DEBUG_ShowMsg("DEBUG: Memory dump success.\n");
}

static void SaveMemoryBin(Bit16u seg, Bit32u ofs1, Bit32u num) {
    FILE* f = fopen("MEMDUMP.BIN","wb");
    if (!f) {
        DEBUG_ShowMsg("DEBUG: Memory binary dump failed.\n");
        return;
    }

    for (Bitu x = 0; x < num;x++) {
        Bit8u val;
        if (mem_readb_checked(GetAddress(seg,ofs1+x),&val)) val=0;
        fwrite(&val,1,1,f);
    }

    fclose(f);
    DEBUG_ShowMsg("DEBUG: Memory dump binary success.\n");
}

static void OutputVecTable(char* filename) {
    FILE* f = fopen(filename, "wt");
    if (!f)
    {
        DEBUG_ShowMsg("DEBUG: Output of interrupt vector table failed.\n");
        return;
    }

    for (int i=0; i<256; i++)
        fprintf(f,"INT %02X:  %04X:%04X\n", i, mem_readw(i*4+2), mem_readw(i*4));

    fclose(f);
    DEBUG_ShowMsg("DEBUG: Interrupt vector table written to %s.\n", filename);
}

#define DEBUG_VAR_BUF_LEN 16
static void DrawVariables(void) {
    if (CDebugVar::varList.empty()) return;

    std::list<CDebugVar*>::iterator i;
    CDebugVar *dv;
    char buffer[DEBUG_VAR_BUF_LEN];

    int idx = 0;
    for(i=CDebugVar::varList.begin(); i != CDebugVar::varList.end(); i++, idx++) {

        if (idx == 4*3) {
            /* too many variables */
            break;
        }

        dv = static_cast<CDebugVar*>(*i);

        Bit16u value;
        if (mem_readw_checked(dv->GetAdr(),&value))
            snprintf(buffer,DEBUG_VAR_BUF_LEN, "??????");
        else
            snprintf(buffer,DEBUG_VAR_BUF_LEN, "0x%04x", value);

        int y = idx / 3;
        int x = (idx % 3) * 26;
        mvwprintw(dbg.win_var, y, x, dv->GetName());
        mvwprintw(dbg.win_var, y,  (x + DEBUG_VAR_BUF_LEN + 1) , buffer);
    }

    wrefresh(dbg.win_var);
};
#undef DEBUG_VAR_BUF_LEN
// HEAVY DEBUGGING STUFF

#if C_HEAVY_DEBUG

const Bit32u LOGCPUMAX = 20000;

static Bit16u logCpuCS [LOGCPUMAX];
static Bit32u logCpuEIP[LOGCPUMAX];
static Bit32u logCount = 0;

struct TLogInst {
    Bit16u s_cs;
    Bit32u eip;
    Bit32u eax;
    Bit32u ebx;
    Bit32u ecx;
    Bit32u edx;
    Bit32u esi;
    Bit32u edi;
    Bit32u ebp;
    Bit32u esp;
    Bit16u s_ds;
    Bit16u s_es;
    Bit16u s_fs;
    Bit16u s_gs;
    Bit16u s_ss;
    bool c;
    bool z;
    bool s;
    bool o;
    bool a;
    bool p;
    bool i;
    char dline[31];
    char res[23];
};

TLogInst logInst[LOGCPUMAX];

void DEBUG_HeavyLogInstruction(void) {

    static char empty[23] = { 32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,0 };

    PhysPt start = GetAddress(SegValue(cs),reg_eip);
    char dline[200];
    Bitu size = DasmI386(dline, start, reg_eip, cpu.code.big);
    char* res = empty;
    if (showExtend) {
        res = AnalyzeInstruction(dline,false);
        if (!res || !(*res)) res = empty;
        Bitu reslen = strlen(res);
        if (reslen<22) for (Bitu i=0; i<22-reslen; i++) res[reslen+i] = ' '; res[22] = 0;
    };

    Bitu len = strlen(dline);
    if (len < 30) for (Bitu i=0; i < 30-len; i++) dline[len+i] = ' ';
    dline[30] = 0;

    TLogInst & inst = logInst[logCount];
    strcpy(inst.dline,dline);
    inst.s_cs = SegValue(cs);
    inst.eip  = reg_eip;
    strcpy(inst.res,res);
    inst.eax  = reg_eax;
    inst.ebx  = reg_ebx;
    inst.ecx  = reg_ecx;
    inst.edx  = reg_edx;
    inst.esi  = reg_esi;
    inst.edi  = reg_edi;
    inst.ebp  = reg_ebp;
    inst.esp  = reg_esp;
    inst.s_ds = SegValue(ds);
    inst.s_es = SegValue(es);
    inst.s_fs = SegValue(fs);
    inst.s_gs = SegValue(gs);
    inst.s_ss = SegValue(ss);
    inst.c    = get_CF()>0;
    inst.z    = get_ZF()>0;
    inst.s    = get_SF()>0;
    inst.o    = get_OF()>0;
    inst.a    = get_AF()>0;
    inst.p    = get_PF()>0;
    inst.i    = GETFLAGBOOL(IF);

    if (++logCount >= LOGCPUMAX) logCount = 0;
};

void DEBUG_HeavyWriteLogInstruction(void) {
    if (!logHeavy) return;
    logHeavy = false;
    
    DEBUG_ShowMsg("DEBUG: Creating cpu log LOGCPU_INT_CD.TXT\n");

    ofstream out("LOGCPU_INT_CD.TXT");
    if (!out.is_open()) {
        DEBUG_ShowMsg("DEBUG: Failed.\n");  
        return;
    }
    out << hex << noshowbase << setfill('0') << uppercase;
    Bit32u startLog = logCount;
    do {
        // Write Intructions
        TLogInst & inst = logInst[startLog];
        out << setw(4) << inst.s_cs << ":" << setw(8) << inst.eip << "  " 
            << inst.dline << "  " << inst.res << " EAX:" << setw(8)<< inst.eax
            << " EBX:" << setw(8) << inst.ebx << " ECX:" << setw(8) << inst.ecx
            << " EDX:" << setw(8) << inst.edx << " ESI:" << setw(8) << inst.esi
            << " EDI:" << setw(8) << inst.edi << " EBP:" << setw(8) << inst.ebp
            << " ESP:" << setw(8) << inst.esp << " DS:"  << setw(4) << inst.s_ds
            << " ES:"  << setw(4) << inst.s_es<< " FS:"  << setw(4) << inst.s_fs
            << " GS:"  << setw(4) << inst.s_gs<< " SS:"  << setw(4) << inst.s_ss
            << " CF:"  << inst.c  << " ZF:"   << inst.z  << " SF:"  << inst.s
            << " OF:"  << inst.o  << " AF:"   << inst.a  << " PF:"  << inst.p
            << " IF:"  << inst.i  << endl;

/*      fprintf(f,"%04X:%08X   %s  %s  EAX:%08X EBX:%08X ECX:%08X EDX:%08X ESI:%08X EDI:%08X EBP:%08X ESP:%08X DS:%04X ES:%04X FS:%04X GS:%04X SS:%04X CF:%01X ZF:%01X SF:%01X OF:%01X AF:%01X PF:%01X IF:%01X\n",
            logInst[startLog].s_cs,logInst[startLog].eip,logInst[startLog].dline,logInst[startLog].res,logInst[startLog].eax,logInst[startLog].ebx,logInst[startLog].ecx,logInst[startLog].edx,logInst[startLog].esi,logInst[startLog].edi,logInst[startLog].ebp,logInst[startLog].esp,
                logInst[startLog].s_ds,logInst[startLog].s_es,logInst[startLog].s_fs,logInst[startLog].s_gs,logInst[startLog].s_ss,
                logInst[startLog].c,logInst[startLog].z,logInst[startLog].s,logInst[startLog].o,logInst[startLog].a,logInst[startLog].p,logInst[startLog].i);*/
        if (++startLog >= LOGCPUMAX) startLog = 0;
    } while (startLog != logCount);
    
    out.close();
    DEBUG_ShowMsg("DEBUG: Done.\n");    
};





bool DEBUG_HeavyIsBreakpoint(void) {
    static Bitu zero_count = 0;
    if (cpuLog) {
        if (cpuLogCounter>0) {
            LogInstruction(SegValue(cs),reg_eip,cpuLogFile);
            cpuLogCounter--;
        }
        if (cpuLogCounter<=0) {
            cpuLogFile.close();
            DEBUG_ShowMsg("DEBUG: cpu log LOGCPU.TXT created\n");
            cpuLog = false;
            DEBUG_EnableDebugger();
            return true;
        }
    }
    // LogInstruction
    if (logHeavy) DEBUG_HeavyLogInstruction();
    if (zeroProtect) {
        Bit32u value=0;
        if (!mem_readd_checked(SegPhys(cs)+reg_eip,&value)) {
            if (value == 0) zero_count++;
            else zero_count = 0;
        }
        if (GCC_UNLIKELY(zero_count == 10)) E_Exit("running zeroed code");
    }

    if (skipFirstInstruction) {
        skipFirstInstruction = false;
        return false;
    }
    if (CBreakpoint::CheckBreakpoint(SegValue(cs),reg_eip)) {
        return true;    
    }
    return false;
}

#endif // HEAVY DEBUG






// entrypoints per le varie azioni
// l'idea è di avere delle fn entrocontenute che facciano quello che dicono
// dovunque le si invochi

void DEBUG_TraceInto_standalone(){
    // replica gli stessi effetti dell'azione invocata da console
    after_traceinto(TraceInto());
}

void DEBUG_StepOver_standalone(){
    // replica gli stessi effetti dell'azione invocata da console
    if(StepOver())return;
    after_traceinto(TraceInto());
}

void DEBUG_breakpoint_clear_all(){
    CBreakpoint::DeleteAll();
}

void DEBUG_set_breakpoint_standalone( PhysPt addr ){
    if (CBreakpoint::IsBreakpoint(addr))return;
    CBreakpoint::AddBreakpoint(addr,false);
}

void DEBUG_run_standalone(){
    run_program();
    after_traceinto(0);
}


#endif // DEBUG


