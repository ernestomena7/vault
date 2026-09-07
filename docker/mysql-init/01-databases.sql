-- Development and test schemas.
-- The integration suite runs against `vault_test` so it never touches
-- development data (see tests/setup.ts).
CREATE DATABASE IF NOT EXISTS `vault`
  CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
CREATE DATABASE IF NOT EXISTS `vault_test`
  CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
GRANT ALL PRIVILEGES ON `vault`.* TO 'vault'@'%';
GRANT ALL PRIVILEGES ON `vault_test`.* TO 'vault'@'%';
FLUSH PRIVILEGES;
