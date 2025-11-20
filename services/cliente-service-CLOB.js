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
// Esta línea afecta a columnas CLOB, no a BLOB/OSON, por lo que es inocua aquí.
oracledb.fetchAsString = [oracledb.CLOB];
oracledb.autoCommit = true;

const CLIENTES_COLLECTION = 'clientes';

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

    // Helper para obtener la colección con los metadatos OSON explícitos
    async _getCollection(soda) {
        // Metadatos personalizados según tu requerimiento: BLOB + OSON
        const mymetadata = {
            "keyColumn": {
                "name": "ID",
                "sqlType": "VARCHAR2",
                "maxLength": 255,
                "assignmentMethod": "UUID"
            },
            "contentColumn": {
                "name": "JSON_DOCUMENT",
                "sqlType": "CLOB",
                "cache": true,
                "encrypt": "NONE",
                "validation": "STANDARD"
            },
            "versionColumn": {
                "name": "VERSION",
                "method": "UUID"
            },
            "lastModifiedColumn": {
                "name": "LAST_MODIFIED"
            },
            "creationTimeColumn": {
                "name": "CREATED_ON"
            },
            "readOnly": false
        };

        // Crea la colección con la definición explícita de OSON
        return await soda.createCollection(CLIENTES_COLLECTION, { metaData: mymetadata });
    }

    async getAll() {
        let connection;
        const result = [];

        try {
            connection = await oracledb.getConnection();

            const soda = connection.getSodaDatabase();
            const clienteCollection = await this._getCollection(soda);
            let clientes = await clienteCollection.find().getDocuments();
            clientes.forEach((element) => {
                result.push({
                    id: element.key,
                    createdOn: element.createdOn,
                    lastModified: element.lastModified,
                    ...element.getContent(),
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
            const clientesCollection = await this._getCollection(soda);
            cliente = await clientesCollection.find().key(clienteId).getOne();
            result = {
                id: cliente.key,
                createdOn: cliente.createdOn,
                lastModified: cliente.lastModified,
                ...cliente.getContent(),
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
            const clientesCollection = await this._getCollection(soda);
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
            const clienteCollection = await this._getCollection(soda);
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
            const clienteCollection = await this._getCollection(soda);
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
