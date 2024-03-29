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


enum EBreakpoint {
    BKPNT_UNKNOWN,
    BKPNT_PHYSICAL,
    BKPNT_INTERRUPT,
    BKPNT_MEMORY,
    BKPNT_MEMORY_PROT,
    BKPNT_MEMORY_LINEAR
};

#define BPINT_ALL 0x100

class CBreakpoint
{
public:

    CBreakpoint(void);
    void SetAddress (Bit16u seg, Bit32u off) { SetAddress(GetAddress(seg,off)); segment = seg; offset = off; };
    void SetAddress (PhysPt addr)            { location = addr; type = BKPNT_PHYSICAL; };

    void                    SetInt          (Bit8u _intNr, Bit16u ah)   { intNr   = _intNr, ahValue = ah; type = BKPNT_INTERRUPT; };
    void                    SetOnce         (bool _once)                { once    = _once; };
    void                    SetType         (EBreakpoint _type)         { type    = _type; };
    void                    SetValue        (Bit8u value)               { ahValue = value; };

    bool                    IsActive        (void)                      { return active; };
    void                    Activate        (bool _active);

    EBreakpoint             GetType         (void)                      { return type; };
    bool                    GetOnce         (void)                      { return once; };
    PhysPt                  GetLocation     (void)                      { if (GetType()!=BKPNT_INTERRUPT)   return location;    else return 0; };
    Bit16u                  GetSegment      (void)                      { return segment; };
    Bit32u                  GetOffset       (void)                      { return offset; };
    Bit8u                   GetIntNr        (void)                      { if (GetType()==BKPNT_INTERRUPT)   return intNr;       else return 0; };
    Bit16u                  GetValue        (void)                      { if (GetType()!=BKPNT_PHYSICAL)    return ahValue;     else return 0; };

    // statics
    static CBreakpoint*     AddBreakpoint       (Bit16u seg, Bit32u off, bool once){ return AddBreakpoint(GetAddress(seg,off),once);}
    static CBreakpoint*     AddBreakpoint       (PhysPt addr, bool once);
    static CBreakpoint*     AddIntBreakpoint    (Bit8u intNum, Bit16u ah, bool once);
    static CBreakpoint*     AddMemBreakpoint    (Bit16u seg, Bit32u off);
    static void             ActivateAllBreakpoints (bool yes_no );
    static bool             CheckBreakpoint     (PhysPt addr);
    static bool             CheckBreakpoint     (Bitu seg, Bitu off) { return CheckBreakpoint(GetAddress(seg,off)); }
    static bool             CheckIntBreakpoint  (PhysPt addr, Bit8u intNr, Bit16u ahValue);
    static bool             IsBreakpoint        (PhysPt where);
    static bool             IsBreakpointDrawn   (PhysPt where);
    static bool             DeleteBreakpoint    (PhysPt where);
    static bool             DeleteByIndex       (Bit16u index);
    static void             DeleteAll           (void);
    static void             ShowList            (void);


private:
    EBreakpoint type;
    // Physical
    PhysPt      location;
    Bit8u       oldData;
    Bit16u      segment;
    Bit32u      offset;
    // Int
    Bit8u       intNr;
    Bit16u      ahValue;
    // Shared
    bool        active;
    bool        once;

    static std::list<CBreakpoint*>  BPoints;
public:
    static CBreakpoint*             ignoreOnce;
};




std::list<CBreakpoint*> CBreakpoint::BPoints;
CBreakpoint*            CBreakpoint::ignoreOnce = 0;




static Bitu ignoreAddressOnce = 0;

bool check_ignoreAddressOnce( PhysPt addr ){
    if ((ignoreAddressOnce!=0) && (addr==ignoreAddressOnce)) {
        ignoreAddressOnce = 0;
        return true;
    }
    ignoreAddressOnce = 0;
    return false;
}






CBreakpoint::CBreakpoint(void):
    location(0),
    active(false),once(false),
    segment(0),offset(0),intNr(0),ahValue(0),
    type(BKPNT_UNKNOWN) { };




void CBreakpoint::Activate(bool yes_no)
{
#if !C_HEAVY_DEBUG
    if (GetType()==BKPNT_PHYSICAL) {
        if (yes_no) {
            // Set 0xCC and save old value
            Bit8u data = mem_readb(location);
            if (data!=0xCC) {
                oldData = data;
                mem_writeb(location,0xCC);
            };
        } else {
            // Remove 0xCC and set old value
            if (mem_readb (location)==0xCC) {
                mem_writeb(location,oldData);
            };
        }
    }
#endif
    active = yes_no;
};




