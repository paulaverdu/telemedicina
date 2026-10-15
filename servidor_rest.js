var conexion = require("./conexion_mysql.js");
var express = require("express");
var jwt = require("jwt-simple");
var http = require("http");
var https = require("https");
var app = express();

// Clave para codificar / decodificar el token (en la nube se define con la variable de entorno JWT_SECRET)
var clave = process.env.JWT_SECRET || "telemedicinaSecretoGestor2026";

// PRÁCTICA 3 - Parte 1: servicio REST del Ministerio de Sanidad y nuestro código de área (Endocrinología = 7)
var URL_MINISTERIO = process.env.MINISTERIO_URL || "https://undefined.ua.es/telemedicina/api/datos";
var ID_AREA = 7;

app.use("/gestor", express.static(__dirname + "/cliente_rest"));
app.use("/sanitario", express.static(__dirname + "/cliente_rpc"));
app.use(express.json());

app.get("/", function (req, res) {
    res.redirect("/gestor");
});

// ================================================================================================
// SERVICIOS PÚBLICOS (no necesitan token): login y registro de gestores
// ================================================================================================

// POST /api/gestores/login -> valida credenciales y devuelve el token
app.post("/api/gestores/login", function (req, res) {
    var sql = "SELECT * FROM gestores WHERE usuario = ?";
    conexion.query(sql, [req.body.usuario], function (err, resultados) {
        if (err) return res.status(500).json("Error en la consulta");
        if (resultados.length === 0) {
            return res.status(403).json({ error: "No existe este usuario." });
        }
        var gestor = resultados[0];
        if (gestor.password !== req.body.password) {
            return res.status(403).json({ error: "Credenciales inválidas" });
        }
        // Crear el token
        var contenido = {
            usuario: gestor.id,
            expira: Date.now() + 60 * 60 * 1000 // expira dentro de 1 hora (en ms)
        };
        var token = jwt.encode(contenido, clave);
        res.status(200).json({ token: token, id: gestor.id });
    });
});

// POST /api/gestores -> registro de un nuevo gestor
app.post("/api/gestores", function (req, res) {
    if (!req.body.nombre || !req.body.apellidos || !req.body.usuario || !req.body.password) {
        return res.status(400).json("Faltan datos");
    }
    conexion.query("SELECT * FROM gestores WHERE usuario = ?", [req.body.usuario], function (err, resultados) {
        if (err) return res.status(500).json("Error en la consulta");
        if (resultados.length > 0) {
            return res.status(404).json("Usuario no valido");
        }
        var sqlInsert = "INSERT INTO gestores (nombre, apellidos, usuario, password) VALUES (?, ?, ?, ?)";
        conexion.query(sqlInsert, [req.body.nombre, req.body.apellidos, req.body.usuario, req.body.password], function (errInsert) {
            if (errInsert) return res.status(500).json("Error al crear el gestor");
            res.status(201).json("Gestor creado");
        });
    });
});

// ================================================================================================
// Middleware JWT: a partir de aquí todos los servicios /api son privados (necesitan token)
// El token se pasa en la URL: /api/RUTA?token=XXXXXXXX
// ================================================================================================
app.use("/api", function (req, res, next) {
    var token = req.query.token;
    if (!token) {
        return res.status(401).json("No se ha encontrado token");
    }

    var contenidoToken;
    try { // capturamos el error por si el token no es correcto
        contenidoToken = jwt.decode(token, clave);
    } catch (error) {
        return res.status(401).json("El token es incorrecto");
    }

    if (!contenidoToken || !contenidoToken.expira || !contenidoToken.usuario) {
        return res.status(401).json("El formato del token no es adecuado");
    }

    if (contenidoToken.expira < Date.now()) {
        return res.status(401).json("El token ha expirado");
    }

    req.idGestor = contenidoToken.usuario; // gestor que hace la petición
    next();
});

// GET /api/ubicaciones
app.get("/api/ubicaciones", function (req, res) {
    conexion.query("SELECT * FROM ubicaciones", function (err, resultados) {
        if (err) return res.status(500).json("Error en la consulta");
        res.status(200).json(resultados);
    });
});

