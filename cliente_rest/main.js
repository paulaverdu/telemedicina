console.log("main cargado");

const ubi_select = document.getElementById('ubicacion');
const mod_select = document.getElementById('modelo');
const est_select = document.getElementById('estado');
const cat_select = document.getElementById('categoria');

const ubi_select2 = document.getElementById('ubicacion_rec');
const mod_select2 = document.getElementById('modelo_rec');
const est_select2 = document.getElementById('estado_rec');
const cat_select2 = document.getElementById('categoria_rec');

const renyas_tabla = document.getElementById("lista_resenyas");
const reservas_tabla = document.getElementById("lista_reservas");

var recurso_actual_id = null;
// ws.js - cliente gestor
var conexionWS = null;
var nombre_gestor_ws = null;
var id_gestor_ws = null;

function conectarWS(id, nombre) {
    id_gestor_ws = id;
    nombre_gestor_ws = nombre;

    // En local el WebSocket está en el puerto 4444; en la nube (Render) va por el mismo puerto que la web
    var urlWS;
    if (location.hostname === "localhost" || location.hostname === "127.0.0.1") {
        urlWS = "ws://localhost:4444";
    } else {
        urlWS = (location.protocol === "https:" ? "wss://" : "ws://") + location.host;
    }
    conexionWS = new WebSocket(urlWS, "avisos");

    conexionWS.addEventListener("open", function () {
        console.log("Ya estoy conectado con el servidor");
        conexionWS.send(JSON.stringify({
            operacion: "identificar",
            tipo: "gestor",
            id: id,
            nombre: nombre
        }));
    });

    conexionWS.addEventListener("message", function (msg) {
        var datos = JSON.parse(msg.data);
        if (datos.operacion === "aviso") {
            anyadirAviso(datos);
        }
    });
}

function desconectarWS() {
    if (conexionWS) {
        conexionWS.close();
        conexionWS = null;
    }
}

function anyadirAviso(datos) {
    var tabla = document.getElementById("lista_avisos");
    var fila = document.createElement("tr");

    if (datos.color === "verde") fila.style.backgroundColor = "#90ee90";
    else if (datos.color === "rojo") fila.style.backgroundColor = "#ff9999";
    else if (datos.color === "azul") fila.style.backgroundColor = "#9999ff";

    var tdFecha = document.createElement("td");
    tdFecha.textContent = datos.fecha;
    var tdOrigen = document.createElement("td");
    tdOrigen.textContent = datos.origen;
    var tdTexto = document.createElement("td");
    tdTexto.textContent = datos.texto;

    fila.appendChild(tdFecha);
    fila.appendChild(tdOrigen);
    fila.appendChild(tdTexto);
    tabla.appendChild(fila);
}

function wsAvisoNuevoRecurso(nombreCategoria, nombreModelo, codigoRecurso) {
    if (!conexionWS) return;
    conexionWS.send(JSON.stringify({
        operacion: "avisoNuevoRecurso",
        nombreCategoria: nombreCategoria,
        nombreModelo: nombreModelo,
        codigoRecurso: codigoRecurso,
        quien: nombre_gestor_ws
    }));
}
function wsAvisoDevolucion() {
    if (!conexionWS) return;
    conexionWS.send(JSON.stringify({
        operacion: "avisoDevolucion",
        quien: nombre_gestor_ws
    }))
}
document.addEventListener("DOMContentLoaded", function () {

    // Las categorías, modelos y ubicaciones se cargan tras el login (los servicios necesitan el token)
    cargarEstados();

    // Si el token caduca o no es válido, se vuelve al login
    rest.alNoAutorizado = function (respuesta) {
        alert("Sesión no válida: " + respuesta + ". Vuelva a iniciar sesión.");
        salir();
    };

    cat_select.addEventListener("change", function () {
        actualizarModelos();
    });
    cat_select2.addEventListener("change", function () {
        actualizarModelos();
    });
});

