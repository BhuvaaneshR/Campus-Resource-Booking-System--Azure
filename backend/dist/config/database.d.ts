import sql from 'mssql';
export declare const connectToDatabase: () => Promise<sql.ConnectionPool>;
export declare const getPool: () => sql.ConnectionPool | null;
export declare const closeDatabase: () => Promise<void>;
export declare const checkDatabaseHealth: () => Promise<boolean>;
//# sourceMappingURL=database.d.ts.map