CBreakpoint* CBreakpoint::AddBreakpoint( PhysPt addr, bool once)
{
    CBreakpoint* bp = new CBreakpoint();
    bp->SetAddress      (addr);
    bp->SetOnce         (once);
    BPoints.push_front  (bp);
    return bp;
};

CBreakpoint* CBreakpoint::AddIntBreakpoint(Bit8u intNum, Bit16u ah, bool once)
{
    CBreakpoint* bp = new CBreakpoint();
    bp->SetInt          (intNum,ah);
    bp->SetOnce         (once);
    BPoints.push_front  (bp);
    return bp;
};

CBreakpoint* CBreakpoint::AddMemBreakpoint(Bit16u seg, Bit32u off)
{
    CBreakpoint* bp = new CBreakpoint();
    bp->SetAddress      (seg,off);
    bp->SetOnce         (false);
    bp->SetType         (BKPNT_MEMORY);
    BPoints.push_front  (bp);
    return bp;
};



void CBreakpoint::ActivateAllBreakpoints(bool yes_no)
{
    // activate all breakpoints
    for( auto i=BPoints.begin(); i != BPoints.end(); i++) {
        CBreakpoint* bp = (*i);

//        // a quanto pare questo snippet provoca un crash all'atto di 
//        // uno stepover su call (sospetto anche su int, rep e loop )
//        // un crash mascherato da uscita regolare (per lo meno, cosi dice gdb)
//        // lo lascio per documentazione
//
//        // Do not activate, when bp is an actual address
//        if (activate && (bp->GetType()==BKPNT_PHYSICAL) && (bp->GetLocation()==addr)) {
//            // Do not activate :)
//            continue;
//        }

        bp->Activate(yes_no); 
    };
};


bool CBreakpoint::CheckBreakpoint( PhysPt addr )
// Checks if breakpoint is valid an should stop execution
{
    if(check_ignoreAddressOnce(addr))return false;

    // Search matching breakpoint
    for( auto i=BPoints.begin(); i != BPoints.end(); i++) {
        CBreakpoint* bp = (*i);
        if ((bp->GetType()==BKPNT_PHYSICAL) && bp->IsActive() && (bp->GetLocation()==addr)) {
            // Ignore Once ?
            if (ignoreOnce==bp) {
                ignoreOnce=0;
                bp->Activate(true);
                return false;
            };
            // Found, 
            if (bp->GetOnce()) {
                // delete it, if it should only be used once
                BPoints.erase(i);
                // bp->Activate(false); // prima del delete è inutile
                delete bp;
            } else {
                ignoreOnce = bp;
            };
            return true;
        } 
#if C_HEAVY_DEBUG
        // Memory breakpoint support
        else if (bp->IsActive()) {
            if ((bp->GetType()==BKPNT_MEMORY) || (bp->GetType()==BKPNT_MEMORY_PROT) || (bp->GetType()==BKPNT_MEMORY_LINEAR)) {
                // Watch Protected Mode Memoryonly in pmode
                if (bp->GetType()==BKPNT_MEMORY_PROT) {
                    // Check if pmode is active
                    if (!cpu.pmode) return false;
                    // Check if descriptor is valid
                    Descriptor desc;
                    if (!cpu.gdt.GetDescriptor(bp->GetSegment(),desc)) return false;
                    if (desc.GetLimit()==0) return false;
                }

                Bitu address; 
                if (bp->GetType()==BKPNT_MEMORY_LINEAR) address = bp->GetOffset();
                else address = GetAddress(bp->GetSegment(),bp->GetOffset());
                Bit8u value=0;
                if (mem_readb_checked(address,&value)) return false;
                if (bp->GetValue() != value) {
                    // Yup, memory value changed
                    DEBUG_ShowMsg("DEBUG: Memory breakpoint %s: %04X:%04X - %02X -> %02X\n",(bp->GetType()==BKPNT_MEMORY_PROT)?"(Prot)":"",bp->GetSegment(),bp->GetOffset(),bp->GetValue(),value);
                    bp->SetValue(value);
                    return true;
                };      
            }       
        };
#endif
    };
    return false;
};