function anyadir() {
    recurso_actual_id = null;
    cambiarSeccion("recurso");

    document.getElementById("num_serie_rec").value = "";
    document.getElementById("modelo_rec").selectedIndex = 0;
    document.getElementById("categoria_rec").selectedIndex = 0;
    document.getElementById("ubicacion_rec").selectedIndex = 0;
    document.getElementById("estado_rec").selectedIndex = 0;
    document.getElementById("lista_reservas").innerHTML = "";
    document.getElementById("lista_resenyas").innerHTML = "";

    inicializarSelectsRecurso();
}
function inicializarSelectsRecurso() {
    cat_select2.innerHTML = '<option value="">Seleccione categoría</option>';
    categorias_lista.forEach(c => {
        const opt = document.createElement("option");
        opt.value = c.id;
        opt.textContent = c.nombre;
        cat_select2.appendChild(opt);
    });

    ubi_select2.innerHTML = '<option value="">Seleccione ubicación</option>';
    ubis_lista.forEach(u => {
        const opt = document.createElement("option");
        opt.value = u.id;
        opt.textContent = u.nombre;
        ubi_select2.appendChild(opt);
    });

    const estados = [
        { id: 0, nombre: "Operativo" },
        { id: 1, nombre: "De baja/defectuoso" },
        { id: 2, nombre: "En mantenimiento" },
    ];

    est_select2.innerHTML = '<option value="">Seleccione estado</option>';
    estados.forEach(e => {
        const option = document.createElement("option");
        option.value = e.id;
        option.textContent = e.nombre;
        est_select2.appendChild(option);
    });

    mod_select2.innerHTML = '<option value="">Primero seleccione categoría</option>';
}

function cargarCategorias() {
    rest.get("/api/categorias", function (estado, respuesta) {
        if (estado == 200) {
            categorias_lista = respuesta;
            rellenarCategorias();
        }
    });
}

function cargarModelos() {
    rest.get("/api/modelos", function (estado, respuesta) {
        if (estado == 200) {
            modelos_lista = respuesta;
        }
    });
}

function cargarUbis() {
    rest.get("/api/ubicaciones", function (estado, respuesta) {
        if (estado == 200) {
            ubis_lista = respuesta;
            rellenarUbicaciones();
        }
    });
}
function cargarEstados() {

    const estados = [
        { id: 0, nombre: "Operativo" },
        { id: 1, nombre: "De baja/defectuoso" },
        { id: 2, nombre: "En mantenimiento" },

    ];

    est_select.innerHTML = '<option value="">Seleccione estado</option>';

    estados.forEach(e => {
        const option = document.createElement("option");
        option.value = e.id;
        option.textContent = e.nombre;
        est_select.appendChild(option);

    });
    const todos = document.createElement("option");
    todos.textContent = "Todos";
    todos.value = "Todos";
    est_select.appendChild(todos);
}

function rellenarCategorias() {
    cat_select.innerHTML = '<option value="">Seleccione categoría</option>';
    categorias_lista.forEach(c => {
        const opt = document.createElement("option");
        opt.value = c.id;
        opt.textContent = c.nombre;
        cat_select.appendChild(opt);

    });
    const todos = document.createElement("option");
    todos.textContent = "Todos";
    todos.value = "Todos";
    cat_select.appendChild(todos);
}

function rellenarUbicaciones() {
    ubi_select.innerHTML = '<option value="">Seleccione ubicación</option>';
    ubis_lista.forEach(u => {
        const opt = document.createElement("option");
        opt.value = u.id;
        opt.textContent = u.nombre;
        ubi_select.appendChild(opt);

    });
    const todos = document.createElement("option");
    todos.textContent = "Todos";
    todos.value = "Todos";
    ubi_select.appendChild(todos);
}
function actualizarModelos() {

    var categoriaSeleccionada = document.getElementById("categoria").value;
    var categoriaSeleccionada2 = document.getElementById("categoria_rec").value;
    mod_select.innerHTML = '<option value="">Seleccione modelo</option>';
    mod_select2.innerHTML = '<option value="">Seleccione modelo</option>';

    modelos_lista.forEach(m => {
        if (m.categoria == categoriaSeleccionada) {
            var opt = document.createElement("option");
            opt.value = m.id;
            opt.textContent = m.nombre;
            mod_select.appendChild(opt);
        }
    });
    modelos_lista.forEach(m => {
        if (m.categoria == categoriaSeleccionada2) {
            var opt = document.createElement("option");
            opt.value = m.id;
            opt.textContent = m.nombre;
            mod_select2.appendChild(opt);
        }
    })
    const todos = document.createElement("option");
    todos.textContent = "Todos";
    todos.value = "Todos";
    mod_select.appendChild(todos);
}

var seccionActual = "login";
var gestor_identificador = "";

var modelos_lista = [];
var ubis_lista = [];
var categorias_lista = [];
var recurso = [];