// GET /api/categorias
app.get("/api/categorias", function (req, res) {
    conexion.query("SELECT * FROM categorias", function (err, resultados) {
        if (err) return res.status(500).json("Error en la consulta");
        res.status(200).json(resultados);
    });
});

// GET /api/modelos
app.get("/api/modelos", function (req, res) {
    conexion.query("SELECT * FROM modelos", function (err, resultados) {
        if (err) return res.status(500).json("Error en la consulta");
        res.status(200).json(resultados);
    });
});

// GET /api/gestores/:id
app.get("/api/gestores/:id", function (req, res) {
    var sql = "SELECT id, nombre, apellidos, usuario FROM gestores WHERE id = ?";
    conexion.query(sql, [req.params.id], function (err, resultados) {
        if (err) return res.status(500).json("Error en la consulta");
        if (resultados.length > 0) {
            res.status(200).json(resultados[0]);
        } else {
            res.status(404).json("No encontrado el usuario gestor.");
        }
    });
});

// GET /api/sanitarios/:id
app.get("/api/sanitarios/:id", function (req, res) {
    var sql = "SELECT id, nombre, apellidos, usuario FROM sanitarios WHERE id = ?";
    conexion.query(sql, [req.params.id], function (err, resultados) {
        if (err) return res.status(500).json("Error en la consulta");
        if (resultados.length > 0) {
            res.status(200).json(resultados[0]);
        } else {
            res.status(404).json("No encontrado el usuario sanitario.");
        }
    });
});

// GET /api/recursos/:id
app.get("/api/recursos/:id", function (req, res) {
    conexion.query("SELECT * FROM recursos WHERE id = ?", [req.params.id], function (err, resultados) {
        if (err) return res.status(500).json("Error en la consulta");
        if (resultados.length > 0) {
            res.status(200).json(resultados[0]);
        } else {
            res.status(404).json("No se ha encontrado el recurso.");
        }
    });
});

// GET /api/recursos/:id/reservas
// Además del nombre completo se devuelven nombre y apellidos por separado (necesarios para el Ministerio)
app.get("/api/recursos/:id/reservas", function (req, res) {
    var sql = "SELECT r.id, CONCAT(s.nombre, ' ', s.apellidos) AS sanitario, s.nombre AS nombre_sanitario, " +
        "s.apellidos AS apellidos_sanitario, r.horas_estimadas, r.fecha_peticion, r.fecha_inicio, r.fecha_fin " +
        "FROM reservas r JOIN sanitarios s ON r.sanitario = s.id " +
        "WHERE r.recurso = ? ORDER BY r.fecha_peticion";
    conexion.query(sql, [req.params.id], function (err, resultados) {
        if (err) return res.status(500).json("Error en la consulta");
        res.status(200).json(resultados);
    });
});

// GET /api/recursos/:id/resenyas
app.get("/api/recursos/:id/resenyas", function (req, res) {
    var sql = "SELECT r.fecha, CONCAT(s.nombre, ' ', s.apellidos) AS sanitario, r.valor, r.descripcion " +
        "FROM resenyas r JOIN sanitarios s ON r.sanitario = s.id " +
        "WHERE r.recurso = ?";
    conexion.query(sql, [req.params.id], function (err, resultados) {
        if (err) return res.status(500).json("Error en la consulta");
        res.status(200).json(resultados);
    });
});

// GET /api/recursos (Filtrado)
app.get("/api/recursos", function (req, res) {
    var categoria = req.query.categoria;
    var modelo = req.query.modelo;
    var ubicacion = req.query.ubicacion;
    var estado = req.query.estado;

    var sql = "SELECT r.* FROM recursos r JOIN modelos m ON r.modelo = m.id WHERE 1=1";
    var params = [];

    if (ubicacion && ubicacion !== "Todos") { sql += " AND r.ubicacion = ?"; params.push(ubicacion); }
    if (estado && estado !== "Todos") { sql += " AND r.estado = ?"; params.push(estado); }
    if (modelo && modelo !== "Todos") { sql += " AND r.modelo = ?"; params.push(modelo); }
    if (categoria && categoria !== "Todos") { sql += " AND m.categoria = ?"; params.push(categoria); }
    sql += " ORDER BY r.id";

    conexion.query(sql, params, function (err, resultados) {
        if (err) return res.status(500).json("Error en la consulta");
        res.status(200).json(resultados);
    });
});

