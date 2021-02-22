var editor = ace.edit("editor");
let source;

function assemble() {
    // Store source code in array, split line by line
    source = editor.getValue().split("\n"); 
    // Remove whitespace from either side of string
    for (let i = 0; i < source.length; i++) {
        source[i] = source[i].trim();
    }
    console.log(source);
}