function login() {
    gestor = {
        usuario: document.getElementById("usuario").value,
        password: document.getElementById("password").value
    };

    rest.post("/api/gestores/login", gestor, function (estado, respuesta) {
        if (estado == 200) {
            // JWT: guardamos el token; rest.js lo añadirá a todas las peticiones siguientes
            rest.token = respuesta.token;
            gestor_identificador = respuesta.id;

            rest.get("/api/gestores/" + gestor_identificador, function (estado, respuesta) {
                if (estado == 200) {
                    var nombreCompleto = respuesta.nombre + " " + (respuesta.apellidos || "");
                    window.nombreGestorCompleto = nombreCompleto;

                    conectarWS(gestor_identificador, nombreCompleto);
                    cambiarSeccion("inicio");
                    cargarModelos();
                    cargarUbis();
                    cargarCategorias();
                    cargarRanking();
                    document.getElementById("nombre_gestor").textContent = nombreCompleto;
                } else {
                    window.nombreGestorCompleto = document.getElementById("usuario").value;
                    cambiarSeccion("inicio");
                    cargarModelos();
                    cargarUbis();
                    cargarCategorias();
                    document.getElementById("nombre_gestor").textContent = window.nombreGestorCompleto;
                }
            });
        } else {
            alert("Error en login: " + (respuesta.error || "Credenciales incorrectas"));
        }
    });
}

function registro() {
    var gestor = {
        nombre: document.getElementById("nombre_reg").value,
        apellidos: document.getElementById("apellidos_reg").value,
        usuario: document.getElementById("usuario_reg").value,
        password: document.getElementById("contrasenya_reg").value,
    };

    if (gestor.nombre != "" && gestor.apellidos != "" && gestor.usuario != "" && gestor.password != "") {
        if (gestor_identificador === "") {
            rest.post("/api/gestores", gestor, function (estado, respuesta) {
                console.log(respuesta)
                if (estado == 201) {
                    cambiarSeccion("login");
                } else {
                    alert("Error introduciendo nuevo gestor");
                }
            });
        } else {
            rest.get("/api/gestores/" + gestor_identificador, function (estado, respuesta) {
                if (estado == 200) {
                    var gestorActual = respuesta;
                    var usuarioCambiado = (gestorActual.usuario !== gestor.usuario);
                    var passwordCambiado = (gestorActual.password !== gestor.password);

                    rest.put("/api/gestores/" + gestor_identificador, gestor, function (estado, respuesta) {
                        if (estado == 200 || estado == 201) {
                            if (usuarioCambiado || passwordCambiado) {
                                alert("Usuario o contraseña modificados. Por favor, inicie sesión nuevamente.");
                                rest.token = null;
                                gestor_identificador = "";
                                cambiarSeccion("login");
                            } else {
                                cambiarSeccion("inicio");
                            }
                        } else {
                            alert("Error editando gestor");
                        }
                    });
                } else {
                    alert("Error obteniendo datos del gestor");
                }
            });
        }
    }
    else {
        alert("Rellene todos los campos.");
        cambiarSeccion("datos_gestor");
    }
}

function cancelar() {
    if (gestor_identificador != "") {
        cambiarSeccion("inicio")
    } else {
        cambiarSeccion("login");
    }
}

function editar() {
    cambiarSeccion("datos_gestor");
}

function buscar() {
    console.log("entro a buscar");
    var categoria = document.getElementById("categoria").value;
    var modelo = document.getElementById("modelo").value;
    var ubicacion = document.getElementById("ubicacion").value;
    var estado = document.getElementById("estado").value;

    rest.get("/api/recursos?categoria=" + categoria + "&modelo=" + modelo + "&ubicacion=" + ubicacion + "&estado=" + estado, function (estado, respuesta) {
        if (estado != 200) return; // si el servidor da error
        var recursos_mostrar = respuesta;
        var lista = document.getElementById("lista_recursos");
        lista.innerHTML = "";
        for (var i = 0; i < recursos_mostrar.length; i++) {
            var tr = document.createElement("tr");
            var td_numserie = document.createElement("td");
            td_numserie.textContent = recursos_mostrar[i].numero_serie;
            tr.appendChild(td_numserie);

            var td_modelo = document.createElement("td");
            var td_categoria = document.createElement("td");

            var modelo_id = recursos_mostrar[i].modelo;
            var modelo_obj = null;

            for (var j = 0; j < modelos_lista.length; j++) {
                if (modelos_lista[j].id == modelo_id) {
                    modelo_obj = modelos_lista[j];
                }
            }

            if (modelo_obj != null) {
                td_modelo.textContent = modelo_obj.nombre;
                for (var k = 0; k < categorias_lista.length; k++) {
                    if (categorias_lista[k].id == modelo_obj.categoria) {
                        td_categoria.textContent = categorias_lista[k].nombre;
                    }
                }
            }

            tr.appendChild(td_categoria);
            tr.appendChild(td_modelo);
            var td_ubi = document.createElement("td");
            var ubi_id = recursos_mostrar[i].ubicacion;
            for (var j = 0; j < ubis_lista.length; j++) {
                if (ubi_id == ubis_lista[j].id) {
                    td_ubi.textContent = ubis_lista[j].nombre;
                }
            }
            tr.appendChild(td_ubi);
            var td_estado = document.createElement("td")
            var estado_id = recursos_mostrar[i].estado;
            if (estado_id == 0) {
                td_estado.textContent = "Operativo"
            } else if (estado_id == 1) {
                td_estado.textContent = "De baja/defectuoso."
            } else {
                td_estado.textContent = "En mantenimiento"
            }
            tr.appendChild(td_estado);
            var boton_abrir = document.createElement("button")
            let identificador_recurso = recursos_mostrar[i].id;
            boton_abrir.addEventListener("click", function () {
                abrir(identificador_recurso);
            })
            boton_abrir.textContent = "Abrir";
            tr.appendChild(boton_abrir);
            var boton_eliminar = document.createElement("button")
            boton_eliminar.textContent = "X"
            boton_eliminar.addEventListener("click", function () {
                eliminarRecurso(identificador_recurso);
            })
            tr.appendChild(boton_eliminar);

            lista.appendChild(tr);
        }
    })
}