// POST /api/recursos
app.post("/api/recursos", function (req, res) {
    var estado = req.body.estado;
    if (estado != 0 && estado != 1 && estado != 2) {
        return res.status(400).json("Estado inválido");
    }
    var sql = "INSERT INTO recursos (modelo, ubicacion, numero_serie, estado) VALUES (?, ?, ?, ?)";
    conexion.query(sql, [req.body.modelo, req.body.ubicacion, req.body.numero_serie, estado], function (err) {
        if (err) return res.status(500).json("Error al crear recurso");
        res.status(201).json("Recurso creado");
    });
});

// DELETE /api/recursos/:id
app.delete("/api/recursos/:id", function (req, res) {
    conexion.query("DELETE FROM recursos WHERE id = ?", [req.params.id], function (err, resultado) {
        if (err) return res.status(500).json("Error al eliminar recurso");
        if (resultado.affectedRows > 0) {
            res.status(200).json("El recurso con identificador: " + req.params.id + " ha sido eliminado");
        } else {
            res.status(404).json("No se ha encontrado el recurso con id: " + req.params.id);
        }
    });
});

// PUT /api/gestores/:id
app.put("/api/gestores/:id", function (req, res) {
    var id_gestor = req.params.id;
    // Un gestor solo puede modificar sus propios datos (el id viene dentro del token)
    if (String(id_gestor) !== String(req.idGestor)) {
        return res.status(403).json({ error: "No puede modificar los datos de otro gestor" });
    }
    var sqlCheck = "SELECT * FROM gestores WHERE usuario = ? AND id != ?";
    conexion.query(sqlCheck, [req.body.usuario, id_gestor], function (err, resultados) {
        if (err) return res.status(500).json("Error en la consulta");
        if (resultados.length > 0) {
            return res.status(400).json({ error: "Usuario ya existe" });
        }
        var sqlUpdate = "UPDATE gestores SET nombre = ?, apellidos = ?, usuario = ?, password = ? WHERE id = ?";
        conexion.query(sqlUpdate, [req.body.nombre, req.body.apellidos, req.body.usuario, req.body.password, id_gestor], function (errUpdate) {
            if (errUpdate) return res.status(500).json("Error al actualizar");
            res.status(201).json("Se han actualizado los datos.");
        });
    });
});

// PUT /api/recursos/:id
app.put("/api/recursos/:id", function (req, res) {
    var id_recurso = req.params.id;
    var sqlCheck = "SELECT * FROM recursos WHERE numero_serie = ? AND id != ?";
    conexion.query(sqlCheck, [req.body.numero_serie, id_recurso], function (err, resultados) {
        if (err) return res.status(500).json("Error en la consulta");
        if (resultados.length > 0) {
            return res.status(400).json({ error: "Número de serie ya existe." });
        }
        var sqlUpdate = "UPDATE recursos SET numero_serie = ?, modelo = ?, ubicacion = ?, estado = ? WHERE id = ?";
        conexion.query(sqlUpdate, [req.body.numero_serie, req.body.modelo, req.body.ubicacion, req.body.estado, id_recurso], function (errUpdate) {
            if (errUpdate) return res.status(500).json("Error al actualizar");
            res.status(201).json("Se han actualizado los datos.");
        });
    });
});


// EJERCICIO 2: POST /api/area_salud
app.post("/api/area_salud", function (req, res) {
    var sql = "INSERT INTO area_salud (cp, nombre, gestor) VALUES (?, ?, ?)";
    conexion.query(sql, [req.body.codigo_postal, req.body.nombre, req.idGestor], function (err) {
        if (err) return res.status(500).json("Error al crear el área de salud");
        res.status(201).json("Área de salud creada");
    });
});


// ================================================================================================
// PRÁCTICA 3 - Parte 1: integración con el servidor del Ministerio de Sanidad
// El cliente del gestor obtiene las reservas con varios GET, las valida y nos manda la remesa.
// Nuestro servidor la reenvía al Ministerio (así el navegador no tiene problemas de CORS).
// ================================================================================================

