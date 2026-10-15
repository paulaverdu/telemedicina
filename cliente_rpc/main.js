var app = rpc("localhost", "gestion_sanitarios");

var cancelarReserva = app.procedure("cancelarReserva");
var obtenerCategorias = app.procedure("obtenerCategorias");
var obtenerModelos = app.procedure("obtenerModelos");
var loginSanitario = app.procedure("loginSanitario");
var crearSanitario = app.procedure("crearSanitario");
var obtenerReservas = app.procedure("obtenerReservas");
var obtenerResenyas = app.procedure("obtenerResenyas");
var crearResenya = app.procedure("crearResenya");
var actualizarSanitario = app.procedure("actualizarSanitario");
var obtenerSanitario = app.procedure("obtenerSanitario");
var obtenerRecursos = app.procedure("obtenerRecursos");
var finalizarReserva = app.procedure("finalizarReserva");
var iniciarReserva = app.procedure("iniciarReserva");
var reservarRecurso = app.procedure("reservarRecurso");
var tiempoPendiente = app.procedure("tiempoPendiente");
var obtenerRecurso = app.procedure("obtenerRecurso");
var obtenerUbicaciones = app.procedure("obtenerUbicaciones");

var categorias_cargadas = null;
var ubicaciones_cargadas = null;
var modelos_cargados = null;
var reservas_cargadas = null;
var resenyas_cargadas = null;
var recursos_cargados = null;

var seccionActual = "login";
var id_sanitario = null;

// ws.js - cliente sanitario
var conexionWS = null;
var nombre_sanitario_ws = null;
var id_sanitario_ws = null;
//se definen aquí para que todo el archivo las pueda usar. 
function conectarWS(id, nombre) { //cuando haces login, se llama desde main.
    id_sanitario_ws = id;
    nombre_sanitario_ws = nombre;

    conexionWS = new WebSocket("ws://localhost:4444", "avisos"); //establecemos la conexión.

    conexionWS.addEventListener("open", function () { //cuando la conexión, se establece correctamente. 
        conexionWS.send(JSON.stringify({ //primer mensaje enviado.
            operacion: "identificar",
            tipo: "sanitario",
            id: id,
            nombre: nombre
        }));
    });

    conexionWS.addEventListener("message", function (msg) {//se queda escuchando hasta que le llega "message".
        var datos = JSON.parse(msg.data);
        if (datos.operacion === "aviso") {
            anyadirAviso(datos);
        }
    }); //mientras la conexión esté abierta este está siempre escuchando.
}

function desconectarWS() { //si hay conexión nos desconectamos. 
    if (conexionWS) {
        conexionWS.close();
        conexionWS = null; //evitamos que se envíen avisos por un canal ya cerrado. 
    }
}

function anyadirAviso(datos) { //UNA VEZ TENGO LA RESPUESTA, MODIFICO. 
    var tabla = document.getElementById("lista_avisos");
    if (!tabla) return; // Evita errores si no existe la tabla

    var fila = document.createElement("tr");

    // L�gica de colores (Ya la tienes bien)
    if (datos.color === "rojo") fila.style.backgroundColor = "#ff9999";
    else if (datos.color === "azul") fila.style.backgroundColor = "#9999ff";
    else if (datos.color === "verde") fila.style.backgroundColor = "#90ee90";
    else if (datos.color === "orange") fila.style.backgroundColor = "orange";
    else if (datos.color === "pink") fila.style.backgroundColor = "pink";
    var tdFecha = document.createElement("td");
    tdFecha.textContent = datos.fecha || new Date().toLocaleTimeString();

    var tdOrigen = document.createElement("td");
    tdOrigen.textContent = datos.origen || "Sistema";

    var tdTexto = document.createElement("td");
    // FIX: Intentar leer 'texto' o 'mensaje' por si acaso
    tdTexto.textContent = datos.texto || datos.mensaje;

    fila.appendChild(tdFecha);
    fila.appendChild(tdOrigen);
    fila.appendChild(tdTexto);
    tabla.insertBefore(fila, tabla.firstChild); // Pone el aviso m�s reciente arriba
}

