/* TODO
    - Implement RUN loop
    - First pass of assembler w/ symbol table
*/
// Editor settings
var editor = ace.edit("editor");
let source;

// Set run button to disabled by default
document.getElementById("run").disabled = true;

// Buffers for memory and registers
let REG = new Uint32Array(32);
let MEM = new Uint8Array(2**16);

// Register intializations
REG[0] = 0; // $zero
let PC = 0; // Program counter

let PROG_LENGTH; // Byte offset to track total # of instructions written to memory

// Register definitions
const REG_DEFS = {
    "$zero": "00000",
    "$at": "00001",
    "$v0": "00010", "$v1": "00011",
    "$a0": "00100", "$a1": "00101", "$a2": "00110", "$a3": "00111",
    "$t0": "01000", "$t1": "01001", "$t2": "01010", "$t3": "01011", "$t4": "01100", "$t5": "01101", "$t6": "01110", "$t7": "01111",
    "$s0": "10000", "$s1": "10001", "$s2": "10010", "$s3": "10011", "$s4": "10100", "$s5": "10101", "$s6": "10110", "$s7": "10111",
    "$t8": "11000", "$t9": "11001",
    "$k0": "11010", "$k1": "11011",
    "$gp": "11100",
    "$sp": "11101",
    "$fp": "11110",
    "$ra": "11111"
};

const MAX_PROGRAM_SIZE = 4096;   // Define allocation for program instructions
const MAX_STATIC = 2**15;   // Define allocation for static data

// Define address locations
const PROGRAM_TEXT_ADDR = 0
const STATIC_ADDR = PROGRAM_TEXT_ADDR + MAX_PROGRAM_SIZE

// Array of operation objects
let OPS = [
    {name: "add", type: 'R', args: 3, opcode: "100000", func: function(rs, rt, rd) {REG[rd] = REG[rs]+REG[rt]}},
    {name: "addi", type: 'I', args: 3, opcode: "001000", func: function(rs, rt, imm) {REG[rt] = REG[rs] + imm}}
]

// Map of instruction keywords to their corresponding operation objects
let INSTR_MAP = new Map();
function createInstrMap() {
    for (let i = 0; i < OPS.length; i++) {
        INSTR_MAP.set(OPS[i].name, OPS[i]);
    }
}
createInstrMap();

// Map of opcodes to their corresponding operation objects
let OPCODE_MAP = new Map();
function createOpcodeMap() {
    for (let i = 0; i < OPS.length; i++) {
        OPCODE_MAP.set(OPS[i].opcode, OPS[i]);
    }
    console.log(OPCODE_MAP);
}
createOpcodeMap();

// Failure flag for assembler
let ASSEMBLER_FAILED;
function assemble() {
    ASSEMBLER_FAILED = false; // Inititialized to false

    // No instructions written yet
    PROG_LENGTH = 0;
    // Set program counter to 0
    PC = 0;

    // Store source code in array, split line by line
    source = editor.getValue().split("\n"); 

    // Remove whitespace from either side of string
    for (let i = 0; i < source.length; i++) {
        source[i] = source[i].trim();
    }

    let text_flag = true;  // If true, current line is within .text field
    let data_flag = false; // If true, current line is within .data field

    let instr;             // 32 bit translated machine instruction - eventually written to memory
    let line;              // Array for storing line of source code separated by spaces

    // Destination registers
    let rd;
    // Source operand registers
    let rs;
    let rt;
    // Immediate value
    let imm;

    // Traverse code and translate to program instructions
    for (let i = 0; i < source.length; i++) {
        if (source[i].length == 0) {
            continue; // Skip empty lines
        }
        line = source[i].split(" "); // Split line into words
        // console.log(instr[0])

        // Check for assembler directives
        switch (line[0]) {
            case ".text":
                text_flag = true;
                data_flag = false;
                continue;

            case ".data":
                text_flag = false;
                data_flag = true;
                continue;
        }

        // Process .text instructions
        if (text_flag) {

            // Check for system call
            if (line[0] === "syscall") {
                instr = "00000000000000000000000000001100" // SYSCALL instruction
                writeInstruction(instr);
            }
            // Check if valid instruction keyword
            else if (INSTR_MAP.has(line[0])) {
                let instr_obj = INSTR_MAP.get(line[0]);
                // console.log(instr_obj)

                if (line.length > instr_obj.args + 1) {
                    // Too many arguments provided - print error
                    assemblerErr(i);
                    break;
                }

                if (instr_obj.type === 'R') {
                    // Ensure proper args
                    rd = line[1] in REG_DEFS ? line[1] : assemblerErr(i);
                    rs = line[2] in REG_DEFS ? line[2] : assemblerErr(i);
                    rt = line[3] in REG_DEFS ? line[3] : assemblerErr(i);

                    instr = instr_obj.opcode + REG_DEFS[rs] + REG_DEFS[rt] + REG_DEFS[rd] + "00000" + "000000";
                    writeInstruction(instr);
                    // console.log(instr);

                    // for (let i = 0; i < 4; i++) {
                    //     let foo = MEM[i].toString(2);
                    //     console.log("0".repeat(8-foo.length) + foo);
                    // }
                }
                else if (instr_obj.type === 'I') {
                    // Ensure proper args
                    rt = line[1] in REG_DEFS ? line[1] : assemblerErr(i);
                    rs = line[2] in REG_DEFS ? line[2] : assemblerErr(i);
                    imm = !isNaN(line[3]) ? parseInt(line[3]).toString(2) : assemblerErr(i);
                    imm = "0".repeat(16-imm.length) + imm; // Extend bits to 16 width

                    instr = instr_obj.opcode + REG_DEFS[rs] + REG_DEFS[rt] + imm;
                    writeInstruction(instr);
                    console.log(instr);
                    // console.log(instr.length);
                }


            }
            else {
                // Invalid isntruction keyword - print error
                return assemblerErr(i);
            }
        }
    }

    // If assembler succeeded, enable run button
    if (!ASSEMBLER_FAILED && PROG_LENGTH > 0) {
        document.getElementById("run").disabled = false;
    }
} // End assemble()

