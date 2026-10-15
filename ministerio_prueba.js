// SERVIDOR DE PRUEBA que imita al Ministerio de Sanidad (solo para probar en local).
// Uso:  node ministerio_prueba.js   -> escucha en http://localhost:4999/telemedicina/api/datos
//   GET  -> devuelve todo lo recibido (con algunos datos de otras áreas de ejemplo)
//   POST -> guarda la remesa recibida y la muestra por consola
var http = require("http");

var almacen = [
    { id_area: 3, fecha: "2026-10-01", datos: [{}, {}, {}, {}] },  // Cardiología: 4 reservas de ejemplo
    { id_area: 12, fecha: "2026-10-02", datos: [{}] }              // Neurología: 1 reserva de ejemplo
];

http.createServer(function (req, res) {
    var cuerpo = "";
    req.on("data", function (trozo) { cuerpo += trozo; });
    req.on("end", function () {
        if (req.method === "POST") {
            var remesa = JSON.parse(cuerpo);
            console.log("\n=== POST recibido del área " + remesa.id_area + " (" + remesa.datos.length + " reservas) ===");
            console.log(JSON.stringify(remesa, null, 2));
            almacen.push(remesa);
            res.writeHead(201, { "Content-Type": "application/json" });
            res.end(JSON.stringify("Datos introducidos"));
        } else {
            console.log("GET recibido -> devuelvo " + almacen.length + " remesas");
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify(almacen));
        }
    });
}).listen(4999, function () {
    console.log("Ministerio de PRUEBA escuchando en http://localhost:4999/telemedicina/api/datos");
});
