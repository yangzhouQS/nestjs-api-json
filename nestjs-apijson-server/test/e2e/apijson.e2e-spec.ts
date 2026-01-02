import {Test, TestingModule} from '@nestjs/testing';
import {INestApplication, ValidationPipe} from '@nestjs/common';
import * as request from 'supertest';
import {AppModule} from '../../src/app.module';
import {beforeAll, describe, it} from 'vitest'

/**
 * APIJSON E2E 测试
 * 测试所有主要的 API 端点
 */
describe('APIJSON E2E Tests', () => {
    let app: INestApplication;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        app.useGlobalPipes(new ValidationPipe());
        await app.init();
    });

    afterAll(async () => {
        await app.close();
    });

    describe('GET /apijson/get', () => {
        it('should get single record', () => {
            const requestBody = {
                User: {
                    id: 1,
                },
            };

            return request(app.getHttpServer())
                .post('/apijson/get')
                .send(requestBody)
                .expect(200)
                .expect((res) => {
                    expect(res.body).toHaveProperty('code', 200);
                    expect(res.body).toHaveProperty('message');
                    expect(res.body).toHaveProperty('data');
                });
        });

        it('should get single record with column selection', () => {
            const requestBody = {
                User: {
                    id: 1,
                    '@column': 'id,name,age',
                },
            };

            return request(app.getHttpServer())
                .post('/apijson/get')
                .send(requestBody)
                .expect(200)
                .expect((res) => {
                    expect(res.body.code).toBe(200);
                    expect(res.body.data).toHaveProperty('User');
                });
        });

        it('should get single record with WHERE operators', () => {
            const requestBody = {
                User: {
                    id: {'>=': 1},
                    age: {'>': 20, '<': 30},
                },
            };

            return request(app.getHttpServer())
                .post('/apijson/get')
                .send(requestBody)
                .expect(200)
                .expect((res) => {
                    expect(res.body.code).toBe(200);
                });
        });

        it('should get single record with JOIN', () => {
            const requestBody = {
                User: {
                    id: 1,
                    'Comment@': {
                        userId: 1,
                    },
                },
            };

            return request(app.getHttpServer())
                .post('/apijson/get')
                .send(requestBody)
                .expect(200)
                .expect((res) => {
                    expect(res.body.code).toBe(200);
                    expect(res.body.data).toHaveProperty('User');
                });
        });

        it('should handle invalid request', () => {
            const requestBody = {};

            return request(app.getHttpServer())
                .post('/apijson/get')
                .send(requestBody)
                .expect(400);
        });
    });

    describe('GET /apijson/gets', () => {
        it('should get multiple records', () => {
            const requestBody = {
                'User[]': {
                    id: {'>=': 1},
                },
            };

            return request(app.getHttpServer())
                .post('/apijson/gets')
                .send(requestBody)
                .expect(200)
                .expect((res) => {
                    expect(res.body.code).toBe(200);
                    expect(res.body.data).toHaveProperty('User');
                    expect(Array.isArray(res.body.data.User)).toBe(true);
                });
        });

        it('should get multiple records with ORDER BY', () => {
            const requestBody = {
                'User[]': {
                    id: {'>=': 1},
                    '@order': 'id-',
                },
            };

            return request(app.getHttpServer())
                .post('/apijson/gets')
                .send(requestBody)
                .expect(200)
                .expect((res) => {
                    expect(res.body.code).toBe(200);
                });
        });

        it('should get multiple records with LIMIT and OFFSET', () => {
            const requestBody = {
                'User[]': {
                    id: {'>=': 1},
                    '@limit': 10,
                    '@offset': 20,
                },
            };

            return request(app.getHttpServer())
                .post('/apijson/gets')
                .send(requestBody)
                .expect(200)
                .expect((res) => {
                    expect(res.body.code).toBe(200);
                });
        });

        it('should get multiple records with IN operator', () => {
            const requestBody = {
                'User[]': {
                    id: {'{}': [1, 2, 3]},
                },
            };

            return request(app.getHttpServer())
                .post('/apijson/gets')
                .send(requestBody)
                .expect(200)
                .expect((res) => {
                    expect(res.body.code).toBe(200);
                });
        });

        it('should get multiple records with LIKE operator', () => {
            const requestBody = {
                'User[]': {
                    name: {'~': '张'},
                },
            };

            return request(app.getHttpServer())
                .post('/apijson/gets')
                .send(requestBody)
                .expect(200)
                .expect((res) => {
                    expect(res.body.code).toBe(200);
                });
        });
    });

    describe('GET /apijson/head', () => {
        it('should count records', () => {
            const requestBody = {
                User: {
                    id: {'>=': 1},
                },
            };

            return request(app.getHttpServer())
                .post('/apijson/head')
                .send(requestBody)
                .expect(200)
                .expect((res) => {
                    expect(res.body.code).toBe(200);
                    expect(res.body.data).toHaveProperty('User');
                    expect(typeof res.body.data.User).toBe('number');
                });
        });

        it('should count records with WHERE operators', () => {
            const requestBody = {
                User: {
                    age: {'>': 20},
                },
            };

            return request(app.getHttpServer())
                .post('/apijson/head')
                .send(requestBody)
                .expect(200)
                .expect((res) => {
                    expect(res.body.code).toBe(200);
                });
        });
    });

    describe('GET /apijson/heads', () => {
        it('should count multiple tables', () => {
            const requestBody = {
                'User[]': {
                    id: {'>=': 1},
                },
                'Comment[]': {
                    userId: 1,
                },
            };

            return request(app.getHttpServer())
                .post('/apijson/heads')
                .send(requestBody)
                .expect(200)
                .expect((res) => {
                    expect(res.body.code).toBe(200);
                    expect(res.body.data).toHaveProperty('User');
                    expect(res.body.data).toHaveProperty('Comment');
                });
        });
    });

    describe('POST /apijson/post', () => {
        it('should create single record', () => {
            const requestBody = {
                User: {
                    name: '测试用户',
                    age: 25,
                },
            };

            return request(app.getHttpServer())
                .post('/apijson/post')
                .send(requestBody)
                .expect(201)
                .expect((res) => {
                    expect(res.body.code).toBe(201);
                    expect(res.body.data).toHaveProperty('User');
                    expect(res.body.data.User).toHaveProperty('id');
                });
        });

        it('should create multiple records', () => {
            const requestBody = {
                'User[]': [
                    {name: '用户1', age: 25},
                    {name: '用户2', age: 30},
                ],
            };

            return request(app.getHttpServer())
                .post('/apijson/post')
                .send(requestBody)
                .expect(201)
                .expect((res) => {
                    expect(res.body.code).toBe(201);
                    expect(res.body.data).toHaveProperty('User');
                    expect(Array.isArray(res.body.data.User)).toBe(true);
                });
        });

        it('should create records with related tables', () => {
            const requestBody = {
                User: {
                    name: '测试用户',
                    age: 25,
                    'Comment@': [
                        {content: '评论1'},
                        {content: '评论2'},
                    ],
                },
            };

            return request(app.getHttpServer())
                .post('/apijson/post')
                .send(requestBody)
                .expect(201)
                .expect((res) => {
                    expect(res.body.code).toBe(201);
                });
        });

        it('should handle invalid data', () => {
            const requestBody = {
                User: {},
            };

            return request(app.getHttpServer())
                .post('/apijson/post')
                .send(requestBody)
                .expect(400);
        });
    });

    describe('PUT /apijson/put', () => {
        it('should update single record', () => {
            const requestBody = {
                User: {
                    id: 1,
                    name: '更新后的用户',
                },
            };

            return request(app.getHttpServer())
                .post('/apijson/put')
                .send(requestBody)
                .expect(200)
                .expect((res) => {
                    expect(res.body.code).toBe(200);
                    expect(res.body.data).toHaveProperty('User');
                });
        });

        it('should update multiple records', () => {
            const requestBody = {
                'User[]': {
                    id: {'{}': [1, 2, 3]},
                    name: '批量更新',
                },
            };

            return request(app.getHttpServer())
                .post('/apijson/put')
                .send(requestBody)
                .expect(200)
                .expect((res) => {
                    expect(res.body.code).toBe(200);
                });
        });

        it('should handle update without id', () => {
            const requestBody = {
                User: {
                    name: '更新后的用户',
                },
            };

            return request(app.getHttpServer())
                .post('/apijson/put')
                .send(requestBody)
                .expect(400);
        });
    });

    describe('DELETE /apijson/delete', () => {
        it('should delete single record', () => {
            const requestBody = {
                User: {
                    id: 1,
                },
            };

            return request(app.getHttpServer())
                .post('/apijson/delete')
                .send(requestBody)
                .expect(200)
                .expect((res) => {
                    expect(res.body.code).toBe(200);
                    expect(res.body.data).toHaveProperty('User');
                });
        });

        it('should delete multiple records', () => {
            const requestBody = {
                'User[]': {
                    id: {'{}': [1, 2, 3]},
                },
            };

            return request(app.getHttpServer())
                .post('/apijson/delete')
                .send(requestBody)
                .expect(200)
                .expect((res) => {
                    expect(res.body.code).toBe(200);
                });
        });

        it('should delete with WHERE operators', () => {
            const requestBody = {
                User: {
                    age: {'<': 18},
                },
            };

            return request(app.getHttpServer())
                .post('/apijson/delete')
                .send(requestBody)
                .expect(200)
                .expect((res) => {
                    expect(res.body.code).toBe(200);
                });
        });

        it('should handle delete without condition', () => {
            const requestBody = {
                User: {},
            };

            return request(app.getHttpServer())
                .post('/apijson/delete')
                .send(requestBody)
                .expect(400);
        });
    });

    describe('POST /apijson/crud', () => {
        it('should execute mixed CRUD operations', () => {
            const requestBody = {
                User: {
                    id: 1,
                    name: '更新用户',
                },
                'Comment[]': {
                    userId: 1,
                },
                Moment: {
                    id: 1,
                    '@delete': true,
                },
            };

            return request(app.getHttpServer())
                .post('/apijson/crud')
                .send(requestBody)
                .expect(200)
                .expect((res) => {
                    expect(res.body.code).toBe(200);
                    expect(res.body.data).toHaveProperty('User');
                    expect(res.body.data).toHaveProperty('Comment');
                    expect(res.body.data).toHaveProperty('Moment');
                });
        });

        it('should handle invalid CRUD request', () => {
            const requestBody = {};

            return request(app.getHttpServer())
                .post('/apijson/crud')
                .send(requestBody)
                .expect(400);
        });
    });

    describe('Advanced Features', () => {
        describe('POST /advanced/subquery', () => {
            it('should execute subqueries', () => {
                const requestBody = {
                    subqueries: [
                        {
                            alias: 'user_count',
                            tableName: 'User',
                            where: {id: {'>=': 1}},
                        },
                    ],
                };

                return request(app.getHttpServer())
                    .post('/advanced/subquery')
                    .send(requestBody)
                    .expect(200)
                    .expect((res) => {
                        expect(res.body.code).toBe(200);
                        expect(res.body.data).toHaveProperty('user_count');
                    });
            });
        });

        describe('POST /advanced/aggregate', () => {
            it('should execute COUNT aggregate', () => {
                const requestBody = {
                    tableName: 'User',
                    aggregateFunction: 'COUNT',
                    column: 'id',
                };

                return request(app.getHttpServer())
                    .post('/advanced/aggregate')
                    .send(requestBody)
                    .expect(200)
                    .expect((res) => {
                        expect(res.body.code).toBe(200);
                        expect(res.body.data).toHaveProperty('COUNT(id)');
                    });
            });

            it('should execute SUM aggregate', () => {
                const requestBody = {
                    tableName: 'User',
                    aggregateFunction: 'SUM',
                    column: 'age',
                };

                return request(app.getHttpServer())
                    .post('/advanced/aggregate')
                    .send(requestBody)
                    .expect(200)
                    .expect((res) => {
                        expect(res.body.code).toBe(200);
                    });
            });

            it('should execute AVG aggregate', () => {
                const requestBody = {
                    tableName: 'User',
                    aggregateFunction: 'AVG',
                    column: 'age',
                };

                return request(app.getHttpServer())
                    .post('/advanced/aggregate')
                    .send(requestBody)
                    .expect(200)
                    .expect((res) => {
                        expect(res.body.code).toBe(200);
                    });
            });

            it('should execute MIN aggregate', () => {
                const requestBody = {
                    tableName: 'User',
                    aggregateFunction: 'MIN',
                    column: 'age',
                };

                return request(app.getHttpServer())
                    .post('/advanced/aggregate')
                    .send(requestBody)
                    .expect(200)
                    .expect((res) => {
                        expect(res.body.code).toBe(200);
                    });
            });

            it('should execute MAX aggregate', () => {
                const requestBody = {
                    tableName: 'User',
                    aggregateFunction: 'MAX',
                    column: 'age',
                };

                return request(app.getHttpServer())
                    .post('/advanced/aggregate')
                    .send(requestBody)
                    .expect(200)
                    .expect((res) => {
                        expect(res.body.code).toBe(200);
                    });
            });
        });

        describe('POST /advanced/group-aggregate', () => {
            it('should execute group aggregate query', () => {
                const requestBody = {
                    tableName: 'User',
                    groupBy: ['department'],
                    aggregateFunctions: {
                        'COUNT(id)': 'COUNT(`id`)',
                        'AVG(age)': 'AVG(`age`)',
                    },
                };

                return request(app.getHttpServer())
                    .post('/advanced/group-aggregate')
                    .send(requestBody)
                    .expect(200)
                    .expect((res) => {
                        expect(res.body.code).toBe(200);
                        expect(Array.isArray(res.body.data)).toBe(true);
                    });
            });
        });

        describe('POST /advanced/transaction', () => {
            it('should execute transaction', () => {
                const requestBody = {
                    queries: [
                        {
                            tableName: 'User',
                            operation: 'INSERT',
                            data: {name: '事务用户1', age: 25},
                        },
                        {
                            tableName: 'User',
                            operation: 'INSERT',
                            data: {name: '事务用户2', age: 30},
                        },
                    ],
                };

                return request(app.getHttpServer())
                    .post('/advanced/transaction')
                    .send(requestBody)
                    .expect(200)
                    .expect((res) => {
                        expect(res.body.code).toBe(200);
                        expect(Array.isArray(res.body.data)).toBe(true);
                    });
            });
        });
    });

    describe('Permission Management', () => {
        describe('GET /permission/tables', () => {
            it('should get all table permissions', () => {
                return request(app.getHttpServer())
                    .get('/permission/tables')
                    .expect(200)
                    .expect((res) => {
                        expect(res.body.code).toBe(200);
                        expect(res.body.data).toBeDefined();
                    });
            });
        });

        describe('POST /permission/tables/:tableName', () => {
            it('should set table permission', () => {
                return request(app.getHttpServer())
                    .post('/permission/tables/User')
                    .send({
                        roles: ['ADMIN'],
                        canSelect: true,
                        canInsert: true,
                        canUpdate: true,
                        canDelete: true,
                    })
                    .expect(200)
                    .expect((res) => {
                        expect(res.body.code).toBe(200);
                    });
            });
        });

        describe('POST /permission/check', () => {
            it('should check user permission', () => {
                return request(app.getHttpServer())
                    .post('/permission/check')
                    .send({
                        userId: 'user123',
                        tableName: 'User',
                        operation: 'SELECT',
                    })
                    .expect(200)
                    .expect((res) => {
                        expect(res.body.code).toBe(200);
                        expect(res.body.data).toHaveProperty('allowed');
                    });
            });
        });

        describe('POST /permission/check-batch', () => {
            it('should check batch permissions', () => {
                return request(app.getHttpServer())
                    .post('/permission/check-batch')
                    .send({
                        userId: 'user123',
                        tableOperations: [
                            {tableName: 'User', operation: 'SELECT'},
                            {tableName: 'Comment', operation: 'INSERT'},
                        ],
                    })
                    .expect(200)
                    .expect((res) => {
                        expect(res.body.code).toBe(200);
                        expect(Array.isArray(res.body.data)).toBe(true);
                    });
            });
        });

        describe('GET /permission/users/:userId', () => {
            it('should get user permissions', () => {
                return request(app.getHttpServer())
                    .get('/permission/users/user123')
                    .expect(200)
                    .expect((res) => {
                        expect(res.body.code).toBe(200);
                        expect(res.body.data).toBeDefined();
                    });
            });
        });

        describe('POST /permission/users/:userId', () => {
            it('should set user permissions', () => {
                return request(app.getHttpServer())
                    .post('/permission/users/user123')
                    .send({
                        roles: ['USER'],
                        permissions: {
                            User: {canSelect: true, canInsert: false},
                        },
                    })
                    .expect(200)
                    .expect((res) => {
                        expect(res.body.code).toBe(200);
                    });
            });
        });
    });

    describe('Health Check', () => {
        it('should return health status', () => {
            return request(app.getHttpServer())
                .get('/health')
                .expect(200)
                .expect((res) => {
                    expect(res.body).toHaveProperty('status', 'ok');
                    expect(res.body).toHaveProperty('timestamp');
                });
        });
    });
});
