var editor = ace.edit("editor");
let source;


// Buffers for memory and registers
let REG = new Uint32Array(32);
let MEM = new Uint8Array(2**16);

// Register intializations
REG[0] = 0; // $zero
let PC = 0; // Program counter

// Register definitions
const REG_DEFS = {
    "$zero": 0,
    "$at": 1,
    "$v0": 2, "$v1": 3,
    "$a0": 4, "$a1": 5, "$a2": 6, "$a3": 7,
    "$t0": 8, "$t1": 9, "$t2": 10, "$t3": 11, "$t4": 12, "$t5": 13, "$t6": 14,"$t7": 15,
    "$s0": 16, "$s1": 17, "$s2": 18, "$s3": 19, "$s4": 20, "$s5": 21, "$s6": 22, "$s7": 23,
    "$t8": 24, "$t9": 25,
    "$k0": 26, "$k1": 27,
    "$gp": 28,
    "$sp": 29,
    "$fp": 30,
    "$ra": 31
};

const MAX_PROGRAM_SIZE = 4096;   // Define allocation for program instructions
const MAX_STATIC = 2**15;   // Define allocation for static data

// Define address locations
const PROGRAM_TEXT_ADDR = 0
const STATIC_ADDR = PROGRAM_TEXT_ADDR + MAX_PROGRAM_SIZE

// Takes in opcode (as binary string) and corresponding instr command (as string) and adds it to the opcode map
function addCode(opcodeStr, instr) {
    let opcode = parseInt(opcodeStr, 2);
    OPCODES[opcode] = instr;
}
// Define instruction opcodes
let OPCODES = {};
addCode("100000", "add");
addCode("001000", "addi");


function assemble() {
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
    let instr;             // 32 bit translated machine instruction
    let opcode;            // 6 bit binary opcode
    let line;              // Array for storing line of source code separated by spaces

    // Destination registers
    let rd = 0;
    // Source operand registers
    let rs = 0;
    let rt = 0;
    let imm = 0;

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
            console.log(line);
            switch (line[0]) {
                case "add":
                    opcode = Number(getKey(OPCODES, "add"));
                    rd = line[1] in REG_DEFS ? line[1] : assemblerErr(i);
                    rs = line[2] in REG_DEFS ? line[2] : assemblerErr(i);
                    rt = line[3] in REG_DEFS ? line[3] : assemblerErr(i);

                    instr = "000000" + REG_DEFS[rs].toString(2) + REG_DEFS[rt].toString(2) + REG_DEFS[rd].toString(2) + "000000" + opcode.toString(2);
                    writeInstruction(instr);

                    console.log(parseInt(instr, 2).toString(16).toUpperCase());

                    break;
                case "addi":
                    opcode = getKey(OPCODES, "addi");
                    rd = line[1] in REG_DEFS ? line[1] : assemblerErr(i);
                    rs = line[2] in REG_DEFS ? line[2] : assemblerErr(i);
                    imm = !isNaN(line[3]) ? line[3] : assemblerErr(i);
                    console.log(rd, rs, imm);
                    
                    break;
            }
        }
    }

} // End assemble()

// Write a given 32 bit instruction to memory address pointed to by the program counter
function writeInstruction(instr) {
    MEM[PC] = parseInt(instr.slice(0, 7), 2);
    PC++;
    MEM[PC] = parseInt(instr.slice(8, 15), 2);
    PC++;
    MEM[PC] = parseInt(instr.slice(16, 23));
    PC++;
    MEM[PC] = parseInt(instr.slice(24, 31));
    PC++;
}

function getKey(object, value) {
    return Object.keys(object).find(key => object[key] === value);
}

function assemblerErr(lineNumber) {
    console.log("Assembler errror on line ", lineNumber + 1);
}