function eliminarRecurso(id) {
    rest.delete("/api/recursos/" + id, function (estado, respuesta) {
        if (estado == 200) {
            alert("Recurso eliminado");
            buscar();
        } else {
            console.log("Error al eliminar");
        }
    })
}

function cambiarSeccion(seccion) {
    document.getElementById(seccionActual).classList.remove("activa");
    document.getElementById(seccion).classList.add("activa");
    seccionActual = seccion;
    if (seccion === "inicio" && window.nombreGestorCompleto) {
        var nombreElement = document.getElementById("nombre_gestor");
        if (nombreElement) {
            nombreElement.textContent = window.nombreGestorCompleto;
        }
    }
}

function iniciar_registro() {
    gestor_identificador = "";
    cambiarSeccion("datos_gestor");
    document.getElementById("nombre_reg").value = "";
    document.getElementById("apellidos_reg").value = "";
    document.getElementById("usuario_reg").value = "";
    document.getElementById("contrasenya_reg").value = "";
}

function salir() {
    gestor_identificador = "";
    rest.token = null; // al salir se descarta el token
    document.getElementById("usuario").value = "";
    document.getElementById("password").value = "";
    desconectarWS();
    lista_avisos.innerHTML = "";
    cambiarSeccion("login");
}

function abrir(id) {
    var id_recurso = id;
    recurso_actual_id = id;
    cambiarSeccion("recurso");

    rest.get("/api/recursos/" + id, function (estado, respuesta) {
        if (estado == 200) {
            ubi_select2.innerHTML = "";
            cat_select2.innerHTML = "";
            mod_select2.innerHTML = "";
            est_select2.innerHTML = "";

            document.getElementById("num_serie_rec").value = respuesta.numero_serie;

            var categoria_actual = null;
            for (var i = 0; i < modelos_lista.length; i++) {
                if (modelos_lista[i].id == respuesta.modelo) {
                    categoria_actual = modelos_lista[i].categoria;
                    break;
                }
            }

            for (var i = 0; i < categorias_lista.length; i++) {
                var opt = document.createElement("option");
                opt.value = categorias_lista[i].id;
                opt.textContent = categorias_lista[i].nombre;
                if (categorias_lista[i].id == categoria_actual) {
                    opt.selected = true;
                }
                cat_select2.appendChild(opt);
            }

            for (var i = 0; i < modelos_lista.length; i++) {
                if (modelos_lista[i].categoria == categoria_actual) {
                    var opt = document.createElement("option");
                    opt.value = modelos_lista[i].id;
                    opt.textContent = modelos_lista[i].nombre;
                    if (modelos_lista[i].id == respuesta.modelo) {
                        opt.selected = true;
                    }
                    mod_select2.appendChild(opt);
                }
            }

            for (var i = 0; i < ubis_lista.length; i++) {
                var opt = document.createElement("option");
                opt.value = ubis_lista[i].id;
                opt.textContent = ubis_lista[i].nombre;
                if (ubis_lista[i].id == respuesta.ubicacion) {
                    opt.selected = true;
                }
                ubi_select2.appendChild(opt);
            }

            var estados_aux = [
                { id: 0, nombre: "Operativo" },
                { id: 1, nombre: "De baja/defectuoso" },
                { id: 2, nombre: "En mantenimiento" }
            ];

            for (var i = 0; i < estados_aux.length; i++) {
                var opt = document.createElement("option");
                opt.value = estados_aux[i].id;
                opt.textContent = estados_aux[i].nombre;
                if (estados_aux[i].id == respuesta.estado) {
                    opt.selected = true;
                }
                est_select2.appendChild(opt);
            }

            rellenarReservas(id_recurso);
            rellenarResenyas(id_recurso);
        }
    });
}

