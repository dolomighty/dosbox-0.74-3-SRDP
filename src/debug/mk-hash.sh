#!/bin/bash
awk '
{
    ACTION_FROM_WORD[$1]=$2
    L=length($1)
    if(MAX<L)MAX=L
}
END{
    for( L=2; L<=MAX; L++ ){
        delete ACTIONS
        for( WORD in ACTION_FROM_WORD ){
            ACTION=ACTION_FROM_WORD[WORD]
            SYNO=substr(WORD,1,L)
            ACTIONS[SYNO]=ACTIONS[SYNO] ACTION " " 
        }

        # elimino sinonimi ambigui
        for(SYNO in ACTIONS){
            N=split(ACTIONS[SYNO],A)
            if(N>1) delete ACTIONS[SYNO]
        }

        # rimangono quelli univoci
        # ci son dei duplicati, che verranno bruciati dalla sort -u
        for(SYNO in ACTIONS){
            print "{ \"" SYNO "\", " ACTIONS[SYNO] "},"
        }
    }
}
' \
| sort -u \
| column -t


exit
exit
exit

es.

./mk-hash.sh << EOF
    breakpoints SUBJ_BREAKPOINTS
    coverage    SUBJ_COVERAGE
    memory      SUBJ_MEMORY
    registers   SUBJ_REGISTERS
EOF


{  "breakpoin",    SUBJ_BREAKPOINTS  },
{  "breakpoints",  SUBJ_BREAKPOINTS  },
{  "breakpoint",   SUBJ_BREAKPOINTS  },
{  "breakpoi",     SUBJ_BREAKPOINTS  },
{  "breakpo",      SUBJ_BREAKPOINTS  },
{  "breakp",       SUBJ_BREAKPOINTS  },
{  "break",        SUBJ_BREAKPOINTS  },
{  "brea",         SUBJ_BREAKPOINTS  },
{  "bre",          SUBJ_BREAKPOINTS  },
{  "br",           SUBJ_BREAKPOINTS  },
{  "co",           SUBJ_COVERAGE     },
{  "coverage",     SUBJ_COVERAGE     },
{  "coverag",      SUBJ_COVERAGE     },
{  "covera",       SUBJ_COVERAGE     },
{  "cover",        SUBJ_COVERAGE     },
{  "cove",         SUBJ_COVERAGE     },
{  "cov",          SUBJ_COVERAGE     },
{  "memor",        SUBJ_MEMORY       },
{  "memory",       SUBJ_MEMORY       },
{  "memo",         SUBJ_MEMORY       },
{  "mem",          SUBJ_MEMORY       },
{  "me",           SUBJ_MEMORY       },
{  "regis",        SUBJ_REGISTERS    },
{  "registers",    SUBJ_REGISTERS    },
{  "register",     SUBJ_REGISTERS    },
{  "registe",      SUBJ_REGISTERS    },
{  "regist",       SUBJ_REGISTERS    },
{  "regi",         SUBJ_REGISTERS    },
{  "reg",          SUBJ_REGISTERS    },
{  "re",           SUBJ_REGISTERS    },