bool CBreakpoint::CheckIntBreakpoint(PhysPt addr, Bit8u intNr, Bit16u ahValue)
// Checks if interrupt breakpoint is valid an should stop execution
{
    if(check_ignoreAddressOnce(addr))return false;

    // Search matching breakpoint
    for( auto i=BPoints.begin(); i != BPoints.end(); i++) {
        CBreakpoint* bp = (*i);
        if ((bp->GetType()==BKPNT_INTERRUPT) && bp->IsActive() && (bp->GetIntNr()==intNr)) {
            if ((bp->GetValue()==BPINT_ALL) || (bp->GetValue()==ahValue)) {
                // Ignoie it once ?
                if (ignoreOnce==bp) {
                    ignoreOnce=0;
                    bp->Activate(true);
                    return false;
                };
                // Found
                if (bp->GetOnce()) {
                    // delete it, if it should only be used once
                    BPoints.erase(i);
                    // bp->Activate(false); // prima del delete è inutile
                    delete bp;
                } else {
                    ignoreOnce = bp;
                }
                return true;
            }
        };
    };
    return false;
};

void CBreakpoint::DeleteAll() 
{
    for( auto i=BPoints.begin(); i != BPoints.end(); i++) {
        CBreakpoint* bp = (*i);
        // bp->Activate(false); // prima del delete è inutile
        delete bp;
    };
    (BPoints.clear)();
};


bool CBreakpoint::DeleteByIndex(Bit16u index) 
{
    // Search matching breakpoint
    int nr = 0;
    for( auto i=BPoints.begin(); i != BPoints.end(); i++, nr++ ) {
        if (nr!=index) continue;
        CBreakpoint* bp = (*i);
        BPoints.erase(i);
        // bp->Activate(false); // prima del delete è inutile
        delete bp;
        return true;
    };
    return false;
};

bool CBreakpoint::DeleteBreakpoint(PhysPt where) 
{
    // Search matching breakpoint
    for( auto i=BPoints.begin(); i != BPoints.end(); i++) {
        CBreakpoint* bp = (*i);
        if ((bp->GetType()==BKPNT_PHYSICAL) && (bp->GetLocation()==where)) {
            BPoints.erase(i);
            // bp->Activate(false); // prima del delete è inutile
            delete bp;
            return true;
        }
    };
    return false;
};

bool CBreakpoint::IsBreakpoint(PhysPt addr) 
// is there a breakpoint at address ?
{
    // Search matching breakpoint
    for( auto i=BPoints.begin(); i != BPoints.end(); i++) {
        CBreakpoint* bp = (*i);
        if ((bp->GetType()==BKPNT_PHYSICAL) && (bp->GetSegment()==addr)) {
            return true;
        };
        if ((bp->GetType()==BKPNT_PHYSICAL) && (bp->GetLocation()==addr)) {
            return true;
        };
    };
    return false;
};

bool CBreakpoint::IsBreakpointDrawn(PhysPt addr) 
// valid breakpoint, that should be drawn ?
{
    // Search matching breakpoint
    for( auto i=BPoints.begin(); i != BPoints.end(); i++) {
        CBreakpoint* bp = (*i);
        if ((bp->GetType()==BKPNT_PHYSICAL) && (bp->GetLocation()==addr)) {
            // Only draw, if breakpoint is not only once, 
            return !bp->GetOnce();
        };
    };
    return false;
};

void CBreakpoint::ShowList(void)
{
    // iterate list 
    int nr = 0;
    for( auto i=BPoints.begin(); i != BPoints.end(); i++, nr++ ) {
        CBreakpoint* bp = (*i);
        if (bp->GetType()==BKPNT_PHYSICAL) {
            DEBUG_ShowMsg("%02X. BP %04X:%04X\n",nr,bp->GetSegment(),bp->GetOffset());
        } else if (bp->GetType()==BKPNT_INTERRUPT) {
            if (bp->GetValue()==BPINT_ALL)  DEBUG_ShowMsg("%02X. BPINT %02X\n",nr,bp->GetIntNr());                  
            else                            DEBUG_ShowMsg("%02X. BPINT %02X AH=%02X\n",nr,bp->GetIntNr(),bp->GetValue());
        } else if (bp->GetType()==BKPNT_MEMORY) {
            DEBUG_ShowMsg("%02X. BPMEM %04X:%04X (%02X)\n",nr,bp->GetSegment(),bp->GetOffset(),bp->GetValue());
        } else if (bp->GetType()==BKPNT_MEMORY_PROT) {
            DEBUG_ShowMsg("%02X. BPPM %04X:%08X (%02X)\n",nr,bp->GetSegment(),bp->GetOffset(),bp->GetValue());
        } else if (bp->GetType()==BKPNT_MEMORY_LINEAR ) {
            DEBUG_ShowMsg("%02X. BPLM %08X (%02X)\n",nr,bp->GetOffset(),bp->GetValue());
        };
    }
};