function rellenarReservas(id) {
    var lista_reservas = [];
    rest.get("/api/recursos/" + id + "/reservas", function (estado, respuesta) {
        if (estado == 200) {
            lista_reservas = respuesta;
            reservas_tabla.innerHTML = "";
            for (var i = 0; i < lista_reservas.length; i++) {
                var fila = document.createElement("tr")
                var sanitario = document.createElement("td");
                sanitario.textContent = lista_reservas[i].sanitario;
                fila.appendChild(sanitario);
                var horas = document.createElement("td");
                horas.textContent = lista_reservas[i].horas_estimadas;
                fila.appendChild(horas);
                var fecha_pet = document.createElement("td");
                fecha_pet.textContent = lista_reservas[i].fecha_peticion;
                fila.appendChild(fecha_pet);
                var fecha_ini = document.createElement("td");
                fecha_ini.textContent = lista_reservas[i].fecha_inicio;
                fila.appendChild(fecha_ini);
                var fecha_end = document.createElement("td");
                fecha_end.textContent = lista_reservas[i].fecha_fin;
                fila.appendChild(fecha_end);
                if (lista_reservas[i].fecha_fin == null && lista_reservas[i].fecha_inicio == null) {
                    fila.style.backgroundColor = "green";
                } else if (lista_reservas[i].fecha_fin == null) {
                    fila.style.backgroundColor = "blue";
                }
                reservas_tabla.appendChild(fila);
            }
        }
    })
}

function rellenarResenyas(id) {
    var lista_resenyas = []
    rest.get("/api/recursos/" + id + "/resenyas", function (estado, respuesta) {
        if (estado == 200) {
            lista_resenyas = respuesta;
            renyas_tabla.innerHTML = "";
            for (var i = 0; i < lista_resenyas.length; i++) {
                var fila = document.createElement("tr");
                var fecha = document.createElement("td");
                fecha.textContent = lista_resenyas[i].fecha;
                fila.appendChild(fecha);
                var sanitario = document.createElement("td");
                sanitario.textContent = lista_resenyas[i].sanitario;
                fila.appendChild(sanitario);
                var valoracion = document.createElement("td");
                valoracion.textContent = lista_resenyas[i].valor + "/5";
                fila.appendChild(valoracion);
                var comentario = document.createElement("td");
                comentario.textContent = lista_resenyas[i].descripcion;
                fila.appendChild(comentario);
                renyas_tabla.appendChild(fila);
            }
        }
    })
}

function guardar_recurso() {
    var recurso = {
        numero_serie: document.getElementById("num_serie_rec").value,
        modelo: document.getElementById("modelo_rec").value,
        ubicacion: document.getElementById("ubicacion_rec").value,
        estado: document.getElementById("estado_rec").value
    };

    if (recurso_actual_id != null) {
        rest.put("/api/recursos/" + recurso_actual_id, recurso, function (estado, respuesta) {
            if (estado == 200 || estado == 201) {
                alert("Recurso actualizado");
            }
        });
    } else {
        rest.post("/api/recursos", recurso, function (estado, respuesta) {
            if (estado == 201) {
                alert("Recurso creado");
                var modeloObj = modelos_lista.find(m => m.id == recurso.modelo);
                var categoriaObj = categorias_lista.find(c => c.id == modeloObj.categoria);
                wsAvisoNuevoRecurso(categoriaObj.nombre, modeloObj.nombre, recurso.numero_serie);
            }
        });
    }
}

function volver() {
    cambiarSeccion("inicio");
    document.getElementById("categoria").value = "";
    document.getElementById("modelo").value = "";
    document.getElementById("ubicacion").value = "";
    document.getElementById("estado").value = "";
    buscar();
}

// EJERCICIO 2
function crearAreaSalud() {
    var codigoPostal = document.getElementById("codigo_postal_area").value;
    var nombre = document.getElementById("nombre_area").value;

    if (!codigoPostal || !nombre) {
        alert("Rellena el código postal y el nombre.");
        return;
    }

    var datos = {
        codigo_postal: codigoPostal,
        nombre: nombre,
        gestor: gestor_identificador
    };

    rest.post("/api/area_salud", datos, function (estado, respuesta) {
        if (estado === 201) {
            alert("Área de salud creada correctamente");
            document.getElementById("codigo_postal_area").value = "";
            document.getElementById("nombre_area").value = "";
        } else {
            alert("Error al crear el área de salud");
        }
    });
}


// =====================================================================================
// PRÁCTICA 3 - Parte 1: envío de reservas al Ministerio de Sanidad y ranking por área
// =====================================================================================

