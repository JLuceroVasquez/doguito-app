const oracledb = require('oracledb');

// Ruta al directorio principal del Instant Client
try {
    oracledb.initOracleClient();
    console.log("OCI Instant Client inicializado en modo Thick.");
} catch (err) {
    console.error("Error al inicializar Instant Client:", err);
    // Si falla, la aplicación no podrá usar SODA ni el TNS alias.
}

oracledb.outFormat = oracledb.OBJECT;
oracledb.fetchAsString = [oracledb.CLOB];
oracledb.autoCommit = true;

const CLIENTES_COLLECTION = 'clientes';

//Función auxiliar para OSON/JSON (Centralizada y limpia)
function readSodaContent(doc) {
    try {
        // 1. Intenta leer como JSON textual (colección en JSON o JSON CLOB)
        return doc.getContent();
    } catch (err) {
        // 2. Si falla con ORA-40761 (OSON binario), usar Buffer
        if (err.errorNum === 40761) {
            // Usar el método específico para contenido binario
            const buf = doc.getContentAsBuffer();
            // Convertir Buffer a string (UTF8) y luego a objeto JS
            return JSON.parse(buf.toString());
        }
        throw err; // cualquier otro error debe salir
    }
}

module.exports = class ClienteService {
    constructor() { }

    static async init() {
        console.log(`process.env.DB_USER: ${process.env.DB_USER}`);
        console.log(`process.env.DB_PASSWORD: ${process.env.DB_PASSWORD}`);
        console.log(`process.env.CONNECT_STRING: ${process.env.CONNECT_STRING}`);

        try {
            console.log('Creando pool de conexiones...')
            // Global Setting (Se mantiene por si acaso, aunque no funcionó solo)
            oracledb.sodaContentOption = oracledb.OCI_SODA_AS_AL32UTF8;
            await oracledb.createPool({
                user: process.env.DB_USER,
                password: process.env.DB_PASSWORD,
                connectString: process.env.CONNECT_STRING,
                sodaContentOption: oracledb.OCI_SODA_AS_AL32UTF8, // Setting en Pool
            });
            console.log('Pool de conexiones creado.')
            return new ClienteService();
        } catch (e) {
            console.log('Error en conexion: ');
            console.log(e);
        }
    }

    async getAll() {
        let connection, clientes;
        const result = [];

        try {
            connection = await oracledb.getConnection();
            // Forzar la opción SODA en el objeto Connection justo antes de usar SODA, para asegurar que la lectura del formato OSON (binario) sea convertida a JSON (texto).
            connection.sodaContentOption = oracledb.OCI_SODA_AS_AL32UTF8;
            const soda = connection.getSodaDatabase();

            // Usar getCollection() para acceder a la colección existente
            const clientesCollection = await soda.openCollection(CLIENTES_COLLECTION);
            // Obtener todos los documentos (SIN PARÁMETROS, para evitar NJS-009)
            clientes = await clientesCollection.find().getDocuments();

            clientes.forEach(element => {
                const content=readSodaContent(element);
                
                result.push({
                    id: element.key,
                    createdOn: element.createdOn,
                    lastModified: element.lastModified,
                    ...content
                });
            });
        } catch (err) {
            console.error(err);
        } finally {
            if (connection) {
                try {
                    await connection.close();
                }
                catch (err) {
                    console.error(err);
                }
            }
        }
        return result;
    }

    async getById(clienteId) {
        let connection, cliente, result;

        try {
            connection = await oracledb.getConnection();
            connection.sodaContentOption = oracledb.OCI_SODA_AS_AL32UTF8;
            const soda = connection.getSodaDatabase();
            const clientesCollection = await soda.openCollection(CLIENTES_COLLECTION);

            cliente = await clientesCollection.find().key(clienteId).getOne();
            const content=readSodaContent(cliente);

            result = {
                id: cliente.key,
                createdOn: cliente.createdOn,
                lastModified: cliente.lastModified,
                ...content,
            };

        } catch (err) {
            console.error(err);
        } finally {
            if (connection) {
                try {
                    await connection.close();
                }
                catch (err) {
                    console.error(err);
                }
            }
        }

        return result;
    }

    async save(cliente) {
        let connection, novoCliente, result;

        try {
            connection = await oracledb.getConnection();
            const soda = connection.getSodaDatabase();
            const clientesCollection = await soda.openCollection(CLIENTES_COLLECTION);
            /*
                insertOneAndGet() does not return the doc
                for performance reasons
                see: http://oracle.github.io/node-oracledb/doc/api.html#sodacollinsertoneandget
            */
            novoCliente = await clientesCollection.insertOneAndGet(cliente);
            result = {
                id: novoCliente.key,
                createdOn: novoCliente.createdOn,
                lastModified: novoCliente.lastModified,
            };
        } catch (err) {
            console.error(err);
        } finally {
            if (connection) {
                try {
                    await connection.close();
                }
                catch (err) {
                    console.error(err);
                }
            }
        }

        return result;
    }

    async update(id, cliente) {
        let connection, result;

        try {
            connection = await oracledb.getConnection();
            const soda = connection.getSodaDatabase();
            const clienteCollection = await soda.openCollection(CLIENTES_COLLECTION);
            cliente = await clienteCollection.find().key(id).replaceOneAndGet(cliente);
            result = {
                id: cliente.key,
                createdOn: cliente.createdOn,
                lastModified: cliente.lastModified,
            };
        } catch (err) {
            console.error(err);
        } finally {
            if (connection) {
                try {
                    await connection.close();
                }
                catch (err) {
                    console.error(err);
                }
            }
        }

        return result;
    }

    async deleteById(clienteId) {
        let connection;
        let removed = false;

        try {
            connection = await oracledb.getConnection();

            const soda = connection.getSodaDatabase();
            const clienteCollection = await soda.openCollection(CLIENTES_COLLECTION);
            removed = await clienteCollection.find().key(clienteId).remove();

        } catch (err) {
            console.error(err);
        } finally {
            if (connection) {
                try {
                    await connection.close();
                }
                catch (err) {
                    console.error(err);
                }
            }
        }
        return removed;
    }

    async closePool() {
        console.log('Closing connection pool...');
        try {
            await oracledb.getPool().close(10);
            console.log('Pool closed');
        } catch (err) {
            console.error(err);
        }
    }
}
