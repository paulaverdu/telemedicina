var rpc = require("./rpc.js");
var conexionBD = require("./conexion_mysql.js");

rpc.debug = true;
var servidor = rpc.server(3501, function () {
    console.log("Servidor RPC escuchando en http://localhost:3501");
});

function obtenerCategorias(callback) {
    conexionBD.query("SELECT * FROM categorias", function (err, resultados) {
        if (err) return callback(null);
        callback(resultados);
    });
}

function obtenerModelos(callback) {
    conexionBD.query("SELECT * FROM modelos", function (err, resultados) {
        if (err) return callback(null);
        callback(resultados);
    });
}

function loginSanitario(usuario, password, callback) {
    if (!usuario || !password) return callback(null);
    conexionBD.query("SELECT id FROM sanitarios WHERE usuario = '" + usuario + "' AND password = '" + password + "'", function (err, resultados) {
        if (err || resultados.length === 0) return callback(null);
        callback(resultados[0].id);
    });
}

function crearSanitario(datosSanitario, callback) {
    if (!datosSanitario.nombre || !datosSanitario.apellidos || !datosSanitario.usuario || !datosSanitario.password) {
        return callback(null);
    }
    conexionBD.query("SELECT id FROM sanitarios WHERE usuario = '" + datosSanitario.usuario + "'", function (err, resultados) {
        if (err || resultados.length > 0) return callback(null);
        var sql = "INSERT INTO sanitarios (nombre, apellidos, usuario, password) VALUES ('" +
                  datosSanitario.nombre + "', '" + datosSanitario.apellidos + "', '" + datosSanitario.usuario + "', '" + datosSanitario.password + "')";
        conexionBD.query(sql, function (errInsert, resInsert) {
            if (errInsert) return callback(null);
            callback(resInsert.insertId);
        });
    });
}

function obtenerReservas(idSanitario, callback) {
    conexionBD.query("SELECT * FROM reservas WHERE sanitario = " + idSanitario, function (err, resultados) {
        if (err) return callback([]);
        callback(resultados);
    });
}

function obtenerResenyas(idRecurso, callback) {
    conexionBD.query("SELECT * FROM resenyas WHERE recurso = " + idRecurso, function (err, resultados) {
        if (err) return callback([]);
        callback(resultados);
    });
}

function crearResenya(idRecurso, idSanitario, valoracion, descripcion, callback) {
    if (valoracion < 1 || valoracion > 5) return callback(null);
    var fecha = new Date().toISOString().slice(0, 19).replace('T', ' ');
    var sql = "INSERT INTO resenyas (recurso, sanitario, fecha, valor, descripcion) VALUES (" +
              idRecurso + ", " + idSanitario + ", '" + fecha + "', " + valoracion + ", '" + descripcion + "')";
    conexionBD.query(sql, function (err, resultado) {
        if (err) return callback(null);
        callback(resultado.insertId);
    });
}

function actualizarSanitario(idSanitario, datosSanitario, callback) {
    conexionBD.query("SELECT id FROM sanitarios WHERE usuario = '" + datosSanitario.usuario + "' AND id != " + idSanitario, function (err, resultados) {
        if (err || resultados.length > 0) return callback("Usuario repetido u otro problema");
        var sql = "UPDATE sanitarios SET nombre = '" + datosSanitario.nombre + "', apellidos = '" + datosSanitario.apellidos +
                  "', usuario = '" + datosSanitario.usuario + "', password = '" + datosSanitario.password + "' WHERE id = " + idSanitario;
        conexionBD.query(sql, function (errUpdate) {
            if (errUpdate) return callback("Sanitario no encontrado");
            callback("Sanitario actualizado");
        });
    });
}

function obtenerSanitario(idSanitario, callback) {
    conexionBD.query("SELECT id, nombre, apellidos, usuario FROM sanitarios WHERE id = " + idSanitario, function (err, resultados) {
        if (err || resultados.length === 0) return callback(null);
        callback(resultados[0]);
    });
}

function obtenerRecursos(idModelo, callback) {
    conexionBD.query("SELECT * FROM recursos WHERE modelo = " + idModelo + " AND estado = 0", function (err, resultados) {
        if (err || resultados.length === 0) return callback(null);
        callback(resultados);
    });
}

function cancelarReserva(idReserva, callback) {
    conexionBD.query("DELETE FROM reservas WHERE id = " + idReserva, function (err, resultado) {
        if (err || resultado.affectedRows === 0) return callback(null);
        callback("Reserva eliminada");
    });
}

