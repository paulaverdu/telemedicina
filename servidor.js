require("./servidor_rest.js")
require("./servidor_rpc.js")
var iniciarWSAvisos = require("./servidor_ws.js")
iniciarWSAvisos();
// Lanza automaticamente los tres servidores.