var http = require("http");
var conexionBD = require("./conexion_mysql.js");
var WebSocketServer = require("websocket").server;

var clientes = [];

// Si se pasa un servidor HTTP (despliegue en Render) el WebSocket se monta sobre él;
// si no, se crea uno propio en el puerto 4444 (funcionamiento en local).
function iniciarWSAvisos(httpServer) {
    if (!httpServer) {
        httpServer = http.createServer();
        var puerto = 4444;
        httpServer.listen(puerto, function () {
            console.log("Servidor de WebSocket iniciado en puerto:", puerto);
        });
    }

    var wsServer = new WebSocketServer({
        httpServer: httpServer
    });

    wsServer.on("request", function(request) {
        var connection = request.accept("avisos", request.origin);
        var cliente = { connection: connection, tipo: null, id: null, nombre: null };
        clientes.push(cliente);

        connection.on("message", function(message) {
            if (message.type !== "utf8") return;
            var msg = JSON.parse(message.utf8Data);

            switch (msg.operacion) {

                case "identificar":
                    cliente.tipo = msg.tipo;
                    cliente.id = msg.id;
                    cliente.nombre = msg.nombre;
                    break;

                case "avisoReserva":
                    conexionBD.query(
                        "SELECT sanitario FROM reservas WHERE recurso = " + msg.idRecurso + " AND fecha_fin IS NULL",
                        function (err, resultados) {
                            if (err) return;
                            var afectados = resultados.map(r => r.sanitario);

                            var aviso = {
                                operacion: "aviso",
                                color: "rojo",
                                fecha: new Date().toLocaleString(),
                                origen: msg.quien,
                                texto: "SE HA " + msg.accion + " LA RESERVA DEL " +
                                    msg.nombreCategoria.toUpperCase() + " MODELO " +
                                    msg.nombreModelo.toUpperCase() + " CON CÓDIGO " + msg.codigoRecurso
                            };

                            for (var i = 0; i < clientes.length; i++) {
                                if (clientes[i].tipo === "sanitario") {
                                    for (var k = 0; k < afectados.length; k++) {
                                        if (String(afectados[k]) === String(clientes[i].id)) {
                                            clientes[i].connection.sendUTF(JSON.stringify(aviso));
                                            break;
                                        }
                                    }
                                }
                            }
                        }
                    );
                    break;

                case "avisoNuevoRecurso":
                    var aviso = {
                        operacion: "aviso",
                        color: "azul",
                        fecha: new Date().toLocaleString(),
                        origen: msg.quien,
                        texto: "SE HA CREADO UN NUEVO RECURSO " +
                            msg.nombreCategoria.toUpperCase() + " MODELO " +
                            msg.nombreModelo.toUpperCase() + " CON CÓDIGO " + msg.codigoRecurso
                    };
                    for (var i = 0; i < clientes.length; i++) {
                        if (clientes[i].tipo === "sanitario") {
                            clientes[i].connection.sendUTF(JSON.stringify(aviso));
                        }
                    }
                    break;

                case "avisoResenya":
                    var aviso = {
                        operacion: "aviso",
                        color: "verde",
                        fecha: new Date().toLocaleString(),
                        origen: msg.quien,
                        texto: "SE HA CREADO UNA RESEÑA PARA EL " +
                            msg.nombreCategoria.toUpperCase() + " MODELO " +
                            msg.nombreModelo.toUpperCase() + " CON CÓDIGO " +
                            msg.codigoRecurso + " Y PUNTUACIÓN " + msg.puntuacion
                    };
                    for (var i = 0; i < clientes.length; i++) {
                        if (clientes[i].tipo === "gestor") {
                            clientes[i].connection.sendUTF(JSON.stringify(aviso));
                        }
                    }
                    if (msg.puntuacion <= 2) {
                        var aviso2 = {
                            operacion: "aviso",
                            color: "orange",
                            fecha: new Date().toLocaleString(),
                            origen: msg.quien,
                            texto: "Se ha evaluado con mala puntuación el dispositivo con categoria " +
                                msg.nombreCategoria + ", modelo " + msg.nombreModelo + " y con codigo " + msg.codigoRecurso
                        };
                        for (var j = 0; j < clientes.length; j++) {
                            if (clientes[j].tipo === "sanitario") {
                                clientes[j].connection.sendUTF(JSON.stringify(aviso2));
                            }
                        }
                    }
                    break;

                case "avisoDevolucion":
                    for (var i = 0; i < clientes.length; i++) {
                        if (clientes[i].tipo === "sanitario") {
                            (function (sanitario_aux) {
                                var id_sanitario = sanitario_aux.id;
                                var sql = "SELECT COUNT(*) AS total FROM reservas WHERE sanitario = " + id_sanitario +
                                          " AND fecha_inicio IS NOT NULL AND fecha_fin IS NULL";
                                conexionBD.query(sql, function (err, resultados) {
                                    if (err) return;
                                    var numero = resultados[0].total;
                                    if (numero > 0) {
                                        var aviso = {
                                            operacion: "aviso",
                                            color: "pink",
                                            fecha: new Date().toLocaleString(),
                                            origen: msg.quien,
                                            texto: "Le recordamos que tiene " + numero + " recurso(s) por devolver. Intente ser puntual."
                                        };
                                        sanitario_aux.connection.sendUTF(JSON.stringify(aviso));
                                    }
                                });
                            })(clientes[i]);
                        }
                    }
                    break;
            }
        });

        connection.on("close", function() {
            for (var i = 0; i < clientes.length; i++) {
                if (clientes[i].connection === connection) {
                    clientes.splice(i, 1);
                    break;
                }
            }
        });
    });

    console.log("Servidor WebSocket de avisos iniciado");
}

module.exports = iniciarWSAvisos;