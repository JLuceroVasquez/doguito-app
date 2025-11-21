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

function readSodaContent(doc) {
    // Si el documento es nulo (por ejemplo, en un getOne que no encuentra nada), devolvemos nulo.
    if (!doc) {
        return null;
    }
    
    try {
        // 1. Intenta leer como objeto JSON/String (funciona para CLOB y para BD 21c+)
        // Si la base de datos ya está alineada y el formato es textual, esto devuelve el objeto JS directamente.
        const content = doc.getContent();
        
        // Si getContent devuelve un Buffer, fallamos explícitamente a la lógica binaria.
        if (Buffer.isBuffer(content)) {
            throw new Error("Contenido es Buffer, forzando decodificación binaria.");
        }
        
        return content;
        
    } catch (err) {
        // 2. Fallback para contenido Binario (OSON/BLOB)
        // Si llegamos aquí es porque getContent() falló o devolvió un Buffer.
        
        try {
            // Usar el método específico para contenido binario
            const buf = doc.getContentAsBuffer();
            
            if (buf) {
                // Convertir Buffer (OSON binario) a string (UTF8) y luego a objeto JS
                return JSON.parse(buf.toString('utf8'));
            }
        } catch (e) {
            console.error("Error al decodificar Buffer/OSON:", e.message);
            // Devolvemos objeto vacío para no romper la lista de clientes si uno falla
            return {}; 
        }
        
        return {};
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
            await oracledb.createPool({
                user: process.env.DB_USER,
                password: process.env.DB_PASSWORD,
                connectString: process.env.CONNECT_STRING,
            });
            console.log('Pool de conexiones creado.')
            return new ClienteService();
        } catch (e) {
            console.log('Error en conexion: ');
            console.log(e);
        }
    }

    async getAll() {
        let connection;
        const result = [];

        try {
            connection = await oracledb.getConnection();

            const soda = connection.getSodaDatabase();
            const clienteCollection = await soda.createCollection(CLIENTES_COLLECTION);
            let clientes = await clienteCollection.find().getDocuments();
            clientes.forEach((element) => {
                const content = readSodaContent(element);
                result.push({
                    id: element.key,
                    createdOn: element.createdOn,
                    lastModified: element.lastModified,
                    ...content,
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

            const soda = connection.getSodaDatabase();
            const clientesCollection = await soda.createCollection(CLIENTES_COLLECTION);
            cliente = await clientesCollection.find().key(clienteId).getOne();
            result = {
                id: cliente.key,
                createdOn: cliente.createdOn,
                lastModified: cliente.lastModified,
                ...readSodaContent(cliente),
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
            const clientesCollection = await soda.createCollection(CLIENTES_COLLECTION);
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
            const clienteCollection = await soda.createCollection(CLIENTES_COLLECTION);
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
            const clienteCollection = await soda.createCollection(CLIENTES_COLLECTION);
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