// POST /api/ministerio/datos -> body: { datos: [ {nombre, apellidos, categoría, horas_estimadas, fec_pet, fec_ini, fecha_fin}, ... ] }
app.post("/api/ministerio/datos", async function (req, res) {
    var datos = req.body.datos;
    if (!Array.isArray(datos) || datos.length === 0) {
        return res.status(400).json("No hay reservas válidas que enviar");
    }

    var hoy = new Date();
    var remesa = {
        id_area: ID_AREA,
        fecha: hoy.getFullYear() + "-" + String(hoy.getMonth() + 1).padStart(2, "0") + "-" + String(hoy.getDate()).padStart(2, "0"),
        datos: datos
    };

    try {
        var respuesta = await peticionMinisterio("POST", JSON.stringify(remesa));
        var correcto = respuesta.status >= 200 && respuesta.status < 300;
        console.log("Remesa enviada al Ministerio (" + datos.length + " reservas). Respuesta:", respuesta.status, respuesta.texto);
        res.status(correcto ? 200 : 502).json({
            enviadas: datos.length,
            estadoMinisterio: respuesta.status,
            respuestaMinisterio: respuesta.texto
        });
    } catch (error) {
        console.error("Error conectando con el Ministerio:", error.message);
        res.status(502).json("No se ha podido conectar con el servidor del Ministerio");
    }
});

// GET /api/ministerio/datos -> devuelve todo el contenido de la BD del Ministerio (para el ranking por área)
app.get("/api/ministerio/datos", async function (req, res) {
    try {
        var respuesta = await peticionMinisterio("GET");
        if (respuesta.status < 200 || respuesta.status >= 300) {
            return res.status(502).json("El Ministerio ha respondido con error " + respuesta.status);
        }
        res.status(200).json(JSON.parse(respuesta.texto));
    } catch (error) {
        console.error("Error conectando con el Ministerio:", error.message);
        res.status(502).json("No se ha podido conectar con el servidor del Ministerio");
    }
});

// Petición HTTP(S) al servidor del Ministerio. Devuelve una promesa con { status, texto }.
// El servidor undefined.ua.es no envía el certificado intermedio (GEANT TLS RSA 1): los navegadores lo
// completan solos, pero Node falla con UNABLE_TO_VERIFY_LEAF_SIGNATURE. Por eso, SOLO para esta
// conexión, no se verifica la cadena del certificado (rejectUnauthorized: false).
function peticionMinisterio(metodo, cuerpo) {
    return new Promise(function (resolve, reject) {
        var url = new URL(URL_MINISTERIO);
        var modulo = url.protocol === "https:" ? https : http;
        var opciones = { method: metodo, headers: {}, rejectUnauthorized: false };
        if (cuerpo) {
            opciones.headers["Content-Type"] = "application/json";
            opciones.headers["Content-Length"] = Buffer.byteLength(cuerpo);
        }
        var peticion = modulo.request(url, opciones, function (respuesta) {
            var texto = "";
            respuesta.setEncoding("utf8");
            respuesta.on("data", function (trozo) { texto += trozo; });
            respuesta.on("end", function () { resolve({ status: respuesta.statusCode, texto: texto }); });
        });
        peticion.on("error", reject);
        peticion.setTimeout(15000, function () { peticion.destroy(new Error("Tiempo de espera agotado")); });
        if (cuerpo) peticion.write(cuerpo);
        peticion.end();
    });
}


var puerto = process.env.PORT || 3000; // Render indica el puerto con la variable PORT
var servidorHttp = app.listen(puerto, function () {
    console.log("Servidor REST escuchando en http://localhost:" + puerto);
});

// Si se lanza este fichero directamente (npm start / despliegue en Render), los avisos por WebSocket
// van por el mismo puerto que la web, porque Render solo expone un puerto.
// En local con servidor.js (npm run local) el WebSocket sigue en el puerto 4444.
if (require.main === module) {
    require("./servidor_ws.js")(servidorHttp);
}
