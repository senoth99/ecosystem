-- Пароль пользователя drops должен совпадать с DROPS_DB_PASSWORD в .env (по умолчанию drops)
CREATE USER drops WITH PASSWORD 'drops';
CREATE DATABASE drops OWNER drops;
GRANT ALL PRIVILEGES ON DATABASE drops TO drops;