var ID_AREA = 7; // Endocrinología

var AREAS_MEDICAS = {
    1: "Alergología", 2: "Anestesiología", 3: "Cardiología", 4: "Cirugía General",
    5: "Dermatología", 6: "Aparato Digestivo", 7: "Endocrinología", 8: "Ginecología",
    9: "Hematología", 10: "Medicina Interna", 11: "Neumología", 12: "Neurología",
    13: "Oftalmología", 14: "Oncología", 15: "Pediatría", 16: "Psiquiatría",
    17: "Traumatología", 18: "Urología"
};

// Comprueba que una fecha tiene formato "YYYY-MM-DD" o "YYYY-MM-DD HH:MM[:SS]" y es una fecha real
function fechaValida(fecha) {
    if (typeof fecha !== "string") return false;
    if (!/^\d{4}-\d{2}-\d{2}([ T]\d{2}:\d{2}(:\d{2})?)?$/.test(fecha)) return false;
    return !isNaN(new Date(fecha.replace(" ", "T")).getTime());
}

function textoValido(texto) {
    return typeof texto === "string" && texto.trim() !== "";
}

// Valida una reserva ya convertida al formato del Ministerio. Devuelve la lista de errores (vacía si es correcta)
// fec_ini y fecha_fin pueden ser null (reserva aún no iniciada / no devuelta), pero si existen deben ser coherentes.
function validarReserva(r) {
    var errores = [];
    if (!textoValido(r.nombre)) errores.push("nombre vacío");
    if (!textoValido(r.apellidos)) errores.push("apellidos vacíos");
    if (!textoValido(r["categoría"])) errores.push("categoría vacía o desconocida");
    if (!Number.isInteger(Number(r.horas_estimadas)) || Number(r.horas_estimadas) <= 0) errores.push("horas estimadas incorrectas");
    if (!fechaValida(r.fec_pet)) errores.push("fecha de petición incorrecta");
    if (!fechaValida(r.fec_ini)) errores.push("fecha de inicio vacía o incorrecta");
    if (!fechaValida(r.fecha_fin)) errores.push("fecha de fin vacía o incorrecta");
    if (errores.length === 0) {
        var pet = new Date(r.fec_pet.replace(" ", "T"));
        var ini = r.fec_ini ? new Date(r.fec_ini.replace(" ", "T")) : null;
        var fin = r.fecha_fin ? new Date(r.fecha_fin.replace(" ", "T")) : null;
        if (ini && ini < pet) errores.push("inicio anterior a la petición");
        if (ini && fin && fin < ini) errores.push("fin anterior al inicio");
    }
    return errores;
}