function iniciarReserva(idReserva, callback) {
    var fecha = new Date().toISOString().slice(0, 19).replace('T', ' ');
    conexionBD.query("SELECT * FROM reservas WHERE id = " + idReserva, function (err, resultados) {
        if (err || resultados.length === 0 || resultados[0].fecha_inicio !== null) {
            return callback("Reserva no encontrada.");
        }
        conexionBD.query("UPDATE reservas SET fecha_inicio = '" + fecha + "' WHERE id = " + idReserva, function (errUp) {
            if (errUp) return callback("Reserva no encontrada.");
            callback("Reserva iniciada.");
        });
    });
}

function finalizarReserva(idReserva, callback) {
    var fecha = new Date().toISOString().slice(0, 19).replace('T', ' ');
    conexionBD.query("SELECT * FROM reservas WHERE id = " + idReserva, function (err, resultados) {
        if (err || resultados.length === 0) return callback("No se ha encontrado la reserva.");
        if (resultados[0].fecha_fin !== null) return callback("La reserva ya está finalizada");

        conexionBD.query("UPDATE reservas SET fecha_fin = '" + fecha + "' WHERE id = " + idReserva, function (errUp) {
            if (errUp) return callback("No se ha encontrado la reserva.");
            callback("Se ha finalizado la reserva con id: " + idReserva);
        });
    });
}

function reservarRecurso(idRecurso, idSanitario, horas, callback) {
    conexionBD.query("SELECT r.*, m.horas_maximas FROM recursos r JOIN modelos m ON r.modelo = m.id WHERE r.id = " + idRecurso, function (err, resultados) {
        if (err || resultados.length === 0) return callback("Recurso no encontrado.");
        var recurso = resultados[0];
        if (horas > recurso.horas_maximas) return callback("Has sobrepasado las horas máximas del modelo.");
        if (recurso.estado !== 0) return callback(null);

        var fecha = new Date().toISOString().slice(0, 19).replace('T', ' ');
        var sql = "INSERT INTO reservas (recurso, sanitario, horas_estimadas, fecha_peticion, fecha_inicio, fecha_fin) VALUES (" +
                  idRecurso + ", " + idSanitario + ", " + horas + ", '" + fecha + "', NULL, NULL)";
        conexionBD.query(sql, function (errIns, resIns) {
            if (errIns) return callback(null);
            callback(resIns.insertId);
        });
    });
}

function tiempoPendiente(idRecurso, idReserva, callback) {
    conexionBD.query("SELECT * FROM reservas WHERE recurso = " + idRecurso + " ORDER BY fecha_peticion ASC", function (err, reservas_recurso) {
        if (err || reservas_recurso.length === 0) return callback(0);

        var ahora = new Date();
        var tiempoAcumulado = 0;

        for (var i = 0; i < reservas_recurso.length; i++) {
            var reserva = reservas_recurso[i];

            if (reserva.id == idReserva) {
                return callback(Math.round(tiempoAcumulado * 100) / 100);
            }

            if (reserva.fecha_inicio != null && reserva.fecha_fin == null) {
                var horasTranscurridas = (ahora - new Date(reserva.fecha_inicio)) / (1000 * 60 * 60);
                var tiempoRestante = reserva.horas_estimadas - horasTranscurridas;
                if (tiempoRestante > 0) tiempoAcumulado += tiempoRestante;
            } else if (reserva.fecha_inicio == null) {
                tiempoAcumulado += reserva.horas_estimadas;
            }
        }
        callback(Math.round(tiempoAcumulado * 100) / 100);
    });
}

function obtenerRecurso(idRecurso, callback) {
    conexionBD.query("SELECT * FROM recursos WHERE id = " + idRecurso, function (err, resultados) {
        if (err || resultados.length === 0) return callback(null);
        callback(resultados[0]);
    });
}

function obtenerUbicaciones(callback) {
    conexionBD.query("SELECT * FROM ubicaciones", function (err, resultados) {
        if (err) return callback([]);
        callback(resultados);
    });
}

var app = servidor.createApp("gestion_sanitarios");

app.registerAsync(cancelarReserva);
app.registerAsync(obtenerCategorias);
app.registerAsync(obtenerModelos);
app.registerAsync(loginSanitario);
app.registerAsync(crearSanitario);
app.registerAsync(obtenerReservas);
app.registerAsync(obtenerResenyas);
app.registerAsync(crearResenya);
app.registerAsync(actualizarSanitario);
app.registerAsync(obtenerSanitario);
app.registerAsync(obtenerRecursos);
app.registerAsync(finalizarReserva);
app.registerAsync(iniciarReserva);
app.registerAsync(reservarRecurso);
app.registerAsync(tiempoPendiente);
app.registerAsync(obtenerRecurso);
app.registerAsync(obtenerUbicaciones);