// Aviso al iniciar o finalizar una reserva
function wsAvisoReserva(accion, idRecurso, nombreCategoria, nombreModelo, codigoRecurso) {
    if (!conexionWS) return;
    conexionWS.send(JSON.stringify({ //cuando creamos un aviso, a parte de actualizarlo localmente, lo enviamos. 
        operacion: "avisoReserva",
        accion: accion,           // "INICIADO" o "FINALIZADO"
        idRecurso: idRecurso,
        nombreCategoria: nombreCategoria,
        nombreModelo: nombreModelo,
        codigoRecurso: codigoRecurso,
        quien: nombre_sanitario_ws
    }));
}

// Aviso al crear una reseña
function wsAvisoResenya(nombreCategoria, nombreModelo, codigoRecurso, puntuacion) { //lo mismo aquí.
    if (!conexionWS) return;
    conexionWS.send(JSON.stringify({
        operacion: "avisoResenya",
        nombreCategoria: nombreCategoria,
        nombreModelo: nombreModelo,
        codigoRecurso: codigoRecurso,
        puntuacion: puntuacion,
        quien: nombre_sanitario_ws
    }));
}
//LO ÚNICO QUE TENGO QUE SABER AQUÍ ES DONDE COLOCAR LOS AVISOS. 
function cargar(callback) { //para indicar que todo está listo. Porque va a haber algo que depende de que se complete esta función.
    var contador = 0;
    var total = 3; // categorias, ubicaciones, modelos

    function verificarCompletado() {
        contador++;
        if (contador === total && callback) {
            callback(); //cuando acaban las 3 se ejecuta lo que quiero que haga después.  
        }
    }
    // como ninguna función depende del resultado de otra, las lanzamos en paralelo.
    obtenerCategorias(function (datos) {
        categorias_cargadas = datos;
        verificarCompletado();
    });
    obtenerUbicaciones(function (datos) {
        ubicaciones_cargadas = datos;
        verificarCompletado();
    });
    obtenerModelos(function (datos) {
        modelos_cargados = datos;
        verificarCompletado();
    });
}

function cancelar() {
    cambiarSeccion("login");
    document.getElementById("nombre_reg").innerHTML = "";
    document.getElementById("apellidos_reg").innerHTML = "";
    document.getElementById("usuario_reg").innerHTML = "";
    document.getElementById("contrasenya_reg").innerHTML = "";

}

function login() {
    var usuario = document.getElementById("usuario").value;
    var password = document.getElementById("password").value;

    loginSanitario(usuario, password, function (id) {
        if (id != null) {
            id_sanitario = id;

            obtenerSanitario(id, function (datos_sanitario) {
                // FIX: Definimos el nombre completo correctamente
                var nombreCompleto = datos_sanitario.nombre + " " + datos_sanitario.apellidos;
                document.getElementById("nombre_sanitario").textContent = nombreCompleto;

                // Conectamos el WS pasando el nombre real
                conectarWS(id_sanitario, nombreCompleto);

                // Una vez identificado, cargamos datos y entramos
                cargar(function () {
                    obtenerReservas(id_sanitario, function (datos) {
                        reservas_cargadas = datos;
                        rellenarTablas(id_sanitario);
                        cambiarSeccion("inicio_sanitario");
                    });
                });
            });

        } else {
            alert("Credenciales inv�lidas.");
        }
        document.getElementById("usuario").value = "";
        document.getElementById("password").value = "";
    });
}

function crear() {
    id_sanitario = null; //he tocado esto.
    cambiarSeccion("datos_sanitario");
}

var sanitarios = [];
var id_sanitario = null; // Declarada globalmente

function registro() {
    // Validar campos
    var nombre = document.getElementById("nombre_reg").value;
    var apellidos = document.getElementById("apellidos_reg").value;
    var usuario = document.getElementById("usuario_reg").value;
    var password = document.getElementById("contrasenya_reg").value;

    if (!nombre || !apellidos || !usuario || !password) {
        alert("Por favor, completa todos los campos");
        return;
    }

    var datosSanitario = {
        nombre: nombre,
        apellidos: apellidos,
        usuario: usuario,
        password: password
    };

    if (id_sanitario == null) {
        // Crear nuevo sanitario
        crearSanitario(datosSanitario, function (id) {
            if (id != null) {
                alert("Se ha creado correctamente el sanitario");
                console.log(id);
                cambiarSeccion("login");
            } else {
                alert("Error creando el sanitario, inténtalo de nuevo.");
            }
        });
    } else {
        // Actualizar sanitario existente
        actualizarSanitario(id_sanitario, datosSanitario, function (aviso) {
            console.log(aviso);
            if (aviso == "Sanitario actualizado") {
                document.getElementById("nombre_sanitario").textContent = datosSanitario.nombre + " " + datosSanitario.apellidos;
                cambiarSeccion("inicio_sanitario");
            } else {
                alert("Error al actualizar los datos");
            }


        });
    }

    // CORREGIDO: Usar .value en lugar de .innerHTML para inputs
    document.getElementById("nombre_reg").value = "";
    document.getElementById("apellidos_reg").value = "";
    document.getElementById("usuario_reg").value = "";
    document.getElementById("contrasenya_reg").value = "";
}