// Hace todos los GET necesarios a nuestro servidor para obtener todas las reservas,
// las valida una a una y envía la remesa con las correctas al Ministerio (POST).
async function enviarReservasMinisterio() {
    var resultado = document.getElementById("resultado_envio");
    resultado.innerHTML = "Obteniendo reservas...";

    // 1) GET de todos los recursos
    var resp = await rest.promesa("GET", "/api/recursos");
    if (resp.status != 200) {
        resultado.textContent = "Error obteniendo los recursos (" + resp.status + ")";
        return;
    }
    var recursos = resp.response;

    // 2) Un GET por recurso para obtener sus reservas
    var validas = [];
    var descartadas = [];
    for (var i = 0; i < recursos.length; i++) {
        var recursoAux = recursos[i];
        var respReservas = await rest.promesa("GET", "/api/recursos/" + recursoAux.id + "/reservas");
        if (respReservas.status != 200) {
            descartadas.push({ id: "-", recurso: recursoAux.numero_serie, errores: ["no se han podido obtener las reservas"] });
            continue;
        }

        var modeloObj = modelos_lista.find(m => m.id == recursoAux.modelo);
        var categoriaObj = modeloObj ? categorias_lista.find(c => c.id == modeloObj.categoria) : null;

        respReservas.response.forEach(function (reserva) {
            // 3) Convertir al formato del Ministerio y comprobar que el dato es correcto
            var dato = {
                nombre: reserva.nombre_sanitario,
                apellidos: reserva.apellidos_sanitario,
                "categoría": categoriaObj ? categoriaObj.nombre : "",
                horas_estimadas: reserva.horas_estimadas,
                fec_pet: reserva.fecha_peticion,
                fec_ini: reserva.fecha_inicio,
                fecha_fin: reserva.fecha_fin
            };
            var errores = validarReserva(dato);
            if (errores.length === 0) {
                validas.push(dato);
            } else {
                descartadas.push({ id: reserva.id, recurso: recursoAux.numero_serie, errores: errores });
            }
        });
    }

    // Resumen visual de la validación
    var html = "<h3>Resultado de la validación</h3>" +
        "<div class='kpis'>" +
        kpiHTML("Reservas encontradas", validas.length + descartadas.length, "") +
        kpiHTML("Válidas (se envían)", validas.length, "kpi-ok") +
        kpiHTML("Descartadas", descartadas.length, descartadas.length > 0 ? "kpi-error" : "") +
        "</div>";

    if (descartadas.length > 0) {
        html += "<table class='tabla-descartadas'><thead><tr><th>Reserva</th><th>Recurso</th><th>Motivo del descarte</th></tr></thead><tbody>";
        descartadas.forEach(function (d) {
            html += "<tr><td>#" + escaparHTML(d.id) + "</td><td>" + escaparHTML(d.recurso) + "</td><td>" +
                d.errores.map(function (e) { return "<span class='etiqueta etiqueta-error'>" + escaparHTML(e) + "</span>"; }).join(" ") +
                "</td></tr>";
        });
        html += "</tbody></table>";
    }

    if (validas.length > 0) {
        html += "<details class='detalle-remesa'><summary>Ver las " + validas.length + " reservas que se van a enviar</summary>" +
            "<table><thead><tr><th>Sanitario</th><th>Categoría</th><th>Horas</th><th>Petición</th><th>Inicio</th><th>Fin</th></tr></thead><tbody>";
        validas.forEach(function (v) {
            html += "<tr><td>" + escaparHTML(v.nombre + " " + v.apellidos) + "</td><td>" + escaparHTML(v["categoría"]) +
                "</td><td>" + v.horas_estimadas + "</td><td>" + escaparHTML(v.fec_pet) + "</td><td>" + escaparHTML(v.fec_ini || "—") +
                "</td><td>" + escaparHTML(v.fecha_fin || "—") + "</td></tr>";
        });
        html += "</tbody></table></details>";
    }
    resultado.innerHTML = html;

    if (validas.length === 0) {
        resultado.innerHTML += avisoHTML("aviso-error", "No hay reservas válidas para enviar.");
        return;
    }
    if (!confirm("Se van a enviar " + validas.length + " reservas al Ministerio (área " + ID_AREA + "). ¿Continuar?")) {
        resultado.innerHTML += avisoHTML("aviso-info", "Envío cancelado.");
        return;
    }

    // 4) POST de la remesa (nuestro servidor añade id_area y fecha y la reenvía al Ministerio)
    var respEnvio = await rest.promesa("POST", "/api/ministerio/datos", { datos: validas });
    if (respEnvio.status == 200) {
        resultado.innerHTML += avisoHTML("aviso-ok", "&#x2714; Remesa enviada correctamente al Ministerio: " +
            respEnvio.response.enviadas + " reservas del área " + ID_AREA + " (" + AREAS_MEDICAS[ID_AREA] + ").");
        cargarRanking();
    } else {
        var msg = typeof respEnvio.response === "string" ? respEnvio.response : JSON.stringify(respEnvio.response);
        resultado.innerHTML += avisoHTML("aviso-error", "&#x2716; Error enviando la remesa: " + escaparHTML(msg));
    }
}

