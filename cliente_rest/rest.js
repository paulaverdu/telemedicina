// Realiza una petición REST con datos codificados en JSON
// Incluir en el HTML con <script src="rest.js"></script>
// uso:
// rest (metodo, url, [requestData], [callback])
// rest.metodo(url, [requestData], [callback])
// Cuando se completa la petición/respuesta se invoca callback con el estado y la respuesta: callback(status, response)
// Si no se pasa callback la petición es síncrona y retorna un objeto {status, response}
// ejemplos:
//  - rest("get", "http://www.miempresa.com/test", function (status, response) { ... });
//  - rest("post", "http://www.miempresa.com/persona", { nombre: "Luis" }, function (status, response) { ... });
//
// PRÁCTICA 3 (JWT): si rest.token tiene valor, se añade automáticamente a la URL como ?token=XXXX
// y si el servidor responde 401 (token caducado / incorrecto) se llama a rest.alNoAutorizado()

(function () {
	function debug(...args) {
		if (rest.debug) console.log("REST", ...args);
	}

	function rest(method, url, data, callback) {
		method = method.toUpperCase(); // método en mayúsculas
		if (typeof data === "function") { // no se ha indicado data, pero si callback
			callback = data;
			data = null;
		}
		if (rest.token) { // añadir el token JWT a la URL
			url += (url.indexOf("?") >= 0 ? "&" : "?") + "token=" + encodeURIComponent(rest.token);
		}
		var async = typeof callback === "function"; // es una petición asincrona?
		if (data && typeof data !== "string") data = JSON.stringify(data); // datos en texto formato JSON
		var xhr = new XMLHttpRequest();
		xhr.open(method, url, async);
		//xhr.responseType = 'json'; // el tipo de la respuesta que se espera es JSON
		if (data) xhr.setRequestHeader("Content-type", "application/json;charset=UTF-8"); // el tipo de la petición es JSON
		debug(">>>", method, url, data);
		xhr.send(data); // Enviar datos
		function end() {
			debug("<<<", xhr.status, xhr.response);
			var response = xhr.response;
			try { if (response) response = JSON.parse(response); } catch (e) { }
			if (xhr.status == 401 && rest.token && typeof rest.alNoAutorizado === "function") {
				rest.alNoAutorizado(response);
			}
			if (async) {
				callback(xhr.status, response);
			} else {
				return { status: xhr.status, response: response };
			}
		}
		if (async) {
			xhr.onload = end;
			xhr.onerror = end;
		} else {
			return end();
		}
	};

	rest.debug = false;
	rest.token = null;
	rest.alNoAutorizado = null;

	rest.get = function (url, callback) { return rest("GET", url, callback); };
	rest.post = function (url, data, callback) { return rest("POST", url, data, callback); };
	rest.put = function (url, data, callback) { return rest("PUT", url, data, callback); };
	rest.delete = function (url, callback) { return rest("DELETE", url, callback); };

	// Versión con promesas (para encadenar muchos GET con async/await)
	rest.promesa = function (method, url, data) {
		return new Promise(function (resolve) {
			if (data) rest(method, url, data, function (status, response) { resolve({ status: status, response: response }); });
			else rest(method, url, function (status, response) { resolve({ status: status, response: response }); });
		});
	};

	window.rest = rest;
})();