function editar() {
    cambiarSeccion("datos_sanitario");
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
var sanitario_resenya = null;
var recurso_resenya = null;


function rellenarTablas(idSanitario) { //si añadieramos un botón para ordenar de una forma u otra, para volver a la original llamar a esta
    var reservas_sanitario_realizadas = []; //porque las reservas_cargadas no se altera al ordenar, sino que se construye en base a otro arrya.
    var reservas_sanitario_pendientes = [];
    //podríamos haber llamado aquí a obtener reservas también. 
    // Separar reservas pendientes y realizadas
    for (var i = 0; i < reservas_cargadas.length; i++) {
        if (reservas_cargadas[i].sanitario == idSanitario && reservas_cargadas[i].fecha_inicio == null) {
            reservas_sanitario_pendientes.push(reservas_cargadas[i]);
        } else if (reservas_cargadas[i].sanitario == idSanitario) {
            reservas_sanitario_realizadas.push(reservas_cargadas[i]);
        }
    }
    console.log(reservas_sanitario_realizadas);

    var tabla_pendientes = document.getElementById("lista_reservas_pendientes");
    var tabla_realizadas = document.getElementById("lista_reservas");

    // Limpiar tablas
    tabla_pendientes.innerHTML = "";
    tabla_realizadas.innerHTML = "";

    // Procesar reservas pendientes
    for (var i = 0; i < reservas_sanitario_pendientes.length; i++) {
        let reserva = reservas_sanitario_pendientes[i];
        let tr = document.createElement("tr"); //let hace que en cada iteración se haga una fila indepe.
        let id_recurso = reserva.recurso;
        //si las llamaramos en paralelo, ponemos un contador para que cuando acaben las dos y se rellenen
        //los tds, se añadan todos a tr y esta a la columna, sin ese contador habría tds sin rellenar si el de abajo
        //acaba antes que el de arriba ya que empiezan a la vez. Es para hacer lo que depende de ambas funciones asíncronas.
        obtenerRecurso(id_recurso, function (recurso) { //el callback es necesario porque sin el no sabríamos cuando acaba el servidor. 
            //todo lo de aquí depende de resultado.
            var modelo_buscado = modelos_cargados.find(item => item.id == recurso.modelo);
            var categoria_buscada = categorias_cargadas.find(item => item.id == modelo_buscado.categoria);
            var ubi = ubicaciones_cargadas.find(item => item.id == recurso.ubicacion);

            var categoria_td = document.createElement("td");
            categoria_td.textContent = categoria_buscada.nombre;
            var modelo_td = document.createElement("td");
            modelo_td.textContent = modelo_buscado.nombre;
            var num_serie_td = document.createElement("td");
            num_serie_td.textContent = recurso.numero_serie;
            var ubicacion_td = document.createElement("td");
            ubicacion_td.textContent = ubi.nombre;
            var fecha_pet_td = document.createElement("td");
            fecha_pet_td.textContent = new Date(reserva.fecha_peticion).toLocaleString();
            var horas_restantes_td = document.createElement("td");

            tiempoPendiente(id_recurso, reserva.id, function (horas) {
                if (horas >= 0) {
                    horas_restantes_td.textContent = horas + " h";
                } else {
                    horas_restantes_td.textContent = reserva.horas_estimadas + " h";
                }
            });

            var iniciar_td = document.createElement("td");


            // Verificar disponibilidad
            tiempoPendiente(id_recurso, reserva.id, function (horas_restantes) { //ya se encarga de mirar las reservas por delante. 
                if (horas_restantes <= 0) { //el recurso está libre.
                    var btnIniciar = document.createElement("button");
                    btnIniciar.textContent = "Retirar"; //retirar es iniciar la reserva. Está libre lo que he reservado y lo empiezo.
                    //EN ESTE BOTÓN ES CUANDO SE INICIA RESERVA, TENGO QUE AVISAR AL RESTO. 
                    btnIniciar.onclick = function () {
                        iniciarReserva(reserva.id, function (resultado) {
                            alert(resultado);
                            // Aviso WS: necesitas los datos del recurso (ya los tienes en el scope: recurso, modelo_buscado, categoria_buscada)
                            // Los sanitariosAfectados: aquí lo más sencillo es pasar todos los que tengan reserva en ese recurso
                            // Puedes calcularlo de reservas_cargadas:
                            //los afectados lo mira el servidor. 
                            wsAvisoReserva("INICIADO", id_recurso, categoria_buscada.nombre, //LES AVISO CON LOS DATOS PARA QUE EL SERVIDOR LOS LOCALICE Y CONSTRUYA EL AVISO COMPLETO.
                                modelo_buscado.nombre, recurso.numero_serie);
                            obtenerReservas(id_sanitario, function (datos) {//para que la info esté actualizada.
                                reservas_cargadas = datos;
                                rellenarTablas(id_sanitario);//la actualizo.
                            });
                        });
                    };
                    iniciar_td.appendChild(btnIniciar);
                }
            });

            var cancelar_td = document.createElement("td");
            var btnCancelar = document.createElement("button");
            btnCancelar.textContent = "Cancelar";
            btnCancelar.onclick = function () {
                cancelarReserva(reserva.id, function (resultado) {
                    alert(resultado);
                    obtenerReservas(id_sanitario, function (datos) {
                        reservas_cargadas = datos;
                        rellenarTablas(id_sanitario);
                    });
                });
            };
            cancelar_td.appendChild(btnCancelar);

            tr.appendChild(categoria_td);
            tr.appendChild(modelo_td);
            tr.appendChild(num_serie_td);
            tr.appendChild(ubicacion_td);
            tr.appendChild(fecha_pet_td);
            tr.appendChild(horas_restantes_td);
            tr.appendChild(iniciar_td);
            tr.appendChild(cancelar_td);
            tabla_pendientes.appendChild(tr);
        });
    }

    // Procesar reservas realizadas
    for (var i = 0; i < reservas_sanitario_realizadas.length; i++) {
        let reserva = reservas_sanitario_realizadas[i];
        let tr = document.createElement("tr");
        let id_recurso = reserva.recurso;

        obtenerRecurso(id_recurso, function (recurso) {
            var id_modelo = modelos_cargados.find(item => item.id == recurso.modelo);
            var id_categoria = categorias_cargadas.find(item => item.id == id_modelo.categoria);

            var categoria_td = document.createElement("td");
            categoria_td.textContent = id_categoria.nombre;
            var modelo_td = document.createElement("td");
            modelo_td.textContent = id_modelo.nombre;
            var num_serie_td = document.createElement("td");
            num_serie_td.textContent = recurso.numero_serie;
            var horas_est_td = document.createElement("td");
            horas_est_td.textContent = reserva.horas_estimadas + " h";
            var fecha_ini_td = document.createElement("td");
            fecha_ini_td.textContent = reserva.fecha_inicio ? new Date(reserva.fecha_inicio).toLocaleString() : "-";
            var fecha_fin_td = document.createElement("td");
            fecha_fin_td.textContent = reserva.fecha_fin ? new Date(reserva.fecha_fin).toLocaleString() : "-";

            var acciones_td = document.createElement("td");

            if (reserva.fecha_fin === null && reserva.fecha_inicio !== null) { //reserva activa.
                var btnFinalizar = document.createElement("button");
                btnFinalizar.textContent = "Devolver";
                btnFinalizar.onclick = function () {
                    finalizarReserva(reserva.id, function (resultado) {
                        alert(resultado);
                        // Aviso WS: necesitas los datos del recurso (ya los tienes en el scope: recurso, modelo_buscado, categoria_buscada)
                        // Los sanitariosAfectados: aquí lo más sencillo es pasar todos los que tengan reserva en ese recurso
                        // Puedes calcularlo de reservas_cargadas:
                        var afectados = reservas_cargadas
                            .filter(r => r.recurso == id_recurso && r.fecha_fin == null)
                            .map(r => r.sanitario);
                        wsAvisoReserva("FINALIZADO", id_recurso, id_categoria.nombre, //AQUÍ SE FINALIZA, DEBO AVISAR AL RESTO JEJE. 
                            id_modelo.nombre, recurso.numero_serie);
                        obtenerReservas(id_sanitario, function (datos) {
                            reservas_cargadas = datos;
                            rellenarTablas(id_sanitario);
                        });
                    });
                };
                acciones_td.appendChild(btnFinalizar);
            }

            if (reserva.fecha_fin !== null) {
                var btnResenyar = document.createElement("button");
                btnResenyar.textContent = "Resenya";
                btnResenyar.onclick = function () {
                    sanitario_resenya = id_sanitario;
                    recurso_resenya = id_recurso;
                    document.getElementById("numero_serie").textContent = recurso.numero_serie;
                    cambiarSeccion("nueva_resenya");
                };
                acciones_td.appendChild(btnResenyar);
            }

            tr.appendChild(categoria_td);
            tr.appendChild(modelo_td);
            tr.appendChild(num_serie_td);
            tr.appendChild(horas_est_td);
            tr.appendChild(fecha_ini_td);
            tr.appendChild(fecha_fin_td);
            tr.appendChild(acciones_td);
            tabla_realizadas.appendChild(tr);
        });
    }
}


function nueva_reserva() {

    var categoriaSelect = document.getElementById("categoria_rec");
    categoriaSelect.innerHTML = "<option value=''>--Selecciona--</option>";
    for (var i = 0; i < categorias_cargadas.length; i++) {
        var option = document.createElement("option");
        option.value = categorias_cargadas[i].id;
        option.textContent = categorias_cargadas[i].nombre;
        categoriaSelect.appendChild(option);
    }
    document.getElementById("modelo_rec").innerHTML = "<option value=''>--Selecciona--</option>";
    document.getElementById("lista_reservas_nuevas").innerHTML = "";
    cambiarSeccion("nueva_reserva");

}
function RellenarModelos() {
    var categoria = document.getElementById("categoria_rec").value;
    var modeloSelect = document.getElementById("modelo_rec");
    modeloSelect.innerHTML = "<option value=''>--Selecciona--</option>";
    document.getElementById("lista_reservas_nuevas").innerHTML = "";
    for (var i = 0; i < modelos_cargados.length; i++) {
        if (modelos_cargados[i].categoria == categoria) {
            var option = document.createElement("option");
            option.value = modelos_cargados[i].id;
            option.textContent = modelos_cargados[i].nombre;
            modeloSelect.appendChild(option);
        }
    }
}
function buscar() {
    var modelo = document.getElementById("modelo_rec").value;
    var tbody = document.getElementById("lista_reservas_nuevas");
    tbody.innerHTML = "";

    obtenerRecursos(modelo, function (recursos) { //filtra solo los que no están rotos. 
        if (!recursos || recursos.length === 0) return; // FIX: Evita el crash si recursos es null o está vacío

        for (var i = 0; i < recursos.length; i++) {
            let recurso = recursos[i];  // Usar let para crear un nuevo scope
            let tr = document.createElement("tr");

            let serie_td = document.createElement("td");
            serie_td.textContent = recurso.numero_serie;
            console.log(recurso.numero_serie);

            let ubi_td = document.createElement("td");
            let ubi = ubicaciones_cargadas.find(item => item.id == recurso.ubicacion);
            ubi_td.textContent = ubi ? ubi.nombre : "";

            let horas_res_td = document.createElement("td");
            let btn_td = document.createElement("td");
            let btn = document.createElement("button");

            // CORREGIDO: Capturar horas_reserva en el momento del click
            tiempoPendiente(recurso.id, -1, function (horas) {
                if (horas == 0) {
                    horas_res_td.textContent = "Disponible";
                    btn.textContent = "Retirar";

                    btn.onclick = function () {
                        // Obtener el valor actual cuando se hace click
                        var horas_reserva = document.getElementById("tiempo_estimado").value;

                        // Validar que las horas no estén vacías
                        if (!horas_reserva || horas_reserva <= 0) {
                            alert("Por favor, introduce un tiempo estimado válido");
                            return;
                        }

                        reservarRecurso(recurso.id, id_sanitario, parseInt(horas_reserva), function (id_reserva) {
                            if (id_reserva) {
                                iniciarReserva(id_reserva, function (mensaje) {
                                    console.log(mensaje);
                                    alert("Reserva iniciada correctamente");
                                    // --- FALTA ESTO: LLAMAR AL AVISO WS ---
                                    var modelo_obj = modelos_cargados.find(m => m.id == recurso.modelo);
                                    var cat_obj = categorias_cargadas.find(c => c.id == modelo_obj.categoria);
                                    buscar(); // Refrescar la lista
                                });
                            } else {
                                alert("Error al realizar la reserva");
                            }
                        });
                    };
                } else {
                    horas_res_td.textContent = horas + " h";
                    btn.textContent = "Reservar";

                    btn.onclick = function () {
                        // Obtener el valor actual cuando se hace click
                        var horas_reserva = document.getElementById("tiempo_estimado").value;

                        if (!horas_reserva || horas_reserva <= 0) {
                            alert("Por favor, introduce un tiempo estimado válido");
                            return;
                        }

                        reservarRecurso(recurso.id, id_sanitario, parseInt(horas_reserva), function (id_reserva) {
                            if (id_reserva) {
                                console.log("Reserva con id: " + id_reserva + " realizada");
                                alert("Reserva realizada correctamente");
                                var modelo_obj = modelos_cargados.find(m => m.id == recurso.modelo);
                                var cat_obj = categorias_cargadas.find(c => c.id == modelo_obj.categoria);

                                buscar(); // Refrescar la lista
                            } else {
                                alert("Error al realizar la reserva");
                            }
                        });
                    };
                }
            });

            let valoracion_td = document.createElement("td");
            obtenerResenyas(recurso.id, function (resenyas) {
                var valoracion_media = 0;
                if (resenyas.length > 0) {
                    for (var j = 0; j < resenyas.length; j++) {
                        console.log(resenyas[j].valor);
                        valoracion_media += resenyas[j].valor;
                    }
                    valoracion_media /= resenyas.length;
                }
                valoracion_td.textContent = valoracion_media.toFixed(1); // Mostrar con 1 decimal
            });

            tr.appendChild(serie_td);
            tr.appendChild(ubi_td);
            tr.appendChild(horas_res_td);
            tr.appendChild(valoracion_td);
            btn_td.appendChild(btn);
            tr.appendChild(btn_td);
            tbody.appendChild(tr);
        }
    });
}

function salir() {
    desconectarWS();
    id_sanitario = null; // Limpiamos la variable global de sesi�n
    id_sanitario_ws = null;
    nombre_sanitario_ws = null;
    lista_avisos.innerHTML = ""; // Limpiar avisos al salir
    cambiarSeccion("login");
}

function guardar_resenya() {
    crearResenya(recurso_resenya, sanitario_resenya, parseFloat(document.getElementById("valoracion").value), document.getElementById("texto_resenya").value, function (resultado) {
        console.log(parseFloat(document.getElementById("valoracion").value));
        alert(resultado);
        // Buscar datos del recurso para el aviso
        obtenerRecurso(recurso_resenya, function (rec) {
            var modeloObj = modelos_cargados.find(m => m.id == rec.modelo);
            var catObj = categorias_cargadas.find(c => c.id == modeloObj.categoria);
            wsAvisoResenya(catObj.nombre, modeloObj.nombre, rec.numero_serie,
                parseFloat(document.getElementById("valoracion").value));
        });
        cambiarSeccion("inicio_sanitario");
    });
}

function cancelar_resenya() {
    // Tambi�n actualizar las reservas al cancelar una rese�a
    obtenerReservas(id_sanitario, function (datos) {
        reservas_cargadas = datos;
        cambiarSeccion("inicio_sanitario");
        rellenarTablas(id_sanitario);
    });
}
function cancelar_reserva() {
    // Primero obtener las reservas actualizadas del servidor
    obtenerReservas(id_sanitario, function (datos) {
        reservas_cargadas = datos;  // Actualizar la variable global
        cambiarSeccion("inicio_sanitario");
        rellenarTablas(id_sanitario);  // Ahora usa los datos actualizados
    });
}

















