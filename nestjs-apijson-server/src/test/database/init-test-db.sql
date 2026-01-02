-- 测试数据库初始化脚本
-- 创建测试数据库
CREATE DATABASE IF NOT EXISTS apijson_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE apijson_test;

-- 创建测试表：users
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  age INT,
  gender VARCHAR(10),
  phone VARCHAR(20),
  address TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 创建测试表：roles
CREATE TABLE IF NOT EXISTS roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  description VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 创建测试表：user_roles (关联表)
CREATE TABLE IF NOT EXISTS user_roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  role_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_role (user_id, role_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 创建测试表：comments
CREATE TABLE IF NOT EXISTS comments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  content TEXT NOT NULL,
  to_id INT,
  moment_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_moment_id (moment_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 创建测试表：moments
CREATE TABLE IF NOT EXISTS moments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  content TEXT,
  picture_list JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 创建测试表：verifies
CREATE TABLE IF NOT EXISTS verifies (
  id INT AUTO_INCREMENT PRIMARY KEY,
  type VARCHAR(20) NOT NULL,
  phone VARCHAR(20),
  email VARCHAR(255),
  verify VARCHAR(10) NOT NULL,
  expire TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_phone (phone),
  INDEX idx_email (email),
  INDEX idx_verify (verify)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 创建测试表：logins
CREATE TABLE IF NOT EXISTS logins (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  type VARCHAR(20) NOT NULL,
  ip VARCHAR(50),
  device JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_type (type),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 插入测试数据：角色
INSERT INTO roles (name, description) VALUES
('admin', '管理员角色'),
('user', '普通用户角色'),
('guest', '访客角色')
ON DUPLICATE KEY UPDATE description=VALUES(description);

-- 插入测试数据：用户
INSERT INTO users (name, email, age, gender, phone, address) VALUES
('Alice', 'alice@example.com', 25, 'female', '13800138001', '北京市朝阳区'),
('Bob', 'bob@example.com', 30, 'male', '13800138002', '上海市浦东新区'),
('Charlie', 'charlie@example.com', 28, 'male', '13800138003', '广州市天河区'),
('David', 'david@example.com', 35, 'male', '13800138004', '深圳市南山区'),
('Eve', 'eve@example.com', 27, 'female', '13800138005', '杭州市西湖区')
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- 插入测试数据：用户角色关联
INSERT INTO user_roles (user_id, role_id) VALUES
(1, 2), -- Alice -> user
(2, 1), -- Bob -> admin
(2, 2), -- Bob -> user
(3, 2), -- Charlie -> user
(4, 1), -- David -> admin
(4, 2), -- David -> user
(5, 2)  -- Eve -> user
ON DUPLICATE KEY UPDATE user_id=VALUES(user_id);

-- 插入测试数据：动态
INSERT INTO moments (user_id, content, picture_list) VALUES
(1, '今天天气真好！', NULL),
(2, '分享一张照片', '["https://example.com/photo1.jpg"]'),
(3, '学习了新技能', NULL),
(4, '周末去爬山', NULL),
(5, '美食分享', '["https://example.com/food1.jpg", "https://example.com/food2.jpg"]')
ON DUPLICATE KEY UPDATE content=VALUES(content);

-- 插入测试数据：评论
INSERT INTO comments (user_id, content, moment_id) VALUES
(2, '很棒！', 1),
(3, '我也想去', 4),
(4, '看起来不错', 5),
(5, '赞同', 1),
(1, '谢谢大家的支持', 1)
ON DUPLICATE KEY UPDATE content=VALUES(content);

-- 插入测试数据：验证码
INSERT INTO verifies (type, phone, verify, expire) VALUES
('phone', '13800138001', '123456', DATE_ADD(NOW(), INTERVAL 10 MINUTE)),
('phone', '13800138002', '234567', DATE_ADD(NOW(), INTERVAL 10 MINUTE)),
('phone', '13800138003', '345678', DATE_ADD(NOW(), INTERVAL 10 MINUTE))
ON DUPLICATE KEY UPDATE verify=VALUES(verify);

-- 插入测试数据：登录记录
INSERT INTO logins (user_id, type, ip, device) VALUES
(1, 'password', '192.168.1.1', '{"os": "Windows", "browser": "Chrome"}'),
(2, 'password', '192.168.1.2', '{"os": "MacOS", "browser": "Safari"}'),
(3, 'password', '192.168.1.3', '{"os": "Linux", "browser": "Firefox"}')
ON DUPLICATE KEY UPDATE ip=VALUES(ip);

-- 创建用于测试的存储过程：清理测试数据
DELIMITER $$

CREATE PROCEDURE IF NOT EXISTS clean_test_data()
BEGIN
  -- 删除所有测试数据
  DELETE FROM logins;
  DELETE FROM verifies;
  DELETE FROM comments;
  DELETE FROM moments;
  DELETE FROM user_roles;
  DELETE FROM users;
  DELETE FROM roles;
  
  -- 重置自增ID
  ALTER TABLE logins AUTO_INCREMENT = 1;
  ALTER TABLE verifies AUTO_INCREMENT = 1;
  ALTER TABLE comments AUTO_INCREMENT = 1;
  ALTER TABLE moments AUTO_INCREMENT = 1;
  ALTER TABLE user_roles AUTO_INCREMENT = 1;
  ALTER TABLE users AUTO_INCREMENT = 1;
  ALTER TABLE roles AUTO_INCREMENT = 1;
  
  -- 重新插入基础数据
  INSERT INTO roles (name, description) VALUES
  ('admin', '管理员角色'),
  ('user', '普通用户角色'),
  ('guest', '访客角色');
  
  INSERT INTO users (name, email, age, gender, phone, address) VALUES
  ('Alice', 'alice@example.com', 25, 'female', '13800138001', '北京市朝阳区'),
  ('Bob', 'bob@example.com', 30, 'male', '13800138002', '上海市浦东新区'),
  ('Charlie', 'charlie@example.com', 28, 'male', '13800138003', '广州市天河区'),
  ('David', 'david@example.com', 35, 'male', '13800138004', '深圳市南山区'),
  ('Eve', 'eve@example.com', 27, 'female', '13800138005', '杭州市西湖区');
  
  INSERT INTO user_roles (user_id, role_id) VALUES
  (1, 2), -- Alice -> user
  (2, 1), -- Bob -> admin
  (2, 2), -- Bob -> user
  (3, 2), -- Charlie -> user
  (4, 1), -- David -> admin
  (4, 2), -- David -> user
  (5, 2); -- Eve -> user
  
  INSERT INTO moments (user_id, content, picture_list) VALUES
  (1, '今天天气真好！', NULL),
  (2, '分享一张照片', '["https://example.com/photo1.jpg"]'),
  (3, '学习了新技能', NULL),
  (4, '周末去爬山', NULL),
  (5, '美食分享', '["https://example.com/food1.jpg", "https://example.com/food2.jpg"]');
  
  INSERT INTO comments (user_id, content, moment_id) VALUES
  (2, '很棒！', 1),
  (3, '我也想去', 4),
  (4, '看起来不错', 5),
  (5, '赞同', 1),
  (1, '谢谢大家的支持', 1);
END$$

DELIMITER ;

-- 创建用于测试的视图：用户详细信息
CREATE OR REPLACE VIEW user_details AS
SELECT 
  u.id,
  u.name,
  u.email,
  u.age,
  u.gender,
  u.phone,
  u.address,
  GROUP_CONCAT(DISTINCT r.name) AS roles,
  COUNT(DISTINCT m.id) AS moment_count,
  COUNT(DISTINCT c.id) AS comment_count
FROM users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
LEFT JOIN roles r ON ur.role_id = r.id
LEFT JOIN moments m ON u.id = m.user_id
LEFT JOIN comments c ON u.id = c.user_id
GROUP BY u.id;
