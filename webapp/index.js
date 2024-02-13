const JS_BUILD = "Feb 13 2024"+" "+"21:06:43"
function $(what) {
  var obj = ("string" == typeof what) ? document.getElementById(what) : what
  return obj
}
function decode(e)
{
    const hex = e.replace(/\n|\r| /g,"")
    core.bitMode=0;
    if (core.loadBinCode(hex)) return core.disassemble()
    return "errore"
}
const core = {
  binCode: [],
  bitMode: 2,
  codePos: 0x00000000,
  pos64: 0x00000000, pos32: 0x00000000,
  codeSeg: 0x0000,
  instructionHex: "",
  instructionPos: "",
  showInstructionHex: true,
  showInstructionPos: true,
  addressMap: false,
  lookup: false, pointerSize: 0, rel: false,
  addressMode: true,
  mapped_pos: [], mapped_loc: [],
  add: function(loc, size, name) { this.mapped_pos.push(loc); this.mapped_pos.push(size); this.mapped_loc.push(name); },
  set: function(loc, name) { if(loc[0].length) { this.mapped_pos=loc[0]; this.mapped_loc=loc[1]; } else { this.mapped_pos=loc; this.mapped_loc=name; } },
  get: function() { return([this.mapped_pos, this.mapped_loc]); },
  data_off: [], linear: [], crawl: [],
  rows: 0,
  opcode: 0,
  mnemonics: [
    "ADD","ADD","ADD","ADD","ADD","ADD","PUSH ES","POP ES",
    "OR","OR","OR","OR","OR","OR","PUSH CS"
    ,
    ""
    ,
    "ADC","ADC","ADC","ADC","ADC","ADC","PUSH SS","POP SS",
    "SBB","SBB","SBB","SBB","SBB","SBB","PUSH DS","POP DS",
    "AND","AND","AND","AND","AND","AND",
    "ES:[",
    "DAA",
    "SUB","SUB","SUB","SUB","SUB","SUB",
    "CS:[",
    "DAS",
    "XOR","XOR","XOR","XOR","XOR","XOR",
    "SS:[",
    "AAA",
    "CMP","CMP","CMP","CMP","CMP","CMP",
    "DS:[",
    "AAS",
    "INC","INC","INC","INC","INC","INC","INC","INC",
    "DEC","DEC","DEC","DEC","DEC","DEC","DEC","DEC",
    "PUSH","PUSH","PUSH","PUSH","PUSH","PUSH","PUSH","PUSH",
    "POP","POP","POP","POP","POP","POP","POP","POP",
    ["PUSHA","PUSHAD",""],["POPA","POPAD",""],
    ["BOUND","BOUND",""],
    "MOVSXD",
    "FS:[","GS:[",
    "","",
    "PUSH","IMUL","PUSH","IMUL",
    "INS","INS","OUTS","OUTS",
    "JO","JNO","JB","JAE","JE","JNE","JBE","JA",
    "JS","JNS","JP","JNP","JL","JGE","JLE","JG",
    ["ADD","OR","ADC","SBB","AND","SUB","XOR","CMP"],
    ["ADD","OR","ADC","SBB","AND","SUB","XOR","CMP"],
    ["ADD","OR","ADC","SBB","AND","SUB","XOR","CMP"],
    ["ADD","OR","ADC","SBB","AND","SUB","XOR","CMP"],
    "TEST","TEST","XCHG","XCHG",
    "MOV","MOV","MOV","MOV",
    ["MOV","MOV"],
    ["LEA","???"],
    ["MOV","MOV"],
    ["POP","???","???","???","???","???","???","???"],
    [["NOP","","",""],["NOP","","",""],["PAUSE","","",""],["NOP","","",""]],
    "XCHG","XCHG","XCHG","XCHG","XCHG","XCHG","XCHG",
    ["CWDE","CBW","CDQE"],
    ["CDQ","CWD","CQO"],
    "CALL","WAIT",
    ["PUSHFQ","PUSHF","PUSHFQ"],
    ["POPFQ","POPF","POPFQ"],
    "SAHF","LAHF",
    "MOV","MOV","MOV","MOV",
    "MOVS","MOVS",
    "CMPS","CMPS",
    "TEST","TEST",
    "STOS","STOS",
    "LODS","LODS",
    "SCAS","SCAS",
    "MOV","MOV","MOV","MOV","MOV","MOV","MOV","MOV",
    "MOV","MOV","MOV","MOV","MOV","MOV","MOV","MOV",
    ["ROL","ROR","RCL","RCR","SHL","SHR","SAL","SAR"],
    ["ROL","ROR","RCL","RCR","SHL","SHR","SAL","SAR"],
    "RET","RET",
    "LES",
    "LDS",
    [
      "MOV","???","???","???","???","???","???",
      ["XABORT","XABORT","XABORT","XABORT","XABORT","XABORT","XABORT","XABORT"]
    ],
    [
      "MOV","???","???","???","???","???","???",
      ["XBEGIN","XBEGIN","XBEGIN","XBEGIN","XBEGIN","XBEGIN","XBEGIN","XBEGIN"]
    ],
    "ENTER","LEAVE","RETF","RETF","INT","INT","INTO",
    ["IRETD","IRET","IRETQ"],
    ["ROL","ROR","RCL","RCR","SHL","SHR","SAL","SAR"],
    ["ROL","ROR","RCL","RCR","SHL","SHR","SAL","SAR"],
    ["ROL","ROR","RCL","RCR","SHL","SHR","SAL","SAR"],
    ["ROL","ROR","RCL","RCR","SHL","SHR","SAL","SAR"],
    "AAMB","AADB","???",
    "XLAT",
    [
      ["FADD","FMUL","FCOM","FCOMP","FSUB","FSUBR","FDIV","FDIVR"],
      ["FADD","FMUL","FCOM","FCOMP","FSUB","FSUBR","FDIV","FDIVR"]
    ],
    [
      ["FLD","???","FST","FSTP","FLDENV","FLDCW","FNSTENV","FNSTCW"],
      [
        "FLD","FXCH",
        ["FNOP","???","???","???","???","???","???","???"],
        "FSTP1",
        ["FCHS","FABS","???","???","FTST","FXAM","???","???"],
        ["FLD1","FLDL2T","FLDL2E","FLDPI","FLDLG2","FLDLN2","FLDZ","???"],
        ["F2XM1","FYL2X","FPTAN","FPATAN","FXTRACT","FPREM1","FDECSTP","FINCSTP"],
        ["FPREM","FYL2XP1","FSQRT","FSINCOS","FRNDINT","FSCALE","FSIN","FCOS"]
      ]
    ],
    [
      ["FIADD","FIMUL","FICOM","FICOMP","FISUB","FISUBR","FIDIV","FIDIVR"],
      [
        "FCMOVB","FCMOVE","FCMOVBE","FCMOVU","???",
        ["???","FUCOMPP","???","???","???","???","???","???"],
        "???","???"
      ]
    ],
    [
      ["FILD","FISTTP","FIST","FISTP","???","FLD","???","FSTP"],
      [
        "CMOVNB","FCMOVNE","FCMOVNBE","FCMOVNU",
        ["FENI","FDISI","FNCLEX","FNINIT","FSETPM","???","???","???"],
        "FUCOMI","FCOMI","???"
      ]
    ],
    [
      ["FADD","FMUL","FCOM","DCOMP","FSUB","FSUBR","FDIV","FDIVR"],
      ["FADD","FMUL","FCOM2","FCOMP3","FSUBR","FSUB","FDIVR","FDIV"]
    ],
    [
      ["FLD","FISTTP","FST","FSTP","FRSTOR","???","FNSAVE","FNSTSW"],
      ["FFREE","FXCH4","FST","FSTP","FUCOM","FUCOMP","???","???"]
    ],
    [
      ["FIADD","FIMUL","FICOM","FICOMP","FISUB","FISUBR","FIDIV","FIDIVR"],
      [
        "FADDP","FMULP","FCOMP5",
        ["???","FCOMPP","???","???","???","???","???","???"],
        "FSUBRP","FSUBP","FDIVRP","FDIVP"
      ]
    ],
    [
      ["FILD","FISTTP","FIST","FISTP","FBLD","FILD","FBSTP","FISTP"],
      [
        "FFREEP","FXCH7","FSTP8","FSTP9",
        ["FNSTSW","???","???","???","???","???","???","???"],
        "FUCOMIP","FCOMIP","???"
      ]
    ],
    "LOOPNE","LOOPE","LOOP","JRCXZ",
    "IN","IN","OUT","OUT",
    "CALL","JMP","JMP","JMP",
    "IN","IN","OUT","OUT",
    "LOCK",
    "ICEBP",
    "REPNE",
    "REP",
    "HLT","CMC",
    ["TEST","???","NOT","NEG","MUL","IMUL","DIV","IDIV"],
    ["TEST","???","NOT","NEG","MUL","IMUL","DIV","IDIV"],
    "CLC","STC","CLI","STI","CLD","STD",
    ["INC","DEC","???","???","???","???","???","???"],
    [
      ["INC","DEC","CALL","CALL","JMP","JMP","PUSH","???"],
      ["INC","DEC","CALL","???","JMP","???","PUSH","???"]
    ],
    [
      ["SLDT","STR","LLDT","LTR","VERR","VERW","JMPE","???"],
      ["SLDT","STR","LLDT","LTR","VERR","VERW","JMPE","???"]
    ],
    [
      ["SGDT","SIDT","LGDT","LIDT","SMSW","???","LMSW","INVLPG"],
      [
        ["???","VMCALL","VMLAUNCH","VMRESUME","VMXOFF","???","???","???"],
        ["MONITOR","MWAIT","CLAC","STAC","???","???","???","ENCLS"],
        ["XGETBV","XSETBV","???","???","VMFUNC","XEND","XTEST","ENCLU"],
        ["VMRUN","VMMCALL","VMLOAD","VMSAVE","STGI","CLGI","SKINIT","INVLPGA"],
        "SMSW","???","LMSW",
        ["SWAPGS","RDTSCP","MONITORX","MWAITX","???","???","???","???"]
      ]
    ],
    ["LAR","LAR"],["LSL","LSL"],"???",
    "SYSCALL","CLTS","SYSRET","INVD",
    "WBINVD","???","UD2","???",
    [["PREFETCH","PREFETCHW","???","???","???","???","???","???"],"???"],
    "FEMMS",
    "",
    [
      ["MOVUPS","MOVUPD","MOVSS","MOVSD"],
      ["MOVUPS","MOVUPD","MOVSS","MOVSD"]
    ],
    [
      ["MOVUPS","MOVUPD","MOVSS","MOVSD"],
      ["MOVUPS","MOVUPD","MOVSS","MOVSD"]
    ],
    [
      ["MOVLPS","MOVLPD","MOVSLDUP","MOVDDUP"],
      ["MOVHLPS","???","MOVSLDUP","MOVDDUP"]
    ],
    [["MOVLPS","MOVLPD","???","???"],"???"],
    ["UNPCKLPS","UNPCKLPD","???","???"],
    ["UNPCKHPS","UNPCKHPD","???","???"],
    [["MOVHPS","MOVHPD","MOVSHDUP","???"],["MOVLHPS","???","MOVSHDUP","???"]],
    [["MOVHPS","MOVHPD","???","???"],"???"],
    [["PREFETCHNTA","PREFETCHT0","PREFETCHT1","PREFETCHT2","???","???","???","???"],"???"],
    "???",
    [[["BNDLDX","","",""],["BNDMOV","","",""],["BNDCL","","",""],["BNDCU","","",""]],
    ["???",["BNDMOV","","",""],["BNDCL","","",""],["BNDCU","","",""]]],
    [[["BNDSTX","","",""],["BNDMOV","","",""],["BNDMK","","",""],["BNDCN","","",""]],
    ["???",["BNDMOV","","",""],"???",["BNDCN","","",""]]],
    "???","???","???",
    "NOP",
    ["???","MOV"],["???","MOV"],
    ["???","MOV"],["???","MOV"],
    ["???","MOV"],"???",
    ["???","MOV"],"???",
    [
      ["MOVAPS","MOVAPS","MOVAPS","MOVAPS"],
      ["MOVAPD","MOVAPD","MOVAPD","MOVAPD"],
      "???","???"
    ],
    [
      [
        ["MOVAPS","MOVAPS","MOVAPS","MOVAPS"],
        ["MOVAPD","MOVAPD","MOVAPD","MOVAPD"],
        ["","","",["MOVNRAPS","MOVNRNGOAPS","MOVNRAPS"]],
        ["","","",["MOVNRAPD","MOVNRNGOAPD","MOVNRAPD"]]
      ],
      [
        ["MOVAPS","MOVAPS","MOVAPS","MOVAPS"],
        ["MOVAPD","MOVAPD","MOVAPD","MOVAPD"],
        "???","???"
      ]
    ],
    [
      ["CVTPI2PS","","",""],["CVTPI2PD","","",""],
      "CVTSI2SS","CVTSI2SD"
    ],
    [
      [
        "MOVNTPS","MOVNTPD",
        ["MOVNTSS","","",""],["MOVNTSD","","",""]
      ],"???"
    ],
    [
      ["CVTTPS2PI","","",""],["CVTTPD2PI","","",""],
      "CVTTSS2SI","CVTTSD2SI"
    ],
    [
      ["CVTPS2PI","","",""],["CVTPD2PI","","",""],
      "CVTSS2SI","CVTSD2SI"
    ],
    ["UCOMISS","UCOMISD","???","???"],
    ["COMISS","COMISD","???","???"],
    "WRMSR","RDTSC","RDMSR","RDPMC",
    "SYSENTER","SYSEXIT","???",
    "GETSEC",
    "",
    "???",
    "",
    "???","???","???","???","???",
    "CMOVO",
    [
      ["CMOVNO",["KANDW","","KANDQ"],"",""],
      ["CMOVNO",["KANDB","","KANDD"],"",""],"",""
    ],
    [
      ["CMOVB",["KANDNW","","KANDNQ"],"",""],
      ["CMOVB",["KANDNB","","KANDND"],"",""],"",""
    ],
    [["CMOVAE","KANDNR","",""],"","",""],
    [
      ["CMOVE",["KNOTW","","KNOTQ"],"",""],
      ["CMOVE",["KNOTB","","KNOTD"],"",""],"",""
    ],
    [
      ["CMOVNE",["KORW","","KORQ"],"",""],
      ["CMOVNE",["KORB","","KORD"],"",""],"",""
    ],
    [
      ["CMOVBE",["KXNORW","","KXNORQ"],"",""],
      ["CMOVBE",["KXNORB","","KXNORD"],"",""],"",""
    ],
    [
      ["CMOVA",["KXORW","","KXORQ"],"",""],
      ["CMOVA",["KXORB","","KXORD"],"",""],"",""
    ],
    [["CMOVS","KMERGE2L1H","",""],"","",""],
    [["CMOVNS","KMERGE2L1L","",""],"","",""],
    [
      ["CMOVP",["KADDW","","KADDQ"],"",""],
      ["CMOVP",["KADDB","","KADDD"],"",""],"",""
    ],
    [
      ["CMOVNP",["KUNPCKWD","","KUNPCKDQ"],"",""],
      ["CMOVNP",["KUNPCKBW","","???"],"",""],"",""
    ],
    "CMOVL","CMOVGE","CMOVLE","CMOVG",
    [
      "???",
      [
        ["MOVMSKPS","MOVMSKPS","",""],["MOVMSKPD","MOVMSKPD","",""],
        "???","???"
      ]
    ],
    ["SQRTPS","SQRTPD","SQRTSS","SQRTSD"],
    [
      ["RSQRTPS","RSQRTPS","",""],"???",
      ["RSQRTSS","RSQRTSS","",""],"???"
    ],
    [
      ["RCPPS","RCPPS","",""],"???",
      ["RCPSS","RCPSS","",""],"???"
    ],
    ["ANDPS","ANDPD","???","???"],
    ["ANDNPS","ANDNPD","???","???"],
    ["ORPS","ORPD","???","???"],
    ["XORPS","XORPD","???","???"],
    [
      ["ADDPS","ADDPS","ADDPS","ADDPS"],
      ["ADDPD","ADDPD","ADDPD","ADDPD"],
      "ADDSS","ADDSD"
    ],
    [
      ["MULPS","MULPS","MULPS","MULPS"],
      ["MULPD","MULPD","MULPD","MULPD"],
      "MULSS","MULSD"
    ],
    [
      ["CVTPS2PD","CVTPS2PD","CVTPS2PD","CVTPS2PD"],
      ["CVTPD2PS","CVTPD2PS","CVTPD2PS","CVTPD2PS"],
      "CVTSS2SD","CVTSD2SS"
    ],
    [["CVTDQ2PS","","CVTQQ2PS"],["CVTPS2DQ","","???"],"CVTTPS2DQ","???"],
    [
      ["SUBPS","SUBPS","SUBPS","SUBPS"],
      ["SUBPD","SUBPD","SUBPD","SUBPD"],
      "SUBSS","SUBSD"
    ],
    ["MINPS","MINPD","MINSS","MINSD"],
    ["DIVPS","DIVPD","DIVSS","DIVSD"],
    ["MAXPS","MAXPD","MAXSS","MAXSD"],
    [["PUNPCKLBW","","",""],"PUNPCKLBW","",""],
    [["PUNPCKLWD","","",""],"PUNPCKLWD","",""],
    [["PUNPCKLDQ","","",""],"PUNPCKLDQ","",""],
    [["PACKSSWB","","",""],"PACKSSWB","",""],
    [["PCMPGTB","","",""],["PCMPGTB","PCMPGTB","PCMPGTB",""],"",""],
    [["PCMPGTW","","",""],["PCMPGTW","PCMPGTW","PCMPGTW",""],"",""],
    [["PCMPGTD","","",""],["PCMPGTD","PCMPGTD",["PCMPGTD","","???"],["PCMPGTD","","???"]],"",""],
    [["PACKUSWB","","",""],"PACKUSWB","",""],
    [["PUNPCKHBW","","",""],"PUNPCKHBW","",""],
    [["PUNPCKHWD","","",""],"PUNPCKHWD","",""],
    [["PUNPCKHDQ","","",""],["PUNPCKHDQ","","???"],"",""],
    [["PACKSSDW","","",""],["PACKSSDW","","???"],"",""],
    ["???","PUNPCKLQDQ","???","???"],
    ["???","PUNPCKHQDQ","???","???"],
    [["MOVD","","",""],["MOVD","","MOVQ"],"",""],
    [
      [
        ["MOVQ","","",""],
        ["MOVDQA","MOVDQA",["MOVDQA32","","MOVDQA64"],["MOVDQA32","","MOVDQA64"]],
        ["MOVDQU","MOVDQU",["MOVDQU32","","MOVDQU64"],""],
        ["","",["MOVDQU8","","MOVDQU16"],""]
      ],
      [
        ["MOVQ","","",""],
        ["MOVDQA","MOVDQA",["MOVDQA32","","MOVDQA64"],["MOVDQA32","","MOVDQA64"]],
        ["MOVDQU","MOVDQU",["MOVDQU32","","MOVDQU64"],""],
        ["","",["MOVDQU8","","MOVDQU16"],""]
      ]
    ],
    [
      ["PSHUFW","","",""],
      ["PSHUFD","PSHUFD",["PSHUFD","","???"],["PSHUFD","","???"]],
      "PSHUFHW",
      "PSHUFLW"
    ],
    [
      "???",
      [
        "???","???",
        [["PSRLW","","",""],"PSRLW","",""],"???",
        [["PSRAW","","",""],"PSRAW","",""],"???",
        [["PSLLW","","",""],"PSLLW","",""],"???"
      ]
    ],
    [
      ["???",["","",["PRORD","","PRORQ"],""],"???","???"],
      ["???",["","",["PROLD","","PROLQ"],""],"???","???"],
      [["PSRLD","","",""],["PSRLD","PSRLD",["PSRLD","","???"],["PSRLD","","???"]],"",""],
      "???",
      [["PSRAD","","",""],["PSRAD","PSRAD",["PSRAD","","PSRAQ"],["PSRAD","","???"]],"",""],
      "???",
      [["PSLLD","","",""],["PSLLD","PSLLD",["PSLLD","","???"],["PSLLD","","???"]],"",""],
      "???"
    ],
    [
      "???",
      [
        "???","???",
        [["PSRLQ","PSRLQ","",""],"PSRLQ","",""],["???","PSRLDQ","???","???"],
        "???","???",
        [["PSLLQ","PSLLQ","",""],"PSLLQ","",""],["???","PSLLDQ","???","???"]
      ]
    ],
    [["PCMPEQB","","",""],["PCMPEQB","PCMPEQB","PCMPEQB",""],"",""],
    [["PCMPEQW","","",""],["PCMPEQW","PCMPEQW","PCMPEQW",""],"",""],
    [["PCMPEQD","","",""],["PCMPEQD","PCMPEQD",["PCMPEQD","","???"],["PCMPEQD","","???"]],"",""],
    [["EMMS",["ZEROUPPER","ZEROALL",""],"",""],"???","???","???"],
    [
      ["VMREAD","",["CVTTPS2UDQ","","CVTTPD2UDQ"],""],
      ["EXTRQ","",["CVTTPS2UQQ","","CVTTPD2UQQ"],""],
      ["???","","CVTTSS2USI",""],
      ["INSERTQ","","CVTTSD2USI",""]
    ],
    [
      ["VMWRITE","",["CVTPS2UDQ","","CVTPD2UDQ"], ""],
      ["EXTRQ","",["CVTPS2UQQ","","CVTPD2UQQ"],""],
      ["???","","CVTSS2USI",""],
      ["INSERTQ","","CVTSD2USI",""]
    ],
    [
      "???",
      ["","",["CVTTPS2QQ","","CVTTPD2QQ"],""],
      ["","",["CVTUDQ2PD","","CVTUQQ2PD"],"CVTUDQ2PD"],
      ["","",["CVTUDQ2PS","","CVTUQQ2PS"],""]
    ],
    [
      "???",
      ["","",["CVTPS2QQ","","CVTPD2QQ"],""],
      ["","","CVTUSI2SS",""],
      ["","","CVTUSI2SD",""]
    ],
    [
      "???",["HADDPD","HADDPD","",""],
      "???",["HADDPS","HADDPS","",""]
    ],
    [
      "???",["HSUBPD","HSUBPD","",""],
      "???",["HSUBPS","HSUBPS","",""]
    ],
    [["MOVD","","",""],["MOVD","","MOVQ"],["MOVQ","MOVQ",["???","","MOVQ"],""],"???"],
    [
      ["MOVQ","","",""],
      ["MOVDQA","MOVDQA",["MOVDQA32","","MOVDQA64"],["MOVDQA32","","MOVDQA64"]],
      ["MOVDQU","MOVDQU",["MOVDQU32","","MOVDQU64"],""],
      ["???","",["MOVDQU8","","MOVDQU16"],""]
    ],
    "JO","JNO","JB","JAE","JE","JNE","JBE","JA",
    "JS","JNS","JP","JNP","JL","JGE","JLE","JG",
    [
      ["SETO",["KMOVW","","KMOVQ"],"",""],
      ["SETO",["KMOVB","","KMOVD"],"",""],"",""
    ],
    [
      ["SETNO",["KMOVW","","KMOVQ"],"",""],
      ["SETNO",["KMOVB","","KMOVD"],"",""],"",""
    ],
    [
      ["SETB",["KMOVW","","???"],"",""],
      ["SETB",["KMOVB","","???"],"",""],"",
      ["SETB",["KMOVD","","KMOVQ"],"",""]
    ],
    [
      ["SETAE",["KMOVW","","???"],"",""],
      ["SETAE",["KMOVB","","???"],"",""],"",
      ["SETAE",["KMOVD","","KMOVQ"],"",""]
    ],
    "SETE",[["SETNE","KCONCATH","",""],"","",""],
    "SETBE",[["SETA","KCONCATL","",""],"","",""],
    [
      ["SETS",["KORTESTW","","KORTESTQ"],"",""],
      ["SETS",["KORTESTB","","KORTESTD"],"",""],"",""
    ],
    [
      ["SETNS",["KTESTW","","KTESTQ"],"",""],
      ["SETNS",["KTESTB","","KTESTD"],"",""],"",""
    ],
    "SETP","SETNP","SETL","SETGE","SETLE","SETG",
    "PUSH","POP",
    "CPUID",
    "BT",
    "SHLD","SHLD",
    "XBTS","IBTS",
    "PUSH","POP",
    "RSM",
    "BTS",
    "SHRD","SHRD",
    [
      [
        ["FXSAVE","???","FXSAVE64"],["FXRSTOR","???","FXRSTOR64"],
        "LDMXCSR","STMXCSR",
        ["XSAVE","","XSAVE64"],["XRSTOR","","XRSTOR64"],
        ["XSAVEOPT","CLWB","XSAVEOPT64"],
        ["CLFLUSHOPT","CLFLUSH",""]
      ],
      [
        ["???","???",["RDFSBASE","","",""],"???"],["???","???",["RDGSBASE","","",""],"???"],
        ["???","???",["WRFSBASE","","",""],"???"],["???","???",["WRGSBASE","","",""],"???"],
        "???",
        ["LFENCE","???","???","???","???","???","???","???"],
        ["MFENCE","???","???","???","???","???","???","???"],
        ["SFENCE","???","???","???","???","???","???","???"]
      ]
    ],
    "IMUL",
    "CMPXCHG","CMPXCHG",
    ["LSS","???"],
    "BTR",
    ["LFS","???"],
    ["LGS","???"],
    "MOVZX","MOVZX",
    [
      ["JMPE","","",""],"???",
      ["POPCNT","POPCNT","",""],"???"
    ],
    "???",
    ["???","???","???","???","BT","BTS","BTR","BTC"],
    "BTC",
    [
      ["BSF","","",""],"???",
      ["TZCNT","TZCNT","",""],["BSF","TZCNTI","",""]
    ],
    [
      ["BSR","","",""],"???",
      ["LZCNT","LZCNT","",""],["BSR","","",""]
    ],
    "MOVSX","MOVSX",
    "XADD","XADD",
    [
      ["CMP,PS,","CMP,PS,","CMP,PS,","CMP,PS,"],
      ["CMP,PD,","CMP,PD,","CMP,PD,","CMP,PD,"],
      ["CMP,SS,","CMP,SS,","CMP,SS,",""],
      ["CMP,SD,","CMP,SD,","CMP,SD,",""]
    ],
    ["MOVNTI","???"],
    [["PINSRW","","",""],"PINSRW","",""],
    ["???",[["PEXTRW","","",""],"PEXTRW","",""]],
    ["SHUFPS","SHUFPD","???","???"],
    [
      [
        "???",
        ["CMPXCHG8B","","CMPXCHG16B"],
        "???",
        ["XRSTORS","","XRSTORS64"],
        ["XSAVEC","","XSAVEC64"],
        ["XSAVES","","XSAVES64"],
        ["VMPTRLD","VMCLEAR","VMXON","???"],["VMPTRST","???","???","???"]
      ],
      [
        "???",
        ["SSS","???","???","???","???","???","???","???"],
        "???","???","???","???",
        "RDRAND","RDSEED"
      ]
    ],
    "BSWAP","BSWAP","BSWAP","BSWAP","BSWAP","BSWAP","BSWAP","BSWAP",
    ["???",["ADDSUBPD","ADDSUBPD","",""],"???",["ADDSUBPS","ADDSUBPS","",""]],
    [["PSRLW","","",""],"PSRLW","",""],
    [["PSRLD","","",""],["PSRLD","PSRLD",["PSRLD","","???"],""],"",""],
    [["PSRLQ","","",""],"PSRLQ","",""],
    [["PADDQ","","",""],"PADDQ","",""],
    [["PMULLW","","",""],"PMULLW","",""],
    [
      ["???","MOVQ","???","???"],
      ["???","MOVQ",["MOVQ2DQ","","",""],["MOVDQ2Q","","",""]]
    ],
    ["???",[["PMOVMSKB","","",""],["PMOVMSKB","PMOVMSKB","",""],"???","???"]],
    [["PSUBUSB","","",""],"PSUBUSB","",""],
    [["PSUBUSW","","",""],"PSUBUSW","",""],
    [["PMINUB","","",""],"PMINUB","",""],
    [["PAND","","",""],["PAND","PAND",["PANDD","","PANDQ"],["PANDD","","PANDQ"]],"",""],
    [["PADDUSB","","",""],"PADDUSB","",""],
    [["PADDUSW","","",""],"PADDUSW","",""],
    [["PMAXUB","","",""],"PMAXUB","",""],
    [["PANDN","","",""],["PANDN","PANDN",["PANDND","","PANDNQ"],["PANDND","","PANDNQ"]],"",""],
    [["PAVGB","","",""],"PAVGB","",""],
    [
      [["PSRAW","","",""],["PSRAW","PSRAW","PSRAW",""],"",""],
      [["PSRAW","","",""],["PSRAW","PSRAW","PSRAW",""],"",""]
    ],
    [["PSRAD","","",""],["PSRAD","PSRAD",["PSRAD","","PSRAQ"],""],"",""],
    [["PAVGW","","",""],"PAVGW","",""],
    [["PMULHUW","","",""],"PMULHUW","",""],
    [["PMULHW","","",""],"PMULHW","",""],
    [
      "???",
      ["CVTTPD2DQ","CVTTPD2DQ","CVTTPD2DQ",""],
      ["CVTDQ2PD","CVTDQ2PD",["CVTDQ2PD","CVTDQ2PD","CVTQQ2PD"],"CVTDQ2PD"],
      "CVTPD2DQ"
    ],
    [[["MOVNTQ","","",""],["MOVNTDQ","","???"],"???","???"],"???"],
    [["PSUBSB","","",""],"PSUBSB","",""],
    [["PSUBSW","","",""],"PSUBSW","",""],
    [["PMINSW","","",""],"PMINSW","",""],
    [["POR","","",""],["POR","POR",["PORD","","PORQ"],["PORD","","PORQ"]],"",""],
    [["PADDSB","","",""],"PADDSB","",""],
    [["PADDSW","","",""],"PADDSW","",""],
    [["PMAXSW","","",""],"PMAXSW","",""],
    [["PXOR","","",""],["PXOR","PXOR",["PXORD","","PXORQ"],["PXORD","","PXORQ"]],"",""],
    [["???","???","???",["LDDQU","LDDQU","",""]],"???"],
    [["PSLLW","","",""],"PSLLW","",""],
    [["PSLLD","","",""],["PSLLD","","???"],"",""],
    [["PSLLQ","","",""],"PSLLQ","",""],
    [["PMULUDQ","","",""],"PMULUDQ","",""],
    [["PMADDWD","","",""],"PMADDWD","",""],
    [["PSADBW","","",""],"PSADBW","",""],
    ["???",[["MASKMOVQ","","",""],["MASKMOVDQU","MASKMOVDQU","",""],"???","???"]],
    [["PSUBB","","",""],"PSUBB","",""],
    [["PSUBW","","",""],"PSUBW","",""],
    [["PSUBD","","",""],["PSUBD","PSUBD",["PSUBD","","???"],["PSUBD","","???"]],"",""],
    [["PSUBQ","","",""],"PSUBQ","",""],
    [["PADDB","","",""],"PADDB","",""],
    [["PADDW","","",""],"PADDW","",""],
    [["PADDD","","",""],["PADDD","PADDD",["PADDD","","???"],["PADDD","","???"]],"",""],
    "???",
    [["PSHUFB","","",""],"PSHUFB","???","???"],
    [["PHADDW","","",""],["PHADDW","PHADDW","",""],"???","???"],
    [["PHADDD","","",""],["PHADDD","PHADDD","",""],"???","???"],
    [["PHADDSW","","",""],["PHADDSW","PHADDSW","",""],"???","???"],
    [["PMADDUBSW","","",""],"PMADDUBSW","???","???"],
    [["PHSUBW","","",""],["PHSUBW","PHSUBW","",""],"???","???"],
    [["PHSUBD","","",""],["PHSUBD","PHSUBD","",""],"???","???"],
    [["PHSUBSW","","",""],["PHSUBSW","PHSUBSW","",""],"???","???"],
    [["PSIGNB","","",""],["PSIGNB","PSIGNB","",""],"???","???"],
    [["PSIGNW","","",""],["PSIGNW","PSIGNW","",""],"???","???"],
    [["PSIGND","","",""],["PSIGND","PSIGND","",""],"???","???"],
    [["PMULHRSW","","",""],"PMULHRSW","???","???"],
    ["???",["","PERMILPS",["PERMILPS","","???"],""],"???","???"],
    ["???",["","PERMILPD","PERMILPD",""],"???","???"],
    ["???",["","TESTPS","",""],"???","???"],
    ["???",["","TESTPD","",""],"???","???"],
    ["???",["PBLENDVB","PBLENDVB","PSRLVW",""],["","","PMOVUSWB",""],"???"],
    ["???",["","","PSRAVW",""],["","","PMOVUSDB",""],"???"],
    ["???",["","","PSLLVW",""],["","","PMOVUSQB",""],"???"],
    ["???",["","CVTPH2PS",["CVTPH2PS","","???"],""],["","","PMOVUSDW",""],"???"],
    ["???",["BLENDVPS","BLENDVPS",["PRORVD","","PRORVQ"],""],["","","PMOVUSQW",""],"???"],
    ["???",["BLENDVPD","BLENDVPD",["PROLVD","","PROLVQ"],""],["","","PMOVUSQD",""],"???"],
    ["???",["","PERMPS",["PERMPS","","PERMPD"],""],"???","???"],
    ["???",["PTEST","PTEST","",""],"???","???"],
    ["???",["","BROADCASTSS",["BROADCASTSS","","???"],["BROADCASTSS","","???"]],"???","???"],
    ["???",["","BROADCASTSD",["BROADCASTF32X2","","BROADCASTSD"],["???","","BROADCASTSD"]],"???","???"],
    ["???",["","BROADCASTF128",["BROADCASTF32X4","","BROADCASTF64X2"],["BROADCASTF32X4","","???"]],"???","???"],
    ["???",["","",["BROADCASTF32X8","","BROADCASTF64X4"],["???","","BROADCASTF64X4"]],"???","???"],
    [["PABSB","","",""],"PABSB","???","???"],
    [["PABSW","","",""],"PABSW","???","???"],
    [["PABSD","","",""],["PABSD","","???"],"???","???"],
    ["???",["","","PABSQ",""],"???","???"],
    ["???","PMOVSXBW",["","","PMOVSWB",""],"???"],
    ["???","PMOVSXBD",["","","PMOVSDB",""],"???"],
    ["???","PMOVSXBQ",["","","PMOVSQB",""],"???"],
    ["???","PMOVSXWD",["","","PMOVSDW",""],"???"],
    ["???","PMOVSXWQ",["","","PMOVSQW",""],"???"],
    ["???","PMOVSXDQ",["","","PMOVSQD",""],"???"],
    ["???",["","",["PTESTMB","","PTESTMW"],""],["","",["PTESTNMB","","PTESTNMW"],""],"???"],
    ["???",["","",["PTESTMD","","PTESTMQ"],["PTESTMD","","???"]],["","",["PTESTNMD","","PTESTNMQ"],""],"???"],
    ["???","PMULDQ",["","",["PMOVM2B","","PMOVM2W"],""],"???"],
    ["???",["PCMPEQQ","PCMPEQQ","PCMPEQQ",""],["","",["PMOVB2M","","PMOVW2M"],""],"???"],
    [["???",["MOVNTDQA","","???"],"???","???"],["???","???",["","",["???","","PBROADCASTMB2Q"],""],"???"]],
    ["???",["PACKUSDW","","???"],"???","???"],
    ["???",["","MASKMOVPS",["SCALEFPS","","SCALEFPD"],""],"???","???"],
    ["???",["","MASKMOVPD",["SCALEFSS","","SCALEFSD"],""],"???","???"],
    ["???",["","MASKMOVPS","",""],"???","???"],
    ["???",["","MASKMOVPD","",""],"???","???"],
    ["???","PMOVZXBW",["","","PMOVWB",""],"???"],
    ["???","PMOVZXBD",["","","PMOVDB",""],"???"],
    ["???","PMOVZXBQ",["","","PMOVQB",""],"???"],
    ["???","PMOVZXWD",["","","PMOVDW",""],"???"],
    ["???","PMOVZXWQ",["","","PMOVQW",""],"???"],
    ["???","PMOVZXDQ",["","",["PMOVQD","PMOVQD",""],""],"???"],
    ["???",["","PERMD",["PERMD","","PERMQ"],["PERMD","","???"]],"???","???"],
    ["???",["PCMPGTQ","PCMPGTQ","PCMPGTQ",""],"???","???"],
    ["???","PMINSB",["","",["PMOVM2D","","PMOVM2Q"],""],"???"],
    ["???",["PMINSD","PMINSD",["PMINSD","","PMINSQ"],["PMINSD","","???"]],["","",["PMOVD2M","","PMOVQ2M"],""],"???"],
    ["???","PMINUW",["","","PBROADCASTMW2D",""],"???"],
    ["???",["PMINUD","PMINUD",["PMINUD","","PMINUQ"],["PMINUD","","???"]],"???","???"],
    ["???","PMAXSB","???","???"],
    ["???",["PMAXSD","PMAXSD",["PMAXSD","","PMAXSQ"],["PMAXSD","","???"]],"???","???"],
    ["???","PMAXUW","???","???"],
    ["???",["PMAXUD","PMAXUD",["PMAXUD","","PMAXUQ"],["PMAXUD","","???"]],"???","???"],
    ["???",["PMULLD","PMULLD",["PMULLD","","PMULLQ"],["PMULLD","",""]],"???","???"],
    ["???",["PHMINPOSUW",["PHMINPOSUW","PHMINPOSUW",""],"",""],"???","???"],
    ["???",["","",["GETEXPPS","","GETEXPPD"],["GETEXPPS","","GETEXPPD"]],"???","???"],
    ["???",["","",["GETEXPSS","","GETEXPSD"],""],"???","???"],
    ["???",["","",["PLZCNTD","","PLZCNTQ"],""],"???","???"],
    ["???",["",["PSRLVD","","PSRLVQ"],["PSRLVD","","PSRLVQ"],["PSRLVD","","???"]],"???","???"],
    ["???",["",["PSRAVD","",""],["PSRAVD","","PSRAVQ"],["PSRAVD","","???"]],"???","???"],
    ["???",["",["PSLLVD","","PSLLVQ"],["PSLLVD","","PSLLVQ"],["PSLLVD","","???"]],"???","???"],
    "???","???","???","???",
    ["???",["","",["RCP14PS","","RCP14PD"],""],"???","???"],
    ["???",["","",["RCP14SS","","RCP14SD"],""],"???","???"],
    ["???",["","",["RSQRT14PS","","RSQRT14PD"],""],"???","???"],
    ["???",["","",["RSQRT14SS","","RSQRT14SD"],""],"???","???"],
    ["???",["","","",["ADDNPS","","ADDNPD"]],"???","???"],
    ["???",["","","",["GMAXABSPS","","???"]],"???","???"],
    ["???",["","","",["GMINPS","","GMINPD"]],"???","???"],
    ["???",["","","",["GMAXPS","","GMAXPD"]],"???","???"],
    "",
    ["???",["","","",["FIXUPNANPS","","FIXUPNANPD"]],"???","???"],
    "","",
    ["???",["","PBROADCASTD",["PBROADCASTD","","???"],["PBROADCASTD","","???"]],"???","???"],
    ["???",["","PBROADCASTQ",["BROADCASTI32X2","","PBROADCASTQ"],["???","","PBROADCASTQ"]],"???","???"],
    ["???",["","BROADCASTI128",["BROADCASTI32X4","","BROADCASTI64X2"],["BROADCASTI32X4","","???"]],"???","???"],
    ["???",["","",["BROADCASTI32X8","","BROADCASTI64X4"],["???","","BROADCASTI64X4"]],"???","???"],
    ["???",["","","",["PADCD","","???"]],"???","???"],
    ["???",["","","",["PADDSETCD","","???"]],"???","???"],
    ["???",["","","",["PSBBD","","???"]],"???","???"],
    ["???",["","","",["PSUBSETBD","","???"]],"???","???"],
    "???","???","???","???",
    ["???",["","",["PBLENDMD","","PBLENDMQ"],["PBLENDMD","","PBLENDMQ"]],"???","???"],
    ["???",["","",["BLENDMPS","","BLENDMPD"],["BLENDMPS","","BLENDMPD"]],"???","???"],
    ["???",["","",["PBLENDMB","","PBLENDMW"],""],"???","???"],
    "???","???","???","???","???",
    ["???",["","","",["PSUBRD","","???"]],"???","???"],
    ["???",["","","",["SUBRPS","","SUBRPD"]],"???","???"],
    ["???",["","","",["PSBBRD","","???"]],"???","???"],
    ["???",["","","",["PSUBRSETBD","","???"]],"???","???"],
    "???","???","???","???",
    ["???",["","","",["PCMPLTD","","???"]],"???","???"],
    ["???",["","",["PERMI2B","","PERMI2W"],""],"???","???"],
    ["???",["","",["PERMI2D","","PERMI2Q"],""],"???","???"],
    ["???",["","",["PERMI2PS","","PERMI2PD"],""],"???","???"],
    ["???",["","PBROADCASTB",["PBROADCASTB","","???"],""],"???","???"],
    ["???",["","PBROADCASTW",["PBROADCASTW","","???"],""],"???","???"],
    ["???",["???",["","",["PBROADCASTB","","???"],""],"???","???"]],
    ["???",["???",["","",["PBROADCASTW","","???"],""],"???","???"]],
    ["???",["","",["PBROADCASTD","","PBROADCASTQ"],""],"???","???"],
    ["???",["","",["PERMT2B","","PERMT2W"],""],"???","???"],
    ["???",["","",["PERMT2D","","PERMT2Q"],""],"???","???"],
    ["???",["","",["PERMT2PS","","PERMT2PD"],""],"???","???"],
    [["???","INVEPT","???","???"],"???"],
    [["???","INVVPID","???","???"],"???"],
    [["???","INVPCID","???","???"],"???"],
    ["???",["???","???","PMULTISHIFTQB","???"],"???","???"],
    ["???",["","","",["SCALEPS","","???"]],"???","???"],
    "???",
    ["???",["","","",["PMULHUD","","???"]],"???","???"],
    ["???",["","","",["PMULHD","","???"]],"???","???"],
    ["???",["","",["EXPANDPS","","EXPANDPD"],""],"???","???"],
    ["???",["","",["PEXPANDD","","PEXPANDQ"],""],"???","???"],
    ["???",["","",["COMPRESSPS","","COMPRESSPD"],""],"???","???"],
    ["???",["","",["PCOMPRESSD","","PCOMPRESSQ"],""],"???","???"],
    "???",
    ["???",["","",["PERMB","","PERMW"],""],"???","???"],
    "???","???",
    ["???",["",["PGATHERDD","","PGATHERDQ"],["PGATHERDD","","PGATHERDQ"],["PGATHERDD","","PGATHERDQ"]],"???","???"],
    ["???",["",["PGATHERQD","","PGATHERQQ"],["PGATHERQD","","PGATHERQQ"],""],"???","???"],
    ["???",["",["GATHERDPS","","GATHERDPD"],["GATHERDPS","","GATHERDPD"],["GATHERDPS","","GATHERDPD"]],"???","???"],
    ["???",["",["GATHERQPS","","GATHERQPD"],["GATHERQPS","","GATHERQPD"],""],"???","???"],
    "???","???",
    ["???",["",["FMADDSUB132PS","","FMADDSUB132PD"],["FMADDSUB132PS","","FMADDSUB132PD"],""],"???","???"],
    ["???",["",["FMSUBADD132PS","","FMSUBADD132PD"],["FMSUBADD132PS","","FMSUBADD132PD"],""],"???","???"],
    ["???",["",["FMADD132PS","","FMADD132PD"],["FMADD132PS","","FMADD132PD"],["FMADD132PS","","FMADD132PD"]],"???","???"],
    ["???",["",["FMADD132SS","","FMADD132SD"],["FMADD132SS","","FMADD132SD"],""],"???","???"],
    ["???",["",["FMSUB132PS","","FMSUB132PD"],["FMSUB132PS","","FMSUB132PD"],["FMSUB132PS","","FMSUB132PD"]],"???","???"],
    ["???",["",["FMSUB132SS","","FMSUB132SD"],["FMSUB132SS","","FMSUB132SD"],""],"???","???"],
    ["???",["",["FNMADD132PS","","FNMADD132PD"],["FNMADD132PS","","FNMADD132PD"],["NMADD132PS","","FNMADD132PD"]],"???","???"],
    ["???",["",["FNMADD132SS","","FNMADD132SD"],["FNMADD132SS","","FNMADD132SD"],""],"???","???"],
    ["???",["",["FNMSUB132PS","","FNMSUB132PD"],["FNMSUB132PS","","FNMSUB132PD"],["FNMSUB132PS","","FNMSUB132PS"]],"???","???"],
    ["???",["",["FNMSUB132SS","","FNMSUB132SD"],["FNMSUB132SS","","FNMSUB132SD"],""],"???","???"],
    ["???",["","",["PSCATTERDD","","PSCATTERDQ"],["PSCATTERDD","","PSCATTERDQ"]],"???","???"],
    ["???",["","",["PSCATTERQD","","PSCATTERQQ"],""],"???","???"],
    ["???",["","",["SCATTERDPS","","SCATTERDPD"],["SCATTERDPS","","SCATTERDPD"]],"???","???"],
    ["???",["","",["SCATTERQPS","","SCATTERQPD"],""],"???","???"],
    ["???",["","","",["FMADD233PS","","???"]],"???","???"],
    "???",
    ["???",["",["FMADDSUB213PS","","FMADDSUB213PD"],["FMADDSUB213PS","","FMADDSUB213PD"],""],"???","???"],
    ["???",["",["FMSUBADD213PS","","FMSUBADD213PD"],["FMSUBADD213PS","","FMSUBADD213PD"],""],"???","???"],
    ["???",["",["FMADD213PS","","FMADD213PD"],["FMADD213PS","","FMADD213PD"],["FMADD213PS","","FMADD213PD"]],"???","???"],
    ["???",["",["FMADD213SS","","FMADD213SD"],["FMADD213SS","","FMADD213SD"],""],"???","???"],
    ["???",["",["FMSUB213PS","","FMSUB213PD"],["FMSUB213PS","","FMSUB213PD"],["FMSUB213PS","","FMSUB213PD"]],"???","???"],
    ["???",["",["FMSUB213SS","","FMSUB213SD"],["FMSUB213SS","","FMSUB213SD"],""],"???","???"],
    ["???",["",["FNMADD213PS","","FNMADD213PD"],["FNMADD213PS","","FNMADD213PD"],["FNMADD213PS","","FNMADD213PD"]],"???","???"],
    ["???",["",["FNMADD213SS","","FNMADD213SD"],["FNMADD213SS","","FNMADD213SD"],""],"???","???"],
    ["???",["",["FNMSUB213PS","","FNMSUB213PD"],["FNMSUB213PS","","FNMSUB213PD"],["FNMSUB213PS","","FNMSUB213PD"]],"???","???"],
    ["???",["",["FNMSUB213SS","","FNMSUB213SD"],["FNMSUB213SS","","FNMSUB213SD"],""],"???","???"],
    "???","???","???","???",
    ["???",["","","PMADD52LUQ",["PMADD233D","","???"]],"???","???"],
    ["???",["","","PMADD52HUQ",["PMADD231D","","???"]],"???","???"],
    ["???",["",["FMADDSUB231PS","","FMADDSUB231PD"],["FMADDSUB231PS","","FMADDSUB231PD"],""],"???","???"],
    ["???",["",["FMSUBADD231PS","","FMSUBADD231PD"],["FMSUBADD231PS","","FMSUBADD231PD"],""],"???","???"],
    ["???",["",["FMADD231PS","","FMADD231PD"],["FMADD231PS","","FMADD231PD"],["FMADD231PS","","FMADD231PD"]],"???","???"],
    ["???",["",["FMADD231SS","","FMADD231SD"],["FMADD231SS","","FMADD231SD"],""],"???","???"],
    ["???",["",["FMSUB231PS","","FMSUB231PD"],["FMSUB231PS","","FMSUB231PD"],["FMSUB231PS","","FMSUB231PD"]],"???","???"],
    ["???",["",["FMSUB231SS","","FMSUB231SD"],["FMSUB231SS","","FMSUB231SD"],""],"???","???"],
    ["???",["",["FNMADD231PS","","FNMADD231PD"],["FNMADD231PS","","FNMADD231PD"],["FNMADD231PS","","FNMADD231PD"]],"???","???"],
    ["???",["",["FNMADD231SS","","FNMADD231SD"],["FNMADD231SS","","FNMADD231SD"],""],"???","???"],
    ["???",["",["FNMSUB231PS","","FNMSUB231PD"],["FNMSUB231PS","","FNMSUB231PD"],["FNMSUB231PS","","FNMSUB231PD"]],"???","???"],
    ["???",["",["FNMSUB231SS","","FNMSUB231SD"],["FNMSUB231SS","","FNMSUB231SD"],""],"???","???"],
    "???","???","???","???",
    ["???",["","",["PCONFLICTD","","PCONFLICTQ"],""],"???","???"],
    "???",
    [
      [
        ["???",["","","",["GATHERPF0HINTDPS","","GATHERPF0HINTDPD"]],"???","???"],
        ["???",["","",["GATHERPF0DPS","","GATHERPF0DPD"],["GATHERPF0DPS","",""]],"???","???"],
        ["???",["","",["GATHERPF1DPS","","GATHERPF1DPD"],["GATHERPF1DPS","",""]],"???","???"],
        "???",
        ["???",["","","",["SCATTERPF0HINTDPS","","SCATTERPF0HINTDPD"]],"???","???"],
        ["???",["","",["SCATTERPF0DPS","","SCATTERPF0DPD"],["VSCATTERPF0DPS","",""]],"???","???"],
        ["???",["","",["SCATTERPF1DPS","","SCATTERPF1DPD"],["VSCATTERPF1DPS","",""]],"???","???"],
        "???"
      ],"???"
    ],
    [
      [
        "???",
        ["???",["","",["GATHERPF0QPS","","GATHERPF0QPD"],""],"???","???"],
        ["???",["","",["GATHERPF1QPS","","GATHERPF1QPD"],""],"???","???"],
        "???","???",
        ["???",["","",["SCATTERPF0QPS","","SCATTERPF0QPD"],""],"???","???"],
        ["???",["","",["SCATTERPF1QPS","","SCATTERPF1QPD"],""],"???","???"],
        "???"
      ],"???"
    ],
    [["SHA1NEXTE","","",""],["","",["EXP2PS","","EXP2PD"],["EXP223PS","","???"]],"???","???"],
    [["SHA1MSG1","","",""],["","","",["LOG2PS","","???"]],"???","???"],
    [["SHA1MSG2","","",""],["","",["RCP28PS","","RCP28PD"],["RCP23PS","","???"]],"???","???"],
    [["SHA256RNDS2","","",""],["","",["RCP28SS","","RCP28SD"],["RSQRT23PS","","???"]],"???","???"],
    [["SHA256MSG1","","",""],["","",["RSQRT28PS","","RSQRT28PD"],["ADDSETSPS","","???"]],"???","???"],
    [["SHA256MSG2","","",""],["","",["RSQRT28SS","","RSQRT28SD"],["PADDSETSD","","???"]],"???","???"],
    "???","???",
    [[["","","",["LOADUNPACKLD","","LOADUNPACKLQ"]],["","","",["PACKSTORELD","","PACKSTORELQ"]],"???","???"],"???"],
    [[["","","",["LOADUNPACKLPS","","LOADUNPACKLPD"]],["","","",["PACKSTORELPS","","PACKSTORELPD"]],"???","???"],"???"],
    "???","???",
    [[["","","",["LOADUNPACKHD","","LOADUNPACKHQ"]],["","","",["PACKSTOREHD","","PACKSTOREHQ"]],"???","???"],"???"],
    [[["","","",["LOADUNPACKHPS","","LOADUNPACKHPD"]],["","","",["PACKSTOREHPS","","PACKSTOREHPD"]],"???","???"],"???"],
    "???","???","???","???","???",
    ["???",["AESIMC","AESIMC","",""],"???","???"],
    ["???",["AESENC","AESENC","",""],"???","???"],
    ["???",["AESENCLAST","AESENCLAST","",""],"???","???"],
    ["???",["AESDEC","AESDEC","",""],"???","???"],
    ["???",["AESDECLAST","AESDECLAST","",""],"???","???"],
    "???","???","???","???","???","???","???","???",
    "???","???","???","???","???","???","???","???",
    [
      ["MOVBE","","",""],
      ["MOVBE","","",""],"???",
      ["CRC32","","",""]
    ],
    [
      ["MOVBE","","",""],
      ["MOVBE","","",""],"???",
      ["CRC32","","",""]
    ],
    ["???",["","ANDN","",""],"???","???"],
    [
      "???",
      ["???",["","BLSR","",""],"???","???"],
      ["???",["","BLSMSK","",""],"???","???"],
      ["???",["","BLSI","",""],"???","???"],
      "???","???","???","???"
    ],"???",
    [
      ["","BZHI","",""],"???",
      ["","PEXT","",""],
      ["","PDEP","",""]
    ],
    [
      "???",
      ["ADCX","","",""],
      ["ADOX","","",""],
      ["","MULX","",""]
    ],
    [
      ["","BEXTR","",""],
      ["","SHLX","",""],
      ["","SARX","",""],
      ["","SHRX","",""]
    ],
    "???","???","???","???","???","???","???","???",
    ["???",["","PERMQ","PERMQ",""],"???","???"],
    ["???",["","PERMPD","PERMPD",""],"???","???"],
    ["???",["",["PBLENDD","",""],"",""],"???","???"],
    ["???",["","",["ALIGND","","ALIGNQ"],["ALIGND","","???"]],"???","???"],
    ["???",["","PERMILPS",["PERMILPS","","???"],""],"???","???"],
    ["???",["","PERMILPD","PERMILPD",""],"???","???"],
    ["???",["","PERM2F128","",""],"???","???"],
    ["???",["","","",["PERMF32X4","","???"]],"???","???"],
    ["???",["ROUNDPS","ROUNDPS",["RNDSCALEPS","","???"],""],"???","???"],
    ["???",["ROUNDPD","ROUNDPD","RNDSCALEPD",""],"???","???"],
    ["???",["ROUNDSS","ROUNDSS",["RNDSCALESS","","???"],""],"???","???"],
    ["???",["ROUNDSD","ROUNDSD","RNDSCALESD",""],"???","???"],
    ["???",["BLENDPS","BLENDPS","",""],"???","???"],
    ["???",["BLENDPD","BLENDPD","",""],"???","???"],
    ["???",["PBLENDW","PBLENDW","",""],"???","???"],
    [["PALIGNR","","",""],"PALIGNR","???","???"],
    "???","???","???","???",
    [["???","PEXTRB","???","???"],["???","PEXTRB","???","???"]],
    [["???","PEXTRW","???","???"],["???","PEXTRW","???","???"]],
    ["???",["PEXTRD","","PEXTRQ"],"???","???"],
    ["???","EXTRACTPS","???","???"],
    ["???",["","INSERTF128",["INSERTF32X4","","INSERTF64X2"],""],"???","???"],
    ["???",["","EXTRACTF128",["EXTRACTF32X4","","EXTRACTF64X2"],""],"???","???"],
    ["???",["","",["INSERTF32X8","","INSERTF64X4"],""],"???","???"],
    ["???",["","",["EXTRACTF32X8","","EXTRACTF64X4"],""],"???","???"],
    "???",
    ["???",["","CVTPS2PH",["CVTPS2PH","","???"],""],"???","???"],
    ["???",["","",["PCMP,UD,","","PCMP,UQ,"],["PCMP,UD,","","???"]],"???","???"],
    ["???",["","",["PCM,PD,","","PCM,PQ,"],["PCM,PD,","","???"]],"???","???"],
    ["???","PINSRB","???","???"],
    ["???",["INSERTPS","","???"],"???","???"],
    ["???",["",["PINSRD","","PINSRQ"],["PINSRD","","PINSRQ"],""],"???","???"],
    ["???",["","",["SHUFF32X4","","SHUFF64X2"],""],"???","???"],
    "???",
    ["???",["","",["PTERNLOGD","","PTERNLOGQ"],""],"???","???"],
    ["???",["","",["GETMANTPS","","GETMANTPD"],["GETMANTPS","","GETMANTPD"]],"???","???"],
    ["???",["","",["GETMANTSS","","GETMANTSD"],""],"???","???"],
    "???","???","???","???","???","???","???","???",
    ["???",["",["KSHIFTRB","","KSHIFTRW"],"",""],"???","???"],
    ["???",["",["KSHIFTRD","","KSHIFTRQ"],"",""],"???","???"],
    ["???",["",["KSHIFTLB","","KSHIFTLW"],"",""],"???","???"],
    ["???",["",["KSHIFTLD","","KSHIFTLQ"],"",""],"???","???"],
    "???","???","???","???",
    ["???",["","INSERTI128",["INSERTI32X4","","INSERTI64X2"],""],"???","???"],
    ["???",["","EXTRACTI128",["EXTRACTI32X4","","EXTRACTI64X2"],""],"???","???"],
    ["???",["","",["INSERTI32X8","","INSERTI64X4"],""],"???","???"],
    ["???",["","",["EXTRACTI32X8","","EXTRACTI64X4"],""],"???","???"],
    "???","???",
    ["???",["","KEXTRACT",["PCMP,UB,","","PCMP,UW,"],""],"???","???"],
    ["???",["","",["PCM,PB,","","PCM,PW,"],""],"???","???"],
    ["???",["DPPS","DPPS","",""],"???","???"],
    ["???",["DPPD","DPPD","",""],"???","???"],
    ["???",["MPSADBW","MPSADBW",["DBPSADBW","","???"],""],"???","???"],
    ["???",["","",["SHUFI32X4","","SHUFI64X2"],""],"???","???"],
    ["???",["PCLMULQDQ","PCLMULQDQ","",""],"???","???"],
    "???",
    ["???",["","PERM2I128","",""],"???","???"],
    "???",
    ["???",["",["PERMIL2PS","","PERMIL2PS"],"",""],"???","???"],
    ["???",["",["PERMIL2PD","","PERMIL2PD"],"",""],"???","???"],
    ["???",["","BLENDVPS","",""],"???","???"],
    ["???",["","BLENDVPD","",""],"???","???"],
    ["???",["","PBLENDVB","",""],"???","???"],
    "???","???","???",
    ["???",["","",["RANGEPS","","RANGEPD"],""],"???","???"],
    ["???",["","",["RANGESS","","RANGESD"],""],"???","???"],
    ["???",["","","",["RNDFXPNTPS","","RNDFXPNTPD"]],"???","???"],
    "???",
    ["???",["","",["FIXUPIMMPS","","FIXUPIMMPD"],""],"???","???"],
    ["???",["","",["FIXUPIMMSS","","FIXUPIMMSD"],""],"???","???"],
    ["???",["","",["REDUCEPS","","REDUCEPD"],""],"???","???"],
    ["???",["","",["REDUCESS","","REDUCESD"],""],"???","???"],
    "???","???","???","???",
    ["???",["",["FMADDSUBPS","","FMADDSUBPS"],"",""],"???","???"],
    ["???",["",["FMADDSUBPD","","FMADDSUBPD"],"",""],"???","???"],
    ["???",["",["FMSUBADDPS","","FMSUBADDPS"],"",""],"???","???"],
    ["???",["",["FMSUBADDPD","","FMSUBADDPD"],"",""],"???","???"],
    ["???",["PCMPESTRM","PCMPESTRM","",""],"???","???"],
    ["???",["PCMPESTRI","PCMPESTRI","",""],"???","???"],
    ["???",["PCMPISTRM","PCMPISTRM","",""],"???","???"],
    ["???",["PCMPISTRI","PCMPISTRI","",""],"???","???"],
    "???","???",
    ["???",["","",["FPCLASSPS","","FPCLASSPD"],""],"???","???"],
    ["???",["","",["FPCLASSSS","","FPCLASSSD"],""],"???","???"],
    ["???",["",["FMADDPS","","FMADDPS"],"",""],"???","???"],
    ["???",["",["FMADDPD","","FMADDPD"],"",""],"???","???"],
    ["???",["",["FMADDSS","","FMADDSS"],"",""],"???","???"],
    ["???",["",["FMADDSD","","FMADDSD"],"",""],"???","???"],
    ["???",["",["FMSUBPS","","FMSUBPS"],"",""],"???","???"],
    ["???",["",["FMSUBPD","","FMSUBPD"],"",""],"???","???"],
    ["???",["",["FMSUBSS","","FMSUBSS"],"",""],"???","???"],
    ["???",["",["FMSUBSD","","FMSUBSD"],"",""],"???","???"],
    "???","???","???","???","???","???","???","???",
    ["???",["",["FNMADDPS","","FNMADDPS"],"",""],"???","???"],
    ["???",["",["FNMADDPD","","FNMADDPD"],"",""],"???","???"],
    ["???",["",["FNMADDSS","","FNMADDSS"],"",""],"???","???"],
    ["???",["",["FNMADDSD","","FNMADDSD"],"",""],"???","???"],
    ["???",["",["FNMSUBPS","","FNMSUBPS"],"",""],"???","???"],
    ["???",["",["FNMSUBPD","","FNMSUBPD"],"",""],"???","???"],
    ["???",["",["FNMSUBSS","","FNMSUBSS"],"",""],"???","???"],
    ["???",["",["FNMSUBSD","","FNMSUBSD"],"",""],"???","???"],
    "???","???","???","???","???","???","???","???","???","???","???","???","???","???","???","???",
    "???","???","???","???","???","???","???","???","???","???","???","???","???","???","???","???",
    "???","???","???","???","???","???","???","???","???","???","???","???","???","???","???","???",
    "???","???","???","???","???","???","???","???","???","???","???","???","???","???","???","???",
    "???","???","???","???","???","???","???","???","???","???",
    [["","","","CVTFXPNTUDQ2PS"],["","","",["CVTFXPNTPS2UDQ","","???"]],"???",["","","","CVTFXPNTPD2UDQ"]],
    [["","","","CVTFXPNTDQ2PS"],["","","",["CVTFXPNTPS2DQ","","???"]],"???","???"],
    "SHA1RNDS4",
    "???","???","???",
    "???","???","???","???","???","???","???","???","???","???","???","???","???","???","???",
    ["???",["AESKEYGENASSIST","AESKEYGENASSIST","",""],"???","???"],
    "???","???","???","???","???","???",
    ["???","???","???",["","","","CVTFXPNTPD2DQ"]],
    "???","???","???","???","???","???","???","???","???",
    ["???","???","???",["","RORX","",""]],
    "???","???","???","???","???","???","???","???","???","???","???","???","???","???","???",
    "???","???","???","???","???","???","???","???","???","???","???","???","???","???","???","???","???",
    "???","???","???","???","???","???","???","???","???","???","???","???","???","???","???","???","???",
    "???","???","???","???","???","???","???","???","???","???","???","???","???","???","???","???","???",
    "???","???","???","???","???","???","???","???","???","???","???","???","???","???","???","???","???",
    "???","???","???","???","???","???","???","???","???","???","???","???","???","???","???","???","???",
    "???","???","???","???","???","???","???","???","???","???","???","???","???","???","???","???","???",
    "???","???","???","???","???","???","???","???","???","???","???","???","???","???","???","???","???",
    "???","???","???","???","???","???","???","???","???","???","???","???","???","???",
    "VPMACSSWW","VPMACSSWD","VPMACSSDQL","???","???","???","???","???","???",
    "VPMACSSDD","VPMACSSDQH","???","???","???","???","???","VPMACSWW","VPMACSWD","VPMACSDQL",
    "???","???","???","???","???","???","VPMACSDD","VPMACSDQH",
    "???","???",["VPCMOV","","VPCMOV"],["VPPERM","","VPPERM"],"???","???","VPMADCSSWD",
    "???","???","???","???","???","???","???","???","???","???","???","???","???","???","???",
    "VPMADCSWD","???","???","???","???","???","???","???","???","???",
    "VPROTB","VPROTW","VPROTD","VPROTQ","???","???","???","???","???","???","???","???",
    "VPCOM,B,","VPCOM,W,","VPCOM,D,","VPCOM,Q,","???","???","???","???","???","???","???","???","???","???","???",
    "???","???","???","???","???","???","???","???","???","???","???","???","???","???","???","???","???",
    "VPCOM,UB,","VPCOM,UW,","VPCOM,UD,","VPCOM,UQ,",
    "???","???","???","???","???","???","???","???","???","???","???","???","???","???","???","???",
    "???",
    ["???","BLCFILL","BLSFILL","BLCS","TZMSK","BLCIC","BLSIC","T1MSKC"],["???","BLCMSK","???","???","???","???","BLCI","???"],
    "???","???","???","???","???","???","???","???","???","???","???","???","???","???","???",
    ["???",["LLWPCB","SLWPCB","???","???","???","???","???","???"]],
    "???","???","???","???","???","???","???","???","???","???","???","???","???","???","???","???","???","???","???",
    "???","???","???","???","???","???","???","???","???","???","???","???","???","???","???","???","???","???",
    "???","???","???","???","???","???","???","???","???","???","???","???","???","???","???","???","???","???",
    "???","???","???","???","???","???","???","???","???","???","???","???","???","???","???","???","???","???",
    "???","???","???","???","???","???","???","???","???","???","???","???","???","???","???","???","???","???",
    "???","???","???","???","???","???","???","???","???","???","???","???","???","???","???","???","???","???",
    "VFRCZPS","VFRCZPD","VFRCZSS","VFRCZSD","???","???","???","???","???","???","???","???","???","???","???","???",
    ["VPROTB","","VPROTB"],["VPROTW","","VPROTW"],["VPROTD","","VPROTD"],["VPROTQ","","VPROTQ"],
    ["VPSHLB","","VPSHLB"],["VPSHLW","","VPSHLW"],["VPSHLD","","VPSHLD"],["VPSHLQ","","VPSHLQ"],
    ["VPSHAB","","VPSHAB"],["VPSHAW","","VPSHAW"],["VPSHAD","","VPSHAD"],["VPSHAQ","","VPSHAQ"],
    "???","???","???","???","???","???","???","???","???","???","???","???","???","???","???","???","???","???","???",
    "???","???","???","???","???","???","???","???","???","???","???","???","???","???","???","???","???","???",
    "VPHADDBW","VPHADDBD","VPHADDBQ","???","???","VPHADDWD","VPHADDWQ","???","???","???","VPHADDDQ","???","???","???","???","???",
    "VPHADDUBWD","VPHADDUBD","VPHADDUBQ","???","???","VPHADDUWD","VPHADDUWQ","???","???","???","VPHADDUDQ","???","???","???","???","???",
    "VPHSUBBW","VPHSUBWD","VPHSUBDQ","???","???","???","???","???","???","???","???","???","???","???","???","???","???",
    "???","???","???","???","???","???","???","???","???","???","???","???","???","???",
    "???","???","???","???","???","???","???","???","???","???","???","???","???","???","???","???",
    "BEXTR","???",["LWPINS","LWPVAL","???","???","???","???","???","???"],
    "???","???","???","???","???","???","???","???","???","???","???","???","???",
    "???","???","???","???","???","???","???","???","???","???","???","???","???","???","???","???",
    "???","???","???","???","???","???","???","???","???","???","???","???","???","???","???","???",
    "???","???","???","???","???","???","???","???","???","???","???","???","???","???","???","???",
    "???","???","???","???","???","???","???","???","???","???","???","???","???","???","???","???",
    "???","???","???","???","???","???","???","???","???","???","???","???","???","???","???","???",
    "???","???","???","???","???","???","???","???","???","???","???","???","???","???","???","???",
    "???","???","???","???","???","???","???","???","???","???","???","???","???","???","???","???",
    "???","???","???","???","???","???","???","???","???","???","???","???","???","???","???","???",
    "???","???","???","???","???","???","???","???","???","???","???","???","???","???","???","???",
    "???","???","???","???","???","???","???","???","???","???","???","???","???","???","???","???",
    "???","???","???","???","???","???","???","???","???","???","???","???","???","???","???","???",
    "???","???","???","???","???","???","???","???","???","???","???","???","???","???","???","???",
    "???","???","???","???","???","???","???","???","???","???","???","???","???","???","???","???",
    "???","???","???","???","???","???","???","???","???","???","???","???","???","???","???","???",
    "???","???","???","???","DELAY","???","???","???","???","???","???","???","???","???","???","???",
    [["VLOADD","VLOADQ","",""],"???"],"???",
    [["VLOADUNPACKLD","VLOADUNPACKLQ","",""],"???"],
    [["VLOADUNPACKHD","VLOADUNPACKHQ","",""],"???"],
    [["VSTORED","VSTOREQ","",""],"???"],"???",
    [["VPACKSTORELD","VPACKSTORELQ","",""],"???"],
    [["VPACKSTOREHD","VPACKSTOREHQ","",""],"???"],
    ["VGATHERD","???"],["VGATHERPFD","???"],"???",["VGATHERPF2D","???"],
    ["VSCATTERD","???"],["VSCATTERPFD","???"],"???",["VSCATTERPF2D","???"],
    ["VCMP,PS,","VCMP,PD,","",""],"VCMP,PI,","VCMP,PU,","???",
    ["VCMP,PS,","VCMP,PD,","",""],"VCMP,PI,","VCMP,PU,","???",
    "???","???","???","???","???","???","???","???",
    "VTESTPI","???","???","???","???","???","???","???","???","???","???","???","???","???","???","???",
    ["VADDPS","VADDPD","",""],"VADDPI","???","VADDSETCPI","???","VADCPI","VADDSETSPS","VADDSETSPI",
    ["VADDNPS","VADDNPD","",""],"???","???","???","???","???","???","???",
    ["VSUBPS","VSUBPD","",""],"VSUBPI","???","VSUBSETBPI","???","VSBBPI","???","???",
    ["VSUBRPS","VSUBRPD","",""],"VSUBRPI","???","VSUBRSETBPI","???","VSBBRPI","???","???",
    ["VMADD231PS","VMADD231PD","",""],"VMADD231PI",
    ["VMADD213PS","VMADD213PD","",""],"???",
    ["VMADD132PS","VMADD132PD","",""],"???",
    "VMADD233PS","VMADD233PI",
    ["VMSUB231PS","VMSUB231PD","",""],"???",
    ["VMSUB213PS","VMSUB213PD","",""],"???",
    ["VMSUB132PS","VMSUB132PD","",""],"???","???","???",
    ["VMADDN231PS","VMADDN231PD","",""],"???",
    ["VMADDN213PS","VMADDN213PD","",""],"???",
    ["VMADDN132PS","VMADDN132PD","",""],"???","???","???",
    ["VMSUBR231PS","VMSUBR231PD","",""],"???",
    ["VMSUBR213PS","VMSUBR213PD","",""],"???",
    ["VMSUBR132PS","VMSUBR132PD","",""],"???",
    ["VMSUBR23C1PS","VMSUBR23C1PD","",""],"???",
    ["VMULPS","VMULPD","",""],"VMULHPI","VMULHPU","VMULLPI","???","???","VCLAMPZPS","VCLAMPZPI",
    ["VMAXPS","VMAXPD","",""],"VMAXPI","VMAXPU","???",
    ["VMINPS","VMINPD","",""],"VMINPI","VMINPU","???",
    ["???","VCVT,PD2PS,","",""],["VCVTPS2PI","VCVT,PD2PI,","",""],["VCVTPS2PU","VCVT,PD2PU,","",""],"???",
    ["???","VCVT,PS2PD,","",""],["VCVTPI2PS","VCVT,PI2PD,","",""],["VCVTPU2PS","VCVT,PU2PD,","",""],"???",
    "VROUNDPS","???","VCVTINSPS2U10","VCVTINSPS2F11","???","VCVTPS2SRGB8","VMAXABSPS","???",
    "VSLLPI","VSRAPI","VSRLPI","???",
    ["VANDNPI","VANDNPQ","",""],["VANDPI","VANDPQ","",""],
    ["VORPI","VORPQ","",""],["VXORPI","VXORPQ","",""],
    "VBINTINTERLEAVE11PI","VBINTINTERLEAVE21PI","???","???","???","???","???","???",
    "VEXP2LUTPS","VLOG2LUTPS","VRSQRTLUTPS","???","VGETEXPPS","???","???","???",
    "VSCALEPS","???","???","???","???","???","???","???",
    "VRCPRESPS","???","VRCPREFINEPS","???","???","???","???","???","???","???","???","???","???","???","???","???",
    "???","???","???","???","???","???","???","???","???","???","???","???","???","???","???","???",
    "???","???","???","???","???","???","???","???","???","???","???","???","???","???","???","???",
    "VFIXUPPS","VSHUF128X32","VINSERTFIELDPI","VROTATEFIELDPI","???","???","???","???",
    "???","???","???","???","???","???","???","???",
    ["???","BSFI"],["???","BSFI"],["???","BSFI"],["???","BSFI"],
    ["???","BSRI"],["???","BSRI"],["???","BSRI"],["???","BSRI"],
    ["???","BSFF"],["???","BSFF"],["???","BSFF"],["???","BSFF"],
    ["???","BSRF"],["???","BSRF"],["???","BSRF"],["???","BSRF"],
    ["???","BITINTERLEAVE11"],["???","BITINTERLEAVE11"],["???","BITINTERLEAVE11"],["???","BITINTERLEAVE11"],
    ["???","BITINTERLEAVE21"],["???","BITINTERLEAVE21"],["???","BITINTERLEAVE21"],["???","BITINTERLEAVE21"],
    ["???","INSERTFIELD"],["???","INSERTFIELD"],["???","INSERTFIELD"],["???","INSERTFIELD"],
    ["???","ROTATEFIELD"],["???","ROTATEFIELD"],["???","ROTATEFIELD"],["???","ROTATEFIELD"],
    ["???","COUNTBITS"],["???","COUNTBITS"],["???","COUNTBITS"],["???","COUNTBITS"],
    ["???","QUADMASK16"],["???","QUADMASK16"],["???","QUADMASK16"],["???","QUADMASK16"],
    "???","???","???","???",
    "VKMOVLHB",
    [["CLEVICT1","CLEVICT2","LDVXCSR","STVXCSR","???","???","???","???"],"???"],
    [["VPREFETCH1","VPREFETCH2","???","???","???","???","???","???"],"???"],
    [["VPREFETCH1","VPREFETCH2","???","???","???","???","???","???"],"???"],
    "VKMOV","VKMOV","VKMOV","VKMOV",
    "VKNOT","VKANDNR","VKANDN","VKAND",
    "VKXNOR","VKXOR","VKORTEST","VKOR",
    "???","VKSWAPB",
    ["???",["DELAY","SPFLT","???","???","???","???","???","???"]],
    ["???",["DELAY","SPFLT","???","???","???","???","???","???"]]
  ],
  operands: [
    "06000A000003","070E0B0E0003","0A0006000003","0B0E070E0003","16000C000003","170E0DE60003","","",
    "06000A000003","070E0B0E0003","0A0006000003","0B0E070E0003","16000C000003","170E0DE60003","","",
    "06000A000003","070E0B0E0003","0A0006000003","0B0E070E0003","16000C000003","170E0DE60003","","",
    "06000A000003","070E0B0E0003","0A0006000003","0B0E070E0003","16000C000003","170E0DE60003","","",
    "06000A000003","070E0B0E0003","0A0006000003","0B0E070E0003","16000C000003","170E0DE60003","","",
    "06000A000003","070E0B0E0003","0A0006000003","0B0E070E0003","16000C000003","170E0DE60003","","",
    "06000A000003","070E0B0E0003","0A0006000003","0B0E070E0003","16000C000003","170E0DE60003","","",
    "06000A00","070E0B0E","0A000600","0B0E070E","16000C00","170E0DE6","","",
    "03060003","03060003","03060003","03060003","03060003","03060003","03060003","03060003",
    "03060003","03060003","03060003","03060003","03060003","03060003","03060003","03060003",
    "030A","030A","030A","030A","030A","030A","030A","030A",
    "030A","030A","030A","030A","030A","030A","030A","030A",
    ["","",""],["","",""],
    ["0A020606","0A010604",""],
    "0B0E0704",
    "","","","",
    "0DE6","0B0E070E0DE6",
    "0DA1","0B0E070E0DE1",
    "22001A01","230E1A01","1A012000","1A01210E",
    "1000000E","1000000E","1000000E","1000000E","1000000E","1000000E","1000000E","1000000E",
    "1000000E","1000000E","1000000E","1000000E","1000000E","1000000E","1000000E","1000000E",
    ["06000C000003","06000C000003","06000C000003","06000C000003","06000C000003","06000C000003","06000C000003","06000C00"],
    ["070E0DE60003","070E0DE60003","070E0DE60003","070E0DE60003","070E0DE60003","070E0DE60003","070E0DE60003","070E0DE6"],
    ["06000C000003","06000C000003","06000C000003","06000C000003","06000C000003","06000C000003","06000C000003","06000C00"],
    ["070E0DE10003","070E0DE10003","070E0DE10003","070E0DE10003","070E0DE10003","070E0DE10003","070E0DE10003","070E0DE1"],
    "06000A00","070E0B0E",
    "0A0006000003","0B0E070E0003",
    "06000A000001","070E0B0E0001",
    "0A0006000001","0B0E070E0001",
    ["06020A080001","070E0A080001"],
    ["0B0E0601",""],
    ["0A0806020001","0A08070E0001"],
    ["070A","","","","","","",""],
    [["","","",""],["","","",""],["","","",""],["","","",""]],
    "170E030E0003","170E030E0003","170E030E0003","170E030E0003","170E030E0003","170E030E0003","170E030E0003",
    ["","",""],["","",""],
    "0D060C01",
    "",
    ["","",""],["","",""],
    "","",
    "160004000001","170E050E0001",
    "040016000001","050E170E0001",
    "22002000","230E210E",
    "22002000","230E210E",
    "16000C00","170E0DE6",
    "22001600","230E170E","16002000","170E210E","16002200","170E230E",
    "02000C000001","02000C000001","02000C000001","02000C000001","02000C000001","02000C000001","02000C000001","02000C000001",
    "030E0D0E0001","030E0D0E0001","030E0D0E0001","030E0D0E0001","030E0D0E0001","030E0D0E0001","030E0D0E0001","030E0D0E0001",
    ["06000C00","06000C00","06000C00","06000C00","06000C00","06000C00","06000C00","06000C00"],
    ["070E0C00","070E0C00","070E0C00","070E0C00","070E0C00","070E0C00","070E0C00","070E0C00"],
    "0C010008","0008",
    "0B060906","0B060906",
    [
      "06000C000001","","","","","","",
      ["0C00","0C00","0C00","0C00","0C00","0C00","0C00","0C00"]
    ],
    [
      "070E0D060001","","","","","","",
      ["1002","1002","1002","1002","1002","1002","1002","1002"]
    ],
    "0C010C00","",
    "0C01","","2C00",
    "0C00","",
    ["","",""],
    ["06002A00","06002A00","06002A00","06002A00","06002A00","06002A00","06002A00","06002A00"],
    ["070E2A00","070E2A00","070E2A00","070E2A00","070E2A00","070E2A00","070E2A00","070E2A00"],
    ["06001800","06001800","06001800","06001800","06001800","06001800","06001800","06001800"],
    ["070E1800","070E1800","070E1800","070E1800","070E1800","070E1800","070E1800","070E1800"],
    "0C00","0C00","",
    "1E00",
    [
      ["0604","0604","0604","0604","0604","0604","0604","0604"],
      ["24080609","24080609","0609","0609","24080609","24080609","24080609","24080609"]
    ],
    [
      ["0604","","0604","0604","0601","0602","0601","0602"],
      [
        "0609","0609",
        ["","","","","","","",""],
        "0609",
        ["","","","","","","",""],
        ["","","","","","","",""],
        ["","","","","","","",""],
        ["","","","","","","",""]
      ]
    ],
    [
      ["0604","0604","0604","0604","0604","0604","0604","0604"],
      [
        "24080609","24080609","24080609","24080609","",
        ["","","","","","","",""],"",""
      ]
    ],
    [
      ["0604","0604","0604","0604","","0607","","0607",""],
      [
        "24080609","24080609","24080609","24080609",
        ["","","","","","","",""],
        "24080609","24080609",""
      ]
    ],
    [
      ["0606","0606","0606","0606","0606","0606","0606","0606"],
      ["06092408","06092408","0609","0609","06092408","06092408","06092408","06092408"]
    ],
    [
      ["0606","0606","0606","0606","0606","","0601","0602"],
      ["0609","0609","0609","0609","0609","0609","",""]
    ],
    [
      ["0602","0602","0602","0602","0602","0602","0602","0602"],
      [
        "06092408","06092408","0609",
        ["","","","","","","",""],
        "06092408","06092408","06092408","06092408"
      ]
    ],
    [
      ["0602","0602","0602","0602","0607","0606","0607","0606"],
      [
        "0609","0609","0609","0609",
        ["1601","","","","","","",""],
        "24080609","24080609",
        ""
      ]
    ],
    "10000004","10000004","10000004","10000004",
    "16000C00","170E0C00","0C001600","0C00170E",
    "110E0008",
    "110E0008",
    "0D060C01",
    "100000040004",
    "16001A01","170E1A01",
    "1A011600","1A01170E",
    "","","","","","",
    ["06000C00","","06000003","06000003","16000600","0600","16000600","0600"],
    ["070E0D06","","070E0003","070E0003","170E070E","070E","170E070E","170E070E"],
    "","","","","","",
    ["06000003","06000003","","","","","",""],
    [
      ["070E0003","070E0003","070A0004","090E0008","070A0008","090E0008","070A",""],
      ["070E0003","070E0003","070A0008","","070A0008","","070A",""]
    ],
    [
      ["0602","0602","0602","0602","0602","0602","070E",""],
      ["070E","070E","0601","0601","0601","0601","070E",""]
    ],
    [
      ["0908","0908","0908","0908","0602","","0602","0601"],
      [
        ["","","","","","","",""],
        ["170819081B08","17081908","","","","","",""],
        ["","","","","","","",""],
        ["1708","","1708","1708","","","1602","17081802"],
        "070E","","0601",
        ["","","170819081B08","170819081B08","","","",""]
      ]
    ],
    ["0B0E0612","0B0E070E"],["0B0E0612","0B0E070E"],"",
    "","","","",
    "","","","",
    [["0601","0601","","","","","",""],""],
    "",
    "0A0A06A9",
    [
      ["0B700770","0B700770","0A040603","0A040609"],
      ["0B700770","0B700770","0A0412040604","0A0412040604"]
    ],
    [
      ["07700B70","07700B70","06030A04","06090A04"],
      ["07700B70","07700B70","060412040A04","060412040A04"]
    ],
    [
      ["0A0412040606","0A0412040606","0B700770","0B700768"],
      ["0A0412040604","","0B700770","0B700770"]
    ],
    [["06060A04","06060A04","",""],""],
    ["0B70137007700140","0B70137007700140","",""],
    ["0B70137007700140","0B70137007700140","",""],
    [["0A0412040606","0A0412040606","0B700770",""],["0A0412040604","","0B700770",""]],
    [["06060A04","06060A04","",""],""],
    [["0601","0601","0601","0601","","","",""],""],
    "",
    [[["0A0B07080180","","",""],["0A0B07100180","","",""],["0A0B07080180","","",""],["0A0B07080180","","",""]],
    ["",["0A0B060B","","",""],["0A0B07080180","","",""],["0A0B07080180","","",""]]],
    [[["07080A0B0180","","",""],["07100A0B0180","","",""],["0A0B07080180","","",""],["0A0B07080180","","",""]],
    ["",["0A0B060B","","",""],"",["0A0B07080180","","",""]]],
    "","","",
    "070E",
    ["","07080A0C0001"],["","07080A0D0001"],
    ["","0A0C07080001"],["","0A0D07080001"],
    ["","07080A0E0001"],"",
    ["","0A0E07080001"],"",
    [
      ["0A040648","0B300730","0B700770","0A06066C0130"],
      ["0A040648","0B300730","0B700770","0A06066C0130"],
      "",""
    ],
    [
      [
        ["06480A04","07300B30","07700B70","066C0A060130"],
        ["06480A04","07300B30","07700B70","066C0A060130"],
        ["","","",["066C0A060138","066C0A060138","066C0A060138"]],
        ["","","",["066C0A060138","066C0A060138","066C0A060138"]]
      ],
      [
        ["06480A04","07300B30","07700B70","066C0A06"],
        ["06480A04","07300B30","07700B70","066C0A06"],
        "",""
      ]
    ],
    [
      ["0A0406A9","","",""],["0A0406A9","","",""],
      "0A041204070C010A","0A041204070C010A"
    ],
    [
      [
        "07700B70","07700B70",
        ["06030A04","","",""],["06060A04","","",""]
      ],""
    ],
    [
      ["0A0A0649","","",""],["0A0A0648","","",""],
      "0B0C06430109","0B0C06490109"
    ],
    [
      ["0A0A0649","","",""],["0A0A0648","","",""],
      "0B0C0643010A","0B0C0649010A"
    ],
    ["0A0406430101","0A0406490101","",""],
    ["0A0406430101","0A0406490101","",""],
    "","","","",
    "","","",
    "",
    "",
    "",
    "",
    "","","","","",
    "0B0E070E",
    [
      ["0B0E070E0180",["0A0F120F06FF","","0A0F120F06FF"],"",""],
      ["0B0E070E0180",["0A0F120F06FF","","0A0F120F06FF"],"",""],"",""
    ],
    [
      ["0B0E070E0180",["0A0F120F06FF","","0A0F120F06FF"],"",""],
      ["0B0E070E0180",["0A0F120F06FF","","0A0F120F06FF"],"",""],"",""
    ],
    [["0B0E070E0180","0A0F06FF","",""],"","",""],
    [
      ["0B0E070E0180",["0A0F06FF","","0A0F06FF"],"",""],
      ["0B0E070E0180",["0A0F06FF","","0A0F06FF"],"",""],"",""
    ],
    [
      ["0A02070E0180",["0A0F120F06FF","","0A0F120F06FF"],"",""],
      ["0A02070E0180",["0A0F120F06FF","","0A0F120F06FF"],"",""],"",""
    ],
    [
      ["0B0E070E0180",["0A0F120F06FF","","0A0F120F06FF"],"",""],
      ["0B0E070E0180",["0A0F120F06FF","","0A0F120F06FF"],"",""],"",""
    ],
    [
      ["0B0E070E0180",["0A0F120F06FF","","0A0F120F06FF"],"",""],
      ["0B0E070E0180",["0A0F120F06FF","","0A0F120F06FF"],"",""],"",""
    ],
    [["0B0E070E0180","0A0F06FF","",""],"","",""],
    [["0B0E070E0180","0A0F06FF","",""],"","",""],
    [
      ["0B0E070E0180",["0A0F120F06FF","","0A0F120F06FF"],"",""],
      ["0B0E070E0180",["0A0F120F06FF","","0A0F120F06FF"],"",""],"",""
    ],
    [
      ["0B0E070E0180",["0A0F120F06FF","","0A0F120F06FF"],"",""],
      ["0B0E070E0180",["0A0F120F06FF","",""],"",""],"",""
    ],
    "0B0E070E","0B0E070E","0B0E070E","0B0E070E",
    ["",[["0B0C0648","0B0C0730","",""],["0B0C0648","0B0C0730","",""],"",""]],
    ["0B7007700142","0B7007700142","0A04120406430102","0A04120406490102"],
    [
      ["0A040648","0A040648","",""],"",
      ["0A040643","0A0412040643","",""],""
    ],
    [
      ["0A040648","0A040648","",""],"",
      ["0A040643","0A0412040643","",""],""
    ],
    ["0B70137007700140","0B70137007700140","",""],
    ["0B70137007700140","0B70137007700140","",""],
    ["0B70137007700140","0B70137007700140","",""],
    ["0B70137007700140","0B70137007700140","",""],
    [
      ["0A040648","0B3013300730","0B70137007700152","0A061206066C0152"],
      ["0A040648","0B3013300730","0B70137007700152","0A061206066C0152"],
      "0A04120406430102","0A04120406460102"
    ],
    [
      ["0A040648","0B3013300730","0B70137007700152","0A061206066C0152"],
      ["0A040648","0B3013300730","0B70137007700152","0A061206066C0152"],
      "0A04120406430102","0A04120406460102"
    ],
    [
      ["0A040648","0B300718","0B7007380151","0A06065A0171"],
      ["0A040648","0B180730","0B3807700152","0A05066C0152"],
      "0A04120406430101","0A04120406460102"
    ],
    [["0B7007700142","","0B380770014A"],["0B700770014A","",""],"0B7007700141",""],
    [
      ["0A040648","0B3013300730","0B70137007700152","0A061206066C0152"],
      ["0A040648","0B3013300730","0B70137007700152","0A061206066C0152"],
      "0A04120406430102","0A04120406460102"
    ],
    ["0B70137007700141","0B70137007700141","0A04120406430101","0A04120406460101"],
    ["0B70137007700142","0B70137007700142","0A04120406430102","0A04120406460102"],
    ["0B70137007700141","0B70137007700141","0A04120406430101","0A04120406460101"],
    [["0A0A06A3","","",""],"0B70137007700108","",""],
    [["0A0A06A3","","",""],"0B70137007700108","",""],
    [["0A0A06A3","","",""],"0B701370077001400108","",""],
    [["0A0A06A9","","",""],"0B70137007700108","",""],
    [["0A0A06A9","","",""],["0A040648","0B3013300730","0A0F137007700108",""],"",""],
    [["0A0A06A9","","",""],["0A040648","0B3013300730","0A0F137007700108",""],"",""],
    [["0A0A06A9","","",""],["0A040648","0B3013300730",["0A0F137007700148","",""],["0A0F1206066C0148","",""]],"",""],
    [["0A0A06A9","","",""],"0B70137007700108","",""],
    [["0A0A06A9","","",""],"0B70137007700108","",""],
    [["0A0A06A9","","",""],"0B70137007700108","",""],
    [["0A0A06A9","","",""],["0B70137007700148","",""],"",""],
    [["0A0A06A9","","",""],["0B70137007700148","",""],"",""],
    ["","0B70137007700140","",""],
    ["","0B70137007700140","",""],
    [["0A0A070C","","",""],["0A04070C0108","","0A04070C0108"],"",""],
    [
      [
        ["0A0A06A9","", "",""],
        ["0B700770","0B700770",["0B7007700108","","0B700770"],["0A06066C0128","","0A06066C0120"]],
        ["0A040710","0B700770",["0B700770","","0B7007700108"],""],
        ["","",["0B7007700108","","0B700770"],""]
      ],
      [
        ["0A0A06A9","", "",""],
        ["0B700770","0B700770",["0B7007700108","","0B700770"],["0A06066C0148","","0A06066C0140"]],
        ["0A040710","0B700770",["0B700770","","0B7007700108"],""],
        ["","",["0B7007700108","","0B700770"],""]
      ]
    ],
    [
      ["0A0A06A90C00","","",""],
      ["0A0406480C00","0B3007300C00",["0B7007700C000108","",""],["0A06066C0C000108","",""]],
      "0B7007700C000108",
      "0B7007700C000108"
    ],
    [
      "",
      [
        "","",
        [["060A0C00","","",""],"137007700C000108","",""],"",
        [["060A0C00","","",""],"137007700C000108","",""],"",
        [["060A0C00","","",""],"137007700C000108","",""],""
      ]
    ],
    [
      ["",["","",["137007700C000148","","137007700C000140"],""],"",""],
      ["",["","",["137007700C000148","","137007700C000140"],""],"",""],
      [["060A0C00","","",""],["06480C00","133007300C00",["137007700C000148","",""],["1206066C0C000148","",""]],"",""],
      "",
      [["060A0C00","","",""],["06480C00","133007300C00",["137007700C000148","","137007700C000140"],["1206066C0C000148","",""]],"",""],
      "",
      [["060A0C00","","",""],["06480C00","133007300C00",["137007700C000148","",""],["1206066C0C000148","",""]],"",""],
      ""
    ],
    [
      "",
      [
        "","",
        [["137007700C00","137007700C00","",""],"137007700C000140","",""],["","137007700C000108","",""],
        "","",
        [["137007700C00","137007700C00","",""],"137007100C000140","",""],["","137007700C000108","",""]
      ]
    ],
    [["0A0A06A9","","",""],["0A040710","13300B300730","0A0F137007700108",""],"",""],
    [["0A0A06A9","","",""],["0A040710","13300B300730","0A0F137007700108",""],"",""],
    [["0A0A06A9","","",""],["0A040710","13300B300730",["0A0F137007700148","",""],["0A0F1206066C0148","",""]],"",""],
    [["",["","",""],"",""],"","",""],
    [
      ["07080B080180","",["0B7007700141","","0B3807700149"],""],
      ["064F0C000C00","",["0B7007380149","","0B7007700141"],""],
      ["","","0B0C06440109",""],
      ["0A04064F0C000C00","","0B0C06460109",""]
    ],
    [
      ["0B0807080180","",["0B7007700142","","0B380770014A"],""],
      ["0A04064F","",["0B700738014A","","0B7007700142"],""],
      ["","","0B0C0644010A",""],
      ["0A04064F","","0B0C0646010A",""]
    ],
    [
      "",
      ["","",["0B7007380149","","0B7007700141"],""],
      ["","",["0B7007380142","","0B700770014A"],"0A06065A0170"],
      ["","",["0B700770014A","","0B3807700142"],""]
    ],
    [
      "",
      ["","",["0B700738014A","","0B7007700142"],""],
      ["","","0A041204070C010A",""],
      ["","","0A041204070C010A",""]
    ],
    [
      "",["0A040604","0B7013700770","",""],
      "",["0A040604","0B7013700770","",""]
    ],
    [
      "",["0A040604","0B7013700770","",""],
      "",["0A040604","0B7013700770","",""]
    ],
    [["070C0A0A","","",""],["06240A040108","","06360A040108"],["0A040646","0A040646",["","","0A0406460108"],""],""],
    [
      ["06A90A0A","","",""],
      ["06480A04","07300B30",["07700B700108","","07700B70"],["066C0A060128","","066C0A060120"]],
      ["06480A04","07300B30",["07700B70","","07700B700108"],""],
      ["","",["07700B700108","","07700B70"],""]
    ],
    "1106000C","1106000C","1106000C","1106000C","1106000C","1106000C","1106000C","1106000C",
    "1106000C","1106000C","1106000C","1106000C","1106000C","1106000C","1106000C","1106000C",
    [
      ["0600",["0A0F06F2","","0A0F06F6"],"",""],
      ["0600",["0A0F06F0","","0A0F06F4"],"",""],"",""
    ],
    [
      ["0600",["06120A0F","","06360A0F"],"",""],
      ["0600",["06000A0F","","06240A0F"],"",""],"",""
    ],
    [
      ["0600",["0A0F062F","",""],"",""],
      ["0600",["0A0F062F","",""],"",""],"",
      ["0600",["0A0F062F","","0A0F063F"],"",""]
    ],
    [
      ["0600",["062F0A0F","",""],"",""],
      ["0600",["062F0A0F","",""],"",""],"",
      ["0600",["062F0A0F","","063F0A0F"],"",""]
    ],
    "0600",[["0600","0A03120F06FF","",""],"","",""],
    "0600",[["0600","0A03120F06FF","",""],"","",""],
    [
      ["0600",["0A0F06FF","","0A0F06FF"],"",""],
      ["0600",["0A0F06FF","","0A0F06FF"],"",""],"",""
    ],
    [
      ["0600",["0A0F06FF","","0A0F06FF"],"",""],
      ["0600",["0A0F06FF","","0A0F06FF"],"",""],"",""
    ],
    "0600","0600","0600","0600","0600","0600",
    "2608","2608",
    "",
    "070E0B0E0003",
    "070E0B0E0C00","070E0B0E1800",
    "0B0E070E","070E0B0E",
    "2808","2808",
    "",
    "070E0B0E0003",
    "070E0B0E0C00","070E0B0E1800",
    [
      [
        ["0601","","0601"],["0601","","0601"],
        "0603","0603",
        ["0601","","0601"],["0601","","0601"],
        ["0601","0601","0601"],
        ["0601","0601",""]
      ],
      [
        ["","",["0602","","",""],""],["","",["0602","","",""],""],
        ["","",["0602","","",""],""],["","",["0602","","",""],""],
        "",
        ["","","","","","","",""],
        ["","","","","","","",""],
        ["","","","","","","",""]
      ]
    ],
    "0B0E070E",
    "06000A000003","070E0B0E0003",
    ["0B0E090E",""],
    "070E0B0E0003",
    ["0B0E090E",""],
    ["0B0E090E",""],
    "0B0E0600","0B0E0602",
    [
      ["1002","","",""],"",
      ["0B060706","0A020602","",""],""
    ],"",
    ["","","","","070E0C000003","070E0C000003","070E0C000003","070E0C000003"],
    "0B0E070E0003",
    [
      ["0B0E070E0180","","",""],"",
      ["0B0E070E0180","0A020602","",""],["0B0E070E0180","0A020602","",""]
    ],
    [
      ["0B0E070E0180","","",""],"",
      ["0B0E070E0180","0A020602","",""],["0B0E070E0180","","",""]
    ],
    "0B0E0600","0B0E0601",
    "06000A000003","070E0B0E0003",
    [
      ["0A0406480C00","0B30133007300C00","0A0F137007700C000151","0A0F066C0C000151"],
      ["0A0406480C00","0B30133007300C00","0A0F137007700C000151","0A0F066C0C000151"],
      ["0A0406440C00","0A04120406480C00","0A0F120406440C000151",""],
      ["0A0406490C00","0A04120406480C00","0A0F120406460C000151",""]
    ],
    ["06030A02",""],
    [["0A0A06220C00","","",""],"0A04120406220C000108","",""],
    ["",[["06020A0A0C00","","",""],"06020A040C000108","",""]],
    ["0B70137007700C000140","0B70137007700C000140","",""],
    [
      [
        "",
        ["06060003","","060B0003"],
        "",
        ["0601","","0601"],
        ["0601","","0601"],
        ["0601","","0601"],
        ["0606","0606","0606",""],["0606","","",""]
      ],
      [
        "",
        ["","","","","","","",""],
        "","","","",
        "070E","070E"
      ]
    ],
    "030E","030E","030E","030E","030E","030E","030E","030E",
    ["",["0A040648","0B3013300730","",""],"",["0A040648","0B3013300730","",""]],
    [["0A0A06A9","","",""],"0B70137006480108","",""],
    [["0A0A06A9","","",""],["0A040648","0B3013300648",["0B70137006480108","",""],""],"",""],
    [["0A0A06A9","","",""],"0B70137006480100","",""],
    [["0A0A06A9","","",""],"0B70137007700140","",""],
    [["0A0A06A9","","",""],"0B70137007700108","",""],
    [
      ["","06490A040100","",""],
      ["","06490A040100",["0A040649","","",""],["0A040649","","",""]]
    ],
    ["",[["0B0C06A0","","",""],["0B0C0640","0B0C0730","",""],"",""]],
    [["0A0A06A9","","",""],"0B70137007700108","",""],
    [["0A0A06A9","","",""],"0B70137007700108","",""],
    [["0A0A06A9","","",""],"0B70137007700108","",""],
    [["0A0A06A9","","",""],["0A040648","0B3013300730",["0B70137007700148","","0B70137007700140"],["0A061206066C0148","","0A061206066C0140"]],"",""],
    [["0A0A06A9","","",""],"0B70137007700108","",""],
    [["0A0A06A9","","",""],"0B70137007700108","",""],
    [["0A0A06A9","","",""],"0B70137007700108","",""],
    [["0A0A06A9","","",""],["0A040648","0B3013300730",["0B70137007700148","","0B70137007700140"],["0A061206066C0148","","0A061206066C0140"]],"",""],
    [["0A0A06A9","","",""],"0B70137007700108","",""],
    [
      [["0A0A06A9","","",""],["0A040648","0B3013300648","0B70137006480108",""],"",""],
      [["0A0A06A9","","",""],["0A040648","0B3013300730","0B70137006480108",""],"",""]
    ],
    [["0A0A06A9","","",""],["0A040648","0B3013300648",["0B70137006480108","","0B7013700648"],""],"",""],
    [["0A0A06A9","","",""],"0B70137007700108","",""],
    [["0A0A06A9","","",""],"0B70137007700108","",""],
    [["0A0A06A9","","",""],"0B70137007700108","",""],
    [
      "",
      ["0A040648","0A040730","0B3807700141",""],
      ["0A040649","0B300738",["0A0406480140","0B7007380140","0B700770014A"],"0A06065A0170"],
      "0B3807700142"
    ],
    [[["06090A0A","","",""],["07700B700108","",""],"",""],""],
    [["0A0A06A9","","",""],"0B70137007700108","",""],
    [["0A0A06A9","","",""],"0B70137007700108","",""],
    [["0A0A06A9","","",""],"0B70137007700108","",""],
    [["0A0A06A9","","",""],["0A040648","0B3013300730",["0B70137007700148","","0B70137007700140"],["0A061206066C0148","","0A061206066C0140"]],"",""],
    [["0A0A06A9","","",""],"0B70137007700108","",""],
    [["0A0A06A9","","",""],"0B70137007700108","",""],
    [["0A0A06A9","","",""],"0B70137007700108","",""],
    [["0A0A06A9","","",""],["0A040648","0B3013300730",["0B70137007700148","","0B70137007700140"],["0A061206066C0148","","0A061206066C0140"]],"",""],
    [["","","",["0A040648","0A040730","",""]],"0000"],
    [["0A0A06A9","","",""],"0B70137006480108","",""],
    [["0A0A06A9","","",""],["0B70137006480108","",""],"",""],
    [["0A0A06A9","","",""],"0B7013700648","",""],
    [["0A0A06A9","","",""],"0B70137007700140","",""],
    [["0A0A06A9","","",""],"0B70137007700108","",""],
    [["0A0A06A9","","",""],"0B70137007700108","",""],
    ["",[["0A0A060A","","",""],["0B040648","0B040648","",""],"",""]],
    [["0A0A06A9","","",""],"0B70137007700108","",""],
    [["0A0A06A9","","",""],"0B70137007700108","",""],
    [["0A0A06A9","","",""],["0A040648","0B3013300730",["0B70137007700148","",""],["0A061206066C0148","",""]],"",""],
    [["0A0A06A9","","",""],"0B70137007700140","",""],
    [["0A0A06A9","","",""],"0B70137007700108","",""],
    [["0A0A06A9","","",""],"0B70137007700108","",""],
    [["0A0A06A9","","",""],["0A040648","0B3013300730",["0B70137007700148","",""],["0A061206066C0148","",""]],"",""],
    "",
    [["0A0A06A9","","",""],"0B70137007700108","",""],
    [["0A0A06A9","","",""],["0A040648","0B3013300730","",""],"",""],
    [["0A0A06A9","","",""],["0A040648","0B3013300730","",""],"",""],
    [["0A0A06A9","","",""],["0A040648","0B3013300730","",""],"",""],
    [["0A0A06A9","","",""],"0B70137007700108","",""],
    [["0A0A06A9","","",""],["0A040648","0B3013300730","",""],"",""],
    [["0A0A06A9","","",""],["0A040648","0B3013300730","",""],"",""],
    [["0A0A06A9","","",""],["0A040648","0B3013300730","",""],"",""],
    [["0A0A06A9","","",""],["0A040648","0B3013300730","",""],"",""],
    [["0A0A06A9","","",""],["0A040648","0B3013300730","",""],"",""],
    [["0A0A06A9","","",""],["0A040648","0B3013300730","",""],"",""],
    [["0A0A06A9","","",""],"0B70137007700108","",""],
    ["",["","0B3013300730",["0B70137007700148","",""],""],"",""],
    ["",["","0B3013300730","0B70137007700140",""],"",""],
    ["",["","0B300730","",""],"",""],
    ["",["","0B300730","",""],"",""],
    ["",["0A0406482E00","0B30133007301530","0B7013700770",""],["","","07380B70",""],""],
    ["",["","","0B7013700770",""],["","","071C0B70",""],""],
    ["",["","","0B7013700770",""],["","","070E0B70",""],""],
    ["",["","0B300718",["0B7007380109","",""],""],["","","07380B70",""],""],
    ["",["0A0407102E00","0B30133007301530",["0B70137007700148","","0B70137007700140"],""],["","","071C0B70",""],""],
    ["",["0A0407102E00","0B30133007301530",["0B70137007700148","","0B70137007700140"],""],["","","07380B70",""],""],
    ["",["","0B3013300730",["0B70137007700148","","0B70137007700140"],""],"",""],
    ["",["0A040648","0B300730","",""],"",""],
    ["",["","0B300644",["0B7006440138","",""],["0A0606440138","",""]],"",""],
    ["",["","0A050646",["0B6806460108","","0B700646"],["","","0A060646"]],"",""],
    ["",["","0A050648",["0B6806480138","","0B680648"],["0A0606480138","",""]],"",""],
    ["",["","",["0A06065A0108","","0A06065A"],["","","0A06065A"]],"",""],
    [["0A0A06A9","","",""],"0B7007700108","",""],
    [["0A0A06A9","","",""],"0B7007700108","",""],
    [["0A0A06A9","","",""],["0B7007700148","",""],"",""],
    ["",["","","0B7007700140",""],"",""],
    ["","0B7007380108",["","","07380B70",""],""],
    ["","0B70071C0108",["","","071C0B70",""],""],
    ["","0B70070E0108",["","","070E0B70",""],""],
    ["","0B7007380108",["","","07380B70",""],""],
    ["","0B70071C0108",["","","071C0B70",""],""],
    ["","0B7007380108",["","","07380B70",""],""],
    ["",["","",["0A0F137007700108","","0A0F13700770"],""],["","",["0A0F13700770","","0A0F137007700108"],""],""],
    ["",["","",["0A0F137007700148","","0A0F137007700140"],["0A0F1206066C0148","",""]],["","",["0A0F137007700140","","0A0F137007700148"],""],""],
    ["","0B70137007700140",["","",["0B7006FF","","0B7006FF0108"],""],""],
    ["",["0A040648","0B3013300730","0A0F137007700140",""],["","",["0A0F0770","","0A0F07700108"],""],""],
    [["",["0B7007700108","",""],"",""],["","",["","",["","","0B7006FF0108"],""],""]],
    ["",["0B70137007700148","",""],"",""],
    ["",["","0B3013300730",["0B7013700770014A","","0B70137007700142"],""],"",""],
    ["",["","0B3013300730",["0A0412040644014A","","0A04120406480142"],""],"",""],
    ["",["","073013300B30","",""],"",""],
    ["",["","0B3013300730","",""],"",""],
    ["","0B7007380108",["","","07380B70",""],""],
    ["","0B70071C0108",["","","071C0B70",""],""],
    ["","0B70070E0108",["","","070E0B70",""],""],
    ["","0B7007380108",["","","07380B70",""],""],
    ["","0B70071C0108",["","","071C0B70",""],""],
    ["","0B7007380108",["","",["06480A04","07380B70",""],""],""],
    ["",["","0A051205065A",["0B70137007700148","","0B70137007700140"],["0A061206066C0108","",""]],"",""],
    ["",["0A040710","0B3013300730","0A0F137007700140",""],"",""],
    ["","0B70137007700108",["","",["0B7006FF","","0B7006FF0108"],""],""],
    ["",["0A0412040648","0B3013300730",["0B70137007700148","","0B70137007700140"],["0A061206066C0148","",""]],["","",["0A0F0770","","0A0F07700108"],""],""],
    ["","0B70137007700108",["","","0B7006FF0100",""],""],
    ["",["0A0412040648","0B3013300730",["0B70137007700148","","0B70137007700140"],["0A061206066C0148","",""]],"",""],
    ["","0B70137007700108","",""],
    ["",["0A0412040648","0B3013300730",["0B70137007700148","","0B70137007700140"],["0A061206066C0148","",""]],"",""],
    ["","0B70137007700108","",""],
    ["",["0A0412040648","0B3013300730",["0B70137007700148","","0B70137007700140"],["0A061206066C0148","",""]],"",""],
    ["",["0A0412040648","0B3013300730",["0B70137007700148","","0B70137007700140"],["0A061206066C0148","",""]],"",""],
    ["",["0A040648",["0A040648","0A040648","",""],"",""],"",""],
    ["",["","",["0B7007700159","","0B7007700151"],["0A06066C0159","","0A06066C0151"]],"",""],
    ["",["","",["0A0412040644010A","","0A04120406460102"],""],"",""],
    ["",["","",["0B7007700148","","0B7007700140"],""],"",""],
    ["",["",["0B3013300730","","0B3013300730"],["0B70137007700148","","0B70137007700140"],["0A061206066C0148","",""]],"",""],
    ["",["",["0B3013300730","",""],["0B70137007700148","","0B70137007700140"],["0A061206066C0148","",""]],"",""],
    ["",["",["0B3013300730","","0B3013300730"],["0B70137007700148","","0B70137007700140"],["0A061206066C0148","",""]],"",""],
    "","","","",
    ["",["","",["0B7007700148","","0B7007700140"],""],"",""],
    ["",["","",["0A04120406440108","","0A0412040646"],""],"",""],
    ["",["","",["0B7007700148","","0B7007700140"],""],"",""],
    ["",["","",["0A04120406440108","","0A0412040646"],""],"",""],
    ["",["","","",["0A061206066C015A","","0A061206066C0152"]],"",""],
    ["",["","","",["0A061206066C0159","",""]],"",""],
    ["",["","","",["0A061206066C0159","","0A061206066C0151"]],"",""],
    ["",["","","",["0A061206066C0159","","0A061206066C0151"]],"",""],
    "",
    ["",["","","",["0A061206066C0149","","0A061206066C0141"]],"",""],
    "","",
    ["",["","0B300644",["0B7006440128","",""],["0A0606440128","",""]],"",""],
    ["",["","0B300646",["0B7006460128","","0B7006460120"],["","","0A0606460120"]],"",""],
    ["",["","0A050648",["0B6806480128","","0B6806480120"],["0A0606480128","",""]],"",""],
    ["",["","",["0A06065A0128","","0A06065A0120"],["","","0A06065A0120"]],"",""],
    ["",["","","",["0A06120F066C0148","",""]],"",""],
    ["",["","","",["0A06120F066C0148","",""]],"",""],
    ["",["","","",["0A06120F066C0148","",""]],"",""],
    ["",["","","",["0A06120F066C0148","",""]],"",""],
    "","","","",
    ["",["","",["0B70137007700148","","0B70137007700140"],["0A061206066C0148","","0A061206066C0140"]],"",""],
    ["",["","",["0B70137007700158","","0B70137007700150"],["0A061206066C0158","","0A061206066C0150"]],"",""],
    ["",["","",["0B70137007700108","","0B7013700770"],""],"",""],
    "","","","","",
    ["",["","","",["0A061206066C0148","",""]],"",""],
    ["",["","","",["0A061206066C015A","","0A061206066C0152"]],"",""],
    ["",["","","",["0A06120F066C0148","",""]],"",""],
    ["",["","","",["0A06120F066C0148","",""]],"",""],
    "","","","",
    ["",["","","",["0A0F1206066C0148","",""]],"",""],
    ["",["","",["0B70137007700108","","0B7013700770"],""],"",""],
    ["",["","",["0B70137007700148","","0B70137007700140"],""],"",""],
    ["",["","",["0B70137007700148","","0B70137007700140"],""],"",""],
    ["",["","0B300640",["0B7006400108","",""],""],"",""],
    ["",["","0B300642",["0B7006420108","",""],""],"",""],
    ["",["",["","",["0B7006000108","",""],""],"",""]],
    ["",["",["","",["0B7006100108","",""],""],"",""]],
    ["",["","",["0B70062F0108","","0B70063F"],""],"",""],
    ["",["","",["0B70137007700108","","0B7013700770"],""],"",""],
    ["",["","",["0B70137007700148","","0B70137007700140"],""],"",""],
    ["",["","",["0B70137007700148","","0B70137007700140"],""],"",""],
    [["","0B0C060B0180","",""],""],
    [["","0B0C060B0180","",""],""],
    [["","0B0C060B0180","",""],""],
    ["",["","","0B70137007700140",""],"",""],
    ["",["","","",["0A061206066C014A","",""]],"",""],
    "",
    ["",["","","",["0A061206066C0148","",""]],"",""],
    ["",["","","",["0A061206066C0148","",""]],"",""],
    ["",["","",["0B7007700108","","0B700770"],""],"",""],
    ["",["","",["0B7007700108","","0B700770"],""],"",""],
    ["",["","",["07700B700108","","07700B70"],""],"",""],
    ["",["","",["07700B700108","","07700B70"],""],"",""],
    "",
    ["",["","",["0B70137007700108","","0B7013700770"],""],"",""],
    "","",
    ["",["",["0B30073013300124","","0B30064813300124"],["0B700770012C","","0B7007380124"],["0A06066C012C","","0A06065A0124"]],"",""],
    ["",["",["0A04073012040104","","0B30073013300104"],["0B380770010C","","0B7007700104"],""],"",""],
    ["",["",["0B30073013300134","","0B30064813300134"],["0B700770013C","","0B7007380134"],["0A06066C013C","","0A06065A0104"]],"",""],
    ["",["",["0A04073012040104","","0B30073013300104"],["0B380770010C","","0B7007700104"],""],"",""],
    "","",
    ["",["",["0B3013300730","","0B3013300730"],["0B7013700770014A","","0B70137007700142"],""],"",""],
    ["",["",["0B3013300730","","0B3013300730"],["0B7013700770014A","","0B70137007700142"],""],"",""],
    ["",["",["0B3013300730","","0B3013300730"],["0B7013700770014A","","0B70137007700142"],["0A061206066C015A","","0A061206066C0152"]],"",""],
    ["",["",["0A0412040714","","0A0412040718"],["0A0412040644010A","","0A04120406460102"],""],"",""],
    ["",["",["0B3013300730","","0B3013300730"],["0B7013700770014A","","0B70137007700142"],["0A061206066C015A","","0A061206066C0152"]],"",""],
    ["",["",["0A0412040714","","0A0412040718"],["0A0412040644010A","","0A04120406460102"],""],"",""],
    ["",["",["0B3013300730","","0B3013300730"],["0B7013700770014A","","0B70137007700142"],["0A061206066C015A","","0A061206066C0152"]],"",""],
    ["",["",["0A0412040714","","0A0412040718"],["0A0412040644010A","","0A04120406460102"],""],"",""],
    ["",["",["0B3013300730","","0B3013300730"],["0B7013700770014A","","0B70137007700142"],["0A061206066C015A","","0A061206066C0152"]],"",""],
    ["",["",["0A0412040714","","0A0412040718"],["0A0412040644010A","","0A04120406460102"],""],"",""],
    ["",["","",["07700B70010C","","07380B700104"],["066C0A06012C","","065A0A060124"]],"",""],
    ["",["","",["07700B38010C","","07700B700104"],""],"",""],
    ["",["","",["07700B70013C","","07380B700134"],["066C0A06013C","","065A0A060134"]],"",""],
    ["",["","",["07700B38010C","","07700B700104"],""],"",""],
    ["",["","","",["0A061206066C011A","",""]],"",""],
    "",
    ["",["",["0B3013300730","","0B3013300730"],["0B7013700770014A","","0B70137007700142"],""],"",""],
    ["",["",["0B3013300730","","0B3013300730"],["0B7013700770014A","","0B70137007700142"],""],"",""],
    ["",["",["0B3013300730","","0B3013300730"],["0B7013700770014A","","0B70137007700142"],["0A061206066C015A","","0A061206066C0152"]],"",""],
    ["",["",["0A0412040644","","0A0412040646"],["0A0412040644010A","","0A04120406460102"],""],"",""],
    ["",["",["0B3013300730","","0B3013300730"],["0B7013700770014A","","0B70137007700142"],["0A061206066C015A","","0A061206066C0152"]],"",""],
    ["",["",["0A0412040644","","0A0412040646"],["0A0412040644010A","","0A04120406460102"],""],"",""],
    ["",["",["0B3013300730","","0B3013300730"],["0B7013700770014A","","0B70137007700142"],["0A061206066C015A","","0A061206066C0152"]],"",""],
    ["",["",["0A0412040644","","0A0412040646"],["0A0412040644010A","","0A04120406460102"],""],"",""],
    ["",["",["0B3013300730","","0B3013300730"],["0B7013700770014A","","0B70137007700142"],["0A061206066C015A","","0A061206066C0152"]],"",""],
    ["",["",["0A0412040644","","0A0412040646"],["0A0412040644010A","","0A04120406460102"],""],"",""],
    "","","","",
    ["",["","","0B70137007700140",["0A061206066C0118","",""]],"",""],
    ["",["","","0B70137007700140",["0A061206066C0148","",""]],"",""],
    ["",["",["0B3013300730","","0B3013300730"],["0B7013700770014A","","0B70137007700142"],""],"",""],
    ["",["",["0B3013300730","","0B3013300730"],["0B7013700770014A","","0B70137007700142"],""],"",""],
    ["",["",["0B3013300730","","0B3013300730"],["0B7013700770014A","","0B70137007700142"],["0A061206066C015A","","0A061206066C0152"]],"",""],
    ["",["",["0A0412040644","","0A0412040646"],["0A0412040644010A","","0A04120406460102"],""],"",""],
    ["",["",["0B3013300730","","0B3013300730"],["0B7013700770014A","","0B70137007700142"],["0A061206066C015A","","0A061206066C0152"]],"",""],
    ["",["",["0A0412040644","","0A0412040646"],["0A0412040644010A","","0A04120406460102"],""],"",""],
    ["",["",["0B3013300730","","0B3013300730"],["0B7013700770014A","","0B70137007700142"],["0A061206066C015A","","0A061206066C0152"]],"",""],
    ["",["",["0A0412040644","","0A0412040646"],["0A0412040644010A","","0A04120406460102"],""],"",""],
    ["",["",["0B3013300730","","0B3013300730"],["0B7013700770014A","","0B70137007700142"],["0A061206066C015A","","0A061206066C0152"]],"",""],
    ["",["",["0A0412040644","","0A0412040646"],["0A0412040644010A","","0A04120406460102"],""],"",""],
    "","","","",
    ["",["","",["0B7007700148","","0B7007700140"],""],"",""],
    "",
    [
      [
        ["",["","","",["060C013C","","060A0134"]],"",""],
        ["",["","",["060C013C","","060A0134"],["060C013C","",""]],"",""],
        ["",["","",["060C013C","","070A0134"],["060C013C","",""]],"",""],
        "",
        ["",["","","",["060C013C","","060A0134"]],"",""],
        ["",["","",["060C013C","","060A0134"],["060C013C","",""]],"",""],
        ["",["","",["060C013C","","060A0134"],["060C013C","",""]],"",""],
        ""
      ],""
    ],
    [
      [
        "",
        ["",["","",["060C010C","","060C0104"],""],"",""],
        ["",["","",["060C010C","","060C0104"],""],"",""],
        "","",
        ["",["","",["060C010C","","060C0104"],""],"",""],
        ["",["","",["060C010C","","060C0104"],""],"",""],
        ""
      ],""
    ],
    [["0A040648","","",""],["","",["0A06066C0159","","0A06066C0151"],["0A06066C0109","",""]],"",""],
    [["0A040648","","",""],["","","",["0A06066C0109","",""]],"",""],
    [["0A040648","","",""],["","",["0A06066C0159","","0A06066C0151"],["0A06066C0109","",""]],"",""],
    [["0A0406482E00","","",""],["","",["0A04120406440109","","0A04120406460101"],["0A06066C0109","",""]],"",""],
    [["0A040648","","",""],["","",["0A06066C0159","","0A06066C0151"],["0A06066C015A","",""]],"",""],
    [["0A040648","","",""],["","",["0A04120406440109","","0A04120406460101"],["0A06066C0148","",""]],"",""],
    "","",
    [[["","","",["0A06060C0120","","0A06060C0128"]],["","","",["060C0A060128","","060C0A060120"]],"",""],""],
    [[["","","",["0A06060C0130","","0A06060C0138"]],["","","",["060C0A060138","","060C0A060130"]],"",""],""],
    "","",
    [[["","","",["0A06060C0120","","0A06060C0128"]],["","","",["060C0A060128","","060C0A060120"]],"",""],""],
    [[["","","",["0A06060C0130","","0A06060C0138"]],["","","",["060C0A060138","","060C0A060130"]],"",""],""],
    "","","","","",
    ["",["0A040648","0A040648","",""],"",""],
    ["",["0A040648","0A0412040648","",""],"",""],
    ["",["0A040648","0A0412040648","",""],"",""],
    ["",["0A040648","0A0412040648","",""],"",""],
    ["",["0A040648","0A0412040648","",""],"",""],
    "","","","","","","","","","","","","","","","",
    [
      ["0B0E070E0180","","",""],
      ["0B0E070E0180","","",""],"",
      ["0B0C06000180","","",""]
    ],
    [
      ["070E0B0E0180","","",""],
      ["070E0B0E0180","","",""],"",
      ["0B0C070E0180","","",""]
    ],
    ["",["","0B0C130C070C","",""],"",""],
    [
      "",
      ["",["","130C070C","",""],"",""],
      ["",["","130C070C","",""],"",""],
      ["",["","130C070C","",""],"",""],
      "","","",""
    ],"",
    [
      ["","0B0C070C130C","",""],"",
      ["","0B0C130C070C","",""],
      ["","0B0C130C070C","",""]
    ],
    [
      "",
      ["0B0C070C","","",""],
      ["0B0C070C","","",""],
      ["","0B0C130C070C1B0C","",""]
    ],
    [
      ["","0B0C130C070C","",""],
      ["","0B0C130C070C","",""],
      ["","0B0C130C070C","",""],
      ["","0B0C130C070C","",""]
    ],
    "","","","","","","","",
    ["",["","0A05065A0C00","0B7007700C000140",""],"",""],
    ["",["","0A05065A0C00","0B7007700C000140",""],"",""],
    ["",["",["0B30133007300C00","",""],"",""],"",""],
    ["",["","",["0B70137007700C000148","","0B70137007700C000140"],["0A061206066C0C000108","",""]],"",""],
    ["",["","0B3007300C00",["0B7007700C000148","",""],""],"",""],
    ["",["","0B3007300C00","0B7007700C000140",""],"",""],
    ["",["","0A051205065A0C00","",""],"",""],
    ["",["","","",["0A06066C0C000108","",""]],"",""],
    ["",["0A0406480C00","0B3007300C00",["0B7007700C000149","",""],""],"",""],
    ["",["0A0406480C00","0B3007300C00","0B7007700C000141",""],"",""],
    ["",["0A0406440C00","0A04120406440C00",["0A04120406440C000109","",""],""],"",""],
    ["",["0A0406460C00","0A04120406460C00","0A04120406460C000101",""],"",""],
    ["",["0A0406480C00","0B30133007300C00","",""],"",""],
    ["",["0A0406480C00","0B30133007300C00","",""],"",""],
    ["",["0A0406480C00","0B30133007300C00","",""],"",""],
    [["0A0A06A90C00","","",""],"0B70137007700C000108","",""],
    "","","","",
    [["","06000A040C000108","",""],["","070C0A040C000108","",""]],
    [["","06020A040C000108","",""],["","070C0A040C000108","",""]],
    ["",["06240A040C000108","","06360A040C00"],"",""],
    ["","070C0A040C000108","",""],
    ["",["","0A05120506480C00",["0B70137006480C000108","","0B70137006480C00"],""],"",""],
    ["",["","06480A050C00",["06480B700C000108","","06480B700C00"],""],"",""],
    ["",["","",["0A061206065A0C000108","","0A061206065A0C00"],""],"",""],
    ["",["","",["065A0A060C000108","","065A0A060C00"],""],"",""],
    "",
    ["",["","07180B300C00",["07380B700C000109","",""],""],"",""],
    ["",["","",["0A0F137007700C000148","","0A0F137007700C000140"],["0A0F1206066C0C000148","",""]],"",""],
    ["",["","",["0A0F137007700C000148","","0A0F137007700C000140"],["0A0F1206066C0C000148","",""]],"",""],
    ["","0A04120406200C000108","",""],
    ["",["0A04120406440C000108","",""],"",""],
    ["",["",["0A04120406240C00","","0A04120406360C00"],["0A04120406240C000108","","0A04120406360C00"],""],"",""],
    ["",["","",["0B70137007700C000148","","0B70137007700C000140"],""],"",""],
    "",
    ["",["","",["0B70137007700C000148","","0B70137007700C000140"],""],"",""],
    ["",["","",["0B7007700C000149","","0B7007700C000141"],["0A06066C0C000159","","0A06066C0C000151"]],"",""],
    ["",["","",["0A04120406440C000109","","0A04120406460C000101"],""],"",""],
    "","","","","","","","",
    ["",["",["0A0F06FF0C00","","0A0F06FF0C00"],"",""],"",""],
    ["",["",["0A0F06FF0C00","","0A0F06FF0C00"],"",""],"",""],
    ["",["",["0A0F06FF0C00","","0A0F06FF0C00"],"",""],"",""],
    ["",["",["0A0F06FF0C00","","0A0F06FF0C00"],"",""],"",""],
    "","","","",
    ["",["","0A05120506480C00",["0B70137006480C000108","","0B70137006480C00"],""],"",""],
    ["",["","06480A050C00",["06480B700C000108","","06480B700C00"],""],"",""],
    ["",["","",["0A061206065A0C000108","","0A061206065A0C00"],""],"",""],
    ["",["","",["065A0A060C000108","","065A0A060C00"],""],"",""],
    "","",
    ["",["","0A0F063F0C00",["0A0F137007700C000108","","0A0F137007700C00"],""],"",""],
    ["",["","",["0A0F137007700C000108","","0A0F137007700C00"],""],"",""],
    ["",["0A0406480C00","0B30133007300C00","",""],"",""],
    ["",["0A0406480C00","0A04120406480C00","",""],"",""],
    ["",["0A0406480C00","0B30133007300C00",["0B70137007700C000108","",""],""],"",""],
    ["",["","",["0B70137007700C000148","","0B70137007700C000140"],""],"",""],
    ["",["0A0406480C00","0A04120406480C00","",""],"",""],
    "",
    ["",["","0A051205065A0C00","",""],"",""],
    "",
    ["",["",["0B301330073015300E00","","0B301330153007300E00"],"",""],"",""],
    ["",["",["0B301330073015300E00","","0B301330153007300E00"],"",""],"",""],
    ["",["","0B30133007301530","",""],"",""],
    ["",["","0B30133007301530","",""],"",""],
    ["",["","0A051205065A1505","",""],"",""],
    "","","",
    ["",["","",["0B70137007700C000149","","0B70137007700C000141"],""],"",""],
    ["",["","",["0A04120406440C000109","","0A04120406460C000101"],""],"",""],
    ["",["","","",["0A06066C0C000159","","0A06066C0C000151"]],"",""],
    "",
    ["",["","",["0B70137007700C000149","","0B70137007700C000141"],""],"",""],
    ["",["","",["0A04120406440C000109","","0A04120406460C000101"],""],"",""],
    ["",["","",["0B7007700C000149","","0B7007700C000141"],""],"",""],
    ["",["","",["0A04120406440C000109","","0A04120406460C000101"],""],"",""],
    "","","","",
    ["",["",["0B30133007301530","","0B30133015300730"],"",""],"",""],
    ["",["",["0B30133007301530","","0B30133015300730"],"",""],"",""],
    ["",["",["0B30133007301530","","0B30133015300730"],"",""],"",""],
    ["",["",["0B30133007301530","","0B30133015300730"],"",""],"",""],
    ["",["0A0406480C00","0A0406480C00","",""],"",""],
    ["",["0A0406480C00","0A0406480C00","",""],"",""],
    ["",["0A0406480C00","0A0406480C00","",""],"",""],
    ["",["0A0406480C00","0A0406480C00","",""],"",""],
    "","",
    ["",["","",["0A0F07700C000148","","0A0F07700C000140"],""],"",""],
    ["",["","",["0A0F06440C000108","","0A0F06460C00"],""],"",""],
    ["",["",["0B30133007301530","","0B30133015300730"],"",""],"",""],
    ["",["",["0B30133007301530","","0B30133015300730"],"",""],"",""],
    ["",["",["0A04120406441530","","0A04120415300644"],"",""],"",""],
    ["",["",["0A04120406461530","","0A04120415300646"],"",""],"",""],
    ["",["",["0B30133007301530","","0B30133015300730"],"",""],"",""],
    ["",["",["0B30133007301530","","0B30133015300730"],"",""],"",""],
    ["",["",["0A04120406441530","","0A04120415300644"],"",""],"",""],
    ["",["",["0A04120406461530","","0A04120415300646"],"",""],"",""],
    "","","","","","","","",
    ["",["",["0B30133007301530","","0B30133015300730"],"",""],"",""],
    ["",["",["0B30133007301530","","0B30133015300730"],"",""],"",""],
    ["",["",["0A04120406441530","","0A04120415300644"],"",""],"",""],
    ["",["",["0A04120406461530","","0A04120415300646"],"",""],"",""],
    ["",["",["0B30133007301530","","0B30133015300730"],"",""],"",""],
    ["",["",["0B30133007301530","","0B30133015300730"],"",""],"",""],
    ["",["",["0A04120406441530","","0A04120415300644"],"",""],"",""],
    ["",["",["0A04120406461530","","0A04120415300646"],"",""],"",""],
    "","","","","","","","","","","","","","","","",
    "","","","","","","","","","","","","","","","",
    "","","","","","","","","","","","","","","","",
    "","","","","","","","","","","","","","","","",
    "","","","","","","","","","",
    [["","","","0A06066C0C000141"],["","","",["0A06066C0C000159","",""]],"",["","","","0A06066C0C000151"]],
    [["","","","0A06066C0C000141"],["","","",["0A06066C0C000159","",""]],"",""],
    "0A0406480C00","","","",
    "","","","","","","","","","","","","","","",
    ["",["0A0406480C00","0A0406480C00","",""],"",""],
    "","","","","","",
    ["","","",["","","","0A06066C0C000151"]],
    "","","","","","","","","",
    ["","","",["","0B0C070C0C00","",""]],
    "","","","","","","","","","","","","","","",
    "","","","","","","","","","","","","","","","","",
    "","","","","","","","","","","","","","","","","",
    "","","","","","","","","","","","","","","","","",
    "","","","","","","","","","","","","","","","","",
    "","","","","","","","","","","","","","","","","",
    "","","","","","","","","","","","","","","","","",
    "","","","","","","","","","","","","","","","","",
    "","","","","","","","","","","","","","",
    "0A04120406481404","0A04120406481404","0A04120406481404","","","","","","",
    "0A04120406481404","0A04120406481404","","","","","","0A04120406481404","0A04120406481404","0A04120406481404",
    "","","","","","","0A04120406481404","0A04120406481404",
    "","",["0B30133007301530","","0B30133015300730"],["0A04120406481404","","0A04120414040648"],"","","0A04120406481404",
    "","","","","","","","","","","","","","","",
    "0A04120406481404","","","","","","","","","","0A0406480C00","0A0406480C00","0A0406480C00","0A0406480C00",
    "","","","","","","","",
    "0A04120406480C00","0A04120406480C00","0A04120406480C00","0A04120406480C00",
    "","","","","","","","","","","","","","","","","","","","","","","","","","","","",
    "0A04120406480C00","0A04120406480C00","0A04120406480C00","0A04120406480C00",
    "","","","","","","","","","","","","","","","",
    "",
    ["","130C070C","130C070C","130C070C","130C070C","130C070C","130C070C","130C070C"],
    ["","130C070C","","","","","130C070C",""],
    "","","","","","","","","","","","","","","",
    ["",["070C","070C","","","","","",""]],
    "","","","","","","","","","","","","","","","","","","",
    "","","","","","","","","","","","","","","","","","",
    "","","","","","","","","","","","","","","","","","",
    "","","","","","","","","","","","","","","","","","",
    "","","","","","","","","","","","","","","","","","",
    "","","","","","","","","","","","","","","","","","",
    "0B300730","0B300730","0B300730","0B300730",
    "","","","","","","","","","","","",
    ["0A0406481204","","0A0412040648"],["0A0406481204","","0A0412040648"],["0A0406481204","","0A0412040648"],["0A0406481204","","0A0412040648"],
    ["0A0406481204","","0A0412040648"],["0A0406481204","","0A0412040648"],["0A0406481204","","0A0412040648"],["0A0406481204","","0A0412040648"],
    ["0A0406481204","","0A0412040648"],["0A0406481204","","0A0412040648"],["0A0406481204","","0A0412040648"],["0A0406481204","","0A0412040648"],
    "","","","","","","","","","","","","","","","","","","",
    "","","","","","","","","","","","","","","","","","",
    "0A040648","0A040648","0A040648","","","0A040648","0A040648","","","","0A040648","","","","","",
    "0A040648","0A040648","0A040648","","","0A040648","0A040648","","","","0A040648","","","","","",
    "0A040648","0A040648","0A040648","","","","","","","","","","","","","","",
    "","","","","","","","","","","","","","",
    "","","","","","","","","","","","","","","","",
    "0B0C070C0C020180","",["130C06240C020180","130C06240C020180","","","","","",""],
    "","","","","","","","","","","","","",
    "","","","","","","","","","","","","","","","",
    "","","","","","","","","","","","","","","","",
    "","","","","","","","","","","","","","","","",
    "","","","","","","","","","","","","","","","",
    "","","","","","","","","","","","","","","","",
    "","","","","","","","","","","","","","","","",
    "","","","","","","","","","","","","","","","",
    "","","","","","","","","","","","","","","","",
    "","","","","","","","","","","","","","","","",
    "","","","","","","","","","","","","","","","",
    "","","","","","","","","","","","","","","","",
    "","","","","","","","","","","","","","","","",
    "","","","","","","","","","","","","","","","",
    "","","","","","","","","","","","","","","","",
    "","","","","1206","","","","","","","","","","","",
    [["0A0606610120","0A0606610120","",""],""],"",
    [["0A0606610120","0A0606610120","",""],""],
    [["0A0606610120","0A0606610120","",""],""],
    [["0A0606610100","0A0606610100","",""],""],"",
    [["0A0606610100","0A0606610100","",""],""],
    [["0A0606610100","0A0606610100","",""],""],
    ["0A06066C0124",""],["066C0124",""],"",["066C0124",""],
    ["066C0A060104",""],["066C0104",""],"",["066C0104",""],
    ["0A0F120606610150","0A0F120606610150","",""],"0A0F120606610140","0A0F120606610140","",
    ["0A0F120606610150","0A0F120606610150","",""],"0A0F120606610140","0A0F120606610140","",
    "","","","","","","","",
    "0A0F120606610140","","","","","","","","","","","","","","","",
    ["0A06120606610150","0A06120606610150","",""],"0A06120606610140","","0A06120F06610140","","0A06120F06610140","0A06120606610150","0A06120606610140",
    ["0A06120606610150","0A06120606610150","",""],"","","","","","","",
    ["0A06120606610150","0A06120606610150","",""],"0A06120606610140","","0A06120F06610140","","0A06120F06610140","","",
    ["0A06120606610150","0A06120606610150","",""],"0A06120606610140","","0A06120F06610140","","0A06120F06610140","","",
    ["0A06120606610150","0A06120606610150","",""],"0A06120606610140",
    ["0A06120606610150","0A06120606610150","",""],"",
    ["0A06120606610150","0A06120606610150","",""],"",
    "0A06120606610150","0A06120606610140",
    ["0A06120606610150","0A06120606610150","",""],"",
    ["0A06120606610150","0A06120606610150","",""],"",
    ["0A06120606610150","0A06120606610150","",""],"","","",
    ["0A06120606610150","0A06120606610150","",""],"",
    ["0A06120606610150","0A06120606610150","",""],"",
    ["0A06120606610150","0A06120606610150","",""],"","","",
    ["0A06120606610150","0A06120606610150","",""],"",
    ["0A06120606610150","0A06120606610150","",""],"",
    ["0A06120606610150","0A06120606610150","",""],"",
    ["0A06120606610150","0A06120606610150","",""],"",
    ["0A06120606610150","0A06120606610150","",""],"0A06120606610140","0A06120606610140","0A06120606610140","","","0A06120606610150","0A06120606610140",
    ["0A06120606610150","0A06120606610150","",""],"0A06120606610140","0A06120606610140","",
    ["0A06120606610150","0A06120606610150","",""],"0A06120606610140","0A06120606610140","",
    ["","0A0606610152","",""],["0A0606610153","0A0606610152","",""],["0A0606610153","0A0606610152","",""],"",
    ["","0A0606610158","",""],["0A0606610141","0A0606610148","",""],["0A0606610141","0A0606610148","",""],"",
    "0A0606610153","","0A0606610150","0A0606610152","","0A0606610150","0A0606610150","",
    "0A06120606610140","0A06120606610140","0A06120606610140","",
    ["0A06120606610140","0A06120606610140","",""],["0A06120606610140","0A06120606610140","",""],
    ["0A06120606610140","0A06120606610140","",""],["0A06120606610140","0A06120606610140","",""],
    "0A06120606610140","0A06120606610140","","","","","","",
    "0A0606610140","0A0606610150","0A0606610150","","0A0606610150","","","",
    "0A06120606610140","","","","","","","",
    "0A0606610150","","0A06120606610150","","","","","","","","","","","","","",
    "","","","","","","","","","","","","","","","",
    "","","","","","","","","","","","","","","","",
    "0A0606610C010150","0A0606610C000C00","0A06120606610C010140","0A0606610C010140","","","","",
    "","","","","","","","",
    ["","0B0E070E"],["","0B0E070E"],["","0B0E070E"],["","0B0E070E"],
    ["","0B0E070E"],["","0B0E070E"],["","0B0E070E"],["","0B0E070E"],
    ["","0B0E070E"],["","0B0E070E"],["","0B0E070E"],["","0B0E070E"],
    ["","0B0E070E"],["","0B0E070E"],["","0B0E070E"],["","0B0E070E"],
    ["","0B0E070E"],["","0B0E070E"],["","0B0E070E"],["","0B0E070E"],
    ["","0B0E070E"],["","0B0E070E"],["","0B0E070E"],["","0B0E070E"],
    ["","0B0E070E0C010C000C00"],["","0B0E070E0C010C000C00"],["","0B0E070E0C010C000C00"],["","0B0E070E0C010C000C00"],
    ["","0B0E070E0C010C000C00"],["","0B0E070E0C010C000C00"],["","0B0E070E0C010C000C00"],["","0B0E070E0C010C000C00"],
    ["","0B0E070E"],["","0B0E070E"],["","0B0E070E"],["","0B0E070E"],
    ["","0B0E070E"],["","0B0E070E"],["","0B0E070E"],["","0B0E070E"],
    "","","","",
    "06FF0A0F",
    [["0601","0601","0604","0604","","","",""],""],
    [["0601","0601","","","","","",""],""],
    [["0601","0601","","","","","",""],""],
    "06FF0A0F","06FF0B06","07060A0F","06FF0B06",
    "06FF0A0F","06FF0A0F","06FF0A0F","06FF0A0F",
    "06FF0A0F","06FF0A0F","06FF0A0F","06FF0A0F",
    "","06FF0A0F",
    ["",["0B07","0B07","","","","","",""]],
    ["",["0B07","0B07","","","","","",""]]
  ],
  m3DNow: [
    "","","","","","","","","","","","","PI2FW","PI2FD","","",
    "","","","","","","","","","","","","","","","",
    "","","","","","","","","","","","","","","","",
    "","","","","","","","","","","","","","","","",
    "","","","","","","","","","","","","","","","",
    "","","","","","","","","","","","","","","","",
    "","","","","","","","","","","","","","","","",
    "","","","","","","","","","","","","","","","",
    "","","","","","","","","","","PFNACC","","","","PFPNACC","",
    "PFCMPGE","","","","PFMIN","","PFRCP","PFRSQRT","","","FPSUB","","","","FPADD","",
    "PFCMPGT","","","","PFMAX","","PFRCPIT1","PFRSQIT1","","","PFSUBR","","","","PFACC","",
    "PFCMPEQ","","","","PFMUL","","PFRCPIT2","PMULHRW","","","","PSWAPD","","","","PAVGUSB",
    "","","","","","","","","","","","","","","","",
    "","","","","","","","","","","","","","","","",
    "","","","","","","","","","","","","","","","",
    "","","","","","","","","","","","","","","",""
  ],
  mSynthetic: [
    "VMGETINFO","VMSETINFO","VMDXDSBL","VMDXENBL","",
    "VMCPUID","VMHLT","VMSPLAF","","",
    "VMPUSHFD","VMPOPFD","VMCLI","VMSTI","VMIRETD",
    "VMSGDT","VMSIDT","VMSLDT","VMSTR","",
    "VMSDTE","","","",""
  ],
  conditionCodes: [
    "EQ","LT","LE","UNORD","NEQ","NLT","NLE","ORD",
    "EQ_UQ","NGE","NGT","FALSE","NEQ_OQ","GE","GT","TRUE",
    "EQ_OS","LT_OQ","LE_OQ","UNORD_S","NEQ_US","NLT_UQ","NLE_UQ","ORD_S",
    "EQ_US","NGE_UQ","NGT_UQ","FALSE_OS","NEQ_OS","GE_OQ","GT_OQ","TRUE_US",
    "LT","LE","GT","GE","EQ","NEQ","FALSE","TRUE"
  ],
  instruction: "",
  insOperands: "",
  operand: function(){
    return(
      {
        type:0,
        bySizeAttrubute:false,
        size:0x00,
        opNum:0,
        active:false,
        set:function(t, bySize, settings, operandNumber)
        {
          this.type = t;
          this.bySizeAttrubute = bySize;
          this.size = settings;
          this.opNum = operandNumber;
          this.active = true;
        },
        deactivate:function(){ this.active = false; }
      }
    );
  },
  x86Decoder: [],
  sizeAttrSelect: 1,
  widthBit: 0,
  farPointer: 0,
  addressOverride: false,
  regExtend: 0,
  baseExtend: 0,
  indexExtend: 0,
  segOverride: "[",
  rexActive: 0,
  simd: 0,
  vect: false,
  ignoresWidthbit: false,
  vsib: false,
  roundingSetting: 0,
  swizzle: false,
  up: false,
  float: false,
  vectS: 0x00,
  extension: 0,
  conversionMode: 0,
  roundMode: 0,
  roundModes: [
    "","","","","","","","",
    ", {Error}", ", {Error}", ", {Error}", ", {Error}", ", {SAE}", ", {SAE}", ", {SAE}", ", {SAE}",
    ", {RN}", ", {RD}", ", {RU}", ", {RZ}", ", {RN-SAE}", ", {RD-SAE}", ", {RU-SAE}", ", {RZ-SAE}",
    "0B", "4B", "5B", "8B", "16B", "24B", "31B", "32B"
  ],
  regSwizzleModes: [ "", "CDAB", "BADC", "DACB", "AAAA", "BBBB", "CCCC", "DDDD", "DACB" ],
  conversionModes: [
    "", "",
    "1To16", "1To8",
    "4To16", "4To8",
    "Float16", "Error",
    "Float16RZ", "Error",
    "SRGB8", "Error",
    "UInt8", "Error",
    "SInt8", "Error",
    "UNorm8", "Error",
    "SNorm8", "Error",
    "UInt16", "Error",
    "SInt16", "Error",
    "UNorm16", "Error",
    "SNorm16", "Error",
    "UInt8I", "Error",
    "SInt8I", "Error",
    "UInt16I", "Error",
    "SInt16I", "Error",
    "UNorm10A", "Error",
    "UNorm10B", "Error",
    "UNorm10C", "Error",
    "UNorm2D", "Error",
    "Float11A", "Error",
    "Float11B", "Error",
    "Float10C", "Error",
    "Error", "Error",
    "Error", "Error",
    "Error", "Error",
    "Error", "Error",
    "Error", "Error",
    "Error", "Error",
    "Error", "Error",
    "Error", "Error",
    "Error", "Error"
  ],
  vectorRegister: 0,
  maskRegister: 0,
  hIntZeroMerg: false,
  immValue: 0,
  prefixG1: "", prefixG2: "",
  xRelease: false, xAcquire: false,
  hleFlipG1G2: false,
  ht: false,
  bnd: false,
  invalidOp: false,
  reg: [
    [
      [
        "AL", "CL", "DL", "BL", "AH", "CH", "DH", "BH"
      ],
      [
        "AL", "CL", "DL", "BL", "SPL", "BPL", "SIL", "DIL",
        "R8B", "R9B", "R10B", "R11B", "R12B", "R13B", "R14B", "R15B"
      ]
    ],
    [
      "AX", "CX", "DX", "BX", "SP", "BP", "SI", "DI", "R8W", "R9W", "R10W", "R11W", "R12W", "R13W", "R14W", "R15W"
    ],
    [
      "EAX", "ECX", "EDX", "EBX", "ESP", "EBP", "ESI", "EDI", "R8D", "R9D", "R10D", "R11D", "R12D", "R13D", "R14D", "R15D"
    ],
    [
      "RAX", "RCX", "RDX", "RBX", "RSP", "RBP", "RSI", "RDI", "R8", "R9", "R10", "R11", "R12", "R13", "R14", "R15"
    ],
    [
      "XMM0", "XMM1", "XMM2", "XMM3", "XMM4", "XMM5", "XMM6", "XMM7", "XMM8", "XMM9", "XMM10", "XMM11", "XMM12", "XMM13", "XMM14", "XMM15",
      "XMM16", "XMM17", "XMM18", "XMM19", "XMM20", "XMM21", "XMM22", "XMM23", "XMM24", "XMM25", "XMM26", "XMM27", "XMM28", "XMM29", "XMM30", "XMM31"
    ],
    [
      "YMM0", "YMM1", "YMM2", "YMM3", "YMM4", "YMM5", "YMM6", "YMM7", "YMM8", "YMM9", "YMM10", "YMM11", "YMM12", "YMM13", "YMM14", "YMM15",
      "YMM16", "YMM17", "YMM18", "YMM19", "YMM20", "YMM21", "YMM22", "YMM23", "YMM24", "YMM25", "YMM26", "YMM27", "YMM28", "YMM29", "YMM30", "YMM31"
    ],
    [
      "ZMM0", "ZMM1", "ZMM2", "ZMM3", "ZMM4", "ZMM5", "ZMM6", "ZMM7", "ZMM8", "ZMM9", "ZMM10", "ZMM11", "ZMM12", "ZMM13", "ZMM14", "ZMM15",
      "ZMM16", "ZMM17", "ZMM18", "ZMM19", "ZMM20", "ZMM21", "ZMM22", "ZMM23", "ZMM24", "ZMM25", "ZMM26", "ZMM27", "ZMM28", "ZMM29", "ZMM30", "ZMM31"
    ],
    [
      "?MM0", "?MM1", "?MM2", "?MM3", "?MM4", "?MM5", "?MM6", "?MM7", "?MM8", "?MM9", "?MM10", "?MM11", "?MM12", "?MM13", "?MM14", "?MM15",
      "?MM16", "?MM17", "?MM18", "?MM19", "?MM20", "?MM21", "?MM22", "?MM23", "?MM24", "?MM25", "?MM26", "?MM27", "?MM28", "?MM29", "?MM30", "?MM31"
    ],
    [
      "ES", "CS", "SS", "DS", "FS", "GS", "ST(-2)", "ST(-1)"
    ],
    [
      "ST(0)", "ST(1)", "ST(2)", "ST(3)", "ST(4)", "ST(5)", "ST(6)", "ST(7)"
    ],
    [
      "MM0", "MM1", "MM2", "MM3", "MM4", "MM5", "MM6", "MM7"
    ],
    [
      "BND0", "BND1", "BND2", "BND3", "CR0", "CR1", "CR2", "CR3"
    ],
    [
      "CR0", "CR1", "CR2", "CR3", "CR4", "CR5", "CR6", "CR7", "CR8", "CR9", "CR10", "CR11", "CR12", "CR13", "CR14", "CR15"
    ],
    [
      "DR0", "DR1", "DR2", "DR3", "DR4", "DR5", "DR6", "DR7", "DR8", "DR9", "DR10", "DR11", "DR12", "DR13", "DR14", "DR15"
    ],
    [
      "TR0", "TR1", "TR2", "TR3", "TR4", "TR5", "TR6", "TR7"
    ],
    [
      "K0", "K1", "K2", "K3", "K4", "K5", "K6", "K7","K0", "K1", "K2", "K3", "K4", "K5", "K6", "K7",
      "K0", "K1", "K2", "K3", "K4", "K5", "K6", "K7","K0", "K1", "K2", "K3", "K4", "K5", "K6", "K7"
    ],
    [
      "V0", "V1", "V2", "V3", "V4", "V5", "V6", "V7", "V8", "V9", "V10", "V11", "V12", "V13", "V14", "V15",
      "V16", "V17", "V18", "V19", "V20", "V21", "V22", "V23", "V24", "V25", "V26", "V27", "V28", "V29", "V30", "V31"
    ]
  ],
  ptr: [
    "BYTE PTR ","",
    "WORD PTR ","DWORD PTR ",
    "DWORD PTR ","FWORD PTR ",
    "QWORD PTR ","TBYTE PTR ",
    "XMMWORD PTR ","MMWORD PTR ",
    "YMMWORD PTR ","OWORD PTR ",
    "ZMMWORD PTR ","ERROR PTR ",
    "?MMWORD PTR ","ERROR PTR "],
  scale: [
    "",
    "*2",
    "*4",
    "*8"
  ],
  compatibilityMode: function( type )
  {
    this.mnemonics[0x062] = ["BOUND","BOUND",""];
    this.mnemonics[0x110] = [["MOVUPS","MOVUPD","MOVSS","MOVSD"],["MOVUPS","MOVUPD","MOVSS","MOVSD"]];
    this.mnemonics[0x111] = [["MOVUPS","MOVUPD","MOVSS","MOVSD"],["MOVUPS","MOVUPD","MOVSS","MOVSD"]];
    this.mnemonics[0x112] = [["MOVLPS","MOVLPD","MOVSLDUP","MOVDDUP"],["MOVHLPS","???","MOVSLDUP","MOVDDUP"]];
    this.mnemonics[0x113] = [["MOVLPS","MOVLPD","???","???"],"???"];
    this.mnemonics[0x138] = ""; this.mnemonics[0x139] = "???"; this.mnemonics[0x13A] = ""; this.mnemonics[0x13B] = "???"; this.mnemonics[0x13C] = "???"; this.mnemonics[0x13D] = "???"; this.mnemonics[0x13F] = "???";
    this.mnemonics[0x141] = [["CMOVNO",["KANDW","","KANDQ"],"",""],["CMOVNO",["KANDB","","KANDD"],"",""],"",""];
    this.mnemonics[0x142] = [["CMOVB",["KANDNW","","KANDNQ"],"",""],["CMOVB",["KANDNB","","KANDND"],"",""],"",""];
    this.mnemonics[0x144] = [["CMOVE",["KNOTW","","KNOTQ"],"",""],["CMOVE",["KNOTB","","KNOTD"],"",""],"",""];
    this.mnemonics[0x145] = [["CMOVNE",["KORW","","KORQ"],"",""],["CMOVNE",["KORB","","KORD"],"",""],"",""];
    this.mnemonics[0x146] = [["CMOVBE",["KXNORW","","KXNORQ"],"",""],["CMOVBE",["KXNORB","","KXNORD"],"",""],"",""];
    this.mnemonics[0x147] = [["CMOVA",["KXORW","","KXORQ"],"",""],["CMOVA",["KXORB","","KXORD"],"",""],"",""];
    this.mnemonics[0x150] = ["???",[["MOVMSKPS","MOVMSKPS","",""],["MOVMSKPD","MOVMSKPD","",""],"???","???"]];
    this.mnemonics[0x151] = ["SQRTPS","SQRTPD","SQRTSS","SQRTSD"];
    this.mnemonics[0x152] = [["RSQRTPS","RSQRTPS","",""],"???",["RSQRTSS","RSQRTSS","",""],"???"];
    this.mnemonics[0x154] = ["ANDPS","ANDPD","???","???"];
    this.mnemonics[0x155] = ["ANDNPS","ANDNPD","???","???"];
    this.mnemonics[0x158] = [["ADDPS","ADDPS","ADDPS","ADDPS"],["ADDPD","ADDPD","ADDPD","ADDPD"],"ADDSS","ADDSD"];
    this.mnemonics[0x159] = [["MULPS","MULPS","MULPS","MULPS"],["MULPD","MULPD","MULPD","MULPD"],"MULSS","MULSD"];
    this.mnemonics[0x15A] = [["CVTPS2PD","CVTPS2PD","CVTPS2PD","CVTPS2PD"],["CVTPD2PS","CVTPD2PS","CVTPD2PS","CVTPD2PS"],"CVTSS2SD","CVTSD2SS"];
    this.mnemonics[0x15B] = [[["CVTDQ2PS","","CVTQQ2PS"],"CVTPS2DQ",""],"???","CVTTPS2DQ","???"];
    this.mnemonics[0x15C] = [["SUBPS","SUBPS","SUBPS","SUBPS"],["SUBPD","SUBPD","SUBPD","SUBPD"],"SUBSS","SUBSD"];
    this.mnemonics[0x15D] = ["MINPS","MINPD","MINSS","MINSD"];
    this.mnemonics[0x15E] = ["DIVPS","DIVPD","DIVSS","DIVSD"];
    this.mnemonics[0x178] = [["VMREAD","",["CVTTPS2UDQ","","CVTTPD2UDQ"],""],["EXTRQ","",["CVTTPS2UQQ","","CVTTPD2UQQ"],""],["???","","CVTTSS2USI",""],["INSERTQ","","CVTTSD2USI",""]];
    this.mnemonics[0x179] = [["VMWRITE","",["CVTPS2UDQ","","CVTPD2UDQ"],""],["EXTRQ","",["CVTPS2UQQ","","CVTPD2UQQ"],""],["???","","CVTSS2USI",""],["INSERTQ","","CVTSD2USI",""]];
    this.mnemonics[0x17A] = ["???",["","",["CVTTPS2QQ","","CVTTPD2QQ"],""],["","",["CVTUDQ2PD","","CVTUQQ2PD"],"CVTUDQ2PD"],["","",["CVTUDQ2PS","","CVTUQQ2PS"],""]];
    this.mnemonics[0x17B] = ["???",["","",["CVTPS2QQ","","CVTPD2QQ"],""],["","","CVTUSI2SS",""],["","","CVTUSI2SD",""]];
    this.mnemonics[0x17C] = ["???",["HADDPD","HADDPD","",""],"???",["HADDPS","HADDPS","",""]];
    this.mnemonics[0x17D] = ["???",["HSUBPD","HSUBPD","",""],"???",["HSUBPS","HSUBPS","",""]];
    this.mnemonics[0x17E] = [["MOVD","","",""],["MOVD","","MOVQ"],["MOVQ","MOVQ",["???","","MOVQ"],""],"???"],
    this.mnemonics[0x184] = "JE"; this.mnemonics[0x185] = "JNE";
    this.mnemonics[0x190] = [["SETO",["KMOVW","","KMOVQ"],"",""],["SETO",["KMOVB","","KMOVD"],"",""],"",""];
    this.mnemonics[0x192] = [["SETB",["KMOVW","","???"],"",""],["SETB",["KMOVB","","???"],"",""],"",["SETB",["KMOVD","","KMOVQ"],"",""]];
    this.mnemonics[0x193] = [["SETAE",["KMOVW","","???"],"",""],["SETAE",["KMOVB","","???"],"",""],"",["SETAE",["KMOVD","","KMOVQ"],"",""]];
    this.mnemonics[0x198] = [["SETS",["KORTESTW","","KORTESTQ"],"",""],["SETS",["KORTESTB","","KORTESTD"],"",""],"",""];
    this.mnemonics[0x1A6] = "XBTS";
    this.mnemonics[0x1A7] = "IBTS";
    this.operands[0x110] = [["0B700770","0B700770","0A040603","0A040609"],["0B700770","0B700770","0A0412040604","0A0412040604"]];
    this.operands[0x111] = [["07700B70","07700B70","06030A04","06090A04"],["07700B70","07700B70","060412040A04","060412040A04"]];
    this.operands[0x112] = [["0A0412040606","0A0412040606","0B700770","0B700768"],["0A0412040604","","0B700770","0B700770"]];
    this.operands[0x113] = [["06060A04","06060A04","",""],""];
    this.operands[0x141] = [["0B0E070E0180",["0A0F120F06FF","","0A0F120F06FF"],"",""],["0B0E070E0180",["0A0F120F06FF","","0A0F120F06FF"],"",""],"",""];
    this.operands[0x142] = [["0B0E070E0180",["0A0F120F06FF","","0A0F120F06FF"],"",""],["0B0E070E0180",["0A0F120F06FF","","0A0F120F06FF"],"",""],"",""];
    this.operands[0x144] = [["0B0E070E0180",["0A0F06FF","","0A0F06FF"],"",""],["0B0E070E0180",["0A0F06FF","","0A0F06FF"],"",""],"",""];
    this.operands[0x145] = [["0A02070E0180",["0A0F120F06FF","","0A0F120F06FF"],"",""],["0A02070E0180",["0A0F120F06FF","","0A0F120F06FF"],"",""],"",""];
    this.operands[0x146] = [["0B0E070E0180",["0A0F120F06FF","","0A0F120F06FF"],"",""],["0B0E070E0180",["0A0F120F06FF","","0A0F120F06FF"],"",""],"",""];
    this.operands[0x147] = [["0B0E070E0180",["0A0F120F06FF","","0A0F120F06FF"],"",""],["0B0E070E0180",["0A0F120F06FF","",""],"",""],"",""];
    this.operands[0x150] = ["",[["0B0C0648","0B0C0730","",""],["0B0C0648","0B0C0730","",""],"",""]];
    this.operands[0x151] = ["0B7007700112","0B7007700112","0A04120406430102","0A04120406490102"];
    this.operands[0x152] = [["0A040648","0A040648","",""],"",["0A040643","0A0412040643","",""],""];
    this.operands[0x154] = ["0B70137007700110","0B70137007700110","",""];
    this.operands[0x155] = ["0B70137007700110","0B70137007700110","",""];
    this.operands[0x158] = [["0A040648","0B3013300730","0B70137007700112","0A061206066C0172"],["0A040648","0B3013300730","0B70137007700112","0A061206066C0112"],"0A04120406430102","0A04120406460102"];
    this.operands[0x159] = [["0A040648","0B3013300730","0B70137007700112","0A061206066C0172"],["0A040648","0B3013300730","0B70137007700112","0A061206066C0112"],"0A04120406430102","0A04120406460102"];
    this.operands[0x15A] = [["0A040648","0B300718","0B7007380111","0A06065A0111"],["0A040648","0B180730","0B3807700112","0A05066C0112"],"0A04120406430101","0A04120406460102"];
    this.operands[0x15B] = [[["0B7007700112","","0B380770011A"],"0B700770011A","",""],"","0B7007700111",""];
    this.operands[0x15C] = [["0A060648","0B3013300730","0B70137007700112","0A061206066C0172"],["0A060648","0B3013300730","0B70137007700112","0A061206066C0112"],"0A04120406430102","0A04120406460102"];
    this.operands[0x15D] = ["0B70137007700111","0B70137007700111","0A04120406430101","0A04120406460101"];
    this.operands[0x15E] = ["0B70137007700112","0B70137007700112","0A04120406430102","0A04120406460102"];
    this.operands[0x178] = [["07080B080180","",["0B7007700111","","0B3807700119"],""],["064F0C000C00","",["0B7007380119","","0B7007700111"],""],["","","0B0C06440109",""],["0A04064F0C000C00","","0B0C06460109",""]];
    this.operands[0x179] = [["0B0807080180","",["0B7007700112","","0B380770011A"],""],["0A04064F","",["0B700738011A","","0B7007700112"],""],["","","0B0C0644010A",""],["0A04064F","","0B0C0646010A",""]];
    this.operands[0x17A] = ["",["","",["0B7007380119","","0B7007700111"],""],["","",["0B7007380112","","0B700770011A"],"0A06065A0112"],["","",["0B700770011A","","0B3807700112"],""]];
    this.operands[0x17B] = ["",["","",["0B700738011A","","0B7007700112"],""],["","","0A041204070C010A",""],["","","0A041204070C010A",""]];
    this.operands[0x17C] = ["",["0A040604","0B7013700770","",""],"",["0A040604","0B7013700770","",""]];
    this.operands[0x17D] = ["",["0A040604","0B7013700770","",""],"",["0A040604","0B7013700770","",""]];
    this.operands[0x17E] = [["070C0A0A","","",""],["06240A040108","","06360A040108"],["0A040646","0A040646",["","","0A0406460108"],""],""];
    this.operands[0x184] = "1106000C"; this.operands[0x185] = "1106000C";
    this.operands[0x190] = [["0600",["0A0F0612","","0A0F0636"],"",""],["0600",["0A0F0600","","0A0F0624"],"",""],"",""];
    this.operands[0x192] = [["0600",["0A0F06F4","",""],"",""],["0600",["0A0F06F4","",""],"",""],"",["0600",["0A0F06F6","","0A0F06F6"],"",""]];
    this.operands[0x193] = [["0600",["06F40A0F","",""],"",""],["0600",["06F40A0F","",""],"",""],"",["0600",["06F60A0F","","06F60A0F"],"",""]];
    this.operands[0x198] = [["0600",["0A0F06FF","","0A0F06FF"],"",""],["0600",["0A0F06FF","","0A0F06FF"],"",""],"",""];
    this.operands[0x1A6] = "0B0E070E";
    this.operands[0x1A7] = "070E0B0E";
    if( type === 1 )
    {
      this.mnemonics[0x141] = [["CMOVNO","KAND","",""],"","",""];
      this.mnemonics[0x142] = [["CMOVB","KANDN","",""],"","",""];
      this.mnemonics[0x144] = [["CMOVE","KNOT","",""],"","",""];
      this.mnemonics[0x145] = [["CMOVNE","KOR","",""],"","",""];
      this.mnemonics[0x146] = [["CMOVBE","KXNOR","",""],"","",""];
      this.mnemonics[0x147] = [["CMOVA","KXOR","",""],"","",""];
      this.mnemonics[0x184] = [["JE","JKZD","",""],"","",""];
      this.mnemonics[0x185] = [["JNE","JKNZD","",""],"","",""];
      this.mnemonics[0x190] = [["SETO","KMOV","",""],"","",""];
      this.mnemonics[0x192] = [["SETB","KMOV","",""],"","",""];
      this.mnemonics[0x193] = [["SETAE","KMOV","",""],"","",""];
      this.mnemonics[0x198] = [["SETS","KORTEST","",""],"","",""];
      this.operands[0x141] = [["0B0E070E0180","0A0F06FF","",""],"","",""];
      this.operands[0x142] = [["0B0E070E0180","0A0F06FF","",""],"","",""];
      this.operands[0x144] = [["0B0E070E0180","0A0F06FF","",""],"","",""];
      this.operands[0x145] = [["0A02070E0180","0A0F06FF","",""],"","",""];
      this.operands[0x146] = [["0B0E070E0180","0A0F06FF","",""],"","",""];
      this.operands[0x147] = [["0B0E070E0180","0A0F06FF","",""],"","",""];
      this.operands[0x184] = [["1106000C","120F1002","",""],"","",""];
      this.operands[0x185] = [["1106000C","120F1002","",""],"","",""];
      this.operands[0x190] = [["0600","0A0F06FF","",""],"","",""];
      this.operands[0x192] = [["0600","06FF0B06","",""],"","",""];
      this.operands[0x193] = [["0600","07060A0F","",""],"","",""];
      this.operands[0x198] = [["0600","0A0F06FF","",""],"","",""];
    }
    if( type === 2 )
    {
      this.mnemonics[0x62] = "";
    }
    if( type === 3 )
    {
      this.mnemonics[0x138] = "SMINT"; this.mnemonics[0x13A] = "BB0_RESET"; this.mnemonics[0x13B] = "BB1_RESET"; this.mnemonics[0x13C] = "CPU_WRITE"; this.mnemonics[0x13D] = "CPU_READ";
      this.mnemonics[0x150] = "PAVEB"; this.mnemonics[0x151] = "PADDSIW"; this.mnemonics[0x152] = "PMAGW";
      this.mnemonics[0x154] = "PDISTIB"; this.mnemonics[0x155] = "PSUBSIW";
      this.mnemonics[0x158] = "PMVZB"; this.mnemonics[0x159] = "PMULHRW"; this.mnemonics[0x15A] = "PMVNZB";
      this.mnemonics[0x15B] = "PMVLZB"; this.mnemonics[0x15C] = "PMVGEZB"; this.mnemonics[0x15D] = "PMULHRIW";
      this.mnemonics[0x15E] = "PMACHRIW";
      this.mnemonics[0x178] = "SVDC"; this.mnemonics[0x179] = "RSDC"; this.mnemonics[0x17A] = "SVLDT";
      this.mnemonics[0x17B] = "RSLDT"; this.mnemonics[0x17C] = "SVTS"; this.mnemonics[0x17D] = "RSTS";
      this.mnemonics[0x17E] = "SMINT";
      this.operands[0x150] = "0A0A06A9"; this.operands[0x151] = "0A0A06A9"; this.mnemonics[0x152] = "0A0A06A9";
      this.operands[0x154] = "0A0A06AF"; this.operands[0x155] = "0A0A06A9";
      this.operands[0x158] = "0A0A06AF"; this.operands[0x159] = "0A0A06A9"; this.mnemonics[0x15A] = "0A0A06AF";
      this.operands[0x15B] = "0A0A06AF"; this.operands[0x15C] = "0A0A06AF"; this.mnemonics[0x15D] = "0A0A06A9";
      this.operands[0x15E] = "0A0A06AF";
      this.operands[0x178] = "30000A08"; this.operands[0x179] = "0A083000"; this.operands[0x17A] = "3000";
      this.operands[0x17B] = "3000"; this.operands[0x17C] = "3000"; this.operands[0x17D] = "3000";
      this.operands[0x17E] = "";
    }
    if( type === 4 )
    {
      this.mnemonics[0x138] = "SMINT"; this.mnemonics[0x139] = "DMINT"; this.mnemonics[0x13A] = "RDM";
    }
    if( type === 5 )
    {
      this.mnemonics[0x13F] = "ALTINST";
      this.mnemonics[0x1A6] = ["???",["MONTMUL","XSA1","XSA256","???","???","???","???","???"]];
      this.mnemonics[0x1A7] = [
        "???",
        [
          "XSTORE",
          ["???","???","XCRYPT-ECB","???"],
          ["???","???","XCRYPT-CBC","???"],
          ["???","???","XCRYPT-CTR","???"],
          ["???","???","XCRYPT-CFB","???"],
          ["???","???","XCRYPT-OFB","???"],
          "???",
          "???"
        ]
      ];
      this.operands[0x1A6] = ["",["","","","","","","",""]];
      this.operands[0x1A7] = [
        "",
        [
          "",
          ["","","",""],
          ["","","",""],
          ["","","",""],
          ["","","",""],
          ["","","",""],
          "",
          ""
        ]
      ];
    }
    if( type === 6 )
    {
      this.mnemonics[0x110] = "UMOV"; this.mnemonics[0x111] = "UMOV"; this.mnemonics[0x112] = "UMOV"; this.mnemonics[0x113] = "UMOV";
      this.mnemonics[0x1A6] = "CMPXCHG"; this.mnemonics[0x1A7] = "CMPXCHG";
      this.operands[0x110] = "06000A00"; this.operands[0x111] = "070E0B0E"; this.operands[0x112] = "0A000600"; this.operands[0x113] = "0B0E070E";
      this.operands[0x1A6] = ""; this.operands[0x1A7] = "";
    }
  },
  loadBinCode: function( hexStr )
  {
    this.binCode = []; this.codePos = 0;
    var len = hexStr.length;
    for( var i = 0, el = 0, sing = 0, int32 = 0; i < len; i += 8 )
    {
      int32 = parseInt( hexStr.slice( i, i + 8 ), 16 );
      if( isNaN( int32 ) ){ return ( false ); }
      ( ( len - i ) < 8 ) && ( int32 <<= ( 8 - len - i ) << 2 );
      sing = int32;
      int32 ^= int32 & 0x80000000;
      int32 = ( int32 >> 24 ) | ( ( int32 << 8 ) & 0x7FFFFFFF );
      this.binCode[el++] = ( ( ( sing >> 24 ) & 0x80 ) | int32 ) & 0xFF;
      int32 = ( int32 >> 24 ) | ( ( int32 << 8 ) & 0x7FFFFFFF );
      this.binCode[el++] = ( ( ( sing >> 16 ) & 0x80 ) | int32 ) & 0xFF;
      int32 = ( int32 >> 24 ) | ( ( int32 << 8 ) & 0x7FFFFFFF );
      this.binCode[el++] = ( ( ( sing >> 8 ) & 0x80 ) | int32 ) & 0xFF;
      int32 = ( int32 >> 24 ) | ( ( int32 << 8 ) & 0x7FFFFFFF );
      this.binCode[el++] = ( ( sing & 0x80 ) | int32 ) & 0xFF;
    }
    len >>= 1;
    for(; len < this.binCode.length; this.binCode.pop() );
    return ( true );
  },
  setBinCode: function( uintArray, codePos ) { this.binCode = uintArray; this.codePos = codePos; },
  nextByte: function()
  {
    if ( this.codePos < this.binCode.length )
    {
      ( ( t = this.binCode[this.codePos++].toString(16) ).length === 1) && ( t = "0" + t );
      this.instructionHex += t;
      ( ( this.pos32 += 1 ) > 0xFFFFFFFF ) && ( this.pos32 = 0, ( ( this.pos64 += 1 ) > 0xFFFFFFFF ) && ( this.pos64 = 0 ) );
    }
  },
  setBasePosition: function( Address )
  {
    var t = Address.split(":");
    if ( typeof t[1] !== "undefined" ){ this.codeSeg = parseInt( t[0].slice( Math.max( 0, t[0].length - 4 ) ), 16 ); Address = t[1]; }
    var Len = Address.length;
    if( Len >= 9 && this.bitMode == 2 ){ this.pos64 = parseInt( Address.slice( Math.max(0, Len - 16), Len - 8 ), 16 ); }
    if( Len >= 5 && this.bitMode >= 1 && !( this.bitMode == 1 & this.codeSeg >= 36 ) ){ this.pos32 = parseInt( Address.slice( Math.max( 0, Len - 8 ) ), 16 ); }
    else if( Len >= 1 && this.bitMode >= 0 ){ this.pos32 = ( this.pos32 & 0xFFFF0000 ) | ( parseInt( Address.slice( Math.max( 0, Len - 4 ) ), 16 ) ); }
    if ( this.pos32 < 0 ) { this.pos32 += 0x100000000; }
  },
  getBasePosition: function()
  {
    if( this.bitMode === 0 | ( this.bitMode === 1 & this.codeSeg >= 36 ) )
    {
      for ( var s16 = ( this.pos32 & 0xFFFF ).toString(16); s16.length < 4; s16 = "0" + s16 );
      for ( var seg = ( this.codeSeg ).toString(16); seg.length < 4; seg = "0" + seg );
      return( ( seg + ":" + s16 ).toUpperCase() );
    }
    var s64="", s32="";
    if( this.bitMode >= 1 )
    {
      for ( s32 = this.pos32.toString(16); s32.length < 8; s32 = "0" + s32 );
    }
    if( this.bitMode === 2 )
    {
      for ( s64 = this.pos64.toString(16); s64.length < 8; s64 = "0" + s64 );
    }
    return ( ( s64 + s32 ).toUpperCase() );
  },
  setCodeSeg: function( v ) { this.codeSeg = v & 0xFFFF; }, getCodeSeg: function( v ) { return(this.codeSeg); },
  setAddress: function( v ) { this.pos64 = (v / 0x100000000) & -1; this.pos32 = v & -1; }, setAddress64: function( v64, v32 ) { this.pos64 = v64 & -1; this.pos32 = v32 & -1; },
  getAddress: function() { return(this.pos64 * 0x100000000 + this.pos32); }, getAddress64: function() { return([this.pos64, this.pos32]); },
  getOperandSize: function( sizeAttribute )
  {
    var s4 = 0, s3 = 0, s2 = 0, s1 = 0, s0 = -1;
    s1 = sizeAttribute; s1 = ( ( s1 & 0xF0 ) !== 0 ? ( s1 >>= 4, 4 ) : 0 ) | ( ( s1 & 0xC ) !== 0 ? ( s1 >>= 2, 2 ) : 0 ) | ( ( s1 >>= 1 ) !== 0 );
    if( sizeAttribute === 0 ) { s1 = -1; }
    sizeAttribute -= ( 1 << s1 );
    s2 = sizeAttribute; s2 = ( ( s2 & 0xF0 ) !== 0 ? ( s2 >>= 4, 4 ) : 0 ) | ( ( s2 & 0xC ) !== 0 ? ( s2 >>= 2, 2 ) : 0 ) | ( ( s2 >>= 1 ) !== 0 );
    if( s2 !== 0 ) { sizeAttribute -= ( 1 << s2 ); }
    else { s2 = s1; }
    s3 = sizeAttribute; s3 = ( ( s3 & 0xF0 ) !== 0 ? ( s3 >>= 4, 4 ) : 0 ) | ( ( s3 & 0xC ) !== 0 ? ( s3 >>= 2, 2 ) : 0 ) | ( ( s3 >>= 1 ) !== 0 );
    if( s3 !== 0 ) { sizeAttribute -= ( 1 << s3 ); }
    else { s3 = s2; if( s2 !== 2 ) { s2 = s1; } };
    if ( this.bitMode <= 1 && s2 >= 3 && !this.vect )
    {
      if( ( s1 | s2 | s3 ) === s3 ){ s1 = 2; s3 = 2; }
      s2 = 2;
    }
    if( this.bitMode === 0 && !this.vect ) { var t = s3; s3 = s2; s2 = t; }
    if( ( this.vect || this.extension > 0 ) && ( ( s1 + s2 + s3 ) === 7 | ( s1 + s2 + s3 ) === 5 ) ) { this.vect = false; return( ( [ s2, s1 ] )[ this.widthBit & 1 ] ); }
    if( this.vect && this.conversionMode === 1 )
    {
      s0 = s1; s3 = s1; s2 = s1;
    }
    return( ( [ s3, s2, s1, s0 ] )[ this.sizeAttrSelect ] );
  },
  decode_modRM_SIB_Value: function()
  {
    var v = this.binCode[this.codePos];
    var modeScale = (v >> 6) & 0x03;
    var opcodeRegIndex = (v >> 3) & 0x07;
    var rmBase = v & 0x07;
    var byteValueArray = [
      modeScale,
      opcodeRegIndex,
      rmBase
    ];
    this.nextByte();
    return (byteValueArray);
  },
  decodeImmediate: function( type, bySize, sizeSetting )
  {
    var v32 = 0, v64 = 0;
    var pad32 = 0, pad64 = 0;
    var sing = 0;
    var extend = 0;
    var s = sizeSetting & 0x0F;
    extend = sizeSetting >> 4;
    if ( bySize )
    {
      s = this.getOperandSize( s );
      if ( extend > 0 )
      {
        extend = this.getOperandSize( extend );
      }
    }
    var n = 1 << s;
    pad32 = Math.min( n, 4 ); ( n >= 8 ) && ( pad64 = 8 );
    this.immValue = this.binCode[this.codePos];
    for ( var i = 0, v = 1; i < pad32; v32 += this.binCode[this.codePos] * v, i++, v *= 256, this.nextByte() );
    for ( v = 1; i < pad64; v64 += this.binCode[this.codePos] * v, i++, v *= 256, this.nextByte() );
    pad32 <<= 1; pad64 <<= 1;
    if( type === 1 ) { v32 &= ( 1 << ( ( n << 3 ) - 4 ) ) - 1; }
    if ( type === 2 )
    {
      pad32 = ( Math.min( this.bitMode, 1 ) << 2 ) + 4; pad64 = Math.max( Math.min( this.bitMode, 2 ), 1 ) << 3;
      var C64 = 0;
      var n = Math.min( 0x100000000, Math.pow( 2, 4 << ( s + 1 ) ) );
      if( v32 >= ( n / 2 ) ) { v32 -= n; }
      v32 += this.pos32;
      ( C64 = ( ( v32 ) >= 0x100000000 ) ) && ( v32 -= 0x100000000 );
      if ( s <= 2 ) { C64 = false; }
      ( ( v64 += this.pos64 + C64 ) > 0xFFFFFFFF ) && ( v64 -= 0x100000000 );
      if( this.bitMode == 0 ) { v64 = 0; v32 &= 0xFFFF; } else if ( this.bitMode == 1 ) { v32 &= 0xFFFFFFFF; }
    }
    if ( type === 3 )
    {
      pad64 = 0;
      var center = 2 * ( 1 << ( n << 3 ) - 2 );
      sing = 1;
      if ( this.vsib && s === 0 )
      {
        var vScale = this.widthBit | 2;
        center <<= vScale; v32 <<= vScale;
      }
      if ( v32 >= center )
      {
        v32 = center * 2 - v32;
        sing = 2;
      }
    }
    for( var imm = v32.toString(16), L = pad32; imm.length < L; imm = "0" + imm );
    if( pad64 > 8 ) { for( imm = v64.toString(16) + imm, L = pad64; imm.length < L; imm = "0" + imm ); }
    if ( extend !== s )
    {
      extend = Math.pow( 2, extend ) * 2;
      var spd = "00"; ( ( ( parseInt( imm.substring(0, 1), 16) & 8 ) >> 3 ) ) && ( spd = "FF" );
      for (; imm.length < extend; imm = spd + imm);
    }
    if( this.addressMap )
    {
      var pos = 0;
      if( imm.length <= 8 )
      {
        pos = parseInt(imm, 16);
      }
      else
      {
        pos = ( parseInt(imm.substring(0,8), 16) * 0x100000000 ) + parseInt(imm.substring(8,16), 16);
      }
      if( this.pointerSize > 0 && this.segOverride == "[" )
      {
        if( !this.addressMode )
        {
          s = this.bitMode == 2 ? 3 : 2;
          for( var i = 0, r = 0; i < this.mapped_pos.length; i += 2 )
          {
            if( pos >= this.mapped_pos[i] && pos < this.mapped_pos[i + 1] )
            {
              this.pointerSize = 0; this.lookup = false; this.rel = false;
              return( this.mapped_loc[ r + ( pos - this.mapped_pos.get[ i ] ) >> s ] );
            }
            r += ( ( ( this.mapped_pos[ i + 1 ] - this.mapped_pos[ i ] ) ) >> s ) - 1;
          }
        }
        else
        {
          for( var i = 0, r = 0; i < this.mapped_pos.length; i += 2 )
          {
            if(pos >= this.mapped_pos[ i ] && pos < this.mapped_pos[i + 1])
            {
              this.pointerSize = 0; this.lookup = false; this.rel = false;
              return( this.mapped_loc[ r ] + "()");
            }
            r += 1;
          }
        }
        if( !this.lookup )
        {
          for( var i = 0; i < this.data_off.length; i += 2 )
          {
            if( this.data_off[i] == pos ) { this.pointerSize = 0; this.lookup = false; this.rel = false; break; }
          }
          if( i == this.data_off.length ) { this.data_off[this.data_off.length] = pos; this.data_off[this.data_off.length] = 1 << ( this.pointerSize >> 1 ); }
        }
      }
      else if( this.rel )
      {
        if( !this.addressMode )
        {
          s = this.bitMode == 2 ? 3 : 2;
          for( var i = 0, r = 0; i < this.mapped_pos.length; i += 2 )
          {
            if( pos >= this.mapped_pos[i] && pos < this.mapped_pos.get[i + 1] )
            {
              this.pointerSize = 0; this.lookup = false; this.rel = false;
              return( this.mapped_loc[ r + ( pos - this.mapped_pos[ i ] ) >> s ] + "()" );
            }
            r += ( ( ( this.mapped_pos[ i + 1 ] - this.mapped_pos[ i ] ) ) >> s ) - 1;
          }
        }
        else
        {
          for( var i = 0, r = 0; i < this.mapped_pos.length; i += 2 )
          {
            if(pos >= this.mapped_pos[ i ] && pos < this.mapped_pos[i + 1])
            {
              this.pointerSize = 0; this.lookup = false; this.rel = false;
              return( this.mapped_loc[ r ] + "()");
            }
            r += 1;
          }
        }
        for( var i = 0; i < this.crawl.length; i++ )
        {
          if( this.crawl[i] == pos ) { this.lookup = false; rel = false; break; }
        }
        if( i == this.crawl.length ) { this.crawl[this.crawl.length] = pos; }
      }
      this.pointerSize = 0; this.lookup = false; this.rel = false;
    }
    return ( ( sing > 0 ? ( sing > 1 ? "-" : "+" ) : "" ) + imm.toUpperCase() );
  },
  decodeRegValue: function( RValue, bySize, setting )
  {
    if( this.vect && this.extension === 0 )
    {
      this.sizeAttrSelect = 0;
    }
    if ( bySize )
    {
      setting = this.getOperandSize( setting );
      if( this.vect && setting < 4 ) { setting = 4; }
    }
    if( this.opcode >= 0x400 ) { RValue &= 15; }
    else if( this.bitMode <= 1 && this.extension >= 1 ) { RValue &= 7; }
    if ( this.opcode >= 0x700 && setting === 6 )
    {
      setting = 16;
    }
    else if ( setting === 0 )
    {
      return (this.reg[0][this.rexActive][ RValue ]);
    }
    return (this.reg[setting][ RValue ]);
  },
  decode_modRM_SIB_Address: function( modRM, bySize, setting )
  {
    var out = "";
    var sc = "{";
    if( modRM[0] !== 3 )
    {
      if( this.vect && this.extension === 0 )
      {
        this.sizeAttrSelect = 0;
      }
      if ( bySize )
      {
        if ( setting !== 16 || this.vect )
        {
          setting = ( this.getOperandSize( setting ) << 1 ) | this.farPointer;
        }
        else if ( !this.vect ) { setting = 11 - ( ( this.bitMode <= 1 ) * 5 ); }
      }
      setting = setting & 0x0F;
      if( this.extension !== 0 && setting === 9 ){ setting = 6; }
      if ( this.conversionMode === 1 || this.conversionMode === 2 || this.vsib ) { out += this.ptr[this.widthBit > 0 ? 6 : 4]; }
      else{ out = this.ptr[setting]; }
      out += this.segOverride;
      var addressSize = this.bitMode + 1;
      if (this.addressOverride)
      {
        addressSize = addressSize - 1;
        if(addressSize === 0)
        {
          addressSize = 2;
        }
      }
      var disp = modRM[0] - 1;
      if(addressSize >= 2 && modRM[0] === 2)
      {
        disp += 1;
      }
      var dispType = 3;
      if( addressSize === 1 )
      {
        if(addressSize === 1 && modRM[0] === 0 && modRM[2] === 6)
        {
          disp = 1;
          dispType = 0;
        }
        if( modRM[2] < 4 ){ out += this.reg[ addressSize ][ 3 + ( modRM[2] & 2 ) ] + "+"; }
        if( modRM[2] < 6 ){ out += this.reg[ addressSize ][ 6 + ( modRM[2] & 1 ) ]; }
        else if ( dispType !== 0 ) { out += this.reg[ addressSize ][ 17 - ( modRM[2] << 1 ) ]; }
      }
      else
      {
        if( modRM[0] === 0 && modRM[2] === 5 )
        {
          disp = 2; dispType = this.bitMode == 2 ? 2 : 0;
        }
        if( modRM[2] === 4 )
        {
          var sib = this.decode_modRM_SIB_Value();
          var indexReg = this.indexExtend | sib[1];
          if ( modRM[0] === 0 && sib[2] === 5 && !this.vsib )
          {
            disp = 2;
            if (indexReg === 4)
            {
              dispType = 0;
              if( addressSize === 3 ) { disp = 50; }
            }
          }
          else
          {
            out += this.reg[ addressSize ][ this.baseExtend & 8 | sib[2] ];
            if ( indexReg !== 4 || this.vsib )
            {
              out = out + "+";
            }
          }
          if ( indexReg !== 4 && !this.vsib )
          {
            out += this.reg[ addressSize ][ this.indexExtend | indexReg ];
            out = out + this.scale[sib[0]];
          }
          else if ( this.vsib )
          {
            setting = ( setting < 8 ) ? 4 : setting >> 1;
            if( this.opcode < 0x700 ) { indexReg |= ( this.vectorRegister & 0x10 ); }
            out += this.decodeRegValue( this.indexExtend | indexReg, false, setting );
            out = out + this.scale[sib[0]];
          }
        }
        else if( ( modRM[0] == 0 && modRM[2] != 5 ) || modRM[0] > 0 )
        {
          out += this.reg[ addressSize ][ this.baseExtend & 8 | modRM[2] ];
        }
      }
      if( disp >= 0 ) { this.pointerSize = ( modRM[0] == 0 && modRM[2] == 5 ) ? setting : 0; out += this.decodeImmediate( dispType, false, disp ); }
      out += "]";
      if(
          ( this.conversionMode !== 0 ) &&
         !(
            ( this.conversionMode === 3 && ( this.opcode >= 0x700 || !( this.opcode >= 0x700 ) && !this.float ) ) ||
            ( !( this.opcode >= 0x700 ) && ( this.vectS === 0 || ( this.conversionMode === 5 && this.vectS === 5 ) ||
            ( this.conversionMode !== 1 && this.vectS === 1 ) ^ ( this.conversionMode < 3 && !this.swizzle ) ) )
          )
      )
      {
        if( this.conversionMode >= 4 ){ this.conversionMode += 2; }
        if( this.conversionMode >= 8 ){ this.conversionMode += 2; }
        if( this.opcode >= 0x700 )
        {
          if ( !this.swizzle && this.conversionMode > 2 ) { this.conversionMode = 31; }
          else if( this.float )
          {
            if( this.conversionMode === 7 ) { this.conversionMode++; }
            if( this.conversionMode === 10 ) { this.conversionMode = 3; }
          }
        }
        out += sc + this.conversionModes[ ( this.conversionMode << 1 ) | ( this.widthBit ^ ( !( this.opcode >= 0x700 ) & this.vectS === 7 ) ) & 1 ]; sc = ",";
      }
      else if( this.conversionMode !== 0 ) { out += sc + "Error"; sc = ","; }
    }
    else
    {
      if ( ( this.extension === 3 && this.hIntZeroMerg ) || ( this.extension === 2 && this.conversionMode === 1 ) )
      {
        this.roundMode |= this.roundingSetting;
      }
      if( ( ( setting & 0xF0 ) > 0 ) && !bySize ) { setting >>= 4; }
      out = this.decodeRegValue( this.baseExtend | modRM[2], bySize, setting );
      if( this.opcode >= 0x700 || ( this.extension === 3 && !this.hIntZeroMerg && this.swizzle ) )
      {
        if( this.opcode >= 0x700 && this.conversionMode >= 3 ){ this.conversionMode++; }
        if( this.conversionMode !== 0 ){ out += sc + this.regSwizzleModes[ this.conversionMode ]; sc = ","; }
      }
      if( this.extension !== 2 ){ this.hIntZeroMerg = false; }
    }
    if( this.opcode >= 0x700 )
    {
      if(this.swizzle)
      {
        if( this.opcode === 0x79A ) { out += sc + this.conversionModes[ ( 18 | ( this.vectorRegister & 3 ) ) << 1 ]; sc = "}"; }
        else if( this.opcode === 0x79B ) { out += sc + this.conversionModes[ ( 22 + ( this.vectorRegister & 3 ) ) << 1 ]; sc = "}"; }
        else if( ( this.roundingSetting & 8 ) === 8 ) { out += sc + this.roundModes [ 24 | ( this.vectorRegister & 7 ) ]; sc = "}"; }
      }
      else if( this.vectorRegister !== 0 )
      {
        if( ( ( this.up && this.vectorRegister !== 2 ) ||
          ( !this.up && this.vectorRegister !== 3 && this.vectorRegister <= 15 ) )
        ) { out += sc + this.conversionModes[ ( ( this.vectorRegister + 2 ) << 1 ) | this.widthBit ]; sc = "}"; }
        else { out += sc + "Error"; sc = "}"; }
      }
    }
    if ( sc === "," ) { sc = "}"; }
    if( sc === "}" ) { out += sc; }
    if( this.hIntZeroMerg )
    {
      if ( this.extension === 3 ) { out += "{EH}"; }
      else if ( this.opcode >= 0x700 ) { out += "{NT}"; }
    }
    return (out);
  },
  decodePrefixAdjustments: function()
  {
    this.opcode = ( this.opcode & 0x300 ) | this.binCode[this.codePos];
    this.nextByte();
    if(this.opcode === 0x0F)
    {
      this.opcode = 0x100;
      return(this.decodePrefixAdjustments());
    }
    else if(this.opcode === 0x138 && this.mnemonics[0x138] === "")
    {
      this.opcode = 0x200;
      return(this.decodePrefixAdjustments());
    }
    else if(this.opcode === 0x13A && this.mnemonics[0x13A] === "")
    {
      this.opcode = 0x300;
      return(this.decodePrefixAdjustments());
    }
    if( this.opcode >= 0x40 & this.opcode <= 0x4F && this.bitMode === 2 )
    {
      this.rexActive = 1;
      this.baseExtend = ( this.opcode & 0x01 ) << 3;
      this.indexExtend = ( this.opcode & 0x02 ) << 2;
      this.regExtend = ( this.opcode & 0x04 ) << 1;
      this.widthBit = ( this.opcode & 0x08 ) >> 3;
      this.sizeAttrSelect = this.widthBit ? 2 : this.sizeAttrSelect;
      return(this.decodePrefixAdjustments());
    }
    if( this.opcode === 0xC5 && ( this.binCode[this.codePos] >= 0xC0 || this.bitMode === 2 ) )
    {
      this.extension = 1;
      this.opcode = this.binCode[this.codePos];
      this.nextByte();
      this.opcode ^= 0xF8;
      if( this.bitMode === 2 )
      {
        this.regExtend = ( this.opcode & 0x80 ) >> 4;
        this.vectorRegister = ( this.opcode & 0x78 ) >> 3;
      }
      this.sizeAttrSelect = ( this.opcode & 0x04 ) >> 2;
      this.simd = this.opcode & 0x03;
      this.opcode = 0x100;
      this.opcode = ( this.opcode & 0x300 ) | this.binCode[this.codePos];
      this.nextByte();
      return(null);
    }
    if( this.opcode === 0xC4 && ( this.binCode[this.codePos] >= 0xC0 || this.bitMode === 2 ) )
    {
      this.extension = 1;
      this.opcode = this.binCode[this.codePos];
      this.nextByte();
      this.opcode |= ( this.binCode[this.codePos] << 8 );
      this.nextByte();
      this.opcode ^= 0x78E0;
      if( this.bitMode === 2 )
      {
        this.regExtend = ( this.opcode & 0x0080 ) >> 4;
        this.indexExtend = ( this.opcode & 0x0040 ) >> 3;
        this.baseExtend = ( this.opcode & 0x0020 ) >> 2;
      }
      this.widthBit = ( this.opcode & 0x8000 ) >> 15;
      this.vectorRegister = ( this.opcode & 0x7800 ) >> 11;
      this.sizeAttrSelect = ( this.opcode & 0x0400 ) >> 10;
      this.simd = ( this.opcode & 0x0300 ) >> 8;
      this.opcode = ( this.opcode & 0x001F ) << 8;
      this.opcode = ( this.opcode & 0x300 ) | this.binCode[this.codePos];
      this.nextByte();
      return(null);
    }
    if( this.opcode === 0x8F )
    {
      var Code = this.binCode[ this.codePos ] & 0x0F;
      if( Code >= 8 && Code <= 10 )
      {
        this.extension = 1;
        this.opcode = this.binCode[this.codePos];
        this.nextByte();
        this.opcode |= ( this.binCode[this.codePos] << 8 );
        this.nextByte();
        this.opcode ^= 0x78E0;
        this.regExtend = ( this.opcode & 0x0080 ) >> 4;
        this.indexExtend = ( this.opcode & 0x0040 ) >> 3;
        this.baseExtend = ( this.opcode & 0x0020 ) >> 2;
        this.widthBit = ( this.opcode & 0x8000 ) >> 15;
        this.vectorRegister = ( this.opcode & 0x7800 ) >> 11;
        this.sizeAttrSelect = ( this.opcode & 0x0400 ) >> 10;
        this.simd = ( this.opcode & 0x0300 ) >> 8;
        if( this.simd > 0 ) { this.invalidOp = true; }
        this.opcode = 0x400 | ( ( this.opcode & 0x0003 ) << 8 );
        this.opcode = ( this.opcode & 0x700 ) | this.binCode[this.codePos];
        this.nextByte();
        return(null);
      }
    }
    if( this.opcode === 0xD6 )
    {
      this.opcode = this.binCode[this.codePos];
      this.nextByte();
      this.opcode |= ( this.binCode[this.codePos] << 8 );
      this.nextByte();
      this.widthBit = this.simd & 1;
      this.vectorRegister = ( this.opcode & 0xF800 ) >> 11;
      this.roundMode = this.vectorRegister >> 3;
      this.maskRegister = ( this.opcode & 0x0700 ) >> 8;
      this.hIntZeroMerg = ( this.opcode & 0x0080 ) >> 7;
      this.conversionMode = ( this.opcode & 0x0070 ) >> 4;
      this.regExtend = ( this.opcode & 0x000C ) << 1;
      this.baseExtend = ( this.opcode & 0x0003 ) << 3;
      this.indexExtend = ( this.opcode & 0x0002 ) << 2;
      this.opcode = 0x700 | this.binCode[this.codePos];
      this.nextByte();
      return(null);
    }
    if( this.mnemonics[0x62] === "" && this.opcode === 0x62 )
    {
      this.opcode = this.binCode[this.codePos];
      this.nextByte();
      this.opcode ^= 0xF0;
      this.indexExtend = ( this.opcode & 0x80 ) >> 4;
      this.baseExtend = ( this.opcode & 0x40 ) >> 3;
      this.regExtend = ( this.opcode & 0x20 ) >> 2;
      if ( this.simd !== 1 ) { this.sizeAttrSelect = ( ( this.opcode & 0x10 ) === 0x10 ) ? 2 : 1; } else { this.simd = 0; }
      this.opcode = 0x800 | ( ( this.opcode & 0x30 ) >> 4 ) | ( ( this.opcode & 0x0F ) << 2 );
      return(null);
    }
    if ( this.opcode === 0x62 && ( this.binCode[this.codePos] >= 0xC0 || this.bitMode === 2 ) )
    {
      this.extension = 2;
      this.opcode = this.binCode[this.codePos];
      this.nextByte();
      this.opcode |= ( this.binCode[this.codePos] << 8 );
      this.nextByte();
      this.opcode |= ( this.binCode[this.codePos] << 16 );
      this.nextByte();
      this.opcode ^= 0x0878F0;
      this.invalidOp = ( this.opcode & 0x00000C ) > 0;
      if( this.bitMode === 2 )
      {
        this.regExtend = ( ( this.opcode & 0x80 ) >> 4 ) | ( this.opcode & 0x10 );
        this.baseExtend = ( this.opcode & 0x60 ) >> 2;
        this.indexExtend = ( this.opcode & 0x40 ) >> 3;
      }
      this.vectorRegister = ( ( this.opcode & 0x7800 ) >> 11 ) | ( ( this.opcode & 0x080000 ) >> 15 );
      this.widthBit = ( this.opcode & 0x8000 ) >> 15;
      this.simd = ( this.opcode & 0x0300 ) >> 8;
      this.hIntZeroMerg = ( this.opcode & 0x800000 ) >> 23;
      if ( ( this.opcode & 0x0400 ) > 0 )
      {
        this.sizeAttrSelect = ( this.opcode & 0x600000 ) >> 21;
        this.roundMode = this.sizeAttrSelect | 4;
        this.conversionMode = (this.opcode & 0x100000 ) >> 20;
      }
      else
      {
        this.sizeAttrSelect = 2;
        this.conversionMode = ( this.opcode & 0x700000 ) >> 20;
        this.roundMode = this.conversionMode;
        this.extension = 3;
      }
      this.maskRegister = ( this.opcode & 0x070000 ) >> 16;
      this.opcode = ( this.opcode & 0x03 ) << 8;
      this.opcode = ( this.opcode & 0x300 ) | this.binCode[this.codePos];
      this.nextByte();
      return(null);
    }
    if ( ( this.opcode & 0x7E7 ) === 0x26 || ( this.opcode & 0x7FE ) === 0x64 )
    {
      this.segOverride = this.mnemonics[ this.opcode ];
      return(this.decodePrefixAdjustments());
    }
    if(this.opcode === 0x66)
    {
      this.simd = 1;
      this.sizeAttrSelect = 0;
      return(this.decodePrefixAdjustments());
    }
    if(this.opcode === 0x67)
    {
      this.addressOverride = true;
      return(this.decodePrefixAdjustments());
    }
    if (this.opcode === 0xF2 || this.opcode === 0xF3)
    {
      this.simd = (this.opcode & 0x02 ) | ( 1 - this.opcode & 0x01 );
      this.prefixG1 = this.mnemonics[ this.opcode ];
      this.hleFlipG1G2 = true;
      return(this.decodePrefixAdjustments());
    }
    if (this.opcode === 0xF0)
    {
      this.prefixG2 = this.mnemonics[ this.opcode ];
      this.hleFlipG1G2 = false;
      return(this.decodePrefixAdjustments());
    }
    if ( this.bitMode === 2 )
    {
      this.invalidOp |= ( ( ( this.opcode & 0x07 ) >= 0x06 ) & ( this.opcode <= 0x40 ) );
      this.invalidOp |= ( this.opcode === 0x60 | this.opcode === 0x61 );
      this.invalidOp |= ( this.opcode === 0xD4 | this.opcode === 0xD5 );
      this.invalidOp |= ( this.opcode === 0x9A | this.opcode === 0xEA );
      this.invalidOp |= ( this.opcode === 0x82 );
    }
  },
  decodeOpcode: function()
  {
    this.instruction = this.mnemonics[this.opcode];
    this.insOperands = this.operands[this.opcode];
    var modRMByte = this.binCode[this.codePos];
    if(this.instruction instanceof Array && this.instruction.length == 2) { var bits = ( modRMByte >> 6 ) & ( modRMByte >> 7 ); this.instruction = this.instruction[bits]; this.insOperands = this.insOperands[bits]; }
    if(this.instruction instanceof Array && this.instruction.length == 8)
    {
      var bits = ( modRMByte & 0x38 ) >> 3; this.instruction = this.instruction[bits]; this.insOperands = this.insOperands[bits];
      if(this.instruction instanceof Array && this.instruction.length == 8)
      {
        var bits = ( modRMByte & 0x07 ); this.instruction = this.instruction[bits]; this.insOperands = this.insOperands[bits]; this.nextByte();
      }
    }
    if(this.instruction instanceof Array && this.instruction.length == 4)
    {
      this.vect = true;
      if(this.instruction[2] !== "" && this.instruction[3] !== "") { this.prefixG1 = ""; } else { this.simd = ( this.simd === 1 ) & 1; }
      this.instruction = this.instruction[this.simd]; this.insOperands = this.insOperands[this.simd];
      if(this.instruction instanceof Array && this.instruction.length == 4)
      {
        if(this.instruction[this.extension] !== "") { this.instruction = this.instruction[this.extension]; this.insOperands = this.insOperands[this.extension]; }
        else{ this.instruction = "???"; this.insOperands = ""; }
      }
      else if( this.extension === 3 ){ this.instruction = "???"; this.insOperands = ""; }
    }
    else if( this.opcode >= 0x700 && this.simd > 0 ){ this.instruction = "???"; this.insOperands = ""; }
    if(this.instruction instanceof Array && this.instruction.length == 3)
    {
      var bits = ( this.extension === 0 & this.bitMode !== 0 ) ^ ( this.sizeAttrSelect >= 1 );
      ( this.widthBit ) && ( bits = 2 );
      ( this.extension === 3 && this.hIntZeroMerg && this.instruction[1] !== "" ) && ( this.hIntZeroMerg = false, bits = 1 );
      if (this.instruction[bits] !== "") { this.instruction = this.instruction[bits]; this.insOperands = this.insOperands[bits]; }
      else { this.instruction = this.instruction[0]; this.insOperands = this.insOperands[0]; }
    }
    if( this.opcode <= 0x400 && this.extension > 0 && this.instruction.charAt(0) !== "K" && this.instruction !== "???" ) { this.instruction = "V" + this.instruction; }
    if( this.bitMode <= 1 && this.instruction === "MOVSXD" ) { this.instruction = "ARPL"; this.insOperands = "06020A01"; }
  },
  decodeOperandString: function()
  {
    var operandValue = 0, code = 0, bySize = 0, setting = 0;
    var explicitOp = 8, immOp = 3;
    for( var i = 0, opNum = 0; i < this.insOperands.length; i+=4 )
    {
      operandValue = parseInt( this.insOperands.substring(i, (i + 4) ), 16 );
      code = ( operandValue & 0xFE00 ) >> 9;
      bySize = ( operandValue & 0x0100 ) >> 8;
      setting = ( operandValue & 0x00FF );
      if( code === 0 )
      {
        if(bySize)
        {
          this.roundingSetting = ( setting & 0x03 ) << 3;
          if( this.opcode >= 0x700 && this.roundingSetting >= 0x10 ){ this.roundMode |= 0x10; }
          this.vsib = ( setting >> 2 ) & 1;
          this.ignoresWidthbit = ( setting >> 3 ) & 1;
          this.vectS = ( setting >> 4 ) & 7;
          this.swizzle = ( this.vectS >> 2 ) & 1;
          this.up = ( this.vectS >> 1 ) & 1;
          this.float = this.vectS & 1;
          if( ( setting & 0x80 ) == 0x80 ) { this.vect = false; }
        }
        else
        {
          this.xRelease = setting & 0x01;
          this.xAcquire = ( setting & 0x02 ) >> 1;
          this.ht = ( setting & 0x04 ) >> 2;
          this.bnd = ( setting & 0x08 ) >> 3;
        }
      }
      else if( code === 1 )
      {
        this.x86Decoder[0].set( 0, bySize, setting, opNum++ );
      }
      else if( code >= 2 && code <= 4 )
      {
        this.x86Decoder[1].set( ( code - 2 ), bySize, setting, opNum++ );
        if( code == 4 ){ this.farPointer = 1; }
      }
      else if( code === 5 )
      {
        this.x86Decoder[2].set( 0, bySize, setting, opNum++ );
      }
      else if( code >= 6 && code <= 8 && immOp <= 5 )
      {
        this.rel = ( code - 6 ) == 2;
        this.x86Decoder[immOp++].set( ( code - 6 ), bySize, setting, opNum++ );
      }
      else if( code === 9 && ( this.extension > 0 || this.opcode >= 0x700 ) )
      {
        this.x86Decoder[6].set( 0, bySize, setting, opNum++ );
      }
      else if( code === 10 )
      {
        this.x86Decoder[7].set( 0, bySize, setting, opNum++ );
      }
      else if( code >= 11 && explicitOp <= 11)
      {
        this.x86Decoder[explicitOp].set( ( code - 11 ), bySize, setting, opNum++ );
        explicitOp++;
      }
    }
  },
  decodeOperands: function()
  {
    var out = [];
    var modRMByte = [ -1,
      0,
      0
    ];
    var IMM_Used = false;
    if( this.x86Decoder[0].active )
    {
      out[ this.x86Decoder[0].opNum ] = this.decodeRegValue(
        ( this.baseExtend | ( this.opcode & 0x07 ) ),
        this.x86Decoder[0].bySizeAttrubute,
        this.x86Decoder[0].size
      );
    }
    if( this.x86Decoder[1].active )
    {
      if(this.x86Decoder[1].type !== 0)
      {
        modRMByte = this.decode_modRM_SIB_Value();
        out[ this.x86Decoder[1].opNum ] = this.decode_modRM_SIB_Address(
          modRMByte,
          this.x86Decoder[1].bySizeAttrubute,
          this.x86Decoder[1].size
        );
      }
      else
      {
        var s=0, addrsSize = 0;
        if( this.x86Decoder[1].bySizeAttrubute )
        {
          addrsSize = ( Math.pow( 2, this.bitMode ) << 1 );
          s = this.getOperandSize( this.x86Decoder[1].size, true ) << 1; this.pointerSize = addrsSize;
        }
        else
        {
          addrsSize = this.bitMode + 1;
          s = this.x86Decoder[1].size;
        }
        out[ this.x86Decoder[1].opNum ] = this.ptr[ s ];
        out[ this.x86Decoder[1].opNum ] += this.segOverride + this.decodeImmediate( 0, this.x86Decoder[1].bySizeAttrubute, addrsSize ) + "]";
      }
    }
    if( this.x86Decoder[2].active )
    {
      if( modRMByte[0] === -1 ){ modRMByte = this.decode_modRM_SIB_Value(); }
      out[ this.x86Decoder[2].opNum ] = this.decodeRegValue(
        ( this.regExtend | ( modRMByte[1] & 0x07 ) ),
        this.x86Decoder[2].bySizeAttrubute,
        this.x86Decoder[2].size
      );
    }
    if( this.x86Decoder[3].active )
    {
      var t = this.decodeImmediate(
        this.x86Decoder[3].type,
        this.x86Decoder[3].bySizeAttrubute,
        this.x86Decoder[3].size
      );
      if( this.instruction.slice(-1) === "," )
      {
        this.instruction = this.instruction.split(",");
        if( ( this.extension >= 1 && this.extension <= 2 && this.opcode <= 0x400 && this.immValue < 0x20 ) || this.immValue < 0x08 )
        {
          this.immValue |= ( ( ( this.opcode > 0x400 ) & 1 ) << 5 );
          this.instruction = this.instruction[0] + this.conditionCodes[ this.immValue ] + this.instruction[1];
        }
        else { this.instruction = this.instruction[0] + this.instruction[1]; out[ this.x86Decoder[3].opNum ] = t; }
      }
      else { out[ this.x86Decoder[3].opNum ] = t; }
      IMM_Used = true;
    }
    if( this.x86Decoder[4].active )
    {
      out[ this.x86Decoder[4].opNum ] = this.decodeImmediate(
        this.x86Decoder[4].type,
        this.x86Decoder[4].bySizeAttrubute,
        this.x86Decoder[4].size
      );
    }
    if( this.x86Decoder[5].active )
    {
      out[ this.x86Decoder[5].opNum ] = this.decodeImmediate(
        this.x86Decoder[5].type,
        this.x86Decoder[5].bySizeAttrubute,
        this.x86Decoder[5].size
      );
    }
    if( this.x86Decoder[6].active )
    {
        out[ this.x86Decoder[6].opNum ] = this.decodeRegValue(
        this.vectorRegister,
        this.x86Decoder[6].bySizeAttrubute,
        this.x86Decoder[6].size
      );
    }
    if( this.x86Decoder[7].active )
    {
      if( !IMM_Used ) { this.decodeImmediate(0, false, 0); }
      out[ this.x86Decoder[7].opNum ] = this.decodeRegValue(
        ( ( ( this.immValue & 0xF0 ) >> 4 ) | ( ( this.immValue & 0x08 ) << 1 ) ),
        this.x86Decoder[7].bySizeAttrubute,
        this.x86Decoder[7].size
      );
    }
    for( var i = 8; i < 11; i++ )
    {
      if( this.x86Decoder[i].active )
      {
        if( this.x86Decoder[i].type <= 3 )
        {
          out[ this.x86Decoder[i].opNum ] = this.decodeRegValue(
            this.x86Decoder[i].type,
            this.x86Decoder[i].bySizeAttrubute,
            this.x86Decoder[i].size
          );
        }
        else if( this.x86Decoder[i].type === 4 )
        {
          s = 3;
          if( ( this.bitMode === 0 && !this.addressOverride ) || ( this.bitMode === 1 && this.addressOverride ) ){ s = 7; }
          out[ this.x86Decoder[i].opNum ] = this.decode_modRM_SIB_Address(
            [ 0, 0, s ],
            this.x86Decoder[i].bySizeAttrubute,
            this.x86Decoder[i].size
          );
        }
        else if( this.x86Decoder[i].type === 5 | this.x86Decoder[i].type === 6 )
        {
          s = 1;
          if( ( this.bitMode === 0 && !this.addressOverride ) || ( this.bitMode === 1 & this.addressOverride ) ) { s = -1; }
          out[ this.x86Decoder[i].opNum ] = this.decode_modRM_SIB_Address(
            [ 0, 0, ( this.x86Decoder[i].type + s ) ],
            this.x86Decoder[i].bySizeAttrubute,
            this.x86Decoder[i].size
          );
        }
        else if( this.x86Decoder[i].type >= 7 )
        {
          out[ this.x86Decoder[i].opNum ] = ["ST", "FS", "GS", "1", "3", "XMM0", "M10"][ ( this.x86Decoder[i].type - 7 ) ];
        }
      }
      else { break; }
    }
    if( this.maskRegister !== 0 ){ out[0] += "{K" + this.maskRegister + "}"; }
    if( this.extension === 2 && this.hIntZeroMerg ) { out[0] += "{Z}"; }
    this.insOperands = out.toString();
  },
  decodeInstruction: function()
  {
    this.reset();
    var out = "";
    this.instructionPos = this.getBasePosition();
    this.decodePrefixAdjustments();
    if( !this.invalidOp )
    {
      this.decodeOpcode();
      this.lookup = this.instruction == "CALL" || this.instruction == "JMP";
      if( this.opcode >= 0x700 && this.instruction.slice(-1) === "," )
      {
        this.instruction = this.instruction.split(",");
        if( this.opcode >= 0x720 && this.opcode <= 0x72F )
        {
          this.immValue = this.vectorRegister >> 2;
          if( this.float || ( this.immValue !== 3 && this.immValue !== 7 ) )
          {
            this.instruction = this.instruction[0] + this.conditionCodes[this.immValue] + this.instruction[1];
          }
          else { this.instruction = this.instruction[0] + this.instruction[1]; }
          this.immValue = 0; this.vectorRegister &= 0x03;
        }
        else
        {
          this.instruction = this.instruction[0] + ( ( ( this.vectorRegister & 1 ) === 1 ) ? "H" : "L" ) + this.instruction[1];
        }
      }
      this.decodeOperandString();
      if( !this.vect && this.extension > 0 && this.opcode <= 0x400 ) { this.invalidOp = true; }
      if( this.vect && !this.ignoresWidthbit && this.extension >= 2 )
      {
        this.invalidOp = ( ( this.simd & 1 ) !== ( this.widthBit & 1 ) );
      }
      if( this.opcode >= 0x700 ) { this.widthBit ^= this.ignoresWidthbit; }
    }
    if( this.invalidOp )
    {
      out = "???"
    }
    else
    {
      this.decodeOperands();
      if( this.opcode === 0x10F )
      {
        this.instruction = this.m3DNow[ this.binCode[this.codePos] ]; this.nextByte();
        if( this.instruction === "" || this.instruction == null )
        {
          this.instruction = "???"; this.insOperands = "";
        }
      }
      else if( this.instruction === "SSS" )
      {
        var Code1 = this.binCode[this.codePos]; this.nextByte();
        var Code2 = this.binCode[this.codePos]; this.nextByte();
        if( Code1 >= 5 || Code2 >= 5 ) { this.instruction = "???"; }
        else
        {
          this.instruction = this.mSynthetic[ ( Code1 * 5 ) + Code2 ];
          if( this.instruction === "" || this.instruction == null )
          {
            this.instruction = "???";
          }
        }
      }
      if( this.opcode === 0x9A || this.opcode === 0xEA )
      {
        var t = this.insOperands.split(",");
        this.insOperands = t[1] + ":" +t[0];
      }
      if(this.prefixG1 === this.mnemonics[0xF3] && this.prefixG2 === this.mnemonics[0xF0] && this.xRelease)
      {
        this.prefixG1 = "XRELEASE";
      }
      if(this.prefixG1 === this.mnemonics[0xF2] && this.prefixG2 === this.mnemonics[0xF0] && this.xAcquire)
      {
        this.prefixG1 = "XACQUIRE";
      }
      if((this.prefixG1 === "XRELEASE" || this.prefixG1 === "XACQUIRE") && this.hleFlipG1G2)
      {
        t = this.prefixG1; this.prefixG1 = this.prefixG2; this.prefixG2 = t;
      }
      if(this.ht)
      {
        if (this.segOverride === this.mnemonics[0x2E])
        {
          this.prefixG1 = "HNT";
        }
        else if (this.segOverride === this.mnemonics[0x3E])
        {
          this.prefixG1 = "HT";
        }
      }
      if(this.prefixG1 === this.mnemonics[0xF2] && this.bnd)
      {
        this.prefixG1 = "BND";
      }
      if ( this.instructionHex.length > 30 )
      {
        var dif32 = ( ( this.instructionHex.length - 30 ) >> 1 );
        this.instructionHex = this.instructionHex.substring( 0, 30 );
        this.pos32 -= dif32; this.codePos -= dif32;
        this.prefixG1 = ""; this.prefixG2 = ""; this.instruction = "???"; this.insOperands = "";
      }
      out = this.prefixG1 + " " + this.prefixG2 + " " + this.instruction + " " + this.insOperands;
      out = out.replace(/^[ ]+|[ ]+$/g,'');
      if( this.opcode >= 0x700 || this.roundMode !== 0 )
      {
        out += this.roundModes[ this.roundMode ];
      }
    }
    return( out );
  },
  reset: function()
  {
    this.opcode = 0; this.sizeAttrSelect = 1;
    this.instruction = ""; this.insOperands = "";
    this.rexActive = 0; this.regExtend = 0; this.baseExtend = 0; this.indexExtend = 0;
    this.segOverride = "["; this.addressOverride = false; this.farPointer = 0;
    this.extension = 0; this.simd = 0; this.vect = false; this.conversionMode = 0; this.widthBit = false;
    this.vectorRegister = 0; this.maskRegister = 0; this.hIntZeroMerg = false; this.roundMode = 0x00;
    this.ignoresWidthbit = false; this.vsib = false; this.roundingSetting = 0;
    this.swizzle = false; this.up = false; this.float = false; this.vectS = 0x00;
    this.immValue = 0;
    this.prefixG1 = "", this.prefixG2 = "";
    this.xRelease = false; this.xAcquire = false; this.hleFlipG1G2 = false;
    this.ht = false;
    this.bnd = false;
    this.invalidOp = false; this.pointerSize = 0; this.lookup = false;
    this.instructionHex = "";
    for( var i = 0; i < this.x86Decoder.length; this.x86Decoder[i++].deactivate() );
  },
  resetMap: function() { this.mapped_pos = []; this.mapped_loc = []; this.data_off = []; this.linear = []; this.crawl = []; this.rows = 0; },
  scan: function(crawl) { return(crawl && (this.instruction == "RET" || this.instruction == "JMP")); },
  scanReset: function() { this.scan = function(crawl){ return(crawl && (this.instruction == "RET" || this.instruction == "JMP")); } },
  disassemble: function(crawl)
  {
    var instruction = "";
    var out = "";
    var len = this.binCode.length;
    while( this.codePos < len )
    {
      instruction = this.decodeInstruction();
      if(this.showInstructionPos) { out += this.instructionPos + " "; }
      if(this.showInstructionHex)
      {
        this.instructionHex = this.instructionHex.toUpperCase();
        for(; this.instructionHex.length < 32; this.instructionHex = this.instructionHex + " " );
        out += this.instructionHex + "";
      }
      out += instruction + "\r\n";
      this.instructionPos = ""; this.instructionHex = ""; if(this.scan(crawl)) { break; }
    }
    if( this.addressMap ){ this.rows = ((this.data_off.length + this.linear.length) >> 1) + this.crawl.length; }
    return(out);
  }
}
let operand = core.operand
core.x86Decoder = [
    new operand(),
    new operand(),
    new operand(),
    new operand(),
    new operand(),
    new operand(),
    new operand(),
    new operand(),
    new operand(),
    new operand(),
    new operand(),
    new operand()
]
operand = undefined;
onload = function(){
    $( "build" ).innerHTML = JS_BUILD
    $( "run" ).addEventListener( 'click' ,()=>{ SRDP([ "run" ], loop_start ) })
    $( "step" ).addEventListener( 'click' ,()=>{ SRDP([ "step" ], stop_regs_and_disasm ) })
    $( "trace" ).addEventListener( 'click' ,()=>{ SRDP([ "trace" ], stop_regs_and_disasm ) })
    $( "break" ).addEventListener( 'click' ,()=>{ SRDP([ "break" ], stop_regs_and_disasm ) })
    $( "rd_mem" ).addEventListener( 'click' ,()=>{ SRDP([ "read" , "mem" , 0x01A2 , 0x1000 ], on_success ) })
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
function regs_and_disasm( txt ){
    SRDP([ "read" , "reg" ], function( regs_txt ){
        const m = regs_txt.replaceAll("\n","").split(" ")
        const regs = {}
        for( let i=0; i<m.length; i+=2 ){
            const r = m[i+0]
            if(r=="")continue
            const v = m[i+1]
            regs[r]=parseInt("0x"+v)
        }
        const addr = regs["CS"]*16+regs["EIP"]
        core.setBasePosition(regs["CS"].toString(16)+":"+regs["EIP"].toString(16));
        SRDP([ "read" , "mem", addr, 30 ], function(txt){
            on_success(regs_txt+"\n"+decode(txt))
        })
    })
}
function SRDP( verb_and_args, on_success=alert, on_fail=alert ){
    if(!(typeof verb_and_args == "object")) throw new Error("! "+"typeof verb_and_args == \"object\"")
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
