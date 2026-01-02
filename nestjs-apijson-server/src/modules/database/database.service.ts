import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseConfig } from '@/interfaces/apijson-request.interface';
import * as mysql from 'mysql2/promise';

/**
 * MySQL连接池类型
 */
interface MySQLPool {
  query(sql: string, params?: any[]): Promise<[any[], any]>;
  getConnection(): Promise<mysql.PoolConnection>;
  end(): Promise<void>;
}

/**
 * 数据库服务
 * 完整实现MySQL功能，PostgreSQL和SQLite保持模拟实现
 */
@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private readonly config: DatabaseConfig;
  private connection: { type: string; config: DatabaseConfig; pool?: MySQLPool } | null = null;
  private mysqlPool: mysql.Pool | null = null;
  private initialized = false;

  constructor(private readonly configService: ConfigService) {
    this.config = this.configService.get<DatabaseConfig>('database')!;
  }

  /**
   * 模块初始化时初始化数据库连接
   */
  async onModuleInit(): Promise<void> {
    if (!this.initialized) {
      this.initializeConnection();
      this.initialized = true;
    }
  }

  /**
   * 模块销毁时关闭连接
   */
  async onModuleDestroy(): Promise<void> {
    await this.close();
  }

  /**
   * 执行查询
   */
  async query(sql: string, params: any[] = []): Promise<any> {
    this.logger.debug(`执行查询: ${sql}, 参数: ${JSON.stringify(params)}`);

    try {
      // 根据数据库类型执行查询
      switch (this.config.type) {
        case 'mysql':
          return await this.executeMySQLQuery(sql, params);
        case 'postgres':
          return await this.executePostgresQuery(sql, params);
        case 'sqlite':
          return await this.executeSQLiteQuery(sql, params);
        default:
          throw new Error(`不支持的数据库类型: ${this.config.type}`);
      }
    } catch (error) {
      this.logger.error(`查询执行失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 获取表结构
   */
  async getTableSchema(tableName: string): Promise<any> {
    this.logger.debug(`获取表结构: ${tableName}`);

    try {
      // 根据数据库类型获取表结构
      switch (this.config.type) {
        case 'mysql':
          return await this.getMySQLTableSchema(tableName);
        case 'postgres':
          return await this.getPostgresTableSchema(tableName);
        case 'sqlite':
          return await this.getSQLiteTableSchema(tableName);
        default:
          throw new Error(`不支持的数据库类型: ${this.config.type}`);
      }
    } catch (error) {
      this.logger.error(`获取表结构失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 获取所有表
   */
  async getTables(): Promise<string[]> {
    this.logger.debug('获取所有表');

    try {
      // 根据数据库类型获取所有表
      switch (this.config.type) {
        case 'mysql':
          return await this.getMySQLTables();
        case 'postgres':
          return await this.getPostgresTables();
        case 'sqlite':
          return await this.getSQLiteTables();
        default:
          throw new Error(`不支持的数据库类型: ${this.config.type}`);
      }
    } catch (error) {
      this.logger.error(`获取所有表失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 测试数据库连接
   */
  async testConnection(): Promise<boolean> {
    this.logger.debug('测试数据库连接');

    try {
      switch (this.config.type) {
        case 'mysql':
          if (!this.mysqlPool) {
            throw new Error('MySQL连接池未初始化');
          }
          const connection = await this.mysqlPool.getConnection();
          await connection.ping();
          connection.release();
          return true;
        case 'postgres':
        case 'sqlite':
          // 模拟连接测试
          return true;
        default:
          throw new Error(`不支持的数据库类型: ${this.config.type}`);
      }
    } catch (error) {
      this.logger.error(`数据库连接测试失败: ${error.message}`, error.stack);
      return false;
    }
  }

  /**
   * 获取数据库版本信息
   */
  async getDatabaseVersion(): Promise<string> {
    this.logger.debug('获取数据库版本');

    try {
      switch (this.config.type) {
        case 'mysql':
          const result = await this.query('SELECT VERSION() as version');
          return result.rows[0]?.version || 'unknown';
        case 'postgres':
          return 'PostgreSQL (模拟)';
        case 'sqlite':
          return 'SQLite (模拟)';
        default:
          throw new Error(`不支持的数据库类型: ${this.config.type}`);
      }
    } catch (error) {
      this.logger.error(`获取数据库版本失败: ${error.message}`, error.stack);
      return 'unknown';
    }
  }

  /**
   * 获取数据库大小信息
   */
  async getDatabaseSize(): Promise<{ database: string; size: number; unit: string }> {
    this.logger.debug('获取数据库大小');

    try {
      switch (this.config.type) {
        case 'mysql':
          const result = await this.query(
            `SELECT 
              table_schema AS database,
              ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS size
            FROM information_schema.tables
            WHERE table_schema = DATABASE()
            GROUP BY table_schema`
          );
          return {
            database: this.config.database || 'unknown',
            size: result.rows[0]?.size || 0,
            unit: 'MB'
          };
        case 'postgres':
        case 'sqlite':
          return {
            database: this.config.database || 'unknown',
            size: 0,
            unit: 'MB'
          };
        default:
          throw new Error(`不支持的数据库类型: ${this.config.type}`);
      }
    } catch (error) {
      this.logger.error(`获取数据库大小失败: ${error.message}`, error.stack);
      return {
        database: this.config.database || 'unknown',
        size: 0,
        unit: 'MB'
      };
    }
  }

  /**
   * 执行事务
   */
  async executeTransaction(queries: Array<{ sql: string; params?: any[] }>): Promise<any[]> {
    this.logger.debug(`执行事务，查询数量: ${queries.length}`);

    if (this.config.type !== 'mysql') {
      throw new Error('事务功能仅支持MySQL');
    }

    const connection = await this.mysqlPool!.getConnection();
    const results: any[] = [];

    try {
      await connection.beginTransaction();

      for (const query of queries) {
        const [rows] = await connection.query(query.sql, query.params || []);
        results.push(rows);
      }

      await connection.commit();
      return results;
    } catch (error) {
      await connection.rollback();
      this.logger.error(`事务执行失败: ${error.message}`, error.stack);
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * 初始化数据库连接
   */
  private initializeConnection(): void {
    this.logger.debug('初始化数据库连接');

    try {
      // 根据数据库类型初始化连接
      switch (this.config.type) {
        case 'mysql':
          this.initializeMySQLConnection();
          break;
        case 'postgres':
          this.initializePostgresConnection();
          break;
        case 'sqlite':
          this.initializeSQLiteConnection();
          break;
        default:
          throw new Error(`不支持的数据库类型: ${this.config.type}`);
      }
    } catch (error) {
      this.logger.error(`数据库连接初始化失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 初始化MySQL连接
   */
  private initializeMySQLConnection(): void {
    this.logger.debug('初始化MySQL连接');

    try {
      const mysqlConfig = this.config as any;
      this.mysqlPool = mysql.createPool({
        host: mysqlConfig.host || 'localhost',
        port: mysqlConfig.port || 3306,
        user: mysqlConfig.user || 'root',
        password: mysqlConfig.password || '',
        database: mysqlConfig.database || 'test',
        waitForConnections: true,
        connectionLimit: mysqlConfig.connectionLimit || 10,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 0,
      });

      this.connection = {
        type: 'mysql',
        config: this.config,
        pool: this.mysqlPool as any,
      };

      this.logger.log('MySQL连接池初始化成功');
    } catch (error) {
      this.logger.error(`MySQL连接初始化失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 初始化PostgreSQL连接
   */
  private initializePostgresConnection(): void {
    this.logger.debug('初始化PostgreSQL连接');
    // 简单实现：创建模拟连接
    this.connection = {
      type: 'postgres',
      config: this.config,
    };
  }

  /**
   * 初始化SQLite连接
   */
  private initializeSQLiteConnection(): void {
    this.logger.debug('初始化SQLite连接');
    // 简单实现：创建模拟连接
    this.connection = {
      type: 'sqlite',
      config: this.config,
    };
  }

  /**
   * 执行MySQL查询
   */
  private async executeMySQLQuery(sql: string, params: any[]): Promise<any> {
    this.logger.debug(`执行MySQL查询: ${sql}, 参数: ${JSON.stringify(params)}`);

    if (!this.mysqlPool) {
      throw new Error('MySQL连接池未初始化');
    }

    try {
      const [rows, fields] = await this.mysqlPool.query(sql, params);
      
      return {
        rows: Array.isArray(rows) ? rows : [],
        rowCount: Array.isArray(rows) ? rows.length : 0,
        fields: fields || [],
      };
    } catch (error) {
      this.logger.error(`MySQL查询执行失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 执行PostgreSQL查询
   */
  private async executePostgresQuery(sql: string, params: any[]): Promise<any> {
    this.logger.debug(`执行PostgreSQL查询: ${sql}, 参数: ${JSON.stringify(params)}`);
    // 简单实现：返回模拟数据
    return {
      rows: [],
      rowCount: 0,
    };
  }

  /**
   * 执行SQLite查询
   */
  private async executeSQLiteQuery(sql: string, params: any[]): Promise<any> {
    this.logger.debug(`执行SQLite查询: ${sql}, 参数: ${JSON.stringify(params)}`);
    // 简单实现：返回模拟数据
    return {
      rows: [],
      rowCount: 0,
    };
  }

  /**
   * 获取MySQL表结构
   */
  private async getMySQLTableSchema(tableName: string): Promise<any> {
    this.logger.debug(`获取MySQL表结构: ${tableName}`);

    if (!this.mysqlPool) {
      throw new Error('MySQL连接池未初始化');
    }

    try {
      // 获取列信息
      const columnsQuery = `
        SELECT 
          COLUMN_NAME as columnName,
          DATA_TYPE as dataType,
          COLUMN_TYPE as columnType,
          IS_NULLABLE as isNullable,
          COLUMN_KEY as columnKey,
          COLUMN_DEFAULT as columnDefault,
          EXTRA as extra,
          COLUMN_COMMENT as columnComment
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = ?
        ORDER BY ORDINAL_POSITION
      `;
      
      const columnsResult = await this.query(columnsQuery, [tableName]);

      // 获取索引信息
      const indexesQuery = `
        SELECT 
          INDEX_NAME as indexName,
          COLUMN_NAME as columnName,
          NON_UNIQUE as nonUnique,
          SEQ_IN_INDEX as seqInIndex
        FROM information_schema.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = ?
        ORDER BY INDEX_NAME, SEQ_IN_INDEX
      `;
      
      const indexesResult = await this.query(indexesQuery, [tableName]);

      // 获取外键信息
      const foreignKeysQuery = `
        SELECT
          CONSTRAINT_NAME as constraintName,
          COLUMN_NAME as columnName,
          REFERENCED_TABLE_NAME as referencedTable,
          REFERENCED_COLUMN_NAME as referencedColumn
        FROM information_schema.KEY_COLUMN_USAGE
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = ?
          AND REFERENCED_TABLE_NAME IS NOT NULL
      `;
      
      const foreignKeysResult = await this.query(foreignKeysQuery, [tableName]);

      // 获取表注释
      const tableCommentQuery = `
        SELECT TABLE_COMMENT as comment
        FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = ?
      `;
      
      const tableCommentResult = await this.query(tableCommentQuery, [tableName]);

      // 整理索引信息
      const indexesMap = new Map<string, any[]>();
      for (const row of indexesResult.rows) {
        if (!indexesMap.has(row.indexName)) {
          indexesMap.set(row.indexName, []);
        }
        indexesMap.get(row.indexName)!.push({
          columnName: row.columnName,
          nonUnique: row.nonUnique === 1,
          seqInIndex: row.seqInIndex,
        });
      }

      const indexes = Array.from(indexesMap.entries()).map(([name, columns]) => ({
        name,
        columns,
        unique: columns.every((c: any) => !c.nonUnique),
        primary: name === 'PRIMARY',
      }));

      // 整理外键信息
      const foreignKeys = foreignKeysResult.rows.map((row: any) => ({
        constraintName: row.constraintName,
        columnName: row.columnName,
        referencedTable: row.referencedTable,
        referencedColumn: row.referencedColumn,
      }));

      return {
        tableName,
        comment: tableCommentResult.rows[0]?.comment || '',
        columns: columnsResult.rows.map((row: any) => ({
          name: row.columnName,
          type: row.dataType,
          fullType: row.columnType,
          nullable: row.isNullable === 'YES',
          primaryKey: row.columnKey === 'PRI',
          autoIncrement: row.extra?.includes('auto_increment') || false,
          default: row.columnDefault,
          comment: row.columnComment || '',
        })),
        indexes,
        foreignKeys,
      };
    } catch (error) {
      this.logger.error(`获取MySQL表结构失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 获取PostgreSQL表结构
   */
  private async getPostgresTableSchema(tableName: string): Promise<any> {
    this.logger.debug(`获取PostgreSQL表结构: ${tableName}`);
    // 简单实现：返回模拟数据
    return {
      tableName,
      columns: [],
      constraints: [],
      indexes: [],
    };
  }

  /**
   * 获取SQLite表结构
   */
  private async getSQLiteTableSchema(tableName: string): Promise<any> {
    this.logger.debug(`获取SQLite表结构: ${tableName}`);
    // 简单实现：返回模拟数据
    return {
      tableName,
      columns: [],
      indexes: [],
    };
  }

  /**
   * 获取MySQL所有表
   */
  private async getMySQLTables(): Promise<string[]> {
    this.logger.debug('获取MySQL所有表');

    if (!this.mysqlPool) {
      throw new Error('MySQL连接池未初始化');
    }

    try {
      const query = `
        SELECT TABLE_NAME as tableName
        FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_TYPE = 'BASE TABLE'
        ORDER BY TABLE_NAME
      `;
      
      const result = await this.query(query);
      return result.rows.map((row: any) => row.tableName);
    } catch (error) {
      this.logger.error(`获取MySQL所有表失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 获取PostgreSQL所有表
   */
  private async getPostgresTables(): Promise<string[]> {
    this.logger.debug('获取PostgreSQL所有表');
    // 简单实现：返回模拟数据
    return [];
  }

  /**
   * 获取SQLite所有表
   */
  private async getSQLiteTables(): Promise<string[]> {
    this.logger.debug('获取SQLite所有表');
    // 简单实现：返回模拟数据
    return [];
  }

  /**
   * 关闭数据库连接
   */
  async close(): Promise<void> {
    this.logger.debug('关闭数据库连接');

    try {
      // 根据数据库类型关闭连接
      switch (this.config.type) {
        case 'mysql':
          await this.closeMySQLConnection();
          break;
        case 'postgres':
          await this.closePostgresConnection();
          break;
        case 'sqlite':
          await this.closeSQLiteConnection();
          break;
        default:
          throw new Error(`不支持的数据库类型: ${this.config.type}`);
      }
    } catch (error) {
      this.logger.error(`关闭数据库连接失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 关闭MySQL连接
   */
  private async closeMySQLConnection(): Promise<void> {
    this.logger.debug('关闭MySQL连接');

    if (this.mysqlPool) {
      try {
        await this.mysqlPool.end();
        this.mysqlPool = null;
        this.connection = null;
        this.logger.log('MySQL连接池已关闭');
      } catch (error) {
        this.logger.error(`关闭MySQL连接失败: ${error.message}`, error.stack);
        throw error;
      }
    }
  }

  /**
   * 关闭PostgreSQL连接
   */
  private async closePostgresConnection(): Promise<void> {
    this.logger.debug('关闭PostgreSQL连接');
    // 简单实现：清空连接
    this.connection = null;
  }

  /**
   * 关闭SQLite连接
   */
  private async closeSQLiteConnection(): Promise<void> {
    this.logger.debug('关闭SQLite连接');
    // 简单实现：清空连接
    this.connection = null;
  }
}