// Run program code
function run() {
    // Set program counter to 0
    PC = 0;

    // Instruction bitstring
    let instr;
    // Instruction execution loop
    while(PC < PROG_LENGTH) {
        // Fetch next instruction from memory - insure 32 bit width
        // 8 MSB's
        instr3 = MEM[PC+3].toString(2);
        instr3 = "0".repeat(8-instr3.length) + instr3; // Sign extension 8 bits wide
        // console.log(instr3);
        // Next 8
        instr2 = MEM[PC+2].toString(2);
        instr2 = "0".repeat(8-instr2.length) + instr2; // Sign extension 8 bits wide
        // console.log(instr2);
        // Next 8
        instr1 = MEM[PC+1].toString(2);
        instr1 = "0".repeat(8-instr1.length) + instr1; // Sign extension 8 bits wide
        // console.log(instr1);
        // 8 LSB's
        instr0 = MEM[PC].toString(2);
        instr0 = "0".repeat(8-instr0.length) + instr0; // Sign extension 8 bits wide
        // console.log(instr0);

        // Full instruction bitstring
        instr = instr3 + instr2 + instr1 + instr0;
        console.log(instr);


        let opcode = instr.slice(0,6);       // Get opcode of instruction
        // console.log(opcode);
        let op_obj = OPCODE_MAP.get(opcode); // Get operation object
        console.log(op_obj);
        // Check for SYSCALL instruction
        if (instr === "00000000000000000000000000001100") {
            switch (REG[2]) { // Switch on $v0
                case 1: 
                    console.log("printing");
                    console.log(REG[4]); // if $v0 == 1, print the integer stored in $a0
                    break;
            }
        }
        else if (op_obj.type === 'R') {
            // Instruction format: op rd, rs, rt
            op_obj.func(rs, rt, rd);
        }
        else if (op_obj.type === 'I') {
            // Since the binary instruction is encoded as a string, the bit order is reversed when indexing
            let rs = parseInt(instr.slice(6, 11), 2);    // Bits instr[21:25]
            // console.log(rs);
            let rt = parseInt(instr.slice(11, 16), 2);   // Bits instr[16:20]
            // console.log(rt);
            let imm = parseInt(instr.slice(16, 32), 2);  // Bits instr[0:15]
            // console.log(imm);


            // Instruction format: op rt, rs, imm
            op_obj.func(rs, rt, imm);
        }

        // Increment PC after fetching instruction
        PC += 4;
    }
} // End run()

// Write a given 32 bit instruction to memory address pointed to by the program counter
// Little Endian data storage
// 4|        | < -- PC + 4 (next instruction)
// 3|  MSBs  |
// 2|xxxxxxxx|   
// 1|xxxxxxxx|   
// 0|  LSBs  | <-- PC
function writeInstruction(instr) {
    // Keep track of total # of instructions written, each instruction is 4 bytes
    PROG_LENGTH += 4;
    // LSBs are the rightmost bits in the instruction string
    MEM[PC] = parseInt(instr.slice(24, 32), 2);
    PC++;
    MEM[PC] = parseInt(instr.slice(16, 24), 2);
    PC++;
    MEM[PC] = parseInt(instr.slice(8, 16), 2);
    PC++;
    MEM[PC] = parseInt(instr.slice(0, 8), 2);
    PC++;
}

function assemblerErr(lineNumber) {
    ASSEMBLER_FAILED = true;
    console.log("Assembler errror on line ", lineNumber + 1);
}