function escaparHTML(texto) {
    return String(texto).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function kpiHTML(titulo, valor, clase) {
    return "<div class='kpi " + clase + "'><span class='kpi-valor'>" + valor + "</span><span class='kpi-titulo'>" + titulo + "</span></div>";
}

function avisoHTML(clase, texto) {
    return "<div class='aviso-envio " + clase + "'>" + texto + "</div>";
}

// Cuenta el número de reservas por área a partir de los datos del Ministerio.
// Admite que vengan como array de remesas {id_area, fecha, datos:[...]}, como array de registros
// sueltos con id_area, o como objeto cuyas claves sean los códigos de área.
function contarReservasPorArea(datosMinisterio) {
    var conteo = {};
    function sumar(area, cantidad) {
        if (area == null || area === "") return;
        conteo[area] = (conteo[area] || 0) + cantidad;
    }

    var lista = datosMinisterio;
    if (!Array.isArray(lista) && lista && typeof lista === "object") {
        if (Array.isArray(lista.datos)) lista = lista.datos;
        else if (Array.isArray(lista.data)) lista = lista.data;
        else {
            Object.keys(lista).forEach(function (clave) {
                var valor = lista[clave];
                sumar(clave, Array.isArray(valor) ? valor.length : (valor && Array.isArray(valor.datos) ? valor.datos.length : 1));
            });
            return conteo;
        }
    }
    if (!Array.isArray(lista)) return conteo;

    lista.forEach(function (item) {
        if (!item) return;
        sumar(item.id_area, Array.isArray(item.datos) ? item.datos.length : 1);
    });
    return conteo;
}

// GET al Ministerio y tabla ranking del volumen de reservas por área médica
function cargarRanking() {
    var tabla = document.getElementById("lista_ranking");
    var kpis = document.getElementById("kpis_ranking");
    tabla.innerHTML = "<tr><td colspan='4' class='celda-estado'>Cargando datos del Ministerio...</td></tr>";
    kpis.innerHTML = "";

    rest.get("/api/ministerio/datos", function (estado, respuesta) {
        if (estado != 200) {
            tabla.innerHTML = "<tr><td colspan='4' class='celda-estado celda-error'>&#x26A0; No se han podido obtener los datos del Ministerio" +
                (typeof respuesta === "string" ? ": " + escaparHTML(respuesta) : "") + "</td></tr>";
            return;
        }
        var conteo = contarReservasPorArea(respuesta);

        var ranking = Object.keys(AREAS_MEDICAS).map(function (id) {
            return { id: Number(id), nombre: AREAS_MEDICAS[id], total: conteo[id] || 0 };
        });
        ranking.sort(function (a, b) { return b.total - a.total || a.id - b.id; });

        var totalGeneral = ranking.reduce(function (suma, a) { return suma + a.total; }, 0);
        var maximo = ranking.length > 0 ? ranking[0].total : 0;

        // Posición con empates: áreas con el mismo número de reservas comparten puesto
        var posicionAnterior = 0;
        ranking.forEach(function (area, i) {
            area.posicion = (i > 0 && area.total === ranking[i - 1].total) ? posicionAnterior : i + 1;
            posicionAnterior = area.posicion;
        });

        var nuestra = ranking.find(function (a) { return a.id === ID_AREA; });
        var areasConDatos = ranking.filter(function (a) { return a.total > 0; }).length;
        kpis.innerHTML =
            kpiHTML("Reservas en el Ministerio", totalGeneral, "") +
            kpiHTML("Áreas con datos", areasConDatos + " / 18", "") +
            kpiHTML("Endocrinología: puesto", nuestra.total > 0 ? nuestra.posicion + "º" : "—", "kpi-nuestra") +
            kpiHTML("Endocrinología: reservas", nuestra.total, "kpi-nuestra");

        tabla.innerHTML = "";
        ranking.forEach(function (area) {
            var fila = document.createElement("tr");
            fila.className = "fila-ranking";
            if (area.id === ID_AREA) fila.classList.add("fila-nuestra");
            if (area.total === 0) fila.classList.add("fila-vacia");

            // Posición: medalla para los 3 primeros puestos (si tienen reservas)
            var tdPos = document.createElement("td");
            var medalla = document.createElement("span");
            medalla.className = "medalla";
            if (area.total > 0 && area.posicion <= 3) medalla.classList.add("medalla-" + area.posicion);
            medalla.textContent = area.total > 0 ? area.posicion : "–";
            tdPos.appendChild(medalla);

            var tdArea = document.createElement("td");
            tdArea.className = "celda-area";
            tdArea.textContent = area.nombre;
            var codigo = document.createElement("span");
            codigo.className = "codigo-area";
            codigo.textContent = "#" + area.id;
            tdArea.appendChild(codigo);
            if (area.id === ID_AREA) {
                var etiqueta = document.createElement("span");
                etiqueta.className = "etiqueta etiqueta-nuestra";
                etiqueta.textContent = "Nuestra área";
                tdArea.appendChild(etiqueta);
            }

            // Barra proporcional al área con más reservas
            var tdBarra = document.createElement("td");
            var contenedor = document.createElement("div");
            contenedor.className = "barra";
            var relleno = document.createElement("div");
            relleno.className = "barra-relleno";
            var anchura = (maximo > 0 ? (area.total / maximo) * 100 : 0) + "%";
            setTimeout(function () { relleno.style.width = anchura; }, 50); // animación de crecimiento
            var numero = document.createElement("span");
            numero.className = "barra-numero";
            numero.textContent = area.total;
            contenedor.appendChild(relleno);
            var envoltorio = document.createElement("div");
            envoltorio.className = "celda-barra";
            envoltorio.appendChild(contenedor);
            envoltorio.appendChild(numero);
            tdBarra.appendChild(envoltorio);

            var tdPorc = document.createElement("td");
            tdPorc.textContent = totalGeneral > 0 ? (area.total * 100 / totalGeneral).toFixed(1) + " %" : "0 %";

            fila.appendChild(tdPos);
            fila.appendChild(tdArea);
            fila.appendChild(tdBarra);
            fila.appendChild(tdPorc);
            tabla.appendChild(fila);
        });
    });
}