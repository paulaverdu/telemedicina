// Conexión a la base de datos.
// - En local (XAMPP) se usa MySQL/MariaDB como hasta ahora.
// - En la nube (Render + Supabase) se usa PostgreSQL: basta con definir la variable de entorno DATABASE_URL
//   con la cadena de conexión que da Supabase.
// En ambos casos se exporta un objeto con el mismo método query(sql, [params], callback) que devuelve
// un array de filas, para que el resto del código (REST, RPC, WS) no tenga que cambiar.

if (process.env.DATABASE_URL) {
    // ----------------------------- PostgreSQL (Supabase) -----------------------------
    const { Pool, types } = require('pg');

    // Devolver los TIMESTAMP como texto "YYYY-MM-DD HH:MM:SS" (igual que MySQL con dateStrings)
    types.setTypeParser(1114, function (valor) { return valor; });
    // Devolver COUNT(*) (bigint) como número
    types.setTypeParser(20, function (valor) { return parseInt(valor, 10); });

    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false } // Supabase exige SSL
    });

    pool.query("SELECT 1", function (err) {
        if (err) {
            console.error('Error en la conexión de la base de datos (PostgreSQL):', err.message);
            process.exit();
        }
        console.log("Conectado a PostgreSQL (Supabase)");
    });

    module.exports = {
        query: function (sql, params, callback) {
            if (typeof params === "function") {
                callback = params;
                params = [];
            }
            // MySQL usa "?" como marcador y PostgreSQL "$1, $2...". Solo se convierten si hay parámetros.
            if (params.length > 0) {
                var n = 0;
                sql = sql.replace(/\?/g, function () { return "$" + (++n); });
            }
            // En MySQL el INSERT devuelve insertId; en PostgreSQL hay que pedirlo con RETURNING
            var esInsert = /^\s*INSERT/i.test(sql);
            if (esInsert && !/RETURNING/i.test(sql)) sql += " RETURNING *";

            pool.query(sql, params, function (err, resultado) {
                if (err) {
                    console.error("Error SQL:", err.message);
                    return callback(err);
                }
                var filas = resultado.rows;
                filas.affectedRows = resultado.rowCount;
                if (esInsert && filas.length > 0) filas.insertId = filas[0].id;
                callback(null, filas);
            });
        }
    };
} else {
    // ----------------------------- MySQL (local) -----------------------------
    const mysql = require('mysql');

    const database = {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'telemedicina2026',
        dateStrings: true // fechas como texto "YYYY-MM-DD HH:MM:SS" (evita desfases de zona horaria)
    };

    const conexion = mysql.createConnection(database);

    conexion.connect(function (err) {
        if (err) {
            console.error('Error en la conexión de la base de datos:', err);
            process.exit();
        }
    });

    module.exports = conexion;
}
